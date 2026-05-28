"""The Procare Activities integration."""
import asyncio
import logging
from datetime import time, timedelta
from pathlib import Path
import aiohttp

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.util import dt as dt_util

from .const import (
    DOMAIN,
    PLATFORMS,
    CONF_SCHOOL_NAME,
    CONF_UPDATE_INTERVAL,
    CONF_AFTER_HOURS_INTERVAL,
    CONF_OPERATING_START,
    CONF_OPERATING_END,
    DEFAULT_UPDATE_INTERVAL,
    DEFAULT_AFTER_HOURS_INTERVAL,
    DEFAULT_OPERATING_START,
    DEFAULT_OPERATING_END,
)
from .api import ProcareApi, ProcareApiError, ProcareAuthError

_LOGGER = logging.getLogger(__name__)

CARD_FILENAME = "procare-timeline-card.js"
FRONTEND_URL = f"/{DOMAIN}_static"
CARD_REGISTERED_KEY = f"{DOMAIN}_card_registered"


async def _ensure_lovelace_resource(hass: HomeAssistant, bundle_url: str) -> bool:
    """Create or update a Storage-mode Lovelace Resource for the card.

    Returns True if a resource is in place; the caller should then skip
    add_extra_js_url to avoid double-loading. Returns False on YAML-mode
    dashboards or when the Lovelace API is unavailable.
    """
    base = bundle_url.split("?", 1)[0]
    lovelace = hass.data.get("lovelace")
    if lovelace is None:
        return False
    resources = getattr(lovelace, "resources", None)
    if resources is None and isinstance(lovelace, dict):
        resources = lovelace.get("resources")
    if resources is None:
        return False
    if not hasattr(resources, "async_create_item") or not hasattr(resources, "async_update_item"):
        return False
    try:
        if hasattr(resources, "async_load"):
            await resources.async_load()
        items = list(resources.async_items())
    except Exception:
        _LOGGER.debug("Lovelace resources unavailable; falling back to add_extra_js_url")
        return False

    existing = next(
        (item for item in items if str(item.get("url", "")).split("?", 1)[0] == base),
        None,
    )
    payload = {"url": bundle_url, "res_type": "module"}
    try:
        if existing is None:
            await resources.async_create_item(payload)
            _LOGGER.info("Registered Lovelace resource %s", bundle_url)
        elif existing.get("url") != bundle_url:
            await resources.async_update_item(existing["id"], payload)
            _LOGGER.info("Updated Lovelace resource to %s", bundle_url)
        return True
    except Exception:
        _LOGGER.exception("Failed to manage Lovelace resource")
        return False


async def _register_timeline_card(hass: HomeAssistant) -> None:
    """Serve the Lovelace card from the integration directory and register it."""
    if hass.data.get(CARD_REGISTERED_KEY):
        return
    hass.data[CARD_REGISTERED_KEY] = True

    frontend_dir = Path(__file__).parent
    card_path = frontend_dir / CARD_FILENAME
    if not card_path.is_file():
        _LOGGER.warning("Timeline card file missing at %s; skipping auto-registration", card_path)
        return

    try:
        from homeassistant.components.http import StaticPathConfig
        await hass.http.async_register_static_paths([
            StaticPathConfig(FRONTEND_URL, str(frontend_dir), False)
        ])
    except ImportError:
        hass.http.register_static_path(FRONTEND_URL, str(frontend_dir), False)

    cache_bust = int(card_path.stat().st_mtime)
    bundle_url = f"{FRONTEND_URL}/{CARD_FILENAME}?v={cache_bust}"

    if not await _ensure_lovelace_resource(hass, bundle_url):
        add_extra_js_url(hass, bundle_url)
    _LOGGER.info("Procare timeline card auto-registered at %s", bundle_url)


def _opt(entry: ConfigEntry, key: str, default):
    return entry.options.get(key, entry.data.get(key, default))


def _parse_time(value) -> time:
    if isinstance(value, time):
        return value
    return time.fromisoformat(value)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Procare Activities from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    await _register_timeline_card(hass)
    
    username = entry.data["username"]
    password = entry.data["password"]
    selected_kid_id = entry.data["kid_id"]
    school_name = entry.data.get(CONF_SCHOOL_NAME)

    # Create a single, persistent session for the integration
    session = aiohttp.ClientSession()
    api = ProcareApi(session, username, password, school_name)

    def current_interval() -> timedelta:
        """Pick poll interval based on whether HA local time is within operating hours."""
        in_hours = _opt(entry, CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL)
        after_hours = _opt(entry, CONF_AFTER_HOURS_INTERVAL, DEFAULT_AFTER_HOURS_INTERVAL)
        start = _parse_time(_opt(entry, CONF_OPERATING_START, DEFAULT_OPERATING_START))
        end = _parse_time(_opt(entry, CONF_OPERATING_END, DEFAULT_OPERATING_END))
        now = dt_util.now().time()
        if start <= end:
            within = start <= now < end
        else:
            within = now >= start or now < end
        return timedelta(minutes=in_hours if within else after_hours)

    async def async_update_data():
        """Fetch data from API endpoint."""
        try:
            result = await api.async_get_activities(selected_kid_id)
        except ProcareAuthError as err:
            raise ConfigEntryAuthFailed from err
        except ProcareApiError as err:
            raise UpdateFailed(f"Error communicating with Procare API: {err}") from err
        except Exception as err:
            raise UpdateFailed(f"Unexpected error: {err}") from err
        # Adjust the interval used to schedule the next refresh.
        coordinator.update_interval = current_interval()
        return result

    coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name="procare_activities_sensor",
        update_method=async_update_data,
        update_interval=current_interval(),
    )

    # Fetch initial data so we have it when platforms are set up.
    await coordinator.async_refresh()

    # Store the coordinator and the session together
    hass.data[DOMAIN][entry.entry_id] = {
        "coordinator": coordinator,
        "session": session
    }

    entry.async_on_unload(entry.add_update_listener(async_update_options))

    # Use the modern method to forward the setup to all platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_update_options(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload entry when options are updated."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    # Correctly unload all platforms associated with the config entry
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    
    if unload_ok:
        # Properly close the session and remove the entry data
        await hass.data[DOMAIN][entry.entry_id]["session"].close()
        hass.data[DOMAIN].pop(entry.entry_id)

    return unload_ok


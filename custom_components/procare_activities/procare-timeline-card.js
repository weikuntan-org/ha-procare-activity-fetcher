// PrcareTimelineCard.js

import { LitElement, css, html } from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

// =============================
// Procare Timeline Card Editor
// =============================
export class ProcareTimelineCardEditor extends LitElement {
  static get properties() {
    return {
      _config: { type: Object },
    };
  }

  setConfig(config) {
    this._config = config || {};
  }

  set hass(hass) {
    this._hass = hass;
  }

  render() {
    if (!this._config) {
      return html`<div>Please configure the card.</div>`;
    }
    const { generalSchema, filterSchema, displaySchema, dateFormatSchema } = this._getSchemas();

    return html`
      <style>
        .card-content { display: flex; flex-direction: column; gap: 16px; }
        details {
          border: 1px solid var(--divider-color, #eeeeee);
          border-radius: var(--ha-card-border-radius, 20px);
          margin-bottom: 0;
          overflow: hidden;
        }
        summary {
          font-weight: 500;
          font-size: 1rem;
          padding: 12px 16px;
          cursor: pointer;
          outline: none;
          user-select: none;
          display: flex;
          align-items: center;
        }
        summary::-webkit-details-marker { display: none; }
        summary:before {
          content: '';
          display: inline-block;
          margin-right: 8px;
          border-style: solid;
          border-width: 0.35em 0.35em 0 0.35em;
          border-color: var(--primary-text-color) transparent transparent transparent;
          vertical-align: middle;
          transition: transform 0.2s;
          transform: rotate(-90deg);
        }
        details[open] summary:before { transform: rotate(0deg); }
        .section-content { padding: 16px; }
        .section-icon {
          margin-right: 8px;
          color: var(--primary-text-color);
          font-size: 20px;
          vertical-align: middle;
        }
      </style>
      <ha-card>
        <div class="card-content">
          <details open>
            <summary><ha-icon class="section-icon" icon="mdi:cog"></ha-icon>General</summary>
            <div class="section-content">
              <ha-form
                .data=${this._config}
                .schema=${generalSchema}
                .computeLabel=${this._computeLabel}
                .computeHelper=${this._computeHelper}
                @value-changed=${this._valueChanged}
              ></ha-form>
            </div>
          </details>
          <details>
            <summary><ha-icon class="section-icon" icon="mdi:filter-variant"></ha-icon>Filters</summary>
            <div class="section-content">
              <ha-form
                .data=${this._config}
                .schema=${filterSchema}
                .computeLabel=${this._computeLabel}
                .computeHelper=${this._computeHelper}
                @value-changed=${this._valueChanged}
              ></ha-form>
            </div>
          </details>
          <details>
            <summary><ha-icon class="section-icon" icon="mdi:view-list"></ha-icon>Display</summary>
            <div class="section-content">
              <ha-form
                .data=${this._config}
                .schema=${displaySchema}
                .computeLabel=${this._computeLabel}
                .computeHelper=${this._computeHelper}
                @value-changed=${this._valueChanged}
              ></ha-form>
            </div>
          </details>
          <details>
            <summary><ha-icon class="section-icon" icon="mdi:translate"></ha-icon>Date Format</summary>
            <div class="section-content">
              <ha-form
                .data=${this._config}
                .schema=${dateFormatSchema}
                .computeLabel=${this._computeLabel}
                .computeHelper=${this._computeHelper}
                @value-changed=${this._valueChanged}
              ></ha-form>
            </div>
          </details>
        </div>
      </ha-card>
    `;
  }

  _getSchemas() {
    const hass = this._hass;
    return {
      generalSchema: [
        { name: "header", description: "Header text for the card.", selector: { text: {} } },
        {
          name: "entity",
          description: "Select the Procare child timeline entity to display.",
          selector: {
            select: {
              mode: "dropdown",
              options: hass ? Object.keys(hass.states)
                .filter(e => e.startsWith('sensor.'))
                .map(e => ({ value: e, label: hass.states[e].attributes.friendly_name || e })) : [],
            }
          }
        }
      ],
      filterSchema: [
        {
          name: "number_of_events",
          description: "Max events to display when ungrouped. Ignored when Group by Day is on.",
          selector: { number: { min: 1, max: 200, step: 1 } }
        }
      ],
      displaySchema: [
        { name: "group_by_day", description: "Group activities under per-day headers.", selector: { boolean: {} } },
        { name: "paginate_by_day", description: "Show one day at a time with ◀ ▶ arrows. Takes precedence over Group by Day.", selector: { boolean: {} } },
        { name: "show_summaries", description: "Show per-day summary chips (diapers, sleep, meals, bottles). Requires grouping or pagination.", selector: { boolean: {} } },
      ],
      dateFormatSchema: [
        {
          name: "date_format",
          description: "Date format for the card.",
          selector: {
            select: {
              options: [
                { value: "short", label: "Short" },
                { value: "long", label: "Long" },
                { value: "monthddyy", label: "Month dd yy" },
              ]
            }
          }
        }
      ]
    };
  }

  _computeLabel(schema) {
    const labels = {
      header: "Header",
      entity: "Procare Child Sensor Entity",
      number_of_events: "Number of Events",
      date_format: "Date Format",
      group_by_day: "Group by Day",
      paginate_by_day: "Paginate by Day",
      show_summaries: "Show Day Summaries",
    };
    return labels[schema.name] || schema.name;
  }

  _computeHelper = (schema) => schema.description || "";

  _valueChanged(event) {
    let newConfig = event.detail.value;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig } }));
  }

  static get styles() {
    return css`
      ha-card { padding: 16px; }
      .card-content { display: flex; flex-direction: column; gap: 16px; }
    `;
  }
}

if (!customElements.get("procare-timeline-card-editor")) {
  customElements.define("procare-timeline-card-editor", ProcareTimelineCardEditor);
}

// =============================
// Card registration
// =============================
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'procare-timeline-card')) {
  window.customCards.push({
    type: 'procare-timeline-card',
    name: 'Procare Timeline Card',
    description: 'A timeline card to display Procare activities.',
  });
}


// =============================
// Procare Timeline Card
// =============================
class ProcareTimelineCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You must define an entity');
    }
    this._config = {
      header: config.header || 'Procare Activities',
      entity: config.entity,
      number_of_events: config.number_of_events || 10,
      date_format: config.date_format || 'monthddyy',
      group_by_day: !!config.group_by_day,
      paginate_by_day: !!config.paginate_by_day,
      show_summaries: !!config.show_summaries,
    };
    this._currentDayKey = null;  // resolved on first render
  }

  set hass(hass) {
    if (!this._config) return;
    const entityId = this._config.entity;
    const state = hass.states[entityId];

    if (!state) {
      this.renderError(`Entity not found: ${entityId}`);
      return;
    }

    this._activities = state.attributes.activities || [];
    this._rerender();
  }

  _rerender() {
    let activities = this._activities || [];
    if (!this._config.group_by_day && !this._config.paginate_by_day) {
      activities = activities.slice(0, this._config.number_of_events);
    }
    this.render(activities);
  }

  getIcon(title) {
    title = (title || '').toLowerCase();
    if (title.startsWith('bottle')) return 'mdi:baby-bottle-outline';
    if (title.includes('meal') || title.includes('snack') || title.includes('breakfast') || title.includes('lunch') || title.includes('dinner')) return 'mdi:silverware-fork-knife';
    if (title.includes('nap') || title.includes('slept')) return 'mdi:power-sleep';
    if (title.includes('diaper')) return 'mdi:baby-carriage';
    if (title.includes('health')) return 'mdi:heart-pulse';
    if (title.includes('incident')) return 'mdi:alert-circle-outline';
    if (title.includes('potty')) return 'mdi:human-male-female';
    if (title.includes('learning')) return 'mdi:school';
    if (title.includes('meds')) return 'mdi:pill';
    if (title.includes('signed in')) return 'mdi:login';
    if (title.includes('signed out')) return 'mdi:logout';
    if (title.includes('note')) return 'mdi:note-text-outline';
    if (title.includes('video')) return 'mdi:video';
    if (title.includes('photo')) return 'mdi:camera';
    return 'mdi:child-toy';
  }

  formatDate(timestamp) {
    const d = new Date(timestamp);
    switch (this._config.date_format) {
      case "date": return d.toLocaleDateString();
      case "time": return d.toLocaleTimeString();
      case "long": return d.toLocaleString(undefined, {
        weekday: "long", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
      case "monthddyy": return d.toLocaleString(undefined, {
        month: "long", day: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit"
      });
      case "short":
      default: return d.toLocaleString();
    }
  }

  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  groupByDay(activities) {
    const groups = new Map();
    const today = new Date().toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toDateString();

    for (const a of activities) {
      const d = new Date(a.timestamp);
      const dayKey = d.toDateString();
      if (!groups.has(dayKey)) {
        const dateLabel = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
        let label;
        if (dayKey === today) label = `Today · ${dateLabel}`;
        else if (dayKey === yesterday) label = `Yesterday · ${dateLabel}`;
        else label = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
        groups.set(dayKey, { key: dayKey, label, items: [] });
      }
      groups.get(dayKey).items.push(a);
    }
    return Array.from(groups.values());
  }

  summarize(activities) {
    const s = {
      wet: 0, bm: 0, sleep_minutes: 0,
      meal_count: 0, bottle_count: 0, bottle_oz_total: 0,
      daycare_minutes: 0, daycare_ongoing: false,
    };
    let signedInTs = null;
    let signedOutTs = null;
    for (const a of activities) {
      const title = a.title || '';
      const t = title.toLowerCase();
      if (t.includes('signed in')) {
        const ts = new Date(a.timestamp).getTime();
        if (isFinite(ts) && (signedInTs === null || ts < signedInTs)) signedInTs = ts;
      } else if (t.includes('signed out')) {
        const ts = new Date(a.timestamp).getTime();
        if (isFinite(ts) && (signedOutTs === null || ts > signedOutTs)) signedOutTs = ts;
      }
      if (t.startsWith('diaper:')) {
        const rest = t.slice('diaper:'.length);
        if (/\bwet\b/.test(rest)) s.wet += 1;
        if (/\bbm\b/.test(rest)) s.bm += 1;
      } else if (t.startsWith('slept from ')) {
        const m = title.match(/Slept from (\d{1,2}:\d{2}\s*[AP]M)\s+to (\d{1,2}:\d{2}\s*[AP]M)/i);
        if (m) {
          const baseDate = new Date(a.timestamp).toDateString();
          const start = new Date(`${baseDate} ${m[1]}`);
          let end = new Date(`${baseDate} ${m[2]}`);
          if (isFinite(start) && isFinite(end)) {
            if (end < start) end = new Date(end.getTime() + 86400000);
            s.sleep_minutes += Math.round((end - start) / 60000);
          }
        }
      } else if (t.startsWith('meal')) {
        s.meal_count += 1;
      } else if (t.startsWith('bottle')) {
        s.bottle_count += 1;
        const m = title.match(/(\d+(?:\.\d+)?)\s*oz/i);
        if (m) s.bottle_oz_total += parseFloat(m[1]);
      }
    }
    if (signedInTs !== null) {
      let endTs = signedOutTs;
      if (endTs === null) {
        const sameDayAsToday = new Date(signedInTs).toDateString() === new Date().toDateString();
        if (sameDayAsToday) {
          endTs = Date.now();
          s.daycare_ongoing = true;
        }
      }
      if (endTs !== null && endTs > signedInTs) {
        s.daycare_minutes = Math.round((endTs - signedInTs) / 60000);
      }
    }
    return s;
  }

  chipsHtml(s) {
    const chips = [];
    if (s.daycare_minutes) {
      const h = Math.floor(s.daycare_minutes / 60);
      const m = s.daycare_minutes % 60;
      const txt = h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
      const suffix = s.daycare_ongoing ? ' so far' : '';
      chips.push(`<span class="chip"><ha-icon icon="mdi:clock-outline"></ha-icon>${txt} at daycare${suffix}</span>`);
    }
    if (s.wet) chips.push(`<span class="chip"><ha-icon icon="mdi:water"></ha-icon>${s.wet} wet</span>`);
    if (s.bm) chips.push(`<span class="chip"><ha-icon icon="mdi:emoticon-poop-outline"></ha-icon>${s.bm} BM</span>`);
    if (s.sleep_minutes) {
      const h = Math.floor(s.sleep_minutes / 60);
      const m = s.sleep_minutes % 60;
      const txt = h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
      chips.push(`<span class="chip"><ha-icon icon="mdi:power-sleep"></ha-icon>${txt} sleep</span>`);
    }
    if (s.meal_count) {
      chips.push(`<span class="chip"><ha-icon icon="mdi:silverware-fork-knife"></ha-icon>${s.meal_count} meal${s.meal_count === 1 ? '' : 's'}</span>`);
    }
    if (s.bottle_count) {
      const ozTxt = s.bottle_oz_total ? ` · ${this._fmtOz(s.bottle_oz_total)}oz` : '';
      chips.push(`<span class="chip"><ha-icon icon="mdi:baby-bottle-outline"></ha-icon>${s.bottle_count} bottle${s.bottle_count === 1 ? '' : 's'}${ozTxt}</span>`);
    }
    return chips.length ? `<div class="chips">${chips.join('')}</div>` : '';
  }

  _fmtOz(n) {
    // Trim trailing zeros, keep up to 1 decimal.
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  }

  openMediaModal(url, isVideo) {
    const modal = this.shadowRoot.getElementById('media-modal');
    const body = this.shadowRoot.getElementById('media-modal-body');
    if (!modal || !body) return;
    body.innerHTML = isVideo
      ? `<video src="${url}" controls autoplay playsinline></video>`
      : `<img src="${url}" alt="Activity media">`;
    modal.classList.add('open');
  }

  closeMediaModal() {
    const modal = this.shadowRoot.getElementById('media-modal');
    const body = this.shadowRoot.getElementById('media-modal-body');
    if (!modal) return;
    modal.classList.remove('open');
    if (body) body.innerHTML = '';
  }

  itemHtml(activity) {
    const icon = this.getIcon(activity.title);
    const time = this._config.group_by_day
      ? this.formatTime(activity.timestamp)
      : this.formatDate(activity.timestamp);
    const title = activity.title || 'Activity';
    const description = activity.details || '';
    const staff = activity.staff ? `<div class="staff truncatable">by ${activity.staff}</div>` : '';
    let media = '';
    if (activity.video_url) {
      const poster = activity.photo_url ? ` poster="${activity.photo_url}"` : '';
      media = `
        <div class="media-wrap" data-media-url="${activity.video_url}" data-media-video="1">
          <video class="media" muted playsinline preload="metadata"${poster} src="${activity.video_url}"></video>
          <div class="play-overlay"><ha-icon icon="mdi:play-circle"></ha-icon></div>
        </div>
      `;
    } else if (activity.photo_url) {
      media = `<img class="media" src="${activity.photo_url}" alt="Activity photo" data-media-url="${activity.photo_url}" data-media-video="0">`;
    }
    return `
      <div class="timeline-item">
        <div class="timeline-icon"><ha-icon icon="${icon}"></ha-icon></div>
        <div class="timeline-content">
          <div class="title truncatable">${title}</div>
          <div class="time">${time}</div>
          ${description ? `<div class="description truncatable">${description}</div>` : ''}
          ${staff}
          ${media}
        </div>
      </div>
    `;
  }

  render(activities) {
    const cardTitle = this._config.header;

    if (!this.shadowRoot.querySelector('ha-card')) {
      this.shadowRoot.innerHTML = `
        <style>
          ha-card { padding: 8px 16px 12px; }
          .card-title {
            font-size: var(--ha-card-header-font-size, 1.5em);
            font-weight: 400;
            color: var(--ha-card-header-color, var(--primary-text-color));
            line-height: 1.2;
            margin: 0 0 8px 0;
            padding: 0;
          }
          .timeline { position: relative; }
          .timeline::before {
            content: '';
            position: absolute;
            left: 19px;
            top: 20px;
            bottom: 20px;
            width: 2px;
            background: var(--primary-color);
            z-index: 0;
          }
          .timeline-item {
            position: relative;
            display: flex;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 10px;
            z-index: 1;
          }
          .timeline-item:last-child { margin-bottom: 0; }
          .timeline-icon {
            flex: 0 0 40px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: var(--card-background-color);
            color: var(--primary-color);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
          }
          .timeline-content {
            flex: 1;
            min-width: 0;
            padding-top: 2px;
          }
          .timeline-content .title { font-weight: 600; font-size: 1.05em; line-height: 1.25; margin-bottom: 1px; }
          .timeline-content .time { color: var(--secondary-text-color); font-size: 0.85em; line-height: 1.2; margin-bottom: 2px; }
          .timeline-content .description { color: var(--primary-text-color); line-height: 1.25; }
          .timeline-content .staff { font-style: italic; color: var(--secondary-text-color); margin-top: 1px; font-size: 0.9em; line-height: 1.2; }
          .truncatable {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: pointer;
            word-break: break-word;
          }
          .truncatable.expanded {
            display: block;
            -webkit-line-clamp: unset;
            overflow: visible;
            text-overflow: clip;
          }
          .timeline-content .media {
            max-width: 128px;
            max-height: 128px;
            width: auto;
            height: auto;
            border-radius: 6px;
            margin-top: 4px;
            display: block;
            cursor: pointer;
            object-fit: contain;
          }
          .media-wrap {
            position: relative;
            display: inline-block;
            margin-top: 4px;
            cursor: pointer;
            line-height: 0;
          }
          .media-wrap .media { margin-top: 0; }
          .play-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            color: white;
            --mdc-icon-size: 44px;
          }
          .play-overlay ha-icon {
            background: rgba(0, 0, 0, 0.45);
            border-radius: 50%;
            filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));
          }
          .modal-overlay {
            position: fixed; inset: 0;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            align-items: center; justify-content: center;
            z-index: 9999;
          }
          .modal-overlay.open { display: flex; }
          .modal-body { max-width: 95vw; max-height: 95vh; display: flex; align-items: center; justify-content: center; }
          .modal-body img, .modal-body video {
            max-width: 95vw; max-height: 95vh;
            object-fit: contain;
            border-radius: 4px;
          }
          .modal-close {
            position: fixed; top: 12px; right: 16px;
            color: white; background: rgba(0,0,0,0.4);
            border: none; width: 40px; height: 40px;
            border-radius: 50%; font-size: 24px; line-height: 1;
            cursor: pointer; display: flex;
            align-items: center; justify-content: center;
          }
          .day-header {
            font-weight: 600;
            font-size: 1.05em;
            color: var(--primary-text-color);
            margin: 24px 0 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--divider-color);
          }
          .day-header:first-child { margin-top: 0; }
          .day-nav {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--divider-color);
          }
          .day-nav .day-header {
            flex: 1;
            text-align: center;
            margin: 0;
            padding: 0;
            border: none;
          }
          .nav-btn {
            background: var(--secondary-background-color);
            color: var(--primary-text-color);
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 1.3em;
            line-height: 1;
            padding: 0;
            font-family: inherit;
          }
          .nav-btn:hover:not(:disabled) { background: var(--divider-color); }
          .nav-btn:disabled { opacity: 0.3; cursor: default; }
          .chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 16px;
          }
          .chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: var(--secondary-background-color);
            border-radius: 999px;
            padding: 4px 10px;
            font-size: 0.85em;
            color: var(--primary-text-color);
          }
          .chip ha-icon { --mdc-icon-size: 16px; color: var(--primary-color); }
          .no-activities { padding: 16px; }
        </style>
        <ha-card>
          <div class="card-title">${cardTitle}</div>
          <div id="timeline-container"></div>
        </ha-card>
        <div id="media-modal" class="modal-overlay" role="dialog" aria-modal="true">
          <button class="modal-close" id="media-modal-close" aria-label="Close">&times;</button>
          <div class="modal-body" id="media-modal-body"></div>
        </div>
      `;

      const modal = this.shadowRoot.getElementById('media-modal');
      const closeBtn = this.shadowRoot.getElementById('media-modal-close');
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeMediaModal();
      });
      closeBtn.addEventListener('click', () => this.closeMediaModal());
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeMediaModal();
      });
    }

    const container = this.shadowRoot.getElementById('timeline-container');

    if (activities.length === 0) {
      container.innerHTML = `<div class="no-activities">No activities to display.</div>`;
      return;
    }

    let timelineHtml = '';
    if (this._config.paginate_by_day) {
      const groups = this.groupByDay(activities);
      // Resolve the day to display. If the stored key no longer exists
      // (e.g. it aged out of the 7-day window), snap back to the newest.
      if (!this._currentDayKey || !groups.some(g => g.key === this._currentDayKey)) {
        this._currentDayKey = groups[0]?.key || null;
      }
      const currentIdx = groups.findIndex(g => g.key === this._currentDayKey);
      const current = groups[currentIdx];
      if (!current) {
        container.innerHTML = `<div class="no-activities">No activities to display.</div>`;
        return;
      }
      const hasOlder = currentIdx < groups.length - 1;
      const hasNewer = currentIdx > 0;
      timelineHtml += `
        <div class="day-nav">
          <button class="nav-btn" data-dir="older" ${hasOlder ? '' : 'disabled'} aria-label="Older day">‹</button>
          <div class="day-header">${current.label}</div>
          <button class="nav-btn" data-dir="newer" ${hasNewer ? '' : 'disabled'} aria-label="Newer day">›</button>
        </div>
      `;
      if (this._config.show_summaries) {
        timelineHtml += this.chipsHtml(this.summarize(current.items));
      }
      timelineHtml += '<div class="timeline">';
      for (const a of current.items) timelineHtml += this.itemHtml(a);
      timelineHtml += '</div>';
    } else if (this._config.group_by_day) {
      const groups = this.groupByDay(activities);
      for (const g of groups) {
        timelineHtml += `<div class="day-header">${g.label}</div>`;
        if (this._config.show_summaries) {
          timelineHtml += this.chipsHtml(this.summarize(g.items));
        }
        timelineHtml += '<div class="timeline">';
        for (const a of g.items) timelineHtml += this.itemHtml(a);
        timelineHtml += '</div>';
      }
    } else {
      timelineHtml += '<div class="timeline">';
      for (const a of activities) timelineHtml += this.itemHtml(a);
      timelineHtml += '</div>';
    }

    container.innerHTML = timelineHtml;

    container.querySelectorAll('.truncatable').forEach(el => {
      el.addEventListener('click', () => el.classList.toggle('expanded'));
    });
    container.querySelectorAll('[data-media-url]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = el.getAttribute('data-media-url');
        const isVideo = el.getAttribute('data-media-video') === '1';
        this.openMediaModal(url, isVideo);
      });
    });

    if (this._config.paginate_by_day) {
      container.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          const groups = this.groupByDay(this._activities || []);
          const idx = groups.findIndex(g => g.key === this._currentDayKey);
          const dir = btn.dataset.dir;
          if (dir === 'older' && idx < groups.length - 1) {
            this._currentDayKey = groups[idx + 1].key;
          } else if (dir === 'newer' && idx > 0) {
            this._currentDayKey = groups[idx - 1].key;
          }
          this._rerender();
        });
      });
    }
  }

  renderError(error) {
    this.shadowRoot.innerHTML = `
      <style>.error { color: var(--error-color); padding: 16px; }</style>
      <ha-card header="Timeline Card Error"><div class="error">${error}</div></ha-card>
    `;
  }

  getCardSize() {
    return 3;
  }

  static getConfigElement() {
    return document.createElement("procare-timeline-card-editor");
  }

  static getStubConfig() {
    return {}; // no default entity
  }
}

if (!customElements.get('procare-timeline-card')) {
  customElements.define('procare-timeline-card', ProcareTimelineCard);
}

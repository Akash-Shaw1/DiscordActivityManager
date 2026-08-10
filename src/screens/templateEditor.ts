import { Template } from "../api";

export class TemplateEditor {
  private container: HTMLElement;
  private currentTemplate: Template;
  private onSave: (template: Template) => void;
  private onApply: (template: Template) => void;

  constructor(container: HTMLElement, template: Template, onSave: (template: Template) => void, onApply: (template: Template) => void) {
    this.container = container;
    this.currentTemplate = JSON.parse(JSON.stringify(template));
    this.onSave = onSave;
    this.onApply = onApply;
  }

  public setTemplate(template: Template) {
    this.currentTemplate = JSON.parse(JSON.stringify(template));
    this.render();
  }

  public render() {
    const act = this.currentTemplate.activity;
    const assets = act.assets || {};
    const buttons = act.buttons || [];
    const btn1 = buttons[0] || { label: "", url: "" };
    const btn2 = buttons[1] || { label: "", url: "" };

    this.container.innerHTML = `
      <div class="editor-workspace">
        <!-- Form Left -->
        <div class="editor-form-panel">
          <div class="panel-card">
            <div class="panel-heading">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Status Details & Configuration
            </div>

            <div class="form-grid">
              <div class="form-group full-width">
                <label>Preset Name</label>
                <input type="text" id="inp-preset-name" value="${escapeAttr(this.currentTemplate.name)}" placeholder="e.g. Coding Session">
              </div>

              <div class="form-group">
                <label>Application / Activity Name</label>
                <input type="text" id="inp-act-name" value="${escapeAttr(act.name)}" placeholder="e.g. Visual Studio Code">
              </div>

              <div class="form-group">
                <label>Activity Type</label>
                <select id="inp-act-type">
                  <option value="0" ${act.type === 0 ? "selected" : ""}>Playing</option>
                  <option value="2" ${act.type === 2 ? "selected" : ""}>Listening</option>
                  <option value="3" ${act.type === 3 ? "selected" : ""}>Watching</option>
                  <option value="5" ${act.type === 5 ? "selected" : ""}>Competing</option>
                </select>
              </div>

              <div class="form-group full-width">
                <label>Details (Line 1)</label>
                <input type="text" id="inp-act-details" value="${escapeAttr(act.details || "")}" placeholder="e.g. Working on Rust IPC protocol">
              </div>

              <div class="form-group full-width">
                <label>State (Line 2)</label>
                <input type="text" id="inp-act-state" value="${escapeAttr(act.state || "")}" placeholder="e.g. Workspace: discord-tracker">
              </div>

              <div class="form-group full-width" style="flex-direction: row; align-items: center; gap: 8px;">
                <input type="checkbox" id="chk-show-timer" ${act.timestamps?.start ? "checked" : ""} style="width: 16px; height: 16px; cursor: pointer;">
                <label for="chk-show-timer" style="cursor: pointer; text-transform: none; font-size: 13px; font-weight: 500;">Show Live Elapsed Time Timer</label>
              </div>
            </div>
          </div>

          <div class="panel-card">
            <div class="panel-heading">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              Art Assets & Tooltips
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>Large Image Key</label>
                <input type="text" id="inp-large-img" value="${escapeAttr(assets.large_image || "")}" placeholder="Uploaded asset key">
              </div>
              <div class="form-group">
                <label>Large Image Tooltip</label>
                <input type="text" id="inp-large-txt" value="${escapeAttr(assets.large_text || "")}" placeholder="Hover text">
              </div>
              <div class="form-group">
                <label>Small Image Key</label>
                <input type="text" id="inp-small-img" value="${escapeAttr(assets.small_image || "")}" placeholder="Uploaded asset key">
              </div>
              <div class="form-group">
                <label>Small Image Tooltip</label>
                <input type="text" id="inp-small-txt" value="${escapeAttr(assets.small_text || "")}" placeholder="Hover text">
              </div>
            </div>
          </div>

          <div class="panel-card">
            <div class="panel-heading">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Custom Action Buttons (Max 2)
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>Button 1 Label</label>
                <input type="text" id="inp-btn1-label" value="${escapeAttr(btn1.label)}" placeholder="e.g. View GitHub Repo">
              </div>
              <div class="form-group">
                <label>Button 1 URL</label>
                <input type="text" id="inp-btn1-url" value="${escapeAttr(btn1.url)}" placeholder="https://github.com/...">
              </div>

              <div class="form-group">
                <label>Button 2 Label</label>
                <input type="text" id="inp-btn2-label" value="${escapeAttr(btn2.label)}" placeholder="e.g. Visit Website">
              </div>
              <div class="form-group">
                <label>Button 2 URL</label>
                <input type="text" id="inp-btn2-url" value="${escapeAttr(btn2.url)}" placeholder="https://example.com">
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="btn-save-preset" class="btn btn-secondary">Save Preset</button>
            <button id="btn-apply-preset" class="btn btn-success">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Apply Status Now
            </button>
          </div>
        </div>

        <!-- Live Discord Card Preview Right -->
        <div class="preview-panel">
          <div class="wumpus-banner-box">
            <img src="/src/assets/wumpus.png" class="wumpus-img" alt="Wumpus">
            <div>
              <div style="font-size: 13px; font-weight: 700; color: white;">Native Discord RPC</div>
              <div style="font-size: 11px; color: var(--discord-text-muted);">Real-time presence engine powered by Rust named-pipe transport.</div>
            </div>
          </div>

          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--discord-text-muted); letter-spacing: 0.5px;">
            Live Profile Preview
          </div>

          <div class="discord-profile-card">
            <div class="discord-profile-header">
              <div class="avatar-container">
                <div class="avatar-img">U</div>
                <div class="avatar-status-dot"></div>
              </div>
              <div class="profile-names">
                <span class="profile-display-name">You</span>
                <span class="profile-username">discord_user</span>
              </div>
            </div>

            <div class="discord-activity-section">
              <div class="activity-type-label" id="prev-type-label">
                ${getActivityTypeLabel(act.type)}
              </div>
              
              <div class="activity-body">
                <div class="activity-assets">
                  <div class="large-image-box" id="prev-large-box">
                    ${assets.large_image ? '🖼️' : '🎮'}
                  </div>
                  ${assets.small_image ? `<div class="small-image-badge">⚡</div>` : ''}
                </div>

                <div class="activity-text-details">
                  <div class="activity-title" id="prev-act-title">${escapeHtml(act.name || "Application Name")}</div>
                  <div class="activity-line" id="prev-act-details">${escapeHtml(act.details || "Details line")}</div>
                  <div class="activity-line" id="prev-act-state" style="color: var(--text-muted);">${escapeHtml(act.state || "State line")}</div>
                  <div class="activity-line" id="prev-act-timer" style="color: var(--text-muted); font-size: 11px; margin-top: 2px;">00:00 elapsed</div>
                </div>
              </div>

              <div class="activity-buttons-stack" id="prev-buttons-stack">
                ${btn1.label ? `<div class="discord-preview-btn">${escapeHtml(btn1.label)}</div>` : ''}
                ${btn2.label ? `<div class="discord-preview-btn">${escapeHtml(btn2.label)}</div>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  public collectFormData(): Template {
    const getVal = (id: string) => (this.container.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement)?.value?.trim() || "";

    const name = getVal("inp-preset-name") || "Custom Status";
    const actName = getVal("inp-act-name") || "Visual Studio Code";
    const actType = parseInt(getVal("inp-act-type") || "0", 10);
    const details = getVal("inp-act-details") || undefined;
    const state = getVal("inp-act-state") || undefined;

    const largeImg = getVal("inp-large-img") || undefined;
    const largeTxt = getVal("inp-large-txt") || undefined;
    const smallImg = getVal("inp-small-img") || undefined;
    const smallTxt = getVal("inp-small-txt") || undefined;

    let assets = undefined;
    if (largeImg || largeTxt || smallImg || smallTxt) {
      assets = {
        large_image: largeImg,
        large_text: largeTxt,
        small_image: smallImg,
        small_text: smallTxt,
      };
    }

    const l1 = getVal("inp-btn1-label");
    const u1 = getVal("inp-btn1-url");
    const l2 = getVal("inp-btn2-label");
    const u2 = getVal("inp-btn2-url");

    const btns = [];
    if (l1 && u1) btns.push({ label: l1, url: u1 });
    if (l2 && u2) btns.push({ label: l2, url: u2 });

    const showTimer = (this.container.querySelector("#chk-show-timer") as HTMLInputElement)?.checked;
    const timestamps = showTimer ? { start: Math.floor(Date.now() / 1000) } : undefined;

    this.currentTemplate = {
      id: this.currentTemplate.id,
      name,
      activity: {
        name: actName,
        details,
        state,
        type: actType,
        timestamps,
        assets,
        buttons: btns.length > 0 ? btns : undefined,
      },
    };

    return this.currentTemplate;
  }

  private attachEvents() {
    const bindInput = (id: string, callback: (val: string) => void) => {
      const el = this.container.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement;
      if (el) {
        el.addEventListener("input", (e) => {
          callback((e.target as HTMLInputElement).value);
          this.updatePreview();
        });
      }
    };

    bindInput("inp-preset-name", val => { this.currentTemplate.name = val; });
    bindInput("inp-act-name", val => { this.currentTemplate.activity.name = val; });
    bindInput("inp-act-type", val => { this.currentTemplate.activity.type = parseInt(val, 10); });
    bindInput("inp-act-details", val => { this.currentTemplate.activity.details = val || undefined; });
    bindInput("inp-act-state", val => { this.currentTemplate.activity.state = val || undefined; });

    bindInput("inp-large-img", val => {
      if (!this.currentTemplate.activity.assets) this.currentTemplate.activity.assets = {};
      this.currentTemplate.activity.assets.large_image = val || undefined;
    });
    bindInput("inp-large-txt", val => {
      if (!this.currentTemplate.activity.assets) this.currentTemplate.activity.assets = {};
      this.currentTemplate.activity.assets.large_text = val || undefined;
    });
    bindInput("inp-small-img", val => {
      if (!this.currentTemplate.activity.assets) this.currentTemplate.activity.assets = {};
      this.currentTemplate.activity.assets.small_image = val || undefined;
    });
    bindInput("inp-small-txt", val => {
      if (!this.currentTemplate.activity.assets) this.currentTemplate.activity.assets = {};
      this.currentTemplate.activity.assets.small_text = val || undefined;
    });

    const updateButtons = () => {
      const l1 = (this.container.querySelector("#inp-btn1-label") as HTMLInputElement)?.value;
      const u1 = (this.container.querySelector("#inp-btn1-url") as HTMLInputElement)?.value;
      const l2 = (this.container.querySelector("#inp-btn2-label") as HTMLInputElement)?.value;
      const u2 = (this.container.querySelector("#inp-btn2-url") as HTMLInputElement)?.value;

      const btns = [];
      if (l1 && u1) btns.push({ label: l1, url: u1 });
      if (l2 && u2) btns.push({ label: l2, url: u2 });
      this.currentTemplate.activity.buttons = btns.length > 0 ? btns : undefined;
      this.updatePreview();
    };

    ["inp-btn1-label", "inp-btn1-url", "inp-btn2-label", "inp-btn2-url"].forEach(id => {
      this.container.querySelector(`#${id}`)?.addEventListener("input", updateButtons);
    });

    const timerChk = this.container.querySelector("#chk-show-timer") as HTMLInputElement;
    if (timerChk) {
      timerChk.addEventListener("change", () => {
        if (timerChk.checked) {
          this.currentTemplate.activity.timestamps = { start: Math.floor(Date.now() / 1000) };
        } else {
          this.currentTemplate.activity.timestamps = undefined;
        }
        this.updatePreview();
      });
    }

    this.container.querySelector("#btn-save-preset")?.addEventListener("click", () => {
      const t = this.collectFormData();
      this.onSave(t);
      showToast("✨ Preset saved!");
    });

    this.container.querySelector("#btn-apply-preset")?.addEventListener("click", () => {
      const t = this.collectFormData();
      this.onSave(t);
      this.onApply(t);
      showToast("🚀 Status applied to Discord!");
    });
  }

  private updatePreview() {
    const act = this.currentTemplate.activity;
    const prevType = this.container.querySelector("#prev-type-label");
    if (prevType) prevType.textContent = getActivityTypeLabel(act.type);

    const prevTitle = this.container.querySelector("#prev-act-title");
    if (prevTitle) prevTitle.textContent = act.name || "Application Name";

    const prevDetails = this.container.querySelector("#prev-act-details");
    if (prevDetails) prevDetails.textContent = act.details || "";

    const prevState = this.container.querySelector("#prev-act-state");
    if (prevState) prevState.textContent = act.state || "";

    const prevTimer = this.container.querySelector("#prev-act-timer");
    if (prevTimer) {
      if (act.timestamps?.start) {
        let startSec = act.timestamps.start;
        if (startSec > 20000000000) startSec = Math.floor(startSec / 1000);
        const elapsedSec = Math.max(0, Math.floor(Date.now() / 1000) - startSec);
        const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
        const secs = (elapsedSec % 60).toString().padStart(2, '0');
        prevTimer.textContent = `${mins}:${secs} elapsed`;
        (prevTimer as HTMLElement).style.display = "block";
      } else {
        (prevTimer as HTMLElement).style.display = "none";
      }
    }

    const prevBtns = this.container.querySelector("#prev-buttons-stack");
    if (prevBtns) {
      const btns = act.buttons || [];
      prevBtns.innerHTML = btns.map(b => `<div class="discord-preview-btn">${escapeHtml(b.label)}</div>`).join('');
    }
  }
}

function showToast(message: string) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function getActivityTypeLabel(type: number): string {
  switch (type) {
    case 0: return "Playing a game";
    case 2: return "Listening to";
    case 3: return "Watching";
    case 5: return "Competing in";
    default: return "Playing a game";
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;");
}

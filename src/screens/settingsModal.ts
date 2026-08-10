import { AppSettings, DEFAULT_CLIENT_ID } from "../api";

export class SettingsModal {
  private container: HTMLElement;
  private settings: AppSettings;
  private onSave: (settings: AppSettings) => void;
  private onClose: () => void;

  constructor(container: HTMLElement, settings: AppSettings, onSave: (settings: AppSettings) => void, onClose: () => void) {
    this.container = container;
    this.settings = JSON.parse(JSON.stringify(settings));
    this.onSave = onSave;
    this.onClose = onClose;
  }

  public render() {
    this.container.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">App Settings</div>
            <button id="btn-close-modal" class="close-btn">&times;</button>
          </div>

          <div class="field">
            <label>Discord Application ID (Client ID)</label>
            <input type="text" id="inp-settings-cid" value="${escapeAttr(this.settings.client_id)}" placeholder="Application ID">
            <span style="font-size:11px;color:var(--text-muted);margin-top:4px;display:block;">
              Default: <code style="background:var(--bg-tertiary);padding:2px 5px;border-radius:var(--radius-sm);">${DEFAULT_CLIENT_ID}</code>. Create custom app at
              <a href="https://discord.com/developers/applications" target="_blank" style="color:var(--brand);">Discord Developer Portal</a>.
            </span>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-top:1px solid var(--bg-tertiary);">
            <div>
              <div style="font-size:14px;font-weight:600;">Launch on System Startup</div>
              <div style="font-size:12px;color:var(--text-muted);">Start status manager when Windows boots</div>
            </div>
            <input type="checkbox" id="chk-autostart" ${this.settings.autostart ? "checked" : ""} style="width:18px;height:18px;cursor:pointer;accent-color:var(--brand);">
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-top:1px solid var(--bg-tertiary);">
            <div>
              <div style="font-size:14px;font-weight:600;">Start Minimized to Tray</div>
              <div style="font-size:12px;color:var(--text-muted);">Launch in system tray without opening window</div>
            </div>
            <input type="checkbox" id="chk-minimized" ${this.settings.start_minimized ? "checked" : ""} style="width:18px;height:18px;cursor:pointer;accent-color:var(--brand);">
          </div>

          <div class="card-footer" style="margin-top:8px;">
            <button id="btn-cancel-settings" class="btn btn-secondary">Cancel</button>
            <button id="btn-save-settings" class="btn btn-primary">Save Settings</button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector("#btn-close-modal")?.addEventListener("click", () => this.onClose());
    this.container.querySelector("#btn-cancel-settings")?.addEventListener("click", () => this.onClose());
    this.container.querySelector(".modal-backdrop")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) this.onClose();
    });

    this.container.querySelector("#btn-save-settings")?.addEventListener("click", () => {
      const cid = (this.container.querySelector("#inp-settings-cid") as HTMLInputElement).value.trim() || DEFAULT_CLIENT_ID;
      const autostart = (this.container.querySelector("#chk-autostart") as HTMLInputElement).checked;
      const start_minimized = (this.container.querySelector("#chk-minimized") as HTMLInputElement).checked;

      this.settings.client_id = cid;
      this.settings.autostart = autostart;
      this.settings.start_minimized = start_minimized;

      this.onSave(this.settings);
      this.onClose();
    });
  }
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;");
}

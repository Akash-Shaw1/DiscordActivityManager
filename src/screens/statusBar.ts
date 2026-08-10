import { api, StatusPayload } from "../api";

export class StatusBar {
  private container: HTMLElement;
  private onOpenSettings: () => void;

  constructor(container: HTMLElement, onOpenSettings: () => void) {
    this.container = container;
    this.onOpenSettings = onOpenSettings;
  }

  public render(status: StatusPayload) {
    let statusText = "Disconnected";
    let statusClass = "disconnected";
    let subDetails = "";

    console.log("[StatusBar] Rendering status payload:", status);
    const conn = (status?.connection_state || (status as any)?.connectionState) as any;
    if (conn) {
      const t = (conn.type || conn.status || "").toLowerCase();
      if (t === "connected") {
        const pIdx = conn.pipe_index ?? conn.pipeIndex ?? 0;
        const cId = conn.client_id ?? conn.clientId ?? "";
        statusText = `Connected (Pipe #${pIdx})`;
        statusClass = "connected";
        subDetails = cId ? `App ID: ${cId}` : "Discord IPC Pipe Ready";
      } else if (t === "connecting") {
        statusText = "Connecting...";
        statusClass = "connecting";
      } else if (t === "error") {
        statusText = "Connection Error";
        statusClass = "error";
        subDetails = conn.message || "RPC connection failed";
      } else {
        statusText = "Disconnected";
        statusClass = "disconnected";
      }
    }

    this.container.innerHTML = `
      <div class="header-bar">
        <div class="brand">
          <div class="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </div>
          <div>
            <div class="brand-title">Discord Status Manager</div>
            <div style="font-size: 11px; color: var(--text-muted);">${subDetails || "Native Windows IPC Transport"}</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 16px;">
          <div class="status-indicator-badge">
            <div class="status-dot ${statusClass}"></div>
            <span>${statusText}</span>
          </div>

          <div class="header-actions">
            <button id="btn-reconnect" class="btn btn-secondary btn-sm" title="Force Reconnect IPC">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Reconnect
            </button>
            <button id="btn-clear-status" class="btn btn-danger btn-sm" title="Clear current Discord presence">
              Clear Activity
            </button>
            <button id="btn-settings" class="btn btn-secondary btn-sm" title="Settings">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
              </svg>
              Settings
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector("#btn-reconnect")?.addEventListener("click", () => {
      api.connectDiscord();
    });

    this.container.querySelector("#btn-clear-status")?.addEventListener("click", () => {
      api.clearActivity();
    });

    this.container.querySelector("#btn-settings")?.addEventListener("click", () => {
      this.onOpenSettings();
    });
  }
}

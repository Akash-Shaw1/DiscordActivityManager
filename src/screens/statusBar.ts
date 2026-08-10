import { api, StatusPayload } from "../api";

const BOLT_SVG = `<svg width="20" height="20" viewBox="0 0 256 256"><path d="M148 36 L64 148 L112 148 L98 220 L192 106 L142 106 Z" fill="#4c8cff"/></svg>`;

export class StatusBar {
  private container: HTMLElement;
  private onOpenSettings: () => void;

  constructor(container: HTMLElement, onOpenSettings: () => void) {
    this.container = container;
    this.onOpenSettings = onOpenSettings;
  }

  public render(status: StatusPayload) {
    let pillText = "Disconnected";
    let pillClass = "offline";
    let subDetail = "";

    const conn = (status?.connection_state || (status as any)?.connectionState) as any;
    if (conn) {
      const t = (conn.type || "").toLowerCase();
      if (t === "connected") {
        pillText = `Connected (Pipe #${conn.pipe_index ?? 0})`;
        pillClass = "online";
        subDetail = conn.client_id ? `App ID: ${conn.client_id}` : "";
      } else if (t === "connecting") {
        pillText = "Connecting…";
        pillClass = "connecting";
      } else if (t === "error") {
        pillText = "Error";
        pillClass = "error";
        subDetail = conn.message || "";
      }
    }

    this.container.innerHTML = `
      <div class="header">
        <div class="brand">
          <div class="brand-icon">${BOLT_SVG}</div>
          <div class="brand-text">
            <div class="title">Discord Status Manager</div>
            <div class="subtitle">${subDetail || "Native Windows IPC Transport"}</div>
          </div>
        </div>
        <div class="spacer"></div>
        <div class="pill ${pillClass}"><span class="dot"></span>${pillText}</div>
        <button id="btn-reconnect" class="btn btn-secondary">⟲ Reconnect</button>
        <button id="btn-clear-status" class="btn btn-danger">Clear Activity</button>
        <button id="btn-settings" class="btn btn-secondary">⚙ Settings</button>
      </div>
    `;

    this.container.querySelector("#btn-reconnect")?.addEventListener("click", () => api.connectDiscord());
    this.container.querySelector("#btn-clear-status")?.addEventListener("click", () => api.clearActivity());
    this.container.querySelector("#btn-settings")?.addEventListener("click", () => this.onOpenSettings());
  }
}

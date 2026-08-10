import { api, StatusPayload } from "../api";

const BOLT_SVG = `<svg width="20" height="20" viewBox="0 0 256 256"><path d="M148 36 L64 148 L112 148 L98 220 L192 106 L142 106 Z" fill="#4c8cff"/></svg>`;
const REFRESH_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`;
const GEAR_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`;

export class StatusBar {
  private container: HTMLElement;
  private onOpenSettings: () => void;
  private onClearStatus: () => void;

  constructor(container: HTMLElement, onOpenSettings: () => void, onClearStatus: () => void) {
    this.container = container;
    this.onOpenSettings = onOpenSettings;
    this.onClearStatus = onClearStatus;
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
        pillText = "Connecting...";
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
        <button id="btn-reconnect" class="btn btn-secondary">${REFRESH_SVG} Reconnect</button>
        <button id="btn-clear-status" class="btn btn-danger">Clear Activity</button>
        <button id="btn-settings" class="btn btn-secondary">${GEAR_SVG} Settings</button>
      </div>
    `;

    this.container.querySelector("#btn-reconnect")?.addEventListener("click", () => api.connectDiscord());
    this.container.querySelector("#btn-clear-status")?.addEventListener("click", () => this.onClearStatus());
    this.container.querySelector("#btn-settings")?.addEventListener("click", () => this.onOpenSettings());
  }
}

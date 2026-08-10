import { invoke } from "@tauri-apps/api/core";
import { listen, Event } from "@tauri-apps/api/event";

export interface ActivityButton {
  label: string;
  url: string;
}

export interface Timestamps {
  start?: number;
  end?: number;
}

export interface Assets {
  large_image?: string;
  large_text?: string;
  small_image?: string;
  small_text?: string;
}

export interface Activity {
  name: string;
  details?: string;
  state?: string;
  type: number; // 0 = Playing, 2 = Listening, 3 = Watching, 5 = Competing
  timestamps?: Timestamps;
  assets?: Assets;
  buttons?: ActivityButton[];
}

export interface Template {
  id: string;
  name: string;
  activity: Activity;
}

export const DEFAULT_CLIENT_ID = "383226320970055681";

export interface AppSettings {
  client_id: string;
  autostart: boolean;
  start_minimized: boolean;
  last_pipe_index?: number;
}

export interface AppData {
  settings: AppSettings;
  templates: Template[];
  active_template_id?: string;
}

export type ConnectionState =
  | { type: "disconnected" }
  | { type: "connecting" }
  | { type: "connected"; pipe_index: number; client_id: string }
  | { type: "error"; message: string };

export interface StatusPayload {
  connection_state: ConnectionState;
  active_activity?: Activity;
  active_template_id?: string;
}

export const api = {
  async connectDiscord(): Promise<void> {
    return await invoke("connect_discord");
  },

  async disconnectDiscord(): Promise<void> {
    return await invoke("disconnect_discord");
  },

  async getConnectionState(): Promise<StatusPayload> {
    return await invoke("get_connection_state");
  },

  async setActivity(activity: Activity, templateId?: string): Promise<void> {
    return await invoke("set_activity", { activity, templateId: templateId || null });
  },

  async clearActivity(): Promise<void> {
    return await invoke("clear_activity");
  },

  async getAppData(): Promise<AppData> {
    return await invoke("get_app_data");
  },

  async saveTemplate(template: Template): Promise<AppData> {
    return await invoke("save_template", { template });
  },

  async deleteTemplate(id: string): Promise<AppData> {
    return await invoke("delete_template", { id });
  },

  async saveSettings(settings: AppSettings): Promise<AppData> {
    return await invoke("save_settings", { settings });
  },

  async listenStateChange(callback: (payload: StatusPayload) => void) {
    return await listen<StatusPayload>("discord-state-changed", (event: Event<StatusPayload>) => {
      callback(event.payload);
    });
  },
};

use tauri::State;
use crate::error::DiscordError;
use crate::manager::{DiscordManagerHandle, StatusPayload};
use crate::rpc::protocol::Activity;
use crate::store::{AppData, AppSettings, Template};

#[tauri::command]
pub fn connect_discord(manager: State<'_, DiscordManagerHandle>) {
    manager.connect();
}

#[tauri::command]
pub fn disconnect_discord(manager: State<'_, DiscordManagerHandle>) {
    manager.disconnect();
}

#[tauri::command]
pub fn get_connection_state(manager: State<'_, DiscordManagerHandle>) -> Result<StatusPayload, DiscordError> {
    let (tx, rx) = std::sync::mpsc::channel();
    manager.get_status(tx);
    rx.recv_timeout(std::time::Duration::from_secs(1))
        .map_err(|_| DiscordError::Ipc("Timeout fetching status from background manager".into()))
}

#[tauri::command]
pub fn set_activity(
    manager: State<'_, DiscordManagerHandle>,
    activity: Activity,
    template_id: Option<String>,
) -> Result<(), DiscordError> {
    manager.set_activity(activity, template_id);
    Ok(())
}

#[tauri::command]
pub fn clear_activity(manager: State<'_, DiscordManagerHandle>) {
    manager.clear_activity();
}

#[tauri::command]
pub fn get_app_data(manager: State<'_, DiscordManagerHandle>) -> AppData {
    manager.get_app_data()
}

#[tauri::command]
pub fn save_template(
    manager: State<'_, DiscordManagerHandle>,
    template: Template,
) -> Result<AppData, DiscordError> {
    manager.save_template(template)
}

#[tauri::command]
pub fn delete_template(
    manager: State<'_, DiscordManagerHandle>,
    id: String,
) -> Result<AppData, DiscordError> {
    manager.delete_template(&id)
}

#[tauri::command]
pub fn save_settings(
    manager: State<'_, DiscordManagerHandle>,
    settings: AppSettings,
) -> Result<AppData, DiscordError> {
    manager.update_settings(settings);
    Ok(manager.get_app_data())
}

impl DiscordManagerHandle {
    pub fn get_status(&self, reply_tx: std::sync::mpsc::Sender<StatusPayload>) {
        let _ = self.sender.send(crate::manager::ManagerMsg::GetStatus(reply_tx));
    }
}

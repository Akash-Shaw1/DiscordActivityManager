use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc::{channel, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

use crate::error::DiscordError;
use crate::rpc::client::DiscordRpcClient;
use crate::rpc::protocol::Activity;
use crate::store::{AppData, AppSettings, StoreManager, Template};

static NONCE_COUNTER: AtomicU64 = AtomicU64::new(1);

fn next_nonce() -> String {
    NONCE_COUNTER.fetch_add(1, Ordering::SeqCst).to_string()
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected { pipe_index: u8, client_id: String },
    Error { message: String },
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub struct StatusPayload {
    pub connection_state: ConnectionState,
    pub active_activity: Option<Activity>,
    pub active_template_id: Option<String>,
}

pub enum ManagerMsg {
    Connect,
    Disconnect,
    SetActivity(Activity, Option<String>),
    ClearActivity,
    UpdateSettings(AppSettings),
    GetStatus(Sender<StatusPayload>),
}

#[derive(Clone)]
pub struct DiscordManagerHandle {
    pub sender: Sender<ManagerMsg>,
    store: Arc<Mutex<StoreManager>>,
    data: Arc<Mutex<AppData>>,
}

impl DiscordManagerHandle {
    pub fn new(app_handle: AppHandle, store: StoreManager) -> Self {
        let app_data = store.load();
        let store_arc = Arc::new(Mutex::new(store));
        let data_arc = Arc::new(Mutex::new(app_data));

        let (tx, rx) = channel::<ManagerMsg>();

        let store_clone = Arc::clone(&store_arc);
        let data_clone = Arc::clone(&data_arc);
        let app_clone = app_handle.clone();

        thread::spawn(move || {
            run_manager_loop(rx, app_clone, store_clone, data_clone);
        });

        DiscordManagerHandle {
            sender: tx,
            store: store_arc,
            data: data_arc,
        }
    }

    pub fn connect(&self) {
        let _ = self.sender.send(ManagerMsg::Connect);
    }

    pub fn disconnect(&self) {
        let _ = self.sender.send(ManagerMsg::Disconnect);
    }

    pub fn set_activity(&self, activity: Activity, template_id: Option<String>) {
        let _ = self.sender.send(ManagerMsg::SetActivity(activity, template_id));
    }

    pub fn clear_activity(&self) {
        let _ = self.sender.send(ManagerMsg::ClearActivity);
    }

    pub fn update_settings(&self, settings: AppSettings) {
        let _ = self.sender.send(ManagerMsg::UpdateSettings(settings));
    }

    pub fn get_app_data(&self) -> AppData {
        self.data.lock().unwrap().clone()
    }

    pub fn save_template(&self, template: Template) -> Result<AppData, DiscordError> {
        let mut data = self.data.lock().unwrap();
        if let Some(pos) = data.templates.iter().position(|t| t.id == template.id) {
            data.templates[pos] = template;
        } else {
            data.templates.push(template);
        }
        self.store.lock().unwrap().save(&data)?;
        Ok(data.clone())
    }

    pub fn delete_template(&self, id: &str) -> Result<AppData, DiscordError> {
        let mut data = self.data.lock().unwrap();
        data.templates.retain(|t| t.id != id);
        if data.active_template_id.as_deref() == Some(id) {
            data.active_template_id = None;
        }
        self.store.lock().unwrap().save(&data)?;
        Ok(data.clone())
    }
}

fn run_manager_loop(
    rx: std::sync::mpsc::Receiver<ManagerMsg>,
    app_handle: AppHandle,
    store: Arc<Mutex<StoreManager>>,
    data: Arc<Mutex<AppData>>,
) {
    let mut client: Option<DiscordRpcClient> = None;
    let mut active_activity: Option<Activity> = None;
    let mut last_connect_attempt: Option<Instant> = None;
    let mut backoff_secs = 15u64;

    // Helper to broadcast current state to Tauri webview
    let broadcast_state = |state: &ConnectionState,
                           act: &Option<Activity>,
                           data_arc: &Arc<Mutex<AppData>>,
                           app: &AppHandle| {
        let is_conn = matches!(state, ConnectionState::Connected { .. });
        let t_id = if is_conn { data_arc.lock().unwrap().active_template_id.clone() } else { None };
        let payload = StatusPayload {
            connection_state: state.clone(),
            active_activity: if is_conn { act.clone() } else { None },
            active_template_id: t_id,
        };
        let _ = app.emit("discord-state-changed", payload);
    };

    // Trigger initial connection on startup
    let initial_client_id = data.lock().unwrap().settings.client_id.clone();
    let mut state = ConnectionState::Connecting;
    broadcast_state(&state, &active_activity, &data, &app_handle);

    match DiscordRpcClient::new(&initial_client_id) {
        Ok(c) => {
            let p_idx = c.pipe_index();
            client = Some(c);
            state = ConnectionState::Connected {
                pipe_index: p_idx,
                client_id: initial_client_id,
            };
            backoff_secs = 15;
            broadcast_state(&state, &active_activity, &data, &app_handle);
        }
        Err(e) => {
            state = ConnectionState::Error {
                message: format!("Initial connect failed: {}", e),
            };
            broadcast_state(&state, &active_activity, &data, &app_handle);
        }
    }

    loop {
        // Recv message with 500ms timeout to allow maintenance & reconnect loops
        match rx.recv_timeout(Duration::from_millis(500)) {
            Ok(ManagerMsg::Connect) => {
                if matches!(state, ConnectionState::Connected { .. }) {
                    continue;
                }
                let now = Instant::now();
                if let Some(last) = last_connect_attempt {
                    if now.duration_since(last) < Duration::from_secs(15) {
                        // Enforce backoff rate limit
                        continue;
                    }
                }
                last_connect_attempt = Some(now);
                state = ConnectionState::Connecting;
                broadcast_state(&state, &active_activity, &data, &app_handle);

                let cid = data.lock().unwrap().settings.client_id.clone();
                match DiscordRpcClient::new(&cid) {
                    Ok(mut c) => {
                        let p_idx = c.pipe_index();
                        // If we had an active activity, re-apply it immediately!
                        if let Some(act) = &active_activity {
                            let pid = std::process::id();
                            let _ = c.set_activity(pid, act.clone(), &next_nonce());
                        }
                        client = Some(c);
                        state = ConnectionState::Connected {
                            pipe_index: p_idx,
                            client_id: cid,
                        };
                        backoff_secs = 15;
                    }
                    Err(e) => {
                        state = ConnectionState::Error {
                            message: format!("Connect failed: {}", e),
                        };
                    }
                }
                broadcast_state(&state, &active_activity, &data, &app_handle);
            }
            Ok(ManagerMsg::Disconnect) => {
                if let Some(mut c) = client.take() {
                    let pid = std::process::id();
                    let _ = c.clear_activity(pid, &next_nonce());
                    c.close();
                }
                active_activity = None;
                data.lock().unwrap().active_template_id = None;
                state = ConnectionState::Disconnected;
                broadcast_state(&state, &active_activity, &data, &app_handle);
            }
            Ok(ManagerMsg::SetActivity(activity, template_id)) => {
                active_activity = Some(activity.clone());
                data.lock().unwrap().active_template_id = template_id;

                let _ = store.lock().unwrap().save(&data.lock().unwrap());

                if let Some(c) = client.as_mut() {
                    let pid = std::process::id();
                    match c.set_activity(pid, activity, &next_nonce()) {
                        Ok(_) => {
                            let p_idx = c.pipe_index();
                            let cid = c.client_id.clone();
                            state = ConnectionState::Connected {
                                pipe_index: p_idx,
                                client_id: cid,
                            };
                        }
                        Err(e) => {
                            // Pipe might have broken
                            client = None;
                            state = ConnectionState::Error {
                                message: format!("Set activity failed: {}", e),
                            };
                        }
                    }
                } else {
                    // Try to reconnect and set activity
                    let cid = data.lock().unwrap().settings.client_id.clone();
                    if let Ok(mut c) = DiscordRpcClient::new(&cid) {
                        let p_idx = c.pipe_index();
                        let pid = std::process::id();
                        let _ = c.set_activity(pid, activity, &next_nonce());
                        client = Some(c);
                        state = ConnectionState::Connected {
                            pipe_index: p_idx,
                            client_id: cid,
                        };
                    }
                }
                broadcast_state(&state, &active_activity, &data, &app_handle);
            }
            Ok(ManagerMsg::ClearActivity) => {
                active_activity = None;
                data.lock().unwrap().active_template_id = None;
                let _ = store.lock().unwrap().save(&data.lock().unwrap());

                if let Some(c) = client.as_mut() {
                    let pid = std::process::id();
                    let _ = c.clear_activity(pid, &next_nonce());
                }
                broadcast_state(&state, &active_activity, &data, &app_handle);
            }
            Ok(ManagerMsg::UpdateSettings(new_settings)) => {
                let mut data_guard = data.lock().unwrap();
                let old_cid = data_guard.settings.client_id.clone();
                data_guard.settings = new_settings.clone();
                let _ = store.lock().unwrap().save(&data_guard);

                // If Client ID changed, reconnect with new client ID
                if old_cid != new_settings.client_id {
                    if let Some(mut c) = client.take() {
                        c.close();
                    }
                    drop(data_guard);
                    state = ConnectionState::Connecting;
                    broadcast_state(&state, &active_activity, &data, &app_handle);

                    if let Ok(mut c) = DiscordRpcClient::new(&new_settings.client_id) {
                        let p_idx = c.pipe_index();
                        if let Some(act) = &active_activity {
                            let pid = std::process::id();
                            let _ = c.set_activity(pid, act.clone(), &next_nonce());
                        }
                        client = Some(c);
                        state = ConnectionState::Connected {
                            pipe_index: p_idx,
                            client_id: new_settings.client_id,
                        };
                    } else {
                        state = ConnectionState::Error {
                            message: "Failed to connect with new Application ID".into(),
                        };
                    }
                }
                broadcast_state(&state, &active_activity, &data, &app_handle);
            }
            Ok(ManagerMsg::GetStatus(reply_tx)) => {
                let is_conn = matches!(state, ConnectionState::Connected { .. });
                let payload = StatusPayload {
                    connection_state: state.clone(),
                    active_activity: if is_conn { active_activity.clone() } else { None },
                    active_template_id: if is_conn { data.lock().unwrap().active_template_id.clone() } else { None },
                };
                let _ = reply_tx.send(payload);
            }
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                // Background check: if disconnected or in error, test reconnect with exponential backoff
                if client.is_none() && matches!(state, ConnectionState::Error { .. } | ConnectionState::Disconnected) {
                    let now = Instant::now();
                    let should_retry = match last_connect_attempt {
                        Some(last) => now.duration_since(last) >= Duration::from_secs(backoff_secs),
                        None => true,
                    };

                    if should_retry {
                        last_connect_attempt = Some(now);
                        let cid = data.lock().unwrap().settings.client_id.clone();
                        if let Ok(mut c) = DiscordRpcClient::new(&cid) {
                            let p_idx = c.pipe_index();
                            if let Some(act) = &active_activity {
                                let pid = std::process::id();
                                let _ = c.set_activity(pid, act.clone(), &next_nonce());
                            }
                            client = Some(c);
                            state = ConnectionState::Connected {
                                pipe_index: p_idx,
                                client_id: cid,
                            };
                            backoff_secs = 15;
                            broadcast_state(&state, &active_activity, &data, &app_handle);
                        } else {
                            backoff_secs = (backoff_secs * 2).min(120);
                        }
                    }
                }
            }
            Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                break;
            }
        }
    }
}

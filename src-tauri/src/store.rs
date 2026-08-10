use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use crate::error::DiscordError;
use crate::rpc::protocol::{Activity, Assets};

pub const DEFAULT_CLIENT_ID: &str = "383226320970055681";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    pub id: String,
    pub name: String,
    pub activity: Activity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub client_id: String,
    pub autostart: bool,
    pub start_minimized: bool,
    pub last_pipe_index: Option<u8>,
}

impl Default for AppSettings {
    fn default() -> Self {
        AppSettings {
            client_id: DEFAULT_CLIENT_ID.to_string(),
            autostart: false,
            start_minimized: false,
            last_pipe_index: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    pub settings: AppSettings,
    pub templates: Vec<Template>,
    pub active_template_id: Option<String>,
}

impl Default for AppData {
    fn default() -> Self {
        AppData {
            settings: AppSettings::default(),
            templates: vec![
                Template {
                    id: "default-vscode".to_string(),
                    name: "Coding in VS Code".to_string(),
                    activity: Activity {
                        name: "Visual Studio Code".to_string(),
                        details: Some("Developing Discord Status Manager".to_string()),
                        state: Some("Workspace: Rust & TypeScript".to_string()),
                        activity_type: 0, // Playing
                        timestamps: None,
                        assets: Some(Assets {
                            large_image: Some("vscode".to_string()),
                            large_text: Some("Visual Studio Code".to_string()),
                            small_image: Some("rust".to_string()),
                            small_text: Some("Rust 1.80".to_string()),
                        }),
                        buttons: None,
                    },
                },
                Template {
                    id: "default-minecraft".to_string(),
                    name: "Minecraft Survival".to_string(),
                    activity: Activity {
                        name: "Minecraft 1.20".to_string(),
                        details: Some("Building Hardcore Survival Base".to_string()),
                        state: Some("World: Singleplayer Hardcore".to_string()),
                        activity_type: 0, // Playing
                        timestamps: None,
                        assets: None,
                        buttons: None,
                    },
                },
                Template {
                    id: "default-valorant".to_string(),
                    name: "VALORANT Ranked".to_string(),
                    activity: Activity {
                        name: "VALORANT".to_string(),
                        details: Some("In Competitive Match".to_string()),
                        state: Some("Ascent (11 - 9)".to_string()),
                        activity_type: 0, // Playing
                        timestamps: None,
                        assets: None,
                        buttons: None,
                    },
                },
                Template {
                    id: "default-listening".to_string(),
                    name: "Listening to Lofi Beats".to_string(),
                    activity: Activity {
                        name: "Lofi Hip Hop Radio".to_string(),
                        details: Some("Beats to Relax / Study to".to_string()),
                        state: Some("Track 04 — Midnight Chill".to_string()),
                        activity_type: 2, // Listening
                        timestamps: None,
                        assets: None,
                        buttons: None,
                    },
                },
                Template {
                    id: "default-watching".to_string(),
                    name: "Watching YouTube / Streams".to_string(),
                    activity: Activity {
                        name: "YouTube".to_string(),
                        details: Some("Watching Tech Docs & Tutorials".to_string()),
                        state: Some("1080p 60fps HD".to_string()),
                        activity_type: 3, // Watching
                        timestamps: None,
                        assets: None,
                        buttons: None,
                    },
                },
                Template {
                    id: "default-focus".to_string(),
                    name: "Deep Focus Mode".to_string(),
                    activity: Activity {
                        name: "Deep Focus".to_string(),
                        details: Some("In the Flow State".to_string()),
                        state: Some("Do Not Disturb".to_string()),
                        activity_type: 5, // Competing
                        timestamps: None,
                        assets: None,
                        buttons: None,
                    },
                },
            ],
            active_template_id: None,
        }
    }
}

pub struct StoreManager {
    file_path: PathBuf,
}

impl StoreManager {
    pub fn new(config_dir: PathBuf) -> Self {
        let _ = fs::create_dir_all(&config_dir);
        let file_path = config_dir.join("discord_status_config.json");
        StoreManager { file_path }
    }

    pub fn load(&self) -> AppData {
        if self.file_path.exists() {
            if let Ok(content) = fs::read_to_string(&self.file_path) {
                if let Ok(mut data) = serde_json::from_str::<AppData>(&content) {
                    if data.settings.client_id == "1338573212879552594" || data.settings.client_id.trim().is_empty() {
                        data.settings.client_id = DEFAULT_CLIENT_ID.to_string();
                        let _ = self.save(&data);
                    }
                    return data;
                }
            }
        }
        let default_data = AppData::default();
        let _ = self.save(&default_data);
        default_data
    }

    pub fn save(&self, data: &AppData) -> Result<(), DiscordError> {
        let json = serde_json::to_string_pretty(data)?;
        fs::write(&self.file_path, json)?;
        Ok(())
    }
}

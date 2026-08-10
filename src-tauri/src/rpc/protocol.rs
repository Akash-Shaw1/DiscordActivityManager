use serde::{Deserialize, Serialize};
use serde_json::Value;

#[repr(u32)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Opcode {
    Handshake = 0,
    Frame = 1,
    Close = 2,
    Ping = 3,
    Pong = 4,
}

impl Opcode {
    pub fn from_u32(val: u32) -> Option<Self> {
        match val {
            0 => Some(Opcode::Handshake),
            1 => Some(Opcode::Frame),
            2 => Some(Opcode::Close),
            3 => Some(Opcode::Ping),
            4 => Some(Opcode::Pong),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandshakePayload {
    pub v: u32,
    pub client_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Timestamps {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Assets {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub large_image: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub large_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub small_image: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub small_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityButton {
    pub label: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Activity {
    pub name: String,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
    
    /// Activity type: 0 = Playing, 2 = Listening, 3 = Watching, 5 = Competing
    #[serde(rename = "type")]
    pub activity_type: u8,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamps: Option<Timestamps>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub assets: Option<Assets>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub buttons: Option<Vec<ActivityButton>>,
}

impl Activity {
    pub fn sanitize(mut self) -> Self {
        if let Some(d) = &self.details {
            if d.trim().is_empty() {
                self.details = None;
            }
        }
        if let Some(s) = &self.state {
            if s.trim().is_empty() {
                self.state = None;
            }
        }
        if let Some(t) = &self.timestamps {
            if t.start.is_none() && t.end.is_none() {
                self.timestamps = None;
            } else {
                let mut clean_t = t.clone();
                if let Some(s) = t.start {
                    if s > 20_000_000_000 {
                        clean_t.start = Some(s / 1000);
                    }
                }
                if let Some(e) = t.end {
                    if e > 20_000_000_000 {
                        clean_t.end = Some(e / 1000);
                    }
                }
                self.timestamps = Some(clean_t);
            }
        }
        if let Some(a) = &self.assets {
            let has_large = a.large_image.as_ref().map_or(false, |s| !s.trim().is_empty());
            let has_large_txt = a.large_text.as_ref().map_or(false, |s| !s.trim().is_empty());
            let has_small = a.small_image.as_ref().map_or(false, |s| !s.trim().is_empty());
            let has_small_txt = a.small_text.as_ref().map_or(false, |s| !s.trim().is_empty());

            if !has_large && !has_large_txt && !has_small && !has_small_txt {
                self.assets = None;
            } else {
                let mut clean_assets = Assets::default();
                if has_large { clean_assets.large_image = a.large_image.clone(); }
                if has_large_txt { clean_assets.large_text = a.large_text.clone(); }
                if has_small { clean_assets.small_image = a.small_image.clone(); }
                if has_small_txt { clean_assets.small_text = a.small_text.clone(); }
                self.assets = Some(clean_assets);
            }
        }
        if let Some(b) = &self.buttons {
            let valid_btns: Vec<ActivityButton> = b.iter()
                .filter(|btn| !btn.label.trim().is_empty() && !btn.url.trim().is_empty())
                .cloned()
                .collect();
            if valid_btns.is_empty() {
                self.buttons = None;
            } else {
                self.buttons = Some(valid_btns);
            }
        }
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetActivityArgs {
    pub pid: u32,
    pub activity: Option<Activity>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetActivityCommand {
    pub cmd: String,
    pub args: SetActivityArgs,
    pub nonce: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcResponse {
    #[serde(default)]
    pub cmd: Option<String>,
    #[serde(default)]
    pub evt: Option<String>,
    #[serde(default)]
    pub data: Option<Value>,
    #[serde(default)]
    pub nonce: Option<String>,
}

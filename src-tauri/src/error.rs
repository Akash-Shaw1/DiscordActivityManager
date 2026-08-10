use std::fmt;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum DiscordError {
    Ipc(String),
    Json(String),
    NotConnected,
    DiscordReturnedError { code: i64, message: String },
    Io(String),
    InvalidInput(String),
}

impl fmt::Display for DiscordError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DiscordError::Ipc(msg) => write!(f, "IPC Error: {}", msg),
            DiscordError::Json(msg) => write!(f, "JSON Error: {}", msg),
            DiscordError::NotConnected => write!(f, "Not connected to Discord IPC pipe"),
            DiscordError::DiscordReturnedError { code, message } => {
                write!(f, "Discord RPC Error {}: {}", code, message)
            }
            DiscordError::Io(msg) => write!(f, "I/O Error: {}", msg),
            DiscordError::InvalidInput(msg) => write!(f, "Invalid Input: {}", msg),
        }
    }
}

impl std::error::Error for DiscordError {}

impl From<std::io::Error> for DiscordError {
    fn from(err: std::io::Error) -> Self {
        DiscordError::Io(err.to_string())
    }
}

impl From<serde_json::Error> for DiscordError {
    fn from(err: serde_json::Error) -> Self {
        DiscordError::Json(err.to_string())
    }
}

impl serde::Serialize for DiscordError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

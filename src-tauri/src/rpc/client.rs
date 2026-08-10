use crate::error::DiscordError;
use crate::rpc::ipc::DiscordIpc;
use crate::rpc::protocol::{
    Activity, HandshakePayload, Opcode, RpcResponse, SetActivityArgs, SetActivityCommand,
};
use serde_json::Value;

#[allow(dead_code)]
pub struct DiscordRpcClient {
    ipc: DiscordIpc,
    pub client_id: String,
    pub user_info: Option<Value>,
}

impl DiscordRpcClient {
    /// Connect pipe and send HANDSHAKE
    pub fn new(client_id: &str) -> Result<Self, DiscordError> {
        let mut ipc = DiscordIpc::connect()?;
        
        let handshake = HandshakePayload {
            v: 1,
            client_id: client_id.to_string(),
        };

        let payload_json = serde_json::to_string(&handshake)?;
        ipc.send_frame(Opcode::Handshake, &payload_json)?;

        // Read initial response frame, expecting READY event
        let (opcode, response_str) = ipc.read_frame()?;
        if opcode == Opcode::Close {
            let resp: serde_json::Value = serde_json::from_str(&response_str).unwrap_or_default();
            let code = resp["code"].as_i64().unwrap_or(4000);
            let msg = resp["message"].as_str().unwrap_or("Invalid Client ID or connection closed by Discord").to_string();
            return Err(DiscordError::DiscordReturnedError { code, message: msg });
        }
        if opcode != Opcode::Frame {
            return Err(DiscordError::Ipc(format!(
                "Expected Frame opcode on handshake response, got {:?}",
                opcode
            )));
        }

        let resp: RpcResponse = serde_json::from_str(&response_str)?;
        let user_info = if let Some(evt) = &resp.evt {
            if evt == "READY" {
                resp.data
            } else if evt == "ERROR" {
                return Err(DiscordError::DiscordReturnedError {
                    code: resp.data.as_ref().and_then(|d| d["code"].as_i64()).unwrap_or(-1),
                    message: resp.data.as_ref().and_then(|d| d["message"].as_str()).unwrap_or("Unknown error").to_string(),
                });
            } else {
                resp.data
            }
        } else {
            resp.data
        };

        Ok(DiscordRpcClient {
            ipc,
            client_id: client_id.to_string(),
            user_info,
        })
    }

    pub fn pipe_index(&self) -> u8 {
        self.ipc.pipe_index
    }

    /// Send SET_ACTIVITY command
    pub fn set_activity(&mut self, pid: u32, activity: Activity, nonce: &str) -> Result<RpcResponse, DiscordError> {
        let sanitized = activity.sanitize();
        let cmd = SetActivityCommand {
            cmd: "SET_ACTIVITY".to_string(),
            args: SetActivityArgs {
                pid,
                activity: Some(sanitized),
            },
            nonce: nonce.to_string(),
        };

        let json = serde_json::to_string(&cmd)?;
        self.ipc.send_frame(Opcode::Frame, &json)?;

        let (opcode, resp_str) = self.ipc.read_frame()?;
        if opcode != Opcode::Frame {
            return Err(DiscordError::Ipc(format!("Expected Frame response, got {:?}", opcode)));
        }

        let resp: RpcResponse = serde_json::from_str(&resp_str)?;
        Ok(resp)
    }

    /// Clear Rich Presence by setting activity to null
    pub fn clear_activity(&mut self, pid: u32, nonce: &str) -> Result<RpcResponse, DiscordError> {
        let cmd = SetActivityCommand {
            cmd: "SET_ACTIVITY".to_string(),
            args: SetActivityArgs {
                pid,
                activity: None,
            },
            nonce: nonce.to_string(),
        };

        let json = serde_json::to_string(&cmd)?;
        self.ipc.send_frame(Opcode::Frame, &json)?;

        let (opcode, resp_str) = self.ipc.read_frame()?;
        if opcode != Opcode::Frame {
            return Err(DiscordError::Ipc(format!("Expected Frame response, got {:?}", opcode)));
        }

        let resp: RpcResponse = serde_json::from_str(&resp_str)?;
        Ok(resp)
    }

    /// Read next incoming frame from Discord
    #[allow(dead_code)]
    pub fn read_next_frame(&mut self) -> Result<(Opcode, String), DiscordError> {
        self.ipc.read_frame()
    }

    /// Graceful disconnect
    pub fn close(&mut self) {
        let _ = self.ipc.send_frame(Opcode::Close, "{}");
    }
}

use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use crate::error::DiscordError;
use crate::rpc::protocol::Opcode;

pub struct DiscordIpc {
    file: File,
    pub pipe_index: u8,
}

impl DiscordIpc {
    /// Probe pipes \\.\pipe\discord-ipc-0 through 9 in order
    pub fn connect() -> Result<Self, DiscordError> {
        for i in 0..10 {
            let path = format!(r"\\.\pipe\discord-ipc-{}", i);
            if let Ok(file) = OpenOptions::new().read(true).write(true).open(&path) {
                return Ok(DiscordIpc { file, pipe_index: i });
            }
        }
        Err(DiscordError::Ipc("Could not find any running Discord IPC pipe (0..9)".into()))
    }

    /// Write an IPC frame with header: [u32 opcode le][u32 payload_len le][payload UTF-8 bytes]
    pub fn send_frame(&mut self, opcode: Opcode, payload: &str) -> Result<(), DiscordError> {
        eprintln!("[Discord IPC -> OUT] Opcode: {:?}, Payload: {}", opcode, payload);
        let payload_bytes = payload.as_bytes();
        let len = payload_bytes.len() as u32;
        let opcode_val = opcode as u32;

        let mut header = [0u8; 8];
        header[0..4].copy_from_slice(&opcode_val.to_le_bytes());
        header[4..8].copy_from_slice(&len.to_le_bytes());

        self.file.write_all(&header)?;
        self.file.write_all(payload_bytes)?;
        self.file.flush()?;
        Ok(())
    }

    /// Read an IPC frame from the pipe
    pub fn read_frame(&mut self) -> Result<(Opcode, String), DiscordError> {
        let mut header = [0u8; 8];
        self.file.read_exact(&mut header)?;

        let opcode_val = u32::from_le_bytes([header[0], header[1], header[2], header[3]]);
        let payload_len = u32::from_le_bytes([header[4], header[5], header[6], header[7]]) as usize;

        let opcode = Opcode::from_u32(opcode_val)
            .ok_or_else(|| DiscordError::Ipc(format!("Unknown opcode received: {}", opcode_val)))?;

        let mut buffer = vec![0u8; payload_len];
        self.file.read_exact(&mut buffer)?;

        let payload_str = String::from_utf8(buffer)
            .map_err(|e| DiscordError::Ipc(format!("Invalid UTF-8 in payload: {}", e)))?;

        eprintln!("[Discord IPC <- IN] Opcode: {:?}, Payload: {}", opcode, payload_str);

        Ok((opcode, payload_str))
    }
}

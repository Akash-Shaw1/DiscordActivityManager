# 🎮 Discord Status Manager

A lightweight, native Windows desktop application for setting and templating custom **Discord Rich Presence**. 

Built with **Tauri 2**, **Rust** (raw IPC named-pipe transport), and **Vanilla TypeScript**.



---

## 🚀 User Guide (No Developer Setup Required)

### 📥 1. How to Download & Run
1. Go to the [Releases](https://github.com/Akash-Shaw1/DiscordActivityManager/releases) tab.
2. Download **`discord-status-manager.exe`**.
3. Double-click **`discord-status-manager.exe`** to launch! 
   *(No installation, Node.js, or command line required!)*

---

### 🎮 2. Features & Presets
- **Preset Library**: Single-click activation for popular presets:
  - 🎮 **Minecraft**: "Minecraft 1.20" — Building Survival Base
  - 🎯 **VALORANT**: "VALORANT Ranked" — Ascent Match
  - 💻 **Coding in VS Code**: "Visual Studio Code" — Rust & TS Project
  - 🎧 **Lofi Beats**: "Lofi Hip Hop Radio" — Beats to Relax/Study
  - 📺 **Watching Streams**: "YouTube / Twitch" — Tech Docs & Tutorials
  - 🏆 **Deep Focus**: "Focus Mode" — Do Not Disturb
- **Live Profile Preview**: Interactively preview your status card in real-time as you type.
- **Live Counting Timer**: Displays dynamic elapsed time (`00:01 elapsed`, `00:02 elapsed`) on your Discord profile card.
- **System Tray & Autostart**:
  - Closing the window `(X)` minimizes the app to your Windows system tray.
  - Enable **Launch on System Startup** in Settings to automatically start status management when Windows boots up!

---

### 🖼️ 3. How to Set Custom App Titles & Art Images
By default, the app uses Visual Studio Code's Client ID (`383226320970055681`) so it works instantly out-of-the-box. 

If you want your status to show your **own custom game name** or **custom uploaded images**:

1. Open [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application**, give it a name (e.g. `My Cool Game`), and click **Create**.
3. Copy your **APPLICATION ID** (Client ID).
4. *(Optional)* Go to **Rich Presence → Art Assets** in your Discord Developer App, click **Add Image(s)**, and name your key (e.g. `my_logo`).
5. Open **Discord Status Manager** → Click **Settings** ⚙️ → Paste your **Application ID** and click **Save Settings**.
6. Enter `my_logo` in the **Large Image Key** field in your preset editor!

---

## 🛠️ Developer Guide (Compiling & Building from Source)

### 🏗️ Architecture & Protocol Design
- **Zero OAuth Overhead**: Discord's IPC transport automatically grants the `rpc.local` pseudo-scope to local named-pipe connections. The app communicates directly over `\\.\pipe\discord-ipc-0..9` without requiring user consent screens, web tokens, or HTTPS API requests.
- **8-Byte Binary Framing**: Hand-rolled binary codec (4-byte `u32` opcode + 4-byte `u32` payload length, little-endian) over `std::fs::File`.
- **Actor Threading Model**: Single background thread managing pipe I/O over `std::sync::mpsc` channels with rate-limited exponential backoff reconnects (respecting Discord's 2 connections/min limit).

---

### 💻 Local Setup & Development

#### Prerequisites
- **Node.js** v20+ and **npm** v10+
- **Rust** 1.80+ (`rustup`)
- **Windows 10 / 11**

#### Running in Dev Mode
```powershell
# 1. Clone repository
git clone https://github.com/Akash-Shaw1/DiscordActivityManager.git
cd DiscordActivityManager

# 2. Install dependencies
npm install

# 3. Launch Tauri dev environment
npm run tauri dev
```

---

### 📦 Building Production Binary (`.exe`)
To compile the optimized, standalone executable:
```powershell
npm run tauri build
```
The standalone binary will be generated at:
`src-tauri/target/release/discord-status-manager.exe`

---

## ⚡ Branding
App icon and in-app mark are an original blue bolt design (`UI stuff/app-icon.svg`,
`UI stuff/bolt-mono.svg`) — not Discord's logo. UI colors/type follow Discord's dark
theme for a familiar feel, but no Discord-owned artwork is bundled or displayed.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

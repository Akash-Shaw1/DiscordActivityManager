# Discord Status Manager — Implementation Spec

A native Windows desktop app for setting and templating custom Discord Rich
Presence. This document replaces the earlier plan. Three architectural
decisions changed after verifying current behavior against Discord's docs
and every production Rust RPC client in the wild — all three cut weight and
complexity, none of them cost you anything.

---

## 1. Corrections to the original plan

**The OAuth flow is unnecessary. Cut it entirely.**

The earlier plan added a full `AUTHORIZE` → browser consent screen →
`AUTHENTICATE` → OAuth code exchange → token refresh → secure credential
storage pipeline, on the claim that "RPC commands require authentication."
That claim is only half true, and it's the half that doesn't apply here.

Discord's RPC protocol grants pseudo-scopes based on *how* you connect, not
just *who* you are. A connection made over IPC (a local named pipe, no
`Origin` header) automatically receives the `rpc.local` pseudo-scope. Discord's
own command table lists `SET_ACTIVITY`'s required scope as **`rpc`,
`rpc.activities.write`, OR `rpc.local`** — and `rpc.local` is free. You get it
just by being a local process talking over the pipe. No user consent screen,
no access token, no refresh token, no app-approval process.

This isn't a guess — it's how every production Discord RPC library actually
works. `discord-rich-presence` (Rust), `discord-presence` (Rust),
`presenceforge` (Rust), `discord-rpc` (Node, the original reference
implementation), and `pypresence` (Python) all do the exact same two-step
dance: connect the pipe, send `HANDSHAKE`, then call `SET_ACTIVITY` directly.
None of them implement `AUTHORIZE`/`AUTHENTICATE`. If OAuth were actually
required for this, none of these libraries would work, and they've collectively
been used in thousands of hobby projects for years.

What this removes from the build, concretely:

- The `AUTHORIZE`/`AUTHENTICATE` RPC commands and the state machine steps for them
- Any HTTPS client (no `reqwest`, no `hyper`, nothing hitting `discord.com/api/oauth2/token`)
- Refresh-token logic
- Secure token storage (no OS keyring integration)
- The "Connect Discord" consent screen in the UI
- An entire failure surface: expired tokens, revoked tokens, scope mismatches

The authenticated path still exists in Discord's protocol — it's required for
things like `GET_GUILDS`, voice control, or reading DMs. We're not building
any of that. We're setting a status message. `rpc.local` covers it.

**Where OAuth *is* still relevant:** if you ever add a feature that reads the
user's guild list, DMs, or relationships, that specific feature will need the
authenticated path. Don't build it preemptively — add it if and when a
feature actually needs it.

**Second correction: don't hand-roll the async runtime.** The original plan
implied `tokio` throughout the Rust backend. Every real implementation of
this protocol is synchronous — it's a handshake and a handful of small
request/response frames over a pipe, not a high-throughput server. Tauri's
own runtime pulls in `tokio` transitively regardless of what you do, so it
costs nothing extra to use it if you want `async fn` commands — but there's
no reason to write your *own* IPC read loop as async code. A single
background `std::thread` reading the pipe in a blocking loop, talking to the
rest of the app over a `std::sync::mpsc` channel, is simpler, has fewer
failure modes, and avoids threading `Send`/`Sync` bounds through your own
protocol types for no benefit.

**Third correction: the Discord Social SDK is not a fit here, despite what
current docs suggest for new projects.** Discord's current developer docs
point new "native game" integrations toward the Social SDK. That SDK is
built for actual social features — friend lists, voice, lobbies, invites — and
ships as a full native library with a much larger footprint than the RPC
protocol it wraps. For "set a custom status text," it's the wrong tool by a
wide margin. Raw RPC over IPC remains correct here specifically *because*
lightweight is the priority. If a future version of this project needs
things RPC can't do without authentication, revisit the SDK question then.

---

## 2. Design priorities, in order

1. **Lightweight.** Every dependency has to earn its place. Default answer to
   "should we add this crate/package" is no.
2. **Correctness against the actual protocol** (see §5 — verified, not
   assumed).
3. **Maintainability** — small number of clearly-separated modules, not
   cleverness.
4. Feature completeness (templates, editor, tray) comes last and only after
   1–3 are satisfied.

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Shell | Tauri 2 | Uses the OS-installed WebView2 runtime instead of bundling Chromium — this is the single biggest weight decision in the whole project, an Electron equivalent would be 10–30x larger on disk for identical functionality. |
| Frontend | Plain TypeScript, no framework, Vite as bundler | The UI is a handful of forms, a list, and buttons. React + ReactDOM adds ~140 KB of runtime before a single line of app code, for zero benefit at this scale. Vanilla DOM + Vite's native TS support ships only the code you write. |
| Styling | Hand-written CSS (or Tailwind, compiled — not runtime) | Tailwind is fine *because* its output is static CSS with unused classes purged at build time; it costs nothing at runtime. Avoid any CSS-in-JS library — those do have a runtime. |
| Backend | Rust, `tauri` core only | No plugin is pulled in unless a specific feature genuinely needs it (see §11). |
| IPC transport | Hand-rolled RPC client using `std::fs`/pipe I/O, not a third-party crate | The protocol is ~150 lines: an 8-byte header, JSON payload, a handshake, and one command you actually use. Writing it yourself avoids `uuid`, `thiserror`, and `log` as transitive dependencies (see §11), and it's a legitimately good line item for a portfolio/interview — "implemented a binary IPC protocol from the spec" is a better story than "imported a crate." If you want to ship faster instead, `discord-rich-presence` (crates.io) does the same 7-dependency job and is a reasonable substitute. |
| Persistence | A single JSON file via `std::fs` + `serde_json`, no database | Templates and settings are a few KB of data read once at startup and rewritten on change. SQLite or any embedded DB would be pure overhead. |
| Packaging | Tauri's built-in bundler (MSI/NSIS) | No extra tooling. |

---

## 4. Architecture

```
Frontend (TS, Vite, no framework)
   |  window.__TAURI__.invoke(...)
   v
Tauri command layer (thin — validates input, forwards to the manager)
   v
DiscordManager  (owns the one long-lived connection + in-memory state)
   |
   +--> background thread: blocking read loop on the pipe
   |      - parses incoming frames
   |      - detects disconnects, triggers reconnect w/ backoff
   |      - forwards DISPATCH/READY/ERROR events back via mpsc channel
   |
   +--> RPC client: send_handshake(), set_activity(), clear_activity()
   |      - writes framed packets directly to the pipe handle
   |
   v
Named pipe (Windows: \\.\pipe\discord-ipc-N, tried 0 through 9)
   v
Local Discord desktop client
```

There is no server, no cloud component, and no second machine involved at
any point. Everything above the pipe is local IPC; nothing crosses the
network.

---

## 5. Discord RPC protocol — verified reference

### Transport

- On Windows, Discord's IPC server listens on named pipes
  `\\.\pipe\discord-ipc-0` through `\\.\pipe\discord-ipc-9`. Try them in
  order and keep the first one that accepts a connection. Multiple Discord
  installs (Stable, Canary, PTB, or a client like Vesktop) compete for these
  slots — whichever launched first gets pipe 0. Handle "wrong client got the
  presence" as a known, not-your-bug failure mode, and mention it in your own
  troubleshooting docs.
- A pipe connection on Windows can be opened as an ordinary file handle
  (`CreateFile` under the hood) — no named-pipe-specific crate is required.

### Packet framing (IPC transport)

Binary header, 8 bytes total, little-endian, followed by the JSON payload:

| Field | Size | Description |
|---|---|---|
| Opcode | 4 bytes (u32) | See opcode table below |
| Length | 4 bytes (u32) | Length of the JSON payload in bytes |
| Payload | variable | UTF-8 JSON |

Opcodes:

| Value | Name | Direction / meaning |
|---|---|---|
| 0 | HANDSHAKE | Sent once, immediately after connecting |
| 1 | FRAME | Normal command/response/event traffic |
| 2 | CLOSE | Graceful disconnect, either direction |
| 3 | PING | If Discord sends this, echo it back as PONG with the same payload |
| 4 | PONG | Response to a PING |

### Handshake

Payload is `{ v: 1, client_id: "<your application id>" }`. Discord responds
with a FRAME containing a `DISPATCH` event, `evt: "READY"`, and basic
user/config info. This is the *only* step required before you can call
`SET_ACTIVITY` — see the scopes table below.

### Scopes that matter for us

Discord's RPC layer grants pseudo-scopes based on connection context, not
just OAuth grants:

| Pseudo-scope | Granted when |
|---|---|
| `rpc.local` | Any connection over a non-browser transport (IPC, or HTTP/WS with no `Origin` header) |
| `rpc.authenticated` | Only after a completed `AUTHENTICATE` — **not needed for our use case** |

`SET_ACTIVITY`'s documented required scope is `rpc`, `rpc.activities.write`,
**or `rpc.local`** — meaning a plain IPC connection satisfies it the moment
the handshake completes. `AUTHORIZE`/`AUTHENTICATE` are for the small set of
commands that explicitly require `rpc.authenticated` or a real OAuth scope
(guild reads, DM reads, voice control) — not used in this app.

### The one command we send

`SET_ACTIVITY` — updates the user's Rich Presence.

| Field | Type | Notes |
|---|---|---|
| `pid` | integer | Required for the IPC transport specifically — your own OS process ID (`std::process::id()`, no crate needed) |
| `activity` | object or `null` | `null` clears the current activity |

Activity object, the fields this app actually exposes to the user:

| Field | Constraints | Notes |
|---|---|---|
| `name` | 1–128 chars | Required |
| `state` | 2–128 chars, optional | Second line |
| `details` | 2–128 chars, optional | First line |
| `type` | integer | Use `0` (Playing), `2` (Listening), `3` (Watching), or `5` (Competing). **Do not use `1` (Streaming) or `4` (Custom)** — Discord rejects both for third-party RPC updates with `ActivityTypeDisabled`. |
| `assets.large_image` / `assets.small_image` | string, asset key | Not an arbitrary URL. It's the key of an image you pre-uploaded to *your own* Discord application under Developer Portal → Rich Presence → Art Assets. Support for arbitrary external image URLs on this specific path is inconsistent and undocumented — don't build a feature around it. |
| `assets.large_text` / `assets.small_text` | string, optional | Hover tooltip for the corresponding image |
| `timestamps.start` / `timestamps.end` | unix ms | Drives the elapsed/remaining time display |
| `buttons` | array, max 2 | `{ label, url }` pairs |

Every outgoing command carries a `nonce` — a string the response echoes back
so you can match responses to requests. **Don't pull in the `uuid` crate for
this.** A per-connection atomic counter formatted as a string is unique
enough for a single local session and costs zero dependencies.

### Rate limits and errors worth designing around

- Discord rate-limits new IPC connections to **2 per minute** per client (60/min
  on Canary). Reconnect logic needs exponential backoff, not a tight retry
  loop, or you'll get throttled during a Discord restart.
- `4006 INVALID_PERMISSIONS` is the error you'd get for calling an
  authenticated-only command without authenticating — irrelevant to us since
  we only call `SET_ACTIVITY`, but worth recognizing if it ever shows up
  (it means a command was added that needs a real scope).
- If the pipe drops (Discord closed/restarted), Discord clears the previously
  set activity only once the connection is gone — not instantly, but you
  should treat "connection closed" as "presence is now gone" and reconnect +
  re-send rather than assuming it persists on its own.

---

## 6. Backend design

### Modules

- **`ipc`** — raw pipe connect/read/write and the 8-byte frame codec. Knows
  nothing about Discord's commands, only the envelope.
- **`protocol`** — opcode enum, the outgoing/incoming payload shapes, the
  activity struct. Pure data, no I/O.
- **`rpc`** — combines `ipc` + `protocol` into handshake / set_activity /
  clear_activity / disconnect. This is the whole client; there's no
  `auth.rs` anymore.
- **`manager`** — owns the single long-lived `rpc` instance behind a mutex,
  runs the background read thread, exposes the small set of operations the
  Tauri commands call into, and owns reconnect/backoff state.
- **`commands`** — the `#[tauri::command]` functions. Thin: validate input
  shape, call into `manager`, map errors to something the frontend can
  display.
- **`store`** — load/save the single JSON state file (templates + settings).

### Connection lifecycle

```
DISCONNECTED
   | connect()
   v
CONNECTING       -- trying pipes 0..9 in order
   | pipe opened
   v
HANDSHAKING      -- sent HANDSHAKE, waiting for READY
   | READY received
   v
CONNECTED        -- can call SET_ACTIVITY / CLEAR_ACTIVITY freely from here
   |
   | pipe closed / write error
   v
DISCONNECTED  -->  retry with exponential backoff (respect the 2/min limit)
```

No `UNAUTHORIZED` or `AUTHENTICATING` states exist in this version — that's
the whole point of §1.

### Threading model

One background OS thread owns the pipe handle and blocks on reads. Tauri
commands that need to *send* something (set/clear activity) go through an
`mpsc` channel to that thread rather than touching the handle directly from
multiple threads. This keeps the pipe handle single-owner, which sidesteps
an entire class of "who's allowed to write right now" bugs — no async
runtime, no locking around the handle itself, just a channel and a loop.

---

## 7. Frontend design

Screens, not components-with-heavy-state — this app doesn't need routing or
a state-management library:

- **Status bar** (always visible): connection state (Disconnected /
  Connecting / Connected), current active template if any, Set/Clear
  buttons.
- **Template list**: saved templates as a simple list; click to apply
  immediately.
- **Template editor**: form for name/state/details/type/images/buttons,
  save/delete.
- **Tray icon**: left-click restores the window; the window's close button
  minimizes to tray instead of quitting (standard pattern for this category
  of app — see any existing Discord Rich Presence tool). Actually quitting
  is a separate tray menu item, and quitting should send `CLOSE`/disconnect
  cleanly so the activity clears immediately instead of lingering until
  Discord notices the pipe died.

No component framework is needed for this shape of UI. Plain functions that
render into fixed DOM containers and re-run on state change cover it
completely, at zero runtime cost beyond the code itself.

---

## 8. Command surface (frontend ↔ backend)

Keep this list short on purpose — the frontend should know nothing about
pipes, opcodes, or nonces.

| Command | Input | Output | Notes |
|---|---|---|---|
| `connect_discord` | — | connection state | Idempotent; safe to call if already connected |
| `disconnect_discord` | — | — | Sends CLOSE, clears activity first |
| `get_connection_state` | — | enum state | For the status bar to poll or subscribe to |
| `set_activity` | activity fields | resulting activity or error | |
| `clear_activity` | — | — | |
| `list_templates` | — | array of saved templates | |
| `save_template` | template fields | saved template | Create or update by id |
| `delete_template` | template id | — | |
| `get_settings` / `save_settings` | — / settings fields | settings | Autostart toggle, start-minimized toggle, last-used pipe index if you want to skip the 0–9 probe on subsequent launches |

Connection-state changes (connect/disconnect/reconnect happening in the
background) should be pushed to the frontend as a Tauri event rather than
polled, so the status bar updates in real time without the frontend guessing
when to ask.

---

## 9. Persistence

One file, one format, in the OS-appropriate app config directory (obtained
via Tauri's path API — no plugin needed for this). A single JSON object
containing:

- `templates`: array of saved activity presets (the same shape as the
  `set_activity` input, plus an id and a display name)
- `settings`: autostart flag, start-minimized flag, optionally the last
  successful pipe index

Loaded once into memory at startup, mutated in memory, written back to disk
on every change (or debounced — not worth over-engineering for a file this
small). No migrations system, no schema versioning — if the shape needs to
change later, write a one-time compatibility shim, don't build
infrastructure for a problem you don't have yet.

---

## 10. Why this has to keep running

Rich Presence is not "set it once and Discord remembers it forever." The
activity is tied to the live IPC connection. Close the connection and the
presence goes away once Discord notices. That means:

- This is fundamentally a background/tray app, not a "run it once" tool.
- Autostart (via the official `tauri-plugin-autostart`) matters if the
  point is showing status continuously across reboots — make it an
  in-app toggle, not forced on.
- The window itself is disposable — closing it should hide to tray, not
  disconnect. Only an explicit "Quit" should disconnect and exit.

---

## 11. Dependency manifest

### Rust (`src-tauri/Cargo.toml`)

| Crate | Needed for | Included? |
|---|---|---|
| `tauri` | the app shell itself | Yes, obviously |
| `serde` + `serde_json` | encoding/decoding RPC payloads and the state file | Yes — this is the only "real" dependency the protocol layer needs |
| `tauri-plugin-autostart` | optional launch-on-boot toggle | Yes, official, small, opt-in via user setting |
| `tauri-plugin-single-instance` | stop a second copy from fighting over the same pipe slot and spawning a second tray icon | Yes, official, small |
| `uuid` | nonce generation | **No** — an atomic counter string does the job |
| `thiserror` | error type boilerplate | **No** — hand-write a small error enum with a manual `Display` impl; this app has maybe 6 error variants total |
| `log` / `env_logger` / `tracing` | logging | **No** — `eprintln!` gated behind `cfg(debug_assertions)` is enough for an app this size |
| `reqwest` / `hyper` | OAuth token exchange | **No** — eliminated entirely by §1 |
| `keyring` / OS credential store | token storage | **No** — eliminated entirely by §1 |
| `tokio` (directly, in your own code) | async IPC handling | **No** — comes in transitively through Tauri regardless, but your own pipe code should be a plain blocking thread, not `async` |

### Frontend (`package.json`)

| Package | Needed for | Included? |
|---|---|---|
| `vite` | dev server + bundler | Yes |
| `typescript` | type safety | Yes |
| `@tauri-apps/api` | `invoke`, event listeners | Yes |
| `@tauri-apps/plugin-autostart` | JS bindings for the autostart plugin | Yes, matches the Rust-side plugin |
| React / Vue / Svelte / any UI framework | component model | **No** — the entire UI is a handful of forms and a list; a framework runtime buys nothing here |
| Any CSS-in-JS library | styling | **No** — plain CSS or build-time Tailwind only |
| Any state-management library (Redux, Zustand, Pinia, etc.) | shared state | **No** — the app has maybe 3 pieces of shared state (connection state, template list, active template); module-level variables and a tiny pub/sub, or just re-rendering on Tauri events, cover it |

---

## 12. Expected footprint

Ballpark, not a guarantee — but directionally, for a Tauri 2 app this small
with no heavy plugins and a vanilla-TS frontend: installer and installed
size land in the low single-digit megabytes, because the app ships its own
code plus a thin Rust runtime and relies on the WebView2 runtime already
present on essentially all current Windows installs (Tauri's installer can
fetch it if it's genuinely missing, which adds size only in that edge case).
For comparison, the Electron-equivalent of this same feature set — bundling
Chromium and Node to render a few forms — would be an order of magnitude
larger for no functional gain. That gap is the entire justification for the
Tauri choice in §3.

---

## 13. Known limitations / trade-offs

- **Only one Discord client wins the pipe.** If the user runs Stable +
  Canary, or Discord + Vesktop, simultaneously, whichever bound
  `discord-ipc-0` first is the one that gets the presence update. This is a
  Discord-side limitation, not something this app can fix — surface it as a
  troubleshooting tip, not a bug to chase.
- **Images require pre-uploaded Art Assets.** Users templating a custom
  large/small image must upload it to their own Discord application in the
  Developer Portal first and reference it by key. There's no way around this
  without moving to a fundamentally different (and heavier) SDK.
- **No "Ask to Join" / party features.** Those need a real embedded activity
  or the Social SDK, both far outside this app's scope and weight budget.
- **Streaming and Custom activity types are blocked by Discord** for
  third-party RPC updates — not a limitation of this app, a platform
  restriction (see §5).
- **If a future feature needs authenticated scopes** (reading guilds, DMs,
  relationships), the OAuth path from the original plan becomes relevant
  again — re-add it then, scoped to exactly what that feature needs, not
  before.

---

## 14. Project structure

- `src/` — frontend TypeScript
  - `main.ts` — entry point, wires up the screens
  - `screens/` — status bar, template list, template editor
  - `api.ts` — thin wrapper around `invoke` calls, one function per backend command
  - `styles/`
- `src-tauri/`
  - `src/`
    - `main.rs` — Tauri app bootstrap, registers commands and plugins
    - `commands.rs` — the `#[tauri::command]` functions
    - `manager.rs` — `DiscordManager`, background thread, reconnect logic
    - `rpc/`
      - `ipc.rs` — pipe connect/read/write, frame codec
      - `protocol.rs` — opcodes, payload structs, activity struct
      - `client.rs` — handshake / set_activity / clear_activity
    - `store.rs` — load/save the JSON state file
    - `error.rs` — the small hand-written error enum
  - `Cargo.toml`
  - `tauri.conf.json`
- `package.json`
- `vite.config.ts`

---

## 15. Build order

Build in this order — each phase should visibly work before starting the
next one:

1. **Tauri skeleton.** Empty window, one trivial command round-trip
   (frontend calls it, backend returns a string), confirms the toolchain is
   set up.
2. **Pipe discovery.** Try `discord-ipc-0..9`, report which one (if any)
   accepted a connection. No handshake yet.
3. **Handshake.** Send `HANDSHAKE`, parse the `READY` dispatch, log the
   user info Discord sends back. This is the point where you've proven the
   frame codec works in both directions.
4. **`SET_ACTIVITY`, hardcoded.** One fixed activity, sent the moment the
   handshake completes. If your own Discord profile shows it, the whole
   transport + protocol layer is proven correct.
5. **`CLEAR_ACTIVITY`.** Send with `activity: null`.
6. **Reconnect handling.** Kill Discord while the app is running, relaunch
   it, confirm the app notices the dead pipe and reconnects with backoff
   rather than spamming connection attempts.
7. **Manager + threading.** Move the above into the background-thread +
   channel design from §6 instead of ad hoc code in a command handler.
8. **Persistence.** Load/save the JSON state file.
9. **Frontend.** Status bar first (it only needs `connect`/`get state`/
   `set`/`clear`), then the template list and editor once the backend
   commands for them exist.
10. **Tray + autostart.** Last, because it's pure polish on top of an
    already-working core.

There is no OAuth phase. That's the point.

---

## 16. References

- Discord RPC protocol reference (community-maintained, more detailed than
  the official docs on framing and scopes):
  `https://docs.discord.food/topics/rpc`
- Official Discord RPC docs: `https://docs.discord.com/developers/topics/rpc`
- Official Discord Rich Presence overview:
  `https://docs.discord.com/developers/platform/rich-presence`
- Reference Rust implementation (no OAuth, no async, minimal deps):
  `https://github.com/vionya/discord-rich-presence`
- Tauri 2 docs: `https://v2.tauri.app`
- Tauri autostart plugin: `https://v2.tauri.app/plugin/autostart/`
- Tauri single-instance plugin: `https://v2.tauri.app/plugin/single-instance/`
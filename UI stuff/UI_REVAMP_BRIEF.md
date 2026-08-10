# Discord Status Manager — UI Revamp Brief

Hand this whole file to the coding agent. `mockup.html` in the same folder is a working
code reference — the agent should port its CSS variables and component patterns into
the real app, not re-derive them from scratch.

## 0. Scope

Visual-only revamp. No functional/behavioral changes. Target: match Discord's actual
dark-theme design language (the client, not a generic "dark mode"), while staying
lightweight — no new heavy dependencies, no webfont downloads, no icon-font libraries.

One thing to fix while we're in here: **drop any actual Discord logo/mascot artwork**
currently used in the app (the image in the "Native Discord RPC" card, and anywhere else
Discord's own IP appears). A third-party tool visually branding itself with Discord's
logo reads as impersonation/affiliation under Discord's brand guidelines — replace with
the new bolt mark below. This isn't cosmetic, it's the one part of this brief that's
actually a risk-reduction change, not a style change.

## 1. Design tokens

Discord's dark theme, as CSS custom properties. Copy verbatim into the global stylesheet.

```css
:root{
  /* backgrounds, darkest to lightest */
  --bg-floating:#111214;   /* tooltips, context menus */
  --bg-tertiary:#1e1f22;   /* title bar, inputs, deepest surface */
  --bg-secondary:#2b2d31;  /* sidebar, cards */
  --bg-primary:#313338;    /* main content area */
  --bg-hover:#3a3c41;
  --bg-active:#404249;

  /* text */
  --text-primary:#f2f3f5;
  --text-secondary:#b5bac1;
  --text-muted:#949ba4;

  /* brand — bolt blue, NOT Discord's blurple (#5865F2 is their trademark color, avoid it) */
  --brand:#4c8cff;
  --brand-dim:rgba(76,140,255,.14);
  --brand-grad-a:#6da5ff;
  --brand-grad-b:#2f6fed;

  /* semantic */
  --green:#23a55a;   --green-hover:#1a7d43;
  --red:#da373c;     --red-hover:#a12828;
  --yellow:#f0b232;

  --radius-sm:3px;   /* buttons, inputs — Discord's real radius is small, not pill-shaped */
  --radius-md:8px;   /* cards, art thumbnails */
  --radius-lg:12px;  /* panels, modals */
  --radius-full:9999px; /* status pills, avatars, dots */
}
```

Spacing scale: `4 / 8 / 12 / 16 / 20 / 24 / 32px`. Don't invent in-between values.

Shadows: Discord barely uses them. Elevation comes from stepping between the four
background shades above, not from `box-shadow`. Reserve shadow for genuinely floating
elements (popouts, the app window itself): `0 8px 24px rgba(0,0,0,.4)`.

Motion: 120–150ms ease on hover/active state changes only. No load-in animation, no
scroll effects. Respect `prefers-reduced-motion`.

## 2. Font

Discord's real typeface is **gg sans**, a proprietary font — you don't have a legal way
to ship it unless it's already present on the user's system from the Discord client
itself. Two options, pick one and move on:

- **Recommended (lightweight, zero risk):** system font stack, which is also what
  Discord itself falls back to when gg sans isn't installed:
  ```css
  font-family: -apple-system, "Segoe UI", "gg sans", "Noto Sans", Helvetica, Arial, sans-serif;
  ```
  This costs nothing over the network and looks correct on every OS. This is what
  `mockup.html` uses.
- **If pixel-fidelity to Discord matters more than app size:** self-host a geometric
  sans that's close in metrics — Inter or Red Hat Text — as a `.woff2` subset. Only do
  this if asked; it's the heavier option.

Type scale (already close to right in the current build — keep these, just apply
consistently):
- Section eyebrows ("PRESETS LIBRARY", "PLAYING A GAME"): 11px, weight 700, uppercase,
  `letter-spacing: .03em`, `color: var(--text-muted)`.
- Field labels ("PRESET NAME"): 11px, weight 700, uppercase, same muted color.
- Card/preset titles: 14–15px, weight 600–700.
- Body/input text: 14px, weight 400.

## 3. Component specs (mapped to the current screens)

**Title bar** — `bg: var(--bg-tertiary)`, 40px tall, 16px bolt-mono icon + app name at
13px/weight 600. Window controls get `--radius-sm` hover backgrounds
(`var(--bg-hover)`), not the default OS hover.

**Header row** (Connected pill / Reconnect / Clear Activity / Settings) — mostly right
already, just re-skin:
- Status pill: `background: rgba(35,165,90,.14)`, text+dot `var(--green)`, `radius-full`.
  This is Discord's actual "online" indicator pattern — keep it.
- Reconnect → neutral button (`#4e5058` bg). Clear Activity → danger. Settings → neutral
  with icon.

**Sidebar (Presets Library)** — `bg: var(--bg-secondary)`.
- Search field: `bg: var(--bg-tertiary)`, `radius-md`, muted placeholder.
- Preset card: `bg: var(--bg-active)`, `radius-md`, 12px padding.
- Active preset: 3px `var(--brand)` accent bar on the left edge (absolute-positioned
  pseudo-element, not a full border — this is the exact pattern Discord uses for the
  selected item in any list) + a small pill badge (`bg: var(--brand)`, white text, 10px,
  weight 700, `radius-full`) instead of the current bordered box.
- Action row inside each card: Apply Status stays green/primary, Edit neutral, Delete
  danger — this part's already correct, just apply `--radius-sm` consistently.

**Tabs** (General Details / Art & Media / Action Buttons) — horizontal tab row,
`radius-md` on the top two corners only. Active tab: `bg: var(--bg-secondary)` (steps up
one shade from the surrounding `--bg-primary`), inactive: transparent + muted text,
hover: `var(--bg-hover)`.

**Form card** — `bg: var(--bg-secondary)`, `radius-lg`, 20px padding. Inputs:
`bg: var(--bg-tertiary)`, `radius-sm` (not heavily rounded — this is a real Discord
tell, their inputs are close to square-cornered), 1px border that lights up
`var(--brand)` on focus with a soft `var(--brand-dim)` ring. Checkbox: 16px square,
`radius-sm`, checked state fills `var(--brand)` with a white check glyph.

**Right column** — "Native Discord RPC" card: swap the mascot art for the bolt mark in
a small `radius-md` tinted tile (`bg: var(--brand-dim)`), keep the two-line copy.
"Live Profile Preview" should be a faithful mini-replica of Discord's real profile
popout: avatar circle with a status dot notched into the bottom-right corner
(`border: 3px solid var(--bg-secondary)` to cut it out of the avatar), name + handle,
a 1px divider, then the activity block (small art tile with its own status badge,
title/detail/state lines, optional monospace elapsed-timer text). This structure is
already right in the current build — it just needs the token/spacing pass.

## 4. Icon & branding

Three files are provided alongside this brief:

- `assets/app-icon.svg` — the primary mark: blue bolt (gradient, `--brand-grad-a` →
  `--brand-grad-b`) on a dark rounded-square tile (`--bg-tertiary`). This is the app
  icon / taskbar icon / exe icon source. Checked at 32px — still reads clearly at
  taskbar size.
- `assets/bolt-mono.svg` — flat single-color bolt, no background, for inline use at
  small sizes (title bar, sidebar header, in-app card icons). Don't use the full tile
  version below ~24px, it gets muddy.
- `mockup.html` — working reference, open it directly in a browser.

Generate real icon assets from `app-icon.svg` rather than hand-exporting sizes:
- **Tauri:** `npm run tauri icon assets/app-icon.svg` — generates the full
  `.ico`/`.icns`/PNG set into `src-tauri/icons/` automatically.
- **Electron:** render `app-icon.svg` to a 1024×1024 PNG first (`rsvg-convert -w 1024
  app-icon.svg -o icon-1024.png`), then `electron-icon-builder --input=icon-1024.png
  --output=build`.
Use whichever matches this project's actual build setup — don't add a new tool.

## 5. Stay lightweight

- No new UI framework or component library.
- Inline SVG for icons (already the pattern above), not an icon font.
- System font stack (§2) — zero network weight.
- No new `box-shadow`-heavy effects; flat surfaces + 1px borders per §1.
- Don't touch app logic/state — this is a CSS + asset swap, not a rewrite.

## 6. Add this to the README

```md
## Branding
App icon and in-app mark are an original blue bolt design (`assets/app-icon.svg`,
`assets/bolt-mono.svg`) — not Discord's logo. UI colors/type follow Discord's dark
theme for a familiar feel, but no Discord-owned artwork is bundled or displayed.
```

## 7. Done when

- [ ] No Discord-owned logo/mascot image remains anywhere in the app
- [ ] App icon (taskbar/exe) is the bolt mark, in place at every generated size
- [ ] All backgrounds map to one of the four token shades, nothing hand-picked
- [ ] All buttons/inputs use `--radius-sm`/`--radius-md`/`--radius-lg` consistently (no stray radii)
- [ ] No new network font request in dev tools' Network tab
- [ ] README has the branding note from §6

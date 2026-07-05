# WLED UIX

A clean, modern, mobile-friendly UI for controlling [WLED](https://kno.wled.ge/) ARGB
lighting — with a focus on making scene design pleasant. Fully local and FOSS.

WLED devices serve plain HTTP and send **no CORS headers**, so a browser app on another
origin can't talk to them directly. WLED UIX solves this by running a tiny self-hosted
Node server that serves the UI **and** proxies requests (and the live WebSocket state
stream) to your devices. Everything stays on your LAN.

> **Milestone 1 (this release):** device discovery + connection, power, master
> brightness, per-segment color / effect / palette editing with live state, and applying
> existing presets. A dedicated **scene designer** is the next milestone.

## Features

- **Multi-device** registry with mDNS (`_wled._tcp`) auto-discovery and manual add.
- **Live state** over WebSocket — changes made elsewhere (or WLED's own UI) show instantly.
- **Per-segment editing**: colors (with quick swatches + CCT where supported), effects,
  and palettes with gradient previews.
- **Effect-aware controls**: parses `/json/fxdata` so each effect shows only the sliders
  and checkboxes it actually uses, with audio-reactive / 2D badges.
- **Responsive + installable PWA** — works well on phone and desktop, light & dark themes.
- **Built-in mock device** (`host: mock`) so you can try the whole UI without hardware.

## Quick start (development)

```bash
npm install
npm run dev
```

Open http://localhost:5173. A **Demo strip (mock)** device is seeded automatically.
Add a real device from the selector in the top bar (by IP, or pick a discovered one).

## Run it for real

### Docker (recommended)

```bash
docker compose up -d --build
```

Then open `http://<host>:3000`. Device registry persists in `./data`. Host networking is
enabled so mDNS discovery works; see `docker-compose.yml` to switch to port mapping if you
don't need discovery.

### Bare Node

```bash
npm install
npm run build
node server.js          # serves on :3000 (PORT / HOST / DATA_DIR env vars)
```

## Tests

```bash
npm test
```

## Architecture

```
Browser (SvelteKit SPA / PWA)
   │  same-origin fetch + WebSocket
   ▼
Node server (SvelteKit adapter-node + custom server.js)
   ├─ HTTP proxy  /api/devices/[id]/json/*  → http://<device>/json/*
   ├─ WS proxy    /api/devices/[id]/ws       → ws://<device>/ws  (1 upstream, fanned out)
   ├─ Device registry (JSON under DATA_DIR)
   └─ mDNS discovery of _wled._tcp
   ▼
WLED devices
```

Key modules:
- `src/lib/wled/` — typed client, `fxdata` parser, palette gradients, color utils.
- `src/lib/server/` — device registry, HTTP/WS proxies, mDNS discovery, mock device.
- `src/lib/stores/device.svelte.ts` — reactive per-device controller (optimistic +
  throttled writes, live WS sync).
- `src/lib/components/` — UI building blocks.

## Roadmap

- **Scene designer**: multi-segment layout canvas, palette/effect composition, save &
  organize scenes beyond WLED's 250-preset limit.
- Playlists as animated scenes; scheduling / holiday automation.
- Live LED "Peek" strip & 2D matrix preview.

## License

MIT

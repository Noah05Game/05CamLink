# 05CamLink

Turn a phone into a wireless OBS camera — scenes, overlays, and **click-to-connect** pairing — as an installable, local-first PWA hosted on GitHub Pages.

Scenes, overlays, settings and logos are stored on-device (IndexedDB, with a localStorage fallback). The camera video never touches a server.

> **This build uses a FLAT file layout** — every file sits at the repo root (no `lib/` or `icons/` folders). Upload all files to the root of your repo.

---

## Deploy to GitHub Pages

1. Upload **every file** in this folder to your repo root. Confirm the big one, `konva.min.js`, is actually there.
2. Repo → **Settings → Pages** → *Deploy from a branch* → `main` / root.
3. Open `https://USERNAME.github.io/REPO/`. (Camera needs HTTPS, which Pages provides.)

The app is PWA-only: in a normal tab it shows an install gate. Add `?preview` to test in a tab.

---

## Pairing: how "click the phone, swipe to confirm" works

Browsers can't scan the local network or accept incoming connections, so the phone and the PC each connect to one tiny **rendezvous server** that introduces them. The server only brokers the handshake — **the camera stream flows phone↔PC directly over your LAN** (WebRTC, STUN only).

### 1. Run the rendezvous server (`pair-server.js`)

```
npm init -y
npm install ws
node pair-server.js          # listens on :8787
```

### 2. Make it reachable over `wss://` (required)

The app is served from HTTPS, and a secure page may only open a *secure* WebSocket. So the server must be `wss://`, not `ws://`. Two easy ways:

- Put it behind a domain you own with TLS (`https://pair.yourdomain.com` → `:8787`), then use `wss://pair.yourdomain.com`.
- Or tunnel your local instance: `cloudflared tunnel --url http://localhost:8787` and use the `wss://…` URL it prints.

Only the handshake travels through this; video stays local on your LAN.

### 3. Set it up once

- **Phone (in the app):** Settings → *Pairing server* = your `wss://…` URL, give the phone a name (e.g. "Noah's iPhone"), tap **Save & make discoverable**. The status pill shows **Discoverable**.
- **PC:** open `viewer.html` (from Pages) on the OBS computer — `https://USERNAME.github.io/REPO/viewer.html`. Enter the same `wss://…` URL and a computer name. You can also pass it in the URL: `…/viewer.html?pair=wss://pair.yourdomain.com`.

### 4. Connect

The PC viewer lists every phone that's online. Click yours → the phone shows **"‹PC name› would like to connect"** with a **green slide-to-connect** slider → swipe → the video appears on the PC and it goes fullscreen. Add that page to OBS as a **Browser Source** (set to 1280×720 for 720p), or capture the window.

A phone that opens `viewer.html` by mistake is redirected to install the app.

**Manual fallback (no server):** both pages still offer copy/paste offer↔answer pairing under "Use manual pairing", in case you don't want to run the server.

---

## What's included

- Install gate + 5-step onboarding (persisted).
- Camera: 480/720/1080p, front/back, mirror.
- Scenes: create/rename/delete, instant switch, auto-save, restore last, export/import JSON.
- Overlays (Konva): text (size/color/shadow), image, GIF (best-effort animation), drag, two-finger pinch-resize + rotate, layer order, lock, delete, snap-to-center guides.
- Configurable logo URLs (`logoImageURL`, `splashLogoImageURL`, `onboardingLogoImageURL`) with text fallback.
- Offline: service worker precaches the shell + libs.
- Click-to-connect pairing with slide-to-confirm, plus a manual fallback.

## Files
`index.html` · `viewer.html` · `app.js` · `pairing.js` · `styles.css` · `manifest.json` · `sw.js` · `pair-server.js` (optional, run with Node) · `konva.min.js` `qrcode.min.js` `gifler.min.js` · icons.

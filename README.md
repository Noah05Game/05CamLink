# 05CamLink

Turn a phone into a wireless OBS camera — scenes, overlays, and LAN streaming — as an installable, **local-first PWA** that runs entirely from static hosting (GitHub Pages).

No backend for the core app. No cloud. No paid services. Everything (scenes, overlays, settings, logos) is stored on-device in IndexedDB (with a localStorage fallback).

---

## Deploy to GitHub Pages

1. Create a repo and push every file in this folder, keeping the structure:

   ```
   index.html
   viewer.html
   app.js
   styles.css
   manifest.json
   sw.js
   icons/…
   lib/…            (konva, qrcode, gifler — bundled for offline use)
   signaling-server.js   (optional, not served by Pages)
   ```

2. Repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / root.
3. Open `https://USERNAME.github.io/REPO/`.

All asset paths are **relative**, so it works correctly from a `/REPO/` subfolder. A custom domain pointing at Pages works too — nothing is hard-coded to a root path.

> Camera access (`getUserMedia`) requires **HTTPS**, which GitHub Pages provides. It will not work over plain `http://` except on `localhost`.

---

## Install gate (by design)

The app is PWA-only. Opened in a normal browser tab it shows a full-screen install gate; the camera, scenes, overlays and streaming stay blocked until it's installed (Add to Home Screen / Install app) and launched in standalone mode.

To preview in a tab during development, append `?preview` to the URL to bypass the gate.

---

## What's included

- **Install gate** + **5-step first-run onboarding** (welcome → how it works → camera permission → install confirm → quick setup), persisted via `onboardingCompleted`.
- **Camera**: 480p / 720p / 1080p, front/back, mirror toggle.
- **Scenes** (OBS-style): create / rename / delete, instant switching, auto-save on every change, restores the last active scene, export/import JSON.
- **Overlays** (Konva): text (font size, color, shadow, inline editor), images, GIFs (best-effort animation via gifler), with drag-move, **two-finger pinch resize + rotate**, corner-handle transform, layer ordering, lock/unlock, delete, and snap-to-center guides.
- **Configurable branding** via logo URLs (`logoImageURL`, `splashLogoImageURL`, `onboardingLogoImageURL`); empty → text logo fallback. Used on splash, gate, onboarding and top bar.
- **Offline**: service worker precaches the shell + libs; fully usable after first launch.

---

## Streaming to OBS — how it actually works (read this)

GitHub Pages can only serve static files, so it **cannot** be the thing OBS pulls video from. That's expected and matches the spec: the app does capture + overlays locally and produces a live **WebRTC** stream with the overlays already composited in (so OBS receives exactly what you see). The connection happens directly between your phone and the OBS computer **over your LAN** — the page on Pages just hands them to each other.

There are two pairing paths:

**A) Manual pairing — fully serverless (works out of the box)**
1. On the OBS computer, open the **OBS URL** from Settings (or add it as a Browser Source and use *Interact*).
2. Tap **Go live** on the phone → it generates an *offer*. Copy it into the viewer.
3. The viewer makes an *answer*. Copy it back into the phone → **Connect**. The viewer goes full-screen clean video.

This is genuinely zero-server, but you copy two text blobs by hand.

**B) One-tap pairing — optional LAN helper**
Run the included `signaling-server.js` on any machine on the same Wi-Fi (see the file header). Put its `ws://IP:8787` URL in Settings; the viewer URL/QR carries it automatically, and pairing happens with no copy/paste. The helper only relays connection handshakes — no media passes through it, nothing is stored, nothing leaves your network.

> Honest limitation: a *passive* OBS Browser Source can't paste SDP on its own, so path A is easiest when you open the viewer in a normal browser window (then add it via Window Capture), while path B is the clean Browser-Source experience. Either way, both devices must be on the same local network and WebRTC must not be blocked by client isolation on the router.

---

## Libraries (bundled, no CDN)

- `lib/konva.min.js` — overlay canvas engine
- `lib/qrcode.min.js` — pairing QR
- `lib/gifler.min.js` — animated GIF rendering (best-effort; falls back to a static frame)

Bundling keeps the app fully offline-capable after install.

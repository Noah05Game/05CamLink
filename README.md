# 05CamLink

Turn a phone into a wireless OBS camera — scenes, overlays, and **scan-to-pair** —
as an installable PWA on GitHub Pages. **Nothing to install or run anywhere.**

Pairing uses the free public **PeerJS** broker to introduce the two devices.
No video passes through it — the camera stream goes phone → PC peer-to-peer,
over your LAN. The broker only carries the tiny connection handshake.

> **Flat layout:** every file sits at the repo root. Upload them all.

---

## Step 1 — Put it on GitHub Pages

1. Create a repo (e.g. `05CamLink`).
2. **Add file → Upload files** and drag in **every file** from this folder.
   Double-check these big ones are in the list before committing:
   `konva.min.js`, `peerjs.min.js`, `jsqr.min.js`.
3. **Settings → Pages → Deploy from a branch → `main` / root → Save.**
4. After ~1 minute, open the link Pages shows:
   `https://USERNAME.github.io/REPO/`

That's the whole deployment. There is no server, no Docker, no tunnel.

---

## Step 2 — Set up the phone (the camera)

1. On the phone, open `https://USERNAME.github.io/REPO/`.
2. Choose **"This is the camera."**
3. It asks you to install (camera + full-screen need an installed app):
   - **iPhone:** Share → **Add to Home Screen**, then open it from the home screen.
   - **Android:** menu ⋮ → **Install app**, then open it.
4. First launch: allow the **camera**, give the device a **name** (e.g. "Noah's iPhone"),
   finish setup. You land on the live camera view.

---

## Step 3 — Set up the computer (the receiver)

1. On the OBS computer, open `https://USERNAME.github.io/REPO/viewer.html`.
2. Choose / confirm **"Watch on this device."**
3. Type a name (e.g. "OBS PC") → **Show QR code.** A QR appears.
   - In OBS, add this page as a **Browser Source** (set size to 1280×720 for 720p),
     or just keep the browser window and use a Window Capture.

---

## Step 4 — Pair them

1. On the **phone**, open Settings (gear) → **Scan QR to connect**
   (or tap the red button on the camera screen).
2. Point the phone at the **QR on the computer**.
3. A popup appears on the phone:
   *"Connect to ‹OBS PC›? This will let ‹OBS PC› view your camera feed."*
   **Slide the green slider** to confirm.
4. A second or two later the video shows up on the computer. Done — you're live.

Both devices need internet at this moment (to reach the broker for the handshake),
but the **video itself flows phone → PC directly over your LAN**.

---

## If pairing won't connect

- **"Matchmaker unreachable"** — the free PeerJS broker is occasionally busy or down.
  Generate a new QR and retry, or use **manual pairing** (below).
- **"That code has expired"** — the computer made a fresh QR; rescan the current one.
- **Video connects then drops** — your Wi-Fi may use *client isolation*
  (common on guest networks), which blocks direct device-to-device traffic.
  Use a normal home/studio network.

### Manual pairing (zero broker, zero server)

Every pairing screen has a **manual** option. The phone generates an offer,
you paste it into the receiver's manual screen, copy its answer back into the
phone. Clunky, but it needs nothing external at all.

---

## Features

Send/receive chooser · install gate · onboarding with device naming ·
camera 480/720/1080p, front/back, mirror · scenes (create/rename/delete,
instant switch, auto-save, export/import) · overlays (text, image, GIF,
drag, pinch-resize + rotate, layers, lock, snap guides) · configurable logo
URLs · offline service worker · scan-to-pair with slide-to-confirm + manual fallback.

## Files
`index.html` `viewer.html` `app.js` `pairing.js` `styles.css` `manifest.json` `sw.js` ·
`konva.min.js` `qrcode.min.js` `gifler.min.js` `jsqr.min.js` `peerjs.min.js` · icons

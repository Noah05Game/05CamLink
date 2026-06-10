/* ============================================================
   05CamLink — OPTIONAL LAN signaling server
   ------------------------------------------------------------
   This is NOT needed for the app to run. GitHub Pages hosts the
   app UI; this tiny relay just lets the phone and the OBS viewer
   find each other on your local network for ONE-TAP pairing,
   instead of copy/pasting the offer + answer by hand.

   Run it on any machine on the same Wi-Fi (e.g. the OBS computer):

     npm init -y
     npm install ws
     node signaling-server.js

   Then in the 05CamLink app → Settings → Branding/Stream, set the
   signaling URL to:   ws://<that-computer-ip>:8787
   (find the IP with `ipconfig` on Windows or `ifconfig`/`ip a` on
   macOS/Linux). The viewer URL/QR will carry it automatically.

   It only forwards messages between a "host" (phone) and a
   "viewer" (OBS page) that share the same session id. No media,
   no storage, no cloud.
   ============================================================ */
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8787;
const wss = new WebSocketServer({ port: PORT });

// session id -> { host, viewer }
const sessions = new Map();

function peerOf(ws) {
  const s = sessions.get(ws._session);
  if (!s) return null;
  return ws._role === 'host' ? s.viewer : s.host;
}

wss.on('connection', ws => {
  ws.on('message', data => {
    let m; try { m = JSON.parse(data); } catch { return; }
    const id = m.session;
    if (!id) return;

    if (m.type === 'host' || m.type === 'viewer-join') {
      ws._session = id;
      ws._role = m.type === 'host' ? 'host' : 'viewer';
      const s = sessions.get(id) || {};
      s[ws._role === 'host' ? 'host' : 'viewer'] = ws;
      sessions.set(id, s);
      // when a viewer joins an existing host, nudge the host to make an offer
      if (ws._role === 'viewer' && s.host && s.host.readyState === 1) {
        s.host.send(JSON.stringify({ type: 'viewer-join', session: id }));
      }
      return;
    }

    // relay offer / answer / ice to the other peer
    const peer = peerOf(ws);
    if (peer && peer.readyState === 1) peer.send(JSON.stringify(m));
  });

  ws.on('close', () => {
    const s = sessions.get(ws._session);
    if (!s) return;
    if (s.host === ws) s.host = null;
    if (s.viewer === ws) s.viewer = null;
    if (!s.host && !s.viewer) sessions.delete(ws._session);
  });
});

console.log(`05CamLink signaling relay listening on ws://0.0.0.0:${PORT}`);

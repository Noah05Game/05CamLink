/* ============================================================
   05CamLink — rendezvous + signaling server  (pair-server.js)
   ------------------------------------------------------------
   This is the small piece that makes "PC finds the phone, click,
   swipe to confirm" possible. Browsers can't scan the LAN, so
   both the phone app and the PC viewer connect here; this server
   keeps a live list of phones, relays the connect request to the
   chosen phone, and forwards the WebRTC handshake. NO video passes
   through it — the camera stream goes phone↔PC directly over your
   LAN. It only brokers text.

   RUN IT
     npm init -y
     npm install ws
     node pair-server.js              # listens on :8787

   MAKE IT REACHABLE OVER wss://  (REQUIRED)
   The app is served from HTTPS (GitHub Pages), and a secure page
   may only open a *secure* WebSocket. So this server must be
   reachable as wss://, not ws://. Easiest options:
     • Put it behind a reverse proxy on a domain you own
       (e.g. https://pair.yourdomain.com → this :8787) with a real
       TLS cert. Then set the app's "Pairing server" to
       wss://pair.yourdomain.com
     • Or expose your local instance with a tunnel that gives you
       HTTPS, e.g.  cloudflared tunnel --url http://localhost:8787
       and use the wss:// URL it prints.

   The video still connects directly device-to-device on your LAN;
   the tunnel/domain only carries the tiny handshake.
   ============================================================ */
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8787;

// id -> { ws, role: 'phone' | 'pc', name }
const peers = new Map();

const server = http.createServer((req, res) => {
  // simple health check / friendly page
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('05CamLink pairing server is running.\nPhones online: ' +
    [...peers.values()].filter(p => p.role === 'phone').length + '\n');
});
const wss = new WebSocketServer({ server });

function phoneList() {
  return [...peers.entries()]
    .filter(([, p]) => p.role === 'phone')
    .map(([id, p]) => ({ id, name: p.name || 'Camera' }));
}
function broadcastPhones() {
  const msg = JSON.stringify({ t: 'devices', list: phoneList() });
  for (const p of peers.values()) if (p.role === 'pc' && p.ws.readyState === 1) p.ws.send(msg);
}
function relay(to, obj) {
  const peer = peers.get(to);
  if (peer && peer.ws.readyState === 1) peer.ws.send(JSON.stringify(obj));
}

wss.on('connection', ws => {
  ws._id = null;
  ws.on('message', data => {
    let m; try { m = JSON.parse(data); } catch { return; }

    if (m.t === 'hello') {
      ws._id = m.id;
      peers.set(m.id, { ws, role: m.role === 'pc' ? 'pc' : 'phone', name: m.name });
      if (ws._role === 'pc' || m.role === 'pc') ws.send(JSON.stringify({ t: 'devices', list: phoneList() }));
      if (m.role !== 'pc') broadcastPhones();   // a phone (dis)appeared
      return;
    }

    // everything else is point-to-point: just forward to `to`
    if (m.to) relay(m.to, m);
  });

  ws.on('close', () => {
    if (!ws._id) return;
    const was = peers.get(ws._id);
    peers.delete(ws._id);
    if (was && was.role === 'phone') broadcastPhones();
  });
});

server.listen(PORT, () => {
  console.log(`05CamLink rendezvous server on :${PORT}  (expose as wss:// for the app)`);
});

/* ============================================================
   05CamLink — pairing.js
   Phone side of the "PC finds phone → swipe to confirm" flow.
   Talks to the rendezvous server (pair-server.js) over WSS,
   announces this device, and on an incoming request shows a
   slide-to-confirm card, then streams P2P over the LAN.
   ============================================================ */
'use strict';

const Pair = (() => {
  let ws = null, myId = '', retry = null, pc = null;
  let pendingPc = null, manualClosed = false;

  function name() {
    if (!State.deviceName) State.deviceName = 'Camera-' + (State.sessionId || '').slice(0, 4).toUpperCase();
    return State.deviceName;
  }

  /* ---------- connection to the rendezvous server ---------- */
  function connect() {
    cleanup();
    if (!State.pairServer) { status('Not connected to a pairing server.'); return; }
    myId = State.sessionId;
    let sock;
    try { sock = new WebSocket(State.pairServer); }
    catch { status('Invalid server URL.'); return; }
    ws = sock;
    status('Connecting…');

    ws.onopen = () => {
      send({ t: 'hello', role: 'phone', id: myId, name: name() });
      status('Discoverable as “' + name() + '”. Waiting for a computer…');
      setDiscoverable(true);
    };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === 'request') onRequest(m);
      else if (m.t === 'sdp' && pc) pc.setRemoteDescription(m.sdp).catch(() => {});
      else if (m.t === 'ice' && pc) pc.addIceCandidate(m.candidate).catch(() => {});
      else if (m.t === 'cancel') hideSheet();
    };
    ws.onclose = () => {
      setDiscoverable(false);
      if (!manualClosed) { status('Reconnecting…'); retry = setTimeout(connect, 2500); }
    };
    ws.onerror = () => status('Could not reach the pairing server (must be wss://).');
  }
  function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
  function cleanup() { clearTimeout(retry); if (ws) { manualClosed = true; try { ws.close(); } catch {} } manualClosed = false; }

  /* ---------- incoming request → slide to confirm ---------- */
  function onRequest(m) {
    pendingPc = m.from;
    $('#csPcName').textContent = m.name || 'A computer';
    showSheet();
  }
  function showSheet() { $('#connectSheet').classList.add('on'); resetSlider(); }
  function hideSheet() { $('#connectSheet').classList.remove('on'); pendingPc = null; }

  async function accept() {
    const target = pendingPc;
    hideSheet();
    if (!target) return;
    send({ t: 'response', to: target, from: myId, ok: true, name: name() });
    await broadcastTo(target);
  }
  function decline() {
    if (pendingPc) send({ t: 'response', to: pendingPc, from: myId, ok: false });
    hideSheet();
  }

  /* ---------- auto WebRTC broadcaster (overlays composited in) ---------- */
  async function broadcastTo(target) {
    closePC();
    pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = e => { if (e.candidate) send({ t: 'ice', to: target, from: myId, candidate: e.candidate }); };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') { Stream.setLive(true); toast('Connected — you are live'); }
      if (['failed', 'disconnected', 'closed'].includes(s)) { Stream.setLive(false); if (s === 'failed') toast('Connection lost'); }
    };
    try {
      const stream = Stream.composite();           // composited camera + overlays
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ t: 'sdp', to: target, from: myId, sdp: pc.localDescription });
    } catch (e) { toast('Could not start the stream'); }
  }
  function closePC() { if (pc) { try { pc.close(); } catch {} pc = null; } }

  /* ---------- slider gesture ---------- */
  function resetSlider() {
    const slider = $('#csSlider'), knob = $('#csKnob'), fill = $('#csFill'), label = $('#csLabel');
    slider.classList.remove('done');
    knob.style.transition = 'none'; fill.style.transition = 'none';
    knob.style.left = '6px'; fill.style.width = '64px'; label.style.opacity = '1';
    label.textContent = 'Slide to connect';
  }
  function wireSlider() {
    const slider = $('#csSlider'), knob = $('#csKnob'), fill = $('#csFill'), label = $('#csLabel');
    let dragging = false, startX = 0, max = 0;
    const KNOB = 52, PAD = 6;

    const begin = x => { dragging = true; startX = x; max = slider.clientWidth - KNOB - PAD * 2; knob.style.transition = 'none'; fill.style.transition = 'none'; };
    const move = x => {
      if (!dragging) return;
      let dx = Math.max(0, Math.min(max, x - startX));
      knob.style.left = (PAD + dx) + 'px';
      fill.style.width = (KNOB + dx) + 'px';
      label.style.opacity = String(1 - dx / max);
      if (dx >= max - 2) { finish(); }
    };
    const release = () => {
      if (!dragging) return; dragging = false;
      const cur = parseFloat(knob.style.left) - PAD;
      if (cur < max - 2) { // snap back
        knob.style.transition = 'left 0.25s cubic-bezier(.22,1,.36,1)';
        fill.style.transition = 'width 0.25s cubic-bezier(.22,1,.36,1)';
        knob.style.left = PAD + 'px'; fill.style.width = KNOB + 'px'; label.style.opacity = '1';
      }
    };
    let done = false;
    const finish = () => {
      if (done) return; done = true; dragging = false;
      slider.classList.add('done'); label.textContent = 'Connecting…'; label.style.opacity = '1';
      setTimeout(() => { done = false; accept(); }, 220);
    };

    knob.addEventListener('touchstart', e => begin(e.touches[0].clientX), { passive: true });
    window.addEventListener('touchmove', e => dragging && move(e.touches[0].clientX), { passive: true });
    window.addEventListener('touchend', release);
    knob.addEventListener('mousedown', e => { begin(e.clientX); e.preventDefault(); });
    window.addEventListener('mousemove', e => dragging && move(e.clientX));
    window.addEventListener('mouseup', release);
  }

  /* ---------- status + settings wiring ---------- */
  function status(t) { const el = $('#pairStatus'); if (el) el.textContent = t; }
  function setDiscoverable(on) {
    if (Stream.live) return;
    const pill = $('#statusPill'), txt = $('#statusText');
    if (!pill) return;
    pill.className = 'status-pill glass ' + (on ? 'disc' : 'ready');
    txt.textContent = on ? 'Discoverable' : 'Ready';
  }
  function wireSettings() {
    const url = $('#pairServerUrl'), nm = $('#deviceNameInput');
    if (url) url.value = State.pairServer || '';
    if (nm) nm.value = State.deviceName || '';
    const save = $('#savePairing');
    if (save) save.onclick = () => {
      State.pairServer = ($('#pairServerUrl').value || '').trim();
      State.deviceName = ($('#deviceNameInput').value || '').trim();
      persist(); toast('Pairing settings saved'); connect();
    };
  }

  function init() {
    wireSlider();
    wireSettings();
    const dec = $('#csDecline'); if (dec) dec.onclick = decline;
    if (State.pairServer) connect();
  }

  return { init, connect };
})();
window.Pair = Pair;

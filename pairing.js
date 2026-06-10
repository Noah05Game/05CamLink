/* ============================================================
   05CamLink — pairing.js  (phone / sender side, PeerJS)
   Scan the QR shown by the PC -> confirm with a slide -> connect
   through the free public PeerJS broker. No server to run. The
   broker only introduces the two devices; the camera stream goes
   phone->PC directly (peer-to-peer), over your LAN when possible.
   ============================================================ */
'use strict';

const Pair = (() => {
  let peer = null, call = null, pending = null, scanRAF = null, scanCanvas = null;

  function devName() {
    if (!State.deviceName) State.deviceName = 'Camera-' + (State.sessionId || '').slice(0, 4).toUpperCase();
    return State.deviceName;
  }

  /* ---------------- QR SCANNER ---------------- */
  function scan() {
    if (typeof jsQR === 'undefined') { toast('QR scanner unavailable'); return; }
    const sc = $('#scanner'), vid = $('#scanVideo');
    const src = Camera.video && Camera.video.srcObject;
    if (!src) { toast('Start the camera first'); return; }
    vid.srcObject = src; vid.play().catch(() => {});
    sc.classList.add('on');
    $('#scanHint').textContent = 'Point at the QR code on your computer';
    if (!scanCanvas) scanCanvas = document.createElement('canvas');
    const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });
    const tick = () => {
      if (vid.readyState >= 2 && vid.videoWidth) {
        const w = scanCanvas.width = 360;
        const h = scanCanvas.height = Math.round(360 * vid.videoHeight / vid.videoWidth);
        ctx.drawImage(vid, 0, 0, w, h);
        let code = null;
        try { const d = ctx.getImageData(0, 0, w, h); code = jsQR(d.data, w, h); } catch {}
        if (code && code.data) { onScanned(code.data); return; }
      }
      scanRAF = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(scanRAF); tick();
  }
  function stopScan() { cancelAnimationFrame(scanRAF); scanRAF = null; $('#scanner').classList.remove('on'); }

  function onScanned(text) {
    let p = null;
    try { p = JSON.parse(text); } catch {}
    if (!p || !p.p) { $('#scanHint').textContent = "That QR isn't a 05CamLink code — try again"; scanRAF = requestAnimationFrame(() => scan()); return; }
    stopScan();
    pending = { pid: p.p, name: p.n || 'this computer' };
    $('#csPcName').textContent = pending.name;
    $('#csPcName2').textContent = pending.name;
    showSheet();
  }

  /* ---------------- CONFIRM SHEET ---------------- */
  function showSheet() { $('#connectSheet').classList.add('on'); resetSlider(); }
  function hideSheet() { $('#connectSheet').classList.remove('on'); }
  function cancel() { hideSheet(); pending = null; }

  async function accept() {
    hideSheet();
    if (!pending) return;
    connectAndCall(pending);
  }

  /* ---------------- CONNECT via PeerJS ---------------- */
  function connectAndCall(info) {
    closeAll();
    if (typeof Peer === 'undefined') { toast('Pairing library failed to load'); return; }
    toast('Connecting…');
    peer = new Peer(undefined, { debug: 1 });
    let calledAlready = false;
    peer.on('open', () => {
      if (calledAlready) return; calledAlready = true;
      let stream;
      try { stream = Stream.composite(); } catch { toast('Could not start the camera stream'); return; }
      try {
        call = peer.call(info.pid, stream, { metadata: { name: devName() } });
        watchCall(call);
      } catch { toast('Could not place the call'); }
    });
    peer.on('error', e => { toast(peerErrText(e)); });
  }

  function watchCall(c) {
    if (!c) { toast('Could not start the call'); return; }
    const onState = () => {
      const s = c.peerConnection && c.peerConnection.connectionState;
      if (s === 'connected') { Stream.setLive(true); toast('Connected — you are live'); }
      if (s === 'failed') { Stream.setLive(false); toast('Connection failed'); }
      if (s === 'disconnected') { Stream.setLive(false); }
    };
    const attach = (n) => {
      if (c.peerConnection) { c.peerConnection.addEventListener('connectionstatechange', onState); onState(); }
      else if (n < 40) setTimeout(() => attach(n + 1), 150);
    };
    attach(0);
    c.on('close', () => Stream.setLive(false));
    c.on('error', () => toast('Call error'));
  }

  function peerErrText(e) {
    const t = e && e.type;
    if (t === 'peer-unavailable') return 'That code has expired — refresh the QR on the computer';
    if (t === 'network' || t === 'server-error' || t === 'socket-error') return 'Matchmaker unreachable — try again, or use manual pairing';
    if (t === 'browser-incompatible') return 'This browser can’t establish the connection';
    return 'Connection problem — try again';
  }

  function closeAll() { if (call) { try { call.close(); } catch {} } if (peer) { try { peer.destroy(); } catch {} } call = null; peer = null; }
  function stop() { closeAll(); Stream.setLive(false); pending = null; }

  /* ---------------- SLIDE-TO-CONFIRM ---------------- */
  function resetSlider() {
    const knob = $('#csKnob'), fill = $('#csFill'), label = $('#csLabel'), slider = $('#csSlider');
    slider.classList.remove('done');
    knob.style.transition = 'none'; fill.style.transition = 'none';
    knob.style.left = '6px'; fill.style.width = '64px'; label.style.opacity = '1'; label.textContent = 'Slide to continue';
  }
  function wireSlider() {
    const slider = $('#csSlider'), knob = $('#csKnob'), fill = $('#csFill'), label = $('#csLabel');
    let dragging = false, startX = 0, max = 0, done = false;
    const KNOB = 52, PAD = 6;
    const begin = x => { dragging = true; startX = x; max = slider.clientWidth - KNOB - PAD * 2; knob.style.transition = 'none'; fill.style.transition = 'none'; };
    const move = x => {
      if (!dragging) return;
      const dx = Math.max(0, Math.min(max, x - startX));
      knob.style.left = (PAD + dx) + 'px'; fill.style.width = (KNOB + dx) + 'px'; label.style.opacity = String(1 - dx / max);
      if (dx >= max - 2) finish();
    };
    const release = () => {
      if (!dragging) return; dragging = false;
      const cur = parseFloat(knob.style.left) - PAD;
      if (cur < max - 2) {
        knob.style.transition = 'left .25s cubic-bezier(.22,1,.36,1)'; fill.style.transition = 'width .25s cubic-bezier(.22,1,.36,1)';
        knob.style.left = PAD + 'px'; fill.style.width = KNOB + 'px'; label.style.opacity = '1';
      }
    };
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

  /* ---------------- SETTINGS WIRING ---------------- */
  function wireSettings() {
    const nm = $('#deviceNameInput'); if (nm) nm.value = State.deviceName || '';
    const save = $('#saveDeviceName'); if (save) save.onclick = () => { State.deviceName = ($('#deviceNameInput').value || '').trim(); persist(); toast('Name saved'); };
    const sb = $('#scanConnectBtn'); if (sb) sb.onclick = () => { closeSheets(); scan(); };
  }

  function init() {
    wireSlider(); wireSettings();
    const dec = $('#csDecline'); if (dec) dec.onclick = cancel;
    const sx = $('#scanClose'); if (sx) sx.onclick = stopScan;
  }

  return { init, scan, stop };
})();
window.Pair = Pair;

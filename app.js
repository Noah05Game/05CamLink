/* ============================================================
   05CamLink — app.js  (local-first PWA)
   ============================================================ */
'use strict';

/* ---------- configurable logo URLs (fallback to text logo) ---------- */
const LOGO_DEFAULTS = {
  logoImageURL: '',
  splashLogoImageURL: '',
  onboardingLogoImageURL: ''
};

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 9);

/* ============================================================
   1. STORAGE — IndexedDB primary, localStorage fallback
   ============================================================ */
const Store = (() => {
  const DB = '05camlink', VER = 1, KV = 'kv';
  let dbP = null, useIDB = 'indexedDB' in window;

  function open() {
    if (dbP) return dbP;
    dbP = new Promise((res, rej) => {
      const r = indexedDB.open(DB, VER);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(KV)) r.result.createObjectStore(KV); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbP;
  }
  async function get(k) {
    if (!useIDB) { try { return JSON.parse(localStorage.getItem('05_' + k)); } catch { return null; } }
    try {
      const db = await open();
      return await new Promise((res, rej) => {
        const tx = db.transaction(KV, 'readonly').objectStore(KV).get(k);
        tx.onsuccess = () => res(tx.result ?? null); tx.onerror = () => rej(tx.error);
      });
    } catch { useIDB = false; return get(k); }
  }
  async function set(k, v) {
    try { localStorage.setItem('05_' + k, JSON.stringify(v)); } catch {}
    if (!useIDB) return;
    try {
      const db = await open();
      await new Promise((res, rej) => {
        const tx = db.transaction(KV, 'readwrite').objectStore(KV).put(v, k);
        tx.onsuccess = res; tx.onerror = () => rej(tx.error);
      });
    } catch { useIDB = false; }
  }
  async function clear() {
    Object.keys(localStorage).filter(k => k.startsWith('05_')).forEach(k => localStorage.removeItem(k));
    if (!useIDB) return;
    try { const db = await open(); db.transaction(KV, 'readwrite').objectStore(KV).clear(); } catch {}
  }
  return { get, set, clear };
})();

/* ============================================================
   2. GLOBAL STATE
   ============================================================ */
const State = {
  scenes: [],
  currentId: null,
  settings: { res: '720', facing: 'environment', mirror: false, micEnabled: false },
  logos: { ...LOGO_DEFAULTS },
  sessionId: uid() + uid(),
  signalUrl: '',
  pairServer: '',
  deviceName: '',
  onboardingCompleted: false
};

async function loadState() {
  const s = await Store.get('state');
  if (s) Object.assign(State, s);
  const sc = await Store.get('scenes');
  State.scenes = Array.isArray(sc) ? sc : [];
  if (!State.scenes.length) {
    State.scenes = [newScene('Scene 1')];
    State.currentId = State.scenes[0].id;
  }
  if (!State.currentId || !State.scenes.find(x => x.id === State.currentId))
    State.currentId = State.scenes[0].id;
}
let saveT;
function persist() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    Store.set('scenes', State.scenes);
    Store.set('state', {
      currentId: State.currentId, settings: State.settings, logos: State.logos,
      sessionId: State.sessionId, signalUrl: State.signalUrl, pairServer: State.pairServer, deviceName: State.deviceName, onboardingCompleted: State.onboardingCompleted
    });
  }, 250);
}
function newScene(name) {
  return { id: uid(), name, cameraEnabled: true, overlays: [] };
}
const curScene = () => State.scenes.find(s => s.id === State.currentId);

/* ============================================================
   3. UI HELPERS
   ============================================================ */
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200);
}
function applyLogos() {
  const set = (el, url, fallback = '05') => {
    if (!el) return;
    if (url) el.innerHTML = `<img src="${url}" alt="logo" onerror="this.parentNode.textContent='${fallback}'">`;
    else el.textContent = fallback;
  };
  set($('#splashLogo'), State.logos.splashLogoImageURL);
  set($('#gateLogo'), State.logos.logoImageURL);
  set($('#obLogo'), State.logos.onboardingLogoImageURL);
  set($('#tbLogo'), State.logos.logoImageURL);
}
function openSheet(id) { $('#scrim').classList.add('on'); $(id).classList.add('on'); }
function closeSheets() { $('#scrim').classList.remove('on'); $$('.sheet').forEach(s => s.classList.remove('on')); }

/* ============================================================
   4. INSTALL GATE  (PWA-only)
   ============================================================ */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: fullscreen)').matches ||
         window.navigator.standalone === true ||
         document.referrer.startsWith('android-app://');
}
const DEV_BYPASS = new URLSearchParams(location.search).has('preview'); // ?preview to test in tab

function showGate() {
  $('#gate').classList.remove('hidden');
  $('#gateInstallBtn').onclick = async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }
    else toast('Use your browser menu → Install / Add to Home Screen');
  };
  $('#gateHelpBtn').onclick = () => toast('iOS: Share → Add to Home Screen · Android: ⋮ → Install app');
}

/* ============================================================
   5. ONBOARDING
   ============================================================ */
let obStep = 0;
const OB_STEPS = 5;
function renderObProgress() {
  $('#obProgress').innerHTML = Array.from({ length: OB_STEPS },
    (_, i) => `<div class="ob-dot ${i <= obStep ? 'on' : ''}"></div>`).join('');
}
function showObStep(n) {
  obStep = Math.max(0, Math.min(OB_STEPS - 1, n));
  $$('.ob-step').forEach(s => s.classList.toggle('active', +s.dataset.step === obStep));
  renderObProgress();
  $('#onboard').scrollTop = 0;
}
function wireOnboarding() {
  $$('[data-next]').forEach(b => b.onclick = () => showObStep(obStep + 1));
  $$('[data-back]').forEach(b => b.onclick = () => showObStep(obStep - 1));

  $('#obEnableCam').onclick = async () => {
    const ok = await Camera.start();
    const ps = $('#permState');
    if (ok) { ps.className = 'permission-state ok'; ps.innerHTML = '<span>✅</span><span>Camera enabled</span>'; setTimeout(() => showObStep(3), 500); }
    else { ps.className = 'permission-state err'; ps.innerHTML = '<span>⚠️</span><span>Camera blocked — allow access in settings</span>'; }
    const cc = $('#camConfirm');
    cc.className = 'permission-state ' + (ok ? 'ok' : 'err');
    cc.innerHTML = ok ? '<span>📷</span><span>Camera ready</span>' : '<span>📷</span><span>Camera not available</span>';
  };

  // quick-setup segmented pickers
  $$('#obFacing button').forEach(b => b.onclick = () => {
    $$('#obFacing button').forEach(x => x.classList.remove('on')); b.classList.add('on');
    State.settings.facing = b.dataset.facing;
  });
  $$('#obRes button').forEach(b => b.onclick = () => {
    $$('#obRes button').forEach(x => x.classList.remove('on')); b.classList.add('on');
    State.settings.res = b.dataset.res;
  });
  $('#obMirror').onclick = () => { const t = $('#obMirror'); t.classList.toggle('on'); State.settings.mirror = t.classList.contains('on'); };

  $('#obFinish').onclick = async () => {
    State.onboardingCompleted = true; persist();
    $('#onboard').classList.add('hidden');
    await launchApp();
  };
}

/* ============================================================
   6. CAMERA
   ============================================================ */
const Camera = (() => {
  const video = $('#cam');
  let stream = null;
  const dims = { '480': { w: 854, h: 480 }, '720': { w: 1280, h: 720 }, '1080': { w: 1920, h: 1080 } };

  async function start() {
    stop();
    const d = dims[State.settings.res] || dims['720'];
    const constraints = {
      audio: State.settings.micEnabled,
      video: { facingMode: { ideal: State.settings.facing }, width: { ideal: d.w }, height: { ideal: d.h } }
    };
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      applyMirror();
      await video.play().catch(() => {});
      Stream.onCameraReady(stream);
      return true;
    } catch (e) {
      console.warn('getUserMedia failed', e);
      return false;
    }
  }
  function stop() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }
  function applyMirror() { video.classList.toggle('mirror', !!State.settings.mirror); }
  return { start, stop, applyMirror, get stream() { return stream; }, get video() { return video; } };
})();

/* ============================================================
   7. OVERLAY ENGINE (Konva)
   ============================================================ */
const Overlay = (() => {
  let stage, layer, guideLayer, tr, selected = null;
  const SWATCHES = ['#ffffff', '#000000', '#ff453a', '#32d6ff', '#30d158', '#ff9f0a', '#bf5af2', '#ffd60a'];

  function init() {
    const host = $('#konva');
    stage = new Konva.Stage({ container: 'konva', width: host.clientWidth, height: host.clientHeight });
    layer = new Konva.Layer(); guideLayer = new Konva.Layer({ listening: false });
    stage.add(layer); stage.add(guideLayer);
    tr = new Konva.Transformer({
      rotateEnabled: true, enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      anchorSize: 22, anchorCornerRadius: 11, borderStroke: '#32d6ff', anchorStroke: '#32d6ff',
      anchorFill: '#0b0e14', padding: 6, rotateAnchorOffset: 28
    });
    layer.add(tr);

    stage.on('click tap', e => { if (e.target === stage) select(null); });
    window.addEventListener('resize', resize);
    setupMultitouch();
    buildTextEditor();
    return stage;
  }
  function resize() {
    const host = $('#konva');
    stage.width(host.clientWidth); stage.height(host.clientHeight);
    layer.batchDraw();
  }

  /* ---- selection ---- */
  function select(node) {
    selected = node;
    if (node && !node.getAttr('locked')) { tr.nodes([node]); tr.moveToTop(); }
    else tr.nodes([]);
    layer.batchDraw();
    const t = $('#selTools'); t.classList.toggle('on', !!node);
    if (node) $('[data-sel="edit"]').style.display = node.getAttr('otype') === 'text' ? 'grid' : 'none';
    refreshLayers();
  }

  /* ---- add nodes ---- */
  function attach(node, otype) {
    node.setAttr('otype', otype); node.setAttr('oid', uid());
    node.draggable(true);
    node.on('click tap', () => select(node));
    node.on('dragmove', () => snap(node));
    node.on('dragend transformend', () => { clearGuides(); save(); });
    layer.add(node); select(node); save();
  }
  function addText(opts = {}) {
    const t = new Konva.Text({
      text: opts.text || 'Tap to edit', x: stage.width() / 2 - 90, y: stage.height() / 2 - 30,
      fontSize: opts.fontSize || 46, fontStyle: 'bold', fill: opts.fill || '#ffffff',
      fontFamily: '-apple-system, system-ui, sans-serif', shadowColor: '#000', shadowBlur: opts.shadow ? 8 : 0,
      shadowOpacity: opts.shadow ? 0.6 : 0, shadowOffset: { x: 0, y: 2 }, draggable: true,
      rotation: opts.rotation || 0, scaleX: opts.scaleX || 1, scaleY: opts.scaleY || 1
    });
    if (opts.x != null) { t.x(opts.x); t.y(opts.y); }
    t.setAttr('hasShadow', !!opts.shadow);
    attach(t, 'text');
    if (!opts.text) editText(t);
    return t;
  }
  function addImageFromSrc(src, otype = 'image', opts = {}) {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      const max = Math.min(stage.width(), stage.height()) * 0.5;
      const sc = Math.min(max / img.width, max / img.height, 1);
      const node = new Konva.Image({
        image: img, x: opts.x ?? stage.width() / 2 - (img.width * sc) / 2,
        y: opts.y ?? stage.height() / 2 - (img.height * sc) / 2,
        width: img.width, height: img.height, scaleX: opts.scaleX || sc, scaleY: opts.scaleY || sc,
        rotation: opts.rotation || 0, draggable: true
      });
      node.setAttr('src', src);
      attach(node, otype);
    };
    img.onerror = () => toast('Could not load image');
    img.src = src;
  }
  function addGifFromSrc(src, opts = {}) {
    // best-effort animated GIF via gifler; falls back to static frame
    if (typeof gifler === 'undefined') return addImageFromSrc(src, 'gif', opts);
    const canvas = document.createElement('canvas');
    try {
      gifler(src).get(a => {
        canvas.width = a.width; canvas.height = a.height;
        a.animateInCanvas(canvas);
        const max = Math.min(stage.width(), stage.height()) * 0.5;
        const sc = Math.min(max / a.width, max / a.height, 1);
        const node = new Konva.Image({
          image: canvas, x: opts.x ?? stage.width() / 2 - (a.width * sc) / 2,
          y: opts.y ?? stage.height() / 2 - (a.height * sc) / 2,
          width: a.width, height: a.height, scaleX: opts.scaleX || sc, scaleY: opts.scaleY || sc,
          rotation: opts.rotation || 0, draggable: true
        });
        node.setAttr('src', src);
        attach(node, 'gif');
        const anim = new Konva.Animation(() => {}, layer); anim.start();
        node.setAttr('_anim', true);
      });
    } catch (e) { addImageFromSrc(src, 'gif', opts); }
  }

  /* ---- snap-to-center guides ---- */
  function snap(node) {
    const TH = 8; clearGuides();
    const box = node.getClientRect();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const sx = stage.width() / 2, sy = stage.height() / 2;
    if (Math.abs(cx - sx) < TH) { node.x(node.x() + (sx - cx)); drawGuide('v', sx); }
    if (Math.abs(cy - sy) < TH) { node.y(node.y() + (sy - cy)); drawGuide('h', sy); }
  }
  function drawGuide(dir, p) {
    const line = new Konva.Line({
      points: dir === 'v' ? [p, 0, p, stage.height()] : [0, p, stage.width(), p],
      stroke: '#32d6ff', strokeWidth: 1, dash: [6, 6], opacity: 0.9
    });
    guideLayer.add(line); guideLayer.batchDraw();
  }
  function clearGuides() { guideLayer.destroyChildren(); guideLayer.batchDraw(); }

  /* ---- two-finger pinch + rotate on selected node ---- */
  function setupMultitouch() {
    const el = stage.container();
    let active = false, startDist = 0, startAngle = 0, startScale = 1, startRot = 0, wasDraggable = true;
    const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const ang = (a, b) => Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180 / Math.PI;
    el.addEventListener('touchstart', e => {
      if (e.touches.length === 2 && selected && !selected.getAttr('locked')) {
        active = true; wasDraggable = selected.draggable(); selected.draggable(false);
        startDist = dist(e.touches[0], e.touches[1]);
        startAngle = ang(e.touches[0], e.touches[1]);
        startScale = selected.scaleX(); startRot = selected.rotation();
        tr.nodes([]);
      }
    }, { passive: false });
    el.addEventListener('touchmove', e => {
      if (!active || e.touches.length !== 2) return;
      e.preventDefault();
      const d = dist(e.touches[0], e.touches[1]);
      const a = ang(e.touches[0], e.touches[1]);
      const s = Math.max(0.1, startScale * (d / startDist));
      selected.scaleX(s); selected.scaleY(s);
      selected.rotation(startRot + (a - startAngle));
      layer.batchDraw();
    }, { passive: false });
    const end = e => {
      if (active && e.touches.length < 2) {
        active = false; if (selected) { selected.draggable(wasDraggable); select(selected); } save();
      }
    };
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  }

  /* ---- text editor popover ---- */
  let editing = null;
  function buildTextEditor() {
    const sw = $('#teColors');
    sw.innerHTML = SWATCHES.map((c, i) => `<button class="color-dot ${i === 0 ? 'sel' : ''}" style="background:${c}" data-c="${c}"></button>`).join('');
    sw.querySelectorAll('.color-dot').forEach(d => d.onclick = () => { sw.querySelectorAll('.color-dot').forEach(x => x.classList.remove('sel')); d.classList.add('sel'); });
    $$('#teSize button').forEach(b => b.onclick = () => { $$('#teSize button').forEach(x => x.classList.remove('on')); b.classList.add('on'); });
    $('#teShadow').onclick = () => $('#teShadow').classList.toggle('on');
    $('#teCancel').onclick = () => { $('#textEdit').classList.remove('on'); editing = null; };
    $('#teApply').onclick = () => {
      if (!editing) return;
      editing.text($('#teValue').value || 'Text');
      editing.fontSize(+$('#teSize button.on').dataset.size);
      editing.fill($('#teColors .color-dot.sel').dataset.c);
      const sh = $('#teShadow').classList.contains('on');
      editing.shadowBlur(sh ? 8 : 0); editing.shadowOpacity(sh ? 0.6 : 0); editing.setAttr('hasShadow', sh);
      layer.batchDraw(); $('#textEdit').classList.remove('on'); editing = null; save();
    };
  }
  function editText(node) {
    editing = node; const te = $('#textEdit');
    $('#teValue').value = node.text() === 'Tap to edit' ? '' : node.text();
    $$('#teSize button').forEach(b => b.classList.toggle('on', +b.dataset.size === node.fontSize()));
    if (!$('#teSize button.on')) $('#teSize button[data-size="46"]').classList.add('on');
    $$('#teColors .color-dot').forEach(d => d.classList.toggle('sel', d.dataset.c === node.fill()));
    $('#teShadow').classList.toggle('on', !!node.getAttr('hasShadow'));
    te.classList.add('on'); $('#teValue').focus();
  }

  /* ---- selection toolbar actions ---- */
  function selAction(act) {
    if (!selected) return;
    if (act === 'front') { selected.moveToTop(); tr.moveToTop(); }
    if (act === 'back') { selected.moveToBottom(); }
    if (act === 'delete') { selected.destroy(); select(null); }
    if (act === 'edit' && selected.getAttr('otype') === 'text') editText(selected);
    if (act === 'lock') {
      const l = !selected.getAttr('locked'); selected.setAttr('locked', l);
      selected.draggable(!l); tr.nodes(l ? [] : [selected]);
      $('[data-sel="lock"]').classList.toggle('active', l);
      toast(l ? 'Layer locked' : 'Layer unlocked');
    }
    layer.batchDraw(); save();
  }

  /* ---- serialize / load ---- */
  function serialize() {
    return layer.getChildren(n => n.getAttr('oid')).map(n => ({
      otype: n.getAttr('otype'), src: n.getAttr('src') || null,
      text: n.getAttr('otype') === 'text' ? n.text() : null,
      x: n.x(), y: n.y(), scaleX: n.scaleX(), scaleY: n.scaleY(), rotation: n.rotation(),
      fontSize: n.fontSize ? n.fontSize() : null, fill: n.fill ? n.fill() : null,
      shadow: !!n.getAttr('hasShadow'), locked: !!n.getAttr('locked')
    }));
  }
  function clearAll() { layer.getChildren(n => n.getAttr('oid')).forEach(n => n.destroy()); tr.nodes([]); selected = null; layer.batchDraw(); }
  function loadScene(scene) {
    clearAll(); $('#selTools').classList.remove('on');
    (scene.overlays || []).forEach(o => {
      if (o.otype === 'text') addText({ text: o.text, fontSize: o.fontSize, fill: o.fill, shadow: o.shadow, x: o.x, y: o.y, rotation: o.rotation, scaleX: o.scaleX, scaleY: o.scaleY });
      else if (o.otype === 'gif') addGifFromSrc(o.src, o);
      else if (o.src) addImageFromSrc(o.src, 'image', o);
      const last = layer.getChildren(n => n.getAttr('oid')).slice(-1)[0];
      if (last && o.locked) { last.setAttr('locked', true); last.draggable(false); }
    });
    select(null);
  }
  function save() { const s = curScene(); if (s) { s.overlays = serialize(); persist(); } refreshLayers(); }

  /* ---- layers panel ---- */
  function refreshLayers() {
    const wrap = $('#layersList'); if (!wrap) return;
    const nodes = layer.getChildren(n => n.getAttr('oid')).slice().reverse();
    if (!nodes.length) { wrap.innerHTML = '<div class="ob-text" style="font-size:13px">No overlays yet.</div>'; return; }
    wrap.innerHTML = '';
    nodes.forEach(n => {
      const ic = n.getAttr('otype') === 'text' ? 'T' : n.getAttr('otype') === 'gif' ? '◎' : '🖼';
      const nm = n.getAttr('otype') === 'text' ? (n.text() || 'Text') : n.getAttr('otype').toUpperCase();
      const row = document.createElement('div');
      row.className = 'layer-item' + (n === selected ? ' sel' : '');
      row.innerHTML = `<div class="layer-thumb">${ic}</div><div class="layer-name">${nm}</div>
        ${n.getAttr('locked') ? '🔒' : ''}<button class="mini-btn" data-act="up">▲</button><button class="mini-btn" data-act="down">▼</button>`;
      row.querySelector('.layer-name').onclick = () => { select(n); };
      row.querySelector('[data-act="up"]').onclick = e => { e.stopPropagation(); n.moveUp(); tr.moveToTop(); save(); };
      row.querySelector('[data-act="down"]').onclick = e => { e.stopPropagation(); n.moveDown(); save(); };
      wrap.appendChild(row);
    });
  }

  function getStageCanvas() { return stage.toCanvas ? stage : null; }
  return { init, addText, addImageFromSrc, addGifFromSrc, loadScene, save, selAction, refreshLayers, get stage() { return stage; }, get layer() { return layer; } };
})();

/* ============================================================
   8. STREAMING (composited capture + WebRTC, manual or WS signaling)
   ============================================================ */
const Stream = (() => {
  let composite, cctx, rafId, compStream, pc, live = false, t0, clockId;

  function compositeCanvas() {
    if (composite) return composite;
    composite = document.createElement('canvas');
    cctx = composite.getContext('2d');
    return composite;
  }
  function onCameraReady() { /* sizing handled in loop */ }

  function startComposite() {
    const c = compositeCanvas();
    const draw = () => {
      const v = Camera.video, st = Overlay.stage;
      if (v && v.videoWidth) {
        if (c.width !== v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; }
        cctx.save();
        if (State.settings.mirror) { cctx.translate(c.width, 0); cctx.scale(-1, 1); }
        cctx.drawImage(v, 0, 0, c.width, c.height);
        cctx.restore();
        if (st) { try { cctx.drawImage(st.toCanvas({ pixelRatio: c.width / st.width() }), 0, 0, c.width, c.height); } catch {} }
      }
      rafId = requestAnimationFrame(draw);
    };
    cancelAnimationFrame(rafId); draw();
    compStream = c.captureStream(30);
    if (Camera.stream) Camera.stream.getAudioTracks().forEach(t => compStream.addTrack(t));
    return compStream;
  }

  function buildPC() {
    pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    startComposite().getTracks().forEach(t => pc.addTrack(t, compStream));
    return pc;
  }

  /* manual signaling: create offer, wait for pasted answer */
  async function createOffer() {
    buildPC();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await iceComplete(pc);
    return btoa(JSON.stringify(pc.localDescription));
  }
  async function acceptAnswer(b64) {
    const desc = JSON.parse(atob(b64.trim()));
    await pc.setRemoteDescription(desc);
    setLive(true);
  }
  function iceComplete(p) {
    return new Promise(res => {
      if (p.iceGatheringState === 'complete') return res();
      p.onicegatheringstatechange = () => p.iceGatheringState === 'complete' && res();
      setTimeout(res, 2500);
    });
  }

  /* optional WS signaling for one-tap pairing */
  function connectWS() {
    if (!State.signalUrl) { toast('Set a LAN signaling URL in Settings, or use manual pairing'); return; }
    const ws = new WebSocket(State.signalUrl);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'host', session: State.sessionId }));
    ws.onmessage = async ev => {
      const m = JSON.parse(ev.data);
      if (m.type === 'viewer-join') { buildPC(); pc.onicecandidate = e => e.candidate && ws.send(JSON.stringify({ type: 'ice', session: State.sessionId, candidate: e.candidate })); const o = await pc.createOffer(); await pc.setLocalDescription(o); ws.send(JSON.stringify({ type: 'offer', session: State.sessionId, sdp: pc.localDescription })); }
      if (m.type === 'answer') { await pc.setRemoteDescription(m.sdp); setLive(true); }
      if (m.type === 'ice' && pc) { try { await pc.addIceCandidate(m.candidate); } catch {} }
    };
    ws.onerror = () => toast('Signaling server unreachable');
    return ws;
  }

  function setLive(v) {
    live = v;
    $('#goLive').classList.toggle('live', v);
    $('#statusPill').className = 'status-pill glass ' + (v ? 'live' : 'ready');
    $('#statusText').textContent = v ? 'Live' : 'Ready';
    $('#recTimer').classList.toggle('on', v);
    if (v) { t0 = Date.now(); tick(); clockId = setInterval(tick, 1000); }
    else { clearInterval(clockId); }
  }
  function tick() {
    const s = Math.floor((Date.now() - t0) / 1000);
    $('#recClock').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  function stop() { if (pc) { pc.close(); pc = null; } setLive(false); cancelAnimationFrame(rafId); }

  function viewerUrl() {
    const base = location.href.replace(/index\.html.*$/, '').replace(/[?#].*$/, '').replace(/\/$/, '');
    const u = new URL(base + '/viewer.html');
    u.searchParams.set('session', State.sessionId);
    if (State.signalUrl) u.searchParams.set('signal', State.signalUrl);
    return u.toString();
  }
  return { onCameraReady, createOffer, acceptAnswer, connectWS, setLive, stop, viewerUrl,
    composite: startComposite, get live() { return live; } };
})();

/* ============================================================
   9. SCENES UI
   ============================================================ */
function switchScene(id) {
  if (id === State.currentId) { closeSheets(); return; }
  Overlay.save();
  State.currentId = id; persist();
  $('#curSceneName').textContent = curScene().name;
  Overlay.loadScene(curScene());
  renderScenes();
}
function renderScenes() {
  const wrap = $('#scenesList'); wrap.innerHTML = '';
  State.scenes.forEach(s => {
    const el = document.createElement('div');
    el.className = 'scene-item' + (s.id === State.currentId ? ' active' : '');
    el.innerHTML = `<div style="flex:1"><div class="sname">${s.name}</div><div class="smeta">${(s.overlays || []).length} overlay(s)</div></div>
      <button class="mini-btn" data-a="rename">Rename</button><button class="mini-btn" data-a="del">Delete</button>`;
    el.querySelector('.sname').onclick = () => switchScene(s.id);
    el.querySelector('[data-a="rename"]').onclick = () => {
      const n = prompt('Scene name', s.name); if (n) { s.name = n.trim(); persist(); if (s.id === State.currentId) $('#curSceneName').textContent = s.name; renderScenes(); }
    };
    el.querySelector('[data-a="del"]').onclick = () => {
      if (State.scenes.length === 1) return toast('Keep at least one scene');
      if (!confirm(`Delete "${s.name}"?`)) return;
      State.scenes = State.scenes.filter(x => x.id !== s.id);
      if (State.currentId === s.id) switchScene(State.scenes[0].id);
      persist(); renderScenes();
    };
    wrap.appendChild(el);
  });
  Overlay.refreshLayers();
}
function addScene() {
  const s = newScene(`Scene ${State.scenes.length + 1}`);
  State.scenes.push(s); persist(); switchScene(s.id); renderScenes();
  toast('Scene added');
}

/* ============================================================
   10. SETTINGS UI
   ============================================================ */
function syncSettingsUI() {
  $$('#setRes button').forEach(b => b.classList.toggle('on', b.dataset.res === State.settings.res));
  $$('#setFacing button').forEach(b => b.classList.toggle('on', b.dataset.facing === State.settings.facing));
  $('#setMirror').classList.toggle('on', State.settings.mirror);
  $('#obsUrl').value = Stream.viewerUrl();
  $('#sessId').value = State.sessionId;
  $('#logoMain').value = State.logos.logoImageURL;
  $('#logoSplash').value = State.logos.splashLogoImageURL;
  $('#logoOnboard').value = State.logos.onboardingLogoImageURL;
}
function wireSettings() {
  $$('#setRes button').forEach(b => b.onclick = async () => { State.settings.res = b.dataset.res; syncSettingsUI(); persist(); await Camera.start(); toast(b.dataset.res + 'p'); });
  $$('#setFacing button').forEach(b => b.onclick = async () => { State.settings.facing = b.dataset.facing; syncSettingsUI(); persist(); await Camera.start(); });
  $('#setMirror').onclick = () => { State.settings.mirror = !State.settings.mirror; $('#setMirror').classList.toggle('on'); Camera.applyMirror(); persist(); };

  $('#copyObs').onclick = () => { navigator.clipboard?.writeText($('#obsUrl').value); toast('OBS URL copied'); };
  $('#copySess').onclick = () => { navigator.clipboard?.writeText($('#sessId').value); toast('Session ID copied'); };
  $('#showQr').onclick = () => {
    const w = $('#qrWrap'); w.classList.toggle('hidden');
    if (!w.classList.contains('hidden')) renderQR($('#qrBox'), Stream.viewerUrl());
  };

  $('#exportScenes').onclick = () => {
    const blob = new Blob([JSON.stringify({ scenes: State.scenes }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '05camlink-scenes.json'; a.click();
    toast('Scenes exported');
  };
  $('#importScenes').onclick = () => $('#jsonPick').click();
  $('#jsonPick').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(r.result); if (Array.isArray(d.scenes) && d.scenes.length) { State.scenes = d.scenes; State.currentId = d.scenes[0].id; persist(); $('#curSceneName').textContent = curScene().name; Overlay.loadScene(curScene()); renderScenes(); toast('Scenes imported'); } else toast('No scenes in file'); } catch { toast('Invalid JSON'); } };
    r.readAsText(f); e.target.value = '';
  };
  $('#resetScenes').onclick = () => {
    if (!confirm('Delete all scenes and overlays?')) return;
    State.scenes = [newScene('Scene 1')]; State.currentId = State.scenes[0].id; persist();
    $('#curSceneName').textContent = 'Scene 1'; Overlay.loadScene(curScene()); renderScenes(); toast('Scenes reset');
  };

  $('#saveLogos').onclick = () => {
    State.logos.logoImageURL = $('#logoMain').value.trim();
    State.logos.splashLogoImageURL = $('#logoSplash').value.trim();
    State.logos.onboardingLogoImageURL = $('#logoOnboard').value.trim();
    persist(); applyLogos(); toast('Logos saved');
  };
  $('#installHelp').onclick = () => toast('iOS: Share → Add to Home Screen · Android: ⋮ → Install app');
  $('#clearData').onclick = async () => {
    if (!confirm('Erase ALL local data and reset the app?')) return;
    await Store.clear(); location.reload();
  };
}
function renderQR(box, text) {
  box.innerHTML = '';
  try {
    const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
    box.innerHTML = qr.createImgTag(5, 8);
  } catch { box.textContent = 'QR error'; }
}

/* ============================================================
   11. MAIN WIRING
   ============================================================ */
function wireMain() {
  // top bar
  $('#sceneSwitch').onclick = () => { renderScenes(); openSheet('#scenesSheet'); };
  $('#openSettings').onclick = () => { syncSettingsUI(); openSheet('#settingsSheet'); };
  $('#scrim').onclick = closeSheets;
  $$('[data-close]').forEach(b => b.onclick = closeSheets);

  // bottom actions
  $('#addText').onclick = () => Overlay.addText({});
  $('#addImage').onclick = () => $('#filePick').click();
  $('#addGif').onclick = () => $('#gifPick').click();
  $('#addScene').onclick = addScene;
  $('#newSceneBtn').onclick = addScene;

  $('#filePick').onchange = e => readFile(e, src => Overlay.addImageFromSrc(src, 'image'));
  $('#gifPick').onchange = e => readFile(e, src => Overlay.addGifFromSrc(src));

  // selection toolbar
  $$('.sel-btn').forEach(b => b.onclick = () => Overlay.selAction(b.dataset.sel));

  // go live → pairing flow
  $('#goLive').onclick = onGoLive;

  wireSettings();
}
function readFile(e, cb) {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(f); e.target.value = '';
}

async function onGoLive() {
  if (Stream.live) { Stream.stop(); toast('Stream stopped'); return; }
  syncSettingsUI(); openSheet('#settingsSheet');
  // build a pairing block inside settings dynamically
  let pair = $('#pairBlock');
  if (!pair) {
    pair = document.createElement('div'); pair.id = 'pairBlock';
    pair.innerHTML = `
      <div class="section-label">Pair with OBS (manual)</div>
      <p class="ob-text" style="font-size:13px">1 · Open the OBS URL above on your computer (or add it as a Browser Source). 2 · Copy the <b>offer</b> below into the viewer. 3 · Paste the viewer's <b>answer</b> back here.</p>
      <div class="url-copy" style="margin-top:8px"><textarea class="field-input mono" id="offerOut" readonly placeholder="Generating offer…" style="font-size:11px;height:64px"></textarea></div>
      <button class="btn btn-ghost btn-block" id="copyOffer" style="margin-top:8px">Copy offer</button>
      <textarea class="field-input mono" id="answerIn" placeholder="Paste answer from viewer here" style="font-size:11px;height:64px;margin-top:10px"></textarea>
      <button class="btn btn-primary btn-block" id="connectBtn" style="margin-top:8px">Connect</button>
      <button class="btn btn-ghost btn-block" id="wsBtn" style="margin-top:8px">Use LAN signaling server instead</button>`;
    $('#settingsSheet .sheet-body').appendChild(pair);
    $('#copyOffer').onclick = () => { navigator.clipboard?.writeText($('#offerOut').value); toast('Offer copied'); };
    $('#connectBtn').onclick = async () => { try { await Stream.acceptAnswer($('#answerIn').value); toast('Connected — you are live'); closeSheets(); } catch { toast('Could not connect — check the answer'); } };
    $('#wsBtn').onclick = () => Stream.connectWS();
  }
  $('#offerOut').value = 'Generating offer…';
  try { $('#offerOut').value = await Stream.createOffer(); } catch (e) { $('#offerOut').value = 'Failed to create offer'; }
}

/* ============================================================
   12. BOOT
   ============================================================ */
async function launchApp() {
  $('#app').classList.remove('hidden');
  Overlay.init();
  await Camera.start();
  $('#curSceneName').textContent = curScene().name;
  Overlay.loadScene(curScene());
  renderScenes();
  syncSettingsUI();
  Stream.setLive(false);
  if (typeof Pair !== 'undefined') Pair.init();
}

async function boot() {
  await loadState();
  applyLogos();
  wireOnboarding();
  wireMain();

  // register service worker (relative path → works in /repo subdir)
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('sw.js'); } catch (e) { console.warn('SW failed', e); }
  }

  setTimeout(async () => {
    $('#splash').style.opacity = '0';
    setTimeout(() => $('#splash').classList.add('hidden'), 500);

    if (!isStandalone() && !DEV_BYPASS) { showGate(); return; }

    if (!State.onboardingCompleted) {
      $('#onboard').classList.remove('hidden'); showObStep(0);
    } else {
      await launchApp();
    }
  }, 1100);
}
document.addEventListener('DOMContentLoaded', boot);

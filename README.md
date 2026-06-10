<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
<meta name="theme-color" content="#0b0e14" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="05CamLink" />
<meta name="mobile-web-app-capable" content="yes" />
<title>05CamLink</title>
<link rel="manifest" href="manifest.json" />
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
<link rel="icon" href="icons/favicon-32.png" sizes="32x32" />
<link rel="stylesheet" href="styles.css" />
</head>
<body>

<!-- ============ SPLASH ============ -->
<div id="splash" class="screen">
  <div class="brandmark" id="splashLogo">05</div>
  <div class="splash-name">05CamLink</div>
  <div class="splash-tag">Wireless OBS camera</div>
</div>

<!-- ============ INSTALL GATE ============ -->
<div id="gate" class="screen hidden">
  <div class="gate-card glass">
    <div class="brandmark" id="gateLogo">05</div>
    <h1 class="gate-h1">Install 05CamLink to continue</h1>
    <p class="gate-sub">This runs as a home-screen app so the camera, overlays and streaming work full-screen and offline. Open it in a browser tab won't cut it.</p>
    <div class="gate-steps">
      <div class="os-pill">iPhone / iPad</div>
      <div class="gate-step"><b>1.</b><span>Tap the <b>Share</b> button in Safari.</span></div>
      <div class="gate-step"><b>2.</b><span>Choose <b>Add to Home Screen</b>, then open 05CamLink from your home screen.</span></div>
      <div class="os-pill" style="margin-top:14px">Android</div>
      <div class="gate-step"><b>1.</b><span>Open the browser <b>menu</b> (⋮).</span></div>
      <div class="gate-step"><b>2.</b><span>Tap <b>Install app</b> / <b>Add to Home screen</b>.</span></div>
    </div>
    <button class="btn btn-primary btn-block" id="gateInstallBtn">Install app</button>
    <button class="btn btn-ghost btn-block" id="gateHelpBtn" style="margin-top:10px">Open install instructions</button>
  </div>
</div>

<!-- ============ ONBOARDING ============ -->
<div id="onboard" class="screen screen-scroll hidden">
  <div class="ob-progress" id="obProgress"></div>
  <div class="ob-body">

    <!-- 1 welcome -->
    <section class="ob-step active" data-step="0">
      <div style="margin:10px 0 30px"><div class="brandmark" id="obLogo">05</div></div>
      <div class="ob-eyebrow">Welcome</div>
      <h2 class="ob-title">Turn your phone into a live OBS camera</h2>
      <p class="ob-text">A wireless angle for your stream — with scenes, overlays and zero cables. Let's get you set up in under a minute.</p>
      <div class="ob-foot"><button class="btn btn-primary btn-block" data-next>Get started</button></div>
    </section>

    <!-- 2 how it works -->
    <section class="ob-step" data-step="1">
      <div class="ob-eyebrow">How it works</div>
      <h2 class="ob-title">Three moving parts</h2>
      <ul class="ob-list">
        <li><span class="ob-ico">📡</span><div><b>Your phone is the camera.</b> It captures video and renders your overlays in real time.</div></li>
        <li><span class="ob-ico">🖥️</span><div><b>OBS receives it over your LAN</b> as a Browser Source — both devices on the same Wi-Fi.</div></li>
        <li><span class="ob-ico">🎬</span><div><b>Scenes &amp; overlays</b> work like a mini OBS: switch instantly, drag, resize, layer.</div></li>
      </ul>
      <div class="ob-foot"><button class="btn btn-ghost" data-back>Back</button><button class="btn btn-primary" style="flex:1" data-next>Continue</button></div>
    </section>

    <!-- 3 permissions -->
    <section class="ob-step" data-step="2">
      <div class="ob-eyebrow">Permissions</div>
      <h2 class="ob-title">Enable your camera</h2>
      <p class="ob-text">05CamLink needs your camera to capture video. The microphone is optional — enable it if you want audio in the stream. Nothing is uploaded anywhere; the feed stays on your local network.</p>
      <div class="permission-state" id="permState"><span>📷</span><span>Camera not enabled yet</span></div>
      <div class="ob-foot"><button class="btn btn-ghost" data-back>Back</button><button class="btn btn-primary" style="flex:1" id="obEnableCam">Enable camera</button></div>
    </section>

    <!-- 4 install confirm -->
    <section class="ob-step" data-step="3">
      <div class="ob-eyebrow">Almost there</div>
      <h2 class="ob-title">Installed and ready</h2>
      <div class="permission-state ok"><span>✅</span><span>Running as an installed app</span></div>
      <div class="permission-state" id="camConfirm" style="margin-top:12px"><span>📷</span><span>Camera status</span></div>
      <p class="ob-text" style="margin-top:18px">You're good to go. One last step: pick your default capture settings.</p>
      <div class="ob-foot"><button class="btn btn-ghost" data-back>Back</button><button class="btn btn-primary" style="flex:1" data-next>Continue</button></div>
    </section>

    <!-- 5 quick setup -->
    <section class="ob-step" data-step="4">
      <div class="ob-eyebrow">Quick setup</div>
      <h2 class="ob-title">Default capture</h2>
      <div class="ob-field">
        <label>Camera</label>
        <div class="seg" id="obFacing"><button data-facing="environment" class="on">Back</button><button data-facing="user">Front</button></div>
      </div>
      <div class="ob-field">
        <label>Resolution</label>
        <div class="seg" id="obRes"><button data-res="480">480p</button><button data-res="720" class="on">720p</button><button data-res="1080">1080p</button></div>
      </div>
      <div class="ob-field">
        <div class="row" style="border:0;padding:6px 0"><span class="rk">Mirror preview</span><span class="rv"><div class="toggle" id="obMirror"></div></span></div>
      </div>
      <div class="ob-foot"><button class="btn btn-ghost" data-back>Back</button><button class="btn btn-primary" style="flex:1" id="obFinish">Finish setup</button></div>
    </section>

  </div>
</div>

<!-- ============ MAIN APP ============ -->
<div id="app" class="hidden">
  <div id="stageWrap">
    <video id="cam" autoplay playsinline muted></video>
    <div id="konva"></div>
    <div class="viewfinder">
      <div class="vf-corner vf-tl"></div><div class="vf-corner vf-tr"></div>
      <div class="vf-corner vf-bl"></div><div class="vf-corner vf-br"></div>
      <div class="vf-center"></div>
    </div>
  </div>

  <!-- top bar -->
  <div class="topbar">
    <div class="tb-brand" id="tbLogo">05</div>
    <button class="scene-switch glass" id="sceneSwitch">
      <div style="min-width:0">
        <div class="label">Scene</div>
        <div class="name" id="curSceneName">Scene 1</div>
      </div>
      <svg class="chev" viewBox="0 0 24 24" width="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div class="tb-spacer"></div>
    <div class="status-pill glass ready" id="statusPill"><span class="dot"></span><span id="statusText">Ready</span></div>
    <button class="icon-btn glass" id="openSettings" aria-label="Settings">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    </button>
  </div>

  <div class="rec-timer glass" id="recTimer"><span class="rd"></span><span class="mono" id="recClock">00:00</span></div>

  <!-- selection toolbar -->
  <div class="sel-tools glass" id="selTools">
    <button class="sel-btn" data-sel="front" aria-label="Bring to front"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="12" height="12" rx="2"/><path d="M5 15V5h10"/></svg></button>
    <button class="sel-btn" data-sel="back" aria-label="Send to back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="12" height="12" rx="2"/><path d="M19 9v10H9"/></svg></button>
    <button class="sel-btn" data-sel="lock" aria-label="Lock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></button>
    <button class="sel-btn" data-sel="edit" aria-label="Edit text"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
    <button class="sel-btn" data-sel="delete" aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
  </div>

  <!-- bottom action bar -->
  <div class="actionbar">
    <button class="act" id="addText"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V5h16v2M9 19h6M12 5v14"/></svg>Text</button>
    <button class="act" id="addImage"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>Image</button>
    <button class="act-go" id="goLive" aria-label="Go live"><span class="glyph"></span></button>
    <button class="act" id="addGif"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="3"/><text x="12" y="15" font-size="7" fill="currentColor" stroke="none" text-anchor="middle" font-weight="700">GIF</text></svg>GIF</button>
    <button class="act" id="addScene"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3M12 8v4M10 10h4"/></svg>Scene</button>
  </div>
</div>

<!-- ============ TEXT EDITOR ============ -->
<div class="text-edit glass" id="textEdit">
  <input class="field-input" id="teValue" placeholder="Type your text" />
  <div class="te-controls">
    <div class="seg" id="teSize"><button data-size="28">S</button><button data-size="46" class="on">M</button><button data-size="68">L</button><button data-size="96">XL</button></div>
    <div class="swatches" id="teColors"></div>
    <div class="toggle" id="teShadow" title="Shadow"></div>
  </div>
  <div style="display:flex;gap:8px"><button class="btn btn-ghost" id="teCancel" style="flex:1">Cancel</button><button class="btn btn-primary" id="teApply" style="flex:1">Apply</button></div>
</div>

<!-- ============ SHEETS ============ -->
<div class="sheet-scrim" id="scrim"></div>

<!-- scenes sheet -->
<div class="sheet" id="scenesSheet">
  <div class="sheet-grip"></div>
  <div class="sheet-head"><div class="sheet-title">Scenes</div><button class="sheet-close" data-close>✕</button></div>
  <div class="sheet-body">
    <div id="scenesList"></div>
    <button class="btn btn-primary btn-block" id="newSceneBtn" style="margin-top:10px">Add scene</button>
    <div class="section-label">Layers in this scene</div>
    <div id="layersList"></div>
  </div>
</div>

<!-- settings sheet -->
<div class="sheet" id="settingsSheet">
  <div class="sheet-grip"></div>
  <div class="sheet-head"><div class="sheet-title">Settings</div><button class="sheet-close" data-close>✕</button></div>
  <div class="sheet-body">
    <div class="section-label">Camera</div>
    <div class="row"><span class="rk">Resolution</span><span class="rv"><div class="seg" id="setRes"><button data-res="480">480p</button><button data-res="720">720p</button><button data-res="1080">1080p</button></div></span></div>
    <div class="row"><span class="rk">Facing</span><span class="rv"><div class="seg" id="setFacing"><button data-facing="environment">Back</button><button data-facing="user">Front</button></div></span></div>
    <div class="row"><span class="rk">Mirror preview</span><span class="rv"><div class="toggle" id="setMirror"></div></span></div>

    <div class="section-label">Stream &amp; OBS</div>
    <div class="row" style="flex-direction:column;align-items:stretch;gap:10px">
      <span class="rk">OBS Browser Source URL</span>
      <div class="url-copy"><input class="field-input" id="obsUrl" readonly /><button class="mini-btn" id="copyObs">Copy</button></div>
      <span class="rk" style="margin-top:6px">Session ID</span>
      <div class="url-copy"><input class="field-input" id="sessId" readonly /><button class="mini-btn" id="copySess">Copy</button></div>
    </div>
    <div class="row" style="flex-direction:column;align-items:stretch"><button class="btn btn-ghost btn-block" id="showQr">Show pairing QR code</button></div>
    <div class="qr-wrap hidden" id="qrWrap"><div class="qr-box" id="qrBox"></div><div class="ob-text" style="font-size:12.5px;text-align:center">Scan on the OBS computer to open the viewer.</div></div>

    <div class="section-label">Scenes data</div>
    <div class="row" style="gap:8px"><button class="btn btn-ghost" id="exportScenes" style="flex:1">Export JSON</button><button class="btn btn-ghost" id="importScenes" style="flex:1">Import JSON</button></div>
    <div class="row"><button class="btn btn-danger btn-block" id="resetScenes">Reset all scenes</button></div>

    <div class="section-label">Branding (logo URLs)</div>
    <div class="row" style="flex-direction:column;align-items:stretch;gap:8px">
      <input class="field-input" id="logoMain" placeholder="logoImageURL (top bar)" />
      <input class="field-input" id="logoSplash" placeholder="splashLogoImageURL" />
      <input class="field-input" id="logoOnboard" placeholder="onboardingLogoImageURL" />
      <button class="btn btn-ghost btn-block" id="saveLogos">Save logos</button>
    </div>

    <div class="section-label">App</div>
    <div class="row"><button class="btn btn-ghost btn-block" id="installHelp">Install instructions</button></div>
    <div class="row"><button class="btn btn-danger btn-block" id="clearData">Clear all local data</button></div>
    <div class="ob-text" style="font-size:12px;text-align:center;margin:14px 0 0;color:var(--txt-faint)">05CamLink · local-first · v1.0</div>
  </div>
</div>

<input type="file" id="filePick" accept="image/*" class="hidden" />
<input type="file" id="gifPick" accept="image/gif" class="hidden" />
<input type="file" id="jsonPick" accept="application/json,.json" class="hidden" />
<div class="toast" id="toast"></div>

<script src="lib/konva.min.js"></script>
<script src="lib/qrcode.min.js"></script>
<script src="lib/gifler.min.js"></script>
<script src="app.js"></script>
</body>
</html>

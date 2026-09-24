// @ts-nocheck
/*
 * Ranked Lobby splash — New York.
 *
 * Ported from the standalone WebGL prototype (ranked-lobby-splash-nyc), so
 * these modules are plain vanilla JavaScript and opt out of type checking.
 * One continuous shot: the island inked on a cyanotype sheet, the real city
 * rising from it, light trails running its streets, the name over the
 * Reservoir. Everything is created and torn down by mountSplash(); it
 * touches no app state.
 *
 * Data: NYC Open Data building footprints + OpenStreetMap (ODbL), baked
 * into two gzip binaries under /public/splash/nyc — the plan starts the
 * film, the city streams in behind the pen.
 */
import * as THREE from "three";
import { loadCity, City } from "./city";
import { Ink } from "./ink";
import { Pipeline } from "./post";
import { Plate } from "./plate";
import { Glyphs } from "./glyphs";
import { Traffic } from "./cars";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Anton&family=DM+Mono:ital,wght@0,300;0,400;1,400&display=swap";
const PLAN_URL = "/splash/nyc/plan.v9.bin";
const CITY_URL = "/splash/nyc/city.v9.bin";

const CSS = `#rl-nyc{ position:fixed; inset:0; z-index:200;
  --void:#02050b; --ink:#d9e8ff; --ink-dim:rgba(190,215,255,.5);
  background:var(--void); color:var(--ink); overflow:hidden;
  font-family:"DM Mono", ui-monospace, monospace; -webkit-font-smoothing:antialiased;
  transition:opacity .55s ease; will-change:opacity;
  /* never quite opaque, so the page underneath is painted during the film
     and the closing cross-fade does not stall on rasterising it */
  opacity:.999; }
#rl-nyc.gone{ opacity:0; pointer-events:none; }
#rl-nyc *{ box-sizing:border-box; }
#rl-nyc .stage{ position:absolute; inset:0; }
#rl-nyc .stage canvas{ display:block; width:100%; height:100%; }
/* the name is written by the pen: its outline traced stroke by stroke,
   then inked with light; two misregistered ghost prints settle behind it */
#rl-nyc .title{ position:absolute; left:0; right:0; bottom:15vh; display:flex; flex-direction:column;
  align-items:center; pointer-events:none; opacity:0; }
#rl-nyc .name{ position:relative; width:clamp(260px,44vw,760px); line-height:0; will-change:transform; }
#rl-nyc .name svg{ display:block; width:100%; height:auto; overflow:visible; }
#rl-nyc .glowsvg{ position:absolute; inset:0; filter:blur(9px); opacity:0; will-change:opacity; }
#rl-nyc .title text{ font-family:Anton, Impact, "Arial Narrow", sans-serif; font-size:128px; letter-spacing:7px; text-anchor:middle; }
#rl-nyc .trace{ fill:none; stroke:var(--ink); stroke-width:1.3; stroke-dasharray:560; stroke-dashoffset:560; }
#rl-nyc .solid{ fill:var(--ink); opacity:0; }
#rl-nyc .glowsvg text{ fill:#8fc0ff; }
#rl-nyc .ghost{ fill:none; stroke:var(--ink); stroke-width:1; opacity:0; }
#rl-nyc .g1{ transform:translate(-22px,-14px); }
#rl-nyc .g2{ transform:translate(26px,16px); }
#rl-nyc .title.draw .trace{ animation:rlnTrace 1.15s cubic-bezier(.6,0,.25,1) forwards; }
#rl-nyc .title.draw .solid{ animation:rlnInk .7s ease-out .95s forwards; }
#rl-nyc .title.draw .glowsvg{ animation:rlnGlow 1.4s ease-out .95s forwards; }
#rl-nyc .title.draw .g1{ animation:rlnGhost1 1.3s cubic-bezier(.2,.7,.2,1) .7s forwards; }
#rl-nyc .title.draw .g2{ animation:rlnGhost2 1.3s cubic-bezier(.2,.7,.2,1) .8s forwards; }
#rl-nyc .title.draw .tag{ animation:rlnTag 1.2s ease-out 1.45s forwards; }
@keyframes rlnTrace{ to{ stroke-dashoffset:0 } }
@keyframes rlnInk{ to{ opacity:1 } }
@keyframes rlnGlow{ 0%{ opacity:0 } 45%{ opacity:.95 } 100%{ opacity:.55 } }
@keyframes rlnGhost1{ to{ opacity:.32; transform:translate(-7px,-5px) } }
@keyframes rlnGhost2{ to{ opacity:.18; transform:translate(9px,6px) } }
@keyframes rlnTag{ from{ opacity:0 } to{ opacity:1 } }
/* warm-up at boot: every layer of the title painted once, invisibly */
#rl-nyc .title.warm{ opacity:.004 !important; }
#rl-nyc .title.warm .solid, #rl-nyc .title.warm .ghost, #rl-nyc .title.warm .tag{ opacity:1; animation:none; }
#rl-nyc .title.warm .glowsvg{ opacity:1; animation:none; }
#rl-nyc .title.warm .trace{ stroke-dashoffset:0; animation:none; }
#rl-nyc .tag{ margin-top:1.3em; font-size:clamp(10px,.95vw,13px); letter-spacing:.34em; text-transform:uppercase;
  color:var(--ink-dim); font-weight:300; opacity:0; will-change:opacity; }
#rl-nyc .skip{ position:absolute; top:18px; right:20px; background:none; border:0; color:var(--ink-dim);
  font:400 11px/1 "DM Mono", monospace; letter-spacing:.3em; text-transform:uppercase; cursor:pointer; padding:10px; }
#rl-nyc .skip:hover{ color:var(--ink); }
#rl-nyc .credit{ position:absolute; left:14px; bottom:10px; font-size:9px; letter-spacing:.08em; color:rgba(190,215,255,.28); }
@media (max-width:600px){ #rl-nyc .title{ bottom:19vh; } #rl-nyc .tag{ letter-spacing:.22em; } }`;

/**
 * Mounts the splash into `mount` and returns a teardown function.
 * `onDone` fires once the sequence has handed over, so the host can unmount.
 */
export function mountSplash(mount: HTMLElement, onDone: () => void) {
  // the grade was authored with three's default colour management (the plane
  // engine switches it off at import; only one splash runs per session)
  THREE.ColorManagement.enabled = true;

  if (!document.getElementById("rl-nyc-fonts")) {
    const link = document.createElement("link");
    link.id = "rl-nyc-fonts";
    link.rel = "stylesheet";
    link.href = FONTS;
    document.head.appendChild(link);
  }
  if (!document.getElementById("rl-nyc-style")) {
    const style = document.createElement("style");
    style.id = "rl-nyc-style";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const root = document.createElement("div");
  root.id = "rl-nyc";
  root.innerHTML = [
    '<div class="stage"></div>',
    '<div class="title">',
    '  <div class="name">',
    '    <svg class="glowsvg" viewBox="0 0 1000 150" aria-hidden="true"><text x="500" y="128">RANKED LOBBY</text></svg>',
    '    <svg viewBox="0 0 1000 150" role="img" aria-label="Ranked Lobby">',
    '      <text class="ghost g1" x="500" y="128">RANKED LOBBY</text>',
    '      <text class="ghost g2" x="500" y="128">RANKED LOBBY</text>',
    '      <text class="solid" x="500" y="128">RANKED LOBBY</text>',
    '      <text class="trace" x="500" y="128">RANKED LOBBY</text>',
    "    </svg>",
    "  </div>",
    '  <div class="tag">La maîtrise s’assemble, pièce par pièce.</div>',
    "</div>",
    '<button class="skip" type="button">Passer</button>',
    '<div class="credit">© OpenStreetMap contributors · NYC Open Data</div>'
  ].join("");
  mount.appendChild(root);

  const stage = root.querySelector(".stage");
  const titleEl = root.querySelector(".title");
  const skipEl = root.querySelector(".skip");

  // ---- lifecycle: whatever happens (skip, end of film, a failed download,
  // no WebGL 2) the host is told exactly once and the site takes over
  let disposed = false, doneCalled = false, running = true, raf = 0, probeRaf = 0, bootTimer = 0;
  let renderer, pipe, camera, scene;
  let city, ink, plate, glyphs, traffic;   // plate: the architect's sheet
  const ctrl = new AbortController();
  function handOver() {
    if (doneCalled) return;
    doneCalled = true;
    root.classList.add("gone");
    skipEl.style.display = "none";
    onDone();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    running = false;
    cancelAnimationFrame(raf); cancelAnimationFrame(probeRaf);
    clearTimeout(bootTimer);
    window.removeEventListener("resize", resize);
    ctrl.abort();
    try {
      const free = (o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      };
      if (scene) scene.traverse(free);
      if (ink) ink.scene.traverse(free);
      if (traffic) traffic.tex.dispose();
      if (pipe) pipe.dispose();
    } catch (e) { /* the context goes next anyway */ }
    if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    bootTimer = window.setTimeout(handOver, 0);
    return dispose;
  }

  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", alpha: false });
  } catch (e) {
    bootTimer = window.setTimeout(handOver, 0);
    return dispose;
  }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 1);
  stage.appendChild(renderer.domElement);
  pipe = new Pipeline(renderer);
  camera = new THREE.PerspectiveCamera(40, 1, 1, 150000);
  scene = new THREE.Scene();

  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (t) => { t = cl(t); return t * t * (3 - 2 * t); };
  const eInOut = (t) => { t = cl(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // -------------------------------------------------------------------------
  //  TIMELINE (seconds)
  const T = {
    inkStart: 0.6, penEnd: 7.6,       // the pen's run round the island
    plan: 9.0,                        // every stroke inked by now
    paperOut: 11.3,                   // the sheet gives way to the city
    riseStart: 11.5, riseEnd: 20.0,   // the one front of construction, Battery to Inwood
    flyStart: 11.6,                   // the camera leaves the sheet
  };
  let SHOTS = [], starts = [], SEQ = 0;
  const HOLD = 3.2, FLY = 10.5;
  const MAX_WAIT = 8;                 // longest the film holds on the plan for the city

  function geo(lat, lon) {
    const [lat0, lon0] = city.h.origin;
    const kx = Math.cos(lat0 * Math.PI / 180) * 111319.49;
    return { x: (lon - lon0) * kx, z: -(lat - lat0) * 111132.95 };
  }

  // The camera never follows the pen's own heading — the coastline zigzags at
  // every pier and a camera slaved to it shakes. It rides the island's axis,
  // anchored on the pen's position averaged over a short window.
  const _pa = {};
  function penAnchor(t, w) {
    let x = 0, z = 0; const n = 9;
    for (let i = 0; i < n; i++) { ink.penAt(Math.max(T.inkStart, t - w * i / (n - 1)), _pa); x += _pa.x; z += _pa.z; }
    return { x: x / n, z: z / n };
  }

  let planPose = null, mapPose = null, onePose = null, resetPose = () => {};
  function buildShots() {
    const bat = city.battery, ax = city.axis;                  // up-island unit vector (x,z)
    const side = { x: -ax.y, z: ax.x };                          // crosstown (points east-ish)
    const along = (k, s = 0, y = 0) => V(bat.x + ax.x * k + side.x * s, y, bat.y + ax.y * k + side.z * s);
    const E = side;
    // One shot, no cut: the whole film is a single camera move on an orbit
    // rig (a ground target, a heading, a pitch, a distance), every channel a
    // monotone cubic through timed keys —
    //   0–2.6 s   close on the point of ink as it leaves the Battery
    //   2.6–9.3   pulling back and up as the island draws itself
    //   9.3–10.6  straight down on the finished plate
    //   10.6–11.6 a push-in onto the island
    //   11.6–22.1 down off the sheet as the city rises, round by the Hudson,
    //             onto the final frame over the Reservoir; then the hold
    SHOTS = [
      { id: "one", dur: T.flyStart + FLY + 4.4, cut: false, tau: 0.3,
        cam(t) { return onePose(t); } },
    ];
    starts = []; SEQ = 0;
    for (const s of SHOTS) { starts.push(SEQ); SEQ += s.dur; }
    // the plate: straight down on the whole architect's sheet, north up
    planPose = () => {
      const S = plate.S, fov = 26, tv = Math.tan(fov * Math.PI / 360);
      const c = V((S.x0 + S.x1) / 2, 0, (S.z0 + S.z1) / 2);
      const h = 1.07 * Math.max((S.z1 - S.z0) / 2 / tv, (S.x1 - S.x0) / 2 / (tv * camera.aspect));
      return { pos: V(c.x, h, c.z + 0.01), tgt: c, fov, up: V(0, 0, -1) };
    };
    const kf = (x, z) => ({ k: (x - bat.x) * ax.x + (z - bat.y) * ax.y, s: (x - bat.x) * side.x + (z - bat.y) * side.z });
    const ft = kf(FINAL.tgt.x, FINAL.tgt.z), fp = kf(FINAL.pos.x, FINAL.pos.z);
    const fD = FINAL.pos.distanceTo(FINAL.tgt), fPitch = Math.asin((FINAL.pos.y - FINAL.tgt.y) / fD) * 180 / Math.PI;
    let fYaw = Math.atan2(fp.s - ft.s, fp.k - ft.k) * 180 / Math.PI; while (fYaw < 250) fYaw += 360;
    let chans = null;
    resetPose = () => { chans = null; };
    onePose = (t) => {
      if (!chans) {
        const pl = planPose(), mp = mapPose(), fovK = Math.max(1, Math.min(1.7, 1.25 / camera.aspect));
        const plT = kf(pl.tgt.x, pl.tgt.z), mpT = kf(mp.tgt.x, mp.tgt.z);
        const pa = (tt) => { const q = penAnchor(tt, 0.6); return kf(q.x + ax.x * 60 + E.x * 30, q.z + ax.y * 60 + E.z * 30); };
        const p0 = pa(T.inkStart), p1 = pa(2.6), p2 = pa(4.4), p3 = pa(5.8);
        const f0 = T.flyStart;
        // the keyed target rides just behind the pen, where the streets are
        // flooding in, and drifts onto the island's axis as the view widens
        const K = [0, 2.6, 4.4, 5.8, 7.6, 9.3, 10.6, f0, f0 + 0.3 * FLY, f0 + 0.62 * FLY, f0 + FLY];
        chans = {
          yaw: mono(K, [128, 134, 150, 166, 160, 151, 151, 151, 205, 262, fYaw]),
          pitch: mono(K, [15, 21, 29, 40, 62, 89.9, 89.9, 89.9, 32, 21, fPitch]),
          lD: mono(K, [330, 560, 1400, 4300, 17000, pl.pos.y, pl.pos.y * 0.94, mp.pos.y, 5400, 3700, fD].map(Math.log)),
          tk: mono(K, [p0.k, p1.k, p2.k - 250, p3.k - 2200, 9200, plT.k, plT.k, mpT.k, 5000, 7700, ft.k]),
          ts: mono(K, [p0.s, p1.s, p2.s * 0.7, 200, 200, plT.s, plT.s, mpT.s, 0, -300, ft.s]),
          fov: mono(K, [38, 38, 38, 37, 31, 26, 26, 26, 36, 38 * Math.min(fovK, 1.2), FINAL.fov * fovK]),
        };
      }
      const yaw = chans.yaw(t) * Math.PI / 180, pitchD = chans.pitch(t), pitch = pitchD * Math.PI / 180;
      let Dd = Math.exp(chans.lD(t));
      Dd *= 1 - 0.035 * sstep((t - T.flyStart - FLY) / 4.4);        // a slow push-in through the hold
      // early on the camera is tied to the point of ink itself; the keyed
      // target takes over as it pulls back
      let tgt = along(chans.tk(t), chans.ts(t), 0);
      const wp = sstep((t - 3.2) / 3.0);
      if (wp < 1) {
        const q = penAnchor(t, 0.6);
        const pt = V(q.x + ax.x * 60 + E.x * 30, 0, q.z + ax.y * 60 + E.z * 30);
        tgt = pt.lerp(tgt, wp);
      }
      const dx = ax.x * Math.cos(yaw) + side.x * Math.sin(yaw), dz = ax.y * Math.cos(yaw) + side.z * Math.sin(yaw);
      const hd = Dd * Math.cos(pitch);
      const pos = V(tgt.x + dx * hd, Dd * Math.sin(pitch), tgt.z + dz * hd);
      const w = sstep((pitchD - 60) / 28);
      const up = V(-dx * w, 1 - w, -dz * w).normalize();
      return { pos, tgt, fov: chans.fov(t), up };
    };
    // straight down on lower and midtown Manhattan, north up, framed inside
    // the drawn data so no edge of the map is ever in view
    mapPose = () => {
      const fov = 26, tv = Math.tan(fov * Math.PI / 360);
      const c = along(4200, 200);
      const h = Math.max(3600 / (tv * camera.aspect), 4200 / tv);
      return { pos: V(c.x, h, c.z + 0.01), tgt: c, fov, up: V(0, 0, -1) };
    };
  }
  // monotone cubic interpolation (Fritsch–Carlson), flat at both ends
  function mono(xs, ys) {
    const n = xs.length, d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : 3 * (xs[i + 1] - xs[i - 1]) / ((2 * xs[i + 1] - xs[i] - xs[i - 1]) / d[i - 1] + (xs[i + 1] + xs[i] - 2 * xs[i - 1]) / d[i]);
    return (x) => {
      if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0; while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }

  // the end frame, matched to the reference photograph (helicopter over the
  // Upper West Side, north of the Reservoir, looking down the park at
  // Midtown): ESB, One WTC, the Great Lawn and The Lake all land where they
  // sit in the reference frame
  const FINAL = { pos: V(760, 540, -3420), tgt: V(399, 0, -1741), fov: 38 };
  // when the build front reaches a given up-island key
  function frontTime(kk) { let lo = T.riseStart, hi = T.riseEnd; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (frontKey(m) < kk) lo = m; else hi = m; } return hi; }
  function frontKey(t) {
    const k = cl((t - T.riseStart) / (T.riseEnd - T.riseStart));
    return lerp(-900, 23500, eInOut(k) * 0.5 + k * 0.5);
  }

  // -------------------------------------------------------------------------
  //  RIG — the shot proposes a camera; the rig eases into it
  const rig = { pos: V(0, 0, 0), tgt: V(0, 0, 0), up: V(0, 1, 0), fov: 40, roll: 0, ready: false, focus: 0 };
  function approach(c, t, tau, dt) { return c + (t - c) * (1 - Math.exp(-dt / Math.max(1e-4, tau))); }
  function applyCam(p, dt, tau) {
    const up = p.up || V(0, 1, 0);
    if (!rig.ready) { rig.pos.copy(p.pos); rig.tgt.copy(p.tgt); rig.up.copy(up); rig.fov = p.fov; rig.roll = p.roll || 0; rig.ready = true; }
    const f = 1 - Math.exp(-dt / Math.max(1e-4, tau));
    rig.pos.lerp(p.pos, f); rig.tgt.lerp(p.tgt, f); rig.up.lerp(up, f).normalize();
    rig.fov = approach(rig.fov, p.fov, tau, dt); rig.roll = approach(rig.roll, p.roll || 0, tau, dt);
    camera.position.copy(rig.pos); camera.up.copy(rig.up); camera.lookAt(rig.tgt);
    if (rig.roll) camera.rotateZ(rig.roll);
    camera.fov = rig.fov;
    const d = rig.pos.distanceTo(rig.tgt);
    camera.near = cl(Math.min(d * 0.02, rig.pos.y * 0.25), 0.5, 60);
    camera.far = 160000;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    return d;
  }

  // -------------------------------------------------------------------------
  //  FRAME
  let VW = 1, VH = 1, DPR = 1, dprCap = 1.75;
  function resize() {
    if (disposed) return;
    VW = Math.max(1, stage.clientWidth); VH = Math.max(1, stage.clientHeight);
    DPR = Math.min(window.devicePixelRatio || 1, dprCap);
    renderer.setPixelRatio(DPR); renderer.setSize(VW, VH, false);
    camera.aspect = VW / VH;
    const w = Math.floor(VW * DPR), h = Math.floor(VH * DPR);
    pipe.setSize(w, h, DPR);
    if (ink) { ink.uniforms.uRes.value.set(w, h); ink.uniforms.uDpr.value = DPR; }
    if (city) city.shared.uDpr.value = DPR;
  }
  window.addEventListener("resize", resize);

  let prev0 = 0, start = 0, prev = 0, lastShot = -1, entering = -1, held = 0;
  function shotAt(x) { for (let i = SHOTS.length - 1; i >= 0; i--) if (x >= starts[i]) return i; return 0; }

  function frame(now) {
    step(now);
    if (running) raf = requestAnimationFrame(frame);
  }
  function step(now, noRender) {
    const dt = Math.min(0.1, Math.max(0.001, (now - prev) / 1000)); prev = now;
    if (stage.clientWidth !== VW || stage.clientHeight !== VH) resize();
    checkLayout();
    // the city streams in behind the pen; if the network is slow the film
    // holds on the finished plan rather than raising an empty island — and
    // past MAX_WAIT it hands over instead of keeping the site waiting
    city.pump(city.ready ? 0 : (prev0 - start) / 1000 > T.riseStart - 0.35 ? 30 : 7);
    if (!city.ready && (now - start) / 1000 > T.riseStart - 0.3) {
      start += dt * 1000; held += dt;
      if (held > MAX_WAIT) enter();
    }
    prev0 = now;
    const t = (now - start) / 1000, x = Math.min(t, SEQ);
    const si = shotAt(x), s = SHOTS[si], k = cl((x - starts[si]) / s.dur);
    if (si !== lastShot) { lastShot = si; if (s.cut) rig.ready = false; titleEl.style.opacity = 0; }

    // ---- the world's clock
    const cu = pipe.comp.uniforms, iu = ink.uniforms, sh = city.shared;
    iu.uTime.value = x;
    sh.uTime.value = x;
    const paper = 1 - sstep((x - T.paperOut) / 1.4);
    cu.uPaper.value = paper;
    iu.uInkCol.value.setRGB(0.74, 0.87, 1.0);
    if (glyphs) glyphs.fade.value = paper;
    if (plate) cu.uSheet.value.set(plate.S.x0, plate.S.z0, plate.S.x1, plate.S.z1);
    sh.uWater.value = 1 - paper;
    iu.uGhost.value = 0.3 * sstep(x / 0.8) * (1 - sstep((x - T.plan + 0.3) / 0.8));
    cu.uGrid.value = lerp(0.35, 1, paper);
    cu.uMatEdges.value = sstep((x - T.paperOut + 0.2) / 1.2);
    sh.uFront.value = x < T.riseStart ? -1e9 : frontKey(x);
    if (city.bldMeshes) for (const m of city.bldMeshes) m.visible = m.userData.kmin < sh.uFront.value;
    if (city.trees) city.trees.visible = city.trees.userData.kmin < sh.uFront.value;
    cu.uFront.value = x < T.riseStart || x > T.riseEnd + 0.4 ? -1e9 : frontKey(x);
    cu.uSweep.value = -1e9;
    if (traffic) traffic.update(x, sstep((x - 9.8) / 1.6), camera);
    // plan ink recedes into street drawing once the city stands
    const built = sstep((x - T.riseStart) / 5.0);
    ink.setLabelFade(1 - sstep((x - T.paperOut) / 1.2));
    iu.uClassA.value = [lerp(1, 0.55, built), lerp(1, 0.5, built), lerp(1, 0.34, built), lerp(1, 0.5, built),
                        lerp(1, 0.6, built), lerp(1, 0.5, built), lerp(1, 0.6, built), lerp(1, 0.7, built), paper, lerp(1, 0.3, built), lerp(1, 0.15, built)];
    // lamp: a pool of light that follows the pen across the sheet, widening
    // as the camera pulls back and drifting from the nib to the view's centre
    const pen = ink.penAt(Math.max(x, T.inkStart), {});
    const lampR = cl(rig.pos.distanceTo(rig.tgt) * 1.4, 480, 14000), lw = sstep((x - 3.5) / 4.5);
    cu.uLamp.value.set(lerp(pen.x, rig.tgt.x, lw), lampR, lerp(pen.z, rig.tgt.z, lw));
    const close = 1 - sstep((x - 2.0) / 2.5);                     // how close we still are to the nib

    const inking = x > T.inkStart && x < T.penEnd;
    ink.setGlow(pen.x, 1.2, pen.z, lerp(26, 44, close) * DPR, inking ? lerp(0.8, 1.0, close) * sstep((x - T.inkStart) / 0.25) : 0);
    cu.uDim.value = 1;
    const flyU = cl((x - T.flyStart) / FLY), late = sstep((flyU - 0.55) / 0.45);
    cu.uHaze.value = lerp(1, 1.2, late);
    cu.uLift.value = x < T.flyStart ? 0.5 : lerp(lerp(0.5, 1, sstep((x - T.flyStart) / 0.8)), 0.12, late);
    sh.uScanK.value = 0; sh.uScanY.value = -1e9;

    // ---- camera
    const p = s.cam(x, k);
    const d = applyCam(p, dt, s.tau);
    cu.uFogNear.value = lerp(d * 0.9, 1800, late);
    cu.uFogFar.value = lerp(d * 5, 16000, late);
    ink.uniforms.uNear.value = camera.near;
    ink.uniforms.uFogNear.value = cu.uFogNear.value; ink.uniforms.uFogFar.value = cu.uFogFar.value;
    // the lens: shallow focus on the nib, deep focus from the pull-back on
    const du = pipe.dof.uniforms;
    if (close > 0.001) {
      const fd = camera.position.distanceTo(V(pen.x, 10, pen.z));
      du.uFocus.value = rig.focus ? approach(rig.focus, fd, 0.4, dt) : fd; rig.focus = du.uFocus.value;
      du.uAperture.value = 11 * DPR * close;
    } else { du.uAperture.value = 0; rig.focus = 0; }

    // ---- title
    if (x > T.flyStart + FLY - 0.5) {
      const tk = x - (T.flyStart + FLY - 0.5);
      titleEl.style.opacity = cl((tk - 0.35) / 0.25).toFixed(3);
      if (tk > 0.35) titleEl.classList.add("draw");
    } else titleEl.classList.remove("draw");
    pipe.final.uniforms.uFlash.value = enterFlash(now);
    pipe.final.uniforms.uBlack.value = 1 - sstep(t / 0.5);

    if (t > SEQ + HOLD) enter();
    if (!noRender) {
      ink.uniforms.tData.value = pipe.g.textures[1];
      pipe.render(scene, camera, ink.scene, x);
    }
  }

  // ---- hand-over: a flash of light, the sheet fades, the lobby takes over
  function enterFlash(now) {
    if (entering < 0) return 0;
    const et = (now - entering) / 1000;
    if (et > 0.45) handOver();
    if (et > 1.3) running = false;              // gone: stop driving the GPU
    return et < 0.4 ? Math.pow(et / 0.4, 1.6) * 0.9 : Math.max(0, 0.9 - (et - 0.4) * 1.8);
  }
  let started = false;
  function enter() { if (entering < 0) entering = performance.now(); }
  // before the film has started there is nothing to fade through
  skipEl.addEventListener("click", () => { if (started) enter(); else handOver(); });

  // -------------------------------------------------------------------------
  // the architect's sheet is laid out for the screen's shape: built at boot,
  // rebuilt if the viewport's proportions change a lot (a window resized or
  // a phone turned), with the camera path recomputed to match
  let plateData = null, plateObjs = [];
  function makePlate() {
    const before = new Set(ink.scene.children);
    const aspect = Math.max(1, stage.clientWidth) / Math.max(1, stage.clientHeight);
    plate = new Plate(ink, glyphs, geo, city.h.bbox, aspect, 8.0);
    plate.aspect = aspect;
    plate.soundings(plateData.a.snd);
    glyphs.build(ink.scene);
    plateObjs = ink.scene.children.filter((o) => !before.has(o));
    if (city.ready) addElevation(true);
  }
  function addElevation(now) {
    if (!city.profile) return;
    const before = new Set(ink.scene.children);
    const nowT = start ? (performance.now() - start) / 1000 : 0;
    plate.elevation(city.profile, city.profileBin, (x, z) => city.key(x, z), now ? 8.35 : Math.max(8.35, nowT + 0.1));
    glyphs.build(ink.scene);
    for (const o of ink.scene.children) if (!before.has(o)) plateObjs.push(o);
  }
  function checkLayout() {
    if (!plate) return;
    const aspect = Math.max(1, stage.clientWidth) / Math.max(1, stage.clientHeight);
    if (Math.abs(aspect / plate.aspect - 1) < 0.12 && (aspect >= 1) === (plate.aspect >= 1)) return;
    for (const o of plateObjs) { ink.scene.remove(o); o.geometry && o.geometry.dispose(); }
    if (ink.labels) ink.labels = ink.labels.filter((m) => ink.scene.children.some((o) => o.material === m));
    makePlate(); resetPose(); rig.ready = false;
  }

  const nextFrame = () => new Promise((r) => { raf = requestAnimationFrame(r); });

  async function boot() {
    const cityP = loadCity(CITY_URL, ctrl.signal);
    cityP.catch(() => {});                       // handled where it is awaited
    const data = await loadCity(PLAN_URL, ctrl.signal);
    if (disposed) return;
    try { await Promise.race([Promise.all([document.fonts.load('300 96px "DM Mono"'), document.fonts.load('400 64px "DM Mono"'), document.fonts.load('italic 400 64px "DM Mono"'), document.fonts.load("400 96px Anton")]), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* lettering falls back */ }
    if (disposed) return;
    city = new City(data);
    scene.add(city.group);
    ink = new Ink(data, city, { T0: T.inkStart, T1: T.penEnd, v0: 90, wave: 6500, latest: T.plan });
    // the architect's sheet around the plan (layout follows the screen's shape)
    glyphs = new Glyphs(ink.uniforms);
    plateData = data;
    makePlate();
    // a stand-in so the traffic shader is compiled with everything else
    new Traffic(new Int16Array([0, 0, 10, 0]), new Float32Array([0, 2, 1, 0]), 1, ink);
    // the plate's annotations, drawn at the Battery as the pen sets off:
    // the tip's coordinates, a north arrow, a graphic scale
    {
      const p0 = { x: ink.penX[0], z: ink.penZ[0] };
      const dx = city.axis.x, dz = city.axis.y, ex = -dz, ez = dx;   // up-island, east
      const lx = -ex, lz = -ez;                                      // west: over the water
      const at = (a, b) => ({ x: p0.x + dx * a + lx * b, z: p0.z + dz * a + lz * b });
      const c = at(-40, 300);
      ink.addLabel("40°42′12″N   74°01′01″W", c.x, c.z, ex, ez, 9, T.inkStart + 0.2, 0.9, 0.85);
      const c2 = at(-58, 300);
      ink.addLabel("MANHATTAN · PLAN D’ENSEMBLE · 1:10 000", c2.x, c2.z, ex, ez, 5, T.inkStart + 0.55, 0.8, 0.55);
      // north arrow (true north is -z) and a 0–200–400 m scale bar
      const na = at(40, 420), marks = [], Y = 0.7;
      const seg = (ax, az, bx, bz) => marks.push(new Float32Array([ax, Y, az, bx, Y, bz]));
      seg(na.x, na.z + 34, na.x, na.z - 34); seg(na.x, na.z - 34, na.x - 9, na.z - 16); seg(na.x, na.z - 34, na.x + 9, na.z - 16);
      seg(na.x - 6, na.z - 44, na.x - 6, na.z - 58); seg(na.x - 6, na.z - 58, na.x + 6, na.z - 44); seg(na.x + 6, na.z - 44, na.x + 6, na.z - 58);
      const ring = []; for (let i = 0; i <= 32; i++) { const a = i / 32 * Math.PI * 2; ring.push(na.x + Math.cos(a) * 20, Y, na.z + Math.sin(a) * 20); }
      marks.push(new Float32Array(ring));
      const sb = at(-110, 290);
      for (let i = 0; i <= 4; i++) { const u = i * 50, tk = i % 2 ? 5 : 9; const a = { x: sb.x + ex * u, z: sb.z + ez * u };
        seg(a.x - dx * tk, a.z - dz * tk, a.x + dx * tk, a.z + dz * tk); }
      seg(sb.x, sb.z, sb.x + ex * 200, sb.z + ez * 200);
      ink.addStrokes3D(marks, 1, 1.0, 0.75, T.inkStart + 0.3);
    }
    cityP.then((d) => {
      if (disposed) return;
      city.attach(d);
      city.onReady = () => {
        if (disposed) return;
        // bridge cables: inked the moment the build front reaches them
        if (city.cables) ink.addStrokes3D(city.cables, 7, 1.0, 0.8, (x, z) => frontTime(city.key(x, z) + 500));
        // the elevation panel: the skyline seen from the Hudson, from the real heights
        addElevation();
        if (city.a.car_meta && city.a.car_meta.length) traffic = new Traffic(city.a.car_xz, city.a.car_meta, 15000, ink);
        // the landmarks' own drawn lines: facet edges, crown arches, piers, rings
        if (city.heroes) ink.addStrokes3D(city.heroes.ink, 7, 1.0, 0.9, (x, z) => frontTime(city.key(x, z) + 450));
      };
    }).catch(() => { held = MAX_WAIT; });       // no city: end on the plan

    buildShots();
    resize();
    // compile every shader and render one (black) frame before the clock
    // starts, so the film never opens on a stall that eats its first second
    start = prev = performance.now();
    step(performance.now(), true);
    try { await Promise.all([renderer.compileAsync(scene, camera), renderer.compileAsync(ink.scene, camera)]); } catch (e) { /* compiled on first use */ }
    if (disposed) return;
    ink.uniforms.tData.value = pipe.g.textures[1];
    pipe.render(scene, camera, ink.scene, 0);
    titleEl.classList.add("warm");
    await nextFrame(); await nextFrame();
    titleEl.classList.remove("warm");
    await nextFrame();
    if (disposed) return;
    start = prev = performance.now(); rig.ready = false; started = true;
    root.dataset.start = String(Math.round(start));   // the film's clock origin, for diagnostics
    raf = requestAnimationFrame(frame);
    // adaptive resolution: if the first half-second runs slow, drop the pixel ratio
    let n = 0, acc = 0, last = performance.now();
    const probe = (now) => {
      acc += now - last; last = now; n++;
      if (n === 30) { const ms = acc / n; if (ms > 24 && dprCap > 1) { dprCap = ms > 40 ? 1 : 1.25; resize(); } return; }
      probeRaf = requestAnimationFrame(probe);
    };
    probeRaf = requestAnimationFrame(probe);
  }
  // a plan that never arrives must not keep the site behind a black screen
  bootTimer = window.setTimeout(() => { if (!started) handOver(); }, 10000);
  boot().catch((e) => {
    if (disposed || (e && e.name === "AbortError")) return;
    console.error("[splash/nyc]", e);
    handOver();
  });

  return dispose;
}

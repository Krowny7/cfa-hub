// @ts-nocheck
// Decoding the baked city and building its G-buffer geometry: every
// building of the real Manhattan (and the shores around it) as extruded
// footprints, the land / water / park surfaces, the trees of Central Park.
import * as THREE from 'three';
import { buildHeroes, inHeroLot } from './heroes';

const DT = { float32: Float32Array, uint16: Uint16Array, int16: Int16Array, int32: Int32Array, uint32: Uint32Array, uint8: Uint8Array };

export async function loadCity(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  let buf = await res.arrayBuffer();
  const head = new Uint8Array(buf, 0, 2);
  if (head[0] === 0x1f && head[1] === 0x8b) {       // still gzipped (no Content-Encoding from the host)
    const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    buf = await new Response(ds).arrayBuffer();
  }
  const hl = new DataView(buf).getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)));
  const base = 4 + hl, a = {};
  for (const [k, s] of Object.entries(header.sections)) {
    const T = DT[s.dtype]; const n = s.bytes / T.BYTES_PER_ELEMENT;
    a[k] = new T(buf, base + s.offset, n);
    a[k].shape = s.shape;
  }
  return { header, a };
}

// ---------------------------------------------------------------------------
// G-buffer materials. Every surface writes: view normal + material id,
// linear depth + id hash + engraving ink. Normals come from screen-space
// derivatives (exactly flat per face), so building vertices can be shared
// between walls and roof — half the vertex count of a flat-shaded mesh.

const GB_OUT = `layout(location=0) out vec4 gNorm; layout(location=1) out vec4 gData;`;

const BLD_VERT = `
precision highp float;
uniform mat4 modelMatrix, viewMatrix, projectionMatrix;
uniform float uFront, uRiseLen;
in vec3 position; in vec2 aBld;
out vec3 vView, vWorld; out float vId, vRise;
void main(){
  float r = clamp((uFront - aBld.y) / uRiseLen, 0.0, 1.0);
  // ease-out-back: each building overshoots a touch and settles, a spring
  // in the pop-up rather than a lift
  float u = r - 1.0, e = r <= 0.0 ? 0.0 : 1.0 + 1.7 * u * u * u + 0.7 * u * u;
  vec3 p = position; p.y *= e;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vec4 v = viewMatrix * w;
  vView = v.xyz; vWorld = w.xyz; vId = aBld.x; vRise = r;
  gl_Position = projectionMatrix * v;
}`;
const BLD_FRAG = `
precision highp float;
uniform float uMat, uInk;
in vec3 vView, vWorld; in float vId, vRise;
${GB_OUT}
float lines(float v, float w){ float fw = max(fwidth(v), 1e-6); float d = abs(fract(v + 0.5) - 0.5);
  return (1.0 - smoothstep(w*fw, (w + 1.0)*fw, d)) * (1.0 - smoothstep(0.18, 0.5, fw)); }
void main(){
  if(vRise <= 0.0) discard;
  vec3 cn = cross(dFdx(vView), dFdy(vView)); vec3 n = dot(cn, cn) > 1e-24 ? normalize(cn) : vec3(0.0, 0.0, 1.0);
  vec3 cw = cross(dFdx(vWorld), dFdy(vWorld)); vec3 nw = dot(cw, cw) > 1e-24 ? normalize(cw) : vec3(0.0, 1.0, 0.0);
  float wall = 1.0 - smoothstep(0.3, 0.6, abs(nw.y));
  // engraving: a floor line every storey, window mullions along the face
  float fl = lines(vWorld.y / 3.9, 0.55);
  vec2 tg = normalize(vec2(-nw.z, nw.x) + 1e-5);
  float mu = lines(dot(vWorld.xz, tg) / 2.6, 0.4);
  float ink = wall * (fl*0.55 + mu*0.22) * uInk * smoothstep(3.0, 6.0, vWorld.y);
  gNorm = vec4(n, uMat);
  gData = vec4(-vView.z * 0.001, vId, ink, 0.0);
}`;

// the heroes' facades: the Art Deco vertical — close piers running up the
// shaft, fainter floor lines — plus the light scan that climbs a landmark
// while the camera is on it (written to the G-buffer's glow channel)
const HERO_FRAG = `
precision highp float;
uniform float uMat, uScanY, uScanK;
in vec3 vView, vWorld; in float vId, vRise;
${GB_OUT}
float lines(float v, float w){ float fw = max(fwidth(v), 1e-6); float d = abs(fract(v + 0.5) - 0.5);
  return (1.0 - smoothstep(w*fw, (w + 1.0)*fw, d)) * (1.0 - smoothstep(0.18, 0.5, fw)); }
void main(){
  if(vRise <= 0.0) discard;
  vec3 cn = cross(dFdx(vView), dFdy(vView)); vec3 n = dot(cn, cn) > 1e-24 ? normalize(cn) : vec3(0.0, 0.0, 1.0);
  vec3 cw = cross(dFdx(vWorld), dFdy(vWorld)); vec3 nw = dot(cw, cw) > 1e-24 ? normalize(cw) : vec3(0.0, 1.0, 0.0);
  float wall = 1.0 - smoothstep(0.3, 0.6, abs(nw.y));
  vec2 tg = normalize(vec2(-nw.z, nw.x) + 1e-5);
  float piers = lines(dot(vWorld.xz, tg) / 1.55, 0.7);
  float floors = lines(vWorld.y / 3.7, 0.5);
  float ink = wall * (piers * 0.42 + floors * 0.24) * smoothstep(2.0, 8.0, vWorld.y);
  float d = (vWorld.y - uScanY) / 7.0;
  float glow = uScanK * (exp(-d * d) + 0.10 * step(vWorld.y, uScanY));
  gNorm = vec4(n, uMat);
  gData = vec4(-vView.z * 0.001, vId, ink, glow);
}`;

const FLAT_VERT = `
precision highp float;
uniform mat4 modelMatrix, viewMatrix, projectionMatrix;
in vec3 position;
out vec3 vView, vWorld;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vec4 v = viewMatrix * w;
  vView = v.xyz; vWorld = w.xyz; gl_Position = projectionMatrix * v; }`;
const FLAT_FRAG = `
precision highp float;
uniform float uMat, uInk, uDpr, uTime, uWater;
in vec3 vView, vWorld;
${GB_OUT}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
void main(){
  vec3 cn = cross(dFdx(vView), dFdy(vView)); vec3 n = dot(cn, cn) > 1e-24 ? normalize(cn) : vec3(0.0, 0.0, 1.0);
  float ink = 0.0;
  if(uMat > 2.5 && uMat < 3.5){
    // the sea as an etching: continuous horizontal burin lines, bent by the
    // swell, their weight swelling and thinning like a copper-plate cut
    float sw = noise(vWorld.xz / vec2(140.0, 60.0) + vec2(uTime*0.02, 0.0));
    float sw2 = noise(vWorld.xz / vec2(38.0, 16.0) - vec2(uTime*0.05, 0.0));
    float ly = gl_FragCoord.y / (3.4 * uDpr) + (sw - 0.5) * 0.9;
    float wgt = 0.10 + 0.22 * smoothstep(0.25, 0.85, sw*0.7 + sw2*0.3);
    float l = 1.0 - smoothstep(wgt, wgt + 0.16, abs(fract(ly) - 0.5));
    ink = l * (0.18 + 0.30 * sw2) * uWater;
  } else if(uMat > 3.5 && uMat < 4.5){
    // lawns: a light stipple
    vec2 c = floor(vWorld.xz / 3.0);
    float h = hash(c); vec2 o = fract(vWorld.xz / 3.0) - 0.5 - (vec2(hash(c+7.1), hash(c+3.3)) - 0.5)*0.6;
    float fw = max(fwidth(vWorld.x / 3.0), 1e-6);
    ink = step(0.55, h) * (1.0 - smoothstep(0.06, 0.06 + fw*1.5, length(o))) * (1.0 - smoothstep(0.1, 0.35, fw)) * 0.6;
  }
  gNorm = vec4(n, uMat);
  gData = vec4(-vView.z * 0.001, 0.0, ink * uInk, 0.0);
}`;

const TREE_VERT = `
precision highp float;
uniform mat4 modelMatrix, viewMatrix, projectionMatrix;
uniform float uFront, uRiseLen;
in vec3 position; in vec3 normal; in mat4 instanceMatrix; in float aKey;
out vec3 vN; out float vDepth, vRise; out vec3 vWorld;
void main(){
  float r = clamp((uFront - aKey) / uRiseLen, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - r, 3.0);
  mat4 m = modelMatrix * instanceMatrix;
  vec4 w = m * vec4(position * e, 1.0);
  vec4 v = viewMatrix * w;
  vN = normalize(mat3(viewMatrix) * mat3(m) * normal);
  vDepth = -v.z; vRise = r; vWorld = w.xyz;
  gl_Position = projectionMatrix * v;
}`;
const TREE_FRAG = `
precision highp float;
uniform float uInk;
in vec3 vN; in float vDepth, vRise; in vec3 vWorld;
${GB_OUT}
void main(){
  if(vRise <= 0.0) discard;
  gNorm = vec4(normalize(vN), 6.0);
  gData = vec4(vDepth * 0.001, fract(vWorld.x*0.013 + vWorld.z*0.007), 0.0, 0.0);
}`;

function gbMat(vert, frag, uniforms, extra = {}) {
  return new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: vert, fragmentShader: frag,
    uniforms, side: THREE.FrontSide, ...extra });
}

export class City {
  constructor(data) {
    this.data = data; this.h = data.header; this.a = data.a;
    this.group = new THREE.Group();
    this.shared = { uFront: { value: -1e9 }, uRiseLen: { value: 1600 }, uInk: { value: 1 }, uDpr: { value: 1 }, uTime: { value: 0 }, uWater: { value: 0 },
      uScanY: { value: -1e9 }, uScanK: { value: 0 } };
    this.battery = new THREE.Vector2(...this.h.battery);
    this.axis = new THREE.Vector2(...this.h.axis);
    // the plan is enough to start: ground and pen now, the city streams in
    this.ready = false;
    this.buildGround();
    this.buildPen();
    this.makeMaterials();
  }
  makeMaterials() {
    const s = this.shared;
    this.bldMat = gbMat(BLD_VERT, BLD_FRAG, { uFront: s.uFront, uRiseLen: s.uRiseLen, uInk: s.uInk, uMat: { value: 1 } });
    this.bridgeMat = gbMat(BLD_VERT, BLD_FRAG, { uFront: s.uFront, uRiseLen: s.uRiseLen, uInk: { value: 0 }, uMat: { value: 7 } });
    this.heroMat = gbMat(BLD_VERT, HERO_FRAG, { uFront: s.uFront, uRiseLen: s.uRiseLen, uMat: { value: 1 }, uScanY: s.uScanY, uScanK: s.uScanK });
    this.treeMat = gbMat(TREE_VERT, TREE_FRAG, { uFront: s.uFront, uRiseLen: s.uRiseLen, uInk: s.uInk });
    this.standIns = [];
    const tri = () => { const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([0, -500, 0, 0, -500, 0, 0, -500, 0], 3));
      g.setAttribute('aBld', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 2));
      g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
      g.setAttribute('aKey', new THREE.InstancedBufferAttribute(new Float32Array([1e9]), 1)); return g; };
    for (const m of [this.bldMat, this.heroMat]) { const o = new THREE.Mesh(tri(), m); o.frustumCulled = false; this.group.add(o); this.standIns.push(o); }
    const it = new THREE.InstancedMesh(tri(), this.treeMat, 1); it.frustumCulled = false; this.group.add(it); this.standIns.push(it);
  }
  // the heavy half (buildings, trees, bridges) arrives while the pen draws;
  // it is built in time slices by pump() so no frame ever stalls
  attach(data) {
    for (const [k, v] of Object.entries(data.a)) this.a[k] = v;
    this._gen = this.buildAll();
  }
  *buildAll() {
    yield* this.buildBuildingsGen();
    this.buildTrees(); yield;
    this.buildBridges(); yield;
    this.heroes = buildHeroes(this, this.heroMat);
    for (const [x, z, h] of [[-3388, 5712, 541], [-1408, 2594, 87], [-1068, 1776, 443], [-197, 1422, 319]]) {
      const pb = Math.floor((this.key(x, z) + 500) / 40);
      for (let q = -1; q <= 1; q++) if (this.profile[pb + q] !== undefined) this.profile[pb + q] = Math.max(this.profile[pb + q], q ? h * 0.8 : h);
    }
    this.ready = true;
    if (this.onReady) this.onReady();
  }
  pump(ms) {
    if (!this._gen) return;
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { if (this._gen.next().done) { this._gen = null; break; } }
  }

  // The architect's pen, as a solid: a technical drafting pen turned on a
  // lathe (needle nib, collar, knurled grip, barrel, cap), rendered through
  // the same edge filter as the city so it is drawn in the same hand.
  // Units are metres at the scale of the plan: a pen ~120 m long.
  buildPen() {
    const prof = [[0.0, 0.0], [0.35, 0.6], [0.55, 5.5], [1.6, 6.2], [2.0, 9.5], [3.0, 10.2], [3.3, 15.5], [3.9, 16.2], [3.9, 19.0], [3.5, 19.6]];
    for (let y = 20; y < 44; y += 2.4) prof.push([3.95, y], [3.95, y + 1.5], [3.65, y + 1.7], [3.65, y + 2.4]);
    prof.push([4.5, 45.5], [4.7, 47], [4.7, 104], [4.95, 105], [4.95, 112], [4.4, 113], [4.4, 119], [0.0, 120]);
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 48);
    const vert = `
precision highp float;
uniform mat4 modelMatrix, viewMatrix, projectionMatrix;
in vec3 position; out vec3 vView;
void main(){ vec4 v = viewMatrix * modelMatrix * vec4(position, 1.0); vView = v.xyz; gl_Position = projectionMatrix * v; }`;
    const frag = `
precision highp float;
in vec3 vView;
${GB_OUT}
void main(){
  vec3 cn = cross(dFdx(vView), dFdy(vView)); vec3 n = dot(cn, cn) > 1e-24 ? normalize(cn) : vec3(0.0, 0.0, 1.0);
  gNorm = vec4(n, 8.0);
  gData = vec4(-vView.z * 0.001, 0.777, 0.0, 0.0);
}`;
    const mat = gbMat(vert, frag, {}, { side: THREE.DoubleSide });
    this.pen = new THREE.Mesh(g, mat);
    this.pen.frustumCulled = false; this.pen.visible = false;
    this.pen.matrixAutoUpdate = false;
    this.group.add(this.pen);
  }
  // tip on the sheet at (x, z), leaning back against the direction of travel
  setPen(x, z, dx, dz, scale, visible) {
    this.pen.visible = visible;
    if (!visible) return;
    const back = new THREE.Vector3(-dx * 0.88 + dz * 0.47, 0, -dz * 0.88 - dx * 0.47).normalize();
    const axis = new THREE.Vector3(0, 1, 0).multiplyScalar(Math.cos(0.55)).addScaledVector(back, Math.sin(0.55)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    this.pen.matrix.compose(new THREE.Vector3(x, 0.5, z), q, new THREE.Vector3(scale, scale, scale));
    this.pen.matrixWorldNeedsUpdate = true;
  }

  // decks and towers of the five great bridges (cables are ink: see Ink)
  buildBridges() {
    const a = this.a; if (!a.br_deck) return;
    const pos = [], bld = [], idx = [];
    const push = (x, y, z, id, k) => { pos.push(x, y, z); bld.push(id, k); return pos.length / 3 - 1; };
    // an oriented box: centre, yaw, half extents; faces wound outward
    const box = (cx, cz, yaw, hx, hz, y0, y1, id) => {
      const c = Math.cos(yaw), s = Math.sin(yaw), k = this.key(cx, cz);
      const P = (lx, lz, y) => push(cx + lx * c - lz * s, y, cz + lx * s + lz * c, id, k);
      const b = [P(-hx, -hz, y0), P(hx, -hz, y0), P(hx, hz, y0), P(-hx, hz, y0)];
      const t = [P(-hx, -hz, y1), P(hx, -hz, y1), P(hx, hz, y1), P(-hx, hz, y1)];
      this.quadsOut(idx, pos, b, t);
    };
    let off = 0;
    const lens = a.br_deck_len, spec = a.br_spec, D = a.br_deck;
    for (let bi = 0; bi < lens.length; bi++) {
      const n = lens[bi], w = spec[bi * 4] / 2, id = 0.37 + bi * 0.071;
      for (let q = 0; q < n - 1; q++) {
        const i0 = (off + q) * 3, i1 = (off + q + 1) * 3;
        const x0 = D[i0], y0 = D[i0 + 1], z0 = D[i0 + 2], x1 = D[i1], y1 = D[i1 + 1], z1 = D[i1 + 2];
        const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1;
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, yaw = Math.atan2(dz, dx);
        // a deck slab per segment, following the approach profile
        const k = this.key(cx, cz), c = Math.cos(yaw), s = Math.sin(yaw);
        const P = (lx, lz, y) => push(cx + lx * c - lz * s, y, cz + lx * s + lz * c, id, k);
        const hl = l / 2 + 0.3, th = 3.2;
        const b = [P(-hl, -w, y0 - th), P(hl, -w, y1 - th), P(hl, w, y1 - th), P(-hl, w, y0 - th)];
        const t = [P(-hl, -w, y0), P(hl, -w, y1), P(hl, w, y1), P(-hl, w, y0)];
        this.quadsOut(idx, pos, b, t);
      }
      off += n;
    }
    const T = a.br_tower; this.bridgeTowers = [];
    for (let i = 0; i < T.length / 8; i++) {
      const [x, z, yaw, wdt, dep, h, deckY, stone] = T.subarray(i * 8, i * 8 + 8);
      this.bridgeTowers.push({ x, z, yaw, h, deckY, stone });
      const id = 0.61 + i * 0.043;
      const yawT = yaw + Math.PI / 2;   // tower plane across the deck
      const c = Math.cos(yawT), s = Math.sin(yawT);
      const at = (l) => [x + l * c, z + l * s];
      if (stone) {
        // the Brooklyn Bridge's granite towers: three piers, two tall
        // pointed Gothic arches the roadway passes through, a heavy cornice
        const Wt = wdt * 1.2, hz2 = Wt / 2, outer = Wt * 0.22, mid = Wt * 0.1;
        const d2 = dep / 2, apex = h - 17, spring = h - 34;
        const legAt = (u0, u1) => { const [px, pz] = at((u0 + u1) / 2); box(px, pz, yawT, (u1 - u0) / 2, d2, -1, h, id); };
        legAt(-hz2, -hz2 + outer); legAt(-mid, mid); legAt(hz2 - outer, hz2);
        { const [px, pz] = at(0); box(px, pz, yawT, hz2, d2, apex, h, id); box(px, pz, yawT, hz2 * 1.04, d2 * 1.12, h - 3, h, id); }
        { const [px, pz] = at(0); box(px, pz, yawT, hz2 * 1.02, d2 * 1.15, -1, deckY - 6, id); }
        // spandrels: the solid triangles either side of each pointed arch
        const kk = this.key(x, z);
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        const tri3 = (u0, y0, u1, y1, u2, y2) => {
          // u: across the bridge (tower plane), l: along the deck (depth)
          const n = (u, y, l) => push(x + u * c + l * cy, y, z + u * s + l * sy, id, kk);
          this.prismOut(idx, pos, [n(u0, y0, -d2), n(u1, y1, -d2), n(u2, y2, -d2)], [n(u0, y0, d2), n(u1, y1, d2), n(u2, y2, d2)]);
        };
        for (const [ua, ub] of [[-hz2 + outer, -mid], [mid, hz2 - outer]]) {
          const uc = (ua + ub) / 2;
          tri3(ua, spring, ua, apex, uc, apex);
          tri3(ub, spring, ub, apex, uc, apex);
        }
        continue;
      }
      // steel towers: two legs rising through the deck, portal and crown beams
      const leg = 3.2, hz = wdt / 2;
      const [lx, lz] = at(-hz + leg / 2), [rx, rz] = at(hz - leg / 2);
      box(lx, lz, yawT, leg / 2, dep / 2, -1, h, id);
      box(rx, rz, yawT, leg / 2, dep / 2, -1, h, id);
      box(x, z, yawT, hz, dep / 2, h - (stone ? 22 : 7), h, id);
      box(x, z, yawT, hz, dep / 2 * 0.8, deckY - 6, deckY - 3, id);
      if (!stone) box(x, z, yawT, hz, dep / 2 * 0.7, (deckY + h) / 2, (deckY + h) / 2 + 4, id);
      if (stone) box(x, z, yawT, hz * 1.05, dep / 2 * 1.2, -1, deckY - 6, id);    // the masonry pier
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aBld', new THREE.Float32BufferAttribute(bld, 2));
    g.setIndex(idx); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, this.bridgeMat); this.group.add(m);
    // cables as 3D polylines for the ink layer
    const cl = a.br_cab_len, C = a.br_cab; this.cables = []; let o = 0;
    for (let i = 0; i < cl.length; i++) { this.cables.push(C.subarray(o * 3, (o + cl[i]) * 3)); o += cl[i]; }
  }
  // two matching rings of vertex indices (any convex prism) -> sides + both
  // caps, every triangle wound outward from the prism's centroid
  prismOut(idx, pos, r0, r1) {
    const all = [...r0, ...r1]; let cx = 0, cy = 0, cz = 0;
    for (const v of all) { cx += pos[v * 3]; cy += pos[v * 3 + 1]; cz += pos[v * 3 + 2]; }
    cx /= all.length; cy /= all.length; cz /= all.length;
    const tri = (A, B, C) => {
      const ax = pos[A * 3], ay = pos[A * 3 + 1], az = pos[A * 3 + 2];
      const ux = pos[B * 3] - ax, uy = pos[B * 3 + 1] - ay, uz = pos[B * 3 + 2] - az;
      const vx = pos[C * 3] - ax, vy = pos[C * 3 + 1] - ay, vz = pos[C * 3 + 2] - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const gx = (ax + pos[B * 3] + pos[C * 3]) / 3 - cx, gy = (ay + pos[B * 3 + 1] + pos[C * 3 + 1]) / 3 - cy, gz = (az + pos[B * 3 + 2] + pos[C * 3 + 2]) / 3 - cz;
      if (nx * gx + ny * gy + nz * gz >= 0) idx.push(A, B, C); else idx.push(A, C, B);
    };
    const n = r0.length;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; tri(r0[i], r0[j], r1[j]); tri(r0[i], r1[j], r1[i]); }
    for (let i = 1; i < n - 1; i++) { tri(r0[0], r0[i], r0[i + 1]); tri(r1[0], r1[i], r1[i + 1]); }
  }
  // 4 bottom + 4 top corners (any quad prism) -> 4 side faces + top, wound
  // outward whatever order the corners came in
  quadsOut(idx, pos, b, t) {
    let cx = 0, cy = 0, cz = 0;
    for (const v of [...b, ...t]) { cx += pos[v * 3]; cy += pos[v * 3 + 1]; cz += pos[v * 3 + 2]; }
    cx /= 8; cy /= 8; cz /= 8;
    const tri = (A, B, C) => {
      const ax = pos[A * 3], ay = pos[A * 3 + 1], az = pos[A * 3 + 2];
      const ux = pos[B * 3] - ax, uy = pos[B * 3 + 1] - ay, uz = pos[B * 3 + 2] - az;
      const vx = pos[C * 3] - ax, vy = pos[C * 3 + 1] - ay, vz = pos[C * 3 + 2] - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const out = nx * (ax - cx) + ny * (ay - cy) + nz * (az - cz);
      if (out >= 0) idx.push(A, B, C); else idx.push(A, C, B);
    };
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; tri(b[i], b[j], t[j]); tri(b[i], t[j], t[i]); }
    tri(t[0], t[1], t[2]); tri(t[0], t[2], t[3]);
    tri(b[0], b[2], b[1]); tri(b[0], b[3], b[2]);
  }
  key(x, z) { return (x - this.battery.x) * this.axis.x + (z - this.battery.y) * this.axis.y; }

  *buildBuildingsGen() {
    this.profileBin = 40; this.profile = new Float32Array(Math.ceil(23000 / 40));
    const a = this.a, info = a.b_info, meta = a.b_meta, ringLen = a.b_ring, v0 = a.b_v0, dv = a.b_dv, tri = a.b_tri;
    const nb = info.length / 4;
    // decode every footprint vertex once (decimetres -> metres)
    const nRing = ringLen.length;
    const ringStart = new Uint32Array(nRing + 1);
    for (let r = 0; r < nRing; r++) ringStart[r + 1] = ringStart[r] + ringLen[r];
    const fx = new Float32Array(ringStart[nRing]), fz = new Float32Array(ringStart[nRing]);
    let dOff = 0;
    for (let r = 0; r < nRing; r++) {
      let x = v0[r * 2], z = v0[r * 2 + 1], o = ringStart[r];
      fx[o] = x / 10; fz[o] = z / 10;
      for (let k = 1; k < ringLen[r]; k++) {
        x += dv[dOff * 2]; z += dv[dOff * 2 + 1]; dOff++;
        fx[o + k] = x / 10; fz[o + k] = z / 10;
      }
      if ((r & 16383) === 16383) yield;
    }
    // chunk by a 1.2 km grid so off-screen chunks are frustum-culled
    const CH = 1200, bb = this.h.bbox;
    const cols = Math.ceil((bb[2] - bb[0]) / CH), rows = Math.ceil((bb[3] - bb[1]) / CH);
    const chunkOf = new Int32Array(nb), vCount = new Uint32Array(cols * rows), iCount = new Uint32Array(cols * rows);
    const bRing0 = new Uint32Array(nb), bTri0 = new Uint32Array(nb);
    let ro = 0, to = 0;
    this.landmarks = [];
    for (let b = 0; b < nb; b++) {
      const rc = info[b * 4], vc = info[b * 4 + 1], tc = info[b * 4 + 2];
      bRing0[b] = ro; bTri0[b] = to;
      const f0 = ringStart[ro];
      const cx = Math.min(cols - 1, Math.max(0, Math.floor((fx[f0] - bb[0]) / CH)));
      const cz = Math.min(rows - 1, Math.max(0, Math.floor((fz[f0] - bb[1]) / CH)));
      const c = cz * cols + cx; chunkOf[b] = c;
      const roof = meta[b * 4 + 2];
      vCount[c] += vc * 2 + (roof ? 1 : 0);
      let wallQuads = 0; for (let r = 0; r < rc; r++) wallQuads += ringLen[ro + r];
      iCount[c] += wallQuads * 6 + (roof ? ringLen[ro] * 3 : tc);
      ro += rc; to += tc;
    }
    const chunks = [];
    for (let c = 0; c < cols * rows; c++) {
      if (!vCount[c]) { chunks.push(null); continue; }
      chunks.push({ pos: new Float32Array(vCount[c] * 3), bld: new Float32Array(vCount[c] * 2),
        idx: vCount[c] > 65535 ? new Uint32Array(iCount[c]) : new Uint16Array(iCount[c]), v: 0, i: 0 });
    }
    for (let b = 0; b < nb; b++) {
      if ((b & 255) === 255) yield;
      const ch = chunks[chunkOf[b]];
      { // the landmark lots are rebuilt by hand (heroes.js): skip the data there
        const r0 = bRing0[b], q0 = ringStart[r0], nq = ringLen[r0]; let sx = 0, sz = 0;
        for (let q = 0; q < nq; q++) { sx += fx[q0 + q]; sz += fz[q0 + q]; }
        if (inHeroLot(sx / nq, sz / nq)) continue; }
      const rc = info[b * 4], vc = info[b * 4 + 1], tc = info[b * 4 + 2];
      const h = meta[b * 4], mh = meta[b * 4 + 1], roof = meta[b * 4 + 2];
      let rh = meta[b * 4 + 3];
      if (roof && !(rh > 0)) rh = roof === 2 ? (h - mh) * 0.85 : Math.min(8, (h - mh) * 0.3);
      const top = roof ? h - rh : h;
      const id = (Math.sin((b + 1) * 12.9898) * 43758.5453) % 1;
      const idh = Math.abs(id) * 0.998 + 0.001;
      const f0 = ringStart[bRing0[b]];
      const k = this.key(fx[f0], fz[f0]) + (Math.abs(Math.sin(b * 78.233) * 43758.5453) % 1) * 160 + h * 0.6;
      if (h > 240) this.landmarks.push({ x: fx[f0], z: fz[f0], h });
      // the west elevation's skyline: max height per 40 m along the island
      if (info[b * 4 + 3] & 1) { const pb = Math.floor((this.key(fx[f0], fz[f0]) + 500) / 40); if (pb >= 0 && pb < this.profile.length) this.profile[pb] = Math.max(this.profile[pb], h); }
      const base = ch.v, P = ch.pos, Bd = ch.bld, I = ch.idx;
      // vertices: bottom ring(s) then top ring(s)
      let vi = base;
      for (let r = 0; r < rc; r++) {
        const s = ringStart[bRing0[b] + r], n = ringLen[bRing0[b] + r];
        for (let q = 0; q < n; q++) { P[vi * 3] = fx[s + q]; P[vi * 3 + 1] = mh; P[vi * 3 + 2] = fz[s + q]; Bd[vi * 2] = idh; Bd[vi * 2 + 1] = k; vi++; }
      }
      const topBase = vi;
      for (let r = 0; r < rc; r++) {
        const s = ringStart[bRing0[b] + r], n = ringLen[bRing0[b] + r];
        for (let q = 0; q < n; q++) { P[vi * 3] = fx[s + q]; P[vi * 3 + 1] = top; P[vi * 3 + 2] = fz[s + q]; Bd[vi * 2] = idh; Bd[vi * 2 + 1] = k; vi++; }
      }
      // walls
      let local = 0;
      for (let r = 0; r < rc; r++) {
        const n = ringLen[bRing0[b] + r];
        for (let q = 0; q < n; q++) {
          const a0 = base + local + q, b0 = base + local + ((q + 1) % n);
          const at = a0 + vc, bt = b0 + vc;
          I[ch.i++] = a0; I[ch.i++] = bt; I[ch.i++] = b0;
          I[ch.i++] = a0; I[ch.i++] = at; I[ch.i++] = bt;
        }
        local += n;
      }
      if (!roof) {
        // flat roof: baked earcut triangles, wound to face up
        const t0 = bTri0[b];
        for (let q = 0; q < tc; q += 3) {
          const A = tri[t0 + q], B = tri[t0 + q + 1], C = tri[t0 + q + 2];
          const ia = topBase + A, ib = topBase + B, ic = topBase + C;
          const ax = P[ia * 3], az = P[ia * 3 + 2];
          const cy = (P[ib * 3 + 2] - az) * (P[ic * 3] - ax) - (P[ib * 3] - ax) * (P[ic * 3 + 2] - az);
          if (cy >= 0) { I[ch.i++] = ia; I[ch.i++] = ib; I[ch.i++] = ic; } else { I[ch.i++] = ia; I[ch.i++] = ic; I[ch.i++] = ib; }
        }
      } else {
        // pyramid / spire / dome: a fan to an apex over the centroid
        const n = ringLen[bRing0[b]]; let sx = 0, sz = 0;
        for (let q = 0; q < n; q++) { sx += P[(topBase + q) * 3]; sz += P[(topBase + q) * 3 + 2]; }
        const ap = vi; P[ap * 3] = sx / n; P[ap * 3 + 1] = h; P[ap * 3 + 2] = sz / n; Bd[ap * 2] = idh; Bd[ap * 2 + 1] = k; vi++;
        for (let q = 0; q < n; q++) {
          const ia = topBase + q, ib = topBase + (q + 1) % n;
          const ax = P[ia * 3], az = P[ia * 3 + 2];
          const cy = (P[ib * 3 + 2] - az) * (P[ap * 3] - ax) - (P[ib * 3] - ax) * (P[ap * 3 + 2] - az);
          if (cy >= 0) { I[ch.i++] = ia; I[ch.i++] = ib; I[ch.i++] = ap; } else { I[ch.i++] = ia; I[ch.i++] = ap; I[ch.i++] = ib; }
        }
      }
      ch.v = vi;
    }
    this.bldMeshes = [];
    let tv = 0, ti = 0;
    for (const ch of chunks) {
      if (!ch) continue;
      let cx = 0, cz = 0, kmin = 1e9;
      for (let q = 0; q < ch.v; q++) { cx += ch.pos[q * 3]; cz += ch.pos[q * 3 + 2]; kmin = Math.min(kmin, ch.bld[q * 2 + 1]); }
      cx /= Math.max(1, ch.v); cz /= Math.max(1, ch.v);
      for (let q = 0; q < ch.v; q++) { ch.pos[q * 3] -= cx; ch.pos[q * 3 + 2] -= cz; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(ch.pos, 3));
      g.setAttribute('aBld', new THREE.BufferAttribute(ch.bld, 2));
      g.setIndex(new THREE.BufferAttribute(ch.idx, 1));
      g.computeBoundingSphere();
      // the rise can't grow a building past its own height: the static
      // bounding sphere stays valid for culling
      const m = new THREE.Mesh(g, this.bldMat); m.position.set(cx, 0, cz); m.userData.kmin = kmin;
      this.group.add(m); this.bldMeshes.push(m);
      tv += ch.v; ti += ch.i;
      yield;   // one chunk per slice: its GPU upload lands on its own frame
    }
    this.stats = { buildings: nb, verts: tv, tris: ti / 3, chunks: this.bldMeshes.length };
  }

  flatMesh(v, i, y, mat, order = 0) {
    if (!v || !v.length) return null;
    const n = v.length / 2, pos = new Float32Array(n * 3);
    for (let q = 0; q < n; q++) { pos[q * 3] = v[q * 2]; pos[q * 3 + 1] = y; pos[q * 3 + 2] = v[q * 2 + 1]; }
    // make every triangle face up
    const idx = new Uint32Array(i);
    for (let q = 0; q < idx.length; q += 3) {
      const A = idx[q], B = idx[q + 1], C = idx[q + 2];
      const ax = pos[A * 3], az = pos[A * 3 + 2];
      const cy = (pos[B * 3 + 2] - az) * (pos[C * 3] - ax) - (pos[B * 3] - ax) * (pos[C * 3 + 2] - az);
      if (cy < 0) { idx[q + 1] = C; idx[q + 2] = B; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.renderOrder = order; this.group.add(m); return m;
  }
  buildGround() {
    const a = this.a, s = this.shared;
    const mk = (id) => gbMat(FLAT_VERT, FLAT_FRAG, { uMat: { value: id }, uInk: { value: 1 }, uDpr: s.uDpr, uTime: s.uTime, uWater: s.uWater },
      { depthTest: false, depthWrite: false });
    this.matSea = mk(3); this.matLand = mk(2); this.matLawn = mk(4); this.matWood = mk(5); this.matPond = mk(3);
    // the sea: one plane under everything, reaching well past the horizon
    const sea = new THREE.PlaneGeometry(90000, 90000); sea.rotateX(-Math.PI / 2); sea.translate(0, -1.5, 0);
    const sm = new THREE.Mesh(sea, this.matSea); sm.renderOrder = -10; this.group.add(sm);
    this.flatMesh(a.land_v, a.land_i, 0, this.matLand, -9);
    this.flatMesh(a.green4_v, a.green4_i, 0, this.matLand, -8);
    this.flatMesh(a.green1_v, a.green1_i, 0, this.matLawn, -7);
    this.flatMesh(a.green2_v, a.green2_i, 0, this.matLawn, -7);
    this.flatMesh(a.green3_v, a.green3_i, 0, this.matWood, -6);
    this.flatMesh(a.water_v, a.water_i, 0, this.matPond, -5);
  }
  buildTrees() {
    const t = this.a.trees; if (!t || !t.length) return;
    const n = t.length / 2;
    const geo = new THREE.BufferGeometry();
    { const P = [0, 1, 0], N = [0, 1, 0], I = [];
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P.push(Math.cos(a), -0.35, Math.sin(a));
        const n = new THREE.Vector3(Math.cos(a), 0.9, Math.sin(a)).normalize(); N.push(n.x, n.y, n.z); }
      for (let i = 0; i < 6; i++) I.push(0, 1 + ((i + 1) % 6), 1 + i);
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      geo.setIndex(I); }
    const mesh = new THREE.InstancedMesh(geo, this.treeMat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    const keys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = t[i * 2], z = t[i * 2 + 1];
      const h = (Math.sin(i * 91.7) * 43758.5453) % 1, rr = 3.2 + Math.abs(h) * 3.2;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.7);
      sc.set(rr, rr * 0.82, rr * (0.85 + Math.abs(h) * 0.25));
      p.set(x, 4 + rr * 0.8, z);
      m.compose(p, q, sc); mesh.setMatrixAt(i, m);
      keys[i] = this.key(x, z) + Math.abs(h) * 120;
    }
    geo.setAttribute('aKey', new THREE.InstancedBufferAttribute(keys, 1));
    mesh.frustumCulled = false;
    let tk = 1e9; for (let i = 0; i < n; i++) tk = Math.min(tk, keys[i]);
    mesh.userData.kmin = tk;
    this.group.add(mesh); this.trees = mesh;
  }
}

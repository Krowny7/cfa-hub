// @ts-nocheck
// The plan, in ink. Every stroke of the drawing (coastlines, the curb of
// every block, park paths, piers, bridges) is one instanced quad per
// segment, expanded to a constant pixel width in the vertex shader and
// revealed on the GPU from per-segment ink times — a real pen draws
// Manhattan's coastline while the grid blooms out behind it in a wave.
// Lines are occluded by the risen city through the G-buffer depth, so the
// plan survives on the ground as street drawing once the buildings stand.
import * as THREE from 'three';

const VERT = `
precision highp float;
uniform mat4 viewMatrix, projectionMatrix;
uniform vec2 uRes; uniform float uDpr, uNear, uWidthK;
uniform float uClassA[11];
in vec2 corner; in vec3 aA, aB; in vec2 aT; in vec4 aS;
out float vAcross, vAlong, vHalf, vDepth, vAlpha; out vec2 vT;
void main(){
  vec4 va = viewMatrix * vec4(aA, 1.0), vb = viewMatrix * vec4(aB, 1.0);
  float na = -va.z, nb = -vb.z;
  vAlpha = aS.y * uClassA[int(aS.z + 0.5)];
  if((na < uNear && nb < uNear) || vAlpha <= 0.001){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float fa = 0.0, fb = 1.0;
  if(na < uNear){ float k = (uNear - na) / (nb - na); va = mix(va, vb, k); fa = k; }
  else if(nb < uNear){ float k = (uNear - nb) / (na - nb); vb = mix(vb, va, k); fb = 1.0 - k; }
  vec4 ca = projectionMatrix * va, cb = projectionMatrix * vb;
  vec2 hr = uRes * 0.5;
  vec2 sa = ca.xy / ca.w * hr, sb = cb.xy / cb.w * hr;
  vec2 d = sb - sa; float len = length(d);
  vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float hw = aS.x * uDpr * uWidthK * 0.5 + 0.75;
  float end = corner.x;
  vec2 s = mix(sa, sb, end) + nrm * corner.y * hw + dir * (end * 2.0 - 1.0) * min(hw, 1.5);
  vec4 c = end < 0.5 ? ca : cb;
  gl_Position = vec4(s / hr * c.w, c.z, c.w);
  vAcross = corner.y * hw; vHalf = hw; vAlong = mix(fa, fb, end); vT = aT;
  vDepth = end < 0.5 ? -va.z : -vb.z;
}`;
const FRAG = `
precision highp float;
uniform float uTime, uOcc, uFreshK, uGain, uFogNear, uFogFar, uGhost; uniform vec3 uInkCol;
uniform sampler2D tData; uniform vec2 uRes;
in float vAcross, vAlong, vHalf, vDepth, vAlpha; in vec2 vT;
out vec4 outColor;
void main(){
  float f = clamp((uTime - vT.x) / max(1e-4, vT.y - vT.x), 0.0, 1.0);
  bool pencil = uTime < vT.x || vAlong > f + 1e-3;
  if(pencil && uGhost <= 0.0) discard;
  float a = clamp(vHalf - abs(vAcross), 0.0, 1.0);
  if(pencil){ a = clamp(0.55 - abs(vAcross) * 0.35, 0.0, 1.0); }
  if(uOcc > 0.5){
    vec4 dd = texture(tData, gl_FragCoord.xy / uRes); dd.r *= 1000.0;   // depth is stored in km
    if(dd.r > 0.0 && vDepth > dd.r + max(3.0, dd.r * 0.006)) discard;
  }
  float age = uTime - vT.y;
  float fresh = exp(-max(age, 0.0) * uFreshK);
  float tip = (f < 1.0) ? smoothstep(f - 0.08, f, vAlong) : 0.0;
  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  float k = vAlpha * a * uGain * (1.0 + fresh * 0.45 + tip * 1.2) * mix(1.0, 0.18, fog);
  if(pencil) k = vAlpha * a * uGhost * mix(1.0, 0.3, fog);
  outColor = vec4(uInkCol * k, 1.0);
}`;

// stroke classes: 0 pen (Manhattan coast) 1 other shores 2 block curbs
// 3 park paths 4 water outlines 5 park outlines 6 piers 7 bridges
// 8 plate furniture (timed per segment)  9 water-lining  10 contour dashes
export const CLASS_W = [2.4, 1.6, 1.0, 0.8, 1.2, 1.2, 1.1, 1.3, 1.0, 0.75, 0.8];
const CLASS_A = [1.0, 0.8, 0.62, 0.45, 0.7, 0.6, 0.7, 0.8, 0.8, 0.42, 0.34];
const CLASS_V = [0, 9000, 2400, 1800, 3000, 3000, 2000, 3000, 3000, 5000, 3000];   // drawing speed, m/s

export class Ink {
  constructor(data, city, opts) {
    const a = data.a;
    this.city = city;
    const pen = a.pen && a.pen.length >= 4 ? a.pen : new Float32Array([-3800, 5700, -3000, 4000]);
    const np = pen.length / 2;
    // pen path arc lengths
    this.penX = new Float32Array(np); this.penZ = new Float32Array(np); this.penL = new Float32Array(np);
    let L = 0;
    for (let i = 0; i < np; i++) {
      this.penX[i] = pen[i * 2]; this.penZ[i] = pen[i * 2 + 1];
      if (i) L += Math.hypot(this.penX[i] - this.penX[i - 1], this.penZ[i] - this.penZ[i - 1]);
      this.penL[i] = L;
    }
    this.penLen = L;
    this.T0 = opts.T0; this.T1 = opts.T1; this.v0 = opts.v0;
    // pen distance L(t) = v0 (e^{k(t-T0)} - 1)/k, k solved so L(T1) = total
    const D = this.T1 - this.T0; let lo = 0.01, hi = 8;
    for (let it = 0; it < 60; it++) { const k = (lo + hi) / 2; const v = this.v0 * (Math.exp(k * D) - 1) / k; if (v > L) hi = k; else lo = k; }
    this.k = (lo + hi) / 2;

    const cls = a.s_cls, lens = a.s_len, xz = a.s_xz, sp = a.s_pen;
    const ns = cls.length;
    let nseg = np - 1;
    for (let s = 0; s < ns; s++) if (cls[s] !== 0) nseg += lens[s] - 1;
    const A = new Float32Array(nseg * 3), B = new Float32Array(nseg * 3), T = new Float32Array(nseg * 2), S = new Float32Array(nseg * 4);
    let j = 0;
    const Y = 0.6;
    // the pen's own stroke
    for (let i = 0; i < np - 1; i++, j++) {
      A.set([this.penX[i], Y, this.penZ[i]], j * 3); B.set([this.penX[i + 1], Y, this.penZ[i + 1]], j * 3);
      T[j * 2] = this.timeAt(this.penL[i]); T[j * 2 + 1] = this.timeAt(this.penL[i + 1]);
      S.set([CLASS_W[0], 1, 0, 0], j * 4);
    }
    const wave = opts.wave;
    // the pen's progress up the island: for each point of its path, the
    // furthest up-island it has reached so far (monotone), so a stroke can
    // be keyed to the moment the pen first comes level with it
    const pk = new Float32Array(np); let mx = -1e9;
    for (let i = 0; i < np; i++) { mx = Math.max(mx, city.key(this.penX[i], this.penZ[i])); pk[i] = mx; }
    const levelIdx = (k) => { let lo = 0, hi = np - 1; if (pk[hi] < k) return hi; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pk[m] < k) lo = m; else hi = m; } return hi; };
    let off = 0;
    for (let s = 0; s < ns; s++) {
      const n = lens[s], c = cls[s];
      if (c === 0) { off += n; continue; }
      const jit = (Math.abs(Math.sin(s * 12.9898) * 43758.5453) % 1);
      const mid = off + (n >> 1), mxz = xz[mid * 2], mzz = xz[mid * 2 + 1];
      const li = levelIdx(city.key(mxz, mzz));
      const dist = Math.hypot(mxz - this.penX[li], mzz - this.penZ[li]);
      let t0 = this.timeAt(this.penL[li]) + 0.05 + dist / wave + jit * 0.3;
      if (c === 1) t0 += 0.25;
      t0 = Math.min(t0, opts.latest - 0.15 - jit * 0.3);
      let v = CLASS_V[c] * (0.8 + jit * 0.5);
      let tot = 0; for (let q = 0; q < n - 1; q++) tot += Math.hypot(xz[(off + q + 1) * 2] - xz[(off + q) * 2], xz[(off + q + 1) * 2 + 1] - xz[(off + q) * 2 + 1]);
      v = Math.max(v, tot / Math.max(0.12, opts.latest - t0));
      let cum = 0;
      for (let q = 0; q < n - 1; q++, j++) {
        const x0 = xz[(off + q) * 2], z0 = xz[(off + q) * 2 + 1], x1 = xz[(off + q + 1) * 2], z1 = xz[(off + q + 1) * 2 + 1];
        const sl = Math.hypot(x1 - x0, z1 - z0);
        A[j * 3] = x0; A[j * 3 + 1] = Y; A[j * 3 + 2] = z0;
        B[j * 3] = x1; B[j * 3 + 1] = Y; B[j * 3 + 2] = z1;
        T[j * 2] = t0 + cum / v; T[j * 2 + 1] = t0 + (cum + sl) / v;
        S[j * 4] = CLASS_W[c]; S[j * 4 + 1] = CLASS_A[c] * (0.85 + jit * 0.3); S[j * 4 + 2] = c;
        cum += sl;
      }
      off += n;
    }
    this.count = j;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('corner', new THREE.Float32BufferAttribute([0, -1, 0, 1, 1, -1, 1, 1], 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    g.setAttribute('aA', new THREE.InstancedBufferAttribute(A, 3));
    g.setAttribute('aB', new THREE.InstancedBufferAttribute(B, 3));
    g.setAttribute('aT', new THREE.InstancedBufferAttribute(T, 2));
    g.setAttribute('aS', new THREE.InstancedBufferAttribute(S, 4));
    g.instanceCount = j;
    this.uniforms = {
      uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uNear: { value: 1 }, uWidthK: { value: 1 },
      uClassA: { value: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] }, uTime: { value: 0 }, uInkCol: { value: new THREE.Color(0.935, 0.93, 0.905) }, uOcc: { value: 1 }, uFreshK: { value: 3.5 }, uGain: { value: 1 },
      tData: { value: null }, uFogNear: { value: 2000 }, uFogFar: { value: 12000 }, uGhost: { value: 0 },
    };
    this.mat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms,
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.mesh);
    this.endTime = T.reduce((m, v) => Math.max(m, v), 0);
    this.buildPen();
  }
  // individually timed segments: [ax, ay, az, bx, by, bz, t0, t1, width, alpha]
  addSegs(list, cls) {
    const n = list.length; if (!n) return;
    const A = new Float32Array(n * 3), B = new Float32Array(n * 3), Tt = new Float32Array(n * 2), S = new Float32Array(n * 4);
    list.forEach((q, j) => { A.set(q.slice(0, 3), j * 3); B.set(q.slice(3, 6), j * 3); Tt[j * 2] = q[6]; Tt[j * 2 + 1] = q[7]; S.set([q[8], q[9], cls, 0], j * 4); });
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('corner', new THREE.Float32BufferAttribute([0, -1, 0, 1, 1, -1, 1, 1], 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    g.setAttribute('aA', new THREE.InstancedBufferAttribute(A, 3));
    g.setAttribute('aB', new THREE.InstancedBufferAttribute(B, 3));
    g.setAttribute('aT', new THREE.InstancedBufferAttribute(Tt, 2));
    g.setAttribute('aS', new THREE.InstancedBufferAttribute(S, 4));
    g.instanceCount = n;
    const m = new THREE.Mesh(g, this.mat); m.frustumCulled = false; this.scene.add(m);
  }
  // extra permanent strokes in 3D (bridge cables, trusses) — always drawn,
  // revealed with the city instead of the pen
  addStrokes3D(list, cls, width, alpha, tStart) {
    let n = 0; for (const pl of list) n += pl.length / 3 - 1;
    if (!n) return;
    const A = new Float32Array(n * 3), B = new Float32Array(n * 3), Tt = new Float32Array(n * 2), S = new Float32Array(n * 4);
    let j = 0;
    for (const pl of list) {
      for (let q = 0; q < pl.length / 3 - 1; q++, j++) {
        A.set(pl.subarray(q * 3, q * 3 + 3), j * 3); B.set(pl.subarray(q * 3 + 3, q * 3 + 6), j * 3);
        const t0 = typeof tStart === 'function' ? tStart(pl[q * 3], pl[q * 3 + 2]) : tStart;
        Tt[j * 2] = t0; Tt[j * 2 + 1] = t0 + 0.25;
        S[j * 4] = width; S[j * 4 + 1] = alpha; S[j * 4 + 2] = cls;
      }
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('corner', new THREE.Float32BufferAttribute([0, -1, 0, 1, 1, -1, 1, 1], 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    g.setAttribute('aA', new THREE.InstancedBufferAttribute(A, 3));
    g.setAttribute('aB', new THREE.InstancedBufferAttribute(B, 3));
    g.setAttribute('aT', new THREE.InstancedBufferAttribute(Tt, 2));
    g.setAttribute('aS', new THREE.InstancedBufferAttribute(S, 4));
    g.instanceCount = n;
    const m = new THREE.Mesh(g, this.mat); m.frustumCulled = false; this.scene.add(m);
  }
  // the drafting pen: a technical-pen nib and barrel, in line, riding the
  // head of the coastline stroke
  buildPen() {
    const segs = [];
    const ring = (y, r, n = 14) => { const p = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; p.push([Math.cos(a) * r, y, Math.sin(a) * r]); } return p; };
    const rings = [ring(0.0, 0.0, 3), ring(6, 1.2), ring(16, 3.2), ring(22, 4.4), ring(30, 5.2), ring(110, 5.2), ring(118, 4.2)];
    for (const r of rings) for (let i = 0; i < r.length - 1; i++) segs.push([r[i], r[i + 1]]);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      segs.push([[0, 0, 0], [c * 1.2, 6, s * 1.2]], [[c * 1.2, 6, s * 1.2], [c * 3.2, 16, s * 3.2]], [[c * 3.2, 16, s * 3.2], [c * 4.4, 22, s * 4.4]],
        [[c * 4.4, 22, s * 4.4], [c * 5.2, 30, s * 5.2]], [[c * 5.2, 30, s * 5.2], [c * 5.2, 110, s * 5.2]], [[c * 5.2, 110, s * 5.2], [c * 4.2, 118, s * 4.2]]);
    }
    this.penSegs = segs;
    const n = segs.length;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('corner', new THREE.Float32BufferAttribute([0, -1, 0, 1, 1, -1, 1, 1], 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    this.penA = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.penB = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const Tt = new Float32Array(n * 2).fill(-10), S = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) S.set([1.1, 0.85, 0, 0], i * 4);
    this.penS = new THREE.InstancedBufferAttribute(S, 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aA', this.penA); g.setAttribute('aB', this.penB);
    g.setAttribute('aT', new THREE.InstancedBufferAttribute(Tt, 2)); g.setAttribute('aS', this.penS);
    g.instanceCount = n;
    this.penMesh = new THREE.Mesh(g, this.mat.clone()); this.penMesh.frustumCulled = false;
    this.penMesh.material.uniforms = { ...this.uniforms, uOcc: { value: 0 }, uGhost: { value: 0 }, uClassA: { value: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] } };
    this.scene.add(this.penMesh);
  }
  // a line of lettering on the sheet (engineer's annotation), inked left to
  // right from time t0 over dur seconds. (x, z): start of the baseline;
  // (ux, uz): reading direction; height: cap height in metres
  addLabel(text, x, z, ux, uz, height, t0, dur, alpha = 0.8, family) {
    const cv = document.createElement('canvas');
    const fs = 96, pad = 8;
    const FONT = family === 'Anton' ? `400 ${fs}px Anton, Impact, sans-serif` : `300 ${fs}px "DM Mono", ui-monospace, monospace`;
    const c2 = cv.getContext('2d'); c2.font = FONT;
    const tw = Math.ceil(c2.measureText(text).width) + pad * 2;
    cv.width = tw; cv.height = fs + pad * 2;
    const c = cv.getContext('2d');
    c.font = FONT; c.fillStyle = '#fff'; c.textBaseline = 'middle';
    c.fillText(text, pad, cv.height / 2 + 4);
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const w = height * tw / fs, h = height * cv.height / fs;
    const vx = -uz, vz = ux;                  // across the reading direction
    const P = [0, 0, w, 0, w, h, 0, h].map((v, i) => v);
    const pos = [];
    for (let i = 0; i < 4; i++) { const u = P[i * 2], v = P[i * 2 + 1] - h / 2; pos.push(x + ux * u - vx * v, 0.7, z + uz * u - vz * v); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const m = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      side: THREE.DoubleSide,
      uniforms: { tMap: { value: tex }, uTime: this.uniforms.uTime, uInkCol: this.uniforms.uInkCol, uT0: { value: t0 }, uDur: { value: dur }, uA: { value: alpha }, uFade: { value: 1 } },
      vertexShader: `
precision highp float;
uniform mat4 viewMatrix, projectionMatrix; in vec3 position; in vec2 uv; out vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
precision highp float;
uniform sampler2D tMap; uniform float uTime, uT0, uDur, uA, uFade; uniform vec3 uInkCol; in vec2 vUv; out vec4 outColor;
void main(){
  float f = clamp((uTime - uT0) / uDur, 0.0, 1.0);
  float vis = 1.0 - smoothstep(f - 0.015, f + 0.015, vUv.x);
  float a = texture(tMap, vUv).a;
  float head = (1.0 - smoothstep(0.0, 0.05, abs(vUv.x - f))) * step(f, 0.999);
  outColor = vec4(uInkCol * a * uA * uFade * vis * (1.0 + head * 1.5), 1.0);
}` });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; this.scene.add(mesh);
    (this.labels = this.labels || []).push(m);
    return mesh;
  }
  setLabelFade(v) { for (const m of this.labels || []) m.uniforms.uFade.value = v; }
  // the wet ink at the nib: a point of light where pen meets paper
  buildGlow() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.glowU = { uPos: { value: new THREE.Vector3() }, uSize: { value: 40 }, uGain: { value: 0 }, uRes: this.uniforms.uRes };
    const m = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: this.glowU, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
precision highp float;
uniform mat4 viewMatrix, projectionMatrix; uniform vec3 uPos; uniform float uSize; uniform vec2 uRes;
in vec3 position; out vec2 vP;
void main(){ vec4 c = projectionMatrix * viewMatrix * vec4(uPos, 1.0); vP = position.xy;
  gl_Position = c + vec4(position.xy * uSize / uRes * 2.0 * c.w, 0.0, 0.0); }`,
      fragmentShader: `
precision highp float;
uniform float uGain; in vec2 vP; out vec4 outColor;
void main(){ float r = length(vP); float core = exp(-r * r * 60.0), halo = exp(-r * r * 7.0) * 0.35;
  outColor = vec4(vec3(1.0, 0.99, 0.96) * (core * 1.6 + halo) * uGain * (1.0 - smoothstep(0.9, 1.0, r)), 1.0); }` });
    this.glow = new THREE.Mesh(g, m); this.glow.frustumCulled = false;
    this.scene.add(this.glow);
  }
  setGlow(x, y, z, sizePx, gain) {
    if (!this.glow) this.buildGlow();
    this.glowU.uPos.value.set(x, y, z); this.glowU.uSize.value = sizePx; this.glowU.uGain.value = gain;
    this.glow.visible = gain > 0.001;
  }
  // place the pen: tip at (x,z) on the sheet, leaning back along travel
  setPen(x, z, dx, dz, scale, alpha) {
    const segs = this.penSegs, A = this.penA.array, B = this.penB.array, S = this.penS.array;
    // lean: 32° from vertical, tilted back against the direction of travel and a little to the side
    const lean = 0.56, bx = -dx * Math.cos(0.5) + dz * Math.sin(0.5), bz = -dz * Math.cos(0.5) - dx * Math.sin(0.5);
    const ux = bx * Math.sin(lean), uy = Math.cos(lean), uz = bz * Math.sin(lean);
    // an orthonormal frame around the pen axis
    let rx = uy * 0 - uz * 1, ry = uz * 0 - ux * 0, rz = ux * 1 - uy * 0;
    const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
    const fx = uy * rz - uz * ry, fy = uz * rx - ux * rz, fz = ux * ry - uy * rx;
    const tr = (p, o, k) => { o[k] = x + (p[0] * rx + p[1] * ux + p[2] * fx) * scale; o[k + 1] = 0.8 + (p[0] * ry + p[1] * uy + p[2] * fy) * scale; o[k + 2] = z + (p[0] * rz + p[1] * uz + p[2] * fz) * scale; };
    for (let i = 0; i < segs.length; i++) { tr(segs[i][0], A, i * 3); tr(segs[i][1], B, i * 3); S[i * 4 + 1] = 0.85 * alpha; }
    this.penA.needsUpdate = true; this.penB.needsUpdate = true; this.penS.needsUpdate = true;
    this.penMesh.visible = alpha > 0.01;
  }
  penDist(t) {
    if (t <= this.T0) return 0;
    return Math.min(this.penLen, this.v0 * (Math.exp(this.k * (t - this.T0)) - 1) / this.k);
  }
  timeAt(L) { return this.T0 + Math.log(1 + L * this.k / this.v0) / this.k; }
  // pen tip position + travel direction at time t
  penAt(t, out) {
    const d = this.penDist(t), L = this.penL;
    let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] < d) lo = m; else hi = m; }
    const f = L[hi] > L[lo] ? (d - L[lo]) / (L[hi] - L[lo]) : 0;
    out.x = this.penX[lo] + (this.penX[hi] - this.penX[lo]) * f;
    out.z = this.penZ[lo] + (this.penZ[hi] - this.penZ[lo]) * f;
    const dx = this.penX[hi] - this.penX[lo], dz = this.penZ[hi] - this.penZ[lo], dl = Math.hypot(dx, dz) || 1;
    out.dx = dx / dl; out.dz = dz / dl; out.d = d;
    return out;
  }
}

// @ts-nocheck
// Traffic as light trails — the TripsLayer technique (deck.gl), read as a
// long-exposure photograph of the city at night:
//  · every vehicle drives the whole length of a real street (a chain of
//    merged OSM ways — an avenue end to end, curves and junctions included),
//    its path sampled every 10 m into a data texture;
//  · what is drawn is its trail: a ribbon following the road over the last
//    stretch it covered, bright at the front and fading out behind — no dot,
//    no loop on a straight run;
//  · the ribbon is a real width in metres, so near traffic reads as streaks
//    and far traffic dissolves into a glow instead of piling up in pixels;
//  · two-way streets carry two lanes, each direction its own tone, like
//    headlights and tail-lights in a time exposure.
// Everything is computed on the GPU from the clock; buildings hide it
// through the G-buffer depth.
import * as THREE from 'three';

const SEG = 12;              // ribbon segments per trail
const STEP = 10.0;           // metres between path samples
const TEXW = 2048;

const VERT = `
precision highp float;
precision highp sampler2D;
uniform mat4 viewMatrix, projectionMatrix;
uniform vec2 uRes; uniform float uNear, uTime, uFovK;
uniform sampler2D tPath;
in vec2 corner;                       // x: 0..1 along the trail (0 = head), y: -1 / +1 across
in vec4 aTrip;                        // first sample, sample count, phase (0..1), speed (m/s)
in vec4 aLook;                        // direction (+1 / -1), trail length (m), lane offset (m), brightness
out float vAcross, vHalf, vAlpha, vDepth; out vec3 vTone;
vec2 samplePath(float s){             // s in metres along the chain, clamped
  float L = (aTrip.y - 1.0) * ${STEP.toFixed(1)};
  float u = clamp(s, 0.0, L) / ${STEP.toFixed(1)};
  float i0 = floor(u), f = u - i0;
  float a = aTrip.x + i0, b = aTrip.x + min(i0 + 1.0, aTrip.y - 1.0);
  vec2 pa = texelFetch(tPath, ivec2(int(mod(a, ${TEXW}.0)), int(floor(a / ${TEXW}.0))), 0).rg;
  vec2 pb = texelFetch(tPath, ivec2(int(mod(b, ${TEXW}.0)), int(floor(b / ${TEXW}.0))), 0).rg;
  return mix(pa, pb, f);
}
void main(){
  float L = (aTrip.y - 1.0) * ${STEP.toFixed(1)};
  float trail = aLook.y;
  // the head runs past the end by one trail length, so the tail drains out
  // of the street before the vehicle re-enters at the start: no pop
  float span = L + trail;
  float head = mod(aTrip.z * span + uTime * aTrip.w, span);
  float s = head - corner.x * trail;
  float sAlong = aLook.x > 0.0 ? s : L - s;           // direction of travel along the chain
  float ds = aLook.x > 0.0 ? 4.0 : -4.0;
  vec2 p = samplePath(sAlong), q = samplePath(sAlong + ds);
  vec2 t = q - p; t = dot(t, t) > 1e-6 ? normalize(t) : vec2(1.0, 0.0);
  vec2 right = vec2(-t.y, t.x);
  vec2 w = p + right * aLook.z;                          // keep to your lane
  vec4 v = viewMatrix * vec4(w.x, 2.0, w.y, 1.0);
  vec4 v2 = viewMatrix * vec4(w.x + t.x * 6.0, 2.0, w.y + t.y * 6.0, 1.0);
  float inside = step(0.0, s) * step(s, L);
  vAlpha = inside * pow(1.0 - corner.x, 1.8) * aLook.w;
  vAlpha *= smoothstep(0.0, 40.0, s) * smoothstep(0.0, 40.0, L - s);
  vAcross = 0.0; vHalf = 1.0; vDepth = 1.0; vTone = vec3(0.0);
  // culling is decided for the whole vehicle, never per vertex: moving one
  // vertex of a ribbon off-screen stretches its triangles across the frame
  vec2 hp = samplePath(aLook.x > 0.0 ? head : L - head);
  vec4 hv = viewMatrix * vec4(hp.x, 2.0, hp.y, 1.0);
  if(-hv.z < uNear * 4.0){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  if(-v.z < uNear) v.z = -uNear;
  if(-v2.z < uNear) v2.z = -uNear;
  vec4 c = projectionMatrix * v, c2 = projectionMatrix * v2;
  vec2 hr = uRes * 0.5, sa = c.xy / c.w * hr, sb = c2.xy / c2.w * hr;
  vec2 d = sb - sa; vec2 n = dot(d, d) > 1e-6 ? normalize(vec2(-d.y, d.x)) : vec2(0.0, 1.0);
  // a real width (2.4 m), never under a pixel; below a pixel the trail
  // fades by its coverage instead of widening
  float px = 2.4 * uRes.y / (uFovK * -v.z);
  float hw = max(px, 1.0) * 0.5 + 0.6;
  vAlpha *= clamp(px, 0.12, 1.0);
  gl_Position = vec4((sa + n * corner.y * hw) / hr * c.w, c.z, c.w);
  vAcross = corner.y * hw; vHalf = hw; vDepth = -v.z;
  vTone = aLook.x > 0.0 ? vec3(0.62, 0.84, 1.0) : vec3(0.20, 0.46, 1.0);
}`;
const FRAG = `
precision highp float;
uniform sampler2D tData; uniform vec2 uRes; uniform float uFade, uFogNear, uFogFar;
in float vAcross, vHalf, vAlpha, vDepth; in vec3 vTone;
out vec4 outColor;
void main(){
  vec4 dd = texture(tData, gl_FragCoord.xy / uRes); dd.r *= 1000.0;
  if(dd.r > 0.0 && vDepth > dd.r + max(3.0, dd.r * 0.006)) discard;
  float edge = clamp(vHalf - abs(vAcross), 0.0, 1.0);
  float core = 1.0 - smoothstep(0.0, vHalf, abs(vAcross));   // brighter along the centre line
  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  float k = vAlpha * edge * (0.55 + 0.45 * core) * uFade * mix(1.0, 0.2, fog);
  outColor = vec4(vTone * k * 1.25, 1.0);
}`;

export class Traffic {
  // xz: Int16Array [x, z] per 10 m sample; meta: Float32Array [first, count, weight, oneway] per chain
  constructor(xz, meta, count, ink) {
    const ns = xz.length / 2, rows = Math.max(1, Math.ceil(ns / TEXW));
    const tex = new Float32Array(TEXW * rows * 2);
    for (let i = 0; i < ns * 2; i++) tex[i] = xz[i];
    this.tex = new THREE.DataTexture(tex, TEXW, rows, THREE.RGFormat, THREE.FloatType);
    this.tex.minFilter = this.tex.magFilter = THREE.NearestFilter; this.tex.needsUpdate = true;

    // vehicles spread over the chains by length x how busy the street is
    const nc = meta.length / 4; let W = 0; const cum = new Float64Array(nc);
    for (let c = 0; c < nc; c++) { W += meta[c * 4 + 1] * Math.pow(meta[c * 4 + 2], 1.5); cum[c] = W; }
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const T = new Float32Array(count * 4), Lk = new Float32Array(count * 4);
    for (let v = 0; v < count; v++) {
      const r = rnd() * W; let lo = 0, hi = nc - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
      const c = lo, w = meta[c * 4 + 2], oneway = meta[c * 4 + 3] > 0.5;
      const dir = oneway ? 1 : (rnd() < 0.5 ? 1 : -1);
      const speed = (w >= 2.5 ? 26 : (w >= 1.4 ? 18 : 12)) * (0.8 + rnd() * 0.4);   // m/s, sped up for the film
      T.set([meta[c * 4], meta[c * 4 + 1], rnd(), speed], v * 4);
      Lk.set([dir, speed * (5 + rnd() * 3), oneway ? (rnd() - 0.5) * 5 : 3.2, 0.7 + rnd() * 0.3], v * 4);
    }
    // one ribbon: SEG+1 cross-sections, two vertices each
    const corner = [], idx = [];
    for (let i = 0; i <= SEG; i++) { corner.push(i / SEG, -1, i / SEG, 1); if (i < SEG) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('corner', new THREE.Float32BufferAttribute(corner, 2));
    g.setIndex(idx);
    g.setAttribute('aTrip', new THREE.InstancedBufferAttribute(T, 4));
    g.setAttribute('aLook', new THREE.InstancedBufferAttribute(Lk, 4));
    g.instanceCount = count;
    const iu = ink.uniforms;
    this.uniforms = { uRes: iu.uRes, uNear: iu.uNear, uTime: { value: 0 }, uFovK: { value: 1 }, tPath: { value: this.tex },
      tData: iu.tData, uFade: { value: 0 }, uFogNear: iu.uFogNear, uFogFar: iu.uFogFar };
    const m = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms,
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide });   // a screen-space ribbon: its winding flips with the direction of travel
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 2;
    ink.scene.add(this.mesh);
  }
  // per frame: the clock and the lens (screen height per unit of depth)
  update(t, fade, camera) {
    this.uniforms.uTime.value = t; this.uniforms.uFade.value = fade;
    this.uniforms.uFovK.value = 2 * Math.tan(camera.fov * Math.PI / 360);
  }
}

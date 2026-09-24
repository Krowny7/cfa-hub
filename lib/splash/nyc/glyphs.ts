// @ts-nocheck
// Map lettering: one glyph atlas (DM Mono, upright + italic), every letter
// an instanced quad lying on the sheet. Hundreds of place names, soundings
// and graticule figures cost one draw call; each letter is inked in turn,
// as a cartographer letters a plate.
import * as THREE from 'three';

const CHARS = " 0123456789.,:;'’°′″-–—/·×()#&ABCDEFGHIJKLMNOPQRSTUVWXYZÉÈÊÀÂÔÎÛÇabcdefghijklmnopqrstuvwxyzéèêàâôîûç";
const FS = 64, CW = 48, CH = 80;          // atlas cell (px); DM Mono advance is 0.6 em

export class Glyphs {
  constructor(uniforms) {
    this.shared = uniforms;               // uTime, uInkCol from the ink layer
    const cols = 32, rowsPer = Math.ceil(CHARS.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * CW; cv.height = rowsPer * 2 * CH;
    const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.textBaseline = 'alphabetic'; c.textAlign = 'center';
    this.map = {};
    for (let st = 0; st < 2; st++) {
      c.font = `${st ? 'italic ' : ''}400 ${FS}px "DM Mono", ui-monospace, monospace`;
      for (let i = 0; i < CHARS.length; i++) {
        const cx = (i % cols) * CW, cy = (Math.floor(i / cols) + st * rowsPer) * CH;
        c.fillText(CHARS[i], cx + CW / 2, cy + CH * 0.72);
        this.map[st + CHARS[i]] = [cx / cv.width, 1 - (cy + CH) / cv.height, (cx + CW) / cv.width, 1 - cy / cv.height];
      }
    }
    this.tex = new THREE.CanvasTexture(cv);
    this.tex.generateMipmaps = true; this.tex.minFilter = THREE.LinearMipmapLinearFilter; this.tex.anisotropy = 8;
    this.items = [];
    this.fade = { value: 1 };
    this.halo = { value: new THREE.Color(0.018, 0.045, 0.092) };
  }
  // text: string; (x, z): start of baseline; (ux, uz): reading direction;
  // h: cap height (m); track: extra letter spacing in em; t0/dur: inked
  // letter by letter over dur; a: alpha; italic; align: 0 left, 0.5 centre
  add(text, x, z, ux, uz, h, t0, dur, { a = 0.8, italic = false, track = 0, align = 0 } = {}) {
    const adv = h / 0.7 * 0.6 * (1 + track);      // cap height ≈ 0.7 em
    const n = text.length, total = adv * n;
    let s = -total * align;
    for (let i = 0; i < n; i++, s += adv) {
      const ch = text[i]; if (ch === ' ') continue;
      const uv = this.map[(italic ? 1 : 0) + ch] || this.map[(italic ? 1 : 0) + ch.toUpperCase()];
      if (!uv) continue;
      this.items.push([x + ux * s, z + uz * s, ux, uz, h, uv, t0 + dur * i / Math.max(1, n - 1), a]);
    }
  }
  build(scene) {
    const n = this.items.length; if (!n) return;
    const P = new Float32Array(n * 4), S = new Float32Array(n * 4), U = new Float32Array(n * 4);
    this.items.forEach((q, i) => { P.set([q[0], q[1], q[2], q[3]], i * 4); S.set([q[4], q[6], q[7], 0], i * 4); U.set(q[5], i * 4); });
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('corner', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.setAttribute('aP', new THREE.InstancedBufferAttribute(P, 4));
    g.setAttribute('aS', new THREE.InstancedBufferAttribute(S, 4));
    g.setAttribute('aUV', new THREE.InstancedBufferAttribute(U, 4));
    g.instanceCount = n;
    const m = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      side: THREE.DoubleSide,
      uniforms: { tMap: { value: this.tex }, uTime: this.shared.uTime, uInkCol: this.shared.uInkCol, uFade: this.fade },
      vertexShader: `
precision highp float;
uniform mat4 viewMatrix, projectionMatrix;
in vec2 corner; in vec4 aP, aS, aUV; out vec2 vUv; out float vA;
uniform float uTime, uFade;
void main(){
  float em = aS.x / 0.7, wq = em * 0.75, adv = em * 0.6, cellH = em * 1.25;   // cell 48x80 px at 64 px/em
  vec2 u = aP.zw, v = vec2(-aP.w, aP.z);                 // along, across (v points 'down' the letter)
  vec2 q = aP.xy + u * (corner.x * wq - (wq - adv) * 0.5) - v * ((corner.y - 0.28) * cellH);
  vUv = mix(aUV.xy, aUV.zw, corner);
  vA = aS.z * uFade * smoothstep(aS.y, aS.y + 0.12, uTime);
  gl_Position = projectionMatrix * viewMatrix * vec4(q.x, 0.8, q.y, 1.0);
  if(vA <= 0.001) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`,
      fragmentShader: `
precision highp float;
uniform sampler2D tMap; uniform vec3 uInkCol; in vec2 vUv; in float vA; out vec4 outColor;
void main(){ float a = texture(tMap, vUv).a; outColor = vec4(uInkCol * a * vA, 1.0); }` });
    const halo = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.NormalBlending, side: THREE.DoubleSide,
      uniforms: { tMap: { value: this.tex }, uTime: this.shared.uTime, uFade: this.fade, uHalo: this.halo },
      vertexShader: m.vertexShader,
      fragmentShader: `
precision highp float;
uniform sampler2D tMap; uniform vec3 uHalo; in vec2 vUv; in float vA; out vec4 outColor;
void main(){
  vec2 r = vec2(0.0042, 0.0105);
  float a = texture(tMap, vUv).a;
  for(int i = 0; i < 12; i++){ float t = float(i) * 0.5236; a = max(a, texture(tMap, vUv + vec2(cos(t), sin(t)) * r).a);
    a = max(a, texture(tMap, vUv + vec2(cos(t), sin(t)) * r * 0.5).a); }
  outColor = vec4(uHalo, min(1.0, a * 1.6) * min(1.0, vA * 1.4) * 0.9);
}` });
    const hm = new THREE.Mesh(g, halo); hm.frustumCulled = false; hm.renderOrder = 5; scene.add(hm);
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 6; scene.add(mesh);
    this.items = [];
  }
}

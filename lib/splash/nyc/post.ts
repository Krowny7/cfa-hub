// @ts-nocheck
// The render pipeline. The city is never "shaded" in the usual sense: it is
// rendered once into a G-buffer (view normal + material, linear depth +
// building id + engraving ink), and a composite pass turns that into a
// drawing — silhouettes, creases, party walls and coastlines become lines of
// light on black (Sobel-style edge detection on depth / normals / ids /
// materials, after Maxime Heckel's Moebius post-processing), the facades get
// their engraved floor lines, and everything else stays void. Plan ink,
// bloom, grain and vignette go on top.
import * as THREE from 'three';

const FS_VERT = `
in vec3 position; out vec2 vUv;
void main(){ vUv = position.xy*0.5+0.5; gl_Position = vec4(position.xy,0.0,1.0); }`;

function fsMat(frag, uniforms, extra = {}) {
  return new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: FS_VERT,
    fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, ...extra });
}

const COMPOSITE = `
precision highp float;
uniform sampler2D tNorm, tData;
uniform vec2 uTexel;
uniform float uCross;          // 1: symmetric 2px lines (hi-dpi), 0: one-sided 1px
uniform mat4 uInvProj, uCamWorld;
uniform float uEdges, uMatEdges, uPaper, uTime, uSweep, uFront, uDim, uHaze;
uniform vec3 uLamp; uniform vec2 uBattery, uAxis; uniform vec3 uLightV;
uniform float uFogNear, uFogFar, uGrid, uPixK, uLift, uBlue; uniform vec4 uSheet;
in vec2 vUv; out vec4 outColor;

vec4 N(vec2 o){ return texture(tNorm, vUv + o*uTexel); }
vec4 D(vec2 o){ vec4 d = texture(tData, vUv + o*uTexel); d.r *= 1000.0; return d; }   // depth stored in km (half-float range)
const vec3 INK = vec3(0.925,0.922,0.902);

float gridLine(float v, float fw, float w){ float d = abs(fract(v+0.5)-0.5); return 1.0 - smoothstep(w*fw, (w+1.0)*fw, d); }

void main(){
  vec4 nc = N(vec2(0)), dc = D(vec2(0));
  float mat = floor(nc.a + 0.5);
  vec4 r4 = uInvProj * vec4(vUv*2.0-1.0, 1.0, 1.0);
  vec3 rv = normalize(r4.xyz / r4.w);
  vec3 rw = mat3(uCamWorld) * rv;

  // ---- background: black, with a faint luminous haze band at the horizon
  float hz = exp(-abs(rw.y)*9.0);
  vec3 inkC = mix(INK, vec3(0.74, 0.87, 1.0), uBlue), faceC = mix(INK, vec3(0.36, 0.56, 1.0), uBlue);
  vec3 skyC = vec3(0.004, 0.011, 0.024) * uBlue;
  vec3 col = skyC + inkC * (hz*0.05*uHaze);
  if(mat < 0.5){ outColor = vec4(col,1.0); return; }

  float depth = dc.r;
  vec3 vp = rv * (depth / max(1e-4, -rv.z));
  vec3 wp = (uCamWorld * vec4(vp,1.0)).xyz;
  vec3 n = normalize(nc.rgb);
  float fog = smoothstep(uFogNear, uFogFar, depth);
  float keyv = dot(wp.xz - uBattery, uAxis);

  // ---- edges
  vec2 o1 = vec2(1,0), o2 = vec2(0,1);
  vec4 nr = N(o1), nu = N(o2), nl = N(-o1), nd = N(-o2);
  vec4 dr = D(o1), du = D(o2), dl = D(-o1), dd = D(-o2);
  float far = 1e6;
  float zr = nr.a < .5 ? far : dr.r, zu = nu.a < .5 ? far : du.r, zl = nl.a < .5 ? far : dl.r, zd = nd.a < .5 ? far : dd.r;
  float z = depth;
  // second difference: zero on any plane however oblique, large at silhouettes
  float ddx = uCross > .5 ? abs(zl + zr - 2.0*z) : abs(zr - z)*1.2;
  float ddy = uCross > .5 ? abs(zd + zu - 2.0*z) : abs(zu - z)*1.2;
  float eDepth = smoothstep(0.018, 0.06, max(ddx,ddy) / z);
  float eNorm = 0.0;
  eNorm = max(eNorm, 1.0 - dot(n, normalize(nr.rgb + 1e-5)));
  eNorm = max(eNorm, 1.0 - dot(n, normalize(nu.rgb + 1e-5)));
  if(uCross > .5){ eNorm = max(eNorm, 1.0 - dot(n, normalize(nl.rgb + 1e-5))); eNorm = max(eNorm, 1.0 - dot(n, normalize(nd.rgb + 1e-5))); }
  eNorm = smoothstep(0.10, 0.30, eNorm);
  // party walls / lot lines: neighbouring buildings with different ids
  float eId = 0.0;
  if(mat > .5 && mat < 1.5){
    float idc = dc.g;
    if(nr.a > .5 && nr.a < 1.5 && abs(dr.g - idc) > 1e-3 && abs(dr.r - z) < z*0.01) eId = 1.0;
    if(nu.a > .5 && nu.a < 1.5 && abs(du.g - idc) > 1e-3 && abs(du.r - z) < z*0.01) eId = 1.0;
  }
  // material boundaries: coastline (land/water), lawns, forest
  float eMat = 0.0;
  float mr = floor(nr.a+.5), mu = floor(nu.a+.5);
  if(mr > .5 && mr != mat) eMat = 1.0;
  if(mu > .5 && mu != mat) eMat = 1.0;
  bool flatPair = (mat >= 2.0 && mat <= 5.0);
  float wMat = flatPair ? 0.85 : 0.0;

  float isBld = (mat > .5 && mat < 1.5) || mat > 6.5 ? 1.0 : 0.0;
  float isPen = step(7.5, mat);
  // level of detail for the line work, like an engraver simplifying the
  // distance: lot lines go first, then creases; silhouettes stay longest
  float pixM = z * uPixK;                       // metres covered by one pixel here
  eId *= 1.0 - smoothstep(0.7, 1.8, pixM);
  eNorm *= 1.0 - 0.6*smoothstep(1.6, 5.0, pixM);
  eDepth *= 1.0 - 0.45*smoothstep(3.0, 10.0, pixM);
  float e = max(eDepth, eNorm*0.8);
  e = max(e, eId*0.55*isBld);
  e *= uEdges;
  // the forest canopy is texture, not structure: its outlines stay a mid-tone
  if(mat > 5.5 && mat < 6.5) e *= 0.34;
  e = max(e, eMat * wMat * uMatEdges);
  // lines thin out with distance like an engraver's burin: far detail
  // becomes tone, near detail stays crisp
  float lift = smoothstep(18.0, 260.0, wp.y) * uLift;
  float lineA = e * mix(1.0, 0.36, fog) * (0.92 + 0.7*lift*isBld*(1.0 - isPen) + 0.05*(1.0 - isBld) + 0.35*isPen);

  // ---- surfaces: near-black; the form is carried by light at the rim
  float facing = clamp(n.z, 0.0, 1.0);
  float lam = max(dot(n, uLightV), 0.0);
  float rim = pow(1.0 - facing, 3.0);
  float surf = 0.0;
  if(mat < 1.5 || mat > 6.5) surf = 0.018 + 0.050*lam + 0.085*rim + 0.045*lift;   // buildings, structures
  else if(mat < 2.5) surf = 0.010;                                     // land
  else if(mat < 3.5) surf = 0.004;                                     // water
  else if(mat < 4.5) surf = 0.016;                                     // lawn
  else if(mat < 5.5) surf = 0.010;                                     // forest floor
  else surf = 0.010 + 0.03*lam + 0.035*rim;                           // tree canopy
  surf *= mix(1.0, 0.35, fog);
  float ink = dc.b * mix(1.0, 0.25, fog);
  if(mat >= 2.0 && mat <= 5.0) ink *= 1.0 - uPaper;

  // ---- the drafting sheet: before the city rises the ground IS the paper,
  // lit by the lamp that follows the pen, with its construction grid
  float ground = (mat >= 2.0 && mat <= 5.0) ? 1.0 : 0.0;
  // the blueprint: a deep cyanotype sheet under a lamp, its fine and bold
  // construction grid in pale blue, the ink in blue-white
  vec3 sheetCol = vec3(0.0); float sheetK = 0.0, onSheet = 0.0;
  if(ground > 0.5 && (uPaper > 0.0 || uBlue > 0.0)){
    float dl2 = length(wp.xz - uLamp.xz);
    float pool = exp(-dl2*dl2/(uLamp.y*uLamp.y));
    float wide = exp(-dl2/(uLamp.y*6.0));
    float pixW = max(1e-3, z * uPixK / max(abs(rw.y), 0.03));   // metres per pixel on the ground
    vec2 g = wp.xz / 100.0; vec2 fw = vec2(pixW / 100.0);
    float minor = max(gridLine(g.x, fw.x, 0.6), gridLine(g.y, fw.y, 0.6)) * (1.0 - smoothstep(0.08, 0.3, max(fw.x,fw.y)));
    vec2 g5 = wp.xz / 500.0; vec2 fw5 = vec2(pixW / 500.0);
    float major = max(gridLine(g5.x, fw5.x, 0.8), gridLine(g5.y, fw5.y, 0.8)) * (1.0 - smoothstep(0.1, 0.4, max(fw5.x,fw5.y)));
    // paper fibre: a faint, large-scale mottling
    vec2 pf = wp.xz / 900.0;
    float fib = fract(sin(dot(floor(pf), vec2(12.9898, 78.233))) * 43758.5453) * 0.5 + 0.5 * fract(sin(dot(floor(pf * 3.1), vec2(39.3, 11.7))) * 23421.631);
    vec3 blue = vec3(0.020, 0.058, 0.118) * (0.62 + 0.10 * fib) + vec3(0.030, 0.070, 0.120) * (0.9 * pool + 0.35 * wide);
    blue += vec3(0.16, 0.30, 0.46) * (minor * 0.09 + major * 0.17) * uGrid * (0.45 + 0.55 * pool);
    // the sheet has edges: beyond them, the dark desk it lies on
    vec2 e0 = wp.xz - uSheet.xy, e1 = uSheet.zw - wp.xz;
    float edge = min(min(e0.x, e0.y), min(e1.x, e1.y));
    onSheet = uSheet.z > uSheet.x ? smoothstep(-40.0, 40.0, edge) : 1.0;
    sheetCol = mix(vec3(0.003, 0.005, 0.009) * (1.0 + 2.0 * pool), blue, onSheet);
    sheetK = max(uPaper, uBlue);
  }

  float lum = surf + lineA + ink*0.55;
  // a landmark's light scan (glow channel): the band itself, and the lines it lights
  lum += dc.a * (0.10 + 1.4 * lineA + 0.5 * ink);

  // ---- light: the build front (a bright seam where the city is rising)
  // and the finishing sweep that "inks" the finished drawing
  float front = exp(-pow((keyv - uFront)/160.0, 2.0));
  float wet = smoothstep(uFront + 80.0, uFront - 1400.0, keyv) * smoothstep(uFront - 2600.0, uFront - 900.0, keyv) * step(-1e8, uFront);
  lum += front * (0.16*ground + 1.1*lineA + 0.10*isBld) + wet * lineA * 0.55 * isBld;
  float sweep = exp(-pow((keyv - uSweep)/320.0, 2.0));
  float trail = smoothstep(uSweep + 50.0, uSweep - 900.0, keyv) * step(-1e8, uSweep);
  lum += sweep * (lineA*1.6 + 0.16*isBld*(0.4 + lift) + 0.05*ground) + trail * lineA * 0.12;

  lum *= uDim;
  // faces take a deep blue, everything drawn (lines, engraving, light) the ink's blue-white
  float drawn = max(0.0, lum - surf * uDim);
  vec3 haze = col;
  col = faceC * surf * uDim + inkC * drawn + haze * (0.35 + 0.65*fog);   // aerial perspective
  col += vec3(0.006, 0.016, 0.036) * uBlue * isBld * (1.0 - fog);
  // tree canopies: the sheet's own blue, drawn in outline, never black holes
  if(mat > 5.5 && mat < 6.5) col += vec3(0.013, 0.036, 0.074) * uBlue * (0.8 + 0.6 * lam) * (1.0 - fog);
  if(sheetK > 0.0){
    // the ground stays the blueprint sheet under the risen city; water a
    // shade deeper than land, the drawing in blue-white, far away the haze
    float wet2 = (mat > 2.5 && mat < 3.5) ? 0.72 : 1.0;
    vec3 bp = sheetCol * wet2 + inkC * drawn * mix(1.0, onSheet, uPaper);
    bp = mix(bp, haze + skyC * 1.5, fog * 0.85);
    col = mix(col, bp, sheetK);
  }
  if(any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
  outColor = vec4(col, 1.0);
}`;

const BRIGHT = `
precision highp float;
uniform sampler2D tSrc; uniform float uThresh; in vec2 vUv; out vec4 outColor;
void main(){ vec3 c = texture(tSrc, vUv).rgb; if(any(isnan(c)) || any(isinf(c))) c = vec3(0.0); c = min(c, vec3(8.0)); float l = max(max(c.r,c.g),c.b);
  outColor = vec4(c * smoothstep(uThresh, uThresh + 0.35, l), 1.0); }`;

const BLUR = `
precision highp float;
uniform sampler2D tSrc; uniform vec2 uDir; in vec2 vUv; out vec4 outColor;
void main(){
  vec3 s = texture(tSrc, vUv).rgb * 0.2270270;
  s += (texture(tSrc, vUv + uDir*1.3846154).rgb + texture(tSrc, vUv - uDir*1.3846154).rgb) * 0.3162162;
  s += (texture(tSrc, vUv + uDir*3.2307692).rgb + texture(tSrc, vUv - uDir*3.2307692).rgb) * 0.0702703;
  outColor = vec4(s, 1.0); }`;

// FXAA (after Lottes): the edge filter produces hard 1px lines; this is
// what keeps them from stair-stepping on 1x screens
const FXAA = `
precision highp float;
uniform sampler2D tSrc; uniform vec2 uTexel; in vec2 vUv; out vec4 outColor;
float lu(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
void main(){
  vec3 nw = texture(tSrc, vUv + vec2(-1.0, -1.0) * uTexel).rgb, ne = texture(tSrc, vUv + vec2(1.0, -1.0) * uTexel).rgb;
  vec3 sw = texture(tSrc, vUv + vec2(-1.0, 1.0) * uTexel).rgb, se = texture(tSrc, vUv + vec2(1.0, 1.0) * uTexel).rgb;
  vec3 m = texture(tSrc, vUv).rgb;
  float lNW = lu(nw), lNE = lu(ne), lSW = lu(sw), lSE = lu(se), lM = lu(m);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
  float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
  float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
  dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * uTexel;
  vec3 a = 0.5 * (texture(tSrc, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture(tSrc, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 b = a * 0.5 + 0.25 * (texture(tSrc, vUv - dir * 0.5).rgb + texture(tSrc, vUv + dir * 0.5).rgb);
  float lb = lu(b);
  outColor = vec4((lb < lMin || lb > lMax) ? a : b, 1.0);
}`;

// depth of field: a scatter-as-gather disc blur driven by the G-buffer's
// linear depth — the lens a cinematographer would use to isolate a subject
const DOF = `
precision highp float;
uniform sampler2D tSrc, tData; uniform vec2 uTexel; uniform float uFocus, uAperture, uMaxR;
in vec2 vUv; out vec4 outColor;
float dz(vec2 uv){ float d = texture(tData, uv).r * 1000.0; return d <= 0.0 ? uFocus : d; }
float coc(float d){ return min(uMaxR, abs(d - uFocus) / max(d, 1.0) * uAperture); }
void main(){
  float cc = coc(dz(vUv));
  vec3 c0 = texture(tSrc, vUv).rgb;
  if(cc < 0.6){ outColor = vec4(c0, 1.0); return; }
  vec3 acc = c0; float ws = 1.0;
  for(int i = 0; i < 20; i++){
    float fi = float(i) + 0.5;
    float r = sqrt(fi / 20.0) * cc, a = fi * 2.39996;
    vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
    float cs = coc(dz(uv));
    float w = smoothstep(r - 1.5, r + 0.5, max(cs, cc * 0.5));
    acc += texture(tSrc, uv).rgb * w; ws += w;
  }
  outColor = vec4(acc / ws, 1.0);
}`;

const FINAL = `
precision highp float;
uniform sampler2D tBase, tB1, tB2, tB3; uniform vec2 uRes; uniform float uTime, uBloom, uVig, uGrain, uCA, uFlash, uBlack;
in vec2 vUv; out vec4 outColor;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec2 d = vUv - 0.5; float r2 = dot(d,d);
  float ca = uCA * (0.4 + r2*3.0);
  vec3 base;
  base.r = texture(tBase, vUv + d*ca).r; base.g = texture(tBase, vUv).g; base.b = texture(tBase, vUv - d*ca).b;
  vec3 bloom = texture(tB1, vUv).rgb*0.55 + texture(tB2, vUv).rgb*0.8 + texture(tB3, vUv).rgb*1.1;
  vec3 col = base + bloom*uBloom;
  col = max(col - 0.005, 0.0) * 1.02;              // a light crush: the void stays deep blue-black
  col = col / (1.0 + col*0.16);                     // gentle shoulder: bright lines never clip hard
  col *= 1.0 - uVig * smoothstep(0.12, 0.95, r2*2.2);
  float n = hash(vUv*uRes + fract(uTime)*vec2(113.1, 71.7));
  float l = dot(col, vec3(0.299,0.587,0.114));
  col += (n - 0.5) * uGrain * (1.0 - 0.6*clamp(l,0.0,1.0));
  col = mix(col, vec3(1.0), uFlash);
  col *= 1.0 - uBlack;
  outColor = vec4(max(col, 0.0), 1.0);
}`;

export class Pipeline {
  constructor(renderer) {
    this.r = renderer;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.qScene = new THREE.Scene(); this.qScene.add(this.quad);
    this.qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.w = this.h = 1;
    const U = (v) => ({ value: v });
    this.comp = fsMat(COMPOSITE, {
      tNorm: U(null), tData: U(null), uTexel: U(new THREE.Vector2()), uCross: U(1),
      uInvProj: U(new THREE.Matrix4()), uCamWorld: U(new THREE.Matrix4()),
      uEdges: U(1), uMatEdges: U(1), uPaper: U(1), uTime: U(0), uSweep: U(-1e9), uFront: U(-1e9), uDim: U(1), uHaze: U(1),
      uLamp: U(new THREE.Vector3(0, 400, 0)), uBattery: U(new THREE.Vector2()), uAxis: U(new THREE.Vector2(0, -1)),
      uLightV: U(new THREE.Vector3(0, 1, 0)), uFogNear: U(2000), uFogFar: U(12000), uGrid: U(1), uPixK: U(0.001), uLift: U(1), uBlue: U(1), uSheet: U(new THREE.Vector4(0, 0, -1, -1)),
    });
    this.bright = fsMat(BRIGHT, { tSrc: U(null), uThresh: U(0.62) });
    this.blur = fsMat(BLUR, { tSrc: U(null), uDir: U(new THREE.Vector2()) });
    this.final = fsMat(FINAL, { tBase: U(null), tB1: U(null), tB2: U(null), tB3: U(null), uRes: U(new THREE.Vector2()),
      uTime: U(0), uBloom: U(0.9), uVig: U(0.85), uGrain: U(0.045), uCA: U(0.0), uFlash: U(0), uBlack: U(0) });
    this.fxaa = fsMat(FXAA, { tSrc: U(null), uTexel: U(new THREE.Vector2()) });
    this.dof = fsMat(DOF, { tSrc: U(null), tData: U(null), uTexel: U(new THREE.Vector2()), uFocus: U(300), uAperture: U(0), uMaxR: U(10) });
    this.lightW = new THREE.Vector3(0.35, 0.8, 0.45).normalize();
  }
  rt(w, h, opts = {}) {
    return new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: false, stencilBuffer: false, ...opts });
  }
  setSize(w, h, dpr) {
    if (this.w === w && this.h === h && this.dpr === dpr) return;
    this.w = w; this.h = h; this.dpr = dpr;
    [this.g, this.c, this.f, this.b0, this.b0b, this.b1, this.b1b, this.b2, this.b2b].forEach((t) => t && t.dispose());
    this.g = this.rt(w, h, { count: 2, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    this.c = this.rt(w, h); this.f = this.rt(w, h);
    this.fxaa.uniforms.uTexel.value.set(1 / w, 1 / h); this.dof.uniforms.uTexel.value.set(1 / w, 1 / h);
    this.dof.uniforms.uMaxR.value = 9 * dpr;
    const s = (k) => [Math.max(1, w >> k), Math.max(1, h >> k)];
    this.b0 = this.rt(...s(1)); this.b0b = this.rt(...s(1));
    this.b1 = this.rt(...s(2)); this.b1b = this.rt(...s(2));
    this.b2 = this.rt(...s(3)); this.b2b = this.rt(...s(3));
    this.comp.uniforms.uTexel.value.set(1 / w, 1 / h);
    this.comp.uniforms.uCross.value = dpr >= 1.4 ? 1 : 0;
    this.final.uniforms.uRes.value.set(w, h);
  }
  pass(mat, target) {
    this.quad.material = mat; this.r.setRenderTarget(target || null); this.r.render(this.qScene, this.qCam);
  }
  blurTo(src, tmp, dst, radius) {
    this.blur.uniforms.tSrc.value = src.texture; this.blur.uniforms.uDir.value.set(radius / src.width, 0); this.pass(this.blur, tmp);
    this.blur.uniforms.tSrc.value = tmp.texture; this.blur.uniforms.uDir.value.set(0, radius / src.height); this.pass(this.blur, dst);
  }
  // scene: G-buffer scene; ink: optional forward overlay (drawn onto the
  // composite with additive blending, reading the G-buffer for occlusion)
  // optional GPU timing (debug): one timer query per pass
  _q(name) {
    const P = this.prof; if (!P) return;
    const gl = this.r.getContext();
    if (P.open) { gl.endQuery(P.ext.TIME_ELAPSED_EXT); P.open = false; }
    if (name) { const q = gl.createQuery(); gl.beginQuery(P.ext.TIME_ELAPSED_EXT, q); P.list.push([name, q]); P.open = true; }
  }
  render(scene, camera, inkScene, t) {
    const r = this.r;
    this._q('gbuffer');
    r.setRenderTarget(this.g); r.setClearColor(0x000000, 0); r.clear(true, true, false);
    r.render(scene, camera);
    const cu = this.comp.uniforms;
    cu.tNorm.value = this.g.textures[0]; cu.tData.value = this.g.textures[1];
    cu.uInvProj.value.copy(camera.projectionMatrixInverse);
    cu.uCamWorld.value.copy(camera.matrixWorld);
    cu.uLightV.value.copy(this.lightW).transformDirection(camera.matrixWorldInverse);
    cu.uTime.value = t;
    cu.uPixK.value = 2 * Math.tan(camera.fov * Math.PI / 360) / this.h;
    this._q('composite');
    this.pass(this.comp, this.c);
    this._q('ink');
    if (inkScene) { r.autoClear = false; r.setRenderTarget(this.c); r.render(inkScene, camera); r.autoClear = true; }
    // anti-alias, then (when a lens is set) depth of field
    this._q('fxaa+dof');
    this.fxaa.uniforms.tSrc.value = this.c.texture; this.pass(this.fxaa, this.f);
    let img = this.f;
    if (this.dof.uniforms.uAperture.value > 0.01) {
      this.dof.uniforms.tSrc.value = this.f.texture; this.dof.uniforms.tData.value = this.g.textures[1];
      this.pass(this.dof, this.c); img = this.c;
    }
    this._q('bloom');
    this.bright.uniforms.tSrc.value = img.texture; this.pass(this.bright, this.b0);
    this.blurTo(this.b0, this.b0b, this.b0, 1.0);
    this.blur.uniforms.tSrc.value = this.b0.texture; this.blur.uniforms.uDir.value.set(0, 0); this.pass(this.blur, this.b1);
    this.blurTo(this.b1, this.b1b, this.b1, 1.3);
    this.blur.uniforms.tSrc.value = this.b1.texture; this.blur.uniforms.uDir.value.set(0, 0); this.pass(this.blur, this.b2);
    this.blurTo(this.b2, this.b2b, this.b2, 1.6);
    const fu = this.final.uniforms;
    fu.tBase.value = img.texture; fu.tB1.value = this.b0.texture; fu.tB2.value = this.b1.texture; fu.tB3.value = this.b2.texture;
    fu.uTime.value = t;
    this._q('final');
    this.pass(this.final, null);
    this._q(null);
  }
  dispose() {
    [this.g, this.c, this.f, this.b0, this.b0b, this.b1, this.b1b, this.b2, this.b2b].forEach((t) => t && t.dispose());
    [this.comp, this.bright, this.blur, this.final, this.fxaa, this.dof].forEach((m) => m.dispose());
    this.quad.geometry.dispose();
  }
}

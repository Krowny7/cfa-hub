// Petite bibliothèque de dessin « encre » : traits au pinceau à épaisseur variable,
// fibres de pinceau sec, éclaboussures, traits de crayon tremblés.
// Utilisée par scripts/ink/generate.cjs pour produire les tracés du site.

const f = (n) => n.toFixed(1);
function mulberry(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hexPts = (cx, cy, R) => Array.from({ length: 6 }, (_, i) => { const a = ((-90 + 60 * i) * Math.PI) / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
function chaikin(pts, it) { let p = pts; for (let k = 0; k < it; k++) { const q = []; const n = p.length; for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } p = q; } return p; }
function roundedHex(h, k = 0.15) { const out = []; for (let i = 0; i < 6; i++) { const v = h[i], p = h[(i + 5) % 6], n = h[(i + 1) % 6]; const a = [v[0] + (p[0] - v[0]) * k, v[1] + (p[1] - v[1]) * k], b = [v[0] + (n[0] - v[0]) * k, v[1] + (n[1] - v[1]) * k]; for (let s = 0; s <= 8; s++) { const t = s / 8; out.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * v[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * v[1] + t * t * b[1]]); } } return out; }
function ringPts(cx, cy, R) { const h = hexPts(cx, cy, R); const c = roundedHex(h); const i = c.findIndex((p) => p[1] === Math.min(...c.map((q) => q[1]))); return c.slice(i).concat(c.slice(0, i)); }
function circlePts(cx, cy, R, n = 90) { return Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; }); }
function sampler(pts) {
  const P = pts.concat([pts[0]]); const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const total = L[L.length - 1];
  return (t) => { const d = Math.max(0, Math.min(1, t)) * total; let i = 1; while (i < L.length - 1 && L[i] < d) i++; const a = P[i - 1], b = P[i]; const seg = L[i] - L[i - 1] || 1; const u = (d - L[i - 1]) / seg; return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, tx: (b[0] - a[0]) / seg, ty: (b[1] - a[1]) / seg }; };
}
const poly = (pts, close = true) => "M " + pts.map((q) => f(q[0]) + " " + f(q[1])).join(" L ") + (close ? " Z" : "");
function brush(pts, t0, t1, W, seed, o = {}) {
  const r = mulberry(seed), S = sampler(pts), N = o.n || 240, Lp = [], Rp = [], ph1 = r() * 6, ph2 = r() * 6;
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = S(t0 + (t1 - t0) * u), nx = -p.ty, ny = p.tx;
    const w = W * Math.pow(Math.min(1, u / (o.inT ?? 0.05)), 0.55) * Math.pow(Math.min(1, (1 - u) / (o.outT ?? 0.16)), 0.9) * (1 + (o.var ?? 0.12) * Math.sin(u * 17 + ph1) + (o.var ?? 0.12) * 0.6 * Math.sin(u * 41 + ph2));
    const off = (o.wobble ?? 1.2) * Math.sin(u * 9 + ph2);
    Lp.push([p.x + nx * (w / 2 + off), p.y + ny * (w / 2 + off)]); Rp.push([p.x - nx * (w / 2 - off), p.y - ny * (w / 2 - off)]);
  }
  return "M " + Lp.map((q) => f(q[0]) + " " + f(q[1])).join(" L ") + " L " + Rp.reverse().map((q) => f(q[0]) + " " + f(q[1])).join(" L ") + " Z";
}
function bristles(pts, t0, t1, W, seed, count) {
  const r = mulberry(seed), S = sampler(pts); let d = "";
  for (let k = 0; k < count; k++) {
    const o = (r() - 0.5) * W * 0.85, end = t1 - r() * 0.07; let t = t0 + r() * 0.02;
    while (t < end) {
      const te = Math.min(end, t + 0.015 + r() * 0.05), w = 0.7 + r() * 1.7, Lp = [], Rp = [];
      for (let i = 0; i <= 20; i++) { const p = S(t + ((te - t) * i) / 20), nx = -p.ty, ny = p.tx, prog = (t + ((te - t) * i) / 20 - t0) / (t1 - t0), oo = o * (1 - prog * 0.5), ww = w * Math.sin((Math.PI * i) / 20) * 0.5 + 0.25; Lp.push([p.x + nx * (oo + ww), p.y + ny * (oo + ww)]); Rp.push([p.x + nx * (oo - ww), p.y + ny * (oo - ww)]); }
      d += "M " + Lp.map((q) => f(q[0]) + " " + f(q[1])).join(" L ") + " L " + Rp.reverse().map((q) => f(q[0]) + " " + f(q[1])).join(" L ") + " Z ";
      t = te + 0.004 + r() * 0.03 * ((te - t0) / (t1 - t0));
    }
  }
  return d;
}
function centerline(pts, t0, t1, n = 120) { const S = sampler(pts); return poly(Array.from({ length: n + 1 }, (_, i) => { const p = S(t0 + ((t1 - t0) * i) / n); return [p.x, p.y]; }), false); }
function offsetLine(pts, t0, t1, off, r, j = 1.2, n = 90) { const S = sampler(pts); return poly(Array.from({ length: n + 1 }, (_, i) => { const p = S(t0 + ((t1 - t0) * i) / n); return [p.x - p.ty * off + (r() - 0.5) * j, p.y + p.tx * off + (r() - 0.5) * j]; }), false); }
function sk(a, b, r, { j = 1.5, bow = 2.5, over = 4, passes = 2 } = {}) {
  let d = "";
  for (let p = 0; p < passes; p++) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, o1 = over * (r() * 0.8 + 0.2), o2 = over * (r() * 0.8 + 0.2);
    const ax = a[0] - ux * o1 + (r() - 0.5) * j * 2, ay = a[1] - uy * o1 + (r() - 0.5) * j * 2, bx = b[0] + ux * o2 + (r() - 0.5) * j * 2, by = b[1] + uy * o2 + (r() - 0.5) * j * 2;
    const m = (r() - 0.5) * bow * 2 * Math.min(1, L / 120);
    d += "M " + f(ax) + " " + f(ay) + " Q " + f((ax + bx) / 2 - uy * m) + " " + f((ay + by) / 2 + ux * m) + " " + f(bx) + " " + f(by) + " ";
  }
  return d;
}
const skPoly = (pts, r, o, closed = true) => { let d = ""; const n = pts.length; for (let i = 0; i < (closed ? n : n - 1); i++) d += sk(pts[i], pts[(i + 1) % n], r, o); return d; };
function skEllipse(cx, cy, rx, ry, r, { passes = 2, j = 2, steps = 56 } = {}) {
  let d = "";
  for (let p = 0; p < passes; p++) { const st = r() * Math.PI * 2, ext = Math.PI * 2 * (1.04 + r() * 0.08), ph = r() * 6; let s = ""; for (let i = 0; i <= steps; i++) { const a = st + (ext * i) / steps, k = 1 + 0.015 * Math.sin(a * 3 + ph) + ((r() - 0.5) * j) / Math.max(rx, ry); s += (i ? " L " : "M ") + f(cx + rx * k * Math.cos(a)) + " " + f(cy + ry * k * Math.sin(a)); } d += s + " "; }
  return d;
}
function focus(cx, cy, rx, ry, n, R, seed, { minW = 1, maxW = 6, jit = 0.35 } = {}) {
  const r = mulberry(seed); let d = "";
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), k = 1 + r() * jit + (r() < 0.15 ? r() * 0.6 : 0), w = (minW + r() * (maxW - minW)) / 2; d += "M " + f(cx + ca * rx * k) + " " + f(cy + sa * ry * k) + " L " + f(cx + ca * R - sa * w) + " " + f(cy + sa * R + ca * w) + " L " + f(cx + ca * R + sa * w) + " " + f(cy + sa * R - ca * w) + " Z "; }
  return d;
}
function speed(x0, y0, x1, y1, n, seed) { const r = mulberry(seed); let d = ""; for (let i = 0; i < n; i++) { const y = y0 + r() * (y1 - y0), L = (x1 - x0) * (0.25 + r() * 0.7), xs = x0 + r() * (x1 - x0 - L), w = 0.6 + r() * 2.4; d += "M " + f(xs) + " " + f(y - w / 2) + " L " + f(xs + L) + " " + f(y) + " L " + f(xs) + " " + f(y + w / 2) + " Z "; } return d; }
function burst(cx, cy, rx, ry, n, seed, depth = 0.32) { const r = mulberry(seed); const p = []; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 + (r() - 0.5) * 0.1, k = i % 2 ? 1 - depth * (0.7 + r() * 0.6) : 1 + r() * 0.12; p.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); } return p; }
function bubble(cx, cy, rx, ry, ang, tip) { const pts = []; const gap = 0.16; for (let i = 0; i <= 80; i++) { const a = ang + gap + ((Math.PI * 2 - 2 * gap) * i) / 80; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } pts.push(tip); return pts; }
function splatter(cx, cy, n, spread, seed) { const r = mulberry(seed); let s = ""; for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = spread * (0.3 + r()), rr = 0.6 + r() * 2.2; s += `<circle cx="${f(cx + Math.cos(a) * d)}" cy="${f(cy + Math.sin(a) * d)}" r="${f(rr)}"></circle>`; } return s; }

module.exports = { f, mulberry, hexPts, roundedHex, ringPts, circlePts, sampler, poly, brush, bristles, centerline, offsetLine, sk, skPoly, skEllipse, focus, speed, burst, bubble, splatter };

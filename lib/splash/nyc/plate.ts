// @ts-nocheck
// The architect's plate, drawn as an engraved harbour chart on a cyanotype
// sheet: the map in a cartographic neatline (alternating minute bars,
// graticule, coordinates), its place names and soundings, and beside it a
// title cartouche, a west elevation of the skyline from the true heights,
// a compass rose with magnetic north, a legend and the survey notes.
// Every line is timed ink (class 8, fades with the paper); lettering goes
// through the glyph atlas.

const Y = 0.7;
const AXIS = [0.4848, -0.8746];
const lerp = (a, b, t) => a + (b - a) * t;

export class Plate {
  constructor(ink, glyphs, geo, bbox, aspect, t0) {
    this.ink = ink; this.gl = glyphs; this.geo = geo; this.t0 = t0;
    this.segs = [];
    const IN = 150, M = 1100;
    const F = { x0: bbox[0] + IN, z0: bbox[1] + IN, x1: bbox[2] - IN, z1: bbox[3] - IN };
    const fw = F.x1 - F.x0, fh = F.z1 - F.z0;
    let S, C;
    this.land = aspect >= 1;
    if (this.land) {
      const Hs = fh + 2 * M, Ws = Math.max(aspect * Hs, fw + 2 * M + 12000);
      S = { x0: F.x0 - M, z0: F.z0 - M, x1: F.x0 - M + Ws, z1: F.z1 + M };
      C = { x0: F.x1 + M * 1.5, z0: F.z0, x1: S.x1 - M, z1: F.z1 };
    } else {
      const Ws = fw + 2 * M, Hs = Math.max(Ws / aspect, fh + 2 * M + 9000);
      S = { x0: F.x0 - M, z0: F.z0 - M, x1: F.x1 + M, z1: F.z0 - M + Hs };
      C = { x0: F.x0, z0: F.z1 + M * 1.3, x1: F.x1, z1: S.z1 - M };
    }
    this.F = F; this.S = S; this.C = C;
    this.sheet(); this.neatline(); this.names(); this.column();
    this.flush();
  }

  // ---- primitives -------------------------------------------------------
  poly(pts, ta, tb, w = 1.0, a = 0.8) {
    let L = 0; const d = [0];
    for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); d.push(L); }
    for (let i = 0; i < pts.length - 1; i++) {
      const s0 = ta + (tb - ta) * d[i] / (L || 1), s1 = ta + (tb - ta) * d[i + 1] / (L || 1);
      this.segs.push([pts[i][0], Y, pts[i][1], pts[i + 1][0], Y, pts[i + 1][1], s0, Math.max(s0 + 0.001, s1), w, a]);
    }
  }
  line(x0, z0, x1, z1, ta, tb, w, a) { this.poly([[x0, z0], [x1, z1]], ta, tb, w, a); }
  rect(x0, z0, x1, z1, ta, tb, w, a) { this.poly([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]], ta, tb, w, a); }
  circle(cx, cz, r, ta, tb, w, a, n = 64) { const p = []; for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2; p.push([cx + Math.cos(t) * r, cz + Math.sin(t) * r]); } this.poly(p, ta, tb, w, a); }
  // a solid bar, engraved as close parallel lines
  bar(x0, z0, x1, z1, ta, tb, a = 0.8) {
    const horiz = Math.abs(x1 - x0) >= Math.abs(z1 - z0), n = 4;
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      if (horiz) this.line(x0, lerp(z0, z1, f), x1, lerp(z0, z1, f), ta, tb, 0.9, a);
      else this.line(lerp(x0, x1, f), z0, lerp(x0, x1, f), z1, ta, tb, 0.9, a);
    }
  }
  text(s, x, z, h, ta, dur, o = {}) { this.gl.add(s, x, z, o.ux ?? 1, o.uz ?? 0, h, ta, dur, o); }
  flush() { if (this.segs.length) this.ink.addSegs(this.segs, 8); this.segs = []; }

  // ---- the sheet: border, trim marks ------------------------------------
  sheet() {
    const { S, t0 } = this;
    this.rect(S.x0 + 260, S.z0 + 260, S.x1 - 260, S.z1 - 260, t0, t0 + 0.5, 0.8, 0.4);
    for (const [cx, cz] of [[S.x0 + 600, S.z0 + 600], [S.x1 - 600, S.z0 + 600], [S.x1 - 600, S.z1 - 600], [S.x0 + 600, S.z1 - 600]]) {
      this.line(cx - 200, cz, cx + 200, cz, t0 + 0.1, t0 + 0.2, 0.8, 0.5);
      this.line(cx, cz - 200, cx, cz + 200, t0 + 0.1, t0 + 0.2, 0.8, 0.5);
      this.circle(cx, cz, 110, t0 + 0.15, t0 + 0.3, 0.7, 0.45, 20);
    }
  }

  // ---- the map frame: neatline, minute bars, graticule, coordinates -----
  neatline() {
    const { F, geo, t0 } = this, B = 170;
    this.rect(F.x0 - B, F.z0 - B, F.x1 + B, F.z1 + B, t0 + 0.05, t0 + 0.5, 1.7, 0.95);
    this.rect(F.x0, F.z0, F.x1, F.z1, t0 + 0.1, t0 + 0.55, 0.9, 0.7);
    const zOf = (m) => geo(40 + m / 60, -74).z, xOf = (m) => geo(40.76, -74 + m / 60).x;
    // minute bars along the frame, alternating
    for (let m = 40, k = 0; m <= 54; m++, k++) {
      const za = Math.min(F.z1, Math.max(F.z0, zOf(m))), zb = Math.min(F.z1, Math.max(F.z0, zOf(m + 1)));
      if (za - zb < 20 || k % 2) continue;
      const ta = t0 + 0.35 + k * 0.025;
      this.bar(F.x0 - B, zb, F.x0, za, ta, ta + 0.1); this.bar(F.x1, zb, F.x1 + B, za, ta, ta + 0.1);
    }
    for (let m = -4, k = 0; m <= 7; m++, k++) {
      const xa = Math.min(F.x1, Math.max(F.x0, xOf(m))), xb = Math.min(F.x1, Math.max(F.x0, xOf(m + 1)));
      if (xb - xa < 20 || k % 2) continue;
      const ta = t0 + 0.35 + k * 0.025;
      this.bar(xa, F.z0 - B, xb, F.z0, ta, ta + 0.1); this.bar(xa, F.z1, xb, F.z1 + B, ta, ta + 0.1);
    }
    // graticule every 2′, faint, the figures outside the frame
    const lh = 230;
    for (let m = 40; m <= 54; m += 2) {
      const z = zOf(m); if (z <= F.z0 + 300 || z >= F.z1 - 300) continue;
      const ta = t0 + 0.5 + (m - 40) * 0.02;
      this.line(F.x0, z, F.x1, z, ta, ta + 0.35, 0.7, 0.22);
      const lab = `40°${String(m).padStart(2, '0')}′N`;
      this.text(lab, F.x0 - B - 160, z + lh / 2, lh, ta, 0.2, { align: 1, a: 0.85 });
      this.text(lab, F.x1 + B + 160, z + lh / 2, lh, ta, 0.2, { align: 0, a: 0.85 });
    }
    for (let m = -4; m <= 7; m += 2) {
      const x = xOf(m); if (x <= F.x0 + 300 || x >= F.x1 - 300) continue;
      const ta = t0 + 0.5 + (m + 4) * 0.02;
      this.line(x, F.z0, x, F.z1, ta, ta + 0.35, 0.7, 0.22);
      const L = 74 - m / 60, deg = Math.floor(L + 1e-9), mn = Math.round((L - deg) * 60);
      const lab = `${deg}°${String(mn).padStart(2, '0')}′W`;
      this.text(lab, x, F.z0 - B - 200, lh, ta, 0.2, { align: 0.5, a: 0.85 });
      this.text(lab, x, F.z1 + B + 200 + lh, lh, ta, 0.2, { align: 0.5, a: 0.85 });
    }
  }

  // ---- toponymy: waters in italic, lands upright, letter-spaced ---------
  names() {
    const { geo } = this, T0 = this.t0 + 0.1;
    const AX = { ux: AXIS[0], uz: AXIS[1] };
    const L = [
      ['MANHATTAN', 40.752, -73.985, 560, 1.1, 0.62, AX, false],
      ['HUDSON RIVER', 40.776, -74.008, 300, 0.6, 0.95, AX, true],
      ['EAST RIVER', 40.735, -73.9665, 220, 0.45, 0.95, AX, true],
      ['HARLEM RIVER', 40.828, -73.934, 180, 0.3, 1, { ux: -0.26, uz: -0.97 }, true],
      ['UPPER BAY', 40.6875, -74.030, 190, 0.5, 0.95, null, true],
      ['NEW JERSEY', 40.806, -74.041, 400, 0.7, 0.75, null, false],
      ['BROOKLYN', 40.692, -73.957, 400, 0.7, 0.75, null, false],
      ['QUEENS', 40.755, -73.925, 400, 0.7, 0.75, null, false],
      ['THE BRONX', 40.852, -73.928, 340, 0.6, 0.75, null, false],
      ['HOBOKEN', 40.745, -74.034, 250, 0.3, 1, null, false],
      ['JERSEY CITY', 40.722, -74.044, 250, 0.3, 1, null, false],
      ['WEEHAWKEN', 40.769, -74.033, 230, 0.3, 1, null, false],
      ['L.I. CITY', 40.7445, -73.944, 230, 0.3, 1, null, false],
      ['WILLIAMSBURG', 40.713, -73.953, 230, 0.3, 1, null, false],
      ['HARLEM', 40.811, -73.947, 250, 0.4, 1, null, false],
      ['CENTRAL PARK', 40.781, -73.966, 190, 0.35, 1, AX, false],
      ['ROOSEVELT I.', 40.7625, -73.9505, 90, 0.15, 0.95, AX, false],
      ['GOVERNORS I.', 40.6918, -74.0165, 100, 0.15, 0.95, null, false],
      ['LIBERTY I.', 40.6918, -74.0460, 95, 0.15, 0.95, null, false],
      ['ELLIS I.', 40.7015, -74.0396, 90, 0.15, 0.95, null, false],
      ['RANDALLS I.', 40.7935, -73.9215, 95, 0.15, 0.95, null, false],
    ];
    L.forEach(([s, lat, lon, h, track, a, dir, it], i) => {
      const p = geo(lat, lon), d = dir || { ux: 1, uz: 0 };
      const ta = T0 + 0.07 * i, dur = 0.25 + s.length * 0.02;
      this.text(s, p.x, p.z, h, ta, dur, { ...d, a, italic: it, track, align: 0.5 });
    });
  }
  soundings(snd) {
    if (!snd || !snd.length) return;
    const n = snd.length / 3, T0 = this.t0 - 2.2;
    for (let i = 0; i < n; i++) {
      const x = snd[i * 3], z = snd[i * 3 + 1], d = snd[i * 3 + 2];
      const h = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
      this.text(String(Math.round(d)), x, z, 105, T0 + h * 1.8, 0.05, { italic: true, a: 0.7, align: 0.5 });
    }
  }

  // ---- the column: cartouche, elevation, rose, legend, notes, scale -----
  column() {
    const { C, t0 } = this, cw = C.x1 - C.x0, ch = C.z1 - C.z0;
    if (this.land) {
      this.cartouche({ x0: C.x0, z0: C.z0, x1: C.x1, z1: C.z0 + ch * 0.25 }, t0 + 0.55);
      this.E = { x0: C.x0 + 1300, x1: C.x1 - 200, z0: C.z0 + ch * 0.35, z1: C.z0 + ch * 0.60 };
      this.elevationFrame(t0 + 0.8);
      const bz0 = C.z0 + ch * 0.70, bh = C.z1 - bz0;
      const r = Math.min(bh * 0.38, cw * 0.13);
      this.rose(C.x0 + r * 1.3, bz0 + bh * 0.47, r, t0 + 0.7);
      this.legend({ x0: C.x0 + r * 2.9, z0: bz0, x1: C.x0 + cw * 0.62, z1: C.z1 }, t0 + 0.85);
      this.notes({ x0: C.x0 + cw * 0.67, z0: bz0, x1: C.x1, z1: C.z1 }, t0 + 0.95);
    } else {
      const kz1 = C.z0 + ch * 0.42;
      this.cartouche({ x0: C.x0, z0: C.z0, x1: C.x1, z1: kz1 }, t0 + 0.55);
      const bz0 = kz1 + ch * 0.07, bh = C.z1 - bz0;
      const r = Math.min(bh * 0.4, cw * 0.19);
      this.rose(C.x0 + r * 1.25, bz0 + bh * 0.5, r, t0 + 0.7);
      this.legend({ x0: C.x0 + r * 2.7, z0: bz0, x1: C.x1, z1: C.z1 }, t0 + 0.85);
    }
  }
  cartouche(K, ta) {
    const w = K.x1 - K.x0, h = K.z1 - K.z0;
    this.rect(K.x0, K.z0, K.x1, K.z1, ta, ta + 0.4, 1.6, 0.9);
    this.rect(K.x0 + 140, K.z0 + 140, K.x1 - 140, K.z1 - 140, ta + 0.05, ta + 0.45, 0.8, 0.6);
    const pad = w * 0.045, th = Math.min(h * 0.26, w * 0.1);
    this.ink.addLabel('RANKED LOBBY', K.x0 + pad, K.z0 + h * 0.25, 1, 0, th, ta + 0.35, 0.6, 0.82, 'Anton');
    const r1 = K.z0 + h * 0.58, r2 = K.z0 + h * 0.79;
    this.line(K.x0 + 140, r1, K.x1 - 140, r1, ta + 0.3, ta + 0.5, 0.9, 0.7);
    this.line(K.x0 + 140, r2, K.x1 - 140, r2, ta + 0.35, ta + 0.55, 0.9, 0.7);
    this.line(K.x0 + w * 0.62, r1, K.x0 + w * 0.62, K.z1 - 140, ta + 0.4, ta + 0.55, 0.9, 0.7);
    const sh = Math.min(h * 0.075, w * 0.022);
    this.text('MANHATTAN · NEW YORK', K.x0 + pad, r1 - h * 0.075, sh * 1.3, ta + 0.5, 0.5, { track: 0.35, a: 0.95 });
    this.text('PLAN D’ENSEMBLE', K.x0 + pad, r2 - h * 0.065, sh, ta + 0.6, 0.4, { track: 0.25, a: 0.85 });
    this.text('PLANCHE 01 / 01', K.x0 + w * 0.62 + pad * 0.6, r2 - h * 0.065, sh, ta + 0.62, 0.4, { track: 0.2, a: 0.85 });
    this.text('40°41′–40°53′ N · 73°54′–74°04′ W', K.x0 + pad, K.z1 - h * 0.065, sh * 0.85, ta + 0.7, 0.5, { track: 0.1, a: 0.75 });
    this.text('SEPT. 2026', K.x0 + w * 0.62 + pad * 0.6, K.z1 - h * 0.065, sh * 0.85, ta + 0.72, 0.3, { track: 0.2, a: 0.75 });
  }
  // compass rose: degree ring, sixteen-point star half-hatched, cardinal
  // letters, and the magnetic north arrow with its declination
  rose(cx, cz, R, ta) {
    this.circle(cx, cz, R, ta, ta + 0.35, 1.1, 0.85);
    this.circle(cx, cz, R * 0.9, ta + 0.05, ta + 0.4, 0.8, 0.7);
    for (let d = 0; d < 360; d += 5) {
      const a = (d - 90) * Math.PI / 180, l = d % 30 === 0 ? 0.1 : (d % 10 === 0 ? 0.06 : 0.035);
      const tt = ta + 0.2 + d / 360 * 0.3;
      this.line(cx + Math.cos(a) * R * 0.9, cz + Math.sin(a) * R * 0.9, cx + Math.cos(a) * R * (0.9 + l), cz + Math.sin(a) * R * (0.9 + l), tt, tt + 0.05, 0.8, 0.7);
    }
    const pts = [[0, 0.8], [90, 0.8], [180, 0.8], [270, 0.8], [45, 0.5], [135, 0.5], [225, 0.5], [315, 0.5],
                 [22.5, 0.32], [67.5, 0.32], [112.5, 0.32], [157.5, 0.32], [202.5, 0.32], [247.5, 0.32], [292.5, 0.32], [337.5, 0.32]];
    pts.forEach(([d, L], i) => {
      const a = (d - 90) * Math.PI / 180, w = (L > 0.6 ? 0.08 : (L > 0.4 ? 0.06 : 0.04)) * R;
      const tip = [cx + Math.cos(a) * R * L, cz + Math.sin(a) * R * L];
      const pl = [cx + Math.cos(a - Math.PI / 2) * w, cz + Math.sin(a - Math.PI / 2) * w];
      const pr = [cx + Math.cos(a + Math.PI / 2) * w, cz + Math.sin(a + Math.PI / 2) * w];
      const tt = ta + 0.35 + i * 0.025;
      this.poly([pl, tip, pr, [cx, cz], pl], tt, tt + 0.2, 1.0, 0.9);
      // the left half of each point hatched, as engraved
      if (L > 0.4) for (let q = 1; q < 7; q++) { const f = q / 7; this.line(lerp(pl[0], cx, f), lerp(pl[1], cz, f), lerp(pl[0], tip[0], f), lerp(pl[1], tip[1], f), tt + 0.1, tt + 0.2, 0.6, 0.55); }
    });
    const lab = R * 0.15;
    [['N', 0], ['E', 90], ['S', 180], ['O', 270]].forEach(([s, d], i) => {
      const a = (d - 90) * Math.PI / 180, r = R * 1.16;
      this.text(s, cx + Math.cos(a) * r, cz + Math.sin(a) * r + lab / 2, lab, ta + 0.6 + i * 0.05, 0.05, { align: 0.5, a: 0.95 });
    });
    // magnetic north: 12°48′ west in 2026
    const ma = -12.8 * Math.PI / 180 - Math.PI / 2;
    const mt = [cx + Math.cos(ma) * R * 0.86, cz + Math.sin(ma) * R * 0.86];
    this.line(cx, cz, mt[0], mt[1], ta + 0.75, ta + 0.9, 0.9, 0.75);
    this.line(mt[0], mt[1], mt[0] + Math.cos(ma + 2.75) * R * 0.1, mt[1] + Math.sin(ma + 2.75) * R * 0.1, ta + 0.88, ta + 0.95, 0.9, 0.75);
    this.text('NM 12°48′ W · 2026', cx, cz + R * 1.4, lab * 0.55, ta + 0.9, 0.3, { align: 0.5, a: 0.75, track: 0.1 });
  }
  legend(B, ta) {
    const w = B.x1 - B.x0, h = B.z1 - B.z0;
    this.rect(B.x0, B.z0, B.x1, B.z1, ta, ta + 0.35, 1.1, 0.8);
    const th = Math.min(h * 0.065, w * 0.05);
    this.text('LÉGENDE', B.x0 + w * 0.06, B.z0 + h * 0.13, th, ta + 0.2, 0.2, { track: 0.4, a: 0.95 });
    const rows = ['Trait de côte', 'Voirie · îlots', 'Lignes d’eau', 'Isobathe', 'Sonde (m)', 'Parc · plan d’eau', 'Graticule 2′'];
    const sx0 = B.x0 + w * 0.06, sx1 = B.x0 + w * 0.28, tx = B.x0 + w * 0.34;
    rows.forEach((s, i) => {
      const z = B.z0 + h * (0.27 + i * 0.105), tt = ta + 0.3 + i * 0.06, sm = th * 0.78;
      if (i === 0) this.line(sx0, z, sx1, z, tt, tt + 0.1, 2.2, 0.95);
      if (i === 1) { const m = (sx0 + sx1) / 2; this.rect(sx0, z - sm * 0.6, m - sm * 0.2, z + sm * 0.6, tt, tt + 0.1, 0.8, 0.75); this.rect(m + sm * 0.2, z - sm * 0.6, sx1, z + sm * 0.6, tt, tt + 0.1, 0.8, 0.75); }
      if (i === 2) for (let q = -1; q <= 1; q++) this.line(sx0, z + q * sm * 0.45, sx1, z + q * sm * 0.45, tt, tt + 0.1, 0.7, 0.55);
      if (i === 3) for (let q = 0; q < 4; q++) this.line(lerp(sx0, sx1, q / 4), z, lerp(sx0, sx1, (q + 0.55) / 4), z, tt, tt + 0.1, 0.8, 0.6);
      if (i === 4) this.text('12', (sx0 + sx1) / 2, z + sm * 0.45, sm, tt, 0.05, { italic: true, align: 0.5, a: 0.85 });
      if (i === 5) { const p = []; for (let q = 0; q <= 24; q++) { const a = q / 24 * Math.PI * 2; p.push([(sx0 + sx1) / 2 + Math.cos(a) * (sx1 - sx0) * 0.32, z + Math.sin(a) * sm * 0.6]); } this.poly(p, tt, tt + 0.1, 0.9, 0.75); }
      if (i === 6) this.line(sx0, z, sx1, z, tt, tt + 0.1, 0.7, 0.3);
      this.text(s, tx, z + sm * 0.4, sm, tt + 0.05, 0.25, { a: 0.85 });
    });
  }
  notes(B, ta) {
    const w = B.x1 - B.x0, h = B.z1 - B.z0, th = Math.min(h * 0.05, w * 0.03);
    this.text('NOTES', B.x0, B.z0 + th * 1.2, th * 1.15, ta, 0.2, { track: 0.4, a: 0.95 });
    const L = ['Relevé du bâti : NYC Open Data (LiDAR).', 'Voirie, rives, parcs : OpenStreetMap.', 'Projection : plan tangent local,',
      'origine 40°45′52″N 73°58′23″W.', 'Profondeurs en mètres.', 'Lignes d’eau à 22, 50, 88 et 140 m.'];
    L.forEach((s, i) => this.text(s, B.x0, B.z0 + th * (3.2 + i * 1.8), th, ta + 0.1 + i * 0.08, 0.35, { a: 0.75 }));
    // graphic scale: 0 to 5 km, alternate kilometres solid
    const sz = B.z1 - h * 0.13, sx = B.x0, K = Math.min(1000, (w - th * 8) / 5), bh = th * 0.5;
    for (let i = 0; i < 5; i++) {
      const a = sx + i * K, b = a + K;
      this.rect(a, sz - bh, b, sz + bh, ta + 0.4, ta + 0.5, 0.8, 0.8);
      if (i % 2 === 0) this.bar(a, sz - bh, b, sz + bh, ta + 0.45, ta + 0.55, 0.75);
    }
    for (let i = 0; i <= 5; i++) this.text(String(i), sx + i * K, sz - bh - th * 0.5, th * 0.85, ta + 0.5, 0.05, { align: 0.5, a: 0.85 });
    this.text('KM', sx + 5 * K + th * 0.8, sz + th * 0.4, th * 0.85, ta + 0.55, 0.1, { track: 0.2, a: 0.8 });
  }
  // the elevation frame is drawn with the sheet; its skyline once the
  // true heights have streamed in
  elevationFrame(ta) {
    const E = this.E; if (!E) return;
    const th = Math.min((E.z1 - E.z0) * 0.075, 320);
    this.line(E.x0, E.z1, E.x1, E.z1, ta, ta + 0.4, 1.4, 0.9);
    this.line(E.x0, E.z0, E.x0, E.z1, ta, ta + 0.3, 0.9, 0.7);
    this.text('ÉLÉVATION OUEST · DEPUIS L’HUDSON', E.x0, E.z0 - th * 1.1, th, ta + 0.2, 0.5, { track: 0.3, a: 0.9 });
    this.thT = th;
  }
  elevation(profile, binM, keyOf, ta) {
    const E = this.E; if (!E || !profile) return;
    const th = this.thT, span = 21500, kx = (E.x1 - E.x0) / span;
    const hs = 0.66 * (E.z1 - E.z0) / 541;
    const X = (k) => E.x0 + k * kx;                 // k: metres up-island from the Battery
    const bw = 3, step = binM * bw, bins = [];
    for (let i = 0; i < profile.length; i += bw) { let m = 0; for (let j = i; j < i + bw && j < profile.length; j++) m = Math.max(m, profile[j]); bins.push(m); }
    // profile bin i covers keys [i*binM - 500, ...)
    const pts = [[X(0), E.z1]];
    bins.forEach((m, i) => { const k0 = i * step - 500, k1 = k0 + step; if (k1 <= 0 || k0 >= span) return;
      const y = E.z1 - m * hs; pts.push([X(Math.max(0, k0)), y], [X(Math.min(span, k1)), y]); });
    pts.push([X(span), E.z1]);
    this.poly(pts, ta, ta + 0.9, 1.1, 0.95);
    bins.forEach((m, i) => { const k = i * step - 500 + step / 2; if (i % 2 || m < 12 || k < 0 || k > span) return;
      const f = k / span; this.line(X(k), E.z1, X(k), E.z1 - m * hs, ta + 0.2 + f * 0.8, ta + 0.3 + f * 0.8, 0.6, 0.35); });
    for (let v = 100; v <= 500; v += 100) { const y = E.z1 - v * hs; this.line(E.x0 - 120, y, E.x0, y, ta + 0.3, ta + 0.35, 0.8, 0.7);
      this.text(String(v), E.x0 - 200, y + th * 0.3, th * 0.7, ta + 0.35, 0.05, { align: 1, a: 0.8 }); }
    this.text('M', E.x0 - 200, E.z0 + th * 0.3, th * 0.7, ta + 0.4, 0.05, { align: 1, a: 0.8 });
    for (let kkm = 0; kkm <= 20; kkm += 5) { const x = X(kkm * 1000); this.line(x, E.z1, x, E.z1 + 140, ta + 0.4, ta + 0.45, 0.8, 0.7);
      this.text(kkm === 20 ? '20 KM' : String(kkm), x, E.z1 + 140 + th, th * 0.7, ta + 0.45, 0.05, { align: 0.5, a: 0.8 }); }
    // landmark call-outs on two rows above the skyline, leader lines to the peaks
    const marks = [['ONE WTC · 541 M', -3388, 5712, 541, 0, 0.5], ['EMPIRE STATE · 443 M', -1068, 1776, 443, 0, 0], ['CHRYSLER · 319 M', -197, 1422, 319, 1, 0]];
    marks.forEach(([s, x, z, hh, row, al], i) => { const X0 = X(keyOf(x, z)), top = E.z1 - hh * hs;
      const ly = E.z0 + th * (0.6 + row * 1.5);
      this.line(X0, top - 100, X0, ly + th * 0.35, ta + 0.6 + i * 0.1, ta + 0.7 + i * 0.1, 0.8, 0.75);
      const off = al === 1 ? -th * 0.3 : (al === 0 ? th * 0.3 : 0);
      this.text(s, X0 + off, ly, th * 0.72, ta + 0.65 + i * 0.1, 0.3, { align: al, a: 0.95, track: 0.1 }); });
    [['BATTERY', 250], ['MIDTOWN', 7300], ['CENTRAL PARK', 11400], ['HARLEM', 15300], ['INWOOD', 19900]].forEach(([s, k], i) =>
      this.text(s, X(k), E.z1 + 140 + th * 2.5, th * 0.62, ta + 0.7 + i * 0.06, 0.3, { align: 0.5, a: 0.65, track: 0.2 }));
    this.text('HAUTEURS ×' + Math.round(hs / kx), E.x1, E.z0 - th * 1.1, th * 0.75, ta + 0.8, 0.3, { align: 1, a: 0.75, track: 0.2 });
    this.flush();
  }
}

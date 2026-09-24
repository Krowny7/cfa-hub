// @ts-nocheck
// The landmarks the camera visits, modelled by hand from their real massing
// (the footprint data gives one height per lot, the OSM parts are uneven):
// One World Trade Center, the Flatiron, the Empire State, the Chrysler.
// Every hero is one continuous solid from the street to the tip — each tier
// starts exactly where the one below it ends, so nothing can float.
import * as THREE from 'three';

// the Manhattan grid: v = up-island (avenues), u = crosstown (streets), east +
const AX = { x: 0.4848, z: -0.8746 }, SD = { x: 0.8746, z: 0.4848 };

class Solid {
  constructor(c, id, key) { this.c = c; this.id = id; this.key = key; this.pos = []; this.bld = []; this.idx = []; this.ink = []; this.cx = c.x; this.cz = c.z; }
  w(u, v) { return [this.c.x + u * SD.x + v * AX.x, this.c.z + u * SD.z + v * AX.z]; }
  vert(u, y, v) { const [x, z] = this.w(u, v); this.pos.push(x, y, z); this.bld.push(this.id, this.key); return this.pos.length / 3 - 1; }
  tri(A, B, C, cx, cy, cz) {
    const p = this.pos, ax = p[A * 3], ay = p[A * 3 + 1], az = p[A * 3 + 2];
    const ux = p[B * 3] - ax, uy = p[B * 3 + 1] - ay, uz = p[B * 3 + 2] - az, vx = p[C * 3] - ax, vy = p[C * 3 + 1] - ay, vz = p[C * 3 + 2] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const gx = (ax + p[B * 3] + p[C * 3]) / 3 - cx, gy = (ay + p[B * 3 + 1] + p[C * 3 + 1]) / 3 - cy, gz = (az + p[B * 3 + 2] + p[C * 3 + 2]) / 3 - cz;
    if (nx * gx + ny * gy + nz * gz >= 0) this.idx.push(A, B, C); else this.idx.push(A, C, B);
  }
  // a (star-shaped) ring of [u, v] extruded from y0 to y1 — walls, top and
  // bottom caps, wound outward; ring1 may differ in size (a frustum)
  loft(ring0, y0, ring1, y1, edges = true) {
    const n = ring0.length, b = ring0.map(([u, v]) => this.vert(u, y0, v)), t = ring1.map(([u, v]) => this.vert(u, y1, v));
    let cu = 0, cv = 0; for (const [u, v] of ring0) { cu += u; cv += v; } cu /= n; cv /= n;
    const [cx, cz] = this.w(cu, cv), cy = (y0 + y1) / 2;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; this.tri(b[i], b[j], t[j], cx, cy, cz); this.tri(b[i], t[j], t[i], cx, cy, cz); }
    const bc = this.vert(cu, y0, cv), tc = this.vert(cu, y1, cv);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; this.tri(t[i], t[j], tc, cx, y0 - 1, cz); this.tri(b[i], b[j], bc, cx, y1 + 1, cz); }
    if (edges) { this.ringInk(ring1, y1); }
    return y1;
  }
  prism(ring, y0, y1, edges) { return this.loft(ring, y0, ring, y1, edges); }
  ringInk(ring, y) { const a = []; for (const [u, v] of [...ring, ring[0]]) { const [x, z] = this.w(u, v); a.push(x, y + 0.15, z); } this.ink.push(new Float32Array(a)); }
  line(u0, y0, v0, u1, y1, v1) { const [x0, z0] = this.w(u0, v0), [x1, z1] = this.w(u1, v1); this.ink.push(new Float32Array([x0, y0, z0, x1, y1, z1])); }
  mesh(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('aBld', new THREE.Float32BufferAttribute(this.bld, 2));
    g.setIndex(this.idx); g.computeBoundingSphere();
    return new THREE.Mesh(g, mat);
  }
}
const rect = (hu, hv) => [[-hu, -hv], [hu, -hv], [hu, hv], [-hu, hv]];
// a rectangle with its four corners stepped in (the Art Deco re-entrant corner)
const notched = (hu, hv, nu, nv) => [[-hu + nu, -hv], [hu - nu, -hv], [hu - nu, -hv + nv], [hu, -hv + nv], [hu, hv - nv], [hu - nu, hv - nv],
  [hu - nu, hv], [-hu + nu, hv], [-hu + nu, hv - nv], [-hu, hv - nv], [-hu, -hv + nv], [-hu + nu, -hv + nv]];
const poly = (r, n, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + i / n * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r]; });
const scaleRing = (ring, k) => { let cu = 0, cv = 0; for (const [u, v] of ring) { cu += u; cv += v; } cu /= ring.length; cv /= ring.length; return ring.map(([u, v]) => [cu + (u - cu) * k, cv + (v - cv) * k]); };

export const HERO_SITES = {
  wtc: { x: -3388, z: 5712, hu: 33, hv: 33 },
  flat: { x: -1408, z: 2594, hu: 16, hv: 50 },
  esb: { x: -1068, z: 1776, hu: 66, hv: 30 },
  chr: { x: -197, z: 1422, hu: 32, hv: 31 },
};
// does a data building (by its ring centroid) belong to a hero's lot?
export function inHeroLot(x, z) {
  for (const s of Object.values(HERO_SITES)) {
    const dx = x - s.x, dz = z - s.z, u = dx * SD.x + dz * SD.z, v = dx * AX.x + dz * AX.z;
    if (Math.abs(u) < s.hu + 3 && Math.abs(v) < s.hv + 3) return true;
  }
  return false;
}

export function buildHeroes(city, mat) {
  const out = { meshes: [], ink: [], info: {} };
  const add = (name, S, info) => { const m = S.mesh(mat); city.group.add(m); out.meshes.push(m); out.ink.push(...S.ink); out.info[name] = info; };

  // ---- One World Trade Center: a 61 m cube base whose edges chamfer away
  // into eight tall triangles, ending in a square turned 45 degrees; the
  // parapet, the radome and the ringed antenna to 1,776 ft (541 m)
  {
    const s = HERO_SITES.wtc, S = new Solid(s, 0.913, city.key(s.x, s.z));
    const half = 30.5, base = 57, roof = 417;
    S.prism(rect(half, half), -1, base);
    const B = rect(half, half).map(([u, v]) => S.vert(u, base, v));
    const T = [[0, -half], [half, 0], [0, half], [-half, 0]].map(([u, v]) => S.vert(u, roof, v));   // edge midpoints, turned 45°
    const [cx, cz] = S.w(0, 0), cy = (base + roof) / 2;
    // top corner j+1 sits over the midpoint of base edge (j, j+1)
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; S.tri(B[i], B[j], T[i], cx, cy, cz); S.tri(T[i], T[(i + 3) % 4], B[i], cx, cy, cz); }
    for (let i = 0; i < 4; i++) {
      const bi = rect(half, half)[i], ti = [[0, -half], [half, 0], [0, half], [-half, 0]][i], tj = [[0, -half], [half, 0], [0, half], [-half, 0]][(i + 3) % 4];
      S.line(bi[0], base, bi[1], ti[0], roof, ti[1]); S.line(bi[0], base, bi[1], tj[0], roof, tj[1]);
    }
    const top = [[0, -half], [half, 0], [0, half], [-half, 0]];
    S.loft(top, roof - 0.5, scaleRing(top, 0.94), roof + 5);             // parapet
    S.prism(poly(7.5, 16), roof + 5, roof + 16);                          // the radome ring
    let y = roof + 16;
    for (const [r0, r1, h] of [[2.4, 2.0, 30], [2.0, 1.4, 40], [1.4, 0.5, 124 - 70]]) { S.loft(poly(r0, 10), y, poly(r1, 10), y + h, false); y += h; }
    for (let yy = roof + 30; yy < 520; yy += 16) S.ringInk(poly(3.2, 16), yy);
    add('wtc', S, { top: 541, roof, base });
  }

  // ---- the Flatiron: a 22-storey wedge on its triangle of Broadway and
  // Fifth, a rusticated base, the rounded prow, the great cornice
  {
    const s = HERO_SITES.flat, S = new Solid(s, 0.771, city.key(s.x, s.z));
    const tri = [[-13.5, -47], [13.5, -47], [13.8, 40], [13.2, 44.5], [11.8, 46.6], [9.9, 46.2]];
    S.prism(scaleRing(tri, 1.02), -1, 12);
    S.prism(tri, 12, 78);
    S.prism(scaleRing(tri, 1.05), 78, 81.5);                          // the cornice, overhanging
    S.prism(scaleRing(tri, 0.97), 81.5, 87);
    for (const y of [12, 24, 36, 48, 60, 72]) S.ringInk(scaleRing(tri, 1.005), y);
    add('flat', S, { top: 87 });
  }

  // ---- the Empire State: the five-storey base filling the lot, setbacks at
  // the 6th and 30th floors, the notched shaft to the 81st, the stepped
  // crown to the 86th-floor deck, the mooring mast, the antenna
  {
    const s = HERO_SITES.esb, S = new Solid(s, 0.652, city.key(s.x, s.z));
    let y = -1;
    y = S.prism(rect(64, 28), y, 25);
    y = S.prism(rect(55, 25), y, 88);
    y = S.prism(notched(47, 23, 5, 3), y, 110);
    y = S.prism(notched(37, 21, 6, 4), y, 262);
    y = S.prism(notched(33, 19, 5, 3), y, 280);
    y = S.prism(notched(29, 17, 4.5, 3), y, 300);
    y = S.prism(notched(24, 15, 4, 2.5), y, 320);
    y = S.prism(poly(14, 8, Math.PI / 8), y, 326);
    y = S.loft(poly(12, 8, Math.PI / 8), y, poly(11, 8, Math.PI / 8), 352);
    y = S.prism(poly(9, 8, Math.PI / 8), y, 366);
    y = S.loft(poly(7, 8, Math.PI / 8), y, poly(5.5, 8, Math.PI / 8), 373);
    y = S.loft(poly(2.4, 10), y, poly(1.8, 10), 395, false);
    y = S.loft(poly(1.8, 10), y, poly(0.35, 10), 443, false);
    // vertical piers on the shaft, the lines that make it read as the ESB
    for (let i = -3; i <= 3; i++) { const u = i * 4.3; S.line(u, 110, -21.2, u, 262, -21.2); S.line(u, 110, 21.2, u, 262, 21.2); }
    add('esb', S, { top: 443, crown: 320 });
  }

  // ---- the Chrysler: the base and its setbacks, the notched shaft to the
  // eagles at the 61st floor, seven terraced crown rings with their
  // sunburst arches, the stainless needle
  {
    const s = HERO_SITES.chr, S = new Solid(s, 0.531, city.key(s.x, s.z));
    let y = -1;
    y = S.prism(rect(30, 29), y, 58);
    y = S.prism(rect(26, 25), y, 72);
    y = S.prism(notched(23, 22, 3, 3), y, 86);
    y = S.prism(notched(20, 19, 3, 3), y, 108);
    // the "radiator cap" ornaments at the 31st-floor corners
    for (const [cu, cv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) S.prism(rect(1.6, 1.6).map(([u, v]) => [u + cu * 18.6, v + cv * 17.6]), 108, 112, false);
    y = S.prism(notched(17, 17, 3.2, 3.2), y, 243);
    y = S.prism(rect(17.6, 17.6), y, 246);
    // the eagles, leaning out from the four corners
    for (const [cu, cv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const e = [[0, 0], [2.2, -1.2], [5.5, 0], [2.2, 1.2]].map(([a, b]) => [cu * 16 + (a * cu + b * cv) * 0.7071 * Math.SQRT2 / 1.414, cv * 16 + (a * cv - b * cu) * 0.7071 * Math.SQRT2 / 1.414]);
      S.prism(e, 244, 247.5, false);
    }
    const crown = [];
    for (let i = 0; i < 7; i++) {
      const hw = 14.2 - i * 1.75, h = 5.4;
      y = S.prism(rect(hw, hw), y, y + h);
      crown.push({ y: y - h, hw, h });
    }
    const needleBase = y;
    S.loft(rect(3.2, 3.2), y, rect(0.15, 0.15), 319, false);
    // the sunburst: on each face of each terrace an arch of triangular windows
    for (const st of crown) {
      for (const [fu, fv] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const tu = -fv, tv = fu, off = st.hw + 0.3, w = st.hw * 0.9, rise = st.h * 0.92;
        const P = (a, b) => [fu * off + tu * a, fv * off + tv * a, b];
        const arc = [];
        for (let q = 0; q <= 18; q++) { const a = Math.PI * q / 18; const [u, v, yy] = P(-Math.cos(a) * w, st.y + Math.sin(a) * rise); const [x, z] = S.w(u, v); arc.push(x, yy, z); }
        S.ink.push(new Float32Array(arc));
        for (let r = 1; r < 9; r++) { const a = Math.PI * r / 9; const [u0, v0] = P(-Math.cos(a) * w * 0.3, 0); const [u1, v1] = P(-Math.cos(a) * w, 0);
          S.line(u0, st.y + 0.3, v0, u1, st.y + Math.sin(a) * rise, v1); }
      }
    }
    add('chr', S, { top: 319, crown: 246, needle: needleBase });
  }
  return out;
}

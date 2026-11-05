// L'animation du mini-jeu : npx tsx --tsconfig ./tsconfig.json scripts/salles/test-pantin.ts
import { COUPS, SANS_ENTREE, avancer, nouveauCombattant, subir, type Combattant, type Entrees } from "@/lib/salles/jeu-combat";
import { LAME, RAYON_TETE, VIE_SILLAGE, VIE_TRACE, animer, frappe, nouveauPantin, squeletteDe, type Pantin, type Point } from "@/lib/salles/jeu-pantin";

let echecs = 0;
function check(nom: string, ok: boolean, detail = "") {
  console.log(`${ok ? "ok  " : "KO  "} ${nom}${detail ? "  " + detail : ""}`);
  if (!ok) echecs++;
}

const DT = 1 / 60;
const ecart = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function jouer(f0: Combattant, p: Pantin, e: (i: number) => Partial<Entrees>, images: number, chaqueImage?: (f: Combattant, i: number) => void) {
  let f = f0;
  for (let i = 0; i < images; i++) {
    f = avancer(f, { ...SANS_ENTREE, ...e(i) }, DT);
    animer(p, f, DT);
    chaqueImage?.(f, i);
  }
  return f;
}
const pret = () => {
  const f0: Combattant = { ...nouveauCombattant(2), dir: 1, invincible: 0 };
  const p = nouveauPantin(f0);
  return { p, f: jouer(f0, p, () => ({}), 60) };
};

{
  const { p, f } = pret();
  const s = p.squelette;
  check("au repos, les deux pieds touchent le sol", Math.abs(s.piedAvant.y - f.y) < 0.6 && Math.abs(s.piedArriere.y - f.y) < 0.6);
  check("la tête est au-dessus du bassin, le sabre devant", s.tete.y < s.hanche.y && s.bout.x > s.hanche.x);
  const hauteur = f.y - (s.tete.y - RAYON_TETE);
  const tetes = hauteur / (RAYON_TETE * 2);
  check("un adulte d'environ six têtes, à peu près la taille d'avant", tetes > 5.2 && tetes < 6.3 && hauteur > 68 && hauteur < 84, `${tetes.toFixed(1)} têtes, ${hauteur.toFixed(1)} px`);
  check("les fourreaux partent de la taille, vers l'arrière", s.fourreau.hanche[1].x < s.hanche.x && s.fourreau.travers[1].x < s.hanche.x);
  const y0 = p.squelette.hanche.y;
  let bas = y0;
  let haut = y0;
  jouer(f, p, () => ({}), 180, () => {
    bas = Math.max(bas, p.squelette.hanche.y);
    haut = Math.min(haut, p.squelette.hanche.y);
  });
  check("le corps respire au repos", bas - haut > 0.8);
}

{
  const { p, f } = pret();
  const longueurs: number[] = [];
  let piedLeve = false;
  let pas = 0;
  let g = f;
  for (let i = 0; i < 40; i++) {
    g = avancer(g, { ...SANS_ENTREE, droite: true }, DT);
    if (animer(p, g, DT).pas) pas++;
    longueurs.push(ecart(p.squelette.genouAvant, p.squelette.piedAvant));
    if (i > 15 && g.y - p.squelette.piedAvant.y > 5) piedLeve = true;
  }
  check("les jambes gardent leur longueur en courant", Math.max(...longueurs) - Math.min(...longueurs) < 1);
  check("un pied se lève, et les pas se comptent", piedLeve && pas >= 3, `${pas} pas`);
  check("en courant, le sabre traîne derrière", p.squelette.bout.x < p.squelette.hanche.x);
}

{
  // la lame ne doit jamais couper la tête, ni au saut ni sur un coup fort parti du sol
  const distance = (a: Point, b: Point, q: Point) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const k = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(a.x + dx * k - q.x, a.y + dy * k - q.y);
  };
  const { p, f } = pret();
  let saut = Infinity;
  jouer(f, p, (i) => ({ saut: i === 0 }), 40, () => {
    if (p.tour === 0) saut = Math.min(saut, distance(p.squelette.garde, p.squelette.bout, p.squelette.tete));
  });
  check("au saut, la lame reste loin de la tête", saut > RAYON_TETE, `${saut.toFixed(1)} px`);
  const { p: q, f: g } = pret();
  let coup = Infinity;
  jouer(g, q, (i) => (i === 0 ? { fort: true } : {}), 34, () => {
    coup = Math.min(coup, distance(q.squelette.garde, q.squelette.bout, q.squelette.tete));
  });
  check("sur le coup fort, la lame passe au-dessus de la tête", coup > RAYON_TETE, `${coup.toFixed(1)} px`);
}

{
  const { p, f } = pret();
  let g = avancer(f, { ...SANS_ENTREE, saut: true }, DT);
  const ev = animer(p, g, DT);
  check("le saut se signale", ev.decolle);
  g = jouer(g, p, () => ({}), 14);
  g = jouer(g, p, (i) => ({ saut: i === 0 }), 8);
  check("le deuxième saut lance un salto", p.tour > 0.5, `${p.tour.toFixed(2)} rad`);
  let atterri = 0;
  for (let i = 0; i < 90 && !atterri; i++) {
    g = avancer(g, SANS_ENTREE, DT);
    atterri = animer(p, g, DT).atterri;
  }
  check("l'atterrissage se signale et écrase le corps", atterri > 100 && p.pose.etire < 1, `${Math.round(atterri)} px/s`);
  jouer(g, p, () => ({}), 30);
  check("on retombe droit", p.tour === 0 && Math.abs(p.pose.etire - 1) < 0.01);
}

for (const type of ["suite", "final"] as const) {
  const { p, f } = pret();
  const c = COUPS[type];
  let portee = 0;
  for (let t = c.debut; t <= c.fin; t += 0.01) portee = Math.max(portee, squeletteDe(frappe(p.base, type, t, true), f.x, f.y, 1, 0).bout.x - f.x);
  check(`${type} : la lame va aussi loin que le coup touche`, portee >= c.portee, `${Math.round(portee)} px pour ${c.portee}`);
}

{
  const { p, f } = pret();
  let sillage = 0;
  let penche = 0;
  const g = jouer(f, p, (i) => (i === 0 ? { dash: true, droite: true } : {}), 9, () => {
    sillage = Math.max(sillage, p.sillage.length);
    penche = Math.max(penche, p.pose.buste);
  });
  check("le dash penche le corps et laisse un sillage", penche > 0.6 && sillage >= 3, `${sillage} silhouettes`);
  jouer(g, p, () => ({}), Math.ceil(VIE_SILLAGE * 60) + 12);
  check("le sillage s'efface", p.sillage.length === 0);
}

for (const type of ["leger", "fort"] as const) {
  const { p, f } = pret();
  const c = COUPS[type];
  const base = p.base;
  const debut = frappe(base, type, 0, true);
  const fin = frappe(base, type, c.total, true);
  check(`${type} : le coup part de la pose et y revient`, Math.abs(debut.sabre - base.sabre) < 1e-6 && Math.abs(fin.sabre - base.sabre) < 1e-6);
  let portee = 0;
  let traces = 0;
  const g = jouer(f, p, (i) => (i === 0 ? { [type]: true } : {}), Math.ceil(c.total * 60), (h) => {
    if (h.coup && h.coup.t >= c.debut && h.coup.t <= c.fin) portee = Math.max(portee, p.squelette.bout.x - h.x);
    traces = Math.max(traces, p.trace.length);
  });
  check(`${type} : la lame va aussi loin que le coup touche`, portee >= c.portee, `${Math.round(portee)} px pour ${c.portee}`);
  jouer(g, p, () => ({}), Math.ceil(VIE_TRACE * 60) + 2);
  check(`${type} : la lame laisse une trace, qui s'efface`, traces > 4 && p.trace.length === 0, `${traces} points`);
}

{
  const { p, f } = pret();
  const g = jouer(f, p, () => ({}), 30);
  jouer({ ...g, dir: -1 }, p, () => ({ gauche: true }), 12);
  check("il se retourne en une fraction de seconde", p.face < -0.9);
}

{
  const { p, f } = pret();
  const coup = subir({ ...f, degats: 100 }, "fort", -1);
  jouer(coup, p, () => ({}), 8);
  check("un gros coup fait vriller le corps", Math.abs(p.tour) > 0.5);
  const avant = p.pans[0][3].x;
  const loin = { ...coup, x: coup.x + 400, y: 120 };
  animer(p, loin, DT);
  check("une réapparition ne déchire pas l'écharpe", ecart(p.pans[0][0], p.pans[0][1]) < 12 && Math.abs(p.pans[0][3].x - avant) > 200);
}

{
  // n'importe quelle suite de touches : rien ne doit partir en vrille
  const { p, f } = pret();
  let graine = 7;
  const hasard = () => (graine = (graine * 16807) % 2147483647) / 2147483647;
  let sain = true;
  let echarpeMax = 0;
  let g = f;
  for (let i = 0; i < 6000; i++) {
    const e: Entrees = { gauche: hasard() < 0.4, droite: hasard() < 0.4, bas: hasard() < 0.1, dash: false, saut: hasard() < 0.06, leger: hasard() < 0.05, fort: hasard() < 0.03 };
    g = avancer(g, e, DT);
    if (hasard() < 0.01) g = subir({ ...g, invincible: 0 }, hasard() < 0.5 ? "leger" : "fort", hasard() < 0.5 ? 1 : -1);
    if (g.vies <= 0) g = { ...g, vies: 3 };
    animer(p, g, hasard() < 0.05 ? 0 : DT);
    const points = Object.values(p.squelette).filter((v): v is Point => typeof v === "object" && "x" in v);
    if (!points.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y))) sain = false;
    if (ecart(p.squelette.bout, p.squelette.mainAvant) > LAME * 1.5) sain = false;
    for (const pan of p.pans) for (let k = 1; k < pan.length; k++) echarpeMax = Math.max(echarpeMax, ecart(pan[k - 1], pan[k]));
  }
  check("6000 images au hasard : aucun point perdu, aucune lame étirée", sain);
  check("et l'écharpe garde sa longueur", echarpeMax < 40, `${echarpeMax.toFixed(1)} px au plus`);
}

console.log(echecs ? `${echecs} échec(s)` : "tout est bon");
process.exit(echecs ? 1 : 0);

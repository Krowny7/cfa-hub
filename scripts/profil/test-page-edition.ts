// Tests légers des opérations de l'éditeur de la page du profil
// (lib/profil/page-edition.ts), sans base ni réseau.
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-page-edition.ts
// Vérifie chaque opération sur des cas écrits à la main (format refusé :
// même liste ; échange : chacun prend le format de l'autre place ; mettre à
// la place ; remplir une place libre ou une fin de rangée ; déplacer vers une
// place ; 6 médias, 1 vidéo ; 20 éléments), puis 500 suites aléatoires
// d'opérations (graine fixe) : chaque liste rendue repasse la validation à
// l'identique (aucune perte, aucune modification) et ne perd aucun bloc
// qu'une opération n'a pas retiré.
import {
  BLOCS,
  ELEMENTS_MAX,
  FORMATS,
  MEDIAS_MAX,
  blocsDe,
  estLibre,
  estMedia,
  placesVides,
  rangees,
  validerDisposition,
  type Bloc,
  type BlocMedia,
  type CleBloc,
  type Disposition,
  type ElementPage,
  type PlaceVide,
} from "@/lib/profil/disposition";
import {
  ajouter,
  blocsMasques,
  changerFormat,
  deplacer,
  deplacerVers,
  echanger,
  deplacerA,
  fermerPlace,
  mettreALaPlace,
  peutAjouterCarte,
  peutAjouterMedia,
  pourPlace,
  remplirPlace,
  retirer,
} from "@/lib/profil/page-edition";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
/** égalité de valeurs, sans compter l'ordre des clés (jsonb ne le garde pas) */
const canon = (x: unknown): unknown =>
  Array.isArray(x) ? x.map(canon) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => [k, canon(v)])) : x;
const egal = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
/** la liste en abrégé : « vitrine:bande radar:heros libre:tuile image:tuile » */
const court = (d: Disposition) => d.map((e) => `${estMedia(e) ? (e.type === "video" ? "video" : e.source === "klipy" ? "gif" : "image") : e.k}:${e.f}`).join(" ");

// ── Des médias comme en base ──────────────────────────────────────────
const BASE = "https://abcdefgh.supabase.co/storage/v1/object/public";
const UID = "1b2c3d4e-0000-4000-8000-000000000001";
let n = 0;
const image = (f: BlocMedia["f"] = "heros", extra: Partial<BlocMedia> = {}): BlocMedia => {
  const id = `img${String(++n).padStart(4, "0")}`;
  return { k: "media", id, type: "image", url: `${BASE}/profil-medias/${UID}/${id}.jpg`, ratio: 1.5, legende: null, f, ...extra };
};
const video = (f: BlocMedia["f"] = "tuile"): BlocMedia => {
  const id = `vid${String(++n).padStart(4, "0")}`;
  return { k: "media", id, type: "video", url: `${BASE}/profil-videos/${UID}/${id}.mp4`, ratio: 0.563, legende: "Mon edit", duree: 24.3, couverture: 4, f };
};
const gif = (f: BlocMedia["f"] = "tuile"): BlocMedia => {
  const id = `gif${String(++n).padStart(4, "0")}`;
  return { k: "media", id, type: "image", url: `https://static.klipy.com/ii/abc/${id}.gif`, ratio: 1, legende: null, source: "klipy", px: 200, f };
};
const fixe = (k: CleBloc, f: Bloc["f"]): Bloc => ({ k, f });
const libre = (f: "tuile" | "heros"): ElementPage => ({ k: "libre", f });

/** La liste repasse la validation à l'identique. */
const stable = (d: Disposition) => {
  const v = validerDisposition(d, "lecture");
  return egal(v.disposition, d) && v.refus.length === 0;
};

// ── changerFormat ─────────────────────────────────────────────────────
{
  const d: Disposition = [fixe("vitrine", "bande"), fixe("progression", "heros"), fixe("amis", "tuile")];
  check("changerFormat : progression en tuile refusé (même liste)", changerFormat(d, 1, "tuile") === d);
  check("changerFormat : même format (même liste)", changerFormat(d, 0, "bande") === d);
  check("changerFormat : hors liste (même liste)", changerFormat(d, 9, "tuile") === d);
  const x = changerFormat(d, 0, "tuile");
  check("changerFormat : vitrine en tuile", court(x) === "vitrine:tuile progression:heros amis:tuile", court(x));
  check("changerFormat : nouvelle liste, l'ancienne intacte", x !== d && d[0].f === "bande");
  const avecLibre: Disposition = [fixe("folio", "tuile"), libre("tuile"), fixe("amis", "tuile")];
  check("changerFormat : une place libre ne change pas de format", changerFormat(avecLibre, 1, "heros") === avecLibre);
  const v: Disposition = [video("tuile")];
  check("changerFormat : vidéo en bande refusée", changerFormat(v, 0, "bande") === v);
  check("changerFormat : vidéo en héros", changerFormat(v, 0, "heros")[0].f === "heros");
}

// ── deplacer ──────────────────────────────────────────────────────────
{
  const d: Disposition = [fixe("vitrine", "bande"), fixe("radar", "heros"), fixe("amis", "tuile")];
  const x = deplacer(d, 2, -1);
  check("deplacer : les amis avant le radar, chacun garde son format", court(x) === "vitrine:bande amis:tuile radar:heros", court(x));
  check("deplacer : les rangées se recomposent (amis et radar sur une rangée pleine)", rangees(x).length === 2 && rangees(x)[1].fins.length === 0);
  check("deplacer : le premier ne recule pas", deplacer(d, 0, -1) === d);
  check("deplacer : le dernier n'avance pas", deplacer(d, 2, 1) === d);
  // une place libre qui finirait la liste tombe
  const l: Disposition = [fixe("folio", "tuile"), libre("tuile"), fixe("amis", "tuile")];
  const y = deplacer(l, 2, -1);
  check("deplacer : une place libre en fin de liste tombe", court(y) === "folio:tuile amis:tuile", court(y));
}

// ── echanger ──────────────────────────────────────────────────────────
{
  const d: Disposition = [fixe("radar", "heros"), fixe("amis", "tuile")];
  const x = echanger(d, 0, 1);
  check("echanger : chacun prend le format de l'autre place", court(x) === "amis:heros radar:tuile", court(x));
  const v: Disposition = [fixe("vitrine", "bande"), video("tuile")];
  const y = echanger(v, 0, 1);
  check("echanger : la vidéo ne prend pas la bande (le plus proche : héros)", court(y) === "video:heros vitrine:tuile", court(y));
  check("echanger : la même place (même liste)", echanger(d, 1, 1) === d);
  check("echanger : hors liste (même liste)", echanger(d, 0, 5) === d);
  const p: Disposition = [fixe("progression", "heros"), fixe("trophees", "tuile")];
  check("echanger : la progression ne va pas en tuile (le plus proche : héros)", court(echanger(p, 0, 1)) === "trophees:heros progression:heros", court(echanger(p, 0, 1)));
  const l: Disposition = [fixe("vitrine", "bande"), libre("tuile"), fixe("amis", "tuile")];
  check("echanger : une place libre ne prend pas une bande", echanger(l, 0, 1) === l);
}

// ── mettreALaPlace ────────────────────────────────────────────────────
{
  const d: Disposition = [fixe("radar", "heros"), fixe("amis", "tuile")];
  check("mettreALaPlace : absent, il remplace au format de la place", court(mettreALaPlace(d, 0, "progression")) === "progression:heros amis:tuile");
  check("mettreALaPlace : place de tuile, la progression prend le héros", court(mettreALaPlace(d, 1, "progression")) === "radar:heros progression:heros");
  check("mettreALaPlace : déjà posé ailleurs, échange", court(mettreALaPlace(d, 0, "amis")) === "amis:heros radar:tuile");
  check("mettreALaPlace : lui-même (même liste)", mettreALaPlace(d, 0, "radar") === d);
  check("mettreALaPlace : clé inconnue (même liste)", mettreALaPlace(d, 0, "inconnu" as CleBloc) === d);
  const m: Disposition = [image("heros"), fixe("amis", "tuile")];
  const x = mettreALaPlace(m, 0, "journal");
  check("mettreALaPlace : un média remplacé est retiré", court(x) === "journal:heros amis:tuile" && !x.some(estMedia), court(x));
}

// ── pourPlace ─────────────────────────────────────────────────────────
check("pourPlace : progression dans 4 → héros (son défaut)", pourPlace("progression", "tuile") === "heros");
check("pourPlace : saisons dans 8 → tuile (son défaut)", pourPlace("saisons", "heros") === "tuile");
check("pourPlace : image dans 8 → héros", pourPlace("image", "heros") === "heros");
check("pourPlace : vidéo dans 4 → tuile", pourPlace("video", "tuile") === "tuile");
check("pourPlace : radar dans 4 → tuile", pourPlace("radar", "tuile") === "tuile");
check("pourPlace : folio dans une colonne → colonne", pourPlace("folio", "colonne") === "colonne");
check("pourPlace : progression dans une colonne → héros (son défaut)", pourPlace("progression", "colonne") === "heros");

// ── la colonne ────────────────────────────────────────────────────────
{
  const seule: Disposition = [fixe("folio", "colonne")];
  const fins = placesVides(rangees(seule)[0], 0);
  const x = remplirPlace(seule, fins[1], fixe("amis", "tuile"));
  check("remplirPlace : 2e ligne d'une colonne seule, la 1re gardée libre (héros), le bloc dessous", court(x) === "folio:colonne libre:heros amis:heros" && rangees(x).length === 1, court(x));
  const y = remplirPlace(seule, fins[0], fixe("amis", "tuile"));
  check("remplirPlace : 1re ligne d'une colonne seule", court(y) === "folio:colonne amis:heros" && rangees(y)[0].cases[1].ligne === 1, court(y));
  const d: Disposition = [fixe("radar", "heros"), fixe("folio", "colonne"), fixe("amis", "tuile"), fixe("reponses", "tuile")];
  const z = retirer(d, 1);
  check("retirer une colonne : sa place reste, libre, en colonne (le reste ne bouge pas)", court(z) === "radar:heros libre:colonne amis:tuile reponses:tuile", court(z));
  check("changerFormat : en colonne", court(changerFormat([fixe("amis", "tuile")], 0, "colonne")) === "amis:colonne");
  check("changerFormat : la progression ne va pas en colonne", changerFormat([fixe("progression", "heros")], 0, "colonne").length === 1 && court(changerFormat([fixe("progression", "heros")], 0, "colonne")) === "progression:heros");
}

// ── les cartes ────────────────────────────────────────────────────────
{
  const carte = (id: string): Bloc => ({ k: "carte", id, titre: "Ma carte", texte: null, f: "colonne" });
  let d: Disposition = [fixe("vitrine", "bande")];
  for (const id of ["carte01", "carte02", "carte03"]) d = ajouter(d, carte(id));
  check("ajouter : 3 cartes", d.length === 4);
  check("ajouter : une 4e carte refusée (même liste)", ajouter(d, carte("carte04")) === d && !peutAjouterCarte(d).ok);
  check("ajouter : une carte déjà posée refusée", ajouter([carte("carte01")], carte("carte01")).length === 1);
  const r = retirer(d, 1);
  // sa place libre, seule dans sa rangée, part avec elle (normaliser)
  check("retirer une carte : elle part", !r.some((e) => e.k === "carte" && e.id === "carte01") && r.length === 3, court(r));
}

// ── remplirPlace ──────────────────────────────────────────────────────
{
  const d: Disposition = [fixe("folio", "tuile"), libre("tuile"), gif("tuile")];
  const p = placesVides(rangees(d)[0], 0);
  check("placesVides : l'élément libre", p.length === 1 && p[0].i === 1 && p[0].portee === 4);
  const x = remplirPlace(d, p[0], fixe("amis", "bande"));
  check("remplirPlace : élément libre remplacé, au format de la place", court(x) === "folio:tuile amis:tuile gif:tuile", court(x));

  const e: Disposition = [fixe("vitrine", "bande"), fixe("amis", "heros")];
  const fin = placesVides(rangees(e)[1], 1);
  check("placesVides : la fin de rangée", fin.length === 1 && fin[0].i === null && fin[0].apres === 1 && fin[0].portee === 4);
  const y = remplirPlace(e, fin[0], fixe("radar", "heros"));
  check("remplirPlace : fin de rangée, inséré après le dernier", court(y) === "vitrine:bande amis:heros radar:tuile", court(y));
  check("remplirPlace : bloc déjà posé (même liste)", remplirPlace(e, fin[0], fixe("amis", "tuile")) === e);
  const z = remplirPlace(e, fin[0], fixe("progression", "heros"));
  check("remplirPlace : la progression déborde sur la rangée suivante (héros)", court(z) === "vitrine:bande amis:heros progression:heros" && rangees(z).length === 3, court(z));
  const g: Disposition = [fixe("vitrine", "bande"), fixe("radar", "tuile")];
  const vide8 = placesVides(rangees(g)[1], 1)[0];
  check("remplirPlace : une image dans 8 → héros", court(remplirPlace(g, vide8, image("bande"))) === "vitrine:bande radar:tuile image:heros");
  const perimee: PlaceVide = { rangee: 0, ligne: 1, f: "tuile", portee: 4, i: 0, apres: 0 };
  check("remplirPlace : la place n'est plus libre (même liste)", remplirPlace(g, perimee, fixe("amis", "tuile")) === g);
}

// ── deplacerVers ──────────────────────────────────────────────────────
{
  const d: Disposition = [fixe("vitrine", "bande"), fixe("radar", "heros"), fixe("amis", "tuile"), fixe("trophees", "tuile")];
  const fin = placesVides(rangees(d)[2], 2)[0];
  check("placesVides : fin de la 3e rangée (8)", fin.portee === 8 && fin.apres === 3);
  const x = deplacerVers(d, 1, fin);
  check("deplacerVers : le radar va dans la fin de rangée visée, en héros ; sa place reste libre (rien ne remonte)", court(x) === "vitrine:bande libre:heros amis:tuile trophees:tuile radar:heros" && rangees(x)[2].cases.map((c) => c.e.k).join() === "trophees,radar", court(x));
  check("deplacerVers : le dernier bloc vers sa propre fin de rangée (même liste)", deplacerVers(d, 3, fin) === d);
  const l: Disposition = [fixe("folio", "tuile"), libre("tuile"), gif("tuile"), fixe("reponses", "tuile")];
  const place = placesVides(rangees(l)[0], 0)[0];
  const y = deplacerVers(l, 3, place);
  check("deplacerVers : vers un élément libre (index recalculé)", court(y) === "folio:tuile reponses:tuile gif:tuile", court(y));
  const avant: Disposition = [fixe("reponses", "heros"), fixe("folio", "tuile"), libre("heros"), gif("tuile")];
  const p2 = placesVides(rangees(avant)[1], 1)[0];
  const w = deplacerVers(avant, 0, p2);
  check("deplacerVers : un bloc d'avant la place, posé là où on l'a lâché (sa place reste libre)", court(w) === "libre:heros folio:tuile reponses:heros gif:tuile", court(w));
  check("deplacerVers : une place libre ne se déplace pas", deplacerVers(l, 1, place) === l);
}

// ── deplacerVers et la colonne (relecture) ────────────────────────────
{
  const carte: Bloc = { k: "carte", id: "carte01", titre: "Ma carte", texte: null, f: "colonne" };
  // la carte seule à gauche ; Amis glissé sur sa 2e ligne : la carte ne change pas de côté, Amis sous la 1re ligne gardée libre
  const d: Disposition = [fixe("vitrine", "bande"), fixe("radar", "heros"), fixe("amis", "tuile"), carte];
  const fins = placesVides(rangees(d)[2], 2);
  const x = deplacerVers(d, 2, fins[1]);
  const r = rangees(x).find((g) => g.cases.some((c) => c.e.k === "carte"))!;
  check(
    "deplacerVers : vers la 2e ligne d'une colonne seule, la colonne reste à gauche et le bloc va en 2e ligne",
    r.cases.find((c) => c.e.k === "carte")!.col === 1 && r.cases.find((c) => c.e.k === "amis")?.ligne === 2,
    court(x),
  );
  // colonne à gauche, 1re ligne pleine : Saisons glissée sur la 2e ligne y va bien
  const e: Disposition = [fixe("folio", "colonne"), fixe("saisons", "tuile"), fixe("amis", "tuile")];
  const f2 = placesVides(rangees(e)[0], 0).find((p) => p.ligne === 2)!;
  const y = deplacerVers(e, 1, f2);
  check("deplacerVers : le bloc de la 1re ligne va en 2e ligne (la 1re garde sa place libre)", rangees(y)[0].cases.find((c) => c.e.k === "saisons")?.ligne === 2, court(y));
  // le dernier de la 1re ligne, sur la fin de la 2e ligne (combler) : il descend
  const g: Disposition = [fixe("folio", "colonne"), fixe("amis", "tuile")];
  const f3 = placesVides(rangees(g)[0], 0).find((p) => p.ligne === 2)!;
  const z = deplacerVers(g, 1, f3);
  check("deplacerVers : le dernier de la 1re ligne descend en 2e ligne", rangees(z)[0].cases.find((c) => c.e.k === "amis")?.ligne === 2, court(z));
  const seule: Disposition = [fixe("folio", "colonne")];
  check("deplacerVers : une colonne seule sur la fin de sa propre ligne (même liste)", deplacerVers(seule, 0, placesVides(rangees(seule)[0], 0)[0]) === seule && deplacerVers(seule, 0, placesVides(rangees(seule)[0], 0)[1]) === seule);
  // la progression ne remplit pas une place libre trop petite (elle irait casser la rangée)
  const h: Disposition = [fixe("radar", "heros"), libre("colonne"), fixe("amis", "tuile"), fixe("reponses", "tuile")];
  const pc = placesVides(rangees(h)[0], 0).find((p) => p.i === 1)!;
  check("remplirPlace : la progression refusée dans une place colonne (même liste)", remplirPlace(h, pc, fixe("progression", "heros")) === h);
  check("remplirPlace : un module accepté dans une place colonne, en colonne", court(remplirPlace(h, pc, fixe("folio", "tuile"))) === "radar:heros folio:colonne amis:tuile reponses:tuile");
}

// ── ajouter, retirer, fermerPlace, blocsMasques ───────────────────────
{
  const d: Disposition = [fixe("vitrine", "bande"), fixe("amis", "heros")];
  check("ajouter : à la fin, à son format", court(ajouter(d, fixe("journal", "tuile"))) === "vitrine:bande amis:heros journal:tuile");
  check("ajouter : format refusé → le plus proche", court(ajouter(d, fixe("saisons", "heros"))) === "vitrine:bande amis:heros saisons:bande");
  check("ajouter : déjà posé (même liste)", ajouter(d, fixe("amis", "tuile")) === d);
  check("retirer : masquer un bloc fixe", court(retirer(d, 1)) === "vitrine:bande");
  const l: Disposition = [fixe("folio", "tuile"), libre("tuile"), fixe("amis", "tuile")];
  check("retirer : une place libre (même liste)", retirer(l, 1) === l);
  check("fermerPlace : la place libre part", court(fermerPlace(l, 1)) === "folio:tuile amis:tuile");
  check("fermerPlace : un bloc (même liste)", fermerPlace(l, 0) === l);
  check("blocsMasques : les blocs absents, dans l'ordre", egal(blocsMasques(d).map((b) => b.k), ["radar", "reponses", "trophees", "progression", "folio", "journal", "saisons"]));
  const t: Disposition = [fixe("vitrine", "bande"), image("heros"), fixe("amis", "tuile")];
  const r = retirer(t, 1);
  check("retirer : un média part de la liste (en héros, sa place reste libre)", court(r) === "vitrine:bande libre:heros amis:tuile" && !r.some(estMedia));
  // masquer en tuile ou en héros : la place reste libre, la suite de la page ne bouge pas
  const rang: Disposition = [fixe("radar", "heros"), fixe("amis", "tuile"), fixe("journal", "tuile"), fixe("folio", "tuile"), image("tuile")];
  check("retirer : un héros laisse sa place libre (les rangées ne bougent pas)", court(retirer(rang, 0)) === "libre:heros amis:tuile journal:tuile folio:tuile image:tuile");
  check("retirer : une tuile au milieu d'une rangée laisse sa place libre", court(retirer(rang, 3)) === "radar:heros amis:tuile journal:tuile libre:tuile image:tuile");
  check("retirer : un média en tuile laisse aussi sa place", court(retirer([image("tuile"), fixe("amis", "tuile")], 0)) === "libre:tuile amis:tuile");
  check("retirer : une bande part avec sa rangée", court(retirer([fixe("vitrine", "bande"), fixe("amis", "tuile")], 0)) === "amis:tuile");
  check("retirer : la dernière tuile de la page ne laisse rien", court(retirer([fixe("vitrine", "bande"), fixe("amis", "tuile")], 1)) === "vitrine:bande");
  check("retirer : une rangée devenue toute libre part", court(retirer([fixe("radar", "heros"), fixe("vitrine", "bande")], 0)) === "vitrine:bande");
}

// ── deplacerA (le glisser au téléphone : l'ordre seul) ─────────────────
{
  const d: Disposition = [fixe("vitrine", "bande"), fixe("radar", "heros"), fixe("amis", "tuile"), fixe("journal", "tuile")];
  check("deplacerA : vers le bas, il prend l'index visé, formats gardés", court(deplacerA(d, 0, 2)) === "radar:heros amis:tuile vitrine:bande journal:tuile");
  check("deplacerA : vers le haut", court(deplacerA(d, 3, 0)) === "journal:tuile vitrine:bande radar:heros amis:tuile");
  check("deplacerA : sur place, hors liste ou une place libre (même liste)", deplacerA(d, 1, 1) === d && deplacerA(d, 0, 9) === d && deplacerA([libre("tuile"), fixe("amis", "tuile")], 0, 1).length === 2);
}

// ── 6 médias, 1 vidéo ─────────────────────────────────────────────────
{
  let d: Disposition = [fixe("vitrine", "bande")];
  for (let i = 0; i < MEDIAS_MAX; i++) d = ajouter(d, image("tuile"));
  check("6 médias ajoutés", d.filter(estMedia).length === MEDIAS_MAX && stable(d));
  const avant = d;
  check("un 7e média refusé (même liste)", ajouter(d, image("tuile")) === avant);
  check("peutAjouterMedia : 6 médias", !peutAjouterMedia(d, false).ok && !!peutAjouterMedia(d, false).raison);
  let v: Disposition = [fixe("vitrine", "bande"), video("tuile")];
  check("peutAjouterMedia : une vidéo déjà là", !peutAjouterMedia(v, true).ok && peutAjouterMedia(v, false).ok);
  const v2 = ajouter(v, video("tuile"));
  check("une 2e vidéo refusée (même liste)", v2 === v);
  const fin = placesVides(rangees(v)[1], 1)[0];
  check("une 2e vidéo refusée dans une place (même liste)", remplirPlace(v, fin, video("tuile")) === v);
  const id = (v[1] as BlocMedia).id;
  v = ajouter(v, { ...image("tuile"), id });
  check("un média au même id refusé", v.filter(estMedia).length === 1);
}

// ── 20 éléments ───────────────────────────────────────────────────────
{
  // 6 rangées « bloc, place libre, bloc », puis 2 blocs : 14 blocs et 6 places libres
  const blocs: Bloc[] = [...BLOCS.map((b) => fixe(b.k, "tuile")), image("tuile"), image("tuile"), gif("tuile"), video("tuile"), image("tuile")];
  const d: Disposition = [];
  for (let r = 0; r < 6; r++) d.push(blocs[2 * r], libre("tuile"), blocs[2 * r + 1]);
  d.push(blocs[12], blocs[13]);
  // la progression ne va pas en tuile : elle est mise en héros dans une rangée à elle
  const pleine = d.map((e) => (e.k === "progression" ? { ...e, f: "heros" as const } : e));
  const valide = validerDisposition(pleine, "lecture").disposition;
  check("20 éléments : la liste d'essai est propre", valide.length === ELEMENTS_MAX, String(valide.length));
  const x = ajouter(valide, image("tuile"));
  check("20 éléments : ajouter retire d'abord la dernière place libre", x !== valide && x.length === ELEMENTS_MAX && x.filter(estLibre).length === valide.filter(estLibre).length - 1 && x.filter(estMedia).length === 6, court(x));
  check("20 éléments : aucun bloc perdu", blocsDe(x).length === blocsDe(valide).length + 1 && stable(x));
}

// ── 500 suites aléatoires (graine fixe) ───────────────────────────────
{
  let graine = 20261017;
  const hasard = () => {
    graine = (graine * 1103515245 + 12345) % 2147483648;
    return graine / 2147483648;
  };
  const un = <T>(l: readonly T[]): T => l[Math.floor(hasard() * l.length)];
  const media = (): BlocMedia => un([() => image(un(["tuile", "heros", "bande"] as const), { y: un([15, 50, 88]) }), () => gif(), () => video()])();
  const depart: Disposition[] = [
    validerDisposition([{ k: "vitrine", f: "bande" }, { k: "radar", f: "heros" }, { k: "amis", f: "tuile" }], "lecture").disposition,
    validerDisposition([{ m: "trois", c: [{ k: "folio" }, null, gif()] }, { m: "trois", c: [{ k: "reponses" }, { k: "trophees" }, null] }], "lecture").disposition,
    validerDisposition([{ m: "quatre", c: [{ k: "radar" }, { k: "amis" }, null, { k: "trophees" }] }], "lecture").disposition,
    [],
  ];
  let suites = 0;
  let operations = 0;
  let instables = 0;
  let pertes = 0;
  let refusMemeListe = true;
  const premier: string[] = [];
  const sansEffet: string[] = [];
  for (let s = 0; s < 500; s++) {
    let d = un(depart);
    for (let k = 0; k < 12; k++) {
      const avant = d;
      const i = Math.floor(hasard() * Math.max(1, d.length));
      const places = rangees(d).flatMap((r, ri) => placesVides(r, ri));
      const op = Math.floor(hasard() * 11);
      let retire: Set<string> | null = null; // ce que l'opération a le droit d'enlever
      const cle = (e: ElementPage) => (estMedia(e) ? e.id : e.k);
      switch (op) {
        case 0:
          d = changerFormat(d, i, un(FORMATS).key);
          break;
        case 1:
          d = deplacer(d, i, un([-1, 1] as const));
          break;
        case 2:
          d = echanger(d, i, Math.floor(hasard() * Math.max(1, d.length)));
          break;
        case 3:
          if (d[i]) retire = new Set([cle(d[i])]);
          d = mettreALaPlace(d, i, un(BLOCS).k);
          break;
        case 4:
          if (places.length) d = remplirPlace(d, un(places), hasard() < 0.6 ? fixe(un(BLOCS).k, "tuile") : media());
          break;
        case 5:
          if (places.length) d = deplacerVers(d, i, un(places));
          break;
        case 6:
          d = ajouter(d, hasard() < 0.6 ? fixe(un(BLOCS).k, un(FORMATS).key) : media());
          break;
        case 7:
          if (d[i]) retire = new Set([cle(d[i])]);
          d = retirer(d, i);
          break;
        case 8:
          d = fermerPlace(d, i);
          break;
        case 9:
          // une place libre posée à la main (comme une conversion d'avant), puis la forme propre
          d = validerDisposition([...d.slice(0, i), { k: "libre", f: un(["tuile", "heros"] as const) }, ...d.slice(i)], "lecture").disposition;
          break;
        case 10:
          d = deplacerA(d, i, Math.floor(hasard() * Math.max(1, d.length)));
          break;
      }
      operations++;
      if (!stable(d)) {
        instables++;
        if (premier.length < 3) premier.push(`op ${op} : ${court(avant)} → ${court(d)}`);
      }
      // aucun bloc ne disparaît, sauf celui que l'opération retire ou remplace
      const apres = new Set(blocsDe(d).map(cle));
      const perdus = blocsDe(avant).map(cle).filter((c) => !apres.has(c) && !retire?.has(c));
      if (perdus.length) {
        pertes++;
        if (premier.length < 3) premier.push(`op ${op} perd ${perdus.join(",")} : ${court(avant)} → ${court(d)}`);
      }
      if (d !== avant && egal(d, avant) && op !== 9) {
        refusMemeListe = false;
        if (sansEffet.length < 3) sansEffet.push(`op ${op} sans effet, nouvelle liste : ${court(d)}`);
      }
    }
    suites++;
  }
  check(`500 suites aléatoires : ${operations} opérations, chaque liste repasse la validation à l'identique`, instables === 0, premier.join(" | "));
  check("500 suites aléatoires : aucun bloc perdu en route", pertes === 0, premier.join(" | "));
  check("500 suites aléatoires : une opération sans effet rend la même liste", refusMemeListe, sansEffet.join(" | "));
  check("500 suites", suites === 500);
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est bon.");
process.exit(ko ? 1 : 0);

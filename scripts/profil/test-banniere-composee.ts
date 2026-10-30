// Tests légers de la bannière composée (lib/profil/banniere.ts, lecture et
// écriture du style dans lib/profil/styles.ts, migration_bannieres_composees.sql,
// noms des fichiers envoyés et préréglages), sans base ni réseau.
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-banniere-composee.ts
// Vérifie : les bornes (la scène : rien ne sort de la zone de débordement), le
// calque proportionnel et le calque libre, l'ordre d'empilement (permutation),
// la lecture tolérante de la base, la validation stricte (images du dossier
// du joueur sous le nom exact de l'élément, préréglages, badges gagnés,
// statistiques connues), la sérialisation et sa taille, la conversion de
// l'ancien personnage, les valeurs du panneau, le style (styleDepuis,
// validerStyle, ecrireStyle et ses replis), la migration, les préréglages
// copiés dans public/, aucun chemin local.
import fs from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BADGES_MAX,
  BANNIERE_H,
  BANNIERE_L,
  CALQUE_H_MAX,
  CALQUE_H_MIN,
  CALQUE_L_MAX,
  CALQUE_L_MIN,
  COMPOSITION_MAX_CAR,
  DEBORD,
  ORDRE_DEFAUT,
  PREREGLAGES,
  SCENE,
  SCENE_PX,
  STATS_DEFAUT,
  STATS_MAX,
  STATS_PANNEAU,
  adresseImage,
  bornerCalque,
  compositionDe,
  compositionDefaut,
  compositionDepuis,
  compositionDepuisAncien,
  fichierImage,
  fichiersComposition,
  formaterStat,
  genreBadge,
  hauteurCalque,
  imagePrereglage,
  imageRelue,
  imageValide,
  memeComposition,
  nomFichierImage,
  poserCalque,
  prereglageDe,
  serialiserComposition,
  validerComposition,
  valeursPanneau,
  type Calque,
  type Composition,
} from "@/lib/profil/banniere";
import { STATS_VIDES, STYLE_DEFAUT, acquisDe } from "@/lib/profil/catalogue";
import { fichiersGardesStyle } from "@/lib/profil/perso";
import { badgesGagnes } from "@/lib/profil/banniere-badges";
import { banniereDepuis, ecrireStyle, lireStyles, styleDepuis, validerStyle } from "@/lib/profil/styles";
import type { EtatSceau } from "@/lib/profil/sceaux";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const egal = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);

const UID = "1b2c3d4e-0000-4000-8000-000000000001";
const BASE = "https://exemple.supabase.co/storage/v1/object/public/profil-medias";
const PREFIXE = `${BASE}/${UID}/`;
const url = (cle: string, ext = "png", t = 1760000000000) => `${PREFIXE}${nomFichierImage(cle as "perso", ext, t)}`;
const dedans = (c: Calque) => c.x >= SCENE.x0 && c.y >= SCENE.y0 && c.x + c.l <= SCENE.x1 + 0.0001 && c.y + hauteurCalque(c) <= SCENE.y1 + 0.0001;

// ── 1. la scène ────────────────────────────────────────────────────────
check("la bannière de référence fait 360 × 1000", BANNIERE_L === 360 && BANNIERE_H === 1000);
check("la zone de débordement : 25 % de chaque côté, 20 % en haut, 10 % en bas", DEBORD.gauche === 25 && DEBORD.droite === 25 && DEBORD.haut === 20 && DEBORD.bas === 10);
check("la scène va de −25 à 125 en x et de −20 à 110 en y", egal([SCENE.x0, SCENE.x1, SCENE.y0, SCENE.y1], [-25, 125, -20, 110]));
check("la scène fait 540 × 1300 px de référence", SCENE_PX.l === 540 && SCENE_PX.h === 1300);

// ── 2. bornes d'un calque ──────────────────────────────────────────────
const libre = (o: Partial<Calque>): Calque => ({ image: "piece:meca", x: 0, y: 0, l: 100, h: null, r: 1, ...o });
{
  const c = bornerCalque(libre({ x: -500, y: -500, l: 40, h: 10 }));
  check("un calque trop à gauche et trop haut est ramené dans la scène", c.x === SCENE.x0 && c.y === SCENE.y0, JSON.stringify(c));
  const d = bornerCalque(libre({ x: 900, y: 900, l: 40, h: 10 }));
  check("trop à droite et trop bas : son bord touche celui de la scène", d.x + d.l === SCENE.x1 && d.y + (d.h ?? 0) === SCENE.y1, JSON.stringify(d));
  const e = bornerCalque(libre({ l: 9999, h: 9999 }));
  check("largeur et hauteur ne dépassent pas la scène", e.l === CALQUE_L_MAX && e.h === CALQUE_H_MAX && dedans(e), JSON.stringify(e));
  const f = bornerCalque(libre({ l: -4, h: -4 }));
  check("largeur et hauteur ont un minimum", f.l === CALQUE_L_MIN && f.h === CALQUE_H_MIN);
  const g = bornerCalque(libre({ x: NaN, y: "abc" as unknown as number, l: NaN, h: NaN }));
  check("des valeurs absurdes ne font pas de NaN", [g.x, g.y, g.l].every(Number.isFinite) && (g.h === null || Number.isFinite(g.h)), JSON.stringify(g));
  const p = bornerCalque(libre({ l: 140, h: null, r: 2.5, x: -20, y: 0 }));
  check("proportionnel : la hauteur suit l × 0,36 / ratio", p.h === null && hauteurCalque(p) === 20.2, String(hauteurCalque(p)));
  const tall = bornerCalque(libre({ l: 150, h: null, r: 0.05 }));
  check("proportionnel et très haut : la largeur cède, rien ne sort", dedans(tall) && hauteurCalque(tall) <= CALQUE_H_MAX && tall.l < 150, JSON.stringify(tall));
  const large = bornerCalque(libre({ l: 150, h: null, r: 12, x: -25, y: 0 }));
  check("proportionnel et très large : hauteur au moins au minimum", hauteurCalque(large) >= CALQUE_H_MIN && dedans(large));
  check("le verrou désactivé garde la hauteur donnée", bornerCalque(libre({ l: 50, h: 33.37, r: 1 })).h === 33.4);
  check("tout est arrondi au dixième", [bornerCalque(libre({ x: 1.2345, y: 2.3456, l: 30.678 }))].every((c) => [c.x, c.y, c.l].every((n) => Math.round(n * 10) / 10 === n)));
}

// ── 3. poser un calque ─────────────────────────────────────────────────
for (const cle of ["perso", "haut", "bas"] as const) {
  for (const r of [0.05, 0.4, 0.75, 1, 2.5, 4, 12]) {
    const c = poserCalque(cle, "piece:meca", r);
    if (!dedans(c)) check(`poserCalque(${cle}, ratio ${r}) tient dans la scène`, false, JSON.stringify(c));
  }
}
check("tous les calques posés tiennent dans la scène (7 ratios × 3 calques)", true);
{
  const haut = poserCalque("haut", "piece:meca", 2.5);
  check("la pièce du haut est centrée et mord sur le haut de la bannière", haut.x + haut.l / 2 === 50 && haut.y < 0 && haut.y + hauteurCalque(haut) > 0, JSON.stringify(haut));
  const bas = poserCalque("bas", "piece:meca", 2.5);
  check("la pièce du bas est centrée, son bord bas sous la bannière", bas.x + bas.l / 2 === 50 && Math.abs(bas.y + hauteurCalque(bas) - 104) < 0.2, JSON.stringify(bas));
}

// ── 4. la composition par défaut ───────────────────────────────────────
{
  const d = compositionDefaut();
  check("composition neuve : aucune image, fond du profil", !d.fond.image && !d.perso.image && !d.haut.image && !d.bas.image);
  check("composition neuve : l'ordre par défaut et le panneau de la maquette", egal(d.ordre, ORDRE_DEFAUT) && egal(d.panneau, { badges: [], stats: ["elo", "duels", "sceaux"] }));
  check("l'ordre par défaut : le cadre derrière le personnage, la pièce du haut devant tout", egal(ORDRE_DEFAUT, ["cadre", "perso", "bas", "haut"]));
  check("deux compositions neuves sont indépendantes", compositionDefaut().ordre !== d.ordre && memeComposition(d, compositionDefaut()));
}

// ── 5. lecture tolérante de la base ────────────────────────────────────
check("rien, null, une chaîne qui n'est pas du JSON, un tableau : pas de composition", [undefined, null, "xx", [], 12].every((v) => compositionDepuis(v) === null));
check("un objet vide : la composition neuve", memeComposition(compositionDepuis({}), compositionDefaut()));
{
  const brut = {
    v: 1,
    fond: { image: url("fond", "webp"), px: 20, py: 80 },
    perso: { image: url("perso"), x: -10, y: 30, l: 120, r: 0.75 },
    haut: { image: "piece:royal", x: -20, y: -12, l: 140, h: 22 },
    bas: { image: "piece:hexa" },
    ordre: ["perso", "cadre", "bas", "haut"],
    panneau: { badges: ["sceau:assiduite", "titre:maitre:fsa"], stats: ["elo", "place"] },
    inconnu: "ignoré",
  };
  const c = compositionDepuis(brut);
  check("lecture d'une composition complète", !!c && c.fond.image === brut.fond.image && c.fond.px === 20 && c.fond.py === 80 && c.perso.image === brut.perso.image && c.haut.image === "piece:royal" && c.bas.image === "piece:hexa");
  check("la hauteur absente est proportionnelle, la hauteur donnée est gardée", c!.perso.h === null && c!.haut.h === 22);
  check("l'ordre est lu", egal(c!.ordre, brut.ordre));
  check("le panneau est lu", egal(c!.panneau, { badges: ["sceau:assiduite", "titre:maitre:fsa"], stats: ["elo", "place"] }));
  check("tout tient dans la scène", dedans(c!.perso) && dedans(c!.haut) && dedans(c!.bas));
  check("le ratio d'un préréglage est celui de son fichier, pas celui du navigateur", Math.abs(c!.bas.r - 824 / 425) < 0.001 && Math.abs(compositionDepuis({ haut: { image: "piece:royal", r: 99 } })!.haut.r - 977 / 387) < 0.001);
  check("la lecture de la chaîne JSON donne la même composition", memeComposition(compositionDepuis(JSON.stringify(brut)), c));
  const mauvais = compositionDepuis({ fond: { image: "https://evil.example/x.png" }, perso: { image: `${BASE}/${UID}/haut-1760000000000.png` }, haut: { image: "piece:inconnu" }, ordre: ["cadre", "cadre", "perso", "haut"], panneau: { badges: ["n'importe quoi", "sceau:x"], stats: ["xx", "elo"] } });
  check("des images étrangères, un mauvais élément, un préréglage inconnu : retirés", !!mauvais && !mauvais.fond.image && !mauvais.perso.image && !mauvais.haut.image);
  check("un ordre qui n'est pas une permutation revient à l'ordre par défaut", egal(mauvais!.ordre, ORDRE_DEFAUT));
  check("badges mal formés et statistiques inconnues : écartés", egal(mauvais!.panneau.badges, []) && egal(mauvais!.panneau.stats, ["elo"]));
}

// ── 6. validation stricte ──────────────────────────────────────────────
const gagnes = new Set(["sceau:assiduite", "sceau:matiere:fsa", "trophee:ciblee:3", "titre:maitre:fsa", "titre:copiste"]);
const ctx = { prefixe: PREFIXE, gagnes };
{
  check("rien à valider : null, aucun refus", (() => { const v = validerComposition(undefined, ctx); return v.composition === null && v.refus.length === 0; })());
  check("null : null, aucun refus", (() => { const v = validerComposition(null, ctx); return v.composition === null && v.refus.length === 0; })());
  check("pas un objet : refusé", (() => { const v = validerComposition(12, ctx); return v.composition === null && v.refus.length === 1; })());
  const bon = validerComposition(
    {
      fond: { image: url("fond"), px: 30, py: 60 },
      perso: { image: url("perso", "webp"), x: 5, y: 20, l: 100, r: 0.8 },
      haut: { image: "piece:epines", x: -20, y: -10, l: 140 },
      bas: { image: url("bas"), x: -20, y: 85, l: 140, h: 18, r: 2.4 },
      ordre: ["haut", "cadre", "perso", "bas"],
      panneau: { badges: ["sceau:assiduite", "trophee:ciblee:3", "titre:maitre:fsa"], stats: ["elo", "questions", "heures"] },
    },
    ctx,
  );
  check("une composition valide passe sans refus", !!bon.composition && bon.refus.length === 0, bon.refus.join(" | "));
  check("elle garde ses images, son ordre et son panneau", bon.composition!.perso.image === url("perso", "webp") && bon.composition!.haut.image === "piece:epines" && egal(bon.composition!.ordre, ["haut", "cadre", "perso", "bas"]) && egal(bon.composition!.panneau.stats, ["elo", "questions", "heures"]));
  const v = (o: Record<string, unknown>) => validerComposition(o, ctx);
  check("l'image d'un autre joueur est refusée", v({ perso: { image: `${BASE}/00000000-0000-4000-8000-0000000000ff/perso-1760000000000.png` } }).refus.length === 1);
  check("le fichier d'un autre élément est refusé (haut.png dans perso)", v({ perso: { image: url("haut") } }).refus.length === 1);
  check("« .. » et « %2e » dans le nom sont refusés", v({ perso: { image: `${PREFIXE}../perso-1760000000000.png` } }).refus.length === 1 && v({ perso: { image: `${PREFIXE}%2e%2e/perso-1760000000000.png` } }).refus.length === 1);
  check("une extension qui n'est pas PNG, WebP ou JPG est refusée", v({ perso: { image: url("perso", "gif") } }).refus.length === 1 && v({ perso: { image: url("perso", "svg") } }).refus.length === 1);
  check("un préréglage sur le personnage ou le fond est refusé", v({ perso: { image: "piece:meca" } }).refus.length === 1 && v({ fond: { image: "piece:meca" } }).refus.length === 1);
  check("sans dossier connu, aucune image envoyée n'est acceptée", validerComposition({ perso: { image: url("perso") } }, { prefixe: null, gagnes }).refus.length === 1);
  check("un badge non gagné est refusé", v({ panneau: { badges: ["sceau:duelliste"] } }).refus.length === 1);
  check("un badge mal formé est refusé", v({ panneau: { badges: ["sceau:Majuscule!", "trophee:ciblee:9", "trophee:inconnu:2", "autre:chose"] } }).refus.length === 4);
  check("sans la liste des acquis, aucun badge (sauf ceux déjà portés)", validerComposition({ panneau: { badges: ["sceau:assiduite"] } }, { prefixe: PREFIXE, gagnes: null }).refus.length === 1 && validerComposition({ panneau: { badges: ["sceau:assiduite"] } }, { prefixe: PREFIXE, gagnes: null, porte: bon.composition ? { ...bon.composition, panneau: { badges: ["sceau:assiduite"], stats: [] } } : null }).refus.length === 0);
  check("plus de trois badges : les trois premiers, le reste refusé", (() => { const r = v({ panneau: { badges: ["sceau:assiduite", "sceau:matiere:fsa", "trophee:ciblee:3", "titre:copiste"] } }); return r.composition!.panneau.badges.length === BADGES_MAX && r.refus.length === 1; })());
  check("un badge doublé n'est posé qu'une fois", v({ panneau: { badges: ["sceau:assiduite", "sceau:assiduite"] } }).composition!.panneau.badges.length === 1);
  check("une statistique inconnue est refusée, plus de trois : les trois premières", (() => { const r = v({ panneau: { stats: ["elo", "duels", "sceaux", "questions", "oups"] } }); return r.composition!.panneau.stats.length === STATS_MAX && r.refus.length === 2; })());
  check("pas de statistiques données : celles de la maquette ; liste vide : aucune", egal(v({}).composition!.panneau.stats, STATS_DEFAUT) && v({ panneau: { stats: [] } }).composition!.panneau.stats.length === 0);
  check("un ordre qui n'est pas une permutation est refusé", v({ ordre: ["perso", "haut", "bas"] }).refus.length === 1 && v({ ordre: ["perso", "haut", "bas", "fond"] }).refus.length === 1);
  check("les nombres hors bornes sont ramenés, pas refusés", (() => { const r = v({ haut: { image: "piece:meca", x: 9999, y: -9999, l: 9999, h: 9999 } }); return r.refus.length === 0 && dedans(r.composition!.haut); })());
  check("les nombres sous forme de chaîne de l'éditeur sont lus", v({ haut: { image: "piece:meca", x: "-12.5", y: "-8", l: "130" } }).composition!.haut.x === -12.5);
}

// ── 7. sérialisation ───────────────────────────────────────────────────
{
  const c = validerComposition({ perso: { image: url("perso"), x: 4, y: 12, l: 100, r: 0.8 }, haut: { image: "piece:royal", l: 140, h: 24 }, panneau: { badges: ["sceau:assiduite"], stats: ["elo"] } }, ctx).composition!;
  const j = serialiserComposition(c);
  check("les calques sans image sont omis de la forme enregistrée", !("bas" in j) && "perso" in j && "haut" in j);
  check("la hauteur proportionnelle est omise, la hauteur libre écrite", !("h" in (j.perso as object)) && (j.haut as { h: number }).h === 24);
  check("aller-retour : relire ce qu'on écrit redonne la même composition", memeComposition(compositionDepuis(j), c) && memeComposition(compositionDepuis(JSON.stringify(j)), c));
  const pire: Composition = {
    fond: { image: `https://${"a".repeat(60)}.supabase.co/storage/v1/object/public/profil-medias/${UID}/fond-1760000000000.webp`, px: 12.3, py: 45.6 },
    perso: { image: url("perso"), x: -12.3, y: 12.3, l: 100, h: 55.5, r: 0.123 },
    haut: { image: "piece:epines", x: -12.3, y: -12.3, l: 140, h: 22.2, r: 2.011 },
    bas: { image: url("bas"), x: -12.3, y: 80.1, l: 140, h: 25.5, r: 1.234 },
    ordre: ["perso", "haut", "bas", "cadre"],
    panneau: { badges: ["sceau:matiere:fixed-income-long", "trophee:atelier:4", `titre:${"x".repeat(50)}`], stats: ["meilleure-serie", "heures", "place"] },
  };
  const taille = JSON.stringify(serialiserComposition(pire)).length;
  check(`le pire cas réaliste tient dans ${COMPOSITION_MAX_CAR} caractères`, taille < COMPOSITION_MAX_CAR, `${taille} caractères`);
  const gros = { ...pire, fond: { ...pire.fond, image: `${PREFIXE}fond-1760000000000.webp` } };
  check("fichiersComposition liste les fichiers du joueur seulement (pas les préréglages)", egal([...fichiersComposition(gros)].sort(), ["bas-1760000000000.png", "fond-1760000000000.webp", "perso-1760000000000.png"]));
  check("fichiersComposition(null) est vide", fichiersComposition(null).size === 0);
}

// ── 8. l'ancien personnage ─────────────────────────────────────────────
{
  check("pas d'ancien personnage : pas de composition", compositionDepuisAncien({ perso: null }) === null && compositionDe({ perso: null }) === null && compositionDe(null) === null);
  const ancien = url("perso");
  const c = compositionDepuisAncien({ perso: ancien, persoTaille: 100, persoPos: 50 })!;
  check("l'ancien personnage devient le calque « perso », centré et posé en bas", c.perso.image === ancien && Math.abs(c.perso.x + c.perso.l / 2 - 50) < 0.2 && dedans(c.perso) && !c.haut.image && !c.bas.image, JSON.stringify(c.perso));
  check("un ancien personnage plus grand donne un calque plus large", compositionDepuisAncien({ perso: ancien, persoTaille: 150 })!.perso.l > c.perso.l);
  check("compositionDe préfère la composition enregistrée", compositionDe({ banniere: compositionDefaut(), perso: ancien }) !== null && compositionDe({ banniere: compositionDefaut(), perso: ancien })!.perso.image === null);
  check("compositionDe retombe sur l'ancien personnage", compositionDe({ banniere: null, perso: ancien })!.perso.image === ancien);
  check("un ancien personnage mal formé est ignoré", compositionDepuisAncien({ perso: "https://evil.example/perso-1760000000000.png" }) === null);
}

// ── 9. images, noms et préréglages ─────────────────────────────────────
{
  check("nom d'un fichier envoyé : <élément>-<instant>.<ext>", nomFichierImage("haut", "webp", 1760000000123) === "haut-1760000000123.webp");
  check("un nom de fichier par élément (les quatre se distinguent)", new Set(["fond", "perso", "haut", "bas"].map((k) => nomFichierImage(k as "fond", "png", 1760000000000))).size === 4);
  check("l'ancien personnage (perso-<instant>.png) est un fichier de personnage valide", imageValide("perso", url("perso"), PREFIXE) === url("perso") && imageRelue("perso", url("perso")) === url("perso"));
  check("fichierImage : le dernier segment ; un préréglage n'a pas de fichier", fichierImage(url("bas")) === "bas-1760000000000.png" && fichierImage("piece:meca") === null && fichierImage(null) === null);
  check("quatre préréglages, huit pièces", PREREGLAGES.length === 4 && PREREGLAGES.every((p) => p.haut.fichier && p.bas.fichier));
  check("prereglageDe", prereglageDe("piece:meca")?.id === "meca" && prereglageDe("piece:zzz") === null && prereglageDe("meca") === null && prereglageDe(null) === null);
  check("imagePrereglage", imagePrereglage("hexa") === "piece:hexa");
  check("adresseImage : un préréglage haut et bas donne son fichier du site", adresseImage("haut", "piece:meca") === "/bannieres/pieces/meca-haut.webp" && adresseImage("bas", "piece:meca") === "/bannieres/pieces/meca-base.webp");
  check("adresseImage : un préréglage n'a pas de fichier de personnage ni de fond", adresseImage("perso", "piece:meca") === null && adresseImage("fond", "piece:meca") === null);
  check("adresseImage : une adresse envoyée passe telle quelle, rien : null", adresseImage("perso", url("perso")) === url("perso") && adresseImage("perso", null) === null);
  const manquants = PREREGLAGES.flatMap((p) => [p.haut.fichier, p.bas.fichier]).filter((f) => !fs.existsSync(`public/bannieres/pieces/${f}`));
  check("les huit fichiers des préréglages sont dans public/bannieres/pieces/", manquants.length === 0, manquants.join(", "));
}

// ── 10. le panneau ─────────────────────────────────────────────────────
{
  check("quinze statistiques possibles, clés uniques", STATS_PANNEAU.length === 15 && new Set(STATS_PANNEAU.map((s) => s.cle)).size === 15);
  check("les trois statistiques de la maquette y sont (ELO, duels gagnés, sceaux)", STATS_DEFAUT.every((k) => STATS_PANNEAU.some((s) => s.cle === k)));
  check("genreBadge : sceau, trophée, titre", genreBadge("sceau:assiduite") === "sceau" && genreBadge("sceau:matiere:fsa") === "sceau" && genreBadge("trophee:ciblee:3") === "trophee" && genreBadge("titre:maitre:fsa") === "titre" && genreBadge("titre:copiste") === "titre");
  check("genreBadge refuse le reste", [null, 12, "", "sceau:", "trophee:ciblee:0", "trophee:ciblee:5", "trophee:nimporte:2", "piece:meca", "sceau:A", "titre:x y"].every((v) => genreBadge(v) === null));
  const s = { ...STATS_VIDES, questions: 3412, duelsGagnes: 48, duelsJoues: 60, serie: 12, meilleureSerie: 30, niveau: 7, calculsJustes: 250, examensBlancs: 2, defisRendus: 9 };
  const v = valeursPanneau(s, { elo: 1612, place: 7, secondes: 12600, sceaux: 9, trophees: 4, maitrise: 62.4 });
  check("valeursPanneau : les valeurs de ProfilStats et les extras", v.elo === 1612 && v.duels === 48 && v.sceaux === 9 && v.questions === 3412 && v.serie === 12 && v["meilleure-serie"] === 30 && v.place === 7 && v.heures === 3.5 && v["taux-duels"] === 80 && v.maitrise === 62.4);
  check("valeursPanneau sans extras : inconnu, pas zéro", (() => { const w = valeursPanneau(s); return w.elo === null && w.place === null && w.heures === null && w.sceaux === null && w.trophees === null && w.maitrise === null; })());
  check("pas de duel joué : pas de taux", valeursPanneau(STATS_VIDES)["taux-duels"] === null);
  check("une valeur pour chaque statistique", STATS_PANNEAU.every((x) => x.cle in v));
  check("formaterStat : milliers, jours, pourcentages, heures, place", formaterStat("elo", 1612) === "1 612" && formaterStat("questions", 12345) === "12 345" && formaterStat("serie", 12) === "12 j" && formaterStat("taux-duels", 80) === "80 %" && formaterStat("heures", 3.54) === "3,5 h" && formaterStat("heures", 42.4) === "42 h" && formaterStat("place", 7) === "n° 7" && formaterStat("duels", 0) === "0");
  check("formaterStat : inconnue, un tiret", formaterStat("elo", null) === "—" && formaterStat("place", undefined) === "—" && formaterStat("elo", NaN) === "—");
}

// ── 11. les badges gagnés (l'Acquis) ───────────────────────────────────
const sceau = (cle: string, palier: 0 | 1 | 2 | 3): EtatSceau => ({ def: { cle, famille: "regularite", unite: "jours", seuils: [7, 30, 100], difficulte: 1 }, palier, valeur: 3, questions: null, prochain: 7, avance: 0.4 });
const acquis = (sceaux: EtatSceau[]) => ({ ...acquisDe(STATS_VIDES), sceaux });
{
  const b = badgesGagnes(acquis([sceau("assiduite", 2), sceau("duelliste", 0)]));
  check("badgesGagnes : un sceau gagné y est, un sceau gaufré n'y est pas", b.some((x) => x.id === "sceau:assiduite" && x.genre === "sceau") && !b.some((x) => x.id === "sceau:duelliste"));
  check("badgesGagnes : un nom lisible et un identifiant bien formé", b.every((x) => x.nom.length > 0 && genreBadge(x.id) === x.genre));
  const t = badgesGagnes({ ...acquis([]), trophees: { lignes: [{ source: "ciblee", palier: 3, n: 2 }, { source: "duel", palier: 1, n: 0 }], total: 2, parPalier: { 1: 0, 2: 0, 3: 2, 4: 0 }, auMoins: () => 0, sources: [] } });
  check("badgesGagnes : un trophée par source et palier, ×n quand il y en a plusieurs ; aucun à zéro", t.some((x) => x.id === "trophee:ciblee:3" && x.detail === "×2") && !t.some((x) => x.id.startsWith("trophee:duel")));
}

// ── 12. le style : lecture, validation, écriture ───────────────────────
const prefixesMedias = { images: PREFIXE, videos: PREFIXE.replace("profil-medias", "profil-videos") };
const voulue = {
  fond: { image: url("fond"), px: 40, py: 60 },
  perso: { image: url("perso"), x: 0, y: 20, l: 100, r: 0.8 },
  haut: { image: "piece:royal" },
  bas: { image: "piece:meca" },
  ordre: ["cadre", "perso", "bas", "haut"],
  panneau: { badges: ["sceau:assiduite"], stats: ["elo", "duels", "sceaux"] },
};
const enComposition = (o: unknown) => o as Composition;
async function testsStyle() {
  const a = acquis([sceau("assiduite", 1)]);
  check("STYLE_DEFAUT : pas de composition", STYLE_DEFAUT.banniere === null);
  check("styleDepuis : colonne absente ou nulle, pas de composition", styleDepuis({}).banniere === null && styleDepuis({ banniere: null }).banniere === null && styleDepuis(null).banniere === null);
  const lu = styleDepuis({ banniere: serialiserComposition(compositionDepuis(voulue)!) });
  check("styleDepuis : la composition enregistrée est lue", !!lu.banniere && lu.banniere.fond.image === url("fond") && lu.banniere.haut.image === "piece:royal");
  check("banniereDepuis lit aussi la composition (podium, carte)", banniereDepuis({ banniere: voulue }).banniere?.perso.image === url("perso") && banniereDepuis({ banniere: "n'importe quoi" }).banniere === null);
  const porte = { frame: "aucun", banner: "lavis", titre: null, folio: null };

  const v = validerStyle({ ...STYLE_DEFAUT, banniere: enComposition(voulue) }, a, null, prefixesMedias, porte);
  check("validerStyle : une composition valide est gardée sans refus", !!v.style.banniere && v.refus.length === 0 && v.style.banniere.haut.image === "piece:royal", v.refus.join(" | "));
  check("validerStyle : le badge gagné est gardé", egal(v.style.banniere?.panneau.badges, ["sceau:assiduite"]));
  const sans = validerStyle({ ...STYLE_DEFAUT, banniere: enComposition(voulue) }, acquis([]), null, prefixesMedias, porte);
  check("validerStyle : un badge pas encore gagné est refusé, le reste est gardé", egal(sans.style.banniere?.panneau.badges, []) && sans.refus.includes("un badge du panneau") && sans.style.banniere?.fond.image === url("fond"));
  const dejaPorte = validerStyle({ ...STYLE_DEFAUT, banniere: enComposition(voulue) }, acquis([]), null, prefixesMedias, { ...porte, banniere: compositionDepuis(voulue) });
  check("validerStyle : un badge déjà porté reste (rien de gagné n'est repris)", egal(dejaPorte.style.banniere?.panneau.badges, ["sceau:assiduite"]) && dejaPorte.refus.length === 0);
  const etranger = validerStyle({ ...STYLE_DEFAUT, banniere: enComposition({ ...voulue, perso: { image: `${BASE}/00000000-0000-4000-8000-0000000000ff/perso-1760000000000.png` } }) }, a, null, prefixesMedias, porte);
  check("validerStyle : l'image d'un autre joueur est refusée", etranger.style.banniere?.perso.image === null && etranger.refus.includes("l'image de personnage"));
  const sansDossier = validerStyle({ ...STYLE_DEFAUT, banniere: enComposition(voulue) }, a, null, null, porte);
  check("validerStyle : sans dossier connu, les images envoyées sont refusées, les préréglages restent", sansDossier.style.banniere?.fond.image === null && sansDossier.style.banniere?.haut.image === "piece:royal");
  const garde = validerStyle({ ...STYLE_DEFAUT, banniere: undefined as unknown as null }, a, null, prefixesMedias, { ...porte, banniere: compositionDepuis(voulue) });
  check("validerStyle : composition absente de l'envoi, celle qu'il porte est gardée", memeComposition(garde.style.banniere, compositionDepuis(voulue)));
  const retire = validerStyle({ ...STYLE_DEFAUT, banniere: null }, a, null, prefixesMedias, { ...porte, banniere: compositionDepuis(voulue) });
  check("validerStyle : null retire la composition", retire.style.banniere === null && retire.refus.length === 0);
  check("validerStyle : une composition illisible est refusée", validerStyle({ ...STYLE_DEFAUT, banniere: enComposition(12) }, a, null, prefixesMedias, porte).refus.includes("la bannière composée"));

  // ménage : les fichiers de la composition sont gardés, l'ancien personnage aussi
  const gardes = fichiersGardesStyle({ ...v.style });
  check(
    "le ménage garde les fichiers de la composition (fond et personnage) et l'ancien personnage",
    gardes.has("fond-1760000000000.png") && gardes.has("perso-1760000000000.png") && fichiersGardesStyle({ ...STYLE_DEFAUT, perso: url("perso", "webp") }).has("perso-1760000000000.webp") && !fichiersGardesStyle(STYLE_DEFAUT).has("fond-1760000000000.png"),
  );

  // écriture : la colonne jsonb, puis les replis
  const ecrits: Record<string, unknown>[] = [];
  const admin = (manque: string[]) =>
    ({
      from: () => ({
        upsert: async (l: Record<string, unknown>) => {
          ecrits.push(l);
          const absente = manque.find((c) => c in l);
          return { error: absente ? { code: "PGRST204", message: `Could not find the '${absente}' column of 'profile_style' in the schema cache` } : null };
        },
      }),
    }) as unknown as SupabaseClient;
  const compo = v.style;
  const e1 = await ecrireStyle(admin([]), UID, compo, "2026-10-30T00:00:00Z");
  check("ecrireStyle : une écriture, la composition en jsonb avec le reste", !e1.error && e1.banniere && e1.perso && e1.titreFolio && e1.disposition && ecrits.length === 1 && (ecrits[0].banniere as { v: number }).v === 1 && "perso_url" in ecrits[0]);
  check("ecrireStyle : ce qui est écrit se relit identique", memeComposition(compositionDepuis(ecrits[0].banniere), compo.banniere));
  ecrits.length = 0;
  await ecrireStyle(admin([]), UID, { ...compo, banniere: null }, "2026-10-30T00:00:00Z");
  check("ecrireStyle : sans composition, la colonne est écrite à null (elle se vide)", "banniere" in ecrits[0] && ecrits[0].banniere === null);
  ecrits.length = 0;
  const e2 = await ecrireStyle(admin(["banniere"]), UID, compo, "2026-10-30T00:00:00Z");
  check("ecrireStyle sans la migration des bannières composées : réécrit avec le personnage, sans la composition", !e2.error && !e2.banniere && e2.perso && e2.titreFolio && ecrits.length === 2 && !("banniere" in ecrits[1]) && "perso_url" in ecrits[1]);
  ecrits.length = 0;
  const e3 = await ecrireStyle(admin(["banniere", "perso_url", "perso_taille", "perso_pos", "ornement"]), UID, compo, "2026-10-30T00:00:00Z");
  check("ecrireStyle sans aucune des deux migrations : le reste s'enregistre", !e3.error && !e3.banniere && !e3.perso && e3.titreFolio && e3.disposition && !("banniere" in ecrits[ecrits.length - 1]) && "frame" in ecrits[ecrits.length - 1]);

  // lecture : la colonne se replie
  const lectures: string[] = [];
  const client = (repond: (cols: string) => { data: unknown; error: unknown }) =>
    ({
      from: () => ({
        select: (cols: string) => ({
          in: async () => {
            lectures.push(cols);
            return repond(cols);
          },
        }),
      }),
    }) as unknown as SupabaseClient;
  const ligne = { user_id: "u1", titre: null, banniere: serialiserComposition(compositionDepuis(voulue)!) };
  const ok = await lireStyles(client(() => ({ data: [ligne], error: null })), ["u1"], ["banner_url", "perso_url", "banniere"]);
  check("lireStyles : la colonne de la composition est demandée et rendue", lectures[0].includes("banniere") && !!ok?.get("u1")?.banniere);
  lectures.length = 0;
  const repli = await lireStyles(
    client((c) => (/banniere/.test(c) ? { data: null, error: { code: "42703", message: "column profile_style.banniere does not exist" } } : { data: [{ user_id: "u1", titre: null, perso_url: null }], error: null })),
    ["u1"],
    ["banner_url", "perso_url", "banniere"],
  );
  check("lireStyles sans la migration : relit sans la composition, le reste reste", lectures.length === 2 && !lectures[1].includes("banniere") && lectures[1].includes("perso_url") && !!repli?.get("u1") && styleDepuis(repli!.get("u1")!).banniere === null);
}

// ── 13. la migration ───────────────────────────────────────────────────
{
  const sql = fs.readFileSync("migration_bannieres_composees.sql", "utf8");
  check("migration : la colonne jsonb, idempotente", /ADD COLUMN IF NOT EXISTS banniere jsonb\b/.test(sql));
  check("migration : contrainte de forme et de taille (objet, 4 000 caractères, ordre à 4 éléments)", /DROP CONSTRAINT IF EXISTS profile_style_banniere_check/.test(sql) && sql.includes("jsonb_typeof(banniere) = 'object'") && sql.includes(`<= ${COMPOSITION_MAX_CAR}`) && sql.includes("= 4"));
  check("migration : autonome, elle reprend le personnage et l'ornement", ["perso_url", "perso_taille", "perso_pos", "ornement"].every((c) => new RegExp(`ADD COLUMN IF NOT EXISTS ${c}\\b`).test(sql)) && sql.includes("profile_style_perso_url_check") && sql.includes("profile_style_ornement_check"));
  check("migration : le quota de fichiers passe à 20 (4 images + 4 remplaçantes, avec la page)", sql.includes("< 20") && !sql.includes("< 14") && sql.includes("rl_profil_medias_count"));
  check("migration : le quota est sauté avec un avertissement si migration_profil_medias.sql manque", /RAISE WARNING/.test(sql) && sql.includes("to_regprocedure"));
  check("migration : aucune instruction destructive (pas de DROP TABLE / COLUMN, de DELETE, de TRUNCATE)", !/DROP\s+(TABLE|COLUMN)|DELETE\s+FROM|TRUNCATE/i.test(sql));
  check("migration : en français, rejouable", /Idempotente/.test(sql));
  const fichiers = ["lib/profil/banniere.ts", "lib/profil/banniere-badges.ts", "lib/profil/styles.ts", "migration_bannieres_composees.sql", "scripts/profil/test-banniere-composee.ts"];
  const interdit = new RegExp(["Temp", "claude"].join("[\\\\/]") + "|" + ["AppData", "Local"].join("[\\\\/]"), "i");
  check("aucun chemin du scratchpad dans les fichiers du dépôt", fichiers.every((f) => !interdit.test(fs.readFileSync(f, "utf8").replace(/const interdit[^\n]*/, ""))));
}

// ── 14. l'envoi des quatre images ──────────────────────────────────────
async function testsEnvoi() {
  const { envoyerImageBanniere, estFichierImage, supprimerEnAttente } = await import("@/lib/profil/envoi-banniere");
  const { QuotaFichiers, Refus } = await import("@/lib/profil/envoi-media");
  const g = globalThis as unknown as { createImageBitmap?: unknown };
  const avant = g.createImageBitmap;
  g.createImageBitmap = async () => ({ width: 800, height: 1000, close: () => {} });
  type Envoi = { path: string; type: string; upsert: unknown };
  const envois: Envoi[] = [];
  const retires: string[][] = [];
  const fauxSupabase = (erreur: string | null = null, connecte = true) =>
    ({
      auth: { getUser: async () => ({ data: { user: connecte ? { id: UID } : null } }) },
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string, _blob: Blob, o: { contentType: string; upsert: boolean }) => {
            envois.push({ path: `${bucket}/${path}`, type: o.contentType, upsert: o.upsert });
            return { error: erreur ? { message: erreur } : null };
          },
          getPublicUrl: (path: string) => ({ data: { publicUrl: `${BASE}/${path}` } }),
          remove: async (l: string[]) => {
            retires.push(l);
            return { error: null };
          },
        }),
      },
    }) as unknown as SupabaseClient;
  const fichier = (nom: string, type: string, octets = 1000) => new File([new Uint8Array(octets)], nom, { type });
  try {
    for (const cle of ["fond", "perso", "haut", "bas"] as const) {
      envois.length = 0;
      const r = await envoyerImageBanniere(fauxSupabase(), cle, fichier("x.png", "image/png"));
      const nom = envois[0].path.split("/").pop() ?? "";
      check(`envoi « ${cle} » : un fichier à son nom exact, dans le dossier du joueur`, envois.length === 1 && envois[0].path.startsWith(`profil-medias/${UID}/${cle}-`) && new RegExp(`^${cle}-[0-9]{9,16}[.]png$`).test(nom) && envois[0].upsert === false);
      check(`envoi « ${cle} » : l'adresse rendue est acceptée par la validation stricte`, r.url === `${BASE}/${UID}/${nom}` && imageValide(cle, r.url, PREFIXE) === r.url);
      check(`envoi « ${cle} » : le rapport de l'image est rendu (800 × 1000 : 0,8)`, r.ratio === 0.8);
    }
    check("envoi : un PNG sans transparence perdue : tel quel, type conservé", envois[0].type === "image/png");
    envois.length = 0;
    await envoyerImageBanniere(fauxSupabase(), "haut", fichier("x.webp", "image/webp"));
    await envoyerImageBanniere(fauxSupabase(), "haut", fichier("x.jpg", "image/jpeg"));
    check("envoi : WebP et JPG acceptés, extensions conservées", /haut-[0-9]+[.]webp$/.test(envois[0].path) && /haut-[0-9]+[.]jpg$/.test(envois[1].path));
    check("envoi : le nom d'un jpg est un nom valide pour la validation", imageValide("haut", `${PREFIXE}${envois[1].path.split("/").pop()}`, PREFIXE) !== null);
    const refus = async (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e);
    check("envoi : un GIF est refusé (Refus)", (await refus(envoyerImageBanniere(fauxSupabase(), "perso", fichier("x.gif", "image/gif")))) instanceof Refus);
    envois.length = 0;
    check("envoi : trop lourd avant réduction (plus de 20 Mo) : refusé", (await refus(envoyerImageBanniere(fauxSupabase(), "perso", Object.defineProperty(fichier("x.png", "image/png"), "size", { value: 21 * 1024 * 1024 })))) instanceof Refus && envois.length === 0);
    check("envoi : non connecté : refusé", (await refus(envoyerImageBanniere(fauxSupabase(null, false), "perso", fichier("x.png", "image/png")))) instanceof Refus);
    check("envoi : le dossier plein (politique de la base) : QuotaFichiers", (await refus(envoyerImageBanniere(fauxSupabase("new row violates row-level security policy"), "perso", fichier("x.png", "image/png")))) instanceof QuotaFichiers);
    const absent = await refus(envoyerImageBanniere(fauxSupabase("Bucket not found"), "perso", fichier("x.png", "image/png")));
    check("envoi : le bucket manque : un refus lisible « arrive bientôt »", absent instanceof Refus && /arrive bientôt/.test((absent as Error).message));
    check("envoi : une autre erreur de la base remonte telle quelle (pas un Refus)", (await refus(envoyerImageBanniere(fauxSupabase("boum"), "perso", fichier("x.png", "image/png")))) instanceof Error);
    g.createImageBitmap = async () => {
      throw new Error("illisible");
    };
    check("envoi : image illisible : refusé", (await refus(envoyerImageBanniere(fauxSupabase(), "perso", fichier("x.png", "image/png")))) instanceof Refus);
    g.createImageBitmap = async () => ({ width: 800, height: 1000, close: () => {} });
    check("estFichierImage : le type, ou l'extension sans type", estFichierImage(fichier("a.png", "image/png")) && estFichierImage(fichier("a.JPG", "")) && !estFichierImage(fichier("a.gif", "image/gif")) && !estFichierImage(fichier("a.txt", "")));
    envois.length = 0;

    // le retrait d'une image envoyée puis remplacée avant d'enregistrer
    const enAttente = url("haut", "png", 1760000000111);
    const enregistree = url("haut", "png", 1760000000000);
    retires.length = 0;
    await supprimerEnAttente(fauxSupabase(), enAttente, [enregistree]);
    check("supprimerEnAttente : l'image en attente part de son dossier", retires.length === 1 && retires[0][0] === `${UID}/haut-1760000000111.png`);
    retires.length = 0;
    await supprimerEnAttente(fauxSupabase(), enregistree, [enregistree]);
    check("supprimerEnAttente : l'image enregistrée n'est jamais supprimée", retires.length === 0);
    await supprimerEnAttente(fauxSupabase(), `${BASE}/00000000-0000-4000-8000-0000000000ff/haut-1760000000111.png`, []);
    check("supprimerEnAttente : l'image d'un autre joueur n'est pas touchée", retires.length === 0);
    await supprimerEnAttente(fauxSupabase(), "piece:meca", []);
    await supprimerEnAttente(fauxSupabase(), "https://evil.example/x.png", []);
    await supprimerEnAttente(fauxSupabase(), null, []);
    check("supprimerEnAttente : un préréglage, une adresse étrangère, rien : sans effet", retires.length === 0);
  } finally {
    g.createImageBitmap = avant;
  }
}

// ── fin ────────────────────────────────────────────────────────────────
testsStyle()
  .then(testsEnvoi)
  .then(() => {
    console.log(ko === 0 ? "\nTOUT PASSE" : `\n${ko} ÉCHEC(S)`);
    process.exit(ko === 0 ? 0 : 1);
  });

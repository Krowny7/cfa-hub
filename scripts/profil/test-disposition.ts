// Tests légers de la disposition du profil, variante « grille modulaire »
// (lib/profil/disposition.ts) et des données des blocs
// (lib/profil/blocs-donnees.ts, lib/profil/blocs-resumes.ts), sans base ni
// réseau.
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-disposition.ts
// Vérifie : les rangées (formation, place libre de fin), les places vides,
// les formats permis et leurs refus, la conversion des anciennes formes
// (les 9 exemples de la spécification, et les dispositions d'avant des
// aperçus et des tests : rien ne se perd, les rangées d'avant restent des
// rangées), la validation (formats, doublons, clés inconnues, places
// libres, médias, réglages des médias, 20 éléments, forme propre,
// idempotence), le poids de la plus grosse liste, le retour arrière (l'ancien
// code relit la forme nouvelle), la page par défaut, le bloc du folio,
// aDuContenu et les résumés des blocs.
import {
  BLOCS,
  DISPOSITION_DEFAUT,
  ELEMENTS_MAX,
  FORMATS_PERMIS,
  FORMAT_DEFAUT,
  avecBlocFolio,
  blocsDe,
  cleDe,
  depuisAncienne,
  dispositionDepuis,
  estDispositionDefaut,
  estMedia,
  formatPermis,
  genreDe,
  nomBloc,
  normaliser,
  placesVides,
  raisonRefus,
  rangees,
  validerDisposition,
  type Bloc,
  type BlocMedia,
  type Disposition,
  type ElementPage,
  type Format,
  type GenreBloc,
  type Prefixes,
} from "@/lib/profil/disposition";
import { aDuContenu, type DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { extraitJournal, resumeReponses, resumeTrophees } from "@/lib/profil/blocs-resumes";
import { STATS_VIDES } from "@/lib/profil/catalogue";
import { URL_KLIPY } from "@/lib/profil/gifs";
import type { Journal } from "@/lib/profil/journal";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const egal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ── Des médias comme en base ──────────────────────────────────────────
const BASE = "https://abcdefgh.supabase.co/storage/v1/object/public";
const UID = "1b2c3d4e-0000-4000-8000-000000000001";
const UID2 = "2b2c3d4e-0000-4000-8000-000000000002";
const PREFIXES: Prefixes = { images: `${BASE}/profil-medias/${UID}/`, videos: `${BASE}/profil-videos/${UID}/` };
type Brut = Record<string, unknown>;
const img = (id: string, extra: Brut = {}): Brut => ({ k: "media", id, type: "image", url: `${PREFIXES.images}${id}.webp`, ratio: 1.5, legende: "Le week-end avant l'examen blanc.", ...extra });
const gif = (id: string, extra: Brut = {}): Brut => ({ k: "media", id, type: "image", url: `https://static.klipy.com/ii/4e7/${id}.gif`, ratio: 1, legende: null, source: "klipy", px: 220, ...extra });
const vid = (id: string, extra: Brut = {}): Brut => ({ k: "media", id, type: "video", url: `${PREFIXES.videos}${id}.mp4`, ratio: 0.5625, legende: "Mon edit", ...extra });
const k = (cle: string, extra: Brut = {}): Brut => ({ k: cle, ...extra });

/** Une liste en abrégé : « vitrine:bande », « media:imagea1:heros », « libre:tuile ». */
const abrege = (d: Disposition) => d.map((e) => (estMedia(e) ? `media:${e.id}:${e.f}` : `${e.k}:${e.f}`));
const lire = (raw: unknown) => validerDisposition(raw, "lecture");

console.log("# Les rangées");
{
  const t = (cle: "amis" | "reponses" | "trophees" | "radar"): ElementPage => ({ k: cle, f: "tuile" });
  check("aucun élément : aucune rangée", rangees([]).length === 0);
  const b = rangees([{ k: "vitrine", f: "bande" }]);
  check("une bande : une rangée pleine", b.length === 1 && b[0].libre === 0 && b[0].cases[0].f === "bande");
  const quatre = rangees([t("amis"), t("reponses"), t("trophees"), t("radar")]);
  check("4 tuiles : 3 puis 1, 8 colonnes libres", quatre.length === 2 && quatre[0].cases.length === 3 && quatre[0].libre === 0 && quatre[1].cases.length === 1 && quatre[1].libre === 8);
  const heros = rangees([{ k: "radar", f: "heros" }, { k: "journal", f: "heros" }]);
  check("2 héros : 2 rangées, 4 colonnes libres chacune", heros.length === 2 && heros.every((r) => r.libre === 4 && r.cases.length === 1));
  const thf = rangees([t("amis"), { k: "radar", f: "heros" }, t("reponses")]);
  check("tuile, héros, tuile : (tuile + héros), (tuile, 8 libres)", thf.length === 2 && thf[0].cases.map((c) => c.i).join() === "0,1" && thf[1].cases[0].i === 2 && thf[1].libre === 8);
  const libre = rangees([{ k: "libre", f: "heros" }, t("amis"), t("reponses")]);
  check("une place libre occupe sa portée", libre.length === 2 && libre[0].cases.length === 2 && libre[0].libre === 0 && libre[1].libre === 8);
  check("les cases portent leur index et leur format", thf[0].cases[1].i === 1 && thf[0].cases[1].f === "heros");
}

console.log("# Les places vides");
{
  const d: Disposition = [{ k: "radar", f: "heros" }, { k: "amis", f: "tuile" }, { k: "libre", f: "heros" }, { k: "trophees", f: "tuile" }, { k: "reponses", f: "tuile" }];
  const r = rangees(d);
  const p0 = placesVides(r[0], 0);
  const p1 = placesVides(r[1], 1);
  const p2 = placesVides(r[2], 2);
  check("rangée pleine sans place libre : aucune place", p0.length === 0);
  check("un élément libre : sa portée, son index, insérer après lui", egal(p1, [{ rangee: 1, portee: 8, i: 2, apres: 2 }]));
  check("une fin de rangée : sa portée, i null, après le dernier", egal(p2, [{ rangee: 2, portee: 8, i: null, apres: 4 }]));
  const r2 = rangees([{ k: "libre", f: "tuile" }, { k: "amis", f: "tuile" }]);
  check("un élément libre, puis la fin incomplète", egal(placesVides(r2[0], 0), [{ rangee: 0, portee: 4, i: 0, apres: 0 }, { rangee: 0, portee: 4, i: null, apres: 1 }]));
}

console.log("# Les formats permis");
{
  check("progression : tuile → héros", formatPermis("progression", "tuile") === "heros");
  check("folio, journal, GIF, vidéo : bande → héros", (["folio", "journal", "gif", "video"] as GenreBloc[]).every((g) => formatPermis(g, "bande") === "heros"));
  check("saisons : héros → bande (égalité, le plus large)", formatPermis("saisons", "heros") === "bande");
  const genres = Object.keys(FORMATS_PERMIS) as GenreBloc[];
  check("tout format permis revient tel quel", genres.every((g) => FORMATS_PERMIS[g].every((f) => formatPermis(g, f) === f)));
  check("le format par défaut est permis", genres.every((g) => FORMATS_PERMIS[g].includes(FORMAT_DEFAUT[g])));
  check("chaque bloc fixe a ses formats et son défaut", BLOCS.every((b) => FORMATS_PERMIS[b.k] && FORMAT_DEFAUT[b.k]));
  const video = lire([vid("video01", { f: "tuile" })]).disposition[0] as Bloc;
  const g = lire([gif("gifkl01", { f: "tuile" })]).disposition[0] as Bloc;
  check("raison : vidéo", raisonRefus(video, "bande") === "La vidéo ne va pas en bande : elle serait recadrée trop bas.");
  check("raison : GIF", raisonRefus(g, "bande") === "Le GIF ne va pas en bande : il serait recadré trop bas.");
  check("raison : progression", raisonRefus({ k: "progression", f: "heros" }, "tuile") === "La courbe de progression a besoin d'au moins deux tiers de la largeur.");
  check("raison : folio, journal", raisonRefus({ k: "folio", f: "tuile" }, "bande") === "Folio ne va pas en bande : trop peu de contenu pour toute la largeur." && raisonRefus({ k: "journal", f: "tuile" }, "bande") === "Journal ne va pas en bande : trop peu de contenu pour toute la largeur.");
  check("raison : saisons", raisonRefus({ k: "saisons", f: "tuile" }, "heros") === "Les saisons vont en tuile ou en bande (le palmarès en ligne).");
  check("genres et noms des médias", genreDe(video) === "video" && genreDe(g) === "gif" && nomBloc(g) === "GIF" && nomBloc({ k: "radar", f: "heros" }) === "Radar des matières");
  check("clés React : id, clé, libre-<index>", cleDe(video, 0) === "video01" && cleDe({ k: "amis", f: "tuile" }, 3) === "amis" && cleDe({ k: "libre", f: "tuile" }, 4) === "libre-4");
}

console.log("# La conversion des anciennes formes : les 9 exemples");
const EXEMPLES: { nom: string; avant: unknown[]; apres: string[] }[] = [
  {
    nom: "1. l'ancienne page par défaut",
    avant: [{ m: "plein", c: [k("vitrine")] }, { m: "plein", c: [k("radar")] }, { m: "grand-petit", c: [k("amis"), null] }],
    apres: ["vitrine:bande", "radar:bande", "amis:heros"],
  },
  { nom: "2. image (taille absente) et amis", avant: [{ m: "grand-petit", c: [img("imagea1"), k("amis")] }], apres: ["media:imagea1:heros", "amis:tuile"] },
  {
    nom: "3. folio, case vide, GIF ; puis une rangée à fin libre",
    avant: [{ m: "trois", c: [k("folio"), null, gif("gifkl01")] }, { m: "trois", c: [k("reponses"), k("trophees"), null] }],
    apres: ["folio:tuile", "libre:tuile", "media:gifkl01:tuile", "reponses:tuile", "trophees:tuile"],
  },
  { nom: "4. pile-grand : le grand passe en tête", avant: [{ m: "pile-grand", c: [k("reponses"), k("trophees"), vid("video01")] }], apres: ["media:video01:tuile", "reponses:tuile", "trophees:tuile"] },
  { nom: "5. grille de quatre avec une case vide", avant: [{ m: "quatre", c: [k("radar"), k("amis"), null, k("trophees")] }], apres: ["radar:heros", "amis:tuile", "libre:heros", "trophees:tuile"] },
  {
    nom: "6. progression refusée en tuile : la rangée déborde",
    avant: [{ m: "trois", c: [k("progression"), k("reponses"), k("trophees")] }, { m: "plein", c: [k("vitrine")] }],
    apres: ["progression:heros", "reponses:tuile", "trophees:tuile", "vitrine:bande"],
  },
  {
    nom: "7. vidéo grande en pleine largeur, puis trois colonnes",
    avant: [{ m: "plein", c: [vid("video01", { t: "l" })] }, { m: "trois", c: [k("amis"), k("trophees"), k("reponses")] }],
    apres: ["media:video01:heros", "libre:tuile", "amis:tuile", "trophees:tuile", "reponses:tuile"],
  },
  {
    nom: "7 bis. puis deux moitiés : aucune place ajoutée",
    avant: [{ m: "plein", c: [vid("video01", { t: "l" })] }, { m: "deux", c: [k("amis"), k("trophees")] }],
    apres: ["media:video01:heros", "amis:heros", "trophees:tuile"],
  },
  { nom: "8. l'ancienne liste plein/demi", avant: [k("vitrine"), k("radar", { w: "demi" }), k("amis", { w: "demi" })], apres: ["vitrine:bande", "radar:heros", "amis:tuile"] },
  { nom: "9. case vide puis petite image", avant: [{ m: "deux", c: [null, img("imagea1", { t: "s" })] }], apres: ["libre:heros", "media:imagea1:tuile"] },
];
// les dispositions d'avant des aperçus et des tests (app/preview-da/profil, scripts/profil/test-etagere.tsx)
const REELLES: { nom: string; avant: unknown[]; apres: string[] }[] = [
  {
    nom: "aperçu « image » : chiffres clés, deux médias empilés et le radar, la vidéo et les amis",
    avant: [
      { m: "plein", c: [k("vitrine")] },
      { m: "pile-grand", c: [img("exemple1", { t: "m" }), img("exemple3", { t: "m", legende: null }), k("radar")] },
      { m: "petit-grand", c: [vid("exemple2", { legende: null }), k("amis")] },
    ],
    apres: ["vitrine:bande", "radar:tuile", "media:exemple1:tuile", "media:exemple3:tuile", "media:exemple2:tuile", "amis:heros"],
  },
  { nom: "l'ancienne page par défaut sans radar", avant: [{ m: "plein", c: [k("vitrine")] }, { m: "grand-petit", c: [k("amis"), null] }], apres: ["vitrine:bande", "amis:heros"] },
  { nom: "le folio posé en deux moitiés (test de l'étagère)", avant: [{ m: "deux", c: [k("folio"), null] }], apres: ["folio:heros"] },
  {
    nom: "le folio posé à côté des amis (ancienne page par défaut)",
    avant: [{ m: "plein", c: [k("vitrine")] }, { m: "plein", c: [k("radar")] }, { m: "grand-petit", c: [k("amis"), k("folio")] }],
    apres: ["vitrine:bande", "radar:bande", "amis:heros", "folio:tuile"],
  },
  {
    nom: "grand et deux empilés, grand GIF dans une case de tuile",
    avant: [{ m: "grand-pile", c: [gif("gifkl02", { t: "l" }), k("trophees"), k("reponses")] }, { m: "petit-grand", c: [null, k("progression")] }],
    apres: ["media:gifkl02:tuile", "trophees:tuile", "reponses:tuile", "libre:tuile", "progression:heros"],
  },
  {
    nom: "rangée vide, modèle inconnu, clé inconnue : sautés comme avant",
    avant: [{ m: "trois", c: [null, null, null] }, { m: "hexa", c: [k("amis")] }, { m: "deux", c: [k("tresor"), k("radar")] }, "x", null],
    apres: ["libre:heros", "radar:tuile"],
  },
  {
    nom: "trop de cases : seules celles du modèle comptent",
    avant: [{ m: "deux", c: [k("radar"), k("amis"), k("trophees")] }],
    apres: ["radar:heros", "amis:tuile"],
  },
];
const ancienneFormeAbregee = (avant: unknown[]) => abrege(lire(avant).disposition);
for (const ex of [...EXEMPLES, ...REELLES]) {
  const v = lire(ex.avant);
  check(ex.nom, egal(abrege(v.disposition), ex.apres), egal(abrege(v.disposition), ex.apres) ? "" : JSON.stringify(abrege(v.disposition)));
  check("  aucun refus", v.refus.length === 0);
}

console.log("# Rien ne se perd");
{
  /** les blocs d'une ancienne forme, dans l'ordre de lecture de la conversion (le grand de pile-grand en tête) */
  const blocsAvant = (avant: unknown[]): Brut[] =>
    depuisAncienne(avant).filter((e) => e.k !== "libre" && (e.k === "media" || BLOCS.some((b) => b.k === e.k)));
  for (const ex of [...EXEMPLES, ...REELLES]) {
    const apres = blocsDe(lire(ex.avant).disposition);
    const avant = blocsAvant(ex.avant);
    const cles = (l: readonly { k?: unknown; id?: unknown }[]) => l.map((b) => (b.k === "media" ? `media:${b.id}` : String(b.k))).join(",");
    check(`${ex.nom.split(" ")[0]} mêmes blocs, mêmes médias, même ordre`, cles(avant) === cles(apres), cles(apres));
    const medias = apres.filter(estMedia);
    check(
      `${ex.nom.split(" ")[0]} légendes, adresses et ratios (au millième) intacts, taille d'avant disparue`,
      medias.every((m) => {
        const brut = avant.find((b) => b.id === m.id)!;
        return m.legende === (brut.legende ?? null) && !("t" in m) && m.url === brut.url && Math.abs(m.ratio - Number(brut.ratio)) < 0.001;
      }),
    );
  }
  // chaque case d'avant (bloc connu ou média) se retrouve : comptées une à une
  const casesAvant = (avant: unknown[]) => {
    const lignes = avant.some((x) => x && typeof x === "object" && "m" in x) ? avant : null;
    if (!lignes) return (avant as Brut[]).filter((b) => b && typeof b === "object").length;
    return (lignes as Brut[]).reduce((n, r) => {
      const max = { plein: 1, deux: 2, "grand-petit": 2, "petit-grand": 2, trois: 3, "grand-pile": 3, "pile-grand": 3, quatre: 4 }[String(r?.m)] ?? 0;
      return n + (Array.isArray(r?.c) ? (r.c as Brut[]).slice(0, max).filter((c) => c && (c.k === "media" || BLOCS.some((b) => b.k === c.k))).length : 0);
    }, 0);
  };
  check("chaque bloc et chaque média d'avant est là (tous les exemples)", [...EXEMPLES, ...REELLES].every((ex) => blocsDe(lire(ex.avant).disposition).length === casesAvant(ex.avant)));
}

console.log("# Les rangées d'avant restent des rangées");
{
  const ORDRE: Record<string, number[]> = { "pile-grand": [2, 0, 1] };
  const cleCase = (c: Brut) => (c.k === "media" ? `media:${c.id}` : String(c.k));
  for (const ex of [...EXEMPLES, ...REELLES]) {
    const avant = ex.avant.some((x) => x && typeof x === "object" && "m" in (x as object)) ? (ex.avant as Brut[]) : null;
    if (!avant) continue;
    const d = lire(ex.avant).disposition;
    const r = rangees(d);
    const debuts = new Set(r.map((x) => x.cases[0].i));
    const MODELES = ["plein", "deux", "grand-petit", "petit-grand", "trois", "grand-pile", "pile-grand", "quatre"];
    const nonVides = avant.filter((x) => x && typeof x === "object" && MODELES.includes(String(x.m)) && Array.isArray(x.c) && (x.c as Brut[]).some((c) => c && (c.k === "media" || BLOCS.some((b) => b.k === c.k))));
    let ok = r.length >= nonVides.length;
    for (const rangee of nonVides) {
      const premiere = (ORDRE[String(rangee.m)] ?? [0]).map((j) => (rangee.c as Brut[])[j])[0];
      if (!premiere || !(premiere.k === "media" || BLOCS.some((b) => b.k === premiere.k))) continue;
      const i = d.findIndex((e) => (estMedia(e) ? `media:${e.id}` : e.k) === cleCase(premiere));
      if (!debuts.has(i)) ok = false;
    }
    check(`${ex.nom.split(" ")[0]} la première case de chaque ancienne rangée ouvre une rangée`, ok);
  }
}

console.log("# La validation");
{
  check("pas un tableau : rien", egal(validerDisposition({ m: "plein" }, null), { disposition: [], refus: [] }) && egal(validerDisposition(null, "lecture"), { disposition: [], refus: [] }));
  check("format inconnu : celui par défaut", egal(abrege(lire([k("radar", { f: "geant" }), k("amis", { f: 3 })]).disposition), ["radar:heros", "amis:tuile"]));
  check("format refusé : le plus proche", egal(abrege(lire([k("progression", { f: "tuile" }), k("saisons", { f: "heros" })]).disposition), ["progression:heros", "saisons:bande"]));
  check("doublon retiré", egal(abrege(lire([k("amis", { f: "tuile" }), k("amis", { f: "heros" }), k("radar", { f: "heros" })]).disposition), ["amis:tuile", "radar:heros"]));
  check("journal et saisons gardés", egal(abrege(lire([k("journal", { f: "tuile" }), k("saisons", { f: "tuile" }), k("amis", { f: "tuile" })]).disposition), ["journal:tuile", "saisons:tuile", "amis:tuile"]));
  check("clé inconnue retirée", egal(abrege(lire([k("tresor", { f: "tuile" }), k("amis", { f: "tuile" })]).disposition), ["amis:tuile"]));
  check("place libre en bande retirée", egal(abrege(lire([k("vitrine", { f: "bande" }), k("libre", { f: "bande" }), k("amis", { f: "tuile" })]).disposition), ["vitrine:bande", "amis:tuile"]));
  check("place libre gardée en tuile ou en héros", egal(abrege(lire([k("libre", { f: "heros" }), k("amis", { f: "tuile" })]).disposition), ["libre:heros", "amis:tuile"]));
  check("places libres de fin retirées", egal(abrege(lire([k("amis", { f: "tuile" }), k("libre", { f: "tuile" }), k("libre", { f: "tuile" })]).disposition), ["amis:tuile"]));
  check(
    "rangée faite seulement de places libres retirée",
    egal(abrege(lire([k("vitrine", { f: "bande" }), k("libre", { f: "heros" }), k("libre", { f: "tuile" }), k("amis", { f: "tuile" }), k("radar", { f: "heros" })]).disposition), ["vitrine:bande", "amis:tuile", "radar:heros"]),
  );

  // les médias : exactement les règles d'avant
  const avec = (m: Brut, p: Prefixes | null | "lecture" = PREFIXES) => validerDisposition([{ ...m, f: m.f ?? "tuile" }], p);
  check("image de son dossier : gardée", avec(img("imagea1")).disposition.length === 1 && avec(img("imagea1")).refus.length === 0);
  check("image d'un autre dossier : refusée", avec(img("imagea1", { url: `${BASE}/profil-medias/autre/imagea1.webp` })).disposition.length === 0 && egal(avec(img("imagea1", { url: `${BASE}/profil-medias/autre/imagea1.webp` })).refus, ["un ou plusieurs médias"]));
  check("sans dossier connu (null) : refusée ; KLIPY : gardé", avec(img("imagea1"), null).disposition.length === 0 && avec(gif("gifkl01"), null).disposition.length === 1);
  check("relue : le bucket compte, pas le joueur", avec(img("imagea1", { url: `${BASE}/profil-medias/${UID2}/imagea1.webp` }), "lecture").disposition.length === 1 && avec(vid("video01", { url: `${BASE}/profil-medias/${UID}/video01.mp4` }), "lecture").disposition.length === 0);
  // un chemin que le navigateur ramènerait chez un autre joueur (new URL) : refusé, à l'écriture comme à la relecture
  const detours = [`${PREFIXES.images}../${UID2}/zzzzzz.jpg`, `${PREFIXES.images}%2e%2e/%2e%2e/avatars/${UID2}/1.jpg`, `${PREFIXES.images}sous/imagea1.jpg`];
  check(
    "« ../ » et « %2e%2e » refusés (élément retiré, refus des médias)",
    detours.every((url) => {
      const e = avec(img("imagea1", { url }));
      return e.disposition.length === 0 && egal(e.refus, ["un ou plusieurs médias"]) && avec(img("imagea1", { url }), "lecture").disposition.length === 0;
    }),
  );
  check(
    "le nom du fichier est l'id du média (« <id>.<ext> »)",
    avec(img("imagea1", { url: `${PREFIXES.images}imageb2.jpg` })).disposition.length === 0 &&
      avec(img("imagea1", { url: `${BASE}/profil-medias/${UID2}/imageb2.jpg` }), "lecture").disposition.length === 0 &&
      ["jpg", "jpeg", "png", "webp", "gif"].every((x) => avec(img("imagea1", { url: `${PREFIXES.images}imagea1.${x}` })).disposition.length === 1) &&
      ["mp4", "mov", "webm"].every((x) => avec(vid("video01", { url: `${PREFIXES.videos}video01.${x}` }), "lecture").disposition.length === 1),
  );
  check("relue : un dossier qui n'est pas un uuid refusé", avec(img("imagea1", { url: `${BASE}/profil-medias/autre/imagea1.webp` }), "lecture").disposition.length === 0);
  check("extension refusée", avec(img("imagea1", { url: `${PREFIXES.images}imagea1.mp4` })).disposition.length === 0 && avec(vid("video01", { url: `${PREFIXES.videos}video01.webp` })).disposition.length === 0);
  check("« # » refusé (jamais de #t= enregistré)", avec(vid("video01", { url: `${PREFIXES.videos}video01.mp4#t=4` })).disposition.length === 0);
  check("id invalide refusé", avec(img("A!")).disposition.length === 0 && avec(img("abc")).disposition.length === 0);
  check("adresse de plus de 500 caractères refusée", avec(img("imagea1", { url: `https://${"h".repeat(500)}.supabase.co/storage/v1/object/public/profil-medias/${UID}/imagea1.webp` }), "lecture").disposition.length === 0);
  const sept = validerDisposition(Array.from({ length: 7 }, (_, i) => img(`image0${i}`, { f: "tuile" })), PREFIXES);
  check("6 médias au plus", sept.disposition.filter((e) => e.k === "media").length === 6 && egal(sept.refus, ["un ou plusieurs médias"]));
  const deux = validerDisposition([vid("video01", { f: "tuile" }), vid("video02", { f: "tuile" })], PREFIXES);
  check("une vidéo au plus", deux.disposition.length === 1 && deux.refus.length === 1);
  const memeId = validerDisposition([img("imagea1", { f: "tuile" }), img("imagea1", { f: "tuile" })], PREFIXES);
  check("même id : le second refusé", memeId.disposition.length === 1 && memeId.refus.length === 1);
  const g = avec(gif("gifkl01", { px: 99999 })).disposition[0] as BlocMedia;
  check("KLIPY : source posée, px hors bornes retiré", g.source === "klipy" && !("px" in g) && (avec(gif("gifkl01")).disposition[0] as BlocMedia).px === 220);
  check("légende nettoyée", (avec(img("imagea1", { legende: "  Ligne\nsuivante  " + "é".repeat(100) })).disposition[0] as BlocMedia).legende!.length === 80);
  check("ratio borné", (avec(img("imagea1", { ratio: 40 })).disposition[0] as BlocMedia).ratio === 4 && (avec(img("imagea1", { ratio: "x" })).disposition[0] as BlocMedia).ratio === 16 / 9);

  // les réglages des médias
  const y = (v: unknown) => (avec(img("imagea1", { y: v })).disposition[0] as BlocMedia).y;
  check("y : entier, borné de 0 à 100", y(33.6) === 34 && y(150) === 100 && y(-5) === 0 && y(15) === 15);
  check("y : absent s'il n'est pas un nombre, et sur une vidéo", y("50") === undefined && y(null) === undefined && !("y" in (avec(vid("video01", { y: 30 })).disposition[0] as BlocMedia)));
  const v = (extra: Brut) => avec(vid("video01", extra)).disposition[0] as BlocMedia;
  check("durée : au dixième, de 0,5 à 61", v({ duree: 24.34 }).duree === 24.3 && v({ duree: 0.2 }).duree === undefined && v({ duree: 90 }).duree === undefined && v({ duree: "24" }).duree === undefined);
  check("couverture : au demi, bornée par la durée (60 sans elle)", v({ duree: 24.3, couverture: 4.3 }).couverture === 4.5 && v({ duree: 24.3, couverture: 100 }).couverture === 24 && v({ couverture: 70 }).couverture === 60 && v({ couverture: -1 }).couverture === undefined);
  const i = avec(img("imagea1", { duree: 12, couverture: 3 })).disposition[0] as BlocMedia;
  check("durée et couverture absentes sur une image", !("duree" in i) && !("couverture" in i));
  check("la taille d'avant (t) est retirée", !("t" in (avec(img("imagea1", { t: "l" })).disposition[0] as BlocMedia)));
  check("format d'un média : refusé → le plus proche, inconnu → défaut", v({ f: "bande" }).f === "heros" && (avec(img("imagea1", { f: "x" })).disposition[0] as BlocMedia).f === "heros" && (avec(gif("gifkl01", { f: "x" })).disposition[0] as BlocMedia).f === "tuile");
  check("un GIF KLIPY en .webp reste un GIF (bande refusée)", (avec(gif("gifkl03", { url: "https://static.klipy.com/ii/4e7/gifkl03.webp", source: undefined, f: "bande" })).disposition[0] as BlocMedia).f === "heros");

  // 20 éléments au plus, aucun bloc perdu
  const blocs: Brut[] = [...BLOCS.map((b) => k(b.k, { f: "tuile" })), ...Array.from({ length: 5 }, (_, j) => img(`imagez${j}`, { f: "tuile" })), vid("videoz1", { f: "tuile" })];
  const vingtCinq: Brut[] = [];
  blocs.forEach((b, j) => {
    vingtCinq.push(b);
    if (j < 10) vingtCinq.push(k("libre", { f: "tuile" }));
  });
  const v25 = validerDisposition(vingtCinq, PREFIXES);
  check("25 éléments : 20 au plus, aucun bloc perdu", vingtCinq.length === 25 && v25.disposition.length <= ELEMENTS_MAX && blocsDe(v25.disposition).length === 15 && v25.refus.length === 0, `${v25.disposition.length} éléments`);
  check("on ne lit que les 60 premiers", lire([...Array.from({ length: 60 }, () => k("libre", { f: "tuile" })), k("amis", { f: "tuile" })]).disposition.length === 0);
  check("normaliser : une liste propre garde sa référence", normaliser(DISPOSITION_DEFAUT) === DISPOSITION_DEFAUT);

  // idempotence
  const cas: unknown[] = [...EXEMPLES, ...REELLES].map((e) => e.avant);
  cas.push(vingtCinq, blocs, [k("vitrine", { f: "bande" }), k("libre", { f: "heros" }), k("libre", { f: "tuile" }), k("amis", { f: "tuile" })], [img("imagea1", { y: 33.6, f: "bande" }), vid("video01", { duree: 24.34, couverture: 99 })]);
  check(
    "idempotence : une liste validée repasse à l'identique",
    cas.every((c) => {
      const une = validerDisposition(c, PREFIXES).disposition;
      const deuxFois = validerDisposition(une, PREFIXES).disposition;
      const relue = validerDisposition(une, "lecture").disposition;
      return egal(une, deuxFois) && egal(une, relue);
    }),
  );
}

console.log("# Le poids");
{
  // le nom du fichier est l'id du média : l'hôte s'allonge jusqu'à 500 caractères
  const url = (bucket: string, id: string, ext: string) => {
    const fin = `.supabase.co/storage/v1/object/public/${bucket}/${UID}/${id}${ext}`;
    return "https://" + "h".repeat(500 - "https://".length - fin.length) + fin;
  };
  const legende = "Été à Sceaux : révisions d'éthique, cafés serrés, fiches à l'encre, déjà mûr ?!".padEnd(80, "é");
  const gros: Brut[] = [
    ...BLOCS.map((b) => k(b.k, { f: FORMAT_DEFAUT[b.k] })),
    ...Array.from({ length: 5 }, (_, j) => ({ k: "media", id: `imageg${j}abcdefghijklmnopq`.slice(0, 24), type: "image", url: url("profil-medias", `imageg${j}abcdefghijklmnopq`.slice(0, 24), ".webp"), ratio: 1.777, legende, y: 88, f: "heros" })),
    { k: "media", id: "videogabcdefghijklmnopqr", type: "video", url: url("profil-videos", "videogabcdefghijklmnopqr", ".webm"), ratio: 0.5625, legende, duree: 59.9, couverture: 29.5, f: "tuile" },
    ...Array.from({ length: 5 }, () => k("libre", { f: "tuile" })),
  ];
  // la liste brute de 20 éléments (borne haute : places libres comprises) et la même, validée
  const v = validerDisposition(gros, "lecture");
  const brut = Buffer.byteLength(JSON.stringify(gros), "utf8");
  const octets = Buffer.byteLength(JSON.stringify(v.disposition), "utf8");
  check("la plus grosse liste : 15 blocs, adresses de 500, légendes de 80", gros.length === 20 && blocsDe(v.disposition).length === 15 && blocsDe(v.disposition).filter(estMedia).every((m) => m.url.length === 500 && m.legende!.length === 80));
  check("moins de 16 000 octets", brut < 16000 && octets < 16000, `${brut} octets bruts (20 éléments), ${octets} validés`);
}

console.log("# Le retour arrière : l'ancien code relit la forme nouvelle");
{
  // l'ancienne lecture (validerDisposition d'avant, en « lecture »), recopiée pour ce qui sert ici
  // (la liste nouvelle n'a jamais de « w » : chaque bloc y fait une rangée pleine)
  const ANCIENS_BLOCS = ["vitrine", "radar", "amis", "reponses", "trophees", "progression", "folio"];
  const ANCIENS_MODELES: Record<string, number> = { plein: 1, deux: 2, "grand-petit": 2, "petit-grand": 2, trois: 3, "grand-pile": 3, "pile-grand": 3, quatre: 4 };
  function ancienneLecture(raw: unknown): { m: string; c: (Brut | null)[] }[] {
    const vus = new Set<string>();
    let medias = 0;
    let videos = 0;
    const bloc = (x: unknown): Brut | null => {
      if (!x || typeof x !== "object") return null;
      const b = x as Brut;
      if (b.k === "media") {
        const id = typeof b.id === "string" && /^[a-z0-9]{6,24}$/.test(b.id) ? b.id : null;
        const type = b.type === "image" ? "image" : b.type === "video" ? "video" : null;
        const url = typeof b.url === "string" ? b.url.trim() : "";
        const klipy = type === "image" && URL_KLIPY.test(url);
        const bucket = type === "video" ? "profil-videos" : "profil-medias";
        const ok =
          id &&
          type &&
          (klipy || new RegExp(`^https:[/][/][^/]+[/]storage[/]v1[/]object[/]public[/]${bucket}[/]`).test(url)) &&
          url.length <= 500 &&
          /^[A-Za-z0-9:/._%-]+$/.test(url) &&
          (type === "video" ? /[.](mp4|mov|webm)$/i : /[.](jpe?g|png|webp|gif)$/i).test(url) &&
          !vus.has("m:" + id);
        if (!ok || medias >= 6 || (type === "video" && videos >= 1)) return null;
        vus.add("m:" + id);
        medias++;
        if (type === "video") videos++;
        return { k: "media", id, type, url, legende: b.legende ?? null };
      }
      const info = ANCIENS_BLOCS.find((c) => c === b.k);
      if (!info || vus.has(info)) return null;
      vus.add(info);
      return { k: info };
    };
    let liste: unknown[] = Array.isArray(raw) ? raw.slice(0, 40) : [];
    if (liste.length && liste.every((x) => x && typeof x === "object" && "k" in (x as object))) {
      liste = (liste as Brut[]).map((b) => ({ m: b.w === "demi" ? "deux" : "plein", c: [b] }));
    }
    const out: { m: string; c: (Brut | null)[] }[] = [];
    for (const x of liste) {
      if (out.length >= 12) break;
      const r = x as { m?: unknown; c?: unknown };
      const n = ANCIENS_MODELES[String(r?.m)];
      if (!n) continue;
      const cases = (Array.isArray(r.c) ? r.c : []).slice(0, n).map(bloc);
      if (cases.some((c) => c)) out.push({ m: String(r.m), c: cases });
    }
    return out;
  }
  const riche = lire([
    k("vitrine", { f: "bande" }),
    k("journal", { f: "tuile" }),
    k("radar", { f: "heros" }),
    k("libre", { f: "tuile" }),
    img("imagea1", { f: "heros", y: 15 }),
    k("amis", { f: "tuile" }),
    vid("video01", { f: "tuile", duree: 24.3, couverture: 4 }),
    k("saisons", { f: "bande" }),
    gif("gifkl01", { f: "tuile" }),
    k("folio", { f: "tuile" }),
  ]).disposition;
  const relue = ancienneLecture(riche);
  const vus = relue.flatMap((r) => r.c.filter((c): c is Brut => !!c).map((c) => (c.k === "media" ? `media:${c.id}` : String(c.k))));
  const attendus = blocsDe(riche)
    .filter((b) => estMedia(b) || ANCIENS_BLOCS.includes(b.k))
    .map((b) => (estMedia(b) ? `media:${b.id}` : b.k));
  check("tous les blocs connus d'avant et tous les médias, dans l'ordre", vus.join() === attendus.join(), vus.join());
  check("une rangée pleine par bloc ; journal, saisons et places libres sautés", relue.every((r) => r.m === "plein" && r.c.length === 1) && !vus.includes("journal") && !vus.includes("saisons"));
  check("par exemple la page par défaut", egal(ancienneLecture(DISPOSITION_DEFAUT).map((r) => r.c[0]?.k), ["vitrine", "radar", "amis"]));
}

console.log("# La page par défaut");
{
  check("sans disposition : celle par défaut", dispositionDepuis(null, true) === DISPOSITION_DEFAUT && estDispositionDefaut(dispositionDepuis(undefined, true)));
  const sans = dispositionDepuis(null, false);
  check("sans radar : chiffres clés en bande, amis en héros", estDispositionDefaut(sans) && egal(abrege(sans), ["vitrine:bande", "amis:heros"]));
  check("la page par défaut : une bande, puis une rangée pleine", egal(abrege(DISPOSITION_DEFAUT), ["vitrine:bande", "radar:heros", "amis:tuile"]) && rangees(DISPOSITION_DEFAUT).every((r) => r.libre === 0));
  check("une disposition enregistrée n'est pas celle par défaut", !estDispositionDefaut(dispositionDepuis([...DISPOSITION_DEFAUT], true)));
  check("la page par défaut passe la validation à l'identique", egal(lire(DISPOSITION_DEFAUT).disposition, DISPOSITION_DEFAUT) && egal(lire(sans).disposition, sans));
  check("blocsDe : sans les places libres", egal(blocsDe([{ k: "libre", f: "tuile" }, { k: "amis", f: "tuile" }]), [{ k: "amis", f: "tuile" }]));
}

console.log("# Le bloc du folio");
{
  const d = avecBlocFolio(DISPOSITION_DEFAUT);
  check("page pleine : en tuile à la fin", egal(abrege(d), ["vitrine:bande", "radar:heros", "amis:tuile", "folio:tuile"]));
  check("déjà posé : même référence", avecBlocFolio(d) === d);
  const libre: Disposition = [{ k: "radar", f: "heros" }, { k: "libre", f: "tuile" }, { k: "amis", f: "heros" }, { k: "libre", f: "tuile" }, { k: "trophees", f: "tuile" }];
  check("remplace la première place libre, à son format", egal(abrege(avecBlocFolio(libre)), ["radar:heros", "folio:tuile", "amis:heros", "libre:tuile", "trophees:tuile"]));
  check("place libre en héros : le folio en héros", egal(abrege(avecBlocFolio([{ k: "libre", f: "heros" }, { k: "amis", f: "tuile" }])), ["folio:heros", "amis:tuile"]));
  const incomplete: Disposition = [{ k: "vitrine", f: "bande" }, { k: "amis", f: "heros" }, { k: "radar", f: "heros" }, { k: "trophees", f: "tuile" }];
  check("sinon juste après la première rangée incomplète", egal(abrege(avecBlocFolio(incomplete)), ["vitrine:bande", "amis:heros", "folio:tuile", "radar:heros", "trophees:tuile"]));
  const sansRadar = avecBlocFolio(dispositionDepuis(null, false));
  check("page par défaut sans radar : à côté des amis", egal(abrege(sansRadar), ["vitrine:bande", "amis:heros", "folio:tuile"]));
  const vingt: Disposition = Array.from({ length: ELEMENTS_MAX }, () => ({ k: "vitrine" as const, f: "bande" as Format }));
  check("20 éléments pleins : inchangé", avecBlocFolio(vingt) === vingt);
  check(
    "le résultat passe la validation à l'identique",
    [DISPOSITION_DEFAUT, libre, incomplete, dispositionDepuis(null, false)].every((x) => {
      const f = avecBlocFolio(x);
      return egal(lire(f).disposition, f);
    }),
  );
}

console.log("# Les données des blocs");
{
  const d: DonneesBlocs = {
    id: "u1",
    nom: "Léa",
    moi: false,
    viewerId: "u2",
    accent: "encre",
    showcase: ["questions", "serie", "matiere"],
    stats: STATS_VIDES,
    radar: { moyennes: {}, miennes: null, monAccent: null },
    amis: null,
    reponses: null,
    trophees: null,
    progression: null,
    folio: null,
    journal: null,
    saisons: null,
    visibiliteJournal: "public",
  };
  const b = (cle: string): Bloc => ({ k: cle, f: "tuile" }) as Bloc;
  check("vitrine, radar, médias : toujours du contenu", aDuContenu(b("vitrine"), d) && aDuContenu(b("radar"), d) && aDuContenu(lire([img("imagea1", { f: "tuile" })]).disposition[0] as Bloc, d));
  check("données nulles : rien à montrer", ["amis", "reponses", "trophees", "progression", "folio", "journal", "saisons"].every((c) => !aDuContenu(b(c), d)));
  check("saisons : une saison en cours ou un palmarès", !aDuContenu(b("saisons"), { ...d, saisons: { courante: null, palmares: [] } }));
  const pleines: DonneesBlocs = {
    ...d,
    amis: { amis: [], total: 0 },
    reponses: { total: 0, justes: 0, precision: null, sources: [], incomplet: false },
    trophees: { lignes: [], complet: true },
    progression: [],
    folio: { nom: "Mains", oeuvre: "Études de mains", image: null, anecdote: ["a", "b"] },
    journal: { depart: 1000, points: [], matchs: 0, evenements: [] },
  };
  check("données lues (même vides) : le bloc se montre", ["amis", "reponses", "trophees", "progression", "folio", "journal"].every((c) => aDuContenu(b(c), pleines)));

  const r = resumeReponses({ available: true, missing: ["duel"], by: { daily: [10, 7], qcm: [40, 30], duel: [0, 0] }, subjects: [] } as never);
  check(
    "réponses : total, justes, précision, sources triées sans les vides, incomplet",
    !!r && r.total === 50 && r.justes === 37 && r.precision === 74 && egal(r.sources.map((s) => s.source), ["qcm", "daily"]) && r.sources[0].nom === "QCM" && r.incomplet,
    JSON.stringify(r),
  );
  check("réponses illisibles : null", resumeReponses({ available: false, missing: [], by: {}, subjects: [] }) === null);
  const t = resumeTrophees({ lignes: [{ source: "ciblee", palier: 3, n: 2 }] as never, complet: false, auMoins: () => 0 } as never);
  check("trophées : lignes et complet, sans fonction", egal(Object.keys(t), ["lignes", "complet"]) && t.complet === false && t.lignes.length === 1);
  const points = Array.from({ length: 120 }, (_, j) => ({ jour: "2026-10-01", rang: 0, surJour: 1, apres: 1000 + j, delta: 1, source: "duel" }));
  const j = extraitJournal({
    aujourdhui: "2026-10-17",
    courbe: { debut: "2026-07-20", fin: "2026-10-17", depart: 990, points, matchs: 130, pic: 1119 },
    jours: new Map(),
    serie: 0,
    record: 0,
    seuil: null,
    evenements: Array.from({ length: 6 }, (_, n) => ({ type: "palier" as const, cle: `p${n}`, jour: "2026-10-01", palier: n })),
  } as unknown as Journal);
  check("journal : départ, 90 derniers points, matchs, 4 événements", j.depart === 990 && j.points.length === 90 && j.points[89] === 1119 && j.matchs === 130 && j.evenements.length === 4 && j.evenements[0].cle === "p0");
  check("l'extrait est sérialisable", egal(JSON.parse(JSON.stringify(j)), j));
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est bon.");
process.exit(ko ? 1 : 0);

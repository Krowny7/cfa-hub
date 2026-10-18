// Tests légers des modèles de la page du profil (lib/profil/modeles-page.ts),
// sans base ni réseau.
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-modeles.ts
// Vérifie : la structure des trois modèles (3 rangées pleines, les 3
// formats, trois silhouettes, chaque bloc et chaque remplaçant permis au
// format de sa case), leur adaptation à trois joueurs (bien rempli, peu de
// contenu, tout neuf : les pages attendues ; jamais un bloc qui ne montre
// rien, jamais un héros ou une bande sans vrai contenu, sauf un sûr), les
// médias (tous gardés, dans l'ordre, avec leurs champs ; seul le format
// change ; les rangées de fin pleines), la forme (aucune place libre, 20
// éléments au plus, la validation rend la liste à l'identique, le poids,
// l'idempotence), les chiffres clés, la page de départ, le modèle actuel, les
// cas extrêmes (base pas prête, Journal privé) et la progression à moins de
// deux séances.
import { blocsDe, estLibre, estMedia, rangees, validerDisposition, DISPOSITION_DEFAUT, ELEMENTS_MAX, FORMATS_PERMIS, type BlocMedia, type Disposition, type Format } from "@/lib/profil/disposition";
import { aDuContenu, type DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { STYLE_DEFAUT, vitrineDepuis } from "@/lib/profil/catalogue";
import { MODELES_PAGE, appliquerModele, estDefautParContenu, estPageDepart, modeleActuel, montre, pageDepart, riche, type CleModele, type ModelePage } from "@/lib/profil/modeles-page";
import { DISPO_RICHE, RICHE, SOBRE } from "./donnees-blocs-exemple";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const egal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ── Des médias comme en base ──────────────────────────────────────────
const BASE = "https://abcdefgh.supabase.co/storage/v1/object/public";
const UID = "1b2c3d4e-0000-4000-8000-000000000001";
const lu = (raw: Record<string, unknown>[]) => validerDisposition(raw, "lecture").disposition;
const img = (id: string, y = 30) => ({ k: "media", id, type: "image", url: `${BASE}/profil-medias/${UID}/${id}.webp`, ratio: 1.5, legende: `Légende ${id}`, y, f: "heros" });
const gif = (id: string) => ({ k: "media", id, type: "image", url: `https://static.klipy.com/ii/4e7/${id}.gif`, ratio: 1, legende: null, source: "klipy", px: 220, f: "tuile" });
const vid = (id: string) => ({ k: "media", id, type: "video", url: `${BASE}/profil-videos/${UID}/${id}.mp4`, ratio: 0.5625, legende: "Mon edit", duree: 12, couverture: 4, f: "tuile" });
/** une page composée, où l'on glisse des médias */
const avec = (medias: Record<string, unknown>[]): Disposition => lu([{ k: "radar", f: "heros" }, medias[0], { k: "amis", f: "tuile" }, ...medias.slice(1)].filter(Boolean) as Record<string, unknown>[]);

/** Une liste en abrégé : « vitrine:bande », « media:imagea1:heros ». */
const abrege = (d: Disposition) => d.map((e) => (estMedia(e) ? `media:${e.id}:${e.f}` : `${e.k}:${e.f}`));
/** la silhouette : les formats, rangée par rangée */
const silhouette = (d: Disposition) => rangees(d).map((r) => r.cases.map((c) => c.f[0].toUpperCase()).join("·")).join(" / ");
const modele = (cle: CleModele) => MODELES_PAGE.find((m) => m.cle === cle)!;

// ── Trois joueurs ─────────────────────────────────────────────────────
/** quelques centaines de réponses, radar en partie mesuré, quelques duels et des matchs cette saison, Journal public ; 0 ami, 0 trophée, pas de folio, une séance */
const PEU: DonneesBlocs = {
  ...SOBRE,
  amis: { amis: [], total: 0 },
  reponses: { total: 286, justes: 170, precision: 59, sources: [{ source: "daily", nom: "Défi du jour", n: 286, pct: 59 }], incomplet: false },
  trophees: { lignes: [], complet: true },
  progression: RICHE.progression!.slice(0, 1),
  folio: null,
  journal: { depart: 1200, points: [1212, 1204, 1219], matchs: 3, evenements: [] },
  saisons: { courante: { ...RICHE.saisons!.courante!, moi: { pic: { palier: 1, division: "III" }, eloPic: 1219, matchs: 3 } }, palmares: [] },
  visibiliteJournal: "public",
};
/** rien de tout cela ; la saison en cours, sans match */
const NEUF: DonneesBlocs = {
  ...PEU,
  stats: { ...SOBRE.stats, questions: 0, serie: 0, meilleureSerie: 0, matieres: SOBRE.stats.matieres.map((m) => ({ ...m, pct: null, answered: 0 })) },
  reponses: { total: 0, justes: 0, precision: null, sources: [], incomplet: false },
  progression: [],
  journal: { depart: 1000, points: [], matchs: 0, evenements: [] },
  saisons: { courante: { ...RICHE.saisons!.courante!, moi: null }, palmares: [] },
};
/** la base pas prête : tout ce qui se lit à part est nul */
const NUL: DonneesBlocs = { ...NEUF, amis: null, reponses: null, trophees: null, progression: null, folio: null, journal: null, saisons: null };

const JOUEURS: [string, DonneesBlocs][] = [
  ["bien rempli", RICHE],
  ["peu de contenu", PEU],
  ["tout neuf", NEUF],
];

console.log("# La structure des modèles");
{
  check("trois modèles, trois clés", MODELES_PAGE.length === 3 && new Set(MODELES_PAGE.map((m) => m.cle)).size === 3);
  for (const m of MODELES_PAGE) {
    const r = appliquerModele(m, [], RICHE);
    const rs = rangees(r.disposition);
    check(`${m.cle} : 3 rangées pleines`, rs.length === 3 && rs.every((x) => x.libre === 0), silhouette(r.disposition));
    check(`${m.cle} : les 3 formats`, (["tuile", "heros", "bande"] as Format[]).every((f) => r.disposition.some((e) => e.f === f)));
    const permis = m.cases.every((c) => (c.k === "media" ? FORMATS_PERMIS.image.includes(c.f) && FORMATS_PERMIS.gif.includes(c.f) && FORMATS_PERMIS.video.includes(c.f) : FORMATS_PERMIS[c.k].includes(c.f)) && (c.sinon ?? []).every((k) => FORMATS_PERMIS[k].includes(c.f)));
    check(`${m.cle} : chaque bloc et chaque remplaçant permis au format de sa case`, permis);
    check(`${m.cle} : chiffres clés valides`, m.chiffres.length === 3 && egal(vitrineDepuis(m.chiffres), m.chiffres));
  }
  const formes = MODELES_PAGE.map((m) => m.cases.map((c) => c.f).join(","));
  check("trois silhouettes deux à deux différentes", new Set(formes).size === 3, formes.join(" | "));
}

console.log("# L'adaptation à trois joueurs");
{
  const attendu: Record<CleModele, Record<string, string[]>> = {
    competiteur: {
      "bien rempli": ["journal:heros", "vitrine:tuile", "saisons:bande", "amis:tuile", "trophees:tuile", "reponses:tuile"],
      "peu de contenu": ["journal:heros", "vitrine:tuile", "saisons:bande", "amis:tuile", "trophees:tuile", "reponses:tuile"],
      "tout neuf": ["radar:heros", "vitrine:tuile", "amis:bande", "reponses:tuile", "trophees:tuile", "journal:tuile"],
    },
    etudiant: {
      "bien rempli": ["vitrine:bande", "reponses:tuile", "radar:heros", "progression:heros", "trophees:tuile"],
      "peu de contenu": ["vitrine:bande", "reponses:tuile", "radar:heros", "journal:heros", "trophees:tuile"],
      "tout neuf": ["vitrine:bande", "reponses:tuile", "radar:heros", "amis:heros", "trophees:tuile"],
    },
    collection: {
      "bien rempli": ["vitrine:tuile", "folio:heros", "amis:tuile", "trophees:tuile", "reponses:tuile", "saisons:bande"],
      "peu de contenu": ["vitrine:tuile", "radar:heros", "amis:tuile", "trophees:tuile", "reponses:tuile", "saisons:bande"],
      "tout neuf": ["vitrine:tuile", "radar:heros", "amis:tuile", "trophees:tuile", "reponses:tuile"],
    },
  };
  for (const m of MODELES_PAGE)
    for (const [nom, d] of JOUEURS) {
      const r = appliquerModele(m, [], d);
      check(`${m.cle}, ${nom} : la page attendue`, egal(abrege(r.disposition), attendu[m.cle][nom]), abrege(r.disposition).join(" "));
      const blocs = blocsDe(r.disposition).filter((b) => !estMedia(b));
      check(`${m.cle}, ${nom} : aucun bloc qui ne montre rien`, blocs.every((b) => !estMedia(b) && montre(b.k, d)));
      check(
        `${m.cle}, ${nom} : héros et bandes, du vrai contenu (ou un sûr)`,
        blocs.every((b) => estMedia(b) || b.f === "tuile" || ["vitrine", "radar", "amis"].includes(b.k) || riche(b.k, d)),
      );
      check(`${m.cle}, ${nom} : rangées pleines`, rangees(r.disposition).every((x) => x.libre === 0) || (m.cle === "collection" && nom === "tout neuf" && rangees(r.disposition).length === 2));
    }
  const c = appliquerModele(modele("competiteur"), [], NEUF);
  check("les remplacements sont dits (Radar au lieu de Journal…)", egal(c.remplaces[0], { voulu: "journal", mis: "radar" }) && c.remplaces.length === 4);
  check("bien rempli : aucun remplacement (sauf les emplacements média du Collectionneur)", MODELES_PAGE.every((m) => appliquerModele(m, [], RICHE).remplaces.length === (m.cle === "collection" ? 3 : 0)));
  const col = appliquerModele(modele("collection"), [], RICHE);
  check("collection sans média : le folio au lieu de l'image, puis les amis au lieu du folio", egal(col.remplaces.slice(0, 2), [{ voulu: "media", mis: "folio" }, { voulu: "folio", mis: "amis" }]));
}

console.log("# Les médias");
{
  const cas: [string, Record<string, unknown>[]][] = [
    ["0 média", []],
    ["1 image", [img("imagea1")]],
    ["1 GIF", [gif("gifkl01")]],
    ["1 vidéo", [vid("video01")]],
    ["2 médias", [img("imagea1"), vid("video01")]],
    ["3 médias", [img("imagea1"), gif("gifkl01"), img("imageb2", 88)]],
    ["4 médias", [img("imagea1"), gif("gifkl01"), img("imageb2"), vid("video01")]],
    ["5 médias", [img("imagea1"), gif("gifkl01"), img("imageb2"), vid("video01"), img("imagec3")]],
    ["6 médias", [img("imagea1"), gif("gifkl01"), img("imageb2"), vid("video01"), img("imagec3"), gif("gifkl02")]],
  ];
  for (const [nom, medias] of cas) {
    const actuelle = avec(medias);
    const avant = blocsDe(actuelle).filter(estMedia);
    check(`${nom} : la page d'essai les a tous`, avant.length === medias.length);
    for (const m of MODELES_PAGE) {
      const r = appliquerModele(m, actuelle, RICHE);
      const apres = blocsDe(r.disposition).filter(estMedia);
      const sansF = (x: BlocMedia) => {
        const { f: _f, ...reste } = x;
        return reste;
      };
      check(`${nom}, ${m.cle} : tous gardés, dans l'ordre, champs intacts`, egal(apres.map(sansF), avant.map(sansF)));
      check(`${nom}, ${m.cle} : rangées pleines`, rangees(r.disposition).every((x) => x.libre === 0), silhouette(r.disposition));
      check(`${nom}, ${m.cle} : chaque média à un format permis`, apres.every((x) => FORMATS_PERMIS[x.type === "video" ? "video" : x.source === "klipy" ? "gif" : "image"].includes(x.f)));
    }
  }
  const deux = appliquerModele(modele("collection"), avec([img("imagea1"), vid("video01"), img("imageb2")]), RICHE);
  check(
    "collection : le 1er média en grand, le 2e en tuile, le 3e en bande à la fin",
    egal(abrege(deux.disposition), ["vitrine:tuile", "media:imagea1:heros", "folio:tuile", "trophees:tuile", "media:video01:tuile", "saisons:bande", "media:imageb2:bande"]),
    abrege(deux.disposition).join(" "),
  );
  const gifSeul = appliquerModele(modele("competiteur"), avec([gif("gifkl01")]), RICHE);
  check("1 GIF à la fin : héros, et un bloc masqué en bouche-trou", egal(abrege(gifSeul.disposition).slice(-2), ["media:gifkl01:heros", "radar:tuile"]));
  const sansBouche = appliquerModele(modele("etudiant"), avec([vid("video01")]), NUL);
  check("sans bouche-trou : la vidéo reste, rien en double", blocsDe(sansBouche.disposition).filter(estMedia).length === 1 && new Set(abrege(sansBouche.disposition)).size === sansBouche.disposition.length);
}

console.log("# La forme");
{
  const six = avec([img("imagea1"), gif("gifkl01"), img("imageb2"), vid("video01"), img("imagec3"), gif("gifkl02")]);
  for (const m of MODELES_PAGE)
    for (const [nom, d] of [...JOUEURS, ["base pas prête", NUL] as [string, DonneesBlocs]]) {
      for (const actuelle of [[], six] as Disposition[]) {
        const r = appliquerModele(m, actuelle, d);
        const quoi = `${m.cle}, ${nom}, ${blocsDe(actuelle).length ? "6 médias" : "sans média"}`;
        check(`${quoi} : aucune place libre, ${ELEMENTS_MAX} éléments au plus, sans doublon`, !r.disposition.some(estLibre) && r.disposition.length <= ELEMENTS_MAX && new Set(abrege(r.disposition)).size === r.disposition.length);
        check(`${quoi} : la validation la rend à l'identique`, egal(validerDisposition(r.disposition, "lecture").disposition, r.disposition));
        check(`${quoi} : idempotent`, egal(appliquerModele(m, r.disposition, d).disposition, r.disposition));
        check(`${quoi} : moins de 16 000 octets`, JSON.stringify(r.disposition).length < 16000);
        check(`${quoi} : les chiffres du modèle`, egal(r.showcase, m.chiffres) && egal(vitrineDepuis(r.showcase), r.showcase));
      }
    }
}

console.log("# Les cas extrêmes");
{
  const prive: DonneesBlocs = { ...NEUF, visibiliteJournal: "friends" };
  check("Journal privé : jamais posé", MODELES_PAGE.every((m) => !appliquerModele(m, [], prive).disposition.some((e) => e.k === "journal")));
  const c = appliquerModele(modele("competiteur"), [], prive);
  check("Journal privé, tout neuf : les saisons prennent la dernière tuile", egal(abrege(c.disposition).slice(-1), ["saisons:tuile"]), abrege(c.disposition).join(" "));
  const nul = MODELES_PAGE.map((m) => appliquerModele(m, [], NUL).disposition);
  check("base pas prête : chiffres clés et radar seulement", nul.every((d) => d.every((e) => e.k === "vitrine" || e.k === "radar") && d.length >= 1), nul.map((d) => abrege(d).join(" ")).join(" | "));
}

console.log("# La page de départ et le modèle actuel");
{
  const p = pageDepart([], RICHE);
  check("sans média : la page par défaut elle-même, chiffres par défaut", p.disposition === DISPOSITION_DEFAUT && egal(p.showcase, STYLE_DEFAUT.showcase));
  const pm = pageDepart(avec([img("imagea1"), vid("video01")]), RICHE);
  check("avec médias : la page par défaut, puis les médias en rangée pleine", egal(abrege(pm.disposition), ["vitrine:bande", "radar:heros", "amis:tuile", "media:imagea1:heros", "media:video01:tuile"]));
  check("jamais composée, même relue (autre référence) : reconnue", estDefautParContenu(JSON.parse(JSON.stringify(DISPOSITION_DEFAUT))) && estDefautParContenu(lu([{ k: "vitrine", f: "bande" }, { k: "amis", f: "heros" }])) && !estDefautParContenu(DISPO_RICHE));
  check("page de départ reconnue", estPageDepart(DISPOSITION_DEFAUT, RICHE, STYLE_DEFAUT.showcase) && estPageDepart(pm.disposition, RICHE, STYLE_DEFAUT.showcase) && !estPageDepart(DISPO_RICHE, RICHE, STYLE_DEFAUT.showcase));
  for (const m of MODELES_PAGE) {
    const r = appliquerModele(m, avec([img("imagea1")]), PEU);
    check(`${m.cle} : reconnu comme la page actuelle`, modeleActuel(r.disposition, PEU, r.showcase) === m.cle);
  }
  const r = appliquerModele(modele("etudiant"), [], RICHE);
  check("mêmes blocs, autres chiffres : pas le modèle", modeleActuel(r.disposition, RICHE, ["duels"]) === null);
  check("une page composée : aucun modèle", modeleActuel(DISPO_RICHE, RICHE, RICHE.showcase) === null);
  const m: ModelePage = modele("competiteur");
  check("appliquer ne touche pas au modèle", m.cases.length === 6 && m.chiffres.join() === "duels,serie,defis");
}

console.log("# La progression à moins de deux séances");
{
  check("une séance : pas de contenu (pas de case vide)", !aDuContenu({ k: "progression", f: "heros" }, PEU));
  check("deux séances : du contenu", aDuContenu({ k: "progression", f: "heros" }, { ...PEU, progression: RICHE.progression!.slice(0, 2) }));
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est bon.");
process.exit(ko ? 1 : 0);

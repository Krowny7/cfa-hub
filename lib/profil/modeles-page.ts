// Les modèles de la page du profil (Personnaliser › Ta page › « Partir d'un
// modèle ») : trois pages toutes faites, Compétiteur, Étudiant et
// Collectionneur, chacune en rangées pleines (Collectionneur : un héros, une
// colonne à droite, deux tuiles sous le héros, comme Réviser), avec ses 3
// chiffres clés. Un modèle s'adapte à ce que la page a à montrer au moment
// où on l'applique : chaque case a ses remplaçants (« sinon »), puis un
// filet ; une tuile peut dire « rien pour l'instant », mais un héros ou une
// bande veut du vrai contenu (sauf les sûrs : chiffres clés, radar, amis,
// beaux même vides). Un visiteur ne voit donc jamais de trou.
// Les médias du joueur sont tous gardés, dans leur ordre, avec leurs champs
// (légende, cadrage, couverture) : d'abord dans les emplacements média du
// modèle (Collectionneur), puis à la fin, en rangées pleines ; seul leur
// format change. Les cartes du joueur restent aussi, après les médias, en
// rangées pleines de la même façon ; un module resté sur la page garde son
// image en haut (celle d'un module qui sort part : la confirmation le
// couvre, et « Revenir à ta page » la rend). Un bloc qui sort de la page est masqué et garde ses
// réglages. Appliqué, un modèle donne une Disposition ordinaire, enregistrée
// comme les autres (rien de plus en base) : le joueur la change à son gré.
// La page de départ (DISPOSITION_DEFAUT) n'est pas un modèle : on y revient
// par pageDepart, médias gardés à la fin de la même façon.
// Module neutre (client et serveur).

import { aDuContenu, type DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { STYLE_DEFAUT, type VitrineKey } from "@/lib/profil/catalogue";
import {
  DEFAUT_SANS_RADAR,
  DISPOSITION_DEFAUT,
  FORMATS_PERMIS,
  blocsDe,
  estCarte,
  estDispositionDefaut,
  estFixe,
  estMedia,
  formatPermis,
  genreDe,
  normaliser,
  type BlocCarte,
  type BlocMedia,
  type CleBloc,
  type Disposition,
  type ElementPage,
  type Format,
  type ImageHaut,
} from "@/lib/profil/disposition";
import { compter } from "@/lib/trophees";

/** Une case d'un modèle : un bloc voulu et ses remplaçants, ou un emplacement média (ses remplaçants si le joueur n'a plus de média). */
export type CaseModele = { k: CleBloc; f: Format; sinon?: CleBloc[] } | { k: "media"; f: "tuile" | "heros"; sinon: CleBloc[] };
export type CleModele = "competiteur" | "etudiant" | "collection";
export type ModelePage = { cle: CleModele; chiffres: VitrineKey[]; cases: CaseModele[] };

export const MODELES_PAGE: ModelePage[] = [
  {
    // Journal H · Chiffres T / Saisons B / Amis T · Trophées T · Réponses T
    cle: "competiteur",
    chiffres: ["duels", "serie", "defis"],
    cases: [
      { k: "journal", f: "heros", sinon: ["trophees", "radar"] },
      { k: "vitrine", f: "tuile" },
      { k: "saisons", f: "bande", sinon: ["radar", "amis"] },
      { k: "amis", f: "tuile", sinon: ["reponses"] },
      { k: "trophees", f: "tuile", sinon: ["reponses", "folio"] },
      { k: "reponses", f: "tuile", sinon: ["folio", "radar"] },
    ],
  },
  {
    // Chiffres B / Réponses T · Radar H / Progression H · Trophées T (en zigzag)
    cle: "etudiant",
    chiffres: ["questions", "matiere", "serie"],
    cases: [
      { k: "vitrine", f: "bande" },
      { k: "reponses", f: "tuile", sinon: ["trophees"] },
      { k: "radar", f: "heros" },
      { k: "progression", f: "heros", sinon: ["journal", "amis"] },
      { k: "trophees", f: "tuile", sinon: ["folio", "amis"] },
    ],
  },
  {
    // Média 1 H · Folio C (à droite) / Chiffres T · Trophées T (sous le héros) / Saisons B
    cle: "collection",
    chiffres: ["questions", "serie", "duels"],
    cases: [
      { k: "media", f: "heros", sinon: ["folio", "trophees", "radar"] },
      { k: "folio", f: "colonne", sinon: ["amis", "reponses"] },
      { k: "vitrine", f: "tuile" },
      { k: "trophees", f: "tuile", sinon: ["reponses", "amis"] },
      { k: "saisons", f: "bande", sinon: ["trophees", "amis", "radar"] },
    ],
  },
];

/** Les blocs beaux même vides (de grands chiffres, la moyenne des joueurs, l'illustration des amis) : ils vont en héros ou en bande dès qu'ils montrent. */
const SURS: ReadonlySet<CleBloc> = new Set<CleBloc>(["vitrine", "radar", "amis"]);
/** Le filet, quand une case n'a plus de candidat : pour une tuile, puis pour un héros ou une bande. */
const FILET_TUILE: CleBloc[] = ["reponses", "trophees", "amis", "radar", "journal", "saisons", "folio"];
const FILET_GRAND: CleBloc[] = ["radar", "amis", "vitrine"];

/**
 * Le bloc n'est jamais un trou vu d'un visiteur : il montre au moins son
 * état vide. Le Journal compte s'il est visible par tous.
 */
export function montre(k: CleBloc, d: DonneesBlocs): boolean {
  if (!aDuContenu({ k, f: "tuile" }, d)) return false;
  return k !== "journal" || d.visibiliteJournal === "public";
}

/** Le bloc a du vrai contenu (pas seulement « rien pour l'instant ») : ce qu'il faut à un héros ou à une bande. */
export function riche(k: CleBloc, d: DonneesBlocs): boolean {
  if (!montre(k, d)) return false;
  switch (k) {
    case "radar":
      return d.stats.matieres.some((m) => m.pct !== null);
    case "amis":
      return (d.amis?.total ?? 0) > 0;
    case "reponses":
      return (d.reponses?.total ?? 0) > 0;
    case "trophees":
      return !!d.trophees && compter(d.trophees.lignes).total > 0;
    case "journal":
      return !!d.journal && (d.journal.matchs > 0 || d.journal.evenements.length > 0);
    case "saisons":
      return !!d.saisons && (d.saisons.palmares.length > 0 || (d.saisons.courante?.moi?.matchs ?? 0) > 0);
    default:
      return true;
  }
}

/** Le bloc `k` peut-il aller dans une case de format `f` ? Pas encore posé, à un format permis, et assez fourni pour la case. */
function accepte(k: CleBloc, f: Format, d: DonneesBlocs, poses: Set<CleBloc>): boolean {
  if (poses.has(k) || !FORMATS_PERMIS[k].includes(f)) return false;
  return f === "tuile" || f === "colonne" || SURS.has(k) ? montre(k, d) : riche(k, d);
}

/** L'image en haut de chaque module resté sur la page (un modèle la garde). */
function garderImages(out: ElementPage[], actuelle: Disposition): ElementPage[] {
  const images = new Map<CleBloc, ImageHaut>();
  for (const e of actuelle) if (estFixe(e) && e.img) images.set(e.k, e.img);
  return out.map((e) => (estFixe(e) && images.has(e.k) && e.k !== "progression" ? { ...e, img: images.get(e.k)! } : e));
}

/**
 * Les médias et les cartes de fin (les médias d'abord), en rangées pleines :
 * 1 image en bande ; 1 GIF, 1 vidéo ou 1 carte en héros, avec une tuile
 * bouche-trou (le premier bloc masqué qui montre, sinon la rangée reste
 * incomplète) ; 2 : héros · tuile ; 3 : trois tuiles ; 4 : deux fois héros ·
 * tuile ; 5 : trois tuiles puis héros · tuile ; 6 : deux fois trois tuiles ;
 * 7 à 9 (6 médias et 3 cartes au plus) : trois tuiles, puis comme 4 à 6.
 */
export function mediasFin(siens: (BlocMedia | BlocCarte)[], d: DonneesBlocs, poses: Set<CleBloc>): ElementPage[] {
  const TAILLES: Record<number, number[]> = { 0: [], 1: [1], 2: [2], 3: [3], 4: [2, 2], 5: [3, 2], 6: [3, 3], 7: [3, 2, 2], 8: [3, 3, 2], 9: [3, 3, 3] };
  const tailles = TAILLES[siens.length] ?? [];
  const au = (b: BlocMedia | BlocCarte, f: Format): BlocMedia | BlocCarte => ({ ...b, f: formatPermis(genreDe(b), f) });
  const out: ElementPage[] = [];
  let n = 0;
  for (const t of tailles) {
    const rangee = siens.slice(n, n + t);
    n += t;
    if (t === 1) {
      const m = rangee[0];
      if (FORMATS_PERMIS[genreDe(m)].includes("bande")) out.push({ ...m, f: "bande" });
      else {
        out.push(au(m, "heros"));
        const bouche = FILET_TUILE.find((k) => accepte(k, "tuile", d, poses));
        if (bouche) {
          poses.add(bouche);
          out.push({ k: bouche, f: "tuile" });
        }
      }
    } else if (t === 2) out.push(au(rangee[0], "heros"), au(rangee[1], "tuile"));
    else out.push(...rangee.map((m) => au(m, "tuile")));
  }
  // au-delà de 9 (jamais : la validation borne) : en tuiles
  out.push(...siens.slice(n).map((m) => au(m, "tuile")));
  return out;
}

/** Une case servie par un remplaçant (la ligne « Adapté : … » de la carte du modèle). */
export type Remplacement = { voulu: CleBloc | "media"; mis: CleBloc };
export type PageModele = { disposition: Disposition; showcase: VitrineKey[]; remplaces: Remplacement[] };

/** La page que donne le modèle à ce joueur : ses blocs selon ce qu'ils ont à montrer, ses médias gardés. */
export function appliquerModele(m: ModelePage, actuelle: Disposition, d: DonneesBlocs): PageModele {
  const medias = blocsDe(actuelle).filter(estMedia);
  const poses = new Set<CleBloc>();
  const remplaces: Remplacement[] = [];
  const out: ElementPage[] = [];
  let n = 0;
  for (const c of m.cases) {
    if (c.k === "media" && n < medias.length) {
      const x = medias[n++];
      out.push({ ...x, f: formatPermis(genreDe(x), c.f) });
      continue;
    }
    const candidats = c.k === "media" ? c.sinon : [c.k, ...(c.sinon ?? [])];
    const k = candidats.find((x) => accepte(x, c.f, d, poses)) ?? (c.f === "tuile" || c.f === "colonne" ? FILET_TUILE : FILET_GRAND).find((x) => accepte(x, c.f, d, poses));
    // aucun candidat : la case tombe (une bande, sans trou ; une tuile ou un héros, cas extrême)
    if (!k) continue;
    poses.add(k);
    out.push({ k, f: c.f });
    if (k !== c.k) remplaces.push({ voulu: c.k, mis: k });
  }
  out.push(...mediasFin([...medias.slice(n), ...actuelle.filter(estCarte)], d, poses));
  return { disposition: normaliser(garderImages(out, actuelle)), showcase: [...m.chiffres], remplaces };
}

/**
 * La page de départ (celle d'un joueur qui n'a rien composé), ses médias
 * gardés à la fin : sans média, la page par défaut elle-même (même
 * référence : son invitation revient), avec les chiffres clés par défaut.
 */
export function pageDepart(actuelle: Disposition, d: DonneesBlocs): PageModele {
  const siens = [...blocsDe(actuelle).filter(estMedia), ...actuelle.filter(estCarte)];
  const showcase = [...STYLE_DEFAUT.showcase];
  const base = garderImages(DISPOSITION_DEFAUT, actuelle);
  if (!siens.length && JSON.stringify(base) === JSON.stringify(DISPOSITION_DEFAUT)) return { disposition: DISPOSITION_DEFAUT, showcase, remplaces: [] };
  const poses = new Set<CleBloc>(blocsDe(DISPOSITION_DEFAUT).flatMap((b) => (estFixe(b) ? [b.k] : [])));
  return { disposition: normaliser([...base, ...mediasFin(siens, d, poses)]), showcase, remplaces: [] };
}

const memePage = (a: { disposition: Disposition; showcase: VitrineKey[] }, b: { disposition: Disposition; showcase: VitrineKey[] }) =>
  JSON.stringify(a.disposition) === JSON.stringify(b.disposition) && a.showcase.join("|") === b.showcase.join("|");

/** Le modèle dont la page actuelle est exactement le résultat (la pastille « Ta page actuelle »), sinon null. */
export function modeleActuel(actuelle: Disposition, d: DonneesBlocs, showcase: VitrineKey[]): CleModele | null {
  return MODELES_PAGE.find((m) => memePage(appliquerModele(m, actuelle, d), { disposition: actuelle, showcase }))?.cle ?? null;
}

/**
 * La page n'a jamais été composée : la page par défaut, avec ou sans radar.
 * Comparée par contenu : passée d'un composant serveur à un composant
 * client, la disposition n'est plus la même référence (estDispositionDefaut).
 */
export const estDefautParContenu = (d: Disposition) =>
  estDispositionDefaut(d) || [DISPOSITION_DEFAUT, DEFAUT_SANS_RADAR].some((x) => JSON.stringify(x) === JSON.stringify(d));

/** La page actuelle est-elle la page de départ (jamais composée, ou rétablie par pageDepart) ? */
export function estPageDepart(actuelle: Disposition, d: DonneesBlocs, showcase: VitrineKey[]): boolean {
  // la page par défaut avec d'autres chiffres clés n'est plus la page de départ : y revenir les change
  return (estDefautParContenu(actuelle) && showcase.join("|") === STYLE_DEFAUT.showcase.join("|")) || memePage(pageDepart(actuelle, d), { disposition: actuelle, showcase });
}

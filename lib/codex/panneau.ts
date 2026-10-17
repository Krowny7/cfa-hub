// Le panneau « Tes quêtes », derrière le sceau de la barre du haut (V3 §9.2) :
// QUOI FAIRE, en quatre lignes au plus, tirées de la vue du Codex
// (lib/codex/vue.ts). Dans l'ordre : ta prochaine quête (la recommandation du
// moteur), le débrief d'un examen blanc s'il en attend un, les contrats du
// jour pas encore remplis, la quête au long cours la plus avancée. Chaque ligne porte sa destination (« Y aller »), sa durée et
// une raison chiffrée. Les récompenses ne se réclament plus : elles sont
// versées toutes seules, et une seule ligne en pied le dit (« 3 quêtes
// tamponnées · +190 XP »), acquittée à l'ouverture.
// Léger (quelques lignes, pas la vue entière, qui pèse une centaine de Ko).
// Module neutre (serveur et navigateur).

import { devoileLite } from "@/lib/codex/devoile-lite";
import type { Destination } from "@/lib/codex/destinations";
import type { VueSeance } from "@/lib/codex/seance";
import type { Budget, Emplacement } from "@/lib/codex/types";
import type { EtatLigne, LigneQuete, VueCodex } from "@/lib/codex/vue";

export type GenreQuete = "principale" | "contrat" | "longcours" | "fil";

export type QuetePanneau = {
  /** id|periode : la clé d'une quête dans le temps (un contrat change chaque jour) */
  cle: string;
  id: string;
  periode: string;
  genre: GenreQuete;
  titre: string;
  /** la petite ligne au-dessus du titre : « Ta prochaine quête », « Contrat du jour · ton point faible », « Au long cours · … » */
  sur: string;
  etat: EtatLigne;
  valeur: number;
  cible: number;
  fraction: number;
  xp: number;
  destination: Destination | null;
  raison: string | null;
  /** minutes ; null : on ne sait pas */
  duree: number | null;
  emplacement?: Emplacement;
  changeable?: boolean;
};

export type Panneau = {
  disponible: boolean;
  jour: string;
  /** quatre au plus : ta prochaine quête, les contrats du jour restants, un long cours */
  quetes: QuetePanneau[];
  /** les récompenses versées pas encore annoncées : une ligne en pied, acquittée à l'ouverture (codexVus(cles)) */
  versees: { n: number; xp: number; cles: string[]; titre: string | null } | null;
  /** les contrats du jour : un arc d'encre chacun autour du sceau */
  arcs: { faits: number; total: number };
  /** le seul motif du « ! » doré : un acte clos, une pièce gagnée */
  rare: { quoi: "acte" | "piece"; libelle: string } | null;
  budget: Budget | null;
  /** les contrats de la semaine (le détail se déplie : leurs titres) */
  semaine: { faits: number; total: number; quetes: { titre: string; faite: boolean }[] };
  /** la file « À revoir » : « 15 à revoir » sous le sceau (revisions_dues ; repli : les ratures en cours, 25 au plus ; null : rien de connu) */
  revoir: { aujourdhui: number; demain: number } | null;
  /** la séance du jour (V3 §6, lot A5) */
  seance: { lancee: boolean; faits: number; total: number; suivant: { titre: string; href: string } | null } | null;
  /** le jour J (V3 §7.4) : le panneau se réduit à « Bonne chance », Léonard ne surgit pas (attribut data-jour-j) */
  jourJ: boolean;
};

export const PANNEAU_VIDE: Panneau = {
  disponible: false, jour: "", quetes: [], versees: null, arcs: { faits: 0, total: 0 }, rare: null, budget: null, semaine: { faits: 0, total: 0, quetes: [] }, revoir: null, seance: null, jourJ: false,
};

export const MAX_QUETES = 4;
/** Les arcs du sceau : trois contrats par jour au plus. */
export const MAX_ARCS = 3;

const cleDe = (l: Pick<LigneQuete, "id" | "periode">) => `${l.id}|${l.periode}`;

const EMPLACEMENT: Record<string, string> = { faiblesse: "ton point faible", entretien: "l'entretien", variete: "la variété" };

function versPanneau(l: LigneQuete, genre: GenreQuete, sur: string, extra: Partial<QuetePanneau> = {}): QuetePanneau {
  const destination = l.destination ?? null;
  return {
    cle: cleDe(l),
    id: l.id,
    periode: l.periode,
    genre,
    titre: l.titre,
    sur,
    etat: l.etat,
    valeur: l.valeur,
    cible: l.cible,
    fraction: l.fraction,
    xp: l.xpVersee ?? l.xp,
    destination,
    raison: destination?.raison ?? null,
    duree: destination?.duree ?? l.duree ?? null,
    ...extra,
  };
}

/** Toutes les quêtes de la vue (une même quête peut y figurer deux fois : la clé les dédoublonne). */
const toutesLignes = (vue: VueCodex): LigneQuete[] => [
  ...vue.contrats.map((c) => c.ligne), ...(vue.debrief ? [vue.debrief] : []), ...vue.trame.flatMap((a) => a.quetes), ...vue.branches.flatMap((b) => b.etapes), ...vue.longCours.flatMap((c) => c.paliers), ...vue.filRouge.chapitres.flatMap((c) => c.recents), ...vue.exploits, ...vue.hebdo,
];

/** Les récompenses versées dont la fanfare n'a pas été jouée (hors sceaux du profil, qui ont leur cérémonie), et les actes clos à fêter. */
function aAnnoncer(vue: VueCodex): { lignes: LigneQuete[]; actes: VueCodex["trame"] } {
  const vues = new Set<string>();
  const lignes: LigneQuete[] = [];
  for (const l of toutesLignes(vue)) {
    const k = cleDe(l);
    if (!l.aFeter || vues.has(k) || l.id.startsWith("exploit:sceau:")) continue;
    vues.add(k);
    lignes.push(l);
  }
  return { lignes, actes: vue.trame.filter((a) => a.aFeter) };
}

export function panneauDe(vue: VueCodex): Panneau {
  if (!vue.disponible) return PANNEAU_VIDE;
  // le jour J : rien à faire, rien à annoncer, seulement « Bonne chance » (V3 §7.4)
  if (vue.moment === "jourJ") return { ...PANNEAU_VIDE, disponible: true, jour: vue.jour, jourJ: true };
  const d = vue.devoile?.devoile ?? "tout";
  const contratsVus = devoileLite(d, "codex:contrats");
  const longCoursVu = devoileLite(d, "codex:longcours");

  const liste: QuetePanneau[] = [];
  const pris = new Set<string>();
  const p = vue.prochaine;
  if (p && p.ligne.etat !== "terminee") {
    // un contrat du jour recommandé garde son « Changer »
    const ct = vue.contrats.find((c) => cleDe(c.ligne) === cleDe(p.ligne));
    liste.push(versPanneau(p.ligne, "principale", "Ta prochaine quête", ct ? { emplacement: ct.emplacement, changeable: ct.changeable } : {}));
    pris.add(cleDe(p.ligne));
  }
  if (contratsVus) {
    // le débrief d'un blanc (V3 §7.6) : rare et utile tant que le blanc est frais, il passe avant les contrats tirés
    const db = vue.debrief;
    if (db && db.etat !== "terminee" && db.etat !== "verrouillee" && !pris.has(cleDe(db))) {
      pris.add(cleDe(db));
      liste.push(versPanneau(db, "contrat", "Contrat du jour · le débrief"));
    }
    for (const c of vue.contrats) {
      if (c.ligne.etat === "terminee" || pris.has(cleDe(c.ligne))) continue;
      pris.add(cleDe(c.ligne));
      liste.push(versPanneau(c.ligne, "contrat", `Contrat du jour · ${EMPLACEMENT[c.emplacement] ?? c.emplacement}`, { emplacement: c.emplacement, changeable: c.changeable }));
    }
  }
  if (longCoursVu) {
    // un miroir (V3 §8.2) ne double pas sa quête payeuse, déjà proposée
    const chaine = vue.longCours
      .filter((c) => c.courant && c.courant.etat !== "verrouillee" && !pris.has(cleDe(c.courant)) && !(c.courant.compteeAvec && pris.has(cleDe({ id: c.courant.compteeAvec.id, periode: "" }))))
      .sort((a, b) => b.courant!.fraction - a.courant!.fraction)[0];
    if (chaine?.courant) liste.push(versPanneau(chaine.courant, "longcours", `Au long cours · ${chaine.chaine.titre}`));
    // plus aucune chaîne à proposer : le palier du fil rouge le plus avancé prend la place (V3 §1.5), s'il s'écrit déjà
    else if (!vue.filRouge.aVenir) {
      const ch = vue.filRouge.chapitres
        .filter((c) => c.courant && c.courant.etat !== "verrouillee" && c.courant.destination && !pris.has(cleDe(c.courant)))
        .sort((a, b) => b.courant!.fraction - a.courant!.fraction)[0];
      if (ch?.courant) liste.push(versPanneau(ch.courant, "fil", `Le fil rouge · ${ch.titre}`));
    }
  }

  const { lignes, actes } = aAnnoncer(vue);
  const titre = lignes.find((l) => l.titreNom)?.titreNom ?? null;
  const piece = lignes.find((l) => l.cosmetique);
  const versees = lignes.length || actes.length
    ? { n: lignes.length, xp: lignes.reduce((s, l) => s + (l.xpVersee ?? l.xp), 0), cles: [...new Set([...lignes.map((l) => l.id), ...actes.map((a) => `acte:${a.acte.id}`)])], titre }
    : null;
  const rare: Panneau["rare"] = actes.length
    ? { quoi: "acte", libelle: `Acte clos : ${actes[0].acte.titre}` }
    : piece
      ? { quoi: "piece", libelle: piece.cosmetiqueNom ? `Pièce gagnée : ${piece.cosmetiqueNom}` : "Une pièce gagnée" }
      : null;

  return {
    disponible: true,
    jour: vue.jour,
    quetes: liste.slice(0, MAX_QUETES),
    versees,
    arcs: contratsVus ? { faits: Math.min(MAX_ARCS, vue.trio.faits), total: Math.min(MAX_ARCS, vue.trio.total) } : { faits: 0, total: 0 },
    rare,
    budget: vue.budget,
    semaine: { faits: vue.hebdo.filter((l) => l.etat === "terminee").length, total: vue.hebdo.length, quetes: vue.hebdo.map((l) => ({ titre: l.titre, faite: l.etat === "terminee" })) },
    revoir: vue.revoir,
    seance: seancePanneau(vue.seance),
    jourJ: false,
  };
}

/**
 * La séance du jour pour la pastille « Séance 2/3 · Continuer → » (V3 §6.4) :
 * lancée ou non, où elle en est, et le bloc suivant (le premier pas fait ;
 * aucun une fois la séance finie). null : pas de séance.
 */
export function seancePanneau(s: VueSeance | null): Panneau["seance"] {
  if (!s || !s.blocs.length) return null;
  const suivant = s.finie ? undefined : s.blocs.find((b) => !s.faits.includes(b.genre));
  return { lancee: s.lancee, faits: s.blocs.filter((b) => s.faits.includes(b.genre)).length, total: s.blocs.length, suivant: suivant ? { titre: suivant.titre, href: suivant.destination.href } : null };
}

/**
 * L'événement du navigateur qui dit « le Codex a bougé » : émis par FeteCodex
 * juste après codexPoint() (la fin d'un outil) et par la séance du jour après
 * un geste ; la pastille de la barre du haut relit alors le panneau.
 */
export const EVENEMENT_CODEX_POINT = "rl:codex-point";

/** Le chemin d'un lien, sans la requête ni l'ancre (« /practice?topic=fsa » → « /practice »). */
const cheminDe = (href: string) => href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";

/**
 * La pastille « Séance 2/3 · Continuer → » de la barre du haut (V3 §6.4) :
 * seulement si la séance du jour est lancée (en base, ou dans ce navigateur
 * quand la base ne la garde pas : `lanceeIci`), pas finie, pas masquée pour
 * la journée, et que la page courante n'est pas déjà la destination du bloc
 * en cours. `rang` : le bloc en cours (le premier pas fait). null : rien à montrer.
 */
export function pastilleSeance(s: Panneau["seance"], chemin: string, o: { masquee?: boolean; lanceeIci?: boolean } = {}): { rang: number; total: number; href: string } | null {
  if (!s || !s.suivant || o.masquee || !(s.lancee || o.lanceeIci)) return null;
  if (cheminDe(chemin) === cheminDe(s.suivant.href)) return null;
  return { rang: Math.min(s.total, s.faits + 1), total: s.total, href: s.suivant.href };
}

/** « 3 quêtes tamponnées · +190 XP · titre Garzone » : la ligne des récompenses versées. */
export function ligneVersees(v: NonNullable<Panneau["versees"]>): string {
  const debut = v.n ? `${v.n} quête${v.n > 1 ? "s" : ""} tamponnée${v.n > 1 ? "s" : ""}` : "Un acte clos";
  return [debut, ...(v.xp > 0 ? [`+${v.xp.toLocaleString("fr-FR")} XP`] : []), ...(v.titre ? [`titre ${v.titre}`] : [])].join(" · ");
}

/** Le panneau une fois les récompenses annoncées (codexVus) : plus de ligne en pied ni de « ! » doré. */
export const panneauAcquitte = (p: Panneau): Panneau => ({ ...p, versees: null, rare: null });

// ── L'instantané (codex_vue_cache, migration_codex_v3.sql §6) ──────────

/** La forme du panneau gardé : à changer dès que Panneau change, pour qu'un instantané d'avant ne soit jamais relu. */
export const VERSION_PANNEAU = 2;
/** Un instantané plus vieux ne sert plus. */
export const CACHE_PANNEAU_MS = 10 * 60_000;

/** Le panneau tel qu'il se garde. */
export const panneauAGarder = (p: Panneau) => ({ version: VERSION_PANNEAU, panneau: p });

/**
 * Le panneau gardé, s'il sert encore : du même jour, de moins de 10 min, pas
 * marqué « à recalculer » (fin d'un outil, récompenses annoncées), de la même
 * forme. null : il faut recalculer.
 */
export function panneauDuCache(ligne: unknown, jour: string, maintenant: number): Panneau | null {
  const l = ligne as { jour?: unknown; panneau?: unknown; calcule_le?: unknown; a_recalculer?: unknown } | null;
  if (!l || typeof l !== "object" || l.a_recalculer !== false || String(l.jour ?? "").slice(0, 10) !== jour) return null;
  const quand = typeof l.calcule_le === "string" ? Date.parse(l.calcule_le) : NaN;
  if (!(maintenant - quand >= 0 && maintenant - quand < CACHE_PANNEAU_MS)) return null;
  const g = l.panneau as { version?: unknown; panneau?: Panneau } | null;
  return g && g.version === VERSION_PANNEAU && g.panneau && g.panneau.disponible === true && g.panneau.jour === jour ? g.panneau : null;
}

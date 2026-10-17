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
};

export const PANNEAU_VIDE: Panneau = {
  disponible: false, jour: "", quetes: [], versees: null, arcs: { faits: 0, total: 0 }, rare: null, budget: null, semaine: { faits: 0, total: 0, quetes: [] }, revoir: null, seance: null,
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
    seance: null,
  };
}

/** « 3 quêtes tamponnées · +190 XP · titre Garzone » : la ligne des récompenses versées. */
export function ligneVersees(v: NonNullable<Panneau["versees"]>): string {
  const debut = v.n ? `${v.n} quête${v.n > 1 ? "s" : ""} tamponnée${v.n > 1 ? "s" : ""}` : "Un acte clos";
  return [debut, ...(v.xp > 0 ? [`+${v.xp.toLocaleString("fr-FR")} XP`] : []), ...(v.titre ? [`titre ${v.titre}`] : [])].join(" · ");
}

/** Le panneau une fois les récompenses annoncées (codexVus) : plus de ligne en pied ni de « ! » doré. */
export const panneauAcquitte = (p: Panneau): Panneau => ({ ...p, versees: null, rare: null });

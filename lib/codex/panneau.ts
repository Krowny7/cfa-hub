// Le panneau « Tes quêtes », derrière le sceau « ! » de la barre du haut :
// quatre quêtes au plus, tirées de la vue du Codex (lib/codex/vue.ts). Dans
// l'ordre : la quête principale (la recommandation du moteur), deux
// récompenses à réclamer au plus, les contrats du jour pas encore remplis, la
// quête au long cours la plus avancée. Léger (quelques lignes, pas la vue
// entière, qui pèse une centaine de Ko). Module neutre (serveur et navigateur).

import { devoileLite } from "@/lib/codex/devoile-lite";
import type { Emplacement } from "@/lib/codex/types";
import type { EtatLigne, LigneQuete, VueCodex } from "@/lib/codex/vue";

export type GenreQuete = "recompense" | "principale" | "contrat" | "longcours";

export type QuetePanneau = {
  /** id|periode : la clé d'une quête dans le temps (un contrat change chaque jour) */
  cle: string;
  id: string;
  periode: string;
  genre: GenreQuete;
  titre: string;
  sous: string;
  etat: EtatLigne;
  valeur: number;
  cible: number;
  fraction: number;
  xp: number;
  lien: string | null;
  emplacement?: Emplacement;
  changeable?: boolean;
};

export type Panneau = {
  disponible: boolean;
  jour: string;
  quetes: QuetePanneau[];
  /** les quêtes à prendre (disponibles, pas entamées) : le « ! » les compte, une fois vues il se tait */
  aPrendre: string[];
  /** récompenses à réclamer : le « ? » */
  aReclamer: number;
  changementPossible: boolean;
};

export const PANNEAU_VIDE: Panneau = { disponible: false, jour: "", quetes: [], aPrendre: [], aReclamer: 0, changementPossible: false };

export const MAX_QUETES = 4;
const MAX_RECOMPENSES = 2;

const cleDe = (l: Pick<LigneQuete, "id" | "periode">) => `${l.id}|${l.periode}`;

function versPanneau(l: LigneQuete, genre: GenreQuete, sous: string, extra: Partial<QuetePanneau> = {}): QuetePanneau {
  return {
    cle: cleDe(l),
    id: l.id,
    periode: l.periode,
    genre,
    titre: l.titre,
    sous,
    etat: l.etat,
    valeur: l.valeur,
    cible: l.cible,
    fraction: l.fraction,
    xp: l.xpVersee ?? l.xp,
    lien: l.lien ?? null,
    ...extra,
  };
}

const compte = (l: LigneQuete) => (l.cible > 1 ? ` · ${Math.floor(l.valeur).toLocaleString("fr-FR")}/${Math.floor(l.cible).toLocaleString("fr-FR")}` : "");

const EMPLACEMENT: Record<string, string> = { faiblesse: "ton point faible", entretien: "l'entretien", variete: "la variété" };

export function panneauDe(vue: VueCodex): Panneau {
  if (!vue.disponible) return PANNEAU_VIDE;
  const d = vue.devoile?.devoile ?? "tout";
  const contratsVus = devoileLite(d, "codex:contrats");
  const longCoursVu = devoileLite(d, "codex:longcours");

  // les récompenses à réclamer : versées par le moteur, fanfare pas encore jouée
  const toutes = [...vue.contrats.map((c) => c.ligne), ...vue.trame.flatMap((a) => a.quetes), ...vue.branches.flatMap((b) => b.etapes), ...vue.longCours.flatMap((c) => c.paliers), ...vue.exploits, ...vue.hebdo];
  const vues = new Set<string>();
  const recompenses: QuetePanneau[] = [];
  for (const l of toutes) {
    const k = cleDe(l);
    // les sceaux du profil ont leur propre cérémonie
    if (!l.aFeter || vues.has(k) || l.id.startsWith("exploit:sceau:")) continue;
    vues.add(k);
    recompenses.push(versPanneau(l, "recompense", `Accomplie · +${l.xpVersee ?? l.xp} XP${l.titreNom ? ` · titre « ${l.titreNom} »` : l.cosmetiqueNom ? ` · ${l.cosmetiqueNom}` : ""}`));
  }

  // la quête principale en tête (mise en avant), puis deux récompenses au plus
  // (les suivantes viennent une fois celles-ci réclamées) : elle ne disparaît jamais
  const liste: QuetePanneau[] = [];
  const p = vue.prochaine;
  if (p && !vues.has(cleDe(p.ligne))) {
    liste.push(versPanneau(p.ligne, "principale", `Quête principale${compte(p.ligne)}`));
    vues.add(cleDe(p.ligne));
  }
  liste.push(...recompenses.slice(0, MAX_RECOMPENSES));
  if (contratsVus) {
    for (const c of vue.contrats) {
      if (c.ligne.etat === "terminee" || vues.has(cleDe(c.ligne))) continue;
      vues.add(cleDe(c.ligne));
      liste.push(versPanneau(c.ligne, "contrat", `Contrat du jour · ${EMPLACEMENT[c.emplacement] ?? c.emplacement}${compte(c.ligne)}`, { emplacement: c.emplacement, changeable: c.changeable }));
    }
  }
  if (longCoursVu) {
    const chaine = vue.longCours
      .filter((c) => c.courant && c.courant.etat !== "verrouillee" && !vues.has(cleDe(c.courant)))
      .sort((a, b) => b.courant!.fraction - a.courant!.fraction)[0];
    if (chaine?.courant) liste.push(versPanneau(chaine.courant, "longcours", `Au long cours · ${chaine.chaine.titre}${compte(chaine.courant)}`));
  }

  const quetes = liste.slice(0, MAX_QUETES);
  return {
    disponible: true,
    jour: vue.jour,
    quetes,
    aPrendre: quetes.filter((q) => q.genre !== "recompense" && q.etat === "disponible").map((q) => q.cle),
    aReclamer: recompenses.length,
    changementPossible: contratsVus && vue.trio.changementPossible,
  };
}

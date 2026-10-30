// Salles : la logique pure de l'écran de partie (ce qu'on montre à quel
// instant, le verdict d'une question, le classement en direct, le podium, le
// bilan d'un joueur). Aucun accès réseau, aucune horloge lue ici : l'heure
// (du serveur) est toujours passée en argument. Testé par
// scripts/salles/test-partie.tsx. Module neutre (pas de "use client").
//
// L'horloge de la partie, le score et le classement serveur sont dans
// lib/salles/logique.ts ; ce module n'en est que la mise en forme pour l'écran.

import type { ReponseResultat, SalleClassementLigne, SalleCorrection, SalleMaReponse, SalleSession } from "./types";

/** Une réponse enregistrée par le serveur, telle que repondreSalle la rend. */
export type ReponseOk = Extract<ReponseResultat, { ok: true }>;

/** Le verdict d'une question pour moi. */
export type Verdict = "juste" | "faux" | "sans";

// ---------------------------------------------------------------------------
// Compteurs

/** Secondes entières à afficher : arrondi au-dessus (0,4 s restantes s'affichent « 1 »), jamais négatif. */
export const secondesAffichees = (ms: number): number => (Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 1000)) : 0);

/** Part du temps qui reste, de 0 à 1 (la barre qui se vide). */
export function fractionTemps(restantMs: number, tempsS: number): number {
  const total = tempsS * 1000;
  if (!(total > 0) || !Number.isFinite(restantMs)) return 0;
  return Math.min(1, Math.max(0, restantMs / total));
}

/** Les dernières secondes : la barre passe au vermillon et pulse. */
export const SEUIL_URGENCE_S = 5;
export const enUrgence = (restantMs: number): boolean => restantMs > 0 && restantMs <= SEUIL_URGENCE_S * 1000;

/** 3, 2, 1 sur les trois dernières secondes avant l'ouverture de la première question ; null avant (et à zéro). */
export function chiffreDecompte(avantMs: number): 1 | 2 | 3 | null {
  if (!Number.isFinite(avantMs) || avantMs <= 0 || avantMs > 3000) return null;
  return Math.ceil(avantMs / 1000) as 1 | 2 | 3;
}

/** « 3,2 s » : le délai entre l'ouverture de la question et ma réponse. */
export function libelleDelai(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return `${s.toFixed(1).replace(".", ",")} s`;
}

// ---------------------------------------------------------------------------
// Mes réponses et les corrections

/** Ma réponse à une question telle que l'écran la montre. */
export type ReponseVue = {
  choix: number | null;
  valeur: number | null;
  juste: boolean;
  points: number;
  delaiMs: number;
};

/**
 * Ma réponse à la question `position` : celle que le serveur vient de me
 * rendre (la plus fraîche), sinon celle que etat_salle liste (rechargement de
 * la page, autre onglet). null : je n'ai pas répondu.
 */
export function reponseVue(position: number, locales: Record<number, ReponseOk | undefined>, mes: SalleMaReponse[]): ReponseVue | null {
  const l = locales[position];
  if (l) return { choix: l.choix, valeur: l.valeur, juste: l.juste, points: l.points, delaiMs: l.delaiMs };
  const m = mes.find((x) => x.position === position);
  return m ? { choix: m.choix, valeur: m.valeur, juste: m.juste, points: m.points, delaiMs: m.delaiMs } : null;
}

/** La correction d'une question close. */
export type CorrectionVue = {
  bonneIndex: number | null;
  bonneValeur: number | null;
  explication: string | null;
  etapes: string[];
};

/**
 * La correction de la question `position` : la correction publique (question
 * close pour tous), sinon celle que le serveur m'a rendue en répondant. Elle
 * n'est à montrer qu'une fois le temps écoulé : c'est à l'écran de décider.
 */
export function correctionVue(position: number, corrections: SalleCorrection[], locales: Record<number, ReponseOk | undefined>): CorrectionVue | null {
  const c = corrections.find((x) => x.position === position);
  if (c) return { bonneIndex: c.bonneIndex, bonneValeur: c.bonneValeur, explication: c.explication, etapes: c.etapes };
  const l = locales[position];
  if (l) return { bonneIndex: l.bonneIndex, bonneValeur: l.bonneValeur, explication: l.explication, etapes: l.etapes };
  return null;
}

/** Juste, faux, ou sans réponse (null tant que la question est ouverte et que je n'ai pas répondu). */
export function verdictQuestion(ouverte: boolean, reponse: ReponseVue | null): Verdict | null {
  if (reponse) return reponse.juste ? "juste" : "faux";
  return ouverte ? null : "sans";
}

/** Les points affichés pour une réponse : « +850 », « +0 » (rien n'est retiré à une mauvaise réponse). */
export const libellePoints = (points: number): string => `+${Math.max(0, Math.round(points)).toLocaleString("fr-FR")}`;

// ---------------------------------------------------------------------------
// Classement en direct

export type LigneDirecte = SalleClassementLigne & {
  /** c'est ma ligne */
  moi: boolean;
  /** l'emplacement (0, 1, 2…) où la ligne se pose : c'est lui qui, en changeant, déplace la ligne */
  emplacement: number;
};

export type MoiPourClassement = { userId: string; username: string | null; avatarUrl: string | null };

/**
 * Les lignes du classement en direct : les `max` premiers, plus ma ligne
 * posée en dernier emplacement si je suis plus bas (ou absent des 50 premiers
 * que la base rend). Les lignes gardent leur `userId` : l'écran s'en sert comme
 * clé pour glisser une ligne vers son nouvel emplacement.
 */
export function lignesDirectes(
  classement: SalleClassementLigne[],
  monClassement: { rang: number; points: number; bonnes: number; repondues: number; tempsMs: number } | null,
  moi: MoiPourClassement,
  max = 8,
): { lignes: LigneDirecte[]; moiEnBas: boolean } {
  const tete: LigneDirecte[] = classement.slice(0, max).map((l, i) => ({ ...l, moi: l.userId === moi.userId, emplacement: i }));
  if (tete.some((l) => l.moi)) return { lignes: tete, moiEnBas: false };
  const ligne = classement.find((l) => l.userId === moi.userId);
  const extra: SalleClassementLigne | null = ligne ?? (monClassement ? { ...monClassement, userId: moi.userId, username: moi.username, avatarUrl: moi.avatarUrl } : null);
  if (!extra) return { lignes: tete, moiEnBas: false };
  return { lignes: [...tete, { ...extra, moi: true, emplacement: tete.length }], moiEnBas: true };
}

// ---------------------------------------------------------------------------
// Podium

export type MarchePodium = { ligne: SalleClassementLigne; place: 1 | 2 | 3 };

/**
 * Les trois premiers dans l'ordre où on les pose sur le podium : deuxième à
 * gauche, premier au centre, troisième à droite (avec moins de trois joueurs,
 * on garde les places qui existent). La place est le rang de la ligne :
 * deux joueurs à égalité parfaite partagent la marche.
 */
export function podium(classement: SalleClassementLigne[]): MarchePodium[] {
  const tete = classement.slice(0, 3);
  const marche = (l: SalleClassementLigne): MarchePodium => ({ ligne: l, place: Math.min(3, Math.max(1, l.rang)) as 1 | 2 | 3 });
  const [premier, deuxieme, troisieme] = tete;
  const ordre = [deuxieme, premier, troisieme].filter((l): l is SalleClassementLigne => Boolean(l));
  return ordre.map(marche);
}

// ---------------------------------------------------------------------------
// Bilan du joueur

export type BilanJoueur = {
  /** nombre de questions de la partie */
  nb: number;
  repondues: number;
  bonnes: number;
  points: number;
  /** ma place (null : pas de classement lisible) */
  rang: number | null;
  /** nombre de joueurs de la salle */
  sur: number;
  /** une case par question : juste, faux, ou sans réponse */
  serie: Verdict[];
  /** délai moyen de mes bonnes réponses, en ms ; null sans bonne réponse */
  delaiMoyenMs: number | null;
};

/** Ce que je retire de la partie : bonnes réponses, points, place, une case par question. */
export function bilanJoueur(opts: {
  session: Pick<SalleSession, "nb" | "nbJoueurs">;
  mesReponses: SalleMaReponse[];
  classement: SalleClassementLigne[];
  monClassement: { rang: number; points: number; bonnes: number; repondues: number } | null;
  moiId: string;
}): BilanJoueur {
  const { session, mesReponses, classement, monClassement, moiId } = opts;
  const nb = session.nb;
  const serie: Verdict[] = Array.from({ length: nb }, (_, p) => {
    const r = mesReponses.find((x) => x.position === p);
    return r ? (r.juste ? "juste" : "faux") : "sans";
  });
  const bonnesRep = mesReponses.filter((r) => r.juste && r.position < nb);
  // le classement du serveur fait foi pour les points et la place ; mes réponses servent de repli
  const ligne = classement.find((l) => l.userId === moiId) ?? monClassement;
  const pointsRep = mesReponses.reduce((a, r) => a + (r.position < nb ? r.points : 0), 0);
  return {
    nb,
    repondues: mesReponses.filter((r) => r.position < nb).length,
    bonnes: ligne ? ligne.bonnes : bonnesRep.length,
    points: ligne ? ligne.points : pointsRep,
    rang: ligne ? ligne.rang : null,
    sur: Math.max(session.nbJoueurs, classement.length, 1),
    serie,
    delaiMoyenMs: bonnesRep.length ? Math.round(bonnesRep.reduce((a, r) => a + r.delaiMs, 0) / bonnesRep.length) : null,
  };
}

/** « 1er », « 2e »… (français) */
export const placeOrdinale = (n: number): string => (n === 1 ? "1er" : `${n}e`);

// ---------------------------------------------------------------------------
// La partie à rejouer

/** Les réglages d'une partie terminée, débarrassés du décompte des tirages : de quoi relancer la même. */
export function paramsPourRejouer(p: SalleSession["params"]) {
  return { type: p.type, nombre: p.nombre, source: p.source, topics: p.topics, difficulte: p.difficulte, temps: p.temps, partCalculs: p.partCalculs };
}

/**
 * La fin de partie est-elle récente ? Une partie terminée depuis moins de
 * `minutes` minutes s'ouvre sur son écran de fin (podium, bilan) plutôt que
 * sur le salon. Les deux dates sont celles du serveur.
 */
export function finRecente(finAtIso: string, serverNowIso: string, minutes = 10): boolean {
  const fin = Date.parse(finAtIso);
  const maintenant = Date.parse(serverNowIso);
  if (!Number.isFinite(fin) || !Number.isFinite(maintenant)) return false;
  return maintenant - fin >= 0 && maintenant - fin < minutes * 60_000;
}

/** Mon total de points sur les questions de la partie : mes réponses connues du serveur, plus celles qu'il vient de me rendre. */
export function totalPoints(nb: number, locales: Record<number, ReponseOk | undefined>, mes: SalleMaReponse[]): number {
  const parPosition = new Map<number, number>();
  for (const m of mes) if (m.position >= 0 && m.position < nb) parPosition.set(m.position, m.points);
  for (const [cle, l] of Object.entries(locales)) {
    const pos = Number(cle);
    if (l && pos >= 0 && pos < nb) parPosition.set(pos, l.points);
  }
  let total = 0;
  for (const v of parPosition.values()) total += v;
  return total;
}

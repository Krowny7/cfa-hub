import { stakesAgainst } from "@/lib/duels";
import { aDuContenu, type DonneesBlocs } from "@/lib/profil/blocs-donnees";
import type { Bloc } from "@/lib/profil/disposition";
import { couleurSens, ecart, joursPourRattraper, questionsSur7, score, sensScore, victoiresPourPasser, type Ecart, type Score } from "@/lib/profil/ecart";
import { nombre } from "@/lib/voice";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { RAPPORT as R } from "@/lib/voice-rapport";
import { Cellule, DemiBande, Jeton } from "@/components/profil/blocs/commun";
import { Fleche, MemoireRapport, type MancheNotee } from "@/components/profil/RapportMemoire";
import s from "./RapportDeForce.module.css";

// Le bandeau « Rapport de force » : sur le profil d'un autre joueur (et dans
// l'aperçu « voir comme les autres »), entre les onglets et les blocs, la
// réponse en une seconde à « est-il chaud, comparé à moi ? ». Ce n'est pas
// un bloc : il ne se déplace pas, n'est pas dans Personnaliser, et ses
// cellules sont fixes, les mêmes sur tous les profils (le visiteur apprend
// où regarder) et toutes publiques : le score (« toi 1 – 3 Inès »), puis
// ELO, Maîtrise, Questions et Série, chacune avec son chiffre (le sien) et
// son jeton (« toi −120 », lib/profil/ecart.ts). Le score compte ces 4
// manches ; une manche sans jeton (maîtrise pas encore mesurée) ne compte
// pas. Une cellule mène à la tuile qui en dit plus, si elle est posée sur
// la page. Après un jeton, une flèche dit si l'écart a bougé depuis ta
// dernière visite (RapportMemoire, dans ce navigateur). Chez soi : rien.
// Aperçu : « toi ± » partout, sans chiffre de toi. Rendu au serveur
// (app/people/[id]/page.tsx), depuis l'essentiel du visiteur
// (lib/profil/visiteur.ts) : il ne coûte aucune lecture de plus.

export type CleManche = "elo" | "maitrise" | "questions" | "serie";

export type Manche = {
  cle: CleManche;
  etiquette: string;
  /** son chiffre mis en forme (« 1 480 », « 64 % », « 23 j ») ; « — » s'il manque */
  chiffre: string;
  /** l'écart de ton côté ; null : pas de jeton (une valeur manque, ou aperçu) */
  e: Ecart | null;
  /** l'infobulle du jeton : les deux valeurs, puis, s'il est rouge, le rattrapage */
  bulle: string | null;
  /** l'infobulle du chiffre quand le jeton manque (« toi : pas encore mesuré ») */
  manque: string | null;
  /** l'écart qui fait bouger la flèche (le seuil d'égalité) */
  seuil: number;
  /** les tuiles où mène la cellule, dans l'ordre de préférence */
  cibles: string[];
};

/** L'ancre d'une tuile de la page (GrilleProfil la pose sur la case) : « bloc-journal ». */
export const ancreBloc = (k: string) => `bloc-${k}`;

/** Les 4 manches du bandeau et son score, d'après les données des blocs (d.toi : celui qui regarde). */
export function manchesRapport(d: DonneesBlocs): { manches: Manche[]; score: Score | null } {
  const toi = d.toi ?? null;
  const nom = d.nom;

  // ELO : l'enjeu du prochain duel, et combien de victoires contre lui pour passer devant
  const eloLui = typeof d.elo === "number" && Number.isFinite(d.elo) ? d.elo : null;
  const eElo = toi ? ecart(eloLui, toi.elo, "elo") : null;
  let bulleElo: string | null = null;
  if (toi && eElo && eloLui !== null) {
    const enjeu = stakesAgainst(toi.elo, toi.parties, eloLui);
    const lignes = [`${T.bulle(R.elo, nom, nombre(eloLui), nombre(toi.elo))} · ${R.enjeu(enjeu.win, enjeu.loss)}`];
    const n = eElo.sens === "perte" ? victoiresPourPasser(toi.elo, toi.parties, eloLui, stakesAgainst) : null;
    if (n) lignes.push(T.rattrapageElo(n, nom));
    bulleElo = lignes.join("\n");
  }

  // Maîtrise du programme : pas de jeton tant que l'une des deux n'est pas mesurée
  const mLui = typeof d.maitrise === "number" ? d.maitrise : null;
  const mToi = toi?.maitrise ?? null;
  const eM = toi ? ecart(mLui, mToi, "pct") : null;

  // Questions : à ton rythme des 7 derniers jours, combien de jours pour combler l'écart
  const qLui = d.stats.questions;
  const qToi = toi ? toi.stats.questions : null;
  const eQ = toi ? ecart(qLui, qToi, "compte") : null;
  let bulleQ: string | null = null;
  if (toi && eQ && qToi !== null) {
    const lignes = [T.bulle(R.questions, nom, nombre(qLui), nombre(qToi))];
    const j = eQ.sens === "perte" ? joursPourRattraper(eQ.delta, questionsSur7(toi.jours, toi.aujourdhui)) : null;
    if (j) lignes.push(T.rattrapageQuestions(j));
    bulleQ = lignes.join("\n");
  }
  const qMax = Math.max(qLui, qToi ?? 0);

  // Série (publique, comme le record, quel que soit le réglage du Journal)
  const sLui = d.stats.serie;
  const eS = toi ? ecart(sLui, toi.stats.serie, "jours") : null;

  const manches: Manche[] = [
    { cle: "elo", etiquette: R.elo, chiffre: eloLui !== null ? nombre(eloLui) : R.sansValeur, e: eElo, bulle: bulleElo, manque: null, seuil: 10, cibles: ["journal"] },
    {
      cle: "maitrise",
      etiquette: R.maitrise,
      chiffre: mLui !== null ? R.pct(mLui) : R.sansValeur,
      e: eM,
      bulle: eM && mLui !== null && mToi !== null ? T.bulle(R.maitrise, nom, R.pct(mLui), R.pct(mToi)) : null,
      manque: mLui === null ? R.pasMesureeLui(nom) : toi && mToi === null ? T.pasMesure : null,
      seuil: 1,
      cibles: ["radar"],
    },
    { cle: "questions", etiquette: R.questions, chiffre: nombre(qLui), e: eQ, bulle: bulleQ, manque: null, seuil: qMax >= 100 ? qMax / 100 : 1, cibles: ["reponses"] },
    {
      cle: "serie",
      etiquette: R.serie,
      chiffre: R.jours(sLui),
      e: eS,
      bulle: toi && eS ? T.bulle(R.serie, nom, R.serieRecord(sLui, d.stats.meilleureSerie), R.serieRecord(toi.stats.serie, toi.stats.meilleureSerie)) : null,
      manque: null,
      seuil: 1,
      cibles: ["carnet"],
    },
  ];
  return { manches, score: score(manches.map((m) => m.e)) };
}

/** La tuile où mène une manche : la première de ses cibles posée sur la page et qui a quelque chose à montrer ; null sinon (la cellule n'est pas un lien). */
export function cibleDe(m: Pick<Manche, "cibles">, blocs: readonly Bloc[], d: DonneesBlocs): string | null {
  return m.cibles.find((k) => blocs.some((b) => b.k === k && aDuContenu(b, d))) ?? null;
}

/** Le score, en chiffre fort : « toi 1 – 3 Inès », à la couleur de celui qui mène ; aperçu : « toi – – Inès », à l'encre douce. */
function ScoreFort({ sc, d }: { sc: Score | null; d: DonneesBlocs }) {
  const nom = <span className={s.nom}>{d.nom}</span>;
  if (!d.toi)
    return (
      <span className={s.score} style={{ color: "var(--ink-2)" }} title={T.apercuEcart} aria-label={T.apercuEcart}>
        <span className={s.prefixe}>toi – –</span>
        {nom}
      </span>
    );
  if (!sc) return <span style={{ color: "var(--ink-2)" }}>{R.sansValeur}</span>;
  const bulle = T.scoreBulle(sc.toi, sc.lui, sc.egal, d.nom);
  return (
    <span className={s.score} style={{ color: couleurSens(sensScore(sc)) }} title={bulle} aria-label={bulle}>
      <span className={s.prefixe}>
        toi {sc.toi} – {sc.lui}
      </span>
      {nom}
    </span>
  );
}

/**
 * Le bandeau, entre les onglets et la grille (onglet Profil, chez un autre
 * et en aperçu) ; `blocs` : ceux posés sur la page (les liens). Rien chez
 * soi, ni sans personne pour comparer (visiteur non connecté).
 */
export function RapportDeForce({ d, blocs }: { d: DonneesBlocs; blocs: readonly Bloc[] }) {
  if (d.moi || (!d.toi && !d.apercu)) return null;
  const { manches, score: sc } = manchesRapport(d);
  const contenu = (
    <DemiBande label={R.label(d.nom)} className={s.rapport}>
      <Cellule etiquette={R.titre} chiffre={<ScoreFort sc={sc} d={d} />} />
      {manches.map((m) => {
        const cible = cibleDe(m, blocs, d);
        const chiffre = cible ? (
          <a href={`#${ancreBloc(cible)}`} className={s.lien} aria-label={R.aller(m.etiquette, m.chiffre, R.vers[cible] ?? "")}>
            {m.chiffre}
          </a>
        ) : (
          m.chiffre
        );
        // chez un autre : le jeton, puis la flèche depuis ta dernière visite ; aperçu : « toi ± » (si son chiffre existe)
        const jeton = d.toi ? (
          m.e ? (
            <>
              <Jeton e={m.e} d={d} bulle={m.bulle ?? undefined} />
              <Fleche cle={m.cle} />
            </>
          ) : null
        ) : m.chiffre !== R.sansValeur ? (
          <Jeton e={null} d={d} />
        ) : null;
        return <Cellule key={m.cle} etiquette={m.etiquette} chiffre={chiffre} jeton={jeton ?? undefined} titre={m.e ? undefined : (m.manque ?? undefined)} />;
      })}
    </DemiBande>
  );
  if (!d.toi) return contenu;
  // ce que la flèche compare d'une visite à l'autre : l'écart signé, son jeton, le seuil d'égalité
  const notees: Record<string, MancheNotee> = {};
  for (const m of manches) if (m.e) notees[m.cle] = { d: m.e.delta, t: m.e.long, seuil: m.seuil };
  return (
    <MemoireRapport id={`${d.toi.id}:${d.id}`} ecarts={notees}>
      {contenu}
    </MemoireRapport>
  );
}

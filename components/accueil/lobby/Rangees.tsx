import { Suspense } from "react";
import { Affiche } from "./Affiche";
import { CarteDeblocage } from "./CarteDeblocage";
import { CarteDuJour } from "./CarteDuJour";
import { CarteQuete } from "./CarteQuete";
import { CarteRival } from "./CarteRival";
import { CarteScores } from "./CarteScores";
import { EnDirect } from "./EnDirect";
import type { DeblocageVue } from "./modele-parcours";
import { SqCarteDuJour, SqDeblocage, SqEnDirect, SqQuete, SqRival } from "./Squelettes";
import type { AfficheLobby, CarteDuJourLobby, EnDirectLobby, QueteLobby, RivalLobby, ScoresLobby } from "./types";
import s from "./Lobby.module.css";

// Les rangées de l'accueil « Le lobby » qui portent une des cinq cartes lentes
// (la carte du jour, le rival, le lobby en direct, le déblocage, la quête), et
// la manière de les lire APRÈS la page, en continu (App Router : streaming).
//
// Deux façons d'obtenir la même rangée :
//   - tout lu d'avance (aperçus, tests) : RangeeJour / RangeeScores avec les
//     données, comme avant ;
//   - lu après la page : RangeeJourEnContinu / RangeeScoresEnContinu /
//     EnDirectEnContinu. Le serveur envoie la page avec, à la place EXACTE de
//     chaque carte, son squelette (Squelettes.tsx, `aria-busy`) ; la carte
//     vraie arrive dès que sa lecture finit et remplace le squelette. Une
//     lecture qui échoue ou dépasse le filet (plafond.ts) rend null : la carte
//     disparaît et la rangée se recompose comme avant (data-n, colonnes), sans
//     trou.
// La composition d'une rangée dépend de ce qui existe (data-n, classes de
// colonnes) : le squelette est donc posé dans la MÊME composition que la rangée
// attendue (toutes les cartes présentes), et c'est la rangée entière qui est
// attendue quand elle se recompose selon deux cartes (les rangées de la carte du
// jour et du déblocage). Pour le lobby en direct, dans la rangée du vainqueur,
// la colonne est stable : seul l'emplacement attend (voir LobbyView.tsx).
// Composants serveur, sans état.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Le marqueur d'une carte pas encore lue : la rangée pose son squelette. */
export const ATTENTE = Symbol("attente");
/** Une carte lue (donnée), absente (null) ou en cours de lecture (ATTENTE). */
export type Emplacement<T> = T | null | typeof ATTENTE;
/** Ce que reçoit une rangée lue en continu : la promesse de la carte, ou déjà sa valeur (lue d'avance). */
export type Lecture<T> = Promise<T | null> | T | null;

/** Vrai pour une lecture en cours (une promesse), faux pour une valeur ou null. */
export const enCours = <T,>(x: Lecture<T>): x is Promise<T | null> => typeof x === "object" && x !== null && typeof (x as { then?: unknown }).then === "function";
/** La lecture finie, ou null si elle rejetait (plafonner ne le laisse pas arriver : ceinture et bretelles). Awaited<T> n'est pas T pour un T quelconque : d'où le passage par unknown. */
const sansRejet = <T,>(x: Lecture<T>): Promise<T | null> => (Promise.resolve(x) as unknown as Promise<T | null>).catch((): null => null);
const attendue = <T,>(x: Lecture<T>): Emplacement<T> => (enCours(x) ? ATTENTE : x);

// ── la rangée de la carte du jour, du rival et de l'affiche ────────────────

/**
 * La rangée 3 : la carte du jour | ton rival | l'affiche. Sans l'un des deux,
 * l'affiche reste à côté de l'autre (data-n="2") ; sans les deux, rien (une
 * affiche seule n'a pas de sens).
 */
export function RangeeJour({ carte, rival, affiche }: { carte: Emplacement<CarteDuJourLobby>; rival: Emplacement<RivalLobby>; affiche: AfficheLobby }) {
  if (!carte && !rival) return null;
  const n = (carte ? 1 : 0) + (rival ? 1 : 0) + 1;
  return (
    <div className={s.rangeeJour} data-n={n === 2 ? 2 : undefined}>
      {carte === ATTENTE ? <SqCarteDuJour /> : carte && <CarteDuJour carte={carte} />}
      {rival === ATTENTE ? <SqRival /> : rival && <CarteRival rival={rival} />}
      <Affiche a={affiche} />
    </div>
  );
}

/** La rangée 3, une fois les deux lectures finies (null : la lecture a échoué ou dépassé le filet). */
export async function RangeeJourLue({ carte, rival, affiche }: { carte: Lecture<CarteDuJourLobby>; rival: Lecture<RivalLobby>; affiche: AfficheLobby }) {
  const [c, r] = await Promise.all([sansRejet(carte), sansRejet(rival)]);
  return <RangeeJour carte={c} rival={r} affiche={affiche} />;
}

/** La rangée 3 en continu : les squelettes des cartes en cours de lecture, puis la rangée recomposée. */
export function RangeeJourEnContinu({ carte, rival, affiche }: { carte: Lecture<CarteDuJourLobby>; rival: Lecture<RivalLobby>; affiche: AfficheLobby }) {
  return (
    <Suspense fallback={<RangeeJour carte={attendue(carte)} rival={attendue(rival)} affiche={affiche} />}>
      <RangeeJourLue carte={carte} rival={rival} affiche={affiche} />
    </Suspense>
  );
}

// ── la rangée du déblocage, de la quête, des scores et de l'affiche ────────

/**
 * La rangée 5 : le déblocage et la quête empilés | les scores | l'affiche ;
 * sans l'un, les autres s'étirent ; sans le déblocage, la quête ni les scores,
 * rien (une affiche seule n'a pas de sens).
 */
export function RangeeScores({
  deblocage,
  quete,
  scores,
  affiche,
}: {
  deblocage: Emplacement<DeblocageVue>;
  quete: Emplacement<QueteLobby>;
  scores: ScoresLobby | null;
  affiche: AfficheLobby;
}) {
  const colonne = !!(deblocage || quete);
  if (!colonne && !scores) return null;
  return (
    <div className={s.rangee}>
      {colonne && (
        <div className={cx(s.colonne, !!deblocage && !!quete && s.enDeux, scores ? s.c3 : s.c6)}>
          {deblocage === ATTENTE ? <SqDeblocage className={s.etire} /> : deblocage && <CarteDeblocage d={deblocage} className={s.etire} />}
          {quete === ATTENTE ? <SqQuete className={s.etire} /> : quete && <CarteQuete q={quete} className={s.etire} />}
        </div>
      )}
      {scores && <CarteScores scores={scores} className={colonne ? s.c5 : s.c8} />}
      <Affiche a={affiche} className={colonne && !scores ? s.c6 : s.c4} />
    </div>
  );
}

/** La rangée 5, une fois les deux lectures finies. */
export async function RangeeScoresLue({ deblocage, quete, scores, affiche }: { deblocage: Lecture<DeblocageVue>; quete: Lecture<QueteLobby>; scores: ScoresLobby | null; affiche: AfficheLobby }) {
  const [d, q] = await Promise.all([sansRejet(deblocage), sansRejet(quete)]);
  return <RangeeScores deblocage={d} quete={q} scores={scores} affiche={affiche} />;
}

/** La rangée 5 en continu. Les scores et l'affiche, déjà lus, se montrent dès le squelette. */
export function RangeeScoresEnContinu({ deblocage, quete, scores, affiche }: { deblocage: Lecture<DeblocageVue>; quete: Lecture<QueteLobby>; scores: ScoresLobby | null; affiche: AfficheLobby }) {
  return (
    <Suspense fallback={<RangeeScores deblocage={attendue(deblocage)} quete={attendue(quete)} scores={scores} affiche={affiche} />}>
      <RangeeScoresLue deblocage={deblocage} quete={quete} scores={scores} affiche={affiche} />
    </Suspense>
  );
}

// ── le lobby en direct ─────────────────────────────────────────────────────

/** Le lobby en direct, une fois lu (null : rien dans l'emplacement, la colonne se referme). */
export async function EnDirectLu({ lu }: { lu: Lecture<EnDirectLobby> }) {
  const d = await sansRejet(lu);
  return d ? <EnDirect d={d} /> : null;
}

/** Le lobby en direct en continu : son squelette à sa place, puis la carte. */
export function EnDirectEnContinu({ lu }: { lu: Lecture<EnDirectLobby> }) {
  return (
    <Suspense fallback={<SqEnDirect />}>
      <EnDirectLu lu={lu} />
    </Suspense>
  );
}

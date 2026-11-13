"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { dayHref, reviewLeftLabel, type DailyBoard, type DailyHistoryEntry, type FormatDefi } from "@/lib/daily";
import { nombre } from "@/lib/voice";
import { CALENDRIER as C } from "@/lib/voice-entrainement-b";
import { rangOrdinal } from "@/lib/voice-z2c";
import css from "./DefiCalendrier.module.css";

// L'objet-héros de /defi et /defi/cinq (direction « le lieu, puis l'objet », 2026-11-13) : le
// calendrier, un tableau d'ébène biseauté. À gauche, la feuille du jour (papier ivoire) : la date en
// grand, entourée à la main à l'encre de la palette, l'enjeu vrai (« SE FIGE DANS 5 H »), l'état et
// la seule action à l'encre, puis le podium du jour. À droite, cinq semaines glissantes qui finissent
// à la semaine en cours : chaque jour joué est une case ivoire qui porte son score en Mono, et le
// tampon SANS FAUTE s'il l'est ; aujourd'hui, ivoire aussi, entouré, « à jouer » ou son score (un
// lien vers le jour une fois la copie rendue) ; un jour sans copie est une case retournée (on y voit
// encore le classement) ; les jours qui restent dans la semaine ne sont que des numéros pâles. Les
// fenêtres précédentes se feuillettent tant que l'historique en contient. L'arrivée des cases ne se
// joue qu'une fois par session. Sans état d'horloge : tout se calcule des clés de jour
// (« AAAA-MM-JJ ») reçues du serveur.

export type CaseJour =
  | { etat: "avenir"; jour: number; key: string }
  | { etat: "aujourdhui"; jour: number; key: string; score: number | null; total: number }
  | { etat: "joue"; jour: number; key: string; score: number; total: number; revue: string | null }
  | { etat: "encours"; jour: number; key: string }
  | { etat: "manque"; jour: number; key: string; joueurs: number }
  | { etat: "ferme"; jour: number; key: string };

const MIDI = "T12:00:00Z";
const lundi0 = (key: string) => (new Date(key + MIDI).getUTCDay() + 6) % 7;
const decaleJours = (key: string, n: number) => {
  const d = new Date(key + MIDI);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * La fenêtre glissante : `semaines` semaines (du lundi au dimanche) qui finissent à la semaine
 * d'aujourd'hui, reculée de `recul` fenêtres. Les jours restants de la semaine en cours gardent
 * leur place (« avenir »), sans tuile.
 */
export function casesFenetre(
  today: string,
  semaines: number,
  recul: number,
  histoire: Map<string, DailyHistoryEntry>,
  aujourdhui: { score: number | null; total: number },
  nowIso: string,
): { cases: CaseJour[]; debut: string; fin: string } {
  const lundi = decaleJours(today, -lundi0(today));
  const debut = decaleJours(lundi, -7 * (semaines - 1 + recul * semaines));
  const cases: CaseJour[] = [];
  for (let i = 0; i < semaines * 7; i++) {
    const key = decaleJours(debut, i);
    const jour = Number(key.slice(8, 10));
    if (key > today) cases.push({ etat: "avenir", jour, key });
    else if (key === today) cases.push({ etat: "aujourdhui", jour, key, ...aujourdhui });
    else {
      const e = histoire.get(key);
      if (e?.finishedAt && e.score !== null)
        cases.push({ etat: "joue", jour, key, score: e.score, total: e.total ?? e.questionCount, revue: reviewLeftLabel(e.finishedAt, nowIso) });
      else if (e?.startedAt) cases.push({ etat: "encours", jour, key });
      else if (e && e.players > 0) cases.push({ etat: "manque", jour, key, joueurs: e.players });
      else cases.push({ etat: "ferme", jour, key });
    }
  }
  return { cases, debut, fin: decaleJours(debut, semaines * 7 - 1) };
}

/** Les jours d'affilée avec une copie rendue, jusqu'à aujourd'hui (s'il est rendu) ou jusqu'à hier. */
export function joursAffilee(today: string, histoire: Map<string, DailyHistoryEntry>, renduAujourdhui: boolean): number {
  let n = renduAujourdhui ? 1 : 0;
  const d = new Date(today + MIDI);
  for (let k = 0; k < 400; k++) {
    d.setUTCDate(d.getUTCDate() - 1);
    const e = histoire.get(d.toISOString().slice(0, 10));
    if (!e?.finishedAt) break;
    n += 1;
  }
  return n;
}

/** L'enjeu vrai : le temps avant minuit (closesAt), « 5 h », « 25 min » ; null une fois passé. */
export function resteAvant(closesAt: string | null, nowIso: string): string | null {
  if (!closesAt) return null;
  const min = (new Date(closesAt).getTime() - new Date(nowIso).getTime()) / 60000;
  return Number.isFinite(min) && min > 0 ? C.reste(min) : null;
}

/** Le tracé du cercle à la main, une boucle qui dépasse son départ (repris par `<use href>`). */
export const TRACE_CERCLE = "M150 14C110 2 50 6 24 30 4 50 6 92 34 114c28 22 104 24 140 2 24-15 26-60 6-86C164 10 120 4 84 10";

/** Le cercle tracé à la main (un seul tracé, repris par `<use href>`). */
function CercleDefs({ id }: { id: string }) {
  return (
    <svg width="0" height="0" className={css.defs} aria-hidden focusable="false">
      <defs>
        <path id={id} vectorEffect="non-scaling-stroke" d={TRACE_CERCLE} />
      </defs>
    </svg>
  );
}

/** Le cercle à la main : le même tracé deux fois (un trait plein, un trait fin décalé) pour l'épaisseur inégale du pinceau. */
export function Entoure({ id, className }: { id: string; className?: string }) {
  return (
    <svg className={[css.entoure, className].filter(Boolean).join(" ")} viewBox="0 0 200 140" preserveAspectRatio="none" aria-hidden focusable="false">
      <use href={`#${id}`} className={css.trait1} />
      <use href={`#${id}`} className={css.trait2} transform="translate(2 -1)" />
    </svg>
  );
}

/** Le podium du jour : les trois premiers (mon rang, une fois la copie rendue, est sur la feuille). */
export function PodiumDuJour({ board, n, lien }: { board: DailyBoard | null; n: number; lien?: string | null }) {
  const rows = board?.rows ?? [];
  if (!rows.length) return null;
  const lignes = rows.slice(0, 3);
  return (
    <div className={css.podium}>
      <p className={css.podiumTitre}>{C.classement}</p>
      <ol className={css.podiumListe}>
        {lignes.map((r) => (
          <li key={r.userId} data-moi={r.isMe ? "1" : undefined}>
            <b>{rangOrdinal(r.rank)}</b>
            <span className={css.podiumNom}>{r.isMe ? C.toi : (r.username ?? "Joueur")}</span>
            <span>
              {nombre(r.score)}
              <i>/{nombre(r.total || n)}</i>
            </span>
          </li>
        ))}
      </ol>
      {lien && (
        <Link href={lien} className={css.podiumLien}>
          {C.toutClassement} <ArrowRight size={12} aria-hidden />
        </Link>
      )}
    </div>
  );
}

/** Les cinq semaines de la fenêtre. */
const SEMAINES = 5;
/** l'arrivée des cases ne se joue qu'une fois par session */
const VU_CLE = "rl_defi_cal_vu";

export function DefiCalendrier({
  today,
  histoire,
  aujourdhui,
  format,
  nowIso,
  feuille,
}: {
  today: string;
  histoire: DailyHistoryEntry[];
  /** la case d'aujourd'hui dans la grille : mon score s'il est rendu */
  aujourdhui: { score: number | null; total: number };
  format: FormatDefi;
  nowIso: string;
  /** la feuille du jour (la date en grand, l'enjeu, l'action, le podium) ; reçoit l'id du cercle tracé à la main */
  feuille: (idCercle: string) => React.ReactNode;
}) {
  const parJour = useMemo(() => new Map(histoire.map((e) => [e.day, e])), [histoire]);
  const premier = useMemo(() => histoire.reduce((m, e) => (e.day < m ? e.day : m), today), [histoire, today]);
  const [recul, setRecul] = useState(0);
  const [vu, setVu] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(VU_CLE)) setVu(true);
      else sessionStorage.setItem(VU_CLE, "1");
    } catch {
      // stockage bloqué : l'arrivée se rejoue, rien de plus
    }
  }, []);
  const { cases, debut, fin } = casesFenetre(today, SEMAINES, recul, parJour, aujourdhui, nowIso);
  const anneeAuj = Number(today.slice(0, 4));
  const titre = C.titreFenetre(debut, fin, anneeAuj);
  const aPrecedent = premier < debut;
  const idCercle = "cal-cercle-" + useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <section className={css.tableau} aria-label={titre} data-vu={vu ? "1" : undefined}>
      <CercleDefs id={idCercle} />
      <div className={css.feuilleZone}>{feuille(idCercle)}</div>
      <div className={css.mois}>
        <div className={css.moisTete}>
          <h2 className={css.moisTitre}>{titre}</h2>
          <div className={css.nav}>
            <button type="button" className={css.navBtn + " rl-presse"} disabled={!aPrecedent} onClick={() => setRecul((r) => r + 1)} aria-label={C.plusTot}>
              <ChevronLeft size={16} aria-hidden />
            </button>
            <button type="button" className={css.navBtn + " rl-presse"} disabled={recul === 0} onClick={() => setRecul((r) => Math.max(0, r - 1))} aria-label={C.plusTard}>
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </div>
        <div className={css.semaine} aria-hidden>
          {C.semaine.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <ol className={css.grille}>
          {cases.map((c, i) => (
            <Case key={i} c={c} i={i} format={format} idCercle={idCercle} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function Case({ c, i, format, idCercle }: { c: CaseJour; i: number; format: FormatDefi; idCercle: string }) {
  const style = { ["--i" as string]: i } as React.CSSProperties;
  const mm = Number(c.key.slice(5, 7));
  const nomJour = `${C.jourCourt(lundi0(c.key))} ${c.jour} ${C.mois(mm)}`;
  // le 1er du mois porte le mois : la fenêtre passe d'un mois à l'autre sans titre de plus
  const num = (
    <span className={css.num}>
      {c.jour}
      {c.jour === 1 && <small>{C.moisCourt(mm)}</small>}
    </span>
  );
  if (c.etat === "avenir" || c.etat === "ferme")
    return (
      <li className={css.case} data-etat={c.etat} style={style}>
        {num}
      </li>
    );
  const href = dayHref(c.key, format);
  if (c.etat === "aujourdhui") {
    const rendu = c.score !== null;
    const corps = (
      <>
        {num}
        {rendu ? (
          <span className={css.score}>
            {nombre(c.score ?? 0)}
            <i>/{nombre(c.total)}</i>
          </span>
        ) : (
          <span className={css.auj}>{C.aJouer}</span>
        )}
      </>
    );
    return (
      <li className={css.case} data-etat="aujourdhui" style={style}>
        {rendu ? (
          <Link href={href} className={css.lien + " rl-presse"} aria-label={C.caseAujourdhui(nomJour)} title={C.caseAujourdhui(nomJour)}>
            {corps}
          </Link>
        ) : (
          <span className={css.lien} aria-label={C.caseAujourdhui(nomJour)}>
            {corps}
          </span>
        )}
        <Entoure id={idCercle} className={css.entoureCase} />
      </li>
    );
  }
  if (c.etat === "joue") {
    const sansFaute = c.total > 0 && c.score === c.total;
    const lecture = C.caseJouee(nomJour, c.score, c.total, sansFaute, c.revue);
    return (
      <li className={css.case} data-etat="joue" data-tenu={sansFaute ? "1" : undefined} style={style}>
        <Link href={href} className={css.lien + " rl-presse"} aria-label={lecture} title={lecture}>
          {num}
          <span className={css.score}>
            {nombre(c.score)}
            <i>/{nombre(c.total)}</i>
          </span>
          {sansFaute && <span className={css.tenu}>{C.sansFaute}</span>}
        </Link>
      </li>
    );
  }
  if (c.etat === "encours")
    return (
      <li className={css.case} data-etat="encours" style={style}>
        <Link href={href} className={css.lien + " rl-presse"} aria-label={C.caseEnCours(nomJour)} title={C.caseEnCours(nomJour)}>
          {num}
          <span className={css.auj}>{C.enCours}</span>
        </Link>
      </li>
    );
  return (
    <li className={css.case} data-etat="manque" style={style}>
      <Link href={href} className={css.lien + " rl-presse"} aria-label={C.caseManquee(nomJour, c.joueurs)} title={C.caseManquee(nomJour, c.joueurs)}>
        {num}
      </Link>
    </li>
  );
}

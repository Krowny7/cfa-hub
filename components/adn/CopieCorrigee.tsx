"use client";

// La copie corrigée (moment 5) : la fin de session rendue comme une copie.
// Marge rouge, note entourée au stylo rouge, appréciation par matière, marge
// cochée ligne à ligne. C'est le moment le plus fréquent du site : léger
// (moins d'une seconde), jamais bloquant, les actions sont là tout de suite.
//
//   <CopieCorrigee
//     surTitre="Entraînement ciblé"       titre="Derivatives"
//     meta="32 questions · 41 min"         score={23} total={32}
//     questions={[{ label: "Forward price of an asset with…", ok: true }, …]}
//     matieres={[{ label: "Options", ok: 9, total: 10 }, …]}
//     anneau={<AnneauDuJour … />}          // l'avancée de l'anneau du jour (KA)
//     actions={<>
//       <Link className="btn btn-primary">Reprendre mes 9 ratures</Link>
//       {boutonCopierPourIA}               // le bouton existant de l'écran, tel quel
//     </>}
//   />
//
// Props
//   surTitre, titre, meta   l'en-tête de la copie
//   score, total            la note entourée (« 23/32 »)
//   questions               la marge : ✓ / ✗ au stylo rouge ; `visibles` lignes
//                           (défaut 8), puis « … 24 autres »
//   matieres                pour l'appréciation (« Fixed Income, c'est acquis.
//                           Derivatives : encore. ») ; `appreciation` la remplace
//   anneau, actions         emplacements libres sous la copie
//   anime                   false : copie posée (revisite) ; son : "micro" (défaut)
// Le titre de l'appréciation vient de lib/voice (verdictSession).

import { useRef } from "react";
import { verdictSession } from "@/lib/voice";
import { PEN_CHECK, PEN_CROSS, PEN_LOOP } from "./paths-moments";
import type { SonMoment } from "./sound";
import { EASE_INK, usePartition } from "./sound-timeline";
import s from "./CopieCorrigee.module.css";

export type LigneCopie = { label: string; ok: boolean; n?: number | string };
export type MatiereCopie = { label: string; ok: number; total: number };

/** L'appréciation du correcteur : le verdict, puis ce qui est acquis et ce qui reste. */
export function appreciationCopie(score: number, total: number, matieres?: MatiereCopie[] | null): string[] {
  const v = verdictSession(score, total);
  const lignes = [v.titre];
  if (v.niveau === "propre" || !matieres || matieres.length < 2) return lignes;
  const ms = matieres.filter((m) => m.total >= 2).map((m) => ({ ...m, p: m.ok / m.total }));
  const fort = ms.filter((m) => m.p >= 0.8).sort((a, b) => b.p - a.p || b.total - a.total)[0];
  const faible = ms.filter((m) => m.p < 0.6 && m !== fort).sort((a, b) => a.p - b.p || b.total - a.total)[0];
  const parts = [fort ? `${fort.label}, c'est acquis.` : null, faible ? `${faible.label} : encore.` : null].filter(Boolean);
  if (parts.length) lignes.push(parts.join(" "));
  return lignes;
}

export function CopieCorrigee({
  surTitre,
  titre,
  meta,
  score,
  total,
  questions = [],
  visibles = 8,
  matieres,
  appreciation,
  anneau,
  actions,
  anime = true,
  son = "micro",
  figerA = null,
  className = "",
}: {
  surTitre?: string;
  titre: string;
  meta?: string;
  score: number;
  total: number;
  questions?: LigneCopie[];
  visibles?: number;
  matieres?: MatiereCopie[] | null;
  appreciation?: string | string[];
  anneau?: React.ReactNode;
  actions?: React.ReactNode;
  anime?: boolean;
  son?: SonMoment | false;
  /** aperçus : arrêt sur image à t secondes */
  figerA?: number | null;
  className?: string;
}) {
  const loop = useRef<SVGPathElement | null>(null);
  const note = useRef<HTMLSpanElement | null>(null);
  const app = useRef<HTMLParagraphElement | null>(null);
  const marks = useRef<HTMLUListElement | null>(null);
  const lignes = appreciation ? (Array.isArray(appreciation) ? appreciation : [appreciation]) : appreciationCopie(score, total, matieres);
  const shown = questions.slice(0, Math.max(0, visibles));
  const reste = questions.length - shown.length;

  usePartition(
    (p) => {
      p.anime(loop.current, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], 0.05, 0.55, EASE_INK);
      p.anime(note.current, [{ opacity: 0, transform: "rotate(-4deg) translateY(1px) scale(.9)" }, { opacity: 1, transform: "rotate(-4deg) translateY(1px)" }], 0, 0.3);
      if (son) p.son(0.02, "stylo", { moment: son });
      marks.current?.querySelectorAll<SVGPathElement>("[data-mark]").forEach((m, i) => {
        p.anime(m, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], 0.14 + i * 0.035, 0.16, EASE_INK);
      });
      app.current?.querySelectorAll<HTMLElement>("span").forEach((l, i) => {
        p.anime(l, [{ clipPath: "inset(-20% 100% -20% 0)" }, { clipPath: "inset(-20% 0% -20% 0)" }], 0.32 + i * 0.22, 0.45, "cubic-bezier(.4,.1,.3,1)");
      });
    },
    { actif: anime, figerA },
  );

  return (
    <div className={`${s.root} ${className}`}>
      <article className={s.feuille} aria-label={`Copie corrigée : ${score} sur ${total}`}>
        <header className={s.tete}>
          <div style={{ minWidth: 0 }}>
            {surTitre ? <div className={s.kicker}>{surTitre}</div> : null}
            <div className={s.titre}>{titre}</div>
            {meta ? <div className={s.meta}>{meta}</div> : null}
          </div>
          <div className={s.note}>
            <svg viewBox="0 0 140 80" aria-hidden>
              <path ref={loop} d={PEN_LOOP} fill="none" stroke="var(--pen)" strokeWidth={2.6} strokeLinecap="round" pathLength={100} strokeDasharray="100 100" />
            </svg>
            <span ref={note} className={`${s.noteTxt} ${s.plume}`} aria-hidden>
              {score}
              <small>/{total}</small>
            </span>
          </div>
        </header>
        <p ref={app} className={`${s.appreciation} ${s.plume}`}>
          {lignes.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </p>
        {shown.length ? (
          <ul ref={marks} className={s.questions}>
            {shown.map((q, i) => (
              <li key={i} className={s.q}>
                <svg viewBox="0 0 24 24" className={s.mark} aria-hidden>
                  <path data-mark d={q.ok ? PEN_CHECK : PEN_CROSS} fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" pathLength={100} strokeDasharray="100 100" />
                </svg>
                <span className={s.qn}>Q{q.n ?? i + 1}</span>
                <span className={s.ql}>{q.label}</span>
                <span className="sr-only">{q.ok ? " : juste" : " : à reprendre"}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {reste > 0 ? <div className={s.autres}>… {reste} {reste > 1 ? "autres" : "autre"}</div> : null}
      </article>
      {anneau ? <div className={s.anneau}>{anneau}</div> : null}
      {actions ? <div className={s.actions}>{actions}</div> : null}
    </div>
  );
}


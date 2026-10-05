"use client";

// Le verdict de duel (moment 3 d'A3, bande d'encre de la direction Geste).
//
// Séquence (environ 5 s, une fois par duel, « Passer » dès 1 s) :
//   1. le dépouillement : les deux copies se corrigent en même temps, une
//      touche d'encre par bonne réponse, un trait rouge par erreur ; les
//      scores montent côte à côte, ralenti sur les 5 dernières ;
//   2. le mot au pinceau sur la bande d'encre : « Victoire. » (encre chargée,
//      éclaboussures), « Défaite. » (pinceau sec), « Nulle. » (un seul trait) ;
//   3. l'enjeu : l'ELO s'ajoute en encre fraîche sur l'anneau de rang, les
//      mentions se tamponnent (deux au plus) ;
//   4. la question décisive, entourée au stylo rouge, puis les actions.
// Ensuite (même duel, `cle`), l'écran s'affiche figé dans son état final.
// Mouvement réduit : figé d'emblée.
//
//   <Verdict
//     issue="victoire"                                   // | "defaite" | "nulle"
//     moi={{ nom: "Toi", score: 22, temps: 1898, elo: 1312 }}
//     eux={{ nom: "Hugo P.", score: 19, temps: 2210, elo: 1350 }}
//     copies={{ moi: [true, false, …], eux: [true, null, …], matieres: ["ethics", …] }}
//     enjeu={{ avant: 1312, apres: 1330, maitrise: 54 }}
//     decisive={{ position: 14, matiere: "Fixed Income", enonce: "A bond's…", moi: "B ✓", eux: "C ✗" }}
//     ratures={8}
//     actions={<>…Revoir la partie · Copier pour l'IA · Revanche…</>}
//     cle={duel.id}
//   />
//
// Props
//   issue, forfait          l'issue (forfait : la phrase le dit)
//   moi, eux                nom, score, temps (s), elo avant le duel
//   total                   nombre de questions (défaut : longueur des copies, ou 30)
//   copies                  justesse question par question (null = sans réponse) ;
//                           sans copies, pas de dépouillement : les scores montent
//   enjeu                   ELO avant / après, maîtrise et place (verrou, Top 10)
//   mentions                "auto" (défaut, calculées depuis les copies) ou une liste
//   decisive                la question qui a fait basculer le duel (lib/duels :
//                           decisiveQuestion) ; entourée dans ta copie
//   ratures                 tes erreurs (phrase de défaite)
//   contexte                sur-titre (défaut « Duel · Finance · CFA Niveau I »)
//   actions                 emplacement des boutons (la revue et « Copier pour l'IA »
//                           existants, passés tels quels)
//   cle, mode               "auto" (défaut) : séquence la première fois pour `cle`,
//                           figé ensuite ; "sequence" ; "fige"
//   son                     "ceremonie" (défaut) ou false
//   onFin                   à la fin de la séquence (ou tout de suite si figé) :
//                           la cérémonie de rang peut suivre

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { signalerLeonard } from "@/lib/leonard/signal";
import { RING_FULL_AXIS } from "@/components/ink/paths";
import { INK } from "@/components/ui/InkDefs";
import { RankBadge } from "@/components/ui/RankBadge";
import { rankFor, TIERS } from "@/lib/ranks";
import { pointsAvant, signe, SOMMET, verdictDuel, type IssueDuel } from "@/lib/voice";
import { SceauMention, type MentionDuel } from "./Sceau";
import { EASE_INK, EASE_OUT, STAMP_KF, usePartition, type Partition } from "./sound-timeline";
import type { SonMoment } from "./sound";
import s from "./Verdict.module.css";

export type JoueurVerdict = { nom: string; score: number; temps?: number | null; elo?: number | null };
export type MarqueCopie = boolean | null;
export type DecisiveVerdict = { position: number; matiere?: string | null; enonce: string; moi?: string | null; eux?: string | null; note?: string | null };
export type MentionVerdict = { mention: MentionDuel; detail?: string };

const VU_KEY = "rl-verdict-vu";
/** ELO en chiffres nus (« 1312 »), comme partout sur le site */
const elo = (n: number) => String(Math.round(n));
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

function dejaVu(cle: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(VU_KEY) || "[]") as string[]).includes(cle);
  } catch {
    return false;
  }
}
function marquerVu(cle: string) {
  try {
    const l = (JSON.parse(localStorage.getItem(VU_KEY) || "[]") as string[]).filter((k) => k !== cle);
    l.unshift(cle);
    localStorage.setItem(VU_KEY, JSON.stringify(l.slice(0, 60)));
  } catch {
    // stockage bloqué : la séquence rejouera, ce n'est pas grave
  }
}

/** Les mentions d'un duel (deux au plus), depuis les copies et les temps. */
export function mentionsDuel({
  issue,
  moi,
  eux,
  copies,
}: {
  issue: IssueDuel;
  moi: JoueurVerdict;
  eux: JoueurVerdict | null;
  copies?: { moi: MarqueCopie[]; eux?: MarqueCopie[] | null; matieres?: (string | null)[] | null } | null;
}): MentionVerdict[] {
  const out: MentionVerdict[] = [];
  const m = copies?.moi ?? [];
  const e = copies?.eux ?? null;
  // Remontada : mené de 4 ou plus, et gagné
  if (issue === "victoire" && e && e.length === m.length) {
    let d = 0;
    let pire = 0;
    m.forEach((v, i) => {
      d += (v ? 1 : 0) - (e[i] ? 1 : 0);
      pire = Math.min(pire, d);
    });
    if (pire <= -4) out.push({ mention: "remontada", detail: `MENÉ DE ${-pire}` });
  }
  // Sans faute : une matière (3 questions au moins) toute juste
  const mat = copies?.matieres;
  if (mat && mat.length === m.length) {
    const by = new Map<string, { n: number; ok: number }>();
    m.forEach((v, i) => {
      const k = mat[i];
      if (!k) return;
      const x = by.get(k) ?? { n: 0, ok: 0 };
      x.n++;
      if (v) x.ok++;
      by.set(k, x);
    });
    const best = Array.from(by.entries())
      .filter(([, x]) => x.n >= 3 && x.ok === x.n)
      .sort((a, b) => b[1].n - a[1].n)[0];
    if (best) out.push({ mention: "sansFaute", detail: `${best[0].toUpperCase()} · ${best[1].n}/${best[1].n}` });
  }
  // Éclair : plus rapide, et gagné
  if (issue === "victoire" && moi.temps && eux?.temps && moi.temps < eux.temps) out.push({ mention: "eclair", detail: `EN ${clock(moi.temps)}` });
  // Sang-froid : les 5 dernières justes
  if (m.length >= 10 && m.slice(-5).every((v) => v === true)) out.push({ mention: "sangFroid" });
  return out.slice(0, 2);
}

// Anneau de rang : la progression dans le palier, jamais fermée (règle 2)
const CAP = 96;
function progression(elo: number, maitrise: number | null, place: number | null) {
  const r = rankFor(elo, maitrise, place);
  return { r, p: Math.max(2, Math.min(CAP, r.progress)) };
}

export function Verdict({
  issue,
  forfait = false,
  moi,
  eux,
  total,
  copies = null,
  enjeu = null,
  mentions = "auto",
  decisive = null,
  ratures = 0,
  contexte = "Duel · Finance · CFA Niveau I",
  actions,
  cle,
  mode = "auto",
  son = "ceremonie",
  figerA = null,
  onFin,
  className = "",
}: {
  issue: IssueDuel;
  forfait?: boolean;
  moi: JoueurVerdict;
  eux: JoueurVerdict | null;
  total?: number;
  copies?: { moi: MarqueCopie[]; eux?: MarqueCopie[] | null; matieres?: (string | null)[] | null } | null;
  enjeu?: { avant: number; apres: number; maitrise?: number | null; place?: number | null } | null;
  mentions?: "auto" | MentionVerdict[];
  decisive?: DecisiveVerdict | null;
  ratures?: number;
  contexte?: string;
  actions?: React.ReactNode;
  cle?: string;
  mode?: "auto" | "sequence" | "fige";
  son?: SonMoment | false;
  /** aperçus : arrêt sur image à t secondes */
  figerA?: number | null;
  onFin?: () => void;
  className?: string;
}) {
  const n = total ?? (copies?.moi.length || 30);
  const v = verdictDuel({
    issue,
    moi: moi.score,
    lui: eux?.score ?? 0,
    adversaire: eux?.nom ?? "ton adversaire",
    tempsMoi: moi.temps,
    tempsLui: eux?.temps,
    deltaElo: enjeu ? enjeu.apres - enjeu.avant : null,
    ratures,
    forfait,
  });
  const liste = mentions === "auto" ? mentionsDuel({ issue, moi, eux, copies }) : mentions.slice(0, 2);
  const theme = useRef<"papier" | "nuit">("papier");

  // séquence ou figé : décidé au montage (la séquence ne joue qu'une fois par duel)
  const [joue, setJoue] = useState<boolean | null>(mode === "fige" ? false : mode === "sequence" ? true : null);
  const [fini, setFini] = useState(false);
  useEffect(() => {
    if (mode !== "auto") return;
    if (cle && dejaVu(cle)) setJoue(false);
    else {
      if (cle) {
        marquerVu(cle);
        // Léonard commente le duel, après la séquence du verdict
        const ecart = (eux?.score ?? 0) - moi.score;
        const evt = issue === "victoire" ? "duel-gagne" : issue === "nulle" ? "duel-nul" : ecart >= 3 ? "duel-ecrase" : "duel-perdu";
        signalerLeonard({ evt, vars: { score: `${moi.score}-${eux?.score ?? 0}` }, delai: 5200 }, "duel:" + cle);
      }
      setJoue(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, cle]);

  const R = useRef<Record<string, HTMLElement | SVGElement | null>>({});
  const ref = (k: string) => (el: HTMLElement | SVGElement | null) => {
    R.current[k] = el;
  };
  const root = useRef<HTMLElement | null>(null);

  const enj = useMemo(() => {
    if (!enjeu) return null;
    const m = enjeu.maitrise ?? null;
    const pl = enjeu.place ?? null;
    const a = progression(enjeu.avant, m, pl);
    const b = progression(enjeu.apres, m, pl);
    return { a, b, palierChange: a.r.tierIndex !== b.r.tierIndex, delta: enjeu.apres - enjeu.avant };
  }, [enjeu]);

  const build = (p: Partition) => {
    theme.current = document.documentElement.dataset.theme === "nuit" ? "nuit" : "papier";
    const q = <T extends Element>(sel: string) => Array.from(root.current?.querySelectorAll<T>(sel) ?? []);
    const cer = son ? { moment: son } : null;
    p.anime(R.current.tete, [{ opacity: 0 }, { opacity: 1 }], 0, 0.3);
    p.anime(R.current.passer, [{ opacity: 0, visibility: "hidden" }, { opacity: 1, visibility: "visible" }], 1, 0.25);

    // 1. le dépouillement
    let tMot = 0.75;
    const scoreMoi = R.current.scoreMoi as HTMLElement | null;
    const scoreEux = R.current.scoreEux as HTMLElement | null;
    const mm = copies?.moi ?? null;
    if (mm && mm.length) {
      const ee = copies?.eux ?? null;
      const fast = Math.max(0, mm.length - 5);
      const at = (i: number) => 0.2 + (i < fast ? i * 0.055 : fast * 0.055 + (i - fast + 1) * 0.16);
      const marksMoi = q<SVGGElement>("[data-row='moi'] [data-i]");
      const marksEux = q<SVGGElement>("[data-row='eux'] [data-i]");
      let cm = 0;
      let ce = 0;
      p.appel(0, () => {
        if (scoreMoi) scoreMoi.textContent = "0";
        if (scoreEux) scoreEux.textContent = "0";
      });
      mm.forEach((ok, i) => {
        const t = at(i);
        const k: Keyframe[] = [
          { opacity: 0, transform: "scale(1.9)" },
          { opacity: 1, transform: "scale(1)" },
        ];
        p.anime(marksMoi[i], k, t, 0.2, EASE_OUT);
        p.anime(marksEux[i], k, t, 0.2, EASE_OUT);
        if (ok) cm++;
        if (ee?.[i]) ce++;
        const a = cm;
        const b = ce;
        p.appel(t + 0.04, () => {
          if (scoreMoi) scoreMoi.textContent = String(a);
          if (scoreEux && ee) scoreEux.textContent = String(b);
        });
        if (cer) p.son(t, "stylo", { ...cer, variante: ok ? "tic" : "tac", volume: i < fast ? 0.55 : 0.9 });
      });
      // la copie adverse inconnue : son score s'écrit à la fin
      if (!ee && scoreEux && eux) p.compte(scoreEux, 0, eux.score, 0.3, at(mm.length - 1));
      // le score final, au cas où les copies diffèrent du score officiel
      p.appel(at(mm.length - 1) + 0.06, () => {
        if (scoreMoi) scoreMoi.textContent = String(moi.score);
        if (scoreEux && eux) scoreEux.textContent = String(eux.score);
      });
      tMot = at(mm.length - 1) + 0.12;
    } else {
      p.compte(scoreMoi as HTMLElement, 0, moi.score, 0.15, 0.55);
      if (eux) p.compte(scoreEux as HTMLElement, 0, eux.score, 0.15, 0.55);
    }

    // le perdant passe au gris une fois le mot écrit
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#111";
    q<HTMLElement>(`.${s.perdant} .${s.score}`).forEach((el) => p.anime(el, [{ color: ink }, { color: ink, offset: 0.5 }, { color: getComputedStyle(el).color }], tMot, 0.7));

    // 2. le mot
    const axe = R.current.axe as SVGPathElement | null;
    p.anime(axe, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], tMot, issue === "nulle" ? 0.6 : 0.46, "cubic-bezier(.5,0,.2,1)");
    p.anime(R.current.mot, [{ clipPath: "inset(-30% 100% -30% -10%)" }, { clipPath: "inset(-30% -10% -30% -10%)" }], tMot + (issue === "nulle" ? 0 : 0.05), issue === "nulle" ? 0.5 : 0.42, "cubic-bezier(.5,0,.2,1)");
    if (cer) p.son(tMot, "trait", { ...cer, duree: issue === "defaite" ? 0.55 : 0.45, volume: issue === "victoire" ? 1 : 0.75 });
    if (issue === "victoire") {
      q<SVGCircleElement>("[data-goutte]").forEach((c, i) => {
        const dx = Number(c.dataset.dx);
        const dy = Number(c.dataset.dy);
        p.anime(c, [{ opacity: 0, transform: `translate(${-dx}px, ${-dy}px) scale(.4)` }, { opacity: 1, offset: 0.2 }, { opacity: 1, transform: "none" }], tMot + 0.08 + (i % 5) * 0.012, 0.42, "cubic-bezier(.15,.8,.3,1)");
      });
      p.anime(R.current.bande, [{ transform: "scale(1)" }, { transform: "scale(1.012)", offset: 0.3 }, { transform: "scale(1)" }], tMot + 0.1, 0.36);
    }
    p.anime(R.current.phrase, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], tMot + 0.45, 0.4);

    // 3. l'enjeu
    const tE = tMot + 0.8;
    p.anime(R.current.suite, [{ opacity: 0 }, { opacity: 1 }], tE - 0.1, 0.35);
    if (enjeu && enj) {
      p.compte(R.current.elo as HTMLElement, enjeu.avant, enjeu.apres, tE, 0.9, elo);
      p.anime(R.current.delta, STAMP_KF, tE + 0.15, 0.42);
      if (cer) p.son(tE + 0.33, "tampon", { ...cer, volume: 0.6 });
      // le segment neuf pousse depuis l'ancien bout (même écart, longueur de 0 à d)
      const neuf = R.current.neuf as SVGPathElement | null;
      const fin = neuf?.getAttribute("stroke-dasharray") ?? "0 200";
      const debut = fin.split(" ").map((x, i) => (i === 2 ? "0" : x)).join(" ");
      p.anime(neuf, [{ strokeDasharray: debut }, { strokeDasharray: fin }], tE + 0.1, 0.85, EASE_INK);
      p.anime(R.current.perdu, [{ opacity: 0.5 }, { opacity: 0 }], tE + 0.2, 1.2);
      p.anime(R.current.vieux, [{ opacity: 0.35 }, { opacity: 0.35, offset: 0.6 }, { opacity: 1 }], tE, 1.8);
    }
    q<HTMLElement>("[data-mention]").forEach((el, i) => {
      const t = tE + 0.5 + i * 0.28;
      p.anime(el, STAMP_KF, t, 0.42);
      if (cer) p.son(t + 0.17, "tampon", cer);
    });

    // 4. la question décisive, puis la suite
    const tD = tE + 0.5 + liste.length * 0.28 + 0.15;
    p.anime(R.current.rond, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], tD, 0.45, EASE_INK);
    p.anime(R.current.excl, [{ opacity: 0 }, { opacity: 1 }], tD + 0.3, 0.2);
    p.anime(R.current.decisive, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], tD + 0.1, 0.4);
    if (decisive && cer) p.son(tD, "stylo", { ...cer, duree: 0.35, volume: 0.7 });
    p.anime(R.current.actions, [{ opacity: 0, visibility: "hidden" }, { opacity: 1, visibility: "visible" }], tD + 0.25, 0.35);
    p.anime(R.current.passer, [{ opacity: 1, visibility: "visible" }, { opacity: 0, visibility: "hidden" }], tD + 0.5, 0.2, EASE_OUT, "forwards");
  };

  const { passer } = usePartition(build, {
    actif: joue === true,
    figerA,
    cle: cle ?? "",
    onFin: () => {
      setFini(true);
      onFin?.();
    },
  });
  useEffect(() => {
    if (joue === false) onFin?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joue]);

  // Échap ou Entrée : passer
  useEffect(() => {
    if (!joue || fini) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") passer();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [joue, fini, passer]);

  const gagnant = issue === "victoire" ? "moi" : issue === "defaite" ? "eux" : null;
  const bandeCls = issue === "victoire" ? s.charge : issue === "defaite" ? s.sec : s.nulle;
  const dec = decisive && copies?.moi && decisive.position >= 1 && decisive.position <= copies.moi.length ? decisive.position - 1 : null;

  return (
    <section
      ref={root}
      className={`${s.verdict} ${joue === null ? s.arme : ""} ${className}`}
      aria-label={`${v.mot} ${v.phrase}`}
      data-issue={issue}
    >
      <div ref={ref("tete")} className={s.tete}>
        <span className={s.kicker}>{contexte}</span>
        {joue && !fini && figerA === null ? (
          <button ref={ref("passer")} type="button" className={s.passer} onClick={() => passer()}>
            Passer ›
          </button>
        ) : null}
      </div>

      <div className={s.affiche}>
        <div className={`${s.joueur} ${gagnant === "eux" ? s.perdant : ""}`}>
          <div className={s.scoreRow}>
            <span ref={ref("scoreMoi")} className={s.score}>
              {moi.score}
            </span>
            <span className={s.sur}>/{n}</span>
          </div>
          <div className={s.qui}>
            {moi.nom}
            <span className={s.meta}>{[moi.elo != null ? `${elo(moi.elo)} ELO` : null, moi.temps != null ? clock(moi.temps) : forfait && issue !== "victoire" ? "forfait" : null].filter(Boolean).join(" · ")}</span>
          </div>
          {copies?.moi?.length ? <Marques row="moi" marques={copies.moi} decisive={dec} refs={{ rond: ref("rond"), excl: ref("excl") }} /> : null}
        </div>

        <Bande issue={issue} mot={v.mot} cls={bandeCls} refs={{ bande: ref("bande"), axe: ref("axe"), mot: ref("mot") }} />

        {eux ? (
          <div className={`${s.joueur} ${s.eux} ${gagnant === "moi" ? s.perdant : ""}`}>
            {copies?.eux?.length ? <Marques row="eux" marques={copies.eux} decisive={null} /> : null}
            <div className={s.scoreRow}>
              <span ref={ref("scoreEux")} className={s.score}>
                {eux.score}
              </span>
              <span className={s.sur}>/{n}</span>
            </div>
            <div className={s.qui}>
              <span className={s.meta}>{[eux.elo != null ? `${elo(eux.elo)} ELO` : null, eux.temps != null ? clock(eux.temps) : forfait ? "forfait" : null].filter(Boolean).join(" · ")}</span>
              {eux.nom}
            </div>
          </div>
        ) : null}
      </div>

      <p ref={ref("phrase")} className={s.phrase}>
        {v.phrase}
        {v.rebond ? <span> {v.rebond}</span> : null}
      </p>

      <div ref={ref("suite")} className={s.suite}>
        {enjeu && enj ? <Enjeu enjeu={enjeu} enj={enj} refs={{ elo: ref("elo"), delta: ref("delta"), neuf: ref("neuf"), vieux: ref("vieux"), perdu: ref("perdu") }} /> : <div />}
        {liste.length ? (
          <div className={s.mentions}>
            {liste.map((m, i) => (
              <span key={m.mention} data-mention="" style={{ display: "inline-block" }}>
                <SceauMention mention={m.mention} detail={m.detail} pose={false} son={false} taille={160} angle={i % 2 ? 2.5 : -3.5} />
              </span>
            ))}
          </div>
        ) : (
          <div />
        )}
        {actions ? (
          <div ref={ref("actions")} className={s.actions}>
            {actions}
          </div>
        ) : null}
      </div>

      {decisive ? (
        <div ref={ref("decisive")} className={s.decisive}>
          <span className={s.excl2} aria-hidden>
            !!
          </span>
          <div className={s.decisiveMeta}>
            La question décisive · Q{decisive.position}
            {decisive.matiere ? ` · ${decisive.matiere}` : ""}
            {decisive.note ? (
              <>
                {" · "}
                <b>{decisive.note}</b>
              </>
            ) : null}
          </div>
          <div className={s.enonce}>{decisive.enonce}</div>
          {decisive.moi || decisive.eux ? (
            <div className={s.decisiveMeta}>
              {decisive.moi ? <b>Toi : {decisive.moi}</b> : null}
              {decisive.moi && decisive.eux ? " · " : null}
              {decisive.eux && eux ? `${eux.nom} : ${decisive.eux}` : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------

/** Une copie : une touche d'encre par bonne réponse, un trait rouge par erreur. */
function Marques({
  row,
  marques,
  decisive,
  refs,
}: {
  row: "moi" | "eux";
  marques: MarqueCopie[];
  decisive: number | null;
  refs?: { rond: (el: SVGElement | null) => void; excl: (el: SVGElement | null) => void };
}) {
  const W = marques.length * 10;
  return (
    <svg className={s.marques} viewBox={`0 -14 ${W} 30`} data-row={row} aria-label={`${marques.filter(Boolean).length} bonnes réponses sur ${marques.length}`} role="img">
      {marques.map((m, i) => {
        const x = i * 10 + 5;
        const tilt = ((i * 37) % 9) - 4;
        return (
          <g key={i} data-i={i}>
            {m === true ? (
              <ellipse className={s.ok} cx={x} cy={8} rx={3.5 + ((i * 13) % 3) * 0.15} ry={3.05} transform={`rotate(${tilt * 6} ${x} 8)`} />
            ) : m === false ? (
              <path className={s.ko} d={`M${x - 3.4} ${11.6} L${x + 3.4} ${4.4}`} strokeWidth={1.9} strokeLinecap="round" fill="none" />
            ) : (
              <circle className={s.vide} cx={x} cy={8} r={1.2} />
            )}
          </g>
        );
      })}
      {decisive !== null && refs ? (
        <>
          <ellipse ref={refs.rond} className={s.decisiveRond} cx={decisive * 10 + 5} cy={8} rx={7.4} ry={6.6} fill="none" strokeWidth={1.3} pathLength={100} strokeDasharray="100 100" transform={`rotate(-14 ${decisive * 10 + 5} 8)`} />
          <text ref={refs.excl} className={s.excl} x={decisive * 10 + 8} y={-2} fontSize={15}>
            !!
          </text>
        </>
      ) : null}
    </svg>
  );
}

// éclaboussures autour du début du mot (victoire), déterministes
const GOUTTES = (() => {
  let seed = 9;
  const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  // projetées sous la tête de la bande, vers le bas et l'arrière (là où la page est vide)
  return Array.from({ length: 15 }, (_, i) => {
    const a = Math.PI * (0.48 + r() * 0.5);
    const d = 18 + r() * (i % 3 ? 52 : 92);
    return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8, r: i % 4 === 0 ? 3.4 + r() * 2.4 : 1.1 + r() * 2.2, dx: Math.cos(a) * 22, dy: Math.sin(a) * 16 };
  });
})();

function Bande({
  issue,
  mot,
  cls,
  refs,
}: {
  issue: IssueDuel;
  mot: string;
  cls: string;
  refs: { bande: (el: HTMLElement | null) => void; axe: (el: SVGPathElement | null) => void; mot: (el: HTMLElement | null) => void };
}) {
  const id = "kbv" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <div ref={refs.bande} className={`${s.bande} ${cls}`} aria-hidden>
      <svg viewBox="0 0 400 64" preserveAspectRatio="none">
        <defs>
          <mask id={id} maskUnits="userSpaceOnUse" x={-20} y={-40} width={440} height={144}>
            <path ref={refs.axe} d="M0 32 L400 32" fill="none" stroke="#fff" strokeWidth={110} pathLength={100} strokeDasharray="100 100" />
          </mask>
        </defs>
        <use href={INK.swash} fill="currentColor" mask={`url(#${id})`} filter={issue === "victoire" ? "url(#rl-ink)" : undefined} />
      </svg>
      <div ref={refs.mot} className={s.mot}>
        <span>{mot}</span>
      </div>
      {issue === "victoire" ? (
        <svg className={`${s.gouttes} rl-deco`} style={{ left: "11%", top: "80%" }} aria-hidden>
          {GOUTTES.map((g, i) => (
            <circle key={i} data-goutte="" data-dx={g.dx.toFixed(1)} data-dy={g.dy.toFixed(1)} cx={g.x.toFixed(1)} cy={g.y.toFixed(1)} r={g.r.toFixed(1)} />
          ))}
        </svg>
      ) : null}
    </div>
  );
}

function Enjeu({
  enjeu,
  enj,
  refs,
}: {
  enjeu: { avant: number; apres: number };
  enj: { a: ReturnType<typeof progression>; b: ReturnType<typeof progression>; palierChange: boolean; delta: number };
  refs: Record<"elo" | "delta" | "neuf" | "vieux" | "perdu", (el: HTMLElement | SVGElement | null) => void>;
}) {
  const { a, b, palierChange, delta } = enj;
  const u = "kbe" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const r = b.r;
  const p0 = palierChange ? 0 : a.p;
  const p1 = b.p;
  const gain = p1 >= p0;
  const sous =
    r.next && r.pointsToNext !== null
      ? pointsAvant(r.pointsToNext, r.next.name)
      : r.lockedBy
        ? `${r.lockedBy.name} demande ${r.lockedBy.lock} % de maîtrise`
        : SOMMET;
  return (
    <div className={s.enjeu}>
      <div className={s.anneau}>
        <svg viewBox="-12 -12 264 264" aria-hidden>
          <defs>
            <mask id={`${u}o`} maskUnits="userSpaceOnUse" x={-20} y={-20} width={280} height={280}>
              <path d={RING_FULL_AXIS} fill="none" stroke="#fff" strokeWidth={50} pathLength={100} strokeDasharray={`${Math.min(p0, p1)} 200`} />
            </mask>
            <mask id={`${u}n`} maskUnits="userSpaceOnUse" x={-20} y={-20} width={280} height={280}>
              <path
                ref={refs.neuf}
                d={RING_FULL_AXIS}
                fill="none"
                stroke="#fff"
                strokeWidth={50}
                pathLength={100}
                strokeDasharray={gain ? `0 ${p0} ${p1 - p0} 200` : `0 ${p0} 0 200`}
              />
            </mask>
            <mask id={`${u}l`} maskUnits="userSpaceOnUse" x={-20} y={-20} width={280} height={280}>
              <path d={RING_FULL_AXIS} fill="none" stroke="#fff" strokeWidth={50} pathLength={100} strokeDasharray={gain ? "0 200" : `0 ${p1} ${p0 - p1} 200`} />
            </mask>
          </defs>
          <use href={INK.logoTrack} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={9} strokeLinejoin="round" />
          <g ref={refs.vieux}>
            <use href={INK.ring} fill="currentColor" mask={`url(#${u}o)`} />
          </g>
          <use href={INK.ring} fill="currentColor" mask={`url(#${u}n)`} />
          <g ref={refs.perdu} opacity={0}>
            <use href={INK.ring} fill="currentColor" mask={`url(#${u}l)`} />
          </g>
        </svg>
        <RankBadge tier={r.tierIndex} size={58} division={r.division} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className={s.label}>Ton ELO</div>
        <div className={s.eloRow}>
          <span ref={refs.elo} className={s.elo}>
            {elo(enjeu.apres)}
          </span>
          <span ref={refs.delta} className={s.delta}>
            <svg viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden>
              <use href={INK.swash} fill="currentColor" />
            </svg>
            {signe(delta)}
          </span>
        </div>
        <div className={s.sousElo}>
          <b>
            {TIERS[r.tierIndex].name}
            {r.division ? ` ${r.division}` : ""}
          </b>
          {" · "}
          {sous}
        </div>
      </div>
    </div>
  );
}

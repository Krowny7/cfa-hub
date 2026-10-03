"use client";

// La cérémonie de rang (moment 4) : l'encre devient métal. C'est la seule
// rencontre de l'encre (le travail) et du métal (la récompense) sur le site.
//
//   <RankCeremony variante="montee" elo={1400} eloAvant={1392} maitrise={54} onFermer={…} />
//
// variante
//   "montee"     nouveau palier : plein écran, environ 4,5 s, passable dès 1 s.
//                La goutte du film tombe, éclabousse, l'encre se rassemble en
//                hexagone, le pinceau trace l'anneau (la maîtrise), le badge sort
//                de la tache, le nom s'écrit, puis « Le prochain bout ».
//   "placement"  fin du placement (5/5) : la même, un peu plus longue,
//                « Ta place : Or III. »
//   "division"   en ligne : un tampon sur le panneau du rang, 1,5 s
//   "descente"   jamais de cérémonie : une ligne calme
//   "verrou"     en ligne : l'anneau se trace jusqu'à la maîtrise et s'arrête
//                avant le verrou ; « L'ELO ne suffit plus : il faut savoir. »
//
// Props
//   elo, eloAvant      ELO après (et avant) ; maitrise (0–100) ; place au classement
//   joueurs            nombre de joueurs du classement (« 4e sur 42 »)
//   domaine            « Finance » par défaut
//   onFermer           « Continuer » (plein écran)    onPartager   affiche « Partager »
//   cle                identifiant du moment : une seule cérémonie par session ;
//                      au-delà, l'écran final s'affiche sans séquence (force : ignorer)
//   son                "ceremonie" (défaut) ou false
// Mouvement réduit : badge et nom posés, sans goutte. Échap : passer, puis fermer.

import { useEffect, useId, useRef, useState } from "react";
import { INTRO_GUIDE, RING_FULL_AXIS } from "@/components/ink/paths";
import { INK } from "@/components/ui/InkDefs";
import { RankBadge } from "@/components/ui/RankBadge";
import { rankFor, TIERS, type RankInfo } from "@/lib/ranks";
import { descente, finPlacement, montee, monteeDivision, pct, pluriel, prochainBout, SOMMET, verrou } from "@/lib/voice";
import { BLOT, BLOT_SPIKES, HEX_POOL } from "./paths-moments";
import { SceauDivision } from "./Sceau";
import { vibrer, type SonMoment } from "./sound";
import { EASE_FALL, EASE_INK, EASE_OUT, STAMP_KF, usePartition, type Partition } from "./sound-timeline";
import { PanneauRang } from "./RankCeremonyPanneau";
import s from "./RankCeremony.module.css";

export type VarianteRang = "montee" | "placement" | "division" | "descente" | "verrou";

const SESSION_KEY = "rl-ceremonie";

/** Point de l'anneau (hexagone du logo, pointe en haut, sens horaire) à la fraction t. */
function hexPoint(t: number, R = 92) {
  const u = ((t % 1) + 1) % 1;
  const k = Math.floor(u * 6);
  const f = u * 6 - k;
  const a0 = ((-90 + 60 * k) * Math.PI) / 180;
  const a1 = ((-90 + 60 * (k + 1)) * Math.PI) / 180;
  return { x: 120 + R * (Math.cos(a0) * (1 - f) + Math.cos(a1) * f), y: 120 + R * (Math.sin(a0) * (1 - f) + Math.sin(a1) * f) };
}

/** Le prochain bout : palier suivant, points, maîtrise demandée. */
function boutSuivant(r: RankInfo, maitrise: number | null) {
  if (!r.next) return null;
  const pts = r.pointsToNext ?? 0;
  const lock = r.next.lock;
  const titre = `${r.next.name} · ${pluriel(pts, "point", "points")}`;
  const sous = lock ? `et ${pct(lock)} de maîtrise${maitrise !== null ? ` : tu es à ${pct(maitrise)}` : ""}` : null;
  return { nom: r.next.name, titre, sous };
}

// couronne d'éclaboussures (déterministe), en unités du repère 0..240
const COURONNE = (() => {
  let seed = 23;
  const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 16 }, () => {
    const a = r() * Math.PI * 2;
    const d = 46 + r() * 70;
    return { x: 120 + Math.cos(a) * d, y: 120 + Math.sin(a) * d * 0.86, r: 1.2 + r() * 3.4 };
  });
})();

export function RankCeremony({
  variante,
  elo,
  eloAvant,
  maitrise = null,
  place = null,
  joueurs = null,
  domaine = "Finance",
  onFermer,
  onPartager,
  cle,
  force = false,
  son = "ceremonie",
  figerA = null,
  className = "",
}: {
  variante: VarianteRang;
  elo: number;
  eloAvant?: number | null;
  maitrise?: number | null;
  place?: number | null;
  joueurs?: number | null;
  domaine?: string;
  onFermer?: () => void;
  onPartager?: () => void;
  cle?: string;
  force?: boolean;
  son?: SonMoment | false;
  /** aperçus : arrêt sur image à t secondes */
  figerA?: number | null;
  className?: string;
}) {
  const r = rankFor(elo, maitrise, place);
  const rang = `${r.tier.name}${r.division ? ` ${r.division}` : ""}`;
  if (variante === "descente") {
    const avant = eloAvant != null ? rankFor(eloAvant, maitrise, place) : null;
    const points = avant && avant.tierIndex > r.tierIndex ? Math.max(0, TIERS[avant.tierIndex].min - elo) : null;
    const d = descente(rang, points);
    return (
      <p className={`${s.calme} ${className}`}>
        <RankBadge tier={r.tierIndex} size={30} division={r.division} />
        <span>
          <b>{d.titre}</b> {d.phrase}
        </span>
      </p>
    );
  }
  if (variante === "division") return <Division r={r} elo={elo} maitrise={maitrise} place={place} domaine={domaine} son={son} figerA={figerA} className={className} />;
  if (variante === "verrou") return <Verrou r={r} maitrise={maitrise} son={son} figerA={figerA} className={className} />;
  return (
    <Ceremonie
      variante={variante}
      r={r}
      elo={elo}
      maitrise={maitrise}
      place={place}
      joueurs={joueurs}
      domaine={domaine}
      onFermer={onFermer}
      onPartager={onPartager}
      cle={cle}
      force={force}
      son={son}
      figerA={figerA}
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// Plein écran : montée de palier, fin du placement

function Ceremonie({
  variante,
  r,
  elo,
  maitrise,
  place,
  joueurs,
  domaine,
  onFermer,
  onPartager,
  cle,
  force,
  son,
  figerA,
  className,
}: {
  variante: "montee" | "placement";
  r: RankInfo;
  elo: number;
  maitrise: number | null;
  place: number | null;
  joueurs: number | null;
  domaine: string;
  onFermer?: () => void;
  onPartager?: () => void;
  cle?: string;
  force: boolean;
  son: SonMoment | false;
  figerA: number | null;
  className: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const R = useRef<Record<string, Element | null>>({});
  const ref = (k: string) => (el: Element | null) => {
    R.current[k] = el;
  };
  const stage = useRef<HTMLDivElement | null>(null);
  const continuer = useRef<HTMLButtonElement | null>(null);
  const [joue, setJoue] = useState<boolean | null>(null);
  const [fini, setFini] = useState(false);

  // une cérémonie par session : au-delà, l'écran final, sans séquence
  useEffect(() => {
    let deja = false;
    try {
      const k = sessionStorage.getItem(SESSION_KEY);
      deja = !!k && k !== (cle ?? "?");
      if (!deja) sessionStorage.setItem(SESSION_KEY, cle ?? "?");
    } catch {
      // stockage bloqué : on joue
    }
    setJoue(force || figerA !== null || !deja);
  }, [cle, force, figerA]);

  // page figée derrière, focus dans la cérémonie
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, []);
  useEffect(() => {
    if (joue === false || fini) continuer.current?.focus({ preventScroll: true });
  }, [joue, fini]);

  const m = maitrise ?? null;
  // l'anneau dit la maîtrise (comme le halo du badge) ; sans maîtrise connue, la forme du logo
  const trace = Math.max(6, Math.min(92, m ?? 74.5));
  const bout = boutSuivant(r, m);
  const titre = variante === "placement" ? finPlacement(`${r.tier.name}${r.division ? ` ${r.division}` : ""}`) : montee({ palier: r.tier.name, suivant: r.next?.name, points: r.pointsToNext, maitriseRequise: r.next?.lock ?? null });
  const k = variante === "placement" ? 1.1 : 1;
  const coteAt = hexPoint((trace / 100 + 1) / 2);
  const coteOut = { x: coteAt.x + (coteAt.x - 120) * 0.36, y: coteAt.y + (coteAt.y - 120) * 0.36 };
  const toPct = (v: number) => `${(((v + 12) / 264) * 100).toFixed(2)}%`;

  const build = (p: Partition) => {
    const nuit = document.documentElement.dataset.theme === "nuit";
    const cer = son ? { moment: son } : null;
    const T = (t: number) => t * k;
    p.anime(R.current.fond, [{ opacity: 0 }, { opacity: 1 }], 0, 0.3);
    p.anime(R.current.passer, [{ opacity: 0, visibility: "hidden" }, { opacity: 1, visibility: "visible" }], 1, 0.25);
    // lignes de construction au crayon
    p.anime(R.current.guide, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], T(0.05), T(0.8), EASE_INK);
    // la goutte tombe depuis le haut de l'écran
    const st = stage.current?.getBoundingClientRect();
    const chute = st ? st.top + st.height / 2 + 60 : 500;
    p.anime(
      R.current.goutte,
      [
        { opacity: 0, transform: `translateY(${-chute}px) scale(.8, 1.45)` },
        { opacity: 1, offset: 0.1 },
        { opacity: 1, transform: "translateY(-6px) scale(.92, 1.25)", offset: 0.94 },
        { opacity: 0, transform: "translateY(4px) scale(1.5, .45)" },
      ],
      T(0.25),
      T(0.57),
      EASE_FALL,
    );
    p.anime(R.current.ombre, [{ opacity: 0, transform: "scale(.25)" }, { opacity: 0.22, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.1)" }], T(0.3), T(0.56), "linear");
    const tImpact = T(0.82);
    if (cer) p.son(tImpact - 0.02, "goutte", { ...cer, variante: "grave" });
    p.appel(tImpact, (sil) => {
      if (!sil) vibrer(14);
    });
    p.anime(stage.current, [{ translate: "0 0" }, { translate: "2px -1px" }, { translate: "-2px 1px" }, { translate: "1px 0" }, { translate: "0 0" }], tImpact, 0.14, "linear");
    // l'impact : la tache, les éclats, la couronne
    // (fill « both » : la tache reste jusqu'au rassemblement ; à l'état final, elle n'est plus là)
    p.anime(R.current.tache, [{ opacity: 0, transform: "scale(.15)" }, { opacity: 1, transform: "scale(1.14)", offset: 0.45 }, { opacity: 1, transform: "scale(1)" }], tImpact, 0.4, EASE_OUT, "both");
    p.anime(R.current.eclats, [{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(1)", offset: 0.3 }, { opacity: 0, transform: "scale(1.2)" }], tImpact, 0.5, EASE_OUT);
    const drops = Array.from(R.current.couronne?.querySelectorAll<SVGCircleElement>("circle") ?? []);
    drops.forEach((c, i) => {
      const d = COURONNE[i];
      const dx = (120 - d.x).toFixed(1);
      const dy = (120 - d.y).toFixed(1);
      p.anime(c, [{ opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.3)` }, { opacity: 1, offset: 0.25 }, { opacity: 1, transform: "none" }], tImpact + (i % 4) * 0.012, 0.45, "cubic-bezier(.15,.85,.3,1)");
    });
    // l'encre se rassemble en hexagone
    const tRas = T(1.35);
    const fin = tRas + T(0.5);
    p.anime(R.current.couronne, [{ opacity: 1, transform: "scale(1)" }, { opacity: 1, transform: "scale(1)", offset: (tRas - tImpact) / (fin - tImpact) }, { opacity: 0, transform: "scale(.35)" }], tImpact, fin - tImpact, "linear");
    p.anime(R.current.tache, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.6)" }], tRas + 0.05, T(0.5), "cubic-bezier(.6,0,.4,1)", "forwards");
    p.anime(R.current.flaque, [{ opacity: 0, transform: "scale(.45) rotate(-8deg)" }, { opacity: 1, transform: "scale(1.04)", offset: 0.7 }, { opacity: 1, transform: "none" }], tRas, T(0.5), EASE_OUT, "both");
    // le pinceau trace l'anneau
    const tAnneau = T(1.75);
    p.anime(R.current.piste, [{ opacity: 0 }, { opacity: 1 }], tAnneau - 0.2, 0.3);
    p.anime(R.current.axe, [{ strokeDashoffset: trace }, { strokeDashoffset: 0 }], tAnneau, T(0.9), "cubic-bezier(.55,.05,.35,1)");
    if (cer) p.son(tAnneau, "trait", { ...cer, duree: T(0.9) });
    // le métal sort de la tache
    const tMetal = T(2.3);
    const ombreBadge = nuit ? "brightness(0) invert(.94)" : "brightness(0)";
    const normal = nuit ? "brightness(1) invert(0)" : "brightness(1)";
    p.anime(
      R.current.badge,
      [
        { opacity: 0, transform: "scale(.82)", filter: ombreBadge, maskImage: "radial-gradient(circle at 50% 54%, #000 58%, transparent 72%)", maskSize: "0% 0%", maskPosition: "50% 54%", maskRepeat: "no-repeat" },
        { opacity: 1, offset: 0.15 },
        { filter: ombreBadge, offset: 0.3 },
        { opacity: 1, transform: "scale(1)", filter: normal, maskImage: "radial-gradient(circle at 50% 54%, #000 58%, transparent 72%)", maskSize: "280% 280%", maskPosition: "50% 54%", maskRepeat: "no-repeat" },
      ],
      tMetal,
      T(0.85),
      "cubic-bezier(.3,.6,.3,1)",
    );
    p.anime(R.current.flaque, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.9)" }], tMetal + T(0.35), T(0.5), EASE_OUT, "forwards");
    // le nom s'écrit
    const tNom = T(3.05);
    p.anime(R.current.sur, [{ opacity: 0 }, { opacity: 1 }], tNom - 0.15, 0.35);
    p.anime(R.current.nom, [{ clipPath: "inset(-20% 100% -20% -6%)" }, { clipPath: "inset(-20% -6% -20% -6%)" }], tNom, T(0.5), "cubic-bezier(.5,0,.2,1)");
    if (cer) p.son(tNom, "trait", { ...cer, duree: 0.4, volume: 0.7 });
    p.anime(R.current.souligne, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], tNom + T(0.42), T(0.35), EASE_INK);
    p.anime(R.current.mono, [{ opacity: 0 }, { opacity: 1 }], tNom + T(0.4), 0.4);
    p.anime(R.current.phrase, [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], tNom + T(0.55), 0.4);
    if (cer) p.son(tNom + T(0.7), "note", cer);
    // le prochain bout, puis la suite
    const tBout = T(3.85);
    p.anime(R.current.manque, [{ opacity: 0 }, { opacity: 1 }], tBout - 0.1, 0.4);
    p.anime(R.current.cote, [{ opacity: 0, transform: "translateX(6px)" }, { opacity: 1, transform: "none" }], tBout, 0.35);
    p.anime(R.current.bout, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], tBout + 0.1, 0.4);
    p.anime(R.current.actions, [{ opacity: 0, visibility: "hidden" }, { opacity: 1, visibility: "visible" }], tBout + 0.3, 0.35);
    p.anime(R.current.passer, [{ opacity: 1, visibility: "visible" }, { opacity: 0, visibility: "hidden" }], tBout + 0.35, 0.2, EASE_OUT, "forwards");
  };

  const { passer } = usePartition(build, { actif: joue === true, figerA, cle: cle ?? "", onFin: () => setFini(true) });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (joue && !fini) passer();
      else onFermer?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [joue, fini, passer, onFermer]);

  const enCours = joue === true && !fini && figerA === null;
  const label = `${titre.titre} ${titre.phrase}`;
  return (
    <div className={`${s.overlay} ${className}`} role="dialog" aria-modal="true" aria-label={label} style={joue === null ? { opacity: 0 } : undefined} onClick={() => enCours && passer()}>
      <div ref={ref("fond")} className={s.fond} />
      {enCours ? (
        <button
          ref={ref("passer")}
          type="button"
          className={s.passer}
          onClick={(e) => {
            e.stopPropagation();
            passer();
          }}
        >
          Passer ›
        </button>
      ) : null}
      <div className={s.scene}>
        <div ref={stage} className={s.stage}>
          <svg className={`${s.construction} rl-deco`} viewBox="-12 -12 264 264" aria-hidden>
            <path ref={ref("guide")} d={INTRO_GUIDE} pathLength={100} strokeDasharray="100 100" fill="none" stroke="currentColor" strokeWidth={0.7} />
          </svg>
          <svg viewBox="-12 -12 264 264" aria-hidden>
            <defs>
              <mask id={`${uid}a`} maskUnits="userSpaceOnUse" x={-20} y={-20} width={280} height={280}>
                <path ref={ref("axe")} d={RING_FULL_AXIS} pathLength={100} fill="none" stroke="#fff" strokeWidth={50} strokeDasharray={`${trace} 200`} />
              </mask>
              <mask id={`${uid}g`} maskUnits="userSpaceOnUse" x={-20} y={-20} width={280} height={280}>
                <use href={INK.ringAxis} fill="none" stroke="#fff" strokeWidth={40} strokeDasharray={`0 ${trace + 2.5} ${Math.max(0, 97.5 - trace - 2.5)} 200`} />
              </mask>
            </defs>
            <g ref={ref("piste")}>
              <use href={INK.logoTrack} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={9} strokeLinejoin="round" />
              {/* le bout qui manque, coté en rouge */}
              <g ref={ref("manque")} mask={`url(#${uid}g)`}>
                <use href={INK.ringAxis} fill="none" stroke="var(--pen)" strokeWidth={1.6} strokeDasharray="1.4 1.6" />
              </g>
            </g>
            <path ref={ref("flaque")} className={s.flaque} d={HEX_POOL} fill="currentColor" filter="url(#rl-ink)" opacity={0} />
            <use href={INK.ring} fill="currentColor" mask={`url(#${uid}a)`} />
          </svg>
          <svg viewBox="-12 -12 264 264" aria-hidden className="rl-deco">
            <ellipse ref={ref("ombre")} className={s.ombre} cx={120} cy={128} rx={16} ry={4.5} fill="currentColor" opacity={0} />
            <g ref={ref("tache")} className={s.tache} opacity={0}>
              <path d={BLOT} fill="currentColor" filter="url(#rl-ink)" />
            </g>
            <path ref={ref("eclats")} className={s.eclats} d={BLOT_SPIKES} fill="currentColor" opacity={0} />
            <g ref={ref("couronne")} className={s.tache} opacity={0}>
              {COURONNE.map((d, i) => (
                <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={d.r.toFixed(1)} fill="currentColor" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
              ))}
            </g>
          </svg>
          <div ref={ref("badge")} className={s.badge}>
            <RankBadge tier={r.tierIndex} division={r.division} size={150} className="w-[clamp(110px,22vh,150px)]" />
          </div>
          {/* la goutte (HTML : elle tombe depuis le haut de l'écran) */}
          <div aria-hidden className="rl-deco" style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0 }}>
            <svg ref={ref("goutte")} className={s.goutte} width={30} height={30} viewBox="0 0 30 30" style={{ position: "absolute", left: -15, top: -27, opacity: 0, overflow: "visible" }}>
              <defs>
                <radialGradient id={`${uid}d`} cx="38%" cy="34%" r="70%">
                  <stop offset="0" stopColor="var(--ink)" />
                  <stop offset="1" stopColor="color-mix(in oklab, var(--ink) 74%, var(--paper))" />
                </radialGradient>
              </defs>
              <circle cx={15} cy={15} r={12} fill={`url(#${uid}d)`} />
              <ellipse className={s.gloss} cx={10.5} cy={9.5} rx={3.6} ry={2.4} transform="rotate(-30 10.5 9.5)" />
            </svg>
          </div>
          <span ref={ref("cote")} className={s.cote} style={{ left: toPct(coteOut.x), top: toPct(coteOut.y), translate: coteOut.x < 120 ? "-100% -50%" : "0 -50%" }}>
            {r.next ? r.next.name : "le sommet"}
          </span>
        </div>

        <div className={s.texte}>
          <div ref={ref("sur")} className={s.sur}>
            {domaine} · {variante === "placement" ? "ta place est trouvée" : "tu passes"}
          </div>
          <h2 ref={ref("nom")} className={`${s.nom} ${titre.titre.length > 12 ? s.nomLong : ""}`}>
            {titre.titre}
          </h2>
          <svg ref={ref("souligne")} className={s.souligne} viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden>
            <use href={INK.swash} fill="currentColor" />
          </svg>
          <div ref={ref("mono")} className={s.mono}>
            {Math.round(elo)} ELO{place ? ` · ${place}${place === 1 ? "er" : "e"}${joueurs ? ` sur ${joueurs}` : ""}` : ""}
          </div>
          <p ref={ref("phrase")} className={s.phrase}>
            {variante === "placement" ? titre.phrase : `${montee({ palier: r.tier.name }).phrase.split(". ")[0]}.`}
          </p>
        </div>

        <div ref={ref("bout")} className={s.bout}>
          {bout ? (
            <>
              <div className={s.boutK}>{prochainBout(bout.nom).split(" : ")[0]}</div>
              <div className={s.boutT}>{bout.titre}</div>
              {bout.sous ? <div className={s.boutS}>{bout.sous}</div> : null}
            </>
          ) : (
            <div className={s.boutT}>{SOMMET}</div>
          )}
        </div>

        <div ref={ref("actions")} className={s.actions} onClick={(e) => e.stopPropagation()}>
          {onPartager ? (
            <button type="button" className="btn btn-secondary" onClick={onPartager}>
              Partager
            </button>
          ) : null}
          <button ref={continuer} type="button" className="btn btn-primary" onClick={() => onFermer?.()}>
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Division : un tampon sur le panneau du rang (1,5 s)

function Division({
  r,
  elo,
  maitrise,
  place,
  domaine,
  son,
  figerA,
  className,
}: {
  r: RankInfo;
  elo: number;
  maitrise: number | null;
  place: number | null;
  domaine: string;
  son: SonMoment | false;
  figerA: number | null;
  className: string;
}) {
  const sceau = useRef<HTMLSpanElement | null>(null);
  const phrase = useRef<HTMLParagraphElement | null>(null);
  const d = monteeDivision(`${r.tier.name}${r.division ? ` ${r.division}` : ""}`);
  usePartition(
    (p) => {
      p.anime(sceau.current, STAMP_KF, 0.2, 0.42);
      if (son) p.son(0.38, "tampon", { moment: son });
      p.anime(phrase.current, [{ opacity: 0 }, { opacity: 1 }], 0.55, 0.5);
    },
    { figerA },
  );
  return (
    <div className={`${s.division} ${className}`}>
      <PanneauRang elo={elo} maitrise={maitrise} place={place} domaine={domaine} />
      {r.division ? (
        <span ref={sceau} className={s.sceauDiv}>
          <SceauDivision palier={r.tier.name} division={r.division} pose={false} son={false} taille={92} angle={8} />
        </span>
      ) : null}
      <p ref={phrase} className={s.calme}>
        <span>
          <b>{d.titre}</b> {d.phrase}
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verrou de maîtrise : l'anneau se trace jusqu'à la maîtrise et s'arrête

function Verrou({ r, maitrise, son, figerA, className }: { r: RankInfo; maitrise: number | null; son: SonMoment | false; figerA: number | null; className: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const axe = useRef<SVGPathElement | null>(null);
  const repere = useRef<SVGGElement | null>(null);
  const cible = r.lockedBy ?? (r.next?.lock ? r.next : null);
  const req = cible?.lock ?? 60;
  const m = Math.max(0, Math.min(100, maitrise ?? 0));
  const trace = Math.max(3, Math.min(req - 1.5, m));
  const v = verrou(cible?.name ?? "Le palier suivant", req, m);
  const at = hexPoint(req / 100);
  const out = { x: at.x + (at.x - 120) * 0.3, y: at.y + (at.y - 120) * 0.3 };
  usePartition(
    (p) => {
      p.anime(axe.current, [{ strokeDashoffset: trace }, { strokeDashoffset: trace * 0.06, offset: 0.86 }, { strokeDashoffset: 0 }], 0.1, 1.0, "cubic-bezier(.5,.05,.3,1)");
      if (son) p.son(0.1, "trait", { moment: son, duree: 0.85, volume: 0.7 });
      p.anime(repere.current, [{ opacity: 0 }, { opacity: 1 }], 1.0, 0.3);
    },
    { figerA },
  );
  return (
    <div className={`${s.verrou} ${className}`}>
      <div className={s.verrouAnneau}>
        <svg viewBox="-12 -12 264 264" aria-hidden>
          <defs>
            <mask id={`${uid}v`} maskUnits="userSpaceOnUse" x={-20} y={-20} width={280} height={280}>
              <path ref={axe} d={RING_FULL_AXIS} pathLength={100} fill="none" stroke="#fff" strokeWidth={50} strokeDasharray={`${trace} 200`} />
            </mask>
          </defs>
          <use href={INK.logoTrack} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={9} strokeLinejoin="round" />
          <use href={INK.ring} fill="currentColor" mask={`url(#${uid}v)`} />
          <g ref={repere}>
            <line x1={at.x + (at.x - 120) * -0.14} y1={at.y + (at.y - 120) * -0.14} x2={at.x + (at.x - 120) * 0.16} y2={at.y + (at.y - 120) * 0.16} stroke="var(--pen)" strokeWidth={3.2} strokeLinecap="round" />
            <text x={out.x} y={out.y + 4} textAnchor={out.x < 120 ? "end" : "start"} fill="var(--pen)" style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600 }} fontSize={21}>
              {req}
              {" %"}
            </text>
          </g>
        </svg>
        <RankBadge tier={r.tierIndex} division={r.division} size={76} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className={s.verrouT}>{v.titre}</div>
        <div className={s.verrouP}>
          <b>{v.phrase}</b>
        </div>
      </div>
    </div>
  );
}

// pour les intégrateurs : le palier franchi entre deux ELO (null si rien ne change)
export function changementDeRang(avant: number, apres: number, maitrise: number | null = null, place: number | null = null): VarianteRang | null {
  const a = rankFor(avant, maitrise, place);
  const b = rankFor(apres, maitrise, place);
  if (b.tierIndex > a.tierIndex) return "montee";
  if (b.tierIndex < a.tierIndex) return "descente";
  if (b.division !== a.division) {
    const order = ["III", "II", "I"];
    return order.indexOf(b.division ?? "") > order.indexOf(a.division ?? "") ? "division" : "descente";
  }
  if (b.lockedBy && !a.lockedBy) return "verrou";
  return null;
}


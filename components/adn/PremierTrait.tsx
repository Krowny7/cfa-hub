"use client";

// Le premier trait (moment 7) : à la première connexion, le joueur trace
// lui-même l'anneau du logo (au doigt, à la souris, ou en maintenant
// Espace), sur les lignes de construction du film. Le tracé s'arrête seul à
// 74 %, là où s'arrête le logo. Suivent la cote « J-212 » (la date d'examen,
// le bout à conquérir) et le sceau d'initiales.
//
//   <PremierTrait
//     nom={profil.username}                 // ou onNom pour le demander ici
//     examDate={profil.exam_date}           // ou onExamDate pour la choisir ici
//     onNom={(n) => …} onExamDate={(iso) => …}
//     onFini={() => router.push("/dashboard")}
//     fin={<Link className="btn btn-primary" href="/fiches/ethics">Ethics · Code et Standards · 9 min</Link>}
//   />
//
// Props
//   nom, onNom             le pseudo (sceau) ; onNom : champ « Ton nom sur le tableau »
//   examDate, onExamDate   date ISO ; onExamDate : les quatre prochaines sessions
//                          (sessions : pour fournir les vraies dates)
//   fin                    la seule action de la fin (sinon « Commencer » → onFini)
//   onFini                 à la fin, ou sur « Commencer »
//   etape                  pour les aperçus : "trait" | "date" | "sceau" | "fin"
//   son                    "ceremonie" (défaut) ou false
// Mouvement réduit : un bouton « Tracer » à la place du geste.
//
//   <PremierTraitRetour reprise="Market Efficiency, page 3" action={<Link…>Reprendre · 5 questions</Link>} />
//   la variante « retour » (3 jours sans venir), en texte simple.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { INTRO_GUIDE, LOGO_AXIS } from "@/components/ink/paths";
import { INK } from "@/components/ui/InkDefs";
import { jourJ, retour as phraseRetour, SIGNATURE } from "@/lib/voice";
import { SceauPerso } from "./SceauPerso";
import { jouerSon, pinceauTenu, vibrer, type SonMoment } from "./sound";
import { EASE_OUT, STAMP_KF, mouvementReduit } from "./sound-timeline";
import s from "./PremierTrait.module.css";

type Etape = "trait" | "date" | "sceau" | "fin";
type Session = { label: string; date: string };

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Les quatre prochaines sessions du niveau I (février, mai, août, novembre), au milieu du mois. */
export function prochainesSessions(depuis = new Date(), n = 4): Session[] {
  const out: Session[] = [];
  const d = new Date(depuis.getFullYear(), depuis.getMonth() + 1, 1);
  while (out.length < n) {
    if ([1, 4, 7, 10].includes(d.getMonth())) {
      const jour = new Date(d.getFullYear(), d.getMonth(), 15);
      out.push({ label: `${MOIS[d.getMonth()][0].toUpperCase()}${MOIS[d.getMonth()].slice(1)} ${d.getFullYear()}`, date: iso(jour) });
    }
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

const joursAvant = (date: string | null | undefined) => {
  if (!date) return null;
  const t = new Date(date + (date.length === 10 ? "T12:00:00" : "")).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86400000);
};

/** Point de l'hexagone du logo (pointe en haut, sens horaire) à la fraction t de l'anneau. */
function hexPoint(t: number, R = 92) {
  const u = ((t % 1) + 1) % 1;
  const k = Math.floor(u * 6);
  const f = u * 6 - k;
  const a0 = ((-90 + 60 * k) * Math.PI) / 180;
  const a1 = ((-90 + 60 * (k + 1)) * Math.PI) / 180;
  return { x: 120 + R * (Math.cos(a0) * (1 - f) + Math.cos(a1) * f), y: 120 + R * (Math.sin(a0) * (1 - f) + Math.sin(a1) * f) };
}
const LOGO = 0.745;

export function PremierTrait({
  nom = null,
  examDate = null,
  onNom,
  onExamDate,
  sessions,
  fin,
  onFini,
  etape: etapeForcee,
  son = "ceremonie",
  className = "",
}: {
  nom?: string | null;
  examDate?: string | null;
  onNom?: (nom: string) => void;
  onExamDate?: (date: string) => void;
  sessions?: Session[];
  fin?: React.ReactNode;
  onFini?: () => void;
  etape?: Etape;
  son?: SonMoment | false;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [etape, setEtape] = useState<Etape>(etapeForcee ?? "trait");
  const [fait, setFait] = useState(etapeForcee !== undefined && etapeForcee !== "trait");
  const [date, setDate] = useState<string | null>(examDate);
  const [pseudo, setPseudo] = useState(nom ?? "");
  const [pose, setPose] = useState(etapeForcee === "fin");
  const [reduit, setReduit] = useState(false);
  const liste = useMemo(() => sessions ?? prochainesSessions(), [sessions]);

  useEffect(() => setReduit(mouvementReduit()), []);
  useEffect(() => {
    if (etapeForcee) setEtape(etapeForcee);
  }, [etapeForcee]);

  // ---------- le geste ----------
  const stage = useRef<HTMLDivElement | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const axe = useRef<SVGPathElement | null>(null);
  const tete = useRef<SVGCircleElement | null>(null);
  const finTrait = useRef<SVGGElement | null>(null);
  const contenu = useRef<HTMLDivElement | null>(null);
  const prog = useRef(etapeForcee && etapeForcee !== "trait" ? 1 : 0);
  const drag = useRef<{ angle: number; last: number; still: number } | null>(null);
  const espace = useRef(false);
  const raf = useRef(0);
  const brosse = useRef<ReturnType<typeof pinceauTenu>>(null);
  const vitesse = useRef(0);

  const dessine = useCallback(() => {
    const p = Math.max(0, Math.min(1, prog.current));
    if (axe.current) axe.current.style.strokeDashoffset = String(100 - p * 100);
    const a = axe.current;
    if (a && tete.current) {
      try {
        const pt = a.getPointAtLength(a.getTotalLength() * Math.max(0.002, p));
        tete.current.setAttribute("cx", pt.x.toFixed(1));
        tete.current.setAttribute("cy", pt.y.toFixed(1));
      } catch {
        // tracé pas encore mesurable
      }
    }
  }, []);

  const termine = useCallback(() => {
    if (fait) return;
    prog.current = 1;
    dessine();
    setFait(true);
    brosse.current?.stop();
    brosse.current = null;
    vibrer(16);
    if (son) jouerSon("goutte", { moment: son });
    if (!mouvementReduit()) finTrait.current?.animate([{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 380, easing: EASE_OUT, fill: "backwards" });
    window.setTimeout(() => setEtape((e) => (e === "trait" ? "date" : e)), mouvementReduit() ? 300 : 900);
  }, [dessine, fait, son]);

  const avance = useCallback(
    (dp: number) => {
      if (fait || dp <= 0) return;
      prog.current = Math.min(1, prog.current + dp);
      vitesse.current = Math.min(1, vitesse.current * 0.6 + dp * 40);
      if (son && !brosse.current) brosse.current = pinceauTenu(son);
      brosse.current?.vitesse(vitesse.current);
      dessine();
      if (prog.current >= 1) termine();
    },
    [dessine, fait, son, termine],
  );

  // boucle : maintien sans bouger (doigt posé, ou Espace) → le pinceau avance seul
  useEffect(() => {
    if (etape !== "trait" || fait) return;
    let t0 = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - t0) / 1000);
      t0 = t;
      const d = drag.current;
      if (espace.current) avance(dt * 0.62);
      else if (d && t - d.still > 220) avance(dt * 0.4);
      else {
        vitesse.current *= 0.86;
        brosse.current?.vitesse(vitesse.current);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [etape, fait, avance]);

  useEffect(() => () => brosse.current?.stop(), []);

  useEffect(() => {
    dessine();
  }, [dessine, etape]);

  const angleDe = (e: React.PointerEvent) => {
    const el = svg.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    // angle depuis le haut, dans le sens horaire (0 à 360)
    return ((Math.atan2(pt.y - 120, pt.x - 120) * 180) / Math.PI + 90 + 360) % 360;
  };
  const onDown = (e: React.PointerEvent) => {
    if (etape !== "trait" || fait) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const a = angleDe(e);
    drag.current = { angle: a ?? 0, last: performance.now(), still: performance.now() };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const a = angleDe(e);
    if (a === null) return;
    let da = a - d.angle;
    if (da > 180) da -= 360;
    if (da < -180) da += 360;
    d.angle = a;
    if (Math.abs(da) > 0.4) d.still = performance.now();
    // seulement vers l'avant (sens horaire), et sans saut
    if (da > 0 && da < 70) avance(da / (360 * LOGO));
  };
  const onUp = () => {
    drag.current = null;
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      espace.current = e.type === "keydown";
    }
  };
  const tracerPourMoi = () => {
    if (fait) return;
    if (mouvementReduit()) return termine();
    const t0 = performance.now();
    const start = prog.current;
    const step = (t: number) => {
      const u = Math.min(1, (t - t0) / 1300);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const target = start + (1 - start) * e;
      avance(target - prog.current);
      if (u < 1 && prog.current < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // changement d'étape : le contenu se pose en fondu
  useEffect(() => {
    if (!contenu.current || mouvementReduit()) return;
    const a = contenu.current.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 340, easing: EASE_OUT });
    return () => a.cancel();
  }, [etape]);

  // ---------- la suite ----------
  const choisirDate = (d: string) => {
    setDate(d);
    onExamDate?.(d);
  };
  const jours = joursAvant(date);
  const cote = jourJ(jours);
  const sceauBox = useRef<HTMLSpanElement | null>(null);
  const poser = () => {
    if (onNom && pseudo.trim()) onNom(pseudo.trim());
    setPose(true);
    if (!mouvementReduit()) sceauBox.current?.animate(STAMP_KF, { duration: 420, easing: EASE_OUT, fill: "backwards" });
    if (son) jouerSon("tampon", { moment: son, dans: 0.17 });
    window.setTimeout(() => setEtape("fin"), mouvementReduit() ? 200 : 1100);
  };

  // cote de l'ouverture : de la fin du pinceau (74,5 %) au départ (le haut)
  const gapMid = hexPoint((LOGO + 1) / 2);
  const coteOut = { x: gapMid.x + (gapMid.x - 120) * 0.42, y: gapMid.y + (gapMid.y - 120) * 0.42 };
  const repere = (t: number) => {
    const p = hexPoint(t);
    const k = (r: number) => ({ x: 120 + (p.x - 120) * r, y: 120 + (p.y - 120) * r });
    const a = k(0.86);
    const b = k(1.16);
    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  };
  const toPct = (v: number) => `${(((v + 50) / 340) * 100).toFixed(2)}%`;

  const montrerAnneau = etape === "trait" || etape === "date";
  return (
    <div className={`${s.root} ${className}`}>
      <div ref={contenu} style={{ display: "contents" }}>
        <h2 className={s.titre}>
          {etape === "trait" ? (
            <>
              Avant tout,
              <br />
              ton premier trait.
            </>
          ) : etape === "date" ? (
            <>
              Quand passes-tu
              <br />
              l&apos;examen ?
            </>
          ) : etape === "sceau" ? (
            <>
              Ton nom
              <br />
              sur le tableau.
            </>
          ) : (
            SIGNATURE
          )}
        </h2>
      </div>

      {montrerAnneau ? (
        <div
          ref={stage}
          className={`${s.stage} ${fait ? s.trace : ""}`}
          role={etape === "trait" ? "button" : undefined}
          tabIndex={etape === "trait" && !fait ? 0 : -1}
          aria-label={etape === "trait" ? "Trace ton premier trait : garde le doigt appuyé et tourne, ou maintiens la barre d'espace" : undefined}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
          onKeyUp={onKey}
          onBlur={() => (espace.current = false)}
        >
          <svg ref={svg} viewBox="-50 -50 340 340" aria-hidden>
            <defs>
              <mask id={`${uid}m`} maskUnits="userSpaceOnUse" x={-40} y={-40} width={320} height={320}>
                <path ref={axe} d={LOGO_AXIS} pathLength={100} fill="none" stroke="#fff" strokeWidth={60} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="100 120" strokeDashoffset={100} />
              </mask>
              {etape === "date" ? (
                <mask id={`${uid}g`} maskUnits="userSpaceOnUse" x={-40} y={-40} width={320} height={320}>
                  <use href={INK.ringAxis} fill="none" stroke="#fff" strokeWidth={40} strokeDasharray={`0 ${LOGO * 100 + 2} ${100 - LOGO * 100 - 3} 200`} />
                </mask>
              ) : null}
            </defs>
            {etape === "trait" ? (
              <g className={`${s.guide} rl-deco`}>
                <path d={INTRO_GUIDE} fill="none" stroke="currentColor" strokeWidth={0.8} />
              </g>
            ) : null}
            <use href={INK.logoTrack} fill="none" stroke="currentColor" strokeOpacity={0.13} strokeWidth={9} strokeLinejoin="round" />
            <use href={INK.logoBrush} fill="currentColor" mask={`url(#${uid}m)`} />
            <g ref={finTrait} style={{ opacity: fait ? 1 : 0 }}>
              <use href={INK.logoBristles} fill="currentColor" />
              <use href={INK.logoSplat} fill="currentColor" />
            </g>
            {etape === "trait" && !fait ? <circle ref={tete} className={s.tete} r={20} fill="currentColor" cx={120} cy={28} /> : null}
            {etape === "date" ? (
              <g stroke="var(--pen)" fill="none" strokeLinecap="round">
                <g mask={`url(#${uid}g)`}>
                  <use href={INK.ringAxis} strokeWidth={1.8} strokeDasharray="1.2 1.5" />
                </g>
                <path d={repere(LOGO + 0.004)} strokeWidth={1.6} />
                <path d={repere(0.999)} strokeWidth={1.6} />
              </g>
            ) : null}
          </svg>
          {etape === "date" && cote ? (
            <span className={s.cote} style={{ left: toPct(coteOut.x), top: toPct(coteOut.y) }}>
              {cote}
            </span>
          ) : null}
        </div>
      ) : null}

      {etape === "trait" ? (
        <div className={s.aide}>
          {reduit ? (
            <button type="button" className="btn btn-primary" onClick={tracerPourMoi}>
              Tracer
            </button>
          ) : (
            <>
              <div className={s.aideT}>Garde le doigt appuyé et tourne.</div>
              <div className={s.aideS}>ou maintiens la barre d&apos;espace</div>
              <div>
                <button type="button" className={s.lien} onClick={tracerPourMoi}>
                  Tracer d&apos;un geste
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {etape === "date" ? (
        <>
          <p className={s.texte}>Ce bout ouvert, c&apos;est la distance jusqu&apos;à ton examen. Il se referme un peu chaque semaine… sans jamais se fermer.</p>
          {onExamDate ? (
            <div className={s.sessions} role="radiogroup" aria-label="Session d'examen">
              {liste.map((x) => (
                <button key={x.date} type="button" role="radio" aria-checked={date === x.date} className={`chip ${date === x.date ? "chip-active" : ""}`} onClick={() => choisirDate(x.date)}>
                  {x.label}
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" className={`btn btn-primary ${s.full}`} disabled={!!onExamDate && !date} onClick={() => setEtape("sceau")}>
            Continuer
          </button>
        </>
      ) : null}

      {etape === "sceau" || etape === "fin" ? (
        <>
          {etape === "sceau" && onNom ? (
            <label className={s.champ}>
              <input className="input" value={pseudo} maxLength={24} placeholder="Ton nom de joueur" onChange={(e) => setPseudo(e.target.value)} autoFocus />
              <div className={s.champS}>C&apos;est ce que verront tes adversaires.</div>
            </label>
          ) : null}
          <div className={s.sceau}>
            <span ref={sceauBox} style={{ display: "inline-block", opacity: pseudo.trim() || pose ? 1 : 0.18, transition: "opacity .2s" }}>
              <SceauPerso nom={pseudo || "?"} taille={128} />
            </span>
          </div>
          <p className={s.texte}>{etape === "fin" ? "Ton sceau remplace l'avatar dans le classement et les duels." : "Ton sceau : il remplace l'avatar dans le classement et les duels."}</p>
          {etape === "sceau" ? (
            <button type="button" className={`btn btn-primary ${s.full}`} disabled={!pseudo.trim() || pose} onClick={poser}>
              C&apos;est moi
            </button>
          ) : (
            fin ?? (
              <button type="button" className={`btn btn-primary ${s.full}`} onClick={() => onFini?.()}>
                Commencer
              </button>
            )
          )}
        </>
      ) : null}
    </div>
  );
}

/** La variante « retour » (3 jours sans venir) : du texte simple, une action. */
export function PremierTraitRetour({ reprise, action, className = "" }: { reprise?: string | null; action?: React.ReactNode; className?: string }) {
  const [titre, ...suite] = phraseRetour(reprise).split(". ");
  return (
    <div className={`${s.retour} ${className}`}>
      <div className={s.retourT}>{titre}.</div>
      <p className={s.retourS}>
        {suite.join(". ")}
        {reprise ? " Cinq questions pour te remettre en main." : ""}
      </p>
      {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
    </div>
  );
}

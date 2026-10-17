"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { INK } from "@/components/ui/InkDefs";
import { Feuille } from "@/components/ui/Feuille";
import { useEtatNav } from "@/components/nav/DevoileContext";
import { codexAutreIdee, codexChangerContrat, codexPanneau, codexSeanceBudget, codexVus } from "@/lib/codex/actions";
import { ligneVersees, panneauAcquitte, panneauDe, type Panneau, type QuetePanneau } from "@/lib/codex/panneau";
import { BUDGETS } from "@/lib/codex/reglage";
import { BONNE_CHANCE } from "@/lib/codex/calendrier";
import type { Budget } from "@/lib/codex/types";
import { CODEX } from "@/lib/voice-codex";
import { Sceau } from "@/components/codex/Sceau";
import { JaugePinceau } from "@/components/codex/JaugePinceau";
import s from "./Encre.module.css";

// Le sceau de la barre du haut : la boussole quotidienne du Codex (V3 §9.2).
//   trois arcs d'encre   un par contrat du jour, remplis à mesure ; à 3 sur 3
//                        l'anneau se ferme et un petit tampon s'y pose
//   « ! » doré           seulement pour ce qui est rare : un acte clos, une
//                        pièce gagnée (une fois le panneau ouvert, il se tait)
//   petit carnet         au calme (pas de « ! » gris, pas de pastille)
// Un clic ouvre « Tes quêtes » : quoi faire, en quatre lignes au plus
// (lib/codex/panneau.ts), chacune avec « Y aller » ; en pied, ce qui a été
// tamponné depuis la dernière fois (annoncé une fois, puis acquitté), le
// temps qu'on se donne (« J'ai 30 min ») et la semaine. Un popover ancré sur
// ordinateur, une feuille par le bas sur téléphone. Le panneau est relu à
// chaque ouverture (la barre reste montée d'une page à l'autre).
// `demo` : aperçus (aucune action serveur) ; `ouvert` : ouvert d'emblée.

type Annonce = { versees: NonNullable<Panneau["versees"]>; rare: Panneau["rare"] };

// identifiants fixes (un seul sceau par barre ; deux copies définiraient la même chose) : pas de useId, rien à désaccorder à l'hydratation
const uid = "rl-sceau-quetes-";

export function SceauQuetes({ initial, demo = false, ouvert: ouvertDepart = false }: { initial: Panneau; demo?: boolean; ouvert?: boolean }) {
  const { codex } = useEtatNav();
  const [panneau, setPanneau] = useState(initial);
  const [ouvert, setOuvert] = useState(ouvertDepart);
  const [annonce, setAnnonce] = useState<Annonce | null>(ouvertDepart && initial.versees ? { versees: initial.versees, rare: initial.rare } : null);
  const [etroit, setEtroit] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, demarrer] = useTransition();
  const bouton = useRef<HTMLButtonElement | null>(null);
  const boite = useRef<HTMLDivElement | null>(null);

  useEffect(() => setPanneau(initial), [initial]);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const suivre = () => setEtroit(mq.matches);
    suivre();
    mq.addEventListener("change", suivre);
    return () => mq.removeEventListener("change", suivre);
  }, []);

  const fermer = useCallback(() => {
    setOuvert(false);
    bouton.current?.focus();
  }, []);

  const ouvrir = () => {
    setOuvert(true);
    setMessage(null);
    // ce qui a été tamponné s'annonce une fois, à cette ouverture ; le « ! » doré se tait
    const deja = panneau.versees?.cles ?? [];
    setAnnonce(panneau.versees ? { versees: panneau.versees, rare: panneau.rare } : null);
    setPanneau(panneauAcquitte);
    if (demo) return;
    void codexPanneau().then(
      (p) => {
        if (p.disponible) {
          // relu avant l'acquittement : il contient au moins ce qu'on avait, et ce qui est tombé depuis
          if (p.versees) setAnnonce({ versees: p.versees, rare: p.rare });
          setPanneau(panneauAcquitte(p));
        }
        const cles = [...new Set([...deja, ...(p.versees?.cles ?? [])])];
        if (cles.length) void codexVus(cles);
      },
      () => {
        if (deja.length) void codexVus(deja);
      },
    );
  };

  // popover : Échap, clic à côté, focus dans le panneau
  useEffect(() => {
    if (!ouvert || etroit) return;
    boite.current?.querySelector<HTMLElement>("a, button")?.focus();
    const touche = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    const dehors = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!boite.current?.contains(t) && !bouton.current?.contains(t)) setOuvert(false);
    };
    window.addEventListener("keydown", touche);
    window.addEventListener("pointerdown", dehors);
    return () => {
      window.removeEventListener("keydown", touche);
      window.removeEventListener("pointerdown", dehors);
    };
  }, [ouvert, etroit, fermer]);

  if (!codex || !panneau.disponible) return null;

  const changerContrat = (q: QuetePanneau) =>
    demarrer(async () => {
      if (!q.emplacement) return;
      if (demo) {
        setMessage("Contrat changé (aperçu).");
        return;
      }
      const r = await codexChangerContrat(q.emplacement);
      if (r.ok) {
        setPanneau(panneauAcquitte(panneauDe(r.vue)));
        setMessage("Contrat changé. Le prochain changement, ce sera demain.");
      } else setMessage(r.raison === "refus" ? CODEX.contrats.changeDeja : "Pas d'autre contrat à te proposer pour l'instant.");
    });

  const autreIdee = (q: QuetePanneau) =>
    demarrer(async () => {
      if (demo) {
        setPanneau((p) => ({ ...p, quetes: p.quetes.filter((x) => x.cle !== q.cle) }));
        setMessage("Mise de côté jusqu'à demain (aperçu).");
        return;
      }
      const r = await codexAutreIdee(q.id);
      if (r.ok) {
        setPanneau(panneauAcquitte(r.panneau));
        setMessage(`« ${q.titre} » attendra demain.`);
      } else setMessage("Pas d'autre idée pour l'instant. Réessaie dans un instant.");
    });

  const choisirBudget = (b: Budget) =>
    demarrer(async () => {
      if (b === panneau.budget) return;
      if (demo) {
        setPanneau((p) => ({ ...p, budget: b }));
        return;
      }
      const r = await codexSeanceBudget(b);
      if (r.ok) setPanneau(panneauAcquitte(r.panneau));
      else setMessage("Le temps n'a pas pu être enregistré. Réessaie dans un instant.");
    });

  const { arcs, rare, revoir } = panneau;
  const ferme = arcs.total > 0 && arcs.faits >= arcs.total;
  const etat = rare ? "rare" : ferme ? "ferme" : "calme";
  const libelle = [
    "Tes quêtes",
    arcs.total > 0 ? `${arcs.faits} contrat${arcs.faits > 1 ? "s" : ""} du jour sur ${arcs.total}` : null,
    rare?.libelle ?? null,
    revoir && revoir.aujourdhui > 0 ? `${revoir.aujourdhui} à revoir` : null,
  ].filter(Boolean).join(" · ");
  const semaine = panneau.semaine;

  const contenu = (
    <>
      {!etroit && (
        <div className={s.panneauTete}>
          <h2 id={`${uid}titre`} className={`${s.panneauTitre} font-brand`}>
            Tes quêtes
          </h2>
          <span className="t-micro">{arcs.total > 0 ? `contrats du jour : ${arcs.faits}/${arcs.total}` : "aujourd'hui"}</span>
        </div>
      )}
      {panneau.jourJ ? (
        // le jour J (V3 §7.4) : rien à faire ici, seulement ceci
        <p className={s.replique} style={{ padding: "6px 6px 10px" }}>
          {BONNE_CHANCE.titre} {BONNE_CHANCE.texte}
        </p>
      ) : panneau.quetes.length === 0 ? (
        <p className={s.replique} style={{ padding: "6px 6px 10px" }}>
          {CODEX.prochaine.rien}
        </p>
      ) : (
        <ul className={s.liste}>
          {panneau.quetes.map((q) => (
            <Ligne key={q.cle} q={q} occupe={occupe} onChanger={changerContrat} onAutre={autreIdee} onAller={() => setOuvert(false)} />
          ))}
        </ul>
      )}
      {message && (
        <p role="status" className="t-small m-0 mt-2 px-1">
          {message}
        </p>
      )}
      {annonce && (
        <p className={`t-small ${s.versees}`}>
          <Check size={14} aria-hidden /> {[annonce.rare?.libelle, ligneVersees(annonce.versees)].filter(Boolean).join(" · ")}
        </p>
      )}
      <div className={s.pied}>
        {!panneau.jourJ && (
          <div className={s.budget} role="group" aria-label="Le temps que tu te donnes aujourd'hui">
            <span>J&apos;ai</span>
            {BUDGETS.map((b) => (
              <button key={b} type="button" aria-pressed={panneau.budget === b} disabled={occupe} onClick={() => choisirBudget(b)}>
                {b}
              </button>
            ))}
            <span>min</span>
          </div>
        )}
        {semaine.total > 0 && (
          <details className={s.semaine}>
            <summary>
              Semaine : {semaine.faits}/{semaine.total}
            </summary>
            <ul>
              {semaine.quetes.map((x) => (
                <li key={x.titre} data-faite={x.faite || undefined}>
                  {x.faite ? "✓ " : ""}
                  {x.titre}
                </li>
              ))}
            </ul>
          </details>
        )}
        <Link href="/codex" className={s.lienPlein} onClick={() => setOuvert(false)}>
          Voir le Codex complet →
        </Link>
      </div>
    </>
  );

  return (
    // data-jour-j : Léonard ne surgit pas le jour de l'examen (il lit cet attribut, V3 §7.4)
    <div className={s.ancre} data-jour-j={panneau.jourJ || undefined}>
      <button
        ref={bouton}
        type="button"
        className={s.bouton}
        data-etat={etat}
        data-leonard="sceau-quetes"
        aria-label={libelle}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-controls={ouvert && !etroit ? `${uid}panneau` : undefined}
        onClick={() => (ouvert ? fermer() : ouvrir())}
      >
        <SceauBarre arcs={arcs} rare={!!rare} />
      </button>
      {revoir && revoir.aujourdhui > 0 && (
        <span className={`t-micro ${s.sousSceau}`} aria-hidden>
          {revoir.aujourdhui} à revoir
        </span>
      )}
      {ouvert && !etroit && (
        <div ref={boite} id={`${uid}panneau`} role="dialog" aria-labelledby={`${uid}titre`} className={s.panneau}>
          {contenu}
        </div>
      )}
      {etroit && (
        <Feuille ouvert={ouvert} onFermer={fermer} titre="Tes quêtes">
          <div className={s.panneau} style={{ position: "static", width: "auto", boxShadow: "none", border: 0, padding: "4px 0 0", maxHeight: "none", animation: "none" }}>
            {contenu}
          </div>
        </Feuille>
      )}
    </div>
  );
}

/** Un arc de cercle (centre 60,60), en degrés, 0 en haut, dans le sens des aiguilles. */
function arc(r: number, debut: number, fin: number): string {
  const pt = (a: number) => {
    const t = ((a - 90) * Math.PI) / 180;
    return `${(60 + r * Math.cos(t)).toFixed(1)} ${(60 + r * Math.sin(t)).toFixed(1)}`;
  };
  return `M${pt(debut)} A${r} ${r} 0 ${fin - debut > 180 ? 1 : 0} 1 ${pt(fin)}`;
}

const R_ARCS = 53;
const ECART = 16;

/**
 * Le sceau lui-même : les arcs des contrats du jour autour ; au centre, le
 * « ! » doré tamponné (rare) ou le petit carnet ; à 3 sur 3, l'anneau fermé
 * et son tampon.
 */
function SceauBarre({ arcs, rare }: { arcs: Panneau["arcs"]; rare: boolean }) {
  const ferme = arcs.total > 0 && arcs.faits >= arcs.total;
  const part = arcs.total > 0 ? 360 / arcs.total : 0;
  return (
    <svg viewBox="0 0 120 120" aria-hidden>
      {ferme ? (
        <circle cx="60" cy="60" r={R_ARCS} className={`${s.arcPlein} ${s.anneauFerme}`} key="ferme" />
      ) : (
        Array.from({ length: arcs.total }, (_, i) => <path key={i} d={arc(R_ARCS, i * part + ECART / 2, (i + 1) * part - ECART / 2)} className={i < arcs.faits ? s.arcPlein : s.arcVide} />)
      )}
      {rare ? (
        <g key="rare" className={s.pose} style={{ transformOrigin: "60px 60px" }}>
          <g transform="translate(60 60) scale(0.7) translate(-60 -60)">
            <defs>
              <linearGradient id={`${uid}o`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" style={{ stopColor: "var(--c-or-clair)" }} />
                <stop offset=".5" style={{ stopColor: "var(--c-or)" }} />
                <stop offset="1" style={{ stopColor: "var(--c-or-fonce)" }} />
              </linearGradient>
              <linearGradient id={`${uid}r`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#fff" stopOpacity={0} />
                <stop offset=".5" stopColor="#fff" stopOpacity={0.65} />
                <stop offset="1" stopColor="#fff" stopOpacity={0} />
              </linearGradient>
              <clipPath id={`${uid}c`}>
                <use href={INK.sealHex} />
              </clipPath>
            </defs>
            <g filter="url(#rl-ink)">
              <use href={INK.sealHex} fill={`url(#${uid}o)`} />
              <use href={INK.sealHexIn} fill="none" stroke="#fff8e6" strokeWidth={2.6} opacity={0.75} />
              <text x="60" y="82" textAnchor="middle" className={s.signeReserve}>
                !
              </text>
            </g>
            <g clipPath={`url(#${uid}c)`}>
              <polygon className={`${s.reflet} rl-deco`} points="26,-10 50,-10 24,130 0,130" fill={`url(#${uid}r)`} />
            </g>
          </g>
        </g>
      ) : (
        <g className={s.carnetTrait}>
          <rect x="41" y="35" width="38" height="50" rx="5" />
          <path d="M50 35 V85 M57 50 H71 M57 60 H71 M57 70 H66" />
        </g>
      )}
      {ferme && (
        <g className={s.tamponMini} key="tampon">
          <circle cx="96" cy="96" r="16" className={s.tamponFond} />
          <path d="M88.5 96.5 L94 102 L104 90" className={s.reserveCoche} style={{ strokeWidth: 4.5 }} />
        </g>
      )}
    </svg>
  );
}

function Ligne({
  q,
  occupe,
  onChanger,
  onAutre,
  onAller,
}: {
  q: QuetePanneau;
  occupe: boolean;
  onChanger: (q: QuetePanneau) => void;
  onAutre: (q: QuetePanneau) => void;
  onAller: () => void;
}) {
  const principale = q.genre === "principale";
  const l = { etat: q.etat, fraction: q.fraction, affichage: "complet" as const, retro: false };
  const changer = !!q.emplacement && !!q.changeable;
  return (
    <li className={`${s.ligne} ${principale ? s.principale : ""}`}>
      <Sceau l={l} taille={principale ? 46 : 38} signe={principale && q.etat !== "terminee" ? "!" : undefined} />
      <span className="min-w-0">
        <span className={s.ligneSur}>
          {q.sur}
          {q.duree ? ` · ${CODEX.prochaine.minutes(q.duree)}` : ""}
        </span>
        <span className={s.ligneTitre}>{q.titre}</span>
        {q.raison && <span className={s.ligneSous}>{q.raison}</span>}
        {q.cible > 1 && <JaugePinceau fraction={q.fraction} or={q.etat === "active"} label={`${Math.floor(q.valeur)} sur ${Math.floor(q.cible)}`} />}
        {(principale || changer) && (
          <span className={s.gestes}>
            {principale && (
              <button type="button" className={`${s.lienDiscret} ${s.geste}`} disabled={occupe} onClick={() => onAutre(q)}>
                Une autre idée ?
              </button>
            )}
            {changer && (
              <button type="button" className={`${s.lienDiscret} ${s.geste}`} disabled={occupe} onClick={() => onChanger(q)} title={CODEX.contrats.changerAide}>
                Changer
              </button>
            )}
          </span>
        )}
      </span>
      <Link href={q.destination?.href ?? "/codex"} className={`btn ${principale ? "btn-primary" : "btn-secondary"} btn-sm rl-press ${s.action}`} onClick={onAller}>
        {q.destination ? q.destination.libelle : "Voir"}
        {principale && <ArrowRight size={15} aria-hidden />}
      </Link>
    </li>
  );
}

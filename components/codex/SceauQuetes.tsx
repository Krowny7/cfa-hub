"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { INK } from "@/components/ui/InkDefs";
import { Feuille } from "@/components/ui/Feuille";
import { useEtatNav } from "@/components/nav/DevoileContext";
import { codexChangerContrat, codexPanneau, codexReclamerPanneau } from "@/lib/codex/actions";
import { panneauDe, type Panneau, type QuetePanneau } from "@/lib/codex/panneau";
import { CODEX } from "@/lib/voice-codex";
import { Sceau } from "@/components/codex/Sceau";
import { JaugePinceau } from "@/components/codex/JaugePinceau";
import s from "./Encre.module.css";

// Le sceau « ! » de la barre du haut : le point d'entrée quotidien du Codex.
//   « ! » doré   une quête nouvelle est à prendre (le nombre en pastille) ;
//                une fois le panneau ouvert, il se tait jusqu'aux suivantes
//   « ? » doré   une récompense est à réclamer
//   sobre        tout est calme
// Un clic ouvre « Tes quêtes » (quatre au plus, lib/codex/panneau.ts) : un
// popover ancré sur ordinateur, une feuille par le bas sur téléphone. Le
// panneau est relu à chaque ouverture (la barre reste montée d'une page à
// l'autre). `demo` : aperçus (aucune action serveur) ; `ouvert` : ouvert
// d'emblée (aperçus).

const CLE_VUS = "rl:codex:vus";

function lireVus(jour: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_VUS) ?? "null") as { jour?: string; cles?: string[] } | null;
    return v && v.jour === jour && Array.isArray(v.cles) ? v.cles : [];
  } catch {
    return [];
  }
}
function ecrireVus(jour: string, cles: string[]) {
  try {
    localStorage.setItem(CLE_VUS, JSON.stringify({ jour, cles: cles.slice(-40) }));
  } catch {
    /* navigation privée : le « ! » reviendra, rien de grave */
  }
}

type Etat = "nouveau" | "rendre" | "calme";

// identifiants fixes (un seul sceau par barre ; deux copies définiraient la même chose) : pas de useId, rien à désaccorder à l'hydratation
const uid = "rl-sceau-quetes-";

export function SceauQuetes({ initial, demo = false, ouvert: ouvertDepart = false }: { initial: Panneau; demo?: boolean; ouvert?: boolean }) {
  const { codex } = useEtatNav();
  const [panneau, setPanneau] = useState(initial);
  const [ouvert, setOuvert] = useState(ouvertDepart);
  const [vus, setVus] = useState<string[] | null>(null);
  const [etroit, setEtroit] = useState(false);
  const [changer, setChanger] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, demarrer] = useTransition();
  const bouton = useRef<HTMLButtonElement | null>(null);
  const boite = useRef<HTMLDivElement | null>(null);

  useEffect(() => setPanneau(initial), [initial]);
  useEffect(() => {
    setVus(lireVus(panneau.jour));
    const mq = window.matchMedia("(max-width: 767px)");
    const suivre = () => setEtroit(mq.matches);
    suivre();
    mq.addEventListener("change", suivre);
    return () => mq.removeEventListener("change", suivre);
  }, [panneau.jour]);

  const nouvelles = vus === null ? [] : panneau.aPrendre.filter((c) => !vus.includes(c));
  const etat: Etat = panneau.aReclamer > 0 ? "rendre" : nouvelles.length > 0 ? "nouveau" : "calme";
  const compte = etat === "rendre" ? panneau.aReclamer : etat === "nouveau" ? nouvelles.length : 0;

  const fermer = useCallback(() => {
    setOuvert(false);
    setChanger(false);
    bouton.current?.focus();
  }, []);

  const ouvrir = () => {
    setOuvert(true);
    setMessage(null);
    // le « ! » se tait : ces quêtes sont vues
    const cles = [...new Set([...(vus ?? []), ...panneau.aPrendre])];
    setVus(cles);
    ecrireVus(panneau.jour, cles);
    if (!demo)
      void codexPanneau().then((p) => {
        if (!p.disponible) return;
        setPanneau(p);
        const toutes = [...new Set([...cles, ...p.aPrendre])];
        setVus(toutes);
        ecrireVus(p.jour, toutes);
      });
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

  const reclamer = (q: QuetePanneau) =>
    demarrer(async () => {
      if (demo) {
        setPanneau((p) => ({ ...p, quetes: p.quetes.filter((x) => x.cle !== q.cle), aReclamer: Math.max(0, p.aReclamer - 1) }));
        setMessage(`${CODEX.detail.reclame} : +${q.xp} XP`);
        return;
      }
      const r = await codexReclamerPanneau(q.id, q.periode);
      if (r.ok) {
        setPanneau(r.panneau);
        setMessage(`${CODEX.detail.reclame} : +${r.xp} XP`);
      } else setMessage("La récompense n'a pas pu être versée. Réessaie dans un instant.");
    });

  const changerContrat = (q: QuetePanneau) =>
    demarrer(async () => {
      if (!q.emplacement) return;
      setChanger(false);
      if (demo) {
        setMessage("Contrat changé (aperçu).");
        return;
      }
      const r = await codexChangerContrat(q.emplacement);
      if (r.ok) {
        setPanneau(panneauDe(r.vue));
        setMessage("Contrat changé. Le prochain changement, ce sera demain.");
      } else setMessage(r.raison === "refus" ? CODEX.contrats.changeDeja : "Pas d'autre contrat à te proposer pour l'instant.");
    });

  const libelle = etat === "rendre" ? `Tes quêtes : ${compte} récompense${compte > 1 ? "s" : ""} à réclamer` : etat === "nouveau" ? `Tes quêtes : ${compte} nouvelle${compte > 1 ? "s" : ""}` : "Tes quêtes";
  const contenu = (
    <>
      {!etroit && (
        <div className={s.panneauTete}>
          <h2 id={`${uid}titre`} className={`${s.panneauTitre} font-brand`}>
            Tes quêtes
          </h2>
          <span className="t-micro font-mono tabular-nums">
            {panneau.quetes.length} sur 4
          </span>
        </div>
      )}
      {panneau.quetes.length === 0 ? (
        <p className={s.replique} style={{ padding: "6px 6px 10px" }}>
          {CODEX.prochaine.rien}
        </p>
      ) : (
        <ul className={s.liste}>
          {panneau.quetes.map((q) => (
            <Ligne key={q.cle} q={q} changer={changer} occupe={occupe} onReclamer={reclamer} onChanger={changerContrat} onAller={() => setOuvert(false)} />
          ))}
        </ul>
      )}
      {message && (
        <p role="status" className="t-small m-0 mt-2 px-1">
          {message}
        </p>
      )}
      <div className={s.pied}>
        {panneau.changementPossible ? (
          <button type="button" className={s.lienDiscret} onClick={() => setChanger((c) => !c)} disabled={occupe} aria-pressed={changer} title={CODEX.contrats.changerAide}>
            {changer ? "Garder mes contrats" : "Changer un contrat"}
          </button>
        ) : (
          <span className="t-micro">1 changement de contrat par jour</span>
        )}
        <Link href="/codex" className={s.lienPlein} onClick={() => setOuvert(false)}>
          Voir le Codex complet →
        </Link>
      </div>
    </>
  );

  return (
    <div className={s.ancre}>
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
        <SceauBarre etat={etat} />
        {compte > 0 && (
          <span className={s.compte} aria-hidden>
            {compte}
          </span>
        )}
      </button>
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

/** Le sceau lui-même : hexagone doré tamponné (« ! » ou « ? » en réserve), ou un simple contour quand tout est calme. */
function SceauBarre({ etat }: { etat: Etat }) {
  if (etat === "calme") {
    return (
      <svg viewBox="0 0 120 120" aria-hidden key="calme">
        <use href={INK.sealHex} className={s.calmeContour} />
        <use href={INK.sealHexIn} className={s.calmeFilet} />
        <text x="60" y="76" textAnchor="middle" className={s.calmeSigne}>
          !
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 120" aria-hidden key={etat} className={s.pose}>
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
        <text x="60" y={etat === "rendre" ? 81 : 82} textAnchor="middle" className={s.signeReserve}>
          {etat === "rendre" ? "?" : "!"}
        </text>
      </g>
      <g clipPath={`url(#${uid}c)`}>
        <polygon className={`${s.reflet} rl-deco`} points="26,-10 50,-10 24,130 0,130" fill={`url(#${uid}r)`} />
      </g>
    </svg>
  );
}

function Ligne({
  q,
  changer,
  occupe,
  onReclamer,
  onChanger,
  onAller,
}: {
  q: QuetePanneau;
  changer: boolean;
  occupe: boolean;
  onReclamer: (q: QuetePanneau) => void;
  onChanger: (q: QuetePanneau) => void;
  onAller: () => void;
}) {
  const principale = q.genre === "principale";
  const l = { etat: q.etat, fraction: q.fraction, affichage: "complet" as const, retro: false };
  return (
    <li className={`${s.ligne} ${principale ? s.principale : ""} ${q.genre === "recompense" ? s.recompense : ""}`}>
      <Sceau l={l} taille={principale ? 46 : 38} signe={principale && q.etat !== "terminee" ? "!" : undefined} neuf={q.genre === "recompense"} />
      <span className="min-w-0">
        <span className={s.ligneTitre}>{q.titre}</span>
        <span className={s.ligneSous}>{q.sous}</span>
        {q.genre !== "recompense" && q.cible > 1 && <JaugePinceau fraction={q.fraction} or={q.etat === "active"} label={`${Math.floor(q.valeur)} sur ${Math.floor(q.cible)}`} />}
      </span>
      {q.genre === "recompense" ? (
        <button type="button" className={s.reclamer} disabled={occupe} onClick={() => onReclamer(q)}>
          Réclamer
        </button>
      ) : changer && q.genre === "contrat" ? (
        <button type="button" className={`btn btn-secondary btn-sm ${s.action}`} disabled={occupe || !q.changeable} onClick={() => onChanger(q)}>
          Changer
        </button>
      ) : (
        <Link href={q.lien ?? "/codex"} className={`btn ${principale ? "btn-primary" : "btn-secondary"} btn-sm rl-press ${s.action}`} onClick={onAller}>
          {q.lien ? "Y aller" : "Voir"}
          {principale && <ArrowRight size={15} aria-hidden />}
        </Link>
      )}
    </li>
  );
}

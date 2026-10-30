"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Share2 } from "lucide-react";
import { pieceDe, type Piece, type Rarete, type TypePiece } from "@/lib/profil/pieces";
import s from "./Fete.module.css";

// Les quatre tailles de fête (V3 §3.10), un seul composant pour tout ce qui
// se fête sur le site (A9 le branche sur le Codex : tailleFete) :
// - ligne : un contrat, une étape ; une ligne en bas (téléphone) ou en coin
//   (ordinateur), 2,5 s ;
// - carte : un jalon, un palier, un trophée d'or ou mieux, une fin de séance ;
//   carte centrée, le tampon tombe à `ancre` (la quête sur la carte), sinon
//   sur la carte ; 3 s, ou un clic ;
// - page : un acte clos ; une page qui se tourne, puis la réplique de
//   Léonard ; 3 s ;
// - plein : Maître de…, chef-d'œuvre, programme mené, jour J ; plein cadre,
//   la pièce gagnée en grand, « Partager » ; jusqu'au clic.
// Toujours passable (clic, Échap). Mouvement réduit : rien ne bouge, le rendu
// final est posé d'emblée (la réplique comprise). `onFin` est appelé une fois.

export type TailleFete = "ligne" | "carte" | "page" | "plein";
export type PropsFete = {
  taille: TailleFete;
  titre: string;
  sous?: string;
  xp?: number;
  /** clé de PIECES (lib/profil/pieces.ts) : « cadre:sanguine », « folio:mains » */
  piece?: string;
  /** la position de la quête à l'écran (coordonnées de la fenêtre) : le tampon y tombe */
  ancre?: { x: number; y: number } | null;
  partage?: { href: string } | null;
  replique?: { texte: string; pose: string } | null;
  onFin: () => void;
};

/** Durée avant la fin d'elle-même (ms) ; null : jusqu'au clic. */
export const DUREE_FETE: Record<TailleFete, number | null> = { ligne: 2500, carte: 3000, page: 3000, plein: null };
/** Le temps que la page se tourne avant la réplique (ms). */
export const PAGE_TOURNEE_MS = 700;

/** « entree » : l'animation joue ; « posee » : le rendu final (d'emblée sous mouvement réduit). */
export type EtapeFete = "entree" | "posee";
export const etapeInitiale = (reduit: boolean): EtapeFete => (reduit ? "posee" : "entree");
/** Les touches qui passent une fête. */
export const touchePasse = (key: string) => key === "Escape" || key === "Esc";

/** « +50 XP » (le format unique du site) */
export const texteXp = (xp: number | undefined) => (xp && xp > 0 ? `+${Math.round(xp)} XP` : null);

const NOM_TYPE: Record<TypePiece, string> = { cadre: "Cadre", banniere: "Bannière", titre: "Titre", folio: "Folio", ornement: "Ornement" };
const NOM_RARETE: Record<Rarete, string> = { commune: "commune", rare: "rare", precieuse: "précieuse", legendaire: "légendaire" };
/** « Cadre · pièce légendaire » */
export const legendePiece = (p: Piece) => `${NOM_TYPE[p.type]} · pièce ${NOM_RARETE[p.rarete]}`;

const mouvementReduit = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function Fete(props: PropsFete) {
  const { taille, onFin } = props;
  const [etape, setEtape] = useState<EtapeFete>(() => etapeInitiale(mouvementReduit()));
  const fini = useRef(false);
  const bouton = useRef<HTMLButtonElement | null>(null);

  const finir = useCallback(() => {
    if (fini.current) return;
    fini.current = true;
    onFin();
  }, [onFin]);

  // la fin d'elle-même (sauf le plein cadre), et la page posée après s'être tournée
  useEffect(() => {
    const duree = DUREE_FETE[taille];
    const fin = duree === null ? null : window.setTimeout(finir, duree);
    const pose = etape === "entree" ? window.setTimeout(() => setEtape("posee"), taille === "page" ? PAGE_TOURNEE_MS : 450) : null;
    return () => {
      if (fin !== null) window.clearTimeout(fin);
      if (pose !== null) window.clearTimeout(pose);
    };
    // une fois, au montage : la durée ne se relance pas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Échap passe la fête, où que soit le focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!touchePasse(e.key)) return;
      e.preventDefault();
      finir();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finir]);

  // plein cadre : le focus sur « Continuer » (dialogue modal)
  useEffect(() => {
    if (taille === "plein") bouton.current?.focus({ preventScroll: true });
  }, [taille]);

  return <FeteVue {...props} etape={etape} onPasser={finir} boutonRef={bouton} />;
}

/** Le rendu seul, à une étape donnée (aperçus et tests ; Fete le pilote). */
export function FeteVue({
  taille,
  titre,
  sous,
  xp,
  piece,
  ancre = null,
  partage = null,
  replique = null,
  etape,
  onPasser,
  boutonRef,
}: Omit<PropsFete, "onFin"> & { etape: EtapeFete; onPasser: () => void; boutonRef?: React.Ref<HTMLButtonElement> }) {
  const gain = texteXp(xp);
  const p = piece ? pieceDe(piece) : null;

  if (taille === "ligne") {
    return (
      <div role="status" aria-live="polite" data-fete="ligne" data-etape={etape}>
        <button type="button" className={s.ligne} onClick={onPasser}>
          <Check size={16} strokeWidth={2.6} aria-hidden className="shrink-0" />
          <span className="min-w-0 text-[14px] font-semibold leading-snug [overflow-wrap:anywhere]">
            {titre}
            {gain && <span className="font-medium text-muted"> · {gain}</span>}
          </span>
        </button>
      </div>
    );
  }

  if (taille === "carte") {
    const tampon = (
      <span className={s.tampon + (ancre ? " " + s.tamponAncre : "")} style={ancre ? { left: ancre.x, top: ancre.y } : undefined} aria-hidden>
        <Check size={26} strokeWidth={2.6} />
      </span>
    );
    return (
      <div className={s.voile} onClick={onPasser} data-fete="carte" data-etape={etape}>
        {ancre && tampon}
        <section role="status" aria-live="polite" className={s.carte}>
          {!ancre && tampon}
          <p className="t-h3 m-0 [overflow-wrap:anywhere]">{titre}</p>
          {sous && <p className="t-small m-0 mt-1.5">{sous}</p>}
          {gain && <p className="t-num m-0 mt-3 text-[22px]">{gain}</p>}
          {p && <p className="t-micro m-0 mt-2">{p.nom}</p>}
        </section>
      </div>
    );
  }

  if (taille === "page") {
    return (
      <div className={s.voile} onClick={onPasser} data-fete="page" data-etape={etape}>
        <div className={s.scene}>
          <section role="status" aria-live="polite" className={s.page}>
            <p className="font-brand m-0 text-[26px] leading-tight [overflow-wrap:anywhere]">{titre}</p>
            {sous && <p className="t-small m-0 mt-2">{sous}</p>}
            {gain && <p className="t-num m-0 mt-3 text-[20px]">{gain}</p>}
            {replique && etape === "posee" && (
              <figure className={s.replique} data-pose={replique.pose}>
                <blockquote className="m-0 text-[14.5px] leading-relaxed">« {replique.texte} »</blockquote>
                <figcaption className="t-micro mt-1.5">Léonard</figcaption>
              </figure>
            )}
          </section>
        </div>
      </div>
    );
  }

  // plein cadre : jusqu'au clic
  return (
    <div role="dialog" aria-modal="true" aria-label={titre} className={s.voile + " " + s.plein} data-fete="plein" data-etape={etape}>
      <div className={s.pleinCorps}>
        {p && (
          <div className={s.piece} data-rarete={p.rarete}>
            <div className="grid gap-2">
              <p className="t-micro m-0">{legendePiece(p)}</p>
              <p className="font-brand m-0 text-[28px] leading-tight [overflow-wrap:anywhere]">{p.nom}</p>
              {p.folio?.oeuvre && <p className="t-micro m-0">{p.folio.oeuvre}</p>}
            </div>
          </div>
        )}
        <h2 className="t-h1 m-0 [overflow-wrap:anywhere]">{titre}</h2>
        {sous && <p className="t-small m-0 max-w-[440px]">{sous}</p>}
        {gain && <p className="t-num m-0 text-[24px]">{gain}</p>}
        {replique && (
          <figure className="m-0 max-w-[440px]" data-pose={replique.pose}>
            <blockquote className="m-0 text-[14.5px] leading-relaxed">« {replique.texte} »</blockquote>
            <figcaption className="t-micro mt-1.5">Léonard</figcaption>
          </figure>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {partage && (
            <Link href={partage.href} className="btn btn-secondary rl-press min-h-[44px]">
              <Share2 size={16} aria-hidden /> Partager
            </Link>
          )}
          <button ref={boutonRef} type="button" className="btn btn-primary rl-press min-h-[44px]" onClick={onPasser}>
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}

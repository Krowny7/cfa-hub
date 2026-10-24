"use client";

import { useEffect, useId, useRef } from "react";
import { RichText } from "@/components/RichText";
import { decouperVerso } from "@/lib/flashcards/verso";
import { BOUCLE } from "@/lib/voice-z3c";
import s from "./Revision.module.css";
import { VersoTroisCases } from "./Verso";

// La pile de fiches de la révision (FlashcardReview) : 1 à 2 feuilles nues
// dessous, la fiche du dessus qui se retourne, et les fiches marquées qui
// s'envolent avec leur tampon. Sur écran tactile : toucher retourne, glisser
// une fois retournée marque (à droite maîtrisée, à gauche à revoir) ; lâchée
// avant le seuil, la fiche revient en place, élastique. La souris passe par
// le clic, les boutons et le clavier.

export type CarteVue = {
  id: string;
  front: string;
  back: string;
  /** en-tête de la fiche : « Fixed Income · Duration & convexity » */
  lieu: string;
  /** « 07 / 60 » */
  numero: string;
};

export type Envol = { cle: number; carte: CarteVue; su: boolean; dx: number; fige?: boolean };

const estCourt = (t: string, max: number) => t.length <= max && !t.includes("\n") && !t.includes("$$") && !t.includes("![");

function Face({
  carte,
  verso,
  big,
  statique = false,
  idCorps,
  cachee = false,
  marque = null,
}: {
  carte: CarteVue;
  verso: boolean;
  big: boolean;
  statique?: boolean;
  idCorps?: string;
  cachee?: boolean;
  /** marque déjà posée dans le tour (carte revue avec ←) : le petit tampon remplace la ligne d'aide */
  marque?: boolean | null;
}) {
  const texte = verso ? carte.back : carte.front;
  // le verso en trois cases quand la carte suit le format (sinon le texte tel quel)
  const cases = verso ? decouperVerso(carte.back) : null;
  const court = estCourt(texte, verso ? 160 : 220);
  const taille = verso
    ? big
      ? "text-[17px] leading-relaxed sm:text-[20px]"
      : "text-[15.5px] leading-relaxed sm:text-[17px]"
    : court
      ? big
        ? "text-[23px] font-semibold leading-snug tracking-[-0.018em] sm:text-[32px]"
        : "text-[20px] font-semibold leading-snug tracking-[-0.016em] sm:text-[25px]"
      : big
        ? "text-[18px] font-semibold leading-snug tracking-[-0.01em] sm:text-[22px]"
        : "text-[16.5px] font-semibold leading-snug tracking-[-0.01em] sm:text-[19px]";
  return (
    <div className={`${s.face} ${verso && !statique ? s.verso : s.recto}`} aria-hidden={cachee || undefined}>
      <div className={s.entete}>
        <span className={"t-eyebrow " + s.lieu}>{carte.lieu}</span>
        <span className={s.num}>{carte.numero}</span>
      </div>
      <div id={idCorps} className={`${s.corps} ${verso ? s.corpsVerso : court ? s.court : ""} ${cases ? s.corpsCases : ""}`}>
        {verso && (
          <div className={s.rappel}>
            <RichText text={carte.front} />
          </div>
        )}
        {cases ? <VersoTroisCases verso={cases} big={big} /> : <RichText text={texte} className={`${s.texte} ${taille}`} />}
      </div>
      <div className={"t-micro " + s.pied}>
        {marque !== null ? (
          <span className={s.marque} style={{ color: marque ? "var(--ink)" : "var(--pen)" }}>
            {BOUCLE.dejaMarquee(marque)}
          </span>
        ) : verso ? (
          <span className={s.siTactile}>{BOUCLE.glisser}</span>
        ) : (
          <>
            <span className={s.siSouris}>{BOUCLE.cliquer}</span>
            <span className={s.siTactile}>{BOUCLE.toucher}</span>
          </>
        )}
      </div>
    </div>
  );
}

function Tampon({ su }: { su: boolean }) {
  return <span className={`${s.tampon} ${su ? s.tamponSu : s.tamponRevoir}`}>{su ? BOUCLE.tamponSu : BOUCLE.tamponRevoir}</span>;
}

/** La fiche du dessus : retournement, geste tactile, tampons qui montent avec le geste. */
function Dessus({
  carte,
  verso,
  lever,
  marque,
  big,
  onRetourner,
  onMarquer,
}: {
  carte: CarteVue;
  verso: boolean;
  lever: number;
  marque: boolean | null;
  big: boolean;
  onRetourner: () => void;
  onMarquer: (su: boolean, dx: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const geste = useRef<{ id: number; x0: number; y0: number; dx: number; actif: boolean } | null>(null);
  const ignorerClic = useRef(0);
  const minuteur = useRef<number | null>(null);
  const idRecto = useId();
  const idVerso = useId();

  useEffect(
    () => () => {
      if (minuteur.current) window.clearTimeout(minuteur.current);
    },
    []
  );

  const reduit = useRef(false);
  const seuil = () => Math.min(120, (ref.current?.offsetWidth ?? 360) * 0.3);

  function poser(dx: number) {
    const el = ref.current;
    if (!el) return;
    // mouvement réduit : la fiche suit le doigt, sans pivoter
    el.style.transform = dx ? `translateX(${dx}px)` + (reduit.current ? "" : ` rotate(${(dx * 0.05).toFixed(2)}deg)`) : "";
    el.style.setProperty("--force", String(Math.min(1, Math.abs(dx) / seuil())));
    if (dx > 0) el.dataset.sens = "su";
    else if (dx < 0) el.dataset.sens = "revoir";
    else delete el.dataset.sens;
  }

  /** lâchée avant le seuil : retour élastique */
  function relacher() {
    const el = ref.current;
    if (!el) return;
    delete el.dataset.glisse;
    el.style.transition = reduit.current ? "transform var(--dur-1) ease" : "transform var(--dur-3) var(--ease-spring)";
    poser(0);
    if (minuteur.current) window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => {
      if (ref.current) ref.current.style.transition = "";
    }, 650);
  }

  const lev = lever === 0 ? "" : lever % 2 ? s.leveA : s.leveB;

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-pressed={verso}
      aria-label={
        (verso ? `${carte.numero}, réponse. Retourner vers la question` : `${carte.numero}, question. Retourner la carte`) +
        (marque !== null ? `. ${BOUCLE.dejaMarquee(marque)}` : "")
      }
      aria-describedby={verso ? idVerso : idRecto}
      className={`${s.fiche} ${lev}`}
      data-fiche=""
      onClick={() => {
        if (performance.now() < ignorerClic.current) return;
        onRetourner();
      }}
      onPointerDown={(e) => {
        // la souris passe par le clic, les boutons et le clavier
        if (e.pointerType === "mouse") return;
        geste.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, actif: false };
        try {
          reduit.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        } catch {
          reduit.current = false;
        }
      }}
      onPointerMove={(e) => {
        const g = geste.current;
        if (!g || g.id !== e.pointerId) return;
        const dx = e.clientX - g.x0;
        const dy = e.clientY - g.y0;
        if (!g.actif) {
          // on marque une carte retournée, d'un geste franchement horizontal
          if (!verso || Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
          g.actif = true;
          try {
            ref.current?.setPointerCapture(e.pointerId);
          } catch {
            // capture refusée : le geste continue tant que le doigt reste sur la carte
          }
          if (ref.current) {
            ref.current.style.transition = "none";
            ref.current.dataset.glisse = "";
          }
        }
        g.dx = dx;
        poser(dx);
      }}
      onPointerUp={(e) => {
        const g = geste.current;
        if (!g || g.id !== e.pointerId) return;
        geste.current = null;
        if (!g.actif) return;
        ignorerClic.current = performance.now() + 400;
        if (Math.abs(g.dx) >= seuil()) onMarquer(g.dx > 0, g.dx);
        else relacher();
      }}
      onPointerCancel={() => {
        const g = geste.current;
        geste.current = null;
        if (g?.actif) relacher();
      }}
    >
      <span className={s.ombre} aria-hidden />
      <div className={s.levier}>
        <div className={s.rotor} data-verso={verso ? "" : undefined}>
          <Face carte={carte} verso={false} big={big} idCorps={idRecto} cachee={verso} marque={marque} />
          <Face carte={carte} verso big={big} idCorps={idVerso} cachee={!verso} marque={marque} />
        </div>
      </div>
      <Tampon su />
      <Tampon su={false} />
    </div>
  );
}

export function FichePile({
  carte,
  verso,
  lever,
  marque,
  dessous,
  envols,
  big,
  fantome = false,
  className = "",
  onRetourner,
  onMarquer,
  onEnvolFin,
}: {
  /** la fiche du dessus, null entre deux tours (la dernière s'envole) */
  carte: CarteVue | null;
  verso: boolean;
  /** compteur de retournements (rejoue le soulèvement) */
  lever: number;
  /** marque déjà posée sur cette carte dans le tour (revue avec ←) */
  marque: boolean | null;
  /** feuilles visibles dessous : 0 à 2 */
  dessous: number;
  envols: Envol[];
  big: boolean;
  /** avant la lecture du navigateur : une fiche blanche à la bonne taille */
  fantome?: boolean;
  className?: string;
  onRetourner: () => void;
  onMarquer: (su: boolean, dx: number) => void;
  onEnvolFin: (cle: number) => void;
}) {
  return (
    <div className={`${s.scene} ${className}`}>
      {Array.from({ length: Math.max(0, Math.min(2, dessous)) }, (_, i) => (
        <div key={i} className={s.dessous} data-rang={i + 1} aria-hidden />
      ))}
      {fantome ? (
        <div className={s.fiche} aria-hidden>
          <div className={s.face}>
            <div className={s.entete} />
          </div>
        </div>
      ) : carte ? (
        <Dessus key={carte.id} carte={carte} verso={verso} lever={lever} marque={marque} big={big} onRetourner={onRetourner} onMarquer={onMarquer} />
      ) : null}
      {envols.map((v) => (
        <div
          key={v.cle}
          className={s.envol}
          data-sens={v.su ? "su" : "revoir"}
          data-fige={v.fige ? "" : undefined}
          data-glisse={v.dx !== 0 ? "" : undefined}
          style={{ "--dx": Math.round(v.dx) } as React.CSSProperties}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) onEnvolFin(v.cle);
          }}
          aria-hidden
        >
          <Face carte={v.carte} verso big={big} statique />
          <Tampon su={v.su} />
        </div>
      ))}
    </div>
  );
}

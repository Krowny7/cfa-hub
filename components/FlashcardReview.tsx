"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { loadSRS, saveSRS, applyReview, sortBySRS } from "@/lib/srs";
import { RichText } from "@/components/RichText";
import { FinDePasse } from "@/components/session/FinDePasse";
import { useTraitsDuJour } from "@/components/session/useTraitsDuJour";
import { FLASHCARDS } from "@/lib/voice-z3c";

type Card = { id: string; front: string; back: string };

/** Aperçu uniquement : ouvre la révision dans un état donné. */
export type FlashcardDemo = {
  index?: number;
  flipped?: boolean;
  done?: boolean;
  marks?: Record<string, boolean>;
  fullscreen?: boolean;
};

// Carte à retournement 3D : les deux faces sont TOUJOURS dans le DOM, empilées
// en absolute, et c'est le conteneur qui pivote (rotateY) — backface-visibility
// cache la face qui n'est pas tournée vers l'utilisateur. Un simple swap de
// texte (l'ancienne implémentation) n'a pas d'étape intermédiaire animable.
function Face({ text, back, big }: { text: string; back: boolean; big: boolean }) {
  const short = text.length <= 240 && !text.includes("\n") && !text.includes("$$") && !text.includes("![");
  const size = back
    ? big
      ? "text-[19px] leading-relaxed sm:text-[23px]"
      : "text-[16px] leading-relaxed sm:text-[17.5px]"
    : big
      ? "text-[24px] font-semibold leading-snug tracking-[-0.018em] sm:text-[34px]"
      : "text-[20px] font-semibold leading-snug tracking-[-0.016em] sm:text-[25px]";
  return (
    <div
      className={
        "card-hero absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden p-6 [backface-visibility:hidden] sm:p-8 " +
        (back ? "[transform:rotateY(180deg)]" : "")
      }
      aria-hidden={undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="t-eyebrow">{back ? "Verso" : "Recto"}</span>
        {!back && <span className="t-micro hidden sm:inline">Clique pour retourner</span>}
      </div>
      <div className={"flex min-w-0 flex-1 py-5 " + (short ? "items-center justify-center text-center" : "items-start")}>
        <RichText
          text={text}
          className={"w-full break-words [overflow-wrap:anywhere] " + size + (short ? (back ? " mx-auto max-w-[48ch]" : " mx-auto max-w-[34ch]") : "")}
        />
      </div>
    </div>
  );
}

function FlipCard({ card, flipped, onFlip, big, className = "" }: { card: Card; flipped: boolean; onFlip: () => void; big: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={flipped ? "Revenir au recto" : "Retourner la carte"}
      className={"relative block w-full rounded-[22px] text-left [perspective:1600px] " + className}
    >
      <div
        className={
          "absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.4,0.2,0.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none " +
          (flipped ? "[transform:rotateY(180deg)]" : "")
        }
      >
        <Face text={card.front} back={false} big={big} />
        <Face text={card.back} back big={big} />
      </div>
    </button>
  );
}

export function FlashcardReview({
  cards,
  setId,
  traitsJour = null,
  demo,
}: {
  cards: Card[];
  setId?: string;
  /** traits du jour lus par le serveur : le sceau du jour en fin de passe si la journée est tenue */
  traitsJour?: number | null;
  demo?: FlashcardDemo;
}) {
  const jour = useTraitsDuJour(traitsJour);
  // La passe de révision est un instantané figé au montage — jamais recalculé
  // pendant la passe. C'est le même principe que les vrais outils de
  // répétition espacée (Anki, SuperMemo…) : l'ordre de la file du jour est
  // tiré UNE fois ; les mises à jour de planification (dates d'échéance,
  // ease factor) sont écrites pour LA PROCHAINE fois, jamais pour réordonner
  // la file en cours. Auparavant, `orderedCards` était un useMemo dépendant de
  // srsState : marquer une carte changeait son échéance → retriait tout le
  // tableau → décalait l'index en plein milieu de la passe → symptôme
  // observé : cartes sautées et d'autres revues plusieurs fois.
  const [deck] = useState<Card[]>(() => {
    if (!setId || demo) return cards;
    try {
      return sortBySRS(cards, loadSRS(setId));
    } catch {
      return cards;
    }
  });

  // Idem : snapshot figé au moment où l'utilisateur choisit "repasser sur les
  // non maîtrisées", pas une liste dérivée en direct de sessionMarks (qui
  // aurait le même bug de décalage d'index si on retire une carte en cours de
  // repasse).
  const [reviewMode, setReviewMode] = useState<"all" | "unmastered">("all");
  const [unmasteredSnapshot, setUnmasteredSnapshot] = useState<Card[]>([]);

  const [i, setI] = useState(demo?.index ?? 0);
  const [flipped, setFlipped] = useState(demo?.flipped ?? false);
  const [done, setDone] = useState(demo?.done ?? false);
  const [fullscreen, setFullscreen] = useState(demo?.fullscreen ?? false);

  // Marques de cette passe (pas persistées) : sert uniquement à compter/lister
  // les "non maîtrisées" pour proposer la repasse ciblée — ne remplace pas le
  // SRS, qui reste la seule source de vérité pour la planification long terme.
  const [sessionMarks, setSessionMarks] = useState<Record<string, boolean>>(demo?.marks ?? {});

  const activeDeck = reviewMode === "all" ? deck : unmasteredSnapshot;
  const current = activeDeck[i] ?? null;
  const total = activeDeck.length;
  const notMasteredCount = deck.filter((c) => sessionMarks[c.id] === false).length;
  const passMastered = activeDeck.filter((c) => sessionMarks[c.id] === true).length;
  const passToReview = activeDeck.filter((c) => sessionMarks[c.id] === false).length;

  // Le clavier ne pilote la carte que si elle est à l'écran (ou en plein écran).
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function goPrev() {
    setI((v) => Math.max(0, v - 1));
    setFlipped(false);
  }
  function goNext() {
    setI((v) => Math.min(total - 1, v + 1));
    setFlipped(false);
  }

  function mark(gotIt: boolean) {
    if (!current) return;
    setSessionMarks((prev) => ({ ...prev, [current.id]: gotIt }));
    if (setId && !demo) {
      // Écrit pour LA PROCHAINE session — n'affecte jamais l'ordre de celle-ci.
      const next = applyReview(loadSRS(setId), current.id, gotIt);
      saveSRS(setId, next);
    }
    if (i >= total - 1) {
      setDone(true);
      setFlipped(false);
    } else goNext();
  }

  function startUnmasteredReview() {
    setUnmasteredSnapshot(deck.filter((c) => sessionMarks[c.id] === false));
    setReviewMode("unmastered");
    setI(0);
    setFlipped(false);
    setDone(false);
  }

  function backToAll() {
    setReviewMode("all");
    setI(0);
    setFlipped(false);
    setDone(false);
  }

  function restart() {
    setSessionMarks({});
    backToAll();
  }

  // Raccourcis : Espace/Entrée retourne, ← → naviguent, 1 = à revoir,
  // 2 = maîtrisée, Échap ferme le plein écran.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!fullscreen && !inView) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape" && fullscreen) {
        setFullscreen(false);
        return;
      }
      if (done || !current) return;
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if ((e.key === " " || e.key === "Enter") && tag !== "BUTTON" && tag !== "A") {
        e.preventDefault();
        setFlipped((v) => !v);
      } else if (flipped && e.key === "1") mark(false);
      else if (flipped && e.key === "2") mark(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Plein écran : la page derrière ne défile plus.
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  if (!cards.length) {
    return (
      <div className="card-quiet grid place-items-center gap-1.5 px-6 py-14 text-center">
        <p className="t-h3 m-0">{FLASHCARDS.vide}</p>
        <p className="t-small">{FLASHCARDS.videLigne}</p>
      </div>
    );
  }

  const pct = total ? Math.round(((done ? total : Math.min(i + 1, total)) / total) * 100) : 0;

  const stage = (big: boolean) => (
    <div className={"flex min-h-0 flex-col gap-4 sm:gap-5 " + (big ? "h-full" : "")}>
      {/* Avancement */}
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="t-micro shrink-0 font-mono font-semibold tabular-nums text-white">
          {done ? total : Math.min(i + 1, total)}
          <span className="font-medium text-muted"> / {total}</span>
        </span>
        <div className="ink-bar flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Avancement dans le set">
          <span style={{ width: `${pct}%` }} />
        </div>
        {reviewMode === "all" && notMasteredCount > 0 && !done ? (
          <button type="button" onClick={startUnmasteredReview} className="t-micro shrink-0 font-semibold underline-offset-4 hover:text-white hover:underline">
            {FLASHCARDS.aRevoir(notMasteredCount)}
          </button>
        ) : null}
        <button
          type="button"
          className="icon-btn h-9 w-9 rounded-[11px]"
          onClick={() => setFullscreen((v) => !v)}
          aria-label={big ? "Quitter le plein écran" : "Plein écran"}
          title={big ? "Quitter le plein écran (Échap)" : "Plein écran"}
        >
          {big ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
        </button>
      </div>

      {reviewMode === "unmastered" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-surface-2 px-4 py-2.5 text-[13px]">
          <span className="font-semibold">{FLASHCARDS.repasse(unmasteredSnapshot.length)}</span>
          <button type="button" className="font-semibold text-muted underline-offset-4 hover:text-white hover:underline" onClick={backToAll}>
            {FLASHCARDS.toutes}
          </button>
        </div>
      )}

      {done ? (
        <FinDePasse
          sues={passMastered}
          total={total}
          aRevoir={passToReview}
          marques={activeDeck.map((c) => sessionMarks[c.id] ?? null)}
          jour={jour}
          unite={FLASHCARDS.maitrisees(passMastered)}
          className={big ? "flex-1" : ""}
          actions={
            <>
              {notMasteredCount > 0 && (
                <button type="button" className="btn btn-primary btn-lg rl-press" onClick={startUnmasteredReview}>
                  {FLASHCARDS.reprendre(notMasteredCount)}
                </button>
              )}
              <button type="button" className={"btn btn-lg " + (notMasteredCount > 0 ? "btn-secondary" : "btn-primary rl-press")} onClick={restart}>
                <RotateCcw size={16} aria-hidden /> {FLASHCARDS.recommencer}
              </button>
            </>
          }
        >
          {!big && (
            <Link href="/flashcards" className="ink-link">
              {FLASHCARDS.autres}
            </Link>
          )}
        </FinDePasse>
      ) : current ? (
        <>
          <FlipCard
            card={current}
            flipped={flipped}
            onFlip={() => setFlipped((v) => !v)}
            big={big}
            className={big ? "min-h-[280px] flex-1" : "h-[clamp(300px,50vh,440px)]"}
          />

          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" className="icon-btn h-[50px] w-[50px] rounded-[14px] disabled:pointer-events-none disabled:opacity-35" disabled={i === 0} onClick={goPrev} aria-label="Carte précédente">
              <ArrowLeft size={18} aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              {flipped ? (
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="btn btn-secondary btn-lg whitespace-nowrap px-3" onClick={() => mark(false)}>
                    <RotateCcw size={16} aria-hidden className="hidden sm:block" /> À revoir
                  </button>
                  <button type="button" className="btn btn-primary btn-lg rl-press whitespace-nowrap px-3" onClick={() => mark(true)}>
                    <Check size={16} aria-hidden className="hidden sm:block" /> Je maîtrise
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-primary btn-lg rl-press w-full" onClick={() => setFlipped(true)}>
                  Retourner
                </button>
              )}
            </div>
            <button type="button" className="icon-btn h-[50px] w-[50px] rounded-[14px] disabled:pointer-events-none disabled:opacity-35" disabled={i >= total - 1} onClick={goNext} aria-label="Carte suivante">
              <ArrowRight size={18} aria-hidden />
            </button>
          </div>

          <p className="t-micro hidden flex-wrap items-center justify-center gap-1.5 sm:flex">
            <span className="kbd">Espace</span> retourner · <span className="kbd">←</span>
            <span className="kbd">→</span> naviguer · <span className="kbd">1</span> à revoir · <span className="kbd">2</span> maîtrisée
          </p>
        </>
      ) : (
        <div className="card-quiet grid place-items-center px-6 py-14 text-center">
          <p className="t-h3 m-0">{FLASHCARDS.repasseFinie}</p>
          <button type="button" className="btn btn-secondary mt-4" onClick={backToAll}>
            {FLASHCARDS.toutes}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div ref={rootRef}>{stage(false)}</div>

      {fullscreen && (
        // z-[100] : au-dessus de la barre du bas mobile (z-50) pour qu'elle ne
        // recouvre pas les boutons. paddingBottom réserve la zone de l'indicateur
        // d'accueil iOS (safe area).
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Révision en plein écran"
          className="fixed inset-0 z-[100] bg-black px-4 pt-4 sm:px-8 sm:pt-7"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col">{stage(true)}</div>
        </div>
      )}
    </>
  );
}

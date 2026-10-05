"use client";

import { useEffect, useRef, useState } from "react";
import { analyserSession, empreinte, signalerLeonard } from "@/lib/leonard/signal";
import { AnneauDuJour } from "@/components/adn/AnneauDuJour";
import { useObjectifDuJour } from "@/components/adn/useObjectifDuJour";
import { CopieCorrigee, type LigneCopie, type MatiereCopie } from "@/components/adn/CopieCorrigee";
import { SceauJour } from "@/components/adn/Sceau";
import { RepriseRatures } from "@/components/session/RepriseRatures";
import { cleanTopic, type ReviewQuestion } from "@/components/session/review";
import { nombre, ratures } from "@/lib/voice";
import { ligneAnneauFin } from "@/lib/voice-z3";

// La fin d'une session (moment 5) : la copie corrigée, l'avancée de l'anneau
// du jour, puis « Reprendre mes N ratures » et « Copier pour l'IA ». La
// correction détaillée (children) suit juste en dessous ; pendant la reprise
// des ratures, elle s'efface (elle donnerait les réponses).
//
//   <FinDeSession epreuve="Entraînement ciblé · 22 questions · 30 min"
//     titre="Fixed Income, Derivatives" score={16} total={22} review={review}
//     jour={traits} ajoutes={22} ia={<CopyForAi … size="action" />}
//     liens={<button className="ink-link">Nouvelle session</button>}>
//     <ReviewSection review={review} />
//   </FinDeSession>
//
// Props
//   epreuve, titre, meta   l'en-tête de la copie (sur-titre, titre, ligne mono)
//   score, total           la note entourée
//   review                 la marge (✓ / ✗), l'appréciation par matière, la reprise
//   lignes, matieres       remplacent ce que l'on tire de `review`
//   jour                   traits du jour après cette copie (useTraitsDuJour) ; null : inconnu
//   ajoutes                traits que cette copie a posés ; 0 = copie revue plus tard (pas d'anneau)
//   ia                     le bouton « Copier pour l'IA » de l'écran (format d'export inchangé) :
//                          <CopyForAi … size="action" /> (export des sessions, review.ts) ou
//                          <CopierPourIA texte={(seulementRatures) => …} /> (export propre à
//                          l'écran), tous deux dans components/session/parts
//   liens                  liens secondaires (nouvelle session, retour…)
//   notes                  une ligne sous les actions (erreur d'enregistrement…)
//   anime                  false : copie posée (revisite)
//   children               la correction détaillée, sous la copie

/** Une ligne de marge : la première ligne de l'énoncé, en texte simple. */
export function texteMarge(prompt: string): string {
  const first =
    prompt
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? "";
  return first
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[$*_`#>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function lignesDeCopie(review: ReviewQuestion[]): LigneCopie[] {
  return review.map((q, i) => ({ label: texteMarge(q.prompt), ok: q.is_correct, n: i + 1 }));
}

/** Matières de la copie, pour l'appréciation : « Fixed Income — Reading 50 (Système) » → « Fixed Income ». */
export function matieresDeCopie(review: ReviewQuestion[]): MatiereCopie[] {
  const by = new Map<string, MatiereCopie>();
  for (const q of review) {
    const label = cleanTopic(q.topic).split(" — ")[0].trim() || "Autre";
    const m = by.get(label) ?? { label, ok: 0, total: 0 };
    m.total += 1;
    if (q.is_correct) m.ok += 1;
    by.set(label, m);
  }
  return [...by.values()];
}

/**
 * Une ligne d'anneau du jour : le petit anneau du logo (ce qui est tracé
 * aujourd'hui), la phrase, et le sceau « TENU » du correcteur si `sceau`.
 * Sert sous la copie corrigée et en fin de passe de flashcards.
 */
export function LigneAnneau({ jour, texte, sceau = false, delai = 0.9 }: { jour: number | null; texte: string; sceau?: boolean; delai?: number }) {
  const [aujourdhui] = useState(() => new Date());
  const objectif = useObjectifDuJour();
  return (
    <>
      {jour !== null && (
        // de la place autour de l'anneau : sa cote (« encore 14 ») suit le bout
        // qui reste, du dessous jusqu'en haut à gauche ; la journée tenue est
        // cotée « demain » en haut à gauche
        <div className="grid h-[92px] w-[112px] shrink-0 items-center justify-items-end">
          <AnneauDuJour repondues={jour} objectif={objectif} size={68}>
            {/* au petit format, le chiffre seul (l'objectif et le bonus se lisent dans la phrase) */}
            <span className="t-num text-[15px] tabular-nums">{nombre(jour)}</span>
          </AnneauDuJour>
        </div>
      )}
      <p className="m-0 min-w-0 text-[13.5px] font-medium leading-snug">{texte}</p>
      {sceau && <SceauJour date={aujourdhui} taille={60} pose="vue" delai={delai} className="ml-1 shrink-0" />}
    </>
  );
}

/** Sous la copie : l'anneau du jour avancé des traits de cette copie, et le bout qui reste. */
function AnneauFin({ jour, ajoutes }: { jour: number | null; ajoutes: number }) {
  const objectif = useObjectifDuJour();
  const avant = jour === null ? null : jour - ajoutes;
  // le sceau ne se pose que si cette copie a tenu la journée (une fois par jour)
  const vientDeTenir = jour !== null && avant !== null && avant < objectif && jour >= objectif;
  return <LigneAnneau jour={jour} texte={ligneAnneauFin(ajoutes, jour, objectif)} sceau={vientDeTenir} />;
}

export function FinDeSession({
  epreuve,
  titre,
  meta,
  score,
  total,
  review,
  lignes,
  matieres,
  jour,
  ajoutes,
  ia,
  liens,
  notes,
  anime = true,
  children,
}: {
  epreuve: string;
  titre: string;
  meta?: string;
  score: number;
  total: number;
  review: ReviewQuestion[];
  lignes?: LigneCopie[];
  matieres?: MatiereCopie[];
  jour: number | null;
  ajoutes: number;
  ia?: React.ReactNode;
  liens?: React.ReactNode;
  notes?: React.ReactNode;
  anime?: boolean;
  children?: React.ReactNode;
}) {
  // Léonard réagit à la session (une fois par session : clé = questions + score)
  useEffect(() => {
    const sig = analyserSession(review.map((r) => r.is_correct), score, total);
    if (sig) signalerLeonard({ ...sig, delai: 2600 }, "fs:" + empreinte(score, total, ...review.map((r) => r.question_id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [reprise, setReprise] = useState(false);
  // de retour de la reprise : la copie est déjà posée, on la retrouve en haut
  const [revenu, setRevenu] = useState(false);
  const feuille = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (revenu && !reprise) feuille.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [revenu, reprise]);

  // les ratures à reprendre : celles dont la correction est connue
  const errIdx = review.map((q, i) => (!q.is_correct && q.correct_index >= 0 ? i : -1)).filter((i) => i >= 0);

  if (reprise) {
    return (
      <RepriseRatures
        ratures={errIdx.map((i) => review[i])}
        numeros={errIdx.map((i) => i + 1)}
        onFin={() => {
          setReprise(false);
          setRevenu(true);
        }}
      />
    );
  }

  return (
    <>
      <div ref={feuille} className="scroll-mt-24">
      <CopieCorrigee
        surTitre={epreuve}
        titre={titre}
        meta={meta}
        score={score}
        total={total}
        questions={lignes ?? lignesDeCopie(review)}
        matieres={matieres ?? matieresDeCopie(review)}
        anime={anime && !revenu}
        className="mx-auto"
        anneau={ajoutes > 0 ? <AnneauFin jour={jour} ajoutes={ajoutes} /> : undefined}
        actions={
          <>
            {errIdx.length > 0 && (
              <button type="button" className="btn btn-primary btn-lg rl-press w-full sm:w-auto" onClick={() => setReprise(true)}>
                Reprendre mes {ratures(errIdx.length)}
              </button>
            )}
            {ia}
            {notes && <div className="basis-full">{notes}</div>}
            {liens && <div className="flex basis-full flex-wrap items-center gap-x-5 gap-y-2 pt-1">{liens}</div>}
          </>
        }
      />
      </div>
      {children}
    </>
  );
}

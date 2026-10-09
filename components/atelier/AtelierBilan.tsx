"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Headphones } from "lucide-react";
import { CompteurBarre } from "@/components/adn/Rature";
import { FinDeSession, texteMarge } from "@/components/session/FinDeSession";
import type { LigneCopie, MatiereCopie } from "@/components/adn/CopieCorrigee";
import type { ReviewQuestion } from "@/components/session/review";
import { useTraitsDuJour } from "@/components/session/useTraitsDuJour";
import { bilan as calculerBilan, type BilanAtelier, type Reponse } from "@/lib/atelier";
import type { ClotureAtelier, ItemSeance, RappelNotion, SeanceAtelier } from "@/lib/atelier-seance";
import { ATELIER as V } from "@/lib/voice-atelier";

// Le bilan de l'Atelier : la copie corrigée (FinDeSession : la note, la
// marge, l'anneau du jour, « Reprendre mes N ratures »), puis, par notion,
// avant → pendant, ratures avant → après (l'ancien chiffre rayé à l'encre),
// le calcul, et le prochain pas (le chapitre audio de la notion la plus
// basse) avec le prochain Atelier conseillé. À l'arrêt (bilan partiel), la
// même lecture par notion, et « Reprendre » sous 24 heures.

const TOUCHER = "relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']";

function libelleDe(rappels: Record<string, RappelNotion>, notion: string) {
  return rappels[notion]?.libelle ?? notion;
}

/** Les questions corrigées du premier passage, pour la copie et « Reprendre mes ratures ». */
function revue(items: ItemSeance[], reponses: Reponse[], rappels: Record<string, RappelNotion>): { review: ReviewQuestion[]; lignes: LigneCopie[] } {
  const parI = new Map(items.map((x) => [x.i, x]));
  const review: ReviewQuestion[] = [];
  const lignes: LigneCopie[] = [];
  reponses
    .filter((r) => !r.retest)
    .forEach((r, k) => {
      const it = parI.get(r.i);
      if (!it) return;
      if (it.k === "calc") {
        lignes.push({ label: it.q ? texteMarge(it.q.prompt) : it.nomType, ok: r.ok, n: k + 1 });
        return;
      }
      lignes.push({ label: texteMarge(it.prompt), ok: r.ok, n: k + 1 });
      if (!it.premier) return;
      review.push({
        question_id: it.ref,
        prompt: it.prompt,
        choices: it.choices,
        correct_index: it.premier.bonne ?? -1,
        explanation: it.premier.explication,
        topic: libelleDe(rappels, it.notion),
        selected_index: it.premier.choix,
        is_correct: it.premier.juste,
      });
    });
  return { review, lignes };
}

/** Par notion : avant → pendant, ratures, calcul. */
function ParNotion({ b, rappels }: { b: BilanAtelier; rappels: Record<string, RappelNotion> }) {
  return (
    <ul className="m-0 grid list-none gap-0 divide-y divide-line p-0">
      {b.notions.map((n) => (
        <li key={n.notion} className="grid gap-1 py-3 first:pt-0 last:pb-0">
          <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold">
            {libelleDe(rappels, n.notion)}
            {n.tenue && <span className="t-micro font-semibold">{V.tenue}</span>}
          </p>
          <p className="t-small m-0 font-mono" title={V.avantPendantDetail(n.avant, n.pendant)}>
            {n.pendant.n > 0 ? V.avantPendant(n.avant, n.pendant) : V.sansQuestion}
          </p>
          {(n.ratures.avant > 0 || n.ratures.apres > 0) && (
            <div className="t-small flex flex-wrap items-baseline gap-x-1.5 font-mono">
              {n.ratures.rayees > 0 ? (
                <>
                  <span>{V.raturesMot}</span>
                  <CompteurBarre avant={n.ratures.avant} apres={n.ratures.apres} taille={20} />
                </>
              ) : (
                <span>{V.ratures(n.ratures.avant, n.ratures.apres)}</span>
              )}
              {(n.ratures.rayees > 0 || n.ratures.nouvelles > 0) && (
                <span className="text-muted">({[n.ratures.rayees > 0 ? V.rayees(n.ratures.rayees) : null, n.ratures.nouvelles > 0 ? V.nouvelles(n.ratures.nouvelles) : null].filter(Boolean).join(", ")})</span>
              )}
            </div>
          )}
          {n.calcul && <p className="t-small m-0 font-mono">{V.calcul(n.calcul.avant, n.calcul.pendant, n.calcul.niveau)}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Le prochain pas : le chapitre audio de la notion à revoir d'abord, et le prochain Atelier conseillé. */
function ProchainPas({ b, rappels }: { b: BilanAtelier; rappels: Record<string, RappelNotion> }) {
  const r = b.aRevoir ? rappels[b.aRevoir] : null;
  return (
    <div className="grid gap-1.5">
      {r && (
        <Link href={r.cours.href} className={"ink-link inline-flex w-fit items-start gap-1.5 text-[14px] font-semibold " + TOUCHER}>
          <Headphones size={15} aria-hidden className="mt-[3px] shrink-0" />
          <span>
            {V.prochainPas(r.titre)}
            {r.cours.debut && r.cours.minutes !== null && <span className="ml-1.5 font-mono font-normal text-muted">{V.coursDetail(r.cours.debut, r.cours.minutes)}</span>}
          </span>
        </Link>
      )}
      <p className="t-small m-0">{V.prochainAtelier(b.prochain)}</p>
    </div>
  );
}

/** Bilan final (après clôture). */
export function AtelierBilan({
  seance,
  reponses,
  cloture,
  rappels,
  traits,
  ajoutes,
  onAutre,
}: {
  seance: SeanceAtelier;
  reponses: Reponse[];
  cloture: ClotureAtelier | null;
  rappels: Record<string, RappelNotion>;
  /** traits du jour lus par le serveur (anneau) */
  traits: number | null;
  /** traits posés par cet écran */
  ajoutes: number;
  onAutre: () => void;
}) {
  const jour = useTraitsDuJour(traits);
  const b = calculerBilan({ notions: seance.notions, items: seance.items, reponses }, seance.avant, cloture?.apres ?? null);
  const { review, lignes } = revue(seance.items, reponses, rappels);
  const matieres: MatiereCopie[] = seance.notions.map((n) => {
    const x = b.notions.find((y) => y.notion === n);
    const calc = x?.calcul?.pendant ?? { n: 0, ok: 0 };
    return { label: libelleDe(rappels, n), ok: (x?.pendant.ok ?? 0) + calc.ok, total: (x?.pendant.n ?? 0) + calc.n };
  });
  const minutes = Math.max(1, Math.round((cloture?.secondes ?? seance.secondes) / 60));
  const xp = cloture?.xp ?? 0;
  return (
    <div className="mx-auto grid w-full max-w-[820px] gap-5">
      <FinDeSession
        epreuve={V.epreuve(minutes, b.score, b.total)}
        titre={seance.notions.map((n) => libelleDe(rappels, n)).join(", ")}
        score={b.score}
        total={b.total}
        review={review}
        lignes={lignes}
        matieres={matieres.filter((m) => m.total > 0)}
        jour={jour}
        ajoutes={ajoutes}
        liens={
          <>
            <button type="button" className={"ink-link text-[14px] font-semibold " + TOUCHER} onClick={onAutre}>
              {V.autre}
            </button>
            <Link href="/entrainement" className={"ink-link text-[14px] font-semibold " + TOUCHER}>
              {V.revenir}
            </Link>
          </>
        }
      />
      <section className="card grid gap-4 p-5 md:p-7" aria-label={V.parNotion}>
        <p className="t-eyebrow m-0">{V.parNotion}</p>
        <ParNotion b={b} rappels={rappels} />
        <div className="grid gap-1 border-t border-line pt-4">
          {b.retest.n > 0 && <p className="t-small m-0">{V.retest(b.retest.ok, b.retest.n)}</p>}
          {xp > 0 && <p className="t-small m-0">{V.xpGagne(xp)}</p>}
        </div>
        <ProchainPas b={b} rappels={rappels} />
      </section>
    </div>
  );
}

/** L'heure jusqu'à laquelle l'Atelier se reprend (24 heures après la dernière réponse), calculée dans le navigateur. */
function useHeureReprise(vuAt: string | null) {
  const [heure, setHeure] = useState<string | null>(null);
  useEffect(() => {
    const t = vuAt ? Date.parse(vuAt) : Date.now();
    const fin = new Date((Number.isFinite(t) ? t : Date.now()) + 24 * 3600_000);
    setHeure(fin.toLocaleString("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit" }));
  }, [vuAt]);
  return heure;
}

/** À l'arrêt : le bilan partiel, « Reprendre » et « Clore et voir le bilan ». */
export function AtelierPause({
  seance,
  reponses,
  rappels,
  vuAt,
  envoi,
  onReprendre,
  onClore,
}: {
  seance: SeanceAtelier;
  reponses: Reponse[];
  rappels: Record<string, RappelNotion>;
  vuAt: string | null;
  envoi: boolean;
  onReprendre: () => void;
  onClore: () => void;
}) {
  const heure = useHeureReprise(vuAt);
  const b = calculerBilan({ notions: seance.notions, items: seance.items, reponses }, seance.avant, null);
  return (
    <div className="mx-auto grid w-full max-w-[720px] gap-4">
      <section className="card-hero rl-in grid gap-5 p-6 md:p-8" aria-label={V.pauseTitre}>
        <div className="grid gap-1.5">
          <p className="t-eyebrow m-0">{V.partiel}</p>
          <h2 className="t-h1 m-0">{V.pauseTitre}</h2>
          <p className="t-small m-0">{heure ? V.pauseTexte(heure) : V.pauseTexteSansHeure}</p>
        </div>
        <ParNotion b={b} rappels={rappels} />
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" className="btn btn-primary rl-press min-h-[44px]" onClick={onReprendre} autoFocus>
            {V.reprendreCourt} <ArrowRight size={16} aria-hidden />
          </button>
          {reponses.length > 0 && (
            <button type="button" className="btn btn-secondary min-h-[44px]" onClick={onClore} disabled={envoi}>
              {V.clore}
            </button>
          )}
        </div>
      </section>
      <Link href="/entrainement" className={"ink-link w-fit px-1 text-[14px] font-semibold " + TOUCHER}>
        {V.revenir}
      </Link>
    </div>
  );
}

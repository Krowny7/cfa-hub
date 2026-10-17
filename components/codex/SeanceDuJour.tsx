"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { codexSeanceAutre, codexSeanceBudget, codexSeanceFinir, codexSeanceLancer, codexSeanceVue } from "@/lib/codex/actions";
import { EVENEMENT_CODEX_POINT } from "@/lib/codex/panneau";
import { BUDGETS } from "@/lib/codex/reglage";
import { blocSuivant, budgetSuivant, etapeSeance, rangEnCours, type GainSeance } from "@/lib/codex/seance-etat";
import type { GenreBloc, VueSeance } from "@/lib/codex/seance";
import type { Budget } from "@/lib/codex/types";
import { JaugePinceau } from "@/components/codex/JaugePinceau";
import { AnnonceTrophee } from "@/components/trophees/AnnonceTrophee";
import { marqueIci, noterSeanceIci, poserMarqueIci, seanceIci } from "@/components/codex/seance-ici";
import e from "./Encre.module.css";
import s from "./SeanceDuJour.module.css";

// La séance du jour (V3 §6.3 à §6.5) : le temps que le joueur se donne
// (« J'ai [15] [30] [60] [90] min ») devenu deux à quatre blocs concrets,
// chacun avec sa durée et sa raison chiffrée (lib/codex/seance.ts), et UN
// geste principal : « Commencer », puis « Continuer · 2/3 », puis, tous les
// blocs faits, « Ce que ça a fait avancer » avec « C'est assez pour
// aujourd'hui » ou « Encore un bloc ? ». Un bloc se coche tout seul quand
// ses compteurs le disent (les 5 et les 30 du jour se cochent aussi en haut
// de l'accueil).
//   compact  l'accueil, SOUS les 30 et les 5 du jour (qui gardent leur place) :
//            raisons sur une ligne, pas de « Une autre idée ? », les gains
//            en texte seul (« FSA 48 % → 52 % »), sans jauge
//   plein    en tête de /codex : raisons entières, « Une autre idée ? » par
//            bloc à faire, « J'arrête là »
// Sans la table codex_seances, « Commencer » et « J'arrête là » se gardent
// dans ce navigateur (components/codex/seance-ici.ts). `demo` : aperçus,
// aucune action serveur.

const TEXTES = {
  titre: "Ta séance du jour",
  budget: "Le temps que tu te donnes aujourd'hui",
  commencer: "Commencer",
  continuer: (rang: number, total: number) => `Continuer · ${rang}/${total}`,
  arreter: "J'arrête là",
  autre: "Une autre idée ?",
  tenue: "Séance tenue",
  avancer: "Ce que ça a fait avancer",
  regularite: "Séance tenue. La régularité, c'est déjà la moitié du travail.",
  assez: "C'est assez pour aujourd'hui",
  encore: "Encore un bloc ?",
  close: "Séance close pour aujourd'hui. À demain.",
  plusRien: "Plus d'autre idée pour aujourd'hui : garde celle-ci, ou change ton temps.",
  oups: "Ça n'a pas pris. Réessaie dans un instant.",
} as const;
/** Les textes de la séance, repris par le fil de /codex. */
export const TEXTES_SEANCE = TEXTES;

const signaler = () => {
  try {
    window.dispatchEvent(new Event(EVENEMENT_CODEX_POINT));
  } catch {
    // vieux navigateur : la pastille se relira à la page suivante
  }
};

const minutes = (m: number) => `${m} min`;

/**
 * L'état de la séance et ses gestes (« Commencer », le temps, « Une autre
 * idée ? », « J'arrête là »), partagés par cette carte et le fil de /codex
 * (components/codex/Fil.tsx). Sans la base, ce navigateur garde « lancée » et
 * « finie » ; la trace « vue » part une fois par jour.
 */
export function useSeanceDuJour(depart: VueSeance, demo: boolean) {
  const router = useRouter();
  const [seance, setSeance] = useState(depart);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, demarrer] = useTransition();
  const jour = seance.jour;

  useEffect(() => setSeance(depart), [depart]);

  // sans la base : ce que ce navigateur a noté aujourd'hui ; et la trace « vue », une fois par jour
  useEffect(() => {
    if (demo) return;
    if (!depart.gardee) {
      const ici = seanceIci(jour);
      if (ici) setSeance((x) => ({ ...x, lancee: true, lanceeLe: x.lanceeLe ?? new Date().toISOString(), ...(ici === "finie" ? { finie: true, finieLe: x.finieLe ?? new Date().toISOString() } : {}) }));
    }
    if (!marqueIci("vue", jour)) {
      void codexSeanceVue().then((ok) => ok && poserMarqueIci("vue", jour), () => undefined);
    }
    // une fois, au montage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const etape = etapeSeance(seance);
  const suivant = blocSuivant(seance);
  const { rang, total } = rangEnCours(seance);

  const commencer = () =>
    demarrer(async () => {
      setMessage(null);
      const maintenant = new Date().toISOString();
      if (demo) {
        setSeance((x) => ({ ...x, lancee: true, lanceeLe: maintenant }));
        return;
      }
      let premier = suivant;
      const r = await codexSeanceLancer().catch(() => null);
      if (r?.ok && r.seance) {
        setSeance(r.seance);
        premier = blocSuivant(r.seance) ?? premier;
      } else setSeance((x) => ({ ...x, lancee: true, lanceeLe: x.lanceeLe ?? maintenant }));
      // la base ne la garde pas : ce navigateur s'en souvient (la séance compte quand même, sur la journée)
      if (!r?.ok || !r.gardee) noterSeanceIci(jour, "lancee");
      signaler();
      if (premier) router.push(premier.destination.href);
    });

  const choisirBudget = (b: Budget) =>
    demarrer(async () => {
      setMessage(null);
      if (b === seance.budget) return;
      if (demo) {
        setSeance((x) => ({ ...x, budget: b }));
        return;
      }
      const r = await codexSeanceBudget(b).catch(() => null);
      if (r?.ok && r.seance) setSeance(r.seance);
      else if (!r?.ok) setMessage(TEXTES.oups);
      signaler();
    });

  const autre = (genre: GenreBloc) =>
    demarrer(async () => {
      setMessage(null);
      if (demo) {
        setSeance((x) => ({ ...x, blocs: x.blocs.filter((b) => b.genre !== genre) }));
        return;
      }
      const r = await codexSeanceAutre(genre).catch(() => null);
      if (r?.ok && r.seance?.blocs.length) setSeance(r.seance);
      else setMessage(r?.ok ? TEXTES.plusRien : TEXTES.oups);
      signaler();
    });

  const finir = () =>
    demarrer(async () => {
      setMessage(null);
      const maintenant = new Date().toISOString();
      const r = demo ? null : await codexSeanceFinir().catch(() => null);
      setSeance((x) => {
        const y = r?.ok && r.seance ? r.seance : x;
        return { ...y, finie: true, finieLe: y.finieLe ?? maintenant };
      });
      if (!demo) {
        if (!r?.ok || !r.gardee) noterSeanceIci(jour, "finie");
        signaler();
      }
    });

  const encore = budgetSuivant(seance.budget);

  return { seance, message, occupe, etape, suivant, rang, total, encore, commencer, choisirBudget, autre, finir };
}

export function SeanceDuJour({ seance: depart, entete, gains, mode, demo = false }: { seance: VueSeance; entete: string; gains: GainSeance[]; mode: "compact" | "plein"; demo?: boolean }) {
  const { seance, message, occupe, etape, suivant, rang, total, encore, commencer, choisirBudget, autre, finir } = useSeanceDuJour(depart, demo);
  const plein = mode === "plein";

  return (
    <section aria-label={TEXTES.titre} data-leonard="seance" className={`card rl-in ${e.carnet} ${plein ? "" : s.compact} flex min-w-0 flex-col gap-3 p-5 md:p-6`} style={{ animationDelay: ".1s" }}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="t-h3 m-0">{TEXTES.titre}</h2>
          {entete && <p className="t-micro m-0 mt-0.5">{entete}</p>}
        </div>
        {etape !== "close" && (
          <div className={s.budget} role="group" aria-label={TEXTES.budget}>
            <span>J&apos;ai</span>
            {BUDGETS.map((b) => (
              <button key={b} type="button" aria-label={`${b} minutes`} aria-pressed={seance.budget === b} disabled={occupe} onClick={() => choisirBudget(b)}>
                {b}
              </button>
            ))}
            <span>min</span>
          </div>
        )}
      </div>

      <ol className={s.blocs}>
        {seance.blocs.map((b, i) => {
          const fait = seance.faits.includes(b.genre);
          const enCours = !fait && suivant?.genre === b.genre && etape === "enCours";
          return (
            <li key={b.genre} className={`${s.bloc} ${fait ? s.fait : ""} ${enCours ? s.encours : ""}`}>
              <span className={s.rang} aria-hidden>
                {fait ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <div className={s.corps}>
                <Link href={b.destination.href} className={s.titre}>
                  {b.titre}
                  <span className={s.duree}>{minutes(b.duree)}</span>
                  {fait && <span className="sr-only">, fait</span>}
                </Link>
                {b.raison && <p className={s.raison}>{b.raison}</p>}
              </div>
              {plein && !fait && etape !== "close" && (
                <button type="button" className={s.autre} disabled={occupe} onClick={() => autre(b.genre)}>
                  {TEXTES.autre}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {message && (
        <p role="status" className="t-small m-0">
          {message}
        </p>
      )}

      {etape === "proposee" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" className="btn btn-primary rl-press min-h-[44px] w-full sm:w-fit" disabled={occupe} onClick={commencer}>
            {TEXTES.commencer} <ArrowRight size={16} aria-hidden />
          </button>
          <span className="t-micro">{minutes(seance.duree)} en tout</span>
        </div>
      )}

      {etape === "enCours" && suivant && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href={suivant.destination.href} className="btn btn-primary rl-press min-h-[44px] w-full sm:w-fit">
            {TEXTES.continuer(rang, total)} <ArrowRight size={16} aria-hidden />
          </Link>
          {plein && (
            <button type="button" className={s.autre} disabled={occupe} onClick={finir}>
              {TEXTES.arreter}
            </button>
          )}
        </div>
      )}

      {etape === "tenue" && <FinDeSeance gains={gains} lanceeLe={seance.lanceeLe} demo={demo} occupe={occupe} jauge={plein} onAssez={finir} onEncore={encore ? () => choisirBudget(encore) : null} />}

      {etape === "close" && (
        <>
          {gains.length > 0 && <ListeGains gains={gains} jauge={plein} />}
          <p className="t-small m-0">{TEXTES.close}</p>
        </>
      )}
    </section>
  );
}

/** Les gains de la séance ; `jauge` : la jauge repassée au pinceau sous chacun (pas sur l'accueil : le texte seul). */
export function ListeGains({ gains, jauge = true }: { gains: GainSeance[]; jauge?: boolean }) {
  return (
    <ul className={s.gains}>
      {gains.map((g) => (
        <li key={g.cle}>
          <span>{g.texte}</span>
          {jauge && <JaugePinceau fraction={g.fraction} className={s.jauge} />}
        </li>
      ))}
    </ul>
  );
}

/**
 * La fin d'une séance tenue (V3 §6.5) : les plus grands gains depuis le
 * lancement (trois lignes au plus, la jauge repassée au pinceau), les
 * trophées gagnés pendant la séance, puis « C'est assez pour aujourd'hui »
 * (la séance se clôt) ou « Encore un bloc ? » (le budget du dessus). Rien de
 * mesurable : la régularité, déjà. Aussi montrée en fin d'outil (FeteCodex).
 */
export function FinDeSeance({
  gains,
  lanceeLe,
  occupe = false,
  demo = false,
  jauge = true,
  plein = true,
  onAssez,
  onEncore,
}: {
  gains: GainSeance[];
  lanceeLe: string | null;
  occupe?: boolean;
  demo?: boolean;
  /** la jauge sous chaque gain (false : texte seul, l'accueil) */
  jauge?: boolean;
  /** faux : « C'est assez » en contour (un autre bouton plein tient l'écran, « Tout récupérer ») */
  plein?: boolean;
  onAssez: () => void;
  onEncore: (() => void) | null;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3" aria-live="polite">
      {gains.length > 0 ? (
        <>
          <div>
            <p className="t-eyebrow m-0">{TEXTES.tenue}</p>
            <p className="t-h3 m-0 mt-0.5">{TEXTES.avancer}</p>
          </div>
          <ListeGains gains={gains} jauge={jauge} />
        </>
      ) : (
        <p className="t-h3 m-0">{TEXTES.regularite}</p>
      )}
      {lanceeLe && !demo && <AnnonceTrophee depuis={lanceeLe} />}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={`btn ${plein ? "btn-primary" : "btn-secondary"} rl-press min-h-[44px] w-full sm:w-fit`} disabled={occupe} onClick={onAssez}>
          {TEXTES.assez}
        </button>
        {onEncore && (
          <button type="button" className="btn btn-secondary rl-press min-h-[44px] w-full sm:w-fit" disabled={occupe} onClick={onEncore}>
            {TEXTES.encore}
          </button>
        )}
      </div>
    </div>
  );
}

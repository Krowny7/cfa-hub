"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BilanCodex, FeteCodex as Fete } from "@/lib/codex/bilan";
import { codexPoint, codexRetroVue, codexSeanceBudget, codexSeanceFinir, codexVus } from "@/lib/codex/actions";
import { EVENEMENT_CODEX_POINT } from "@/lib/codex/panneau";
import { budgetSuivant } from "@/lib/codex/seance";
import { signalerLeonard } from "@/lib/leonard/signal";
import { resteCeremonie } from "@/lib/ceremonie-en-cours";
import { CODEX } from "@/lib/voice-codex";
import { Sceau } from "@/components/codex/Sceau";
import { annoncerDevoile } from "@/components/codex/annoncer";
import { FinDeSeance } from "@/components/codex/SeanceDuJour";
import { marqueIci, noterSeanceIci, poserMarqueIci } from "@/components/codex/seance-ici";
import e from "./Encre.module.css";
import s from "./Codex.module.css";

// La petite cérémonie du Codex, posée là où le joueur est : en fin de séance
// (CeremonieSceaux l'appelle), sur l'accueil et sur /codex. Elle fête les
// quêtes tamponnées (le sceau se pose avec un coup de tampon, une carte par
// grande étape, les petites en une ligne), annonce l'acte qui s'ouvre (et
// Léonard dit sa réplique), puis « Léonard a feuilleté ton carnet » pour les
// comptes existants, une seule fois. Rien n'est lourd : une carte, pas un
// plein écran. Chaque fanfare n'est jouée qu'une fois (codexVus).
//
// En fin d'outil, si ce dernier bloc vient de tenir la séance du jour : « Ce
// que ça a fait avancer » (V3 §6.5), une fois par jour, avec « C'est assez
// pour aujourd'hui » ou « Encore un bloc ? ». Après chaque point, l'événement
// rl:codex-point dit à la pastille de la barre du haut de relire la séance.
//
// `initial` : le bilan déjà lu côté serveur (accueil, /codex). Sans lui
// (fin de séance), le composant demande le point au serveur après `attenteMs`,
// le temps que les réponses de la séance soient enregistrées. `persister` :
// écrire le dévoilement dans le compte (le rendu serveur ne le peut pas).
// `demo` : aperçus, aucune action serveur.

const ATTENTE_PAR_DEFAUT = 1800;

export function FeteCodex({
  initial,
  persister = false,
  attenteMs = ATTENTE_PAR_DEFAUT,
  demo = false,
  className = "",
}: {
  initial?: BilanCodex;
  persister?: boolean;
  attenteMs?: number;
  demo?: boolean;
  className?: string;
}) {
  const [bilan, setBilan] = useState<BilanCodex | null>(initial ?? null);
  const [retroVue, setRetroVue] = useState(false);
  const [finVue, setFinVue] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const carte = useRef<HTMLElement | null>(null);
  const joue = useRef(false);

  // le point au serveur : fin de séance (rien en main), ou écrire le dévoilement
  useEffect(() => {
    if (demo) return;
    let fini = false;
    const besoin = !initial || persister || (initial.devoile?.nouveaux.length ?? 0) > 0;
    if (!besoin) return;
    const t = window.setTimeout(async () => {
      let b: BilanCodex | null = null;
      try {
        // l'accueil vient de calculer (initial) : la vue gardée suffit, seul le dévoilement s'écrit
        b = await codexPoint(initial ? { recalcul: false } : undefined);
      } catch {
        b = null;
      }
      // la pastille « Continuer » relit la séance (le bloc suivant se déduit des objectifs)
      try {
        window.dispatchEvent(new Event(EVENEMENT_CODEX_POINT));
      } catch {
        // la pastille se relira à la page suivante
      }
      if (fini || !b || !b.disponible) return;
      // le dévoilement : l'onglet s'encre, Léonard dit sa réplique (comptes neufs seulement)
      if (b.devoile) annoncerDevoile(b.devoile.devoile, b.devoile.nouveaux);
      // en fin de séance, c'est le bilan frais qui fait foi ; sinon on garde ce que le serveur a déjà rendu
      if (!initial) setBilan(b);
    }, initial ? 400 : attenteMs);
    return () => {
      fini = true;
      window.clearTimeout(t);
    };
    // une fois, au montage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetes = bilan?.fetes ?? [];
  const acte = bilan?.acteNouveau ?? null;
  const aFeter = fetes.length > 0;

  // la fanfare : Léonard (une apparition), puis « vu » côté serveur
  useEffect(() => {
    if (!bilan || !aFeter || joue.current) return;
    joue.current = true;
    const premier = fetes[0];
    if (acte) {
      signalerLeonard({ evt: "acte-nouveau", replique: acte.replique, delai: 2200 }, `acte:${acte.id}`);
    } else {
      signalerLeonard({ evt: "quete-faite", delai: 2200 }, `quete:${premier.quete}:${premier.periode}`);
    }
    if (!demo) {
      const t = window.setTimeout(() => {
        codexVus(fetes.map((f) => f.quete)).catch(() => undefined);
      }, 1500);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bilan]);

  const retro = bilan?.retro && !retroVue ? bilan.retro : null;
  useEffect(() => {
    // « Léonard a feuilleté ton carnet » : il le dit une fois, quand l'écran est posé
    if (!retro) return;
    const reste = resteCeremonie();
    const t = window.setTimeout(() => signalerLeonard({ evt: "carnet", replique: { texte: "J’ai feuilleté ton carnet. Il y avait déjà de belles pages. Regarde ce que j’ai tamponné.", pose: "fier" }, delai: 800 }, "carnet-feuillete"), reste + 1200);
    return () => window.clearTimeout(t);
  }, [retro]);

  // la séance tenue : fêtée une fois par jour, en fin d'outil seulement (l'accueil et /codex la montrent dans leur carte)
  const finSeance = !initial && !finVue && bilan?.seance ? bilan.seance : null;
  useEffect(() => {
    if (finSeance && !demo && marqueIci("fetee", finSeance.jour)) setFinVue(true);
  }, [finSeance, demo]);
  const clore = (encore: boolean) => {
    if (!finSeance) return;
    setOccupe(true);
    if (!demo) poserMarqueIci("fetee", finSeance.jour);
    const suite = encore ? budgetSuivant(finSeance.budget) : null;
    const geste = demo ? Promise.resolve(null) : suite ? codexSeanceBudget(suite) : codexSeanceFinir();
    void geste
      .then((r) => {
        if (!demo && !encore && (!r?.ok || !("gardee" in r) || !r.gardee)) noterSeanceIci(finSeance.jour, "finie");
        try {
          window.dispatchEvent(new Event(EVENEMENT_CODEX_POINT));
        } catch {
          // rien
        }
      })
      .catch(() => undefined)
      .finally(() => {
        setOccupe(false);
        setFinVue(true);
      });
  };

  if (!aFeter && !retro && !finSeance) return null;
  const grandes = fetes.slice(0, 2);
  const autres = fetes.length - grandes.length;

  return (
    <div className={"flex flex-col gap-3 " + className}>
      {finSeance && (
        <section aria-label="La séance du jour" className={`${s.fete} ${e.carnet}`}>
          <div className="min-w-0 flex-1">
            <FinDeSeance gains={finSeance.gains} lanceeLe={finSeance.lanceeLe} demo={demo} occupe={occupe} onAssez={() => clore(false)} onEncore={budgetSuivant(finSeance.budget) ? () => clore(true) : null} />
          </div>
        </section>
      )}
      {retro && (
        <section aria-live="polite" className={s.fete}>
          <div className="shrink-0">
            <Sceau l={{ etat: "terminee", fraction: 1, affichage: "complet", retro: true }} taille={64} neuf />
          </div>
          <div className="min-w-0">
            <p className="t-eyebrow m-0">{CODEX.nom}</p>
            <p className="t-h2 m-0">{CODEX.retro.titre}</p>
            <p className="t-small m-0 mt-1">
              {CODEX.retro.ligne(retro.quetes, retro.xp)}
              {retro.actes.length ? ` ${CODEX.retro.actes(retro.actes.length)}.` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/codex" className="btn btn-secondary rl-press min-h-[44px]">
                {CODEX.fete.suite} <ArrowRight size={16} aria-hidden />
              </Link>
              <button
                type="button"
                className="btn rl-press min-h-[44px]"
                onClick={() => {
                  setRetroVue(true);
                  if (!demo) codexRetroVue().catch(() => undefined);
                }}
              >
                {CODEX.retro.ok}
              </button>
            </div>
          </div>
        </section>
      )}
      {aFeter && (
        <section ref={carte} aria-live="polite" className={s.fete}>
          <div className="shrink-0">
            <Sceau l={{ etat: "terminee", fraction: 1, affichage: "complet", retro: false }} taille={64} neuf />
          </div>
          <div className="min-w-0">
            <p className="t-eyebrow m-0">{acte ? CODEX.fete.acte : CODEX.fete.quete}</p>
            {grandes.map((f) => (
              <LigneFete key={f.quete + f.periode} f={f} />
            ))}
            {autres > 0 && <p className="t-micro m-0 mt-1">{CODEX.fete.autres(autres)}</p>}
            {acte && <p className="t-small m-0 mt-1">{CODEX.fete.acteNouveau(acte.titre)}</p>}
            <Link href="/codex" className="btn btn-secondary rl-press mt-3 min-h-[44px] w-fit">
              {CODEX.fete.suite} <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function LigneFete({ f }: { f: Fete }) {
  return (
    <p className="m-0 mt-0.5 text-[16px] font-bold leading-tight tracking-[-0.012em] [overflow-wrap:anywhere]">
      {f.titre}
      <span className="ml-2 text-[12.5px] font-medium tracking-normal text-muted">
        {f.xp > 0 ? `+${f.xp} XP` : ""}
        {f.recompense ? `${f.xp > 0 ? " · " : ""}${f.recompense}` : ""}
      </span>
    </p>
  );
}

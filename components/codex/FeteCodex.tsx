"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BilanCodex } from "@/lib/codex/bilan";
import { codexPoint, codexRetroVue, codexSeanceBudget, codexSeanceFinir } from "@/lib/codex/actions";
import { EVENEMENT_CODEX_POINT, cheminDe } from "@/lib/codex/panneau";
import { TEXTES_RECUPERER } from "@/lib/codex/recuperer";
import { budgetSuivant } from "@/lib/codex/seance-etat";
import { signalerLeonard } from "@/lib/leonard/signal";
import { resteCeremonie } from "@/lib/ceremonie-en-cours";
import { CODEX } from "@/lib/voice-codex";
import { Sceau } from "@/components/codex/Sceau";
import { Recuperer } from "@/components/codex/Recuperer";
import { annoncerDevoile } from "@/components/codex/annoncer";
import { FinDeSeance } from "@/components/codex/SeanceDuJour";
import { marqueIci, noterSeanceIci, poserMarqueIci } from "@/components/codex/seance-ici";
import e from "./Encre.module.css";
import s from "./Codex.module.css";

// La petite cérémonie du Codex, posée là où le joueur est : en fin de séance
// (CeremonieSceaux l'appelle), sur l'accueil et sur /codex. Plus aucune fête
// automatique (Codex simplifié) : les quêtes faites attendent « Récupérer »,
// et leurs grandes fêtes se jouent au clic (components/codex/Recuperer).
//
// En fin d'outil : une ligne « 2 quêtes à récupérer · Récupérer +60 XP » (bouton
// contour, tampon compris), puis « La suite : … → », l'étape suivante de la
// séance du jour. Si ce dernier bloc vient de tenir la séance : « Ce que ça
// a fait avancer » (V3 §6.5), une fois par jour, avec « C'est assez pour
// aujourd'hui » ou « Encore un bloc ? ». Après chaque point, l'événement
// rl:codex-point dit à la barre du haut de relire le panneau.
// Partout : « Léonard a feuilleté ton carnet » pour les comptes existants,
// une seule fois (le rétroactif garde sa cérémonie), et le dévoilement.
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
      if (!initial) {
        // la séance tenue n'est fêtée qu'une fois par jour
        if (b.seance && marqueIci("fetee", b.seance.jour)) setFinVue(true);
        setBilan(b);
      }
    }, initial ? 400 : attenteMs);
    return () => {
      fini = true;
      window.clearTimeout(t);
    };
    // une fois, au montage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sobre = !!bilan?.sobre;
  // en fin d'outil seulement (l'accueil et /codex ont leur place pour « Récupérer ») : ce qui attend le clic, et la
  // suite, sauf si l'on y est déjà (sans `initial`, le bilan n'arrive qu'au navigateur : window est là)
  const aRecuperer = !initial ? (bilan?.aRecuperer ?? []) : [];
  const suite = !initial && bilan?.suite && cheminDe(bilan.suite.href) !== cheminDe(window.location.pathname) ? bilan.suite : null;

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
  const clore = (encore: boolean) => {
    if (!finSeance) return;
    setOccupe(true);
    if (!demo) poserMarqueIci("fetee", finSeance.jour);
    const plus = encore ? budgetSuivant(finSeance.budget) : null;
    const geste = demo ? Promise.resolve(null) : plus ? codexSeanceBudget(plus) : codexSeanceFinir();
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

  if (!aRecuperer.length && !suite && !retro && !finSeance) return null;

  return (
    <div className={"flex flex-col gap-3 " + className}>
      {(aRecuperer.length > 0 || suite) && (
        <section aria-label={CODEX.nom} className="card-quiet flex flex-col gap-1 px-4 py-2">
          {aRecuperer.length > 0 && bilan && <Recuperer variante="ligne" items={aRecuperer} jour={bilan.jour ?? ""} fait={bilan.fait} sobre={sobre} demo={demo} />}
          {suite && (
            <Link href={suite.href} className="t-small rl-press inline-flex min-h-[44px] w-fit items-center gap-1">
              {TEXTES_RECUPERER.suite(suite.titre)} <ArrowRight size={16} aria-hidden />
            </Link>
          )}
        </section>
      )}
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
              {sobre ? CODEX.retro.ligneSobre(retro.quetes) : CODEX.retro.ligne(retro.quetes, retro.xp)}
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
    </div>
  );
}


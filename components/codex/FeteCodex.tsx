"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { habitFete, tailleFete, type BilanCodex } from "@/lib/codex/bilan";
import { codexPoint, codexRetroVue, codexSeanceBudget, codexSeanceFinir, codexVus } from "@/lib/codex/actions";
import { EVENEMENT_CODEX_POINT } from "@/lib/codex/panneau";
import { budgetSuivant } from "@/lib/codex/seance-etat";
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
// quêtes tamponnées avec les quatre tailles de fête (components/fete, V3
// §3.10 ; tailleFete) : une ligne pour un contrat ou une étape, une carte
// pour un jalon (le tampon tombe sur la quête si la carte du Codex est à
// l'écran), une page qui se tourne pour un acte clos (Léonard y dit la
// réplique de l'acte qui s'ouvre), le plein cadre pour « Maître de… » ou le
// chef-d'œuvre. Trois fêtes au plus, l'une après l'autre ; en mode sobre,
// des lignes sans XP ni pièce. Puis « Léonard a feuilleté ton carnet » pour
// les comptes existants, une seule fois. Chaque fanfare n'est jouée qu'une
// fois (codexVus).
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
/** Au plus trois fêtes jouées l'une après l'autre ; la dernière dit combien d'autres quêtes sont tamponnées. */
export const MAX_FETES = 3;
/** Le temps que l'écran se pose avant la première fête (ms). */
const AVANT_FETE = 600;

// la fête elle-même : chargée au moment de fêter (elle tire le catalogue des pièces), jamais rendue côté serveur
const Fete = dynamic(() => import("@/components/fete/Fete").then((m) => m.Fete), { ssr: false });

/** La position de la quête sur la carte du Codex (data-quete), si elle est à l'écran : le tampon y tombe. */
function ancreDe(quete: string): { x: number; y: number } | null {
  try {
    const el = document.querySelector(`[data-quete="${CSS.escape(quete)}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.right < 0 || r.top > window.innerHeight || r.left > window.innerWidth) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  } catch {
    return null;
  }
}


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
  const joue = useRef(false);
  // la fête jouée : -1 avant la première, puis son rang parmi celles qu'on joue
  const [tour, setTour] = useState(-1);

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

  const fetes = bilan?.fetes ?? [];
  const acte = bilan?.acteNouveau ?? null;
  const aFeter = fetes.length > 0;
  const sobre = !!bilan?.sobre;
  const jouees = fetes.slice(0, MAX_FETES);

  // la fanfare : les fêtes l'une après l'autre (après une cérémonie en cours), Léonard, puis « vu » côté serveur
  useEffect(() => {
    if (!bilan || !aFeter || joue.current) return;
    joue.current = true;
    const premier = fetes[0];
    const depart = window.setTimeout(() => setTour(0), resteCeremonie() + AVANT_FETE);
    // la réplique de l'acte qui s'ouvre est dite sur la page qui se tourne ; sinon, Léonard passe la dire
    const surLaPage = !!acte && !!habitFete(premier, { sobre, acte, autres: 0 }).replique;
    if (acte && !surLaPage) {
      signalerLeonard({ evt: "acte-nouveau", replique: acte.replique, delai: 2200 }, `acte:${acte.id}`);
    } else if (!acte) {
      signalerLeonard({ evt: "quete-faite", delai: 2200 }, `quete:${premier.quete}:${premier.periode}`);
    }
    const vus = demo
      ? null
      : window.setTimeout(() => {
          codexVus(fetes.map((f) => f.quete)).catch(() => undefined);
        }, 1500);
    return () => {
      window.clearTimeout(depart);
      if (vus !== null) window.clearTimeout(vus);
    };
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

  const enCours = tour >= 0 && tour < jouees.length ? jouees[tour] : null;
  if (!enCours && !retro && !finSeance) return null;
  // la fête se pose par-dessus la page (position fixe) : elle ne prend aucune place dans la colonne
  const fete = enCours && (
    <Fete
      key={enCours.quete + enCours.periode}
      {...habitFete(enCours, { sobre, acte, autres: tour === jouees.length - 1 ? fetes.length - jouees.length : 0 })}
      ancre={tailleFete(enCours) === "carte" && !sobre ? ancreDe(enCours.quete) : null}
      onFin={() => setTour((t) => t + 1)}
    />
  );
  if (!retro && !finSeance) return fete;

  return (
    <div className={"flex flex-col gap-3 " + className}>
      {fete}
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


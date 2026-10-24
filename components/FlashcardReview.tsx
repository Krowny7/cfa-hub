"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Maximize2, Minimize2, RotateCcw, Shuffle } from "lucide-react";
import { codexNoter } from "@/lib/codex/actions";
import { loadSRS, saveSRS, applyReview, sortBySRS } from "@/lib/srs";
import { FinDePasse } from "@/components/session/FinDePasse";
import { useTraitsDuJour } from "@/components/session/useTraitsDuJour";
import { FichePile, type CarteVue, type Envol } from "@/components/flashcards/Pile";
import { BarreTour, Entracte, LegendeTour, LienOnePager, Reprise } from "@/components/flashcards/Panneaux";
import { useSynchroBoucle } from "@/components/flashcards/useSynchroBoucle";
import s from "@/components/flashcards/Revision.module.css";
import {
  aRevoir,
  aller as allerDans,
  bilan,
  boucleDuJoueur,
  carteCourante,
  choisirBoucle,
  demarrer,
  doitSynchroniser,
  ecrireBoucle,
  ecrireMelange,
  enCours,
  etatFige,
  horodatage,
  lireBoucle,
  lireMelange,
  marquer,
  phase,
  progression,
  reprendre,
  repere,
  tourSuivant,
  type EtatBoucle,
  type Geste,
} from "@/lib/flashcards/boucle";
import { lieuCarte } from "@/lib/flashcards/paquets";
import { annoncerBoucle, cleSet, lireLigne, type CompteBoucle, type LigneProgression } from "@/lib/flashcards/progression";
import { BOUCLE, FLASHCARDS } from "@/lib/voice-z3c";

// La révision d'un paquet de flashcards (ou de toute une matière) : une pile
// de fiches bristol, et la boucle « À revoir » (lib/flashcards/boucle.ts).
// Tour 1 : toutes les cartes ; chaque fin de tour avec des « À revoir » passe
// par un entracte, puis ces cartes seules reviennent, mélangées, jusqu'à
// zéro : « Tout est maîtrisé ». La boucle est gardée dans le navigateur (par
// paquet, ou par matière, au nom du joueur : celle d'un autre compte du même
// navigateur est écartée) et, si la page passe `compte`, sur le compte du
// joueur (flashcard_progress : téléphone et ordinateur) ; au retour, la plus
// récente des deux est proposée (appareilPrime) : on la reprend ou on
// recommence. Onglet resté ouvert pendant qu'on avançait ailleurs : le compte
// est relu au retour au premier plan, et la base refuse un geste bâti sur une
// version dépassée (useSynchroBoucle) ; la version du compte est alors
// proposée en reprise. Une boucle finie reste gardée (« Maîtrisé » dans les
// listes) ; « Recommencer » la remplace par une neuve. Seuls les gestes du
// joueur sont envoyés : ouvrir un paquet, ou feuilleter une boucle neuve avec
// ← →, n'efface rien (doitSynchroniser).
//
// La répétition espacée (lib/srs.ts) continue d'être écrite à chaque marque,
// pour LA PROCHAINE fois : elle ne réordonne jamais la séance en cours (un
// ordre recalculé en pleine passe faisait sauter des cartes). L'ordre du
// tour 1 est tiré une fois : répétition espacée pour un paquet, programme
// pour une matière, ou mélangé si l'option « Mélanger » est gardée.
//
// Raccourcis : Espace/Entrée retourne, ← → naviguent, 1 = à revoir,
// 2 = maîtrisée, Entrée passe l'entracte, Échap quitte le plein écran.

export type FlashcardCard = {
  id: string;
  front: string;
  back: string;
  /** le paquet de la carte (révision d'une matière) : sa répétition espacée */
  setId?: string | null;
  /** le thème de son paquet, pour l'en-tête de la fiche */
  theme?: string | null;
};

/** Aperçu uniquement : ouvre la révision dans un état donné. */
export type FlashcardDemo = {
  /** la carte à l'écran (index dans la file du tour) */
  index?: number;
  flipped?: boolean;
  /** tour bouclé : les cartes sans marque sont comptées maîtrisées */
  done?: boolean;
  marks?: Record<string, boolean>;
  fullscreen?: boolean;
  /** tour en cours (défaut 1) et sa file (défaut : toutes les cartes) */
  tour?: number;
  file?: string[];
  /** tailles des tours, marques du tour 1, temps actif : le bilan final */
  parcours?: number[];
  premier?: Record<string, boolean>;
  dureeMs?: number;
  /** l'écran de reprise d'une boucle entamée (il y a `depuisMs`) */
  reprise?: boolean;
  depuisMs?: number;
  /** la carte d'avant, arrêtée en plein envol avec son tampon */
  envol?: "su" | "revoir";
};

type Mode = "fantome" | "reprise" | "carte" | "entracte" | "fin";

const HAUTEUR = "h-[clamp(370px,60vh,540px)]";
const a = (o: Record<string, boolean>, id: string) => Object.prototype.hasOwnProperty.call(o, id);

function etatDemo(cards: FlashcardCard[], d: FlashcardDemo): EtatBoucle {
  const ids = cards.map((c) => c.id);
  const file = d.file ?? ids;
  const marques = { ...(d.marks ?? {}) };
  if (d.done) for (const id of file) if (!a(marques, id)) marques[id] = true;
  return etatFige({ ids, tour: d.tour, file, marques, premier: d.premier, pos: d.done ? undefined : d.index, parcours: d.parcours, dureeMs: d.dureeMs });
}

export function FlashcardReview({
  cards,
  setId,
  cle,
  traitsJour = null,
  matiere,
  matiereNom,
  theme,
  onePager = null,
  autresHref = "/flashcards",
  ordre = "srs",
  compte = null,
  joueur = null,
  demo,
}: {
  cards: FlashcardCard[];
  /** le paquet : sa répétition espacée et, par défaut, la clé de sa boucle */
  setId?: string;
  /** clé de la boucle gardée (sinon setId) : « matiere:fixed_income » pour une matière */
  cle?: string;
  /** traits du jour lus par le serveur : le sceau du jour en fin de boucle si la journée est tenue */
  traitsJour?: number | null;
  /** la matière (clé du programme), si elle est connue : pour le Codex */
  matiere?: string;
  /** nom de la matière pour l'en-tête des fiches (« Fixed Income ») */
  matiereNom?: string | null;
  /** thème du paquet (sinon celui de chaque carte) */
  theme?: string | null;
  /** URL du one-pager de la matière (fin de boucle) */
  onePager?: string | null;
  /** « Autres paquets » en fin de boucle */
  autresHref?: string;
  /** ordre du tour 1 sans mélange : répétition espacée du paquet, ou l'ordre reçu (programme) */
  ordre?: "srs" | "programme";
  /** la boucle sur le compte (clé et ligne lue par la page) ; absent : sur l'appareil seulement */
  compte?: CompteBoucle | null;
  /** le joueur connecté : la boucle gardée sur l'appareil est à son nom */
  joueur?: string | null;
  demo?: FlashcardDemo;
}) {
  const jour = useTraitsDuJour(traitsJour);
  const cleStock = demo ? null : (cle ?? setId ?? null);
  const { planifier, horodater, connaitre, relire } = useSynchroBoucle(demo ? null : (compte?.cle ?? null), prendreDuCompte);
  // la clé de la boucle sur le compte, aussi pour la pastille de l'en-tête (EtatPaquetVivant)
  const cleCompte = demo ? null : (compte?.cle ?? cle ?? (setId ? cleSet(setId) : null));
  const ids = useMemo(() => cards.map((c) => c.id), [cards]);
  const parId = useMemo(() => new Map(cards.map((c, i) => [c.id, { c, n: i + 1 }])), [cards]);

  function vue(id: string): CarteVue | null {
    const x = parId.get(id);
    if (!x) return null;
    return { id, front: x.c.front, back: x.c.back, lieu: lieuCarte(matiereNom, x.c.theme ?? theme), numero: BOUCLE.numero(x.n, cards.length) };
  }

  // Avant la lecture du navigateur (boucle gardée, préférence de mélange,
  // répétition espacée), rien n'est tiré : une fiche blanche à la bonne
  // taille, puis l'état réel au montage. Le rendu serveur et le premier rendu
  // du navigateur restent identiques.
  const [etat, setEtat] = useState<EtatBoucle | null>(() => (demo && !demo.reprise ? etatDemo(cards, demo) : null));
  const [reprise, setReprise] = useState<EtatBoucle | null>(() => (demo?.reprise ? etatDemo(cards, demo) : null));
  const [verso, setVerso] = useState(demo?.flipped ?? false);
  const [lever, setLever] = useState(0);
  const [plein, setPlein] = useState(demo?.fullscreen ?? false);
  const [melange, setMelange] = useState(false);
  const [focusEntracte, setFocusEntracte] = useState(false);
  const envolCle = useRef(1);
  const [envols, setEnvols] = useState<Envol[]>(() => {
    if (!demo?.envol || demo.reprise) return [];
    const e0 = etatDemo(cards, demo);
    const avant = e0.file[Math.max(0, Math.min(e0.pos, e0.file.length) - 1)];
    const v = avant ? vue(avant) : null;
    return v ? [{ cle: 0, carte: v, su: demo.envol === "su", dx: 0, fige: true }] : [];
  });

  function ordreDeBase(): string[] {
    if (ordre === "srs" && setId) {
      try {
        return sortBySRS(cards, loadSRS(setId)).map((c) => c.id);
      } catch {
        // pas de répétition espacée lisible : l'ordre du paquet
      }
    }
    return ids;
  }
  const nouvelle = (m: boolean) => demarrer(m ? ids : ordreDeBase(), { melanger: m });

  /** La boucle gardée sur l'appareil, au nom du joueur. */
  const aSonNom = (e: EtatBoucle): EtatBoucle => (joueur ? { ...e, u: joueur } : e);

  /**
   * Un geste du joueur change la boucle. S'il compte (doitSynchroniser), elle
   * est horodatée au-delà de la version connue du compte (pour départager
   * l'appareil et le compte), gardée, et envoyée sur le compte (tout de suite
   * en fin de tour ou de boucle, sinon après 1,5 s sans geste) ; sinon (← →
   * dans une boucle neuve), elle change à l'écran seulement.
   */
  function changer(suite: EtatBoucle, geste: Geste): EtatBoucle {
    if (!doitSynchroniser(geste, suite)) {
      setEtat(suite);
      return suite;
    }
    const e = horodater(suite, Math.max(etat?.maj ?? 0, reprise?.maj ?? 0));
    setEtat(e);
    planifier(e, phase(e) !== "carte");
    return e;
  }

  /**
   * Le compte a une version écrite ailleurs (autre appareil, autre onglet),
   * relue au retour au premier plan ou rendue par un refus : elle remplace la
   * boucle à l'écran, est gardée aussi sur l'appareil, et se propose en
   * reprise (finie : une boucle neuve, « Maîtrisé » en tête).
   */
  function prendreDuCompte(ligne: LigneProgression) {
    if (demo) return;
    const c = lireLigne(ligne, ids);
    if (!c) return;
    if (cleStock) ecrireBoucle(cleStock, aSonNom(c.etat));
    setEnvols([]);
    setFocusEntracte(false);
    remettre();
    if (enCours(c.etat)) {
      setEtat(null);
      setReprise(c.etat);
    } else {
      setReprise(null);
      setEtat(nouvelle(melange));
    }
    if (cleCompte) annoncerBoucle(cleCompte, c.etat);
  }

  // Montage : la plus récente entre la boucle de l'appareil et celle du
  // compte (à reprendre si elle est entamée), sinon une neuve.
  useEffect(() => {
    if (demo || !cards.length) return;
    const m = lireMelange();
    setMelange(m);
    const locale = cleStock ? boucleDuJoueur(lireBoucle(cleStock, ids), joueur) : null;
    connaitre(compte?.ligne);
    const duCompte = lireLigne(compte?.ligne, ids);
    const { etat: gardee, source } = choisirBoucle(locale, duCompte);
    if (gardee && enCours(gardee)) setReprise(gardee);
    else setEtat(nouvelle(m));
    // l'en-tête suit la boucle retenue (l'appareil peut avoir plus récent que la page)
    if (gardee && cleCompte) annoncerBoucle(cleCompte, gardee);
    // l'appareil a plus récent que le compte (dernier envoi perdu, ou boucle d'avant la synchronisation) : il le renvoie
    if (source === "appareil" && gardee && (!duCompte || horodatage(gardee) > (duCompte.etat.maj ?? duCompte.maj))) planifier(gardee);
    // page resservie par le cache du routeur (retour arrière) : la ligne lue par la page date, on relit le compte
    if (compte && Date.now() - compte.lueA > 30_000) relire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La boucle est gardée sur l'appareil à chaque geste, finie comprise (elle
  // départage le compte au retour) ; ouverte sans geste, rien n'est écrit.
  useEffect(() => {
    if (!cleStock || !etat) return;
    if (enCours(etat) || etat.maj !== undefined) ecrireBoucle(cleStock, aSonNom(etat));
    if (cleCompte && etat.maj !== undefined) annoncerBoucle(cleCompte, etat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat, cleStock, cleCompte, joueur]);

  // Le clavier ne pilote la carte que si elle est à l'écran (ou en plein écran).
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // les boutons qui reprennent le focus quand celui qui l'avait disparaît
  const pleinRef = useRef<HTMLButtonElement>(null);
  const quitterRef = useRef<HTMLButtonElement>(null);
  const retournerRef = useRef<HTMLButtonElement>(null);
  const maitriseRef = useRef<HTMLButtonElement>(null);
  const recommencerRef = useRef<HTMLButtonElement>(null);
  // heure du dernier retournement : un double-clic sur « Retourner » ne marque pas la carte
  const retourneA = useRef(0);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // cartes révisées, notées pour le Codex par paquets de 10 et en fin de tour
  const aNoter = useRef(0);
  function noterCartes(force: boolean) {
    if (demo || (aNoter.current < 10 && !(force && aNoter.current > 0))) return;
    const n = aNoter.current;
    aNoter.current = 0;
    codexNoter("flashcards_revues", matiere ? { matiere, cartes: n } : { cartes: n }).catch(() => undefined);
  }

  const ph = etat ? phase(etat) : null;
  const courante = etat ? carteCourante(etat) : null;
  const prog = etat ? progression(etat) : null;
  const mode: Mode = reprise ? "reprise" : !etat ? "fantome" : ph === "carte" || envols.length > 0 ? "carte" : ph === "entracte" ? "entracte" : "fin";

  function remettre() {
    setVerso(false);
    setLever(0);
  }

  // Le focus clavier ne doit pas se perdre quand l'élément qui l'a disparaît
  // (« Retourner » remplacé par la paire de marques, fiche marquée remplacée
  // par la suivante, fin de boucle). Avant chaque geste, on note s'il était
  // dans la scène, et où ; après le rendu, s'il est retombé sur <body>, on le
  // rend au bouton équivalent (l'entracte prend le focus de lui-même).
  const focusAvant = useRef<"fiche" | "bouton" | null>(null);
  function noterFocus() {
    if (typeof document === "undefined") return;
    const act = document.activeElement;
    const zone = plein ? dialogRef.current : rootRef.current;
    focusAvant.current = act && zone?.contains(act) ? (act.closest("[data-fiche]") ? "fiche" : "bouton") : null;
  }
  useEffect(() => {
    const avant = focusAvant.current;
    if (!avant) return;
    if (mode === "entracte" || mode === "reprise") {
      focusAvant.current = null;
      return;
    }
    const act = document.activeElement;
    if (act && act !== document.body && act.isConnected) {
      // resté en place (fiche retournée, flèche encore active)
      focusAvant.current = null;
      return;
    }
    const zone = plein ? dialogRef.current : rootRef.current;
    const el: HTMLElement | null =
      mode === "fin"
        ? recommencerRef.current
        : mode !== "carte"
          ? null
          : avant === "fiche"
            ? (zone?.querySelector<HTMLElement>("[data-fiche]") ?? null)
            : verso
              ? maitriseRef.current
              : retournerRef.current;
    // pas encore là (la dernière fiche s'envole) : on réessaie au rendu suivant
    if (!el || (el instanceof HTMLButtonElement && el.disabled)) return;
    el.focus({ preventScroll: true });
    focusAvant.current = null;
  });

  function retourner() {
    if (!courante) return;
    noterFocus();
    retourneA.current = performance.now();
    setVerso((v) => !v);
    setLever((n) => n + 1);
  }

  /** Les boutons de marque : ignorés juste après un retournement (double-clic, réponse pas lue). */
  function marquerBouton(su: boolean) {
    if (performance.now() - retourneA.current < 400) return;
    marquerCarte(su);
  }

  function finEnvol(k: number) {
    setEnvols((xs) => xs.filter((x) => x.cle !== k));
  }

  function marquerCarte(su: boolean, dx = 0) {
    if (!etat || !courante) return;
    noterFocus();
    const v = vue(courante);
    const suite = changer(marquer(etat, su), "marquer");
    remettre();
    if (v) {
      const k = envolCle.current++;
      setEnvols((xs) => [...xs.slice(-2), { cle: k, carte: v, su, dx }]);
      // filet : l'envol se retire même si la fin d'animation n'arrive pas
      window.setTimeout(() => finEnvol(k), 900);
    }
    if (!demo) {
      // Écrit pour LA PROCHAINE fois — n'affecte jamais l'ordre de la boucle.
      const sid = parId.get(courante)?.c.setId ?? setId;
      if (sid) saveSRS(sid, applyReview(loadSRS(sid), courante, su));
    }
    aNoter.current += 1;
    noterCartes(phase(suite) !== "carte");
    if (phase(suite) === "entracte") setFocusEntracte(true);
  }

  function aller(delta: number) {
    if (!etat) return;
    const suite = allerDans(etat, delta);
    if (suite === etat) return;
    noterFocus();
    changer(suite, "aller");
    remettre();
  }

  function tourDApres() {
    if (!etat) return;
    noterFocus();
    changer(tourSuivant(etat), "tour");
    setEnvols([]);
    remettre();
  }

  function recommencer() {
    noterFocus();
    setReprise(null);
    // repart de zéro, aussi sur le compte (« Maîtrisé » s'efface)
    changer(nouvelle(melange), "recommencer");
    setEnvols([]);
    setFocusEntracte(false);
    remettre();
  }

  function reprendreBoucle() {
    if (!reprise) return;
    noterFocus();
    setEtat(reprendre(reprise));
    setReprise(null);
    remettre();
  }

  const peutMelanger = !!etat && etat.tour === 1 && Object.keys(etat.marques).length === 0 && ph === "carte";
  function basculerMelange() {
    const m = !melange;
    setMelange(m);
    if (!demo) ecrireMelange(m);
    if (peutMelanger) {
      setEtat(nouvelle(m));
      remettre();
    }
  }

  // Raccourcis clavier.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!plein && !inView) return;
      if (e.key === "Tab") {
        if (plein) pieger(e);
        return;
      }
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape" && plein) {
        setPlein(false);
        return;
      }
      const surBouton = tag === "BUTTON" || tag === "A";
      const valider = e.key === "Enter" || e.key === " ";
      if (e.repeat && (valider || e.key === "1" || e.key === "2")) return;
      if (mode === "reprise") {
        if (e.key === "Enter" && !surBouton) {
          e.preventDefault();
          reprendreBoucle();
        }
        return;
      }
      if (mode === "entracte") {
        if (e.key === "Enter" && !surBouton) {
          e.preventDefault();
          tourDApres();
        }
        return;
      }
      if (mode !== "carte" || !courante) return;
      if (e.key === "ArrowLeft") aller(-1);
      else if (e.key === "ArrowRight") aller(1);
      else if (valider && !surBouton) {
        e.preventDefault();
        retourner();
      } else if (verso && e.key === "1") marquerCarte(false);
      else if (verso && e.key === "2") marquerCarte(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Plein écran : la page derrière ne défile plus.
  useEffect(() => {
    if (!plein) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [plein]);

  // Plein écran : le focus entre dans le dialogue (le bouton cliqué a été
  // démonté) et, à la sortie, revient au bouton « Plein écran » de la scène.
  useEffect(() => {
    if (!plein || demo) return;
    quitterRef.current?.focus({ preventScroll: true });
    return () => {
      const act = document.activeElement;
      if (act && act !== document.body && act.isConnected) return;
      const cible = pleinRef.current ?? rootRef.current?.querySelector<HTMLElement>("button:not([disabled]), a[href]") ?? null;
      cible?.focus({ preventScroll: true });
    };
  }, [plein, demo]);

  /** Tab ne sort pas du dialogue plein écran (la page dessous est cachée par le calque). */
  function pieger(e: KeyboardEvent) {
    const d = dialogRef.current;
    if (!d) return;
    const f = Array.from(d.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(
      (x) => !x.closest('[aria-hidden="true"]') && x.getClientRects().length > 0 && getComputedStyle(x).visibility !== "hidden"
    );
    if (!f.length) return;
    const premier = f[0];
    const dernier = f[f.length - 1];
    const act = document.activeElement;
    const dedans = !!act && d.contains(act);
    if (e.shiftKey && (!dedans || act === premier)) {
      e.preventDefault();
      dernier.focus();
    } else if (!e.shiftKey && (!dedans || act === dernier)) {
      e.preventDefault();
      premier.focus();
    }
  }

  if (!cards.length) {
    return (
      <div className="card-quiet grid place-items-center gap-1.5 px-6 py-14 text-center">
        <p className="t-h3 m-0">{FLASHCARDS.vide}</p>
        <p className="t-small">{FLASHCARDS.videLigne}</p>
      </div>
    );
  }

  const boutonPlein = (big: boolean) => (
    <button
      ref={big ? quitterRef : pleinRef}
      type="button"
      className="icon-btn h-11 w-11 rounded-[13px]"
      onClick={() => setPlein((v) => !v)}
      aria-label={big ? "Quitter le plein écran" : "Plein écran"}
      title={big ? "Quitter le plein écran (Échap)" : "Plein écran"}
    >
      {big ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
    </button>
  );

  const scene = (big: boolean) => {
    const marque = courante && etat && a(etat.marques, courante) ? etat.marques[courante] : null;
    const reste = prog ? prog.restantes - (courante && marque === null ? 1 : 0) : 2;
    const total = prog?.total ?? cards.length;
    return (
      <>
        <div className="grid gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <BarreTour tour={etat?.tour ?? 1} maitrisees={prog?.maitrisees ?? 0} aRevoir={prog?.aRevoir ?? 0} total={total} rang={prog?.rang ?? 1} />
            {peutMelanger && (
              <button
                type="button"
                className={"icon-btn h-11 w-11 rounded-[13px] " + (melange ? "is-on" : "")}
                onClick={basculerMelange}
                aria-pressed={melange}
                aria-label={BOUCLE.melanger}
                title={BOUCLE.melangerAide}
              >
                <Shuffle size={16} aria-hidden />
              </button>
            )}
            {boutonPlein(big)}
          </div>
          <LegendeTour maitrisees={prog?.maitrisees ?? 0} aRevoir={prog?.aRevoir ?? 0} total={total} />
        </div>

        <FichePile
          carte={courante ? vue(courante) : null}
          verso={verso}
          lever={lever}
          marque={marque}
          dessous={mode === "fantome" ? 2 : Math.max(0, reste)}
          envols={envols}
          big={big}
          fantome={mode === "fantome"}
          className={big ? "min-h-[320px] flex-1" : HAUTEUR}
          onRetourner={retourner}
          onMarquer={marquerCarte}
          onEnvolFin={finEnvol}
        />

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="icon-btn h-[50px] w-[50px] rounded-[14px] disabled:pointer-events-none disabled:opacity-35"
            disabled={!courante || !etat || etat.pos === 0}
            onClick={() => aller(-1)}
            aria-label="Carte précédente"
          >
            <ArrowLeft size={18} aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            {verso && courante ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn btn-secondary btn-lg whitespace-nowrap px-3" onClick={() => marquerBouton(false)}>
                  <RotateCcw size={16} aria-hidden className="hidden text-[var(--pen)] sm:block" /> {BOUCLE.aRevoir}
                </button>
                <button ref={maitriseRef} type="button" className="btn btn-primary btn-lg rl-press whitespace-nowrap px-3" onClick={() => marquerBouton(true)}>
                  <Check size={16} aria-hidden className="hidden sm:block" /> {BOUCLE.maitrise}
                </button>
              </div>
            ) : (
              <button ref={retournerRef} type="button" className="btn btn-primary btn-lg rl-press w-full" onClick={retourner} disabled={!courante}>
                {BOUCLE.retourner}
              </button>
            )}
          </div>
          <button
            type="button"
            className="icon-btn h-[50px] w-[50px] rounded-[14px] disabled:pointer-events-none disabled:opacity-35"
            disabled={!courante || !etat || etat.pos >= etat.file.length - 1}
            onClick={() => aller(1)}
            aria-label="Carte suivante"
          >
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>

        <p className="t-micro hidden flex-wrap items-center justify-center gap-1.5 sm:flex">
          <span className="kbd">Espace</span> retourner · <span className="kbd">1</span> à revoir · <span className="kbd">2</span> maîtrisée · <span className="kbd">←</span>
          <span className="kbd">→</span> naviguer
        </p>
        <p className="sr-only" aria-live="polite">
          {courante && etat && prog ? `${BOUCLE.tour(etat.tour)}, carte ${prog.rang} sur ${prog.total}` : ""}
        </p>
      </>
    );
  };

  const panneau = (big: boolean) => {
    if (mode === "reprise" && reprise) {
      const r = repere(reprise);
      const p = progression(reprise);
      const cartesBoucle = reprise.parcours[0] ?? reprise.file.length;
      return (
        <Reprise
          tour={r.tour}
          rang={r.rang}
          total={r.total}
          entracte={r.entracte}
          aRevoirTour={p.aRevoir}
          maitriseesTour={p.maitrisees}
          maitrisees={Math.max(0, cartesBoucle - reprise.file.length) + p.maitrisees}
          cartes={cartesBoucle}
          depuisMs={demo ? (demo.depuisMs ?? 3 * 3600_000) : Math.max(0, Date.now() - reprise.dernier)}
          big={big}
          onReprendre={reprendreBoucle}
          onRecommencer={recommencer}
        />
      );
    }
    if (mode === "entracte" && etat) {
      return (
        <Entracte
          tour={etat.tour}
          marques={etat.file.map((id) => (a(etat.marques, id) ? etat.marques[id] : null))}
          aRevoir={aRevoir(etat).length}
          big={big}
          focus={focusEntracte && !demo}
          onSuivant={tourDApres}
          onRecommencer={recommencer}
        />
      );
    }
    if (mode === "fin" && etat) {
      const b = bilan(etat);
      return (
        <FinDePasse
          sues={b.cartes}
          total={b.cartes}
          aRevoir={0}
          jour={jour}
          unite={FLASHCARDS.maitrisees(b.cartes)}
          surTitre={BOUCLE.finSur}
          titre={BOUCLE.finTitre}
          ligne={`${BOUCLE.finLigne(b.tours, b.cartes, b.dureeMs)} ${BOUCLE.finPremier(b.premierSues, b.cartes)}`}
          detail={
            b.tours > 1 ? (
              <p className="t-micro m-0 flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-[13px] font-semibold tabular-nums text-[var(--ink)]">{BOUCLE.parcours(b.parcours)}</span>
                <span>{BOUCLE.parcoursAide}</span>
              </p>
            ) : null
          }
          className={big ? "flex-1" : ""}
          actions={
            <>
              <button ref={recommencerRef} type="button" className="btn btn-primary btn-lg rl-press" onClick={recommencer}>
                <RotateCcw size={16} aria-hidden /> {BOUCLE.recommencer}
              </button>
              {onePager && <LienOnePager href={onePager} />}
            </>
          }
        >
          {!big && (
            <Link href={autresHref} className="ink-link">
              {BOUCLE.autres}
            </Link>
          )}
        </FinDePasse>
      );
    }
    return null;
  };

  const stage = (big: boolean) => (
    <div className={"flex min-h-0 flex-col gap-4 sm:gap-5 " + (big ? "h-full" : "")}>
      {mode === "carte" || mode === "fantome" ? (
        scene(big)
      ) : (
        <>
          {big && <div className="flex justify-end">{boutonPlein(true)}</div>}
          {panneau(big)}
        </>
      )}
    </div>
  );

  return (
    <>
      <div ref={rootRef}>{plein ? <div className={HAUTEUR} aria-hidden /> : stage(false)}</div>

      {plein && (
        // z-[100] : au-dessus de la barre du bas mobile (z-50) pour qu'elle ne
        // recouvre pas les boutons. paddingBottom réserve la zone de l'indicateur
        // d'accueil iOS (safe area). Le papier du site, pas un fond noir.
        // overflow-x-hidden : l'envol (translateX 120 %, rotation) sort de la
        // colonne sans faire naître de barre de défilement horizontale.
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Révision en plein écran"
          className={`fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden px-4 pt-4 sm:px-8 sm:pt-7 ${s.plein}`}
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col">{stage(true)}</div>
        </div>
      )}
    </>
  );
}

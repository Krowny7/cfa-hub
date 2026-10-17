"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { codexRecuperer } from "@/lib/codex/actions";
import { habitFete, type FeteCodex } from "@/lib/codex/bilan";
import { EVENEMENT_CODEX_POINT } from "@/lib/codex/panneau";
import {
  COMPTE_XP_MS, DECALAGE_TAMPON_MS, FAIT_VIDE, GESTE_MS, LIGNES_MONTREES, MAX_RECUPERER, TEXTES_RECUPERER as T,
  cleRecuperer, dateRecuperer, faitApres, grandesFetes, xpAVerser, type ARecuperer, type FaitAujourdhui,
} from "@/lib/codex/recuperer";
import { mouvementReduit } from "@/components/adn/sound-timeline";
import { Sceau } from "@/components/codex/Sceau";

// « Récupérer » (Codex simplifié, lib/codex/recuperer) : les quêtes faites
// qui attendent le clic. Deux formes :
//  - « bloc » (panneau du sceau, /codex) : « À récupérer · 3 », trois lignes
//    au plus, « et N autres », puis le bouton plein « Tout récupérer · +190 XP » ;
//  - « ligne » (fin d'outil) : « 2 quêtes à récupérer » et un bouton contour
//    « Récupérer +60 XP ».
// Le geste : le bouton se désactive pendant l'appel ; au retour, le tampon
// tombe sur chaque ligne (100 ms de décalage, trois lignes au plus), l'XP se
// compte en 500 ms et la barre de niveau avance (la page se rafraîchit) ;
// puis les grandes fêtes se jouent une par une, chacune passable ; enfin le
// bloc se replie en « Fait aujourd'hui : 4 · +230 XP ». Mouvement réduit :
// l'état final d'emblée. Échec : un mot, rien ne bouge. Les grandes fêtes se
// jouent dans la fenêtre modale qui porte le bloc (la feuille du panneau, sur
// téléphone), sinon sur la page : jamais dans la barre du haut, dont le flou
// enfermerait leur plein écran.
// Sans la §9 (tout est déjà versé) : « Déjà versé · Voir ce que tu as gagné »,
// le même geste, sans XP comptée. Le clic récupère TOUT ce qui attend (le
// serveur le relit) : `items` peut n'en être que le début, `total` dit alors
// combien en tout et l'XP à verser (le panneau). `cadre` faux : le bloc sans
// sa carte, titre en sur-titre (une zone du panneau « Aujourd'hui »).
// `demo` : aperçus, aucune action serveur.

// la fête : chargée au moment de fêter (elle tire le catalogue des pièces), jamais rendue côté serveur
const Fete = dynamic(() => import("@/components/fete/Fete").then((m) => m.Fete), { ssr: false });

type Phase = "pret" | "envoi" | "geste" | "fetes" | "fini";

export function Recuperer({
  items,
  total,
  jour,
  variante = "bloc",
  fait = FAIT_VIDE,
  sobre = false,
  cadre = true,
  demo = false,
  className = "",
  onFini,
}: {
  items: ARecuperer[];
  /** tout ce qui attend, quand `items` n'en montre que le début : combien, et l'XP à verser */
  total?: { n: number; xp: number };
  /** le jour de Paris de la vue (les dates « d'hier », « mer. 14 oct. ») */
  jour: string;
  variante?: "bloc" | "ligne";
  /** ce qui est déjà fait aujourd'hui : le bloc s'y replie une fois tout récupéré */
  fait?: FaitAujourdhui;
  sobre?: boolean;
  /** faux : sans carte, titre en sur-titre (le panneau « Aujourd'hui ») */
  cadre?: boolean;
  demo?: boolean;
  className?: string;
  onFini?: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("pret");
  const [echec, setEchec] = useState(false);
  // les quêtes prises au clic : la page qui se rafraîchit ne les retire pas en plein geste
  const [prises, setPrises] = useState<ARecuperer[] | null>(null);
  const [tamponnees, setTamponnees] = useState(0);
  const [compte, setCompte] = useState(0);
  const [fetes, setFetes] = useState<FeteCodex[]>([]);
  const [tour, setTour] = useState(0);
  const [apres, setApres] = useState<FaitAujourdhui | null>(null);
  // où jouer les grandes fêtes (lu au clic)
  const [scene, setScene] = useState<Element | null>(null);
  const minuteries = useRef<number[]>([]);
  const image = useRef<number | null>(null);

  useEffect(
    () => () => {
      minuteries.current.forEach((t) => window.clearTimeout(t));
      if (image.current !== null) window.cancelAnimationFrame(image.current);
    },
    [],
  );

  // la dernière grande fête passée : le bloc se replie
  useEffect(() => {
    if (phase === "fetes" && tour >= fetes.length) {
      setPhase("fini");
      onFini?.();
    }
  }, [phase, tour, fetes.length, onFini]);

  const liste = prises ?? items;
  if (!liste.length && phase === "pret") return null;
  const montres = liste.slice(0, LIGNES_MONTREES);
  const n = !prises && total ? Math.max(total.n, liste.length) : liste.length;
  const reste = n - montres.length;
  const xp = sobre ? 0 : !prises && total ? total.xp : xpAVerser(liste);
  // rien à verser : déjà versé (repli sans la §9), le clic en accuse réception
  const dejaVerse = liste.every((x) => !x.aVerser);

  const compter = (cible: number, reduit: boolean) => {
    if (reduit || cible <= 0) {
      setCompte(cible);
      return;
    }
    const debut = performance.now();
    const pas = (t: number) => {
      const f = Math.min(1, (t - debut) / COMPTE_XP_MS);
      setCompte(Math.round(cible * f));
      image.current = f < 1 ? window.requestAnimationFrame(pas) : null;
    };
    image.current = window.requestAnimationFrame(pas);
  };

  const recuperer = async (e: MouseEvent<HTMLButtonElement>) => {
    if (phase !== "pret") return;
    setScene(e.currentTarget.closest("dialog") ?? document.body);
    const pris = items.slice(0, MAX_RECUPERER);
    setEchec(false);
    setPhase("envoi");
    let r: Awaited<ReturnType<typeof codexRecuperer>> | null = null;
    if (demo) {
      r = { ok: true, recues: pris.map(({ quete, periode }) => ({ quete, periode })), xp: xpAVerser(pris), restant: 0, fetes: grandesFetes(pris, sobre) };
    } else {
      try {
        // tout ce qui attend (le serveur relit la liste entière)
        r = await codexRecuperer();
      } catch {
        r = null;
      }
    }
    if (!r || !r.ok) {
      setEchec(true);
      setPhase("pret");
      return;
    }
    const recuesCles = new Set(r.recues.map(cleRecuperer));
    const recues = pris.filter((x) => recuesCles.has(cleRecuperer(x)));
    setPrises(recues.length ? recues : pris);
    setApres(faitApres(fait, recues, r.xp));
    setFetes(r.fetes);
    if (!demo) {
      // le niveau de la barre du haut, et le panneau du sceau qui se relit
      router.refresh();
      try {
        window.dispatchEvent(new Event(EVENEMENT_CODEX_POINT));
      } catch {
        // relu à la page suivante
      }
    }
    const reduit = mouvementReduit();
    const suite: Phase = r.fetes.length ? "fetes" : "fini";
    compter(sobre ? 0 : r.xp, reduit);
    if (reduit) {
      setTamponnees(LIGNES_MONTREES);
      setPhase(suite);
      if (suite === "fini") onFini?.();
      return;
    }
    setPhase("geste");
    for (let i = 0; i < Math.min(LIGNES_MONTREES, recues.length || pris.length); i++) {
      minuteries.current.push(window.setTimeout(() => setTamponnees(i + 1), i * DECALAGE_TAMPON_MS));
    }
    minuteries.current.push(
      window.setTimeout(() => {
        setPhase(suite);
        if (suite === "fini") onFini?.();
      }, GESTE_MS),
    );
  };

  const fete = phase === "fetes" && tour < fetes.length ? fetes[tour] : null;
  const ecran = fete && scene && createPortal(<Fete key={fete.quete + fete.periode} {...habitFete(fete, { sobre, acte: null, autres: 0 })} onFin={() => setTour((t) => t + 1)} />, scene);

  // replié : « Fait aujourd'hui : 4 · +230 XP ▸ »
  if (phase === "fini" || (phase === "fetes" && variante === "ligne")) {
    // le compte local tant que la page rafraîchie n'a pas rendu le sien (qui compte tout ce qui a été récupéré)
    const f = apres && apres.n > fait.n ? apres : fait;
    return (
      <>
        {ecran}
        <details className={"group " + className}>
          <summary className="t-small flex min-h-[44px] cursor-pointer list-none items-center gap-1">
            <span aria-live="polite">{T.fait(f, sobre)}</span>
            <ChevronRight size={16} aria-hidden className="transition-transform group-open:rotate-90 motion-reduce:transition-none" />
          </summary>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 pb-2">
            {f.quetes.map((q) => (
              <li key={cleRecuperer(q)} className="t-small flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{q.titre}</span>
                {!sobre && q.xp > 0 && <span className="t-micro t-num shrink-0">+{q.xp.toLocaleString("fr-FR")} XP</span>}
              </li>
            ))}
          </ul>
        </details>
      </>
    );
  }

  const occupe = phase !== "pret";
  const sceau = (i: number) => {
    const tamponnee = phase !== "pret" && phase !== "envoi" && i < tamponnees;
    // plein = à récupérer ; tamponné = fait
    return <Sceau l={{ etat: tamponnee ? "terminee" : "active", fraction: 1, affichage: "complet", retro: false }} taille={28} neuf={tamponnee} />;
  };
  const comptee = phase === "geste" && !sobre && compte > 0 ? <span className="t-num t-h3" aria-live="polite">+{compte.toLocaleString("fr-FR")} XP</span> : null;

  if (variante === "ligne") {
    return (
      <div className={"flex flex-wrap items-center gap-x-3 gap-y-2 " + className}>
        <span className="shrink-0">{sceau(0)}</span>
        <p className="t-small m-0 min-w-0 flex-1">
          {T.ligne(n)}
          {dejaVerse ? ` · ${T.dejaVerse}` : ""}
        </p>
        {comptee ?? (
          <button type="button" className="btn btn-secondary rl-press min-h-[44px]" disabled={occupe} aria-busy={phase === "envoi"} onClick={recuperer}>
            {phase === "envoi" ? T.enCours : dejaVerse ? T.voir : T.un(xp)}
          </button>
        )}
        {echec && (
          <p role="alert" className="t-small m-0 w-full">
            {T.echec}
          </p>
        )}
        {ecran}
      </div>
    );
  }

  return (
    <section aria-label={T.titre(n)} className={(cadre ? "card-quiet p-4 " : "") + "flex flex-col gap-3 " + className}>
      {ecran}
      <h2 className={cadre ? "t-h3 m-0" : "t-eyebrow m-0"}>{T.titre(n)}</h2>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {montres.map((x, i) => {
          const sous = [x.recompense, dateRecuperer(x.le, jour)].filter(Boolean).join(" · ");
          return (
            <li key={cleRecuperer(x)} className="flex min-h-[44px] items-center gap-3">
              <span className="shrink-0">{sceau(i)}</span>
              <span className="min-w-0 flex-1">
                <span className="t-small block truncate">{x.titre}</span>
                {sous && <span className="t-micro block truncate">{sous}</span>}
              </span>
              {!sobre && x.xp > 0 && <span className="t-micro t-num shrink-0">+{x.xp.toLocaleString("fr-FR")} XP</span>}
            </li>
          );
        })}
      </ul>
      {reste > 0 && <p className="t-micro m-0">{T.autres(reste)}</p>}
      {dejaVerse && <p className="t-micro m-0">{T.dejaVerse}</p>}
      {comptee ?? (
        <button type="button" className={"btn btn-primary rl-press min-h-[44px] w-full" + (cadre ? " sm:w-fit" : "")} disabled={occupe} aria-busy={phase === "envoi"} onClick={recuperer}>
          {phase === "envoi" ? T.enCours : dejaVerse ? T.voir : T.tout(xp)}
        </button>
      )}
      {echec && (
        <p role="alert" className="t-small m-0">
          {T.echec}
        </p>
      )}
    </section>
  );
}

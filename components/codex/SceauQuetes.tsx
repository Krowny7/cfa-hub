"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Feuille } from "@/components/ui/Feuille";
import { useEtatNav } from "@/components/nav/DevoileContext";
import { codexPanneau, codexSeanceLancer, codexVus, codexXp } from "@/lib/codex/actions";
import { EVENEMENT_CODEX_POINT, panneauAcquitte, type Panneau, type SuitePanneau } from "@/lib/codex/panneau";
import { TEXTES_RECUPERER } from "@/lib/codex/recuperer";
import { BONNE_CHANCE } from "@/lib/codex/calendrier";
import { levelInfoFromXp } from "@/lib/leveling";
import { chiffrePastille } from "@/lib/nav";
import { Sceau } from "@/components/codex/Sceau";
import { Recuperer } from "@/components/codex/Recuperer";
import { MotsMaison } from "@/components/codex/MotMaison";
import { noterSeanceIci } from "@/components/codex/seance-ici";
import s from "./Encre.module.css";

// Le sceau de la barre du haut et son panneau « Aujourd'hui » (Codex
// simplifié, 17 octobre 2026). Les quêtes sont un guide secondaire : c'est
// leur seul point d'entrée hors de /codex.
//   le sceau      calme, sans arcs ni « ! » ; une pastille chiffrée, couleur
//                 tampon et sans pulsation, seulement s'il y a quelque chose à
//                 récupérer (« 9+ » au-delà). « 14 à revoir » l'a quitté : c'est
//                 la pastille de l'onglet Réviser (poserRevoir, DevoileContext).
//   le panneau    un popover ancré sur ordinateur, une feuille par le bas sur
//                 téléphone. En tête, la ligne de niveau (là où l'XP
//                 récupérée arrive), puis trois zones au plus
//                 (lib/codex/panneau.ts) : « À récupérer » (Recuperer, le
//                 bouton plein « Tout récupérer »), « La suite » (l'étape en
//                 cours de la séance du jour et « Commencer », plein s'il n'y
//                 a rien à récupérer), et en pied « Fait aujourd'hui ▸ » et
//                 « Ouvrir le Codex → ».
// Le panneau et l'XP sont relus à chaque ouverture (la barre reste montée
// d'une page à l'autre) et quand le Codex bouge (fin d'un outil, Récupérer :
// EVENEMENT_CODEX_POINT). Les récompenses versées d'office sont acquittées
// sans bruit à l'ouverture (codexVus). Le jour J : « Bonne chance », rien d'autre.
// `demo` : aperçus (aucune action serveur) ; `ouvert` : ouvert d'emblée.

// identifiants fixes (un seul sceau par barre) : pas de useId, rien à désaccorder à l'hydratation
const uid = "rl-sceau-quetes-";

export function SceauQuetes({ initial, xp: xpServeur = null, demo = false, ouvert: ouvertDepart = false }: { initial: Panneau; xp?: number | null; demo?: boolean; ouvert?: boolean }) {
  const { codex, poserRevoir } = useEtatNav();
  const router = useRouter();
  const [panneau, setPanneau] = useState(initial);
  const [xp, setXp] = useState(xpServeur);
  const [ouvert, setOuvert] = useState(ouvertDepart);
  // chaque ouverture remonte « Récupérer » à neuf ; `recupere` : il a fini son geste ici (il dit lui-même « Fait aujourd'hui »)
  const [ouvertures, setOuvertures] = useState(0);
  const [recupere, setRecupere] = useState(false);
  const [etroit, setEtroit] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, demarrer] = useTransition();
  const bouton = useRef<HTMLButtonElement | null>(null);
  const boite = useRef<HTMLDivElement | null>(null);

  useEffect(() => setPanneau(initial), [initial]);
  useEffect(() => setXp(xpServeur), [xpServeur]);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const suivre = () => setEtroit(mq.matches);
    suivre();
    mq.addEventListener("change", suivre);
    return () => mq.removeEventListener("change", suivre);
  }, []);

  // « 14 à revoir » : la pastille de l'onglet Réviser
  const revoir = panneau.disponible && !panneau.jourJ ? (panneau.revoir?.aujourdhui ?? null) : null;
  useEffect(() => {
    poserRevoir(revoir);
    return () => poserRevoir(null);
  }, [revoir, poserRevoir]);

  // le Codex a bougé (fin d'un outil, Récupérer) : la pastille se relit
  useEffect(() => {
    if (demo) return;
    const relire = () => {
      void codexPanneau().then((p) => p.disponible && setPanneau(p), () => undefined);
    };
    window.addEventListener(EVENEMENT_CODEX_POINT, relire);
    return () => window.removeEventListener(EVENEMENT_CODEX_POINT, relire);
  }, [demo]);

  const fermer = useCallback(() => {
    setOuvert(false);
    bouton.current?.focus();
  }, []);

  const ouvrir = () => {
    setOuvert(true);
    setMessage(null);
    setRecupere(false);
    setOuvertures((n) => n + 1);
    // les récompenses versées d'office : acquittées sans bruit
    const deja = panneau.versees?.cles ?? [];
    setPanneau(panneauAcquitte);
    if (demo) return;
    void Promise.all([codexPanneau(), codexXp()]).then(
      ([p, x]) => {
        if (p.disponible) setPanneau(panneauAcquitte(p));
        if (x !== null) setXp(x);
        const cles = [...new Set([...deja, ...(p.versees?.cles ?? [])])];
        if (cles.length) void codexVus(cles);
      },
      () => {
        if (deja.length) void codexVus(deja);
      },
    );
  };

  // popover : Échap, clic à côté, focus dans le panneau
  useEffect(() => {
    if (!ouvert || etroit) return;
    boite.current?.querySelector<HTMLElement>("a, button")?.focus();
    // Échap passe d'abord une grande fête en cours (elle l'écoute), pas le panneau
    const touche = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("[data-fete]") && fermer();
    const dehors = (e: PointerEvent) => {
      const t = e.target as Node;
      // une grande fête (Récupérer) se joue hors du panneau : elle ne le ferme pas
      if ((t as Element).closest?.("[data-fete]")) return;
      if (!boite.current?.contains(t) && !bouton.current?.contains(t)) setOuvert(false);
    };
    window.addEventListener("keydown", touche);
    window.addEventListener("pointerdown", dehors);
    return () => {
      window.removeEventListener("keydown", touche);
      window.removeEventListener("pointerdown", dehors);
    };
  }, [ouvert, etroit, fermer]);

  if (!codex || !panneau.disponible) return null;

  const seance = panneau.seance;
  const rec = panneau.recuperer;
  const aRecuperer = rec.n > 0 && !recupere;

  // « Commencer » : la séance du jour se lance (en base, sinon dans ce navigateur), puis on y va
  const commencer = (suite: SuitePanneau) =>
    demarrer(async () => {
      setMessage(null);
      if (demo) {
        setMessage("Séance lancée (aperçu).");
        return;
      }
      if (!seance?.lancee) {
        const r = await codexSeanceLancer().catch(() => null);
        if (!r?.ok || !r.gardee) noterSeanceIci(panneau.jour, "lancee");
        try {
          window.dispatchEvent(new Event(EVENEMENT_CODEX_POINT));
        } catch {
          // relu à la page suivante
        }
      }
      setOuvert(false);
      router.push(suite.href);
    });

  const pastille = chiffrePastille(rec.n);
  const libelle = rec.n > 0 ? `Aujourd'hui : ${TEXTES_RECUPERER.ligne(rec.n)}` : "Aujourd'hui : tes quêtes";
  const niveau = xp === null ? null : levelInfoFromXp(xp);
  const fait = panneau.fait;

  const contenu = (
    <>
      {!etroit && (
        <h2 id={`${uid}titre`} className={`t-h3 ${s.panneauTitre}`}>
          Aujourd&apos;hui
        </h2>
      )}
      {niveau && !panneau.jourJ && (
        <div className={s.niveau} role="group" aria-label={`Niveau ${niveau.level}, ${niveau.xpIntoLevel} XP sur ${niveau.xpForNextLevel}`}>
          <span className={`${s.niveauN} font-brand`} aria-hidden>
            Niv. {niveau.level}
          </span>
          <span className={s.niveauBarre} aria-hidden>
            <span style={{ width: `${Math.round(niveau.progressPct * 1000) / 10}%` }} />
          </span>
          <span className={`${s.niveauXp} t-num`} aria-hidden>
            {niveau.xpIntoLevel.toLocaleString("fr-FR")} / {niveau.xpForNextLevel.toLocaleString("fr-FR")} XP
          </span>
        </div>
      )}
      {panneau.jourJ ? (
        // le jour J (V3 §7.4) : rien à faire ici, seulement ceci
        <p className={s.jourJ}>
          {BONNE_CHANCE.titre} {BONNE_CHANCE.texte}
        </p>
      ) : (
        <>
          {/* toujours monté : il garde ses quêtes pendant le geste, même quand le panneau relu n'en a plus */}
          <Recuperer key={ouvertures} items={rec.items} total={{ n: rec.n, xp: rec.xp }} jour={panneau.jour} fait={fait} sobre={panneau.sobre} cadre={false} demo={demo} onFini={() => setRecupere(true)} />
          {seance && (
            <div className={s.zone}>
              <p className="t-eyebrow m-0">La suite</p>
              {seance.suivant ? (
                <div className={s.suite}>
                  <span className="min-w-0">
                    <span className={s.suiteTitre}>{seance.suivant.titre}</span>
                    <span className="t-micro t-num">
                      {seance.suivant.duree} min{seance.suivant.xp > 0 && !panneau.sobre ? ` · +${seance.suivant.xp.toLocaleString("fr-FR")} XP` : ""}
                    </span>
                  </span>
                  <button type="button" className={`btn ${aRecuperer ? "btn-secondary" : "btn-primary"} rl-press min-h-[44px]`} disabled={occupe} aria-busy={occupe} onClick={() => commencer(seance.suivant!)}>
                    {seance.lancee ? "Continuer" : "Commencer"}
                  </button>
                </div>
              ) : (
                <p className="t-small m-0">Séance du jour faite.</p>
              )}
              {seance.suivant && <MotsMaison textes={[seance.suivant.titre]} />}
            </div>
          )}
          {message && (
            <p role="status" className="t-small m-0">
              {message}
            </p>
          )}
        </>
      )}
      <div className={s.pied}>
        {/* « Récupérer » dit lui-même « Fait aujourd'hui » une fois son geste fini */}
        {!panneau.jourJ && !recupere && fait.n > 0 ? (
          <details>
            <summary>{TEXTES_RECUPERER.fait(fait, panneau.sobre)}</summary>
            <ul className={s.faitListe}>
              {fait.quetes.map((q) => (
                <li key={`${q.quete}|${q.periode}`}>
                  <span className="min-w-0 truncate">{q.titre}</span>
                  {q.xp > 0 && !panneau.sobre && <span className="t-num shrink-0">+{q.xp.toLocaleString("fr-FR")} XP</span>}
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <span />
        )}
        <Link href="/codex" className={s.lienPlein} onClick={() => setOuvert(false)}>
          Ouvrir le Codex →
        </Link>
      </div>
    </>
  );

  return (
    // data-jour-j : Léonard ne surgit pas le jour de l'examen (il lit cet attribut, V3 §7.4)
    <div className={s.ancre} data-jour-j={panneau.jourJ || undefined}>
      <button
        ref={bouton}
        type="button"
        className={s.bouton}
        data-leonard="sceau-quetes"
        aria-label={libelle}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-controls={ouvert && !etroit ? `${uid}panneau` : undefined}
        onClick={() => (ouvert ? fermer() : ouvrir())}
      >
        <Sceau l={{ etat: "disponible", fraction: 0, affichage: "complet", retro: false }} taille={34} />
        {pastille && !panneau.jourJ && (
          <span className={`${s.pastille} t-num`} aria-hidden>
            {pastille}
          </span>
        )}
      </button>
      {ouvert && !etroit && (
        <div ref={boite} id={`${uid}panneau`} role="dialog" aria-labelledby={`${uid}titre`} className={s.panneau}>
          {contenu}
        </div>
      )}
      {etroit && (
        <Feuille ouvert={ouvert} onFermer={fermer} titre="Aujourd'hui">
          <div className={s.panneau} style={{ position: "static", width: "auto", boxShadow: "none", border: 0, padding: "4px 0 0", maxHeight: "none", animation: "none", overflow: "visible" }}>
            {contenu}
          </div>
        </Feuille>
      )}
    </div>
  );
}

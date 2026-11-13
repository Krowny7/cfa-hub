"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import katex from "katex";
import { Check, X } from "lucide-react";
import { enregistrerTour, recommencerMatiere } from "@/app/page-blanche/actions";
import { copiesARendre, lignesDesCopies } from "@/lib/formules/tour";
import type { Copie, Formule } from "@/lib/formules/types";
import { ActionContour, ActionEncre, EnTeteSousPage, Etiquette, Scene, SousPage } from "@/components/ui/SousPage";
import { nombre } from "@/lib/voice";
import { PB } from "@/lib/voice-page-blanche";
import { FEUILLES_PB, POSTE_PB } from "@/lib/voice-postes";
import { RETOUR } from "@/lib/voice-reviser";
import s from "./PageBlanche.module.css";

/** Le calcul d'une formule (lu par le serveur dans le catalogue des calculs) : son nom et son lien. */
export type LienCalcul = { href: string; nom: string };

// Un tour de la page blanche. Les copies : le joueur avance une par une et écrit sur son
// papier. Le corrigé : tout est révélé d'un coup, il note chaque ligne en vert ou en rouge.
// Le bilan : ce qu'il a raté forme les copies du tour suivant.
// Réviser A (2026-11-13) : la porte (retour à la page blanche, la matière, le tour, les formules
// maîtrisées en chiffre-héros), puis la feuille nue sur le fond classique, nommée par son étiquette
// (« Copie N sur M », « Le corrigé », « Le bilan ») ; le corrigé se découvre d'un coup, une ligne
// notée « À revoir » passe au vermillon avec le lien vers son calcul. « Valider le tour » reste dans
// la barre collante. « Tes copies » : les copies du tour en cases numérotées, dans la barre collante
// des copies (le seul accès aux autres copies), les rendues regroupées en « +N rendues ». Chaque phase
// a UNE action à l'encre. Le bilan : le score écrit sur la feuille, l'action juste dessous, puis les
// oublis (le lien d'un oubli seulement s'il a son calcul ; UN lien vers les calculs de la matière au pied).

export type Phase = "copies" | "corrige" | "bilan";

/**
 * « Tes copies » : les copies de ce tour en cases numérotées (pastille entourée : à rendre, pleine :
 * rendue ; la copie sur la feuille cerclée), un clic sur une autre case y mène ; les copies déjà
 * rendues avant ce tour, regroupées en une seule mention. Sur téléphone, la rangée défile et garde la
 * case courante au centre (sans faire défiler la page).
 */
function CasesCopies({
  copies,
  acquises,
  ici,
  aller,
  rendues,
}: {
  copies: Copie[];
  acquises: ReadonlySet<string>;
  /** l'indice de la copie sur la feuille */
  ici: number;
  aller: (i: number) => void;
  /** les copies rendues avant ce tour */
  rendues: number;
}) {
  const liste = useRef<HTMLOListElement | null>(null);
  useEffect(() => {
    const ol = liste.current;
    const li = ol?.querySelector<HTMLElement>("li[data-ici]");
    if (!ol || !li || ol.scrollWidth <= ol.clientWidth) return;
    ol.scrollTo({ left: li.offsetLeft - (ol.clientWidth - li.clientWidth) / 2, behavior: "smooth" });
  }, [ici]);
  return (
    <ol ref={liste} className={s.cases} aria-label={POSTE_PB.copies}>
      {copies.map((c, i) => {
        const rendue = c.formules.every((f) => acquises.has(f.id));
        const aide = `${FEUILLES_PB.caseCopie(i + 1, c.titre)} · ${rendue ? POSTE_PB.rendue : POSTE_PB.aRendre}`;
        return (
          <li key={c.id} data-ici={i === ici ? "1" : undefined} data-rendue={rendue ? "1" : undefined}>
            <button type="button" className={s.case + " rl-presse"} onClick={() => aller(i)} aria-current={i === ici ? "step" : undefined} aria-label={aide} title={aide}>
              <span className={s.caseNum}>{i + 1}</span>
              <i className={s.copiePastille} aria-hidden />
            </button>
          </li>
        );
      })}
      {rendues > 0 && <li className={s.casesRendues}>{FEUILLES_PB.rendues(rendues)}</li>}
    </ol>
  );
}

function Reponse({ f }: { f: Formule }) {
  const html = useMemo(() => (f.latex ? katex.renderToString(f.latex, { throwOnError: false, displayMode: false }) : null), [f.latex]);
  if (html) return <span className={s.formule} dangerouslySetInnerHTML={{ __html: html }} />;
  return (
    <span className={s.texteReponse} lang="en">
      {f.texte}
    </span>
  );
}

export function SessionPageBlanche({
  matiere,
  nom,
  copies,
  maitrisees,
  tourDepart,
  liens = {},
  depart,
}: {
  matiere: string;
  nom: string;
  copies: Copie[];
  maitrisees: string[];
  tourDepart: number;
  /** le calcul de chaque formule qui en a un (id de formule → lien) ; à défaut, les calculs de la matière */
  liens?: Record<string, LienCalcul>;
  /** un aperçu : la phase et les notes de départ (le corrigé déjà noté) ; la page réelle n'en passe pas */
  depart?: { phase: Phase; notes: Record<string, boolean> };
}) {
  const [acquises, setAcquises] = useState(() => new Set(maitrisees));
  const [tour, setTour] = useState(tourDepart);
  const [aRendre, setARendre] = useState(() => copiesARendre(copies, new Set(maitrisees)));
  const [phase, setPhase] = useState<Phase>(depart?.phase ?? "copies");
  const [ici, setIci] = useState(0);
  const [notes, setNotes] = useState<Record<string, boolean>>(depart?.notes ?? {});
  const [echec, setEchec] = useState(false);
  const [occupe, demarrer] = useTransition();

  const lignes = lignesDesCopies(aRendre);
  const notees = Object.keys(notes).length;
  const reussies = Object.values(notes).filter(Boolean).length;

  const ids = useMemo(() => copies.flatMap((c) => c.formules.map((f) => f.id)), [copies]);
  const tenues = ids.filter((id) => acquises.has(id)).length;

  // la page d'une phase : la porte (la matière, le tour, le chiffre-héros), puis la feuille sur la
  // scène, nommée par son étiquette
  const page = (ligne: React.ReactNode, titre: React.ReactNode, contenu: React.ReactNode) => {
    return (
      <SousPage
        entete={
          <EnTeteSousPage
            retour={RETOUR.pageBlanche}
            illustration={{ nom: "reviser-page-blanche", position: "50% 62%" }}
            titre={nom}
            ligne={ligne}
            heros={{ valeur: nombre(tenues), legende: FEUILLES_PB.seanceLegende(ids.length) }}
          />
        }
      >
        <Scene>
          <div className={s.colonne}>
            <Etiquette as="h2">{titre}</Etiquette>
            {contenu}
          </div>
        </Scene>
      </SousPage>
    );
  };

  /** Le lien vers le calcul d'une formule oubliée : seulement s'il est le sien (table relue).
   *  Pendant le corrigé, il s'ouvre dans un nouvel onglet : les notes du tour ne vivent que
   *  dans l'état et ne sont écrites qu'à « valider » ; quitter la page les perdrait. */
  const lienCalcul = (f: Formule, nouvelOnglet = false) => {
    const l = liens[f.id];
    if (!l) return null;
    return (
      <Link href={l.href} className={s.calcul} {...(nouvelOnglet ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {FEUILLES_PB.calcul(l.nom)} <span aria-hidden>→</span>
      </Link>
    );
  };

  function valider() {
    setEchec(false);
    demarrer(async () => {
      const r = await enregistrerTour(matiere, Object.entries(notes).map(([id, ok]) => ({ id, ok })));
      if (!r.ok) {
        setEchec(true);
        return;
      }
      setAcquises((avant) => new Set([...avant, ...Object.keys(notes).filter((id) => notes[id])]));
      setPhase("bilan");
      window.scrollTo({ top: 0 });
    });
  }

  function tourSuivant() {
    setARendre(copiesARendre(copies, acquises));
    setNotes({});
    setIci(0);
    setTour((t) => t + 1);
    setPhase("copies");
    window.scrollTo({ top: 0 });
  }

  function recommencer() {
    setEchec(false);
    demarrer(async () => {
      const r = await recommencerMatiere(matiere);
      if (!r.ok) {
        setEchec(true);
        return;
      }
      setAcquises(new Set());
      setARendre(copies);
      setNotes({});
      setIci(0);
      setTour(1);
      setPhase("copies");
    });
  }

  if (aRendre.length === 0 || phase === "bilan") {
    const reste = copiesARendre(copies, acquises);
    const oublis = aRendre.flatMap((c) => c.formules).filter((f) => notes[f.id] === false);
    const matiereCalculs = liens["*"];
    return page(
      null,
      // le bilan d'un tour ; tout maîtrisé dès l'arrivée : la feuille le dit, sans redite dessous
      phase === "bilan" ? POSTE_PB.bilan : PB.copies(0),
      <>
        {/* 1) le score, écrit sur la feuille ; « sans faute » seulement si tout est juste */}
        {phase === "bilan" && notees > 0 && (
          <section className={s.feuille + " " + s.score} aria-label={PB.bilan(reussies, notees)}>
            <p className={s.scoreChiffre}>
              {nombre(reussies)}
              <span className={s.scoreSur}> / {nombre(notees)}</span>
            </p>
            <p className={s.scoreLegende}>{FEUILLES_PB.scoreLegende}</p>
            {reste.length === 0 && <p className={s.scoreFin}>{PB.fini}</p>}
            {reussies === notees && <span className={s.sansFaute}>{FEUILLES_PB.sansFaute}</span>}
          </section>
        )}
        {/* 2) l'action, juste dessous */}
        <div className={s.actionBilan}>
          {reste.length > 0 ? (
            <ActionEncre onClick={tourSuivant}>{PB.suite(lignesDesCopies(reste))}</ActionEncre>
          ) : (
            <ActionContour onClick={occupe ? undefined : recommencer}>{PB.recommencer}</ActionContour>
          )}
        </div>
        {echec && (
          <p role="alert" className="t-small m-0">
            {PB.echec}
          </p>
        )}
        {/* 3) la feuille des oublis, et UN lien vers les calculs de la matière à son pied */}
        {phase === "bilan" && oublis.length > 0 && (
          <section className={s.feuille} aria-label={FEUILLES_PB.oublis(oublis.length)}>
            <h2 className={s.titreCopie}>{FEUILLES_PB.oublis(oublis.length)}</h2>
            <ol className={s.lignes}>
              {oublis.map((f) => (
                <li key={f.id} className={s.ligneCorrige} data-oubli="1">
                  <div className={s.contenu}>
                    <span className={s.nom} lang="en">
                      {f.nom}
                      {f.latex ? " =" : " :"}
                    </span>{" "}
                    <Reponse f={f} />
                    {lienCalcul(f)}
                  </div>
                </li>
              ))}
            </ol>
            {matiereCalculs && (
              <Link href={matiereCalculs.href} className={s.calcul + " " + s.calculPied}>
                {FEUILLES_PB.calculsMatiere(matiereCalculs.nom)} <span aria-hidden>→</span>
              </Link>
            )}
          </section>
        )}
      </>,
    );
  }

  if (phase === "corrige") {
    return page(
      PB.tour(tour),
      PB.corrige,
      <>
        {aRendre.map((c) => (
          <section key={c.id} className={s.feuille + " " + s.revele} aria-label={c.titre}>
            <h2 className={s.titreCopie}>{c.titre}</h2>
            <ol className={s.lignes}>
              {c.formules.map((f) => (
                <li key={f.id} className={s.ligneCorrige} data-oubli={notes[f.id] === false ? "1" : undefined}>
                  <div className={s.contenu}>
                    <span className={s.nom} lang="en">
                      {f.nom}
                      {f.latex ? " =" : " :"}
                    </span>{" "}
                    <Reponse f={f} />
                    {f.note && <p className={s.note}>{f.note}</p>}
                    {notes[f.id] === false && lienCalcul(f, true)}
                  </div>
                  <div className={s.choix}>
                    <button type="button" className={s.rouge} aria-pressed={notes[f.id] === false} aria-label={`${f.nom} : ${PB.aRevoir}`} title={PB.aRevoir} onClick={() => setNotes((n) => ({ ...n, [f.id]: false }))}>
                      <X size={18} aria-hidden />
                    </button>
                    <button type="button" className={s.vert} aria-pressed={notes[f.id] === true} aria-label={`${f.nom} : ${PB.maitrisee}`} title={PB.maitrisee} onClick={() => setNotes((n) => ({ ...n, [f.id]: true }))}>
                      <Check size={18} aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
        <div className={s.barre}>
          <span className={s.compte}>{PB.notees(notees, lignes)}</span>
          {echec && (
            <span role="alert" className="t-small">
              {PB.echec}
            </span>
          )}
          <ActionEncre disabled={notees < lignes || occupe} onClick={valider}>
            {occupe ? PB.enregistrement : PB.valider}
          </ActionEncre>
        </div>
      </>,
    );
  }

  const c = aRendre[ici];
  const derniere = ici === aRendre.length - 1;
  // la ligne de l'en-tête : le tour seul (le nombre de copies est dans le titre de la feuille)
  return page(
    PB.tour(tour),
    PB.copie(ici + 1, aRendre.length),
    <>
      <section className={s.feuille} aria-label={c.titre}>
        <h2 className={s.titreCopie}>{c.titre}</h2>
        <ol className={s.lignes}>
          {c.formules.map((f) => (
            <li key={f.id} className={s.ligneVide} lang="en">
              {f.nom}
              {f.latex ? " =" : " :"}
            </li>
          ))}
        </ol>
      </section>
      <div className={s.barre + " " + s.barreCopies}>
        <CasesCopies
          copies={aRendre}
          acquises={acquises}
          ici={ici}
          aller={(i) => {
            setIci(i);
            window.scrollTo({ top: 0 });
          }}
          rendues={copies.length - aRendre.length}
        />
        <ActionEncre
          onClick={() => {
            if (derniere) setPhase("corrige");
            else setIci((i) => i + 1);
            window.scrollTo({ top: 0 });
          }}
        >
          {derniere ? PB.reveler : PB.suivante}
        </ActionEncre>
      </div>
    </>,
  );
}

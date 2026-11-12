"use client";

import { useMemo, useState, useTransition } from "react";
import katex from "katex";
import { Check, X } from "lucide-react";
import { enregistrerTour, recommencerMatiere } from "@/app/page-blanche/actions";
import { copiesARendre, lignesDesCopies } from "@/lib/formules/tour";
import type { Copie, Formule } from "@/lib/formules/types";
import { CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { PB } from "@/lib/voice-page-blanche";
import { POSTE_PB } from "@/lib/voice-postes";
import { RETOUR } from "@/lib/voice-reviser";
import poste from "@/components/reviser/Postes.module.css";
import s from "./PageBlanche.module.css";

// Un tour de la page blanche. Les copies : le joueur avance une par une et écrit sur son
// papier. Le corrigé : tout est révélé d'un coup, il note chaque ligne en vert ou en rouge.
// Le bilan : ce qu'il a raté forme les copies du tour suivant.
// Modèle des sous-pages (2026-11-12) : l'en-tête commun (retour à la page blanche, la matière, le
// tour), puis le cadre à zones : à gauche la feuille (« Copie N sur M », « Le corrigé », « Le
// bilan »), dans la colonne grise « Tes copies », toutes les copies de la matière, rendues ou non.

type Phase = "copies" | "corrige" | "bilan";

/**
 * « Tes copies » : toutes les copies de la matière, chacune rendue (tout est maîtrisé) ou à rendre,
 * celle de la feuille marquée ; pendant les copies, un clic sur une copie à rendre y mène. Liste
 * locale : la courte liste commune (ListeCourte) s'arrête à 5 lignes, une matière a jusqu'à 12 copies.
 */
function ListeCopies({
  copies,
  acquises,
  ici,
  aller,
}: {
  copies: Copie[];
  acquises: ReadonlySet<string>;
  /** l'id de la copie sur la feuille (null : aucune) */
  ici: string | null;
  /** aller à cette copie (null : les lignes ne sont pas cliquables) */
  aller: ((id: string) => void) | null;
}) {
  return (
    <ol className={s.copies}>
      {copies.map((c) => {
        const rendue = c.formules.every((f) => acquises.has(f.id));
        const corps = (
          <>
            <span className={s.copieTitre}>{c.titre}</span>
            <span className={s.copieEtat}>{rendue ? POSTE_PB.rendue : POSTE_PB.aRendre}</span>
          </>
        );
        return (
          <li key={c.id} data-ici={c.id === ici ? "1" : undefined} data-rendue={rendue ? "1" : undefined}>
            {aller && !rendue && c.id !== ici ? (
              <button type="button" className={s.copieLigne} onClick={() => aller(c.id)} aria-label={POSTE_PB.allerA(c.titre)}>
                {corps}
              </button>
            ) : (
              <div className={s.copieLigne} aria-current={c.id === ici ? "step" : undefined}>
                {corps}
              </div>
            )}
          </li>
        );
      })}
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
}: {
  matiere: string;
  nom: string;
  copies: Copie[];
  maitrisees: string[];
  tourDepart: number;
}) {
  const [acquises, setAcquises] = useState(() => new Set(maitrisees));
  const [tour, setTour] = useState(tourDepart);
  const [aRendre, setARendre] = useState(() => copiesARendre(copies, new Set(maitrisees)));
  const [phase, setPhase] = useState<Phase>("copies");
  const [ici, setIci] = useState(0);
  const [notes, setNotes] = useState<Record<string, boolean>>({});
  const [echec, setEchec] = useState(false);
  const [occupe, demarrer] = useTransition();

  const lignes = lignesDesCopies(aRendre);
  const notees = Object.keys(notes).length;
  const reussies = Object.values(notes).filter(Boolean).length;

  // la page d'une phase : l'en-tête commun (la matière, le tour), puis le cadre à zones : la feuille
  // à gauche (son titre selon la phase), « Tes copies » dans la colonne grise
  const page = (ligne: React.ReactNode, titre: React.ReactNode, contenu: React.ReactNode) => {
    const surLaFeuille = phase === "copies" ? (aRendre[ici]?.id ?? null) : null;
    const aller =
      phase === "copies"
        ? (id: string) => {
            const i = aRendre.findIndex((x) => x.id === id);
            if (i >= 0) setIci(i);
          }
        : null;
    return (
      <SousPage entete={<EnTeteSousPage retour={RETOUR.pageBlanche} illustration={{ nom: "reviser-page-blanche", position: "50% 62%" }} titre={nom} ligne={ligne} />}>
        <CadreZones
          gauche={{ titre, contenu: <div className={poste.haut + " grid min-w-0 gap-[18px]"}>{contenu}</div> }}
          droite={{ titre: POSTE_PB.copies, contenu: <ListeCopies copies={copies} acquises={acquises} ici={surLaFeuille} aller={aller} /> }}
        />
      </SousPage>
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
    return page(
      null,
      // le bilan d'un tour ; tout maîtrisé dès l'arrivée : la feuille le dit, sans redite dessous
      phase === "bilan" ? POSTE_PB.bilan : PB.copies(0),
      <>
        {phase === "bilan" && <p className={s.bilan}>{PB.bilan(reussies, notees)}</p>}
        {reste.length > 0 ? (
          <button type="button" className="btn btn-primary rl-press w-fit" onClick={tourSuivant}>
            {PB.suite(lignesDesCopies(reste))}
          </button>
        ) : (
          <>
            {phase === "bilan" && <p className={s.bilan}>{PB.fini}</p>}
            <button type="button" className="btn btn-secondary rl-press w-fit" disabled={occupe} onClick={recommencer}>
              {PB.recommencer}
            </button>
          </>
        )}
        {echec && (
          <p role="alert" className="t-small m-0">
            {PB.echec}
          </p>
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
          <section key={c.id} className={s.feuille} aria-label={c.titre}>
            <h2 className={s.titreCopie}>{c.titre}</h2>
            <ol className={s.lignes}>
              {c.formules.map((f) => (
                <li key={f.id} className={s.ligneCorrige}>
                  <div className={s.contenu}>
                    <span className={s.nom} lang="en">
                      {f.nom}
                      {f.latex ? " =" : " :"}
                    </span>{" "}
                    <Reponse f={f} />
                    {f.note && <p className={s.note}>{f.note}</p>}
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
          <button type="button" className="btn btn-primary rl-press" disabled={notees < lignes || occupe} onClick={valider}>
            {occupe ? PB.enregistrement : PB.valider}
          </button>
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
      <div className={s.barre}>
        {ici > 0 ? (
          <button type="button" className="btn btn-secondary rl-press" onClick={() => setIci((i) => i - 1)}>
            {PB.precedente}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="btn btn-primary rl-press"
          onClick={() => {
            if (derniere) setPhase("corrige");
            else setIci((i) => i + 1);
            window.scrollTo({ top: 0 });
          }}
        >
          {derniere ? PB.reveler : PB.suivante}
        </button>
      </div>
    </>,
  );
}

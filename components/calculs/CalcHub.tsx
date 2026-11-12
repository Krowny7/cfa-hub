"use client";

import { Carrousel } from "@/components/ui/Carrousel";
import { Batons, Eventail, Niveaux, Pave, Tableau } from "@/components/ui/Dispositions";
import type { Piece } from "@/components/ui/Presentoir";
import { CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { codeMatiere, numeroPiece } from "@/components/entrainement/pieces";
import { topicSummary, type AllProgress } from "@/lib/calc/engine";
import { CALC_LEVELS } from "@/lib/calc/types";
import { RETOUR_ENTRAINEMENT, SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { etatType } from "./outils";
import { suggest, type SubjectLite } from "./suggest";
import { useCalcProgress, useLocalImport } from "./useCalc";
import { CALC } from "./voice";

export type CalcHubSubject = SubjectLite & { short: string; open: boolean; questions: number };

const S = SOUS_ENTRAINEMENT.calculs;

/**
 * /calculs, sur le modèle des sous-pages validé par Théo (2026-11-12) : l'en-tête commun (l'Abaque à
 * droite), puis le cadre à une zone : le tableau noir (choix de Théo, 2026-11-12), les 10 matières
 * écrites à la craie, chacune avec sa précision récente et un bâton par calcul maîtrisé (ses trois
 * niveaux tenus) ; la matière du calcul qui coince est entourée ; une matière pas encore ouverte est à
 * moitié effacée. Au pied du tableau, la légende des bâtons et la session ciblée (toutes les matières).
 * Plus de colonne de droite (« elle ne sert à rien », Théo) : ses pourcentages répétaient le tableau.
 *
 * Props : `subjects` (lib/calc/index → calcSubjectCards), `progress` (base, null = repli local),
 * `db` (migration appliquée), `owner` (id du compte, clé du repli local), `dispo` (essai, provisoire :
 * « carrousel », « pave », « eventail » ou « niveaux » à la place du tableau, pour comparer).
 */
export function CalcHub({ subjects, progress: server, db, owner, dispo }: { subjects: CalcHubSubject[]; progress: AllProgress | null; db: boolean; owner: string; dispo?: string }) {
  useLocalImport(db, owner);
  const { progress } = useCalcProgress(server, owner);
  const open = subjects.filter((s) => s.open);
  const sug = suggest(open, progress);

  // chaque matière ouverte : sa précision récente et son calcul le plus fragile (entamé, pas encore tenu aux trois niveaux)
  const stats = open.map((s) => {
    const precision = topicSummary(
      progress[s.topic],
      s.types.map((t) => t.key),
    ).precision;
    const fragiles = s.types.map((t) => etatType(progress[s.topic]?.[t.key])).filter((x) => x.pct !== null && x.tenus < CALC_LEVELS.length);
    const pire = fragiles.length ? Math.min(...fragiles.map((x) => x.pct as number)) : null;
    const maitrises = s.types.filter((t) => etatType(progress[s.topic]?.[t.key]).tenus === CALC_LEVELS.length).length;
    return { s, precision, pire, maitrises };
  });

  // la matière conseillée (entourée au tableau) : celle du calcul qui coince, sinon celle du prochain calcul
  const coince = stats.filter((x) => x.pire !== null).sort((a, b) => (a.pire as number) - (b.pire as number))[0]?.s ?? null;
  const entree = coince ?? (sug ? open.find((s) => s.topic === sug.topic) : null) ?? open[0] ?? null;

  const pieces: Piece[] = subjects.map((s, i) => {
    const x = stats.find((y) => y.s.topic === s.topic);
    const maitrises = S.maitrises(x?.maitrises ?? 0, s.types.length);
    return {
      cle: s.topic,
      href: s.open ? `/calculs/${s.slug}` : null,
      numero: numeroPiece(i),
      code: codeMatiere(s.topic, s.name),
      titre: s.name,
      pct: x?.precision ?? null,
      pied: x ? <Batons n={x.maitrises} titre={maitrises} /> : null,
      aria: x ? S.lecture(s.name, x.precision !== null ? S.justes(Math.round(x.precision)) : S.aEntamer, maitrises) : undefined,
    };
  });
  const depart = Math.max(0, pieces.findIndex((p) => p.cle === entree?.topic));

  return (
    <SousPage
      entete={<EnTeteSousPage retour={RETOUR_ENTRAINEMENT} titre={CALC.hubTitre} ligne={CALC.hubLigne} illustration={{ nom: "calculs-abaque", position: "50% 55%" }} />}
    >
      <CadreZones
        gauche={{
          titre: S.choisir,
          contenu:
            dispo === "carrousel" ? (
              <Carrousel forme="tuile" pieces={pieces} action={S.ouvrir} depart={depart} />
            ) : dispo === "pave" ? (
              <Pave pieces={pieces} action={S.ouvrir} depart={depart} />
            ) : dispo === "eventail" ? (
              <Eventail forme="tuile" pieces={pieces} action={S.ouvrir} depart={depart} />
            ) : dispo === "niveaux" ? (
              <Niveaux pieces={pieces} action={S.ouvrir} depart={depart} />
            ) : (
              <Tableau
                pieces={pieces}
                action={S.ouvrir}
                depart={depart}
                vide={S.aEntamer}
                bas={{
                  legende: (
                    <>
                      <Batons n={1} /> {S.legende}
                    </>
                  ),
                  lien: open.length ? { titre: S.session, href: "/calculs/session" } : undefined,
                }}
              />
            ),
        }}
      />
    </SousPage>
  );
}

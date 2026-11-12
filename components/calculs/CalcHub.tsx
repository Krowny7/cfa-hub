"use client";

import { Carrousel } from "@/components/ui/Carrousel";
import type { Piece } from "@/components/ui/Presentoir";
import { ListeCourte, type Ligne } from "@/components/ui/Decors";
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
 * droite), puis le cadre à zones : les 10 matières en tuiles sur le carrousel à gauche (la tuile de
 * devant ouvre la matière ; pas encore ouverte : en filigrane ; l'anneau s'ouvre sur la matière du
 * calcul qui coince), la session ciblée dans la colonne grise : les matières les moins sûres
 * (chacune lance la session réglée sur elle), puis toutes. Pas d'annexe.
 *
 * Props : `subjects` (lib/calc/index → calcSubjectCards), `progress` (base, null = repli local),
 * `db` (migration appliquée), `owner` (id du compte, clé du repli local).
 */
export function CalcHub({ subjects, progress: server, db, owner }: { subjects: CalcHubSubject[]; progress: AllProgress | null; db: boolean; owner: string }) {
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
    return { s, precision, pire };
  });

  // l'anneau s'ouvre sur la matière du calcul qui coince, sinon sur celle du prochain calcul
  const coince = stats.filter((x) => x.pire !== null).sort((a, b) => (a.pire as number) - (b.pire as number))[0]?.s ?? null;
  const entree = coince ?? (sug ? open.find((s) => s.topic === sug.topic) : null) ?? open[0] ?? null;

  const pieces: Piece[] = subjects.map((s, i) => ({
    cle: s.topic,
    href: s.open ? `/calculs/${s.slug}` : null,
    numero: numeroPiece(i),
    code: codeMatiere(s.topic, s.name),
    titre: s.name,
  }));
  const depart = Math.max(0, pieces.findIndex((p) => p.cle === entree?.topic));

  // la session ciblée : les matières les moins sûres d'abord (à défaut, les premières ouvertes), puis toutes
  const mesurees = stats.filter((x) => x.precision !== null).sort((a, b) => (a.precision as number) - (b.precision as number));
  const tete = (mesurees.length ? mesurees : stats).slice(0, 4);
  const lignes: Ligne[] = [
    ...tete.map((x) => ({
      cle: x.s.topic,
      titre: x.s.name,
      detail: x.precision !== null ? S.justes(Math.round(x.precision)) : S.aEntamer,
      href: `/calculs/session?matieres=${encodeURIComponent(x.s.slug)}`,
    })),
    { cle: "toutes", titre: S.toutes, href: "/calculs/session", marque: true },
  ];

  return (
    <SousPage
      entete={<EnTeteSousPage retour={RETOUR_ENTRAINEMENT} titre={CALC.hubTitre} ligne={CALC.hubLigne} illustration={{ nom: "calculs-abaque", position: "50% 55%" }} />}
    >
      <CadreZones
        gauche={{ titre: S.choisir, contenu: <Carrousel forme="tuile" pieces={pieces} action={S.ouvrir} depart={depart} /> }}
        droite={open.length > 0 ? { titre: S.session, contenu: <ListeCourte lignes={lignes} /> } : undefined}
      />
    </SousPage>
  );
}

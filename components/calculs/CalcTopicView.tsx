"use client";

import { Pastilles, Tableau, type PieceTableau } from "@/components/ui/Dispositions";
import { CadreAnnexe, CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { TENU_FENETRE, TENU_JUSTES, type AllProgress } from "@/lib/calc/engine";
import { CALC_LEVELS, type CalcTopic } from "@/lib/calc/types";
import { nombre } from "@/lib/voice";
import { SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { etatType, nomCourt } from "./outils";
import { PointsFaibles } from "./PointsFaibles";
import { useCalcProgress, useLocalImport } from "./useCalc";
import { CALC, ETAT_NIVEAU, NIVEAU, nbQuestions } from "./voice";

export type CalcTopicType = { key: string; name: string; tier: "essentiel" | "annexe"; top?: boolean; source: string | null; questions: number };

const M = SOUS_ENTRAINEMENT.calculsMatiere;

/**
 * /calculs/[matiere], comme /calculs (choix de Théo, 2026-11-12) : l'en-tête commun (retour aux
 * Calculs), puis le cadre à une zone : le tableau noir, les calculs de la matière écrits à la craie
 * sous trois titres (le Top 5 à la craie jaune, les Essentiels, les Annexes, dans l'ordre du
 * programme), chacun avec ses niveaux F · M · D (pastille pleine : tenu ; entourée : entamé) et sa
 * précision récente ; le calcul qui coince est entouré. Au pied du tableau, la légende et la session
 * ciblée sur la matière. Plus de colonne de droite. Dessous, l'annexe : le graphique des points
 * faibles (les calculs entamés pas encore tenus, les plus faibles en haut).
 *
 * Props : `subject` ({topic, slug, name, short}), `types`, `progress` (base, null = repli local), `db`, `owner`.
 */
export function CalcTopicView({
  subject,
  types,
  progress: server,
  db,
  owner,
}: {
  subject: { topic: CalcTopic; slug: string; name: string; short?: string };
  types: CalcTopicType[];
  progress: AllProgress | null;
  db: boolean;
  owner: string;
}) {
  useLocalImport(db, owner);
  const { progress } = useCalcProgress(server, owner);
  const mine = progress[subject.topic];
  const essentiels = types.filter((t) => t.tier === "essentiel");
  const annexes = types.filter((t) => t.tier === "annexe");
  const totalQ = types.reduce((n, t) => n + t.questions, 0);
  const niv = CALC_LEVELS.length;

  const etats = types.map((t) => ({ t, ...etatType(mine?.[t.key]) }));
  // le Top 5 en tête, puis les autres essentiels, puis les annexes
  const top = etats.filter((x) => x.t.top);
  const ess = etats.filter((x) => x.t.tier === "essentiel" && !x.t.top);
  const ann = etats.filter((x) => x.t.tier === "annexe");
  const ordre = [...top, ...ess, ...ann];

  // les points faibles : entamés, pas encore tenus aux trois niveaux, les moins réussis d'abord
  const fragiles = etats.filter((x) => x.pct !== null && x.tenus < niv).sort((a, b) => (a.pct as number) - (b.pct as number));
  // entouré au tableau : le calcul qui coince, sinon le premier pas encore tenu (le Top 5 d'abord)
  const conseil = fragiles[0]?.t.key ?? ordre.find((x) => x.tenus < niv)?.t.key ?? null;

  const pieces: PieceTableau[] = ordre.map((x, i) => {
    const nom = nomCourt(x.t.name);
    return {
      cle: x.t.key,
      href: `/calculs/${subject.slug}/${x.t.key}`,
      numero: String(i + 1),
      code: "",
      titre: nom,
      pct: x.pct,
      or: !!x.t.top,
      puce: x.t.top ? "★" : "–",
      pied: (
        <Pastilles
          titre={M.niveaux(x.tenus)}
          items={x.niveaux.map((e, j) => ({ lettre: NIVEAU[CALC_LEVELS[j]].court, etat: e === "tenu" ? "plein" : e === "entame" ? "cercle" : "vide" }))}
        />
      ),
      aria: M.lecture(nom, x.pct !== null ? `${nombre(x.pct)} %` : CALC.aEntamer, M.niveaux(x.tenus)),
    };
  });
  const depart = conseil ? pieces.findIndex((p) => p.cle === conseil) : -1;

  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={{ href: "/calculs", label: CALC.hubTitre }}
          titre={subject.name}
          ligne={`${nombre(essentiels.length)} ${essentiels.length > 1 ? "essentiels" : "essentiel"} · ${nombre(annexes.length)} ${annexes.length > 1 ? "annexes" : "annexe"} · ${nbQuestions(totalQ)}`}
          illustration={{ nom: "calculs-poulies" }}
        />
      }
    >
      <CadreZones
        gauche={{
          titre: M.registres,
          contenu: (
            <Tableau
              pieces={pieces}
              action={M.registres}
              depart={depart}
              vide={CALC.aEntamer}
              sections={[
                { titre: CALC.top, nombre: top.length },
                { titre: CALC.essentiels, nombre: ess.length },
                { titre: CALC.annexes, nombre: ann.length },
              ]}
              bas={{
                legende: (
                  <>
                    <Pastilles items={[{ lettre: "F", etat: "plein" }]} /> {ETAT_NIVEAU.tenu}
                    <Pastilles items={[{ lettre: "F", etat: "cercle" }]} /> {ETAT_NIVEAU.entame} · {M.legende}
                  </>
                ),
                lien: { titre: M.session, href: `/calculs/session?matieres=${encodeURIComponent(subject.slug)}` },
              }}
            />
          ),
        }}
      />
      {fragiles.length > 0 && (
        <CadreAnnexe titre={M.faibles}>
          <PointsFaibles
            seuil={Math.round((TENU_JUSTES / TENU_FENETRE) * 100)}
            points={fragiles.map((x) => ({
              cle: x.t.key,
              nom: nomCourt(x.t.name),
              pct: x.pct as number,
              ok: x.ok,
              n: x.n,
              tenus: x.tenus,
              href: `/calculs/${subject.slug}/${x.t.key}`,
            }))}
          />
        </CadreAnnexe>
      )}
    </SousPage>
  );
}

"use client";

import { Batons, CleCraie, Tableau, type PieceTableau } from "@/components/ui/Dispositions";
import { EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import { codeMatiere, numeroPiece } from "@/components/entrainement/pieces";
import type { AllProgress } from "@/lib/calc/engine";
import { SEUIL_CALCUL } from "@/lib/calc/faibles";
import { CALC_LEVELS } from "@/lib/calc/types";
import { nombre } from "@/lib/voice";
import { RETOUR_ENTRAINEMENT, SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { etatType, nomCourt } from "./outils";
import { useGagnes } from "./souvenir";
import { suggest, type SubjectLite } from "./suggest";
import { useCalcProgress, useLocalImport } from "./useCalc";
import { CALC } from "./voice";

export type CalcHubSubject = SubjectLite & { short: string; open: boolean; questions: number };

const S = SOUS_ENTRAINEMENT.calculs;

/**
 * /calculs (direction « le lieu, puis l'objet », validée par Théo le 2026-11-13) : la porte (la sphère
 * armillaire recadrée, calculs-abaque-porte : ses anneaux et les deux personnages ; sur la peinture,
 * les calculs tenus au total ; la ligne d'état : entamés et justes récents), puis le tableau noir juste
 * dessous, seul objet de la page : les 10 matières écrites à la craie, chacune avec ses justes sur les
 * 5 derniers essais de chaque niveau (la mesure de l'en-tête et de la matière) et un bâton par calcul
 * tenu (au moins un niveau tenu, 4 justes sur 5 : la somme des bâtons fait le chiffre de la porte).
 * La matière du calcul qui coince est entourée, sa raison dessous en petite craie ; une matière pas
 * encore ouverte est presque effacée. Au pied, la légende des bâtons et « Session ciblée » écrite à la
 * craie. Seul le bâton gagné depuis la dernière visite se trace (souvenir du navigateur, lu après
 * l'hydratation).
 *
 * Props : `subjects` (lib/calc/index → calcSubjectCards), `progress` (base, null = repli local),
 * `db` (migration appliquée), `owner` (id du compte, clé du repli local et du souvenir).
 */
export function CalcHub({ subjects, progress: server, db, owner }: { subjects: CalcHubSubject[]; progress: AllProgress | null; db: boolean; owner: string }) {
  useLocalImport(db, owner);
  const { progress, ready } = useCalcProgress(server, owner);
  const open = subjects.filter((s) => s.open);
  const sug = suggest(open, progress);

  // chaque matière ouverte : ses justes sur les derniers essais (la même mesure que l'en-tête et la page
  // de la matière), ses calculs tenus, entamés, et son calcul qui coince (sous le seuil « tenu », 80 %)
  const stats = open.map((s) => {
    const etats = s.types.map((t) => ({ t, ...etatType(progress[s.topic]?.[t.key]) }));
    const fragiles = etats.filter((x) => x.pct !== null && x.pct < SEUIL_CALCUL && x.tenus < CALC_LEVELS.length).sort((a, b) => (a.pct as number) - (b.pct as number));
    return {
      s,
      pire: fragiles[0] ?? null,
      tenus: etats.filter((x) => x.tenus > 0).length,
      entames: etats.filter((x) => x.pct !== null).length,
      n: etats.reduce((a, x) => a + x.n, 0),
      ok: etats.reduce((a, x) => a + x.ok, 0),
    };
  });

  // l'en-tête : les calculs tenus au total, les entamés, les justes sur les derniers essais
  const total = open.reduce((a, s) => a + s.types.length, 0);
  const tenus = stats.reduce((a, x) => a + x.tenus, 0);
  const entames = stats.reduce((a, x) => a + x.entames, 0);
  const essais = stats.reduce((a, x) => ({ n: a.n + x.n, ok: a.ok + x.ok }), { n: 0, ok: 0 });
  const justes = essais.n ? Math.round((essais.ok / essais.n) * 100) : null;

  // la matière conseillée (entourée au tableau) : celle du calcul qui coince, sinon celle du calcul à
  // reprendre ou à ouvrir ; rien d'entouré quand il n'y a rien à faire
  const coince = stats.filter((x) => x.pire !== null).sort((a, b) => (a.pire?.pct as number) - (b.pire?.pct as number))[0] ?? null;
  const entree = coince?.s ?? (sug ? open.find((s) => s.topic === sug.topic) : null) ?? null;
  const raison = coince?.pire
    ? S.coince(nomCourt(coince.pire.t.name), coince.pire.pct as number)
    : sug && entree?.topic === sug.topic
      ? (sug.reprise ? S.reprendre : S.prochain)(nomCourt(sug.typeName))
      : null;

  // les bâtons gagnés depuis la dernière visite, matière par matière
  const gagnes = useGagnes(`rl-calculs-vus:${owner}:hub`, Object.fromEntries(stats.map((x) => [x.s.topic, x.tenus])), ready);

  const pieces: PieceTableau[] = subjects.map((s, i) => {
    const x = stats.find((y) => y.s.topic === s.topic);
    const lu = S.tenus(x?.tenus ?? 0, s.types.length);
    return {
      cle: s.topic,
      href: s.open ? `/calculs/${s.slug}` : null,
      numero: numeroPiece(i),
      code: codeMatiere(s.topic, s.name),
      titre: s.name,
      pct: x && x.n ? Math.round((x.ok / x.n) * 100) : null,
      raison: s.topic === entree?.topic ? raison : null,
      pied: x ? <Batons n={x.tenus} titre={lu} neufs={gagnes[s.topic] ?? 0} /> : null,
      aria: x ? S.lecture(s.name, x.n ? S.justes(Math.round((x.ok / x.n) * 100)) : S.aEntamer, lu) : undefined,
    };
  });
  const depart = entree ? pieces.findIndex((p) => p.cle === entree.topic) : -1;

  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={RETOUR_ENTRAINEMENT}
          titre={CALC.hubTitre}
          ligne={S.etat(entames, total, justes)}
          illustration={{ nom: "calculs-abaque-porte", position: "50% 62%" }}
          heros={entames > 0 ? { valeur: nombre(tenus), legende: S.heros(tenus) } : null}
        />
      }
    >
      <Scene>
        <Tableau
          pieces={pieces}
          action={S.ouvrir}
          depart={depart}
          vide={entames ? S.aEntamer : ""}
          bas={{
            legende: <CleCraie signe={<Batons n={1} />}>{S.legende}</CleCraie>,
            lien: open.length ? { titre: S.session, href: "/calculs/session" } : undefined,
          }}
        />
      </Scene>
    </SousPage>
  );
}

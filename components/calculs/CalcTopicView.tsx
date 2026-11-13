"use client";

import { CleCraie, Pastilles, Tableau, type PieceTableau } from "@/components/ui/Dispositions";
import { EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import { TENU_FENETRE, TENU_JUSTES, type AllProgress } from "@/lib/calc/engine";
import { SEUIL_CALCUL } from "@/lib/calc/faibles";
import { CALC_LEVELS, type CalcTopic } from "@/lib/calc/types";
import { nombre } from "@/lib/voice";
import { SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { etatType, nomCourt } from "./outils";
import { PointsFaibles } from "./PointsFaibles";
import { useGagnes } from "./souvenir";
import { useCalcProgress, useLocalImport } from "./useCalc";
import { CALC, ETAT_NIVEAU, NIVEAU } from "./voice";

export type CalcTopicType = { key: string; name: string; tier: "essentiel" | "annexe"; top?: boolean; source: string | null; questions: number };

const S = SOUS_ENTRAINEMENT.calculs;
const M = SOUS_ENTRAINEMENT.calculsMatiere;

/**
 * /calculs/[matiere] (direction « le lieu, puis l'objet », validée par Théo le 2026-11-13) : la porte
 * (la sphère armillaire recadrée, calculs-abaque-porte : ses anneaux et les deux personnages ; sur la peinture, les calculs tenus de la
 * matière ; la ligne d'état : entamés et justes récents), puis le tableau noir juste dessous, seul
 * objet de la page : les calculs écrits à la craie sous trois titres (le Top 5 à la craie jaune, les
 * Essentiels, les Annexes), chacun avec ses niveaux F · M · D (pastille pleine : tenu ; entourée :
 * entamé) et sa précision sur les derniers essais. Le calcul qui coince est entouré, sa raison dessous
 * (« 2 justes sur 5 · encore 2 pour tenir F »). Au bas du tableau, les points faibles (barres et seuil
 * « tenu · 80 % » à la craie), puis la légende et « Session ciblée » écrite à la craie. Seule la
 * pastille tenue depuis la dernière visite se tamponne (souvenir du navigateur, lu après l'hydratation).
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
  const { progress, ready } = useCalcProgress(server, owner);
  const mine = progress[subject.topic];
  const niv = CALC_LEVELS.length;

  const etats = types.map((t) => ({ t, ...etatType(mine?.[t.key]) }));
  // le Top 5 en tête, puis les autres essentiels, puis les annexes
  const top = etats.filter((x) => x.t.top);
  const ess = etats.filter((x) => x.t.tier === "essentiel" && !x.t.top);
  const ann = etats.filter((x) => x.t.tier === "annexe" && !x.t.top);
  const ordre = [...top, ...ess, ...ann];

  // l'en-tête : les calculs tenus (au moins un niveau), les entamés, les justes sur les derniers essais
  const tenus = etats.filter((x) => x.tenus > 0).length;
  const entames = etats.filter((x) => x.pct !== null).length;
  const essais = etats.reduce((a, x) => ({ n: a.n + x.n, ok: a.ok + x.ok }), { n: 0, ok: 0 });
  const justes = essais.n ? Math.round((essais.ok / essais.n) * 100) : null;

  // les points faibles : entamés, sous le seuil « tenu », les moins réussis d'abord
  const fragiles = etats.filter((x) => x.pct !== null && x.pct < SEUIL_CALCUL && x.tenus < niv).sort((a, b) => (a.pct as number) - (b.pct as number));
  // entouré au tableau : le calcul qui coince, sinon le premier pas encore tenu (le Top 5 d'abord)
  const conseil = fragiles[0] ?? ordre.find((x) => x.tenus < niv) ?? null;

  // sa raison : le premier niveau pas encore tenu, ses justes sur les derniers essais et ce qui manque
  let raison: string | null = null;
  if (conseil) {
    const k = conseil.niveaux.findIndex((e) => e !== "tenu");
    const l = CALC_LEVELS[Math.max(0, k)];
    const st = mine?.[conseil.t.key]?.levels[l];
    if (conseil.pct === null) raison = M.prochain(NIVEAU[l].label);
    else if (!st || st.n === 0) raison = M.raisonVierge(NIVEAU[l].label);
    else raison = M.raison(st.last5Ok, st.last5N, Math.max(1, TENU_JUSTES - st.last5Ok), NIVEAU[l].court);
  }

  // ce qui a été tenu depuis la dernière visite : une pastille par niveau
  const tenuParNiveau: Record<string, number> = {};
  for (const x of etats)
    x.niveaux.forEach((e, j) => {
      if (e === "tenu") tenuParNiveau[`${x.t.key}:${CALC_LEVELS[j]}`] = 1;
    });
  const gagnes = useGagnes(`rl-calculs-vus:${owner}:${subject.topic}`, tenuParNiveau, ready);

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
      raison: x === conseil ? raison : null,
      pied: (
        <Pastilles
          titre={M.niveaux(x.tenus)}
          items={x.niveaux.map((e, j) => ({
            lettre: NIVEAU[CALC_LEVELS[j]].court,
            etat: e === "tenu" ? "plein" : e === "entame" ? "cercle" : "vide",
            neuf: !!gagnes[`${x.t.key}:${CALC_LEVELS[j]}`],
          }))}
        />
      ),
      aria: M.lecture(nom, x.pct !== null ? `${nombre(x.pct)} %` : CALC.aEntamer, M.niveaux(x.tenus)),
    };
  });
  const depart = conseil ? pieces.findIndex((p) => p.cle === conseil.t.key) : -1;

  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={{ href: "/calculs", label: CALC.hubTitre }}
          titre={subject.name}
          ligne={S.etat(entames, types.length, justes)}
          illustration={{ nom: "calculs-abaque-porte", position: "50% 62%" }}
          heros={entames > 0 ? { valeur: nombre(tenus), legende: S.heros(tenus) } : null}
        />
      }
    >
      <Scene>
        <Tableau
          pieces={pieces}
          action={M.registres}
          depart={depart}
          vide={entames ? CALC.aEntamer : ""}
          sections={[
            { titre: `★ ${CALC.top}`, nombre: top.length, or: true },
            { titre: CALC.essentiels, nombre: ess.length },
            { titre: CALC.annexes, nombre: ann.length },
          ]}
          dessous={
            fragiles.length > 0 ? (
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
            ) : null
          }
          bas={{
            legende: (
              <>
                <CleCraie signe={<Pastilles items={[{ lettre: "F", etat: "plein" }]} />}>{ETAT_NIVEAU.tenu}</CleCraie>
                <CleCraie signe={<Pastilles items={[{ lettre: "F", etat: "cercle" }]} />}>{ETAT_NIVEAU.entame}</CleCraie>
                <CleCraie>{M.legende}</CleCraie>
              </>
            ),
            lien: { titre: M.session, href: `/calculs/session?matieres=${encodeURIComponent(subject.slug)}` },
          }}
        />
      </Scene>
    </SousPage>
  );
}

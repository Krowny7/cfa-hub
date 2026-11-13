import { OngletParAncre } from "@/components/moi/Clients";
import { Registre } from "@/components/moi/Registre";
import { EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import type { MoiTab } from "@/components/moi/data";
import type { MoiData } from "@/components/moi/types";
import { REG, SOUS_MOI } from "@/lib/voice-moi";

// Espace « Moi » : la page d'accueil de l'espace (?onglet=stats, par défaut)
// est « La synthèse » (components/moi/synthese), rendue par la page elle-même
// avec ses propres lectures ; ici, les autres onglets, chacun en sous-page sur le
// modèle validé par Théo (2026-11-12 : l'en-tête commun avec le retour à Moi, puis
// le cadre à zones). Le carnet de ratures (?onglet=erreurs) et les marquées
// (?onglet=marquees) ont chacun une page de liste (« Le registre ») ; l'étagère des
// pièces (?onglet=pieces) et les réglages (?onglet=reglages) la leur. Les anciens
// liens restent valables. Composant de présentation : les données arrivent en props ;
// `settings` reçoit le panneau de réglages (son cadre à zones, des composants clients
// qui chargent eux-mêmes), `pieces` l'étagère « Mes pièces » (lue par la page sur cet onglet).
export function MoiView({
  d,
  settings,
  pieces = null,
  tab,
  vueMarquees,
  now,
  herosReglages = null,
  ligneReglages = null,
}: {
  d: MoiData;
  settings: React.ReactNode;
  pieces?: React.ReactNode;
  /** « stats » : rien ici (la page rend la synthèse) */
  tab: MoiTab;
  /** Moi › Marquées : les questions ou les flashcards (absent : les questions, ou les flashcards s'il n'y a qu'elles) */
  vueMarquees?: "questions" | "flashcards";
  now?: number;
  /** le chiffre-héros des réglages : les jours avant l'examen (calculés par la page) ; null : pas de date */
  herosReglages?: { valeur: React.ReactNode; legende: React.ReactNode } | null;
  /** la ligne d'état des réglages : l'objectif et les questions posées ; null : pas d'objectif chiffré */
  ligneReglages?: string | null;
}) {
  return (
    <>
      <OngletParAncre />
      {tab === "stats" ? null : tab === "erreurs" ? (
        <Registre d={d} liste="ratures" now={now} />
      ) : tab === "marquees" ? (
        <Registre d={d} liste="marquees" vue={vueMarquees} now={now} />
      ) : tab === "pieces" ? (
        (pieces ?? (
          <SousPage entete={<EnTeteSousPage retour={SOUS_MOI.retour} titre={SOUS_MOI.pieces.titre} illustration={{ nom: "moi-cabinet-curiosites", porte: "44% 84%" }} />}>
            <p className="card-quiet m-0 p-6 text-[14px]">{SOUS_MOI.pieces.indisponible}</p>
          </SousPage>
        ))
      ) : (
        <SousPage entete={<EnTeteSousPage retour={SOUS_MOI.retour} titre={REG.reglagesTitre} ligne={ligneReglages ?? undefined} illustration={{ nom: "moi-cabinet", position: "50% 55%", porte: "56% 76%" }} heros={herosReglages} />}>
          {settings}
        </SousPage>
      )}
    </>
  );
}

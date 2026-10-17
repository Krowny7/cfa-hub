import Link from "next/link";
import { FilMoi } from "@/components/moi/Briques";
import { Cabinet } from "@/components/moi/Cabinet";
import { OngletParAncre } from "@/components/moi/Clients";
import { Registre } from "@/components/moi/Registre";
import type { MoiTab } from "@/components/moi/data";
import type { MoiData } from "@/components/moi/types";
import { CURRENT_DOMAIN, CURRENT_PROGRAM } from "@/lib/domains";
import { CAB, REG } from "@/lib/voice-moi";

// Espace « Moi » (refonte, variante B « Le Cabinet ») : la page d'accueil de
// l'espace est ton cabinet (?onglet=stats, par défaut) ; le carnet de ratures
// (?onglet=erreurs) et les marquées (?onglet=marquees) ont chacun une page de
// liste (« Le registre ») ; l'étagère des pièces (?onglet=pieces) et les
// réglages (?onglet=reglages) la leur. Les anciens liens restent valables.
// Composant de présentation : les données arrivent en props ; `settings`
// reçoit le panneau de réglages (composants clients qui chargent eux-mêmes),
// `pieces` l'étagère « Mes pièces » (lue par la page sur cet onglet).
export function MoiView({ d, settings, pieces = null, tab = "stats", now }: { d: MoiData; settings: React.ReactNode; pieces?: React.ReactNode; tab?: MoiTab; now?: number }) {
  return (
    <>
      <OngletParAncre />
      {tab === "stats" ? (
        <Cabinet d={d} now={now} />
      ) : tab === "erreurs" ? (
        <Registre d={d} liste="ratures" now={now} />
      ) : tab === "marquees" ? (
        <Registre d={d} liste="marquees" now={now} />
      ) : tab === "pieces" ? (
        (pieces ?? (
          <div className="rl-wide flex flex-col gap-3">
            <FilMoi label={REG.fil} />
            <p className="card-quiet m-0 p-6 text-[14px]">L&apos;étagère ne s&apos;ouvre pas pour le moment. Réessaie dans un instant.</p>
          </div>
        ))
      ) : (
        <div className="rl-wide flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-3">
            <FilMoi label={REG.fil} />
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <div>
                <p className="t-eyebrow m-0">{CAB.surtitre(CURRENT_DOMAIN.name, CURRENT_PROGRAM.name)}</p>
                <h1 className="t-h1 m-0 mt-1">{REG.reglagesTitre}</h1>
              </div>
              <Link href={`/people/${d.userId}`} className="ink-link">
                {REG.profilPublic}
              </Link>
            </div>
          </div>
          {settings}
        </div>
      )}
    </>
  );
}

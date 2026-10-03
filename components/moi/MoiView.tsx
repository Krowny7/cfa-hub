import Link from "next/link";
import { MoiHeader } from "@/components/moi/MoiHeader";
import { MoiTabs } from "@/components/moi/MoiTabs";
import { StatsTab } from "@/components/moi/StatsSection";
import { ErrorsTab } from "@/components/moi/ErrorsSection";
import type { MoiTab } from "@/components/moi/data";
import type { MoiData } from "@/components/moi/types";

// Espace « Moi » (V3) : un en-tête compact, puis trois onglets, chacun une
// seule vue : Stats (matières, activité, sessions), Erreurs (toutes les
// questions de fiches à revoir), Réglages (profil, date d'examen, apparence,
// groupes, déconnexion). Composant de présentation : les données arrivent en
// props ; `settings` reçoit le panneau de réglages (composants clients qui
// chargent eux-mêmes).
export function MoiView({ d, settings, tab = "stats", now }: { d: MoiData; settings: React.ReactNode; tab?: MoiTab; now?: number }) {
  return (
    <div className="rl-wide flex flex-col gap-8 md:gap-12">
      <MoiHeader d={d} now={now} />
      <MoiTabs
        initial={tab}
        counts={{ erreurs: d.errors.available ? d.errors.total : 0 }}
        asides={{
          erreurs: (
            <Link href="/fiches" className="ink-link">
              Toutes les fiches
            </Link>
          ),
          reglages: (
            <Link href={`/people/${d.userId}`} className="ink-link">
              Mon profil public
            </Link>
          ),
        }}
        panels={{
          stats: <StatsTab d={d} />,
          erreurs: <ErrorsTab errors={d.errors} now={now} />,
          reglages: settings,
        }}
      />
    </div>
  );
}

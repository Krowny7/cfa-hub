import Link from "next/link";
import { SectionTitle } from "@/components/ui/Titles";
import { MoiHeader } from "@/components/moi/MoiHeader";
import { ProgressSection, StatsSection } from "@/components/moi/StatsSection";
import { ErrorsSection } from "@/components/moi/ErrorsSection";
import type { MoiData } from "@/components/moi/types";

// Espace « Moi » (V2) : profil et rang compact, stats (radar, activité),
// toutes mes erreurs, progression par matière, réglages. Composant de
// présentation : les données arrivent en props ; `settings` reçoit le
// panneau de réglages (composants clients qui chargent eux-mêmes).
export function MoiView({ d, settings }: { d: MoiData; settings: React.ReactNode }) {
  return (
    <div className="rl-wide flex flex-col gap-12">
      <MoiHeader d={d} />
      <StatsSection d={d} />
      <ErrorsSection errors={d.errors} />
      <ProgressSection d={d} />
      <section id="reglages" className="flex scroll-mt-24 flex-col gap-5" aria-label="Réglages">
        <SectionTitle
          title="Réglages"
          sub="profil, date d'examen, apparence, groupes"
          action={
            <Link href={`/people/${d.userId}`} className="ink-link">
              Mon profil public
            </Link>
          }
        />
        {settings}
      </section>
    </div>
  );
}

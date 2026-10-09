import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SectionTitle } from "@/components/ui/Titles";
import { Avatar } from "@/components/classement/Avatar";
import { JourRelatif } from "@/components/profil/JourRelatif";
import { TIERS } from "@/lib/ranks";
import type { Nouveaute } from "@/lib/profil/nouveau";
import { NOUVEAU } from "@/lib/voice-social";

// « Du nouveau » sur l'accueil : les nouvelles de tes amis sur 7 jours (un
// palier, une victoire contre toi, un dépassement), cinq au plus. Une ligne
// par nouvelle, qui mène à son profil (une victoire : au Face-à-face). La
// date se dit dans le navigateur (JourRelatif). Rien de neuf : rien.

function ce(n: Nouveaute): string {
  if (n.type === "palier") return NOUVEAU.palier(TIERS[n.palier]?.name ?? "");
  if (n.type === "victoire") return NOUVEAU.victoire(n.score);
  return NOUVEAU.depasse(n.ecart);
}

export function DuNouveau({ nouvelles }: { nouvelles: Nouveaute[] }) {
  if (!nouvelles.length) return null;
  return (
    <section className="rl-section" aria-labelledby="accueil-nouveau">
      <SectionTitle title={<span id="accueil-nouveau">{NOUVEAU.titre}</span>} sub={NOUVEAU.aide} />
      <ul className="m-0 grid list-none gap-x-10 p-0 lg:grid-cols-2">
        {nouvelles.map((n) => (
          <li key={n.cle} className="border-b border-line last:border-b-0 lg:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
            <Link
              href={n.type === "victoire" ? `/people/${n.joueur.id}?onglet=face-a-face#profil-onglets` : `/people/${n.joueur.id}`}
              aria-label={`${n.joueur.nom} ${ce(n)}. ${NOUVEAU.voir(n.joueur.nom)}`}
              className="rl-row group flex min-h-[56px] items-center gap-3 rounded-[12px] px-1.5 py-2"
            >
              <Avatar src={n.joueur.avatarUrl} name={n.joueur.nom} size={34} userId={n.joueur.id} />
              <span className="min-w-0 flex-1 text-[14.5px] leading-snug">
                <b className="font-semibold">{n.joueur.nom}</b> <span className="text-muted">{ce(n)}</span>
              </span>
              <JourRelatif jour={n.jour} className="t-micro shrink-0" />
              <ChevronRight size={15} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

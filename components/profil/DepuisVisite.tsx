import { Eye } from "lucide-react";
import { rankFor } from "@/lib/ranks";
import type { Retour } from "@/lib/profil/social";
import { TAMPONS_LISTE } from "@/lib/profil/tampons";
import { RETOUR } from "@/lib/voice-social";

// « Depuis ta dernière visite », sur son propre profil : les tampons reçus,
// les joueurs venus voir, l'ELO, les victoires et un nouveau palier (Top 10
// compris) depuis la visite précédente, en une ligne (la table des sceaux
// viendra s'y ajouter). Le détail des tampons est déjà dans l'en-tête.
// Rien de neuf : le nombre de joueurs de la semaine seul, jamais leurs noms ;
// personne non plus : rien. Sur ordinateur, sous la carte du rang ; sur
// téléphone, sous les onglets (l'en-tête et les onglets tiennent dans le
// premier écran). Sans état (aucune date relative) : rendu au serveur.

export function DepuisVisite({
  retour,
  elo,
  mastery,
  place,
  className = "",
}: {
  retour: Retour;
  /** l'ELO d'aujourd'hui */
  elo: number;
  mastery: number | null;
  /** la place au classement d'aujourd'hui (pour le Top 10) */
  place: number | null;
  /** classes de plus, sur le bloc rendu (« lg:hidden ») */
  className?: string;
}) {
  const tampons = TAMPONS_LISTE.reduce((n, t) => n + retour.tampons[t], 0);
  const avant = retour.eloAvant !== null ? rankFor(retour.eloAvant, mastery, retour.placeAvant) : null;
  const maintenant = rankFor(elo, mastery, place);
  const nouveauPalier = avant !== null && maintenant.tierIndex > avant.tierIndex ? maintenant.tier.name : null;

  type Fait = { cle: string; texte: string; elo?: boolean };
  const faits: Fait[] = retour.depuis
    ? [
        tampons ? { cle: "tampons", texte: RETOUR.tampons(tampons) } : null,
        retour.visiteurs ? { cle: "visiteurs", texte: RETOUR.visiteurs(retour.visiteurs) } : null,
        retour.elo ? { cle: "elo", texte: RETOUR.elo(retour.elo), elo: true } : null,
        retour.victoires ? { cle: "victoires", texte: RETOUR.victoires(retour.victoires) } : null,
        nouveauPalier ? { cle: "palier", texte: RETOUR.palier(nouveauPalier) } : null,
      ].filter((x): x is Fait => !!x)
    : [];

  if (!faits.length) {
    if (!retour.semaine) return null;
    return (
      <p className={`t-small m-0 flex items-start gap-1.5 px-1 ${className}`}>
        <Eye size={14} aria-hidden className="mt-[3px] shrink-0" />
        <span>
          {RETOUR.semaine(retour.semaine)} <span className="text-muted">{RETOUR.anonyme}</span>
        </span>
      </p>
    );
  }

  return (
    <section aria-label={RETOUR.titre} className={`card-quiet flex flex-col gap-1.5 px-4 py-3 sm:px-5 ${className}`}>
      <h2 className="t-eyebrow m-0">{RETOUR.titre}</h2>
      <ul className="m-0 flex list-none flex-wrap items-baseline gap-x-2 gap-y-0.5 p-0 text-[15px] font-semibold">
        {faits.map((f, i) => (
          <li key={f.cle} className="inline-flex items-baseline gap-2">
            {f.elo ? (
              <span className="tabular-nums" style={{ color: retour.elo >= 0 ? "var(--gain)" : "var(--perte)" }}>
                {f.texte}
              </span>
            ) : (
              <span>{f.texte}</span>
            )}
            {/* le point suit le fait : une ligne ne commence jamais par lui */}
            {i < faits.length - 1 && (
              <span aria-hidden className="text-muted">
                ·
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

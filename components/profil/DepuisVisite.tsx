import { Eye } from "lucide-react";
import { rankFor } from "@/lib/ranks";
import type { Retour } from "@/lib/profil/social";
import { TAMPONS_LISTE } from "@/lib/profil/tampons";
import { MOTS, RETOUR } from "@/lib/voice-social";

// « Depuis ta dernière visite », sur son propre profil, entre l'en-tête et
// les onglets : les tampons reçus, les joueurs venus voir, l'ELO, les
// victoires et un nouveau palier depuis la visite précédente (la table des
// sceaux viendra s'y ajouter). En une ligne ; le détail des tampons
// dessous. Puis le nombre de joueurs de la semaine, jamais leurs noms.
// Rien de neuf : la ligne de la semaine seule ; personne non plus : rien.
// Sans état (aucune date relative) : rendu au serveur.

export function DepuisVisite({ retour, elo, mastery }: { retour: Retour; /** l'ELO d'aujourd'hui */ elo: number; mastery: number | null }) {
  const tampons = TAMPONS_LISTE.reduce((n, t) => n + retour.tampons[t], 0);
  const avant = retour.eloAvant !== null ? rankFor(retour.eloAvant, mastery) : null;
  const maintenant = rankFor(elo, mastery);
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
  if (!faits.length && !retour.semaine) return null;

  const semaine = retour.semaine ? (
    <p className="t-small m-0 inline-flex items-center gap-1.5">
      <Eye size={14} aria-hidden className="shrink-0" />
      <span>
        {RETOUR.semaine(retour.semaine)} <span className="text-muted">{RETOUR.anonyme}</span>
      </span>
    </p>
  ) : null;

  if (!faits.length) return <div className="px-1">{semaine}</div>;

  return (
    <section aria-labelledby="profil-retour" className="card-quiet flex flex-col gap-2 px-4 py-3.5 sm:px-5">
      <h2 id="profil-retour" className="t-eyebrow m-0">
        {RETOUR.titre}
      </h2>
      <ul className="m-0 flex list-none flex-wrap items-baseline gap-x-2 gap-y-1 p-0 text-[15px] font-semibold">
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
      {tampons > 0 && <p className="t-small m-0">{RETOUR.detailTampons(TAMPONS_LISTE.map((t) => [MOTS[t], retour.tampons[t]]))}</p>}
      {semaine}
    </section>
  );
}

import { RangeeCarnets } from "@/components/reviser/RangeeCarnets";
import { carnetsDe, type Carnets } from "@/components/reviser/carnets";
import { onePagerItems } from "@/components/reviser/shelves";
import { ActionEncre, EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import { CARNETS } from "@/lib/voice-reviser-b";
import { RETOUR } from "@/lib/voice-reviser";

// La page /fiches sans requête (app/fiches/page.tsx la remplit ; la route d'essai aussi).

/** La page, sans requête (rendue aussi par la route d'essai). */
export function VueCarnets({ donnees }: { donnees: Carnets | null }) {
  const d = donnees ?? carnetsDe([], null);
  const avance = !!donnees;
  const conseil = d.carnets.find((c) => c.key === d.conseil) ?? null;
  const entame = !!conseil && conseil.faites + conseil.entamees > 0;
  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={RETOUR.reviser}
          titre={CARNETS.titre}
          ligne={avance ? CARNETS.ligne(d.finies, d.entamees, d.neuves) : CARNETS.ligneSansDonnees}
          illustration={{ nom: "reviser-bibliotheque", position: "50% 52%" }}
          heros={
            !avance || d.pagesTotal <= 0
              ? null
              : d.pagesFaites > 0
                ? { valeur: d.pagesFaites, legende: CARNETS.herosLegende(d.pagesTotal) }
                : { valeur: d.pagesTotal, legende: CARNETS.herosLegendeNeuf }
          }
        />
      }
    >
      <Scene>
        <RangeeCarnets
          carnets={avance ? d.carnets : d.carnets.map((c) => ({ ...c, pages: c.pages || PAGES_CONNUES[c.key] || 0 }))}
          conseil={d.conseil}
          avance={avance}
          mur={{ images: onePagerItems().map((o) => o.mini), href: "/fiches/one-pagers" }}
          action={
            conseil?.href ? (
              <ActionEncre href={conseil.href}>
                {entame ? CARNETS.reprendre(conseil.nom) : CARNETS.ouvrir(conseil.nom)}
                <span aria-hidden>→</span>
              </ActionEncre>
            ) : null
          }
        />
      </Scene>
    </SousPage>
  );
}

/** Les pages de chaque fiche (app/fiches/<slug>, totalPages), pour dessiner les carnets quand la base ne répond pas. */
const PAGES_CONNUES: Record<string, number> = {
  ethics: 5,
  quant: 6,
  economics: 5,
  corporate: 4,
  fsa: 11,
  equity: 8,
  fixed_income: 8,
  derivatives: 5,
  alternatives: 4,
  portfolio: 6,
};

import Link from "next/link";
import { ErrorsTab } from "@/components/moi/ErrorsSection";
import { MarqueesTab } from "@/components/moi/MarqueesTab";
import { CartesMarqueesTab } from "@/components/moi/CartesMarqueesTab";
import { SynchroMarquesCartes } from "@/components/flashcards/SynchroMarquesCartes";
import { RaturesTab } from "@/components/moi/RaturesTab";
import { Chiffre } from "@/components/ui/Decors";
import { CadreZones, EnTeteSousPage, SousPage, type Zone } from "@/components/ui/SousPage";
import { REG, SOUS_MOI } from "@/lib/voice-moi";
import { nombre } from "@/lib/voice";
import type { MoiData } from "@/components/moi/types";

// Les pages de liste de Moi, sur le modèle des sous-pages validé par Théo (2026-11-12) :
// le carnet de ratures (?onglet=erreurs) et les marquées (?onglet=marquees). L'en-tête
// commun (retour à Moi, titre, une ligne, la peinture du lieu), puis le cadre à zones :
// à gauche « Ton carnet », la liste complète avec ses filtres (et, pour les marquées, le
// choix questions ou flashcards) ; à droite « À reprendre », le chiffre de la liste
// montrée. « Mettre au propre » vit dans la liste du carnet (RaturesTab). Pas d'annexe.
// Composant de présentation.

/**
 * Moi › Marquées : « Questions · 113 | Flashcards · 4 », en haut de la liste (les flashcards
 * se perdaient sous une longue liste de questions). Des liens (?vue=…) : la page est rendue
 * côté serveur, l'adresse dit ce qu'on regarde. Un compte inconnu (lecture en repli) : sans chiffre.
 */
function SelecteurMarquees({ actif, questions, cartes }: { actif: "questions" | "flashcards"; questions: number | null; cartes: number | null }) {
  const T = REG.marquees;
  const choix = [
    { cle: "questions", libelle: T.selQuestions, n: questions },
    { cle: "flashcards", libelle: T.selFlashcards, n: cartes },
  ] as const;
  return (
    <nav aria-label={T.selecteur} className="flex flex-wrap gap-2">
      {choix.map((c) => (
        <Link
          key={c.cle}
          href={`/moi?onglet=marquees&vue=${c.cle}`}
          className={"chip min-h-[44px] px-4 text-[15px]" + (actif === c.cle ? " chip-active" : "")}
          aria-current={actif === c.cle ? "page" : undefined}
        >
          {c.libelle}
          {c.n !== null && <span className="font-mono text-[13px] tabular-nums opacity-80">· {nombre(c.n)}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function Registre({ d, liste, vue, now }: { d: MoiData; liste: "ratures" | "marquees"; vue?: "questions" | "flashcards"; now?: number }) {
  // les flashcards marquées (lues par la page sur cet onglet) : une vue à part, choisie par le
  // sélecteur ; sans choix, les questions, ou les flashcards s'il n'y a qu'elles
  const cartes = liste === "marquees" ? d.cartesMarquees : undefined;
  const nQuestions = d.marquees.available ? d.marquees.items.length : null;
  const nCartes = cartes?.available && !cartes.erreur ? cartes.items.length : null;
  const voirCartes = !!cartes && (vue === "flashcards" || (vue === undefined && nQuestions === 0 && (nCartes ?? 0) > 0));
  const selecteur = cartes ? <SelecteurMarquees actif={voirCartes ? "flashcards" : "questions"} questions={nQuestions} cartes={nCartes} /> : null;

  // la liste complète : le carnet de ratures (ses filtres, « Mettre au propre », ses lignes), l'ancien
  // carnet des fiches tant que la migration manque, les questions marquées, ou les flashcards marquées
  const corps =
    voirCartes && cartes ? (
      <CartesMarqueesTab cartes={cartes} sansTitre />
    ) : liste === "ratures" ? (
      d.ratures.available ? (
        <RaturesTab initial={d.ratures} notions={d.ratures.parNotion} now={now} sansResume />
      ) : (
        <ErrorsTab errors={d.errors} now={now} />
      )
    ) : (
      <MarqueesTab marquees={d.marquees} cartes={cartes ? { available: cartes.available, n: cartes.items.length, erreur: cartes.erreur } : undefined} />
    );

  // la colonne grise : le chiffre de la liste montrée ; rien à reprendre (ou compte inconnu) : une seule zone
  const n = liste === "ratures" ? (d.ratures.available ? d.ratures.total : null) : voirCartes ? nCartes : nQuestions;
  const legende = liste === "ratures" ? SOUS_MOI.ratures.legende(n ?? 0) : voirCartes ? SOUS_MOI.marquees.legendeCartes(n ?? 0) : SOUS_MOI.marquees.legendeQuestions(n ?? 0);
  const droite: Zone | undefined = n ? { titre: SOUS_MOI.aReprendre, contenu: <Chiffre valeur={nombre(n)} legende={legende} /> } : undefined;

  const entete =
    liste === "ratures" ? (
      <EnTeteSousPage
        retour={SOUS_MOI.retour}
        titre={SOUS_MOI.ratures.titre}
        ligne={d.ratures.available ? SOUS_MOI.ratures.ligne(d.ratures.scellees !== undefined) : undefined}
        illustration={{ nom: "moi-carnet" }}
      />
    ) : (
      <EnTeteSousPage retour={SOUS_MOI.retour} titre={REG.marquees.kickerTout} ligne={SOUS_MOI.marquees.ligne} illustration={{ nom: "moi-marquees", position: "50% 30%" }} />
    );

  return (
    <SousPage entete={entete}>
      <CadreZones
        gauche={{
          titre: SOUS_MOI.carnet,
          contenu: (
            <div id="liste" className="flex min-w-0 scroll-mt-24 flex-col gap-4">
              {selecteur}
              {corps}
              {/* les flashcards gardées sur l'appareil qui rejoignent le compte : la page se relit une fois */}
              {cartes && <SynchroMarquesCartes />}
            </div>
          ),
        }}
        droite={droite}
      />
    </SousPage>
  );
}

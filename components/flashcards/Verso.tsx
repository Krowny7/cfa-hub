import type { CSSProperties } from "react";
import { RichText, RichTextLigne } from "@/components/RichText";
import { aSurligne, decouperVerso, echelleFormule, type Retenir, type VersoStructure } from "@/lib/flashcards/verso";
import { BOUCLE } from "@/lib/voice-z3c";
import v from "./Verso.module.css";

// Le verso structuré d'une flashcard (lib/flashcards/verso.ts), en trois
// cases : À RETENIR en grand (passage surligné, formule en bloc ou liste),
// EN CLAIR en texte courant, PIÈGE au stylo rouge. Deux tailles : « fiche »
// (la pile de la révision et la carte de la séance : étiquettes dans la marge
// sur ordinateur, en tête de ligne sur téléphone) et « compact » (listes,
// partage, éditeur).

function Etiquette({ children, enLigne = false, piege = false }: { children: React.ReactNode; enLigne?: boolean; piege?: boolean }) {
  return (
    <span className={`t-eyebrow ${v.etiquette} ${enLigne ? v.enLigne : ""} ${piege ? v.etiquettePiege : ""}`}>
      {piege && (
        <span className={v.marque} aria-hidden>
          !
        </span>
      )}
      {children}
    </span>
  );
}

/** Une ligne autour d'une formule ou d'une liste : en grand si elle porte le surligné (« EBIT = ==7 000== »), c'est elle l'idée à retenir. */
function LigneAutour({ texte, className = "" }: { texte: string; className?: string }) {
  return <RichText text={texte} className={`${aSurligne(texte) ? v.titreFort : v.titre} ${className}`} />;
}

function ContenuRetenir({ r }: { r: Retenir }) {
  if (r.forme === "texte") return <RichText text={r.texte} className={v.retenir} />;
  const echelle = r.forme === "formule" ? echelleFormule(r.formule) : 1;
  return (
    <div className={`${v.retenir} ${r.forme === "formule" ? v.formule : ""}`}>
      {r.titre && <LigneAutour texte={r.titre} />}
      {r.forme === "formule" ? (
        <>
          {/* --echelle : la réduction de la formule sur téléphone (Verso.module.css) */}
          <div className={v.bloc} style={echelle < 1 ? ({ "--echelle": echelle } as CSSProperties) : undefined}>
            <RichText text={r.formule} />
          </div>
          {r.suite && <LigneAutour texte={r.suite} className={v.suite} />}
        </>
      ) : (
        // role="list" : Safari retire la sémantique de liste quand list-style vaut none
        <ul role="list" className={v.liste}>
          {r.items.map((it, i) => (
            <li key={i}>
              <RichTextLigne line={it} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Les trois cases d'un verso déjà découpé. */
export function VersoTroisCases({
  verso,
  compact = false,
  big = false,
  className = "",
}: {
  verso: VersoStructure;
  compact?: boolean;
  /** plein écran de la révision : un cran plus grand */
  big?: boolean;
  className?: string;
}) {
  return (
    <div className={`${compact ? v.compact : v.fiche} ${big ? v.big : ""} ${className}`}>
      <div className={v.zone}>
        {!compact && <Etiquette>{BOUCLE.retenir}</Etiquette>}
        <ContenuRetenir r={verso.retenir} />
      </div>
      <div className={v.zone}>
        <Etiquette enLigne>{BOUCLE.enClair}</Etiquette>
        <RichText text={verso.clair} className={v.clair} />
      </div>
      {verso.piege && (
        <div className={v.zone}>
          <Etiquette enLigne piege>
            {BOUCLE.piege}
          </Etiquette>
          <RichText text={verso.piege} className={v.piege} />
        </div>
      )}
    </div>
  );
}

/**
 * Un verso dans une liste ou une petite carte : les trois cases en compact
 * s'il suit le format, sinon le texte tel quel (anciennes cartes, cartes des
 * joueurs). `className` habille les deux (taille, couleur, coupure des mots).
 * `fiche` : les trois cases en grand, comme dans la pile (la carte de la
 * séance) ; `className` n'habille alors que le repli.
 */
export function VersoCompact({ back, className = "", fiche = false }: { back: string; className?: string; fiche?: boolean }) {
  const verso = decouperVerso(back);
  if (!verso) return <RichText text={back} className={className} />;
  if (fiche) return <VersoTroisCases verso={verso} />;
  return <VersoTroisCases verso={verso} compact className={className} />;
}

import type { StatutPaquet } from "@/lib/flashcards/avancement";
import { RV } from "@/lib/voice-reviser";

// Les pastilles d'avancement des flashcards : une par paquet, au trait de la
// couleur du texte (aucune encre) ; la forme porte le sens, pas la couleur :
// pleine = maîtrisé, à moitié = en cours, vide = pas commencé. Sans état :
// utilisable côté serveur (la légende) comme dans l'îlot client de la ligne.

const REMPLISSAGE: Record<StatutPaquet, string> = {
  maitrise: "currentColor",
  cours: "linear-gradient(90deg, currentColor 50%, transparent 50%)",
  neuf: "transparent",
};

export function Pastille({ statut }: { statut: StatutPaquet }) {
  return <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ width: 9, height: 9, border: "1.5px solid currentColor", background: REMPLISSAGE[statut] }} />;
}

/** La légende des trois pastilles, une ligne sous l'en-tête de l'index. */
export function LegendeAvance() {
  return (
    <p className="t-micro m-0 flex flex-wrap items-center gap-x-4 gap-y-1">
      <span>{RV.avanceLegende}</span>
      {(["maitrise", "cours", "neuf"] as const).map((statut) => (
        <span key={statut} className="inline-flex items-center gap-1.5">
          <Pastille statut={statut} />
          {statut === "maitrise" ? RV.avanceMaitrise : statut === "cours" ? RV.avanceCours : RV.avanceNeuf}
        </span>
      ))}
    </p>
  );
}

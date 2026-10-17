import { BONNE_CHANCE } from "@/lib/codex/calendrier";
import k from "./Calendrier.module.css";
import e from "./Encre.module.css";

// Le jour J (V3 §7.4) : une seule carte, rien d'autre. Un lien discret
// rouvre le Codex pour qui le cherche. data-jour-j : Léonard ne surgit pas.
// Ce jour-là, la carte est seule sur /codex : son titre est le h1 de la page.

export function BonneChance({ onVoir }: { onVoir: () => void }) {
  return (
    <section className={k.bonneChance} data-jour-j aria-labelledby="bonne-chance">
      <h1 id="bonne-chance" className={`font-brand ${k.bonneChanceTitre}`}>
        {BONNE_CHANCE.titre}
      </h1>
      <p className={k.bonneChanceTexte}>{BONNE_CHANCE.texte}</p>
      <button type="button" className={e.lienDiscret} onClick={onVoir}>
        Voir le Codex
      </button>
    </section>
  );
}

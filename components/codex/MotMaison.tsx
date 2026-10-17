import { MOTS_MAISON } from "@/lib/voice-codex";

// Les mots maison (trait, rature, jour d'encre, notion tenue) et leur
// définition au premier usage sur un écran (Codex simplifié, §4.4) : un
// repli « C'est quoi, une rature ? » de 44 px qui s'ouvre au doigt, sans
// infobulle title=. `textes` : ce que l'écran affiche ; seuls les mots qui y
// paraissent ont leur définition, chacun une fois.

export type Mot = keyof typeof MOTS_MAISON;

const QUESTION: Record<Mot, string> = {
  trait: "C'est quoi, un trait ?",
  rature: "C'est quoi, une rature ?",
  jourEncre: "C'est quoi, un jour d'encre ?",
  notionTenue: "C'est quoi, une notion tenue ?",
};

// un mot entier : ni lettre avant ni lettre après (accents compris : « traité » n'est pas un trait) ;
// sans lookbehind, que les vieux Safari ne lisent pas
const MOTIFS: [Mot, RegExp][] = [
  ["rature", /(?:^|[^\p{L}])ratures?(?!\p{L})/iu],
  ["jourEncre", /(?:^|[^\p{L}])jours? d['’]encre(?!\p{L})/iu],
  ["notionTenue", /(?:^|[^\p{L}])notions? tenues?(?!\p{L})/iu],
  ["trait", /(?:^|[^\p{L}])traits?(?!\p{L})/iu],
];

/** Les mots maison qui paraissent dans ces textes, chacun une fois. */
export function motsMaisonDe(textes: (string | null | undefined)[]): Mot[] {
  const tout = textes.filter(Boolean).join(" · ");
  return MOTIFS.filter(([, re]) => re.test(tout)).map(([m]) => m);
}

/** « C'est quoi, une rature ? » : la définition d'un mot maison, repliée. */
export function MotMaison({ mot }: { mot: Mot }) {
  return (
    <details className="group">
      <summary className="t-micro inline-flex min-h-[44px] cursor-pointer list-none items-center underline decoration-dotted underline-offset-2 [&::-webkit-details-marker]:hidden">
        {QUESTION[mot]}
      </summary>
      <p className="t-micro m-0 pb-2">{MOTS_MAISON[mot].definition}</p>
    </details>
  );
}

/** Les définitions des mots maison de ces textes (rien s'il n'y en a pas). */
export function MotsMaison({ textes, className = "" }: { textes: (string | null | undefined)[]; className?: string }) {
  const mots = motsMaisonDe(textes);
  if (!mots.length) return null;
  return (
    <div className={"flex flex-wrap gap-x-4 " + className}>
      {mots.map((m) => (
        <MotMaison key={m} mot={m} />
      ))}
    </div>
  );
}

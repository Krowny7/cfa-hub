import type { Copie } from "@/lib/formules/types";

// Un tour de la page blanche : les copies à rendre sont celles où il reste quelque chose à
// maîtriser, réduites à ces lignes-là. Module neutre (serveur et navigateur).

export function copiesARendre(copies: Copie[], maitrisees: ReadonlySet<string>): Copie[] {
  return copies.map((c) => ({ ...c, formules: c.formules.filter((f) => !maitrisees.has(f.id)) })).filter((c) => c.formules.length > 0);
}

export const lignesDesCopies = (copies: Copie[]): number => copies.reduce((t, c) => t + c.formules.length, 0);

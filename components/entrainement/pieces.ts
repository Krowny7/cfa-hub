import { SUBJECTS } from "@/components/reviser/catalog";

// Les petites aides des carrousels des sous-pages de S'entraîner : le code court d'une matière
// (ETH, QM…) pour la face des pièces, et leur numéro (« 01 »). Module neutre.

const CODES: Record<string, string> = Object.fromEntries(SUBJECTS.map((x) => [x.key, x.code]));

/** « ETH », « QM »… ; à défaut, les trois premières lettres du nom. */
export const codeMatiere = (cle: string, nom?: string) => CODES[cle] ?? (nom ?? cle).replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();

/** « 01 » à « 10 » */
export const numeroPiece = (i: number) => String(i + 1).padStart(2, "0");

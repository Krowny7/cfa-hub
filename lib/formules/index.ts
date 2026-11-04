import { ALTERNATIVES } from "@/lib/formules/alternatives";
import { CORPORATE } from "@/lib/formules/corporate";
import { DERIVATIVES } from "@/lib/formules/derivatives";
import { ECONOMICS } from "@/lib/formules/economics";
import { EQUITY } from "@/lib/formules/equity";
import { ETHICS } from "@/lib/formules/ethics";
import { FIXED_INCOME } from "@/lib/formules/fixed_income";
import { FSA } from "@/lib/formules/fsa";
import { PORTFOLIO } from "@/lib/formules/portfolio";
import { QUANT } from "@/lib/formules/quant";
import type { MatiereFormules } from "@/lib/formules/types";

// Tout le catalogue de la page blanche. Côté serveur seulement : le navigateur ne reçoit que
// la matière ouverte (app/page-blanche/[matiere]).

export const CATALOGUE: MatiereFormules[] = [ETHICS, QUANT, ECONOMICS, FSA, CORPORATE, EQUITY, FIXED_INCOME, DERIVATIVES, ALTERNATIVES, PORTFOLIO];

export const matiereDe = (cle: string): MatiereFormules | null => CATALOGUE.find((m) => m.matiere === cle) ?? null;

export const lignesDe = (m: MatiereFormules): number => m.copies.reduce((t, c) => t + c.formules.length, 0);

export const TOTAL_FORMULES = CATALOGUE.reduce((t, m) => t + lignesDe(m), 0);

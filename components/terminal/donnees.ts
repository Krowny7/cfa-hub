import { nombre } from "@/lib/voice";

// Les données du Terminal : entièrement fictives. Sociétés, indices et taux sont inventés ; les
// codes de valeur finissent par X pour ne pas se confondre avec une vraie cotation. Les ratios se
// calculent ici, à partir de ces lignes : les réponses des exercices ne peuvent pas s'en écarter.

export type Compte = { annee: string; ca: number; ebitda: number; ebit: number; rn: number; fcf: number };

export type Valeur = {
  code: string;
  nom: string;
  secteur: string;
  cours: number;
  /** variation de la séance, en % */
  variation: number;
  /** en millions */
  actions: number;
  dividende: number;
  /** en millions ; négative : trésorerie nette */
  detteNette: number;
  /** trois années, de la plus ancienne à la dernière */
  comptes: Compte[];
  /** cours de fin de mois sur douze mois */
  historique: number[];
};

export const VALEURS: Valeur[] = [
  {
    code: "ORVX",
    nom: "Orvane Logistique",
    secteur: "Transport",
    cours: 42.5,
    variation: 0.83,
    actions: 120,
    dividende: 0.85,
    detteNette: 900,
    comptes: [
      { annee: "A-2", ca: 2800, ebitda: 430, ebit: 270, rn: 170, fcf: 120 },
      { annee: "A-1", ca: 2950, ebitda: 465, ebit: 295, rn: 190, fcf: 140 },
      { annee: "A", ca: 3120, ebitda: 510, ebit: 330, rn: 204, fcf: 165 },
    ],
    historique: [35.2, 36.1, 35.4, 37, 38.3, 37.6, 39.1, 40.4, 39.8, 41.2, 42.1, 42.5],
  },
  {
    code: "BELX",
    nom: "Belmère Énergie",
    secteur: "Énergie",
    cours: 18.2,
    variation: -0.54,
    actions: 400,
    dividende: 0.9,
    detteNette: 3200,
    comptes: [
      { annee: "A-2", ca: 9400, ebitda: 1640, ebit: 910, rn: 520, fcf: 380 },
      { annee: "A-1", ca: 10100, ebitda: 1810, ebit: 1040, rn: 610, fcf: 450 },
      { annee: "A", ca: 9800, ebitda: 1720, ebit: 960, rn: 560, fcf: 410 },
    ],
    historique: [21.4, 20.9, 20.2, 20.6, 19.8, 19.1, 19.5, 18.7, 18.9, 18.4, 18.5, 18.2],
  },
  {
    code: "KELX",
    nom: "Kelvène Logiciels",
    secteur: "Logiciels",
    cours: 96,
    variation: 1.62,
    actions: 60,
    dividende: 0.6,
    detteNette: -310,
    comptes: [
      { annee: "A-2", ca: 720, ebitda: 210, ebit: 170, rn: 125, fcf: 118 },
      { annee: "A-1", ca: 860, ebitda: 270, ebit: 225, rn: 168, fcf: 160 },
      { annee: "A", ca: 1010, ebitda: 335, ebit: 285, rn: 216, fcf: 205 },
    ],
    historique: [71, 74.5, 73.2, 78, 81.4, 80.1, 85.6, 88.2, 86.9, 91, 94.4, 96],
  },
  {
    code: "TESX",
    nom: "Tessane Santé",
    secteur: "Santé",
    cours: 64,
    variation: 0.12,
    actions: 150,
    dividende: 1.6,
    detteNette: 1100,
    comptes: [
      { annee: "A-2", ca: 3300, ebitda: 860, ebit: 640, rn: 450, fcf: 390 },
      { annee: "A-1", ca: 3420, ebitda: 905, ebit: 672, rn: 475, fcf: 415 },
      { annee: "A", ca: 3580, ebitda: 965, ebit: 720, rn: 512, fcf: 450 },
    ],
    historique: [60.2, 61, 60.4, 61.8, 62.1, 61.5, 62.6, 63.4, 62.9, 63.2, 63.9, 64],
  },
];

export const INDICES: { nom: string; niveau: number; variation: number }[] = [
  { nom: "Indice Nord 40", niveau: 7412.6, variation: 0.42 },
  { nom: "Indice Atlantique 500", niveau: 5128.3, variation: -0.18 },
  { nom: "Indice Levant 225", niveau: 38960.4, variation: 0.71 },
];

/** La courbe des taux d'État, en % : aujourd'hui, et il y a un mois. */
export const COURBE: { maturite: string; taux: number; avant: number }[] = [
  { maturite: "3 mois", taux: 3.4, avant: 3.45 },
  { maturite: "6 mois", taux: 3.32, avant: 3.4 },
  { maturite: "1 an", taux: 3.18, avant: 3.3 },
  { maturite: "2 ans", taux: 3.05, avant: 3.2 },
  { maturite: "5 ans", taux: 3.2, avant: 3.3 },
  { maturite: "10 ans", taux: 3.55, avant: 3.6 },
  { maturite: "30 ans", taux: 3.95, avant: 3.95 },
];

export const valeurDe = (code: string): Valeur => VALEURS.find((v) => v.code === code) ?? VALEURS[0];

const derniere = (v: Valeur) => v.comptes[v.comptes.length - 1];

export const ebitda = (v: Valeur) => derniere(v).ebitda;
export const capi = (v: Valeur) => v.cours * v.actions;
export const bpa = (v: Valeur) => derniere(v).rn / v.actions;
export const per = (v: Valeur) => v.cours / bpa(v);
export const veEbitda = (v: Valeur) => (capi(v) + v.detteNette) / ebitda(v);
export const levier = (v: Valeur) => v.detteNette / ebitda(v);
export const margeEbit = (v: Valeur) => (100 * derniere(v).ebit) / derniere(v).ca;
export const croissance = (v: Valeur) => {
  const [precedente, derniereAnnee] = v.comptes.slice(-2);
  return 100 * (derniereAnnee.ca / precedente.ca - 1);
};

/** Écart de taux en points de base, arrondi (le flottant laisse des traînes). */
export const ecartPb = (taux: number, avant: number) => Math.round((taux - avant) * 100);

/** « 1 234,50 », « −0,54 » : le nombre de décimales demandé, au même rendu serveur et navigateur. */
export function dec(v: number, decimales = 2): string {
  const [entier, reste] = Math.abs(v).toFixed(decimales).split(".");
  return (v < 0 ? "−" : "") + nombre(Number(entier)) + (reste ? `,${reste}` : "");
}

/** « +0,83 », « −0,54 » */
export const signe = (v: number, decimales = 2) => (v > 0 ? "+" : "") + dec(v, decimales);

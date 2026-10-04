// Le profil de joueur : le catalogue des pièces (bannières, couleurs, cadres
// du sceau, titres), ce qui les débloque, la vitrine, et la validation d'un
// style avant écriture. La base est libre (quelques bannières et couleurs,
// le cadre au pinceau, la bio, la vitrine) ; les pièces rares se gagnent :
// cadres et couleurs de métal selon le rang atteint, titres selon les
// exploits. Module neutre (client et serveur) : le serveur revalide tout
// avant d'écrire (app/moi/profil/actions.ts).

import { TIERS } from "@/lib/ranks";
import { SUBJECTS } from "@/components/reviser/catalog";
import { nombre } from "@/lib/voice";

/** Ce que le joueur a accompli : de quoi décider ce qui est débloqué. */
export type ProfilStats = {
  /** questions posées, toutes sources */
  questions: number;
  /** plus longue série de jours avec au moins une question */
  meilleureSerie: number;
  /** série en cours (jusqu'à hier si rien aujourd'hui) */
  serie: number;
  duelsGagnes: number;
  duelsJoues: number;
  defisRendus: number;
  calculsJustes: number;
  examensBlancs: number;
  niveau: number;
  /** palier actuel et meilleur palier atteint (index dans TIERS) */
  palier: number;
  palierMax: number;
  top10: boolean;
  /** maîtrise par matière (précision, questions) */
  matieres: { key: string; pct: number | null; answered: number }[];
};

export const STATS_VIDES: ProfilStats = {
  questions: 0,
  meilleureSerie: 0,
  serie: 0,
  duelsGagnes: 0,
  duelsJoues: 0,
  defisRendus: 0,
  calculsJustes: 0,
  examensBlancs: 0,
  niveau: 1,
  palier: 0,
  palierMax: 0,
  top10: false,
  matieres: [],
};

export type Famille = "banniere" | "couleur" | "cadre" | "titre";

export type Piece = {
  key: string;
  nom: string;
  famille: Famille;
  /** ce qu'il faut faire pour la débloquer (null : libre) */
  condition: string | null;
  /** [où j'en suis, cible, unité] pour une pièce à compteur */
  progres?: (s: ProfilStats) => [number, number] | [number, number, string];
  debloque: (s: ProfilStats) => boolean;
};

const libre = (key: string, nom: string, famille: Famille): Piece => ({ key, nom, famille, condition: null, debloque: () => true });
const compteur = (key: string, nom: string, famille: Famille, condition: string, val: (s: ProfilStats) => number, cible: number): Piece => ({
  key,
  nom,
  famille,
  condition,
  progres: (s) => [Math.min(val(s), cible), cible],
  debloque: (s) => val(s) >= cible,
});
const palier = (key: string, nom: string, famille: Famille, i: number): Piece => ({
  key,
  nom,
  famille,
  condition: `Atteindre ${TIERS[i].name}`,
  debloque: (s) => s.palierMax >= i || (i === TIERS.length - 1 && s.top10),
});

// ── Bannières ──────────────────────────────────────────────────────────
export const BANNIERES: Piece[] = [
  libre("papier", "Papier", "banniere"),
  libre("lavis", "Lavis", "banniere"),
  libre("hachures", "Hachures", "banniere"),
  libre("registre", "Registre", "banniere"),
  libre("trame", "Trame", "banniere"),
  compteur("enso", "Ensō", "banniere", "1 000 questions posées", (s) => s.questions, 1000),
  compteur("nuit", "Encre de nuit", "banniere", "Une série de 30 jours", (s) => s.meilleureSerie, 30),
  palier("feuille-or", "Feuille d'or", "banniere", 2),
  palier("diamant", "Éclat de diamant", "banniere", 4),
];

// ── Couleurs (accent de la bannière, du titre, de la vitrine) ───────────
export type Couleur = Piece & { valeur: string };
export const COULEURS: Couleur[] = [
  { ...libre("encre", "Encre", "couleur"), valeur: "var(--ink)" },
  { ...libre("vermillon", "Vermillon", "couleur"), valeur: "var(--pen)" },
  { ...libre("indigo", "Indigo", "couleur"), valeur: "#4F5BD5" },
  ...TIERS.slice(0, 7).map((t, i): Couleur => ({ ...palier(t.key, t.name, "couleur", i), valeur: t.metal[1] })),
].map((c, i) => (i === 3 ? { ...c, condition: null, debloque: () => true } : c)); // le bronze est acquis dès le départ

// ── Cadres du sceau ────────────────────────────────────────────────────
export type Cadre = Piece & { metal: [string, string, string] | null };
export const CADRES: Cadre[] = [
  { ...libre("aucun", "Sans cadre", "cadre"), metal: null },
  { ...libre("pinceau", "Pinceau", "cadre"), metal: null },
  ...TIERS.map((t, i): Cadre => ({ ...palier(t.key, t.name, "cadre", i), metal: t.metal })),
].map((c) => (c.key === "bronze" ? { ...c, condition: null, debloque: () => true } : c));

// ── Titres (sous le pseudo) ────────────────────────────────────────────
const SPECIALITES: Record<string, string> = {
  ethics: "Éthicien",
  quant: "Quant",
  economics: "Économiste",
  corporate: "Gouvernance",
  fsa: "Analyste financier",
  equity: "Stock picker",
  fixed_income: "Obligataire",
  derivatives: "Dérivatiste",
  alternatives: "Alternatif",
  portfolio: "Gérant",
};
const SPECIALITE_PCT = 75;
const SPECIALITE_MIN = 50;

export const TITRES: Piece[] = [
  libre("nouvelle-plume", "Nouvelle plume", "titre"),
  compteur("premier-trait", "Premier trait", "titre", "Poser sa première question", (s) => s.questions, 1),
  compteur("cent-traits", "Cent traits", "titre", "100 questions posées", (s) => s.questions, 100),
  compteur("mille-traits", "Mille traits", "titre", "1 000 questions posées", (s) => s.questions, 1000),
  compteur("cinq-mille", "Cinq mille traits", "titre", "5 000 questions posées", (s) => s.questions, 5000),
  compteur("assidu", "Assidu", "titre", "Une série de 7 jours", (s) => s.meilleureSerie, 7),
  compteur("infatigable", "Infatigable", "titre", "Une série de 30 jours", (s) => s.meilleureSerie, 30),
  compteur("duelliste", "Duelliste", "titre", "10 duels gagnés", (s) => s.duelsGagnes, 10),
  compteur("fine-lame", "Fine lame", "titre", "50 duels gagnés", (s) => s.duelsGagnes, 50),
  compteur("rituel", "Rituel", "titre", "7 défis du jour rendus", (s) => s.defisRendus, 7),
  compteur("pilier", "Pilier du défi", "titre", "30 défis du jour rendus", (s) => s.defisRendus, 30),
  compteur("calculateur", "Calculatrice humaine", "titre", "200 calculs justes", (s) => s.calculsJustes, 200),
  compteur("epreuve", "Épreuve du feu", "titre", "Rendre un examen blanc", (s) => s.examensBlancs, 1),
  palier("diamant-brut", "Diamant brut", "titre", 4),
  palier("maitre-du-trait", "Maître du trait", "titre", 5),
  { key: "legende", nom: "Légende", famille: "titre", condition: "Entrer dans le Top 10", debloque: (s) => s.top10 },
  ...SUBJECTS.map(
    (m): Piece => ({
      key: `specialiste-${m.key}`,
      nom: SPECIALITES[m.key] ?? m.short,
      famille: "titre",
      condition: `${m.short} : ${SPECIALITE_PCT} % de maîtrise sur ${SPECIALITE_MIN} questions`,
      // d'abord les questions, puis la précision
      progres: (s) => {
        const t = s.matieres.find((x) => x.key === m.key);
        const n = t?.answered ?? 0;
        return n < SPECIALITE_MIN ? [n, SPECIALITE_MIN] : [Math.round(t?.pct ?? 0), SPECIALITE_PCT, " %"];
      },
      debloque: (s) => {
        const t = s.matieres.find((x) => x.key === m.key);
        return !!t && t.answered >= SPECIALITE_MIN && (t.pct ?? 0) >= SPECIALITE_PCT;
      },
    }),
  ),
];

export const CATALOGUE: Record<Famille, Piece[]> = { banniere: BANNIERES, couleur: COULEURS, cadre: CADRES, titre: TITRES };

export const pieceDe = (famille: Famille, key: string | null | undefined) => (key ? CATALOGUE[famille].find((p) => p.key === key) ?? null : null);
export const couleurDe = (key: string | null | undefined) => COULEURS.find((c) => c.key === key) ?? COULEURS[0];
export const cadreDe = (key: string | null | undefined) => CADRES.find((c) => c.key === key) ?? CADRES[0];

/** « 632/1 000 » pour une pièce à compteur pas encore acquise */
export function progresTexte(p: Piece, s: ProfilStats): string | null {
  if (!p.progres || p.debloque(s)) return null;
  const [a, b, u = ""] = p.progres(s);
  return `${nombre(a)}${u}/${nombre(b)}${u}`;
}

// ── Vitrine ────────────────────────────────────────────────────────────
export const VITRINE = [
  { key: "rang", nom: "Rang" },
  { key: "questions", nom: "Questions posées" },
  { key: "serie", nom: "Série" },
  { key: "duels", nom: "Duels" },
  { key: "matiere", nom: "Meilleure matière" },
  { key: "defis", nom: "Défis du jour" },
  { key: "calculs", nom: "Calculs" },
  { key: "titres", nom: "Collection de titres" },
] as const;
export type VitrineKey = (typeof VITRINE)[number]["key"];
export const VITRINE_MAX = 3;

// ── Le style d'un profil ───────────────────────────────────────────────
export type StyleProfil = {
  banner: string;
  accent: string;
  frame: string;
  title: string | null;
  showcase: VitrineKey[];
  bio: string | null;
};

export const STYLE_DEFAUT: StyleProfil = { banner: "lavis", accent: "encre", frame: "aucun", title: null, showcase: ["rang", "questions", "serie"], bio: null };
export const BIO_MAX = 160;

export type Visibilite = "public" | "friends" | "private";
export type LienProfil = { linkedin: string | null; visibilite: Visibilite };
export const LIEN_DEFAUT: LienProfil = { linkedin: null, visibilite: "friends" };

/** Une adresse LinkedIn de profil, normalisée (https://www.linkedin.com/in/…), ou null si invalide. */
export function normaliserLinkedin(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const m = /^(?:https?:[/][/])?(?:([a-z]{2,3}|www)[.])?linkedin[.]com[/]in[/]([A-Za-z0-9_%-]{2,100})[/]?(?:[?#].*)?$/i.exec(s);
  return m ? `https://www.linkedin.com/in/${m[2]}/` : null;
}

/** Nettoie une bio : espaces resserrés, deux retours à la ligne au plus, 160 caractères. */
export function nettoyerBio(raw: string | null | undefined): string | null {
  const s = (raw ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, BIO_MAX);
  return s || null;
}

/** Ne garde que des pièces débloquées et des valeurs connues (le reste revient au défaut). */
export function validerStyle(input: Partial<StyleProfil>, s: ProfilStats): { style: StyleProfil; refus: string[] } {
  const refus: string[] = [];
  const pick = (famille: Famille, key: string | null | undefined, defaut: string) => {
    const p = pieceDe(famille, key);
    if (!p) return defaut;
    if (!p.debloque(s)) {
      refus.push(p.nom);
      return defaut;
    }
    return p.key;
  };
  const title = input.title ? pick("titre", input.title, "") || null : null;
  const keys = new Set<string>(VITRINE.map((v) => v.key));
  const showcase = [...new Set((input.showcase ?? []).filter((k) => keys.has(k)))].slice(0, VITRINE_MAX) as VitrineKey[];
  return {
    style: {
      banner: pick("banniere", input.banner, STYLE_DEFAUT.banner),
      accent: pick("couleur", input.accent, STYLE_DEFAUT.accent),
      frame: pick("cadre", input.frame, STYLE_DEFAUT.frame),
      title,
      showcase,
      bio: nettoyerBio(input.bio),
    },
    refus,
  };
}

/** Un style lu en base (valeurs inconnues ramenées au défaut, sans juger le débloquage). */
export function styleDepuis(row: Partial<Record<keyof StyleProfil, unknown>> | null | undefined): StyleProfil {
  if (!row) return STYLE_DEFAUT;
  const ok = (famille: Famille, v: unknown, d: string) => (typeof v === "string" && pieceDe(famille, v) ? v : d);
  const keys = new Set<string>(VITRINE.map((v) => v.key));
  const showcase = Array.isArray(row.showcase) ? (row.showcase.filter((k) => typeof k === "string" && keys.has(k)).slice(0, VITRINE_MAX) as VitrineKey[]) : STYLE_DEFAUT.showcase;
  return {
    banner: ok("banniere", row.banner, STYLE_DEFAUT.banner),
    accent: ok("couleur", row.accent, STYLE_DEFAUT.accent),
    frame: ok("cadre", row.frame, STYLE_DEFAUT.frame),
    title: typeof row.title === "string" && pieceDe("titre", row.title) ? row.title : null,
    showcase,
    bio: typeof row.bio === "string" ? nettoyerBio(row.bio) : null,
  };
}

/** Titres débloqués / total */
export function collection(s: ProfilStats) {
  const n = TITRES.filter((t) => t.debloque(s)).length;
  return { n, total: TITRES.length };
}

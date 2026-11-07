import type { AnswerSource, AnswerStats } from "@/lib/answer-stats";

// Moi › Activités : tes séances, toutes sources confondues, de la plus récente à la plus
// ancienne. Une séance est rangée par matière et par thème dans lib/answer-stats ; on la
// recompose ici en additionnant ses morceaux (un mock de 90 questions couvre dix matières).
// Chaque séance garde son jour (Paris) pour le tri, et ses ratures (questions répondues
// faux) pour les copier ou se retester dessus. Pur, sans accès à la base.

export type Activite = {
  id: string;
  source: AnswerSource;
  label: string;
  date: string;
  at: string;
  /** jour de Paris, « 2026-11-07 » (le tri par jour) */
  jour: string;
  href: string | null;
  n: number;
  ok: number;
  /** questions répondues faux pendant la séance */
  ratees: string[];
};

const ACTIVITES_MAX = 200;

const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

/** Le jour de Paris d'une date ISO (« 2026-11-07 »), ou « » si elle ne se lit pas. */
export function jourDe(iso: string | number): string {
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  return Number.isFinite(t) ? JOUR_PARIS.format(t) : "";
}

export function activitesDe(stats: Pick<AnswerStats, "subjects"> | null): Activite[] {
  const parId = new Map<string, Activite>();
  for (const sujet of stats?.subjects ?? []) {
    for (const theme of sujet.themes) {
      for (const p of theme.passages) {
        const deja = parId.get(p.id);
        if (deja) {
          deja.n += p.n;
          deja.ok += p.ok;
        } else {
          parId.set(p.id, { id: p.id, source: p.source, label: p.label, date: p.date, at: p.at, jour: jourDe(p.at), href: p.href, n: p.n, ok: p.ok, ratees: p.ratees ?? [] });
        }
      }
    }
  }
  return [...parId.values()].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, ACTIVITES_MAX);
}

/** Une sélection (jour et type, null : tous) : ses séances, son score et ses ratures sans doublon. */
export function selection(activites: Activite[], jour: string | null, source: AnswerSource | null) {
  const liste = activites.filter((a) => (jour === null || a.jour === jour) && (source === null || a.source === source));
  return {
    liste,
    n: liste.reduce((s, a) => s + a.n, 0),
    ok: liste.reduce((s, a) => s + a.ok, 0),
    ratees: [...new Set(liste.flatMap((a) => a.ratees))],
  };
}

/** Une rature à copier : la question telle qu'au carnet (migration_ratures.sql). */
export type RatureACopier = { prompt: string; choices: string[]; correctIndex: number | null; explanation: string | null; lastSelected: number | null; setTitle: string | null };

const lettre = (i: number | null) => (i === null || i < 0 ? null : String.fromCharCode(65 + i));

/** Le texte copié : un en-tête, puis chaque question avec ses choix, ta réponse, la bonne et l'explication. */
export function texteRatures(titre: string, items: RatureACopier[]): string {
  const blocs = items.map((r, i) => {
    const l = [`${i + 1}.${r.setTitle ? ` [${r.setTitle}]` : ""} ${r.prompt.trim()}`];
    r.choices.forEach((c, k) => l.push(`${lettre(k)}. ${c.trim()}`));
    const moi = lettre(r.lastSelected);
    const bonne = lettre(r.correctIndex);
    l.push([`Ma réponse : ${moi ?? "aucune"}`, bonne ? `Bonne réponse : ${bonne}` : null].filter(Boolean).join(" · "));
    if (r.explanation?.trim()) l.push(`Explication : ${r.explanation.trim()}`);
    return l.join("\n");
  });
  return [titre, ...blocs].join("\n\n");
}

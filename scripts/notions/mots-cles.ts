// Construit public/notions-mots.json : les mots du texte des questions, et les concepts où ils reviennent.
// Le choix par notion s'en sert quand aucun libellé ne répond à la recherche (lib/notions-proches.ts).
// Seulement des mots isolés et des comptes, jamais une phrase. Lecture seule de la base.
// À relancer après un nouveau seed ou un nouveau classement, depuis la racine du dépôt :
//   npx tsx --tsconfig ./tsconfig.json scripts/notions/mots-cles.ts
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { motsDe, type IndexMots } from "@/lib/notions-proches";

// un mot qui revient partout ne garde que les concepts où il pèse le plus
const MAX_CIBLES_PAR_MOT = 60;
// jusqu'à ce nombre de concepts, un mot les garde tous, même pour une seule question
const CIBLES_TOUTES_GARDEES = 25;
// deux mots voisins forment une expression s'ils reviennent ensemble dans assez de questions,
// et s'ils sont liés l'un à l'autre ou concentrés sur un même concept
const EXPRESSION_MIN_QUESTIONS = 3;
const EXPRESSION_MIN_LIEN = 0.2;
const EXPRESSION_MIN_CONCENTRATION = 0.6;
// une expression vise un sujet : ses meilleurs concepts suffisent
const MAX_CIBLES_PAR_EXPRESSION = 12;

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

type Ligne = { prompt: string; explanation: string | null; choices: string[] | null; notion: string; concept: string | null };

async function construire() {
  const questions: Ligne[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.from("quiz_questions").select("prompt,explanation,choices,notion,concept").not("notion", "is", null).order("id").range(de, de + 999);
    if (error) throw error;
    questions.push(...(data as Ligne[]));
    if (data.length < 1000) break;
  }

  // les cibles, et pour chaque mot : la cible → ses questions
  const cibles = new Map<string, { id: number; notion: string; concept: string | null; total: number }>();
  const parMot = new Map<string, Map<number, number>>();
  const questionsDuMot = new Map<string, number>();
  const vus = new Set<string>();
  for (const q of questions) {
    // un énoncé en double compte une fois
    const cle = `${q.notion}|${q.prompt}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    const c = JSON.stringify([q.notion, q.concept]);
    if (!cibles.has(c)) cibles.set(c, { id: cibles.size, notion: q.notion, concept: q.concept, total: 0 });
    const cible = cibles.get(c)!;
    cible.total++;
    // une expression ne chevauche pas deux champs : chaque texte est lu à part
    const termes = new Set<string>();
    for (const champ of [q.prompt, q.explanation ?? "", ...(q.choices ?? [])]) {
      const suite = motsDe(champ);
      suite.forEach((m, i) => {
        termes.add(m);
        if (i + 1 < suite.length) termes.add(`${m} ${suite[i + 1]}`);
      });
    }
    for (const m of termes) {
      if (!parMot.has(m)) parMot.set(m, new Map());
      const occ = parMot.get(m)!;
      occ.set(cible.id, (occ.get(cible.id) ?? 0) + 1);
      questionsDuMot.set(m, (questionsDuMot.get(m) ?? 0) + 1);
    }
  }

  const liste = [...cibles.values()].sort((a, b) => a.id - b.id);
  const mots: IndexMots["mots"] = {};
  for (const m of [...parMot.keys()].sort()) {
    const nb = questionsDuMot.get(m) ?? 0;
    // un mot d'une seule question : un nom de société inventé, le plus souvent
    if (nb < 2) continue;
    const [a, b] = m.split(" ");
    if (b) {
      const lien = nb / Math.min(questionsDuMot.get(a) ?? 1, questionsDuMot.get(b) ?? 1);
      const concentration = Math.max(...parMot.get(m)!.values()) / nb;
      if (nb < EXPRESSION_MIN_QUESTIONS || (lien < EXPRESSION_MIN_LIEN && concentration < EXPRESSION_MIN_CONCENTRATION)) continue;
    }
    const occ = [...parMot.get(m)!]
      .filter(([, n], _, tout) => n >= 2 || tout.length <= CIBLES_TOUTES_GARDEES)
      .sort((a, b) => b[1] / Math.sqrt(liste[b[0]].total) - a[1] / Math.sqrt(liste[a[0]].total))
      .slice(0, b ? MAX_CIBLES_PAR_EXPRESSION : MAX_CIBLES_PAR_MOT);
    if (occ.length > 0) mots[m] = occ.flat();
  }

  const index: IndexMots = { cibles: liste.map((c) => [c.notion, c.concept, c.total]), mots };
  const sortie = JSON.stringify(index);
  fs.writeFileSync("public/notions-mots.json", sortie + "\n");
  console.log(`${vus.size} énoncés, ${liste.length} cibles, ${Object.keys(mots).length} mots, ${Math.round(sortie.length / 1024)} Ko`);
}

construire().catch((e) => {
  console.error(e);
  process.exit(1);
});

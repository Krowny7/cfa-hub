import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OfficialExamsView, type OfficialExamGroup, type OfficialTopic } from "@/components/session/OfficialExamsView";

// Remplace l'ancienne page /exercises : au lieu de sets d'exercices de
// calcul génériques, on rejoue ici les vrais mock exams officiels de
// l'utilisateur (questions verbatim, voir scripts/seed-mock-*.mjs), soit en
// entier, soit filtré par thème (ex: uniquement les questions QM de la
// Session 1 du Mock A). Les sets sont de simples quiz_sets officiels dans
// le dossier "Mocks Officiels (Système)" — la page se contente de les
// regrouper et retrouve /qcm/[id] pour l'expérience de quiz elle-même
// (déjà interactif, XP, anti-farming, correction). Chaque thème peut aussi
// avoir un set "— Variantes" jumeau (2 variantes par question officielle,
// voir scripts/seed-mock-*-variants-*.mjs) affiché comme un second bouton.
const FOLDER_NAME = "Mocks Officiels (Système)";
const TITLE_RE = /^(.+?)\s—\s(.+?)\s—\s(.+)$/;
const VARIANTS_SUFFIX = " — Variantes";

type SetRow = { id: string; title: string };
type Topic = OfficialTopic;
type ExamGroup = OfficialExamGroup;

export default async function OfficialExamsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: folder } = await supabase
    .from("library_folders")
    .select("id")
    .eq("name", FOLDER_NAME)
    .eq("kind", "quizzes")
    .maybeSingle();

  let sets: SetRow[] = [];
  const counts = new Map<string, number>();

  if (folder) {
    const { data: setsData } = await supabase
      .from("quiz_sets")
      .select("id,title")
      .eq("folder_id", folder.id)
      .eq("is_official", true)
      .eq("official_published", true);
    sets = (setsData ?? []) as SetRow[];

    if (sets.length > 0) {
      const { data: qData } = await supabase
        .from("quiz_questions")
        .select("set_id")
        .in("set_id", sets.map((s) => s.id));
      for (const q of (qData ?? []) as { set_id: string }[]) {
        counts.set(q.set_id, (counts.get(q.set_id) ?? 0) + 1);
      }
    }
  }

  const exams = new Map<string, ExamGroup>();
  // Sets "— Variantes" en attente d'être rattachés à leur thème de base
  // (les deux peuvent apparaître dans n'importe quel ordre côté requête).
  const pendingVariants: { examName: string; sessionLabel: string; baseLabel: string; id: string; count: number }[] = [];

  for (const s of sets) {
    const m = TITLE_RE.exec(s.title);
    if (!m) continue;
    const [, examName, sessionLabel, rest] = m;
    if (!exams.has(examName)) exams.set(examName, { exam: examName, sessions: {} });
    const group = exams.get(examName)!;
    if (!group.sessions[sessionLabel]) group.sessions[sessionLabel] = { topics: [], complete: null };
    const count = counts.get(s.id) ?? 0;

    if (rest.endsWith(VARIANTS_SUFFIX)) {
      pendingVariants.push({
        examName,
        sessionLabel,
        baseLabel: rest.slice(0, -VARIANTS_SUFFIX.length),
        id: s.id,
        count,
      });
    } else if (rest.startsWith("Complet")) {
      group.sessions[sessionLabel].complete = { id: s.id, count };
    } else {
      group.sessions[sessionLabel].topics.push({ id: s.id, label: rest, count, variant: null });
    }
  }

  for (const v of pendingVariants) {
    const topic = exams.get(v.examName)?.sessions[v.sessionLabel]?.topics.find((t) => t.label === v.baseLabel);
    if (topic) topic.variant = { id: v.id, count: v.count };
  }

  const examList = [...exams.values()].sort((a, b) => a.exam.localeCompare(b.exam));

  return <OfficialExamsView exams={examList} />;
}

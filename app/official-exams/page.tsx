import Link from "next/link";
import { redirect } from "next/navigation";
import { FileStack, ListChecks, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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
type Topic = { id: string; label: string; count: number; variant: { id: string; count: number } | null };
type ExamGroup = {
  exam: string;
  sessions: Record<string, { topics: Topic[]; complete: { id: string; count: number } | null }>;
};

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

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Mocks Officiels</h1>
        <p className="mt-1 text-sm text-white/55">
          Rejoue tes examens blancs officiels avec exactement les mêmes questions — en entier,
          ou filtré sur un seul thème pour retravailler un point faible en particulier.
        </p>
      </div>

      {examList.length === 0 && (
        <div className="card p-8 text-center text-sm text-muted">
          Aucun mock officiel importé pour le moment.
        </div>
      )}

      {examList.map((group) => (
        <div key={group.exam} className="card p-5">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <FileStack size={15} /> {group.exam}
          </div>
          <div className="grid gap-4">
            {Object.entries(group.sessions)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([sessionLabel, { topics, complete }]) => (
                <div key={sessionLabel} className="rounded-xl border border-white/10 p-4">
                  <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/50">
                    <ListChecks size={13} /> {sessionLabel}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {complete && (
                      <Link
                        href={`/qcm/${complete.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-200 transition hover:bg-blue-500/20"
                      >
                        Session complète ({complete.count}Q)
                      </Link>
                    )}
                    {topics.map((t) => (
                      <span key={t.id} className="inline-flex overflow-hidden rounded-lg border border-white/10">
                        <Link
                          href={`/qcm/${t.id}`}
                          className="px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/[0.04]"
                        >
                          {t.label} ({t.count}Q)
                        </Link>
                        {t.variant && (
                          <Link
                            href={`/qcm/${t.variant.id}`}
                            title="Variantes des mêmes questions (énoncés/chiffres différents)"
                            className="flex items-center gap-1 border-l border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-purple-200 transition hover:bg-purple-500/10"
                          >
                            <Sparkles size={11} /> {t.variant.count}Q
                          </Link>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

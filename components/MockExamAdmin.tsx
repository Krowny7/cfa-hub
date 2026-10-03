"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Settings2, Trash2 } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { applyMockExamElo, getMockExamEloAppliedAt } from "@/lib/rating";

type Exam = {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  question_count: number;
  status: "draft" | "open" | "closed";
  window_days?: number | null;
};

// Examen clos au sens de l'ELO : clôturé à la main, ou fenêtre de passage
// terminée (même règle que apply_mock_exam_elo côté serveur).
function isClosed(e: Exam) {
  if (e.status === "closed") return true;
  const end = new Date(e.scheduled_at).getTime() + (e.window_days ?? 3) * 86_400_000;
  return Date.now() > end;
}

export function MockExamAdmin({
  exams: initial,
  eloAppliedAt: initialApplied = {},
  eloEnabled = false,
}: {
  exams: Exam[];
  /** examens dont l'ELO est déjà appliqué (id → date) */
  eloAppliedAt?: Record<string, string>;
  /** migration des duels / ELO appliquée */
  eloEnabled?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [exams, setExams] = useState<Exam[]>(initial);
  const [eloApplied, setEloApplied] = useState<Record<string, string>>(initialApplied);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(135);
  const [questionCount, setQuestionCount] = useState(90);
  const [windowDays, setWindowDays] = useState(3);

  async function refresh() {
    const { data } = await supabase
      .from("mock_exams")
      .select("id,title,description,scheduled_at,duration_minutes,question_count,status,window_days")
      .order("scheduled_at", { ascending: false });
    const list = (data ?? []) as Exam[];
    setExams(list);
    if (eloEnabled) setEloApplied(await getMockExamEloAppliedAt(supabase, list.map((e) => e.id)));
  }

  async function applyElo(id: string) {
    setBusy(id + "-elo");
    setMsg(null);
    try {
      const r = await applyMockExamElo(supabase, id);
      if (r.applied) setMsg(`ELO appliqué à ${r.participants ?? 0} participants.`);
      else if (r.reason === "already") setMsg("L'ELO de cet examen est déjà appliqué.");
      else if (r.reason === "not_closed") setMsg("L'examen n'est pas encore clos : clôture-le d'abord.");
      else if (r.reason === "too_few") setMsg("Moins de deux participants : rien à appliquer (examen marqué comme traité).");
      else setMsg("ELO indisponible : la migration des duels n'est pas appliquée.");
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function createExam() {
    if (!title.trim() || !scheduledAt) return;
    setBusy("create");
    setMsg(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Non connecté");
      const { error } = await supabase.from("mock_exams").insert({
        title: title.trim(),
        description: description.trim() || null,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        question_count: questionCount,
        window_days: windowDays,
        created_by: auth.user.id,
        status: "draft",
      });
      if (error) throw new Error(error.message);
      setTitle(""); setDescription(""); setScheduledAt("");
      setDuration(135); setQuestionCount(90); setWindowDays(3);
      setShowCreate(false);
      await refresh();
      setMsg("Examen créé");
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, "Erreur")}`);
    } finally {
      setBusy(null);
    }
  }

  async function publish(id: string) {
    setBusy(id);
    setMsg(null);
    try {
      const { error } = await supabase.rpc("publish_mock_exam", { p_exam_id: id });
      if (error) throw new Error(error.message);
      await refresh();
      setMsg("Publié — questions tirées aléatoirement");
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, "Erreur")}`);
    } finally {
      setBusy(null);
    }
  }

  async function close(id: string) {
    setBusy(id);
    setMsg(null);
    try {
      const { error } = await supabase.rpc("close_mock_exam", { p_exam_id: id });
      if (error) throw new Error(error.message);
      await refresh();
      setMsg("Examen clôturé");
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, "Erreur")}`);
    } finally {
      setBusy(null);
    }
  }

  async function deleteExam(id: string) {
    setBusy(id + "-del");
    try {
      await supabase.from("mock_exams").delete().eq("id", id);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  const statusLabel = (s: string) =>
    s === "draft" ? "Brouillon" : s === "open" ? "Ouvert" : "Clôturé";

  const field = (label: string, input: React.ReactNode) => (
    <label className="grid gap-1.5">
      <span className="t-micro font-semibold">{label}</span>
      {input}
    </label>
  );

  // Outil d'administration : replié par défaut, posé en bas de la page.
  return (
    <details className="card-quiet group" aria-label="Gestion des examens (admin)">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
        <span className="flex items-center gap-2.5">
          <Settings2 size={16} aria-hidden className="text-muted" />
          <span className="text-[15px] font-semibold">Gestion des examens</span>
          <span className="chip chip-quiet chip-sm">admin</span>
        </span>
        <span className="t-micro inline-flex items-center gap-2">
          {exams.length} examen{exams.length > 1 ? "s" : ""}
          <ChevronDown size={15} aria-hidden className="transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className="grid grid-cols-1 gap-4 border-t border-line p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {msg ? (
            <p className="m-0 text-sm" aria-live="polite">
              {msg}
            </p>
          ) : (
            <span />
          )}
          <button type="button" className={"btn btn-sm " + (showCreate ? "btn-ghost" : "btn-secondary")} onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Annuler" : (
              <>
                <Plus size={14} aria-hidden /> Créer un examen
              </>
            )}
          </button>
        </div>

        {showCreate && (
          <div className="card grid grid-cols-1 gap-4 p-5">
            {field(
              "Titre",
              <input className="input" placeholder="ex. Examen blanc juin 2026" value={title} onChange={(e) => setTitle(e.target.value)} />,
            )}
            {field(
              "Description (optionnel)",
              <textarea className="input resize-none" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />,
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              {field("Date et heure", <input className="input w-full" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />)}
              {field("Durée (min)", <input className="input w-full" type="number" min={30} max={360} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />)}
              {field("Questions", <input className="input w-full" type="number" min={10} max={120} value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} />)}
              {field("Fenêtre (± jours)", <input className="input w-full" type="number" min={0} max={14} value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))} />)}
            </div>
            <div className="flex justify-end">
              <button type="button" className="btn btn-primary" disabled={busy === "create" || !title.trim() || !scheduledAt} onClick={createExam}>
                {busy === "create" ? "…" : "Créer l'examen"}
              </button>
            </div>
          </div>
        )}

        {exams.length === 0 ? (
          <p className="t-small m-0">Aucun examen créé.</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {exams.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-surface px-4 py-3 shadow-[inset_0_0_0_1px_var(--line)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-semibold">{e.title}</span>
                    <span className={"chip chip-sm " + (e.status === "open" ? "chip-active" : "chip-quiet")}>{statusLabel(e.status)}</span>
                  </div>
                  <div className="t-micro mt-1">
                    {new Date(e.scheduled_at).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {e.duration_minutes} min · {e.question_count} questions
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {e.status === "draft" && (
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy === e.id} onClick={() => publish(e.id)}>
                      {busy === e.id ? "…" : "Publier"}
                    </button>
                  )}
                  {e.status === "open" && (
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy === e.id} onClick={() => close(e.id)}>
                      {busy === e.id ? "…" : "Clôturer"}
                    </button>
                  )}
                  {eloEnabled && isClosed(e) && e.status !== "draft" && (
                    eloApplied[e.id] ? (
                      <span className="chip chip-quiet chip-sm" title={new Date(eloApplied[e.id]).toLocaleString("fr-FR")}>
                        <Check size={13} aria-hidden /> ELO appliqué
                      </span>
                    ) : (
                      <button type="button" className="btn btn-primary btn-sm" disabled={busy === e.id + "-elo"} onClick={() => applyElo(e.id)}>
                        {busy === e.id + "-elo" ? "…" : "Appliquer l'ELO"}
                      </button>
                    )
                  )}
                  {confirmDelete === e.id ? (
                    <>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>
                        Garder
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={busy === e.id + "-del"}
                        onClick={() => {
                          setConfirmDelete(null);
                          void deleteExam(e.id);
                        }}
                      >
                        Supprimer pour de bon
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-sm text-muted" disabled={busy === e.id + "-del"} onClick={() => setConfirmDelete(e.id)} aria-label={`Supprimer ${e.title}`}>
                      <Trash2 size={14} aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

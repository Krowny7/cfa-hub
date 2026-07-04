"use client";

import { useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";

type Exam = {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  question_count: number;
  status: "draft" | "open" | "closed";
};

export function MockExamAdmin({ exams: initial }: { exams: Exam[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [exams, setExams] = useState<Exam[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(180);
  const [questionCount, setQuestionCount] = useState(60);

  async function refresh() {
    const { data } = await supabase
      .from("mock_exams")
      .select("id,title,description,scheduled_at,duration_minutes,question_count,status")
      .order("scheduled_at", { ascending: false });
    setExams((data ?? []) as Exam[]);
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
        created_by: auth.user.id,
        status: "draft",
      });
      if (error) throw new Error(error.message);
      setTitle(""); setDescription(""); setScheduledAt("");
      setDuration(180); setQuestionCount(60);
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
  const statusColor = (s: string) =>
    s === "draft" ? "text-muted" : s === "open" ? "text-green-400" : "text-white/30";

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-300">
          <Settings2 size={15} /> Admin — Gestion des examens
        </div>
        <button
          type="button"
          className="btn btn-secondary text-xs"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? "Annuler" : "+ Créer un examen"}
        </button>
      </div>

      {showCreate && (
        <div className="mt-4 grid gap-3 rounded-xl border border-white/10 p-4">
          <input
            className="input"
            placeholder="Titre (ex: Examen blanc juin 2026)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="mb-1 text-xs text-white/50">Date & heure</div>
              <input
                className="input w-full"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-white/50">Durée (min)</div>
              <input
                className="input w-full"
                type="number"
                min={30}
                max={360}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-white/50">Nb de questions</div>
              <input
                className="input w-full"
                type="number"
                min={10}
                max={120}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy === "create" || !title.trim() || !scheduledAt}
            onClick={createExam}
          >
            {busy === "create" ? "…" : "Créer l'examen"}
          </button>
        </div>
      )}

      {msg && <div className="mt-3 text-sm">{msg}</div>}

      <div className="mt-4 grid gap-2">
        {exams.length === 0 && (
          <div className="text-sm text-muted">Aucun examen créé.</div>
        )}
        {exams.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{e.title}</div>
              <div className="text-xs text-muted">
                {new Date(e.scheduled_at).toLocaleString("fr-FR")} · {e.duration_minutes}min · {e.question_count}Q
                {" · "}<span className={statusColor(e.status)}>{statusLabel(e.status)}</span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {e.status === "draft" && (
                <button
                  type="button"
                  className="rounded-xl bg-green-500/20 px-3 py-1.5 text-xs text-green-300 hover:bg-green-500/30 disabled:opacity-50"
                  disabled={busy === e.id}
                  onClick={() => publish(e.id)}
                >
                  {busy === e.id ? "…" : "Publier"}
                </button>
              )}
              {e.status === "open" && (
                <button
                  type="button"
                  className="rounded-xl bg-orange-500/20 px-3 py-1.5 text-xs text-orange-300 hover:bg-orange-500/30 disabled:opacity-50"
                  disabled={busy === e.id}
                  onClick={() => close(e.id)}
                >
                  {busy === e.id ? "…" : "Clôturer"}
                </button>
              )}
              <button
                type="button"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                disabled={busy === e.id + "-del"}
                onClick={() => deleteExam(e.id)}
              >
                Suppr.
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

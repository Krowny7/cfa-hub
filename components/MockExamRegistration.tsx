"use client";

import { useMemo, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function MockExamRegistration({
  examId,
  isRegistered: initial,
  registrantCount,
}: {
  examId: string;
  isRegistered: boolean;
  registrantCount: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [registered, setRegistered] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setMsg(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Non connecté");

      if (registered) {
        const { error } = await supabase
          .from("mock_exam_registrations")
          .delete()
          .eq("exam_id", examId)
          .eq("user_id", auth.user.id);
        if (error) throw new Error(error.message);
        setRegistered(false);
        setMsg("Tu t'es désinscrit(e).");
      } else {
        const { error } = await supabase
          .from("mock_exam_registrations")
          .insert({ exam_id: examId, user_id: auth.user.id });
        if (error) throw new Error(error.message);
        setRegistered(true);
        setMsg("✅ Inscription confirmée ! Tu recevras un rappel.");
      }
      router.refresh();
    } catch (e: unknown) {
      setMsg(`❌ ${friendlyError(e, "Erreur")}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="font-semibold">
          {registered ? "✅ Tu es inscrit(e)" : "Inscription"}
        </div>
        <div className="mt-0.5 text-sm text-white/50">
          {registrantCount > 0
            ? `${registrantCount} participant${registrantCount > 1 ? "s" : ""} inscrit${registrantCount > 1 ? "s" : ""}`
            : "Sois le premier à t'inscrire"}
        </div>
        {msg && <div className="mt-2 text-sm">{msg}</div>}
      </div>
      <button
        type="button"
        className={registered ? "btn btn-ghost" : "btn btn-primary px-6"}
        disabled={busy}
        onClick={toggle}
      >
        {busy ? "…" : registered ? "Se désinscrire" : "S'inscrire"}
      </button>
    </div>
  );
}

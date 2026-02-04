import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDiagnosticsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  // Note: counts are subject to RLS. If RLS is misconfigured you'll see 0 here.
  const [docs, flash, qcm, exo] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("flashcard_sets").select("id", { count: "exact", head: true }),
    supabase.from("quiz_sets").select("id", { count: "exact", head: true }),
    supabase.from("exercise_sets").select("id", { count: "exact", head: true })
  ]);

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const maskedUrl = envUrl ? envUrl.replace(/https:\/\/([a-z0-9-]+)\.supabase\.co/i, "https://$1.supabase.co").slice(0, 48) : "(missing)";

  const rows = [
    { key: "documents", count: docs.count ?? 0, error: docs.error?.message ?? null },
    { key: "flashcard_sets", count: flash.count ?? 0, error: flash.error?.message ?? null },
    { key: "quiz_sets", count: qcm.count ?? 0, error: qcm.error?.message ?? null },
    { key: "exercise_sets", count: exo.count ?? 0, error: exo.error?.message ?? null }
  ];

  const anyError = rows.some((r) => r.error);
  const allZero = rows.every((r) => (r.count ?? 0) === 0);

  return (
    <div className="grid gap-4">
      <div className="card p-6">
        <div className="text-sm font-semibold opacity-80">Diagnostics</div>
        <div className="mt-2 text-white/80">User: <span className="font-mono">{user.id}</span></div>
        <div className="mt-1 text-white/80">Supabase URL (env): <span className="font-mono">{maskedUrl}</span></div>
      </div>

      <div className="card p-6">
        <div className="font-semibold">Visible row counts (RLS-aware)</div>
        <div className="mt-4 grid gap-2">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <div className="font-mono text-sm">{r.key}</div>
              <div className="text-sm">
                {r.error ? <span className="text-red-300">Error: {r.error}</span> : <span>{r.count}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 text-sm text-white/70 leading-relaxed">
          <div className="font-semibold text-white/80">How to interpret</div>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>
              <span className="font-semibold">All counts = 0</span> can mean either (a) you are connected to the wrong Supabase project (empty DB)
              or (b) RLS is enabled but policies/owner_id are misaligned.
            </li>
            <li>
              If you still see rows in Supabase Table Editor but counts here are 0, run <span className="font-mono">supabase/COMPAT_ALIGN.sql</span>.
            </li>
            <li>
              If Table Editor also looks empty, double-check <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> and <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>.
            </li>
          </ul>

          {anyError ? (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              One or more queries failed. This often indicates the table does not exist in your project, or you have a schema mismatch.
            </div>
          ) : null}

          {allZero && !anyError ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
              Next step: paste & run <span className="font-mono">supabase/DIAGNOSTICS.sql</span> in Supabase SQL editor and copy the textual output here.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

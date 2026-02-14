import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { AdminQodUploadPanel } from "@/components/AdminQodUploadPanel";

export default async function AdminQodPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const { data: isAdminData } = await supabase.rpc("is_app_admin");
  const isAdmin = Boolean(isAdminData);
  if (!isAdmin) redirect("/dashboard");

  const isFR = locale === "fr";

  return (
    <div className="grid gap-4">
      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold opacity-80">{isFR ? "Admin" : "Admin"}</div>
            <div className="mt-3 max-w-[72ch] text-base text-white/80">
              {isFR
                ? "Gestion de la Question du jour (JSON bilingue FR/EN)."
                : "Manage the Question of the Day (bilingual FR/EN JSON)."}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard" className="btn btn-secondary">
              {t(locale, "nav.dashboard")}
            </Link>
            <Link href="/admin/content" className="btn btn-secondary">
              {isFR ? "Admin Studio" : "Admin Studio"}
            </Link>
          </div>
        </div>
      </div>

      <div className="card p-6 sm:p-8">
        <AdminQodUploadPanel />
      </div>
    </div>
  );
}

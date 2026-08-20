import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuickClipboard } from "@/components/QuickClipboard";

// Page volontairement non listée dans la nav (Sidebar/MobileBottomNav) —
// juste accessible via l'URL directe /scratch.
export default async function ScratchPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <QuickClipboard />
    </div>
  );
}

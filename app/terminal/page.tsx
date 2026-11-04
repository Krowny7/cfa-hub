import { redirect } from "next/navigation";
import { Terminal } from "@/components/terminal/Terminal";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Terminal · Ranked Lobby" };

// Le Terminal : pour découvrir une interface de marché, hors programme. Rien n'y est lu en base.
export default async function TerminalPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  return (
    <div className="rl-wide">
      <Terminal />
    </div>
  );
}

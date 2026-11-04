import { notFound, redirect } from "next/navigation";
import { CasPratique } from "@/components/cas-fsa/CasPratique";
import { casDe } from "@/lib/cas-fsa";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Cas pratiques · Ranked Lobby" };

// Un cas pratique : seul ce cas part au navigateur.
export default async function CasPratiquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cas = casDe(id);
  if (!cas) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  return (
    <div className="rl-wide rl-page">
      <CasPratique cas={cas} />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Illustration } from "@/components/ui/Illustration";
import { CATALOGUE, TOTAL_FORMULES, lignesDe } from "@/lib/formules";
import { copiesARendre } from "@/lib/formules/tour";
import { topicLabel } from "@/lib/practiceTopics";
import { createClient } from "@/lib/supabase/server";
import { PB } from "@/lib/voice-page-blanche";
import s from "@/components/page-blanche/PageBlanche.module.css";

export const metadata = { title: "La page blanche · Ranked Lobby" };

// La page blanche : le choix de la matière, avec ce qu'il reste à rendre dans chacune.
export default async function PageBlanchePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data } = await supabase.from("formules_maitrise").select("formule").eq("user_id", auth.user.id).eq("maitrisee", true);
  const maitrisees = new Set((data ?? []).map((r) => r.formule as string));

  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-7">
        <div className={s.bandeau}>
          <Illustration nom="reviser-page-blanche" position="50% 62%" decorative eager />
        </div>
        <header className="flex flex-col gap-3">
          <p className="t-small m-0 font-semibold">{PB.kicker}</p>
          <h1 className="t-hero rl-in m-0">{PB.titre}</h1>
          <p className="t-small m-0 max-w-[62ch]">{PB.sous}</p>
          <p className="m-0 font-mono text-[13px] font-semibold tabular-nums">
            {PB.total(TOTAL_FORMULES)} · {PB.maitrisees(maitrisees.size, TOTAL_FORMULES)}
          </p>
        </header>
        <ul className={s.matieres}>
          {CATALOGUE.map((m) => {
            const total = lignesDe(m);
            const faites = m.copies.reduce((t, c) => t + c.formules.filter((f) => maitrisees.has(f.id)).length, 0);
            return (
              <li key={m.matiere}>
                <Link href={`/page-blanche/${m.matiere}`} className={s.matiere}>
                  <b>{topicLabel(m.matiere)}</b>
                  <span className={s.reste}>{PB.copies(copiesARendre(m.copies, maitrisees).length)}</span>
                  <span className={s.jauge} aria-hidden>
                    <i style={{ width: `${total ? (faites / total) * 100 : 0}%` }} />
                  </span>
                  <span className={s.compte}>{PB.maitrisees(faites, total)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { AvancementCas } from "@/components/cas-fsa/AvancementCas";
import { Illustration } from "@/components/ui/Illustration";
import { CAS_FSA } from "@/lib/cas-fsa";
import { createClient } from "@/lib/supabase/server";
import { CAS } from "@/lib/voice-cas-fsa";
import s from "@/components/cas-fsa/CasFsa.module.css";

export const metadata = { title: "Cas pratiques · Ranked Lobby" };

// Les cas pratiques de FSA : la liste (société, exercice, référentiel, accroche, avancement).
export default async function CasPratiquesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-7">
        <div className={s.bandeau}>
          <Illustration nom="practice-studiolo" position="50% 68%" decorative eager />
        </div>
        <header className="flex flex-col gap-3">
          <p className="t-small m-0 font-semibold">{CAS.kicker}</p>
          <h1 className="t-hero rl-in m-0">{CAS.titre}</h1>
          <p className="t-small m-0 max-w-[62ch]">{CAS.sous}</p>
        </header>
        <ul className={s.liste}>
          {CAS_FSA.map((c) => (
            <li key={c.id}>
              <Link href={`/cas-pratiques/${c.id}`} className={s.cas}>
                <b className={"font-brand " + s.societe}>{c.societe}</b>
                <span className={s.exercice}>
                  {c.exercice}
                  <span className={s.referentiel}>{c.referentiel}</span>
                </span>
                <span className={s.accroche}>{c.accroche}</span>
                <AvancementCas id={c.id} etapes={c.etapes.map((e) => e.id)} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

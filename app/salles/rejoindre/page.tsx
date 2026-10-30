import Link from "next/link";
import { redirect } from "next/navigation";
import { Icone } from "@/components/adn/icons";
import { FormCode } from "@/components/salles/FormCode";
import { sallesReady } from "@/lib/salles/api";
import { analyserCode } from "@/lib/salles/logique";
import { createClient } from "@/lib/supabase/server";
import { SALLES } from "@/lib/voice-salles";
import s from "@/components/salles/Salles.module.css";

export const metadata = { title: "Rejoindre une salle · Ranked Lobby" };

type PageProps = { searchParams: Promise<{ code?: string | string[] }> };

// Rejoindre une salle avec son code : /salles/rejoindre?code=K7MX2Q est le lien
// d'invitation que le salon copie. Le code arrive dans le champ ; un clic sur
// « Rejoindre » entre dans la salle (rien ne se joint tout seul : un lien ne
// fait pas d'action). Un code mal formé est signalé tout de suite.
export default async function RejoindrePage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const sp = await searchParams;
  const brut = (Array.isArray(sp.code) ? sp.code[0] : sp.code) ?? "";
  const lu = brut ? analyserCode(brut) : null;
  const pret = await sallesReady(supabase);

  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-7 md:gap-10">
        <header className="flex min-w-0 flex-col gap-3">
          <p className="t-small flex items-center gap-2 font-semibold">
            <Icone nom="classement" size={18} />
            <span>{SALLES.rejoindreKicker}</span>
          </p>
          <h1 className="t-hero rl-in m-0">{SALLES.rejoindreTitre}</h1>
          <p className="t-small m-0 max-w-[60ch]">{SALLES.rejoindreSous}</p>
        </header>

        <div className={[s.jetons, s.racine].join(" ")}>
          {!pret ? (
            <p className={s.entreeBientot}>
              <i className={[s.point, s.pointVif].join(" ")} aria-hidden style={{ color: "var(--sl-vermillon)" }} />
              {SALLES.bientot}
            </p>
          ) : (
            <section className={s.panneau} aria-labelledby="rejoindre-code" style={{ maxWidth: 640 }}>
              <div className={s.panneauTete}>
                <h2 id="rejoindre-code" className={s.titrePanneau}>
                  {SALLES.codeTitre}
                </h2>
              </div>
              <div className={s.panneauCorps}>
                {lu?.ok && <p className={s.info}>{SALLES.codeInvite}</p>}
                {lu && !lu.ok && <p className={s.erreur}>{lu.erreur}</p>}
                <FormCode id="rejoindre-code-champ" initial={lu?.ok ? lu.code : brut} />
              </div>
            </section>
          )}
          <div className={s.piedActions}>
            <Link href="/classement" className={[s.btn, s.btnDiscret].join(" ")}>
              {SALLES.retourSalles}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

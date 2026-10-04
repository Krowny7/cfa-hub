"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { INSCRIPTION } from "@/lib/voice-z3b";

// L'inscription à un examen blanc : le point focal tant qu'on n'est pas
// inscrit, une carte calme ensuite (désinscription en retrait).

export function MockExamRegistration({
  examId,
  isRegistered: initial,
  registrantCount,
  ranked = false,
}: {
  examId: string;
  isRegistered: boolean;
  /** inscrits à cet examen ; null : nombre inconnu (on ne l'affiche pas) */
  registrantCount: number | null;
  /** examen blanc classé (l'ELO bouge à la clôture) */
  ranked?: boolean;
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
        setMsg(INSCRIPTION.desinscrit);
      } else {
        const { error } = await supabase
          .from("mock_exam_registrations")
          .insert({ exam_id: examId, user_id: auth.user.id });
        if (error) {
          // 23505 = violation de la contrainte unique(exam_id, user_id) —
          // l'inscription existe déjà côté serveur (ex: double clic, ou
          // l'état local était périmé). On se resynchronise au lieu
          // d'afficher une erreur qui laisse le bouton dans un état faux.
          if (error.code === "23505") {
            setRegistered(true);
            setMsg(INSCRIPTION.dejaInscrit);
            router.refresh();
            return;
          }
          throw new Error(error.message);
        }
        setRegistered(true);
        setMsg(INSCRIPTION.confirmee);
      }
      router.refresh();
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, "Erreur")}`);
    } finally {
      setBusy(false);
    }
  }

  const count = INSCRIPTION.inscrits(registrantCount);

  // Pas encore inscrit : c'est le point focal de la page (une carte héros, une
  // action en encre). Inscrit : une carte calme, la désinscription en retrait.
  if (!registered) {
    return (
      <section className="card-hero rl-in flex flex-wrap items-center justify-between gap-x-6 gap-y-5 p-6 md:p-8" aria-label="Inscription">
        <div className="min-w-0 max-w-[520px]">
          <p className="t-eyebrow m-0">{INSCRIPTION.surTitre}</p>
          <h2 className="t-h2 m-0 mt-2">{INSCRIPTION.titre}</h2>
          {(count || ranked) && (
            <p className="t-small m-0 mt-2">{[count, ranked ? INSCRIPTION.classe : null].filter(Boolean).join(" · ")}</p>
          )}
          {msg && (
            <p className="m-0 mt-2 text-sm" aria-live="polite">
              {msg}
            </p>
          )}
        </div>
        <button type="button" className="btn btn-primary btn-lg rl-press" disabled={busy} onClick={toggle}>
          {busy ? "…" : INSCRIPTION.sinscrire} {!busy && <ArrowRight size={17} aria-hidden />}
        </button>
      </section>
    );
  }

  return (
    <section className="card rl-in flex flex-wrap items-center justify-between gap-4 p-5 md:px-6" aria-label="Inscription">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black">
          <Check size={18} strokeWidth={2.6} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="m-0 text-[16px] font-bold tracking-[-0.01em]">{INSCRIPTION.inscrit}</p>
          {(count || ranked) && <p className="t-small m-0 mt-0.5">{[count, ranked ? INSCRIPTION.classeCourt : null].filter(Boolean).join(" · ")}</p>}
          {msg && (
            <p className="m-0 mt-1.5 text-sm" aria-live="polite">
              {msg}
            </p>
          )}
        </div>
      </div>
      <button type="button" className="btn btn-ghost btn-sm text-muted" disabled={busy} onClick={toggle}>
        {busy ? "…" : INSCRIPTION.desinscrire}
      </button>
    </section>
  );
}

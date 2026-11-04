"use server";

import { revalidatePath } from "next/cache";
import { matiereDe } from "@/lib/formules";
import { createClient } from "@/lib/supabase/server";

// La page blanche : les notes d'un tour, et le retour à zéro d'une matière.

export type NoteFormule = { id: string; ok: boolean };

export async function enregistrerTour(matiere: string, notes: NoteFormule[]): Promise<{ ok: boolean }> {
  const m = matiereDe(matiere);
  if (!m || notes.length === 0) return { ok: false };
  const connues = new Set(m.copies.flatMap((c) => c.formules.map((f) => f.id)));
  const valides = notes.filter((n) => connues.has(n.id));
  if (valides.length === 0) return { ok: false };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const moi = auth.user?.id;
  if (!moi) return { ok: false };

  const { data: avant, error: lecture } = await supabase.from("formules_maitrise").select("formule,tours").eq("user_id", moi).eq("matiere", matiere);
  if (lecture) return { ok: false };
  const tours = new Map((avant ?? []).map((r) => [r.formule as string, Number(r.tours) || 0]));

  const maintenant = new Date().toISOString();
  const { error } = await supabase.from("formules_maitrise").upsert(
    valides.map((n) => ({ user_id: moi, formule: n.id, matiere, maitrisee: n.ok, tours: (tours.get(n.id) ?? 0) + 1, maj_le: maintenant })),
    { onConflict: "user_id,formule" },
  );
  if (error) return { ok: false };
  revalidatePath("/page-blanche");
  return { ok: true };
}

export async function recommencerMatiere(matiere: string): Promise<{ ok: boolean }> {
  if (!matiereDe(matiere)) return { ok: false };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const moi = auth.user?.id;
  if (!moi) return { ok: false };
  const { error } = await supabase.from("formules_maitrise").update({ maitrisee: false, maj_le: new Date().toISOString() }).eq("user_id", moi).eq("matiere", matiere);
  if (error) return { ok: false };
  revalidatePath("/page-blanche");
  return { ok: true };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { Registre } from "@/components/reviser/Registre";
import { chargerRegistre } from "@/components/reviser/parcours-data";
import { PALETTES, styleDePalette } from "@/lib/palettes";
import s from "./Parcours.module.css";

// Le registre sur la page de l'Atelier (carnet de ratures, questions marquées, points
// faibles), lu en flux : la séance ne l'attend pas.
export async function RegistreAtelier({ supabase, admin, userId }: { supabase: SupabaseClient; admin: SupabaseClient | null; userId: string }) {
  const d = await chargerRegistre(supabase, admin, userId);
  return (
    <div className={s.racine} style={styleDePalette(PALETTES.studiolo)}>
      <Registre d={d} />
    </div>
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { ListeCourte, type Ligne } from "@/components/ui/Decors";
import { chargerRegistre } from "@/components/reviser/parcours-data";
import { nombre } from "@/lib/voice";
import { SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";

// La colonne grise de l'Atelier (le modèle des sous-pages, 2026-11-12) : le registre resserré en
// courte liste, les ratures en cours, les questions marquées, les Ateliers déjà clos. Lu en flux
// (Suspense) : l'ouverture ne l'attend pas. Ce qui ne se lit pas (table absente) ne s'affiche pas.

const S = SOUS_ENTRAINEMENT.atelier;

/** Le nombre d'Ateliers clos (la lecture de lireDernierAtelier, compte seul). Toute erreur : null. */
async function compterAteliers(sb: SupabaseClient, userId: string): Promise<number | null> {
  try {
    const { count, error } = await sb.from("ateliers").select("id", { count: "exact", head: true }).eq("user_id", userId).not("finished_at", "is", null);
    return error ? null : (count ?? 0);
  } catch {
    return null;
  }
}

export async function RegistreCourt({ supabase, admin, userId }: { supabase: SupabaseClient; admin: SupabaseClient | null; userId: string }) {
  const [d, ateliers] = await Promise.all([chargerRegistre(supabase, admin, userId), compterAteliers(supabase, userId)]);
  const lignes: Ligne[] = [];
  if (d.ratures) lignes.push({ cle: "ratures", titre: S.ratures, detail: nombre(d.ratures.enCours), href: "/moi?onglet=erreurs" });
  if (d.marquees) lignes.push({ cle: "marquees", titre: S.marquees, detail: nombre(d.marquees.total), href: "/moi?onglet=marquees" });
  if (ateliers !== null) lignes.push({ cle: "ateliers", titre: S.ateliers, detail: nombre(ateliers) });
  return <ListeCourte lignes={lignes} />;
}

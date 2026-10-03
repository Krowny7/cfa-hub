import type { SupabaseClient } from "@supabase/supabase-js";
import { getTopicMastery } from "@/lib/mastery";
import { SUBJECTS, subjectByFlashcardFolder, type SubjectAvailability } from "@/components/reviser/catalog";

// Disponibilité réelle des formats par matière, pour Réviser (et la grille
// de S'entraîner) : fiches et cours d'après le catalogue, flashcards
// officielles comptées en base par dossier « (Système) ». Dégrade proprement :
// sans client admin ou en cas d'erreur, aucune flashcard n'est annoncée.

type SetRow = { library_folders?: { name: string | null } | { name: string | null }[] | null };

export async function loadFlashcardFolders(admin: SupabaseClient | null): Promise<Map<string, { folder: string; sets: number }>> {
  const out = new Map<string, { folder: string; sets: number }>();
  if (!admin) return out;
  try {
    const { data, error } = await admin
      .from("flashcard_sets")
      .select("id,library_folders(name)")
      .eq("is_official", true)
      .eq("official_published", true)
      .limit(500);
    if (error || !data) return out;
    const perFolder = new Map<string, number>();
    for (const row of data as SetRow[]) {
      const f = Array.isArray(row.library_folders) ? row.library_folders[0] : row.library_folders;
      if (f?.name) perFolder.set(f.name, (perFolder.get(f.name) ?? 0) + 1);
    }
    // Si deux dossiers existent pour la même matière, on garde le plus fourni.
    for (const [folder, sets] of perFolder) {
      const subj = subjectByFlashcardFolder(folder);
      if (!subj) continue;
      const cur = out.get(subj.key);
      if (!cur || sets > cur.sets) out.set(subj.key, { folder, sets });
    }
  } catch {
    // table ou jointure indisponible : pas de flashcards annoncées
  }
  return out;
}

export async function loadSubjects(supabase: SupabaseClient, admin: SupabaseClient | null, userId: string): Promise<SubjectAvailability[]> {
  const [mastery, cards] = await Promise.all([getTopicMastery(supabase, userId), loadFlashcardFolders(admin)]);
  const pct = new Map(mastery.map((t) => [t.key, t.pct]));
  return SUBJECTS.map((s) => {
    const c = cards.get(s.key);
    return {
      key: s.key,
      name: s.name,
      pct: pct.get(s.key) ?? null,
      fiche: s.fiche,
      course: s.course,
      flashcards: c ? `/flashcards?view=system&subject=${encodeURIComponent(c.folder)}` : null,
      flashcardSets: c?.sets ?? 0,
    };
  });
}

// Convertit une erreur Supabase/Postgres brute en message générique pour
// l'utilisateur. Les messages Postgres bruts (contraintes, policies RLS,
// noms de colonnes) ne doivent jamais être affichés tels quels — ils
// exposent des détails d'implémentation sans aider l'utilisateur à agir.
export function friendlyError(e: unknown, fallback: string): string {
  const raw = e instanceof Error ? e.message : String(e ?? "");
  const lower = raw.toLowerCase();

  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "Action non autorisée.";
  }
  if (lower.includes("duplicate key") || lower.includes("already exists")) {
    return "Cet élément existe déjà.";
  }
  if (lower.includes("violates foreign key") || lower.includes("violates not-null")) {
    return "Action impossible : donnée manquante ou invalide.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Erreur réseau — vérifie ta connexion et réessaie.";
  }
  if (lower.includes("jwt") || lower.includes("not authenticated")) {
    return "Session expirée — recharge la page et reconnecte-toi.";
  }

  // Message inconnu : pas de détail technique brut, fallback fourni par l'appelant.
  return fallback;
}

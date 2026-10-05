import { pageDuJour } from "@/components/defi/pages";

export const metadata = { title: "Défi du jour · Ranked Lobby" };

// Le défi du jour (« Les 30 du jour », l'épreuve : 30 questions, 45 min) : à
// faire, en cours ou rendu, avec le classement du jour et les jours passés.
// Le défi est tiré à la première ouverture du jour (daily_get). Tant que
// migration_daily_challenge.sql n'est pas appliquée : état « bientôt ».
// Les 5 du jour (le défi éclair) : /defi/cinq, même parcours.
export default async function DefiPage() {
  return pageDuJour("trente");
}

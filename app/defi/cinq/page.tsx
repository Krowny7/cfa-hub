import { pageDuJour } from "@/components/defi/pages";

export const metadata = { title: "Les 5 du jour · Ranked Lobby" };

// Les 5 du jour, le défi éclair : 5 questions de cours, sans calcul, les
// mêmes pour tout le monde ; deux minutes (chrono de 5 min), une copie, le
// classement du jour (migration_cinq_du_jour.sql : RPC cinq_*). Tant que la
// migration n'est pas appliquée : état « bientôt ».
export default async function CinqPage() {
  return pageDuJour("cinq");
}

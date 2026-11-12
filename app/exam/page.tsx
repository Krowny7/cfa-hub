import { redirect } from "next/navigation";

// Le mode examen vit désormais dans la séance libre (/session, son interrupteur allumé) :
// l'ancienne adresse y renvoie, pour garder les liens (les examens blancs, le Codex…).
export default function ExamPage() {
  redirect("/session?mode=examen");
}

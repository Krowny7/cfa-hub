import { redirect } from "next/navigation";

export const metadata = { title: "Réglages · Ranked Lobby" };

// Les réglages vivent dans l'onglet Réglages de l'espace Moi (un seul
// endroit, pas de doublon). Les anciens liens vers /settings y mènent.
export default function SettingsPage() {
  redirect("/moi?onglet=reglages");
}

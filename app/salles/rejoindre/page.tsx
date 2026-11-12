import { redirect } from "next/navigation";

type PageProps = { searchParams: Promise<{ code?: string | string[] }> };

// L'ancienne page « Rejoindre une salle » : /salles/rejoindre?code=K7MX2Q est le lien d'invitation que
// le salon copie. Elle renvoie sur /salles, en gardant le code, qui y pré-remplit le champ (rien ne
// se joint tout seul : un clic sur « Rejoindre » entre dans la salle).
export default async function RejoindrePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const code = (Array.isArray(sp.code) ? sp.code[0] : sp.code)?.trim();
  redirect(code ? `/salles?code=${encodeURIComponent(code)}` : "/salles");
}

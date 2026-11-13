import { redirect } from "next/navigation";

export const metadata = { title: "Joueurs · Ranked Lobby" };

type PageProps = { searchParams?: Promise<{ q?: string | string[] }> };

// /people a rejoint /duel (décision de Théo, 2026-11-13, tant qu'il y a moins de dix joueurs) : la
// recherche d'un joueur, les amis (dans la rangée des adversaires et en lignes sous la recherche) et les demandes d'ami (reçues et
// envoyées) y sont. La recherche suit (?q=) ; l'ancienne vue ?view= n'a plus d'objet. Le profil d'un
// joueur (/people/[id]) reste.
export default async function PeoplePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const brut = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (brut ?? "").trim().slice(0, 40);
  redirect(q ? `/duel?q=${encodeURIComponent(q)}` : "/duel");
}

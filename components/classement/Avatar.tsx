import { SceauPerso } from "@/components/adn/SceauPerso";
import { PresenceDot } from "@/components/presence/Presence";

// Identité d'un joueur : sa photo de profil, sinon son sceau d'initiales
// (règle 4 : l'encre est le travail, le métal la récompense ; ailleurs que
// dans le rang, l'identité est un sceau d'encre). Avec `userId`, le point
// vert « en ligne » se pose en bas à droite (components/presence). Sans état :
// utilisable côté serveur comme côté client.
export function Avatar({
  src,
  name,
  size = 36,
  className = "",
  userId = null,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
  /** le joueur dont on montre la présence (rien pour soi-même) */
  userId?: string | null;
}) {
  const visage = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className={"shrink-0 rounded-full object-cover " + className} style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className={"inline-flex shrink-0 " + className} style={{ width: size, height: size }}>
      <SceauPerso nom={name} taille={size} />
    </span>
  );
  if (!userId) return visage;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {visage}
      <PresenceDot userId={userId} avatar={size} />
    </span>
  );
}

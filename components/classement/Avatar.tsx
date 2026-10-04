import { SceauPerso } from "@/components/adn/SceauPerso";

// Identité d'un joueur : sa photo de profil, sinon son sceau d'initiales
// (règle 4 : l'encre est le travail, le métal la récompense ; ailleurs que
// dans le rang, l'identité est un sceau d'encre). Sans état : utilisable
// côté serveur comme côté client.
export function Avatar({ src, name, size = 36, className = "" }: { src: string | null | undefined; name: string; size?: number; className?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" width={size} height={size} className={"shrink-0 rounded-full object-cover " + className} style={{ width: size, height: size }} />
    );
  }
  return (
    <span aria-hidden className={"inline-flex shrink-0 " + className} style={{ width: size, height: size }}>
      <SceauPerso nom={name} taille={size} />
    </span>
  );
}

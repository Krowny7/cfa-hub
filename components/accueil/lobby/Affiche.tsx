import { Illustration } from "@/components/ui/Illustration";
import l from "./Lobby.module.css";
import p from "./Parcours.module.css";
import type { AfficheLobby } from "./types";

// Une affiche : une carte d'illustration pure, comme une affiche accrochée dans un
// lobby de jeu. Une peinture du site (lib/illustrations.ts), une légende minuscule en
// pastille (facultative : le Colisée de la Lice n'en a pas), AUCUN lien et aucun
// bouton : juste de l'air entre les cartes. Elle prend
// la hauteur de sa rangée (340 px au moins sur ordinateur, 160 px au téléphone).
// Composant serveur, sans état.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Affiche({ a, className }: { a: AfficheLobby; className?: string }) {
  return (
    <figure className={cx(l.carte, p.affiche, className)}>
      <div className={p.afficheImg}>
        <Illustration nom={a.nom} position={a.position ?? "50% 50%"} />
      </div>
      {a.legende && <figcaption className={p.afficheLegende}>{a.legende}</figcaption>}
    </figure>
  );
}

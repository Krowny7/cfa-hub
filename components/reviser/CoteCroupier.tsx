import Link from "next/link";
import { Spade } from "lucide-react";
import { PanneauCroupier } from "@/components/flashcards/partie/PanneauCroupier";
import { ActionEncre } from "@/components/ui/SousPage";
import s from "./ListeReviser.module.css";

// La colonne de droite des flashcards (disposition de Théo, 2026-11-12) : Léonard le croupier et
// sa bulle, le bouton de la partie de cartes, puis un petit tapis vert (trois cartes retournées,
// un jeton) qui mène aussi à la partie. Sans état : composant serveur.

export function CoteCroupier({ href, bulle, action, aide }: { href: string; bulle: string; action: string; aide: string }) {
  return (
    <div className={s.cote}>
      <PanneauCroupier pose="moqueur" bulle={bulle} />
      <div className={s.bouton}>
        <ActionEncre href={href}>
          <Spade size={16} aria-hidden /> {action}
        </ActionEncre>
      </div>
      <Link href={href} className={s.tapisMini} aria-label={aide} title={aide}>
        <span className={s.cartesMini} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className={s.jeton} aria-hidden />
      </Link>
    </div>
  );
}

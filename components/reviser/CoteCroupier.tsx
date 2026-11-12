import Link from "next/link";
import { IMAGE_POSE } from "@/lib/flashcards/partie";
import s from "./ListeReviser.module.css";

// La colonne de droite des flashcards (disposition de Théo, 2026-11-12) : sur un fond gris, du haut
// en bas du cadre, Léonard le croupier presque en entier, puis le petit tapis vert (trois cartes
// retournées, un jeton) : un clic dessus lance la partie de cartes. Sans texte. Composant serveur.

export function CoteCroupier({ href, aide }: { href: string; aide: string }) {
  return (
    <div className={s.cote}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={IMAGE_POSE.moqueur} alt="" width={598} height={660} decoding="async" className={s.leonard} />
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

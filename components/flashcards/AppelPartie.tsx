import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PARTIE_ENTREE as T } from "@/lib/voice-partie";
import s from "./partie/Partie.module.css";

// L'entrée de « la partie de cartes » sur les pages Flashcards : une carte
// de tapis vert où Léonard, le croupier, propose de distribuer. `matiere` :
// la matière à cocher d'avance (clé du programme) avec son nom pour la
// phrase ; absente, la partie s'ouvre sur toutes les matières. Composant
// serveur, sans état.

export function AppelPartie({ matiere, matiereNom, className = "" }: { matiere?: string; matiereNom?: string; className?: string }) {
  const href = matiere ? `/flashcards/partie?matiere=${encodeURIComponent(matiere)}` : "/flashcards/partie";
  return (
    <Link href={href} className={`${s.appel} ${className}`} title={T.aide}>
      <span className={s.appelLeo} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/leonard/pose-fier.webp" alt="" decoding="async" />
      </span>
      <span className={s.appelTexte}>
        <small>{T.surTitre}</small>
        <b>{T.titre}</b>
        <span>{matiereNom ? T.ligneMatiere(matiereNom) : T.ligne}</span>
      </span>
      <span className={s.appelAction}>
        <span>{T.action}</span> <ArrowRight size={16} aria-hidden />
      </span>
    </Link>
  );
}

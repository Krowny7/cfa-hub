import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Illustration } from "@/components/ui/Illustration";
import { PARC } from "@/lib/voice-accueil-lobby-parcours";
import l from "./Lobby.module.css";
import p from "./Parcours.module.css";
import type { GrandeSalleLobby } from "./types";

// « La Grande Salle » : la bande pleine largeur du prochain examen blanc, peinte
// (mock-grande-salle, un voile en dégradé qui garde le texte lisible) avec un
// bouton NOIR en aplat : le bouton de cette bande n'est pas un bouton d'encre, la
// règle d'encre ne le concerne pas. Aucun examen à venir : la bande n'est pas
// posée (grandeSalle = null). Composant serveur, sans état.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const ID = "lobby-salle-titre";

export function BandeGrandeSalle({ g, className }: { g: GrandeSalleLobby; className?: string }) {
  return (
    <section aria-labelledby={ID} className={cx(l.carte, l.peint, l.g, p.salle, className)}>
      <div className={l.fond}>
        <Illustration nom="mock-grande-salle" decorative position="50% 45%" />
      </div>
      <p className={cx(l.eyebrow, l.eyebrowC)}>{PARC.salle.eyebrow}</p>
      <h2 id={ID} className={cx("font-brand", p.salleTitre)}>
        {g.titre}
      </h2>
      <p className={p.salleLigne}>{g.ligne}</p>
      <Link href={g.action.href} className={cx(l.noir, p.salleBouton)}>
        {g.action.libelle}
        <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
      </Link>
    </section>
  );
}

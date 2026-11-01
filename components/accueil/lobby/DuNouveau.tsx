import Link from "next/link";
import { Bell } from "lucide-react";
import { initials } from "@/components/classement/format";
import type { NouveauLobby } from "./types";
import { PARC } from "@/lib/voice-accueil-lobby-parcours";
import { Phrase, SceauUni } from "./Encre";
import l from "./Lobby.module.css";
import { actionNouveau, phraseNouveau, quandDe, texteDe } from "./modele-parcours";
import p from "./Parcours.module.css";

// « Du nouveau » : les nouvelles de tes amis sur sept jours (un palier, une victoire
// contre toi, un dépassement), cinq au plus, une ligne chacune. Le bouton de la ligne
// dit ce qu'il fait vraiment : une victoire sur toi → la revanche (le lobby des
// duels), un dépassement → le face-à-face, un palier → son profil. Pas de « Féliciter » :
// le site n'a pas de messages. Boutons secondaires à contour fin, donc aucune encre.
// La date se dit au serveur (« hier », « il y a 3 j »), jamais dans le navigateur.
// Rien de neuf, ou les amis illisibles : la carte n'est pas posée. Composant serveur,
// sans état. `data-leonard` : la cible des répliques de Léonard.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const ID = "lobby-nouveau-titre";

/** `aujourdhui` : le jour de Paris (AAAA-MM-JJ), pour dire « hier » ou « il y a 3 j ». */
export function DuNouveau({ nouvelles, aujourdhui, className }: { nouvelles: NouveauLobby[] | null; aujourdhui: string; className?: string }) {
  if (!nouvelles || nouvelles.length === 0) return null;
  return (
    <section data-leonard="du-nouveau" aria-labelledby={ID} className={cx(l.carte, p.nv, className)}>
      <header className={p.nvTete}>
        <h2 id={ID} className={cx("font-brand", p.nvTitre)}>
          <SceauUni>
            <Bell size={15} aria-hidden />
          </SceauUni>
          {PARC.nouveau.titre}
        </h2>
        <Link href="/classement?onglet=amis" className={l.lien}>
          {PARC.nouveau.lien} →
        </Link>
      </header>
      <ul className={p.nvListe}>
        {nouvelles.map((n) => {
          const phrase = phraseNouveau(n);
          const action = actionNouveau(n);
          return (
            <li key={n.cle} className={p.nvLigne}>
              <span className={cx(l.av, p.nvAv)} aria-hidden>
                {initials(n.joueur.nom)}
              </span>
              <p className={p.nvTexte}>
                <b>{n.joueur.nom}</b> <Phrase segments={phrase} />
              </p>
              <span className={p.quand}>{quandDe(n, aujourdhui)}</span>
              <Link href={action.href} className={cx(l.mini, p.nvBouton)} aria-label={`${action.libelle} : ${PARC.nouveau.aria(n.joueur.nom, texteDe(phrase))}`}>
                {action.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

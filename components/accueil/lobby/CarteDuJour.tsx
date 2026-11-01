import { CarteDuJourIle } from "./CarteDuJourIle";
import { TexteCarte, VersoCarte } from "./TexteCarte";
import type { CarteDuJourLobby } from "./modele-carte";

// « La carte du jour » de l'accueil « Le lobby » : composant serveur. Il rend
// le recto et le verso de la carte (formules KaTeX comprises, TexteCarte.tsx),
// puis les passe à l'îlot en ReactNode : aucune fonction ne traverse, et KaTeX
// reste côté serveur. `key` : une autre carte (nouveau jour, nouveaux réglages)
// remonte l'îlot, qui repart recto, panneau fermé. Ligne sous le titre : la
// raison du repli quand la source choisie n'a rien donné, sinon les réglages.
// `className` : le placement donné par LobbyView (colonne de la rangée).
// `ouvertAuDepart` : le panneau des réglages ouvert, pour les aperçus et les tests.

export function CarteDuJour({ carte, className, ouvertAuDepart }: { carte: CarteDuJourLobby; className?: string; ouvertAuDepart?: boolean }) {
  return (
    <CarteDuJourIle
      key={carte.id}
      className={className}
      matiere={carte.matiere}
      recto={<TexteCarte texte={carte.recto} />}
      verso={<VersoCarte back={carte.verso} />}
      resume={carte.repli ?? carte.resume}
      prompt={carte.prompt}
      reglages={carte.reglages}
      ouvertAuDepart={ouvertAuDepart}
    />
  );
}

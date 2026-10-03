// Tamponner : une réussite (objectif atteint, victoire en duel, bonne
// réponse, palier franchi) se pose comme un sceau — un peu trop grande,
// elle s'écrase d'un cheveu et se pose — pendant qu'une tache d'encre
// s'étale dessous puis sèche. À garder pour les vrais moments, un tampon
// par écran au plus. Sans état : utilisable côté serveur. Pour rejouer le
// geste, changer la `key` du composant. Le moteur de mouvement le fait
// attendre s'il naît hors de l'écran ; mouvement réduit = posé d'emblée.
export function InkStamp({ children, blot = true, className = "" }: { children: React.ReactNode; blot?: boolean; className?: string }) {
  return (
    <span className={"relative inline-grid place-items-center " + className}>
      {blot && <span aria-hidden className="rl-stamp-blot rl-deco" />}
      <span className="rl-stamp relative">{children}</span>
    </span>
  );
}

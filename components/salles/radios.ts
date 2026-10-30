// Un groupe de boutons à choix unique (role="radiogroup" de boutons role="radio") :
// une seule tabulation sur le groupe (le choisi porte tabIndex 0, les autres -1)
// et les flèches passent d'un choix au suivant et le choisissent, comme des
// boutons radio. À poser en onKeyDown sur le conteneur du groupe.

export function flechesRadios(e: React.KeyboardEvent<HTMLElement>) {
  const avance = e.key === "ArrowRight" || e.key === "ArrowDown";
  const recule = e.key === "ArrowLeft" || e.key === "ArrowUp";
  if (!avance && !recule) return;
  const boutons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const i = boutons.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0 || boutons.length < 2) return;
  e.preventDefault();
  const suivant = boutons[(i + (avance ? 1 : -1) + boutons.length) % boutons.length];
  suivant.focus();
  suivant.click();
}

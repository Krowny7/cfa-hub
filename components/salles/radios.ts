// Un groupe de boutons à choix unique (role="radiogroup" de boutons role="radio",
// ou role="tablist" d'onglets) : une seule tabulation sur le groupe (le choisi
// porte tabIndex 0, les autres -1) et les flèches passent d'un choix au suivant
// et le choisissent, en sautant les choix désactivés. À poser en onKeyDown sur le
// conteneur du groupe.

function fleches(e: React.KeyboardEvent<HTMLElement>, selecteur: string) {
  const avance = e.key === "ArrowRight" || e.key === "ArrowDown";
  const recule = e.key === "ArrowLeft" || e.key === "ArrowUp";
  if (!avance && !recule) return;
  const boutons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>(selecteur));
  const i = boutons.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0 || boutons.length < 2) return;
  e.preventDefault();
  const suivant = boutons[(i + (avance ? 1 : -1) + boutons.length) % boutons.length];
  suivant.focus();
  suivant.click();
}

export const flechesRadios = (e: React.KeyboardEvent<HTMLElement>) => fleches(e, '[role="radio"]:not([disabled])');
export const flechesOnglets = (e: React.KeyboardEvent<HTMLElement>) => fleches(e, '[role="tab"]');

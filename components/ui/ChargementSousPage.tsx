import s from "./SousPage.module.css";

// Le chargement d'une sous-page (direction du 2026-11-13) : il dessine la vraie forme de la page —
// la porte (retour, kicker, titre, ligne à gauche ; la peinture à droite, bord en touches) puis la
// scène de l'objet — au lieu du squelette générique des pages principales. Il ne se montre que si
// l'attente dure (.rl-loading : fondu retardé). Composant serveur.
export function ChargementSousPage() {
  return (
    <div className="rl-wide rl-page rl-loading grid gap-6" aria-busy="true" aria-label="Chargement">
      <div className={s.cadre} data-illustre="1">
        <div className={s.contenu}>
          <div className="rl-skel h-[30px] w-28 rounded-full" />
          <div className="grid w-full gap-2.5">
            <div className="rl-skel h-3 w-40 rounded-full" />
            <div className="rl-skel h-[40px] w-[min(380px,85%)] rounded-[12px]" />
            <div className="rl-skel h-3.5 w-[min(320px,70%)] rounded-full opacity-70" />
          </div>
        </div>
        <div className={s.image}>
          <div className={"rl-skel absolute inset-0 " + s.peintureVide} />
        </div>
      </div>
      <div className="rl-stagger grid gap-4" style={{ ["--rl-stagger-from" as string]: ".25s" }}>
        <div className="rl-skel h-3 w-32 rounded-full opacity-70" />
        <div className="rl-skel h-[min(52vh,420px)] rounded-[22px]" />
      </div>
    </div>
  );
}

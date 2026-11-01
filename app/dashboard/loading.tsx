// Le squelette de l'accueil « Le lobby » : la même charpente que la page (le salut
// et J-n, les 30 du jour avec leur classement | les 5 et les traits, la carte du
// jour | le rival | l'affiche), en blocs calmes qui n'apparaissent que si
// l'attente dure (.rl-loading : fondu retardé, pas de flash pour une page rapide).
// Remplace le squelette général (app/loading.tsx) pour cette seule route. Aucune
// donnée, aucun tracé : de simples blocs.
export default function Loading() {
  return (
    <div className="rl-wide rl-loading flex flex-col gap-4" aria-busy="true" aria-label="Chargement">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="rl-skel h-[34px] w-[min(300px,70%)] rounded-[12px]" />
        <div className="rl-skel h-[44px] w-[min(240px,50%)] rounded-[12px]" />
      </div>
      <div className="rl-stagger grid gap-4 lg:grid-cols-12" style={{ ["--rl-stagger-from" as string]: ".2s" }}>
        <div className="rl-skel h-[330px] rounded-[20px] lg:col-span-8" />
        <div className="grid gap-4 lg:col-span-4">
          <div className="rl-skel h-[150px] rounded-[16px]" />
          <div className="rl-skel h-[170px] rounded-[16px]" />
        </div>
      </div>
      <div className="rl-stagger grid gap-4 lg:grid-cols-[1.22fr_1fr_.86fr]" style={{ ["--rl-stagger-from" as string]: ".34s" }}>
        <div className="rl-skel h-[300px] rounded-[16px]" />
        <div className="rl-skel h-[300px] rounded-[16px]" />
        <div className="rl-skel hidden h-[300px] rounded-[16px] opacity-70 lg:block" />
      </div>
      <div className="rl-stagger grid gap-4 lg:grid-cols-12" style={{ ["--rl-stagger-from" as string]: ".48s" }}>
        <div className="rl-skel h-[210px] rounded-[16px] opacity-70 lg:col-span-7" />
        <div className="rl-skel h-[210px] rounded-[16px] opacity-70 lg:col-span-5" />
      </div>
    </div>
  );
}

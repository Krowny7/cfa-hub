import { InkRing } from "@/components/ink/InkRing";

// Squelette affiché pendant le chargement d'une page (données Supabase) :
// la navigation reste instantanée, et il ne se montre que si l'attente dure
// (.rl-loading : fondu retardé, pas de flash pour une page rapide). Il
// reprend la hiérarchie des pages — un titre, une carte héros, trois tuiles
// calmes — dont les blocs arrivent en cascade, avec le petit anneau du logo
// qui se trace là où viendra le titre. La vraie page le remplace en fondu
// (.rl-route > *, app/template.tsx).
export default function Loading() {
  return (
    <div className="rl-wide rl-loading grid gap-10 md:gap-14" aria-busy="true" aria-label="Chargement">
      <div className="rl-stagger grid gap-3" style={{ ["--rl-stagger-from" as string]: ".18s" }}>
        <div className="flex items-center gap-2.5">
          <InkRing size={18} className="rl-deco rl-ink-draw opacity-60" />
          <div className="rl-skel h-3 w-28 rounded-full" />
        </div>
        <div className="rl-skel h-[52px] w-[min(420px,80%)] rounded-[14px]" />
      </div>
      <div className="rl-stagger grid gap-5 md:grid-cols-[1.6fr_1fr]" style={{ ["--rl-stagger-from" as string]: ".3s" }}>
        <div className="rl-skel h-[200px] rounded-[22px]" />
        <div className="rl-skel h-[200px]" />
      </div>
      <div className="rl-stagger grid gap-4 sm:grid-cols-3" style={{ ["--rl-stagger-from" as string]: ".42s" }}>
        <div className="rl-skel h-[140px] opacity-70" />
        <div className="rl-skel h-[140px] opacity-70" />
        <div className="rl-skel h-[140px] opacity-70" />
      </div>
    </div>
  );
}

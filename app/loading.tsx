// Squelette affiché pendant le chargement d'une page (données Supabase) :
// la navigation reste instantanée, le contenu arrive en fondu. Il reprend
// la hiérarchie des pages : un titre, une carte héros, trois tuiles calmes.
export default function Loading() {
  return (
    <div className="rl-wide grid gap-10 md:gap-14" aria-busy="true" aria-label="Chargement">
      <div className="grid gap-3">
        <div className="rl-skel h-3 w-28 rounded-full" />
        <div className="rl-skel h-[52px] w-[min(420px,80%)] rounded-[14px]" />
      </div>
      <div className="grid gap-5 md:grid-cols-[1.6fr_1fr]">
        <div className="rl-skel h-[200px] rounded-[22px]" />
        <div className="rl-skel h-[200px]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rl-skel h-[140px] opacity-70" />
        <div className="rl-skel h-[140px] opacity-70" />
        <div className="rl-skel h-[140px] opacity-70" />
      </div>
    </div>
  );
}

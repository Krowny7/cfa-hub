// Squelette affiché pendant le chargement d'une page (données Supabase) :
// la navigation reste instantanée, le contenu arrive en fondu.
export default function Loading() {
  return (
    <div className="rl-wide grid gap-5" aria-busy="true" aria-label="Chargement">
      <div className="rl-skel h-[120px] max-w-[560px]" />
      <div className="grid gap-5 md:grid-cols-[1.6fr_1fr]">
        <div className="rl-skel h-[200px]" />
        <div className="rl-skel h-[200px]" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rl-skel h-[190px]" />
        <div className="rl-skel h-[190px]" />
        <div className="rl-skel h-[190px]" />
        <div className="rl-skel h-[190px]" />
      </div>
    </div>
  );
}

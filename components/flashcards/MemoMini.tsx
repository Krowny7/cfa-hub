// Le mémo d'une matière en petit, dans la colonne grise de /flashcards/matiere/<clé> (modèle des
// sous-pages, 2026-11-12) : la feuille en vignette et son nom ; un clic l'ouvre (le PDF, sinon
// l'image) dans un nouvel onglet. Sans état : composant serveur.

export function MemoMini({ src, href, titre, aide, ratio }: { src: string; href: string; titre: string; aide: string; ratio: number }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group grid w-full max-w-[180px] justify-self-center gap-2 text-center"
      aria-label={aide}
      title={aide}
    >
      <span
        className="block overflow-hidden rounded-[10px] border border-line bg-white shadow-[var(--shadow-1)] transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none"
        style={{ aspectRatio: String(ratio) }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="block h-full w-full" loading="lazy" decoding="async" draggable={false} />
      </span>
      <span className="text-[13px] font-semibold leading-snug">{titre}</span>
    </a>
  );
}

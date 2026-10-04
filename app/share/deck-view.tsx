import { RichText } from "@/components/RichText";
import { plural } from "@/components/ContentDetailHeader";
import { ShareFooter, ShareHeader } from "@/app/share/views";
import { PARTAGE } from "@/lib/voice-z3c";

// Set de flashcards partagé (lecture seule) : recto et verso côte à côte.
// À part de views.tsx pour que la page du QCM partagé ne charge pas KaTeX.

export type SharedCard = { id: string; front: string; back: string; position: number };

export function SharedDeckView({ title, cards }: { title: string; cards: SharedCard[] }) {
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-8 md:gap-10">
      <ShareHeader kind="Set" title={title} meta={plural(cards.length, "carte", "cartes")} />

      {cards.length === 0 ? (
        <div className="card-quiet grid place-items-center px-6 py-14 text-center">
          <p className="t-small">{PARTAGE.videCartes}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="t-eyebrow hidden grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)] gap-6 px-7 sm:grid">
            <span />
            <span>Recto</span>
            <span>Verso</span>
          </div>
          <ol className="card m-0 list-none divide-y divide-line overflow-hidden p-0">
            {cards.map((c, idx) => (
              <li
                key={c.id}
                className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 gap-y-2 px-5 py-5 sm:grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)] sm:gap-x-6 md:px-7"
              >
                <span className="t-micro pt-0.5 font-mono font-semibold tabular-nums">{idx + 1}</span>
                <RichText text={c.front} className="break-words text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]" />
                <RichText text={c.back} className="text-body col-start-2 break-words text-[14.5px] leading-relaxed [overflow-wrap:anywhere] sm:col-start-3" />
              </li>
            ))}
          </ol>
        </div>
      )}

      <ShareFooter line={PARTAGE.cartes} />
    </div>
  );
}

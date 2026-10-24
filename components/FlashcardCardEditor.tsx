import { TopicBadge } from "@/components/TopicSelector";
import { RichText } from "@/components/RichText";
import { VersoCompact } from "@/components/flashcards/Verso";

type Card = { id: string; front: string; back: string; position: number; topic_id?: number | null };

// Toutes les cartes d'un paquet, en lecture seule : le recto et le verso
// compact (les trois cases) côte à côte. Les paquets sont officiels : on ne
// crée, ne modifie ni ne supprime de carte depuis le site.
export function FlashcardCardEditor({ cards }: { cards: Card[] }) {
  if (cards.length === 0) return <p className="t-small">Aucune carte pour l&apos;instant.</p>;

  return (
    <ol className="m-0 grid list-none gap-2 p-0">
      {cards.map((c) => (
        <li key={c.id} className="rounded-[14px] border border-line px-4 py-3.5">
          <div className="flex items-start gap-3">
            <span className="t-micro w-7 shrink-0 pt-0.5 font-mono font-semibold tabular-nums">{c.position}</span>
            <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-2 sm:gap-6">
              <RichText text={c.front} className="break-words text-[14px] font-semibold leading-snug [overflow-wrap:anywhere]" />
              <div className="min-w-0">
                <VersoCompact back={c.back} className="text-body break-words text-[14px] leading-snug [overflow-wrap:anywhere]" />
                {c.topic_id ? (
                  <div className="mt-2">
                    <TopicBadge topicId={c.topic_id} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

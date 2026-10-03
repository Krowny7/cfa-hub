"use client";

export const CFA_TOPICS = [
  { id: 1,  code: "ethics",      label: "Éthique" },
  { id: 2,  code: "quant",       label: "Méthodes quantitatives" },
  { id: 3,  code: "economics",   label: "Économie" },
  { id: 4,  code: "fra",         label: "États financiers" },
  { id: 5,  code: "corporate",   label: "Finance d'entreprise" },
  { id: 6,  code: "equity",      label: "Actions" },
  { id: 7,  code: "derivatives", label: "Dérivés" },
  { id: 8,  code: "fixed",       label: "Revenu fixe" },
  { id: 9,  code: "alts",        label: "Alternatifs" },
  { id: 10, code: "portfolio",   label: "Portefeuille" },
] as const;

// Liste déroulante compacte (formulaires de QCM et de flashcards).
export function TopicSelector({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className="select min-h-[34px] w-auto rounded-[10px] py-1 pl-3 text-[13px]"
      aria-label="Matière CFA"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      disabled={disabled}
    >
      <option value="">Matière CFA…</option>
      {CFA_TOPICS.map((t) => (
        <option key={t.id} value={t.id}>
          {t.label}
        </option>
      ))}
    </select>
  );
}

// Pastille discrète : une métadonnée, pas une action.
export function TopicBadge({ topicId }: { topicId: number | null }) {
  if (!topicId) return null;
  const topic = CFA_TOPICS.find((t) => t.id === topicId);
  if (!topic) return null;
  return <span className="chip chip-quiet chip-sm min-h-[22px] px-2 text-[11.5px]">{topic.label}</span>;
}

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
      className="rounded-xl border border-white/10 bg-neutral-900/60 px-2 py-1.5 text-xs text-white/80 disabled:opacity-50"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      disabled={disabled}
    >
      <option value="">Topic CFA…</option>
      {CFA_TOPICS.map((t) => (
        <option key={t.id} value={t.id}>
          {t.label}
        </option>
      ))}
    </select>
  );
}

export function TopicBadge({ topicId }: { topicId: number | null }) {
  if (!topicId) return null;
  const topic = CFA_TOPICS.find((t) => t.id === topicId);
  if (!topic) return null;
  return (
    <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
      {topic.label}
    </span>
  );
}

import Link from "next/link";

// Contrôle segmenté (.seg) à colonnes égales : l'indicateur se place par
// calcul, sans mesure, donc juste dès le rendu serveur. Sans état :
// utilisable côté serveur comme côté client.

/** Position de l'indicateur glissant sous l'onglet `ix` parmi `n`. */
export function segThumbStyle(ix: number, n: number): React.CSSProperties {
  return {
    left: `calc(4px + ${Math.max(ix, 0)} * (100% - 8px) / ${n})`,
    width: `calc((100% - 8px) / ${n})`,
    opacity: ix >= 0 ? 1 : 0,
  };
}

/** Onglets en liens (navigation serveur), par ex. « Tous | Mes groupes ». */
export function LinkSeg({ items, active, label }: { items: { key: string; label: React.ReactNode; href: string }[]; active: string; label: string }) {
  const ix = items.findIndex((i) => i.key === active);
  return (
    <nav aria-label={label} className="seg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      <span aria-hidden className="seg-thumb" style={segThumbStyle(ix, items.length)} />
      {items.map((i) => (
        <Link key={i.key} href={i.href} className="seg-item" aria-current={i.key === active ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

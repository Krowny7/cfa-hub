/**
 * Cote d'architecte (Épure) : un écart se lit comme sur un plan, une ligne de
 * dimension entre deux tirets obliques et sa mesure posée dessus.
 * « 1312 ⟋—— +18 ——⟋ 1330 », « ⟋—— encore 14 », « J-212 ».
 *
 * Règle 2 : le bout qui reste est toujours nommé ; sa cote est au stylo
 * rouge (`ton="stylo"`). Ce qui est acquis se cote à l'encre, le reste au
 * crayon (défaut).
 *
 * Props :
 * - `label` : la mesure (« +18 », « 88 pts », « encore 14 », « J-212 »)
 * - `de`, `a` : les deux bouts, de part et d'autre de la ligne (optionnels)
 * - `ton` : "crayon" (défaut) | "encre" | "stylo"
 * - `forme` : "ligne" (défaut : la ligne prend la largeur disponible, mesure
 *   au milieu) | "marque" (courte, la mesure au bout : une note en marge)
 * - `className`
 *
 * Sans état : utilisable côté serveur. Styles dans le CSS global (.cote*).
 */
export function Cote({
  label,
  de,
  a,
  ton = "crayon",
  forme = "ligne",
  className = "",
}: {
  label?: React.ReactNode;
  de?: React.ReactNode;
  a?: React.ReactNode;
  ton?: "crayon" | "encre" | "stylo";
  forme?: "ligne" | "marque";
  className?: string;
}) {
  const tone = ton === "stylo" ? " cote-pen" : ton === "encre" ? " cote-ink" : "";
  if (forme === "marque") {
    return (
      <span className={"cote" + tone + " " + className}>
        <span aria-hidden className="cote-tick" />
        <span aria-hidden className="cote-rule" style={{ flex: "none", width: 18 }} />
        {label != null && <span className="cote-label">{label}</span>}
      </span>
    );
  }
  return (
    <span className={"cote flex w-full" + tone + " " + className}>
      {de != null && <span className="cote-end">{de}</span>}
      <span className="cote-span">
        <span aria-hidden className="cote-tick" />
        <span aria-hidden className="cote-rule" />
        {label != null && <span className="cote-label">{label}</span>}
        {label != null && <span aria-hidden className="cote-rule" />}
        <span aria-hidden className="cote-tick" />
      </span>
      {a != null && <span className="cote-end">{a}</span>}
    </span>
  );
}

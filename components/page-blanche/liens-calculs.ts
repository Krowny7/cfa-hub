import { CALC_SUBJECTS, calcCatalog } from "@/lib/calc/index";
import type { CalcTopic } from "@/lib/calc/types";
import type { Copie } from "@/lib/formules/types";
import { LIENS_CALCULS } from "@/lib/formules/liens-calculs";
import type { LienCalcul } from "@/components/page-blanche/Session";

// Le calcul de chaque formule de la page blanche (lu par le serveur : le catalogue des calculs ne part
// pas au navigateur). Une formule n'a de lien que si la table relue à la main la rattache à un type de
// calcul de sa matière (lib/formules/liens-calculs.ts) ; un type disparu du catalogue n'en donne pas.
// La clé « * » : les calculs de la matière (UN lien, au pied de la feuille des oublis). Rien si la
// matière n'a pas de calculs.

export function liensCalculs(matiere: string, copies: Copie[]): Record<string, LienCalcul> {
  const sujet = CALC_SUBJECTS.find((x) => x.topic === matiere);
  const cat = sujet ? calcCatalog(sujet.topic as CalcTopic) : null;
  if (!sujet || !cat) return {};
  const types = new Map(cat.types.map((t) => [t.key, t]));
  const out: Record<string, LienCalcul> = { "*": { href: `/calculs/${sujet.slug}`, nom: sujet.name } };
  for (const c of copies) {
    for (const f of c.formules) {
      const t = types.get(LIENS_CALCULS[f.id] ?? "");
      if (t) out[f.id] = { href: `/calculs/${sujet.slug}/${t.key}`, nom: t.name };
    }
  }
  return out;
}

// Tests légers de ce que l'écran du Codex lit (sans base ni réseau) :
//   npx tsx --tsconfig tsconfig.json scripts/codex/test-ecran.ts
// Vérifie : les identifiants de dévoilement du navigateur (devoile-lite)
// concordent avec DECOUVERTE, la navigation montre ce qu'il faut selon le
// dévoilement, le bilan léger (fanfares, acte, dévoilement), et que l'écran
// ne reçoit jamais une quête cachée.
import { DECOUVERTE, ACTES } from "@/lib/codex/catalogue";
import { DEVOILE_DE_L_ESPACE, ID_DEVOILE, devoileLite } from "@/lib/codex/devoile-lite";
import { estDevoile } from "@/lib/codex/moteur";
import { bilanDe } from "@/lib/codex/bilan";
import { MAX_QUETES, panneauDe } from "@/lib/codex/panneau";
import { SPACES } from "@/lib/nav";
import { paletteDeChemin } from "@/lib/palettes";
import { exempleCodex } from "./exemple";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};

console.log("# devoile-lite concorde avec DECOUVERTE");
check("chaque dévoilement du catalogue a son identifiant côté navigateur", DECOUVERTE.every((d) => ID_DEVOILE[d.quoi] === d.id), DECOUVERTE.filter((d) => ID_DEVOILE[d.quoi] !== d.id).map((d) => d.id).join());
check("devoileLite et estDevoile répondent pareil", DECOUVERTE.every((d) => ["tout", [], [d.id], ["x"]].every((etat) => devoileLite(etat as string[] | "tout", d.quoi) === estDevoile(etat as string[] | "tout", d.quoi))));
check("les trois onglets masquables sont bien dans la table de la navigation", Object.values(DEVOILE_DE_L_ESPACE).every((q) => q && DECOUVERTE.some((d) => d.quoi === q)));

console.log("\n# la navigation");
check("cinq espaces, le Codex en tête", SPACES.length === 5 && SPACES[0].key === "codex");
check("la palette du Codex est « carnet »", paletteDeChemin("/codex")?.key === "carnet");
const visibles = (d: string[] | "tout") => SPACES.filter((s) => s.key === "codex" || s.key === "moi" || !DEVOILE_DE_L_ESPACE[s.key] || devoileLite(d, DEVOILE_DE_L_ESPACE[s.key]!)).map((s) => s.key).join();
check("compte neuf : Codex et Moi seulement", visibles([]) === "codex,moi", visibles([]));
check("après le premier trait : + Réviser", visibles(["reviser", "branches"]) === "codex,reviser,moi");
check("tout dévoilé : les cinq", visibles("tout").split(",").length === 5);

console.log("\n# la vue et le bilan");
for (const sc of ["neuf", "milieu", "fin"] as const) {
  const vue = exempleCodex(sc);
  const b = bilanDe(vue);
  check(`${sc} : la vue est disponible, 10 branches, ${ACTES.length} actes`, vue.disponible && vue.branches.length === 10 && vue.trame.length === ACTES.length);
  const lignes = [...vue.trame.flatMap((a) => a.quetes), ...vue.branches.flatMap((x) => x.etapes), ...vue.longCours.flatMap((c) => c.paliers), ...vue.exploits, ...vue.contrats.map((c) => c.ligne)];
  check(`${sc} : aucune quête cachée dans les exploits montrés`, vue.exploits.every((e) => e.affichage !== "cache"));
  check(`${sc} : toute quête non terminée a une fraction entre 0 et 1`, lignes.every((l) => l.fraction >= 0 && l.fraction <= 1));
  check(`${sc} : le bilan porte la prochaine quête`, !!b.prochaine && b.prochaine.titre.length > 0, b.prochaine?.titre);
}
{
  const b = bilanDe(exempleCodex("milieu"));
  check("milieu : des fanfares à jouer, la plus grande d'abord", b.fetes.length > 0 && b.fetes.every((f, i, t) => i === 0 || t[i - 1].rang <= f.rang));
  const n = bilanDe(exempleCodex("neuf"));
  check("neuf : les contrats du jour restent masqués tant qu'ils ne sont pas dévoilés", n.contrats.length === 0);
  check("milieu : les contrats sont montrés (3)", b.contrats.length === 3, String(b.contrats.length));
}

console.log("\n# le panneau « Tes quêtes » (sceau de la barre du haut)");
for (const sc of ["neuf", "milieu", "fin"] as const) {
  const pn = panneauDe(exempleCodex(sc));
  const genres = pn.quetes.map((q) => q.genre);
  check(`${sc} : ${MAX_QUETES} quêtes au plus, sans doublon`, pn.quetes.length <= MAX_QUETES && new Set(pn.quetes.map((q) => q.cle)).size === pn.quetes.length, genres.join());
  check(`${sc} : la principale en tête, une seule, deux récompenses au plus`, genres.filter((g) => g === "principale").length <= 1 && (!genres.includes("principale") || genres[0] === "principale") && genres.filter((g) => g === "recompense").length <= 2, genres.join());
  check(`${sc} : le « ! » ne compte que des quêtes du panneau, à prendre`, pn.aPrendre.every((k) => pn.quetes.some((q) => q.cle === k && q.etat === "disponible" && q.genre !== "recompense")));
  check(`${sc} : jamais un sceau du profil à réclamer ici`, pn.quetes.every((q) => !q.id.startsWith("exploit:sceau:")));
}
check("neuf : pas de contrat dans le panneau tant qu'ils ne sont pas dévoilés", panneauDe(exempleCodex("neuf")).quetes.every((q) => q.genre !== "contrat"));
check("vue indisponible : panneau vide", !panneauDe({ ...exempleCodex("milieu"), disponible: false }).disponible);

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);

// Tests légers du carnet « Sans calcul » côté site (migration_ratures_calcul.sql),
// sans base ni réseau :
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-ratures-calcul.ts
// Vérifie : la lecture du carnet avec et sans la migration (pageDe : pas de
// champ calcul sans elle), rpcCalcul (sans le filtre : l'appel d'aujourd'hui ;
// avec : p_sans_calcul envoyé ; migration absente : repli silencieux sur
// l'appel d'aujourd'hui, une seule fois par fonction ; autre erreur : rendue
// telle quelle), pageLocale des aperçus (comme get_ratures : temps, source,
// ordre, comptes, ratures à calcul masquées, pages), et les textes.
import { pageDe, pageLocale, rpcCalcul, type RatureItem } from "@/components/moi/ratures-data";
import { CARNET } from "@/lib/voice-z1";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const J = JSON.stringify;

// ── pageDe : avec et sans la migration ──────────────────────────────────
const brut = { total: 1, retirees: 0, retirees_semaine: 0, filtre: 1, sources: {}, items: [] };
check("sans la migration : pas de champ calcul (pas de bouton)", pageDe(brut).calcul === undefined);
const lu = pageDe({ ...brut, sans_calcul: true, calcul_masquees: 12, calcul_connu: true });
check("avec : filtre appliqué, 12 masquées, banque classée", J(lu.calcul) === J({ actif: true, masquees: 12, connu: true }), J(lu.calcul));
const nonClassee = pageDe({ ...brut, sans_calcul: false, calcul_masquees: 0, calcul_connu: false });
check("avec, banque pas encore classée : connu faux (le bouton reste caché)", nonClassee.calcul?.connu === false && nonClassee.calcul.actif === false);

// ── rpcCalcul : le filtre, et le repli sans la migration ────────────────
type Rep = { data: unknown; error: { code?: string; message?: string } | null };
function client(repondre: (fn: string, args: Record<string, unknown>) => Rep) {
  const appels: { fn: string; args: Record<string, unknown> }[] = [];
  return {
    appels,
    rpc: (fn: string, args: Record<string, unknown>) => {
      appels.push({ fn, args });
      return Promise.resolve(repondre(fn, args));
    },
  };
}
type Rpc = Parameters<typeof rpcCalcul>[0];
const ARGS = { p_source: null, p_retirees: false, p_limit: 20, p_offset: 0 };

async function rpcTests() {
  let c = client(() => ({ data: { ok: 1 }, error: null }));
  let r = await rpcCalcul(c as unknown as Rpc, "rature_suivante", ARGS, false);
  check("sans le filtre : un seul appel, celui d'aujourd'hui (pas de p_sans_calcul)", c.appels.length === 1 && !("p_sans_calcul" in c.appels[0].args) && J(r.data) === J({ ok: 1 }), J(c.appels));

  c = client(() => ({ data: { ok: 2 }, error: null }));
  r = await rpcCalcul(c as unknown as Rpc, "rature_suivante", ARGS, true);
  check("avec le filtre, migration collée : un appel, p_sans_calcul vrai, mêmes arguments", c.appels.length === 1 && c.appels[0].args.p_sans_calcul === true && c.appels[0].args.p_limit === 20 && J(r.data) === J({ ok: 2 }));

  const absente = { code: "PGRST202", message: "Could not find the function public.get_ratures(p_limit, p_offset, p_retirees, p_sans_calcul, p_source) in the schema cache" };
  c = client((_, a) => ("p_sans_calcul" in a ? { data: null, error: absente } : { data: { ok: 3 }, error: null }));
  r = await rpcCalcul(c as unknown as Rpc, "get_ratures", ARGS, true);
  check("migration absente : repli silencieux sur l'appel d'aujourd'hui (pas d'erreur rendue)", c.appels.length === 2 && !("p_sans_calcul" in c.appels[1].args) && r.error === null && J(r.data) === J({ ok: 3 }), J(c.appels.map((x) => Object.keys(x.args))));
  c = client((_, a) => ("p_sans_calcul" in a ? { data: null, error: absente } : { data: { ok: 4 }, error: null }));
  r = await rpcCalcul(c as unknown as Rpc, "get_ratures", ARGS, true);
  check("… une seule fois : l'appel suivant part directement sans p_sans_calcul", c.appels.length === 1 && !("p_sans_calcul" in c.appels[0].args) && J(r.data) === J({ ok: 4 }));
  c = client(() => ({ data: { ok: 5 }, error: null }));
  await rpcCalcul(c as unknown as Rpc, "ratures_par_notion", ARGS, true);
  check("… par fonction : les autres gardent le filtre", c.appels.length === 1 && c.appels[0].args.p_sans_calcul === true);

  c = client(() => ({ data: null, error: { code: "P0001", message: "Not authenticated" } }));
  r = await rpcCalcul(c as unknown as Rpc, "rature_suivante_notion", { p_notion: "quant:3", p_exclure: [] }, true);
  check("autre erreur : rendue telle quelle, sans second appel", c.appels.length === 1 && r.error?.code === "P0001");
  c = client(() => ({ data: { ok: 6 }, error: null }));
  await rpcCalcul(c as unknown as Rpc, "rature_suivante_notion", { p_notion: "quant:3", p_exclure: [] }, true);
  check("… et le filtre reste demandé ensuite (pas de repli sur une erreur ordinaire)", c.appels[0].args.p_sans_calcul === true);
}

// ── pageLocale : le carnet des aperçus, comme get_ratures ───────────────
const NOW = Date.parse("2026-10-24T12:00:00Z");
const it = (id: string, h: number, sources: string[], retireeH: number | null = null): RatureItem => ({
  questionId: id,
  prompt: id,
  choices: ["A", "B"],
  correctIndex: 0,
  explanation: null,
  lastSelected: 1,
  misses: 1,
  sources,
  lastSource: sources[0],
  lastMissedAt: new Date(NOW - h * 3600_000).toISOString(),
  firstMissedAt: new Date(NOW - h * 3600_000).toISOString(),
  correctSince: 0,
  removedAt: retireeH === null ? null : new Date(NOW - retireeH * 3600_000).toISOString(),
  rubrique: "Fiche",
  page: null,
  href: null,
});
const ITEMS = [it("a", 10, ["fiche"]), it("b", 20, ["defi"]), it("c", 30, ["fiche", "defi"]), it("d", 40, ["fiche"]), it("e", 50, ["fiche"], 5), it("f", 60, ["defi"], 300)];
const CALC = ["b", "c", "e"];
let p = pageLocale(ITEMS, CALC, {}, NOW);
check("sans le filtre : 4 en cours, 2 anciennes, 1 cette semaine, sources du temps", p.total === 4 && p.retirees === 2 && p.retireesSemaine === 1 && J(p.sources) === J({ fiche: 3, defi: 2 }), J([p.total, p.retirees, p.retireesSemaine, p.sources]));
check("… les plus récentes d'abord, rien de masqué, banque classée", J(p.items.map((x) => x.questionId)) === J(["a", "b", "c", "d"]) && J(p.calcul) === J({ actif: false, masquees: 0, connu: true }));
p = pageLocale(ITEMS, CALC, { sansCalcul: true }, NOW);
check("avec : a et d en cours, f ancienne ; comptes et sources suivent", J(p.items.map((x) => x.questionId)) === J(["a", "d"]) && p.total === 2 && p.retirees === 1 && p.retireesSemaine === 0 && J(p.sources) === J({ fiche: 2 }), J([p.items.map((x) => x.questionId), p.total, p.retirees, p.sources]));
check("… 2 masquées dans la vue (b, c)", p.calcul?.actif === true && p.calcul.masquees === 2);
p = pageLocale(ITEMS, CALC, { sansCalcul: true, source: "defi" }, NOW);
check("source « défi » : vide, 2 masquées (b, c)", p.filtre === 0 && p.calcul?.masquees === 2);
p = pageLocale(ITEMS, CALC, { sansCalcul: true, retirees: true }, NOW);
check("anciennes : f seule, 1 masquée (e)", J(p.items.map((x) => x.questionId)) === J(["f"]) && p.calcul?.masquees === 1);
const BEAUCOUP = Array.from({ length: 25 }, (_, i) => it(`q${String(i).padStart(2, "0")}`, i + 1, ["fiche"]));
p = pageLocale(BEAUCOUP, [], { offset: 20 }, NOW);
check("pages de 20 : la seconde rend les 5 dernières", p.filtre === 25 && p.items.length === 5 && p.items[0].questionId === "q20");

// ── les textes ───────────────────────────────────────────────────────────
check("« 1 avec calcul masquée » / « 12 avec calcul masquées »", CARNET.calculMasquees(1) === "1 avec calcul masquée" && CARNET.calculMasquees(12) === "12 avec calcul masquées", CARNET.calculMasquees(12));
check(
  "mise au propre « Sans calcul » sans rien à tirer : le titre ne dit pas « carnet au propre »",
  CARNET.propreFiniSansCalcul(false) === "Plus aucune rature sans calcul ici." && CARNET.propreFiniSansCalcul(true) === "Aucune ancienne rature sans calcul ici.",
);
check("fin de mise au propre : « 3 ratures avec calcul t'attendent : coupe « Sans calcul » pour les reprendre. »", CARNET.propreCalculMasquees(3) === "3 ratures avec calcul t'attendent : coupe « Sans calcul » pour les reprendre." && CARNET.propreCalculMasquees(1).startsWith("1 rature avec calcul t'attend"), CARNET.propreCalculMasquees(3));

rpcTests().then(() => {
  console.log(ko ? `\n${ko} KO` : "\ntout est vert");
  process.exit(ko ? 1 : 0);
});

// Tests légers du modèle des pièces de collection (lib/profil/pieces.ts), de
// l'Acquis (lib/profil/acquis.ts), du compte des trophées (lib/trophees.ts)
// et du style porté (lib/profil/styles.ts : lecture, validation, titres),
// sans base ni réseau (les lectures passent par un faux client).
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-pieces.ts
// Vérifie : clés uniques, aucune collision de clé nue, chaque clé nue conforme
// à l'expression de sa colonne de profile_style, l'assemblage (cadres, motifs,
// pièces du Codex, pièces des trophées, du fil rouge et des programmes,
// folios ; une clé déclarée des deux côtés n'apparaît qu'une fois ; un type
// inconnu est ignoré), chaque sorte de condition (unDe compris), les dates,
// les réexports de lib/profil/catalogue.ts, compter, palierCiblee (plafond par
// taille), mesureTrophees, SOURCES_TROPHEE, lireTrophees (get_user_trophees,
// puis le repli ciblé), mesTropheesDepuis, lireAcquis ;
// lireStyles (relu sans titre ni folio sans migration_v3_profil.sql §1),
// styleDepuis, validerStyle (pièce gagnée, déjà portée, inconnue), les titres
// portables et leur affichage (32 caractères au plus).
import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { COSMETIQUES_CODEX, QUETES_EXPLOITS, catalogueCodex, contenuDuProgramme, titresMaitres } from "@/lib/codex/catalogue";
import { donneurs } from "@/lib/codex/vue";
import { titreClair } from "@/lib/codex/titres-clairs";
import { CADRES, MOTIFS, acquisDe, dateGagnee as dateGagneeCatalogue, remplie as remplieCatalogue, STATS_VIDES } from "@/lib/profil/catalogue";
import { codexDepuis, lireAcquis, type Acquis, type Condition } from "@/lib/profil/acquis";
import { ORDRE_SOURCES_TROPHEE, SOURCES_TROPHEE, compter, lignesCiblees, lireTrophees, mesTropheesDepuis, mesureTrophees, palierCiblee, palierTrophee, type LigneTrophee, type SourceTrophee } from "@/lib/trophees";
import type { CosmetiqueCodex } from "@/lib/codex/types";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const egal = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);

// Les folios que le Codex déclare vraiment (aucun avant la fusion F1 ; les
// mêmes que FOLIOS après), relevés avant les ajouts simulés ci-dessous.
const FOLIOS_DU_CODEX = COSMETIQUES_CODEX.filter((c) => (c.type as string) === "folio").map((c) => c.cle);

// Ce que les lots du couloir A ajouteront au Codex, simulé AVANT l'assemblage
// des pièces : une pièce des trophées aussi déclarée au Codex (et donnée par
// une quête), un folio déclaré au Codex, un type que le profil ne connaît pas.
const QUETE_ESSAI = "exploit:essai-vitrine";
const modele = QUETES_EXPLOITS[QUETES_EXPLOITS.length - 1];
QUETES_EXPLOITS.push(
  { ...modele, id: QUETE_ESSAI, recompense: { xp: 0, cosmetique: "cadre:vitrine-or" } },
  // le palier du fil rouge qui donne « Plume » (lib/codex/fil-rouge.ts, lot A2b)
  { ...modele, id: "fil:encre:3", recompense: { xp: 0, cosmetique: "cadre:plume" } },
);
COSMETIQUES_CODEX.push(
  { cle: "cadre:vitrine-or", type: "cadre", nom: "Vitrine (nom du Codex)", description: "Description du Codex.", anime: true },
  { cle: "folio:mains", type: "folio" as CosmetiqueCodex["type"], nom: "Étude de mains (Codex)", description: "Le folio décrit par le Codex." },
  { cle: "embleme:essai", type: "embleme" as CosmetiqueCodex["type"], nom: "Emblème", description: "Un type inconnu." },
);

/** La condition d'état d'une pièce, sans les quêtes du Codex qui la donnent aussi (en « ou », §3.3 point 6). */
const sansQuete = (c: Condition | null): Condition | null => {
  if (c?.k !== "unDe") return c;
  const reste = c.conditions.filter((x) => x.k !== "codex");
  return reste.length === 1 ? reste[0] : { k: "unDe", conditions: reste };
};

async function main() {
  const { FOLIOS, PIECES, TYPES_PIECE, cleNue, pieceDe, pieceNue, piecesDuType, possede, remplie, dateGagnee } = await import("@/lib/profil/pieces");

  console.log("# Clés");
  {
    const cles = PIECES.map((p) => p.cle);
    check("aucune clé n'apparaît deux fois dans PIECES", new Set(cles).size === cles.length, cles.filter((c, i) => cles.indexOf(c) !== i).join(", "));
    check("chaque clé vaut « <type>:<nue> »", PIECES.every((p) => p.cle === `${p.type}:${p.nue}` && TYPES_PIECE.includes(p.type)));
    for (const t of TYPES_PIECE) {
      const nues = piecesDuType(t).map((p) => p.nue);
      check(`${t} : aucune collision de clé nue`, new Set(nues).size === nues.length);
    }
    // les expressions des colonnes de profile_style : titre et folio, celles des
    // CHECK de migration_v3_profil.sql §1 ; frame et banner n'ont pas de CHECK
    // en base (la validation est côté site) : on leur impose celle du folio
    const COLONNES: Record<string, RegExp> = { cadre: /^[a-z0-9_-]{2,60}$/, banniere: /^[a-z0-9_-]{2,60}$/, titre: /^[a-z0-9:_-]{2,80}$/, folio: /^[a-z0-9_-]{2,60}$/ };
    const hors = PIECES.filter((p) => !COLONNES[p.type].test(p.nue));
    check("toute clé nue respecte l'expression de sa colonne", hors.length === 0, hors.map((p) => p.cle).join(", "));
    check("« maitre:fixed_income » (trait bas) est une clé nue de titre", !!pieceNue("titre", "maitre:fixed_income"));
    check("cleNue : « cadre:sanguine » → « sanguine », « titre:maitre:fsa » → « maitre:fsa »", cleNue("cadre:sanguine") === "sanguine" && cleNue("titre:maitre:fsa") === "maitre:fsa");
    check("pieceDe / pieceNue : inconnue → null", pieceDe("cadre:inconnu") === null && pieceNue("titre", "inconnu") === null);
    check("ordre croissant dans chaque type", TYPES_PIECE.every((t) => piecesDuType(t).every((p, i) => p.ordre === i)));
    check("nom, description et obtention renseignés partout", PIECES.every((p) => p.nom.trim() && p.description.trim() && p.obtention.trim()));
  }

  console.log("\n# Assemblage");
  {
    check("les cadres du profil gardent leur clé nue", CADRES.every((c) => pieceNue("cadre", c.key)?.condition === c.condition));
    check("les motifs du profil deviennent des bannières", MOTIFS.every((m) => pieceNue("banniere", m.key)?.condition === (m.condition ?? null)));
    const quetes = new Set(catalogueCodex().map((q) => q.id));
    const codex = [...COSMETIQUES_CODEX.filter((c) => TYPES_PIECE.includes(c.type)), ...titresMaitres()];
    check("chaque cosmétique et titre du Codex est une pièce, une seule fois", codex.every((c) => PIECES.filter((p) => p.cle === c.cle).length === 1));
    // celles qui ne sont déclarées que par le Codex (les autres gardent leur fiche d'ici)
    const seulement = codex.filter((c) => pieceDe(c.cle)?.origine === "codex" && (c.type as string) !== "folio");
    check("une pièce du seul Codex : son nom, et la quête (ou l'acte) qui la donne", seulement.length >= 30 && seulement.every((c) => {
      const p = pieceDe(c.cle);
      // une quête, ou plusieurs en « ou » : la retirée qui la donnait et celle d'aujourd'hui (V3 §8.1)
      const ou = p?.condition?.k === "unDe" ? p.condition.conditions : p?.condition ? [p.condition] : [];
      return p?.nom === c.nom && ou.length > 0 && ou.every((x) => x.k === "codex" && (quetes.has(x.quete) || x.quete.startsWith("acte:")));
    }));
    check("une pièce donnée par une quête retirée et par une autre : les deux en « ou », l'obtention nomme celle d'aujourd'hui", seulement.every((c) => {
      const p = pieceDe(c.cle);
      if (p?.condition?.k !== "unDe") return true;
      const actuelle = p.condition.conditions.map((x) => (x.k === "codex" ? catalogueCodex().find((q) => q.id === x.quete) : undefined)).find((q) => q && !q.retiree);
      return !actuelle || actuelle.visibilite === "cachee" || actuelle.famille === "exploit" || p.obtention.includes(titreClair(actuelle));
    }));
    check("les pièces animées du Codex sont « css »", seulement.filter((c) => c.anime).every((c) => pieceDe(c.cle)?.anime === "css"));
    check("un type inconnu du Codex est ignoré", !PIECES.some((p) => p.cle.startsWith("embleme:")));
    check("cadre:sanguine ← acte IV", egal(pieceDe("cadre:sanguine")?.condition, { k: "codex", quete: "acte:acte4" }) && pieceDe("cadre:sanguine")?.obtention === "Finir l'acte IV : Premier examen blanc");
    check(
      "les consignes du Codex sont en clair (titres clairs, ni « Clore », ni nom d'histoire pour une quête ou un chapitre)",
      PIECES.filter((p) => p.origine === "codex" || p.origine === "fil").every((p) => !p.obtention.startsWith("Clore") && !p.obtention.startsWith("Quête « ") && !p.obtention.startsWith("Fil rouge « ")),
      PIECES.filter((p) => /^(Clore|Quête « |Fil rouge « )/.test(p.obtention)).map((p) => p.cle).join(","),
    );
    const maitreFsa = catalogueCodex().find((q) => q.id === "branche:fsa:maitre");
    check("une quête de branche se dit par son titre clair", !!maitreFsa && pieceDe("titre:maitre:fsa")?.obtention === `Quête du Codex : ${titreClair(maitreFsa)}` && titreClair(maitreFsa).startsWith("FSA à "));
    check("titre:maitre:fsa ← branche:fsa:maitre, programme CFA I", egal(pieceDe("titre:maitre:fsa")?.condition, { k: "codex", quete: "branche:fsa:maitre" }) && pieceDe("titre:maitre:fsa")?.programme === "finance/cfa-l1");
    check("titre:codex (exploit caché) : légendaire, global, sans dévoiler la quête", pieceDe("titre:codex")?.rarete === "legendaire" && pieceDe("titre:codex")?.programme === "global" && pieceDe("titre:codex")?.obtention === "Un exploit caché du Codex");
    const rarete = (cle: string) => pieceDe(cle)?.rarete;
    check(
      "raretés : apprenti commune, or commune, platine rare, liquide diamant précieuse, aura légendaire, maître de bottega légendaire, Imola précieuse",
      rarete("titre:apprenti") === "commune" && rarete("cadre:or") === "commune" && rarete("cadre:platine") === "rare" && rarete("cadre:liquide-diamant") === "precieuse" && rarete("cadre:aura") === "legendaire" && rarete("titre:maitre-bottega") === "legendaire" && rarete("banniere:imola") === "precieuse",
    );
    check(
      "cadres et bannières du profil : origine et obtention",
      pieceDe("cadre:aucun")?.origine === "libre" && pieceDe("cadre:aucun")?.obtention === "Libre" && pieceDe("cadre:bronze")?.origine === "questions" && pieceDe("cadre:aura")?.origine === "rang" &&
        pieceDe("cadre:liquide-diamant")?.obtention === "Atteindre le palier Diamant une fois" && pieceDe("cadre:dorure")?.origine === "sceau" && PIECES.filter((p) => p.origine !== "codex" && p.type !== "titre").every((p) => p.programme === "global"),
    );

    // §3.3 point 4
    const t = (palier: 1 | 2 | 3 | 4, n: number, sources?: number): Condition => ({ k: "trophees", palier, n, ...(sources ? { sources } : {}) });
    const f = (chapitre: string, palier: number): Condition => ({ k: "fil", chapitre, palier });
    const attendues: [string, Condition, string][] = [
      ["cadre:diamant-taille", { k: "unDe", conditions: [t(4, 1), f("trophees", 3)] }, "rare"],
      ["banniere:salle-trophees", { k: "unDe", conditions: [t(3, 10), f("trophees", 5)] }, "precieuse"],
      ["titre:collectionneur", { k: "unDe", conditions: [t(4, 10), f("trophees", 4)] }, "precieuse"],
      ["cadre:vitrine-or", t(3, 1, 4), "legendaire"],
      ["cadre:plume", f("encre", 3), "rare"],
      ["titre:copiste", f("questions", 4), "precieuse"],
      ["titre:encre-vie", f("encre", 6), "legendaire"],
      ["titre:entretien", f("entretien", 2), "precieuse"],
      ["banniere:route-milan", { k: "programme", programme: "finance/cfa-l1" }, "legendaire"],
    ];
    for (const [cle, condition, r] of attendues) check(`${cle} : condition et rareté du §3.3`, egal(sansQuete(pieceDe(cle)?.condition ?? null), condition) && pieceDe(cle)?.rarete === r);
    const vitrine = pieceDe("cadre:vitrine-or");
    check(
      "clé déclarée des deux côtés : une entrée, la fiche d'ici, la quête du Codex en « ou »",
      PIECES.filter((p) => p.cle === "cadre:vitrine-or").length === 1 && vitrine?.nom === "Vitrine d'or" && vitrine.origine === "trophee" &&
        egal(vitrine.condition, { k: "unDe", conditions: [t(3, 1, 4), { k: "codex", quete: QUETE_ESSAI }] }),
    );
    check("la quête du fil rouge qui donne la pièce est déjà sa condition : rien d'ajouté", egal(pieceDe("cadre:plume")?.condition, f("encre", 3)));

    // §3.3 point 5
    const folios = piecesDuType("folio");
    check("19 folios, sans image, provisoires", folios.length === 19 && FOLIOS.length === 19 && folios.every((p) => p.folio?.image === null && p.folio.provisoire));
    check("chaque folio s'ouvre par sa quête", folios.every((p) => p.condition?.k === "codex" && p.condition.quete === FOLIOS.find((x) => `folio:${x.nue}` === p.cle)?.quete));
    check("les quêtes des folios existent (actes, « Maître de… ») ou sont du fil rouge", FOLIOS.every((x) => quetes.has(x.quete) || /^acte:(acte[1-6]|epilogue)$/.test(x.quete) || /^fil:(maitres|collection):\d+$/.test(x.quete)));
    check("folio déclaré au Codex : une entrée, nom et description du Codex, rareté et obtention d'ici", PIECES.filter((p) => p.cle === "folio:mains").length === 1 && pieceDe("folio:mains")?.nom === "Étude de mains (Codex)" && pieceDe("folio:mains")?.description === "Le folio décrit par le Codex." && !!pieceDe("folio:mains")?.obtention.startsWith("Finir l'acte I : ") && pieceDe("folio:mains")?.rarete === "precieuse");
    check("folio non déclaré au Codex : le nom de l'œuvre", FOLIOS_DU_CODEX.includes("folio:deluge") || pieceDe("folio:deluge")?.nom === "Le Déluge");
    check("folio du fil rouge : origine et obtention", pieceDe("folio:galerie")?.origine === "fil" && pieceDe("folio:galerie")?.obtention === "Fil rouge : 3 titres « Maître de… »");
    const ici = FOLIOS.map((x) => `folio:${x.nue}`).sort();
    check("les folios du Codex sont ceux d'ici (aucun avant la fusion F1)", FOLIOS_DU_CODEX.length === 0 || egal([...FOLIOS_DU_CODEX].sort(), ici), FOLIOS_DU_CODEX.join(", "));
    const par = donneurs(contenuDuProgramme(), catalogueCodex());
    check("un folio donné par une quête du Codex l'est par la quête déclarée ici", FOLIOS.every((x) => !par.has(`folio:${x.nue}`) || !!par.get(`folio:${x.nue}`)?.includes(x.quete)));
  }

  console.log("\n# Conditions");
  {
    const a = (o: Partial<Acquis> = {}): Acquis => ({ ...acquisDe(STATS_VIDES), ...o });
    const salle = (lignes: LigneTrophee[]) => compter(lignes);
    check("acquisDe : champs nouveaux vides, une Map neuve à chaque appel", (() => {
      const x = acquisDe(STATS_VIDES);
      const y = acquisDe(STATS_VIDES);
      return x.codex.size === 0 && x.codex !== y.codex && x.trophees === null && egal(x.fil, {}) && x.programmesMenes.length === 0;
    })());
    check("catalogue.ts réexporte remplie et dateGagnee (les mêmes)", remplieCatalogue === remplie && dateGagneeCatalogue === dateGagnee);
    check("profil : 500 questions ouvrent « Or », pas « Platine »", possede(pieceDe("cadre:or")!, a({ questions: 500 })) && !possede(pieceDe("cadre:platine")!, a({ questions: 500 })));
    check("libre : toujours possédée", possede(pieceDe("cadre:pinceau")!, a()));

    const codex = a({ codex: new Map([["acte:acte4", "2026-10-12"]]) });
    check("codex : l'acte IV clos ouvre « Sanguine » et « Compagnon », pas « Guilde »", possede(pieceDe("cadre:sanguine")!, codex) && possede(pieceDe("titre:compagnon")!, codex) && !possede(pieceDe("titre:guilde")!, codex));
    check("codex : la date de la récompense", egal(dateGagnee(pieceDe("cadre:sanguine")!.condition, codex), { iso: "2026-10-12", avant: false }));

    check("trophées : non lus → rien", !possede(pieceDe("cadre:diamant-taille")!, a()));
    const unDiamant = a({ trophees: salle([{ source: "ciblee", palier: 4, n: 1 }]) });
    check("trophées : un diamant ouvre « Diamant taillé », pas « Collectionneur »", possede(pieceDe("cadre:diamant-taille")!, unDiamant) && !possede(pieceDe("titre:collectionneur")!, unDiamant));
    const dixOr = a({ trophees: salle([{ source: "trente", palier: 3, n: 6 }, { source: "blanc", palier: 4, n: 4 }]) });
    check("trophées : « or » veut dire « or ou mieux » (6 or + 4 diamants = 10)", possede(pieceDe("banniere:salle-trophees")!, dixOr));
    const trois = salle([{ source: "ciblee", palier: 3, n: 5 }, { source: "trente", palier: 4, n: 1 }, { source: "fiche", palier: 3, n: 1 }, { source: "drill", palier: 2, n: 9 }]);
    check("trophées : un or dans 3 sources ne suffit pas pour la vitrine", !possede(pieceDe("cadre:vitrine-or")!, a({ trophees: trois })));
    const quatre = salle([...trois.lignes, { source: "duel", palier: 3, n: 1 }]);
    check("trophées : un or dans 4 sources ouvre la vitrine", possede(pieceDe("cadre:vitrine-or")!, a({ trophees: quatre })));
    check("trophées : source donnée", remplie({ k: "trophees", palier: 3, n: 5, source: "ciblee" }, a({ trophees: trois })) && !remplie({ k: "trophees", palier: 3, n: 2, source: "trente" }, a({ trophees: trois })));
    check("trophées : sans date (le dernier trophée n'est pas le jour où la condition s'est remplie)", dateGagnee(pieceDe("cadre:vitrine-or")!.condition, a({ trophees: quatre })) === null);

    check("fil : encre 3 ouvre « Plume », encre 2 non", possede(pieceDe("cadre:plume")!, a({ fil: { encre: 3 } })) && !possede(pieceDe("cadre:plume")!, a({ fil: { encre: 2 } })));
    check("fil : le palier 4 des trophées ouvre « Collectionneur » (unDe)", possede(pieceDe("titre:collectionneur")!, a({ fil: { trophees: 4 } })));
    check("fil : la date du palier, lue dans les quêtes récompensées", egal(dateGagnee(pieceDe("cadre:plume")!.condition, a({ fil: { encre: 4 }, codex: new Map([["fil:encre:3", "2026-09-30"]]) })), { iso: "2026-09-30", avant: false }));
    check("programme : CFA I mené ouvre « La route de Milan »", possede(pieceDe("banniere:route-milan")!, a({ programmesMenes: ["finance/cfa-l1"] })) && !possede(pieceDe("banniere:route-milan")!, a({ programmesMenes: ["finance/cfa-l2"] })));
    check("folio : « fil:maitres:2 » ouvre « galerie »", possede(pieceDe("folio:galerie")!, a({ codex: new Map([["fil:maitres:2", null]]) })));

    const ou: Condition = { k: "unDe", conditions: [{ k: "questions", n: 10_000 }, { k: "unDe", conditions: [{ k: "codex", quete: "acte:acte2" }, { k: "fil", chapitre: "encre", palier: 1 }] }] };
    check("unDe : imbriqué, une seule branche suffit", remplie(ou, a({ fil: { encre: 1 } })) && !remplie(ou, a({ questions: 9_999 })) && remplie({ k: "unDe", conditions: [] }, a()) === false);
    const deux = a({ codex: new Map<string, string | null>([["acte:acte2", "2026-10-03"], ["fil:encre:1", "2026-09-20"]]), fil: { encre: 1 } });
    check("unDe : la plus ancienne date des branches remplies", egal(dateGagnee(ou, deux), { iso: "2026-09-20", avant: false }));
    check("unDe : une branche remplie sans date → pas de date", dateGagnee(ou, a({ codex: new Map([["acte:acte2", "2026-10-03"]]), questions: 10_000 })) === null);
  }

  console.log("\n# Trophées");
  {
    const c = compter([
      { source: "ciblee", palier: 1, n: 2 },
      { source: "ciblee", palier: 1, n: 3, dernier: "2026-10-10T08:00:00Z" },
      { source: "blanc", palier: 3, n: 1, dernier: "2026-10-01T08:00:00Z" },
      { source: "trente", palier: 4, n: 2 },
      { source: "inconnue" as never, palier: 2, n: 4 },
      { source: "cinq", palier: 5 as never, n: 1 },
      { source: "drill", palier: 2, n: 0 },
    ]);
    check("compter : doublons fusionnés, lignes invalides ignorées", c.lignes.length === 3 && c.lignes[0].n === 5 && c.lignes[0].dernier === "2026-10-10T08:00:00Z");
    check("compter : total et paliers exacts", c.total === 8 && egal(c.parPalier, { 1: 5, 2: 0, 3: 1, 4: 2 }));
    check("compter : auMoins (or ou mieux, par source)", c.auMoins(3) === 3 && c.auMoins(1) === 8 && c.auMoins(3, "blanc") === 1 && c.auMoins(4, "blanc") === 0);
    check("compter : les sources à l'or ou mieux, dans l'ordre", egal(c.sources, ["blanc", "trente"]));
    check("palierTrophee : « or » → 3", palierTrophee("or") === 3 && palierTrophee("diamant") === 4);
    check("lignesCiblees : palier = trophyTier (1, 2–3, 4–6, 7 et plus)", egal(lignesCiblees([1, 3, 6, 7].map((t) => ({ topic_count: t, trophy_count: "2" }))).map((l) => l.palier), [1, 2, 3, 4]));

    check(
      "palierCiblee : trophyTier plafonné par la taille (29/30 et 59/60 questions, 6/7 matières)",
      egal(
        [[1, 10], [4, 29], [4, 30], [7, 59], [7, 60], [6, 60], [2, 29], [0, 100], [7, NaN]].map(([m, t]) => palierCiblee(m, t)),
        [1, 2, 3, 3, 4, 3, 2, 1, 2],
      ),
    );
    check(
      "palierCiblee : le plafond ne touche que les séances rendues depuis la mise en ligne v3",
      palierCiblee(7, 54, "2026-10-17T21:59:59Z") === 4 &&
        palierCiblee(7, 54, "2026-10-17T22:00:00Z") === 3 &&
        palierCiblee(4, 29, "2026-10-01T10:00:00Z") === 3 &&
        palierCiblee(4, 29, "2026-10-20T10:00:00Z") === 2 &&
        palierCiblee(7, 59, "pas une date") === 3,
    );
    const sql = [
      { source: "ciblee", palier: 4, n: "2" },
      { source: "trente", palier: 3, n: 1 },
      { source: "drill", palier: 1, n: 4 },
      { source: "inconnue", palier: 4, n: 5 },
    ];
    check(
      "mesureTrophees : palier ou mieux (bronze par défaut), source si donnée, lignes invalides écartées",
      egal(
        [mesureTrophees(sql), mesureTrophees(sql, { palier: "or" }), mesureTrophees(sql, { palier: "diamant" }), mesureTrophees(sql, { palier: "or", source: "trente" }), mesureTrophees(sql, { palier: "diamant", source: "trente" }), mesureTrophees([])],
        [7, 3, 2, 1, 0, 0],
      ),
    );
    const paliersAttendus: Record<SourceTrophee, number[]> = { ciblee: [1, 2, 3, 4], blanc: [1, 2, 3, 4], trente: [1, 2, 3, 4], cinq: [1], drill: [1, 2], fiche: [3, 4], atelier: [1, 2], duel: [1], revoir: [1, 2] };
    check(
      "SOURCES_TROPHEE : chaque source a un nom, un lien et la règle de ses seuls paliers (V3 §2.2)",
      ORDRE_SOURCES_TROPHEE.every((s) => {
        const d = SOURCES_TROPHEE[s];
        return !!d.nom && d.lien.startsWith("/") && egal(Object.keys(d.regle).map(Number), paliersAttendus[s]) && Object.values(d.regle).every((r) => !!r && r.length < 90);
      }) && Object.keys(SOURCES_TROPHEE).length === ORDRE_SOURCES_TROPHEE.length,
    );

    /** un faux client : chaque fonction de la base répond (ou lève) à sa façon ; les appels sont notés */
    type Reponse = { data: unknown; error: unknown } | Error;
    const appels: string[] = [];
    const rpc = (r: Record<string, Reponse>) =>
      ({
        rpc: async (nom: string, args: unknown) => {
          appels.push(`${nom}(${JSON.stringify(args)})`);
          const x = r[nom] ?? { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
          if (x instanceof Error) throw x;
          return x;
        },
      }) as unknown as SupabaseClient;
    const absente = { data: null, error: { code: "PGRST202", message: "Could not find the function public.get_user_trophees" } };
    const ciblees = { data: [{ topic_count: 8, trophy_count: 2 }, { topic_count: 1, trophy_count: 5 }], error: null };
    const toutes = {
      data: [
        { source: "trente", palier: 4, n: "2" },
        { source: "ciblee", palier: 3, n: 1 },
        { source: "fiche", palier: 3, n: "1" },
        { source: "inconnue", palier: 1, n: "3" },
        { source: "blanc", palier: 5, n: "1" },
      ],
      error: null,
    };
    const plein = await lireTrophees(rpc({ get_user_trophees: toutes, get_user_practice_trophies: ciblees }), "u");
    check(
      "lireTrophees : toutes les sources par get_user_trophees, complet = true, lignes invalides écartées",
      plein.complet && plein.total === 4 && plein.auMoins(4) === 2 && plein.auMoins(3) === 4 && egal(plein.sources, ["ciblee", "trente", "fiche"]) && egal(appels, ['get_user_trophees({"p_user_id":"u"})']),
      JSON.stringify(appels),
    );
    appels.length = 0;
    const lu = await lireTrophees(rpc({ get_user_trophees: absente, get_user_practice_trophies: ciblees }), "u");
    check("lireTrophees : sans la §2, le repli ciblé, complet = false", !lu.complet && lu.total === 7 && lu.auMoins(4) === 2 && lu.lignes.every((l) => l.source === "ciblee") && appels.length === 2);
    const leve = await lireTrophees(rpc({ get_user_trophees: new Error("réseau"), get_user_practice_trophies: ciblees }), "u");
    check("lireTrophees : get_user_trophees lève → le repli ciblé", !leve.complet && leve.total === 7);
    const ko1 = await lireTrophees(rpc({ get_user_trophees: absente, get_user_practice_trophies: absente }), "u");
    const ko2 = await lireTrophees(rpc({ get_user_trophees: new Error("réseau"), get_user_practice_trophies: new Error("réseau") }), "u");
    check("lireTrophees : erreur ou exception partout → compte vide, sans bruit", ko1.total === 0 && !ko1.complet && ko2.total === 0 && !ko2.complet);

    appels.length = 0;
    const gagnes = await mesTropheesDepuis(
      rpc({
        mes_trophees_depuis: {
          data: [
            { source: "trente", palier: 3, quand: "2026-10-16T08:30:00Z", ref: "Les 30 du jour du 16 oct." },
            { source: "ciblee", palier: "2", quand: "2026-10-16T09:00:00Z", ref: null },
            { source: "inconnue", palier: 1, quand: "2026-10-16T09:00:00Z", ref: "x" },
            { source: "cinq", palier: 0, quand: "2026-10-16T09:00:00Z", ref: "x" },
          ],
          error: null,
        },
      }),
      "2026-10-16T08:00:00.000Z",
    );
    check(
      "mesTropheesDepuis : les trophées valides, dans l'ordre, libellé vide s'il manque",
      egal(gagnes, [{ source: "trente", palier: 3, ref: "Les 30 du jour du 16 oct." }, { source: "ciblee", palier: 2, ref: "" }]) && egal(appels, ['mes_trophees_depuis({"p_depuis":"2026-10-16T08:00:00.000Z"})']),
      JSON.stringify(gagnes),
    );
    appels.length = 0;
    const sansSection = await mesTropheesDepuis(rpc({}), "2026-10-16T08:00:00Z");
    const panne = await mesTropheesDepuis(rpc({ mes_trophees_depuis: new Error("réseau") }), "2026-10-16T08:00:00Z");
    const dateFausse = await mesTropheesDepuis(rpc({}), "hier");
    check("mesTropheesDepuis : sans la §2, en panne ou date illisible → aucun, sans bruit (et sans appel pour la date)", sansSection.length === 0 && panne.length === 0 && dateFausse.length === 0 && appels.length === 2);
  }

  console.log("\n# lireAcquis");
  {
    const jours = codexDepuis([
      { quete_id: "acte:acte4", recompensee_le: "2026-10-15T23:30:00Z" },
      { quete_id: "acte:acte4", recompensee_le: "2026-10-12T09:00:00Z" },
      { quete_id: "fil:encre:2", recompensee_le: null },
      { quete_id: "fil:encre:3", recompensee_le: "2026-10-01T10:00:00Z" },
      { quete_id: "fil:trophees:1", recompensee_le: "2026-10-01T10:00:00Z" },
    ]);
    check("codexDepuis : jour de Paris (23 h 30 UTC le 15 → le 16), la plus ancienne récompense", codexDepuis([{ quete_id: "x", recompensee_le: "2026-10-15T23:30:00Z" }]).codex.get("x") === "2026-10-16" && jours.codex.get("acte:acte4") === "2026-10-12");
    check("codexDepuis : le fil rouge, plus haut palier par chapitre", egal(jours.fil, { encre: 3, trophees: 1 }));

    const filtres: string[] = [];
    const requete = (res: { data: unknown; error: unknown }) => {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "neq", "limit"]) q[m] = (...args: unknown[]) => (filtres.push(`${m}(${args.join(",")})`), q);
      q.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(res).then(ok, ko);
      return q;
    };
    const absente = { data: null, error: { code: "42P01", message: 'relation "x" does not exist' } };
    const client = (tables: Record<string, { data: unknown; error: unknown }>) =>
      ({
        from: (t: string) => requete(tables[t] ?? absente),
        // la §2 des trophées n'est pas collée : le repli ciblé
        rpc: async (nom: string) =>
          nom === "get_user_practice_trophies" ? { data: [{ topic_count: 7, trophy_count: 1 }], error: null } : { data: null, error: { code: "PGRST202", message: "Could not find the function" } },
      }) as unknown as SupabaseClient;
    const base = { stats: { ...STATS_VIDES, questions: 1234, picAtteint: 4 }, sceaux: [], datesPic: [] };

    const plein = await lireAcquis(
      client({
        codex_progression: { data: [{ quete_id: "acte:acte4", recompensee_le: "2026-10-12T09:00:00Z" }, { quete_id: "fil:trophees:3", recompensee_le: "2026-10-13T09:00:00Z" }], error: null },
        codex_programmes_joueur: { data: [{ programme: "finance/cfa-l1" }], error: null },
      }),
      "u1",
      base,
    );
    check("lireAcquis : la requête du Codex (le joueur, récompensées, sans contrats, 5 000 au plus)", ["select(quete_id,recompensee_le)", "eq(user_id,u1)", "eq(etat,recompensee)", "neq(famille,contrat)", "limit(5000)"].every((x) => filtres.includes(x)));
    check("lireAcquis : profil, Codex, fil, trophées, programmes", plein.questions === 1234 && plein.pic === 4 && plein.codex.get("acte:acte4") === "2026-10-12" && plein.fil.trophees === 3 && plein.trophees?.auMoins(4) === 1 && egal(plein.programmesMenes, ["finance/cfa-l1"]));
    check("lireAcquis : les pièces s'en déduisent", possede(pieceDe("cadre:sanguine")!, plein) && possede(pieceDe("cadre:diamant-taille")!, plein) && possede(pieceDe("banniere:route-milan")!, plein));

    const vide = await lireAcquis(client({}), "u2", base);
    check("lireAcquis sans les tables du Codex : vaut acquisDe (plus les trophées ciblés)", vide.codex.size === 0 && egal(vide.fil, {}) && vide.programmesMenes.length === 0 && vide.questions === 1234 && vide.trophees?.total === 1);
    const casse = await lireAcquis({ from: () => { throw new Error("réseau"); }, rpc: async () => { throw new Error("réseau"); } } as unknown as SupabaseClient, "u3", base);
    check("lireAcquis : exception partout → Acquis vide, sans erreur", casse.codex.size === 0 && casse.trophees?.total === 0 && casse.programmesMenes.length === 0);
    // la page Moi lit les trophées une fois et les passe : lireAcquis ne les relit pas
    let rpcs = 0;
    const compte = { ...client({}), rpc: async () => (rpcs++, { data: null, error: { code: "PGRST202", message: "Could not find the function" } }) } as unknown as SupabaseClient;
    const dejaLus = compter([{ source: "blanc", palier: 4, n: 2 } as LigneTrophee]);
    const repris = await lireAcquis(compte, "u4", { ...base, trophees: Promise.resolve(dejaLus) });
    check("lireAcquis : des trophées déjà lus sont repris tels quels, aucune RPC de trophées", repris.trophees === dejaLus && rpcs === 0, `${rpcs}`);
    const moi = readFileSync("app/moi/page.tsx", "utf8");
    check("Moi : les trophées lus seulement sur Stats et Mes pièces, une fois, passés à l'étagère",
      moi.includes(`tab === "stats" || tab === "pieces" ? lireTrophees(supabase, user.id)`) && moi.includes("lireEtagere(supabase, admin, user.id, tropheesLus)") && (moi.match(/lireTrophees\(/g) ?? []).length === 1);
  }

  console.log("\n# Le style porté (lib/profil/styles.ts)");
  {
    const { ecrireStyle, lireStyles, nomTitre, styleDepuis, titresPortables, validerStyle } = await import("@/lib/profil/styles");
    const { STYLE_DEFAUT } = await import("@/lib/profil/catalogue");
    const { titreCourt, TITRE_MAX } = await import("@/components/profil/TitrePorte");
    const a = (o: Partial<Acquis> = {}): Acquis => ({ ...acquisDe(STATS_VIDES), ...o });
    // les quêtes du Codex qui donnent un titre de maître et le cadre « Sanguine »
    const maitreFI = pieceNue("titre", "maitre:fixed_income")!;
    const queteFI = maitreFI.condition?.k === "codex" ? maitreFI.condition.quete : "";
    const sanguine = pieceNue("cadre", "sanguine")!;
    const queteSanguine = sanguine.condition?.k === "codex" ? sanguine.condition.quete : "";
    check("les pièces d'essai existent (titre de maître FI, cadre Sanguine, Copiste)", !!queteFI && !!queteSanguine && !!pieceNue("titre", "copiste"));

    // lireStyles : la requête, le repli sans les colonnes de la v3, les pannes
    const appels: string[] = [];
    const client = (reponse: (cols: string) => { data: unknown; error: unknown } | Promise<never>) =>
      ({
        from: (t: string) => ({
          select: (cols: string) => ({
            in: (col: string, ids: string[]) => {
              appels.push(`${t}:${cols}:${col}=${ids.join("|")}`);
              return reponse(cols);
            },
          }),
        }),
      }) as unknown as SupabaseClient;
    const sansV3 = (cols: string) =>
      /titre|folio/.test(cols) ? { data: null, error: { code: "42703", message: "column profile_style.titre does not exist" } } : { data: [{ user_id: "u1", banner_url: "https://x/b.webp" }], error: null };
    appels.length = 0;
    const relu = await lireStyles(client(sansV3), ["u1", "u1", ""], ["banner_url", "titre"]);
    check(
      "lireStyles sans §1 : demande titre, relit sans lui (une colonne absente ne fait rien perdre)",
      egal(appels, ["profile_style:user_id,banner_url,titre:user_id=u1", "profile_style:user_id,banner_url:user_id=u1"]) && relu?.get("u1")?.banner_url === "https://x/b.webp" && relu?.get("u1")?.titre === null,
      appels.join(" ; "),
    );
    appels.length = 0;
    const avec = await lireStyles(client(() => ({ data: [{ user_id: "u1", banner_url: null, titre: "copiste" }], error: null })), ["u1"], ["banner_url", "titre"]);
    check("lireStyles avec §1 : une seule lecture, le titre lu", appels.length === 1 && avec?.get("u1")?.titre === "copiste");
    appels.length = 0;
    const tout = await lireStyles(client(() => ({ data: [{ user_id: "u1", frame: "or" }], error: null })), ["u1"]);
    check("lireStyles « * » : la ligne entière, titre et folio à null s'ils manquent", egal(appels, ["profile_style:*:user_id=u1"]) && tout?.get("u1")?.frame === "or" && tout?.get("u1")?.titre === null && tout?.get("u1")?.folio === null);
    appels.length = 0;
    const autre = await lireStyles(client(() => ({ data: null, error: { code: "42501", message: "permission denied" } })), ["u1"], ["banner_url", "titre"]);
    const absente = await lireStyles(client(() => ({ data: null, error: { code: "42P01", message: 'relation "profile_style" does not exist' } })), ["u1"], ["banner_url"]);
    const panne = await lireStyles(client(() => Promise.reject(new Error("réseau"))), ["u1"]);
    check("lireStyles : autre erreur, table absente ou réseau → null, sans relance inutile", autre === null && absente === null && panne === null && appels.length === 3, appels.join(" ; "));
    appels.length = 0;
    const personne = await lireStyles(client(sansV3), []);
    check("lireStyles : aucun joueur → aucune lecture", personne?.size === 0 && appels.length === 0);

    // ecrireStyle : une écriture si tout est là ; sans §1, réécrit sans titre ni folio ; sans les médias, sans disposition
    const ecrits: string[][] = [];
    /** un faux client service role : `manque` = colonnes absentes de la table (ou toute la table) */
    const admin = (manque: string[] | "table") =>
      ({
        from: (t: string) => ({
          upsert: async (l: Record<string, unknown>, o: { onConflict: string }) => {
            ecrits.push(Object.keys(l));
            if (t !== "profile_style" || o.onConflict !== "user_id") return { error: { message: "mauvaise table" } };
            if (manque === "table") return { error: { code: "42P01", message: 'relation "public.profile_style" does not exist' } };
            const absente = manque.find((c) => c in l);
            return { error: absente ? { code: "PGRST204", message: `Could not find the '${absente}' column of 'profile_style' in the schema cache` } : null };
          },
        }),
      }) as unknown as SupabaseClient;
    const aEcrire = { ...STYLE_DEFAUT, frame: "or", titre: "copiste", folio: "mains" };
    ecrits.length = 0;
    const plein = await ecrireStyle(admin([]), "u1", aEcrire, "2026-10-17T00:00:00Z");
    check("ecrireStyle avec §1 : une écriture, titre et folio compris", !plein.error && plein.titreFolio && plein.disposition && ecrits.length === 1 && ["titre", "folio", "layout", "frame", "updated_at"].every((c) => ecrits[0].includes(c)));
    ecrits.length = 0;
    const ecritSansV3 = await ecrireStyle(admin(["titre", "folio"]), "u1", aEcrire, "2026-10-17T00:00:00Z");
    check(
      "ecrireStyle sans §1 : réécrit sans titre ni folio, cadre et disposition enregistrés comme aujourd'hui",
      !ecritSansV3.error && !ecritSansV3.titreFolio && ecritSansV3.disposition && ecrits.length === 2 && !ecrits[1].includes("titre") && !ecrits[1].includes("folio") && ecrits[1].includes("frame") && ecrits[1].includes("layout"),
    );
    ecrits.length = 0;
    const sansMedias = await ecrireStyle(admin(["titre", "folio", "layout"]), "u1", aEcrire, "2026-10-17T00:00:00Z");
    check("ecrireStyle sans §1 ni médias : le reste (cadre, bannière…) s'enregistre", !sansMedias.error && !sansMedias.titreFolio && !sansMedias.disposition && ecrits.length === 3 && ecrits[2].includes("frame") && !ecrits[2].includes("layout"));
    const sansTable = await ecrireStyle(admin("table"), "u1", aEcrire, "2026-10-17T00:00:00Z");
    check("ecrireStyle sans la table : l'erreur remonte (« la base n'est pas encore prête »)", !!sansTable.error && /does not exist/.test(sansTable.error.message));

    // styleDepuis : titre et folio, pièces du Codex comprises
    const lu = styleDepuis({ frame: "sanguine", banner: "nuit", titre: "maitre:fixed_income", folio: "mains" });
    check("styleDepuis : cadre du Codex, titre et folio connus gardés", lu.frame === "sanguine" && lu.banner === "nuit" && lu.titre === "maitre:fixed_income" && lu.folio === "mains");
    const inconnu = styleDepuis({ frame: "inconnu", banner: "x", titre: "roi", folio: "maitre:fsa" });
    check("styleDepuis : inconnus → défaut (titre et folio à null)", inconnu.frame === STYLE_DEFAUT.frame && inconnu.banner === STYLE_DEFAUT.banner && inconnu.titre === null && inconnu.folio === null);
    const avant = styleDepuis({ frame: "or" });
    check("styleDepuis : ligne d'avant §1 (sans les colonnes) → titre et folio à null", avant.titre === null && avant.folio === null && avant.frame === "or");
    check("STYLE_DEFAUT : ni titre ni folio", STYLE_DEFAUT.titre === null && STYLE_DEFAUT.folio === null);

    // validerStyle : gagné, déjà porté, inconnu
    const porte = { frame: "aucun", banner: "lavis", titre: null, folio: null };
    const forge = validerStyle({ ...STYLE_DEFAUT, titre: "copiste" }, a(), null, null, porte);
    check("titre non possédé (forgé) → refusé, aucun titre", forge.style.titre === null && egal(forge.refus, ["le titre Copiste"]), forge.refus.join(", "));
    const gagne = validerStyle({ ...STYLE_DEFAUT, titre: "copiste" }, a({ fil: { questions: 4 } }), null, null, porte);
    check("titre gagné (fil rouge) → porté", gagne.style.titre === "copiste" && gagne.refus.length === 0);
    const deja = validerStyle({ ...STYLE_DEFAUT, titre: "copiste" }, a(), null, null, { ...porte, titre: "copiste" });
    check("titre déjà porté, condition plus remplie → conservé (rien de gagné repris)", deja.style.titre === "copiste" && deja.refus.length === 0);
    const inconnuV = validerStyle({ ...STYLE_DEFAUT, titre: "roi-du-monde", folio: "joconde", frame: "trone", banner: "x" }, a(), null, null, porte);
    check(
      "clés inconnues → défaut, sans refus",
      inconnuV.style.titre === null && inconnuV.style.folio === null && inconnuV.style.frame === STYLE_DEFAUT.frame && inconnuV.style.banner === STYLE_DEFAUT.banner && inconnuV.refus.length === 0,
    );
    // l'image de bannière : un nom de fichier seul après le dossier du joueur
    const dossierB = "https://abcdefgh.supabase.co/storage/v1/object/public/avatars/1b2c3d4e-0000-4000-8000-000000000001/";
    const banniere = (u: string) => validerStyle({ ...STYLE_DEFAUT, bannerUrl: u }, a(), dossierB, null, porte);
    check(
      "bannière : « banniere-<ms>.webp » et « <ms>.jpg » gardées",
      banniere(dossierB + "banniere-1760000000000.webp").style.bannerUrl === dossierB + "banniere-1760000000000.webp" && banniere(dossierB + "1760000000000.jpg").refus.length === 0,
    );
    check(
      "bannière : « ../ » et « %2e%2e » vers un autre dossier refusés",
      ["../2b2c3d4e-0000-4000-8000-000000000002/1.jpg", "%2e%2e/%2e%2e/avatars/2b2c3d4e-0000-4000-8000-000000000002/1.jpg", "sous/1.jpg", "1"].every((r) => {
        const v = banniere(dossierB + r);
        return v.style.bannerUrl === null && egal(v.refus, ["l'image de bannière"]);
      }),
    );
    const maitre = validerStyle({ ...STYLE_DEFAUT, titre: "maitre:fixed_income" }, a({ codex: new Map([[queteFI, "2026-10-12"]]) }), null, null, porte);
    check("titre de maître gagné au Codex (trait bas) → porté", maitre.style.titre === "maitre:fixed_income" && maitre.refus.length === 0);
    const cadre = validerStyle({ ...STYLE_DEFAUT, frame: "sanguine" }, a({ codex: new Map([[queteSanguine, null]]) }), null, null, porte);
    const cadreKo = validerStyle({ ...STYLE_DEFAUT, frame: "sanguine" }, a(), null, null, porte);
    check("cadre du Codex : gagné → porté ; pas gagné → refusé", cadre.style.frame === "sanguine" && cadreKo.style.frame === STYLE_DEFAUT.frame && egal(cadreKo.refus, ["le cadre Sanguine"]), cadreKo.refus.join(", "));
    const ancien = validerStyle({ ...STYLE_DEFAUT, frame: "or" }, a({ questions: 600 }), null, null, porte);
    const ancienKo = validerStyle({ ...STYLE_DEFAUT, frame: "or", banner: "or-vivant" }, a({ questions: 10 }), null, null, porte);
    check("cadres et motifs du profil : inchangés (gagné porté, sinon refus)", ancien.style.frame === "or" && ancienKo.style.frame === "aucun" && egal(ancienKo.refus, ["le cadre Or", "la bannière Or vivant"]), ancienKo.refus.join(", "));
    const folio = validerStyle({ ...STYLE_DEFAUT, folio: "mains" }, a({ codex: new Map([["acte:acte1", null]]) }), null, null, porte);
    const folioKo = validerStyle({ ...STYLE_DEFAUT, folio: "mains" }, a(), null, null, porte);
    check("folio : gagné (acte I clos) → posé ; pas gagné → refusé", folio.style.folio === "mains" && folioKo.style.folio === null && folioKo.refus.length === 1);
    const sansTitre: Partial<typeof STYLE_DEFAUT> = { ...STYLE_DEFAUT };
    delete sansTitre.titre;
    delete sansTitre.folio;
    const garde = validerStyle(sansTitre, a(), null, null, { ...porte, titre: "copiste", folio: "mains" });
    check("titre et folio absents de l'envoi → ceux qu'il porte, inchangés", garde.style.titre === "copiste" && garde.style.folio === "mains" && garde.refus.length === 0);
    const retire = validerStyle({ ...STYLE_DEFAUT, titre: null }, a(), null, null, { ...porte, titre: "copiste" });
    check("« Aucun » retire le titre porté", retire.style.titre === null && retire.refus.length === 0);

    // les titres portables et leur nom
    const portables = titresPortables(a({ fil: { questions: 4 }, codex: new Map([[queteFI, null]]) }), "encre-vie");
    const ordreDe = (nue: string) => pieceNue("titre", nue)!.ordre;
    check(
      "titresPortables : possédés + déjà porté, dans l'ordre du catalogue",
      egal(portables.map((t) => t.nue).sort(), ["copiste", "encre-vie", "maitre:fixed_income"].sort()) && portables.every((t, i, l) => i === 0 || ordreDe(l[i - 1].nue) < ordreDe(t.nue)),
      portables.map((t) => t.nue).join(", "),
    );
    check("titresPortables : rien de gagné → aucun", titresPortables(a()).length === 0);
    check("nomTitre : le nom lisible ; aucun ou inconnu → null", nomTitre("copiste") === "Copiste" && nomTitre(null) === null && nomTitre("roi") === null);
    const long = "Maître de la très longue matière imaginaire";
    check(`titreCourt : ${TITRE_MAX} caractères au plus, avec une ellipse`, titreCourt("Copiste") === "Copiste" && titreCourt(long).length <= TITRE_MAX && titreCourt(long).endsWith("…"));
  }

  console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
  process.exit(ko ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

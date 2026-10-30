// Tests légers de l'ornement de la bannière verticale et du cadrage de l'ancien
// personnage (lot « données et envoi » ; le personnage se règle maintenant dans
// l'éditeur de la bannière composée : scripts/profil/test-banniere-editeur.tsx),
// sans base ni réseau ni navigateur (rendu statique par react-dom/server).
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-bannieres.tsx
// Vérifie : Personnaliser › Bannière › « Ornement » (les quatre, les gagnés
// ouverts, les autres grisés avec leur consigne et
// l'avancée) ; le cadrage (cadragePerso) ; l'état de l'étagère pour
// l'ornement porté ; le fichier de migration ; aucun chemin local.
import "./sans-css";
import "./react-global";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { STATS_VIDES, STYLE_DEFAUT, acquisDe, type StyleProfil } from "@/lib/profil/catalogue";
import { ornementsPortables } from "@/lib/profil/styles";
import { PERSO_POS_DEFAUT, PERSO_TAILLE_DEFAUT, bornerPersoPos, bornerPersoTaille, cadragePerso } from "@/lib/profil/perso";
import { etagere } from "@/lib/profil/etagere";
import { retirable } from "@/lib/profil/etagere-vue";
import type { EtatSceau } from "@/lib/profil/sceaux";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};

async function main() {
  // le client du navigateur exige ces variables (rien n'est appelé au rendu statique)
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemple.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "cle-factice";
  const { SectionOrnement } = await import("@/components/profil/SectionsPersonnaliser");

  const sceau = (cle: string, palier: 0 | 1 | 2 | 3): EtatSceau => ({ def: { cle, famille: "regularite", unite: "jours", seuils: [7, 30, 100], difficulte: 1 }, palier, valeur: 3, questions: null, prochain: 7, avance: 0.4 });
  const acquis = (sceaux: EtatSceau[]) => ({ ...acquisDe(STATS_VIDES), sceaux });
  const brouillon = (style: StyleProfil) => ({ style, set: () => {}, setStyle: () => {} });
  console.log("\n# Ornement");
  {
    const quatre = ornementsPortables(acquis([sceau("a", 1), sceau("b", 2)]), null);
    const html = renderToStaticMarkup(<SectionOrnement b={brouillon(STYLE_DEFAUT)} ornements={quatre} dispo />);
    check("les quatre ornements, par leur nom", ["Filet d&#x27;encre", "Cartouche de l&#x27;apprenti", "Laurier du compagnon", "Fronton du maître"].every((n) => html.includes(n)) && (html.match(/role="radio"/g) ?? []).length === 4);
    check("le filet est porté (coché) ; le cartouche, gagné, est ouvert", html.includes('aria-checked="true"') && (html.match(/aria-checked="true"/g) ?? []).length === 1);
    check("les grisés (laurier, fronton) sont désactivés et disent leur consigne", (html.match(/disabled=""/g) ?? []).length === 2 && html.includes("Gagner cinq sceaux") && html.includes("2/5") && html.includes("Fil rouge : "));
    check("sans la base ou sans ornement : rien", renderToStaticMarkup(<SectionOrnement b={brouillon(STYLE_DEFAUT)} ornements={quatre} dispo={false} />) === "" && renderToStaticMarkup(<SectionOrnement b={brouillon(STYLE_DEFAUT)} ornements={[]} dispo />) === "");
    const laurier = renderToStaticMarkup(<SectionOrnement b={brouillon({ ...STYLE_DEFAUT, ornement: "laurier" })} ornements={ornementsPortables(acquis([]), "laurier")} dispo />);
    check("un ornement déjà porté reste ouvert même sans sa condition", laurier.includes("Laurier du compagnon") && (laurier.match(/disabled=""/g) ?? []).length === 2);
  }

  console.log("\n# Cadrage, étagère");
  {
    check("cadragePerso : 100 / 50 → à sa place ; 160 / 100 → plus grand, descendu de 25 % ; 50 / 0 → plus petit, remonté de 25 %", (() => {
      const a = cadragePerso(100, 50);
      const b = cadragePerso(160, 100);
      const c = cadragePerso(50, 0);
      return a.echelle === 1 && a.decalageY === 0 && b.echelle === 1.6 && b.decalageY === 25 && c.echelle === 0.5 && c.decalageY === -25;
    })());
    check("cadragePerso borne les valeurs absurdes ; les défauts sont 100 et 50", cadragePerso(999, -3).echelle === 1.6 && cadragePerso(999, -3).decalageY === -25 && PERSO_TAILLE_DEFAUT === 100 && PERSO_POS_DEFAUT === 50 && bornerPersoTaille(null) === 100 && bornerPersoPos(undefined) === 50 && bornerPersoTaille("") === 100);
    const e = etagere(acquis([]), { frame: "aucun", banner: "lavis", titre: null, folio: null, ornement: "cartouche" });
    const rayon = e.rayons.find((r) => r.type === "ornement");
    check("l'étagère : un rayon « Ornements » de quatre pièces, le cartouche porté", rayon?.titre === "Ornements" && rayon.total === 4 && rayon.pieces.find((p) => p.nue === "cartouche")?.portee === true && rayon.pieces.filter((p) => p.portee).length === 1);
    const sansOrnement = etagere(acquis([]), { frame: "aucun", banner: "lavis", titre: null, folio: null });
    check("l'étagère : sans ornement connu, le filet d'encre est porté, et il ne se retire pas", sansOrnement.rayons.find((r) => r.type === "ornement")?.pieces.find((p) => p.nue === "filet")?.portee === true && !retirable({ type: "ornement", nue: "filet", portee: true }) && retirable({ type: "ornement", nue: "laurier", portee: true }));
  }

  console.log("\n# Migration, chemins");
  {
    const sql = fs.readFileSync("migration_bannieres_perso.sql", "utf8");
    check("migration_bannieres_perso.sql : les quatre colonnes, idempotentes, et le quota relevé à 14", ["perso_url", "perso_taille", "perso_pos", "ornement"].every((c) => new RegExp(`ADD COLUMN IF NOT EXISTS ${c}\\b`).test(sql)) && sql.includes("< 14"));
    check("migration : rien d'écrit ni de supprimé hors profile_style et la règle d'envoi", !/DROP TABLE|DELETE FROM|TRUNCATE/i.test(sql));
    const fichiers = ["lib/profil/perso.ts", "components/profil/SectionsPersonnaliser.tsx", "migration_bannieres_perso.sql"].map((f) => fs.readFileSync(f, "utf8")).join("\n");
    check("aucun chemin local ni de scratchpad dans les fichiers du lot", !/AppData|scratchpad/i.test(fichiers));
  }

  console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
  process.exit(ko ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

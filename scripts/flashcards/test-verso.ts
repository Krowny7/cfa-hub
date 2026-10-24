// Le verso structuré des flashcards (lib/flashcards/verso.ts) : découpe en
// { retenir, clair, piege }, avec et sans piège, formule en bloc, liste,
// formules en ligne, ancien format, lignes vides, fins de ligne Windows ;
// surligné qui enjambe une liste, ligne surlignée autour d'une formule,
// largeur estimée des formules (réduction sur téléphone).
// Usage, depuis le dépôt : npx tsx --tsconfig tsconfig.json scripts/flashcards/test-verso.ts

import { aSurligne, decouperVerso, echelleFormule, itemsListe, largeurFormule } from "@/lib/flashcards/verso";
import { marquesOuvertes, passagesInline } from "@/lib/richtext";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const eq = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
const voir = (x: unknown) => JSON.stringify(x);

console.log("— Format complet");
{
  const v = decouperVerso(
    "Indenture = ==contrat issuer ↔ bondholders==\nEn clair : il fixe les features de la bond, les covenants et le collateral ; un trustee le fait respecter.\nPiège : le credit rating n'y figure pas."
  );
  check(
    "trois cases",
    eq(v, {
      retenir: { forme: "texte", texte: "Indenture = ==contrat issuer ↔ bondholders==" },
      clair: "il fixe les features de la bond, les covenants et le collateral ; un trustee le fait respecter.",
      piege: "le credit rating n'y figure pas.",
    }),
    voir(v)
  );
}

console.log("— Sans piège");
{
  const v = decouperVerso("Coupon plus élevé = ==duration plus faible==\nEn clair : plus de cash flow arrive tôt.");
  check("piege null", v !== null && v.piege === null && v.clair === "plus de cash flow arrive tôt.", voir(v));
  const w = decouperVerso("A = ==B==\nEn clair : C.\nPiège :");
  check("« Piège : » vide : null", w !== null && w.piege === null && w.clair === "C.", voir(w));
}

console.log("— Formule en bloc");
{
  const v = decouperVerso("Modified duration\n$$ModDur = \\dfrac{MacDur}{1 + r}$$\nEn clair : la variation de prix en % pour 1 % de yield.\nPiège : r est le yield par période.");
  check(
    "titre + formule",
    eq(v?.retenir, { forme: "formule", titre: "Modified duration", formule: "$$ModDur = \\dfrac{MacDur}{1 + r}$$", suite: "" }),
    voir(v?.retenir)
  );
  const w = decouperVerso("$$EffCon = \\dfrac{PV_- + PV_+ - 2PV_0}{(\\Delta Curve)^2 PV_0}$$\nEn clair : on reprice avec un shift de la curve.");
  check("formule seule : titre vide", w?.retenir.forme === "formule" && w.retenir.titre === "", voir(w?.retenir));
  const x = decouperVerso("Duration\n$$D = \\sum t \\cdot w_t$$\noù $w_t$ est le poids du flux\nEn clair : une moyenne pondérée.");
  check(
    "lignes sous la formule : à part, dans « suite »",
    x?.retenir.forme === "formule" && x.retenir.formule === "$$D = \\sum t \\cdot w_t$$" && x.retenir.suite === "où $w_t$ est le poids du flux",
    voir(x?.retenir)
  );
  const y = decouperVerso("$$V_c = V_s - V_{call}$$\n$$V_p = V_s + V_{put}$$\nEn clair : C.");
  check(
    "deux formules qui se suivent : un seul bloc, pas de suite",
    y?.retenir.forme === "formule" && y.retenir.formule === "$$V_c = V_s - V_{call}$$\n$$V_p = V_s + V_{put}$$" && y.retenir.suite === "",
    voir(y?.retenir)
  );
  const z = decouperVerso("$$\\text{Index} = \\dfrac{\\sum_i P_i}{\\text{divisor}}$$\nSplit ⇒ ==divisor ajusté== (ici 1,875)\nEn clair : C.");
  check(
    "résultat surligné sous la formule (equity)",
    z?.retenir.forme === "formule" && z.retenir.titre === "" && z.retenir.suite === "Split ⇒ ==divisor ajusté== (ici 1,875)",
    voir(z?.retenir)
  );
}

console.log("— Ligne surlignée : l'idée à retenir");
{
  check("« EBIT = ==7 000== » : surlignée", aSurligne("EBIT = ==7 000=="));
  check("« Modified duration » : simple nom", !aSurligne("Modified duration"));
  check("== dans une formule : pas un surligné", !aSurligne("$a == b$"));
  check("==> : pas un surligné", !aSurligne("a ==> b"));
  check("surligné sur la deuxième ligne", aSurligne("Titre\nRésultat ==12 %=="));
}

console.log("— Liste « a · b · c »");
{
  const v = decouperVerso("Coupon · maturité · par value\nEn clair : les trois termes de base d'une bond.");
  check("liste sans titre", eq(v?.retenir, { forme: "liste", titre: "", items: ["Coupon", "maturité", "par value"] }), voir(v?.retenir));
  const w = decouperVerso("Trois risques\nCredit risk · liquidity risk · ==interest rate risk==\nEn clair : C.");
  check(
    "liste avec titre, surligné dans un élément",
    eq(w?.retenir, { forme: "liste", titre: "Trois risques", items: ["Credit risk", "liquidity risk", "==interest rate risk=="] }),
    voir(w?.retenir)
  );
  check("point dans une formule : ne coupe pas", eq(itemsListe("$a · b$ · c"), ["$a · b$", "c"]), voir(itemsListe("$a · b$ · c")));
  check("un seul élément : pas une liste", itemsListe("Coupon") === null);
  check("point collé (3·4) : pas une liste", itemsListe("3·4 = 12") === null);
  check("puces • acceptées", eq(itemsListe("a • b"), ["a", "b"]));
}

console.log("— Surligné ou gras qui enjambe les points");
{
  const l = (s: string, attendu: string[]) => check(s, eq(itemsListe(s), attendu), voir(itemsListe(s)));
  l("==Identify · Consider · Reflect==", ["==Identify==", "==Consider==", "==Reflect=="]);
  l("==Identify · Consider · Decide and act · Reflect==", ["==Identify==", "==Consider==", "==Decide and act==", "==Reflect=="]);
  l("**a · b** · c", ["**a**", "**b**", "c"]);
  // les marqueurs basculent (lib/richtext.ts) : l'ordre de fermeture ne compte pas
  l("==a · **b · c**== · d", ["==a==", "==**b==**", "**==c**==", "d"]);
  const imbrique = itemsListe("==a · **b · c**== · d") ?? [];
  check(
    "imbriqués : b et c gras et surlignés, d nu",
    [imbrique[1], imbrique[2]].every((it) => {
      const p = passagesInline(it);
      return p.length === 1 && p[0].gras && p[0].surligne;
    }) && passagesInline(imbrique[3]).every((p) => !p.gras && !p.surligne)
  );
  l("==Self-disclosure== · plainte écrite · médias", ["==Self-disclosure==", "plainte écrite", "médias"]);
  l("a ==> b · c", ["a ==> b", "c"]);
  l("x == y · ==z==", ["x == y", "==z=="]);
  l("$a == b$ · c", ["$a == b$", "c"]);
  const v = decouperVerso("==Identify · Consider · Decide and act · Reflect==\nEn clair : C.");
  check("la carte Ethics 1/4 #7 : chaque étape surlignée", v?.retenir.forme === "liste" && v.retenir.items.every((it) => aSurligne(it)), voir(v?.retenir));
  check("marquesOuvertes : « ==Identify »", eq(marquesOuvertes("==Identify"), ["=="]));
  check("marquesOuvertes : « **a ==b »", eq(marquesOuvertes("**a ==b"), ["**", "=="]));
  check("marquesOuvertes : fermé, formule, signe", eq(marquesOuvertes("==a== $x == y$ c ==> d"), []));
}

console.log("— Largeur des formules et réduction sur téléphone");
{
  const court = "$$\\text{Sharpe} = \\dfrac{R_p - R_f}{\\sigma_p}$$";
  const long = "$$\\text{Income tax expense} = \\text{taxes payable} + \\Delta\\text{DTL} - \\Delta\\text{DTA}$$";
  const moyen = "$$\\text{EBIT} = Q \\times (P - VC) - FC$$";
  check("formule courte : tient, échelle 1", largeurFormule(court) < 11.5 && echelleFormule(court) === 1, String(largeurFormule(court)));
  check("formule très longue : réduite à 0,7 (défile ensuite)", largeurFormule(long) > 20 && echelleFormule(long) === 0.7, String(largeurFormule(long)));
  const e = echelleFormule(moyen);
  check("formule un peu large : réduite juste ce qu'il faut", e > 0.7 && e < 1, String(e));
  check(
    "fraction : largeur du plus long étage, pas la somme",
    Math.abs(largeurFormule("$$\\dfrac{abcdef}{a}$$") - largeurFormule("$$abcdef$$")) < 0.5,
    `${largeurFormule("$$\\dfrac{abcdef}{a}$$")} / ${largeurFormule("$$abcdef$$")}`
  );
  check("deux lignes : la plus longue compte", largeurFormule(`${court}\n${long}`) === largeurFormule(long));
  check("aligned : la plus longue rangée compte", largeurFormule("$$\\begin{aligned} a &= b \\\\ c &= d + e + f \\end{aligned}$$") < largeurFormule("$$a = b c = d + e + f$$"));
  check("limites d'une somme : sous le signe", largeurFormule("$$\\sum_{t=1}^{N} x$$") < largeurFormule("$$\\sum x$$") + 1.5);
  check("vide : 0", largeurFormule("") === 0 && echelleFormule("") === 1);
}

console.log("— Formules en ligne $…$");
{
  const v = decouperVerso("==Prix ≈ $-D \\times \\Delta y$==\nEn clair : avec $D$ la modified duration, en %.\nPiège : $\\Delta y$ en décimal, pas en %.");
  check(
    "$…$ gardés dans chaque case",
    v?.retenir.forme === "texte" &&
      v.retenir.texte === "==Prix ≈ $-D \\times \\Delta y$==" &&
      v.clair === "avec $D$ la modified duration, en %." &&
      v.piege === "$\\Delta y$ en décimal, pas en %.",
    voir(v)
  );
}

console.log("— Ancien format et textes libres : null");
{
  check(
    "ancien verso (gras + explication)",
    decouperVerso("**Le temps moyen, pondéré, avant de recevoir les cash flows.**\nChaque date de flux est pondérée par la part de sa present value dans le prix.") === null
  );
  check("une ligne", decouperVerso("Un texte de joueur") === null);
  check("vide", decouperVerso("") === null);
  check("null / undefined", decouperVerso(null) === null && decouperVerso(undefined) === null);
  check("« En clair » en première ligne : rien à retenir", decouperVerso("En clair : x\nPiège : y") === null);
  check("« En clair : » vide", decouperVerso("A = ==B==\nEn clair :\nPiège : y") === null);
  check("piège avant l'explication", decouperVerso("A\nPiège : y\nEn clair : x") === null);
  check("« en clair » au milieu d'une phrase : pas une case", decouperVerso("A\nC'est en clair : x") === null);
}

console.log("— Lignes vides et fins de ligne Windows");
{
  const v = decouperVerso("\n  Indenture = ==contrat==  \n\nEn clair : il fixe les covenants.\n\nPiège : pas de rating.\n\n");
  check(
    "lignes vides ignorées, espaces rognés",
    eq(v, { retenir: { forme: "texte", texte: "Indenture = ==contrat==" }, clair: "il fixe les covenants.", piege: "pas de rating." }),
    voir(v)
  );
  const w = decouperVerso("Indenture = ==contrat==\r\nEn clair : il fixe les covenants.\r\nPiège : pas de rating.\r\n");
  check("\\r\\n", eq(w, v), voir(w));
  const x = decouperVerso("A = ==B==\rEn clair : C.\rPiège : D.");
  check("\\r seul", x !== null && x.clair === "C." && x.piege === "D.", voir(x));
}

console.log("— Variantes d'écriture");
{
  const v = decouperVerso("A = ==B==\nEn clair : C.\nPiège : D.");
  check("espaces insécables avant les deux-points", v !== null && v.clair === "C." && v.piege === "D.", voir(v));
  const w = decouperVerso("A = ==B==\nen clair: C.\nPIEGE: D.");
  check("casse et accent libres, sans espace", w !== null && w.clair === "C." && w.piege === "D.", voir(w));
  const x = decouperVerso("A = ==B==\nEn clair : première phrase.\nSeconde ligne d'explication.\nPiège : D.");
  check("explication sur deux lignes", x?.clair === "première phrase.\nSeconde ligne d'explication.", voir(x?.clair));
  const y = decouperVerso("Ligne 1\nLigne 2 avec ==B==\nEn clair : C.");
  check("À retenir sur deux lignes (texte)", y?.retenir.forme === "texte" && y.retenir.texte === "Ligne 1\nLigne 2 avec ==B==", voir(y?.retenir));
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert.");
process.exit(ko ? 1 : 0);

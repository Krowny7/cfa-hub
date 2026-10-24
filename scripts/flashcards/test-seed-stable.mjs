// Le seed des flashcards met les paquets à jour EN PLACE
// (scripts/lib/flashcards-sync.mjs, appelé par seedFlashcardSets de
// scripts/lib/seed-core.mjs) : ids des paquets et des cartes gardés, contenu
// mis à jour, renommages, rien d'autre que des paquets officiels touché.
// Sans réseau : un faux client Supabase en mémoire.
// Usage, depuis le dépôt : npx tsx --tsconfig tsconfig.json scripts/flashcards/test-seed-stable.mjs

import { rangPaquet, syncFlashcardSets } from "../lib/flashcards-sync.mjs";

let ko = 0;
const check = (label, cond, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};

// ---------------------------------------------------------------------------
// Faux client : select / insert / update / delete, filtres eq / in, order,
// single ; chaque écriture est journalisée (table, opération, lignes visées).

function fauxClient(tables) {
  const journal = [];
  let n = 0;
  const nouvelId = (p) => `${p}-${String(++n).padStart(3, "0")}`;
  function requete(table) {
    const etat = { op: "select", cols: "*", filtres: [], ordre: null, valeurs: null, unique: false, retour: false };
    const lignes = () => tables[table].filter((r) => etat.filtres.every((f) => f(r)));
    const pick = (r) => (etat.cols === "*" ? { ...r } : Object.fromEntries(etat.cols.split(",").map((c) => [c.trim(), r[c.trim()]])));
    function executer() {
      if (etat.op === "select") {
        let out = lignes().map(pick);
        if (etat.ordre) out.sort((a, b) => (a[etat.ordre.col] ?? 0) - (b[etat.ordre.col] ?? 0) || 0);
        return { data: out, error: null };
      }
      if (etat.op === "insert") {
        const rows = (Array.isArray(etat.valeurs) ? etat.valeurs : [etat.valeurs]).map((v) => ({
          id: nouvelId(table === "flashcards" ? "c" : "s"),
          created_at: new Date(Date.UTC(2026, 9, 24, 12, 0, n)).toISOString(),
          ...(table === "flashcard_sets" ? { is_official: false, official_published: false, visibility: "private", share_token: nouvelId("tok") } : {}),
          ...v,
        }));
        tables[table].push(...rows);
        journal.push({ table, op: "insert", ids: rows.map((r) => r.id), rows });
        const data = etat.retour ? rows.map(pick) : null;
        return { data: etat.unique ? data[0] : data, error: null };
      }
      if (etat.op === "update") {
        const vis = lignes();
        for (const r of vis) Object.assign(r, etat.valeurs);
        journal.push({ table, op: "update", ids: vis.map((r) => r.id), valeurs: etat.valeurs });
        return { data: null, error: null };
      }
      if (etat.op === "delete") {
        const vis = lignes();
        tables[table] = tables[table].filter((r) => !vis.includes(r));
        journal.push({ table, op: "delete", ids: vis.map((r) => r.id), rows: vis });
        return { data: null, error: null };
      }
      return { data: null, error: { message: "op inconnue" } };
    }
    const q = {
      select(cols = "*") {
        if (etat.op === "select") etat.cols = cols;
        else (etat.retour = true), (etat.cols = cols);
        return q;
      },
      insert(v) {
        etat.op = "insert";
        etat.valeurs = v;
        return q;
      },
      update(v) {
        etat.op = "update";
        etat.valeurs = v;
        return q;
      },
      delete() {
        etat.op = "delete";
        return q;
      },
      eq(col, v) {
        etat.filtres.push((r) => r[col] === v);
        return q;
      },
      in(col, vs) {
        etat.filtres.push((r) => vs.includes(r[col]));
        return q;
      },
      order(col) {
        etat.ordre = { col };
        return q;
      },
      single() {
        etat.unique = true;
        return q;
      },
      then(res, rej) {
        try {
          return Promise.resolve(executer()).then(res, rej);
        } catch (e) {
          return Promise.reject(e).then(res, rej);
        }
      },
    };
    return q;
  }
  return { client: { from: (t) => requete(t) }, journal, tables };
}

const muet = () => undefined;
const FOLDER = "dossier-eco";
const AUTRE_DOSSIER = "dossier-ancien";
const OWNER = "owner-1";

const paquet = (n, theme, cartes) => ({ title: `Economics — Flashcards ${n}/4 (${theme})`, cards: cartes });
const cartes = (prefixe, k) => Array.from({ length: k }, (_, i) => [`${prefixe} recto ${i + 1}`, `${prefixe} verso ${i + 1}`]);
const cartesDe = (t, setId) => t.flashcards.filter((c) => c.set_id === setId).sort((a, b) => a.position - b.position);
const setDe = (t, title) => t.flashcard_sets.filter((s) => s.title === title);

check("rang : « Economics — Flashcards 1/4 (X) »", rangPaquet("Economics — Flashcards 1/4 (Firmes)") === "economics — flashcards 1/4");
check("rang : espaces autour du /", rangPaquet("Economics — Flashcards 1 / 4 (Firmes)") === "economics — flashcards 1/4");
check("rang : titre libre sans rang", rangPaquet("Fixed-Income Instruments & Markets (R47–R51)") === null);

// ---------------------------------------------------------------------------
console.log("\n# Premier seed, puis le même contenu");
{
  const f = fauxClient({ flashcard_sets: [], flashcards: [] });
  const sets = [paquet(1, "Firmes", cartes("A", 15)), paquet(2, "Cycles", cartes("B", 15))];
  const n1 = await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: FOLDER, sets, log: muet });
  check("retour : nombre de cartes", n1 === 30, String(n1));
  const s1 = setDe(f.tables, sets[0].title)[0];
  check("paquet créé officiel, publié, public, dans le dossier", s1?.is_official === true && s1.official_published === true && s1.visibility === "public" && s1.folder_id === FOLDER && s1.owner_id === OWNER);
  const ids1 = cartesDe(f.tables, s1.id).map((c) => c.id);
  check("15 cartes, positions 1 à 15", ids1.length === 15 && cartesDe(f.tables, s1.id).every((c, i) => c.position === i + 1));
  const tok = s1.share_token;

  f.journal.length = 0;
  const n2 = await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: FOLDER, sets, log: muet });
  check("re-seed : même retour", n2 === 30);
  check("re-seed : mêmes paquets (ids, share_token)", setDe(f.tables, sets[0].title).length === 1 && setDe(f.tables, sets[0].title)[0].id === s1.id && setDe(f.tables, sets[0].title)[0].share_token === tok);
  check("re-seed : mêmes ids de cartes", JSON.stringify(cartesDe(f.tables, s1.id).map((c) => c.id)) === JSON.stringify(ids1));
  check("re-seed : aucune carte écrite ni retirée", !f.journal.some((j) => j.table === "flashcards"), JSON.stringify(f.journal.filter((j) => j.table === "flashcards").map((j) => j.op)));
  check("re-seed : aucun paquet créé ni supprimé", !f.journal.some((j) => j.table === "flashcard_sets" && j.op !== "update"));
}

// ---------------------------------------------------------------------------
console.log("\n# Contenu modifié : cartes mises à jour en place");
{
  const f = fauxClient({ flashcard_sets: [], flashcards: [] });
  const base = paquet(1, "Firmes", cartes("A", 15));
  await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: FOLDER, sets: [base], log: muet });
  const sid = setDe(f.tables, base.title)[0].id;
  const avant = cartesDe(f.tables, sid);

  // verso de la 2 réécrit, recto de la 3 réécrit
  const v2 = base.cards.map((c) => [...c]);
  v2[1][1] = "A verso 2 corrigé";
  v2[2][0] = "A recto 3 reformulé";
  await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: FOLDER, sets: [{ ...base, cards: v2 }], log: muet });
  const apres = cartesDe(f.tables, sid);
  check("même paquet", setDe(f.tables, base.title).length === 1 && setDe(f.tables, base.title)[0].id === sid);
  check("mêmes ids de cartes", JSON.stringify(apres.map((c) => c.id)) === JSON.stringify(avant.map((c) => c.id)));
  check("verso 2 mis à jour", apres[1].back === "A verso 2 corrigé");
  check("recto 3 mis à jour (par position)", apres[2].front === "A recto 3 reformulé" && apres[2].id === avant[2].id);

  // une carte ajoutée au bout
  const v3 = [...v2, ["A recto 16", "A verso 16"]];
  f.journal.length = 0;
  const n3 = await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: FOLDER, sets: [{ ...base, cards: v3 }], log: muet });
  const apres3 = cartesDe(f.tables, sid);
  check("carte ajoutée : 16 cartes, les 15 gardent leur id", apres3.length === 16 && apres3.slice(0, 15).every((c, i) => c.id === avant[i].id) && n3 === 16);
  check("carte ajoutée : une seule insertion, aucune mise à jour", f.journal.filter((j) => j.table === "flashcards").map((j) => j.op).join(",") === "insert");

  // deux cartes retirées au bout
  const v4 = v3.slice(0, 13);
  await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: FOLDER, sets: [{ ...base, cards: v4 }], log: muet });
  const apres4 = cartesDe(f.tables, sid);
  check("cartes en trop retirées : 13, ids gardés", apres4.length === 13 && apres4.every((c, i) => c.id === avant[i].id));
  check("cartes retirées : plus en base", !f.tables.flashcards.some((c) => c.id === avant[13].id || c.id === apres3[15].id));

  // deux cartes échangées : chacune garde son id (même recto)
  const v5 = v4.map((c) => [...c]);
  [v5[4], v5[9]] = [v5[9], v5[4]];
  await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: FOLDER, sets: [{ ...base, cards: v5 }], log: muet });
  const apres5 = cartesDe(f.tables, sid);
  check("cartes échangées : l'id suit le recto", apres5[4].id === avant[9].id && apres5[9].id === avant[4].id && apres5[4].position === 5 && apres5[9].front === "A recto 5");
  // une carte insérée au milieu : les suivantes gardent leur id (même recto)
  const v6 = [...v5.slice(0, 2), ["A recto neuf", "A verso neuf"], ...v5.slice(2)];
  await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: FOLDER, sets: [{ ...base, cards: v6 }], log: muet });
  const apres6 = cartesDe(f.tables, sid);
  check("carte insérée au milieu : les suivantes gardent leur id", apres6.length === 14 && apres6[3].id === apres5[2].id && apres6[13].id === apres5[12].id && apres6[2].front === "A recto neuf");
}

// ---------------------------------------------------------------------------
console.log("\n# Renommages, paquets absents, paquets non officiels");
{
  const tables = {
    flashcard_sets: [
      // officiels du dossier
      { id: "s-old1", title: "Economics — Flashcards 1/4 (Firmes)", folder_id: FOLDER, is_official: true, official_published: true, visibility: "public", owner_id: "admin-2", created_at: "2026-10-01", share_token: "t1" },
      { id: "s-old2", title: "Economics — Flashcards 2/4 (Cycles)", folder_id: FOLDER, is_official: true, official_published: false, visibility: "private", owner_id: "admin-2", created_at: "2026-10-01", share_token: "t2" },
      { id: "s-old3", title: "Economics — Flashcards 3/4 (Monnaie)", folder_id: FOLDER, is_official: true, official_published: true, visibility: "public", owner_id: OWNER, created_at: "2026-10-01", share_token: "t3" },
      { id: "s-garde", title: "Economics — Mémo hors liste", folder_id: FOLDER, is_official: true, official_published: true, visibility: "public", owner_id: OWNER, created_at: "2026-10-01", share_token: "t4" },
      { id: "s-v1", title: "Economics v1 (R1–R3)", folder_id: AUTRE_DOSSIER, is_official: true, official_published: true, visibility: "public", owner_id: OWNER, created_at: "2026-09-01", share_token: "t5" },
      { id: "s-v1b", title: "Economics v1 (R4–R6)", folder_id: AUTRE_DOSSIER, is_official: true, official_published: true, visibility: "public", owner_id: OWNER, created_at: "2026-09-01", share_token: "t6" },
      // 4/4 : un doublon officiel du même titre (le plus récent, hors dossier)
      { id: "s-4a", title: "Economics — Flashcards 4/4 (Change)", folder_id: FOLDER, is_official: true, official_published: true, visibility: "public", owner_id: OWNER, created_at: "2026-10-02", share_token: "t7" },
      { id: "s-4b", title: "Economics — Flashcards 4/4 (Change)", folder_id: AUTRE_DOSSIER, is_official: true, official_published: true, visibility: "public", owner_id: OWNER, created_at: "2026-10-03", share_token: "t8" },
      // paquets de joueurs portant des titres de la liste et des oldTitles : jamais touchés
      { id: "p-joueur", title: "Economics — Flashcards 1/4 (Firmes, marchés)", folder_id: "dossier-joueur", is_official: false, official_published: false, visibility: "private", owner_id: "joueur", created_at: "2026-10-05", share_token: "t9" },
      { id: "p-joueur2", title: "Economics v1 (R1–R3)", folder_id: FOLDER, is_official: false, official_published: false, visibility: "private", owner_id: "joueur", created_at: "2026-10-05", share_token: "t10" },
    ],
    flashcards: [],
  };
  for (const s of tables.flashcard_sets) for (let i = 0; i < 3; i++) tables.flashcards.push({ id: `${s.id}-c${i + 1}`, set_id: s.id, front: `${s.id} recto ${i + 1}`, back: `${s.id} verso ${i + 1}`, position: i + 1 });
  const f = fauxClient(tables);
  const officiels = new Set(tables.flashcard_sets.filter((s) => s.is_official).map((s) => s.id));
  const avantJoueur = JSON.stringify([f.tables.flashcard_sets.filter((s) => !s.is_official), f.tables.flashcards.filter((c) => c.set_id.startsWith("p-"))]);

  const sets = [
    // 1/4 : thème changé SANS oldTitles → même dossier, même rang : renommé
    paquet(1, "Firmes, marchés", cartes("s-old1", 3)),
    // 2/4 : thème changé, ancien titre dans oldTitles → renommé (même rang), drapeaux remis
    paquet(2, "Cycles et budget", cartes("s-old2", 3)),
    // 3/4 : nouveau thème, un ancien titre v1 (sans rang) dans oldTitles → s-old3 a le même rang dans le dossier
    paquet(3, "Politique monétaire", cartes("s-old3", 3)),
    // 4/4 : titre exact (deux officiels : celui du dossier gardé, l'autre supprimé)
    paquet(4, "Change", cartes("s-4a", 3)),
    // nouveau rang : repris d'un ancien titre v1 restant (dans l'ordre des oldTitles)
    { title: "Economics — Révision express", cards: cartes("x", 2) },
  ];
  const oldTitles = ["Economics — Flashcards 2/4 (Cycles)", "Economics v1 (R1–R3)", "Economics v1 (R4–R6)"];
  const lignes = [];
  const total = await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: FOLDER, sets, oldTitles, log: (l) => lignes.push(l) });
  const t = f.tables;
  const par = (title) => setDe(t, title).filter((s) => s.is_official);

  check("retour : 14 cartes", total === 14, String(total));
  check("1/4 renommé sans oldTitles (même dossier, même rang) : même id", par(sets[0].title).length === 1 && par(sets[0].title)[0].id === "s-old1" && par(sets[0].title)[0].share_token === "t1");
  check("1/4 : cartes gardées (mêmes ids)", cartesDe(t, "s-old1").map((c) => c.id).join() === "s-old1-c1,s-old1-c2,s-old1-c3");
  check("2/4 renommé via oldTitles : même id, publié et public", par(sets[1].title)[0]?.id === "s-old2" && par(sets[1].title)[0].official_published === true && par(sets[1].title)[0].visibility === "public");
  check("3/4 renommé (même rang, dossier) : même id", par(sets[2].title)[0]?.id === "s-old3");
  check("4/4 titre exact : celui du dossier gardé", par(sets[3].title).length === 1 && par(sets[3].title)[0].id === "s-4a");
  check("4/4 : le doublon officiel est supprimé avec ses cartes", !t.flashcard_sets.some((s) => s.id === "s-4b") && !t.flashcards.some((c) => c.set_id === "s-4b"));
  check("nouveau paquet : repris d'un ancien titre (ordre des oldTitles)", par("Economics — Révision express")[0]?.id === "s-v1", par("Economics — Révision express")[0]?.id);
  check("paquet repris d'un autre dossier : rangé dans le dossier", par("Economics — Révision express")[0]?.folder_id === FOLDER);
  check("repris : 3 cartes → 2 (une retirée, deux gardées)", cartesDe(t, "s-v1").length === 2 && cartesDe(t, "s-v1").every((c, i) => c.id === `s-v1-c${i + 1}`));
  check("ancien titre non repris : supprimé avec ses cartes", !t.flashcard_sets.some((s) => s.id === "s-v1b") && !t.flashcards.some((c) => c.set_id === "s-v1b"));
  check("paquet officiel du dossier absent de la liste : PAS supprimé", t.flashcard_sets.some((s) => s.id === "s-garde") && cartesDe(t, "s-garde").length === 3);
  check("… et signalé dans le journal", lignes.some((l) => l.includes("Economics — Mémo hors liste") && l.includes("reste en ligne")));
  check("paquets des joueurs (titres de la liste ou des oldTitles) : intacts", JSON.stringify([t.flashcard_sets.filter((s) => !s.is_official), t.flashcards.filter((c) => c.set_id.startsWith("p-"))]) === avantJoueur);
  for (const j of f.journal) if (j.table === "flashcard_sets" && j.op === "insert") j.ids.forEach((id) => officiels.add(id));
  const cartesOfficielles = (id) => officiels.has(String(id).replace(/-c\d+$/, "")) || f.journal.some((j) => j.table === "flashcards" && j.op === "insert" && j.ids.includes(id) && officiels.has(j.rows.find((r) => r.id === id).set_id));
  const horsOfficiel = f.journal.filter((j) => (j.table === "flashcard_sets" ? j.ids.some((id) => !officiels.has(id)) : j.ids.some((id) => !cartesOfficielles(id))));
  check("chaque écriture ne vise que des paquets officiels et leurs cartes", horsOfficiel.length === 0, JSON.stringify(horsOfficiel.map((j) => [j.table, j.op, j.ids])));
  check("aucun paquet créé (tout est repris)", !f.journal.some((j) => j.table === "flashcard_sets" && j.op === "insert"));
}

// ---------------------------------------------------------------------------
console.log("\n# Cartes existantes à la même position");
{
  // ids volontairement hors de l'ordre d'insertion : c-b (1), c-a (1), c-c (2)
  const titre = "Quant — Flashcards 1/4 (Stats)";
  const f = fauxClient({
    flashcard_sets: [{ id: "s-pos", title: titre, folder_id: FOLDER, is_official: true, official_published: true, visibility: "public", owner_id: OWNER, created_at: "2026-10-01", share_token: "tp" }],
    flashcards: [
      { id: "c-b", set_id: "s-pos", front: "ancien B", back: "b", position: 1 },
      { id: "c-a", set_id: "s-pos", front: "ancien A", back: "a", position: 1 },
      { id: "c-c", set_id: "s-pos", front: "ancien C", back: "c", position: 2 },
    ],
  });
  const sets = [{ title: titre, cards: [["neuf 1", "v1"], ["neuf 2", "v2"], ["neuf 3", "v3"]] }];
  await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: FOLDER, sets, log: muet });
  const apres = cartesDe(f.tables, "s-pos");
  check("ids gardés dans l'ordre (position, puis id)", apres.map((c) => `${c.id}:${c.front}`).join() === "c-a:neuf 1,c-b:neuf 2,c-c:neuf 3", apres.map((c) => `${c.id}:${c.front}`).join());
  check("positions remises de 1 à 3", apres.map((c) => c.position).join() === "1,2,3");
  check("aucune carte ajoutée ni retirée", f.tables.flashcards.length === 3 && !f.journal.some((j) => j.table === "flashcards" && j.op !== "update"));
  f.journal.length = 0;
  await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: FOLDER, sets, log: muet });
  check("second seed : aucune carte écrite", !f.journal.some((j) => j.table === "flashcards"), JSON.stringify(f.journal.filter((j) => j.table === "flashcards")));
  check("second seed : mêmes ids", cartesDe(f.tables, "s-pos").map((c) => c.id).join() === "c-a,c-b,c-c");
}

// ---------------------------------------------------------------------------
console.log("\n# Sans dossier (folderId absent)");
{
  const D = "dossier-ethics";
  const f = fauxClient({
    flashcard_sets: [
      { id: "s-code", title: "Ethics — Flashcards 1/2 (Code)", folder_id: D, is_official: true, official_published: true, visibility: "public", owner_id: OWNER, created_at: "2026-10-01", share_token: "te1" },
      // même dossier, même rang que le 2/2 de la liste, titre sorti de la liste : sans dossier donné, ni renommé ni supprimé
      { id: "s-hors", title: "Ethics — Flashcards 2/2 (Normes)", folder_id: D, is_official: true, official_published: true, visibility: "public", owner_id: OWNER, created_at: "2026-10-01", share_token: "te2" },
    ],
    flashcards: [
      { id: "s-code-c1", set_id: "s-code", front: "code 1", back: "v", position: 1 },
      { id: "s-hors-c1", set_id: "s-hors", front: "hors 1", back: "v", position: 1 },
    ],
  });
  const sets = [
    { title: "Ethics — Flashcards 1/2 (Code)", cards: [["code 1", "v corrigé"]] },
    { title: "Ethics — Flashcards 2/2 (Normes et devoirs)", cards: [["normes 1", "v"]] },
  ];
  const lignes = [];
  await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: undefined, sets, log: (l) => lignes.push(l) });
  const code = f.tables.flashcard_sets.filter((s) => s.title === sets[0].title);
  check("titre exact repris (même id, même carte)", code.length === 1 && code[0].id === "s-code" && cartesDe(f.tables, "s-code")[0]?.id === "s-code-c1" && cartesDe(f.tables, "s-code")[0].back === "v corrigé");
  check("son dossier n'est pas touché", code[0].folder_id === D && !f.journal.some((j) => j.op === "update" && j.valeurs && "folder_id" in j.valeurs));
  const hors = f.tables.flashcard_sets.find((s) => s.id === "s-hors");
  check("paquet hors liste du même dossier : ni renommé ni supprimé", hors?.title === "Ethics — Flashcards 2/2 (Normes)" && cartesDe(f.tables, "s-hors").length === 1);
  const cree = f.tables.flashcard_sets.filter((s) => s.title === sets[1].title);
  check("le 2/2 de la liste est créé, sans dossier", cree.length === 1 && cree[0].id !== "s-hors" && cree[0].is_official === true && cree[0].folder_id == null);
  check("aucune suppression", !f.journal.some((j) => j.op === "delete"));
}

// ---------------------------------------------------------------------------
console.log("\n# Garde-fous");
{
  const f = fauxClient({ flashcard_sets: [], flashcards: [] });
  let e1 = null;
  try {
    await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: FOLDER, sets: [paquet(1, "A", cartes("a", 1)), paquet(1, "A", cartes("b", 1))], log: muet });
  } catch (e) {
    e1 = e;
  }
  check("deux paquets du même titre : refus, rien d'écrit", !!e1 && f.journal.length === 0);
  let e2 = null;
  try {
    await syncFlashcardSets(f.client, { ownerId: OWNER, folderId: FOLDER, sets: [{ title: "X — Flashcards 1/1 (Y)", cards: [["recto seul"]] }], log: muet });
  } catch (e) {
    e2 = e;
  }
  check("carte mal formée : refus, rien d'écrit", !!e2 && f.journal.length === 0);
  // une lecture qui remonterait un paquet non officiel : arrêt avant toute écriture
  const g = fauxClient({ flashcard_sets: [{ id: "p1", title: "Z — Flashcards 1/1 (W)", folder_id: FOLDER, is_official: false }], flashcards: [] });
  const tricheur = { from: (tb) => {
    const q = g.client.from(tb);
    const eq = q.eq;
    q.eq = (col, v) => (col === "is_official" ? q : eq(col, v));
    return q;
  } };
  let e3 = null;
  try {
    await syncFlashcardSets(tricheur, { ownerId: OWNER, folderId: FOLDER, sets: [{ title: "Z — Flashcards 1/1 (W)", cards: [["a", "b"]] }], log: muet });
  } catch (e) {
    e3 = e;
  }
  check("paquet non officiel remonté par la lecture : arrêt, rien d'écrit", !!e3 && g.journal.length === 0, e3?.message ?? "");
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert.");
process.exit(ko ? 1 : 0);

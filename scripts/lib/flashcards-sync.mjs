// Mise à jour EN PLACE des paquets de flashcards officiels (Système), sans
// client Supabase à soi : seed-core.mjs lui passe le sien (clé service), le
// test scripts/flashcards/test-seed-stable.mjs un faux client en mémoire.
//
// Pourquoi en place : la progression des joueurs (boucle « À revoir »,
// répétition espacée, « Reprendre », lien de partage, table
// flashcard_progress) est rangée sous l'id du paquet et l'id de chaque
// carte. Supprimer puis recréer les paquets à chaque mise à jour du contenu
// donnait de nouveaux ids : tout était perdu.
//
// Règles :
// - un paquet officiel portant exactement le titre est gardé (son id, son
//   share_token) ; dossier, visibilité et drapeaux sont remis à jour ;
// - sinon, un paquet officiel d'un des oldTitles du même rang
//   (« Flashcards 2/4 ») est renommé ;
// - sinon, un paquet officiel du même dossier et du même rang dont le titre
//   ne figure plus dans la liste est renommé (thème changé sans oldTitles) ;
//   sans dossier (folderId absent), cette étape est sautée et le dossier des
//   paquets repris n'est pas touché ;
// - sinon, un ancien titre sans rang (« … (R47–R51) ») est renommé, dans
//   l'ordre des oldTitles ;
// - sinon, le paquet est créé ;
// - cartes : même recto d'abord (une carte déplacée garde son id), puis par
//   position (cartes existantes rangées par position, puis id : deux cartes
//   à la même position gardent un ordre stable) ; front, back et position
//   (1 à n) mis à jour ; les cartes en trop sont retirées, les manquantes
//   ajoutées ;
// - les oldTitles qui n'ont servi à aucun renommage, et les doublons officiels
//   d'un titre de la liste, sont supprimés (comme avant) ; les autres paquets
//   officiels du dossier absents de la liste ne sont PAS supprimés (signalés) ;
// - rien d'autre que des paquets is_official (et leurs cartes) n'est touché.

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Le rang d'un paquet : « Economics — Flashcards 1/4 (…) » → « economics — flashcards 1/4 » ; null sans rang. */
export function rangPaquet(title) {
  const m = /^(.+?\bFlashcards\s+\d+\s*\/\s*\d+)/i.exec(norm(title));
  return m ? m[1].replace(/\s*\/\s*/, "/").toLowerCase() : null;
}

function verifierEntree(sets) {
  if (!Array.isArray(sets)) throw new Error("seedFlashcardSets : `sets` doit être une liste.");
  const vus = new Set();
  for (const s of sets) {
    if (!s || typeof s.title !== "string" || !norm(s.title)) throw new Error("seedFlashcardSets : un paquet sans titre.");
    if (vus.has(s.title)) throw new Error(`seedFlashcardSets : titre en double « ${s.title} ».`);
    vus.add(s.title);
    if (!Array.isArray(s.cards)) throw new Error(`seedFlashcardSets : « ${s.title} » n'a pas de liste de cartes.`);
    for (const c of s.cards) {
      if (!Array.isArray(c) || typeof c[0] !== "string" || typeof c[1] !== "string") throw new Error(`seedFlashcardSets : carte mal formée dans « ${s.title} ».`);
    }
  }
}

async function ok(p, quoi) {
  const { data, error } = await p;
  if (error) throw new Error(`${quoi} : ${error.message ?? error}`);
  return data;
}

/**
 * sets: [{ title, cards: [[front, back], ...] }] ; même retour que l'ancien
 * seedFlashcardSets : le nombre total de cartes écrites.
 */
export async function syncFlashcardSets(db, { ownerId, folderId, sets, oldTitles = [], log = console.log }) {
  verifierEntree(sets);
  const titres = sets.map((s) => s.title);
  const anciens = [...new Set(oldTitles)].filter((t) => !titres.includes(t));

  // Les paquets officiels concernés : par titre (liste + anciens), et ceux du dossier (renommage par rang).
  const colonnes = "id,title,folder_id,is_official,created_at";
  const parTitre = await ok(db.from("flashcard_sets").select(colonnes).eq("is_official", true).in("title", [...titres, ...anciens]), "lecture des paquets par titre");
  const duDossier = folderId ? await ok(db.from("flashcard_sets").select(colonnes).eq("is_official", true).eq("folder_id", folderId), "lecture des paquets du dossier") : [];
  const officiels = new Map();
  for (const r of [...(parTitre ?? []), ...(duDossier ?? [])]) {
    if (r.is_official !== true) throw new Error(`Paquet ${r.id} non officiel remonté par la lecture : arrêt, rien n'est touché.`);
    officiels.set(r.id, r);
  }
  // le plus sûr d'abord : dans le dossier, puis le plus ancien
  const ordre = [...officiels.values()].sort(
    (a, b) => (a.folder_id === folderId ? 0 : 1) - (b.folder_id === folderId ? 0 : 1) || String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")) || String(a.id).localeCompare(String(b.id))
  );
  const pris = new Set();
  const prendre = (r) => (pris.add(r.id), r);
  const libre = (r) => !pris.has(r.id);

  // 1. titre exact
  const appariement = sets.map((s) => {
    const r = ordre.find((x) => libre(x) && x.title === s.title);
    return r ? { set: s, row: prendre(r), comment: "exact" } : { set: s, row: null, comment: null };
  });
  // 2. un des oldTitles du même rang (« Flashcards 2/4 »)
  const dAnciens = () => anciens.flatMap((t) => ordre.filter((x) => libre(x) && x.title === t));
  for (const a of appariement.filter((x) => !x.row)) {
    const rang = rangPaquet(a.set.title);
    const r = rang ? dAnciens().find((x) => rangPaquet(x.title) === rang) : null;
    if (r) Object.assign(a, { row: prendre(r), comment: `renommé de « ${r.title} »` });
  }
  // 3. même dossier, même rang, titre sorti de la liste (thème changé sans oldTitles)
  for (const a of appariement.filter((x) => !x.row)) {
    const rang = rangPaquet(a.set.title);
    if (!rang) continue;
    const r = ordre.find((x) => libre(x) && x.folder_id === folderId && !titres.includes(x.title) && !anciens.includes(x.title) && rangPaquet(x.title) === rang);
    if (r) Object.assign(a, { row: prendre(r), comment: `renommé de « ${r.title} » (même rang)` });
  }
  // 4. un ancien titre sans rang (anciens paquets « (R47–R51) »), dans l'ordre
  // des oldTitles ; jamais un ancien d'un autre rang (2/4 ne devient pas 1/4)
  for (const a of appariement.filter((x) => !x.row)) {
    const r = dAnciens().find((x) => rangPaquet(x.title) === null);
    if (r) Object.assign(a, { row: prendre(r), comment: `renommé de « ${r.title} »` });
  }

  const estOfficiel = (id) => officiels.has(id);
  const supprimerPaquet = async (r, pourquoi) => {
    if (!estOfficiel(r.id)) throw new Error(`Refus de supprimer ${r.id} : pas un paquet officiel lu.`);
    await ok(db.from("flashcards").delete().eq("set_id", r.id), `suppression des cartes de ${r.id}`);
    await ok(db.from("flashcard_sets").delete().eq("id", r.id).eq("is_official", true), `suppression du paquet ${r.id}`);
    log(`  − Flashcards "${r.title}" supprimé (${pourquoi})`);
  };

  // 5. les anciens titres non repris, et les doublons officiels d'un titre de la liste : supprimés (comme avant)
  for (const r of ordre.filter((x) => libre(x) && (anciens.includes(x.title) || titres.includes(x.title)))) {
    await supprimerPaquet(r, anciens.includes(r.title) ? "ancien titre" : "doublon");
    pris.add(r.id);
  }

  let total = 0;
  for (const a of appariement) {
    const { set } = a;
    // sans dossier (folderId absent) : celui du paquet repris ne change pas
    const champs = { title: set.title, visibility: "public", subject: "cfa", ...(folderId !== undefined ? { folder_id: folderId } : {}), official_published: true };
    let setId;
    if (a.row) {
      setId = a.row.id;
      if (!estOfficiel(setId)) throw new Error(`Refus de modifier ${setId} : pas un paquet officiel lu.`);
      await ok(db.from("flashcard_sets").update(champs).eq("id", setId).eq("is_official", true), `mise à jour du paquet ${setId}`);
    } else {
      const cree = await ok(db.from("flashcard_sets").insert({ ...champs, owner_id: ownerId, is_official: true }).select("id").single(), `création de « ${set.title} »`);
      setId = cree.id;
      officiels.set(setId, { id: setId, title: set.title, folder_id: folderId ?? null, is_official: true });
    }

    const n = await syncCartes(db, setId, set.cards);
    const detail = [`${n.gardees} gardées`, n.maj ? `${n.maj} mises à jour` : null, n.ajoutees ? `${n.ajoutees} ajoutées` : null, n.retirees ? `${n.retirees} retirées` : null].filter(Boolean).join(", ");
    const quoi = a.row ? (a.comment === "exact" ? "" : ` ; ${a.comment}`) : " ; créé";
    log(`  ✓ Flashcards "${set.title}" — ${set.cards.length} cartes (set ${setId} ; ${detail}${quoi})`);
    total += set.cards.length;
  }

  // Les autres paquets officiels du dossier : laissés en ligne, signalés.
  const restes = (duDossier ?? []).filter((r) => !pris.has(r.id) && !titres.includes(r.title));
  for (const r of restes) log(`  · "${r.title}" reste en ligne (absent de la liste : ajoute son titre à oldTitles pour le retirer)`);
  return total;
}

/** Les cartes d'un paquet officiel, mises à jour en place. */
async function syncCartes(db, setId, cards) {
  const avant = (await ok(db.from("flashcards").select("id,front,back,position").eq("set_id", setId).order("position", { ascending: true }), `lecture des cartes de ${setId}`)) ?? [];
  // ordre stable : position, puis id
  const existantes = [...avant].sort((x, y) => (x.position ?? 0) - (y.position ?? 0) || String(x.id).localeCompare(String(y.id)));
  const prises = new Set();
  const cible = cards.map(([front, back], i) => ({ front, back, position: i + 1, id: null }));
  // même recto : la carte garde son id même si elle a bougé
  for (const c of cible) {
    const e = existantes.find((x) => !prises.has(x.id) && x.front === c.front);
    if (e) (c.id = e.id), prises.add(e.id);
  }
  // puis par position, puis dans l'ordre pour le reste
  cible.forEach((c, i) => {
    if (c.id) return;
    const e = existantes[i] && !prises.has(existantes[i].id) ? existantes[i] : null;
    if (e) (c.id = e.id), prises.add(e.id);
  });
  for (const c of cible) {
    if (c.id) continue;
    const e = existantes.find((x) => !prises.has(x.id));
    if (e) (c.id = e.id), prises.add(e.id);
  }

  const parId = new Map(existantes.map((e) => [e.id, e]));
  let maj = 0;
  for (const c of cible.filter((x) => x.id)) {
    const e = parId.get(c.id);
    if (e.front === c.front && e.back === c.back && e.position === c.position) continue;
    await ok(db.from("flashcards").update({ front: c.front, back: c.back, position: c.position }).eq("id", c.id).eq("set_id", setId), `mise à jour de la carte ${c.id}`);
    maj++;
  }
  const retirer = existantes.filter((e) => !prises.has(e.id)).map((e) => e.id);
  if (retirer.length) await ok(db.from("flashcards").delete().in("id", retirer).eq("set_id", setId), `retrait de cartes de ${setId}`);
  const nouvelles = cible.filter((c) => !c.id).map(({ front, back, position }) => ({ set_id: setId, front, back, position }));
  if (nouvelles.length) await ok(db.from("flashcards").insert(nouvelles), `ajout de cartes à ${setId}`);
  return { gardees: cible.length - nouvelles.length - maj, maj, ajoutees: nouvelles.length, retirees: retirer.length };
}

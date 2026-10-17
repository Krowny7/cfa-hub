// Tests de la grille et des blocs de la page de profil (variante B), sans
// base ni réseau ni navigateur (rendu statique par react-dom/server).
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-grille.tsx
// Vérifie : GrilleProfil (portées p4 / p8 / p12, « haute » absente d'une
// rangée de bandes, case sans contenu vide et cachée aux lecteurs d'écran,
// rangée sans contenu sautée en vue publique et gardée en édition, places
// libres avec leur portée et leur « apres », data-case seulement en
// édition, places libres de l'édition cachées sous 1 024 px) ; BlocProfil pour chaque genre à chaque format permis, avec des
// données riches et sobres (amis 6 / 9 / 12, sources 3 / 5, vidéo avec sa
// couverture « #t= » sans toucher l'adresse enregistrée, GIF sans largeur
// forcée quand sa taille est inconnue) ; aDuContenu des blocs sans
// données ; le balisage de la Salle des trophées inchangé après
// l'extraction de ParSource ; le radar en héros garde des libellés « moy »
// que la règle sansMoy masque.
import "./sans-css";
import "./react-global";
import { createHash } from "node:crypto";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GrilleProfil } from "@/components/profil/GrilleProfil";
import { BlocProfil, ICONE_BLOC } from "@/components/profil/BlocsProfil";
import { PageProfil } from "@/components/profil/PageProfil";
import { SalleDesTrophees } from "@/components/trophees/SalleDesTrophees";
import { aDuContenu, type DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { BLOCS, FORMATS_PERMIS, estMedia, genreDe, type Bloc, type BlocMedia, type Disposition, type Format, type GenreBloc, type PlaceVide } from "@/lib/profil/disposition";
import { compter } from "@/lib/trophees";
import { DISPO_RICHE, DISPO_SOBRE, GIF_EXEMPLE, RICHE, SOBRE, amisExemple } from "./donnees-blocs-exemple";
import { CAS_SALLE, REFERENCE_SALLE } from "./salle-cas";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const rend = (n: React.ReactNode) => renderToStaticMarkup(<>{n}</>);
const compte = (html: string, motif: string) => html.split(motif).length - 1;

// ── GrilleProfil ──
const nomme = (c: { e: { k: string }; f: Format }) => <span data-bloc={c.e.k}>{c.e.k}</span>;
{
  const d: Disposition = [
    { k: "vitrine", f: "bande" },
    { k: "radar", f: "heros" },
    { k: "amis", f: "tuile" },
    { k: "reponses", f: "tuile" },
    { k: "libre", f: "tuile" },
  ];
  const html = rend(<GrilleProfil disposition={d} rendre={nomme} />);
  check("grille : une bande en p12, un héros en p8, une tuile en p4", html.includes('class="@container case p12"') && html.includes('class="@container case p8"') && html.includes('class="@container case p4"'));
  const rangees = html.match(/<div class="rangee[^"]*">/g) ?? [];
  check("grille : 3 rangées ; « haute » absente de la rangée de bandes", rangees.length === 3 && rangees[0] === '<div class="rangee">' && rangees[1] === '<div class="rangee haute">');
  check("grille : vue publique, ni data-case ni data-place", !html.includes("data-case") && !html.includes("data-place"));
  check("grille : la place libre, vide et cachée (sans libre())", html.includes('<div aria-hidden="true" class="vide p4"></div>'));

  const vides = rend(<GrilleProfil disposition={d} rendre={(c) => (c.e.k === "amis" ? null : nomme(c))} />);
  check("grille : un bloc sans contenu garde sa place, vide et caché", vides.includes('<div aria-hidden="true" class="vide p4"></div>') && !vides.includes('data-bloc="amis"'));

  const rien: Disposition = [
    { k: "vitrine", f: "bande" },
    { k: "amis", f: "tuile" },
    { k: "trophees", f: "tuile" },
  ];
  const sautee = rend(<GrilleProfil disposition={rien} rendre={(c) => (c.e.k === "vitrine" ? nomme(c) : null)} />);
  check("grille : vue publique, une rangée sans contenu est sautée", (sautee.match(/class="rangee/g) ?? []).length === 1);
  const gardee = rend(<GrilleProfil edition disposition={rien} rendre={(c) => (c.e.k === "vitrine" ? nomme(c) : null)} />);
  check("grille : en édition, elle est gardée", (gardee.match(/class="rangee/g) ?? []).length === 2);

  const vues: PlaceVide[] = [];
  const ed = rend(
    <GrilleProfil
      edition
      disposition={d}
      rendre={nomme}
      libre={(p) => {
        vues.push(p);
        return <i>place</i>;
      }}
    />,
  );
  check(
    "grille : libre() reçoit l'élément libre (portée 4, apres = son index) puis la fin de rangée (portée 4, apres = le dernier)",
    vues.length === 2 && vues[0].i === 4 && vues[0].portee === 4 && vues[0].apres === 4 && vues[1].i === null && vues[1].portee === 4 && vues[1].apres === 4 && vues[1].rangee === 2,
    JSON.stringify(vues),
  );
  check("grille : en édition, data-case sur chaque case, data-place sur la fin de rangée", compte(ed, "data-case=") === 5 && ed.includes('data-place="2"'));
  check("grille : la fin de rangée prend sa portée par classe (pas de « span » en style)", ed.includes('data-place="2" class="case p4 placeEdition"') && !ed.includes("grid-column"));
  check("grille : en édition, les places libres (élément libre, fin de rangée) ne jouent que dès 1 024 px", ed.includes('data-case="4" class="@container case p4 placeEdition"') && compte(ed, "placeEdition") === 2);
  const seulesLibres: Disposition = [
    { k: "vitrine", f: "bande" },
    { k: "libre", f: "heros" },
    { k: "libre", f: "tuile" },
  ];
  const edLibres = rend(<GrilleProfil edition disposition={seulesLibres} rendre={nomme} libre={() => <i>place</i>} />);
  check("grille : en édition, une rangée de places libres seules disparaît sous 1 024 px (sans écart en trop)", edLibres.includes('<div class="rangee haute placeEdition">') && edLibres.includes('<div class="rangee">'));
  const publiqueLibre = rend(<GrilleProfil disposition={d} rendre={nomme} libre={() => <i>place</i>} />);
  check("grille : vue publique, ce qu'on pose dans une place libre se voit partout (l'invitation du propriétaire)", publiqueLibre.includes("<i>place</i>") && !publiqueLibre.includes("placeEdition"));
  const deuxHeros: Disposition = [
    { k: "radar", f: "heros" },
    { k: "amis", f: "heros" },
  ];
  const vues2: PlaceVide[] = [];
  rend(<GrilleProfil disposition={deuxHeros} rendre={nomme} libre={(p) => (vues2.push(p), "x")} />);
  check("grille : deux héros, deux fins de rangée de 4", vues2.length === 2 && vues2.every((p) => p.portee === 4 && p.i === null) && vues2[0].apres === 0 && vues2[1].apres === 1);
}

// ── PageProfil ──
{
  const html = rend(<PageProfil disposition={DISPO_RICHE} donnees={RICHE} />);
  check("page : la page riche se rend, chaque bloc à sa place", ["Chiffres clés", "Journal", "Saisons", "Folio", "Trophées", "Questions répondues"].every((t) => html.includes(t)));
  const sobre = rend(<PageProfil disposition={DISPO_SOBRE} donnees={SOBRE} />);
  check("page : la page par défaut d'un autre, sans place libre visible", !sobre.includes("Ajoute une image") && sobre.includes("Amis"));
  const invite = rend(<PageProfil disposition={[{ k: "vitrine", f: "bande" }, { k: "amis", f: "heros" }]} donnees={SOBRE} libre={<a href="/perso">Ajoute une image</a>} />);
  check("page : sans radar, la place de 4 à côté des amis reçoit l'invitation", invite.includes("Ajoute une image"));
  const vide = rend(<PageProfil disposition={[{ k: "reponses", f: "tuile" }, { k: "trophees", f: "tuile" }, { k: "journal", f: "tuile" }]} donnees={SOBRE} />);
  check("page : une rangée de blocs sans données ne se rend pas", !vide.includes("rangee"));
}

// ── BlocProfil : chaque genre à chaque format permis ──
const MEDIAS: Record<"image" | "gif" | "video", BlocMedia> = {
  image: DISPO_RICHE.find((e) => estMedia(e) && e.id === "image1") as BlocMedia,
  gif: DISPO_RICHE.find((e) => estMedia(e) && e.id === "gif1") as BlocMedia,
  video: DISPO_RICHE.find((e) => estMedia(e) && e.id === "video1") as BlocMedia,
};
const blocDe = (g: GenreBloc, f: Format): Bloc => (g === "image" || g === "gif" || g === "video" ? { ...MEDIAS[g], f } : { k: g, f });
for (const g of Object.keys(FORMATS_PERMIS) as GenreBloc[]) {
  for (const f of FORMATS_PERMIS[g]) {
    for (const [nom, d] of [
      ["riche", RICHE],
      ["sobre", SOBRE],
    ] as const) {
      let html = "";
      let erreur = "";
      try {
        html = rend(<BlocProfil bloc={blocDe(g, f)} f={f} d={d} />);
        rend(<BlocProfil bloc={blocDe(g, f)} f={f} d={d} edition />);
      } catch (e) {
        erreur = String(e);
      }
      const attendu = aDuContenu(blocDe(g, f), d);
      check(`bloc ${g} en ${f} (${nom}) : rendu${attendu ? "" : " (vide)"} sans erreur`, !erreur && (attendu ? html.length > 0 : true), erreur);
    }
  }
}
check("ICONE_BLOC : une icône par genre", (Object.keys(FORMATS_PERMIS) as GenreBloc[]).every((g) => !!ICONE_BLOC[g]));
check("BLOCS : les 9 blocs fixes ont un format par défaut permis", BLOCS.every((x) => FORMATS_PERMIS[x.k].length > 0));

// amis : 6 / 9 / 12
for (const [f, n] of [
  ["tuile", 6],
  ["heros", 9],
  ["bande", 12],
] as const) {
  const html = rend(<BlocProfil bloc={{ k: "amis", f }} f={f} d={RICHE} />);
  check(`amis en ${f} : ${n} amis`, compte(html, 'href="/people/ami-') === n);
  check(`amis en ${f} : au téléphone, 6 au plus`, compte(html, 'class="min-w-0 max-lg:hidden"') === n - 6);
}
{
  const peu = { ...RICHE, amis: { amis: amisExemple(2), total: 2 } };
  const html = rend(<BlocProfil bloc={{ k: "amis", f: "heros" }} f="heros" d={peu} />);
  check("amis : peu d'amis, l'illustration remplit le reste", html.includes("joueurs-seigneurie"));
  const chezMoi = rend(<BlocProfil bloc={{ k: "amis", f: "tuile" }} f="tuile" d={{ ...RICHE, moi: true }} />);
  check("amis : « Gérer mes amis » chez soi seulement", chezMoi.includes("Gérer mes amis") && !rend(<BlocProfil bloc={{ k: "amis", f: "tuile" }} f="tuile" d={RICHE} />).includes("Gérer mes amis"));
  const aucun = rend(<BlocProfil bloc={{ k: "amis", f: "tuile" }} f="tuile" d={{ ...RICHE, amis: { amis: [], total: 0 } }} />);
  check("amis : sans ami, le texte d'avant", aucun.includes("Pas encore d&#x27;amis."));
}

// questions répondues : 3 / 5 sources
{
  const tuile = rend(<BlocProfil bloc={{ k: "reponses", f: "tuile" }} f="tuile" d={RICHE} />);
  const heros = rend(<BlocProfil bloc={{ k: "reponses", f: "heros" }} f="heros" d={RICHE} />);
  check("réponses : 3 sources en tuile, 5 en héros", compte(tuile, "grid-template-columns:112px") === 3 && compte(heros, "grid-template-columns:112px") === 5);
  check("réponses : le repère « 64 % justes »", tuile.includes("64 % justes"));
  const incomplet = rend(<BlocProfil bloc={{ k: "reponses", f: "tuile" }} f="tuile" d={{ ...RICHE, reponses: { ...RICHE.reponses!, incomplet: true } }} />);
  check("réponses : une source illisible le dit", incomplet.includes("Au moins : certaines sources"));
}

// trophées : les 4 paliers, « Par source »
{
  const html = rend(<BlocProfil bloc={{ k: "trophees", f: "tuile" }} f="tuile" d={RICHE} />);
  check("trophées : Diamant en tête, 4 paliers et « Par source »", html.indexOf("Diamant") < html.indexOf("Bronze") && compte(html, "card-soft") === 4 && html.includes("Par source"));
  check("trophées : le total en repère", html.includes(`>${compter(RICHE.trophees!.lignes).total}<`));
  const zero = rend(<BlocProfil bloc={{ k: "trophees", f: "tuile" }} f="tuile" d={{ ...RICHE, trophees: { lignes: [], complet: true } }} />);
  check("trophées : aucun, le texte de la Salle", zero.includes("Aucun trophée pour l&#x27;instant."));
}

// vidéo : l'adresse rendue porte la couverture, l'adresse enregistrée non
{
  const v = MEDIAS.video;
  const html = rend(<BlocProfil bloc={v} f="tuile" d={RICHE} />);
  check("vidéo : l'adresse rendue finit par #t=4", html.includes(`${v.url}#t=4`));
  check("vidéo : l'adresse enregistrée n'a pas de #t=", !v.url.includes("#"));
  const sansCouv = rend(<BlocProfil bloc={{ ...v, couverture: undefined, duree: 24.3 }} f="tuile" d={RICHE} />);
  const avant = rend(<BlocProfil bloc={{ ...v, couverture: undefined, duree: undefined }} f="tuile" d={RICHE} />);
  check("vidéo : sans couverture, le milieu ; sans durée, 1 s", sansCouv.includes("#t=12.15") && avant.includes("#t=1\""));
  const heros = rend(<BlocProfil bloc={{ ...v, f: "heros" }} f="heros" d={RICHE} />);
  check("vidéo en héros : la légende à côté", heros.includes("Vidéo · en boucle, sans le son") && heros.includes("videoCote"));
}

// GIF : jamais agrandi, sans largeur forcée quand sa taille est inconnue
{
  const avec = rend(<BlocProfil bloc={MEDIAS.gif} f="tuile" d={RICHE} />);
  const sans = rend(<BlocProfil bloc={{ ...MEDIAS.gif, px: undefined }} f="tuile" d={RICHE} />);
  check("GIF : 240 px quand sa taille est connue", avec.includes('width="240"') && avec.includes("width:240px"));
  // l'image nette du GIF, sans son adresse (le SVG d'exemple contient lui-même « width »)
  const imgGif = (html: string) => (html.match(/<img[^>]*alt="Quand le sceau tombe."[^>]*>/)?.[0] ?? "").replace(/src="[^"]+"/, "");
  check("GIF : sans px, aucune largeur forcée", imgGif(sans) !== "" && !imgGif(sans).includes("width"), imgGif(sans));
  check("GIF : le fond flouté sous son voile", avec.includes("gifFond") && avec.includes("gifVoile") && avec.includes(GIF_EXEMPLE.slice(0, 30)));
}

// image : le cadrage, la légende seulement si elle existe
{
  const html = rend(<BlocProfil bloc={MEDIAS.image} f="heros" d={RICHE} />);
  check("image : le point focal (y = 88)", html.includes("object-position:50% 88%"));
  check("image : ratio 2/1 en héros", html.includes("--rl:2 / 1"));
  const sansLegende = rend(<BlocProfil bloc={{ ...MEDIAS.image, legende: null }} f="tuile" d={RICHE} />);
  check("image : sans légende, pas de figcaption", !sansLegende.includes("figcaption"));
}

// journal et saisons
{
  const html = rend(<BlocProfil bloc={{ k: "journal", f: "tuile" }} f="tuile" d={RICHE} />);
  check("journal : repère +126 ELO, 3 événements en tuile", html.includes("+126 ELO · 90 j") && compte(html, "<li ") === 3);
  check("journal : la victoire contre un ami, le lien vers l'onglet", html.includes("Victoire contre Hugo P.") && html.includes("onglet=journal"));
  const heros = rend(<BlocProfil bloc={{ k: "journal", f: "heros" }} f="heros" d={RICHE} />);
  check("journal : 4 événements en héros", compte(heros, "<li ") === 4);
  const ed = rend(<BlocProfil bloc={{ k: "journal", f: "tuile" }} f="tuile" d={{ ...RICHE, visibiliteJournal: "friends" }} edition />);
  check("journal : en édition, qui le voit", ed.includes("Visible par : tes amis"));
  const calme = rend(<BlocProfil bloc={{ k: "journal", f: "tuile" }} f="tuile" d={{ ...RICHE, journal: { depart: 1200, points: [], matchs: 0, evenements: [] } }} />);
  check("journal : sans match ni événement, le calme", calme.includes("Aucun match classé sur 90 jours."));
  const saisons = rend(<BlocProfil bloc={{ k: "saisons", f: "bande" }} f="bande" d={RICHE} />);
  check("saisons : la saison en cours, 2 gravées, la place", saisons.includes("Saison 3 · Mai 2027") && saisons.includes("2 gravées") && saisons.includes("5e sur 212"));
}

// aDuContenu : les blocs sans données
{
  const nul: DonneesBlocs = { ...SOBRE, amis: null, reponses: null, trophees: null, progression: null, folio: null, journal: null, saisons: null };
  const sans = ["amis", "reponses", "trophees", "progression", "folio", "journal", "saisons"] as const;
  check("aDuContenu : faux pour chaque bloc sans données", sans.every((k) => !aDuContenu({ k, f: "heros" } as Bloc, nul)));
  check("aDuContenu : vrai pour les chiffres, le radar et les médias", aDuContenu({ k: "vitrine", f: "bande" }, nul) && aDuContenu({ k: "radar", f: "heros" }, nul) && aDuContenu(MEDIAS.image, nul));
  check("aDuContenu : des saisons sans rien (ni en cours, ni gravée) → faux", !aDuContenu({ k: "saisons", f: "tuile" }, { ...nul, saisons: { courante: null, palmares: [] } }));
  const ed = rend(<BlocProfil bloc={{ k: "trophees", f: "tuile" }} f="tuile" d={nul} edition />);
  check("édition : un bloc sans données garde sa coque et le dit", ed.includes("rien à montrer pour l&#x27;instant"));
  const folio = rend(<BlocProfil bloc={{ k: "folio", f: "tuile" }} f="tuile" d={nul} edition />);
  check("édition : le folio sans planche invite à en choisir une", folio.includes("Aucun folio porté") && folio.includes("Mes pièces"));
  check("vue publique : un bloc sans données ne rend rien", rend(<BlocProfil bloc={{ k: "trophees", f: "tuile" }} f="tuile" d={nul} />) === "");
}

// le radar en héros : les libellés « moy » existent encore (sansMoy les masque) ; « Me comparer » chez un autre seulement
{
  const html = rend(<BlocProfil bloc={{ k: "radar", f: "heros" }} f="heros" d={RICHE} />);
  check('radar en héros : des tspan à fill-opacity="0.85" (la règle sansMoy vise encore quelque chose)', html.includes('fill-opacity="0.85"') && html.includes("sansMoy"));
  check("radar en héros : le titre-réponse « FSA en tête »", html.includes("FSA en tête"));
  check("radar : « Me comparer » chez un autre, pas chez soi", html.includes("Me comparer") && !rend(<BlocProfil bloc={{ k: "radar", f: "tuile" }} f="tuile" d={{ ...RICHE, moi: true }} />).includes("Me comparer"));
}

// ── ParSource : la Salle des trophées rend le même balisage qu'avant l'extraction ──
CAS_SALLE.forEach((c, i) => {
  const html = renderToStaticMarkup(<SalleDesTrophees compte={compter(c.lignes)} complet={c.complet} compact={c.compact} moi={c.moi} />);
  const empreinte = createHash("sha256").update(html).digest("hex").slice(0, 24);
  check(`Salle des trophées, cas ${i + 1} : balisage inchangé`, empreinte === REFERENCE_SALLE[i], empreinte);
});

// les genres de la disposition riche sont tous couverts
check("la page riche couvre les 12 genres sauf aucun oubli des fixes", BLOCS.every((x) => DISPO_RICHE.some((e) => e.k === x.k)) && ["image", "gif", "video"].every((g) => DISPO_RICHE.some((e) => e.k !== "libre" && genreDe(e as Bloc) === g)));

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);

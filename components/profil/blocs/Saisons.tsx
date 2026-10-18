import { Hexagon } from "lucide-react";
import { SceauDivision } from "@/components/adn/Sceau";
import { ecartPalier, ecartRang, score, type Ecart } from "@/lib/profil/ecart";
import { hrefOnglet } from "@/lib/profil/onglets";
import { nomPalier, type PalierSaison, type ResultatSaison, type Saisons } from "@/lib/profil/saisons";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import type { Format } from "@/lib/profil/disposition";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_RADAR as R, rang } from "@/lib/voice-blocs-radar";
import { SAISONS, inscriptionSaison } from "@/lib/voice-saisons";
import { Cellule, Chiffre, Coque, DemiBande, Etiquette, Jeton, Lien, Repere, ScoreTuile, Vide, compare, type Ctx } from "./commun";
import sa from "./saisons.module.css";

// Le bloc « Saisons » (spec § 9). Chez un autre : « Saison 3 » (son nom en
// infobulle), son pic de la saison en cours (le sceau de division et le
// palier), ton pic en jeton (« toi Argent I », vert s'il est plus haut) ;
// les saisons gravées en sceaux sans texte, ta place dessous en jeton court
// (« 41e », vert si elle est meilleure que la sienne) ; le score sur la
// saison en cours et les gravées communes. Chez soi : comme avant ; en
// demi-bande, « Saison 3 » / le palier / « pic 1 512 », puis les sceaux et
// sa place. Sans état.

const icone = <Hexagon size={17} aria-hidden />;

/** Un pic, pour comparer : le palier, puis la division (III < II < I ; Top 10 sans division, au sommet de son palier). */
export const rangPic = (p: PalierSaison) => p.palier * 3 + (p.division === "III" ? 0 : p.division === "II" ? 1 : 2);

/** Un sceau de saison, sans pose ni son (le tampon est déjà sur la page). */
function Sceau({ pic, numero, taille, angle = -4, titre }: { pic: PalierSaison; numero: number; taille: number; angle?: number; titre?: string }) {
  const ins = inscriptionSaison(pic, numero);
  return <SceauDivision palier={ins.palier} division={ins.division} sous={ins.sous} ton="pen" taille={taille} angle={angle} pose={false} son={false} title={titre} />;
}

export function SaisonsBloc({ d, f, edition }: Ctx): React.ReactNode {
  const s = d.saisons;
  if (!s || (!s.courante && s.palmares.length === 0)) return edition ? <Vide bloc={{ k: "saisons", f }} f={f} icone={icone} /> : null;
  return d.moi ? saisonsChezSoi(d, s, f) : saisonsChezUnAutre(d, s, f);
}

// ── Chez un autre ─────────────────────────────────────────────────────────

type Gravee = { r: ResultatSaison; e: Ecart | null; bulle: string };

function saisonsChezUnAutre(d: DonneesBlocs, s: Saisons, f: Format): React.ReactNode {
  const { courante: c, palmares } = s;
  const toi = compare(d) ? (d.toi ?? null) : null;
  const ts = toi?.saisons ?? null;
  const sonPic = c?.moi ?? null;
  // ta saison en cours (lue avec ton identifiant : courante.moi, c'est toi)
  const tonPic = ts?.courante && (!c || ts.courante.cle === c.cle) ? ts.courante.moi : null;
  const ePic = sonPic && tonPic ? ecartPalier(rangPic(sonPic.pic), rangPic(tonPic.pic), nomPalier(tonPic.pic)) : null;
  const bullePic = sonPic && tonPic ? R.bullePic(d.nom, nomPalier(sonPic.pic), sonPic.eloPic, nomPalier(tonPic.pic), tonPic.eloPic) : sonPic && toi ? T.pasMesure : undefined;
  const miennes = new Map((ts?.palmares ?? []).map((p) => [p.cle, p]));
  const gravees: Gravee[] = palmares.map((r) => {
    const m = miennes.get(r.cle);
    return { r, e: m ? ecartRang(r.place, m.place) : null, bulle: R.bulleGravee(SAISONS.court(r.numero), nomPalier(r.pic), r.place, r.joueurs, m?.place ?? null) };
  });
  const sc = score([ePic, ...gravees.map((g) => g.e)]);
  // aperçu : « toi – – » si la tuile pourra comparer au moins deux saisons
  const avecScore = d.apercu && !d.toi ? (sonPic ? 1 : 0) + palmares.length >= 2 : !!sc;
  const scoreTuile = avecScore ? <ScoreTuile s={sc} d={d} /> : null;
  const jeton = (taille?: number) => (sonPic && compare(d) ? <Jeton e={ePic} d={d} bulle={bullePic} taille={taille} /> : null);
  const nomSaison = c ? SAISONS.saison(c.numero, c.nom) : undefined;
  const titre = c ? R.saison(c.numero) : T.saisons;

  const grave = (g: Gravee, taille: number, i: number) => (
    <li key={g.r.cle} className={sa.grave}>
      <span className={sa.sceau}>
        <Sceau pic={g.r.pic} numero={g.r.numero} taille={taille} angle={i % 2 ? 3 : -4} titre={g.bulle} />
      </span>
      <Jeton e={g.e} d={d} bulle={g.bulle} forme="court" />
    </li>
  );

  if (f === "demi")
    return (
      <DemiBande
        label={titre}
        dessin={
          gravees.length > 0 ? (
            <ul className={sa.demiGraves} aria-label={SAISONS.palmares}>
              {gravees.slice(0, 8).map((g, i) => grave(g, 28, i))}
            </ul>
          ) : undefined
        }
        droite={scoreTuile ?? undefined}
      >
        <Cellule
          etiquette={<span title={nomSaison}>{titre}</span>}
          chiffre={sonPic ? nomPalier(sonPic.pic) : <span className={sa.pasClassee}>{R.pasClassee}</span>}
          jeton={jeton()}
          titre={bullePic}
        />
      </DemiBande>
    );

  // le chiffre fort : son sceau (32 px) et son palier ; sinon « Pas classée »
  const chiffre = c ? (
    sonPic ? (
      <span className={sa.pic}>
        <span className={sa.sceauPic}>
          <Sceau pic={sonPic.pic} numero={c.numero} taille={32} titre={SAISONS.dit(c.numero, sonPic.pic)} />
        </span>
        <Chiffre f={f} titre={bullePic}>
          {nomPalier(sonPic.pic)}
        </Chiffre>
      </span>
    ) : (
      <span className={sa.pasClassee}>
        <Chiffre f={f}>{R.pasClassee}</Chiffre>
      </span>
    )
  ) : null;
  const etiquette = (
    <div title={nomSaison}>
      <Etiquette f={f} icone={icone} titre={titre} droite={scoreTuile ?? undefined} />
    </div>
  );

  if (f === "colonne")
    return (
      <Coque f={f} label={titre}>
        {etiquette}
        {chiffre && (
          <div className={sa.colonneChiffre}>
            {chiffre}
            {jeton(16)}
          </div>
        )}
        {gravees.length > 0 && (
          <ul className={sa.lignes} aria-label={SAISONS.palmares}>
            {gravees.slice(0, 6).map((g, i) => (
              <li key={g.r.cle} className={sa.ligne} title={g.bulle}>
                <Sceau pic={g.r.pic} numero={g.r.numero} taille={32} angle={i % 2 ? 3 : -4} titre={g.bulle} />
                <span className={sa.mono}>{SAISONS.court(g.r.numero)}</span>
                <span className={sa.mono + " " + sa.doux}>{rang(g.r.place)}</span>
                <Jeton e={g.e} d={d} bulle={g.bulle} forme="court" />
              </li>
            ))}
          </ul>
        )}
        <Lien href={hrefOnglet(d.id, "sceaux")}>{T.sesSaisons}</Lien>
      </Coque>
    );
  if (f === "bande" || f === "heros")
    return (
      <Coque f={f} label={titre}>
        {etiquette}
        <div className={sa.cote}>
          {chiffre && (
            <div className={sa.colonneChiffre}>
              {chiffre}
              {jeton(16)}
            </div>
          )}
          {gravees.length > 0 && (
            <ul className={sa.gravesLigne} aria-label={SAISONS.palmares}>
              {gravees.slice(0, 8).map((g, i) => grave(g, 52, i))}
            </ul>
          )}
        </div>
      </Coque>
    );
  // mini-tuile
  return (
    <Coque f={f} label={titre}>
      {etiquette}
      {chiffre && (
        <div className={sa.ligneChiffre}>
          {chiffre}
          {jeton()}
        </div>
      )}
      {gravees.length > 0 && (
        <ul className={sa.graves} aria-label={SAISONS.palmares}>
          {gravees.slice(0, 3).map((g, i) => grave(g, 44, i))}
        </ul>
      )}
    </Coque>
  );
}

// ── Chez soi : comme avant (l'ancien SaisonsBloc de BlocsProfil.tsx) ───────

function saisonsChezSoi(d: DonneesBlocs, s: Saisons, fmt: Format): React.ReactNode {
  const { courante: c, palmares } = s;
  if (fmt === "demi") {
    const titre = c ? R.saison(c.numero) : T.saisons;
    return (
      <DemiBande
        label={titre}
        dessin={
          palmares.length > 0 ? (
            <ul className={sa.demiGraves} aria-label={SAISONS.palmares}>
              {palmares.slice(0, 8).map((r, i) => {
                const bulle = R.bulleGravee(SAISONS.court(r.numero), nomPalier(r.pic), r.place, r.joueurs, null);
                return (
                  <li key={r.cle} className={sa.grave}>
                    <span className={sa.sceau}>
                      <Sceau pic={r.pic} numero={r.numero} taille={28} angle={i % 2 ? 3 : -4} titre={bulle} />
                    </span>
                    <span className={sa.placeSoi}>{rang(r.place)}</span>
                  </li>
                );
              })}
            </ul>
          ) : undefined
        }
      >
        <Cellule
          etiquette={<span title={c ? SAISONS.saison(c.numero, c.nom) : undefined}>{titre}</span>}
          chiffre={c?.moi ? nomPalier(c.moi.pic) : <span className={sa.pasClassee}>{c ? R.pasClassee : "—"}</span>}
          petit={c?.moi ? R.picElo(c.moi.eloPic) : undefined}
        />
      </DemiBande>
    );
  }
  // la colonne prend la forme de la tuile, comme avant
  const f: Format = fmt === "colonne" ? "tuile" : fmt;
  const gravees = palmares.slice(0, f === "tuile" ? 3 : 8);
  return (
    <Coque f={f} label={T.saisons}>
      <Etiquette f={f} icone={icone} titre={T.saisons} droite={palmares.length > 0 ? <Repere>{T.gravees(palmares.length)}</Repere> : undefined} />
      {c && (
        <p className="m-0 flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{SAISONS.saison(c.numero, c.nom)}</span>
          <span className="t-small">{c.moi ? SAISONS.picEnCours(c.moi.pic, c.moi.eloPic) : SAISONS.sansMatch}</span>
        </p>
      )}
      {gravees.length > 0 && (
        <ul className={"m-0 flex list-none flex-wrap gap-4 p-0 " + (f === "bande" ? "lg:gap-8" : "")}>
          {gravees.map((r, i) => {
            const ins = inscriptionSaison(r.pic, r.numero);
            return (
              <li key={r.cle} className="flex min-w-0 items-center gap-3">
                <span className="block w-[64px] shrink-0">
                  <SceauDivision palier={ins.palier} division={ins.division} sous={ins.sous} ton="pen" taille="remplir" angle={i ? 3 : -4} pose={false} son={false} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13.5px] font-semibold">
                    {SAISONS.court(r.numero)} · {r.nom}
                  </span>
                  <span className="t-micro">
                    {SAISONS.picCourt(r.pic)} · {T.place(r.place, r.joueurs)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Lien href={hrefOnglet(d.id, "sceaux")}>{T.tesSaisons}</Lien>
    </Coque>
  );
}

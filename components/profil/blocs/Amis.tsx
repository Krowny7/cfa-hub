import Link from "next/link";
import { Users } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { Illustration } from "@/components/ui/Illustration";
import { LienJoueur } from "@/components/profil/CarteJoueur";
import { ecartRang } from "@/lib/profil/ecart";
import type { AmiBloc, DonneesBlocs, DonneesVisiteur } from "@/lib/profil/blocs-donnees";
import type { AmiLite } from "@/lib/profil/donnees";
import type { Format } from "@/lib/profil/disposition";
import { nombre } from "@/lib/voice";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_RADAR as R, rang } from "@/lib/voice-blocs-radar";
import { Cellule, Chiffre, Coque, DemiBande, Etiquette, Jeton, Lien, Repere, Vide, compare, maCouleur, type Ctx } from "./commun";
import a from "./amis.module.css";

// Le bloc « Amis » (spec § 3). Chez un autre : son cercle (ses amis, elle
// et toi, par ELO décroissant) ; le chiffre est sa place (« 2e sur 19 »),
// le jeton la tienne (« toi 5e », vert si tu y serais mieux placé) ; elle
// est cernée d'encre, toi à ta couleur avec « toi » dessous, un point
// d'encre sous les amis communs ; les pseudos en infobulle, sauf dans
// l'échelle de la colonne. Chez soi : comme avant (pseudos, « Gérer mes
// amis »), les avatars triés par ELO. Sans état : serveur comme client.

type Membre = AmiLite & { elo: number | null; qui: "lui" | "toi" | "ami"; commun: boolean };

/** son avatar (à ajouter à DonneesBlocs ; d'ici là, son sceau) */
const avatarDe = (d: DonneesBlocs) => (d as DonneesBlocs & { avatarUrl?: string | null }).avatarUrl ?? null;
/** ton profil (`toi.profil`, à ajouter à DonneesVisiteur ; d'ici là : rien) */
const profilDe = (toi: DonneesVisiteur) => (toi as DonneesVisiteur & { profil?: AmiLite | null }).profil ?? null;

/** Par ELO décroissant ; un ELO inconnu passe à la fin (l'ordre reçu gardé). */
const parElo = <M extends { elo?: number | null }>(liste: M[]) =>
  liste
    .map((m, i) => ({ m, i }))
    .sort((x, y) => (y.m.elo ?? -Infinity) - (x.m.elo ?? -Infinity) || x.i - y.i)
    .map((x) => x.m);

/**
 * Les indices gardés, dans l'ordre du classement : la tranche qui contient
 * les ancres (elle, toi) ; si elles sont trop loin l'une de l'autre, les
 * voisins les plus proches de chacune.
 */
export function tranche(n: number, total: number, ancres: number[]): number[] {
  const tout = Array.from({ length: total }, (_, i) => i);
  if (total <= n) return tout;
  const vues = ancres.filter((i) => i >= 0 && i < total);
  if (!vues.length) return tout.slice(0, n);
  const lo = Math.min(...vues);
  const hi = Math.max(...vues);
  if (hi - lo + 1 <= n) {
    // contiguë, élargie autant au-dessus qu'au-dessous (au-dessus d'abord), dans les bornes
    let debut = lo - Math.ceil((n - (hi - lo + 1)) / 2);
    debut = Math.max(0, Math.min(total - n, debut));
    return tout.slice(debut, debut + n);
  }
  const dist = (i: number) => Math.min(...vues.map((j) => Math.abs(i - j)));
  return [...tout].sort((x, y) => dist(x) - dist(y) || x - y).slice(0, n).sort((x, y) => x - y);
}

/** Son cercle : les membres par ELO, où elle est, où tu es, et les places (si on peut les dire). */
function cercleDe(d: DonneesBlocs) {
  const amis = d.amis!;
  const toi = compare(d) ? (d.toi ?? null) : null;
  const mesAmis = new Set(toi?.amis ?? []);
  // un ami commun : seulement face à un visiteur (ni en aperçu, ni sans connexion)
  const estCommun = (x: AmiBloc) => !!toi && (x.commun ?? mesAmis.has(x.id));
  const toiDansLaListe = toi ? amis.amis.find((x) => x.id === toi.id) : undefined;
  const avecElo = typeof d.elo === "number" && amis.amis.some((x) => typeof x.elo === "number");
  const membres: Membre[] = amis.amis
    .filter((x) => !toi || x.id !== toi.id)
    .map((x: AmiBloc) => ({ id: x.id, name: x.name, avatarUrl: x.avatarUrl, elo: x.elo ?? null, qui: "ami" as const, commun: estCommun(x) }));
  if (avecElo) {
    membres.push({ id: d.id, name: d.nom, avatarUrl: avatarDe(d), elo: d.elo ?? null, qui: "lui", commun: false });
    if (toi) {
      const p = toiDansLaListe ?? profilDe(toi);
      membres.push({ id: toi.id, name: p?.name ?? T.toi, avatarUrl: p?.avatarUrl ?? null, elo: toi.elo, qui: "toi", commun: false });
    }
  }
  const tries = avecElo ? parElo(membres) : membres;
  const iLui = tries.findIndex((m) => m.qui === "lui");
  const iToi = tries.findIndex((m) => m.qui === "toi");
  // les places : celles du serveur (tout le cercle), sinon comptées ici si toute la liste est là
  const complet = avecElo && amis.amis.length >= amis.total;
  const c = amis.cercle;
  const place = amis.total < 3 ? null : (c?.lui ?? (complet && iLui >= 0 ? iLui + 1 : null));
  const placeToi = place === null || !toi ? null : c ? c.toi : complet && iToi >= 0 ? iToi + 1 : null;
  const taille = c?.taille ?? tries.length;
  // le rang de chaque ligne (l'échelle) : compté depuis l'ancre la plus proche
  const ancres = [
    [iLui, c?.lui ?? (complet ? iLui + 1 : null)],
    [iToi, c?.toi ?? (complet ? iToi + 1 : null)],
  ].filter((x): x is [number, number] => typeof x[0] === "number" && x[0] >= 0 && typeof x[1] === "number" && x[1] > 0);
  const rangs = tries.map((_, i) => {
    if (!ancres.length) return complet ? i + 1 : null;
    const [j, r] = [...ancres].sort((x, y) => Math.abs(x[0] - i) - Math.abs(y[0] - i))[0];
    return r + (i - j);
  });
  const communs = amis.amis.filter(estCommun).length;
  // son ami : dit par le serveur (tu peux être loin des amis montrés), sinon tu es dans la liste
  const ami = !!toi && (c?.toiAmi ?? (mesAmis.has(d.id) || !!toiDansLaListe));
  return { membres: tries, iLui, iToi, place, placeToi, taille, rangs, communs, toi, ami };
}

/** Un avatar du cercle : elle cernée d'encre, toi à ta couleur (et « toi » dessous), un point sous un ami commun. */
function Visage({ m, taille, d, couleurToi, marque = true }: { m: Membre; taille: number; d: DonneesBlocs; couleurToi: string; marque?: boolean }) {
  const bulle = R.pseudo(m.qui === "toi" ? R.toi : m.name, m.elo);
  const anneau: React.CSSProperties | undefined = m.qui === "lui" ? { boxShadow: "0 0 0 2.5px var(--ink)" } : m.qui === "toi" ? { boxShadow: `0 0 0 2px ${couleurToi}` } : undefined;
  const corps = (
    <span className={a.visage}>
      <span className={a.anneau} style={anneau}>
        <Avatar src={m.avatarUrl} name={m.name} size={taille} userId={m.qui === "ami" && m.id !== d.viewerId ? m.id : null} />
      </span>
      {marque && (
        <span className={a.sous}>
          {m.qui === "toi" ? (
            <span className={a.legende} style={{ color: couleurToi }}>
              {R.toi}
            </span>
          ) : m.commun ? (
            <span className={a.point} aria-hidden />
          ) : null}
        </span>
      )}
    </span>
  );
  if (m.qui === "ami")
    return (
      <LienJoueur id={m.id} nom={m.name} className={a.lien} title={bulle} aria-label={bulle}>
        {corps}
      </LienJoueur>
    );
  return (
    <span role="img" title={bulle} aria-label={bulle} className="inline-flex">
      {corps}
    </span>
  );
}

export function AmisBloc({ d, f, edition }: Ctx): React.ReactNode {
  if (!d.amis) return edition ? <Vide bloc={{ k: "amis", f }} f={f} icone={<Users size={17} aria-hidden />} /> : null;
  return d.moi ? amisChezSoi(d, f) : amisChezUnAutre(d, f);
}

// ── Chez un autre : son cercle ───────────────────────────────────────────

function amisChezUnAutre(d: DonneesBlocs, f: Format): React.ReactNode {
  const amis = d.amis!;
  const cc = cercleDe(d);
  const couleurToi = maCouleur(d);
  const bulle = cc.place !== null ? R.bulleCercle(d.nom, cc.place, cc.placeToi, cc.taille, cc.ami) : undefined;
  const e = cc.toi && cc.place !== null ? ecartRang(cc.place, cc.placeToi) : null;
  // le jeton (aperçu : « toi ± ») ; aucun quand le chiffre est le total (moins de 3 amis)
  const jeton = (taille?: number) => (cc.place !== null && compare(d) ? <Jeton e={e} d={d} bulle={bulle} taille={taille} /> : null);
  const chiffre =
    cc.place !== null ? (
      <>
        {rang(cc.place)}
        <span className={a.sur}>{R.sur(cc.taille)}</span>
      </>
    ) : (
      nombre(amis.total)
    );
  const repere =
    cc.communs > 0 ? (
      <Repere>
        <span className={a.repere} title={R.bulleCommun(cc.communs)}>
          {R.enCommun(cc.communs)}
        </span>
      </Repere>
    ) : undefined;
  const ancres = [cc.iLui, cc.iToi];
  const rangee = (n: number, taille: number, classe: string, tel?: number) => {
    const gardes = tranche(n, cc.membres.length, ancres);
    const auTel = tel ? new Set(tranche(tel, gardes.length, ancres.map((i) => gardes.indexOf(i))).map((k) => gardes[k])) : null;
    return (
      <ul className={classe} aria-label={R.cercle(d.nom)}>
        {gardes.map((i) => {
          const m = cc.membres[i];
          return (
            <li key={m.id} className={auTel && !auTel.has(i) ? a.horsTel : undefined}>
              <Visage m={m} taille={taille} d={d} couleurToi={couleurToi} />
            </li>
          );
        })}
      </ul>
    );
  };

  if (amis.amis.length === 0 && amis.total === 0) {
    if (f === "demi")
      return (
        <DemiBande label={T.amis}>
          <Cellule etiquette={T.amis} chiffre="0" petit={T.sansAmi} />
        </DemiBande>
      );
    return (
      <Coque f={f} label={T.amis}>
        <Etiquette f={f} icone={<Users size={17} aria-hidden />} titre={T.amis} />
        <p className="t-small m-0">{T.sansAmi}</p>
      </Coque>
    );
  }

  if (f === "demi")
    return (
      <DemiBande label={T.amis} dessin={rangee(14, 32, a.demiRangee, 8)} droite={repere}>
        <Cellule etiquette={T.amis} chiffre={chiffre} jeton={jeton()} titre={bulle} />
      </DemiBande>
    );

  const tete = (
    <div className={a.ligneChiffre}>
      <Chiffre f={f} titre={bulle}>
        {chiffre}
      </Chiffre>
      {jeton(f === "heros" || f === "bande" ? 16 : undefined)}
    </div>
  );
  const etiquette = <Etiquette f={f} icone={<Users size={17} aria-hidden />} titre={T.amis} droite={repere} />;

  if (f === "colonne")
    return (
      <Coque f={f} label={T.amis}>
        {etiquette}
        {tete}
        <Echelle d={d} cc={cc} couleurToi={couleurToi} />
      </Coque>
    );
  if (f === "heros" || f === "bande")
    return (
      <Coque f={f} label={T.amis}>
        {etiquette}
        <div className={a.cote}>
          <div className="flex min-w-0 flex-col gap-1">
            <Chiffre f={f} titre={bulle}>
              {chiffre}
            </Chiffre>
            {jeton(16)}
          </div>
          {f === "heros" ? rangee(9, 40, a.grille3) : rangee(12, 36, a.rangeeLigne)}
        </div>
      </Coque>
    );
  // mini-tuile
  return (
    <Coque f={f} label={T.amis}>
      {etiquette}
      {tete}
      {rangee(6, 28, a.rangee)}
    </Coque>
  );
}

/** L'échelle de la colonne : 10 lignes au plus (rang, avatar, pseudo, ELO) ; sa ligne en gras, la tienne d'un filet à ta couleur ; « … » sur un saut. */
function Echelle({ d, cc, couleurToi }: { d: DonneesBlocs; cc: ReturnType<typeof cercleDe>; couleurToi: string }) {
  const n = cc.membres.length;
  let gardes = tranche(10, n, [cc.iLui, cc.iToi]);
  // toi trop loin : sa tranche à elle, « … », puis ta ligne
  if (cc.iToi >= 0 && cc.iLui >= 0 && Math.abs(cc.iToi - cc.iLui) >= 10) gardes = [...tranche(9, n, [cc.iLui]), cc.iToi].sort((x, y) => x - y);
  const lignes: React.ReactNode[] = [];
  gardes.forEach((i, k) => {
    const m = cc.membres[i];
    const prec = k > 0 ? gardes[k - 1] : null;
    const ri = cc.rangs[i];
    const rp = prec !== null ? cc.rangs[prec] : null;
    const saut = prec !== null && (i !== prec + 1 || (ri !== null && rp !== null && ri > rp + 1));
    if (saut)
      lignes.push(
        <li key={`saut-${i}`} className={a.saut} aria-hidden>
          {R.saut}
        </li>,
      );
    const nom = m.qui === "toi" ? R.toi : m.name;
    lignes.push(
      <li key={m.id} className={a.ligne + (m.qui === "lui" ? " " + a.lui : "")} style={m.qui === "toi" ? { boxShadow: `inset 2px 0 0 ${couleurToi}` } : undefined}>
        <span className={a.mono}>{ri === null ? "·" : rang(ri)}</span>
        <span className={a.avatarPetit} style={m.qui === "lui" ? { boxShadow: "0 0 0 2px var(--ink)" } : m.qui === "toi" ? { boxShadow: `0 0 0 1.5px ${couleurToi}` } : undefined}>
          <Avatar src={m.avatarUrl} name={m.name} size={24} userId={m.qui === "ami" && m.id !== d.viewerId ? m.id : null} />
        </span>
        <span className={a.pseudo}>
          {m.qui === "ami" ? (
            <LienJoueur id={m.id} nom={m.name} className="ink-link">
              {nom}
            </LienJoueur>
          ) : (
            <span>{nom}</span>
          )}
          {m.commun && <span className={a.point} title={R.amiCommun} aria-label={R.amiCommun} />}
        </span>
        <span className={a.mono}>{m.elo === null ? "—" : nombre(m.elo)}</span>
      </li>,
    );
  });
  return (
    <ol className={a.echelle} aria-label={R.cercle(d.nom)}>
      {lignes}
    </ol>
  );
}

// ── Chez soi : comme avant, les avatars triés par ELO ─────────────────────

function amisChezSoi(d: DonneesBlocs, fmt: Format): React.ReactNode {
  const amis = d.amis!;
  const tries = parElo(amis.amis);
  if (fmt === "demi") {
    const gerer = (
      <Link href="/people?view=amis" className="ink-link font-semibold">
        {R.gerer}
      </Link>
    );
    const liste = tries.slice(0, 14);
    return (
      <DemiBande
        label={T.amis}
        dessin={
          liste.length ? (
            <ul className={a.demiRangee} aria-label={R.tesAmis}>
              {liste.map((x, i) => (
                <li key={x.id} className={i >= 8 ? a.horsTel : undefined}>
                  <LienJoueur id={x.id} nom={x.name} className={a.lien} title={R.pseudo(x.name, x.elo)} aria-label={R.pseudo(x.name, x.elo)}>
                    <Avatar src={x.avatarUrl} name={x.name} size={32} userId={x.id === d.viewerId ? null : x.id} />
                  </LienJoueur>
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-small m-0">{T.sansAmiMoi}</p>
          )
        }
      >
        <Cellule etiquette={T.amis} chiffre={nombre(amis.total)} petit={gerer} />
      </DemiBande>
    );
  }
  // la colonne prend la forme de la tuile, comme avant
  const f: Format = fmt === "colonne" ? "tuile" : fmt;
  const n = { tuile: 6, colonne: 6, heros: 9, bande: 12, demi: 14 }[f];
  const liste = tries.slice(0, n);
  return (
    <Coque f={f} label={T.amis}>
      <Etiquette f={f} icone={<Users size={17} aria-hidden />} titre={T.amis} droite={amis.total > 0 ? <Repere>{nombre(amis.total)}</Repere> : undefined} />
      {liste.length === 0 ? (
        <p className="t-small m-0">{T.sansAmiMoi}</p>
      ) : (
        <ul className={"m-0 list-none p-0 " + a.amis + " " + (f === "heros" ? a.amisHeros : f === "bande" ? a.amisBande : "")}>
          {liste.map((x, i) => (
            // téléphone : 6 au plus
            <li key={x.id} className={"min-w-0 " + (i >= 6 ? "max-lg:hidden" : "")}>
              <LienJoueur id={x.id} nom={x.name} className={(f === "tuile" ? "bg-surface " : "card-quiet ") + "rl-lift flex min-w-0 items-center gap-2.5 rounded-[14px] p-2.5"}>
                <Avatar src={x.avatarUrl} name={x.name} size={32} userId={x.id === d.viewerId ? null : x.id} />
                <span className="truncate text-[13.5px] font-semibold">{x.name}</span>
              </LienJoueur>
            </li>
          ))}
        </ul>
      )}
      {/* peu d'amis : la place de la Seigneurie absorbe le reste de la hauteur (pas de trou) */}
      {liste.length < n && (
        <div className="relative flex-1 overflow-hidden rounded-[14px] border border-line max-lg:hidden" style={{ minHeight: 96 }} aria-hidden>
          <div className="absolute inset-0">
            <Illustration nom="joueurs-seigneurie" position="50% 55%" decorative />
          </div>
        </div>
      )}
      <Lien href="/people?view=amis">{T.gererAmis}</Lien>
    </Coque>
  );
}

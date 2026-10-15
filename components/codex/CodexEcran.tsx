"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { PALETTES, styleDePalette } from "@/lib/palettes";
import { devoileLite } from "@/lib/codex/devoile-lite";
import type { LigneQuete, VueActe, VueBranche, VueChaine, VueCodex, VueContrat } from "@/lib/codex/vue";
import { CODEX, romain } from "@/lib/voice-codex";
import { codexChangerContrat, codexReclamer, codexToutMontrer } from "@/lib/codex/actions";
import { Sceau, libelleSceau } from "@/components/codex/Sceau";
import { DetailQuete } from "@/components/codex/DetailQuete";
import { annoncerDevoile } from "@/components/codex/annoncer";
import s from "./Codex.module.css";

// L'écran du Codex (/codex) : une carte façon carnet de Léonard. Dans l'ordre :
// l'en-tête (la phase, la réplique du moment), LA prochaine quête, la trame
// (les actes comme chapitres), les contrats du jour et de la semaine, les
// branches de matière (dix chemins), le long cours, les exploits. Chaque quête
// est un sceau à tamponner ; un clic ouvre son détail. Sur téléphone, des
// chemins verticaux ; sur ordinateur, une frise d'actes et dix colonnes.
// Les familles pas encore dévoilées (nouveau compte) montrent une page blanche.
// `demo` : aperçus (aucune action serveur).

type Props = { vue: VueCodex; demo?: boolean };

const nomMatiere = (vue: VueCodex, key?: string) => (key ? vue.branches.find((b) => b.contenu.key === key)?.contenu.nom : undefined);
const jour = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

/* ------------------------------------------------------------------ */
/* Une quête, en ligne                                                 */
/* ------------------------------------------------------------------ */

function LigneQ({ l, onOuvrir, sous }: { l: LigneQuete; onOuvrir: (l: LigneQuete) => void; sous?: string }) {
  const enigme = l.affichage === "indice" && l.etat !== "terminee";
  const dim = l.etat === "verrouillee";
  const ligne =
    sous ??
    (enigme
      ? l.indice
      : l.etat === "terminee"
        ? l.termineeLe
          ? `${l.retro ? "Avant le " : "Le "}${jour(l.termineeLe)}${l.xp ? ` · +${l.xp} XP` : ""}`
          : l.xp
            ? `+${l.xp} XP`
            : undefined
        : l.etat === "active" && l.cible > 1
          ? `${Math.floor(l.valeur).toLocaleString("fr-FR")} / ${Math.floor(l.cible).toLocaleString("fr-FR")}`
          : l.consigne);
  return (
    <button type="button" className={s.quete} onClick={() => onOuvrir(l)} aria-label={libelleSceau(l)} aria-haspopup="dialog">
      <Sceau l={l} />
      <span className={s.queteTexte}>
        <span className={s.queteTitre + (dim ? " " + s.dim : "")} style={{ display: "block" }}>
          {enigme ? CODEX.exploits.enigme : l.titre}
          {l.optionnelle && <span className="t-micro ml-1.5 font-normal">({CODEX.trame.bonus})</span>}
        </span>
        {ligne && <span className={s.queteLigne} style={{ display: "block" }}>{ligne}</span>}
        {l.etat === "active" && l.cible > 1 && (
          <span className={s.barre} style={{ display: "block" }} aria-hidden>
            <span style={{ width: `${Math.round(l.fraction * 100)}%` }} />
          </span>
        )}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* La prochaine quête                                                  */
/* ------------------------------------------------------------------ */

function Prochaine({ vue, onOuvrir }: { vue: VueCodex; onOuvrir: (l: LigneQuete) => void }) {
  const p = vue.prochaine;
  if (!p) {
    return (
      <section aria-label={CODEX.prochaine.eyebrow} data-leonard="prochaine" className="card-quiet p-6">
        <p className="t-eyebrow m-0">{CODEX.prochaine.eyebrow}</p>
        <p className="t-body m-0 mt-2">{CODEX.prochaine.rien}</p>
      </section>
    );
  }
  const l = p.ligne;
  return (
    <section aria-label={CODEX.prochaine.eyebrow} data-leonard="prochaine" className="card-hero rl-in overflow-hidden" style={{ padding: 0 }}>
      <div className={s.prochaine}>
        <span className={s.prochaineSceau} aria-hidden>
          <Sceau l={l} taille={72} />
        </span>
        <div className="min-w-0">
          <p className="t-eyebrow m-0">
            {CODEX.prochaine.eyebrow}
            {l.duree ? ` · ${CODEX.prochaine.minutes(l.duree)}` : ""}
          </p>
          <h2 className={s.prochaineTitre}>{l.titre}</h2>
          <p className={s.pourquoi}>{p.pourquoi}</p>
          {l.cible > 1 && l.etat === "active" && (
            <div className="mt-3 flex max-w-[420px] items-center gap-3">
              <span className={s.barre} style={{ flex: 1, marginTop: 0 }} role="progressbar" aria-valuemin={0} aria-valuemax={Math.round(l.cible)} aria-valuenow={Math.floor(l.valeur)} aria-label={CODEX.prochaine.entamee}>
                <span style={{ width: `${Math.round(l.fraction * 100)}%` }} />
              </span>
              <span className="font-mono text-[13px] tabular-nums text-muted">
                {Math.floor(l.valeur)}/{Math.floor(l.cible)}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {l.lien ? (
            <Link href={l.lien} className="btn btn-primary btn-lg rl-press w-full sm:w-auto">
              {CODEX.prochaine.aller} <ArrowRight size={17} aria-hidden />
            </Link>
          ) : (
            <button type="button" className="btn btn-primary btn-lg rl-press w-full sm:w-auto" onClick={() => onOuvrir(l)}>
              {CODEX.prochaine.aller} <ArrowRight size={17} aria-hidden />
            </button>
          )}
          <button type="button" className={s.lien} onClick={() => onOuvrir(l)}>
            Le détail
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* La trame : les actes comme chapitres                                */
/* ------------------------------------------------------------------ */

const etiquetteActe = (a: VueActe["acte"]) => (a.numero === 0 ? "Prologue" : a.numero >= 99 ? "Épilogue" : `Acte ${romain(a.numero)}`);
const chiffreActe = (a: VueActe["acte"]) => (a.numero === 0 ? "P" : a.numero >= 99 ? "É" : romain(a.numero));

function Trame({ actes, onOuvrir }: { actes: VueActe[]; onOuvrir: (l: LigneQuete) => void }) {
  const depart = actes.find((a) => a.courant) ?? actes.filter((a) => a.clos).at(-1) ?? actes[0];
  const [ouverts, setOuverts] = useState<string[]>(depart ? [depart.acte.id] : []);
  const basculer = (id: string) => setOuverts((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  return (
    <section aria-labelledby="codex-trame" className="rl-section flex flex-col gap-4" data-leonard="trame">
      <div>
        <h2 id="codex-trame" className="t-h2 m-0">
          {CODEX.trame.titre}
        </h2>
        <p className="t-small m-0 mt-1">{CODEX.trame.sous}</p>
      </div>
      <div className={s.frise} role="list" aria-label="Les actes">
        {actes.map((a) => (
          <button key={a.acte.id} type="button" role="listitem" onClick={() => basculer(a.acte.id)} className={s.friseNoeud + (a.clos ? " " + s.clos : "") + (a.courant ? " " + s.courant : "")} aria-label={`${etiquetteActe(a.acte)}, ${a.acte.titre}`}>
            <span className={s.numeral}>{chiffreActe(a.acte)}</span>
            <span className="max-w-[110px] truncate">{a.acte.titre}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {actes.map((a) => {
          const ouvert = ouverts.includes(a.acte.id);
          const etat = a.clos ? CODEX.trame.clos : a.courant ? CODEX.trame.enCours : CODEX.trame.aVenir;
          return (
            <article key={a.acte.id} className={s.acte + (a.courant ? " " + s.acteCourant : "") + (a.clos ? " " + s.acteClos : "") + (!a.clos && !a.courant ? " " + s.acteAvenir : "")}>
              <h3 className="m-0">
                <button type="button" className={s.acteTete} aria-expanded={ouvert} aria-controls={`acte-${a.acte.id}`} onClick={() => basculer(a.acte.id)}>
                  <span className={s.numeral}>{chiffreActe(a.acte)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="t-eyebrow block">
                      {etiquetteActe(a.acte)} · {etat}
                    </span>
                    <span className="mt-0.5 block text-[16.5px] font-bold leading-tight tracking-[-0.015em] [overflow-wrap:anywhere]">{a.acte.titre}</span>
                  </span>
                  <span className="font-mono text-[12.5px] tabular-nums text-muted">
                    {a.faites}/{a.total}
                  </span>
                  <ChevronDown size={18} aria-hidden className={s.chevron + (ouvert ? " " + s.haut : "")} style={{ marginLeft: 0 }} />
                </button>
              </h3>
              {ouvert && (
                <div id={`acte-${a.acte.id}`} className="px-3 pb-4 sm:px-4">
                  <div className="px-2 pb-3 pt-1">
                    <p className="t-small m-0 italic">{a.acte.sousTitre}</p>
                    <p className={s.replique + " mt-2"}>« {a.replique.texte} »</p>
                    <p className="t-micro m-0 mt-2">{a.acte.but}</p>
                  </div>
                  <ul className={s.chemin + " " + s.queteGrille}>
                    {a.quetes
                      .filter((q) => q.affichage !== "cache")
                      .map((q) => (
                        <li key={q.id + q.periode} className={q.etat === "terminee" ? s.fait : undefined}>
                          <LigneQ l={q} onOuvrir={onOuvrir} />
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Les contrats                                                        */
/* ------------------------------------------------------------------ */

function Contrats({ vue, onOuvrir, changer, occupe }: { vue: VueCodex; onOuvrir: (l: LigneQuete) => void; changer: (c: VueContrat) => void; occupe: boolean }) {
  return (
    <section aria-labelledby="codex-contrats" className="rl-section flex flex-col gap-4" data-leonard="contrats">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="codex-contrats" className="t-h2 m-0">
          {CODEX.contrats.titre}
        </h2>
        <p className="t-small m-0">{CODEX.contrats.sous}</p>
      </div>
      {vue.contrats.length === 0 ? (
        <p className={s.blanche}>Les contrats d'aujourd'hui se tirent à la première visite du jour. Reviens dans un instant.</p>
      ) : (
        <div className={s.contrats}>
          {vue.contrats.map((c) => (
            <div key={c.emplacement} className={s.contrat}>
              <p className={s.contratEtiquette}>{CODEX.contrats.emplacement[c.emplacement]}</p>
              <LigneQ l={c.ligne} onOuvrir={onOuvrir} sous={c.ligne.etat === "terminee" ? undefined : c.ligne.consigne} />
              <div className={s.contratPied}>
                <span className="t-micro">{c.ligne.duree ? CODEX.prochaine.minutes(c.ligne.duree) : ""}</span>
                {c.ligne.etat !== "terminee" && (
                  <button type="button" className={s.lien} disabled={!c.changeable || occupe} onClick={() => changer(c)} title={c.changeable ? CODEX.contrats.changerAide : CODEX.contrats.changeDeja}>
                    {CODEX.contrats.changer}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {vue.contrats.length > 0 && (
        <p className="t-small m-0" aria-live="polite">
          {vue.trio.fait ? CODEX.contrats.trioFait(vue.trio.xp) : `${CODEX.contrats.trio(vue.trio.xp)} (${vue.trio.faits}/${vue.trio.total})`}
        </p>
      )}
      {vue.hebdo.length > 0 && (
        <div className="card-quiet p-3 sm:p-4">
          <p className="t-eyebrow m-0 mb-1 px-2">{CODEX.contrats.semaine}</p>
          <ul className="m-0 grid list-none gap-x-4 p-0 md:grid-cols-2">
            {vue.hebdo.map((h) => (
              <li key={h.id + h.periode}>
                <LigneQ l={h} onOuvrir={onOuvrir} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Les branches de matière                                             */
/* ------------------------------------------------------------------ */

function Branche({ b, onOuvrir, ouverte, basculer }: { b: VueBranche; onOuvrir: (l: LigneQuete) => void; ouverte: boolean; basculer: () => void }) {
  const fraction = b.total ? b.faites / b.total : 0;
  return (
    <div className={s.col + (b.maitre ? " " + s.maitre : "")}>
      <button type="button" className={s.colTete} aria-expanded={ouverte} onClick={basculer}>
        <span className="min-w-0 flex-1 md:flex-none">
          <span className="block text-[14px] font-bold leading-tight tracking-[-0.01em] md:text-[12.5px]">{b.contenu.court}</span>
          <span className="t-micro block md:hidden">{b.contenu.nom}</span>
        </span>
        <span className="flex items-center gap-2 md:w-full md:flex-col md:gap-1">
          <span className={s.barre + " w-16 md:w-[70%]"} style={{ marginTop: 0 }} aria-hidden>
            <span style={{ width: `${Math.round(fraction * 100)}%` }} />
          </span>
          <span className="font-mono text-[11.5px] tabular-nums text-muted">
            {b.faites}/{b.total}
          </span>
        </span>
        <ChevronDown size={18} aria-hidden className={s.chevron + (ouverte ? " " + s.haut : "")} />
      </button>
      <div className={s.colCorps + (ouverte ? "" : " " + s.ferme)}>
        <ul className={s.etapes}>
          {b.etapes
            .filter((e) => e.affichage !== "cache")
            .map((e) => (
              <li key={e.id} className={s.etape + (e.etat === "terminee" ? " " + s.fait : "")}>
                <button type="button" className={s.mini} onClick={() => onOuvrir(e)} aria-label={libelleSceau(e)} aria-haspopup="dialog">
                  <Sceau l={e} taille={40} />
                  <span className={s.miniNom + (e.etat === "verrouillee" ? " " + s.dim : "")}>{e.etape ? CODEX.branches.etapes[e.etape] : e.titre}</span>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

function Branches({ branches, onOuvrir }: { branches: VueBranche[]; onOuvrir: (l: LigneQuete) => void }) {
  // téléphone : tout est replié sauf la branche la plus avancée qui n'est pas finie ; ordinateur : tout est déplié (CSS)
  const depart = useMemo(() => {
    const entamees = branches.filter((b) => b.faites > 0 && b.faites < b.total).sort((a, c) => c.faites / c.total - a.faites / a.total);
    return entamees[0]?.contenu.key ?? branches[0]?.contenu.key;
  }, [branches]);
  const [ouvertes, setOuvertes] = useState<string[]>(depart ? [depart] : []);
  const basculer = (k: string) => setOuvertes((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]));
  return (
    <section aria-labelledby="codex-branches" className="rl-section flex flex-col gap-4" data-leonard="branches">
      <div>
        <h2 id="codex-branches" className="t-h2 m-0">
          {CODEX.branches.titre}
        </h2>
        <p className="t-small m-0 mt-1">{CODEX.branches.sous}</p>
      </div>
      <div className={s.branches}>
        {branches.map((b) => (
          <Branche key={b.contenu.key} b={b} onOuvrir={onOuvrir} ouverte={ouvertes.includes(b.contenu.key)} basculer={() => basculer(b.contenu.key)} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Le long cours                                                       */
/* ------------------------------------------------------------------ */

function LongCours({ chaines, onOuvrir }: { chaines: VueChaine[]; onOuvrir: (l: LigneQuete) => void }) {
  return (
    <section aria-labelledby="codex-longcours" className="rl-section flex flex-col gap-4" data-leonard="longcours">
      <div>
        <h2 id="codex-longcours" className="t-h2 m-0">
          {CODEX.longCours.titre}
        </h2>
        <p className="t-small m-0 mt-1">{CODEX.longCours.sous}</p>
      </div>
      <div className={s.chaines}>
        {chaines.map((c) => {
          const n = c.paliers.length;
          return (
            <article key={c.chaine.id} className="card p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="m-0 text-[16px] font-bold tracking-[-0.012em]">{c.chaine.titre}</h3>
                <span className="font-mono text-[12px] tabular-nums text-muted">
                  {c.faits}/{n}
                </span>
              </div>
              <p className="t-small m-0 mt-1">{c.chaine.pourquoi}</p>
              <ol className={s.paliers} aria-label={CODEX.longCours.palier(Math.min(c.faits + 1, n), n)}>
                {c.paliers.map((p) => (
                  <li key={p.id} className={p.etat === "terminee" ? s.ok : p.etat === "active" ? s.cours : undefined} />
                ))}
              </ol>
              <div className="mt-2">
                {c.courant ? (
                  <LigneQ l={c.courant} onOuvrir={onOuvrir} />
                ) : (
                  <p className="t-small m-0 px-2 py-2">{CODEX.longCours.fini}</p>
                )}
                {c.suivant && <p className="t-micro m-0 px-2">{CODEX.longCours.suivant} : {c.suivant.titre}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Les exploits                                                        */
/* ------------------------------------------------------------------ */

function Exploits({ exploits, onOuvrir }: { exploits: LigneQuete[]; onOuvrir: (l: LigneQuete) => void }) {
  const gagnes = exploits.filter((e) => e.etat === "terminee").length;
  return (
    <section aria-labelledby="codex-exploits" className="rl-section flex flex-col gap-4" data-leonard="exploits">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="codex-exploits" className="t-h2 m-0">
          {CODEX.exploits.titre}
        </h2>
        <p className="t-small m-0">{CODEX.exploits.sous}</p>
        <span className="t-micro ml-auto">{CODEX.exploits.gagnes(gagnes)}</span>
      </div>
      <ul className={"card p-3 sm:p-4 " + s.exploits} style={{ margin: 0, listStyle: "none" }}>
        {exploits.map((e) => (
          <li key={e.id + e.periode}>
            <LigneQ l={e} onOuvrir={onOuvrir} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* L'écran                                                             */
/* ------------------------------------------------------------------ */

export function CodexEcran({ vue: depart, demo = false }: Props) {
  const [vue, setVue] = useState(depart);
  const [ouverte, setOuverte] = useState<LigneQuete | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, demarrer] = useTransition();
  const ouvrir = useCallback((l: LigneQuete) => setOuverte(l), []);
  const fermer = useCallback(() => setOuverte(null), []);

  const d = vue.devoile?.devoile ?? "tout";
  const montre = (quoi: string) => devoileLite(d, quoi);
  const palette = PALETTES.carnet;

  const toutMontrer = () =>
    demarrer(async () => {
      if (demo) {
        setVue((v) => ({ ...v, devoile: v.devoile ? { ...v.devoile, devoile: "tout" } : v.devoile }));
        return;
      }
      const r = await codexToutMontrer();
      if (r.ok) {
        setVue((v) => ({ ...v, devoile: v.devoile ? { ...v.devoile, devoile: "tout" } : v.devoile }));
        annoncerDevoile("tout");
      } else setMessage("Impossible de tout montrer pour l'instant.");
    });

  const changer = (c: VueContrat) =>
    demarrer(async () => {
      setMessage(null);
      if (demo) return;
      const r = await codexChangerContrat(c.emplacement);
      if (r.ok) setVue(r.vue);
      else setMessage(r.raison === "refus" ? CODEX.contrats.changeDeja : "Pas d'autre contrat à te proposer pour l'instant.");
    });

  const reclamer = async (l: LigneQuete): Promise<string | null> => {
    if (demo) return CODEX.detail.reclame;
    const r = await codexReclamer(l.id, l.periode);
    return r.ok ? CODEX.detail.reclame : "La récompense n'a pas pu être versée. Réessaie dans un instant.";
  };

  const aToutMontrer = d !== "tout";
  const jourJ = vue.joursAvant !== null ? CODEX.jourJ(vue.joursAvant) : null;

  return (
    <div className={`rl-wide rl-page ${s.page}`} style={styleDePalette(palette)}>
      <header className={s.entete + " rl-encre rl-in"} data-palette={palette.key} style={styleDePalette(palette)}>
        <div className={s.enteteContenu}>
          <div className="flex min-w-0 flex-col gap-3">
            <p className="t-eyebrow m-0" style={{ color: "rgba(255,255,255,.78)" }}>
              {CODEX.kicker(vue.phaseNom)}
              {jourJ ? ` · ${jourJ}` : ""}
            </p>
            <h1 className={s.enteteTitre}>{CODEX.titre}</h1>
            <p className={s.enteteStats}>
              <span>
                <b>{vue.stats.faites}</b> / {vue.stats.total} quêtes
              </span>
              <span>
                <b>{vue.stats.xpCodex.toLocaleString("fr-FR")}</b> XP gagnés ici
              </span>
              <span>niveau {vue.niveau}</span>
            </p>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-3">
            <p className={s.enteteReplique}>« {vue.phaseReplique} »</p>
            {aToutMontrer && (
              <button type="button" className={s.boutonClair} onClick={toutMontrer} disabled={occupe} title={CODEX.toutMontrerAide}>
                {CODEX.toutMontrer}
              </button>
            )}
          </div>
        </div>
      </header>

      {message && (
        <p role="status" className="card-quiet t-small p-3">
          {message}
        </p>
      )}

      <Prochaine vue={vue} onOuvrir={ouvrir} />
      <Trame actes={vue.trame} onOuvrir={ouvrir} />

      {montre("codex:contrats") ? <Contrats vue={vue} onOuvrir={ouvrir} changer={changer} occupe={occupe} /> : <Blanche titre={CODEX.contrats.titre} />}
      {montre("codex:branches") ? <Branches branches={vue.branches} onOuvrir={ouvrir} /> : <Blanche titre={CODEX.branches.titre} />}
      {montre("codex:longcours") ? <LongCours chaines={vue.longCours} onOuvrir={ouvrir} /> : <Blanche titre={CODEX.longCours.titre} />}
      {montre("codex:exploits") ? <Exploits exploits={vue.exploits} onOuvrir={ouvrir} /> : <Blanche titre={CODEX.exploits.titre} />}

      {ouverte && <DetailQuete l={ouverte} nomMatiere={nomMatiere(vue, ouverte.matiere)} onClose={fermer} reclamer={reclamer} />}
    </div>
  );
}

function Blanche({ titre }: { titre: string }) {
  return (
    <section className="rl-section flex flex-col gap-3">
      <h2 className="t-h2 m-0" style={{ color: "var(--ink-3)" }}>
        {titre}
      </h2>
      <p className={s.blanche}>{CODEX.pageBlanche}</p>
    </section>
  );
}

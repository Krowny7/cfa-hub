import Link from "next/link";
import { BookOpen, X } from "lucide-react";
import { Bouton } from "@/components/moi/synthese/Encre";
import { Piste } from "@/components/moi/synthese/graphes/Piste";
import { SEUIL_ACQUIS, SEUIL_BAS, pc, texteResume, type Comparaison, type Ensemble, type FicheMatiere } from "@/components/moi/synthese/modele";
import { SYN } from "@/lib/voice-moi";
import s from "@/components/moi/synthese/Synthese.module.css";

// Les deux faces du panneau de « Tes matières » : la vue d'ensemble (par défaut)
// et la fiche de la matière choisie. Présentation pure, sans hook : l'îlot
// TesMatieres tient l'état et passe ce que modele.ts a calculé. Le seul bouton
// d'encre du panneau est « Réviser X » de la fiche ; « Ouvrir X » reste un
// bouton à contour. Les réponses de la période (activite_depuis) restent en
// petit et en gris : un détail, jamais un bloc de plus.

const TON = { pos: s.pos, neg: s.neg, nul: s.nul } as const;
const classes = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function VueEnsemble({ e, comp, avecNotions, avecEvolution, onOuvrir }: { e: Ensemble; comp: Comparaison | null; avecNotions: boolean; avecEvolution: boolean; onOuvrir: (i: number) => void }) {
  const T = SYN.matieres.ensemble;
  return (
    <div className={s.ensGrille}>
      <div className={s.ensGauche}>
        <p className={s.eyebrow}>{T.kicker}</p>
        <p className={s.ensGlobale}>
          <b className="font-brand" aria-label={T.globaleAria(pc(e.globale))}>
            {pc(e.globale)}
          </b>
          <span>
            {T.globale[0]}
            <br />
            {T.globale[1]}
          </span>
        </p>
        {e.avant && (
          <p className={s.ensAvant}>
            <span>{SYN.matieres.legende.avant(e.avant.j)} :</span> <b className={s.mono}>{pc(e.avant.pct)}</b> <span className={TON[e.avant.ton]}>{e.avant.points}</span>
            {e.avant.reponses && <span className={s.nbRep}>{e.avant.reponses}</span>}
          </p>
        )}
        <ul className={s.kvl}>
          <li>
            <i className={classes(s.sw, s.swE)} />
            <span>{T.zones.haute(SEUIL_ACQUIS)}</span>
            <b>{T.surTotal(e.haute, e.total)}</b>
          </li>
          <li>
            <i className={classes(s.sw, s.swA)} />
            <span>{T.zones.moyenne(SEUIL_BAS, SEUIL_ACQUIS)}</span>
            <b>{T.surTotal(e.moyenne, e.total)}</b>
          </li>
          <li>
            <i className={classes(s.sw, s.swR)} />
            <span>{T.zones.basse(SEUIL_BAS)}</span>
            <b>{T.surTotal(e.basse, e.total)}</b>
          </li>
          {e.nonMesurees > 0 && (
            <li>
              <i className={classes(s.sw, s.swN)} />
              <span>{T.zones.aucune}</span>
              <b>{T.surTotal(e.nonMesurees, e.total)}</b>
            </li>
          )}
          {e.hausse && comp !== null && (
            <li>
              <i className={classes(s.trace, s.traceCmp, s.traceCourte)} />
              <span>{T.hausse(comp)}</span>
              <b>{T.surTotal(e.hausse.n, e.hausse.sur)}</b>
            </li>
          )}
        </ul>
        {e.fort && (
          <p className={s.ensForts}>
            {T.plusForte} <b>{`${e.fort.court} · ${e.fort.valeur}`}</b>
            {e.faible && (
              <>
                <br />
                {T.plusFaible} <b>{`${e.faible.court} · ${e.faible.valeur}`}</b>
              </>
            )}
          </p>
        )}
        {e.faible && (
          <button type="button" className={classes(s.contour, s.contourPetit, s.ensAction)} onClick={() => onOuvrir((e.faible as NonNullable<Ensemble["faible"]>).i)}>
            {T.ouvrir(e.faible.court)}
          </button>
        )}
      </div>
      <div className={s.ensDroite}>
        <p className={s.eyebrow}>{e.genre === "ecart" && comp !== null ? T.evolution(comp) : T.classement}</p>
        {e.evolution.length > 0 && (
          // au téléphone, deux colonnes : autant de rangées que la moitié des lignes
          <div className={s.evog} style={{ "--ev-rangs": Math.ceil(e.evolution.length / 2) } as React.CSSProperties}>
            {e.evolution.map((l) => (
              <button key={l.i} type="button" className={classes(s.ev, l.neg && s.evNeg)} onClick={() => onOuvrir(l.i)} aria-label={l.aria}>
                <span className={s.evNom} aria-hidden>
                  {l.court}
                  {l.reponses && <small className={s.evRep}>{l.reponses}</small>}
                </span>
                <span className={s.et} aria-hidden>
                  <i style={{ width: `${l.w}%` }} />
                </span>
                <span className={classes(s.mono, s.evVal)} aria-hidden>
                  {l.texte}
                </span>
              </button>
            ))}
          </div>
        )}
        {e.sansReponse && <p className={s.evSans}>{e.sansReponse}</p>}
        {e.aucuneReponse && <p className={s.evSans}>{e.aucuneReponse}</p>}
        <p className={s.astuce}>{T.astuce(avecNotions, avecEvolution, e.evolution.length > 0)}</p>
      </div>
    </div>
  );
}

export function FicheVue({ f, comp, source, onFermer }: { f: FicheMatiere; comp: Comparaison | null; source: "unique" | "90j"; onFermer: () => void }) {
  const T = SYN.matieres.fiche;
  const retour = <p className={s.astuce}>{T.retour}</p>;
  return (
    <div className={s.ensGrille} data-colonnes={f.notions ? "2" : "1"}>
      <div className={s.ensGauche}>
        <div className={s.ficheTete}>
          <div className={s.teteTexte}>
            <p className={s.eyebrow}>{T.kicker}</p>
            <h3 className={classes("font-brand", s.ficheNom)}>{f.nom}</h3>
          </div>
          <button type="button" className={s.ferme} onClick={onFermer} aria-label={T.fermer}>
            <X size={16} aria-hidden />
          </button>
        </div>
        <p className={s.ficheValeur}>
          <b className="font-brand" title={f.info ?? undefined}>
            {f.valeur}
          </b>
          {f.ecart && comp !== null && <span className={f.ecart.genre === "ecart" ? TON[f.ecart.ton] : s.nul}>{f.ecart.genre === "ecart" ? T.ecart(f.ecart.texte, comp) : SYN.matieres.nouvelle}</span>}
          {f.periode && <span className={f.periode.aucune ? s.nul : s.nbRep}>{f.periode.texte}</span>}
          {f.nonMesuree && <span className={s.nul}>{SYN.matieres.pasMesuree}</span>}
        </p>
        <ul className={s.kv}>
          <li>
            <span>{T.poids}</span>
            <b>{f.poids}</b>
          </li>
          <li>
            <span>{T.reponses}</span>
            <b>{f.reponses}</b>
          </li>
          {f.avant && (
            <li>
              <span>{T.avant(f.avant.j)}</span>
              <b>{f.avant.valeur}</b>
            </li>
          )}
          <li>
            <span>{T.gain}</span>
            <b>{f.gain}</b>
          </li>
        </ul>
        {f.evolution && (
          <div className={s.ficheEvol}>
            <p className={s.eyebrow}>{T.evolution}</p>
            <ul className={s.pas}>
              {f.evolution.map((p) => (
                <li key={p.cle} className={classes(p.actif && s.pasOn, p.auj && s.pasAuj)}>
                  <span>{p.libelle}</span>
                  <b>{p.valeur}</b>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className={s.ficheActions}>
          <Bouton href={f.hrefReviser} className={s.boutonPetit}>
            <BookOpen size={16} aria-hidden /> {T.reviser(f.court)}
          </Bouton>
          <Link href={f.hrefEntrainer} className={s.lien}>
            {T.entrainer}
          </Link>
        </div>
        {!f.notions && retour}
      </div>
      {f.notions && (
        <div className={s.ensDroite}>
          <p className={s.eyebrow}>{T.notions(f.resume ? texteResume(f.resume, source) : T.aucuneNotion)}</p>
          <ul className={s.fnListe} tabIndex={0} aria-label={T.notionsAria}>
            {f.notions.map((n) => (
              <li key={n.id} className={classes(s.fn, n.etat === "jamais" && s.fnJamais, n.etat === "encours" && s.fnJamais)}>
                <span title={n.nom}>{n.nom}</span>
                <Piste w={n.w} ton={n.ton} fin vide={n.ton === null} />
                <span className={s.mono}>{n.valeur}</span>
              </li>
            ))}
          </ul>
          <ul className={classes(s.legende, s.legendeP)}>
            <li>
              <i className={classes(s.sw, s.swR)} />
              {SYN.matieres.legende.sous50(SEUIL_BAS)}
            </li>
            <li>
              <i className={classes(s.sw, s.swA)} />
              {SYN.matieres.legende.entre(SEUIL_BAS, SEUIL_ACQUIS)}
            </li>
            <li>
              <i className={classes(s.sw, s.swE)} />
              {T.legende.acquise}
            </li>
            {f.resume && f.resume.enCours > 0 && (
              <li>
                <i className={classes(s.sw, s.swEc)} />
                {T.legende.enCours}
              </li>
            )}
            <li>
              <i className={classes(s.sw, s.swN)} />
              {T.legende.jamais(source)}
            </li>
          </ul>
          {retour}
        </div>
      )}
    </div>
  );
}

"use client";

import { usePresents } from "@/components/salles/presence";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCheck, FileCheck, Hourglass, Lock, Users } from "lucide-react";
import { EcranVs } from "@/components/arene/EcranVs";
import { RideauSalle } from "@/components/arene/Rideaux";
import { Avatar } from "@/components/classement/Avatar";
import { BoutonEnvoi } from "@/components/classement/Encre";
import { etiquettesDe, type Repondre } from "@/components/salles/CarteQuestion";
import { DebriefExamen } from "@/components/salles/DebriefExamen";
import { RevueSalle } from "@/components/salles/RevueSalle";
import { RunnerSalle } from "@/components/salles/RunnerSalle";
import { Enonce } from "@/components/salles/Enonce";
import { FinPartie } from "@/components/salles/FinPartie";
import { flechesRadios } from "@/components/salles/radios";
import { TetePanneau } from "@/components/salles/Stage";
import { BoutonArreter } from "@/components/salles/VuePartie";
import { decimalsOf, formatCalc, parseCalcCandidates, UNIT_FIELD } from "@/lib/calc/engine";
import type { CalcUnit } from "@/lib/calc/types";
import { messageErreurSalle } from "@/lib/salles/api";
import {
  avancementJoueurs,
  joueursPresents,
  chronoBas,
  clicTropTot,
  copieRendue,
  finRevelee,
  horlogeExamen,
  libelleChrono,
  positionDeDepart,
  prochaineNonRepondue,
  refusCopieRendue,
  reponsesRetenues,
  revueSalle,
  type ReponseRetenue,
} from "@/lib/salles/examen";
import { libelleDuree, libelleParams } from "@/lib/salles/logique";
import { chiffreDecompte, fractionTemps, secondesAffichees, type MoiPourClassement, type ReponseOk } from "@/lib/salles/partie";
import type { CopieRendue, SalleClassementLigne, SalleCorrection, SalleItem, SalleMaReponse, SalleMembre, SalleSession } from "@/lib/salles/types";
import { ARENE } from "@/lib/voice-arene";
import { EXAMEN, PARTIE, SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";
import p from "./Partie.module.css";
import x from "./Examen.module.css";

// L'écran de partie au chrono global (« examen »), comme les 30 du jour :
//  - le décompte ;
//  - pendant la partie : le chrono global (jusqu'à fin_at, heure du serveur),
//    ma progression, la grille des numéros (répondue / à répondre / affichée),
//    la question affichée et l'avancement des autres (nombre de réponses
//    seulement). Choisir puis valider : la réponse est définitive, le serveur
//    la garde sans rien dire de sa justesse ; on passe tout seul à la
//    prochaine question sans réponse ;
//  - « Rendre ma copie », au-dessus de la question : confirmation dans la
//    page, puis mes réponses se verrouillent (la relecture reste possible) ;
//    la correction arrive quand tout le monde a rendu sa copie, ou à la fin
//    du chrono. Tout répondu, le bloc passe en avant pour finir plus tôt ;
//  - à la fin : le podium et le bilan (FinPartie), puis le débrief question
//    par question (DebriefExamen).
// Présentation pure : PartieSalle fournit l'heure `t`, l'état, `repondre` et
// `rendreCopie`.
// Au clavier : A à D (ou 1 à 4) choisissent, Entrée valide, ← → changent de
// question (dans la grille aussi, avec Début / Fin).

const LETTRES = ["A", "B", "C", "D", "E", "F"];
const lettre = (i: number) => LETTRES[i] ?? String(i + 1);
const nomDe = (l: { username: string | null }) => l.username?.trim() || "Un joueur";
const MAX_AVANCEMENT = 8;

export type PropsPartieExamen = {
  session: SalleSession;
  items: SalleItem[];
  corrections: SalleCorrection[];
  mesReponses: SalleMaReponse[];
  /** les réponses que le serveur vient de me rendre (sans verdict en chrono global) */
  locales: Record<number, ReponseOk | undefined>;
  classement: SalleClassementLigne[];
  monClassement: { rang: number; points: number; bonnes: number; repondues: number; tempsMs: number } | null;
  membres: Pick<SalleMembre, "userId" | "username" | "avatarUrl">[];
  moi: MoiPourClassement;
  estAdmin: boolean;
  /** l'heure du serveur, en ms */
  t: number;
  repondre: (position: number, rep: Parameters<Repondre>[0]) => ReturnType<Repondre>;
  /** rend ma copie (rendre_copie) ; PartieSalle relit l'état juste après, pour passer au débrief si j'étais le dernier */
  rendreCopie: () => Promise<CopieRendue>;
  onArreter?: () => Promise<void>;
  onRejouer?: () => Promise<{ ok: boolean; erreur?: string }>;
  onRetour?: () => void;
};

/** Ce qui a été retenu, en clair : « B », « 8,50 % ». */
function libelleRetenue(item: SalleItem | null, r: ReponseRetenue): string {
  if (r.choix !== null) return lettre(r.choix);
  if (r.valeur !== null) return formatCalc(r.valeur, (item?.unite ?? "") as CalcUnit, decimalsOf(r.valeur));
  return "—";
}

function DecompteExamen({ session, avantMs, onArreter }: { session: SalleSession; avantMs: number; onArreter?: () => Promise<void> }) {
  const secondes = secondesAffichees(avantMs);
  const fin = chiffreDecompte(avantMs) !== null;
  return (
    <section className={s.panneau} aria-label={EXAMEN.decompteTitre}>
      <TetePanneau icone={<Hourglass size={16} />} droite={<span className={s.compte}>{session.nb} questions</span>}>
        {SALLES.partieTitre(session.numero)}
      </TetePanneau>
      <div className={p.decompte}>
        <p className={p.decompteTitre}>{EXAMEN.decompteTitre}</p>
        <p key={secondes} className={p.decompteChiffre} data-fin={fin ? "1" : "0"} aria-live="off">
          {secondes}
        </p>
        <p className={p.decompteParams}>{libelleParams({ ...session.params, chrono: "global" })}</p>
        <p className={p.decompteRegle}>{EXAMEN.decompteRegle}</p>
        {onArreter && <BoutonArreter onArreter={onArreter} />}
      </div>
    </section>
  );
}

/** Le temps est écoulé, le serveur n'a pas encore rendu la correction ni le classement. */
function FinEnAttente({ session }: { session: SalleSession }) {
  return (
    <section className={s.panneau} aria-label={SALLES.partieTitre(session.numero)}>
      <TetePanneau icone={<Hourglass size={16} />} droite={<span className={s.compte}>{session.nb} questions</span>}>
        {SALLES.partieTitre(session.numero)}
      </TetePanneau>
      <div className={s.attente} role="status">
        <span className={s.barres} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <p className={s.attenteTitre}>{EXAMEN.finAttenteTitre}</p>
        <p className={s.aide}>{EXAMEN.finAttente}</p>
      </div>
    </section>
  );
}

export function PartieExamen(props: PropsPartieExamen) {
  const { session, items, corrections, mesReponses, locales, classement, monClassement, membres, moi, estAdmin, t, repondre, onArreter, onRejouer, onRetour } = props;
  const h = horlogeExamen(session, t);
  const presents = usePresents();

  if (h.phase === "fin") {
    // la fin tombe à l'horloge avant que le serveur ne la confirme : l'état lu est encore celui
    // de la partie (classement à 0, justesse masquée) ; on attend la lecture qui révèle tout
    if (!finRevelee(session, mesReponses)) return <FinEnAttente session={session} />;
    // QCM seulement : la revue des 30 du jour (filtres, matières, « Copier pour l'IA ») ; sinon l'ancien débrief
    const revue = session.params.type === "questions" ? revueSalle(items, corrections, mesReponses) : null;
    // le rideau couvre tout ce qui dit le résultat : le podium, le bilan et la correction
    return (
      <RideauSalle session={session} classement={classement}>
        <div className={p.ecran}>
          <FinPartie
            session={session}
            items={items}
            corrections={corrections}
            mesReponses={mesReponses}
            classement={classement}
            monClassement={monClassement}
            moiId={moi.userId}
            estAdmin={estAdmin}
            onRejouer={onRejouer}
            onRetour={onRetour}
            revue={false}
            rideau={false}
          />
          {revue ? (
            <RevueSalle revue={revue} numero={session.numero} titre={session.params.mock?.examens.length ? session.params.mock.examens.join(" + ") : SALLES.partieTitre(session.numero)} />
          ) : (
            <DebriefExamen nb={session.nb} items={items} corrections={corrections} mesReponses={mesReponses} />
          )}
        </div>
      </RideauSalle>
    );
  }
  if (h.phase === "decompte") {
    // l'écran VS vit dans le décompte : la partie démarre, il disparaît avec lui
    return (
      <>
        <DecompteExamen session={session} avantMs={h.avantDebutMs} onArreter={onArreter} />
        <EcranVs cle={`salle:${session.id}`} joueurs={joueursPresents(membres, presents, moi.userId).map((m) => ({ id: m.userId, pseudo: m.username, photo: m.avatarUrl }))} moiId={moi.userId} hud={ARENE.hudSalle(membres.length)} />
      </>
    );
  }
  // QCM seulement (un mock officiel) : l'écran des 30 du jour, réponses modifiables jusqu'à la remise
  if (session.params.type === "questions") return <RunnerSalle {...props} restantMs={h.restantMs} totalMs={h.totalMs} />;
  return <JeuExamen {...props} restantMs={h.restantMs} totalMs={h.totalMs} />;
}

function JeuExamen({
  session,
  items,
  mesReponses,
  locales,
  membres,
  moi,
  repondre,
  rendreCopie,
  onArreter,
  restantMs,
  totalMs,
}: PropsPartieExamen & { restantMs: number; totalMs: number }) {
  const nb = session.nb;
  const retenues = useMemo(() => reponsesRetenues(nb, locales, mesReponses), [nb, locales, mesReponses]);
  const [courante, setCourante] = useState(() => positionDeDepart(nb, retenues));
  const [annonce, setAnnonce] = useState<string | null>(null);
  // la partie dont je viens de rendre la copie (avant que la lecture suivante ne le confirme)
  const [rendueIci, setRendueIci] = useState<string | null>(null);
  const rendue = rendueIci === session.id || copieRendue(session, moi.userId);
  const grilleRef = useRef<HTMLOListElement | null>(null);
  const focusGrille = useRef(false);

  const nbRepondues = retenues.size;
  const item = items.find((i) => i.position === courante) ?? null;
  const retenue = retenues.get(courante) ?? null;
  const bas = chronoBas(restantMs, totalMs);
  const presents = usePresents();
  const joueurs = avancementJoueurs({ session, membres, moiId: moi.userId, mesRepondues: nbRepondues, moiRendu: rendue, presents });
  const autres = joueurs.length > 1;
  const visibles = joueurs.slice(0, MAX_AVANCEMENT);
  if (!visibles.some((j) => j.moi)) {
    const moiLigne = joueurs.find((j) => j.moi);
    if (moiLigne) visibles.push(moiLigne);
  }

  function aller(pos: number, focus = false) {
    if (nb <= 0) return;
    const cible = Math.min(nb - 1, Math.max(0, pos));
    focusGrille.current = focus;
    setCourante(cible);
  }

  // la case affichée reste visible dans la grille (qui défile seule, sans faire défiler la page) ;
  // au clavier dans la grille, le focus la suit
  useEffect(() => {
    const g = grilleRef.current;
    const b = g?.querySelector<HTMLButtonElement>(`[data-pos="${courante}"]`);
    if (!g || !b) return;
    const li = b.parentElement as HTMLElement;
    if (li.offsetTop < g.scrollTop) g.scrollTop = li.offsetTop - 4;
    else if (li.offsetTop + li.offsetHeight > g.scrollTop + g.clientHeight) g.scrollTop = li.offsetTop + li.offsetHeight - g.clientHeight + 4;
    if (focusGrille.current) b.focus();
    focusGrille.current = false;
  }, [courante]);

  // ← → changent de question, hors des champs de saisie et des groupes qui gèrent déjà leurs flèches
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.key === "ArrowLeft" && courante > 0) {
        e.preventDefault();
        aller(courante - 1);
      } else if (e.key === "ArrowRight" && courante < nb - 1) {
        e.preventDefault();
        aller(courante + 1);
      }
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courante, nb]);

  function surToucheGrille(e: React.KeyboardEvent<HTMLOListElement>) {
    const cibles: Record<string, number> = { ArrowLeft: courante - 1, ArrowRight: courante + 1, Home: 0, End: nb - 1 };
    if (!(e.key in cibles)) return;
    e.preventDefault();
    aller(cibles[e.key], true);
  }

  function apresReponse(position: number, r: ReponseOk) {
    setAnnonce(EXAMEN.annonce(position + 1, libelleRetenue(items.find((i) => i.position === position) ?? null, { choix: r.choix, valeur: r.valeur })));
    const deja = new Set(retenues.keys());
    deja.add(position);
    const suivante = prochaineNonRepondue(nb, deja, position);
    if (suivante !== null) aller(suivante);
  }

  // le bloc « Copie rendue » (role status, qui prend le focus) l'annonce lui-même
  async function rendreMaCopie() {
    await rendreCopie();
    setRendueIci(session.id);
  }

  // le serveur refuse la réponse parce que la copie est rendue (depuis un autre onglet) :
  // on verrouille ici aussi tout de suite, sans attendre la lecture suivante
  async function repondreIci(position: number, rep: Parameters<Repondre>[0]) {
    try {
      return await repondre(position, rep);
    } catch (e) {
      if (refusCopieRendue(e)) {
        setRendueIci(session.id);
        setAnnonce(EXAMEN.copieRendueVerrou);
      }
      throw e;
    }
  }

  return (
    <div className={p.ecran}>
      <section className={s.panneau} aria-labelledby="examen-tete">
        <div className={x.tete}>
          <div className={x.teteTitre}>
            <h2 id="examen-tete" className={x.titre}>
              {SALLES.partieTitre(session.numero)}
            </h2>
            <p className={x.kicker}>{libelleParams({ ...session.params, chrono: "global" })}</p>
          </div>
          <div className={x.chrono} data-bas={bas ? "1" : "0"}>
            <span className={x.chronoNombre} role="timer" aria-live="off" aria-label={EXAMEN.tempsRestantAria(libelleDuree(Math.ceil(restantMs / 1000)))}>
              {libelleChrono(restantMs)}
            </span>
            <span className={x.legende}>{EXAMEN.tempsRestant}</span>
          </div>
          <div className={x.progression} aria-label={EXAMEN.progressionAria(nbRepondues, nb)}>
            <span className={x.progressionNombre}>
              {nbRepondues}
              <small>/{nb}</small>
            </span>
            <span className={x.legende}>{EXAMEN.repondues}</span>
          </div>
        </div>
        <div className={[p.piste, bas ? p.pisteUrgence : ""].filter(Boolean).join(" ")} aria-hidden>
          <i style={{ transform: `scaleX(${fractionTemps(restantMs, totalMs / 1000)})` }} />
        </div>

        <nav className={x.grilleBloc} aria-label={EXAMEN.grille}>
          <ol ref={grilleRef} className={x.numeros} onKeyDown={surToucheGrille}>
            {Array.from({ length: nb }, (_, pos) => {
              const repondue = retenues.has(pos);
              const ici = pos === courante;
              return (
                <li key={pos}>
                  <button
                    type="button"
                    className={x.case}
                    data-pos={pos}
                    data-etat={repondue ? "repondue" : "libre"}
                    aria-current={ici ? "step" : undefined}
                    aria-label={EXAMEN.caseAria(pos + 1, repondue, ici)}
                    tabIndex={ici ? 0 : -1}
                    onClick={() => aller(pos)}
                  >
                    {pos + 1}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className={x.grilleAide}>
            <span className={x.pastille} data-etat="repondue" aria-hidden /> {EXAMEN.legendeRepondue}
            <span className={x.pastille} data-etat="libre" aria-hidden /> {EXAMEN.legendeARepondre}
            <span className={x.grilleAideTexte}>{EXAMEN.grilleAide}</span>
          </p>
        </nav>
      </section>

      <p className={x.annonce} role="status" aria-live="polite">
        {annonce ?? ""}
      </p>

      <div className={p.grille}>
        <div className={p.principal}>
          <RendreCopie nb={nb} nbRepondues={nbRepondues} rendue={rendue} onRendre={rendreMaCopie} />
          <section className={s.panneau} aria-labelledby="examen-question">
            <div className={p.tete}>
              <div>
                <h2 id="examen-question" className={p.numero}>
                  {EXAMEN.question} <b>{courante + 1}</b> {PARTIE.sur(nb)}
                </h2>
                {item && (
                  <div className={p.etiquettes}>
                    {etiquettesDe(item).map((e, i) => (
                      <span key={i} className={[s.etiquette, e.metal ? s.etiquetteMetal : ""].filter(Boolean).join(" ")}>
                        {e.texte}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className={x.statut} data-etat={retenue ? "repondue" : "libre"}>
                {retenue && <Lock size={13} aria-hidden />}
                {retenue ? EXAMEN.statutRepondue : rendue ? EXAMEN.statutSansReponse : EXAMEN.statutARepondre}
              </span>
            </div>

            <QuestionExamen
              key={courante}
              item={item}
              retenue={retenue}
              verrouillee={rendue}
              repondre={(rep) => repondreIci(courante, rep)}
              onEnregistree={(r) => apresReponse(courante, r)}
            />

            <div className={p.pied}>
              <div className={x.navigation}>
                <button type="button" className={[s.btn, s.btnDiscret].join(" ")} disabled={courante <= 0} onClick={() => aller(courante - 1)} aria-keyshortcuts="ArrowLeft">
                  <ArrowLeft size={15} aria-hidden /> {EXAMEN.precedente}
                </button>
                <button type="button" className={[s.btn, s.btnDiscret].join(" ")} disabled={courante >= nb - 1} onClick={() => aller(courante + 1)} aria-keyshortcuts="ArrowRight">
                  {EXAMEN.suivante} <ArrowRight size={15} aria-hidden />
                </button>
              </div>
              {onArreter && <BoutonArreter onArreter={onArreter} />}
            </div>
          </section>
        </div>

        <div className={p.cote}>
          <section className={s.panneau} aria-labelledby="examen-avancement">
            <TetePanneau id="examen-avancement" icone={<Users size={16} />}>
              {EXAMEN.avancementTitre}
            </TetePanneau>
            <ul className={x.avancement}>
              {visibles.map((j) => (
                <li key={j.userId} className={x.joueur} data-moi={j.moi ? "1" : "0"} data-rendu={j.rendu ? "1" : "0"}>
                  <Avatar src={j.avatarUrl} name={nomDe(j)} size={26} />
                  <span className={x.joueurNom} title={nomDe(j)}>
                    {nomDe(j)}
                    {j.moi ? ` · ${SALLES.vous}` : ""}
                  </span>
                  <span className={x.joueurCompte}>
                    {j.rendu && (
                      <span className={x.joueurRendu}>
                        <Lock size={11} aria-hidden /> {EXAMEN.repereRendu}
                      </span>
                    )}
                    {EXAMEN.avancementLigne(j.n, nb)}
                  </span>
                  <span className={x.joueurPiste} aria-hidden>
                    <i style={{ transform: `scaleX(${nb > 0 ? Math.min(1, j.n / nb) : 0})` }} />
                  </span>
                </li>
              ))}
            </ul>
            {joueurs.length > visibles.length && <p className={x.avancementNote}>{EXAMEN.avancementAutres(joueurs.length - visibles.length)}</p>}
            <p className={x.avancementNote}>{autres ? EXAMEN.avancementAide : EXAMEN.definitif}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * « Rendre ma copie », au-dessus de la question, tant que la partie court :
 *  - en jeu : une invite discrète et le bouton (contour fin, pas d'encre) ;
 *  - tout répondu : le bloc passe en avant (bouton en os) pour finir plus tôt ;
 *  - au clic : la confirmation, dans la page (jamais de fenêtre du
 *    navigateur), avec le nombre de questions sans réponse ; Échap ou
 *    « Continuer » la referment. Un double clic sur « Rendre ma copie »
 *    l'ouvre sans la confirmer (clicTropTot), et la remise ne part qu'une fois ;
 *  - copie rendue : plus de bouton, le bloc dit quand la correction arrive.
 * `ouverte` : la confirmation ouverte d'emblée (test de rendu, aperçus).
 */
export function RendreCopie({
  nb,
  nbRepondues,
  rendue,
  onRendre,
  ouverte = false,
}: {
  nb: number;
  nbRepondues: number;
  rendue: boolean;
  /** rend la copie ; lève une erreur au message lisible en cas d'échec */
  onRendre: () => Promise<void>;
  ouverte?: boolean;
}) {
  const [confirmation, setConfirmation] = useState(ouverte);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // garde synchrone : deux clics dans le même instant n'envoient qu'une remise
  const envoiRef = useRef(false);
  // l'heure (timeStamp du clic) où la confirmation s'est ouverte : un clic qui suit de trop
  // près est le second d'un double clic sur « Rendre ma copie », il ne confirme ni ne referme rien
  const ouverteA = useRef<number | null>(null);
  const declencheurRef = useRef<HTMLButtonElement | null>(null);
  const continuerRef = useRef<HTMLButtonElement | null>(null);
  const statutRef = useRef<HTMLDivElement | null>(null);
  // où poser le focus après un changement d'état (jamais au premier rendu)
  const focusApres = useRef<"continuer" | "declencheur" | "statut" | null>(null);
  const sansReponse = Math.max(0, nb - nbRepondues);
  const toutRepondu = nb > 0 && sansReponse === 0;

  useEffect(() => {
    const cible = focusApres.current;
    focusApres.current = null;
    if (cible === "continuer") continuerRef.current?.focus();
    else if (cible === "declencheur") declencheurRef.current?.focus();
    else if (cible === "statut") statutRef.current?.focus();
  }, [confirmation, rendue]);

  function ouvrir(quand: number) {
    setErreur(null);
    ouverteA.current = quand;
    // le focus va sur « Continuer » : deux Entrée de suite ne rendent pas la copie par mégarde
    focusApres.current = "continuer";
    setConfirmation(true);
  }

  function fermer(quand: number | null) {
    if (envoiRef.current || (quand !== null && clicTropTot(ouverteA.current, quand))) return;
    setErreur(null);
    ouverteA.current = null;
    focusApres.current = "declencheur";
    setConfirmation(false);
  }

  async function confirmer(quand: number) {
    if (envoiRef.current || clicTropTot(ouverteA.current, quand)) return;
    envoiRef.current = true;
    setErreur(null);
    setEnvoi(true);
    try {
      await onRendre();
      focusApres.current = "statut";
      setConfirmation(false);
    } catch (e) {
      setErreur(messageErreurSalle(e));
    } finally {
      envoiRef.current = false;
      setEnvoi(false);
    }
  }

  if (rendue) {
    return (
      <div ref={statutRef} tabIndex={-1} className={x.rendre} data-etat="rendue" role="status">
        <Lock size={20} className={x.rendreIcone} aria-hidden />
        <div className={x.rendreTexte}>
          <p className={x.rendreTitre}>{EXAMEN.copieRendue}</p>
          <p className={x.rendreSous}>
            {EXAMEN.copieRendueSous} {EXAMEN.copieRendueRelire}
          </p>
        </div>
      </div>
    );
  }

  if (confirmation) {
    return (
      <div
        className={x.rendre}
        data-etat="confirmation"
        role="group"
        aria-labelledby="examen-rendre-titre"
        aria-describedby="examen-rendre-sous"
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          e.preventDefault();
          fermer(null);
        }}
      >
        <FileCheck size={20} className={x.rendreIcone} aria-hidden />
        <div className={x.rendreTexte}>
          <p id="examen-rendre-titre" className={x.rendreTitre}>
            {EXAMEN.rendreConfirme}
          </p>
          <p id="examen-rendre-sous" className={x.rendreSous} data-manque={sansReponse > 0 ? "1" : "0"}>
            {sansReponse > 0 ? EXAMEN.rendreSansReponse(sansReponse) : EXAMEN.rendreToutRepondu}
          </p>
        </div>
        <div className={x.rendreActions}>
          <button type="button" className={[s.btn, x.rendreBtn].join(" ")} data-avant="1" disabled={envoi} onClick={(e) => void confirmer(e.timeStamp)}>
            {envoi ? EXAMEN.rendreEnvoi : EXAMEN.rendre}
          </button>
          <button ref={continuerRef} type="button" className={[s.btn, s.btnDiscret].join(" ")} disabled={envoi} onClick={(e) => fermer(e.timeStamp)}>
            {EXAMEN.continuer}
          </button>
        </div>
        {erreur && (
          <p className={[s.erreur, x.rendreErreur].join(" ")} role="alert">
            {erreur}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={x.rendre} data-etat={toutRepondu ? "avant" : "invite"}>
      {toutRepondu ? <CheckCheck size={22} className={x.rendreIcone} aria-hidden /> : <FileCheck size={18} className={x.rendreIcone} aria-hidden />}
      <div className={x.rendreTexte} role={toutRepondu ? "status" : undefined}>
        <p className={x.rendreTitre}>{toutRepondu ? EXAMEN.toutRepondu : EXAMEN.rendreInvite}</p>
        <p className={x.rendreSous}>{toutRepondu ? EXAMEN.toutReponduSous : EXAMEN.rendreInviteSous}</p>
      </div>
      <button ref={declencheurRef} type="button" className={[s.btn, x.rendreBtn].join(" ")} data-avant={toutRepondu ? "1" : "0"} onClick={(e) => ouvrir(e.timeStamp)}>
        {EXAMEN.rendre}
      </button>
      {erreur && (
        <p className={[s.erreur, x.rendreErreur].join(" ")} role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}

/**
 * La question affichée : l'énoncé, puis choisir et valider (QCM) ou saisir et
 * valider (calcul). Déjà répondue : ma réponse retenue, verrouillée, sans
 * verdict ni correction. Copie rendue (`verrouillee`) : plus rien ne se
 * choisit ni ne se valide, la relecture reste. Remontée avec key={position}.
 */
function QuestionExamen({
  item,
  retenue,
  verrouillee,
  repondre,
  onEnregistree,
}: {
  item: SalleItem | null;
  retenue: ReponseRetenue | null;
  /** ma copie est rendue : plus de réponse possible */
  verrouillee: boolean;
  repondre: Repondre;
  onEnregistree: (r: ReponseOk) => void;
}) {
  const [selection, setSelection] = useState<number | null>(null);
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const calcul = item?.origine === "calcul";
  const nbChoix = item?.choix?.length ?? 0;
  const bloque = retenue !== null || envoi || verrouillee;
  // le joueur a pu changer de question pendant l'envoi : on ne l'emmène alors nulle part
  const monte = useRef(true);
  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

  async function valider(choixImpose?: number) {
    if (bloque || !item) return;
    const choix = choixImpose ?? selection;
    let rep: { choix: number } | { saisie: string };
    if (calcul) {
      if (!parseCalcCandidates(saisie).length) {
        setErreur(PARTIE.calculIllisible);
        return;
      }
      rep = { saisie };
    } else {
      if (choix === null) {
        setErreur(EXAMEN.choisis);
        return;
      }
      rep = { choix };
    }
    setErreur(null);
    setEnvoi(true);
    try {
      const r = await repondre(rep);
      if (!r.ok) setErreur(r.indice);
      else if (monte.current) onEnregistree(r);
    } catch (e) {
      setErreur(messageErreurSalle(e));
    } finally {
      setEnvoi(false);
    }
  }

  // au clavier : A à D (ou 1 à 4) choisissent, Entrée valide (sur un choix : celui-ci ; les autres
  // boutons et les champs gardent leur Entrée)
  const validerRef = useRef(valider);
  validerRef.current = valider;
  useEffect(() => {
    if (bloque || !item) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (e.key === "Enter") {
        const radio = el?.getAttribute("role") === "radio" ? Number(el.dataset.i) : NaN;
        if ((tag === "BUTTON" || tag === "A") && !Number.isInteger(radio)) return;
        e.preventDefault();
        if (Number.isInteger(radio)) setSelection(radio);
        void validerRef.current(Number.isInteger(radio) ? radio : undefined);
        return;
      }
      if (calcul || nbChoix === 0) return;
      const k = e.key.toLowerCase();
      const parLettre = LETTRES.findIndex((l) => l.toLowerCase() === k);
      const parChiffre = /^[1-9]$/.test(k) ? Number(k) - 1 : -1;
      const i = parLettre >= 0 ? parLettre : parChiffre;
      if (i >= 0 && i < nbChoix) {
        e.preventDefault();
        setSelection(i);
        setErreur(null);
      }
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [bloque, item, calcul, nbChoix]);

  if (!item) {
    return (
      <div className={p.corps}>
        <div className={s.attente} role="status">
          <span className={s.barres} aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <p className={s.attenteTitre}>{PARTIE.arrive}</p>
        </div>
      </div>
    );
  }

  const unite = (item.unite ?? "") as CalcUnit;
  const etatChoix = (i: number): string => {
    if (retenue) return retenue.choix === i ? "retenu" : "estompe";
    if (verrouillee) return "estompe";
    if (selection === i) return envoi ? "envoi" : "choisi";
    return envoi ? "estompe" : "libre";
  };

  return (
    <div className={p.corps}>
      <Enonce texte={item.enonce} className={p.enonce} />

      {calcul && item.donnees && item.donnees.length > 0 && (
        <dl className={p.donnees} aria-label={PARTIE.calculDonnees}>
          {item.donnees.map((d, i) => (
            <div key={i}>
              <dt>{d.label}</dt>
              <dd>{d.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {!calcul && item.choix && (
        <div className={p.choix} role="radiogroup" aria-label={EXAMEN.choisir} onKeyDown={retenue || verrouillee ? undefined : flechesRadios}>
          {item.choix.map((texte, i) => {
            const etat = etatChoix(i);
            const coche = retenue ? retenue.choix === i : !verrouillee && selection === i;
            const focusable = coche || (selection === null && !retenue && i === 0);
            return (
              <button
                key={i}
                type="button"
                role="radio"
                data-i={i}
                aria-checked={coche}
                className={[p.choixBtn, x.choixExamen].join(" ")}
                data-etat={etat}
                disabled={bloque}
                tabIndex={focusable ? 0 : -1}
                aria-label={PARTIE.choixNom(lettre(i), texte)}
                aria-keyshortcuts={`${lettre(i)} ${i + 1}`}
                onClick={() => {
                  setSelection(i);
                  setErreur(null);
                }}
              >
                <span className={p.lettre} aria-hidden>
                  {lettre(i)}
                </span>
                <span className={p.choixTexte}>{texte}</span>
                <span className={p.choixMarque} aria-hidden>
                  {etat === "retenu" && <Lock size={18} />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {calcul && !retenue && (
        <form
          className={p.calcul}
          onSubmit={(e) => {
            e.preventDefault();
            void valider();
          }}
        >
          <label htmlFor="examen-calcul" className={s.libelle}>
            {PARTIE.calculLabel}
          </label>
          <div className={p.calculRangee}>
            <span className={p.calculChamp}>
              <input
                id="examen-calcul"
                className={s.champ}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={saisie}
                placeholder={PARTIE.calculPlaceholder}
                disabled={envoi || verrouillee}
                onChange={(e) => {
                  setSaisie(e.target.value);
                  setErreur(null);
                }}
              />
              {UNIT_FIELD[unite] && (
                <span className={p.unite} aria-hidden>
                  {UNIT_FIELD[unite]}
                </span>
              )}
            </span>
            <BoutonEnvoi surPeinture className={s.pleinMobile} disabled={envoi || verrouillee || !saisie.trim()}>
              {envoi ? EXAMEN.envoi : EXAMEN.valider}
            </BoutonEnvoi>
          </div>
          <p className={s.aide}>{verrouillee ? EXAMEN.copieRendueVerrou : PARTIE.calculAide}</p>
        </form>
      )}

      {/* copie rendue : plus rien à réessayer, la ligne d'aide dit déjà pourquoi (pas de message en double) */}
      {erreur && !verrouillee && (
        <p className={[s.erreur, p.erreurLigne].join(" ")} role="alert">
          {erreur}
        </p>
      )}

      {retenue ? (
        <div className={x.retenue}>
          <span className={x.retenueTitre}>
            <Lock size={16} aria-hidden /> {EXAMEN.enregistree} : <b>{libelleRetenue(item, retenue)}</b>
          </span>
          <span className={x.retenueNote}>{EXAMEN.enregistreeNote}</span>
        </div>
      ) : (
        !calcul && (
          <div className={x.valider}>
            <BoutonEnvoi type="button" surPeinture className={s.pleinMobile} disabled={envoi || verrouillee || selection === null} onClick={() => void valider()}>
              {envoi ? EXAMEN.envoi : EXAMEN.valider} <ArrowRight size={16} aria-hidden />
            </BoutonEnvoi>
            <p className={s.aide}>{verrouillee ? EXAMEN.copieRendueVerrou : `${EXAMEN.definitif} ${EXAMEN.clavier}`}</p>
          </div>
        )
      )}
    </div>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ActionEncre, Etiquette } from "@/components/ui/SousPage";
import { SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";
import { ArriveeUneFois } from "@/components/ArriveeUneFois";
import { CentrerConseil } from "@/components/CentrerConseil";
import s from "./MockExamPacks.module.css";

// Les examens blancs en boosters scellés (direction « le lieu, puis l'objet », lot 4 du 2026-11-13,
// repris après la critique) : un pack aux couleurs de S'affronter (florence : terre cuite, ivoire), une
// bande d'arrachage dorée en haut, le nom en Dela, une fenêtre peinte sur la face (la Grande Salle de la
// série au couteau, recadrée autrement pour chaque examen) sous un vernis figé, et le sceau noir uni à
// cheval sur la fenêtre, frappé du mois. L'état et le format écrits dessous, une seule fois. Une copie
// rendue : la bande est arrachée, le rabat entrouvert et ton score tamponné par-dessus. Un examen fini
// sans ta copie : le pack grisé, « MANQUÉ ». Le prochain est avancé vers toi sous un halo et entouré à
// l'encre (#rl-cercle-main). Sans état ni hasard ni date dans le rendu (l'état arrive calculé par la
// page) : utilisable côté serveur.

const E = SOUS_AFFRONTER.examens;

export type GenrePack = "scelle" | "ouvert" | "rendu" | "fini" | "preparation";

export type Pack = {
  id: string;
  titre: string;
  /** le mois de l'examen, frappé sur le sceau (« NOV ») */
  mois: string;
  genre: GenrePack;
  /** l'état en quelques mots (« dans 2 j », « ouvert · jusqu'au 15 nov. », « manqué ») */
  etat: string;
  /** « 180 Q · 4 H 30 » */
  format: string;
  /** ta copie rendue, en pourcentage (null : pas de copie) */
  score: number | null;
};

// la fenêtre peinte : la Grande Salle (série au couteau), un recadrage par examen, tiré de son id
// (stable d'un rendu à l'autre : ni hasard ni date)
const PEINTURE = "/illustrations/classement-grande-salle.webp";
const CADRAGES = ["50% 18%", "50% 92%", "14% 30%", "86% 34%", "32% 70%", "70% 74%", "50% 48%"];
function cadrageDe(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CADRAGES[h % CADRAGES.length];
}

/** Le pack seul (sans lien) ; `grand` : la page d'un examen. */
export function PackExamen({ p, grand = false, i = 0 }: { p: Pack; grand?: boolean; i?: number }) {
  const ouvert = p.score !== null;
  return (
    <span className={s.ombre} data-grand={grand ? "1" : undefined} style={{ "--i": i } as React.CSSProperties}>
      <span className={s.pack} data-genre={p.genre} data-ouvert={ouvert ? "1" : undefined}>
        <span className={s.bande} aria-hidden />
        {ouvert && <span className={s.rabat} aria-hidden />}
        <span className={s.haut}>
          <span className={s.kicker}>{E.packKicker}</span>
          <b className={s.nom}>{p.titre}</b>
        </span>
        <span className={s.vitre} aria-hidden>
          <span className={s.peinture} style={{ backgroundImage: `url(${PEINTURE})`, backgroundPosition: cadrageDe(p.id) }} />
          <span className={s.vernis} />
          {!ouvert && (
            <span className={s.sceau}>
              <span>{p.mois}</span>
            </span>
          )}
        </span>
        {ouvert && (
          <span className={s.tampon}>
            <b>{p.score}</b>
            <small>%</small>
          </span>
        )}
        <span className={s.pied}>
          <span className={s.etat}>{p.etat}</span>
          <span className={s.format}>{p.format}</span>
        </span>
      </span>
    </span>
  );
}

/**
 * La rangée des packs posés sur une même ligne de sol (la vitrine), dans l'ordre du calendrier, le
 * prochain avancé vers toi et entouré ; dessous, l'action à l'encre qui l'ouvre. `conseil` : l'id du
 * pack mis en avant (sur téléphone, la rangée défile jusqu'à lui au montage).
 */
export function RangeePacks({ packs, conseil, action }: { packs: Pack[]; conseil: string | null; action?: { href: string; label: string } | null }) {
  return (
    <section className={s.vitrine} aria-label={E.rangee}>
      <ArriveeUneFois cle="mock-exams" className={s.arrivee}>
        <ul className={s.rangee} id="rl-rangee-packs">
          {packs.map((p, i) => (
            <li key={p.id} className={s.place} data-conseil={conseil === p.id ? "1" : undefined}>
              <Link href={`/mock-exams/${p.id}`} className={s.lien + " rl-presse"} aria-label={`${p.titre} · ${p.etat} · ${p.format}${p.score !== null ? ` · ${p.score} %` : ""}`}>
                <PackExamen p={p} i={i} />
                {conseil === p.id && (
                  <svg className={s.entoure} viewBox="0 0 120 160" preserveAspectRatio="none" aria-hidden>
                    <use href="#rl-cercle-main" />
                  </svg>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </ArriveeUneFois>
      <CentrerConseil conteneur="rl-rangee-packs" />
      <div className={s.sol} aria-hidden />
      {action && (
        <div className={s.action}>
          <ActionEncre href={action.href}>
            {action.label} <ArrowRight size={16} aria-hidden />
          </ActionEncre>
        </div>
      )}
    </section>
  );
}

/** Un classement court, en lignes à filets : le rang en Mono, le nom, le score en Mono (ta ligne marquée). */
export function ClassementCourt({ titre, lignes }: { titre: string; lignes: { cle: string; rang: number; nom: string; score: string; href?: string; moi?: boolean }[] }) {
  if (lignes.length === 0) return null;
  return (
    <section className={s.classement} aria-label={titre}>
      <Etiquette as="h2">{titre}</Etiquette>
      <ol className={s.lignes}>
        {lignes.map((l) => {
          const corps = (
            <>
              <span className={s.rang}>{l.rang}</span>
              <b className={s.qui}>{l.nom}</b>
              <span className={s.score}>{l.score}</span>
            </>
          );
          return (
            <li key={l.cle} data-moi={l.moi ? "1" : undefined}>
              {l.href ? (
                <Link href={l.href} className={s.ligne + " rl-presse"}>
                  {corps}
                </Link>
              ) : (
                <span className={s.ligne}>{corps}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * La page d'un examen hors séance : le pack en grand à gauche, à côté ce que le pack ne dit pas
 * (l'action d'inscription, le classement court), centrés sur la largeur de la colonne de séance (760 px)
 * pour partager son bord gauche. Rien à côté : le pack seul, au centre.
 */
export function ScenePack({ p, titre, texte, children, classement }: { p: Pack; titre?: React.ReactNode | null; texte?: React.ReactNode; children?: React.ReactNode; classement?: React.ReactNode }) {
  const cote = Boolean(titre || texte || children || classement);
  return (
    <section className={s.scene} data-seul={cote ? undefined : "1"} aria-label={p.titre}>
      <div className={s.socle}>
        <PackExamen p={p} grand />
        <div className={s.sol} aria-hidden />
      </div>
      {cote && (
        <div className={s.cote}>
          {titre && <h2 className={s.titreEtat}>{titre}</h2>}
          {texte && <p className={s.texte}>{texte}</p>}
          {children}
          {classement}
        </div>
      )}
    </section>
  );
}

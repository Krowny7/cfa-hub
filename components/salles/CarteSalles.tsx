import Link from "next/link";
import { DoorOpen, Plus } from "lucide-react";
import { BoutonRejoindre } from "@/components/salles/BoutonRejoindre";
import { FormCode } from "@/components/salles/FormCode";
import type { EntreeSalles, SallePublique } from "@/lib/salles/types";
import { SALLES } from "@/lib/voice-salles";
import a from "@/components/classement/Affronter.module.css";
import s from "./Salles.module.css";

// La carte « Les Salles » de S'affronter, après la bande « Trouver un
// adversaire » : la forme des cartes de la page (angles arrondis, ombre), mais
// sur le fond sombre de la DA des Salles. À gauche, « Créer une salle » (vers
// /salles) et « Rejoindre avec un code » ; à droite, les salles publiques
// ouvertes (nom, joueurs, partie en cours ou salon ouvert, « Rejoindre »).
// Sans la migration (migration_salles.sql), une ligne dit que les salles
// arrivent et rien d'autre ne s'affiche. Composant sans état : la page serveur
// lui passe les listes ; `demo` (aperçus) coupe les appels de ses boutons.

const MAX_PUBLIQUES = 5;
const MAX_MES = 6;

export function LigneSallePublique({ salle, demo = false }: { salle: SallePublique; demo?: boolean }) {
  return (
    <li className={[s.ligneSalle, salle.enCours ? s.ligneSalleVive : ""].filter(Boolean).join(" ")}>
      <div className={s.ligneNom}>
        <b title={salle.nom}>{salle.nom}</b>
        <span>
          {SALLES.joueurs(salle.nbMembres)}
          {salle.adminUsername ? ` · ${SALLES.parAdmin(salle.adminUsername)}` : ""}
        </span>
        <span className={[s.etat, salle.enCours ? s.etatVif : ""].filter(Boolean).join(" ")}>
          <i className={[s.point, salle.enCours ? s.pointVif : ""].filter(Boolean).join(" ")} aria-hidden />
          {salle.enCours ? SALLES.partieEnCours : SALLES.salonOuvert}
        </span>
      </div>
      {salle.dejaMembre ? (
        <Link href={`/salles/${salle.id}`} className={s.btn} aria-label={SALLES.ouvrirNom(salle.nom)}>
          {SALLES.ouvrir}
        </Link>
      ) : (
        <BoutonRejoindre salleId={salle.id} nom={salle.nom} demo={demo} />
      )}
    </li>
  );
}

export function CarteSalles({ salles, demo = false }: { salles?: EntreeSalles | null; demo?: boolean }) {
  const pret = Boolean(salles?.pret);
  const publiques = salles?.publiques ?? [];
  const mes = salles?.mes ?? [];
  return (
    <section className={[a.carte, s.jetons, s.entree].join(" ")} aria-labelledby="cl-salles" data-salles={pret ? "pret" : "bientot"}>
      <div className={s.entreeTete}>
        <div className={s.entreeTitre}>
          <p className={s.surtitre}>{SALLES.entreeKicker}</p>
          <h2 id="cl-salles">{SALLES.titre}</h2>
        </div>
        {pret && (
          <Link href="/salles" className={[s.btn, s.btnPrimaire].join(" ")}>
            <Plus size={20} aria-hidden /> {SALLES.creer}
          </Link>
        )}
      </div>

      {!pret ? (
        <p className={s.entreeBientot}>
          <i className={[s.point, s.pointVif].join(" ")} aria-hidden style={{ color: "var(--sl-vermillon)" }} />
          {SALLES.bientot}
        </p>
      ) : (
        <div className={s.entreeCorps}>
          <div className={s.entreeActions}>
            <p className={s.sous}>{SALLES.sous}</p>
            <FormCode id="cl-salles-code" demo={demo} />
            {mes.length > 0 && (
              <div className={s.entreeListe}>
                <div className={s.entreeListeTete}>
                  <h3 className={s.entreeSous}>{SALLES.mesSalles}</h3>
                  <span className={s.compte}>{SALLES.mesSallesLigne(mes.length)}</span>
                </div>
                <ul className={s.mes} aria-label={SALLES.mesSalles}>
                  {mes.slice(0, MAX_MES).map((m) => (
                    <li key={m.id}>
                      <Link href={`/salles/${m.id}`} aria-label={SALLES.ouvrirNom(m.nom)}>
                        <i className={[s.point, m.enCours ? s.pointVif : ""].filter(Boolean).join(" ")} aria-hidden style={{ color: m.enCours ? "var(--sl-vermillon)" : "var(--sl-metal)" }} />
                        {m.nom}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={s.entreeListe}>
            <div className={s.entreeListeTete}>
              <h3 className={s.entreeSous}>{SALLES.publiquesTitre}</h3>
              {publiques.length > MAX_PUBLIQUES && (
                <Link href="/salles" className={s.entreeSous} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                  {SALLES.voirTout}
                </Link>
              )}
            </div>
            {salles?.erreur ? (
              <p className={s.sous}>{SALLES.lectureImpossible}</p>
            ) : publiques.length === 0 ? (
              <p className={s.sous}>
                <DoorOpen size={16} aria-hidden style={{ display: "inline", verticalAlign: "-3px", marginRight: 6 }} />
                {SALLES.aucunePublique}
              </p>
            ) : (
              <ul className={s.listeSalles} aria-label={SALLES.publiquesTitre}>
                {publiques.slice(0, MAX_PUBLIQUES).map((p) => (
                  <LigneSallePublique key={p.id} salle={p} demo={demo} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

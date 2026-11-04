import Link from "next/link";
import { BoutonRejoindre } from "@/components/salles/BoutonRejoindre";
import { formaterCode } from "@/lib/salles/logique";
import type { SallePublique, SalleResume } from "@/lib/salles/types";
import { SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";

// Une salle dans les listes de /salles : son nom, une ligne de détails, partie en
// cours ou salon ouvert, et à droite « Ouvrir » ou « Rejoindre ». Composant sans
// état ; `demo` (aperçus) coupe le bouton.

function Etat({ enCours }: { enCours: boolean }) {
  return (
    <span className={[s.etat, enCours ? s.etatVif : ""].filter(Boolean).join(" ")}>
      <i className={[s.point, enCours ? s.pointVif : ""].filter(Boolean).join(" ")} aria-hidden />
      {enCours ? SALLES.partieEnCours : SALLES.salonOuvert}
    </span>
  );
}

function Ouvrir({ id, nom }: { id: string; nom: string }) {
  return (
    <Link href={`/salles/${id}`} className={[s.btn, s.petit].join(" ")} aria-label={SALLES.ouvrirNom(nom)}>
      {SALLES.ouvrir}
    </Link>
  );
}

export function LigneSallePublique({ salle, demo = false }: { salle: SallePublique; demo?: boolean }) {
  return (
    <li className={s.ligneSalle}>
      <div className={s.ligneNom}>
        <b title={salle.nom}>{salle.nom}</b>
        <span>
          {SALLES.joueurs(salle.nbMembres)}
          {salle.adminUsername ? ` · ${SALLES.parAdmin(salle.adminUsername)}` : ""}
        </span>
        <Etat enCours={salle.enCours} />
      </div>
      {salle.dejaMembre ? <Ouvrir id={salle.id} nom={salle.nom} /> : <BoutonRejoindre salleId={salle.id} nom={salle.nom} demo={demo} />}
    </li>
  );
}

export function LigneMaSalle({ salle }: { salle: SalleResume }) {
  return (
    <li className={s.ligneSalle}>
      <div className={s.ligneNom}>
        <b title={salle.nom}>{salle.nom}</b>
        <span>
          {SALLES.joueurs(salle.nbMembres)} · {salle.publique ? SALLES.publique : SALLES.privee} · {formaterCode(salle.code)}
          {salle.estAdmin ? ` · ${SALLES.admin}` : ""}
        </span>
        <Etat enCours={salle.enCours} />
      </div>
      <Ouvrir id={salle.id} nom={salle.nom} />
    </li>
  );
}

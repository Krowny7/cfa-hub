import Link from "next/link";
import { Users } from "lucide-react";
import { nombre } from "@/lib/voice";
import { PARC } from "@/lib/voice-accueil-lobby-parcours";
import { SceauUni } from "./Encre";
import { Visage } from "./Visage";
import l from "./Lobby.module.css";
import p from "./Parcours.module.css";
import type { AmisLobby } from "./types";

// « Tes amis » : combien sont en ligne (ou, quand la présence ne se lit pas, combien
// tu en as), trois visages (les amis en ligne d'abord, avec leur pastille verte),
// les demandes en attente et le lien vers la liste. Sans ami : l'invitation à en
// ajouter. Un lien, pas de bouton, donc pas d'encre. Les visages sont la photo de
// profil de l'ami (le composant Avatar du site, via Visage) ou, sans photo, ses
// initiales dans un rond. `seule` : la carte n'a pas « Du nouveau » à côté et prend
// la rangée entière ; elle se met alors en bande (tout sur une ligne) plutôt qu'en
// colonne étirée et vide. Composant serveur, sans état.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const ID = "lobby-amis-titre";
const LISTE = "/people?view=amis";

export function TesAmis({ amis, seule, className }: { amis: AmisLobby; seule?: boolean; className?: string }) {
  const aucun = amis.total <= 0;
  return (
    <section aria-labelledby={ID} className={cx(l.carte, l.petite, p.amis, seule && p.amisSeule, className)}>
      <header>
        <h2 id={ID} className={cx("font-brand", p.nvTitre)}>
          <SceauUni>
            <Users size={15} aria-hidden />
          </SceauUni>
          {PARC.amis.titre}
        </h2>
      </header>
      {aucun ? (
        <>
          <p className={p.premiers}>
            <b>{PARC.amis.premiers}</b>
            <span className={l.st}>{PARC.amis.premiersAide}</span>
          </p>
          {amis.demandes > 0 && (
            <Link href={LISTE} className={p.demandes}>
              {PARC.amis.demandes(amis.demandes)}
            </Link>
          )}
          <Link href="/people" className={cx(l.lien, p.basLien)}>
            {PARC.amis.trouver} →
          </Link>
        </>
      ) : (
        <>
          <p className={p.amisChiffre}>
            <b className="font-brand">{nombre(amis.enLigne ?? amis.total)}</b>
            <span>{amis.enLigne !== null ? PARC.amis.enLigneSur(amis.total) : PARC.amis.nombre(amis.total)}</span>
          </p>
          {amis.visages.length > 0 && (
            <ul className={p.visages}>
              {amis.visages.map((v) => (
                <li key={v.id} className={p.visage}>
                  <Visage nom={v.nom} initiales={v.initiales} avatarUrl={v.avatarUrl} enLigne={v.enLigne} />
                  <span>
                    {v.nom}
                    {v.enLigne && <span className="sr-only">, en ligne</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {amis.demandes > 0 && (
            <Link href={LISTE} className={p.demandes}>
              {PARC.amis.demandes(amis.demandes)}
            </Link>
          )}
          <Link href={LISTE} className={cx(l.lien, p.basLien)}>
            {PARC.amis.lien} →
          </Link>
        </>
      )}
    </section>
  );
}

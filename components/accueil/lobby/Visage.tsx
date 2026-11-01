import { Avatar } from "@/components/classement/Avatar";
import l from "./Lobby.module.css";

// Le visage d'un joueur dans les cartes de l'accueil : sa photo de profil quand
// il en a une (le composant Avatar du site, sans sa pastille de présence : la
// page sait déjà qui est en ligne), sinon ses initiales dans le rond du socle
// (Lobby.module.css : .av). Décoratif (aria-hidden) : le nom est écrit à côté.
// `taille` : le côté du rond en px (36 par défaut, 26 avec .avP). `enLigne` :
// la pastille verte en bas à droite. Composant serveur, sans état ni hook.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Visage({
  nom,
  initiales,
  avatarUrl,
  taille,
  sombre,
  enLigne,
  className,
}: {
  nom: string;
  initiales: string;
  /** la photo de profil ; null ou absente : les initiales */
  avatarUrl?: string | null;
  taille?: number;
  /** initiales en réserve sur un rond noir (sans photo) */
  sombre?: boolean;
  enLigne?: boolean;
  className?: string;
}) {
  const style = taille ? { width: taille, height: taille, fontSize: Math.round(taille * 0.34) } : undefined;
  if (avatarUrl) {
    return (
      <span className={cx(l.av, l.avPhoto, className)} style={style} aria-hidden>
        <Avatar src={avatarUrl} name={nom} size={taille ?? 36} />
        {enLigne && <i />}
      </span>
    );
  }
  return (
    <span className={cx(l.av, sombre && l.avN, className)} style={style} aria-hidden>
      {initiales}
      {enLigne && <i />}
    </span>
  );
}

import type { Segment } from "@/lib/voice-moi";
import { DIRECT } from "@/lib/voice-accueil-lobby-direct";
import { chiffresDe } from "./modele-direct";
import type { EnDirectLobby } from "./types";
import { Visage } from "./Visage";
import l from "./Lobby.module.css";
import s from "./EnDirect.module.css";

// « En ce moment dans le lobby » : une carte vivante façon jeu en ligne. À
// gauche, trois chiffres (joueurs en ligne, duels en cours, copies des 30
// rendues dans l'heure) ; à droite, les quatre derniers faits (« Inès vient de
// rendre sa copie : 28/30 ») ; dessous, les joueurs en ligne en petits visages
// (photo de profil, sinon initiales) : toi d'abord (« Toi »), tes amis, puis les
// autres, huit au plus et « +N » pour le reste. Composant serveur, sans bouton :
// aucune encre (la règle d'encre ne la concerne pas), que des aplats. Le cadre,
// les équerres du HUD, le point vert et les visages sont ceux du socle
// (Lobby.module.css) ; les chiffres, le fil et la rangée de visages sont à elle
// (EnDirect.module.css). Les lignes dont la source manque (pas d'accès admin)
// disparaissent ; sans fait récent, les chiffres s'étalent en rangée ; sans
// chiffre, le fil prend toute la carte. La carte garde sa hauteur naturelle :
// elle ne s'étire pas pour remplir la colonne voisine.

const classes = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Une phrase en segments : du texte, du gras en chiffres à chasse fixe. */
function Phrase({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((g, i) =>
        typeof g === "string" ? (
          g
        ) : "b" in g ? (
          <b key={i} className={s.mono}>
            {g.b}
          </b>
        ) : "marque" in g ? (
          <b key={i}>{g.marque}</b>
        ) : (
          <b key={i}>{g.neg}</b>
        ),
      )}
    </>
  );
}

const ID = "lobby-direct-titre";

export function EnDirect({ d, className }: { d: EnDirectLobby; className?: string }) {
  const chiffres = chiffresDe(d);
  const faits = d.evenements;
  return (
    <section className={classes(l.carte, l.hud, s.carte, className)} aria-labelledby={ID}>
      <div className={s.corps} data-colonnes={chiffres.length > 0 && faits.length > 0 ? "2" : "1"}>
        <h2 id={ID} className={s.titre}>
          <span className={l.live} aria-hidden="true" />
          {DIRECT.titre}
        </h2>
        {chiffres.length > 0 && (
          <ul className={s.chiffres} aria-label={DIRECT.chiffres}>
            {chiffres.map((c) => (
              <li key={c.cle}>
                <b className={s.mono}>{c.val}</b>
                <span>{c.lib}</span>
              </li>
            ))}
          </ul>
        )}
        {faits.length > 0 && (
          <ul className={s.fil} aria-label={DIRECT.fil}>
            {faits.map((e) => (
              <li key={e.cle} className={s.fait}>
                <span className={classes(l.av, e.sombre && l.avN, l.avP)} aria-hidden="true">
                  {e.initiales}
                </span>
                <span className={s.texte}>
                  <Phrase segments={e.texte} />
                </span>
                <span className={s.quand}>{e.quand}</span>
              </li>
            ))}
          </ul>
        )}
        {d.joueurs.length > 0 && (
          <ul className={s.joueurs} aria-label={DIRECT.joueurs}>
            {d.joueurs.map((j) => (
              <li key={j.id} className={classes(s.joueur, j.moi && s.moi)} title={j.moi ? DIRECT.toi : j.nom}>
                <Visage nom={j.nom} initiales={j.initiales} avatarUrl={j.avatarUrl} taille={40} sombre={j.moi} />
                <span className={s.pseudo}>
                  {j.prenom}
                  {j.ami && <span className="sr-only">{DIRECT.ami}</span>}
                </span>
              </li>
            ))}
            {d.plus > 0 && (
              <li className={s.autres}>
                <b className={s.mono} aria-hidden="true">
                  {DIRECT.plus(d.plus)}
                </b>
                <span className="sr-only">{DIRECT.plusLu(d.plus)}</span>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

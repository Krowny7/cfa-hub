import Link from "next/link";
import type { Carnet } from "@/components/reviser/carnets";
import { RangeeDefilante } from "@/components/reviser/RangeeDefilante";
import { CARNETS } from "@/lib/voice-reviser-b";
import s from "./Rayons.module.css";

// L'objet-héros de /fiches (direction « le lieu, puis l'objet », 2026-11-13) : les dix fiches en
// carnets ébène debout sur une même ligne de sol (grain de cuir, code gaufré), l'abréviation en Dela
// et le nom court ; l'avancement écrit en grand au milieu de la couverture (« 3 » en Dela or sobre,
// « /6 » en Mono) ; au pied, une case par page de quiz sur une seule ligne (pleine : faite, entourée
// d'or : entamée) ; le carnet conseillé avancé d'un cran et entouré à la main (#rl-cercle-main), une
// fiche finie tamponnée « TENU » ; le mur des one-pagers en onzième objet. Puis l'action à l'encre
// (`action`). Sans état ni hasard ; la rangée (centrage au téléphone, arrivée une fois) est client.

export function RangeeCarnets({
  carnets,
  conseil,
  avance,
  mur,
  action,
}: {
  carnets: Carnet[];
  conseil: string | null;
  /** false : avancement illisible, les carnets sans chiffre */
  avance: boolean;
  mur: { images: string[]; href: string };
  action?: React.ReactNode;
}) {
  return (
    <div className={s.rayon}>
      <RangeeDefilante className={s.rangee} legende label={CARNETS.etiquette} cle={conseil}>
        {carnets.map((c, i) => {
          const pages = Math.max(c.pages, 0);
          const ouvert = !!c.href && pages > 0;
          const estConseil = ouvert && c.key === conseil;
          const finie = avance && ouvert && c.faites >= pages;
          const corps = (
            <span className={s.objet + " " + s.carnet}>
              <span className={s.grain} aria-hidden />
              <p className={s.code}>{c.code}</p>
              <p className={s.nom}>{CARNETS.court[c.key] ?? c.nom}</p>
              <span className={s.avance}>
                {!ouvert ? (
                  <small>{CARNETS.bientot}</small>
                ) : avance ? (
                  <>
                    <b>{c.faites}</b>
                    <small>/{pages}</small>
                  </>
                ) : (
                  <>
                    <b>{pages}</b>
                    <small>{CARNETS.pagesCourt}</small>
                  </>
                )}
              </span>
              {ouvert && (
                <span className={s.cases} aria-hidden>
                  {Array.from({ length: pages }, (_, k) => (
                    <i key={k} data-etat={!avance ? undefined : k < c.faites ? "faite" : k < c.faites + c.entamees ? "entamee" : undefined} />
                  ))}
                </span>
              )}
              {finie && (
                <span className={s.tampon} aria-hidden>
                  {CARNETS.tenu}
                </span>
              )}
              <span className={s.reflet} aria-hidden />
            </span>
          );
          return (
            <li key={c.key} className={s.place} style={{ ["--i" as string]: i }} data-conseil={estConseil ? "1" : undefined} data-indispo={ouvert ? undefined : "1"}>
              {ouvert && c.href ? (
                <Link href={c.href} className={s.lien + " rl-presse"} aria-label={CARNETS.aria(c.nom, avance ? c.faites : 0, pages, estConseil)} title={c.nom}>
                  {corps}
                  {estConseil && (
                    <svg className={s.entoure} viewBox="0 0 120 160" preserveAspectRatio="none" aria-hidden>
                      <use href="#rl-cercle-main" />
                    </svg>
                  )}
                </Link>
              ) : (
                <span className={s.lien}>{corps}</span>
              )}
            </li>
          );
        })}
        <li className={s.place + " " + s.placeMur} style={{ ["--i" as string]: carnets.length }}>
          <Link href={mur.href} className={s.lien + " rl-presse"} aria-label={CARNETS.murAide} title={CARNETS.murAide}>
            <span className={s.objet + " " + s.mur}>
              <span className={s.murFond}>
                {mur.images.slice(0, 4).map((src, k) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src + k} src={src} alt="" loading="lazy" decoding="async" className={s.feuille} />
                ))}
                {[
                  { top: "7%", left: "26%" },
                  { top: "5%", left: "72%" },
                  { top: "47%", left: "28%" },
                  { top: "45%", left: "72%" },
                ].slice(0, Math.min(4, mur.images.length)).map((p, k) => (
                  <span key={k} className={s.punaise} style={p} aria-hidden />
                ))}
              </span>
              <span className={s.reflet} aria-hidden />
            </span>
            <span className={s.murLegende}>{CARNETS.mur}</span>
          </Link>
        </li>
      </RangeeDefilante>
      {action && <div className={s.action}>{action}</div>}
    </div>
  );
}

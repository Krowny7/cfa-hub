import Link from "next/link";
import { redirect } from "next/navigation";
import { DoorOpen, Globe, Plus, Users } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { LigneSallePublique } from "@/components/salles/CarteSalles";
import { FormCode } from "@/components/salles/FormCode";
import { FormCreer } from "@/components/salles/FormCreer";
import { Stage, TetePanneau } from "@/components/salles/Stage";
import { getMesSalles, getSallesPubliques } from "@/lib/salles/api";
import { formaterCode } from "@/lib/salles/logique";
import { createClient } from "@/lib/supabase/server";
import { SALLES } from "@/lib/voice-salles";
import s from "@/components/salles/Salles.module.css";

export const metadata = { title: "Salles · Ranked Lobby" };

// Les Salles : créer la sienne (nom, publique ou privée ; on arrive dans le
// salon où l'admin règle la partie), rejoindre avec un code, retrouver ses
// salles et parcourir les salles publiques. Sans la migration
// (migration_salles.sql), la page dit que les salles arrivent.
export default async function SallesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [mes, publiques] = await Promise.all([getMesSalles(supabase), getSallesPubliques(supabase)]);
  const bientot = (!mes.ok && mes.migrationAbsente) || (!publiques.ok && publiques.migrationAbsente);

  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-7 md:gap-10">
        <header className="flex min-w-0 flex-col gap-3">
          <p className="t-small flex items-center gap-2 font-semibold">
            <Icone nom="classement" size={18} />
            <span>{SALLES.pageKicker}</span>
          </p>
          <h1 className="t-hero rl-in m-0">{SALLES.pageTitre}</h1>
          <p className="t-small m-0 max-w-[60ch]">{SALLES.pageSous}</p>
        </header>

        {bientot ? (
          <Stage>
            <p className={s.surtitre}>{SALLES.titre}</p>
            <p className={s.entreeBientot}>
              <i className={[s.point, s.pointVif].join(" ")} aria-hidden style={{ color: "var(--sl-vermillon)" }} />
              {SALLES.bientot}
            </p>
            <div className={s.piedActions}>
              <Link href="/classement" className={s.btn}>
                {SALLES.retourSalles}
              </Link>
            </div>
          </Stage>
        ) : (
          <Stage>
            <div className={s.grille}>
              <div className={s.colonne}>
                <section className={s.panneau} aria-labelledby="salles-creer">
                  <TetePanneau id="salles-creer" icone={<Plus size={16} />}>
                    {SALLES.creer}
                  </TetePanneau>
                  <div className={s.panneauCorps}>
                    <FormCreer />
                  </div>
                </section>
                <section className={s.panneau} aria-labelledby="salles-code">
                  <TetePanneau id="salles-code" icone={<DoorOpen size={16} />}>
                    {SALLES.codeTitre}
                  </TetePanneau>
                  <div className={s.panneauCorps}>
                    <FormCode id="salles-code-champ" />
                  </div>
                </section>
              </div>

              <div className={s.colonne}>
                <section className={s.panneau} aria-labelledby="salles-mes">
                  <TetePanneau id="salles-mes" icone={<Users size={16} />} droite={mes.ok && mes.data.length > 0 && <span className={s.compte}>{mes.data.length}</span>}>
                    {SALLES.tesSalles}
                  </TetePanneau>
                  <div className={s.panneauCorps}>
                    {!mes.ok ? (
                      <p className={s.sous}>{SALLES.lectureImpossible}</p>
                    ) : mes.data.length === 0 ? (
                      <p className={s.sous}>{SALLES.tesSallesVide}</p>
                    ) : (
                      <ul className={s.listeSalles}>
                        {mes.data.map((m) => (
                          <li key={m.id} className={[s.ligneSalle, m.enCours ? s.ligneSalleVive : ""].filter(Boolean).join(" ")}>
                            <div className={s.ligneNom}>
                              <b title={m.nom}>{m.nom}</b>
                              <span>
                                {SALLES.joueurs(m.nbMembres)} · {m.publique ? SALLES.publique : SALLES.privee} · {formaterCode(m.code)}
                                {m.estAdmin ? ` · ${SALLES.admin}` : ""}
                              </span>
                              <span className={[s.etat, m.enCours ? s.etatVif : ""].filter(Boolean).join(" ")}>
                                <i className={[s.point, m.enCours ? s.pointVif : ""].filter(Boolean).join(" ")} aria-hidden />
                                {m.enCours ? SALLES.partieEnCours : SALLES.salonOuvert}
                              </span>
                            </div>
                            <Link href={`/salles/${m.id}`} className={[s.btn, s.petit].join(" ")} aria-label={SALLES.ouvrirNom(m.nom)}>
                              {SALLES.ouvrir}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                <section className={s.panneau} aria-labelledby="salles-publiques">
                  <TetePanneau id="salles-publiques" icone={<Globe size={16} />} droite={publiques.ok && publiques.data.length > 0 && <span className={s.compte}>{publiques.data.length}</span>}>
                    {SALLES.publiquesTitre}
                  </TetePanneau>
                  <div className={s.panneauCorps}>
                    {!publiques.ok ? (
                      <p className={s.sous}>{SALLES.lectureImpossible}</p>
                    ) : publiques.data.length === 0 ? (
                      <p className={s.sous}>{SALLES.aucunePublique}</p>
                    ) : (
                      <ul className={s.listeSalles}>
                        {publiques.data.map((p) => (
                          <LigneSallePublique key={p.id} salle={p} />
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </Stage>
        )}
      </div>
    </div>
  );
}

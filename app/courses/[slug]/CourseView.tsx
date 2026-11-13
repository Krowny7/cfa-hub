import { ExternalLink } from "lucide-react";
import { CourseAudioPlayer } from "@/components/CourseAudioPlayer";
import { HerosCoursLegende, HerosCoursValeur, LigneEcouteCours } from "@/components/reviser/HerosCours";
import { DisqueTournant } from "@/components/ui/DisqueTournant";
import type { EcouteCours } from "@/lib/course-ecoute";
import type { Course } from "@/lib/courses";
import { SUBJECTS } from "@/components/reviser/catalog";
import { ActionContour, EnTeteSousPage, Etiquette, Scene, SousPage } from "@/components/ui/SousPage";
import { COURS, RETOUR } from "@/lib/voice-reviser";
import { LECTURE_COURS } from "@/lib/voice-reviser-b";
import l from "@/components/reviser/Lecture.module.css";

// Présentation d'un cours complet (sans requête, rendue aussi par l'aperçu), sur le modèle des
// sous-pages (2026-11-12) : l'en-tête commun (retour aux cours complets, la matière, une ligne :
// modules, pages, audio), puis le cadre à zones : « Le deck » à gauche (un seul bouton, « Ouvrir »),
// « L'audio » dans la colonne grise : le lecteur et la liste des modules, le module courant marqué.
// Sans audio, le deck seul. Direction « le lieu, puis l'objet » (2026-11-13) : plus de cadre à zones ; le
// deck posé sur la scène à gauche (« Ouvrir le deck » à contour), l'audio à droite (collé en haut au
// défilement) sur la platine ébène de /courses en grand (le disque tourne au survol, ralentit sans
// retour sec) ; en chiffre-héros, les minutes qui restent à écouter de CE cours, lues sur l'appareil
// (« Écouté en entier » une fois fini), et la ligne d'état dit où en est l'écoute.
export function CourseView({
  course,
  pdfUrl,
  audioUrl,
  startModule = null,
  apercu,
}: {
  course: Course;
  pdfUrl: string | null;
  audioUrl: string | null;
  /** ancien nom du PDF à télécharger : le bouton « Télécharger » a été retiré (2026-11-12), gardé pour l'aperçu */
  downloadName?: string;
  /** ?module=N : le module à démarrer (1 = le premier) */
  startModule?: number | null;
  /** une écoute d'exemple (route d'essai) à la place de l'appareil */
  apercu?: EcouteCours | null;
}) {
  const code = SUBJECTS.find((x) => x.course === course.slug)?.code ?? null;
  return (
    <SousPage
      entete={
        <EnTeteSousPage
          illustration={{ nom: "reviser-bibliotheque", position: "50% 92%" }}
          retour={RETOUR.cours}
          titre={course.title}
          ligne={audioUrl ? <LigneEcouteCours course={course} apercu={apercu} /> : LECTURE_COURS.ligne(course.chapters.length, course.pages)}
          heros={
            audioUrl
              ? { valeur: <HerosCoursValeur course={course} apercu={apercu} />, legende: <HerosCoursLegende course={course} apercu={apercu} /> }
              : null
          }
        />
      }
    >
      <Scene>
        <div className={l.lecture}>
          <section aria-label={COURS.lire} className={l.zone}>
            <div className={l.tete}>
              <Etiquette as="h2">{LECTURE_COURS.deck}</Etiquette>
              {pdfUrl && (
                <ActionContour href={pdfUrl} nouvelOnglet aide={COURS.ouvrirAide}>
                  <ExternalLink size={14} aria-hidden />
                  {LECTURE_COURS.ouvrir}
                </ActionContour>
              )}
            </div>
            <div className={l.document}>
              {pdfUrl ? <iframe src={pdfUrl} title={COURS.iframe(course.title)} /> : <p className={l.vide}>{COURS.indisponible}</p>}
            </div>
          </section>
          <section aria-label={COURS.ecouter} className={l.zone + " " + l.colonne}>
            {audioUrl ? (
              <div className={l.platine} data-hote-disque="">
                <div className={l.platineTete}>
                  <span className={l.plateau}>
                    <DisqueTournant className={l.disque} hote="lien">
                      <span className={l.label}>{code}</span>
                    </DisqueTournant>
                  </span>
                  <span className={l.bras} aria-hidden />
                  <h2 className={l.platineNom}>{LECTURE_COURS.audio}</h2>
                </div>
                <CourseAudioPlayer
                  nu
                  src={audioUrl}
                  chapters={course.chapters}
                  storageKey={course.slug}
                  title={course.title}
                  duration={course.minutes * 60}
                  startModule={startModule}
                  matiere={SUBJECTS.find((x) => x.course === course.slug)?.key}
                />
              </div>
            ) : (
              <>
                <div className={l.tete}>
                  <Etiquette as="h2">{LECTURE_COURS.audio}</Etiquette>
                </div>
                <p className={l.note}>{COURS.sansAudio}</p>
              </>
            )}
          </section>
        </div>
      </Scene>
    </SousPage>
  );
}

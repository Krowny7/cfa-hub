-- Le Codex, version 3 (docs/codex/V3.md). À coller APRÈS migration_codex.sql,
-- dans le SQL Editor de Supabase. Idempotent (rejouable) ; aucune donnée
-- existante n'est modifiée ni supprimée. Le site marche sans ce fichier :
-- il se replie en silence sur l'ancien comportement.
--
-- ATTENTION : ne recollez PAS migration_codex.sql ni migration_serie_encre.sql
-- APRÈS ce fichier. Ils remettraient codex_ecrire, codex_journal, codex_lire
-- et _serie_avancer dans leur version d'avant (les quêtes du fil rouge ne
-- s'écriraient plus ; les jours de repos et de pause seraient ignorés par la
-- série). Si c'est fait, recollez ce fichier ensuite. Les capacités « fil »,
-- « journal » et « recuperer » de codex_mesures_v3 se lisent sur le corps de
-- codex_ecrire et de codex_journal : le Codex s'y adapte, mais _serie_avancer,
-- non.
--
-- 1. La robustesse de l'écriture (V3 §6, point 14). Avant : une seule ligne
--    en conflit (par exemple une XP déjà versée dont la ligne de progression
--    a été effacée à la main, que l'index unique xp_events_codex_une_fois
--    refuse) faisait échouer TOUT le lot de codex_ecrire, et le Codex
--    s'affichait « indisponible » sans laisser de trace.
--    a. codex_erreurs : le journal des erreurs du Codex (joueur, quête,
--       période, message, première et dernière fois, nombre de fois). Le
--       joueur lit les siennes (RLS) ; seules les fonctions y écrivent.
--    b. _codex_erreur(uuid, text, text, text) : consigne une erreur ; la même
--       erreur répétée dans les 24 h ne crée pas de ligne, elle incrémente
--       « fois » (le journal ne grossit pas à chaque visite).
--    c. codex_erreur_noter(uuid, text, text, text) : la même chose pour le
--       site (clé service seulement), quand une lecture échoue en entier.
--    d. codex_ecrire(uuid, jsonb, int) : même signature, même résultat, mais
--       TOLÉRANTE : chaque quête du lot s'écrit dans sa propre
--       sous-transaction ; une quête en erreur est consignée et n'annule plus
--       les autres ; une récompense déjà versée (xp_events) n'est pas
--       reversée : la ligne est marquée récompensée avec l'XP d'alors, sans
--       fanfare. Le résultat gagne un champ « erreurs » (nombre de quêtes
--       consignées à cet appel).
--       Définie au §9, qui l'étend (« Récupérer »).
--
-- 2. Le réglage du jour du joueur (V3 §9.2, §1.9), dans codex_joueur :
--    a. quatre colonnes : budget_min (15, 30, 60 ou 90 min, « J'ai … min »
--       du panneau) et budget_jour (le jour de Paris où il a été choisi : il
--       ne vaut que ce jour-là) ; ecartees ({jour, ids} : les quêtes écartées
--       par « Une autre idée ? », pour la journée) ; capacites_vues (ce que
--       la base savait faire au dernier calcul, pour le rattrapage).
--       Le site les lit par une requête à part : sans elles, il garde ces
--       réglages dans le compte (user_metadata) et rien d'autre ne change.
--    b. codex_joueur_regler(uuid, smallint, jsonb) : pose le budget du jour
--       et/ou les quêtes écartées (NULL : inchangé). Ne crée jamais la ligne
--       du joueur (elle naît au premier calcul, qui décide du rétroactif).
--    c. codex_joueur_capacites(uuid, jsonb) : pose les capacités vues.
--    Les deux : clé service seulement.
--
-- 3. Les programmes du joueur (V3 §1.2, §1.6) : le Codex tient plusieurs
--    programmes (CFA I, II, III, histoire…) et un fil rouge commun.
--    a. codex_programmes_joueur : un statut par programme (actif, pause,
--       mené, abandonné), un seul actif ; le jour J propre (NULL : CFA I lit
--       profiles.exam_date). Le joueur lit les siennes ; aucune écriture
--       directe. Sans ligne : CFA I actif (le comportement d'avant).
--    b. codex_programme_poser(uuid, text, text, date) : pose un statut ;
--       « actif » met l'ancien actif en pause, « mene » date la fin. Clé
--       service seulement.
--    c. le CHECK de codex_progression.famille accepte « fil » (le fil
--       rouge) ; codex_ecrire (§1) le laisse passer. Aucune ligne ne change.
--    d. codex_contrats.programme (informatif) et codex_matieres.programme ;
--       _codex_matiere rend une clé qualifiée hors CFA I (« essai:renaissance »).
--
-- 4. codex_mesures_v3(uuid, text) : ce que la base sait faire (les
--    « capacités » : fil, mesures, journal 2 ou 3, séances, À revoir, maîtrise,
--    trophées, débrief, ratures sèches), lu à l'exécution, plus les mesures
--    nouvelles du fil rouge : jours d'encre de toute une vie, programmes
--    menés, maîtres (branches menées à « Maître de… », tous programmes),
--    trophées par source et par palier (trophees_joueur quand
--    migration_v3_profil.sql est collée, sinon les séances ciblées, avec le
--    plafond par taille) ; les notions tenues (par notion : réponses, et
--    justes parmi les 5 dernières) ; les spéciaux par matière (plus longue
--    suite de bonnes réponses d'affilée, de calculs justes d'affilée) ; et,
--    quand migration_v3_profil.sql est collée : la maîtrise unique
--    (maitrise_joueur), la file « À revoir » (revisions_dues), les ratures
--    scellées, les examens blancs à débriefer et la répartition des causes
--    d'erreur (blanc_debrief). Clé service seulement. Réécrite en entier par
--    chaque lot qui l'étend.
--    Définie au §9 : les maîtres comptent les branches faites, récupérées
--    ou non, et la capacité « recuperer » s'ajoute.
--
-- 5. Le journal v3 et une seule lecture des réponses par appel (V3 §12.3bis) :
--    a. _reponses_cache(uuid) : les réponses du joueur lues une fois par
--       appel, dans une table temporaire indexée de la transaction. Corps
--       identique dans migration_v3_profil.sql : le second fichier collé
--       remplace la fonction par le même texte.
--    b. _codex_reponses_v3(uuid) : les réponses rangées par matière et par
--       notion, lues dans ce cache (sans _reponses_joueur : les fiches
--       seules, comme avant).
--    c. codex_journal(uuid) : même signature, mêmes événements qu'avant, plus
--       la durée par question des séances ciblées et des examens blancs,
--       les séances justes (séances réussies, part des questions neuves ou
--       dues), et, selon ce qui est collé : « À revoir » rendue (séries
--       éclair à part), rature scellée, examen blanc débriefé.
--    d. codex_lire(uuid, jsonb, date) : même signature, même résultat, plus
--       « v3 » (codex_mesures_v3 du programme actif) : journal et mesures
--       dans la même transaction, sur une seule lecture des réponses. Elle
--       appelle codex_lire(uuid, jsonb, date, boolean), la même avec
--       p_v3 : à faux (lectures de la seule activité par matière, au
--       tirage et au changement d'un contrat), pas de « v3 », qui serait
--       calculée pour rien. Une surcharge sans valeur par défaut : un appel
--       à trois arguments ne peut viser qu'une seule des deux, même si
--       migration_codex.sql est recollée par-dessus.
--    e. _codex_journal_v3() : le marqueur du journal v3 (capacité
--       « journal » à 3).
--    f. _codex_jours_lus(uuid) : les questions par jour du joueur, lues une
--       fois par appel de codex_lire (pg_temp._cjours) ; le journal (jours
--       d'encre) et codex_mesures_v3 les y prennent au lieu de relire toutes
--       les sources ; appelés seuls, ils relisent (_codex_jours).
--
-- 6. La séance du jour (V3 §6.2) :
--    a. codex_seances : une séance par joueur et par jour (budget, blocs,
--       genres écartés, blocs faits ; la trace : proposée, vue, lancée,
--       finie ; l'instantané au lancement). Le joueur lit les siennes ;
--       aucune écriture directe. Sa présence ouvre la capacité « seances ».
--    b. codex_vue_cache : le dernier panneau et la dernière séance calculés
--       (RLS sans politique : le serveur seul).
--    c. codex_seance_poser(uuid, date, smallint, jsonb, text[]) : crée ou
--       recompose la séance du jour ; un bloc fait n'est jamais retiré.
--    d. codex_seance_marquer(uuid, date, text, jsonb) : vue, lancée, bloc
--       fait, finie, instantané ; chaque date n'est posée qu'une fois.
--    e. codex_vue_cache_poser(uuid, date, jsonb, jsonb) et
--       codex_vue_cache_marquer(uuid) : l'instantané et son « à recalculer ».
--    Toutes : clé service seulement. Sans cette section, la séance est
--    recomposée à chaque calcul et rien n'est gardé.
--
-- 8. Le rythme long (V3 §10.3 à §10.5) :
--    a. codex_semaine : le choix du lundi (cible de 3 à 5 jours d'encre, une
--       commande : banquier, copiste ou ingénieur, et ce qu'elle vise). Le
--       joueur lit les siens ; aucune écriture directe.
--    b. codex_semaine_poser(uuid, date, smallint, text, jsonb) : la semaine
--       en cours seulement ; le premier choix gagne. Clé service seulement.
--    c. codex_contrats.modele_origine (le modèle remplacé) ;
--       codex_contrat_changer redéfinie à l'identique pour le garder.
--    d. serie_pauses : les jours de repos et de pause de la série d'encre.
--       Le joueur lit les siens ; aucune écriture directe.
--    e. serie_pause_poser(date, date, text) : le joueur connecté, jamais dans
--       le passé ; repos : 2 jours par semaine au plus ; pause : 14 jours
--       d'affilée et 30 jours par année glissante au plus.
--    f. serie_pause_retirer(date) : un jour à venir seulement.
--    g. _serie_avancer : même signature, même verrou, mêmes règles ; un jour
--       de repos ou de pause sans ses 10 questions est neutre (ni +1, ni
--       cassure, ni joker). Rien n'est fait sans migration_serie_encre.sql.
--    h. codex_resultat : le verdict de l'examen, privé (une ligne par
--       programme et par session « AAAA-MM », bandes facultatives).
--    i. codex_resultat_poser(uuid, text, text, text, jsonb) : « admis » mène
--       le programme (§3b) ; rien n'est repris. Clé service seulement.
--    Sans cette section : les contrats de la semaine comme avant, pas de
--    repos ni de pause, le verdict gardé dans le compte (rl_verdict).
--
-- 9. « Récupérer » (Codex simplifié) : une quête remplie attend le clic du
--    joueur, qui verse vraiment sa récompense.
--    a. les lignes « terminee » dont l'XP est déjà versée passent
--       « recompensee », sans versement (rejouable) ;
--    b. codex_ecrire : un item « differer » (non rétroactif, XP pas encore
--       versée) est écrit « terminee », sans rien verser ; le reste comme
--       au §1d. Le résultat gagne « differees » ;
--    c. codex_recuperer(uuid, jsonb) : verse les quêtes qui attendent
--       (toutes, ou une liste de {quete, periode}), une seule fois même sur
--       un double clic. Clé service seulement ;
--    d. codex_mesures_v3 : les maîtres comptent les branches faites,
--       récupérées ou non ; capacité « recuperer » (codex_recuperer ET un
--       codex_ecrire qui diffère).
--    codex_ecrire et codex_mesures_v3 ne sont définies qu'ici, en entier :
--    ce §9 se colle seul ou avec tout le fichier. Sans lui, tout est versé
--    d'office, comme avant. L'XP récupérée compte le jour du clic dans les
--    classements de la semaine ; la série d'encre ne multiplie pas l'XP du
--    Codex, rien ne change pour elle.
--    RETOUR EN ARRIÈRE vers un site d'avant « Récupérer » (6db1769 ou plus
--    ancien) après le collage du §9 : ce site tient « terminee » pour fait
--    et n'a aucun bouton « Récupérer ». Les quêtes en attente n'y seraient
--    ni versées ni proposées : l'XP n'est pas perdue, mais reste invisible.
--    Une fois l'ancien site en ligne (il ne met plus rien en attente ;
--    lancée avant, la requête laisserait passer ce que le site actuel
--    diffère encore), verser ce qui attend depuis l'éditeur SQL (rôle
--    propriétaire ; la fonction est fermée aux joueurs) :
--      SELECT u.user_id, codex_recuperer(u.user_id, NULL)
--      FROM (SELECT DISTINCT user_id FROM codex_progression
--            WHERE etat = 'terminee') u;
--    puis contrôler :
--      SELECT count(*) FROM codex_progression WHERE etat = 'terminee';
--    et relancer la première tant que le compte n'est pas 0 : la fonction
--    prend 200 quêtes au plus par joueur et par appel. Un compte qui ne
--    baisse plus signale une ligne en erreur : voir codex_erreurs. Rien
--    d'autre à défaire : le codex_ecrire du §9 verse d'office tout item
--    sans « differer », ce que l'ancien site envoie.
--
-- Ordre de collage :migration_v3_profil.sql (s'il existe), puis ce fichier.
-- Chacun marche seul : une dépendance croisée est testée à l'exécution.

DO $$
BEGIN
  IF to_regclass('public.codex_progression') IS NULL OR to_regclass('public.codex_joueur') IS NULL THEN
    RAISE EXCEPTION 'Coller d''abord migration_codex.sql';
  END IF;
END $$;

-- ── 1a. codex_erreurs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS codex_erreurs (
  id        bigint      GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- '' : une erreur hors quête (une lecture entière qui échoue)
  quete_id  text        NOT NULL DEFAULT '' CHECK (char_length(quete_id) <= 120),
  periode   text        NOT NULL DEFAULT '' CHECK (char_length(periode) <= 10),
  message   text        NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  premiere  timestamptz NOT NULL DEFAULT now(),
  derniere  timestamptz NOT NULL DEFAULT now(),
  fois      integer     NOT NULL DEFAULT 1 CHECK (fois >= 1)
);
CREATE INDEX IF NOT EXISTS codex_erreurs_joueur ON codex_erreurs (user_id, derniere DESC);
ALTER TABLE codex_erreurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS codex_erreurs_select_own ON codex_erreurs;
CREATE POLICY codex_erreurs_select_own ON codex_erreurs FOR SELECT TO authenticated USING (user_id = auth.uid());
-- aucune politique d'écriture : _codex_erreur seulement

-- ── 1b. _codex_erreur ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _codex_erreur(p_user uuid, p_quete text, p_periode text, p_message text)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_q text := left(coalesce(p_quete, ''), 120);
  v_p text := left(coalesce(p_periode, ''), 10);
  v_m text := left(coalesce(nullif(p_message, ''), 'erreur inconnue'), 1000);
BEGIN
  IF p_user IS NULL THEN RETURN; END IF;
  UPDATE codex_erreurs SET derniere = now(), fois = fois + 1
  WHERE user_id = p_user AND quete_id = v_q AND periode = v_p AND message = v_m AND derniere > now() - interval '24 hours';
  IF NOT FOUND THEN
    INSERT INTO codex_erreurs (user_id, quete_id, periode, message) VALUES (p_user, v_q, v_p, v_m);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- consigner ne doit jamais rien casser (joueur supprimé entre-temps…)
  RETURN;
END;
$$;

-- ── 1c. codex_erreur_noter (le site, clé service) ────────────────────
CREATE OR REPLACE FUNCTION codex_erreur_noter(p_user uuid, p_quete text, p_periode text, p_message text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM _codex_erreur(p_user, p_quete, p_periode, p_message);
  RETURN true;
END;
$$;

-- ── 1d. codex_ecrire, tolérante ──────────────────────────────────────
-- Définie au §9 (fin du fichier), qui l'étend : une seule définition.

REVOKE ALL ON FUNCTION _codex_erreur(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_erreur_noter(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION codex_erreur_noter(uuid, text, text, text) TO service_role;

-- ── 2a. codex_joueur : le réglage du jour ────────────────────────────
ALTER TABLE codex_joueur ADD COLUMN IF NOT EXISTS budget_min smallint CHECK (budget_min IN (15, 30, 60, 90));
ALTER TABLE codex_joueur ADD COLUMN IF NOT EXISTS budget_jour date;
-- {"jour": "AAAA-MM-JJ", "ids": ["trame:a2:…", …]}
ALTER TABLE codex_joueur ADD COLUMN IF NOT EXISTS ecartees jsonb;
-- {"fil": true, "journal": 3, …} : les capacités de la base au dernier calcul écrit
ALTER TABLE codex_joueur ADD COLUMN IF NOT EXISTS capacites_vues jsonb;

-- ── 2b. codex_joueur_regler (le site, clé service) ───────────────────
-- p_budget : 15, 30, 60 ou 90 (NULL : inchangé), valable le jour de Paris.
-- p_ecartees : {"jour", "ids"} (NULL : inchangé) ; 30 ids au plus, 120
-- caractères chacun. Rend toujours vide ; sans ligne codex_joueur, rien.
CREATE OR REPLACE FUNCTION codex_joueur_regler(p_user uuid, p_budget smallint, p_ecartees jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_jour date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  IF p_budget IS NOT NULL AND p_budget NOT IN (15, 30, 60, 90) THEN
    RAISE EXCEPTION 'budget invalide : %', p_budget;
  END IF;
  IF p_ecartees IS NOT NULL AND (
       jsonb_typeof(p_ecartees) <> 'object'
    OR jsonb_typeof(p_ecartees -> 'ids') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_ecartees -> 'ids') > 30
    OR coalesce(p_ecartees ->> 'jour', '') !~ '^\d{4}-\d{2}-\d{2}$'
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_ecartees -> 'ids') x
               WHERE jsonb_typeof(x) <> 'string' OR char_length(x #>> '{}') > 120)
  ) THEN
    RAISE EXCEPTION 'quêtes écartées invalides';
  END IF;
  UPDATE codex_joueur SET
    budget_min  = coalesce(p_budget, budget_min),
    budget_jour = CASE WHEN p_budget IS NOT NULL THEN v_jour ELSE budget_jour END,
    ecartees    = coalesce(p_ecartees, ecartees)
  WHERE user_id = p_user;
END $$;

-- ── 2c. codex_joueur_capacites (le site, clé service) ────────────────
CREATE OR REPLACE FUNCTION codex_joueur_capacites(p_user uuid, p_vues jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_vues IS NULL OR jsonb_typeof(p_vues) <> 'object' OR length(p_vues::text) > 2000 THEN
    RAISE EXCEPTION 'capacités invalides';
  END IF;
  UPDATE codex_joueur SET capacites_vues = p_vues WHERE user_id = p_user;
END $$;

REVOKE ALL ON FUNCTION codex_joueur_regler(uuid, smallint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_joueur_capacites(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION codex_joueur_regler(uuid, smallint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION codex_joueur_capacites(uuid, jsonb) TO service_role;

-- ── 3a. codex_programmes_joueur ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS codex_programmes_joueur (
  user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- « domaine/programme » (lib/domains.ts) : « finance/cfa-l1 », « histoire/essai »
  programme text        NOT NULL CHECK (programme ~ '^[a-z]+/[a-z0-9-]{2,40}$'),
  statut    text        NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'pause', 'mene', 'abandonne')),
  -- NULL : CFA I lit profiles.exam_date (le repli d'avant la v3)
  jour_j    date,
  debut     timestamptz NOT NULL DEFAULT now(),
  mene_le   timestamptz,
  PRIMARY KEY (user_id, programme)
);
-- un seul programme actif par joueur
CREATE UNIQUE INDEX IF NOT EXISTS codex_programmes_joueur_un_actif ON codex_programmes_joueur (user_id) WHERE statut = 'actif';
ALTER TABLE codex_programmes_joueur ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS codex_programmes_joueur_select_own ON codex_programmes_joueur;
CREATE POLICY codex_programmes_joueur_select_own ON codex_programmes_joueur FOR SELECT TO authenticated USING (user_id = auth.uid());
-- aucune politique d'écriture : codex_programme_poser seulement

-- ── 3b. codex_programme_poser (le site, clé service) ────────────────
-- Pose le statut d'un programme du joueur. « actif » met l'actif précédent
-- en pause et recopie le programme dans codex_joueur.programme (le miroir) ;
-- « mene » date la fin (mene_le, une fois). p_jour_j NULL : inchangé.
CREATE OR REPLACE FUNCTION codex_programme_poser(p_user uuid, p_programme text, p_statut text, p_jour_j date DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user IS NULL OR p_programme IS NULL OR p_programme !~ '^[a-z]+/[a-z0-9-]{2,40}$' THEN
    RAISE EXCEPTION 'programme invalide : %', p_programme;
  END IF;
  IF p_statut IS NULL OR p_statut NOT IN ('actif', 'pause', 'mene', 'abandonne') THEN
    RAISE EXCEPTION 'statut invalide : %', p_statut;
  END IF;
  IF p_statut = 'actif' THEN
    UPDATE codex_programmes_joueur SET statut = 'pause'
    WHERE user_id = p_user AND statut = 'actif' AND programme <> p_programme;
    UPDATE codex_joueur SET programme = p_programme WHERE user_id = p_user;
  END IF;
  INSERT INTO codex_programmes_joueur AS t (user_id, programme, statut, jour_j, mene_le)
  VALUES (p_user, p_programme, p_statut, p_jour_j, CASE WHEN p_statut = 'mene' THEN now() END)
  ON CONFLICT (user_id, programme) DO UPDATE SET
    statut  = EXCLUDED.statut,
    jour_j  = coalesce(EXCLUDED.jour_j, t.jour_j),
    mene_le = CASE WHEN EXCLUDED.statut = 'mene' THEN coalesce(t.mene_le, now()) ELSE t.mene_le END;
END $$;

REVOKE ALL ON FUNCTION codex_programme_poser(uuid, text, text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION codex_programme_poser(uuid, text, text, date) TO service_role;

-- ── 3c. la famille « fil » (le fil rouge, V3 §1.5) ──────────────────
-- Le CHECK d'origine est recréé avec « fil » en plus ; aucune ligne ne change.
-- codex_ecrire (§1) laisse passer « fil » ; tant que ce CHECK ne le permet
-- pas, le site n'en envoie jamais (capacité « fil », §4).
ALTER TABLE codex_progression DROP CONSTRAINT IF EXISTS codex_progression_famille_check;
ALTER TABLE codex_progression ADD CONSTRAINT codex_progression_famille_check
  CHECK (famille IN ('trame', 'branche', 'longcours', 'contrat', 'exploit', 'acte', 'fil'));

-- ── 3d. le programme des contrats et des matières ───────────────────
-- codex_contrats : informatif (la clé reste par jour).
ALTER TABLE codex_contrats ADD COLUMN IF NOT EXISTS programme text NOT NULL DEFAULT 'finance/cfa-l1';
-- codex_matieres : hors CFA I, la clé rendue est qualifiée (« essai:renaissance »),
-- pour que les réponses du Niveau I ne comptent jamais au Niveau II.
ALTER TABLE codex_matieres ADD COLUMN IF NOT EXISTS programme text NOT NULL DEFAULT 'finance/cfa-l1';

-- La matière d'un quiz : son dossier d'abord (les dossiers de deux programmes
-- sont disjoints), sinon le début de son titre (CFA I d'abord, à égalité).
-- Hors CFA I, une clé nue est qualifiée du slug de son programme.
CREATE OR REPLACE FUNCTION _codex_matiere(p_dossier text, p_titre text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN x.programme = 'finance/cfa-l1' OR position(':' IN x.cle) > 0 THEN x.cle
              ELSE split_part(x.programme, '/', 2) || ':' || x.cle END
  FROM (
    SELECT m.cle, m.programme, 0 AS rang FROM codex_matieres m
    WHERE p_dossier IS NOT NULL AND p_dossier = ANY (m.dossiers)
    UNION ALL
    SELECT m.cle, m.programme, 1 FROM codex_matieres m
    WHERE p_titre IS NOT NULL AND (m.prefixe_drill = split_part(p_titre, ' — ', 1) OR lower(m.nom) = lower(split_part(p_titre, ' — ', 1)))
  ) x
  ORDER BY x.rang, (x.programme <> 'finance/cfa-l1'), x.cle
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION _codex_matiere(text, text) FROM PUBLIC, anon, authenticated;

-- ── 4. codex_mesures_v3 (le site, clé service) ──────────────────────
-- Définie au §9d (fin du fichier), qui l'étend : une seule définition.

-- ── 5. le journal v3, une seule lecture des réponses par appel ──────
-- 5a. Les réponses du joueur lues une fois par appel (V3 §12.3bis) : une
-- table temporaire de la transaction, indexée, partagée par tous les lecteurs
-- du même appel (codex_journal, codex_mesures_v3, maitrise_joueur,
-- revisions_dues). Même texte attendu dans migration_v3_profil.sql (V3
-- §12.3bis) : celui-ci range chaque question dans sa matière une seule fois
-- (et non à chaque réponse : 30 000 appels de _codex_matiere coûtaient plus
-- d'une seconde), mêmes colonnes, mêmes lignes.
CREATE OR REPLACE FUNCTION _reponses_cache(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF to_regclass('pg_temp._rep_cache') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_temp._rep_cache_cle WHERE user_id = p_user) THEN RETURN; END IF;
    DROP TABLE pg_temp._rep_cache; DROP TABLE IF EXISTS pg_temp._rep_cache_cle;   -- table temporaire de la transaction, pas une donnée
  END IF;
  CREATE TEMP TABLE _rep_cache ON COMMIT DROP AS
    WITH r AS MATERIALIZED (SELECT x.question_id, x.source, x.ok, x.at FROM _reponses_joueur(p_user) x),
    m AS (
      SELECT d.question_id,
             (SELECT _codex_matiere(lf.name, qs.title)
              FROM quiz_questions qq
              LEFT JOIN quiz_sets qs ON qs.id = qq.set_id
              LEFT JOIN library_folders lf ON lf.id = qs.folder_id
              WHERE qq.id = d.question_id
              LIMIT 1) AS matiere
      FROM (SELECT DISTINCT r.question_id FROM r WHERE r.question_id IS NOT NULL) d
    )
    SELECT r.question_id, r.source, r.ok, r.at, m.matiere
    FROM r LEFT JOIN m ON m.question_id = r.question_id;
  CREATE INDEX ON pg_temp._rep_cache (question_id, at);
  CREATE INDEX ON pg_temp._rep_cache (matiere, at);
  CREATE TEMP TABLE _rep_cache_cle ON COMMIT DROP AS SELECT p_user AS user_id;
END $$;

-- 5b. Une colonne existe-t-elle (table du schéma public) ? Le journal ne lit
-- une colonne nouvelle que si elle est collée.
CREATE OR REPLACE FUNCTION _codex_colonne(p_table text, p_colonne text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM pg_attribute a
                 WHERE a.attrelid = to_regclass('public.' || p_table) AND a.attname = p_colonne AND a.attnum > 0 AND NOT a.attisdropped);
$$;

-- Les réponses du joueur rangées par matière et par notion : le cache de
-- l'appel (_reponses_cache) quand _reponses_joueur existe ; sinon les
-- réponses de fiche seules (_codex_reponses), comme le journal d'avant.
CREATE OR REPLACE FUNCTION _codex_reponses_v3(p_user uuid)
RETURNS TABLE (question_id uuid, source text, ok boolean, at timestamptz, matiere text, notion text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_notion text := CASE WHEN _codex_colonne('quiz_questions', 'notion') THEN 'qq.notion::text' ELSE 'NULL::text' END;
BEGIN
  IF to_regprocedure('public._reponses_joueur(uuid)') IS NOT NULL THEN
    PERFORM _reponses_cache(p_user);
    RETURN QUERY EXECUTE format($q$
      SELECT c.question_id, c.source, c.ok, c.at, c.matiere, %s
      FROM pg_temp._rep_cache c LEFT JOIN quiz_questions qq ON qq.id = c.question_id
      WHERE c.ok IS NOT NULL AND c.at IS NOT NULL
    $q$, v_notion);
  ELSE
    RETURN QUERY EXECUTE format($q$
      SELECT r.question_id, r.source, r.ok, r.at, _codex_matiere(lf.name, qs.title), %s
      FROM _codex_reponses($1) r
      LEFT JOIN quiz_questions qq ON qq.id = r.question_id
      LEFT JOIN quiz_sets qs ON qs.id = qq.set_id
      LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    $q$, v_notion) USING p_user;
  END IF;
END;
$$;

-- 5c. Le journal v3 : celui de migration_codex.sql (mêmes événements, mêmes
-- lignes), dont les réponses passent par le cache, plus :
--   session_terminee.secondesParQuestion   séances ciblées (durée / questions)
--   examen_blanc_rendu.secondesParQuestion examens blancs, reprises et officiels
--   eclair_rendue                          les séries éclair seules quand eclair_series.genre existe
--   revoir_rendue {questions, justes, pct} une « À revoir » rendue en entier (pas celle close d'office)
--   seance_juste {source, pct, questions, fraiches}
--                                          une séance réussie (70 % ou mieux) : page de fiche, séance
--                                          ciblée, série éclair ou « À revoir », les 30 du jour, Atelier
--                                          (pas les QCM : leurs réponses ne sont pas gardées) ; fraiches =
--                                          part (%) de ses questions neuves ou dues (aucune réponse dans
--                                          le jour qui précède la séance)
--   rature_scellee {matiere, notion, ageJours}       quand ratures.scellee_le existe
--   blanc_debriefe {source, ref, erreurs, classees, part}
--                                          quand blanc_debrief existe, daté du dernier classement
-- VOLATILE : le cache est une table temporaire de la transaction.
CREATE OR REPLACE FUNCTION codex_journal(p_user uuid)
RETURNS TABLE (evenement text, quand timestamptz, champs jsonb)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_parts   text[] := '{}';
  v_ami     text := 'false';
  v_ment    text := 'NULL::text';
  v_rayee   boolean;
  v_cache   boolean := to_regprocedure('public._reponses_joueur(uuid)') IS NOT NULL;
  v_genre   text := CASE WHEN _codex_colonne('eclair_series', 'genre') THEN 'e.genre' ELSE '''eclair''::text' END;
  v_seances text[] := '{}';
BEGIN
  IF p_user IS NULL THEN
    RETURN;
  END IF;
  -- le cache des réponses existe avant que la requête du journal soit préparée (seance_juste le lit)
  IF v_cache THEN
    PERFORM _reponses_cache(p_user);
  END IF;

  -- question_repondue : une réponse, toutes sources. matiere / notion via la question ;
  -- premiere et ecartJours via la réponse précédente du joueur à la même question.
  v_parts := array_append(v_parts, $q$
    SELECT 'question_repondue'::text, x.at,
           jsonb_build_object('source', x.src, 'matiere', x.matiere, 'notion', x.notion, 'juste', x.ok, 'question', x.qid::text,
                              'premiere', x.prev IS NULL,
                              'ecartJours', CASE WHEN x.prev IS NULL THEN NULL ELSE floor(extract(epoch FROM (x.at - x.prev)) / 86400)::int END)
    FROM (
      SELECT r.question_id AS qid,
             CASE r.source WHEN 'daily' THEN 'defi' WHEN 'practice' THEN 'ciblee' WHEN 'mock' THEN 'blanc' ELSE r.source END AS src,
             r.ok, r.at, lag(r.at) OVER (PARTITION BY r.question_id ORDER BY r.at) AS prev,
             r.matiere, r.notion
      FROM _codex_reponses_v3($1) r
    ) x
  $q$);

  -- session_terminee + drill_page_terminee : les pages de fiche passées en entier
  IF to_regclass('public.quiz_answer_log') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'session_terminee'::text, p.fin,
             jsonb_build_object('source', 'fiche', 'matiere', _codex_matiere(p.dossier, p.titre), 'questions', p.n, 'justes', p.justes,
                                'pct', round(100.0 * p.justes / greatest(p.n, 1))::int)
      FROM _codex_pages($1) p WHERE p.complet
    $q$);
    v_parts := array_append(v_parts, $q$
      SELECT 'drill_page_terminee'::text, p.fin,
             jsonb_build_object('matiere', _codex_matiere(p.dossier, p.titre),
                                'fiche', (SELECT m.fiche FROM codex_matieres m WHERE m.prefixe_drill = split_part(p.titre, ' — ', 1) LIMIT 1),
                                'page', (substring(p.titre FROM 'Page ([0-9]+)'))::int, 'questions', p.n, 'justes', p.justes,
                                'pct', round(100.0 * p.justes / greatest(p.n, 1))::int)
      FROM _codex_pages($1) p WHERE p.complet AND p.titre ~ ' — Drill Fiche Page [0-9]+'
    $q$);
    -- seance_juste : la page de fiche, ses questions et le moment de sa première réponse
    v_seances := array_append(v_seances, $q$
      SELECT 'fiche'::text AS src, z.run_id::text AS cle, z.debut, z.fin, z.n::int AS questions, z.justes::int AS justes, z.question_id AS qid
      FROM (
        SELECT l.run_id, l.question_id, min(l.answered_at) OVER w AS debut, max(l.answered_at) OVER w AS fin,
               count(*) OVER w AS n, count(*) FILTER (WHERE l.is_correct) OVER w AS justes
        FROM quiz_answer_log l WHERE l.user_id = $1 AND l.mode = 'page'
        WINDOW w AS (PARTITION BY l.run_id, l.set_id)
      ) z
      -- une page passée en entier (_codex_pages), réussie
      WHERE round(100.0 * z.justes / z.n) >= 70
        AND z.run_id IN (SELECT c.run_id FROM _codex_pages($1) c WHERE c.complet)
    $q$);
  END IF;

  -- session_terminee : sessions ciblées (avec la durée par question), QCM chronométrés, QCM entiers et examens officiels
  IF to_regclass('public.practice_session_results') IS NOT NULL THEN
    v_parts := array_append(v_parts, format($q$
      SELECT 'session_terminee'::text, r.completed_at,
             jsonb_build_object('source', 'ciblee', 'matiere', CASE WHEN cardinality(r.topics) = 1 THEN r.topics[1] END,
                                'questions', r.total, 'justes', r.score, 'pct', round(100.0 * r.score / r.total)::int,
                                'secondesParQuestion', %s)
      FROM practice_session_results r WHERE r.user_id = $1 AND r.total > 0 AND r.completed_at IS NOT NULL
    $q$, CASE WHEN _codex_colonne('practice_session_results', 'duration_seconds')
              THEN 'CASE WHEN r.duration_seconds > 0 THEN round(r.duration_seconds::numeric / r.total)::int END' ELSE 'NULL::int' END));
    -- seance_juste : les réponses d'une séance ciblée sont datées de sa fin (_reponses_joueur)
    v_seances := array_append(v_seances, $q$
      SELECT 'ciblee'::text, r.id::text, r.completed_at, r.completed_at, r.total, r.score, c.question_id
      FROM practice_session_results r
      JOIN pg_temp._rep_cache c ON c.source = 'practice' AND c.at = r.completed_at
      WHERE r.user_id = $1 AND r.total > 0 AND r.completed_at IS NOT NULL AND round(100.0 * r.score / r.total) >= 70
    $q$);
  END IF;
  IF to_regclass('public.practice_sessions') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'session_terminee'::text, s.occurred_at,
             jsonb_build_object('source', 'qcm', 'matiere', NULL, 'questions', s.total, 'justes', s.correct, 'pct', round(100.0 * s.correct / s.total)::int)
      FROM practice_sessions s WHERE s.user_id = $1 AND s.mode = 'qcm' AND s.total > 0
    $q$);
    -- flashcards_revues : les séances de cartes de /session (practice_sessions, mode flashcards)
    v_parts := array_append(v_parts, $q$
      SELECT 'flashcards_revues'::text, s.occurred_at,
             jsonb_build_object('matiere', (SELECT _codex_matiere(lf.name, s.set_title) FROM quiz_sets qs LEFT JOIN library_folders lf ON lf.id = qs.folder_id WHERE qs.id = s.set_id),
                                'cartes', s.total)
      FROM practice_sessions s WHERE s.user_id = $1 AND s.mode = 'flashcards' AND s.total > 0
    $q$);
  END IF;
  IF to_regclass('public.quiz_attempts') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'session_terminee'::text, a.created_at,
             jsonb_build_object('source', CASE WHEN lf.name = 'Mocks Officiels (Système)' THEN 'examen' ELSE 'qcm' END, 'matiere', NULL,
                                'questions', a.total, 'justes', a.score, 'pct', round(100.0 * a.score / a.total)::int)
      FROM quiz_attempts a
      LEFT JOIN quiz_sets qs ON qs.id = a.set_id
      LEFT JOIN library_folders lf ON lf.id = qs.folder_id
      WHERE a.user_id = $1 AND a.total > 0 AND a.score IS NOT NULL
    $q$);
    -- examens officiels joués en entier (/qcm)
    v_parts := array_append(v_parts, format($q$
      SELECT 'examen_blanc_rendu'::text, a.created_at,
             jsonb_build_object('questions', a.total, 'justes', a.score, 'pct', round(100.0 * a.score / a.total)::int, 'officiel', true, 'reprise', false,
                                'secondesParQuestion', %s)
      FROM quiz_attempts a
      JOIN quiz_sets qs ON qs.id = a.set_id
      JOIN library_folders lf ON lf.id = qs.folder_id AND lf.name = 'Mocks Officiels (Système)'
      WHERE a.user_id = $1 AND a.total > 0 AND a.score IS NOT NULL
    $q$, CASE WHEN _codex_colonne('quiz_attempts', 'duration_seconds')
              THEN 'CASE WHEN a.duration_seconds > 0 THEN round(a.duration_seconds::numeric / a.total)::int END' ELSE 'NULL::int' END));
  END IF;

  -- les 30 du jour / les 5 du jour rendus
  IF to_regclass('public.daily_attempts') IS NOT NULL AND to_regclass('public.daily_challenges') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'defi_rendu'::text, t.finished_at,
             jsonb_build_object('questions', t.total, 'justes', t.score, 'pct', round(100.0 * t.score / t.total)::int)
      FROM daily_attempts t JOIN daily_challenges c ON c.id = t.challenge_id
      WHERE t.user_id = $1 AND t.finished_at IS NOT NULL AND t.total > 0 AND c.program <> 'cfa-l1-cinq'
    $q$);
    v_parts := array_append(v_parts, $q$
      SELECT 'cinq_rendu'::text, t.finished_at,
             jsonb_build_object('justes', t.score, 'secondes', t.seconds,
                                'rang', 1 + (SELECT count(*) FROM daily_attempts o
                                             WHERE o.challenge_id = t.challenge_id AND o.finished_at IS NOT NULL AND o.user_id <> t.user_id
                                               AND (o.score > t.score OR (o.score = t.score AND coalesce(o.seconds, 1000000) < coalesce(t.seconds, 1000000)))))
      FROM daily_attempts t JOIN daily_challenges c ON c.id = t.challenge_id
      WHERE t.user_id = $1 AND t.finished_at IS NOT NULL AND t.score IS NOT NULL AND c.program = 'cfa-l1-cinq'
    $q$);
    -- seance_juste : les 30 du jour (pas les 5)
    IF to_regclass('public.daily_answers') IS NOT NULL THEN
      v_seances := array_append(v_seances, $q$
        SELECT 'defi'::text, t.challenge_id::text, t.started_at, t.finished_at, t.total, t.score, a.question_id
        FROM daily_attempts t
        JOIN daily_challenges c ON c.id = t.challenge_id AND c.program <> 'cfa-l1-cinq'
        JOIN daily_answers a ON a.challenge_id = t.challenge_id AND a.user_id = t.user_id AND a.question_id IS NOT NULL AND a.selected_index IS NOT NULL
        WHERE t.user_id = $1 AND t.finished_at IS NOT NULL AND t.total > 0 AND round(100.0 * t.score / t.total) >= 70
      $q$);
    END IF;
  END IF;

  -- séries éclair (sans les « À revoir » quand eclair_series.genre existe), et « À revoir » rendues en entier
  IF to_regclass('public.eclair_series') IS NOT NULL THEN
    v_parts := array_append(v_parts, format($q$
      SELECT 'eclair_rendue'::text, e.finished_at, jsonb_build_object('questions', coalesce(e.total, 0), 'justes', coalesce(e.score, 0))
      FROM eclair_series e WHERE e.user_id = $1 AND e.finished_at IS NOT NULL AND %s = 'eclair'
    $q$, v_genre));
    IF v_genre = 'e.genre' THEN
      v_parts := array_append(v_parts, $q$
        SELECT 'revoir_rendue'::text, e.finished_at,
               jsonb_build_object('questions', e.total, 'justes', coalesce(e.score, 0), 'pct', round(100.0 * coalesce(e.score, 0) / e.total)::int)
        FROM eclair_series e
        WHERE e.user_id = $1 AND e.genre = 'revoir' AND e.finished_at IS NOT NULL AND e.total > 0
          AND e.total = coalesce(array_length(e.question_ids, 1), 0)
      $q$);
    END IF;
    -- seance_juste : une série éclair, ou une « À revoir » rendue en entier
    v_seances := array_append(v_seances, format($q$
      SELECT %1$s, e.id::text, e.started_at, e.finished_at, e.total, coalesce(e.score, 0), t.qid
      FROM eclair_series e CROSS JOIN LATERAL unnest(e.question_ids) WITH ORDINALITY AS t(qid, pos)
      WHERE e.user_id = $1 AND e.finished_at IS NOT NULL AND e.total > 0 AND e.answers[t.pos] IS NOT NULL
        AND round(100.0 * coalesce(e.score, 0) / e.total) >= 70
        AND (%1$s = 'eclair' OR e.total = coalesce(array_length(e.question_ids, 1), 0))
    $q$, v_genre));
  END IF;

  -- duels terminés (réglés, deux joueurs)
  IF to_regclass('public.duels') IS NOT NULL THEN
    IF to_regclass('public.friendships') IS NOT NULL THEN
      v_ami := $q$EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'accepted'
                           AND ((f.requester = $1 AND f.addressee = d.autre) OR (f.requester = d.autre AND f.addressee = $1)))$q$;
    END IF;
    IF to_regclass('public.duel_mentions') IS NOT NULL THEN
      v_ment := $q$(SELECT m.mention FROM duel_mentions m WHERE m.duel_id = d.id AND m.user_id = $1 ORDER BY m.mention LIMIT 1)$q$;
    END IF;
    v_parts := array_append(v_parts, format($q$
      SELECT 'duel_termine'::text, d.fin,
             jsonb_build_object('resultat', CASE WHEN d.winner_id = $1 THEN 'victoire' WHEN d.winner_id IS NULL THEN 'nul' ELSE 'defaite' END,
                                'ecartPaliers', coalesce(_codex_palier(d.elo_autre) - _codex_palier(d.elo_moi), 0),
                                'ami', %s, 'mention', %s)
      FROM (
        SELECT du.id, du.winner_id,
               coalesce(du.finished_at, CASE WHEN du.challenger_id = $1 THEN du.challenger_finished_at ELSE du.opponent_finished_at END) AS fin,
               CASE WHEN du.challenger_id = $1 THEN du.opponent_id ELSE du.challenger_id END AS autre,
               CASE WHEN du.challenger_id = $1 THEN du.challenger_elo_before ELSE du.opponent_elo_before END AS elo_moi,
               CASE WHEN du.challenger_id = $1 THEN du.opponent_elo_before ELSE du.challenger_elo_before END AS elo_autre
        FROM duels du
        WHERE du.status = 'finished' AND du.opponent_id IS NOT NULL AND $1 IN (du.challenger_id, du.opponent_id)
      ) d
      WHERE d.fin IS NOT NULL
    $q$, v_ami, v_ment));
  END IF;

  -- examens blancs classés (première copie) et reprises, avec la durée par question
  IF to_regclass('public.mock_exam_results') IS NOT NULL THEN
    v_parts := array_append(v_parts, format($q$
      SELECT 'examen_blanc_rendu'::text, r.completed_at,
             jsonb_build_object('questions', r.total, 'justes', r.score, 'pct', round(100.0 * r.score / r.total)::int, 'officiel', false, 'reprise', false,
                                'secondesParQuestion', %s)
      FROM mock_exam_results r WHERE r.user_id = $1 AND r.total > 0 AND r.completed_at IS NOT NULL
    $q$, CASE WHEN _codex_colonne('mock_exam_results', 'duration_seconds')
              THEN 'CASE WHEN r.duration_seconds > 0 THEN round(r.duration_seconds::numeric / r.total)::int END' ELSE 'NULL::int' END));
  END IF;
  IF to_regclass('public.mock_exam_attempts') IS NOT NULL THEN
    v_parts := array_append(v_parts, format($q$
      SELECT 'examen_blanc_rendu'::text, r.completed_at,
             jsonb_build_object('questions', r.total, 'justes', r.score, 'pct', round(100.0 * r.score / r.total)::int, 'officiel', false, 'reprise', true,
                                'secondesParQuestion', %s)
      FROM mock_exam_attempts r WHERE r.user_id = $1 AND r.total > 0 AND r.completed_at IS NOT NULL
    $q$, CASE WHEN _codex_colonne('mock_exam_attempts', 'duration_seconds')
              THEN 'CASE WHEN r.duration_seconds > 0 THEN round(r.duration_seconds::numeric / r.total)::int END' ELSE 'NULL::int' END));
  END IF;

  -- séances d'Atelier terminées
  IF to_regclass('public.ateliers') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'seance_atelier'::text, a.finished_at,
             jsonb_build_object('questions', coalesce(a.total, 0), 'justes', coalesce(a.score, 0), 'notions', cardinality(a.notions),
                                'rayees', (SELECT count(*) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(a.reponses) = 'array' THEN a.reponses ELSE '[]'::jsonb END) x
                                           WHERE x->>'k' = 'rature' AND coalesce((x->>'ok')::boolean, false) AND NOT coalesce((x->>'r')::boolean, false)))
      FROM ateliers a WHERE a.user_id = $1 AND a.finished_at IS NOT NULL
    $q$);
    -- seance_juste : les questions de l'Atelier (ratures et neuves, hors re-test)
    v_seances := array_append(v_seances, $q$
      SELECT 'atelier'::text, a.id::text, a.started_at, a.finished_at, a.total, coalesce(a.score, 0), (x->>'q')::uuid
      FROM ateliers a
      CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.reponses) = 'array' THEN a.reponses ELSE '[]'::jsonb END) AS x
      WHERE a.user_id = $1 AND a.finished_at IS NOT NULL AND coalesce(a.total, 0) > 0
        AND round(100.0 * coalesce(a.score, 0) / a.total) >= 70
        AND x->>'k' IN ('rature', 'neuve') AND NOT coalesce((x->>'r')::boolean, false)
        AND x->>'q' ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
    $q$);
  END IF;

  -- seance_juste : les séances réussies et la part de leurs questions neuves ou dues (aucune réponse du
  -- joueur à la même question dans le jour qui précède la séance), lue dans le cache, index (question_id, at)
  IF v_cache AND cardinality(v_seances) > 0 THEN
    v_parts := array_append(v_parts, format($q$
      SELECT 'seance_juste'::text, s.fin,
             jsonb_build_object('source', s.src, 'pct', round(100.0 * s.justes / s.questions)::int, 'questions', s.questions,
                                'fraiches', round(100.0 * count(*) FILTER (WHERE s.fraiche) / count(*))::int)
      FROM (
        SELECT i.src, i.cle, i.fin, i.questions, i.justes,
               NOT EXISTS (SELECT 1 FROM pg_temp._rep_cache p
                           WHERE p.question_id = i.qid AND p.at < i.debut AND p.at >= i.debut - interval '1 day') AS fraiche
        FROM (%s) i
        WHERE i.fin IS NOT NULL AND i.debut IS NOT NULL AND i.qid IS NOT NULL
      ) s
      GROUP BY s.src, s.cle, s.fin, s.questions, s.justes
    $q$, array_to_string(v_seances, E'\nUNION ALL\n')));
  END IF;

  -- ratures rayées par une bonne réponse en reprise (ratures.rayee_le, migration_profil_sceaux.sql)
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ratures' AND column_name = 'rayee_le') INTO v_rayee;
  IF v_rayee THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'rature_rayee'::text, r.rayee_le,
             jsonb_build_object('matiere', _codex_matiere(r.folder_name, r.set_title),
                                'notion', (SELECT to_jsonb(qq) ->> 'notion' FROM quiz_questions qq WHERE qq.id = r.question_id),
                                'ageJours', greatest(0, floor(extract(epoch FROM (r.rayee_le - r.first_missed_at)) / 86400))::int,
                                'erreurs', r.misses)
      FROM ratures r WHERE r.user_id = $1 AND r.rayee_le IS NOT NULL
    $q$);
  END IF;
  -- ratures scellées (ratures.scellee_le, migration_v3_profil.sql §3a)
  IF _codex_colonne('ratures', 'scellee_le') THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'rature_scellee'::text, r.scellee_le,
             jsonb_build_object('matiere', _codex_matiere(r.folder_name, r.set_title),
                                'notion', (SELECT to_jsonb(qq) ->> 'notion' FROM quiz_questions qq WHERE qq.id = r.question_id),
                                'ageJours', greatest(0, floor(extract(epoch FROM (r.scellee_le - r.first_missed_at)) / 86400))::int)
      FROM ratures r WHERE r.user_id = $1 AND r.scellee_le IS NOT NULL
    $q$);
  END IF;

  -- examens blancs débriefés (blanc_debrief, migration_v3_profil.sql §5) : une ligne par copie, datée
  -- du premier instant où la part classée atteint 80 % (la k-ième erreur classée, dans l'ordre des
  -- premiers classements : blanc_debrief_noter ne touche plus note_le quand on change une cause), de
  -- sorte que reclasser une erreur ne redate rien ; sous 80 %, du dernier classement. Erreurs d'après
  -- _blanc_erreurs (au moins les classées), part en %
  IF to_regclass('public.blanc_debrief') IS NOT NULL AND to_regprocedure('public._blanc_erreurs(uuid,text,uuid)') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'blanc_debriefe'::text, coalesce(d.franchi, d.dernier),
             jsonb_build_object('source', d.source, 'ref', d.ref::text, 'erreurs', d.erreurs, 'classees', d.classees,
                                'part', round(100.0 * d.classees / d.erreurs)::int)
      FROM (
        SELECT e.source, e.ref, e.dernier, e.classees, e.erreurs,
               (SELECT min(x.note_le)
                  FROM (SELECT g2.note_le, row_number() OVER (ORDER BY g2.note_le, g2.question_id) AS k
                          FROM blanc_debrief g2 WHERE g2.user_id = $1 AND g2.source = e.source AND g2.ref = e.ref) x
                 WHERE round(100.0 * x.k / e.erreurs) >= 80) AS franchi
        FROM (
          SELECT b.source, b.ref, b.dernier, b.classees, greatest(b.classees, (SELECT count(*)::int FROM _blanc_erreurs($1, b.source, b.ref))) AS erreurs
          FROM (SELECT g.source, g.ref, max(g.note_le) AS dernier, count(*)::int AS classees
                FROM blanc_debrief g WHERE g.user_id = $1 GROUP BY g.source, g.ref) b
        ) e
      ) d
    $q$);
  END IF;

  -- calculs purs
  IF to_regclass('public.calc_attempts') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'calcul_repondu'::text, c.answered_at,
             jsonb_build_object('matiere', (SELECT m.cle FROM codex_matieres m WHERE m.cle = c.topic), 'type', c.type_key, 'juste', c.correct)
      FROM calc_attempts c WHERE c.user_id = $1
    $q$);
  END IF;

  -- cours écoutés, cartes révisées, fiches ouvertes (codex_noter)
  v_parts := array_append(v_parts, $q$
    SELECT e.type, e.quand, e.champs FROM codex_evenements e WHERE e.user_id = $1
  $q$);

  -- passages de palier (première fois qu'un ELO atteint chaque palier)
  IF to_regclass('public.rating_events') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'palier_atteint'::text, min(r.created_at), jsonb_build_object('palier', t.p)
      FROM generate_series(1, 6) AS t(p)
      JOIN rating_events r ON r.user_id = $1 AND _codex_palier(r.elo_after) >= t.p
      GROUP BY t.p
    $q$);
  END IF;

  -- jours d'encre : un jour à 10 questions ou plus ; serie = jours d'affilée jusqu'à celui-là
  v_parts := array_append(v_parts, $q$
    SELECT 'jour_encre'::text, ((s.jour + time '12:00') AT TIME ZONE 'Europe/Paris'),
           jsonb_build_object('serie', row_number() OVER (PARTITION BY s.groupe ORDER BY s.jour)::int, 'joker', false)
    FROM (SELECT j.jour, j.jour - (row_number() OVER (ORDER BY j.jour))::int AS groupe FROM _codex_jours_lus($1) j WHERE j.n >= 10) s
  $q$);

  -- questions marquées
  IF to_regclass('public.question_flags') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'question_marquee'::text, f.created_at,
             jsonb_build_object('matiere', (SELECT _codex_matiere(lf.name, qs.title) FROM quiz_questions qq
                                            JOIN quiz_sets qs ON qs.id = qq.set_id LEFT JOIN library_folders lf ON lf.id = qs.folder_id WHERE qq.id = f.question_id))
      FROM question_flags f WHERE f.user_id = $1
    $q$);
  END IF;

  -- amis
  IF to_regclass('public.friendships') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'ami_ajoute'::text, coalesce(f.responded_at, f.created_at), '{}'::jsonb
      FROM friendships f WHERE f.status = 'accepted' AND $1 IN (f.requester, f.addressee)
    $q$);
  END IF;

  RETURN QUERY EXECUTE array_to_string(v_parts, E'\nUNION ALL\n') USING p_user;
END;
$$;

-- 5d. codex_lire : celui de migration_codex.sql (mêmes compteurs, mêmes
-- mesures, mêmes spéciaux), qui remplit le cache des réponses en tête (le
-- journal, les mesures v3 et la maîtrise unique le partagent), puis ajoute
-- « v3 » : codex_mesures_v3 du programme actif, dans la même transaction.
--   résultat : { compteurs, mesures, speciaux, v3? }   (v3 absente : le site appelle codex_mesures_v3 à part)
-- p_v3 à faux : sans « v3 » (le site ne lit que des compteurs : l'activité par
-- matière au tirage des contrats). Sans valeur par défaut, exprès : l'appel à
-- trois arguments (codex_lire(uuid, jsonb, date), plus bas) reste sans
-- ambiguïté, même avec la version de migration_codex.sql recollée.
CREATE OR REPLACE FUNCTION codex_lire(p_user uuid, p_demandes jsonb, p_jour date, p_v3 boolean)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_jour   date := coalesce(p_jour, (now() AT TIME ZONE 'Europe/Paris')::date);
  v_today  date := (now() AT TIME ZONE 'Europe/Paris')::date;
  d        record;
  v_ev     text;
  v_cond   text;
  v_seuil  numeric;
  v_dist   text;
  v_somme  text;
  v_val    text;
  v_n      numeric;
  v_at     timestamptz;
  v_comp   jsonb := '{}'::jsonb;
  v_mes    jsonb := '{}'::jsonb;
  v_spe    jsonb := '{}'::jsonb;
  v_tmp    jsonb;
  v_b      numeric;
  v_c      numeric;
  v_ph     boolean;
  v_re     boolean;
  v_au     boolean;
  v_fin    date;
  v_prog   text := 'finance/cfa-l1';
  v_actif  text;
  v_v3     jsonb;
BEGIN
  IF p_user IS NULL THEN
    RAISE EXCEPTION 'Joueur manquant';
  END IF;
  IF p_demandes IS NULL OR jsonb_typeof(p_demandes) <> 'array' THEN
    p_demandes := '[]'::jsonb;
  END IF;

  -- les réponses du joueur, lues une fois pour tout l'appel : journal, mesures v3, maîtrise unique
  IF to_regprocedure('public._reponses_joueur(uuid)') IS NOT NULL THEN
    PERFORM _reponses_cache(p_user);
  END IF;

  DROP TABLE IF EXISTS pg_temp._cj;
  DROP TABLE IF EXISTS pg_temp._cjours;
  DROP TABLE IF EXISTS pg_temp._cjours_cle;
  -- les questions par jour, lues une fois avant le journal : ses jours d'encre et
  -- codex_mesures_v3 les relisent ici (_codex_jours_lus, clé du joueur)
  CREATE TEMP TABLE _cjours ON COMMIT DROP AS SELECT j.jour, j.n FROM _codex_jours(p_user) j;
  CREATE TEMP TABLE _cjours_cle ON COMMIT DROP AS SELECT p_user AS user_id;
  CREATE TEMP TABLE _cj ON COMMIT DROP AS SELECT j.evenement, j.quand, j.champs FROM codex_journal(p_user) j;
  -- chaque demande ne parcourt que les lignes de son événement
  CREATE INDEX ON pg_temp._cj (evenement, quand);
  ANALYZE pg_temp._cj;

  -- ── les compteurs ──
  FOR d IN SELECT value AS v FROM jsonb_array_elements(p_demandes) LOOP
    v_ev := d.v->>'evenement';
    CONTINUE WHEN v_ev IS NULL OR coalesce(d.v->>'id', '') = '';
    v_cond := format('evenement = %L AND %s AND %s', v_ev, _codex_filtre(d.v->'filtre'),
                     _codex_fenetre(d.v->'fenetre', coalesce((d.v->>'jour')::date, v_jour)));
    v_seuil := greatest(1, coalesce((d.v->>'seuil')::numeric, 1));
    v_dist := d.v->>'distinct';
    v_somme := d.v->>'somme';
    v_at := NULL;
    IF v_somme IS NOT NULL THEN
      IF v_somme !~ '^[A-Za-z_]{1,40}$' THEN RAISE EXCEPTION 'Champ invalide : %', v_somme; END IF;
      EXECUTE format($f$
        SELECT coalesce(sum(s.v), 0),
               (SELECT b.quand FROM (SELECT a.quand, sum(a.v) OVER (ORDER BY a.quand, a.ord) AS c
                                     FROM (SELECT quand, (champs->>%L)::numeric AS v, row_number() OVER (ORDER BY quand) AS ord
                                           FROM pg_temp._cj WHERE %s) a) b
                WHERE b.c >= %s ORDER BY b.quand LIMIT 1)
        FROM (SELECT (champs->>%L)::numeric AS v FROM pg_temp._cj WHERE %s) s
      $f$, v_somme, v_cond, v_seuil, v_somme, v_cond) INTO v_n, v_at;
    ELSIF v_dist IS NOT NULL THEN
      IF v_dist = 'jour' THEN
        v_val := $v$((quand AT TIME ZONE 'Europe/Paris')::date)::text$v$;
      ELSE
        IF v_dist !~ '^[A-Za-z_]{1,40}$' THEN RAISE EXCEPTION 'Champ invalide : %', v_dist; END IF;
        v_val := format('(champs->>%L)', v_dist);
      END IF;
      EXECUTE format($f$
        SELECT count(*)::numeric,
               (SELECT z.t FROM (SELECT min(quand) AS t FROM (SELECT quand, %s AS val FROM pg_temp._cj WHERE %s) y
                                 WHERE y.val IS NOT NULL GROUP BY y.val ORDER BY t OFFSET %s LIMIT 1) z)
        FROM (SELECT DISTINCT %s AS val FROM pg_temp._cj WHERE %s) x WHERE x.val IS NOT NULL
      $f$, v_val, v_cond, (v_seuil - 1)::bigint, v_val, v_cond) INTO v_n, v_at;
    ELSE
      EXECUTE format($f$
        SELECT count(*)::numeric,
               (SELECT quand FROM pg_temp._cj WHERE %s ORDER BY quand OFFSET %s LIMIT 1)
        FROM pg_temp._cj WHERE %s
      $f$, v_cond, (v_seuil - 1)::bigint, v_cond) INTO v_n, v_at;
    END IF;
    v_comp := v_comp || jsonb_build_object(d.v->>'id', jsonb_build_object('n', coalesce(v_n, 0), 'atteint', v_at));
  END LOOP;

  -- ── les mesures ──
  -- ratures en cours, au total et par matière
  IF to_regclass('public.ratures') IS NOT NULL THEN
    EXECUTE $q$
      SELECT jsonb_build_object('total', count(*),
               'matieres', coalesce((SELECT jsonb_object_agg(m, c) FROM (SELECT _codex_matiere(r2.folder_name, r2.set_title) AS m, count(*) AS c
                                       FROM ratures r2 WHERE r2.user_id = $1 AND r2.removed_at IS NULL AND r2.visible_from <= now()
                                       GROUP BY 1) g WHERE g.m IS NOT NULL), '{}'::jsonb))
      FROM ratures r WHERE r.user_id = $1 AND r.removed_at IS NULL AND r.visible_from <= now()
    $q$ INTO v_tmp USING p_user;
    v_mes := v_mes || jsonb_build_object('ratures_ouvertes', v_tmp);
  END IF;
  -- réponses par notion (pour « notions vues » : 5 réponses ou plus)
  SELECT coalesce(jsonb_object_agg(g.notion, g.n), '{}'::jsonb) INTO v_tmp
  FROM (SELECT champs->>'notion' AS notion, count(*) AS n FROM pg_temp._cj
        WHERE evenement = 'question_repondue' AND champs->>'notion' IS NOT NULL GROUP BY 1) g;
  v_mes := v_mes || jsonb_build_object('notions', v_tmp);
  -- questions par jour (jours d'encre, rythme de l'objectif)
  SELECT coalesce(jsonb_agg(jsonb_build_object('jour', j.jour, 'n', j.n) ORDER BY j.jour), '[]'::jsonb) INTO v_tmp FROM pg_temp._cjours j;
  v_mes := v_mes || jsonb_build_object('jours', v_tmp);
  -- pages de drill passées : meilleure note par (matière, page)
  SELECT coalesce(jsonb_agg(jsonb_build_object('matiere', g.matiere, 'page', g.page, 'meilleur', g.meilleur)), '[]'::jsonb) INTO v_tmp
  FROM (SELECT champs->>'matiere' AS matiere, (champs->>'page')::int AS page, max((champs->>'pct')::numeric) AS meilleur
        FROM pg_temp._cj WHERE evenement = 'drill_page_terminee' AND champs->>'matiere' IS NOT NULL GROUP BY 1, 2) g;
  v_mes := v_mes || jsonb_build_object('drill_pages', v_tmp);
  -- pages de drill qui existent, par matière
  SELECT coalesce(jsonb_object_agg(g.matiere, g.pages), '{}'::jsonb) INTO v_tmp
  FROM (SELECT m.cle AS matiere, count(DISTINCT substring(qs.title FROM 'Page ([0-9]+)'))::int AS pages
        FROM quiz_sets qs JOIN codex_matieres m ON m.prefixe_drill = split_part(qs.title, ' — ', 1)
        WHERE qs.title ~ ' — Drill Fiche Page [0-9]+' AND coalesce(to_jsonb(qs) ->> 'official_published', 'true') <> 'false'
        GROUP BY m.cle) g;
  v_mes := v_mes || jsonb_build_object('drill_totaux', v_tmp);
  -- maîtrise par matière : sessions ciblées d'une seule matière (comme lib/mastery.ts), et la maîtrise de ses premières questions
  IF to_regclass('public.practice_session_results') IS NOT NULL THEN
    EXECUTE $q$
      WITH s AS (
        SELECT r.topics[1] AS matiere, r.score, r.total,
               sum(r.total) OVER (PARTITION BY r.topics[1] ORDER BY r.completed_at, r.id) - r.total AS avant
        FROM practice_session_results r WHERE r.user_id = $1 AND cardinality(r.topics) = 1 AND r.total > 0
      ), actuel AS (
        SELECT matiere, sum(score) AS justes, sum(total) AS questions FROM s GROUP BY matiere
      ), debut AS (
        SELECT matiere, sum(score) AS justes, sum(total) AS questions FROM s WHERE avant < 40 GROUP BY matiere
      )
      SELECT coalesce(jsonb_object_agg(a.matiere, jsonb_build_object(
               'questions', a.questions,
               'pct', round(100.0 * a.justes / a.questions)::int,
               'debut', CASE WHEN d.questions >= 40 THEN round(100.0 * d.justes / d.questions)::int END)), '{}'::jsonb)
      FROM actuel a LEFT JOIN debut d ON d.matiere = a.matiere
    $q$ INTO v_tmp USING p_user;
    v_mes := v_mes || jsonb_build_object('maitrise', v_tmp);
  END IF;
  -- types de calcul tenus : au moins 5 essais, et 5 justes sur les 6 derniers
  IF to_regclass('public.calc_attempts') IS NOT NULL THEN
    EXECUTE $q$
      SELECT count(*) FROM (
        SELECT type_key FROM (
          SELECT c.type_key, c.correct, row_number() OVER (PARTITION BY c.topic, c.type_key ORDER BY c.answered_at DESC, c.id DESC) AS rang
          FROM calc_attempts c WHERE c.user_id = $1
        ) x WHERE x.rang <= 6 GROUP BY type_key HAVING count(*) >= 5 AND count(*) FILTER (WHERE correct) >= 5
      ) t
    $q$ INTO v_n USING p_user;
    v_mes := v_mes || jsonb_build_object('types_calcul_tenus', coalesce(v_n, 0));
  END IF;
  -- sceaux gagnés
  IF to_regclass('public.sceaux') IS NOT NULL THEN
    EXECUTE $q$SELECT coalesce(jsonb_object_agg(cle, palier), '{}'::jsonb) FROM sceaux WHERE user_id = $1$q$ INTO v_tmp USING p_user;
    v_mes := v_mes || jsonb_build_object('sceaux', v_tmp);
  END IF;
  -- ELO actuel et plus haut ELO connu
  IF to_regclass('public.ratings') IS NOT NULL THEN
    EXECUTE $q$SELECT max((to_jsonb(r) ->> 'elo')::int) FROM ratings r WHERE r.user_id = $1$q$ INTO v_n USING p_user;
    v_mes := v_mes || jsonb_build_object('elo', v_n);
  END IF;
  IF to_regclass('public.rating_events') IS NOT NULL THEN
    EXECUTE $q$SELECT max(elo_after) FROM rating_events WHERE user_id = $1$q$ INTO v_n USING p_user;
    v_mes := v_mes || jsonb_build_object('pic_elo', v_n);
  END IF;
  -- XP, ancienneté
  SELECT jsonb_build_object('xp_total', coalesce(p.xp_total, 0), 'inscrit_le', p.created_at) INTO v_tmp FROM profiles p WHERE p.id = p_user;
  v_mes := v_mes || coalesce(v_tmp, '{}'::jsonb);
  -- série d'encre : jours d'affilée à 10 questions (sans le joker), en cours et meilleure ;
  -- celles de serie_encre (avec joker) l'emportent quand la table existe
  SELECT coalesce(max(g.n), 0) INTO v_b
  FROM (SELECT count(*) AS n FROM (SELECT j.jour - (row_number() OVER (ORDER BY j.jour))::int AS grp FROM pg_temp._cjours j WHERE j.n >= 10) s GROUP BY grp) g;
  -- série en cours : on remonte jour par jour depuis aujourd'hui (ou hier)
  v_c := 0;
  v_fin := CASE WHEN EXISTS (SELECT 1 FROM pg_temp._cjours WHERE jour = v_today AND n >= 10) THEN v_today ELSE v_today - 1 END;
  WHILE EXISTS (SELECT 1 FROM pg_temp._cjours WHERE jour = v_fin AND n >= 10) LOOP
    v_c := v_c + 1;
    v_fin := v_fin - 1;
  END LOOP;
  IF to_regclass('public.serie_encre') IS NOT NULL THEN
    EXECUTE $q$SELECT greatest($2, coalesce(max(meilleure), 0)) FROM serie_encre WHERE user_id = $1$q$ INTO v_b USING p_user, v_b;
  END IF;
  v_mes := v_mes || jsonb_build_object('serie', v_c, 'meilleure_serie', greatest(v_b, v_c));

  -- ── les prédicats spéciaux ──
  -- serie_bonnes : plus longue suite de bonnes réponses d'affilée (rompue par une erreur ou 20 min de silence)
  SELECT coalesce(max(g.n), 0) INTO v_b FROM (
    SELECT count(*) AS n FROM (
      SELECT s.quand, s.juste, sum(CASE WHEN NOT s.juste OR s.silence THEN 1 ELSE 0 END) OVER (ORDER BY s.quand, s.ord) AS grp FROM (
        SELECT quand, coalesce((champs->>'juste')::boolean, false) AS juste,
               (quand - lag(quand) OVER (ORDER BY quand, ord)) > interval '20 minutes' AS silence, ord
        FROM (SELECT quand, champs, row_number() OVER (ORDER BY quand) AS ord FROM pg_temp._cj WHERE evenement = 'question_repondue') a
      ) s
    ) t WHERE t.juste GROUP BY t.grp
  ) g;
  v_spe := v_spe || jsonb_build_object('serie_bonnes', v_b);
  -- serie_calculs : plus longue suite de calculs justes
  SELECT coalesce(max(g.n), 0) INTO v_b FROM (
    SELECT count(*) AS n FROM (
      SELECT s.juste, sum(CASE WHEN NOT s.juste THEN 1 ELSE 0 END) OVER (ORDER BY s.quand, s.ord) AS grp FROM (
        SELECT quand, ord, coalesce((champs->>'juste')::boolean, false) AS juste
        FROM (SELECT quand, champs, row_number() OVER (ORDER BY quand) AS ord FROM pg_temp._cj WHERE evenement = 'calcul_repondu') a
      ) s
    ) t WHERE t.juste GROUP BY t.grp
  ) g;
  v_spe := v_spe || jsonb_build_object('serie_calculs', v_b);
  -- phénix : les 30 du jour sous 50 % un jour, puis à 80 % ou plus le lendemain
  SELECT EXISTS (
    SELECT 1 FROM (SELECT (quand AT TIME ZONE 'Europe/Paris')::date AS j, max((champs->>'pct')::numeric) AS pct
                   FROM pg_temp._cj WHERE evenement = 'defi_rendu' GROUP BY 1) a
    JOIN (SELECT (quand AT TIME ZONE 'Europe/Paris')::date AS j, max((champs->>'pct')::numeric) AS pct
          FROM pg_temp._cj WHERE evenement = 'defi_rendu' GROUP BY 1) b ON b.j = a.j + 1
    WHERE a.pct < 50 AND b.pct >= 80) INTO v_ph;
  -- retour : un jour à 20 questions ou plus après au moins 14 jours sans aucune réponse
  SELECT EXISTS (
    SELECT 1 FROM (SELECT j, n, lag(j) OVER (ORDER BY j) AS prev
                   FROM (SELECT (quand AT TIME ZONE 'Europe/Paris')::date AS j, count(*) AS n FROM pg_temp._cj WHERE evenement = 'question_repondue' GROUP BY 1) q) z
    WHERE z.n >= 20 AND z.prev IS NOT NULL AND z.j - z.prev > 14) INTO v_re;
  -- aube : 10 questions avant 7 h (Paris) le même jour
  SELECT EXISTS (
    SELECT 1 FROM (SELECT (quand AT TIME ZONE 'Europe/Paris')::date AS j,
                          count(*) FILTER (WHERE extract(hour FROM quand AT TIME ZONE 'Europe/Paris') < 7) AS n
                   FROM pg_temp._cj WHERE evenement = 'question_repondue' GROUP BY 1) z
    WHERE z.n >= 10) INTO v_au;
  v_spe := v_spe || jsonb_build_object('phenix', CASE WHEN v_ph THEN 1 ELSE 0 END, 'retour', CASE WHEN v_re THEN 1 ELSE 0 END, 'aube', CASE WHEN v_au THEN 1 ELSE 0 END);

  -- ── les mesures v3 (§4) du programme actif (sans ligne : CFA I), sur la même lecture des
  -- réponses. Une erreur est consignée et ne coûte que la clé « v3 » : le site les relit à part.
  -- p_v3 à faux : rien à calculer, le site n'en veut pas.
  IF coalesce(p_v3, true) AND to_regprocedure('public.codex_mesures_v3(uuid,text)') IS NOT NULL THEN
    BEGIN
      IF to_regclass('public.codex_programmes_joueur') IS NOT NULL THEN
        EXECUTE $q$SELECT programme FROM codex_programmes_joueur WHERE user_id = $1 AND statut = 'actif' LIMIT 1$q$ INTO v_actif USING p_user;
        v_prog := coalesce(v_actif, v_prog);
      END IF;
      v_v3 := codex_mesures_v3(p_user, v_prog);
    EXCEPTION WHEN OTHERS THEN
      v_v3 := NULL;
      PERFORM _codex_erreur(p_user, '', '', 'codex_mesures_v3 (codex_lire) : ' || SQLERRM);
    END;
  END IF;

  RETURN jsonb_build_object('compteurs', v_comp, 'mesures', v_mes, 'speciaux', v_spe)
         || CASE WHEN v_v3 IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('v3', v_v3) END;
END;
$$;

-- La signature de toujours (celle que le site appelle par défaut) : la même
-- lecture, avec « v3 ».
CREATE OR REPLACE FUNCTION codex_lire(p_user uuid, p_demandes jsonb, p_jour date DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$ SELECT codex_lire(p_user, p_demandes, p_jour, true) $$;


-- 5f. Les questions par jour du joueur (_codex_jours) : celles que codex_lire a
-- lues pour cet appel (pg_temp._cjours, avec sa clé pg_temp._cjours_cle) quand
-- c'est le même joueur, sinon une lecture de toutes les sources. Le journal
-- (jours d'encre) et codex_mesures_v3 (jours d'encre de toute une vie) les
-- lisaient chacun à part : trois lectures par appel de codex_lire, une seule
-- maintenant.
CREATE OR REPLACE FUNCTION _codex_jours_lus(p_user uuid)
RETURNS TABLE (jour date, n int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lus boolean := false;
BEGIN
  IF to_regclass('pg_temp._cjours_cle') IS NOT NULL AND to_regclass('pg_temp._cjours') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM pg_temp._cjours_cle WHERE user_id = $1)' INTO v_lus USING p_user;
  END IF;
  IF v_lus THEN
    RETURN QUERY EXECUTE 'SELECT c.jour, c.n FROM pg_temp._cjours c';
  ELSE
    RETURN QUERY SELECT j.jour, j.n FROM _codex_jours(p_user) j;
  END IF;
END;
$$;

-- 5e. Le marqueur du journal v3 (codex_mesures_v3 : capacité « journal » à 3).
-- Posé en dernier : il ne dit vrai qu'une fois le journal et la lecture en place.
CREATE OR REPLACE FUNCTION _codex_journal_v3()
RETURNS int LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT 3 $$;

REVOKE ALL ON FUNCTION _reponses_cache(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _codex_colonne(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _codex_reponses_v3(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_journal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_lire(uuid, jsonb, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_lire(uuid, jsonb, date, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _codex_journal_v3() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _codex_jours_lus(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION codex_journal(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION codex_lire(uuid, jsonb, date) TO service_role;
GRANT EXECUTE ON FUNCTION codex_lire(uuid, jsonb, date, boolean) TO service_role;


-- ── 6. La séance du jour (V3 §6.2) ───────────────────────────────────

-- 6a. codex_seances : une séance par joueur et par jour de Paris. Les blocs
-- sont ceux que le site a composés (lib/codex/seance.ts) ; « faits » : les
-- genres des blocs faits, d'après leurs objectifs (jamais retirés).
CREATE TABLE IF NOT EXISTS codex_seances (
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jour        date        NOT NULL,
  programme   text        NOT NULL DEFAULT 'finance/cfa-l1',
  budget_min  smallint    NOT NULL CHECK (budget_min IN (15, 30, 60, 90)),
  -- [{genre, titre, duree, raison, href, outil, matiere?, n?, contrats?}]
  blocs       jsonb       NOT NULL,
  ecartes     text[]      NOT NULL DEFAULT '{}',
  -- l'instantané au lancement : {maitrise: {cle: pct}, revoir, quetes: {id: fraction}} (V3 §6.5)
  avant       jsonb,
  proposee_le timestamptz NOT NULL DEFAULT now(),
  vue_le      timestamptz,
  lancee_le   timestamptz,
  faits       text[]      NOT NULL DEFAULT '{}',
  finie_le    timestamptz,
  PRIMARY KEY (user_id, jour)
);
ALTER TABLE codex_seances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS codex_seances_select_own ON codex_seances;
CREATE POLICY codex_seances_select_own ON codex_seances FOR SELECT TO authenticated USING (user_id = auth.uid());
-- aucune politique d'écriture : codex_seance_poser et codex_seance_marquer seulement

-- 6b. codex_vue_cache : le dernier panneau et la dernière séance calculés
-- (l'accueil et la barre du haut les relisent s'ils ont moins de 10 min et
-- ne sont pas marqués). Aucune politique : le serveur seul, par la clé service.
CREATE TABLE IF NOT EXISTS codex_vue_cache (
  user_id       uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  jour          date        NOT NULL,
  panneau       jsonb,
  seance        jsonb,
  calcule_le    timestamptz NOT NULL DEFAULT now(),
  a_recalculer  boolean     NOT NULL DEFAULT false
);
ALTER TABLE codex_vue_cache ENABLE ROW LEVEL SECURITY;

-- 6c. _codex_seance_json : une ligne de codex_seances telle que le site la lit.
CREATE OR REPLACE FUNCTION _codex_seance_json(s codex_seances)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'jour', s.jour, 'programme', s.programme, 'budget_min', s.budget_min, 'blocs', s.blocs, 'ecartes', to_jsonb(s.ecartes),
    'avant', s.avant, 'proposee_le', s.proposee_le, 'vue_le', s.vue_le, 'lancee_le', s.lancee_le, 'faits', to_jsonb(s.faits), 'finie_le', s.finie_le)
$$;

-- 6d. codex_seance_poser(uuid, date, smallint, jsonb, text[]) : crée la séance
-- du jour, ou la recompose (budget changé, « Une autre idée ? », « Encore un
-- bloc ? »). Les blocs faits de la séance d'avant que la nouvelle n'a plus
-- sont gardés en tête : un bloc fait n'est jamais retiré. Une séance qui
-- regagne un bloc à faire n'est plus finie. Rend la ligne (jsonb).
CREATE OR REPLACE FUNCTION codex_seance_poser(p_user uuid, p_jour date, p_budget smallint, p_blocs jsonb, p_ecartes text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_genres CONSTANT text[] := ARRAY['cinq', 'trente', 'retouches', 'coince', 'nouveau', 'epreuve'];
  v_avant  codex_seances;
  v_gardes jsonb := '[]'::jsonb;
  v_ligne  codex_seances;
BEGIN
  IF p_user IS NULL OR p_jour IS NULL THEN
    RAISE EXCEPTION 'joueur ou jour manquant';
  END IF;
  IF p_budget IS NULL OR p_budget NOT IN (15, 30, 60, 90) THEN
    RAISE EXCEPTION 'budget invalide : %', p_budget;
  END IF;
  IF p_blocs IS NULL OR jsonb_typeof(p_blocs) <> 'array' OR jsonb_array_length(p_blocs) > 6 OR length(p_blocs::text) > 8000
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_blocs) b
                WHERE jsonb_typeof(b) <> 'object'
                   OR NOT coalesce(b ->> 'genre' = ANY (v_genres), false)
                   OR coalesce(b ->> 'href', '') !~ '^/[^/]'
                   OR jsonb_typeof(b -> 'duree') IS DISTINCT FROM 'number')
     OR (SELECT count(DISTINCT b ->> 'genre') FROM jsonb_array_elements(p_blocs) b) <> jsonb_array_length(p_blocs) THEN
    RAISE EXCEPTION 'blocs invalides';
  END IF;
  IF cardinality(coalesce(p_ecartes, '{}')) > 6 OR NOT (coalesce(p_ecartes, '{}') <@ v_genres) THEN
    RAISE EXCEPTION 'genres écartés invalides';
  END IF;

  SELECT * INTO v_avant FROM codex_seances WHERE user_id = p_user AND jour = p_jour FOR UPDATE;
  IF FOUND THEN
    SELECT coalesce(jsonb_agg(b ORDER BY i), '[]'::jsonb) INTO v_gardes
    FROM jsonb_array_elements(v_avant.blocs) WITH ORDINALITY AS t(b, i)
    WHERE b ->> 'genre' = ANY (v_avant.faits)
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_blocs) n WHERE n ->> 'genre' = t.b ->> 'genre');
  END IF;

  INSERT INTO codex_seances AS s (user_id, jour, budget_min, blocs, ecartes)
  VALUES (p_user, p_jour, p_budget, v_gardes || p_blocs, coalesce(p_ecartes, '{}'))
  ON CONFLICT (user_id, jour) DO UPDATE SET
    budget_min  = EXCLUDED.budget_min,
    blocs       = EXCLUDED.blocs,
    ecartes     = EXCLUDED.ecartes,
    proposee_le = CASE WHEN s.blocs IS DISTINCT FROM EXCLUDED.blocs THEN now() ELSE s.proposee_le END,
    -- un bloc à faire de plus : la séance n'est plus finie
    finie_le    = CASE WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(EXCLUDED.blocs) b WHERE NOT coalesce(b ->> 'genre' = ANY (s.faits), false)) THEN NULL ELSE s.finie_le END
  RETURNING * INTO v_ligne;
  RETURN _codex_seance_json(v_ligne);
END $$;

-- 6e. codex_seance_marquer(uuid, date, text, jsonb) : la trace de la séance.
--   « vue »    : première fois affichée (vue_le, une fois) ;
--   « lancee » : « Commencer » (lancee_le, une fois) ;
--   « fait »   : p_val = un genre ou une liste de genres, ajoutés aux faits
--                s'ils sont dans la séance ; tous faits → finie_le ;
--   « finie »  : « J'arrête là » (finie_le, une fois) ;
--   « avant »  : l'instantané au lancement (un objet, une fois).
-- Sans séance ce jour-là : NULL, rien n'est écrit.
CREATE OR REPLACE FUNCTION codex_seance_marquer(p_user uuid, p_jour date, p_quoi text, p_val jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ligne codex_seances;
  v_faits text[];
BEGIN
  IF p_quoi IS NULL OR p_quoi NOT IN ('vue', 'lancee', 'fait', 'finie', 'avant') THEN
    RAISE EXCEPTION 'marque inconnue : %', p_quoi;
  END IF;
  SELECT * INTO v_ligne FROM codex_seances WHERE user_id = p_user AND jour = p_jour FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF p_quoi = 'vue' THEN
    UPDATE codex_seances SET vue_le = coalesce(vue_le, now()) WHERE user_id = p_user AND jour = p_jour RETURNING * INTO v_ligne;
  ELSIF p_quoi = 'lancee' THEN
    UPDATE codex_seances SET lancee_le = coalesce(lancee_le, now()) WHERE user_id = p_user AND jour = p_jour RETURNING * INTO v_ligne;
  ELSIF p_quoi = 'finie' THEN
    UPDATE codex_seances SET finie_le = coalesce(finie_le, now()) WHERE user_id = p_user AND jour = p_jour RETURNING * INTO v_ligne;
  ELSIF p_quoi = 'avant' THEN
    IF p_val IS NULL OR jsonb_typeof(p_val) <> 'object' OR length(p_val::text) > 8000 THEN
      RAISE EXCEPTION 'instantané invalide';
    END IF;
    UPDATE codex_seances SET avant = coalesce(avant, p_val) WHERE user_id = p_user AND jour = p_jour RETURNING * INTO v_ligne;
  ELSE
    IF p_val IS NULL OR jsonb_typeof(p_val) NOT IN ('string', 'array') THEN
      RAISE EXCEPTION 'genres invalides';
    END IF;
    SELECT ARRAY(
      SELECT DISTINCT t.g FROM (
        SELECT unnest(v_ligne.faits) AS g
        UNION SELECT p_val #>> '{}' WHERE jsonb_typeof(p_val) = 'string'
        UNION SELECT x FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_val) = 'array' THEN p_val ELSE '[]'::jsonb END) x
      ) t
      WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(v_ligne.blocs) b WHERE b ->> 'genre' = t.g)
      ORDER BY t.g
    ) INTO v_faits;
    UPDATE codex_seances SET
      faits    = v_faits,
      finie_le = CASE WHEN NOT EXISTS (SELECT 1 FROM jsonb_array_elements(blocs) b WHERE NOT coalesce(b ->> 'genre' = ANY (v_faits), false)) THEN coalesce(finie_le, now()) ELSE finie_le END
    WHERE user_id = p_user AND jour = p_jour RETURNING * INTO v_ligne;
  END IF;
  RETURN _codex_seance_json(v_ligne);
END $$;

-- 6f. codex_vue_cache_poser(uuid, date, jsonb, jsonb) : garde le dernier
-- calcul (panneau, séance) et le dit à jour.
CREATE OR REPLACE FUNCTION codex_vue_cache_poser(p_user uuid, p_jour date, p_panneau jsonb, p_seance jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user IS NULL OR p_jour IS NULL THEN
    RAISE EXCEPTION 'joueur ou jour manquant';
  END IF;
  IF length(coalesce(p_panneau, 'null'::jsonb)::text) > 100000 OR length(coalesce(p_seance, 'null'::jsonb)::text) > 20000 THEN
    RAISE EXCEPTION 'instantané trop lourd';
  END IF;
  INSERT INTO codex_vue_cache AS c (user_id, jour, panneau, seance, calcule_le, a_recalculer)
  VALUES (p_user, p_jour, p_panneau, p_seance, now(), false)
  ON CONFLICT (user_id) DO UPDATE SET jour = EXCLUDED.jour, panneau = EXCLUDED.panneau, seance = EXCLUDED.seance, calcule_le = now(), a_recalculer = false;
END $$;

-- 6g. codex_vue_cache_marquer(uuid) : la fin d'un outil (codexPoint) marque
-- l'instantané à recalculer. Sans instantané : rien.
CREATE OR REPLACE FUNCTION codex_vue_cache_marquer(p_user uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE codex_vue_cache SET a_recalculer = true WHERE user_id = p_user
$$;

REVOKE ALL ON FUNCTION _codex_seance_json(codex_seances) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_seance_poser(uuid, date, smallint, jsonb, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_seance_marquer(uuid, date, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_vue_cache_poser(uuid, date, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_vue_cache_marquer(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION codex_seance_poser(uuid, date, smallint, jsonb, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION codex_seance_marquer(uuid, date, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION codex_vue_cache_poser(uuid, date, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION codex_vue_cache_marquer(uuid) TO service_role;


-- ── 8. Le rythme long (V3 §10.3 à §10.5) ─────────────────────────────

-- 8a. codex_semaine : le choix du lundi (V3 §10.3). La cible de la semaine
-- (3, 4 ou 5 jours d'encre) et une commande parmi trois ; « params » fige ce
-- que la commande vise au moment du choix (le banquier : la matière et sa
-- maîtrise de départ). Un choix par semaine, gardé jusqu'au dimanche.
CREATE TABLE IF NOT EXISTS codex_semaine (
  user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lundi    date        NOT NULL CHECK (extract(isodow FROM lundi) = 1),
  cible    smallint    NOT NULL CHECK (cible BETWEEN 3 AND 5),
  commande text        NOT NULL CHECK (commande IN ('banquier', 'copiste', 'ingenieur')),
  params   jsonb       NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(params) = 'object' AND length(params::text) <= 500),
  pose_le  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lundi)
);
ALTER TABLE codex_semaine ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS codex_semaine_select_own ON codex_semaine;
CREATE POLICY codex_semaine_select_own ON codex_semaine FOR SELECT TO authenticated USING (user_id = auth.uid());
-- aucune politique d'écriture : codex_semaine_poser seulement

-- 8b. codex_semaine_poser(uuid, date, smallint, text, jsonb) : pose le choix
-- de la semaine en cours (p_lundi = le lundi de la semaine de Paris). Le
-- premier choix gagne : un second appel la même semaine relit le premier.
-- Rend la ligne (jsonb). Clé service seulement.
CREATE OR REPLACE FUNCTION codex_semaine_poser(p_user uuid, p_lundi date, p_cible smallint, p_commande text, p_params jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lundi date := date_trunc('week', ((now() AT TIME ZONE 'Europe/Paris')::date)::timestamp)::date;
  v_ligne codex_semaine;
BEGIN
  IF p_user IS NULL OR p_lundi IS NULL OR p_lundi <> v_lundi THEN
    RAISE EXCEPTION 'seule la semaine en cours se choisit';
  END IF;
  IF p_cible IS NULL OR p_cible NOT BETWEEN 3 AND 5 THEN
    RAISE EXCEPTION 'cible invalide : %', p_cible;
  END IF;
  IF p_commande IS NULL OR p_commande NOT IN ('banquier', 'copiste', 'ingenieur') THEN
    RAISE EXCEPTION 'commande inconnue : %', p_commande;
  END IF;
  IF p_params IS NOT NULL AND (jsonb_typeof(p_params) <> 'object' OR length(p_params::text) > 500) THEN
    RAISE EXCEPTION 'paramètres invalides';
  END IF;
  INSERT INTO codex_semaine (user_id, lundi, cible, commande, params)
  VALUES (p_user, p_lundi, p_cible, p_commande, coalesce(p_params, '{}'::jsonb))
  ON CONFLICT (user_id, lundi) DO NOTHING;
  SELECT * INTO v_ligne FROM codex_semaine WHERE user_id = p_user AND lundi = p_lundi;
  RETURN jsonb_build_object('lundi', v_ligne.lundi, 'cible', v_ligne.cible, 'commande', v_ligne.commande,
                            'params', v_ligne.params, 'pose_le', v_ligne.pose_le);
END $$;

REVOKE ALL ON FUNCTION codex_semaine_poser(uuid, date, smallint, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION codex_semaine_poser(uuid, date, smallint, text, jsonb) TO service_role;

-- 8c. codex_contrats.modele_origine : le modèle remplacé quand on change un
-- contrat du jour. codex_contrat_changer : même signature, même résultat,
-- même règles (migration_codex.sql) ; il garde en plus le modèle d'origine.
ALTER TABLE codex_contrats ADD COLUMN IF NOT EXISTS modele_origine text;

CREATE OR REPLACE FUNCTION codex_contrat_changer(p_user uuid, p_jour date, p_emplacement text, p_modele text, p_params jsonb)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ancien codex_contrats;
BEGIN
  IF p_user IS NULL OR p_jour IS NULL OR coalesce(p_modele, '') = '' THEN
    RAISE EXCEPTION 'Contrat invalide';
  END IF;
  IF p_jour <> (now() AT TIME ZONE 'Europe/Paris')::date THEN
    RAISE EXCEPTION 'Seuls les contrats d''aujourd''hui se changent';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('codex_contrats:' || p_user::text));
  SELECT * INTO v_ancien FROM codex_contrats WHERE user_id = p_user AND jour = p_jour AND emplacement = p_emplacement;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pas de contrat à cet emplacement';
  END IF;
  IF EXISTS (SELECT 1 FROM codex_contrats WHERE user_id = p_user AND jour = p_jour AND change) THEN
    RAISE EXCEPTION 'Un seul changement par jour';
  END IF;
  IF EXISTS (SELECT 1 FROM codex_progression
             WHERE user_id = p_user AND periode = p_jour::text AND quete_id = 'contrat:' || v_ancien.modele || ':' || p_jour::text
               AND etat IN ('terminee', 'recompensee')) THEN
    RAISE EXCEPTION 'Ce contrat est déjà rempli';
  END IF;
  UPDATE codex_contrats
  SET modele = left(p_modele, 60), params = CASE WHEN jsonb_typeof(p_params) = 'object' THEN p_params ELSE '{}'::jsonb END,
      change = true, tire_le = now(), modele_origine = coalesce(modele_origine, v_ancien.modele)
  WHERE user_id = p_user AND jour = p_jour AND emplacement = p_emplacement;
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('emplacement', c.emplacement, 'modele', c.modele, 'params', c.params, 'change', c.change)
                                     ORDER BY CASE c.emplacement WHEN 'faiblesse' THEN 1 WHEN 'entretien' THEN 2 ELSE 3 END), '[]'::jsonb)
          FROM codex_contrats c WHERE c.user_id = p_user AND c.jour = p_jour);
END;
$$;

REVOKE ALL ON FUNCTION codex_contrat_changer(uuid, date, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION codex_contrat_changer(uuid, date, text, text, jsonb) TO service_role;

-- 8d. serie_pauses : les jours de repos et de pause de la série d'encre
-- (V3 §10.4). Un tel jour est neutre : sans ses 10 questions, il ne casse
-- pas la série, ne l'allonge pas et ne prend pas le joker. Le joueur lit les
-- siens ; aucune écriture directe.
CREATE TABLE IF NOT EXISTS serie_pauses (
  user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jour    date        NOT NULL,
  genre   text        NOT NULL CHECK (genre IN ('repos', 'pause')),
  pose_le timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, jour)
);
ALTER TABLE serie_pauses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS serie_pauses_select_own ON serie_pauses;
CREATE POLICY serie_pauses_select_own ON serie_pauses FOR SELECT TO authenticated USING (user_id = auth.uid());
-- aucune politique d'écriture : serie_pause_poser et serie_pause_retirer seulement

-- Les jours de repos et de pause du joueur connecté, d'aujourd'hui (Paris) à la fin.
CREATE OR REPLACE FUNCTION _serie_pauses_a_venir(p_uid uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('jour', p.jour, 'genre', p.genre) ORDER BY p.jour), '[]'::jsonb)
  FROM serie_pauses p
  WHERE p.user_id = p_uid AND p.jour >= (now() AT TIME ZONE 'Europe/Paris')::date
$$;

-- 8e. serie_pause_poser(date, date, text) : le joueur connecté pose des jours
-- de repos ou de pause, d'aujourd'hui au plus tôt (jamais dans le passé : un
-- jour manqué ne se rattrape pas après coup). Repos : 2 jours au plus par
-- semaine (lundi-dimanche). Pause : 14 jours d'affilée au plus, et 30 jours au
-- plus sur toute fenêtre de 365 jours. Un jour déjà posé change de genre.
-- Rend les jours à venir ([{jour, genre}]).
CREATE OR REPLACE FUNCTION serie_pause_poser(p_de date, p_a date, p_genre text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_auj    date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_trop   boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_genre IS NULL OR p_genre NOT IN ('repos', 'pause') THEN
    RAISE EXCEPTION 'genre inconnu : %', p_genre;
  END IF;
  IF p_de IS NULL OR p_a IS NULL OR p_a < p_de THEN
    RAISE EXCEPTION 'dates invalides';
  END IF;
  IF p_de < v_auj THEN
    RAISE EXCEPTION 'un jour passé ne se pose pas';
  END IF;
  IF p_a > v_auj + 365 OR p_a - p_de >= 14 THEN
    RAISE EXCEPTION 'trop de jours d''un coup';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('serie_pauses:' || v_uid::text));

  INSERT INTO serie_pauses AS s (user_id, jour, genre)
  SELECT v_uid, g.d::date, p_genre FROM generate_series(p_de::timestamp, p_a::timestamp, interval '1 day') g(d)
  ON CONFLICT (user_id, jour) DO UPDATE SET genre = EXCLUDED.genre, pose_le = now();

  IF p_genre = 'repos' THEN
    -- 2 jours de repos au plus dans chaque semaine touchée
    SELECT EXISTS (
      SELECT 1 FROM serie_pauses p
      WHERE p.user_id = v_uid AND p.genre = 'repos'
        AND date_trunc('week', p.jour::timestamp) BETWEEN date_trunc('week', p_de::timestamp) AND date_trunc('week', p_a::timestamp)
      GROUP BY date_trunc('week', p.jour::timestamp) HAVING count(*) > 2
    ) INTO v_trop;
    IF v_trop THEN
      RAISE EXCEPTION 'deux jours de repos par semaine au plus';
    END IF;
  ELSE
    -- 14 jours de pause d'affilée au plus (avec les pauses déjà posées autour)
    SELECT EXISTS (
      SELECT 1 FROM (
        SELECT p.jour - (row_number() OVER (ORDER BY p.jour))::int AS ilot
        FROM serie_pauses p
        WHERE p.user_id = v_uid AND p.genre = 'pause' AND p.jour BETWEEN p_de - 30 AND p_a + 30
      ) x GROUP BY x.ilot HAVING count(*) > 14
    ) INTO v_trop;
    IF v_trop THEN
      RAISE EXCEPTION 'quatorze jours de pause d''affilée au plus';
    END IF;
    -- 30 jours de pause au plus sur toute fenêtre de 365 jours qui touche les jours posés
    SELECT EXISTS (
      SELECT 1 FROM generate_series(p_de::timestamp, p_a::timestamp, interval '1 day') g(d)
      WHERE (SELECT count(*) FROM serie_pauses p WHERE p.user_id = v_uid AND p.genre = 'pause' AND p.jour BETWEEN g.d::date - 364 AND g.d::date) > 30
         OR (SELECT count(*) FROM serie_pauses p WHERE p.user_id = v_uid AND p.genre = 'pause' AND p.jour BETWEEN g.d::date AND g.d::date + 364) > 30
    ) INTO v_trop;
    IF v_trop THEN
      RAISE EXCEPTION 'trente jours de pause par an au plus';
    END IF;
  END IF;
  RETURN _serie_pauses_a_venir(v_uid);
END $$;

-- 8f. serie_pause_retirer(date) : retire un jour de repos ou de pause à venir
-- (demain au plus tôt : aujourd'hui et le passé restent tels qu'ils ont été
-- vécus). Rend les jours à venir.
CREATE OR REPLACE FUNCTION serie_pause_retirer(p_jour date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_jour IS NULL OR p_jour <= (now() AT TIME ZONE 'Europe/Paris')::date THEN
    RAISE EXCEPTION 'seul un jour à venir se retire';
  END IF;
  DELETE FROM serie_pauses WHERE user_id = v_uid AND jour = p_jour;
  RETURN _serie_pauses_a_venir(v_uid);
END $$;

REVOKE ALL ON FUNCTION _serie_pauses_a_venir(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION serie_pause_poser(date, date, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION serie_pause_retirer(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION serie_pause_poser(date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION serie_pause_retirer(date) TO authenticated;

-- 8g. _serie_avancer(uuid, date) : copie à l'identique de
-- migration_serie_encre.sql, plus les jours neutres. Elle est appelée par le
-- déclencheur xp_events_serie_bonus à chaque gain d'XP : même signature, même
-- verrou, aucune erreur levée, et une seule lecture de plus (par la clé
-- primaire de serie_pauses), pour un jour sous les 10 questions seulement.
-- Sans migration_serie_encre.sql (pas de type serie_encre), rien n'est fait.
DO $do$
BEGIN
  IF to_regclass('public.serie_encre') IS NULL THEN
    RETURN;
  END IF;
  EXECUTE $fn$
CREATE OR REPLACE FUNCTION _serie_avancer(p_uid uuid, p_jour date)
RETURNS serie_encre
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row    serie_encre;
  v_neuf   boolean := false;
  v_a      date := p_jour - 1;
  v_de     date;
  r        record;
  v_lundi  date;
  -- les jours de repos et de pause (§8d) ; sans la table, aucun jour neutre
  v_pauses boolean := to_regclass('public.serie_pauses') IS NOT NULL;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('serie_encre:' || p_uid::text));
  SELECT * INTO v_row FROM serie_encre WHERE user_id = p_uid;
  IF NOT FOUND THEN
    v_neuf := true;
    -- premier calcul : depuis le premier jour de réponse
    SELECT min(c.jour) INTO v_de FROM _serie_reponses_jour(p_uid, DATE '2000-01-01', v_a) c;
    v_row.user_id := p_uid;
    v_row.jusqu_au := coalesce(v_de, p_jour) - 1;
    v_row.serie := 0;
    v_row.debut := NULL;
    v_row.joker_semaine := NULL;
    v_row.veille_sauvee := false;
    v_row.meilleure := 0;
    v_row.meilleure_le := NULL;
  END IF;

  IF v_row.jusqu_au < v_a THEN
    FOR r IN
      SELECT g.d::date AS jour, coalesce(c.n, 0) AS n
      FROM generate_series((v_row.jusqu_au + 1)::timestamp, v_a::timestamp, interval '1 day') AS g(d)
      LEFT JOIN _serie_reponses_jour(p_uid, v_row.jusqu_au + 1, v_a) c ON c.jour = g.d::date
      ORDER BY 1
    LOOP
      IF r.n < _serie_seuil() AND v_pauses THEN
        IF EXISTS (SELECT 1 FROM serie_pauses p WHERE p.user_id = p_uid AND p.jour = r.jour) THEN
          -- jour de repos ou de pause : neutre (ni +1, ni cassure, ni joker)
          v_row.jusqu_au := r.jour;
          CONTINUE;
        END IF;
      END IF;
      IF r.n >= _serie_seuil() THEN
        v_row.serie := v_row.serie + 1;
        IF v_row.serie = 1 THEN v_row.debut := r.jour; END IF;
        v_row.veille_sauvee := false;
        IF v_row.serie > v_row.meilleure THEN
          v_row.meilleure := v_row.serie;
          v_row.meilleure_le := r.jour;
        END IF;
      ELSIF v_row.serie > 0 THEN
        v_lundi := date_trunc('week', r.jour::timestamp)::date;
        IF v_row.veille_sauvee OR v_row.joker_semaine = v_lundi THEN
          -- deux jours manqués d'affilée, ou un second dans la semaine : la série casse
          v_row.serie := 0;
          v_row.debut := NULL;
          v_row.veille_sauvee := false;
        ELSE
          -- le joker de la semaine : le jour manqué ne compte pas, mais ne casse rien
          v_row.joker_semaine := v_lundi;
          v_row.veille_sauvee := true;
        END IF;
      ELSE
        v_row.veille_sauvee := false;
      END IF;
      v_row.jusqu_au := r.jour;
    END LOOP;
  ELSIF NOT v_neuf THEN
    RETURN v_row;
  END IF;

  INSERT INTO serie_encre (user_id, jusqu_au, serie, debut, joker_semaine, veille_sauvee, meilleure, meilleure_le, mis_a_jour)
  VALUES (v_row.user_id, v_row.jusqu_au, v_row.serie, v_row.debut, v_row.joker_semaine, v_row.veille_sauvee, v_row.meilleure, v_row.meilleure_le, now())
  ON CONFLICT (user_id) DO UPDATE
    SET jusqu_au = EXCLUDED.jusqu_au, serie = EXCLUDED.serie, debut = EXCLUDED.debut,
        joker_semaine = EXCLUDED.joker_semaine, veille_sauvee = EXCLUDED.veille_sauvee,
        meilleure = greatest(serie_encre.meilleure, EXCLUDED.meilleure),
        meilleure_le = CASE WHEN EXCLUDED.meilleure > serie_encre.meilleure THEN EXCLUDED.meilleure_le ELSE serie_encre.meilleure_le END,
        mis_a_jour = now();
  SELECT * INTO v_row FROM serie_encre WHERE user_id = p_uid;
  RETURN v_row;
END;
$$;
$fn$;
  EXECUTE 'REVOKE ALL ON FUNCTION _serie_avancer(uuid, date) FROM PUBLIC, anon, authenticated';
END $do$;

-- 8h. codex_resultat : le verdict de l'examen (V3 §10.5), privé. Une ligne
-- par programme et par session (« AAAA-MM ») ; bandes facultatives par
-- matière ({cle: basse | moyenne | haute}, soit < 50, 50–70, > 70 %).
CREATE TABLE IF NOT EXISTS codex_resultat (
  user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  programme text        NOT NULL CHECK (programme ~ '^[a-z]+/[a-z0-9-]{2,40}$'),
  session   text        NOT NULL CHECK (session ~ '^[0-9]{4}-[0-9]{2}$'),
  statut    text        NOT NULL CHECK (statut IN ('admis', 'pas_cette_fois', 'reporte')),
  bandes    jsonb       NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(bandes) = 'object'),
  saisi_le  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, programme, session)
);
ALTER TABLE codex_resultat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS codex_resultat_select_own ON codex_resultat;
CREATE POLICY codex_resultat_select_own ON codex_resultat FOR SELECT TO authenticated USING (user_id = auth.uid());
-- aucune politique d'écriture : codex_resultat_poser seulement

-- 8i. codex_resultat_poser(uuid, text, text, text, jsonb) : pose ou corrige le
-- verdict d'une session. « admis » mène le programme (codex_programme_poser,
-- §3b) ; rien de gagné n'est repris si le verdict change ensuite. Rend la
-- ligne (jsonb). Clé service seulement.
CREATE OR REPLACE FUNCTION codex_resultat_poser(p_user uuid, p_programme text, p_session text, p_statut text, p_bandes jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ligne codex_resultat;
BEGIN
  IF p_user IS NULL OR p_programme IS NULL OR p_programme !~ '^[a-z]+/[a-z0-9-]{2,40}$' THEN
    RAISE EXCEPTION 'programme invalide : %', p_programme;
  END IF;
  IF p_session IS NULL OR p_session !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'session invalide : %', p_session;
  END IF;
  IF p_statut IS NULL OR p_statut NOT IN ('admis', 'pas_cette_fois', 'reporte') THEN
    RAISE EXCEPTION 'statut invalide : %', p_statut;
  END IF;
  IF p_bandes IS NOT NULL AND (
       jsonb_typeof(p_bandes) <> 'object' OR length(p_bandes::text) > 1000
       OR EXISTS (SELECT 1 FROM jsonb_each(p_bandes) b
                  WHERE b.key !~ '^[a-z0-9:_-]{1,60}$' OR jsonb_typeof(b.value) <> 'string'
                     OR b.value #>> '{}' NOT IN ('basse', 'moyenne', 'haute'))) THEN
    RAISE EXCEPTION 'bandes invalides';
  END IF;
  INSERT INTO codex_resultat AS t (user_id, programme, session, statut, bandes)
  VALUES (p_user, p_programme, p_session, p_statut, CASE WHEN p_statut = 'pas_cette_fois' THEN coalesce(p_bandes, '{}'::jsonb) ELSE '{}'::jsonb END)
  ON CONFLICT (user_id, programme, session) DO UPDATE SET
    statut   = EXCLUDED.statut,
    bandes   = CASE WHEN EXCLUDED.statut = 'pas_cette_fois' AND p_bandes IS NULL THEN t.bandes ELSE EXCLUDED.bandes END,
    saisi_le = now()
  RETURNING * INTO v_ligne;
  IF p_statut = 'admis' THEN
    PERFORM codex_programme_poser(p_user, p_programme, 'mene');
  END IF;
  RETURN jsonb_build_object('programme', v_ligne.programme, 'session', v_ligne.session, 'statut', v_ligne.statut,
                            'bandes', v_ligne.bandes, 'saisi_le', v_ligne.saisi_le);
END $$;

REVOKE ALL ON FUNCTION codex_resultat_poser(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION codex_resultat_poser(uuid, text, text, text, jsonb) TO service_role;

-- ════════════════════════════════════════════════════════════════════
-- 9. « Récupérer » (Codex simplifié). Cette section se colle seule ou
-- avec tout le fichier : codex_ecrire et codex_mesures_v3 y sont définies
-- en entier (leur seule définition du fichier). Retour en arrière vers un
-- site sans « Récupérer » : la requête de secours de l'en-tête (§9).
-- ════════════════════════════════════════════════════════════════════

-- Collée seule, elle suppose les sections 1 à 8 déjà en place.
DO $$
BEGIN
  IF to_regprocedure('public._codex_erreur(uuid,text,text,text)') IS NULL OR to_regprocedure('public._codex_jours_lus(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Coller d''abord les sections 1 à 8 de migration_codex_v3.sql';
  END IF;
END $$;

-- 9a. Les lignes « terminee » dont l'XP est déjà dans xp_events (aucun
-- codex_ecrire d'avant n'en écrit, mais une ligne réécrite à la main peut
-- l'être) passent « recompensee », sans versement ni fanfare : elles
-- n'attendent pas dans « À récupérer ». Rejouable : une quête différée
-- n'a pas d'XP versée tant qu'elle attend, elle n'est donc jamais touchée.
UPDATE codex_progression p
SET etat = 'recompensee', xp = e.xp, recompensee_le = coalesce(p.recompensee_le, e.occurred_at), vu = true, maj = now()
FROM xp_events e
WHERE p.etat = 'terminee' AND e.source = 'codex' AND e.user_id = p.user_id
  AND e.meta->>'quete' = p.quete_id AND e.meta->>'periode' = p.periode;

-- 9b. codex_ecrire, tolérante (§1) et qui sait différer. Même contrat que
-- dans migration_codex.sql (voir son en-tête, section 8), plus :
--   item « differer » à vrai, non rétroactif, XP pas encore versée : la
--   ligne est écrite « terminee » (terminee_le, l'XP déjà plafonnée, le
--   cosmétique et le titre ; vu faux, recompensee_le vide), sans
--   xp_events, sans profiles, sans sceaux. Elle attend codex_recuperer.
--   Une ligne déjà terminée ou récompensée ne bouge pas.
--   Les autres items gardent le chemin d'avant : récompensés et versés
--   tout de suite (le rétroactif aussi : sa cérémonie ne change pas).
-- Le résultat gagne « differees » (les quêtes mises en attente à cet
-- appel, même forme que « recompenses »).
CREATE OR REPLACE FUNCTION codex_ecrire(p_user uuid, p_lot jsonb, p_budget_retro int DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  it         record;
  v_now      timestamptz := now();
  v_premier  boolean;
  v_id       text;
  v_per      text;
  v_fam      text;
  v_etat     text;
  v_retro    boolean;
  v_nominal  int;
  v_xp       int;
  v_deja     int;
  v_restant  int := greatest(0, coalesce(p_budget_retro, 0));
  v_atteint  timestamptz;
  v_cos      text;
  v_titre    text;
  v_ok       int;
  v_recs     jsonb := '[]'::jsonb;
  v_diffs    jsonb := '[]'::jsonb;
  v_res      jsonb;
  v_actes    text[] := '{}';
  v_coss     text[] := '{}';
  v_titres   text[] := '{}';
  v_retro_xp int := 0;
  v_retro_n  int := 0;
  v_err      int := 0;
BEGIN
  IF p_user IS NULL OR p_lot IS NULL OR jsonb_typeof(p_lot) <> 'array' THEN
    RAISE EXCEPTION 'Lot invalide';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user) THEN
    RAISE EXCEPTION 'Joueur introuvable';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('codex:' || p_user::text));

  INSERT INTO codex_joueur (user_id, premier_calcul, dernier_calcul) VALUES (p_user, v_now, v_now) ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_ok = ROW_COUNT;
  v_premier := v_ok > 0;

  FOR it IN SELECT value AS v FROM jsonb_array_elements(p_lot) LOOP
    v_id := it.v->>'quete';
    v_per := coalesce(it.v->>'periode', '');
    v_fam := it.v->>'famille';
    v_etat := it.v->>'etat';
    CONTINUE WHEN v_id IS NULL OR char_length(v_id) NOT BETWEEN 1 AND 120 OR v_etat IS NULL
               OR v_fam NOT IN ('trame', 'branche', 'longcours', 'contrat', 'exploit', 'acte', 'fil');

    -- chaque quête dans sa sous-transaction : une erreur est consignée, les autres passent
    BEGIN
      IF v_etat IN ('disponible', 'active') THEN
        INSERT INTO codex_progression (user_id, quete_id, periode, famille, etat, progression, cible, ouverte_le, maj)
        VALUES (p_user, v_id, v_per, v_fam, v_etat, coalesce((it.v->>'progression')::numeric, 0), (it.v->>'cible')::numeric, v_now, v_now)
        ON CONFLICT (user_id, quete_id, periode) DO UPDATE
          SET etat = EXCLUDED.etat, progression = EXCLUDED.progression, cible = EXCLUDED.cible, maj = v_now
          WHERE codex_progression.etat IN ('verrouillee', 'disponible', 'active');

      ELSIF v_etat = 'terminee' THEN
        v_retro := coalesce((it.v->>'retro')::boolean, false);
        v_nominal := greatest(0, coalesce((it.v->>'xp')::int, 0));
        v_xp := least(v_nominal, greatest(0, coalesce((it.v->>'plafond')::int, v_nominal)), 5000);
        IF v_retro THEN
          v_xp := least(v_xp, v_restant);
        END IF;
        v_atteint := least(coalesce((it.v->>'atteint')::timestamptz, v_now), v_now);
        v_cos := nullif(it.v->>'cosmetique', '');
        v_titre := nullif(it.v->>'titre', '');

        -- déjà versée (ligne effacée ou réécrite à la main) : on ne reverse pas, sans fanfare
        SELECT xp INTO v_deja FROM xp_events
        WHERE user_id = p_user AND source = 'codex' AND meta->>'quete' = v_id AND meta->>'periode' = v_per
        LIMIT 1;

        IF coalesce((it.v->>'differer')::boolean, false) AND NOT v_retro AND v_deja IS NULL THEN
          -- « Récupérer » : faite, sa récompense attend le clic du joueur (codex_recuperer)
          INSERT INTO codex_progression (user_id, quete_id, periode, famille, etat, progression, cible, ouverte_le, terminee_le, retro, xp, cosmetique, titre, vu, maj)
          VALUES (p_user, v_id, v_per, v_fam, 'terminee', coalesce((it.v->>'cible')::numeric, 1), (it.v->>'cible')::numeric,
                  v_atteint, v_atteint, false, v_xp, v_cos, v_titre, false, v_now)
          ON CONFLICT (user_id, quete_id, periode) DO UPDATE
            SET etat = 'terminee', progression = coalesce(EXCLUDED.cible, EXCLUDED.progression), cible = EXCLUDED.cible,
                terminee_le = coalesce(codex_progression.terminee_le, EXCLUDED.terminee_le), recompensee_le = NULL,
                retro = false, xp = EXCLUDED.xp, cosmetique = EXCLUDED.cosmetique, titre = EXCLUDED.titre, vu = false, maj = v_now
            WHERE codex_progression.etat NOT IN ('terminee', 'recompensee');
          GET DIAGNOSTICS v_ok = ROW_COUNT;
          IF v_ok > 0 THEN
            v_diffs := v_diffs || jsonb_build_object('quete', v_id, 'periode', v_per, 'xp', v_xp, 'nominal', v_nominal, 'retro', false, 'cosmetique', v_cos, 'titre', v_titre);
          END IF;

        ELSE
          INSERT INTO codex_progression (user_id, quete_id, periode, famille, etat, progression, cible, ouverte_le, terminee_le, recompensee_le, retro, xp, cosmetique, titre, vu, maj)
          VALUES (p_user, v_id, v_per, v_fam, 'recompensee', coalesce((it.v->>'cible')::numeric, 1), (it.v->>'cible')::numeric,
                  v_atteint, v_atteint, v_now, v_retro, coalesce(v_deja, v_xp), v_cos, v_titre, v_retro OR v_deja IS NOT NULL, v_now)
          ON CONFLICT (user_id, quete_id, periode) DO UPDATE
            SET etat = 'recompensee', progression = coalesce(EXCLUDED.cible, EXCLUDED.progression), cible = EXCLUDED.cible,
                terminee_le = coalesce(codex_progression.terminee_le, EXCLUDED.terminee_le), recompensee_le = v_now,
                retro = EXCLUDED.retro, xp = EXCLUDED.xp, cosmetique = EXCLUDED.cosmetique, titre = EXCLUDED.titre, vu = EXCLUDED.vu, maj = v_now
            WHERE codex_progression.etat <> 'recompensee';
          GET DIAGNOSTICS v_ok = ROW_COUNT;

          -- déjà récompensée, ou XP déjà versée : rien de plus (ni XP, ni fanfare, ni budget pris)
          IF v_ok > 0 AND v_deja IS NULL THEN
            IF v_xp > 0 THEN
              INSERT INTO xp_events (user_id, xp, source, meta)
              VALUES (p_user, v_xp, 'codex', jsonb_build_object('quete', v_id, 'periode', v_per, 'retro', v_retro, 'xp_vise', v_nominal));
              UPDATE profiles SET xp_total = xp_total + v_xp WHERE id = p_user;
            END IF;

            -- un exploit nouveau se garde aussi parmi les sceaux (palier 1)
            IF v_fam = 'exploit' AND v_id LIKE 'exploit:%' AND v_id NOT LIKE 'exploit:sceau:%' AND to_regclass('public.sceaux') IS NOT NULL THEN
              EXECUTE 'INSERT INTO sceaux (user_id, cle, palier, dates, retro, vu) VALUES ($1, $2, 1, ARRAY[$3::timestamptz], $4, $4) ON CONFLICT (user_id, cle) DO NOTHING'
                USING p_user, left(v_id, 64), v_atteint, v_retro;
            END IF;

            v_recs := v_recs || jsonb_build_object('quete', v_id, 'periode', v_per, 'xp', v_xp, 'nominal', v_nominal, 'retro', v_retro, 'cosmetique', v_cos, 'titre', v_titre);
            IF v_retro THEN
              v_restant := v_restant - v_xp;
              v_retro_xp := v_retro_xp + v_xp;
              v_retro_n := v_retro_n + 1;
              IF v_fam = 'acte' THEN v_actes := array_append(v_actes, v_id); END IF;
              IF v_cos IS NOT NULL AND v_cos NOT LIKE 'titre:%' THEN v_coss := array_append(v_coss, v_cos); END IF;
              IF v_cos LIKE 'titre:%' THEN v_titres := array_append(v_titres, v_cos); END IF;
              IF v_titre IS NOT NULL THEN v_titres := array_append(v_titres, v_titre); END IF;
            END IF;
          END IF;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err + 1;
      PERFORM _codex_erreur(p_user, v_id, v_per, SQLSTATE || ' ' || SQLERRM);
    END;
  END LOOP;

  -- la rétroactivité s'ajoute au résumé de la cérémonie (jusqu'à ce qu'elle soit jouée)
  IF v_retro_n > 0 THEN
    UPDATE codex_joueur j
    SET retro = jsonb_build_object(
          'xp', coalesce((j.retro->>'xp')::int, 0) + v_retro_xp,
          'quetes', coalesce((j.retro->>'quetes')::int, 0) + v_retro_n,
          'actes', coalesce(j.retro->'actes', '[]'::jsonb) || to_jsonb(v_actes),
          'cosmetiques', coalesce(j.retro->'cosmetiques', '[]'::jsonb) || to_jsonb(v_coss),
          'titres', coalesce(j.retro->'titres', '[]'::jsonb) || to_jsonb(v_titres)),
        retro_vue = false
    WHERE j.user_id = p_user;
  END IF;
  UPDATE codex_joueur SET dernier_calcul = v_now WHERE user_id = p_user;
  SELECT CASE WHEN NOT retro_vue THEN retro END INTO v_res FROM codex_joueur WHERE user_id = p_user;

  RETURN jsonb_build_object('recompenses', v_recs, 'differees', v_diffs, 'retro', v_res, 'premier', v_premier, 'erreurs', v_err);
END;
$$;

REVOKE ALL ON FUNCTION codex_ecrire(uuid, jsonb, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION codex_ecrire(uuid, jsonb, int) TO service_role;

-- 9c. codex_recuperer(uuid, jsonb) : le clic « Récupérer ». Verse les quêtes
-- faites qui attendent (« terminee ») : toutes (p_cles NULL) ou celles de la
-- liste [{"quete": …, "periode": …}] (periode absente : ''). 200 au plus par
-- appel, les plus anciennes d'abord. Pour chacune : l'XP dans xp_events
-- (source « codex », meta.differe vrai) et profiles.xp_total, l'exploit
-- parmi les sceaux, puis la ligne « recompensee » (vu vrai : le site joue
-- les fêtes d'après ce résultat). Un double clic ou deux onglets ne versent
-- qu'une fois : même verrou que codex_ecrire, lignes prises FOR UPDATE, et
-- l'index unique xp_events_codex_une_fois refuse un second versement (la
-- ligne est alors récompensée sans rien verser). Une ligne en erreur est
-- consignée (codex_erreurs) et n'empêche pas les autres.
-- Rend {"recuperees": [{quete, periode, famille, xp, cosmetique, titre,
-- terminee_le}], "xp": l'XP versée à cet appel, "restant": les quêtes qui
-- attendent encore, "erreurs"}. Clé service seulement.
CREATE OR REPLACE FUNCTION codex_recuperer(p_user uuid, p_cles jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r         record;
  v_now     timestamptz := now();
  v_ok      int;
  v_xp      int;
  v_deja    int;
  v_total   int := 0;
  v_recs    jsonb := '[]'::jsonb;
  v_restant int;
  v_err     int := 0;
BEGIN
  IF p_user IS NULL THEN
    RAISE EXCEPTION 'Joueur manquant';
  END IF;
  IF p_cles IS NOT NULL AND jsonb_typeof(p_cles) <> 'array' THEN
    RAISE EXCEPTION 'Clés invalides';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('codex:' || p_user::text));

  FOR r IN
    SELECT p.quete_id, p.periode, p.famille, p.xp, p.cosmetique, p.titre, p.terminee_le
    FROM codex_progression p
    WHERE p.user_id = p_user AND p.etat = 'terminee'
      AND (p_cles IS NULL OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_cles) c
                                     WHERE c->>'quete' = p.quete_id AND coalesce(c->>'periode', '') = p.periode))
    ORDER BY p.terminee_le NULLS LAST, p.quete_id, p.periode
    LIMIT 200
    FOR UPDATE
  LOOP
    BEGIN
      v_xp := greatest(0, coalesce(r.xp, 0));
      v_deja := NULL;
      IF v_xp > 0 THEN
        INSERT INTO xp_events (user_id, xp, source, meta)
        VALUES (p_user, v_xp, 'codex', jsonb_build_object('quete', r.quete_id, 'periode', r.periode, 'retro', false, 'xp_vise', v_xp, 'differe', true))
        ON CONFLICT (user_id, (meta->>'quete'), (meta->>'periode')) WHERE source = 'codex' DO NOTHING;
        GET DIAGNOSTICS v_ok = ROW_COUNT;
        IF v_ok > 0 THEN
          UPDATE profiles SET xp_total = xp_total + v_xp WHERE id = p_user;
        ELSE
          -- déjà versée (un autre appel, un autre chemin) : rien de plus, la ligne garde l'XP d'alors
          SELECT xp INTO v_deja FROM xp_events
          WHERE user_id = p_user AND source = 'codex' AND meta->>'quete' = r.quete_id AND meta->>'periode' = r.periode
          LIMIT 1;
          v_deja := coalesce(v_deja, v_xp);
        END IF;
      END IF;

      -- un exploit nouveau se garde aussi parmi les sceaux (palier 1), comme dans codex_ecrire
      IF r.famille = 'exploit' AND r.quete_id LIKE 'exploit:%' AND r.quete_id NOT LIKE 'exploit:sceau:%' AND to_regclass('public.sceaux') IS NOT NULL THEN
        EXECUTE 'INSERT INTO sceaux (user_id, cle, palier, dates, retro, vu) VALUES ($1, $2, 1, ARRAY[$3::timestamptz], false, false) ON CONFLICT (user_id, cle) DO NOTHING'
          USING p_user, left(r.quete_id, 64), coalesce(r.terminee_le, v_now);
      END IF;

      UPDATE codex_progression
      SET etat = 'recompensee', recompensee_le = v_now, vu = true, xp = coalesce(v_deja, xp), maj = v_now
      WHERE user_id = p_user AND quete_id = r.quete_id AND periode = r.periode;

      v_recs := v_recs || jsonb_build_object('quete', r.quete_id, 'periode', r.periode, 'famille', r.famille,
                                             'xp', CASE WHEN v_deja IS NULL THEN v_xp ELSE 0 END,
                                             'cosmetique', r.cosmetique, 'titre', r.titre, 'terminee_le', r.terminee_le);
      IF v_deja IS NULL THEN v_total := v_total + v_xp; END IF;
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err + 1;
      PERFORM _codex_erreur(p_user, r.quete_id, r.periode, 'codex_recuperer : ' || SQLSTATE || ' ' || SQLERRM);
    END;
  END LOOP;

  SELECT count(*)::int INTO v_restant FROM codex_progression WHERE user_id = p_user AND etat = 'terminee';
  RETURN jsonb_build_object('recuperees', v_recs, 'xp', v_total, 'restant', v_restant, 'erreurs', v_err);
END;
$$;

REVOKE ALL ON FUNCTION codex_recuperer(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION codex_recuperer(uuid, jsonb) TO service_role;

-- ── 9d. codex_mesures_v3 (le site, clé service) ─────────────────────
-- Réécrite EN ENTIER par chaque lot qui l'étend (A2b, A3b, A4a, puis §9 :
-- « Récupérer »), dans la dernière section qui la touche.
-- Rend {programme, capacites, jours_encre_total, programmes_menes,
-- maitres_total, trophees, notions_tenues, speciaux_matiere} et, quand la base
-- sait les lire, {maitrise, revoir, ratures_scellees, blancs_a_debriefer,
-- causes} (clé absente sinon : la mesure reste inconnue du site). Les
-- capacités sont lues à l'exécution : ce que la base sait faire selon ce qui
-- est collé. Les réponses du joueur sont lues une fois par appel
-- (_codex_reponses_v3, §5) : appelée par codex_lire, la fonction réutilise la
-- lecture du journal. VOLATILE : le cache est une table temporaire.
--   notions_tenues     : {"<notion>": {"n": réponses, "j5": justes parmi les 5 dernières}}
--                        (une notion est tenue à n ≥ 5 et j5 ≥ 3 : lib/codex/moteur.ts)
--   speciaux_matiere   : {"serie_bonnes": {"<matière>": n}, "serie_calculs": {"<matière>": n},
--                         "justes_sur_20": {"<matière>": n}}
--                        bonnes réponses d'affilée dans la matière (une erreur ou 20 min de
--                        silence la rompt, comme serie_bonnes de codex_lire) ; calculs justes d'affilée ;
--                        bonnes réponses parmi les 20 dernières de la matière (l'étape « serie »
--                        d'une branche sans séance ciblée)
--   maitrise           : {"<matière>": {"pct", "questions", "total", "debut", "statut", "derniere", "ancienne"}}
--                        la maîtrise unique (maitrise_joueur, migration_v3_profil.sql §4) ;
--                        questions = réponses de la fenêtre (60 au plus), pct null sous 10
--   revoir             : {"aujourdhui", "demain", "ratures", "rappels"} (revisions_dues, §3b)
--   ratures_scellees   : ratures scellées (ratures.scellee_le, §3a) et toujours rayées,
--                        comme le carnet (get_ratures.scellees) : remise en cours à la
--                        main, elle ne compte plus (l'événement rature_scellee, daté, reste)
--   blancs_a_debriefer : copies rendues depuis 7 jours (examens blancs et officiels) dont
--                        moins de 80 % des erreurs sont classées (blanc_debrief, §5)
--   causes             : {"savoir", "lecture", "calcul", "temps", "chance" (en %), "n"}, les
--                        erreurs classées des 60 derniers jours (comme mes_causes)
CREATE OR REPLACE FUNCTION codex_mesures_v3(p_user uuid, p_programme text DEFAULT 'finance/cfa-l1')
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_capacites jsonb;
  v_jours int;
  v_menes int;
  v_maitres int;
  v_trophees jsonb := '[]'::jsonb;
  v_tenues jsonb;
  v_bonnes jsonb;
  v_justes jsonb;
  v_calculs jsonb := '{}'::jsonb;
  v_tmp jsonb;
  v_copies text[] := '{}';
  v_plus jsonb := '{}'::jsonb;
  v_n int;
BEGIN
  IF p_user IS NULL OR p_programme IS NULL OR p_programme !~ '^[a-z]+/[a-z0-9-]{2,40}$' THEN
    RAISE EXCEPTION 'programme invalide : %', p_programme;
  END IF;
  v_capacites := jsonb_build_object(
    -- le CHECK de codex_progression.famille accepte « fil » (§3c) ET codex_ecrire l'écrit
    -- (§1d) : chaque capacité se lit sur la fonction elle-même, pas sur un marqueur. Un
    -- migration_codex.sql recollé après ce fichier remet le codex_ecrire v2, qui saute en
    -- silence toute famille « fil » (la quête serait fêtée à chaque calcul) : fil faux.
    'fil', EXISTS (SELECT 1 FROM pg_constraint c
                   WHERE c.conrelid = 'public.codex_progression'::regclass AND c.conname = 'codex_progression_famille_check'
                     AND pg_get_constraintdef(c.oid) LIKE '%''fil''%')
           AND coalesce(pg_get_functiondef(to_regprocedure('public.codex_ecrire(uuid,jsonb,integer)')) LIKE '%''fil''%', false),
    -- les mesures nouvelles de cette fonction (notions tenues, spéciaux par matière, trophées)
    'mesures', true,
    -- le journal v3 (§5) : son marqueur ET un codex_journal qui rend ses événements
    -- (seance_juste) ; le journal v2 recollé par-dessus : 2
    'journal', CASE WHEN to_regprocedure('public._codex_journal_v3()') IS NOT NULL
                     AND coalesce(pg_get_functiondef(to_regprocedure('public.codex_journal(uuid)')) LIKE '%seance_juste%', false)
                    THEN 3 ELSE 2 END,
    'seances', to_regclass('public.codex_seances') IS NOT NULL,
    'revoir', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'revisions_dues'),
    'maitrise', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'maitrise_joueur'),
    'trophees', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trophees_joueur'),
    'debrief', to_regclass('public.blanc_debrief') IS NOT NULL,
    'ratures_seches', EXISTS (SELECT 1 FROM pg_attribute a
                              WHERE a.attrelid = to_regclass('public.ratures') AND a.attname = 'seche_le' AND NOT a.attisdropped),
    -- « Récupérer » (§9) : codex_recuperer ET un codex_ecrire qui sait différer (un
    -- codex_ecrire d'avant recollé par-dessus verse tout de suite : recuperer faux)
    'recuperer', to_regprocedure('public.codex_recuperer(uuid,jsonb)') IS NOT NULL
                 AND coalesce(pg_get_functiondef(to_regprocedure('public.codex_ecrire(uuid,jsonb,integer)')) LIKE '%differer%', false)
  );
  -- les jours d'encre de toute une vie : 10 questions ou plus dans le jour de Paris, tous programmes
  SELECT count(*)::int INTO v_jours FROM _codex_jours_lus(p_user) j WHERE j.n >= 10;
  SELECT count(*)::int INTO v_menes FROM codex_programmes_joueur WHERE user_id = p_user AND statut = 'mene';
  -- les branches menées jusqu'à « Maître de… », tous programmes (« branche:fsa:maitre », « cfa-l2/branche:fsa:maitre »),
  -- récupérées ou non (§9) : « fait » n'est pas « versé », le fil rouge n'attend pas le clic
  SELECT count(*)::int INTO v_maitres FROM codex_progression
  WHERE user_id = p_user AND etat IN ('terminee', 'recompensee') AND periode = '' AND quete_id ~ '^([a-z0-9-]+/)?branche:[^:/]+:maitre$';
  -- les trophées (V3 §2.5), une ligne par source et par palier (1 bronze … 4 diamant) :
  -- trophees_joueur (migration_v3_profil.sql §2) quand elle est collée ; sinon la
  -- seule source « ciblee », comme get_user_practice_trophies (séance à 70 % ou
  -- mieux, palier par le nombre de matières), avec le plafond par taille
  -- (moins de 30 questions : argent au plus ; moins de 60 : or au plus) pour les
  -- seules séances rendues depuis la mise en ligne v3 (18 octobre 2026, minuit à
  -- Paris, comme _trophee_ciblee et PLAFOND_CIBLEE_DEPUIS) : rien de gagné repris.
  IF to_regprocedure('public.trophees_joueur(uuid)') IS NOT NULL THEN
    EXECUTE $q$
      SELECT coalesce(jsonb_agg(jsonb_build_object('source', t.source, 'palier', t.palier, 'n', t.n) ORDER BY t.source, t.palier), '[]'::jsonb)
      FROM trophees_joueur($1) t WHERE t.n > 0
    $q$ INTO v_trophees USING p_user;
  ELSIF to_regclass('public.practice_session_results') IS NOT NULL THEN
    EXECUTE $q$
      SELECT coalesce(jsonb_agg(jsonb_build_object('source', 'ciblee', 'palier', x.palier, 'n', x.n) ORDER BY x.palier), '[]'::jsonb)
      FROM (
        SELECT CASE WHEN s.completed_at < timestamptz '2026-10-18 00:00:00+02' THEN s.brut
                    ELSE least(s.brut, CASE WHEN s.total < 30 THEN 2 WHEN s.total < 60 THEN 3 ELSE 4 END) END AS palier,
               count(*)::int AS n
        FROM (SELECT CASE WHEN coalesce(array_length(r.topics, 1), 1) >= 7 THEN 4 WHEN coalesce(array_length(r.topics, 1), 1) >= 4 THEN 3
                          WHEN coalesce(array_length(r.topics, 1), 1) >= 2 THEN 2 ELSE 1 END AS brut,
                     r.total, r.completed_at
              FROM practice_session_results r
              WHERE r.user_id = $1 AND r.total > 0 AND r.score::numeric / r.total >= 0.7) s
        GROUP BY 1
      ) x
    $q$ INTO v_trophees USING p_user;
  END IF;
  -- les réponses du joueur, lues une fois par appel (_codex_reponses_v3 : même rattachement à la
  -- matière et à la notion que codex_journal) : les notions tenues (V3 §8.5), réponses par notion
  -- et justes parmi les 5 dernières ; et la plus longue suite de bonnes réponses d'affilée dans
  -- chaque matière (V3 §8.7)
  WITH rep AS MATERIALIZED (
    SELECT r.ok, r.at, r.matiere, r.notion, row_number() OVER (ORDER BY r.at) AS ord
    FROM _codex_reponses_v3(p_user) r
  )
  SELECT
    (SELECT coalesce(jsonb_object_agg(t.notion, jsonb_build_object('n', t.n, 'j5', t.j5)), '{}'::jsonb)
     FROM (SELECT x.notion, count(*)::int AS n, (count(*) FILTER (WHERE x.ok AND x.rang <= 5))::int AS j5
           FROM (SELECT c.notion, c.ok, row_number() OVER (PARTITION BY c.notion ORDER BY c.at DESC, c.ord DESC) AS rang
                 FROM rep c WHERE c.notion IS NOT NULL) x
           GROUP BY x.notion) t),
    (SELECT coalesce(jsonb_object_agg(y.matiere, y.n), '{}'::jsonb)
     FROM (SELECT z.matiere, max(z.c)::int AS n
           FROM (SELECT g.matiere, g.grp, count(*) AS c
                 FROM (SELECT s.matiere, s.ok, sum(CASE WHEN NOT s.ok OR s.silence THEN 1 ELSE 0 END) OVER (PARTITION BY s.matiere ORDER BY s.at, s.ord) AS grp
                       FROM (SELECT c.matiere, c.ok, c.at, c.ord,
                                    (c.at - lag(c.at) OVER (PARTITION BY c.matiere ORDER BY c.at, c.ord)) > interval '20 minutes' AS silence
                             FROM rep c WHERE c.matiere IS NOT NULL) s) g
                 WHERE g.ok
                 GROUP BY g.matiere, g.grp) z
           GROUP BY z.matiere) y),
    -- les bonnes réponses parmi les 20 dernières de chaque matière
    (SELECT coalesce(jsonb_object_agg(j.matiere, j.n), '{}'::jsonb)
     FROM (SELECT x.matiere, (count(*) FILTER (WHERE x.ok))::int AS n
           FROM (SELECT c.matiere, c.ok, row_number() OVER (PARTITION BY c.matiere ORDER BY c.at DESC, c.ord DESC) AS rang
                 FROM rep c WHERE c.matiere IS NOT NULL) x
           WHERE x.rang <= 20
           GROUP BY x.matiere) j)
  INTO v_tenues, v_bonnes, v_justes;
  -- … et de calculs justes (calc_attempts, la matière est le sujet du calcul)
  IF to_regclass('public.calc_attempts') IS NOT NULL THEN
    EXECUTE $q$
      SELECT coalesce(jsonb_object_agg(y.matiere, y.n), '{}'::jsonb)
      FROM (
        SELECT z.matiere, max(z.c)::int AS n
        FROM (
          SELECT g.matiere, g.grp, count(*) AS c
          FROM (SELECT c.topic AS matiere, c.correct,
                       sum(CASE WHEN c.correct THEN 0 ELSE 1 END) OVER (PARTITION BY c.topic ORDER BY c.answered_at, c.id) AS grp
                FROM calc_attempts c
                WHERE c.user_id = $1 AND EXISTS (SELECT 1 FROM codex_matieres m WHERE m.cle = c.topic)) g
          WHERE g.correct
          GROUP BY g.matiere, g.grp
        ) z
        GROUP BY z.matiere
      ) y
    $q$ INTO v_calculs USING p_user;
  END IF;

  -- la maîtrise unique (V3 §4), au format des mesures du Codex : questions = réponses de la
  -- fenêtre (le statut « mesuree » commence à 40) ; ancienne garde le verrou des rangs (§4.5).
  -- maitrise_joueur lit le même cache des réponses.
  IF to_regprocedure('public.maitrise_joueur(uuid,text)') IS NOT NULL THEN
    EXECUTE 'SELECT maitrise_joueur($1, $2)' INTO v_tmp USING p_user, p_programme;
    IF jsonb_typeof(v_tmp -> 'matieres') = 'object' THEN
      SELECT coalesce(jsonb_object_agg(m.key, jsonb_build_object(
               'pct', m.value -> 'pct', 'questions', coalesce((m.value ->> 'n')::int, 0), 'total', coalesce((m.value ->> 'total')::int, 0),
               'debut', m.value -> 'debut', 'statut', m.value -> 'statut', 'derniere', m.value -> 'derniere', 'ancienne', m.value -> 'ancienne')), '{}'::jsonb)
      INTO v_tmp
      FROM jsonb_each(v_tmp -> 'matieres') m
      WHERE jsonb_typeof(m.value) = 'object';
      v_plus := v_plus || jsonb_build_object('maitrise', v_tmp);
    END IF;
  END IF;
  -- la file « À revoir » (V3 §5.1) : les comptes seulement (le site lit la file elle-même à part)
  IF to_regprocedure('public.revisions_dues(uuid,date,integer)') IS NOT NULL THEN
    EXECUTE 'SELECT revisions_dues($1, NULL, 25)' INTO v_tmp USING p_user;
    IF jsonb_typeof(v_tmp) = 'object' THEN
      v_plus := v_plus || jsonb_build_object('revoir', jsonb_build_object(
        'aujourdhui', coalesce(v_tmp -> 'aujourdhui', '0'::jsonb), 'demain', coalesce(v_tmp -> 'demain', '0'::jsonb),
        'ratures', coalesce(v_tmp -> 'ratures', '0'::jsonb), 'rappels', coalesce(v_tmp -> 'rappels', '0'::jsonb)));
    END IF;
  END IF;
  -- les ratures scellées (V3 §5.3)
  IF EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = to_regclass('public.ratures') AND a.attname = 'scellee_le' AND NOT a.attisdropped) THEN
    EXECUTE 'SELECT count(*)::int FROM ratures WHERE user_id = $1 AND scellee_le IS NOT NULL AND removed_at IS NOT NULL' INTO v_n USING p_user;
    v_plus := v_plus || jsonb_build_object('ratures_scellees', v_n);
  END IF;
  -- le débrief des examens blancs (V3 §7.6) : les copies rendues depuis 7 jours qui restent à
  -- débriefer (erreurs de la copie d'après _blanc_erreurs ; classées à moins de 80 %), et la
  -- répartition des causes sur 60 jours
  IF to_regclass('public.blanc_debrief') IS NOT NULL AND to_regprocedure('public._blanc_erreurs(uuid,text,uuid)') IS NOT NULL THEN
    IF to_regclass('public.mock_exam_results') IS NOT NULL THEN
      v_copies := array_append(v_copies, $q$
        SELECT 'blanc'::text AS source, r.exam_id AS ref FROM mock_exam_results r
        WHERE r.user_id = $1 AND r.completed_at >= now() - interval '7 days'
      $q$);
    END IF;
    IF to_regclass('public.quiz_attempts') IS NOT NULL THEN
      v_copies := array_append(v_copies, $q$
        SELECT 'officiel'::text, a.id FROM quiz_attempts a
        JOIN quiz_sets qs ON qs.id = a.set_id
        JOIN library_folders lf ON lf.id = qs.folder_id AND lf.name = 'Mocks Officiels (Système)'
        WHERE a.user_id = $1 AND a.created_at >= now() - interval '7 days'
      $q$);
    END IF;
    v_n := 0;
    IF cardinality(v_copies) > 0 THEN
      EXECUTE format($q$
        SELECT count(*)::int FROM (
          SELECT (SELECT count(*) FROM _blanc_erreurs($1, c.source, c.ref)) AS erreurs,
                 (SELECT count(*) FROM blanc_debrief d WHERE d.user_id = $1 AND d.source = c.source AND d.ref = c.ref) AS classees
          FROM (%s) c
        ) x
        WHERE x.erreurs > 0 AND x.classees * 100 < x.erreurs * 80
      $q$, array_to_string(v_copies, ' UNION ALL ')) INTO v_n USING p_user;
    END IF;
    v_plus := v_plus || jsonb_build_object('blancs_a_debriefer', v_n);
    EXECUTE $q$
      SELECT jsonb_build_object(
               'savoir', CASE WHEN x.n > 0 THEN round(100.0 * x.savoir / x.n)::int ELSE 0 END,
               'lecture', CASE WHEN x.n > 0 THEN round(100.0 * x.lecture / x.n)::int ELSE 0 END,
               'calcul', CASE WHEN x.n > 0 THEN round(100.0 * x.calcul / x.n)::int ELSE 0 END,
               'temps', CASE WHEN x.n > 0 THEN round(100.0 * x.temps / x.n)::int ELSE 0 END,
               'chance', CASE WHEN x.n > 0 THEN round(100.0 * x.chance / x.n)::int ELSE 0 END,
               'n', x.n)
      FROM (SELECT count(*)::int AS n,
                   count(*) FILTER (WHERE d.cause = 'savoir') AS savoir, count(*) FILTER (WHERE d.cause = 'lecture') AS lecture,
                   count(*) FILTER (WHERE d.cause = 'calcul') AS calcul, count(*) FILTER (WHERE d.cause = 'temps') AS temps,
                   count(*) FILTER (WHERE d.cause = 'chance') AS chance
            FROM blanc_debrief d WHERE d.user_id = $1 AND d.note_le >= now() - interval '60 days') x
    $q$ INTO v_tmp USING p_user;
    v_plus := v_plus || jsonb_build_object('causes', v_tmp);
  END IF;

  RETURN jsonb_build_object('programme', p_programme, 'capacites', v_capacites, 'jours_encre_total', v_jours, 'programmes_menes', v_menes,
                            'maitres_total', v_maitres, 'trophees', coalesce(v_trophees, '[]'::jsonb),
                            'notions_tenues', v_tenues,
                            'speciaux_matiere', jsonb_build_object('serie_bonnes', v_bonnes, 'serie_calculs', coalesce(v_calculs, '{}'::jsonb), 'justes_sur_20', v_justes))
         || v_plus;
END $$;

REVOKE ALL ON FUNCTION codex_mesures_v3(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION codex_mesures_v3(uuid, text) TO service_role;

-- ============================================================================
-- 10. Corporate Issuers a maintenant sa fiche et son drill (17 octobre 2026)
-- La table codex_matieres (migration_codex.sql) disait « pas de drill, pas de
-- fiche » pour Corporate : les étapes « fiche » et « drill » de sa branche ne
-- pouvaient pas se valider. Idempotent.
-- ============================================================================
UPDATE codex_matieres
   SET prefixe_drill = 'Corporate Issuers', fiche = 'corporate-issuers'
 WHERE cle = 'corporate'
   AND (prefixe_drill IS DISTINCT FROM 'Corporate Issuers' OR fiche IS DISTINCT FROM 'corporate-issuers');

-- ============================================================================
-- 11. Alternative Investments, Ethics, Quantitative Methods et Derivatives ont
-- leur fiche PDF et leur drill (octobre 2026). Comme Corporate (section 10) :
-- sans ces lignes, les étapes « fiche » et « drill » de leurs branches ne
-- peuvent pas se valider (Derivatives avait une fiche sans drill). Idempotent.
-- ============================================================================
UPDATE codex_matieres AS m
   SET prefixe_drill = v.prefixe, fiche = v.fiche
  FROM (VALUES
         ('alternatives', 'Alternative Investments', 'alternative-investments'),
         ('ethics', 'Ethical and Professional Standards', 'ethics'),
         ('quant', 'Quantitative Methods', 'quantitative-methods'),
         ('derivatives', 'Derivatives', 'derivatives')
       ) AS v(cle, prefixe, fiche)
 WHERE m.cle = v.cle
   AND (m.prefixe_drill IS DISTINCT FROM v.prefixe OR m.fiche IS DISTINCT FROM v.fiche);

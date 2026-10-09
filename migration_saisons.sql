-- Profil de joueur, les saisons (étape 6) : des trimestres calés sur les
-- sessions du CFA Level I (février, mai, août, novembre). À la fin de
-- chacune, le PIC de la saison de chaque joueur est gravé (sceau hexagonal
-- « S1 · OR I » sur le profil) : permanent, pas de rattrapage. Pas de remise
-- à zéro de l'ELO : la saison ne fait que regarder rating_events.
-- À coller dans le SQL Editor de Supabase, APRÈS migration_profil_social.sql
-- (elle-même après migration_duels_elo.sql, qui crée rating_events et
-- ratings, et migration_practice_sessions.sql, qui crée
-- practice_session_results). Idempotente (rejouable). Ne redéfinit aucune
-- fonction existante.
--
-- Le calendrier. Une saison dure trois mois et mène à une session : elle
-- commence le 1er du mois qui suit la session précédente (minuit, heure de
-- Paris) et finit le 1er du mois qui suit la sienne. La saison 1 est celle
-- en cours au moment de cette migration : du 1er septembre au 1er décembre
-- 2026, « Novembre 2026 » (clé '2026-11'). Puis S2 « Février 2027 » (du 1er
-- décembre 2026 au 1er mars 2027), S3 « Mai 2027 », S4 « Août 2027 »…
-- Les saisons suivantes se créent seules, à la lecture.
--
-- La clôture, sans tâche planifiée : rl_saisons, appelée à chaque lecture
-- d'un profil, crée la saison en cours si elle manque et clôt les saisons
-- échues (10 minutes de marge après la fin, pour qu'un match commencé avant
-- minuit ait fini d'écrire). La clôture verrouille la ligne de la saison :
-- deux lectures en même temps n'en font qu'une, la seconde trouve la saison
-- close et ne fait rien. Une saison close ne se recalcule jamais.
--
-- Ce qui est gravé, pour chaque joueur qui a au moins un match classé
-- (rating_events) dans la saison :
--   • elo_pic : le meilleur ELO tenu pendant la saison, soit le meilleur
--     ELO après un match de la saison, soit l'ELO avec lequel il est entré
--     dans la saison s'il est plus haut (un nouveau joueur n'entre avec
--     rien : seul un match fait un pic, comme statsProfil) ;
--   • elo_final : son ELO à la fin de la saison ;
--   • place_finale : sa place au classement à la fin de la saison (comme
--     getLeaderboardRank : 1 + le nombre de joueurs classés plus haut), sur
--     les joueurs qui avaient joué au moins un match classé avant la fin ;
--   • palier_pic / division_pic et palier_final / division_finale : le
--     palier (index de TIERS, lib/ranks.ts : 0 Bronze … 7 Top 10) et la
--     division (III, II, I ; NULL pour Top 10), par la règle de rankFor :
--     seuils d'ELO, Top 10 si la place est dans les 10 premières (et au
--     moins Grand Maître), verrous de maîtrise (Diamant 60 %, Maître 70,
--     Grand Maître 80, Top 10 90). La maîtrise est celle du programme au
--     moment de la clôture (comme masteryByUser : sessions à une matière,
--     5 questions au moins par matière, moyenne des 10 matières) ;
--   • matchs : ses matchs classés dans la saison.
--
-- Droits : les saisons et les résultats sont lisibles par tous les joueurs
-- connectés (comme rating_events et le classement) ; aucune écriture
-- directe (RLS sans politique d'écriture). rl_saisons(p_user) et
-- rl_clore_saison(p_cle) : joueurs connectés seulement.
-- _saison_clore(p_cle) : sans droit pour les clients (SQL Editor seulement).

-- ── 1. les tables ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saisons (
  -- le mois de la session visée : '2026-11'
  cle           text        PRIMARY KEY CHECK (cle ~ '^[0-9]{4}-(02|05|08|11)$'),
  numero        int         NOT NULL UNIQUE CHECK (numero >= 1),
  nom           text        NOT NULL,
  debut         timestamptz NOT NULL,
  fin           timestamptz NOT NULL,
  -- la clôture : quand, et combien de joueurs gravés
  clos_le       timestamptz,
  participants  int,
  CHECK (fin > debut)
);
ALTER TABLE saisons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saisons_lecture ON saisons;
CREATE POLICY saisons_lecture ON saisons FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS saison_resultats (
  saison           text     NOT NULL REFERENCES saisons(cle) ON DELETE CASCADE,
  user_id          uuid     NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  palier_pic       smallint NOT NULL CHECK (palier_pic BETWEEN 0 AND 7),
  division_pic     text     CHECK (division_pic IN ('III', 'II', 'I')),
  palier_final     smallint NOT NULL CHECK (palier_final BETWEEN 0 AND 7),
  division_finale  text     CHECK (division_finale IN ('III', 'II', 'I')),
  elo_pic          int      NOT NULL,
  elo_final        int      NOT NULL,
  place_finale     int      NOT NULL CHECK (place_finale >= 1),
  maitrise         int      NOT NULL CHECK (maitrise BETWEEN 0 AND 100),
  matchs           int      NOT NULL CHECK (matchs >= 1),
  PRIMARY KEY (saison, user_id)
);
CREATE INDEX IF NOT EXISTS saison_resultats_joueur ON saison_resultats (user_id);
ALTER TABLE saison_resultats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saison_resultats_lecture ON saison_resultats;
CREATE POLICY saison_resultats_lecture ON saison_resultats FOR SELECT TO authenticated USING (true);

-- ── 2. le calendrier ──────────────────────────────────────────────────
-- La saison n : clé, nom, début et fin (minuit, heure de Paris).
CREATE OR REPLACE FUNCTION _saison_bornes(p_n int)
RETURNS TABLE (cle text, nom text, debut timestamptz, fin timestamptz)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT
    to_char(m.session, 'YYYY-MM'),
    (ARRAY['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'])[extract(month FROM m.session)::int]
      || ' ' || extract(year FROM m.session)::int,
    m.premier::timestamp AT TIME ZONE 'Europe/Paris',
    (m.premier + interval '3 months')::timestamp AT TIME ZONE 'Europe/Paris'
  FROM (
    SELECT (date '2026-09-01' + make_interval(months => 3 * (p_n - 1)))::date AS premier,
           (date '2026-09-01' + make_interval(months => 3 * (p_n - 1) + 2))::date AS session
  ) m;
$$;

-- ── 3. le palier, comme rankFor (lib/ranks.ts) ────────────────────────
-- Seuils et verrous recopiés de TIERS : à garder alignés.
CREATE OR REPLACE FUNCTION _saison_palier(p_elo int, p_maitrise int, p_place int, OUT palier smallint, OUT division text)
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
  -- index 0..6 (Bronze … Grand Maître) ; Top 10 (7) n'est pas un seuil
  v_min    int[] := ARRAY[0, 1100, 1250, 1400, 1550, 1700, 1850];
  v_verrou int[] := ARRAY[NULL, NULL, NULL, NULL, 60, 70, 80, 90];
  v_elo    int := coalesce(p_elo, 0);
  v_idx    int := 0;
  v_lo     int;
  v_hi     int;
  v_span   int;
  v_dans   int;
BEGIN
  FOR i IN 0..6 LOOP
    IF v_elo >= v_min[i + 1] THEN v_idx := i; END IF;
  END LOOP;
  IF p_place IS NOT NULL AND p_place <= 10 AND v_idx >= 6 THEN v_idx := 7; END IF;
  IF p_maitrise IS NOT NULL THEN
    WHILE v_idx > 0 AND v_verrou[v_idx + 1] IS NOT NULL AND p_maitrise < v_verrou[v_idx + 1] LOOP
      v_idx := v_idx - 1;
    END LOOP;
  END IF;
  palier := v_idx;
  IF v_idx = 7 THEN division := NULL; RETURN; END IF;
  v_lo := v_min[v_idx + 1];
  v_hi := CASE WHEN v_idx + 1 < 7 THEN v_min[v_idx + 2] ELSE v_lo + 150 END;
  v_span := greatest(1, v_hi - v_lo);
  v_dans := greatest(0, least(v_span - 1, v_elo - CASE WHEN v_idx = 0 THEN v_hi - 150 ELSE v_lo END));
  -- en double précision, comme le calcul de rankFor en JavaScript
  division := (ARRAY['III', 'II', 'I'])[least(2, floor(v_dans::float8 / v_span * 3)::int) + 1];
END;
$$;

-- La maîtrise du programme d'un joueur, comme masteryByUser : sessions à
-- une seule matière, une matière comptée à partir de 5 questions, moyenne
-- des 10 matières (celles jamais travaillées comptent 0).
CREATE OR REPLACE FUNCTION _saison_maitrise(p_user uuid)
RETURNS int
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT coalesce(round(sum(t.pct) / 10.0), 0)::int
  FROM (
    SELECT round(sum(r.score)::numeric * 100 / nullif(sum(r.total), 0)) AS pct
    FROM practice_session_results r
    WHERE r.user_id = p_user
      AND cardinality(r.topics) = 1
      AND r.topics[1] IN ('ethics', 'quant', 'economics', 'fsa', 'corporate', 'equity', 'fixed_income', 'derivatives', 'alternatives', 'portfolio')
    GROUP BY r.topics[1]
    HAVING sum(r.total) >= 5
  ) t;
$$;

-- L'ELO de chaque joueur classé juste avant p_t (son dernier match avant
-- p_t). Deux matchs réglés dans la même transaction ont la même date : le
-- dernier est celui qu'aucun autre du groupe ne prolonge (comme enChaine
-- dans lib/profil/journal.ts).
CREATE OR REPLACE FUNCTION _saison_elos_avant(p_t timestamptz)
RETURNS TABLE (user_id uuid, elo int)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT DISTINCT ON (e.user_id) e.user_id, e.elo_after
  FROM rating_events e
  WHERE e.created_at < p_t
  ORDER BY e.user_id, e.created_at DESC,
    (NOT EXISTS (SELECT 1 FROM rating_events f
                 WHERE f.user_id = e.user_id AND f.created_at = e.created_at AND f.id <> e.id AND f.elo_before = e.elo_after)) DESC,
    e.id;
$$;

-- Les lignes d'une saison entre p_debut et p_fin, pour tous ses joueurs
-- (p_user NULL) ou pour un seul. Sert à la clôture (p_fin : la fin de la
-- saison) et à la saison en cours (p_fin : maintenant). La place au moment
-- du pic ne se calcule que pour un pic d'au moins 1 850 (Grand Maître) :
-- elle ne sert qu'à Top 10.
CREATE OR REPLACE FUNCTION _saison_lignes(p_debut timestamptz, p_fin timestamptz, p_user uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid, palier_pic smallint, division_pic text, palier_final smallint, division_finale text,
  elo_pic int, elo_final int, place_finale int, maitrise int, matchs int
)
LANGUAGE sql STABLE SET search_path = public
AS $$
  WITH fins AS (SELECT * FROM _saison_elos_avant(p_fin)),
  entrees AS (SELECT * FROM _saison_elos_avant(p_debut)),
  joueurs AS (
    SELECT e.user_id, max(e.elo_after) AS meilleur, count(*)::int AS n
    FROM rating_events e
    WHERE e.created_at >= p_debut AND e.created_at < p_fin
      AND (p_user IS NULL OR e.user_id = p_user)
    GROUP BY e.user_id
  ),
  j AS (
    SELECT s.user_id, s.n, s.meilleur, a.elo AS entree, f.elo AS final,
           greatest(s.meilleur, coalesce(a.elo, s.meilleur)) AS pic,
           least(100, greatest(0, _saison_maitrise(s.user_id))) AS m,
           (SELECT 1 + count(*) FROM fins x WHERE x.elo > f.elo)::int AS place
    FROM joueurs s
    JOIN fins f ON f.user_id = s.user_id
    LEFT JOIN entrees a ON a.user_id = s.user_id
  ),
  k AS (
    SELECT j.*,
      CASE WHEN j.pic >= 1850 THEN (
        SELECT 1 + count(*) FROM _saison_elos_avant(
          CASE WHEN j.entree IS NOT NULL AND j.entree >= j.meilleur THEN p_debut
               ELSE (SELECT min(e.created_at) FROM rating_events e
                      WHERE e.user_id = j.user_id AND e.created_at >= p_debut AND e.created_at < p_fin AND e.elo_after = j.pic)
                    + interval '1 microsecond'
          END) x
        WHERE x.user_id <> j.user_id AND x.elo > j.pic
      )::int END AS place_pic
    FROM j
  )
  SELECT k.user_id, p.palier, p.division, f.palier, f.division, k.pic, k.final, k.place, k.m, k.n
  FROM k
  CROSS JOIN LATERAL _saison_palier(k.pic, k.m, k.place_pic) p
  CROSS JOIN LATERAL _saison_palier(k.final, k.m, k.place) f;
$$;

-- ── 4. la clôture ─────────────────────────────────────────────────────
-- Grave les résultats d'une saison échue. Rend le nombre de joueurs gravés,
-- ou NULL si la saison n'est pas encore échue. Idempotente : une saison
-- close rend son compte sans rien recalculer. Le verrou de la ligne fait
-- attendre une clôture concurrente, qui trouve ensuite la saison close.
CREATE OR REPLACE FUNCTION _saison_clore(p_cle text)
RETURNS int
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s    saisons%ROWTYPE;
  v_n  int;
BEGIN
  SELECT * INTO s FROM saisons WHERE cle = p_cle FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown season'; END IF;
  IF s.clos_le IS NOT NULL THEN RETURN s.participants; END IF;
  IF now() < s.fin + interval '10 minutes' THEN RETURN NULL; END IF;

  INSERT INTO saison_resultats (saison, user_id, palier_pic, division_pic, palier_final, division_finale, elo_pic, elo_final, place_finale, maitrise, matchs)
  SELECT p_cle, l.user_id, l.palier_pic, l.division_pic, l.palier_final, l.division_finale, l.elo_pic, l.elo_final, l.place_finale, l.maitrise, l.matchs
  FROM _saison_lignes(s.debut, s.fin) l
  ON CONFLICT (saison, user_id) DO NOTHING;

  SELECT count(*)::int INTO v_n FROM saison_resultats WHERE saison = p_cle;
  UPDATE saisons SET clos_le = now(), participants = v_n WHERE cle = p_cle;
  RETURN v_n;
END;
$$;

-- Crée les saisons jusqu'à celle en cours, puis clôt les saisons échues.
-- Ne prend le verrou que s'il y a quelque chose à faire.
CREATE OR REPLACE FUNCTION _saisons_a_jour()
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_n    int;
  b      record;
  v_cle  text;
BEGIN
  IF EXISTS (SELECT 1 FROM saisons WHERE fin > now())
     AND NOT EXISTS (SELECT 1 FROM saisons WHERE clos_le IS NULL AND fin + interval '10 minutes' <= now()) THEN
    RETURN;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('rl_saisons'));
  -- les saisons qui manquent, de la première à celle en cours (aucune avant le 1er septembre 2026)
  v_n := 1;
  LOOP
    SELECT * INTO b FROM _saison_bornes(v_n);
    EXIT WHEN b.debut > now();
    INSERT INTO saisons (cle, numero, nom, debut, fin) VALUES (b.cle, v_n, b.nom, b.debut, b.fin) ON CONFLICT DO NOTHING;
    v_n := v_n + 1;
  END LOOP;
  FOR v_cle IN SELECT cle FROM saisons WHERE clos_le IS NULL AND fin + interval '10 minutes' <= now() ORDER BY numero LOOP
    PERFORM _saison_clore(v_cle);
  END LOOP;
END;
$$;

-- Clôt une saison échue (si personne ne l'a encore fait). Rend le nombre de
-- joueurs gravés, ou NULL si elle n'est pas finie.
CREATE OR REPLACE FUNCTION rl_clore_saison(p_cle text)
RETURNS int
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN _saison_clore(p_cle);
END;
$$;

-- ── 5. la lecture ─────────────────────────────────────────────────────
-- Les saisons d'un joueur : la saison en cours (avec son pic jusqu'ici, si
-- p_user y a joué) et son palmarès (les saisons closes où il a joué, de la
-- plus récente à la plus ancienne). Met d'abord le calendrier à jour et
-- clôt les saisons échues : c'est la clôture sans tâche planifiée.
-- Les jours sont rendus en heure de Paris (AAAA-MM-JJ), la fin en ISO pour
-- le compte à rebours.
CREATE OR REPLACE FUNCTION rl_saisons(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s        saisons%ROWTYPE;
  l        record;
  v_cour   jsonb := NULL;
  v_moi    jsonb := NULL;
  v_palm   jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM _saisons_a_jour();

  SELECT * INTO s FROM saisons WHERE debut <= now() AND fin > now() ORDER BY numero DESC LIMIT 1;
  IF FOUND THEN
    IF p_user IS NOT NULL THEN
      SELECT * INTO l FROM _saison_lignes(s.debut, now(), p_user);
      IF FOUND THEN
        v_moi := jsonb_build_object('palier_pic', l.palier_pic, 'division_pic', l.division_pic, 'elo_pic', l.elo_pic, 'matchs', l.matchs);
      END IF;
    END IF;
    v_cour := jsonb_build_object(
      'cle', s.cle, 'numero', s.numero, 'nom', s.nom,
      'debut', to_char(s.debut AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD'),
      'dernier_jour', to_char((s.fin AT TIME ZONE 'Europe/Paris') - interval '1 day', 'YYYY-MM-DD'),
      'fin', s.fin,
      'moi', v_moi
    );
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'cle', x.cle, 'numero', x.numero, 'nom', x.nom,
      'debut', to_char(x.debut AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD'),
      'dernier_jour', to_char((x.fin AT TIME ZONE 'Europe/Paris') - interval '1 day', 'YYYY-MM-DD'),
      'palier_pic', r.palier_pic, 'division_pic', r.division_pic, 'elo_pic', r.elo_pic,
      'palier_final', r.palier_final, 'division_finale', r.division_finale, 'elo_final', r.elo_final,
      'place_finale', r.place_finale, 'matchs', r.matchs, 'joueurs', x.participants
    ) ORDER BY x.numero DESC), '[]'::jsonb)
  INTO v_palm
  FROM saison_resultats r JOIN saisons x ON x.cle = r.saison
  WHERE p_user IS NOT NULL AND r.user_id = p_user;

  RETURN jsonb_build_object('courante', v_cour, 'palmares', v_palm);
END;
$$;

-- ── 6. la première saison ─────────────────────────────────────────────
INSERT INTO saisons (cle, numero, nom, debut, fin)
SELECT b.cle, 1, b.nom, b.debut, b.fin FROM _saison_bornes(1) b
ON CONFLICT DO NOTHING;

-- ── 7. les droits ─────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION _saison_bornes(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _saison_palier(int, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _saison_maitrise(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _saison_elos_avant(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _saison_lignes(timestamptz, timestamptz, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _saison_clore(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _saisons_a_jour() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION rl_clore_saison(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rl_saisons(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rl_clore_saison(text) TO authenticated;
GRANT EXECUTE ON FUNCTION rl_saisons(uuid) TO authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON saisons, saison_resultats FROM anon, authenticated;

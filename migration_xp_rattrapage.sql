-- Rattrapage de l'XP des Salles, des défis et des duels joués avant
-- migration_xp_salles_defis_duels.sql. Accord de Théo le 2026-11-06.
--
-- Même règle que le versement normal : la première bonne réponse à une question
-- officielle rapporte 10, 15 ou 20 XP, une seule fois par joueur.
-- Source « rattrapage » : elle n'est pas dans la liste du bonus de série, donc pas de
-- multiplicateur, et ces lignes restent faciles à retrouver.
-- Chaque ligne porte la date de la réponse, pour que l'XP par jour reste juste.
-- Idempotent : quiz_question_progress filtre ce qui est déjà crédité, recoller ne verse rien.

WITH passe AS (
  SELECT x.user_id, i.question_id, x.repondu_le AS quand, 'salle' AS origine
  FROM salle_reponses x
  JOIN salle_items i ON i.session_id = x.session_id AND i.position = x.position
  JOIN salle_sessions s ON s.id = x.session_id
  WHERE x.juste IS TRUE AND i.origine = 'question' AND i.question_id IS NOT NULL AND s.statut = 'terminee'
  UNION ALL
  SELECT a.user_id, a.question_id, a.answered_at, 'defi'
  FROM daily_answers a
  JOIN daily_attempts t ON t.challenge_id = a.challenge_id AND t.user_id = a.user_id
  WHERE a.is_correct AND t.finished_at IS NOT NULL
  UNION ALL
  SELECT a.user_id, a.question_id, a.answered_at, 'duel'
  FROM duel_answers a
  JOIN duels d ON d.id = a.duel_id
  WHERE a.is_correct AND d.status IN ('finished', 'declined', 'expired')
),
premieres AS (
  SELECT DISTINCT ON (p.user_id, p.question_id) p.user_id, p.question_id, p.quand, p.origine
  FROM passe p
  ORDER BY p.user_id, p.question_id, p.quand
),
dues AS (
  SELECT f.user_id, f.question_id, f.quand, f.origine, lf.name AS topic,
         CASE coalesce(qs.difficulty, 1) WHEN 2 THEN 15 WHEN 3 THEN 20 ELSE 10 END AS xp
  FROM premieres f
  JOIN quiz_questions qq ON qq.id = f.question_id
  JOIN quiz_sets qs ON qs.id = qq.set_id AND qs.is_official AND qs.official_published
  LEFT JOIN library_folders lf ON lf.id = qs.folder_id
  WHERE NOT EXISTS (SELECT 1 FROM quiz_question_progress g WHERE g.user_id = f.user_id AND g.question_id = f.question_id)
),
credited AS (
  INSERT INTO quiz_question_progress (user_id, question_id, first_correct_at)
  SELECT d.user_id, d.question_id, coalesce(d.quand, now())
  FROM dues d
  ON CONFLICT DO NOTHING
  RETURNING user_id, question_id
),
ins_events AS (
  INSERT INTO xp_events (user_id, occurred_at, xp, source, meta)
  SELECT d.user_id, coalesce(d.quand, now()), d.xp, 'rattrapage',
         jsonb_build_object('origine', d.origine, 'question_id', d.question_id, 'topic', d.topic)
  FROM credited c
  JOIN dues d ON d.user_id = c.user_id AND d.question_id = c.question_id
  RETURNING user_id, xp
)
UPDATE profiles p
SET xp_total = p.xp_total + t.xp
FROM (SELECT e.user_id, sum(e.xp)::int AS xp FROM ins_events e GROUP BY e.user_id) t
WHERE p.id = t.user_id;

-- Les notions à travailler dans une Salle : toutes celles de chaque joueur présent, pas ses 15 pires,
-- sinon les notions communes disparaissent. Les communes d'abord, les plus fragiles en tête.
-- Idempotent : se recolle sans effet.

CREATE OR REPLACE FUNCTION public._notions_a_travailler(p_uid uuid)
RETURNS TABLE(notion text, reussite numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT qq.notion,
         round((sum(CASE WHEN r.ok THEN 1 ELSE 0 END) + 3.25) / (count(*) + 5.0), 3) AS reussite
  FROM _reponses_joueur(p_uid) r
  JOIN quiz_questions qq ON qq.id = r.question_id
  WHERE qq.notion IS NOT NULL AND r.at >= now() - interval '90 days'
  GROUP BY qq.notion
  HAVING count(*) >= 8 AND (sum(CASE WHEN r.ok THEN 1 ELSE 0 END) + 3.25) / (count(*) + 5.0) < 0.65
  ORDER BY 2, 1;
$$;

CREATE OR REPLACE FUNCTION public.salle_notions_a_travailler(p_salle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_res json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT _salle_est_membre(p_salle_id, auth.uid()) THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;
  SELECT coalesce(json_agg(json_build_object('notion', x.notion, 'joueurs', x.joueurs) ORDER BY x.joueurs DESC, x.reussite, x.notion), '[]'::json)
  INTO v_res
  FROM (
    SELECT t.notion, count(*)::int AS joueurs, avg(t.reussite) AS reussite
    FROM salle_membres m
    CROSS JOIN LATERAL _notions_a_travailler(m.user_id) t
    WHERE m.salle_id = p_salle_id AND (m.user_id = auth.uid() OR m.vu_le > now() - interval '90 seconds')
    GROUP BY t.notion
  ) x;
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public._notions_a_travailler(uuid) FROM PUBLIC, anon, authenticated;

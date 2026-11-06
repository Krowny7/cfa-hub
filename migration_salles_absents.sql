-- Un joueur absent ne compte plus dans une Salle.
-- « Présent » : la page a signalé sa présence il y a moins de 90 secondes (salle_presence).
--
-- 1. L'admin passe à un joueur présent quand le sien est parti depuis 2 minutes. Ce délai
--    de plus laisse le temps de recharger la page sans perdre l'admin.
-- 2. En quittant la salle, l'admin va d'abord à un joueur présent.
-- 3. Rendre sa copie termine la partie quand tous les présents ont rendu, sans attendre
--    un membre qui n'est pas là.
-- 4. Le classement ne liste que ceux qui ont répondu ou qui sont là.
-- 5. Une partie abandonnée se clôt à son heure, même si plus personne n'ouvre sa salle :
--    sinon son XP et ses ratures ne tombent jamais.
-- Rien n'est supprimé. Idempotent : se recolle sans effet.

CREATE INDEX IF NOT EXISTS salle_sessions_ouvertes ON public.salle_sessions (fin_at) WHERE statut <> 'terminee';

-- SKIP LOCKED : deux battements en même temps ne s'attendent pas, le suivant repassera.
CREATE OR REPLACE FUNCTION public._salle_passer_admin(p_salle uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_admin uuid;
  v_suivant uuid;
BEGIN
  -- le cas courant : l'admin est là, aucun verrou
  IF EXISTS (
    SELECT 1 FROM salles s
    JOIN salle_membres m ON m.salle_id = s.id AND m.user_id = s.admin_id
    WHERE s.id = p_salle AND m.vu_le > v_now - interval '2 minutes'
  ) THEN
    RETURN;
  END IF;

  SELECT admin_id INTO v_admin FROM salles WHERE id = p_salle FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM salle_membres WHERE salle_id = p_salle AND user_id = v_admin AND vu_le > v_now - interval '2 minutes') THEN
    RETURN;
  END IF;

  SELECT user_id INTO v_suivant
  FROM salle_membres
  WHERE salle_id = p_salle AND user_id <> v_admin AND vu_le > v_now - interval '90 seconds'
  ORDER BY rejoint_le, user_id
  LIMIT 1;
  IF v_suivant IS NULL THEN
    RETURN;
  END IF;

  UPDATE salle_membres SET role = 'membre' WHERE salle_id = p_salle AND user_id = v_admin;
  UPDATE salle_membres SET role = 'admin' WHERE salle_id = p_salle AND user_id = v_suivant;
  UPDATE salles SET admin_id = v_suivant WHERE id = p_salle;
END;
$$;

REVOKE ALL ON FUNCTION public._salle_passer_admin(uuid) FROM PUBLIC, anon, authenticated;

-- En partant, on sort des présents tout de suite (90 s en arrière), sans perdre l'admin avant 30 s.
CREATE OR REPLACE FUNCTION public.salle_presence(p_salle_id uuid, p_parti boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE salle_membres
  SET vu_le = CASE WHEN p_parti THEN v_now - interval '90 seconds' ELSE v_now END
  WHERE salle_id = p_salle_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RETURN '[]'::json;
  END IF;

  IF NOT p_parti THEN
    BEGIN
      PERFORM _salle_passer_admin(p_salle_id);
      UPDATE salle_sessions
      SET statut = 'terminee', terminee_at = coalesce(terminee_at, fin_at)
      WHERE statut <> 'terminee' AND fin_at <= v_now;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'présence en salle : %', SQLERRM;
    END;
  END IF;

  SELECT coalesce(json_agg(m.user_id), '[]'::json)
  INTO v_res
  FROM salle_membres m
  WHERE m.salle_id = p_salle_id AND m.vu_le > v_now - interval '90 seconds';
  RETURN v_res;
END;
$$;

CREATE OR REPLACE FUNCTION public._salle_classement(p_salle uuid, p_session uuid, p_fermees integer)
RETURNS TABLE(rang integer, user_id uuid, username text, avatar_url text, points integer, bonnes integer, repondues integer, temps_ms bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (rank() OVER (ORDER BY b.points DESC, b.bonnes DESC, b.temps_ms ASC))::int,
         b.user_id, b.username, b.avatar_url, b.points, b.bonnes, b.repondues, b.temps_ms
  FROM (
    SELECT m.user_id,
           p.username,
           p.avatar_url,
           coalesce(sc.points, 0) AS points,
           coalesce(sc.bonnes, 0) AS bonnes,
           coalesce(sc.repondues, 0) AS repondues,
           coalesce(sc.temps_ms, 0)::bigint AS temps_ms
    FROM salle_membres m
    JOIN profiles p ON p.id = m.user_id
    LEFT JOIN _salle_scores(p_session, p_fermees) sc ON sc.user_id = m.user_id
    WHERE m.salle_id = p_salle
      AND (sc.user_id IS NOT NULL OR m.vu_le > now() - interval '90 seconds')
  ) b;
$$;

DO $m$
DECLARE
  d text := pg_get_functiondef('public.quitter_salle(uuid)'::regprocedure);
  n text;
BEGIN
  IF position('IS TRUE DESC' IN d) = 0 THEN
    n := replace(d, $a$ORDER BY rejoint_le, user_id$a$, $a$ORDER BY (vu_le > clock_timestamp() - interval '90 seconds') IS TRUE DESC, rejoint_le, user_id$a$);
    IF n = d THEN RAISE EXCEPTION 'quitter_salle : ordre introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;

DO $m$
DECLARE
  d text := pg_get_functiondef('public.rendre_copie(uuid)'::regprocedure);
  n text;
BEGIN
  IF position('d2.user_id = m.user_id' IN d) = 0 THEN
    n := replace(d, $a$SELECT count(*)::int INTO v_membres FROM salle_membres WHERE salle_id = v_ses.salle_id;$a$,
$a$SELECT count(*)::int INTO v_membres
  FROM salle_membres m
  WHERE m.salle_id = v_ses.salle_id
    AND (m.vu_le > v_now - interval '90 seconds'
         OR EXISTS (SELECT 1 FROM salle_rendus d2 WHERE d2.session_id = p_session_id AND d2.user_id = m.user_id));$a$);
    IF n = d THEN RAISE EXCEPTION 'rendre_copie : compte des membres introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;

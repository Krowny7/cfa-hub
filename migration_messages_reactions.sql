-- Réactions sur les messages entre amis (2026-11-10) : chaque joueur de la conversation peut
-- poser un émoji (parmi 5) sur un message ; le même émoji une seconde fois le retire.
-- reactions = { "<user_id>": "👍" }. Écrit seulement par reagir_message (les droits d'UPDATE
-- du navigateur restent limités à lu_le). Idempotente.

ALTER TABLE public.messages_amis ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.reagir_message(p_id uuid, p_emoji text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
DECLARE
  v_uid uuid := auth.uid();
  v jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_emoji IS NOT NULL AND p_emoji NOT IN ('👍', '❤️', '🔥', '😮', '😂') THEN
    RAISE EXCEPTION 'émoji inconnu';
  END IF;
  UPDATE messages_amis
  SET reactions = CASE
    WHEN p_emoji IS NULL OR reactions ->> v_uid::text = p_emoji THEN reactions - v_uid::text
    ELSE reactions || jsonb_build_object(v_uid::text, p_emoji)
  END
  WHERE id = p_id AND v_uid IN (de, a)
  RETURNING reactions INTO v;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'message introuvable';
  END IF;
  RETURN v;
END $f$;
REVOKE ALL ON FUNCTION public.reagir_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reagir_message(uuid, text) TO authenticated;

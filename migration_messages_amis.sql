-- Messages entre amis (2026-11-09) : une conversation par paire d'amis, lue en bas à droite
-- du site (components/messages/MessagesAmis.tsx). Idempotente.
-- On n'écrit qu'à un ami accepté (friendships.status = 'accepted') ; on ne lit que ses
-- propres conversations ; le destinataire ne peut changer que lu_le (marquer comme lu).
-- La table entre dans la publication Realtime : chacun reçoit ses messages en direct,
-- filtrés par les mêmes droits (RLS).

CREATE TABLE IF NOT EXISTS public.messages_amis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  de uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  texte text NOT NULL,
  cree timestamptz NOT NULL DEFAULT now(),
  lu_le timestamptz,
  CHECK (de <> a)
);

-- la longueur réelle (espaces compris), et pas de message vide
ALTER TABLE public.messages_amis DROP CONSTRAINT IF EXISTS messages_amis_texte_check;
ALTER TABLE public.messages_amis ADD CONSTRAINT messages_amis_texte_check CHECK (char_length(texte) <= 500 AND btrim(texte) <> '');

CREATE INDEX IF NOT EXISTS messages_amis_a_idx ON public.messages_amis (a, cree DESC);
CREATE INDEX IF NOT EXISTS messages_amis_de_idx ON public.messages_amis (de, a, cree DESC);

ALTER TABLE public.messages_amis ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.messages_amis FROM anon, authenticated;
GRANT SELECT ON public.messages_amis TO authenticated;
GRANT INSERT (a, texte) ON public.messages_amis TO authenticated;
GRANT UPDATE (lu_le) ON public.messages_amis TO authenticated;

DROP POLICY IF EXISTS messages_amis_lire ON public.messages_amis;
CREATE POLICY messages_amis_lire ON public.messages_amis FOR SELECT TO authenticated
  USING (auth.uid() = de OR auth.uid() = a);

DROP POLICY IF EXISTS messages_amis_ecrire ON public.messages_amis;
CREATE POLICY messages_amis_ecrire ON public.messages_amis FOR INSERT TO authenticated
  WITH CHECK (
    de = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester = auth.uid() AND f.addressee = a) OR (f.addressee = auth.uid() AND f.requester = a))
    )
  );

DROP POLICY IF EXISTS messages_amis_marquer_lu ON public.messages_amis;
CREATE POLICY messages_amis_marquer_lu ON public.messages_amis FOR UPDATE TO authenticated
  USING (a = auth.uid()) WITH CHECK (a = auth.uid());

-- pas plus de 20 messages par minute et par joueur
CREATE OR REPLACE FUNCTION public._messages_amis_debit() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $f$
BEGIN
  IF (SELECT count(*) FROM public.messages_amis WHERE de = NEW.de AND cree > now() - interval '1 minute') >= 20 THEN
    RAISE EXCEPTION 'trop de messages, attends un instant' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS messages_amis_debit ON public.messages_amis;
CREATE TRIGGER messages_amis_debit BEFORE INSERT ON public.messages_amis
  FOR EACH ROW EXECUTE FUNCTION public._messages_amis_debit();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages_amis'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages_amis;
  END IF;
END $$;

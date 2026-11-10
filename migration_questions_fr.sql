-- Questions en français (2026-11-10) : une traduction de l'énoncé et des choix, à côté de
-- l'anglais (qui reste la version de référence, règle « énoncés et choix en anglais »). Le bouton
-- « En français » de l'entraînement ciblé la lit (components/session/EnFrancais.tsx).
-- Remplie d'abord pour la moitié des questions d'Ethics (traduction par IA, termes d'examen
-- gardés en anglais). Les colonnes sont lisibles comme l'énoncé (droits par colonne). Idempotente.

ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS prompt_fr text;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS choices_fr text[];

GRANT SELECT (prompt_fr, choices_fr) ON public.quiz_questions TO anon, authenticated;

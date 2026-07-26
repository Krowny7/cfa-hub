-- Rend la fenêtre de passage (±N jours autour de scheduled_at) configurable
-- par examen au lieu d'une constante fixe à 3 jours codée en dur dans
-- l'app — pratique pour un examen comme "weekend du 15 août" qui veut
-- ±5 jours plutôt que ±3.

ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS window_days int NOT NULL DEFAULT 3;

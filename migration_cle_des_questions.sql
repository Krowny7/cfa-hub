-- La clé des questions ne se lit plus depuis le navigateur.
--
-- À appliquer APRÈS le déploiement du code qui n'en a plus besoin (le mode
-- examen corrige par corriger_questions, l'éditeur de QCM lit par
-- questions_a_editer, la session du jour par award_quiz_question_xp : voir
-- migration_corrections_serveur.sql). Avant, ces pages casseraient.
--
-- Le trou : tout compte connecté lisait correct_index et explanation dans la
-- table, y compris pour un examen blanc en cours, d'une seule requête. Les
-- fonctions SECURITY DEFINER (corrections, ratures, salles, duels) lisent
-- toujours la table en tant que propriétaire et ne changent pas.
--
-- Piège pour la suite : une nouvelle colonne de quiz_questions n'est lisible
-- par le site qu'une fois ajoutée au GRANT ci-dessous. Et jamais de
-- select("*") sur quiz_questions côté client : il échoue désormais.
--
-- Rejouable.

REVOKE SELECT ON public.quiz_questions FROM anon, authenticated;

GRANT SELECT (id, set_id, prompt, choices, "position", created_at, topic_id, notion, concept, calcul)
  ON public.quiz_questions TO anon, authenticated;

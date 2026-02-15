export const SUPABASE_CONTRACT = {
  tables: [
    "profiles",
    "study_groups",
    "group_memberships",
    "library_folders",
    "documents",
    "document_shares",
    "content_translations",
    "flashcard_sets",
    "flashcards",
    "flashcard_set_shares",
    "quiz_sets",
    "quiz_questions",
    "quiz_set_shares",
    "exercise_sets",
    "exercises",
    "exercise_set_shares",
    // XP / levels
    "xp_events",
    // PvP
    "ratings",
    "pvp_challenges",
    "pvp_attempts",
    "pvp_rating_events"
  ],
  columnChecks: [
    { table: "documents", columns: ["id", "owner_id", "visibility", "folder_id"] },
    { table: "quiz_sets", columns: ["id", "owner_id", "visibility"] },
    { table: "flashcard_sets", columns: ["id", "owner_id", "visibility"] },
    { table: "exercise_sets", columns: ["id", "owner_id", "visibility"] }
  ],
  rpcs: [
    "is_app_admin",
    "is_user_app_admin",
    "create_group",
    "join_group",
    "get_xp_daily",
    "get_xp_daily_for_user",
    "award_quiz_question_xp",
    "upsert_content_translation",
    "pvp_create_challenge",
    "pvp_accept_challenge",
    "pvp_get_challenge_detail",
    "pvp_submit_attempt"
  ]
} as const;

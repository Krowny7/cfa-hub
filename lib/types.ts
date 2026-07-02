export type Visibility = "private" | "group" | "groups" | "public";

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  active_group_id: string | null;
  xp_total: number;
};

export type StudyGroup = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
};

export type GroupMembership = {
  user_id: string;
  group_id: string;
};

export type LibraryFolder = {
  id: string;
  name: string;
  kind: "documents" | "flashcards" | "quizzes";
  owner_id: string;
};

export type Document = {
  id: string;
  title: string;
  external_url: string;
  preview_url: string | null;
  visibility: Visibility;
  owner_id: string;
  group_id: string | null;
  folder_id: string | null;
};

export type FlashcardSet = {
  id: string;
  title: string;
  visibility: Visibility;
  owner_id: string;
  group_id: string | null;
  folder_id: string | null;
};

export type Flashcard = {
  id: string;
  set_id: string;
  front: string;
  back: string;
  position: number;
};

export type QuizSet = {
  id: string;
  title: string;
  visibility: Visibility;
  owner_id: string;
  group_id: string | null;
  folder_id: string | null;
  is_official: boolean;
  official_published: boolean;
  difficulty: 1 | 2 | 3 | null;
  published_at: string | null;
};

export type QuizQuestion = {
  id: string;
  set_id: string;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  position: number;
};

export type Rating = {
  user_id: string;
  elo: number;
  games_played: number;
};

export type XpEvent = {
  id: string;
  user_id: string;
  occurred_at: string;
  xp: number;
  source: string;
  meta: Record<string, unknown> | null;
};

export type AwardXpResult = {
  is_correct: boolean;
  xp_awarded: number;
  xp_total: number;
};

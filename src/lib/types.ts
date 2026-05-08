export type Difficulty = "easy" | "medium" | "hard";

export type Subject = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  note_count: number | null;
  created_at: string;
};

export type Tag = {
  id: string;
  note_id: string;
  label: string;
};

export type Revision = {
  id: string;
  note_id: string;
  user_id: string;
  score: number;
  status: string | null;
  revised_at: string;
};

export type Note = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  summary: string;
  key_points: string[] | null;
  revision_questions: string[] | null;
  difficulty: Difficulty;
  diagram_needed: boolean | null;
  diagram_description: string | null;
  source: string | null;
  is_manual: boolean | null;
  position: number | null;
  created_at: string;
  updated_at: string | null;
  subjects?: Subject | null;
  tags?: Tag[];
  revisions?: Revision[];
};

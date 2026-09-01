export type SeniorHighOption = {
  letter: string;
  text: string;
};

export type SeniorHighItem = {
  id: string;
  title: string;
  category: string;
  content_scope: "knowledge_only" | "type_practice_only" | "paper_only";
  active: boolean;
  review_status: "approved" | "review_required";
  question_number: number;
  display_number?: number;
  source_question_number?: number;
  stem: string;
  passage?: string;
  group_id?: string;
  group_title?: string;
  options: SeniorHighOption[];
  answer: string;
  analysis: string;
  source_file: string;
  source_relpath: string;
  source_sha256: string;
  source_section?: string;
  knowledge_topic?: string;
  source_line_start?: number;
  source_line_end?: number;
  year: string;
  region: string;
  paper: string;
};

export type SeniorHighPaper = {
  id: string;
  title: string;
  year: string;
  region: string;
  paper: string;
  source_file: string;
  source_relpath: string;
  source_sha256: string;
  source_alternates: string[];
  question_count: number;
  expected_question_count: number;
  answered_count: number;
  analyzed_count: number;
  review_status: "approved" | "review_required";
  questions: SeniorHighItem[];
};

export type SeniorHighCatalog = {
  version: number;
  generated_at: string;
  source_root: string;
  paper_review_count: number;
  knowledge: SeniorHighItem[];
  practice: SeniorHighItem[];
  papers: SeniorHighPaper[];
};

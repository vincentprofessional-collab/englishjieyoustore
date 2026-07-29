import speakingQuestionData from "@/data/ielts/speaking-questions.json";

export type SpeakingPartId = "part-1" | "part-2" | "part-3";

export type SpeakingQuestion = {
  followUp: string;
  id: string;
  question: string;
  scene: string;
  translation: string;
  year: string;
};

export type SpeakingPart = {
  count: number;
  description: string;
  id: SpeakingPartId;
  label: string;
  questions: SpeakingQuestion[];
  sceneCount: number;
  timing: string;
};

export type SpeakingQuestionGroup = {
  questions: SpeakingQuestion[];
  scene: string;
};

const questionData = speakingQuestionData as Record<SpeakingPartId, SpeakingQuestion[]>;

const speakingPartDefinitions: Array<Omit<SpeakingPart, "count" | "questions" | "sceneCount">> = [
  {
    description: "个人信息、生活习惯与熟悉话题的短回答。",
    id: "part-1",
    label: "Part 1",
    timing: "短回答 · 约 20–30 秒",
  },
  {
    description: "围绕人物、地点、物品与经历进行个人陈述。",
    id: "part-2",
    label: "Part 2",
    timing: "个人陈述 · 约 2 分钟",
  },
  {
    description: "从社会、教育、科技等角度展开观点讨论。",
    id: "part-3",
    label: "Part 3",
    timing: "观点讨论 · 约 40–60 秒",
  },
];

function countScenes(questions: SpeakingQuestion[]) {
  return new Set(questions.map((question) => question.scene)).size;
}

export const speakingParts: SpeakingPart[] = speakingPartDefinitions.map((part) => {
  const questions = questionData[part.id];

  return {
    ...part,
    count: questions.length,
    questions,
    sceneCount: countScenes(questions),
  };
});

export function getSpeakingPart(partId: string) {
  return speakingParts.find((part) => part.id === partId);
}

export function groupSpeakingQuestions(questions: SpeakingQuestion[]) {
  const groups = new Map<string, SpeakingQuestion[]>();

  for (const question of questions) {
    const currentQuestions = groups.get(question.scene) ?? [];
    currentQuestions.push(question);
    groups.set(question.scene, currentQuestions);
  }

  return Array.from(groups, ([scene, groupedQuestions]) => ({
    questions: groupedQuestions,
    scene,
  }));
}

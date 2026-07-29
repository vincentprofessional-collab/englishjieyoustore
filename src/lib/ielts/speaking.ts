export type SpeakingScoreNote = {
  code: "FC" | "LR" | "GRA" | "P";
  description: string;
  label: string;
};

export type SpeakingVocabulary = {
  meaning: string;
  note: string;
  phrase: string;
};

export type SpeakingArchiveItem = {
  category: string;
  title: string;
  year: string;
};

export type SpeakingPart = {
  approach: string;
  archive: SpeakingArchiveItem[];
  answer: string[];
  category: string;
  count: number;
  frames: string[];
  id: "part-1" | "part-2" | "part-3";
  label: string;
  prompts: string[];
  scoreNotes: SpeakingScoreNote[];
  season: string;
  targetLength: string;
  timing: string;
  title: string;
  titleZh: string;
  vocabulary: SpeakingVocabulary[];
};

export const speakingParts: SpeakingPart[] = [
  {
    approach:
      "先直接回答，再加入三个真实的晨间动作，最后说明清晨为什么能改善当天的状态。Part 1 不需要长篇论证，重点是自然、具体、有个人感。",
    archive: [
      { category: "个人信息", title: "Work or Study", year: "必考" },
      { category: "个人信息", title: "Hometown", year: "必考" },
      { category: "社交", title: "Social media", year: "2026 / 5–8" },
      { category: "自然", title: "Outer Space & Stars", year: "2026 / 5–8" },
    ],
    answer: [
      "I’m not naturally an early riser, but I’ve grown to enjoy quiet mornings. My daily routine is simple: I open the curtains, drink some water and spend about ten minutes planning my day. A cup of coffee usually kick-starts my morning and perks me up. What I like most is that nobody is messaging me yet, so I can think clearly before the day becomes busy.",
    ],
    category: "日常习惯",
    count: 71,
    frames: [
      "I’m not naturally an early riser, but I’ve grown to enjoy …",
      "My daily routine is fairly simple: …",
      "What I like most about the morning is that …",
      "It sets the tone for the rest of my day.",
    ],
    id: "part-1",
    label: "Part 1",
    prompts: [
      "Do you like getting up early?",
      "What do you usually do in the morning?",
      "Is breakfast important to you?",
    ],
    scoreNotes: [
      {
        code: "FC",
        description: "表态、细节和感受依次展开，答案短但完整。",
        label: "流利与连贯",
      },
      {
        code: "LR",
        description: "三个晨间搭配都放在真实语境里，没有生硬堆词。",
        label: "词汇资源",
      },
      {
        code: "GRA",
        description: "自然使用 but、that 和 so 串联简单句与复杂句。",
        label: "语法范围与准确性",
      },
      {
        code: "P",
        description: "重读 quiet mornings、daily routine 和 think clearly。",
        label: "发音",
      },
    ],
    season: "2026 / 5–8",
    targetLength: "45–80 词",
    timing: "短回答 · 约 20–30 秒",
    title: "Morning time",
    titleZh: "你喜欢早晨时光吗？早晨通常做什么？",
    vocabulary: [
      {
        meaning: "日常作息",
        note: "用来引出固定但不复杂的晨间安排。",
        phrase: "daily routine",
      },
      {
        meaning: "开启我的早晨",
        note: "自然描述咖啡、早餐或运动带来的启动感。",
        phrase: "kick-start my morning",
      },
      {
        meaning: "让我精神起来",
        note: "比 make me energetic 更口语、更地道。",
        phrase: "perk me up",
      },
    ],
  },
  {
    approach:
      "选择身边能讲出细节的人，按照“创业起点—早期困难—关键调整—你欣赏的品质—个人启发”推进。成功要用可观察的变化证明，而不是反复说 successful。",
    archive: [
      {
        category: "物品",
        title: "Describe a gift you received that was special",
        year: "2020–2026",
      },
      {
        category: "地点",
        title: "Describe a place you visited that was beautiful",
        year: "2020–2026",
      },
      {
        category: "经历",
        title: "Describe a time when you helped someone",
        year: "2020–2026",
      },
      {
        category: "学习",
        title: "Describe a subject you enjoyed at school",
        year: "2020–2026",
      },
    ],
    answer: [
      "The person I’d like to talk about is my aunt, who runs a small neighbourhood bakery in Suzhou. She set up the business about six years ago after leaving a stable office job. At first, she did nearly everything herself, from testing recipes to replying to customer messages, because she needed to keep her overhead costs low.",
      "The first year was a rough ride. The shop was on a quiet street, so there wasn’t much passing trade. The turning point came when she began posting short videos showing how the bread was made. People could see the fresh ingredients and the care behind each loaf. Gradually, she built a loyal customer base. She later introduced online pre-orders, which reduced waste and helped her adapt to changing demand.",
      "What impresses me most is not simply that the bakery makes money, but that she has earned people’s trust. She listens to customers without blindly following every trend, treats her staff fairly and still helps in the kitchen when it gets busy. To me, that shows real business acumen. Watching her has taught me that success rarely comes from one brilliant idea; it usually grows out of consistency, good judgement and years of hard work.",
    ],
    category: "人物",
    count: 227,
    frames: [
      "The person I’d like to talk about is …, who runs …",
      "She set up the business after …",
      "The real turning point came when …",
      "What impresses me most is not simply …, but …",
      "She has shown me that a successful business is built on …",
    ],
    id: "part-2",
    label: "Part 2",
    prompts: [
      "who this person is",
      "what kind of business they run",
      "what difficulties they faced",
      "and explain why you think the business is successful",
    ],
    scoreNotes: [
      {
        code: "FC",
        description: "时间线清楚，并用 turning point 推动故事发展。",
        label: "流利与连贯",
      },
      {
        code: "LR",
        description: "商业搭配具体且准确，每个词都服务于人物故事。",
        label: "词汇资源",
      },
      {
        code: "GRA",
        description: "定语从句、原因从句和 not … but … 交替使用。",
        label: "语法范围与准确性",
      },
      {
        code: "P",
        description: "按意群停顿，突出 turning point、trust 和 business acumen。",
        label: "发音",
      },
    ],
    season: "2026 / 5–8",
    targetLength: "180–230 词",
    timing: "个人陈述 · 约 2 分钟",
    title: "Describe a person who runs a successful business",
    titleZh: "描述一位经营成功企业的人。",
    vocabulary: [
      {
        meaning: "创办企业",
        note: "比单独使用 open 更准确地表达从零创办。",
        phrase: "set up a business",
      },
      {
        meaning: "控制运营成本",
        note: "解释创业初期为什么需要亲力亲为。",
        phrase: "keep overhead costs low",
      },
      {
        meaning: "建立忠实客户群",
        note: "用可观察的结果证明经营成功。",
        phrase: "build a loyal customer base",
      },
      {
        meaning: "适应不断变化的需求",
        note: "体现经营者根据市场反馈及时调整。",
        phrase: "adapt to changing demand",
      },
      {
        meaning: "商业敏锐度",
        note: "适合评价人物能力，整段使用一次即可。",
        phrase: "business acumen",
      },
    ],
  },
  {
    approach:
      "给出有限度立场：AI 更可能替代具体任务，而不是一次性替代整个职业。区分重复性工作与需要同理心、责任和情境判断的工作，最后提出岗位重构与再培训。",
    archive: [
      {
        category: "人物",
        title: "What qualities make a good teacher?",
        year: "2020–2026",
      },
      {
        category: "城市",
        title: "How can cities become more livable?",
        year: "2020–2026",
      },
      {
        category: "教育",
        title: "How has online learning changed education?",
        year: "2020–2026",
      },
      {
        category: "思辨",
        title: "Is competition always a good thing?",
        year: "2020–2026",
      },
    ],
    answer: [
      "I think AI is more likely to replace specific tasks than entire professions. Repetitive work such as basic data entry and standard customer enquiries is at high risk of automation because it follows predictable rules. However, jobs that depend on empathy, physical skill or context-sensitive judgement will be much harder to automate. A nurse, for example, does far more than process medical information; the role also involves reassurance, observation and responsibility. That said, even these professions will probably change, with technology handling paperwork or supporting decisions. So the real challenge is not simply how many jobs disappear, but whether governments and employers can retrain people quickly enough for the new roles being created.",
    ],
    category: "AI 与未来工作",
    count: 49,
    frames: [
      "I think AI is more likely to replace specific tasks than entire professions.",
      "Jobs that involve … are particularly vulnerable because …",
      "By contrast, roles that require … will be harder to automate.",
      "That said, even these professions will probably be reshaped by AI.",
      "The real challenge is not …, but whether …",
    ],
    id: "part-3",
    label: "Part 3",
    prompts: [
      "Which jobs are most likely to be affected by AI?",
      "What human abilities are difficult for machines to replace?",
      "Who should help workers adapt to automation?",
    ],
    scoreNotes: [
      {
        code: "FC",
        description: "立场、原因、对比、例证和总结构成完整论证链。",
        label: "流利与连贯",
      },
      {
        code: "LR",
        description: "automation、repetitive work 和 empathy 紧扣题目。",
        label: "词汇资源",
      },
      {
        code: "GRA",
        description: "自然运用 than、that、with 和 whether 形成复杂句。",
        label: "语法范围与准确性",
      },
      {
        code: "P",
        description: "对比重读 repetitive work 与 empathy，结论处适当降调。",
        label: "发音",
      },
    ],
    season: "2020–2026",
    targetLength: "110–160 词",
    timing: "观点讨论 · 约 40–60 秒",
    title: "Will AI replace human jobs?",
    titleZh: "人工智能会取代人类工作吗？",
    vocabulary: [
      {
        meaning: "重复性工作",
        note: "具体指出最容易被技术接管的任务类型。",
        phrase: "repetitive work",
      },
      {
        meaning: "面临很高的自动化风险",
        note: "比 will disappear 更克制，也更符合讨论题语气。",
        phrase: "be at high risk of automation",
      },
      {
        meaning: "自动化",
        note: "主题核心词，注意重音在第三音节附近。",
        phrase: "automation",
      },
      {
        meaning: "同理心",
        note: "用来解释医疗、教育等职业的不可替代性。",
        phrase: "empathy",
      },
    ],
  },
];

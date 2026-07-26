export type Task2EssayType =
  | "opinion"
  | "discussion"
  | "advantages"
  | "causes-solutions"
  | "two-part";

export type Task2ParagraphPlan = {
  heading: string;
  role: string;
  points: string[];
};

export type Task2LogicStep = {
  label: string;
  contentCn: string;
  languageFocus: string;
};

export type Task2VocabularyItem = {
  term: string;
  meaningCn: string;
  useCase: string;
};

export type Task2ModelEssay = {
  categoryCn: string;
  examinerNote?: string;
  essay: string[];
  id: string;
  logicSteps: Task2LogicStep[];
  paragraphPlan: Task2ParagraphPlan[];
  positionCn: string;
  prompt: string;
  shortTitleCn: string;
  source: string;
  taskType: Task2EssayType;
  thesisCn: string;
  tips: string[];
  vocabulary: Task2VocabularyItem[];
};

export const TASK2_TYPE_ORDER: Task2EssayType[] = [
  "opinion",
  "discussion",
  "advantages",
  "causes-solutions",
  "two-part",
];

export const TASK2_TYPE_LABELS: Record<Task2EssayType, { cn: string; en: string }> = {
  opinion: { cn: "观点类", en: "Opinion" },
  discussion: { cn: "双边讨论", en: "Discussion" },
  advantages: { cn: "利弊分析", en: "Advantages / Disadvantages" },
  "causes-solutions": { cn: "原因与解决", en: "Cause & Solution Essay" },
  "two-part": { cn: "两问型", en: "Two-Part Question" },
};

const source = "雅思大作文范文.docx";

export const TASK2_MODEL_ESSAYS: Task2ModelEssay[] = [
  {
    id: "task2-overweight-physical-education",
    source,
    taskType: "opinion",
    categoryCn: "健康与教育",
    shortTitleCn: "增加体育课能否解决肥胖问题",
    prompt:
      "The growing number of overweight people is putting a strain on the health care system in an effort to deal with the health issues involved. Some people think that the best way to deal with this problem is to introduce more physical education lessons in the school curriculum. To what extent do you agree or disagree?",
    positionCn: "部分同意：学校体育有长期价值，但不能单独解决肥胖问题，饮食干预也必须纳入。",
    thesisCn: "用让步式立场回答 agree/disagree：承认体育课有效，再指出更完整的解决方案是运动和饮食并行。",
    paragraphPlan: [
      {
        heading: "开头",
        role: "改写题目并直接表态",
        points: ["肥胖给医疗系统造成压力", "体育课是一种解决方式", "饮食同样关键"],
      },
      {
        heading: "主体段 1",
        role: "解释体育课的长期作用",
        points: ["培养运动习惯", "抵消久坐学习方式", "让学生毕业后继续保持活跃"],
      },
      {
        heading: "主体段 2",
        role: "指出体育课不足并补充饮食方案",
        points: ["儿童还需要学习健康饮食", "成年人肥胖需要更快的市场干预", "可对超加工食品征税并降低健康食品价格"],
      },
      {
        heading: "结尾",
        role: "重申综合方案",
        points: ["学校内解决运动与饮食教育", "市场层面改变食品价格"],
      },
    ],
    logicSteps: [
      {
        label: "让步",
        contentCn: "先承认体育课确实有用，避免绝对否定。",
        languageFocus: "I agree that this is one way to tackle the problem",
      },
      {
        label: "限制",
        contentCn: "指出该方案只能影响长期习惯，不能单独解决当前社会层面的肥胖。",
        languageFocus: "not effective enough on its own",
      },
      {
        label: "补充方案",
        contentCn: "从学校教育转到食品市场，用政策工具扩展论证。",
        languageFocus: "For a more immediate impact",
      },
    ],
    vocabulary: [
      { term: "putting a strain on", meaningCn: "给……造成压力", useCase: "问题背景" },
      { term: "tackle the problem", meaningCn: "处理问题", useCase: "解决方案类题目" },
      { term: "sedentary lifestyle", meaningCn: "久坐生活方式", useCase: "健康类高频表达" },
      { term: "take into consideration", meaningCn: "纳入考虑", useCase: "补充维度" },
      { term: "impose a tax on", meaningCn: "对……征税", useCase: "政府措施" },
    ],
    tips: [
      "观点类题目需要在开头给出稳定立场，结尾不能换观点。",
      "部分同意不是骑墙，必须清楚说明同意哪一部分、反对哪一部分。",
      "主体段要均衡展开，不能只写一个很长段落。",
    ],
    essay: [
      "Owing to the problems which a growing population of overweight people cause for the health care system, it is thought that the key to solving this issue is to have more sport and exercise in schools. I agree that this is one way to tackle the problem, but diet must also be taken into consideration.",
      "Increasing sport or regular exercise in schools is a useful way to tackle weight problems in the long run in the general population. This method will encourage a new generation to develop vital habits which support overall health and also help them maintain a reasonable weight. At the moment, the average child in the West does sport possibly twice a week, which is not enough to counteract their otherwise sedentary lifestyle that comes from many hours each day of sitting at a desk for their lessons. By incorporating more exercise time and possibly extracurricular physical activities, they will undoubtedly become fitter and more active, and continue living that way after leaving schools.",
      "However, targeting physical exercise in school children to reduce the current issue of obesity in the wider population is not effective enough on its own. Firstly, children in schools need to also be educated about what constitutes healthy foods and why in order to ensure a new generation of people who understand clean eating. Secondly, for a more immediate impact, it is important to look at reducing the number of Ultra processed foods (UPFs) on the market which too many people gravitate towards. For example, the government could impose a tax on UPFs to increase the price, and also reduce the cost of healthy foods, such as vegetables, to encourage a better diet.",
      "In conclusion, I believe the best approach to tackling weight issues in the population starts with diet and exercise in schools but must also include encouraging a healthier diet through price changes targeting specific foods on the market.",
    ],
  },
  {
    id: "task2-global-language",
    source,
    taskType: "advantages",
    categoryCn: "语言与全球化",
    shortTitleCn: "世界只有一种语言的利弊",
    prompt:
      "The development of tourism contributed to English becoming the most prominent language in the world. Some people think this will lead to English becoming the only language to be spoken globally. What are the advantages and disadvantages to having one language in the world?",
    positionCn: "利弊并列，但最终强调文化损失过大。",
    thesisCn: "先承认单一语言能促进理解和经济增长，再说明语言消失会削弱文化多样性和旅游吸引力。",
    paragraphPlan: [
      {
        heading: "开头",
        role: "交代趋势并预告利弊",
        points: ["英语可能压倒其他语言", "单一语言有好处", "也会产生明显缺点"],
      },
      {
        heading: "主体段 1",
        role: "写优势",
        points: ["国家之间理解更顺畅", "信息和思想流动更容易", "减少贸易壁垒并促进经济"],
      },
      {
        heading: "主体段 2",
        role: "写劣势",
        points: ["其他语言和文化会消失", "世界文化多样性下降", "旅游因同质化而受损"],
      },
      {
        heading: "结尾",
        role: "评价权重",
        points: ["单一语言有优势", "但保护本土语言和文化更重要"],
      },
    ],
    logicSteps: [
      {
        label: "双边铺陈",
        contentCn: "利弊题先明确两边都要讨论，避免只写一个方向。",
        languageFocus: "would certainly aid ... but there will also be ...",
      },
      {
        label: "因果链",
        contentCn: "同一种语言减少沟通障碍，从而促进贸易。",
        languageFocus: "there would be fewer barriers and therefore trade would flourish",
      },
      {
        label: "价值判断",
        contentCn: "结尾用文化遗产的价值完成权重判断。",
        languageFocus: "should be prioritised to ensure a rich world heritage",
      },
    ],
    vocabulary: [
      { term: "the most prominent language", meaningCn: "最突出的语言", useCase: "语言类背景" },
      { term: "aid understanding", meaningCn: "促进理解", useCase: "优势表达" },
      { term: "economic growth", meaningCn: "经济增长", useCase: "社会经济类" },
      { term: "drawbacks", meaningCn: "缺点", useCase: "利弊题替换 disadvantages" },
      { term: "world heritage", meaningCn: "世界遗产", useCase: "文化价值收束" },
    ],
    tips: [
      "Advantages/disadvantages 题目必须让两边段落清晰对称。",
      "结尾可以评价哪一边更重要，但不要引入新论点。",
      "不要把 language 误写成 communication technology，题目核心是语言同一化。",
    ],
    examinerNote:
      "原文附有考官评价：任务回应完整、观点充分展开、衔接自然、词汇范围广且语法复杂度较高。",
    essay: [
      "It is thought by some people that English, which is now the most widely spoken language in the world, may one day predominate over all other languages and result in their eventual disappearance. Having one language would certainly aid understanding and economic growth but there will also be some drawbacks.",
      "One evident benefit to having one global language is that it would enable greater understanding between countries. In other words, if everyone spoke one language, there would be complete understanding between not only countries but all people throughout the world which would promote learning, the flow of information and ideas. Another reason that one language would be advantageous is that it would help economic growth. With all people speaking the same language, there would be fewer barriers and therefore trade would flourish between countries, resulting in a healthier world economy.",
      "On the other hand, there are obvious downsides to having only one global language. Firstly, it would mean that all other languages would eventually disappear and, along with them, their cultures. The diversity of cultures is one of the joys this world has to offer. Each culture is unique with its own way of life and own perspectives of the world which would all be lost if there were only one language. Secondly, it would result in the collapse of tourism because there would be no reason to travel for pleasure and interest if all countries had the same language and similar cultures. This would devastate many countries economically that rely on tourism as a source of income.",
      "In conclusion, while there are plus points to having one global language, too much would be lost as a result. Maintaining local languages and cultures should be prioritised to ensure a rich world heritage for future generations.",
    ],
  },
  {
    id: "task2-repeat-offenders",
    source,
    taskType: "causes-solutions",
    categoryCn: "犯罪与法律",
    shortTitleCn: "罪犯为何再犯及如何解决",
    prompt:
      "Many offenders commit more crimes after serving their first punishment. Why is this happening, and what measures can be taken to tackle this problem?",
    positionCn: "原因：缺少改造和就业困难。措施：职业培训和释放后的监督。",
    thesisCn: "原因与措施一一对应，使文章结构清楚：为什么再犯，以及如何减少再犯。",
    paragraphPlan: [
      {
        heading: "开头",
        role: "直接回答两个问题",
        points: ["再犯现象普遍", "核心原因是缺少改造和就业困难", "需要实施解决方案"],
      },
      {
        heading: "主体段 1",
        role: "分析原因",
        points: ["监狱内没有再培训", "与其他罪犯混在一起强化犯罪意图", "释放后很难就业导致经济压力"],
      },
      {
        heading: "主体段 2",
        role: "提出措施",
        points: ["入狱者获得技能训练", "帮助重新融入社会", "出狱后加强监督和检查"],
      },
      {
        heading: "结尾",
        role: "概括原因和方案",
        points: ["教育训练和监管结合", "减少再次犯罪"],
      },
    ],
    logicSteps: [
      {
        label: "对应关系",
        contentCn: "原因段讲缺少技能和就业，解决段就用培训和监督回应。",
        languageFocus: "This is mainly because of ... There are a number of solutions ...",
      },
      {
        label: "解释机制",
        contentCn: "不是只列原因，而是说明缺少改造如何导致再犯。",
        languageFocus: "which only strengthens their criminal intentions",
      },
      {
        label: "结果导向",
        contentCn: "解决方案要说明预期效果。",
        languageFocus: "would hopefully prevent them from taking any chances",
      },
    ],
    vocabulary: [
      { term: "reoffend", meaningCn: "再次犯罪", useCase: "犯罪类核心词" },
      { term: "rehabilitation", meaningCn: "改造；康复", useCase: "监狱制度" },
      { term: "regular employment", meaningCn: "稳定工作", useCase: "社会融入" },
      { term: "reintegrate back into society", meaningCn: "重新融入社会", useCase: "解决方案" },
      { term: "deter them from reoffending", meaningCn: "阻止他们再次犯罪", useCase: "结果表达" },
    ],
    tips: [
      "原因解决类题目不要只写原因或只写方案，两个问题都要答。",
      "方案要和原因对应，否则逻辑会松散。",
      "每个主体段内部也要有顺序：观点、解释、结果。",
    ],
    essay: [
      "A large number of criminals who serve their first prison sentence, leave prison only to reoffend. This is mainly because of the lack of rehabilitation and difficulty finding regular employment once released. There are a number of solutions which should be implemented to deal with criminals who reoffend.",
      "Firstly, the reason for most first-time offenders committing crimes again, once they have been released from prison, is due to the lack of rehabilitation whilst in prison. In other words, offenders are not given a chance to retrain and learn new skills for their future or develop a deeper understanding of correct moral behaviour and instead mix with other criminals, which only strengthens their criminal intentions. Secondly, repeat offending is also owing to the difficulty in finding employment after being released. As a result, many of them struggle financially which leads them back to crime, regardless of the consequences.",
      "There are two effective solutions to the problem of repeat offenders. One way to tackle this is to ensure that all criminals entering prison are given the chance to retrain with useful skills which will hopefully ensure them a job after they have served their sentence. By doing this, it will help them reintegrate back into society and give them some means of supporting themselves financially. Another method of dealing with criminals who reoffend is to have more supervision and checks in place when they are back in society. This solution would hopefully prevent them from taking any chances and deter them from reoffending because they are being so closely watched.",
      "In conclusion, regardless of the reasons for reoffending, having skills training and education in prison as well as closer observation for newly released offenders can be effective in preventing criminals from committing crimes again.",
    ],
  },
  {
    id: "task2-money-happiness",
    source,
    taskType: "two-part",
    categoryCn: "社会生活",
    shortTitleCn: "没有很多钱能否幸福",
    prompt:
      "Some people think that money is one of the most essential factors in promoting happiness. Do you think people can be happy without much money? What other factors contribute towards happiness?",
    positionCn: "可以。金钱不是幸福的必要条件，工作满足感和亲密关系也能创造幸福。",
    thesisCn: "两问型先明确回答第一问，再列出其他因素，主体段逐一展开。",
    paragraphPlan: [
      {
        heading: "开头",
        role: "回应两个问题",
        points: ["承认很多人重视金钱", "说明少钱也可以幸福", "引出其他幸福来源"],
      },
      {
        heading: "主体段 1",
        role: "回答没有很多钱能否幸福",
        points: ["金钱带来短暂享受", "金钱不能保证幸福", "满足基本需求后奢侈品并非必需"],
      },
      {
        heading: "主体段 2",
        role: "其他因素 1",
        points: ["工作本身带来成就感", "志愿医生例子", "长期满足感来自有意义的经历"],
      },
      {
        heading: "主体段 3",
        role: "其他因素 2",
        points: ["支持性的家人朋友", "快乐不适合孤立享受", "亲密关系不能用钱买到"],
      },
    ],
    logicSteps: [
      {
        label: "拆题",
        contentCn: "题目有两个问号，文章必须分别回应。",
        languageFocus: "it is possible ... and other aspects ...",
      },
      {
        label: "反驳绝对化",
        contentCn: "把 money is essential 改成 money may help but is not essential。",
        languageFocus: "money is no guarantee of happiness",
      },
      {
        label: "递进",
        contentCn: "从物质需要递进到工作意义，再到人际关系。",
        languageFocus: "Another way ... Finally, another influencing factor ...",
      },
    ],
    vocabulary: [
      { term: "contributing factors", meaningCn: "促成因素", useCase: "原因/因素类题" },
      { term: "temporary enjoyment", meaningCn: "短暂快乐", useCase: "让步表达" },
      { term: "necessities", meaningCn: "生活必需品", useCase: "金钱类题目" },
      { term: "long-term fulfilment", meaningCn: "长期满足感", useCase: "幸福与工作" },
      { term: "in isolation", meaningCn: "孤立地；独自地", useCase: "人际关系论证" },
    ],
    tips: [
      "两问型最常见失分点是漏答一问。",
      "每个问题不一定平均分配段落，但必须在结构上可见。",
      "结尾只总结已论证内容，不新增第三个幸福因素。",
    ],
    essay: [
      "Money is considered by many people to be one of the most important contributing factors towards happiness. In my opinion, it is possible for people to be happy even if they have little money and other aspects of life can play a more vital role in creating happiness than wealth alone.",
      "Although money allows people to afford luxuries and treats, which certainly do bring temporary enjoyment and satisfaction, a substantial number of people are happy without money. Firstly, money is no guarantee of happiness, particularly if disease or disaster feature largely in someone’s life. Secondly, as long as people have the money to cover their necessities, doing without luxury items does not negatively affect the pleasures that a good life can bring.",
      "Another way people can gain satisfaction in their life is through their work rather than money. For instance, a doctor doing volunteer service overseas in underdeveloped countries may earn little or no money, but the reward of doing such work is profoundly rewarding. Not only that but it can be a long-term fulfilment that they carry with them through life in the form of rich memories and the knowledge of a life well-lived.",
      "Finally, another influencing factor of contentment in life is having supportive and loving people in one’s life. While money may bring opportunities to enjoy pleasures, few people would enjoy them in isolation. Being surrounded by a loving and caring family is considered by many people to be the most valuable thing in life. This is one aspect of life that money certainly cannot buy.",
      "In conclusion, money is not essential for happiness, which can be found through job satisfaction as well as family. If more people strived in life towards true happiness rather than money, the world would be a better place.",
    ],
  },
  {
    id: "task2-social-networking-sites",
    source,
    taskType: "opinion",
    categoryCn: "媒体与互联网",
    shortTitleCn: "社交网站对个人和社会的影响",
    prompt:
      "Many people believe that social networking sites (such as Facebook) have had a huge negative impact on both individuals and society. To what extent do you agree?",
    positionCn: "部分同意：对个人主要有益，但对本地社区和社会关系有负面影响。",
    thesisCn: "题目同时包含 individuals 和 society，范文用分对象讨论保持任务回应完整。",
    paragraphPlan: [
      {
        heading: "开头",
        role: "提出分对象立场",
        points: ["社交网站被认为有害", "个人层面有好处", "社区层面有伤害"],
      },
      {
        heading: "主体段 1",
        role: "个人层面优势",
        points: ["跨国交流机会增加", "接触共同兴趣群体", "突破原有社交圈"],
      },
      {
        heading: "主体段 2",
        role: "社会层面劣势",
        points: ["减少本地社区参与", "本地关系弱化", "社会变得碎片化"],
      },
      {
        heading: "结尾",
        role: "重申分层判断",
        points: ["个人更近", "社区没有同样受益", "本地活动应加强"],
      },
    ],
    logicSteps: [
      {
        label: "对象拆分",
        contentCn: "把题目中的 individuals 和 society 分开写，避免泛泛而谈。",
        languageFocus: "With regards to individuals ... On the other hand ... societies and local communities",
      },
      {
        label: "转折",
        contentCn: "同一现象对不同对象产生不同影响。",
        languageFocus: "However, while I believe ..., I agree that ...",
      },
      {
        label: "结果链",
        contentCn: "线上社交增加，本地参与减少，社区关系随之变弱。",
        languageFocus: "Consequently ... Furthermore ...",
      },
    ],
    vocabulary: [
      { term: "detrimental effect", meaningCn: "有害影响", useCase: "负面影响" },
      { term: "immediate circle", meaningCn: "直接社交圈", useCase: "社交类" },
      { term: "common interests", meaningCn: "共同兴趣", useCase: "个人益处" },
      { term: "supportive relationships", meaningCn: "支持性关系", useCase: "社区关系" },
      { term: "fragmented", meaningCn: "碎片化的", useCase: "社会影响" },
    ],
    tips: [
      "题目如果含有两个评价对象，应在段落结构中分别回应。",
      "部分同意可以提升精准度，但立场必须清楚。",
      "社会类题目要写出影响机制，而不是只贴标签。",
    ],
    essay: [
      "Social networking sites, for instance Facebook, are thought by some to have had a detrimental effect on individual people as well as society and local communities. However, while I believe that such sites are mainly beneficial to the individual, I agree that they have had a damaging effect on local communities.",
      "With regards to individuals, the impact that online social media has had on each individual person has clear advantages. Firstly, people from different countries are brought together through such sites as Facebook whereas before the development of technology and social networking sites, people rarely had the chance to meet or communicate with anyone outside of their immediate circle or community. Secondly, Facebook also has social groups which offer individuals a chance to meet and participate in discussions with people who share common interests.",
      "On the other hand, the effect that Facebook and other social networking sites have had on societies and local communities can only be seen as negative. Rather than individual people taking part in their local community, they are instead choosing to take more interest in people online. Consequently, the people within local communities are no longer forming close or supportive relationships. Furthermore, society as a whole is becoming increasingly disjointed and fragmented as people spend more time online with people they have never met face to face and who they are unlikely to ever meet in the future.",
      "To conclude, although social networking sites have brought individuals closer together, they have not had the same effect on society or local communities. Local communities should do more to try and involve local people in local activities in order to promote the future of community life.",
    ],
  },
  {
    id: "task2-university-vs-experience",
    source,
    taskType: "discussion",
    categoryCn: "教育与工作",
    shortTitleCn: "大学学历还是经验软技能更重要",
    prompt:
      "Completing university education is thought by some to be the best way to get a good job. On the other hand, other people think that getting experience and developing soft skills is more important. Discuss both sides and give your opinion.",
    positionCn: "平衡立场：学术/专业岗位更需要学历，商业和实践类岗位更看重经验与软技能。",
    thesisCn: "双边讨论题不只列两边，还要说明自己的判断标准：取决于职业类型。",
    paragraphPlan: [
      {
        heading: "开头",
        role: "复述双方并给观点",
        points: ["一方认为大学学历关键", "另一方认为经验和软技能更重要", "不同职业需要不同背景"],
      },
      {
        heading: "主体段 1",
        role: "讨论学历的价值",
        points: ["学历让申请者领先", "某些职业必须有专业知识", "大学培养分析和研究能力"],
      },
      {
        heading: "主体段 2",
        role: "讨论经验和软技能的价值",
        points: ["管理岗位需要实操经验", "人际行业需要长期接触人", "某些领域学历优势有限"],
      },
      {
        heading: "结尾",
        role: "回到个人观点",
        points: ["好工作需要相关背景", "具体岗位决定哪一类背景更重要"],
      },
    ],
    logicSteps: [
      {
        label: "讨论双方",
        contentCn: "先说明为什么有人支持大学教育，再说明为什么有人支持经验。",
        languageFocus: "On the one hand ... On the other hand ...",
      },
      {
        label: "限定条件",
        contentCn: "把观点限定到具体职业，不做绝对化判断。",
        languageFocus: "for academic jobs ... in business and related industries",
      },
      {
        label: "例证",
        contentCn: "用教师、医生、律师、企业管理、客服销售等职业让论证具体。",
        languageFocus: "such as ... namely ... For instance ...",
      },
    ],
    vocabulary: [
      { term: "securing a good job", meaningCn: "获得好工作", useCase: "教育与就业" },
      { term: "tertiary education", meaningCn: "高等教育", useCase: "education 替换" },
      { term: "transferable skills", meaningCn: "可迁移技能", useCase: "大学价值" },
      { term: "hands-on experience", meaningCn: "实践经验", useCase: "工作技能" },
      { term: "interpersonal skills", meaningCn: "人际交往能力", useCase: "软技能" },
    ],
    tips: [
      "双边讨论题的 opinion 和 discuss both views 同等重要。",
      "主体段第一句要明确正在讨论哪一方。",
      "观点可以是条件式的，但不能模糊。",
    ],
    essay: [
      "Some people think that being a university graduate is the key to securing a good job, while others think experience and soft skills are better. In my opinion, I believe that the former is essential for academic jobs, while the latter are more useful in business and related industries.",
      "On the one hand, many people think it is easy find good employment with an undergrad degree or above because it puts people one step ahead of other applicants, and can be the deciding factor between applicants. Furthermore, certain career paths are not open to those without a higher level of education, such as jobs requiring academic or specialist knowledge, namely teachers, lecturers, doctors and lawyers. Not only that, but academia does promote the development of useful skills, not just academic knowledge, for example analytical thinking, research skills and intellectual curiosity, which are valuable transferable skills. For this reason, tertiary education offers an advantage for those aiming for a professional or academic career.",
      "On the other hand, having relevant work experience and soft skills can throw the balance in favour of the job applicant for certain hands-on types of work. For instance, for a corporate management position, having experience of managing others, running projects, delegating tasks and strong emotional intelligence is of more importance than the theory of management with no real hands-on experience when fresh out of university. Also, certain industries require interpersonal skills which can only be developed through extensive experience with people, such as in customer service, hospitality and sales. Consequently, it can be seen that tertiary education is no advantage at all in some areas.",
      "In conclusion, I think that securing a good job requires a relevant background specific to the career or job the applicant is applying for. Some positions will require an academic background, whilst others benefit more from experience and skills.",
    ],
  },
  {
    id: "task2-ebooks-paper-books",
    source,
    taskType: "advantages",
    categoryCn: "科技与阅读",
    shortTitleCn: "电子书是否利大于弊",
    prompt:
      "In recent years, more and more people are choosing to read e-books rather than paper books. Do the advantages outweigh the disadvantages?",
    positionCn: "利大于弊：电子书有明显的便捷和容量优势，缺点存在但较小。",
    thesisCn: "Outweigh 题要明确权重，不只是罗列 advantages and disadvantages。",
    paragraphPlan: [
      {
        heading: "开头",
        role: "说明趋势和权重判断",
        points: ["越来越多人用电子书", "电子书优势明显", "缺点较少"],
      },
      {
        heading: "主体段 1",
        role: "展开主要优势",
        points: ["设备可储存大量书籍", "便于旅行和随时访问", "购买后即时获得"],
      },
      {
        heading: "主体段 2",
        role: "承认缺点",
        points: ["专业和旧书未必有电子版", "电子设备增加用眼和健康问题", "纸质书有时更合适"],
      },
      {
        heading: "结尾",
        role: "重申利大于弊",
        points: ["便利和可及性是真正收益", "缺点不应忽视但权重较小"],
      },
    ],
    logicSteps: [
      {
        label: "权重判断",
        contentCn: "开头直接说 significant benefits 和 minor drawbacks。",
        languageFocus: "with only a few minor drawbacks",
      },
      {
        label: "具体化",
        contentCn: "用 kindle 的容量、分类、购买方式把优势写实。",
        languageFocus: "thousands of books ... with the click of a button",
      },
      {
        label: "让步不跑题",
        contentCn: "缺点段承认问题，但不推翻总体立场。",
        languageFocus: "On the other hand, there is a downside",
      },
    ],
    vocabulary: [
      { term: "reading tool", meaningCn: "阅读工具", useCase: "科技产品" },
      { term: "traditional paper books", meaningCn: "传统纸质书", useCase: "对比对象" },
      { term: "instant access", meaningCn: "即时获取", useCase: "便利性" },
      { term: "specialist subjects", meaningCn: "专业主题", useCase: "限制条件" },
      { term: "accessibility and convenience", meaningCn: "可及性和便利性", useCase: "总结优势" },
    ],
    tips: [
      "outweigh 题必须在开头或结尾明确哪边更重。",
      "优势段和劣势段可以不等长，因为题目问的是权重。",
      "不要把电子书写成所有科技产品，聚焦 reading。",
    ],
    essay: [
      "An increasing number of people are using e-books as a reading tool, such as a kindle, instead of traditional paper books. I believe there are significant benefits to using e-books over paper books with only a few minor drawbacks.",
      "E-books have enormous advantages over the paper book mainly because of the vast number of books that an e-book device, namely a kindle, can contain. Kindles are able to contain thousands of books which you can categorise and organise on a device that is lighter than a tablet. For people who are travelling or those who want easy access to multiple books, these devices are perfect. Furthermore, e-books can be purchased with the click of a button giving instant access to the book without having to wait for delivery.",
      "On the other hand, there is a downside to choosing an e-book over a paper book. The main issue is that it can be hard to find books on specialist subjects in electronic form. Many specialist and old books are only available as a paper book and can only be found in libraries. Another point to consider is that e-books are yet another device which people are glued to and that does have an impact on eye sight and health in general. It has long been known that people spend too much time on their devices and therefore reading a paper book might actually be preferable from time to time.",
      "In conclusion, I think e-books have brought numerous gains to people’s lives through accessibility and convenience that truly benefit people’s lives, but there are disadvantages that should not be ignored.",
    ],
  },
  {
    id: "task2-family-history",
    source,
    taskType: "two-part",
    categoryCn: "家庭与文化",
    shortTitleCn: "研究家族史为何流行",
    prompt:
      "In some parts of the world it is becoming popular to research the history of one’s own family. Why might people want to do this? Is it a positive or negative development?",
    positionCn: "人们研究家族史是为了寻找家族趋势和文化来源；这是积极发展。",
    thesisCn: "两问型：先解释原因，再评价趋势。范文把 positive 的理由融入第三个主体段。",
    paragraphPlan: [
      {
        heading: "开头",
        role: "概括趋势并给判断",
        points: ["研究家族背景越来越流行", "可以发现跨代共同点", "也能获得未来有用的信息"],
      },
      {
        heading: "主体段 1",
        role: "原因 1",
        points: ["寻找家族共同趋势", "了解天赋和兴趣是否遗传", "连接前几代人的经历"],
      },
      {
        heading: "主体段 2",
        role: "原因 2",
        points: ["出于对地理来源的好奇", "移民家庭可能失去原文化", "研究可帮助理解原本文化"],
      },
      {
        heading: "主体段 3",
        role: "评价",
        points: ["帮助人找到身份位置", "缓解方向感缺失", "从前代选择中得到安慰"],
      },
    ],
    logicSteps: [
      {
        label: "原因递进",
        contentCn: "从个人天赋追溯到地理文化来源。",
        languageFocus: "Firstly ... Another reason ...",
      },
      {
        label: "评价嵌入",
        contentCn: "第三段直接回答 positive or negative，而不是另起空泛观点。",
        languageFocus: "is certainly beneficial and can help people find their place",
      },
      {
        label: "例子收束",
        contentCn: "用人生选择的例子说明家族史如何给人安慰。",
        languageFocus: "Take, for example, a person who feels nervous ...",
      },
    ],
    vocabulary: [
      { term: "family background", meaningCn: "家庭背景", useCase: "家庭类" },
      { term: "common trends", meaningCn: "共同趋势", useCase: "原因展开" },
      { term: "geographical origins", meaningCn: "地理来源", useCase: "文化身份" },
      { term: "country of origin", meaningCn: "原籍国", useCase: "移民背景" },
      { term: "find their place in the world", meaningCn: "找到自身定位", useCase: "价值判断" },
    ],
    tips: [
      "why + positive/negative 题可以用两个原因段加一个评价段。",
      "评价不要只说 positive，要说明具体好在哪里。",
      "家庭类题目可以自然连接 identity、culture 和 belonging。",
    ],
    essay: [
      "Exploring one’s family background and history is becoming increasingly popular in numerous countries around the world. In my opinion, through research and knowing more about one’s family, people can see common trends passed through generations and useful information which can only be seen as beneficial for people’s future.",
      "Firstly, some people look into their family history in order to discover any common trends with family members of a previous generation. This can be especially so with people who have particular skills, gifts or interests in uncommon fields. In other words, as some gifts and skills are hereditary, it can be interesting for people to learn how many others in their family shared these talents from previous generations.",
      "Another reason for the popularity of finding out about one’s family history is often due to general curiosity of one’s geographical origins. That is to say, some families moved abroad, away from their own country, generations ago which resulted in them losing their original culture and adopting the culture of the country they moved to. Therefore, through research, people can learn more about their country of origin and understand more about the culture that their family originally came from.",
      "Finally, the trend of researching family history is certainly beneficial and can help people find their place in the world. Some people feel a lack of direction in life or are dislocated from others but by learning more about their past family history, it can help them relate to the world and feel more comfortable about who they are. Take, for example, a person who feels nervous about making a certain choice in life, they may feel comforted by knowing that others in their family made the same choice many generations ago.",
      "In conclusion, it can be advantageous for people to learn more about the family’s background and origins. It would be useful for children to learn about their own family history, if this was incorporated into the school curriculum.",
    ],
  },
  {
    id: "task2-children-art",
    source,
    taskType: "two-part",
    categoryCn: "教育与艺术",
    shortTitleCn: "儿童是否应学习艺术",
    prompt:
      "Art is considered an important part of a society as well as an expression of its culture. Do you think it is important for children to be taught art? Do you think children should be encouraged to focus on art rather than other subjects?",
    positionCn: "儿童应学习艺术，但不应把艺术置于其他学科之上。",
    thesisCn: "这类题要同时回答“是否重要”和“是否优先”，范文用支持艺术但反对偏科来完成平衡。",
    paragraphPlan: [
      {
        heading: "开头",
        role: "回答两问",
        points: ["艺术有社会和文化价值", "儿童应学习艺术", "但不能损害其他学科"],
      },
      {
        heading: "主体段 1",
        role: "艺术的重要性 1",
        points: ["培养创造力和想象力", "帮助儿童成长为独立思考者", "发掘有天赋的孩子"],
      },
      {
        heading: "主体段 2",
        role: "艺术的重要性 2",
        points: ["艺术帮助表达情感", "儿童语言能力有限", "图像和符号可传达意义"],
      },
      {
        heading: "主体段 3",
        role: "回应是否应优先",
        points: ["艺术有用不等于压倒其他科目", "儿童需要均衡课程", "艺术、科学、语言、体育都重要"],
      },
    ],
    logicSteps: [
      {
        label: "正面回答",
        contentCn: "先肯定艺术教育的价值。",
        languageFocus: "children should definitely learn art",
      },
      {
        label: "补充维度",
        contentCn: "从创造力转到情感表达，让段落不重复。",
        languageFocus: "Another important advantage",
      },
      {
        label: "边界限定",
        contentCn: "第三段限制艺术的优先级，避免走向极端。",
        languageFocus: "should not result in more focus being placed on art",
      },
    ],
    vocabulary: [
      { term: "plays a fundamental role", meaningCn: "发挥根本作用", useCase: "艺术文化类开头" },
      { term: "to the detriment of", meaningCn: "以损害……为代价", useCase: "平衡立场" },
      { term: "creative thinking", meaningCn: "创造性思维", useCase: "教育优势" },
      { term: "a medium through which", meaningCn: "一种借以……的媒介", useCase: "复杂句" },
      { term: "school syllabus", meaningCn: "学校课程大纲", useCase: "教育政策" },
    ],
    tips: [
      "Do you think A? Do you think B? 必须两个都答。",
      "支持一个学科不等于主张减少其他学科，立场要细。",
      "教育类段落最好写能力发展，而不是只写兴趣。",
    ],
    essay: [
      "It is commonly believed that art plays a fundamental role in society as artists are able to express their thoughts and their culture in their work. In my opinion, children should definitely learn art because they can develop creativity and learn to express themselves in their art work but it should not be taught to the detriment of other subjects.",
      "Firstly, art is an essential subject which children, especially young children, should learn in order to help promote their creativity and imagination. Without the development of imagination and creative thinking, children will struggle to grow into dynamic, individual thinkers when they reach adulthood. Furthermore, some children are particularly gifted in their creative abilities and studying art can help them nurture their talents.",
      "Another important advantage for children when practicing art is that it provides a medium through which they can express their emotions and feelings. In other words, young children do not have the linguistic capabilities to put their ideas into language and thus communicate directly. Therefore, by using art, they are able to convey meaning through pictures and symbols. For this reason, many child psychologists often study the art work of children to gain an insight into what they think and feel.",
      "Finally, however, regardless of how useful the study of art is for children, this should not result in more focus being placed on art rather than other subjects. Children need to have a balance of all subjects so as to facilitate a healthy development both mentally and physically. Thus, ensuring that there is a healthy balance of art, sciences, languages and physical education in the school syllabus is essential.",
      "In conclusion, while art certainly helps a child develop creativity as well as express their thoughts, it should be taught equally alongside all other subjects. A school curriculum should offer a balance of subjects.",
    ],
  },
  {
    id: "task2-socialise-online",
    source,
    taskType: "opinion",
    categoryCn: "互联网与生活",
    shortTitleCn: "线上社交是否是消极趋势",
    prompt:
      "Nowadays, more people are choosing to socialise online rather than face to face. Is this a positive or negative development?",
    positionCn: "消极趋势：可能导致孤立、网络风险和未来隐私/声誉问题。",
    thesisCn: "Positive/negative 题可以单边论证，但要用多个清晰风险支撑判断。",
    paragraphPlan: [
      {
        heading: "开头",
        role: "改写趋势并直接评价",
        points: ["越来越多人线上社交", "作者认为这是消极发展", "预告三类问题"],
      },
      {
        heading: "主体段 1",
        role: "风险 1",
        points: ["线上社交导致孤立", "人们更常独自在家", "可能引发抑郁等问题"],
      },
      {
        heading: "主体段 2",
        role: "风险 2",
        points: ["网络身份可能虚假", "青少年容易受影响", "父母难以监督"],
      },
      {
        heading: "主体段 3",
        role: "风险 3",
        points: ["旧聊天和照片可能重新出现", "网络信息长期存在", "带来尴尬或损害"],
      },
    ],
    logicSteps: [
      {
        label: "单边立场",
        contentCn: "开头直接说明 negative development。",
        languageFocus: "this is a negative development which can lead to ...",
      },
      {
        label: "递进列举",
        contentCn: "三个主体段分别写孤立、安全、长期后果。",
        languageFocus: "One serious problem ... Another issue ... Finally ...",
      },
      {
        label: "群体聚焦",
        contentCn: "用 teenagers 让风险更具体。",
        languageFocus: "This is particularly concerning for teenagers",
      },
    ],
    vocabulary: [
      { term: "face to face", meaningCn: "面对面", useCase: "线上线下对比" },
      { term: "isolation", meaningCn: "孤立", useCase: "心理健康" },
      { term: "assume fake identities", meaningCn: "使用虚假身份", useCase: "网络风险" },
      { term: "impressionable", meaningCn: "易受影响的", useCase: "青少年话题" },
      { term: "resurface later on", meaningCn: "日后重新出现", useCase: "网络痕迹" },
    ],
    tips: [
      "positive/negative 题如果选单边，主体段要给足理由。",
      "不要只说 online is bad，要说明坏在哪里、如何发生。",
      "结尾重申趋势判断即可，不要突然加解决方案。",
    ],
    essay: [
      "An increasing number of people meet and talk to their friends online instead of in person. In my opinion, this is a negative development which can lead to isolation, potentially harmful situations and also problems later on in life.",
      "One serious problem that can arise from people socialising online is that it can lead to isolation. Before the internet, people would frequently go out to meet friends, for example in cafes, bars or restaurants, whereas now people prefer to stay at home alone, chatting online. As a result, people are starting to spend the majority of their time alone at home in their room without meeting others. Isolation of this kind is not healthy and can sometimes lead to depression and other issues.",
      "Another issue is that meeting people online can be risky. In other words, people can assume fake identities online as well as hide their true characteristics. This is particularly concerning for teenagers who are impressionable and can easily be led into dangerous situations. Furthermore, as this interaction is online, parents have no way of monitoring it and protecting their children.",
      "Finally, socialising online can end in difficulties years later as conversations and shared photos that had been forgotten reappear. This situation is currently critical for many people, again especially for teenagers who do not think carefully before posting online. That is to say, information which is put online can remain there forever and while people may share intimate communications with close friends, these words can then resurface later on leading to much embarrassment.",
      "In conclusion, although it has become more popular for people to socialise through the internet, it has brought about too many problems for this to be considered a positive trend.",
    ],
  },
  {
    id: "task2-price-purchase",
    source,
    taskType: "opinion",
    categoryCn: "消费与生活",
    shortTitleCn: "价格是否是购买时最重要因素",
    prompt:
      "Some people consider price as the most important thing to think about when buying a product (such as cell phone) or a service (e.g. medical treatment). Do you agree or disagree?",
    positionCn: "部分同意：普通消费中价格重要，但高质量产品和关键服务中其他因素更重要。",
    thesisCn: "题目同时给 product 和 service，范文用普通商品、高端商品、医疗服务三个层次展开。",
    paragraphPlan: [
      {
        heading: "开头",
        role: "提出部分同意",
        points: ["价格确实影响购买", "但不是唯一因素", "其他因素也会影响决定"],
      },
      {
        heading: "主体段 1",
        role: "价格重要的情况",
        points: ["人们会考虑是否负担得起", "手机价格差异大", "低收入者会避免债务"],
      },
      {
        heading: "主体段 2",
        role: "质量更重要的情况",
        points: ["高端手机性能更好", "配置和相机可能影响工作", "收入高时价格权重降低"],
      },
      {
        heading: "主体段 3",
        role: "生命关键服务",
        points: ["治疗关乎生命时价格退居其次", "等待时间和可获得性更关键", "私人治疗可能昂贵但必要"],
      },
    ],
    logicSteps: [
      {
        label: "范围分类",
        contentCn: "把购买场景分成普通商品、高质量商品、生命服务。",
        languageFocus: "for items or services that ... if an item or service is vital",
      },
      {
        label: "让步",
        contentCn: "先承认价格在预算中的现实作用。",
        languageFocus: "price does play a role",
      },
      {
        label: "例子转化",
        contentCn: "题目中的手机和医疗例子都被写进正文，任务回应更稳。",
        languageFocus: "Taking the example of cell phones ... in the case of a life threatening condition",
      },
    ],
    vocabulary: [
      { term: "invariably consider", meaningCn: "总会考虑", useCase: "消费决策" },
      { term: "moderate or low incomes", meaningCn: "中低收入", useCase: "经济背景" },
      { term: "go into personal debt", meaningCn: "陷入个人债务", useCase: "价格风险" },
      { term: "factors into the decision", meaningCn: "成为决策因素", useCase: "观点表达" },
      { term: "readily available", meaningCn: "容易获得的", useCase: "医疗服务" },
    ],
    tips: [
      "题目给的例子可以直接用于正文，但不要只复述例子。",
      "部分同意适合这种“某些情况下对，某些情况下不对”的题。",
      "段落之间可以按情境分类，逻辑会比简单正反更清楚。",
    ],
    essay: [
      "It is thought by some people that the price of a product or service is essential to consider before deciding to purchase something. While I agree that price does play a role in many purchase choices, there are other factors that can influence a person.",
      "Firstly, when deciding whether or not to buy something, people will invariably consider if they can afford it. Taking the example of cell phones, these items vary greatly in price from under £100 to well over £1,000, which is a considerable price hike for a functional item. In this case, people on moderate or low incomes are unlikely to choose a more expensive product if a cheaper one can perform the role perfectly so as to avoid going into personal debt.",
      "However, price becomes less important for items or services that offer excellent quality. For instance, some high-end phones offer better performance, larger RAM and their cameras take top quality pictures with a variety of editing options. These features could be worth the high price for some people if it impacts their work or if their income is high enough that price is not a factor they need to consider.",
      "Finally, if an item or service is vital to someone’s life, price rarely factors into the decision. To illustrate, in the case of a life threatening condition, people are usually willing to spend hundreds of thousands of pounds if the treatment offers them hope of a cure. This is particularly so when there are long waiting lists for treatments making time a major factor or when certain treatments are not readily available to the public thus requiring costly private treatment.",
      "In conclusion, price is important when making a common purchase for people on limited incomes needing to budget, but it plays less of a role for high quality products and vital services.",
    ],
  },
  {
    id: "task2-adults-computer-games",
    source,
    taskType: "two-part",
    categoryCn: "科技与休闲",
    shortTitleCn: "成年人玩电脑游戏的原因和影响",
    prompt:
      "More and more adults are playing computer games. Why is this happening? Is it a positive or negative trend?",
    positionCn: "原因是游戏技术更成熟；影响取决于游戏类型和时间控制，总体需要避免过度。",
    thesisCn: "直接问题题型先回答原因，再评价趋势。范文采用条件式评价，语言需要足够清楚。",
    paragraphPlan: [
      {
        heading: "开头",
        role: "说明趋势、原因方向和评价边界",
        points: ["成年人玩游戏增加", "技术发展使其不意外", "好坏取决于游戏和时间"],
      },
      {
        heading: "主体段 1",
        role: "解释原因",
        points: ["游戏技术更复杂", "画面吸引人", "需要技巧和策略，适合成年人"],
      },
      {
        heading: "主体段 2",
        role: "评价影响",
        points: ["复杂游戏可放松和保持思维敏捷", "时间平衡时可有建设性", "过度玩无意义游戏会伤害健康"],
      },
      {
        heading: "结尾",
        role: "总结条件式立场",
        points: ["游戏更吸引成年人", "有益游戏可带来优势", "任何游戏都不应过度"],
      },
    ],
    logicSteps: [
      {
        label: "原因解释",
        contentCn: "从游戏本身变化解释成年人为何被吸引。",
        languageFocus: "the technology behind the games is becoming more sophisticated",
      },
      {
        label: "条件判断",
        contentCn: "不简单说 positive 或 negative，而是取决于内容和时间。",
        languageFocus: "whether it is positive or negative depends on ...",
      },
      {
        label: "边界收束",
        contentCn: "结尾强调不能取代健康休闲活动。",
        languageFocus: "should not replace healthier leisure activities",
      },
    ],
    vocabulary: [
      { term: "sophisticated", meaningCn: "复杂精密的", useCase: "科技发展" },
      { term: "visually appealing", meaningCn: "视觉上有吸引力的", useCase: "游戏特点" },
      { term: "strategic challenge", meaningCn: "策略挑战", useCase: "成年人偏好" },
      { term: "escapism", meaningCn: "逃避现实的消遣", useCase: "休闲心理" },
      { term: "played to excess", meaningCn: "过度玩", useCase: "结尾限制" },
    ],
    tips: [
      "why + positive/negative 题先解释趋势原因，再做价值判断。",
      "it depends 可以使用，但必须清楚写出 depends on what。",
      "科技娱乐类题目要避免道德化空话，写出具体机制。",
    ],
    essay: [
      "It seems that the current trend is for an increasing number of adults to enjoy playing computer games in their free time. With the development of game technology, it is hardly surprising that adults are playing games, but whether it is positive or negative depends on the games played and the time spent on them.",
      "In terms of why so many adults are choosing to spend time playing computer games, it is mainly because the technology behind the games is becoming more sophisticated. Initially, when games first came out, they were very simplistic and appealed mainly to children. However, things have moved on since then and games have become visually appealing, very absorbing, require great dexterity and some also have a strategic challenge to them which adults particularly like. Such games can attract professional adults looking to hone tactics and skills to other adults wishing just to relax and switch off.",
      "However, whether this trend in adults towards computer games is beneficial or not can be challenged. Some adults use complex, challenging games as a form of escapism which keeps their mind sharp and helps them relax at the same time. As long as the time spent on such games is balanced with other healthier pursuits, it can be constructive. Unfortunately, adults who ignore their physical health and spend too much time on mindless, repetitive games develop a sedentary lifestyle which can be detrimental to their wellbeing.",
      "In conclusion, computer games have become more fascinating and tempting to adults. While games that help develop tactics and knowledge might be advantageous, no game, particularly senseless games, should be played to excess and certainly should not replace healthier leisure activities.",
    ],
  },
];

export function getTask2Essay(id: string) {
  return TASK2_MODEL_ESSAYS.find((essay) => essay.id === id);
}

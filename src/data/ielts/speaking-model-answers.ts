import type { SpeakingPartId } from "@/lib/ielts/speaking";

export type SpeakingVocabulary = {
  note: string;
  phrase: string;
  translation: string;
};

export type SpeakingModelAnswer = {
  answer: string[];
  answerTranslation: string[];
  approach: string;
  audioUrl?: string;
  frames: string[];
  partId: SpeakingPartId;
  questionId: string;
  vocabulary: SpeakingVocabulary[];
};

export type SpeakingScoreNote = {
  code: string;
  label: string;
  note: string;
};

export const speakingModelAnswers = [
  {
    partId: "part-1",
    questionId: "speaking-part-1-001",
    approach: "先交代住房类型，再补一个具体生活细节，最后说社区氛围；答案会比单纯罗列设施更自然。",
    frames: [
      "It’s not fancy, but it’s practical because ...",
      "My favourite room is probably ..., where I can ...",
      "The best thing about the neighbourhood is that ...",
      "I wouldn’t call it ..., but it feels ...",
    ],
    vocabulary: [
      { phrase: "a small flat", translation: "小公寓", note: "比 house 更贴近城市生活" },
      { phrase: "within walking distance", translation: "步行可达", note: "说交通便利很自然" },
      { phrase: "feel less boxed-in", translation: "没那么憋闷", note: "形容居住空间感" },
      { phrase: "wind down", translation: "放松下来", note: "适合描述晚上在家状态" },
      { phrase: "lived-in", translation: "有生活气息的", note: "比 comfortable 更有画面" },
    ],
    answer: [
      "Well, at the moment I live in a small flat with my parents in a fairly quiet neighbourhood. It’s not fancy, but it’s practical, because the metro is about ten minutes away on foot and there’s a little park nearby, so the area feels less boxed-in. My favourite room is probably the living room, because that’s where we eat, chat and, you know, wind down in the evening. I wouldn’t call it my dream home, but it feels comfortable and lived-in.",
    ],
    answerTranslation: [
      "嗯，我目前和父母住在一个相当安静的社区里，房子是一套小公寓。它谈不上豪华，但很实用，因为步行到地铁站大约只要十分钟，附近还有一个小公园，所以住在这里不会觉得太憋闷。我最喜欢的房间大概是客厅，因为我们会在那里吃饭、聊天，而且晚上也会在那里放松一下。我不会说这是我梦想中的家，但它住起来很舒适，也很有生活气息。",
    ],
    audioUrl: "/speaking/audio/speaking-part-1-001.mp3",
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-002",
    approach: "家乡题用“位置—日常感受—一个变化”回答；不要把它讲成旅游宣传片。",
    frames: [
      "I’m originally from ..., which is ...",
      "What I like most is that ...",
      "It has changed quite a bit, especially ...",
      "So it feels more ..., but a little less ...",
    ],
    vocabulary: [
      { phrase: "a medium-sized city", translation: "中等规模城市", note: "避免 big 或 small 太笼统" },
      { phrase: "laid-back", translation: "节奏轻松的", note: "形容城市氛围" },
      { phrase: "local character", translation: "地方特色", note: "适合讲变化后的遗憾" },
      { phrase: "new shopping complexes", translation: "新商业综合体", note: "描述城市发展" },
      { phrase: "still has its charm", translation: "仍然有魅力", note: "自然收尾" },
    ],
    answer: [
      "I’m originally from Suzhou, which is a medium-sized city near Shanghai. It’s famous for gardens and canals, but to be honest, what I like most is the slower pace. People can still find quiet streets, small noodle shops and old neighbourhoods if they know where to look. It has changed quite a bit, especially with new shopping complexes and metro lines. So it feels more convenient now, but maybe a little less local than it used to be.",
    ],
    answerTranslation: [
      "我来自苏州，那是一座位于上海附近的中等规模城市。苏州以园林和河道闻名，但说实话，我最喜欢的是那里比较慢的生活节奏。只要知道去哪里找，人们仍然能发现安静的街道、小面馆和老社区。这座城市已经发生了很大变化，尤其是新建了不少商业综合体和地铁线路。所以现在生活确实更方便了，不过地方特色可能没有以前那么浓了。",
    ],
    audioUrl: "/speaking/audio/speaking-part-1-002.mp3",
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-003",
    approach: "先说明身份，再说选择原因和真实感受。适度承认困难，比一味夸赞专业或工作更像真人。",
    frames: [
      "At the moment, I’m studying/working in ...",
      "I chose it mainly because ...",
      "What I enjoy most is ...",
      "It can be ..., but it gives me ...",
    ],
    vocabulary: [
      { phrase: "at the moment", translation: "目前", note: "Part 1 开头很自然" },
      { phrase: "hands-on", translation: "实践性强的", note: "形容课程或工作" },
      { phrase: "a steep learning curve", translation: "学习曲线陡", note: "说挑战很地道" },
      { phrase: "pick up useful skills", translation: "学到实用技能", note: "比 learn things 更准确" },
      { phrase: "keep me motivated", translation: "让我有动力", note: "解释喜欢的原因" },
    ],
    answer: [
      "At the moment, I’m a university student, and I’m studying media and communication. I chose it mainly because I’ve always been interested in how people tell stories online, especially through short videos and social media. Some modules are quite theoretical, which can be a bit dry, but the practical projects are hands-on and genuinely useful. I feel I’m picking up skills I can actually use later, so that keeps me motivated.",
    ],
    answerTranslation: [
      "目前我是一名大学生，学习的是媒体与传播。我选择这个专业，主要是因为我一直很感兴趣人们如何在网上讲故事，尤其是如何通过短视频和社交媒体来表达。有些课程理论性很强，学起来可能有点枯燥，不过实践项目动手性很强，也确实很有用。我觉得自己正在掌握一些以后真正能用得上的技能，所以这让我一直很有动力。",
    ],
    audioUrl: "/speaking/audio/speaking-part-1-003.mp3",
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-004",
    approach: "把 walking 说成日常习惯，而不是运动项目。地点和时段一具体，答案马上变得生活化。",
    frames: [
      "I do walk quite a bit, especially when ...",
      "I’m not doing it as a workout; it’s more ...",
      "If I have a choice, I prefer walking in ...",
      "It helps me clear my head after ...",
    ],
    vocabulary: [
      { phrase: "clear my head", translation: "让头脑清醒", note: "散步题高频表达" },
      { phrase: "after dinner", translation: "晚饭后", note: "简单但生活化" },
      { phrase: "a proper workout", translation: "正经锻炼", note: "和散步形成对比" },
      { phrase: "tree-lined streets", translation: "两旁有树的街道", note: "地点更有画面" },
      { phrase: "get some fresh air", translation: "透透气", note: "口语自然" },
    ],
    answer: [
      "Yes, I do walk quite a bit, especially after dinner. I’m not doing it as a proper workout; it’s more a way to get some fresh air and clear my head. On weekdays, I usually walk around the neighbourhood or to the metro station. If I have a choice, though, I prefer walking in a park or along tree-lined streets, because it feels quieter and I can actually slow down for a while.",
    ],
    answerTranslation: [
      "是的，我确实经常走路，尤其是在晚饭后。我并不是把它当成正式锻炼，更多只是想透透气、清醒一下头脑。工作日里，我一般会在小区附近走走，或者步行去地铁站。不过如果可以选择，我更喜欢在公园里或绿树成荫的街道上散步，因为那里更安静，我也能真正放慢脚步一会儿。",
    ],
    audioUrl: "/speaking/audio/speaking-part-1-004.mp3",
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-005",
    approach: "动物题用一只具体的动物和一个小片段来回答。即使现在没有养宠物，也可以讲过去的经历或未来计划。",
    frames: [
      "I don’t have a pet at the moment, mainly because ...",
      "I’ve always been quite fond of ...",
      "What I liked about it was that ...",
      "I’d love to have one again once ...",
    ],
    vocabulary: [
      { phrase: "be fond of", translation: "很喜欢", note: "比 like 更自然" },
      { phrase: "keep someone company", translation: "陪伴某人", note: "讲宠物价值很贴切" },
      { phrase: "a proper commitment", translation: "需要认真承担的责任", note: "解释暂不养宠物" },
      { phrase: "a settled routine", translation: "稳定的生活规律", note: "生活类话题通用" },
      { phrase: "a ginger cat", translation: "橘猫", note: "具体细节让答案更鲜活" },
    ],
    answer: [
      "I don’t have a pet at the moment, mainly because my flat is fairly small and nobody is home all day, so it wouldn’t be fair to the animal. But I grew up with a ginger cat called Milo, so I’ve always been quite fond of cats. He wasn’t particularly affectionate, to be honest, but he would sit beside me while I was doing homework, which was oddly comforting. I’d love to have a cat again one day, once I have a bit more space and a more settled routine.",
    ],
    answerTranslation: [
      "我目前没有养宠物，主要是因为我的公寓比较小，而且白天家里一直没人，所以对动物来说不太公平。不过我小时候和一只叫 Milo 的橘猫一起长大，因此我一直都很喜欢猫。说实话，它并不算特别黏人，但我做作业时它会坐在旁边，不知为什么，那种陪伴让人很安心。等以后住的地方宽敞一些、生活作息也更稳定时，我很想再养一只猫。",
    ],
    audioUrl: "/speaking/audio/speaking-part-1-005.mp3",
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-006",
    approach: "阅读题不要只说喜欢或不喜欢。先讲常读类型，再补固定阅读场景和它对情绪的作用，答案会更像真实学生。",
    frames: [
      "Yes, I do enjoy reading, especially ...",
      "If I’m tired, I usually go for ...",
      "I tend to read ..., because ...",
      "For me, reading is a way to ...",
    ],
    vocabulary: [
      { phrase: "a light read", translation: "轻松读物", note: "来自 BBC 词汇，适合说休闲阅读" },
      { phrase: "take my mind off", translation: "转移注意力", note: "解释阅读的放松作用" },
      { phrase: "absorbed in a book", translation: "沉浸在书里", note: "比 like reading 更有画面" },
      { phrase: "broaden my perspective", translation: "拓宽视角", note: "教育类话题通用" },
      { phrase: "wind down", translation: "放松下来", note: "睡前阅读自然搭配" },
    ],
    answer: [
      "Yes, I do enjoy reading, especially novels and narrative non-fiction. If I’m tired, I usually go for a light read, but when I have more energy, I like books that explain real events or people’s lives. I tend to read before bed, partly because it helps me wind down and keeps me away from my phone. For me, reading is not just about learning facts; it can take my mind off small worries. When I’m really absorbed in a book, I feel as if I’ve stepped into someone else’s world for a while.",
    ],
    answerTranslation: [
      "是的，我确实喜欢阅读，尤其是小说和叙事性非虚构作品。如果我比较累，我通常会选择轻松读物；但如果精力更足，我会喜欢那些解释真实事件或人物经历的书。我一般会在睡前读书，一方面是因为它能让我放松下来，也能让我远离手机。对我来说，阅读不只是学习知识；它还能让我暂时不去想一些小烦恼。当我真正沉浸在一本书里时，我会觉得自己好像短暂地走进了别人的世界。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-007",
    approach: "名字题可以讲含义、家人期待和身份感。不要编得太宏大，用一个具体解释加个人态度即可。",
    frames: [
      "My name was chosen by ...",
      "As far as I know, it means ...",
      "I didn’t think much about it when ...",
      "Now I see it as part of ...",
    ],
    vocabulary: [
      { phrase: "carry a meaning", translation: "带有含义", note: "解释名字含义很自然" },
      { phrase: "a sense of identity", translation: "身份认同感", note: "BBC 相关文章常见角度" },
      { phrase: "shared identity", translation: "共同身份认同", note: "可用于家族或文化连接" },
      { phrase: "live up to it", translation: "不辜负它", note: "表达父母期待" },
      { phrase: "fairly uncommon", translation: "不太常见", note: "评价名字特点" },
    ],
    answer: [
      "My name was chosen by my parents, and as far as I know, it carries a meaning connected with being calm and reliable. To be honest, I didn’t think much about it when I was younger; it was just something teachers called out in class. But now I quite like it because it is fairly uncommon without being difficult to pronounce. I suppose a name gives you a small sense of identity and a link to your family. I don’t feel I have to live up to it every day, but it does remind me of what my parents hoped for.",
    ],
    answerTranslation: [
      "我的名字是父母取的。据我所知，它的含义和冷静、可靠有关。说实话，我小时候并没有太在意这个名字；它只是老师在课堂上点名时会叫到的一个称呼。但现在我挺喜欢它的，因为它不算常见，同时又不难读。我觉得名字会给人一点身份认同感，也会让人和家庭产生连接。我并不会觉得自己每天都必须完全配得上这个名字，但它确实会提醒我父母当初对我的期待。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-008",
    approach: "爱好题聚焦一个真实爱好，讲开始方式、坚持原因和情绪价值。比列举很多爱好更容易拿高分。",
    frames: [
      "My main hobby is ...",
      "I first got into it when ...",
      "What keeps me interested is ...",
      "It gives me a chance to ... rather than ...",
    ],
    vocabulary: [
      { phrase: "a relaxing pastime", translation: "轻松的消遣", note: "描述爱好的自然表达" },
      { phrase: "get into", translation: "开始喜欢上", note: "口语常用动词短语" },
      { phrase: "switch off", translation: "让大脑放松", note: "BBC 园艺话题常见角度" },
      { phrase: "a creative outlet", translation: "创意出口", note: "解释长期坚持原因" },
      { phrase: "pressure to be perfect", translation: "追求完美的压力", note: "学生口吻很真实" },
    ],
    answer: [
      "My main hobby is taking photos on my phone. I first got into it during the pandemic, when I needed a relaxing pastime that didn’t cost much or require special equipment. At first, I just took pictures of sunsets and coffee cups, but gradually I started noticing light, colours and tiny details on the street. What keeps me interested is that it gives me a creative outlet and a reason to go outside. It also helps me switch off for a while, because there is no pressure to be perfect; I just pay attention to what is around me.",
    ],
    answerTranslation: [
      "我的主要爱好是用手机拍照。我最开始喜欢上它是在疫情期间，那时我需要一个花费不高、也不需要特殊设备的轻松消遣。一开始我只是拍日落和咖啡杯，但慢慢地，我开始注意街上的光线、颜色和细小的细节。让我一直保持兴趣的是，它给了我一个创意表达的出口，也给了我一个出门走走的理由。它还能让我暂时放松下来，因为这件事没有追求完美的压力；我只是去留意身边的东西。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-009",
    approach: "日常题按早晨、白天、晚上三个节点回答，再强调是弹性安排，不要讲成机械时间表。",
    frames: [
      "On weekdays, I usually start my day with ...",
      "Most of my day is divided between ...",
      "In the evening, I try to ...",
      "I follow a loose routine rather than ...",
    ],
    vocabulary: [
      { phrase: "daily routine", translation: "日常作息", note: "BBC 词汇表基础表达" },
      { phrase: "a fixed anchor", translation: "固定节点", note: "解释规律感" },
      { phrase: "stay on track", translation: "保持进度", note: "学习工作类通用" },
      { phrase: "leave room for changes", translation: "给变化留空间", note: "体现真实生活" },
      { phrase: "a sense of control", translation: "掌控感", note: "说明 routine 的好处" },
    ],
    answer: [
      "On weekdays, I usually start my day with breakfast and a quick check of my schedule. Breakfast is a fixed anchor for me, because if I skip it, the whole morning feels slightly messy. Most of my day is divided between classes, preparation and a bit of self-study. In the evening, I try to cook something simple or take a short walk so I can wind down. I follow a loose daily routine rather than a strict timetable. It gives me a sense of control, but still leaves room for changes when something unexpected happens.",
    ],
    answerTranslation: [
      "工作日里，我通常会以吃早餐和快速查看当天安排开始一天。早餐对我来说是一个固定节点，因为如果我不吃早餐，整个上午都会有点混乱。白天大部分时间会分给上课、备课和一点自我学习。晚上我会尽量做点简单的饭，或者短暂散步，让自己放松下来。我遵循的是一种弹性的日常作息，而不是严格到每一分钟的时间表。它能给我一种掌控感，但如果有意外情况发生，也仍然给生活留出了调整空间。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-010",
    approach: "风景题把自然景观和情绪修复联系起来。地点可以普通，但要说出为什么比打卡更有意义。",
    frames: [
      "Yes, I’m drawn to ...",
      "When I need a short break, I usually ...",
      "For a longer trip, I prefer ...",
      "What makes scenery memorable for me is ...",
    ],
    vocabulary: [
      { phrase: "natural landscape", translation: "自然景观", note: "风景题核心词" },
      { phrase: "peace and quiet", translation: "宁静", note: "BBC 自然疗法文章角度" },
      { phrase: "the great outdoors", translation: "户外天地", note: "自然话题可迁移" },
      { phrase: "take it all in", translation: "好好欣赏", note: "口语感强" },
      { phrase: "a perfect tonic", translation: "很好的调节剂", note: "形容自然对压力的缓解" },
    ],
    answer: [
      "Yes, I’m drawn to natural landscapes, especially places with water and open sky. When I need a short break, I usually go to a lakeside park near my home, because it gives me a bit of peace and quiet without a long journey. For a longer trip, I prefer mountains or coastal areas where I can walk slowly and take it all in. What makes scenery memorable for me is not just taking a nice photo, but the feeling of being in the great outdoors. It works like a perfect tonic when I’m stressed.",
    ],
    answerTranslation: [
      "是的，我很喜欢自然风景，尤其是有水面和开阔天空的地方。当我需要短暂休息时，我通常会去家附近的湖边公园，因为不用长途跋涉就能获得一点宁静。如果是更长一点的旅行，我更喜欢山区或海边，那样我可以慢慢走，好好欣赏周围的一切。对我来说，风景让人难忘的地方不只是能拍出好看的照片，而是身处户外自然中的那种感受。当我压力比较大时，它就像一种很好的调节剂。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-011",
    approach: "团队运动题不必假装自己很擅长。可以区分观看和参与，再讲团队协作带来的价值。",
    frames: [
      "I enjoy watching team sports more than ...",
      "The sport I like most is ... because ...",
      "I was never a serious player, but ...",
      "Team sports teach people to ...",
    ],
    vocabulary: [
      { phrase: "team spirit", translation: "团队精神", note: "团队运动核心表达" },
      { phrase: "work towards a common goal", translation: "朝共同目标努力", note: "解释团队价值" },
      { phrase: "play a clear role", translation: "承担明确角色", note: "说协作很准确" },
      { phrase: "team building", translation: "团队建设", note: "BBC 词汇，可转入口语" },
      { phrase: "cheer from the sidelines", translation: "在场边加油", note: "适合不擅长运动的学生" },
    ],
    answer: [
      "I enjoy watching team sports more than playing them, mainly because I’m not extremely athletic. The sport I like most is volleyball, because every player has to play a clear role, and one good move can lift the whole team. I was never a serious school-team player, but I did join casual matches in PE lessons, and I liked the energy. Team sports teach people to work towards a common goal, not just show off individual skill. Even if I’m only cheering from the sidelines, I can still feel the team spirit.",
    ],
    answerTranslation: [
      "相比亲自参加团队运动，我更喜欢观看，主要是因为我并不是特别擅长运动。我最喜欢的团队运动是排球，因为每个队员都必须承担明确角色，而且一个漂亮的动作就能带动整个队伍。我从来不算正式的校队成员，但体育课上参加过一些轻松的比赛，我挺喜欢那种氛围。团队运动教会人们朝共同目标努力，而不只是展示个人能力。即使我只是在场边加油，也能感受到那种团队精神。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-012",
    approach: "饮食题用一道具体食物开头，再讲自己的真实厨艺和家庭分工。把做饭和情绪稳定联系起来会更高级。",
    frames: [
      "My favourite food is ... because ...",
      "I can cook a few simple dishes, especially ...",
      "In my family, ... usually takes charge of ...",
      "What I like about cooking is that ...",
    ],
    vocabulary: [
      { phrase: "comfort food", translation: "慰藉美食", note: "BBC 词汇，适合家常菜" },
      { phrase: "cook from scratch", translation: "从头做饭", note: "比 make food 更准确" },
      { phrase: "ready meals", translation: "即食餐", note: "和自己做饭形成对比" },
      { phrase: "a sense of control", translation: "掌控感", note: "做饭与心理健康角度" },
      { phrase: "take charge of the kitchen", translation: "负责掌厨", note: "家庭分工自然表达" },
    ],
    answer: [
      "My favourite food is tomato-and-egg noodles, because it is comfort food and reminds me of home. I can cook a few simple dishes, especially noodles and fried rice, and I’d rather cook from scratch than rely on ready meals every day. In my family, my father usually takes charge of the kitchen when relatives visit, while I help with chopping or washing up. What I like about cooking is that it gives me a small sense of control. Even when my day is busy, making a warm meal can calm me down.",
    ],
    answerTranslation: [
      "我最喜欢的食物是番茄鸡蛋面，因为它是一种很治愈的家常食物，也让我想到家的味道。我会做几道简单的菜，尤其是面条和炒饭，而且比起每天依赖即食餐，我更愿意从头做饭。在我们家，如果亲戚来做客，通常是我父亲负责掌厨，而我会帮忙切菜或洗碗。我喜欢做饭的一点是，它能给我一点小小的掌控感。即使一天很忙，做一顿热乎的饭也能让我平静下来。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-013",
    approach: "老建筑题用平衡回答：有价值的应保护，但日常居住仍需要现代安全和便利。避免绝对化。",
    frames: [
      "I think old buildings should be preserved if ...",
      "They give a place ...",
      "For everyday living, though, I prefer ...",
      "A good solution is to ...",
    ],
    vocabulary: [
      { phrase: "architectural character", translation: "建筑特色", note: "老建筑题核心表达" },
      { phrase: "a sense of history", translation: "历史感", note: "解释保护价值" },
      { phrase: "emotional wellbeing", translation: "情绪幸福感", note: "借鉴 BBC 建筑话题" },
      { phrase: "modern safety standards", translation: "现代安全标准", note: "平衡现代需求" },
      { phrase: "adaptive reuse", translation: "适应性再利用", note: "高分但实用的保护方案" },
    ],
    answer: [
      "I think old buildings should be preserved if they have real architectural character or a strong link to local history. They give a street a sense of history, and they can make a city feel less soulless than rows of identical modern blocks. That said, for everyday living, I still prefer modern buildings because they usually have better lifts, heating and safety standards. A good solution is adaptive reuse, like turning an old factory into a library or community centre. In that way, the building keeps its story but still serves people’s lives today.",
    ],
    answerTranslation: [
      "我认为，如果老建筑确实有建筑特色，或者和当地历史有很强的联系，就应该被保护。它们能给一条街带来历史感，也能让一座城市不像一排排相同的现代楼房那样没有灵魂。不过话说回来，如果是日常居住，我还是更喜欢现代建筑，因为它们通常有更好的电梯、供暖和安全标准。比较好的办法是适应性再利用，比如把旧工厂改造成图书馆或社区中心。这样一来，建筑可以保留自己的故事，同时仍然服务于今天人们的生活。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-014",
    approach: "公园题可用童年与现在对比，再强调小而近的社区公园比遥远大公园更影响日常生活。",
    frames: [
      "As a child, I liked parks because ...",
      "Now I use them more for ...",
      "I’d like my city to have more ...",
      "Even a small park can ...",
    ],
    vocabulary: [
      { phrase: "public green space", translation: "公共绿地", note: "公园题准确表达" },
      { phrase: "within walking distance", translation: "步行可达", note: "BBC 袖珍公园核心角度" },
      { phrase: "community bonds", translation: "社区联系", note: "解释公共空间价值" },
      { phrase: "escape traffic noise", translation: "躲开交通噪音", note: "城市公园真实功能" },
      { phrase: "improve everyday wellbeing", translation: "改善日常幸福感", note: "高分观点表达" },
    ],
    answer: [
      "As a child, I liked parks because they were places to run around, ride a bike and play until I was tired. Now I use them more for walking, clearing my head and escaping traffic noise. I’d like my city to have more public green space within walking distance, not only one huge park that takes an hour to reach. Even a small park can improve everyday wellbeing if people actually use it. It can also strengthen community bonds, because neighbours meet there naturally instead of only seeing each other in lifts.",
    ],
    answerTranslation: [
      "小时候我喜欢公园，因为那里可以到处跑、骑自行车，一直玩到自己累了为止。现在我更多是把公园用来散步、放空头脑，以及躲开交通噪音。我希望我的城市能有更多步行可达的公共绿地，而不是只有一个需要花一小时才能到的大公园。如果人们真的经常使用，即使是一个小公园也能改善日常幸福感。它还可以加强社区联系，因为邻居们会在那里自然地见面，而不只是偶尔在电梯里碰到。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-015",
    approach: "音乐题用场景回答不同音乐喜好，再讲是否学过乐器。可以借鉴 BBC 关于音乐与记忆的角度。",
    frames: [
      "Music is part of my day, especially when ...",
      "I’m mostly into ..., but ...",
      "I did learn ... for a while, although ...",
      "What I like about music is that ...",
    ],
    vocabulary: [
      { phrase: "be into", translation: "喜欢；热衷于", note: "口语自然表达喜好" },
      { phrase: "background music", translation: "背景音乐", note: "日常场景常用" },
      { phrase: "bring back memories", translation: "唤起回忆", note: "BBC 音乐与记忆文章角度" },
      { phrase: "take piano lessons", translation: "上钢琴课", note: "回答是否学过音乐" },
      { phrase: "develop an ear for melody", translation: "培养旋律感", note: "解释学习音乐的收获" },
    ],
    answer: [
      "Music is part of my day, especially when I’m commuting or doing simple chores. I’m mostly into mellow pop and film soundtracks, but it depends on my mood. If I need to focus, I prefer quiet background music; if I’m walking outside, I like something more energetic. I did take piano lessons for a while as a child, although I can’t play well now. Still, it helped me develop an ear for melody. What I like most about music is that a familiar song can bring back memories almost immediately.",
    ],
    answerTranslation: [
      "音乐是我日常生活的一部分，尤其是在通勤或做一些简单家务的时候。我主要喜欢舒缓的流行音乐和电影原声，不过这取决于我的心情。如果我需要集中注意力，我会更喜欢安静的背景音乐；如果我在外面走路，我会喜欢更有活力一点的歌。我小时候确实上过一段时间钢琴课，虽然现在已经弹得不好了。不过它帮助我培养了一点旋律感。我最喜欢音乐的一点是，一首熟悉的歌几乎能立刻唤起回忆。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-016",
    approach: "数学题不要把自己说成天才或学渣。用“以前害怕—后来找到方法—现实作用”来回答，更自然也更完整。",
    frames: [
      "I wouldn’t say I’m naturally gifted at maths, but ...",
      "I started learning it properly when ...",
      "What helped me was ...",
      "I think maths is important because ...",
    ],
    vocabulary: [
      { phrase: "rocket science", translation: "高深难懂的事", note: "用否定句缓和数学难度" },
      { phrase: "do the math", translation: "算一算；核算一下", note: "BBC 词汇，生活化表达" },
      { phrase: "make progress in maths", translation: "数学取得进步", note: "适合学生口吻" },
      { phrase: "problem-solving skills", translation: "解决问题的能力", note: "解释数学价值" },
      { phrase: "stay on track", translation: "保持进度", note: "学习类通用表达" },
    ],
    answer: [
      "I wouldn’t say I’m naturally gifted at maths, but I don’t dislike it either. I started learning it properly in primary school, and at first it felt like rocket science because I was slow with word problems. What helped me was writing each step down instead of trying to solve everything in my head. I’m not top of the class, but I have made steady progress in maths. I think it is important because it trains problem-solving skills, and in daily life you still need to do the math when you compare prices or manage money.",
    ],
    answerTranslation: [
      "我不会说自己天生擅长数学，但我也并不讨厌它。我从小学开始正式学习数学，一开始应用题对我来说像很高深的东西，因为我做得比较慢。真正帮到我的是把每一步都写下来，而不是试图在脑子里直接解决所有问题。我不是班里最拔尖的学生，但我的数学一直在稳步进步。我认为数学很重要，因为它训练解决问题的能力，而且在日常生活中，当你比较价格或管理金钱时，仍然需要算一算。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-017",
    approach: "科学题用具体学科和体验回答。把科学从课本拉回生活，比如实验、博物馆和好奇心。",
    frames: [
      "I studied science at school, mainly ...",
      "The part I enjoyed most was ...",
      "Science museums appeal to me because ...",
      "For me, science is useful because ...",
    ],
    vocabulary: [
      { phrase: "carry out an experiment", translation: "做实验", note: "科学课核心表达" },
      { phrase: "spark curiosity", translation: "激发好奇心", note: "解释科学吸引力" },
      { phrase: "hands-on exhibits", translation: "可动手体验的展品", note: "适合科学博物馆" },
      { phrase: "get across difficult ideas", translation: "讲清楚难懂概念", note: "BBC 教学语境表达" },
      { phrase: "scientific thinking", translation: "科学思维", note: "总结科学价值" },
    ],
    answer: [
      "I studied science at school, mainly biology, chemistry and physics. I wasn’t brilliant at every topic, but I enjoyed the lessons where we could carry out an experiment instead of only copying notes. Science museums appeal to me for the same reason: the hands-on exhibits can get across difficult ideas in a simple way. I don’t visit them very often now, but when I do, they usually spark my curiosity. For me, science is useful because it teaches scientific thinking, so you learn to ask for evidence rather than believe the first explanation you hear.",
    ],
    answerTranslation: [
      "我在学校学过科学，主要是生物、化学和物理。我并不是每个主题都学得很出色，但我喜欢那些能做实验的课，而不是只抄笔记。科学博物馆吸引我的原因也类似：那些可以动手体验的展品能用简单方式讲清楚难懂的概念。我现在并不经常去科学博物馆，但每次去都会被激发出一些好奇心。对我来说，科学很有用，因为它教会人科学思维，让你学会寻找证据，而不是听到第一个解释就马上相信。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-018",
    approach: "老师题讲一个具体老师的教学方式和情感支持，不要只说 nice。最后说明是否保持联系即可。",
    frames: [
      "My favourite teacher was ...",
      "What I liked about her was that ...",
      "She helped me ... when ...",
      "We are not really in touch now, but ...",
    ],
    vocabulary: [
      { phrase: "motivate students", translation: "激励学生", note: "老师题核心表达" },
      { phrase: "be attentive", translation: "细心关注的", note: "描述好老师" },
      { phrase: "pastoral care", translation: "学生关怀", note: "BBC 教育语境词" },
      { phrase: "channel energy into learning", translation: "把精力引导到学习上", note: "讲教学能力" },
      { phrase: "make steady progress", translation: "稳步进步", note: "学生成长表达" },
    ],
    answer: [
      "My favourite teacher was my middle-school English teacher. What I liked about her was that she was strict but also very attentive. She didn’t just hand out grades; she explained why we made mistakes and how to improve. I remember she helped me prepare for a speech contest when I was nervous, and she managed to channel my energy into learning instead of panic. We are not really in touch now, apart from occasional messages during festivals, but I still remember her because she made me feel I could make steady progress.",
    ],
    answerTranslation: [
      "我最喜欢的老师是我初中的英语老师。我喜欢她的一点是，她很严格，但也非常细心。她并不是只发分数，而是会解释我们为什么犯错，以及该如何改进。我记得有一次我准备演讲比赛时特别紧张，她帮助我准备，并且成功把我的精力从慌乱引导到学习上。我们现在并不算经常联系，除了节日时偶尔发消息，但我仍然记得她，因为她让我觉得自己可以稳步进步。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-019",
    approach: "汽车题可以承认车程方便，但也讲堵车、环保和自己更喜欢当乘客。答案会比单纯说喜欢开车更真实。",
    frames: [
      "I enjoy car travel when ...",
      "I’d rather be the passenger because ...",
      "For daily commuting, I usually ...",
      "Cars are useful, but ...",
    ],
    vocabulary: [
      { phrase: "daily commute", translation: "日常通勤", note: "交通题高频" },
      { phrase: "public transport", translation: "公共交通", note: "和汽车形成对比" },
      { phrase: "fuel-efficient cars", translation: "节能省油的车", note: "BBC 汽车话题词汇" },
      { phrase: "car emissions", translation: "汽车排放", note: "环保角度" },
      { phrase: "keep an eye out for", translation: "留意", note: "驾驶安全表达" },
    ],
    answer: [
      "I enjoy car travel when the road is not too crowded, especially for short trips outside the city. I’d rather be the passenger because I can look out of the window, listen to a podcast or just relax. For my daily commute, though, I usually take public transport because parking is expensive and traffic can be tiring. Cars are useful, but I think cities should also take car emissions into account. If I buy a car in the future, I’d probably look for something fuel-efficient and easy to maintain.",
    ],
    answerTranslation: [
      "如果路上不太拥挤，我是喜欢坐车出行的，尤其是去城市周边短途旅行时。我更愿意当乘客，因为我可以看窗外、听播客，或者只是放松一下。不过日常通勤时，我通常会坐公共交通，因为停车很贵，而且堵车会让人很累。汽车确实有用，但我认为城市也应该考虑汽车排放问题。如果我将来买车，我可能会选择一辆节能省油、容易维护的车。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-020",
    approach: "早晨题先表明是否早起，再讲一个固定动作和早餐态度。用身体状态而不是空泛自律来回答。",
    frames: [
      "I’m not a natural morning person, but ...",
      "The first thing I usually do is ...",
      "A good breakfast can ...",
      "If I skip ..., I tend to ...",
    ],
    vocabulary: [
      { phrase: "morning person", translation: "早起型的人", note: "早晨题自然表达" },
      { phrase: "early morning pick-me-up", translation: "晨间提神饮品", note: "BBC 词汇表表达" },
      { phrase: "set me up for the day", translation: "让我为一天做好准备", note: "早餐题常用" },
      { phrase: "hit the snooze button", translation: "按掉贪睡按钮", note: "生活化细节" },
      { phrase: "perk up", translation: "提振精神", note: "描述早晨状态" },
    ],
    answer: [
      "I’m not a natural morning person, but I’m trying to become better at getting up early. The first thing I usually do is drink water and check my plan for the day. I do sometimes hit the snooze button, especially in winter, so an early morning pick-me-up like coffee helps me perk up. Breakfast is important for me as well. If I skip it, I get distracted before lunchtime. A simple breakfast, even just oats or eggs, can set me up for the day and make the morning feel less rushed.",
    ],
    answerTranslation: [
      "我并不是天生的早起型，但我正在努力让自己更擅长早起。我通常做的第一件事是喝水，然后看一下当天计划。我有时确实会按掉贪睡按钮，尤其是在冬天，所以像咖啡这样的晨间提神饮品能让我精神起来。早餐对我也很重要。如果不吃早餐，我到午饭前就容易分心。一顿简单的早餐，哪怕只是燕麦或鸡蛋，也能让我为一天做好准备，让早晨不那么匆忙。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-021",
    approach: "梦想题可以讲童年梦想的变化，再讲现在更现实的抱负。重点是成熟，不是夸大目标。",
    frames: [
      "When I was a child, I dreamed of ...",
      "As I got older, that dream changed because ...",
      "Now my ambition is more about ...",
      "I think ambition is healthy as long as ...",
    ],
    vocabulary: [
      { phrase: "dream of", translation: "梦想做某事", note: "基础但自然" },
      { phrase: "make it big", translation: "大获成功", note: "讲童年梦想很口语" },
      { phrase: "career path", translation: "职业道路", note: "现实抱负表达" },
      { phrase: "pipe dream", translation: "不切实际的空想", note: "区分梦想和幻想" },
      { phrase: "pursue a goal", translation: "追求目标", note: "抱负题可迁移" },
    ],
    answer: [
      "When I was a child, I dreamed of becoming a singer and making it big, mainly because I watched too many talent shows. As I got older, that dream changed because I realised enjoying music and building a career in it are not the same thing. Now my ambition is more about finding a career path where I can use my communication skills and keep learning. I do think I’m ambitious, but not in a reckless way. For me, ambition is healthy as long as it pushes you to pursue a goal without turning every plan into a pipe dream.",
    ],
    answerTranslation: [
      "我小时候梦想成为歌手并取得很大成功，主要是因为看了太多选秀节目。长大以后，这个梦想发生了变化，因为我意识到喜欢音乐和真正把它当作职业是两回事。现在我的抱负更多是找到一条能发挥沟通能力、同时不断学习的职业道路。我确实认为自己有上进心，但不是那种盲目冒进的类型。对我来说，抱负是健康的，只要它能推动你追求目标，而不是把每个计划都变成不切实际的空想。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-022",
    approach: "购物题用线上线下对比，再说比价习惯。不要把自己说成完全理性，承认偶尔冲动更自然。",
    frames: [
      "I do more shopping online because ...",
      "For some things, though, I prefer ...",
      "I usually compare prices before ...",
      "I try not to ..., unless ...",
    ],
    vocabulary: [
      { phrase: "online shopping", translation: "网购", note: "消费题基础词" },
      { phrase: "in-store shopping", translation: "实体店购物", note: "线上线下对比" },
      { phrase: "bargain hunting", translation: "淘便宜货", note: "BBC 词汇，学生口吻自然" },
      { phrase: "shopping impulse", translation: "购物冲动", note: "解释消费控制" },
      { phrase: "pay over the odds", translation: "花高价买", note: "比 expensive 更地道" },
    ],
    answer: [
      "I do more shopping online because it is convenient and saves time, especially for books, daily products and small gadgets. For clothes or shoes, though, I still prefer in-store shopping because I want to check the size and material. I usually compare prices before buying anything expensive, partly because I hate paying over the odds. I wouldn’t call myself obsessed with bargain hunting, but I do enjoy finding a sensible deal. I also try to control my shopping impulse by leaving things in the basket for a day before I pay.",
    ],
    answerTranslation: [
      "我现在更多是在网上购物，因为它很方便，也节省时间，尤其是买书、日用品和一些小电子产品时。不过如果是衣服或鞋子，我还是更喜欢去实体店，因为我想确认尺码和材质。买比较贵的东西之前，我通常会比较价格，部分原因是我不喜欢花高价买东西。我不会说自己特别沉迷于淘便宜货，但找到一个合理的优惠确实会让我开心。我也会通过把东西先放在购物车里一天再付款，来控制自己的购物冲动。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-023",
    approach: "晚间题用 morning/evening person 做对比，再讲晚上如何放松。不要和 morning routine 题重复太多。",
    frames: [
      "I’m more of an evening person because ...",
      "In the evening, I usually ...",
      "After a busy day, I need ...",
      "I try not to ..., otherwise ...",
    ],
    vocabulary: [
      { phrase: "evening person", translation: "夜晚更有精神的人", note: "直接回答偏好" },
      { phrase: "get a second wind", translation: "重新有精神", note: "BBC 文章常见生活表达" },
      { phrase: "wind down", translation: "放松下来", note: "晚间题核心" },
      { phrase: "a cosy evening", translation: "舒适的夜晚", note: "氛围表达" },
      { phrase: "decaf", translation: "低因咖啡", note: "晚上饮品自然细节" },
    ],
    answer: [
      "I’m more of an evening person because my brain usually works better after dinner. In the evening, I often get a second wind, so I can read, do some light study or plan the next day. After a busy day, though, I also need time to wind down, so a cosy evening for me might just mean a shower, decaf tea and a quiet playlist. I try not to scroll on my phone for too long, otherwise I sleep later than planned. Compared with mornings, evenings feel more flexible and less rushed.",
    ],
    answerTranslation: [
      "我更像是一个晚上更有精神的人，因为我的大脑通常在晚饭后运转得更好。晚上我经常会重新有精神，所以可以读书、做一点轻量学习，或者计划第二天。不过忙了一天之后，我也需要时间放松下来，所以对我来说，一个舒适的夜晚可能只是洗个澡、喝一杯低因茶，再放一张安静的歌单。我会尽量不刷手机太久，否则就会比计划睡得更晚。和早晨相比，晚上感觉更灵活，也没那么匆忙。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-024",
    approach: "晨间习惯题重点是顺序和稳定感。和 Morning time 区分开：这里讲具体动作流程。",
    frames: [
      "After waking up, I usually ...",
      "Then I ... before ...",
      "Breakfast is important because ...",
      "This routine helps me ...",
    ],
    vocabulary: [
      { phrase: "daily ritual", translation: "日常仪式", note: "晨间动作更有质感" },
      { phrase: "skincare routine", translation: "护肤流程", note: "BBC 词汇，适合早晨习惯" },
      { phrase: "set me up for the day", translation: "让我为一天做好准备", note: "早餐作用" },
      { phrase: "perk up", translation: "提振精神", note: "早晨状态" },
      { phrase: "a sense of control", translation: "掌控感", note: "解释固定流程价值" },
    ],
    answer: [
      "After waking up, I usually make my bed first, because it gives me a small sense of control. Then I wash my face, do a very simple skincare routine and check my messages before breakfast. Breakfast is important to me because it sets me up for the day; without it, I’m less patient and less focused. I don’t do anything dramatic like a five-kilometre run, but I may stretch for a few minutes to perk up. This routine is simple, but it stops the morning from becoming completely chaotic.",
    ],
    answerTranslation: [
      "起床后，我通常会先整理床铺，因为这会给我一点小小的掌控感。然后我会洗脸，做一个非常简单的护肤流程，再在早餐前查看消息。早餐对我来说很重要，因为它能让我为一天做好准备；如果不吃早餐，我会更没耐心，也更难集中注意力。我不会做什么很夸张的事，比如跑五公里，但可能会拉伸几分钟，让自己精神一点。这个流程很简单，但它能防止早晨变得完全混乱。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-025",
    approach: "香水题讲频率、场合和气味偏好。注意表达适度，不要说得像广告文案。",
    frames: [
      "I don’t wear perfume every day, but ...",
      "I prefer scents that are ...",
      "Strong perfume can be ...",
      "For me, scented things are nice when ...",
    ],
    vocabulary: [
      { phrase: "scent", translation: "香气", note: "BBC 词汇，替代 smell" },
      { phrase: "linger", translation: "萦绕；停留", note: "描述香味持续" },
      { phrase: "sensitivity to perfume", translation: "对香水敏感", note: "解释不喜欢浓香" },
      { phrase: "subtle", translation: "淡雅的", note: "香味偏好核心词" },
      { phrase: "overpowering", translation: "过于浓烈的", note: "描述负面感受" },
    ],
    answer: [
      "I don’t wear perfume every day, but I might use a little when I’m going out or attending something formal. I prefer scents that are subtle and clean, like citrus or tea, rather than anything too sweet. Strong perfume can be overpowering, especially in a lift or a small classroom, and some people have a sensitivity to perfume. I do like scented things at home, though, such as a mild candle or fresh laundry. A pleasant scent can linger in a room and make the space feel calmer, as long as it is not too strong.",
    ],
    answerTranslation: [
      "我并不是每天都喷香水，但如果要出门见人，或者参加比较正式的场合，我可能会用一点。我更喜欢淡雅、干净的香味，比如柑橘或茶香，而不是太甜的味道。浓烈的香水可能会让人觉得压迫，尤其是在电梯或小教室里，而且有些人对香水比较敏感。不过我确实喜欢家里有一些带香气的东西，比如温和的香薰蜡烛或刚洗好的衣物。令人舒服的香气可以在房间里停留，让空间更平静，只要它不要太浓。",
    ],
  },
  {
    partId: "part-2",
    questionId: "speaking-part-2-001",
    approach: "按“期待—落差—处理结果—感受”推进。重点不是抱怨，而是说明对方为什么没有解决问题。",
    frames: [
      "The experience that jumps to mind happened when ...",
      "What annoyed me wasn’t just ..., but the way ...",
      "I wasn’t expecting ..., I just wanted ...",
      "It left a bad taste in my mouth because ...",
    ],
    vocabulary: [
      { phrase: "a faulty product", translation: "有问题的产品", note: "投诉和售后题通用" },
      { phrase: "customer service", translation: "客服", note: "服务业核心词" },
      { phrase: "a canned reply", translation: "模板回复", note: "形容敷衍回复" },
      { phrase: "a full refund", translation: "全额退款", note: "投诉结果常用" },
      { phrase: "leave a bad taste in my mouth", translation: "留下很差印象", note: "自然表达不满" },
    ],
    answer: [
      "Well, the bad service that jumps to mind happened last year, when I bought a pair of wireless earphones from an online shop. The website looked pretty professional, and the delivery was quick, so at first I thought everything had gone smoothly.",
      "But when I opened the box, one earbud wouldn’t charge at all. I checked the cable, reset the case, watched a couple of troubleshooting videos, you know, the usual things people do before admitting the product is faulty. Then I contacted customer service and expected a simple exchange.",
      "What annoyed me wasn’t just the faulty product, but the way they handled the complaint. Every time I sent a message, a different person replied, and most of the answers sounded like canned replies. One person told me to read the returns policy; another asked me to send a video, which I had already done.",
      "In the end, after almost two weeks, they agreed to give me a full refund. To be honest, I wasn’t expecting royal treatment. I just wanted someone to say, ‘Sorry, we’ll sort this out.’ The experience left a bad taste in my mouth because the product problem was small, but the poor communication made it feel much worse.",
    ],
    answerTranslation: [
      "嗯，我最先想到的一次糟糕服务发生在去年，当时我从一家网店买了一副无线耳机。网站看起来很专业，送货也很快，所以一开始我以为整个过程都很顺利。",
      "但打开包装后，我发现其中一只耳机完全充不进电。我检查了充电线，重置了充电盒，还看了几个故障排查视频，你知道，就是人们在承认产品确实坏了之前通常会做的那些事。然后我联系了客服，本以为简单换货就可以了。",
      "让我恼火的不只是产品有问题，还有他们处理投诉的方式。每次我发消息，回复的都是不同的人，而且大多数答案听起来都像模板回复。一个人让我阅读退货政策，另一个人又让我发视频，可我明明已经发过了。",
      "最后，差不多过了两周，他们才同意给我全额退款。说实话，我并没有期待什么贵宾待遇。我只是希望有人能说一句：“抱歉，我们会把这件事处理好。”这次经历给我留下了很差的印象，因为产品本身的问题并不大，但糟糕的沟通让整件事变得严重得多。",
    ],
    audioUrl: "/speaking/audio/speaking-part-2-001.mp3",
  },
  {
    partId: "part-2",
    questionId: "speaking-part-2-002",
    approach: "不要只讲目的地。把车程讲活：出发、路上小插曲、风景、车内互动和最后感受。",
    frames: [
      "I’d like to talk about a car journey I took ...",
      "We set off ..., hoping to ...",
      "The best part was ...",
      "Looking back, it was memorable because ...",
    ],
    vocabulary: [
      { phrase: "set off", translation: "出发", note: "旅行故事开头常用" },
      { phrase: "take the scenic route", translation: "走风景好的路线", note: "比 drive there 更有画面" },
      { phrase: "get stuck in traffic", translation: "堵车", note: "车程题必备" },
      { phrase: "pull over", translation: "靠边停车", note: "描述路上动作" },
      { phrase: "a proper road trip", translation: "真正的公路旅行", note: "自然总结体验" },
    ],
    answer: [
      "I’d like to talk about a car journey I took with two close friends during a short holiday. We drove from Suzhou to a mountain area near Moganshan, which took about three and a half hours in total. The plan was simple: leave early, avoid the traffic and spend the weekend somewhere cooler and quieter.",
      "Of course, it didn’t go perfectly. We set off at seven in the morning, but still got stuck in traffic for nearly an hour outside the city. At first everyone was a bit grumpy, but then we put on an old playlist from university, and the mood changed completely. Once we got onto the smaller roads, the scenery became much better, with bamboo forests and little villages on both sides.",
      "The best part was when we pulled over near a viewpoint to take photos and buy snacks from a tiny roadside shop. It wasn’t planned at all, but it made the journey feel like a proper road trip rather than just transport from A to B.",
      "Looking back, I remember it because the car gave us time to talk properly. We weren’t rushing, and nobody was checking work messages every five minutes. The destination was lovely, but honestly, the journey itself was probably the most relaxing part of the trip.",
    ],
    answerTranslation: [
      "我想讲一次短假期间和两位好朋友一起经历的汽车旅行。我们从苏州开车前往莫干山附近的山区，全程大约三个半小时。计划很简单：早点出发、避开堵车，然后去一个更凉快、更安静的地方度过周末。",
      "当然，旅程并没有完全按计划进行。我们早上七点出发，但在出城时还是堵了将近一个小时。一开始大家都有点烦躁，不过后来我们播放了一张大学时期的老歌单，气氛一下子完全变了。驶入较窄的小路后，沿途景色也变得漂亮多了，两旁都是竹林和小村庄。",
      "最棒的一段是我们在一个观景点附近靠边停车，拍了些照片，还从路边的一家小店买了零食。这完全不在计划之中，却让这段旅程更像一次真正的公路旅行，而不只是从 A 点到 B 点的交通过程。",
      "现在回想起来，我之所以记得这段旅程，是因为坐在车里让我们有时间好好聊天。我们不赶时间，也没有人每隔五分钟就查看工作消息。目的地确实很美，但说实话，路上的这段时间大概才是整趟旅行中最让人放松的部分。",
    ],
    audioUrl: "/speaking/audio/speaking-part-2-002.mp3",
  },
  {
    partId: "part-2",
    questionId: "speaking-part-2-003",
    approach: "困难题避免空泛励志。讲清楚“难在哪里、怎么拆解、最后学到了什么”。",
    frames: [
      "The challenge I want to talk about was ...",
      "At first, I felt ... because ...",
      "What helped was breaking it into ...",
      "By the end, I realised that ...",
    ],
    vocabulary: [
      { phrase: "step out of my comfort zone", translation: "走出舒适区", note: "挑战题通用" },
      { phrase: "break it into smaller chunks", translation: "拆成小块", note: "解决问题很实用" },
      { phrase: "under pressure", translation: "在压力下", note: "解释困难程度" },
      { phrase: "ask for feedback", translation: "寻求反馈", note: "体现主动解决" },
      { phrase: "pull it off", translation: "成功完成", note: "口语感强" },
    ],
    answer: [
      "The challenge I want to talk about was giving a ten-minute presentation in English at university. It was part of a group project, but one teammate got sick two days before the deadline, so I had to cover most of the speaking part myself.",
      "At first, I felt really nervous because public speaking had never been my strength. On top of that, the topic was quite technical, and I was worried I would either forget key points or sound like I was reading from a script. I knew I had to step out of my comfort zone, but knowing that didn’t make it easier.",
      "What helped was breaking the task into smaller chunks. I wrote a simple outline, practised each section separately and asked a classmate to listen to me once. She pointed out that I was speaking too fast, so I added pauses after important ideas. I also prepared a few natural phrases like ‘What this basically means is...’ so I could explain the difficult parts more clearly.",
      "In the end, I pulled it off. It wasn’t perfect, but I didn’t freeze, and our teacher said the structure was clear. The experience taught me that confidence doesn’t appear magically; it often comes from preparation and getting through something under pressure.",
    ],
    answerTranslation: [
      "我想讲的挑战，是在大学里做一次十分钟的英语演讲。它原本是小组项目的一部分，但有位组员在截止日期前两天生病了，所以大部分演讲内容都得由我一个人完成。",
      "一开始我非常紧张，因为公开演讲从来都不是我的强项。除此以外，主题还很专业，我担心自己要么忘掉重点，要么听起来像在照着稿子念。我知道自己必须走出舒适区，但明白这一点并没有让事情变得更容易。",
      "真正帮到我的是把任务拆成更小的部分。我先写了一份简单提纲，分别练习每个部分，还请一位同学听我完整讲了一遍。她指出我的语速太快，于是我在重要观点后加了一些停顿。我还准备了几个很自然的表达，比如“What this basically means is...”，这样就能把比较难的内容解释得更清楚。",
      "最后，我成功完成了。整个过程并不完美，但我没有大脑一片空白，而且老师也说我的结构很清楚。这次经历让我明白，自信不会凭空出现；它往往来自充分准备，以及自己在压力下真正完成过一件事。",
    ],
    audioUrl: "/speaking/audio/speaking-part-2-003.mp3",
  },
  {
    partId: "part-2",
    questionId: "speaking-part-2-004",
    approach: "童年题要有声音、地点和规则。讲一个简单游戏，比硬讲复杂玩具更容易自然。",
    frames: [
      "A childhood game I remember clearly is ...",
      "We didn’t need much equipment; we just ...",
      "What made it fun was ...",
      "I suppose it taught me ... without me realising it.",
    ],
    vocabulary: [
      { phrase: "hide-and-seek", translation: "捉迷藏", note: "童年游戏基础词" },
      { phrase: "make up rules", translation: "自己编规则", note: "体现孩子气" },
      { phrase: "take turns", translation: "轮流", note: "游戏过程常用" },
      { phrase: "out of breath", translation: "气喘吁吁", note: "动作感强" },
      { phrase: "childhood memory", translation: "童年记忆", note: "自然收尾" },
    ],
    answer: [
      "A childhood game I remember clearly is hide-and-seek. I used to play it with kids from my neighbourhood after dinner, usually in the small open space between our apartment buildings. There wasn’t much there, just a few trees, benches and parked bikes, but for us it felt like a whole adventure playground.",
      "We didn’t need much equipment; we just made up rules as we went along. One person had to close their eyes and count to fifty, while the rest of us ran off to hide behind staircases, bushes or even behind our parents if they were chatting nearby. Sometimes the rules became slightly unfair, because someone would change the safe zone halfway through the game, and then everyone would start arguing.",
      "What made it fun was the excitement. You had to stay quiet, but you were also trying not to laugh. When someone shouted your name, you would run back to the safe spot, usually completely out of breath. It was simple, noisy and a bit chaotic, but in a good way.",
      "Looking back, I suppose it taught me how to take turns, read other people and deal with small disagreements without adults stepping in all the time. More than anything, it reminds me of a time when entertainment didn’t have to involve a screen.",
    ],
    answerTranslation: [
      "我记得最清楚的一种童年游戏是捉迷藏。小时候我经常在晚饭后和小区里的孩子一起玩，地点通常是几栋公寓楼之间的一小块空地。那里其实没什么，只有几棵树、几张长椅和一些停着的自行车，但对我们来说，它就像一整座冒险乐园。",
      "我们不需要什么器材，只是一边玩一边自己编规则。一个人要闭上眼睛数到五十，其他人则跑去藏在楼梯间、灌木丛后面；如果父母刚好在附近聊天，我们甚至会躲到他们身后。有时规则会变得有点不公平，因为有人会在游戏进行到一半时改变安全区，接着所有人就会争起来。",
      "它好玩的地方就在于那种紧张又兴奋的感觉。你必须保持安静，同时还得忍住不笑。有人喊出你的名字时，你就会冲回安全点，通常已经跑得气喘吁吁。这个游戏很简单、很吵，也有一点混乱，但那是一种让人开心的混乱。",
      "现在回想起来，我觉得它让我在不知不觉中学会了轮流、观察别人，也学会了在大人不总是介入的情况下处理小分歧。更重要的是，它让我想起了一个娱乐还不一定需要屏幕的年代。",
    ],
    audioUrl: "/speaking/audio/speaking-part-2-004.mp3",
  },
  {
    partId: "part-2",
    questionId: "speaking-part-2-005",
    approach: "这题不是讲糟糕服务，而是讲投诉被好好处理。重点放在对方如何回应、为什么恢复信任。",
    frames: [
      "I normally avoid complaining, but this time ...",
      "I explained the problem calmly and said ...",
      "To my surprise, they handled it really well.",
      "It restored my trust because ...",
    ],
    vocabulary: [
      { phrase: "raise the issue", translation: "提出问题", note: "比 complain 更温和" },
      { phrase: "handle it professionally", translation: "处理得专业", note: "满意投诉题核心" },
      { phrase: "offer a practical solution", translation: "给出实际解决方案", note: "解释满意原因" },
      { phrase: "a partial refund", translation: "部分退款", note: "售后结果常用" },
      { phrase: "restore my trust", translation: "恢复我的信任", note: "自然总结" },
    ],
    answer: [
      "I normally avoid complaining, but this time I had to raise the issue because the hotel room I booked was much noisier than expected. It happened during a weekend trip with my cousin. We had paid a bit extra for what was described as a quiet room, but it was right next to the lift, and we could hear people coming and going almost all night.",
      "The next morning, I went to the front desk and explained the problem calmly. I said I understood the hotel was busy, but the room didn’t match what had been advertised. I wasn’t angry; I just wanted a reasonable solution because we had one more night there.",
      "To my surprise, they handled it really well. The manager apologised straight away, checked the booking details and moved us to a room at the end of the corridor. She also offered a small partial refund, which I didn’t even ask for. More importantly, she didn’t make excuses or blame us for being sensitive.",
      "I was satisfied because the complaint was dealt with quickly and respectfully. The new room was much quieter, so we actually slept well the second night. It restored my trust in the hotel, because mistakes can happen, but the way a business responds says a lot about its service.",
    ],
    answerTranslation: [
      "我平时通常会避免投诉，但这一次不得不提出问题，因为我预订的酒店房间比预想中吵得多。这件事发生在我和表亲的一次周末旅行中。我们为了所谓的安静客房多付了一点钱，可房间正好紧挨着电梯，几乎整晚都能听到有人进进出出。",
      "第二天早上，我去了前台，平静地说明了问题。我说我理解酒店当时很忙，但这个房间和宣传描述并不相符。我并没有生气，只是因为我们还要再住一晚，所以希望得到一个合理的解决办法。",
      "令我意外的是，他们处理得非常好。经理立刻道了歉，核对预订信息后，把我们换到走廊尽头的一间房。她还主动给了我们一小笔部分退款，而这其实并不是我提出的要求。更重要的是，她没有找借口，也没有反过来指责我们太敏感。",
      "我感到满意，是因为这次投诉得到了迅速而且尊重人的处理。新房间安静多了，所以第二晚我们确实睡得很好。这件事也恢复了我对这家酒店的信任，因为错误难免会发生，但一家企业如何回应，能充分说明它的服务水平。",
    ],
    audioUrl: "/speaking/audio/speaking-part-2-005.mp3",
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-001",
    approach: "先讲便利，再讲代价。用“扩展了交流，但未必加深了关系”收束，逻辑清楚且不绝对。",
    frames: [
      "That’s incredibly useful, especially for ...",
      "On the practical side, ...",
      "The downside is that ...",
      "It has made ... easier, but not always ...",
    ],
    vocabulary: [
      { phrase: "instant communication", translation: "即时交流", note: "科技交流题通用" },
      { phrase: "voice notes", translation: "语音消息", note: "很生活化" },
      { phrase: "group chats", translation: "群聊", note: "例子自然" },
      { phrase: "read the tone", translation: "读懂语气", note: "解释误解" },
      { phrase: "at the expense of depth", translation: "以深度为代价", note: "观点句可迁移" },
    ],
    answer: [
      "Technology has made communication much faster and less tied to place. People can send a quick text, leave a voice note, jump into a group chat or have a video call with someone on the other side of the world. That’s incredibly useful, especially for families and teams who don’t live in the same city.",
      "The downside is that speed can come at the expense of depth. Because it’s so easy to fire off a message, people sometimes reply without thinking, and it’s harder to read tone through a screen. A short message like ‘fine’ can sound calm, cold or annoyed, depending on the context. So I’d say technology has made communication easier, but not always warmer or more meaningful.",
    ],
    answerTranslation: [
      "科技让沟通变得快得多，也不再那么受地点限制。人们可以快速发一条文字消息、留一段语音、加入群聊，或者和身处世界另一端的人进行视频通话。这非常实用，尤其适合那些不住在同一座城市的家人和团队。",
      "缺点是，速度有时是以交流深度为代价的。因为随手发一条消息太容易了，人们有时不经思考就回复，而且隔着屏幕也更难判断语气。像“fine”这样一条简短消息，根据语境不同，可能听起来平静、冷淡或不耐烦。所以我认为，科技确实让沟通更容易了，但沟通不一定因此变得更温暖或更有意义。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-002",
    approach: "不要一上来只表态。区分普通创作自由与商业、版权、署名透明度，论证会更成熟。",
    frames: [
      "I wouldn’t regulate every ..., but I would regulate ...",
      "The main issue is whether ...",
      "A sensible rule would be to ...",
      "That protects ..., without killing ...",
    ],
    vocabulary: [
      { phrase: "credit the original artists", translation: "标注原作者", note: "版权讨论常用" },
      { phrase: "commercial use", translation: "商业用途", note: "限定讨论范围" },
      { phrase: "be transparent about", translation: "对……透明", note: "监管题通用" },
      { phrase: "creative freedom", translation: "创作自由", note: "平衡观点用" },
      { phrase: "draw a clear line", translation: "划清界限", note: "规则类题可迁移" },
    ],
    answer: [
      "I wouldn’t regulate every piece of AI-generated art, because people should still have creative freedom to experiment. If someone uses AI to make a funny poster for personal use, that doesn’t need strict rules. The main issue is commercial use, especially when an AI tool has copied the style of living artists or used their work without permission.",
      "A sensible rule would be to make companies label AI-generated images clearly and be transparent about the data they use for training. If the work is sold, there should also be a way to credit or compensate original artists when their style is heavily used. That protects creators without killing innovation. So, well, regulation shouldn’t ban AI art; it should draw a clear line around honesty, ownership and money.",
    ],
    answerTranslation: [
      "我不会监管每一件由 AI 生成的艺术作品，因为人们仍然应该拥有尝试和探索的创作自由。如果有人只是用 AI 为自己制作一张有趣的海报，就没有必要受到严格规则的限制。真正的问题在于商业用途，尤其是当 AI 工具模仿了仍在世的艺术家的风格，或者未经允许使用了他们的作品时。",
      "比较合理的规定，是要求公司清楚标注 AI 生成的图片，并公开说明训练模型时使用的数据。如果作品被出售，而且大量使用了某位原作者的风格，也应该有相应方式为原作者署名或给予补偿。这样既能保护创作者，又不会扼杀创新。所以，嗯，监管不应该禁止 AI 艺术，而应该在诚信、所有权和经济利益方面划出清晰界限。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-003",
    approach: "承认社媒维持联系的好处，再指出浅层互动的问题。不要把社媒讲成纯坏事。",
    frames: [
      "It helps people stay in touch, especially when ...",
      "The problem is that ...",
      "You can know what someone is doing without really knowing ...",
      "So it widens ..., but it can weaken ...",
    ],
    vocabulary: [
      { phrase: "stay in touch", translation: "保持联系", note: "关系题基础表达" },
      { phrase: "surface-level interaction", translation: "浅层互动", note: "Part 3 很好用" },
      { phrase: "scroll past someone’s life", translation: "刷过别人的生活", note: "口语化且有画面" },
      { phrase: "genuine connection", translation: "真实连接", note: "关系质量核心词" },
      { phrase: "emotional support", translation: "情感支持", note: "讲深层关系" },
    ],
    answer: [
      "Social media has had a mixed impact on relationships. On the positive side, it helps people stay in touch, especially when friends or family members live far away. You can see updates, send quick messages and share small moments that would otherwise be missed. That can keep a relationship alive in a low-effort way.",
      "The problem is that low effort can also mean surface-level interaction. You might know where someone went for dinner, but not know whether they’re actually doing well. In other words, you can scroll past someone’s life without really connecting with them. So I’d say social media widens people’s networks, but it doesn’t automatically create genuine connection or emotional support.",
    ],
    answerTranslation: [
      "社交媒体对人际关系产生的影响有好有坏。从积极的一面来看，它能帮助人们保持联系，尤其是在朋友或家人住得很远时。你可以看到他们的动态、快速发消息，也能分享那些原本可能被错过的生活片段。这样只需花很少精力，就能让一段关系继续维持下去。",
      "问题在于，低投入也可能意味着互动只停留在表面。你也许知道某个人去了哪里吃晚饭，却不知道他真实的状态到底好不好。换句话说，你可以刷过一个人的生活，却没有真正和他建立联系。所以我认为，社交媒体扩大了人们的社交网络，但它不会自动带来真正的连接或情感支持。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-004",
    approach: "把“替代工作”和“替代任务”区分开，再讲高风险岗位、人类优势和再培训。",
    frames: [
      "It will probably replace tasks rather than whole professions.",
      "Jobs that involve ... are more at risk.",
      "Roles that require ... are harder to automate.",
      "The real challenge is not ..., but ...",
    ],
    vocabulary: [
      { phrase: "repetitive tasks", translation: "重复性任务", note: "AI 就业题核心词" },
      { phrase: "human judgement", translation: "人的判断", note: "讲不可替代性" },
      { phrase: "empathy", translation: "同理心", note: "医疗教育类岗位常用" },
      { phrase: "reskill workers", translation: "帮助劳动者学习新技能", note: "解决方案表达" },
      { phrase: "work alongside AI", translation: "和 AI 协同工作", note: "平衡结论" },
    ],
    answer: [
      "I think AI will probably replace specific tasks rather than whole professions. Jobs that involve repetitive tasks, like basic data entry, simple translation or standard customer service replies, are more at risk because the work follows clear patterns. In those areas, AI can be faster and cheaper.",
      "But roles that require empathy, human judgement or physical care are much harder to automate. A nurse, for example, does more than process medical information; they also comfort patients and notice small changes in behaviour. The real challenge is not whether AI exists, but whether workers are trained to work alongside it. If companies and governments help people reskill, AI could become a tool rather than just a threat.",
    ],
    answerTranslation: [
      "我认为 AI 更有可能取代某些具体任务，而不是整个职业。涉及重复性任务的工作风险更高，比如基础数据录入、简单翻译或标准化客服回复，因为这些工作都有明确规律。在这些领域，AI 可以做得更快，成本也更低。",
      "但是，需要同理心、人的判断或身体照护的岗位就难得多，很难实现自动化。比如护士所做的并不只是处理医疗信息，他们还会安慰病人，并留意患者行为上的细微变化。真正的挑战不在于 AI 是否存在，而在于劳动者有没有接受培训，学会与它协同工作。如果企业和政府能帮助人们学习新技能，AI 就可能成为一种工具，而不只是一种威胁。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-005",
    approach: "从传统养育转向情感支持和教育规划。注意平衡：更亲近是好事，但压力也更大。",
    frames: [
      "Parents today are expected to do more than ...",
      "In the past, ... whereas now ...",
      "That can be positive because ...",
      "The pressure, though, is that ...",
    ],
    vocabulary: [
      { phrase: "emotional support", translation: "情感支持", note: "父母角色核心词" },
      { phrase: "set boundaries", translation: "设定边界", note: "亲子关系常用" },
      { phrase: "academic pressure", translation: "学业压力", note: "教育类延伸" },
      { phrase: "be actively involved", translation: "积极参与", note: "描述现代父母" },
      { phrase: "overprotective", translation: "过度保护的", note: "讲负面影响" },
    ],
    answer: [
      "Parents today are expected to do more than provide food, safety and basic discipline. In the past, many parents were seen mainly as authority figures, whereas now they are also expected to offer emotional support, understand mental health issues and be actively involved in their children’s education.",
      "That can be positive because children may feel closer to their parents and more comfortable asking for help. The pressure, though, is that parents can become too involved. Some try to manage every exam, hobby and friendship, which may make children less independent. So I think the modern role of parents is more balanced but also more demanding: they need to be supportive without becoming overprotective, and friendly without forgetting to set boundaries.",
    ],
    answerTranslation: [
      "如今，人们对父母的期待已经不只是提供食物、安全保障和基本管教。过去，许多父母主要被看作权威人物；而现在，人们还期望他们提供情感支持、了解心理健康问题，并积极参与孩子的教育。",
      "这可能是件好事，因为孩子会觉得和父母更亲近，在需要帮助时也更愿意开口。不过压力在于，父母也可能参与得过多。有些父母试图管理孩子的每一场考试、每一种爱好和每一段友谊，这可能会让孩子变得不够独立。所以我认为，现代父母的角色更加平衡，但要求也更高：他们既要给予支持，又不能过度保护；既要和孩子友好相处，又不能忘记设定边界。",
    ],
  },
] satisfies SpeakingModelAnswer[];

const speakingModelAnswerByQuestionId = new Map(
  speakingModelAnswers.map((answer) => [answer.questionId, answer]),
);

const speakingScoreNotes: Record<SpeakingPartId, SpeakingScoreNote[]> = {
  "part-1": [
    { code: "FC", label: "流利与连贯", note: "先直接回答，再补一两个具体细节，结尾给感受。" },
    { code: "LR", label: "词汇资源", note: "使用生活化搭配，不堆难词，表达准确即可。" },
    { code: "GRA", label: "语法范围", note: "用 because、although、especially when 扩展短回答。" },
    { code: "P", label: "发音提示", note: "重读具体名词和态度词，语速保持自然。" },
  ],
  "part-2": [
    { code: "FC", label: "流利与连贯", note: "按时间线讲故事，用转折点和结果推进内容。" },
    { code: "LR", label: "词汇资源", note: "话题词要具体，但每段只放一两个亮点。" },
    { code: "GRA", label: "语法范围", note: "定语从句、原因从句和让步句自然穿插。" },
    { code: "P", label: "发音提示", note: "段落之间短暂停顿，关键词重读即可。" },
  ],
  "part-3": [
    { code: "FC", label: "流利与连贯", note: "观点、解释、例子、让步形成完整讨论。" },
    { code: "LR", label: "词汇资源", note: "用可迁移表达处理抽象问题，避免背定义。" },
    { code: "GRA", label: "语法范围", note: "用 while、whereas、rather than 呈现对比。" },
    { code: "P", label: "发音提示", note: "观点句慢一点，例子部分自然加速。" },
  ],
};

export function getSpeakingModelAnswer(questionId: string) {
  return speakingModelAnswerByQuestionId.get(questionId);
}

export function getSpeakingScoreNotes(partId: SpeakingPartId) {
  return speakingScoreNotes[partId];
}

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
    partId: "part-1",
    questionId: "speaking-part-1-026",
    approach: "整洁题不要只说 yes/no。先承认现在比小时候整洁，再用房间或书桌细节说明整洁如何影响学习状态。",
    frames: [
      "I’m fairly tidy now, although ...",
      "When I was a child, my room was ...",
      "What changed was that ...",
      "A tidy space helps me ...",
    ],
    vocabulary: [
      { phrase: "tidying up", translation: "整理收纳", note: "BBC 生活类文章常用表达" },
      { phrase: "cluttered", translation: "杂乱的", note: "比 messy 更准确" },
      { phrase: "declutter", translation: "清理杂物", note: "讲改变习惯很自然" },
      { phrase: "living space", translation: "居住空间", note: "描述房间和家庭环境" },
      { phrase: "workspace", translation: "学习或工作区域", note: "把整洁和效率联系起来" },
    ],
    answer: [
      "I’m fairly tidy now, although I wouldn’t say I’m obsessive about it. I try to do a bit of tidying up every evening, especially around my desk, because a cluttered workspace makes it harder for me to focus. When I was a child, my room was definitely messier. I used to leave toys, books and clothes everywhere until my parents complained. What changed was that I realised a tidy living space actually gives me a calmer mind. Now I declutter regularly, not because I love cleaning, but because it saves time and makes my room feel easier to live in.",
    ],
    answerTranslation: [
      "我现在算是比较整洁的人，不过我不会说自己有洁癖。我通常每天晚上会简单整理一下，尤其是书桌周围，因为杂乱的学习区域会让我更难集中注意力。小时候我的房间确实乱得多。我以前会把玩具、书和衣服到处乱放，直到父母开始抱怨。后来我改变，是因为我发现整洁的居住空间真的会让头脑更平静。现在我会定期清理杂物，不是因为我特别喜欢打扫，而是因为这样能节省时间，也让房间住起来更舒服。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-027",
    approach: "时间管理题要体现学生真实感：不是完美自律，而是用简单计划和缓冲时间避免拖延。",
    frames: [
      "I’m reasonably good at managing time, especially when ...",
      "I usually plan my day by ...",
      "The main thing I try to avoid is ...",
      "If the clock is ticking, I ...",
    ],
    vocabulary: [
      { phrase: "deadline", translation: "截止日期", note: "学习和工作通用" },
      { phrase: "procrastinate", translation: "拖延", note: "时间管理高频词" },
      { phrase: "time to spare", translation: "还有富余时间", note: "解释提前完成" },
      { phrase: "underestimate", translation: "低估", note: "说明计划失误原因" },
      { phrase: "knuckle down", translation: "开始认真做事", note: "BBC 口语短语，适合学生口吻" },
    ],
    answer: [
      "I’m reasonably good at managing time, especially when there is a clear deadline. I usually plan my day by writing down three main tasks, not a huge to-do list, because long lists just make me anxious. The main thing I try to avoid is procrastinating until the clock is ticking. In the past, I often underestimated how long reading or writing would take, so I ended up rushing. Now I leave some time to spare and do the difficult task first if possible. I’m not perfectly disciplined, but once I knuckle down, I can usually stay focused for a decent stretch of time.",
    ],
    answerTranslation: [
      "我时间管理还算不错，尤其是在截止日期很明确的时候。我通常会通过写下三件主要任务来安排一天，而不是列一长串待办事项，因为太长的清单只会让我焦虑。我最想避免的是一直拖延到时间很紧迫的时候。以前我经常低估阅读或写作需要多久，所以最后总是很赶。现在我会留出一点富余时间，并且尽量先做最难的任务。我并不是特别自律的人，但一旦开始认真做事，通常可以在一段时间内保持专注。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-028",
    approach: "手表题可区分普通手表、智能手表和手机看时间。答案重点是实用性，不必硬说手表很重要。",
    frames: [
      "I don’t wear a watch every day because ...",
      "If I do wear one, it’s usually ...",
      "A watch is useful when ...",
      "For me, it is more ... than ...",
    ],
    vocabulary: [
      { phrase: "wearable tech", translation: "可穿戴科技", note: "讲智能手表很贴切" },
      { phrase: "smartwatch", translation: "智能手表", note: "手表题现代化表达" },
      { phrase: "keep track of time", translation: "掌握时间", note: "基础但自然" },
      { phrase: "status symbol", translation: "身份或品味象征", note: "解释高端手表" },
      { phrase: "bang on time", translation: "非常准时", note: "BBC 口语短语" },
    ],
    answer: [
      "I don’t wear a watch every day because I can easily keep track of time on my phone. But if I do wear one, it’s usually a simple watch rather than a very expensive one. I can see why smartwatches and wearable tech are popular, since they count steps, show messages and help people check the time without pulling out a phone. Still, for me, a watch is more of a practical tool than a status symbol. It is useful in exams, meetings or interviews, because checking a watch looks less rude than checking a phone, and it helps me be bang on time.",
    ],
    answerTranslation: [
      "我不是每天都戴手表，因为用手机也能很方便地看时间。但如果我戴，一般会戴一块简单的手表，而不是特别贵的那种。我能理解为什么智能手表和可穿戴科技很受欢迎，因为它们可以计步、显示消息，也能让人不用掏手机就看时间。不过对我来说，手表更像是实用工具，而不是身份或品味的象征。它在考试、会议或面试中很有用，因为看手表比看手机显得没那么没礼貌，而且能帮助我保持准时。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-029",
    approach: "礼物题用“用心大于价格”展开，再比较手工和购买礼物，最后说选礼物要考虑对方真正需要什么。",
    frames: [
      "I do like giving gifts, especially when ...",
      "A good gift doesn’t have to ...",
      "Handmade gifts feel ..., while store-bought gifts can be ...",
      "When choosing a gift, I usually think about ...",
    ],
    vocabulary: [
      { phrase: "thoughtful gift", translation: "用心的礼物", note: "礼物题核心" },
      { phrase: "sentimental value", translation: "情感价值", note: "解释礼物意义" },
      { phrase: "homemade craft", translation: "手工制作的小物件", note: "比较 handmade" },
      { phrase: "present budget", translation: "礼物预算", note: "讲现实考虑" },
      { phrase: "don’t cost the earth", translation: "不需要花很多钱", note: "BBC 自然短语" },
    ],
    answer: [
      "I do like giving gifts, especially when I know the person well. A good gift doesn’t have to cost the earth; it just needs to feel thoughtful. For close friends, I might choose something with sentimental value, like a photo book or a small homemade craft, because it shows I spent time on it. For classmates or colleagues, a store-bought gift is usually safer and more practical. When choosing a gift, I think about the person’s taste, whether they will actually use it, and my present budget. I’d rather give something small but suitable than something expensive that feels random.",
    ],
    answerTranslation: [
      "我确实喜欢送礼物，尤其是当我很了解对方的时候。一份好的礼物不一定要花很多钱，只要能让人感觉到用心就可以。对于亲近的朋友，我可能会选择有情感价值的东西，比如一本照片书，或者一个小手工，因为这能说明我花了时间。对于同学或同事，买来的礼物通常更稳妥，也更实用。选礼物时，我会考虑对方的喜好、他们是否真的会用到，以及我的礼物预算。我宁愿送一件小但合适的东西，也不想送一件昂贵却很随意的礼物。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-030",
    approach: "笑话和喜剧题可以承认自己不擅长讲笑话，但喜欢自然幽默；强调幽默要看场合，避免冒犯。",
    frames: [
      "I’m not brilliant at telling jokes, but ...",
      "The kind of humour I like is ...",
      "Comedies help me ...",
      "I think jokes should be ..., not ...",
    ],
    vocabulary: [
      { phrase: "sense of humour", translation: "幽默感", note: "话题基础词" },
      { phrase: "lighten the mood", translation: "缓和气氛", note: "解释笑话作用" },
      { phrase: "break the ice", translation: "打破尴尬", note: "社交场景常用" },
      { phrase: "tickle my funny bone", translation: "让我觉得好笑", note: "BBC 口语表达" },
      { phrase: "offensive", translation: "冒犯性的", note: "说明幽默边界" },
    ],
    answer: [
      "I’m not brilliant at telling prepared jokes, because I usually forget the punchline or deliver it in a flat way. But I do have a sense of humour, and I prefer spontaneous comments that lighten the mood. Sometimes a small joke can break the ice in a group, especially when people feel awkward at first. I watch comedies from time to time, usually after a stressful day, because they help me switch off. What really tickles my funny bone is everyday humour, not jokes that are offensive or make fun of someone personally. Good comedy should feel clever and warm, not cruel.",
    ],
    answerTranslation: [
      "我并不擅长讲那种提前准备好的笑话，因为我通常会忘记包袱，或者讲出来很平。我确实有幽默感，但我更喜欢自然冒出来的评论，可以缓和气氛。有时候一个小笑话能在群体里打破尴尬，尤其是大家一开始不太熟的时候。我偶尔会看喜剧，通常是在压力很大的一天之后，因为它能让我放松下来。真正让我觉得好笑的是日常生活里的幽默，而不是冒犯别人或拿别人开涮的笑话。好的喜剧应该聪明又温暖，而不是刻薄。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-031",
    approach: "微笑题可讲频率、对象和场合。重点区分真诚微笑和礼貌性微笑，答案会更成熟。",
    frames: [
      "I smile quite often when ...",
      "With strangers, I usually smile if ...",
      "A genuine smile can ...",
      "A forced smile, however, may ...",
    ],
    vocabulary: [
      { phrase: "genuine smile", translation: "真诚的微笑", note: "区分自然与假笑" },
      { phrase: "facial expression", translation: "面部表情", note: "描述非语言交流" },
      { phrase: "body language", translation: "肢体语言", note: "社交题通用" },
      { phrase: "put someone at ease", translation: "让某人放松", note: "解释微笑作用" },
      { phrase: "forced smile", translation: "勉强的笑", note: "讲不自然的情况" },
    ],
    answer: [
      "I smile quite often when I’m with friends or family, because I feel relaxed around them. With strangers, I usually smile in small situations, like when I thank a cashier, hold the lift for someone or ask for directions. I think a genuine smile is a powerful facial expression; it can put people at ease without saying very much. But I don’t think people should smile all the time just to look friendly. A forced smile can feel uncomfortable, and sometimes people smile only because social situations require it. So for me, smiling is best when it is polite but still natural.",
    ],
    answerTranslation: [
      "和朋友或家人在一起时，我笑得比较多，因为和他们相处我很放松。面对陌生人时，我通常会在一些小场景里微笑，比如感谢收银员、帮别人按住电梯，或者问路的时候。我觉得真诚的微笑是一种很有力量的面部表情，不用说太多话就能让别人放松。但我不认为人应该为了显得友好而一直微笑。勉强的笑会让人觉得不自在，而且有时候人们只是因为社交场合需要才笑。所以对我来说，微笑最好既礼貌，又自然。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-032",
    approach: "社交媒体题讲具体平台、用途和自控。高分关键是承认便利，同时点出 screen time、FOMO 和隐私问题。",
    frames: [
      "The platforms I use most are ...",
      "I mainly use social media to ...",
      "The downside is that ...",
      "To control my screen time, I ...",
    ],
    vocabulary: [
      { phrase: "social media", translation: "社交媒体", note: "话题关键词" },
      { phrase: "screen time", translation: "屏幕使用时间", note: "讲过度使用" },
      { phrase: "digital detox", translation: "数字排毒；短暂远离电子设备", note: "BBC 科技生活表达" },
      { phrase: "FOMO", translation: "错失恐惧", note: "解释为什么容易一直刷" },
      { phrase: "oversharing", translation: "过度分享", note: "讲社交媒体边界" },
    ],
    answer: [
      "The platforms I use most are WeChat and a couple of short-video or lifestyle apps. I mainly use social media to keep in touch with friends, read quick updates and sometimes look for restaurant or study recommendations. The downside is that the content is designed to be addictive, so my screen time can easily go up without me noticing. I also think FOMO is a real problem, because people feel they must check everything immediately. I’m trying to do a small digital detox at night by putting my phone away before bed. I still like social media, but I’m more careful about oversharing and wasting time on it.",
    ],
    answerTranslation: [
      "我最常用的平台是微信，还有几个短视频或生活方式类应用。我主要用社交媒体和朋友保持联系，看看快速更新，有时也会搜索餐厅或学习方面的推荐。缺点是这些内容本来就设计得很容易让人上瘾，所以我的屏幕使用时间可能会在不知不觉中增加。我也觉得错失恐惧是个真实的问题，因为人们会觉得所有东西都必须马上查看。我现在尝试在晚上做一点数字排毒，睡前把手机放远一点。我仍然喜欢社交媒体，但会更注意不要过度分享，也不要在上面浪费太多时间。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-033",
    approach: "耳机题先说使用场景，再讲安全和礼貌限制。这样答案不只是物品描述，而有观点。",
    frames: [
      "I use headphones quite a lot, especially when ...",
      "They help me ...",
      "However, people shouldn’t use them when ...",
      "I also try to keep the volume ...",
    ],
    vocabulary: [
      { phrase: "headphones", translation: "耳机", note: "题目关键词" },
      { phrase: "podcast", translation: "播客", note: "通勤和学习场景自然" },
      { phrase: "wireless", translation: "无线的", note: "现代耳机常用" },
      { phrase: "sensible volume", translation: "合理音量", note: "BBC 健康建议表达" },
      { phrase: "ringing sensation", translation: "耳鸣感", note: "讲音量过大后果" },
    ],
    answer: [
      "I use headphones quite a lot, especially on the metro or when I’m studying in a noisy place. I usually listen to music, a podcast or an English programme, and wireless headphones make that very convenient. They help me create a small private space, even when I’m surrounded by people. However, I don’t think people should use headphones when they are crossing the road, cycling or having a face-to-face conversation, because it can be unsafe or rude. I also try to keep the volume at a sensible level. If I hear a ringing sensation afterwards, that’s a sign I’ve listened for too long or too loudly.",
    ],
    answerTranslation: [
      "我用耳机挺多的，尤其是在地铁上，或者在比较吵的地方学习时。我通常会听音乐、播客或英语节目，无线耳机让这些事情变得很方便。它们能帮我创造出一个小小的私人空间，即使周围都是人。不过我不认为人们在过马路、骑车或面对面聊天时应该戴耳机，因为这可能不安全，也可能显得没礼貌。我也会尽量把音量控制在合理范围内。如果听完之后有耳鸣的感觉，那就说明我听得太久或太大声了。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-034",
    approach: "打字题要比较 typing 和 handwriting。用学习场景解释：打字快，手写更有记忆和思考感。",
    frames: [
      "I type quite a lot because ...",
      "Typing is faster when ...",
      "Handwriting feels better for ...",
      "So I choose between them depending on ...",
    ],
    vocabulary: [
      { phrase: "keyboard", translation: "键盘", note: "打字基础词" },
      { phrase: "handwriting", translation: "手写", note: "对比 typing" },
      { phrase: "make a note of", translation: "记下", note: "学习和工作通用" },
      { phrase: "tactile feedback", translation: "触觉反馈", note: "BBC 学习类表达" },
      { phrase: "cognitive engagement", translation: "认知投入", note: "解释手写帮助思考" },
    ],
    answer: [
      "I type quite a lot because most of my messages, assignments and notes are now on a phone or laptop. Typing on a keyboard is definitely faster when I need to organise information, edit a paragraph or send something quickly. But I still prefer handwriting when I’m trying to remember ideas or make a note of something important. The tactile feedback of writing by hand makes me slow down a little, and that actually improves my cognitive engagement. So I don’t think one is always better than the other. I type for efficiency, but I write by hand when I want to think more carefully.",
    ],
    answerTranslation: [
      "我打字挺多的，因为现在大多数消息、作业和笔记都在手机或电脑上完成。当我需要整理信息、修改段落或快速发送内容时，用键盘打字肯定更快。但如果我想记住一些想法，或者记下重要内容，我仍然更喜欢手写。手写带来的触觉反馈会让我稍微慢下来，而这反而能提高我的认知投入。所以我不觉得两者一定谁更好。我为了效率会打字，但当我想更认真地思考时，会选择手写。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-035",
    approach: "网站题讲常去网站类型，不要报太多品牌。再补充国内流行网站和隐私意识，显得观点完整。",
    frames: [
      "The websites I visit most often are ...",
      "I use them mainly to ...",
      "In my country, people often use websites or apps for ...",
      "One thing I’m more aware of now is ...",
    ],
    vocabulary: [
      { phrase: "browse", translation: "浏览", note: "网站题高频动词" },
      { phrase: "platform", translation: "平台", note: "比 website 更宽泛" },
      { phrase: "track your activity", translation: "追踪你的行为", note: "讲网络隐私" },
      { phrase: "privacy", translation: "隐私", note: "科技话题高分点" },
      { phrase: "subscription", translation: "订阅", note: "视频、学习网站常用" },
    ],
    answer: [
      "The websites I visit most often are probably search engines, online dictionaries, video platforms and a few shopping sites. I use them mainly to look up information, watch lessons, compare products and browse reviews before buying anything. In my country, people often use websites or apps for almost everything, from ordering food to booking tickets, although many services have moved from websites to mobile platforms. One thing I’m more aware of now is privacy. Some websites track your activity very closely, and some keep pushing subscriptions or adverts. So I try not to sign up for every site unless I really need it.",
    ],
    answerTranslation: [
      "我最常访问的网站大概是搜索引擎、在线词典、视频平台和一些购物网站。我主要用它们查信息、看课程、比较产品，并且在买东西前浏览评论。在我的国家，人们经常通过网站或应用处理几乎所有事情，从点外卖到订票都可以，不过很多服务已经从网页转移到了手机平台。现在我更注意的一点是隐私。有些网站会非常仔细地追踪你的行为，还有些会不停推送订阅或广告。所以除非真的需要，我尽量不会随便注册每一个网站。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-036",
    approach: "外太空题可把科幻兴趣和真实太空旅行分开。喜欢想象，但对风险保持现实态度。",
    frames: [
      "I do enjoy sci-fi movies, especially when ...",
      "What interests me about space is ...",
      "Going to space sounds ..., but ...",
      "For now, I’d rather ...",
    ],
    vocabulary: [
      { phrase: "sci-fi", translation: "科幻的", note: "题目原词，口语自然" },
      { phrase: "space exploration", translation: "太空探索", note: "拓展观点" },
      { phrase: "astronaut", translation: "宇航员", note: "讲职业和旅行" },
      { phrase: "float in space", translation: "在太空中漂浮", note: "有画面感" },
      { phrase: "out of reach", translation: "遥不可及", note: "表达现实距离" },
    ],
    answer: [
      "I do enjoy sci-fi movies, especially when they are not just about explosions but also about human choices and imagination. What interests me about space is how huge and mysterious it is. Looking at stars can make everyday problems feel smaller, in a good way. Going to space sounds amazing in theory, because it would be unforgettable to float in space and see the Earth from far away. But realistically, I’m not sure I’d want to do it. The training, the cost and the risks are all quite serious. For now, space exploration is fascinating to read about, but actual space travel feels out of reach for me.",
    ],
    answerTranslation: [
      "我确实喜欢科幻电影，尤其是那些不只是爆炸场面，而是关于人类选择和想象力的作品。我对太空感兴趣，是因为它巨大又神秘。看星星会让日常生活中的问题显得小一点，而且是以一种积极的方式。理论上来说，去太空听起来很不可思议，因为在太空中漂浮、从远处看地球一定会让人难忘。但现实一点说，我不确定自己真的想去。训练、费用和风险都相当严肃。对我来说，现在阅读太空探索很有趣，但真正的太空旅行仍然有点遥不可及。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-037",
    approach: "激励人物题不要说得像作文。用一个身边人、一个具体品质和一个真实影响来回答。",
    frames: [
      "The person who inspires me most is ...",
      "What I admire about him/her is ...",
      "He/She has shown me that ...",
      "Because of that, I try to ...",
    ],
    vocabulary: [
      { phrase: "role model", translation: "榜样", note: "人物题核心表达" },
      { phrase: "work ethic", translation: "职业/学习态度", note: "解释为什么佩服" },
      { phrase: "resilience", translation: "韧性", note: "BBC 常见品质词" },
      { phrase: "stay grounded", translation: "保持踏实", note: "描述成熟性格" },
      { phrase: "look up to", translation: "敬佩", note: "自然口语动词短语" },
    ],
    answer: [
      "The person who inspires me most is my older cousin. She is not famous, but she is a real role model for me because of her work ethic and resilience. When she was preparing for an important exam, she failed once, but she didn’t complain or give up. She changed her plan, asked for feedback and kept going quietly. What I admire most is that she stays grounded even when she does well. Because of her, I try to be more patient with long-term goals instead of expecting quick results. I look up to her because she makes discipline seem practical, not dramatic.",
    ],
    answerTranslation: [
      "最激励我的人是我的表姐。她并不出名，但对我来说她是真正的榜样，因为她有很强的学习态度和韧性。她准备一个重要考试的时候曾经失败过一次，但她没有抱怨，也没有放弃。她调整了计划，主动寻求反馈，然后安静地继续努力。我最佩服的是，即使她做得很好，也仍然很踏实。受她影响，我会尽量对长期目标更有耐心，而不是总期待快速见效。我敬佩她，是因为她让自律看起来很实际，而不是很夸张。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-038",
    approach: "家人朋友偏好题用分场景回答。不要绝对化，说明情感支持和日常放松的不同作用。",
    frames: [
      "It depends on the situation, but ...",
      "With my family, I can ...",
      "With friends, I usually ...",
      "So I need both, just in different ways.",
    ],
    vocabulary: [
      { phrase: "quality time", translation: "高质量相处时间", note: "家庭朋友题通用" },
      { phrase: "social circle", translation: "社交圈", note: "描述朋友群" },
      { phrase: "emotional support", translation: "情感支持", note: "解释家人作用" },
      { phrase: "catch up with", translation: "和某人叙旧/聊近况", note: "朋友场景自然" },
      { phrase: "shared history", translation: "共同经历", note: "解释亲密感" },
    ],
    answer: [
      "It depends on the situation, but if I had to choose, I probably spend more relaxed quality time with my friends. We are in a similar stage of life, so it is easy to catch up with them about study, work pressure or small daily problems. That said, my family gives me a kind of emotional support that my social circle can’t fully replace. With my family, there is a lot of shared history, so I don’t have to explain everything from the beginning. I think I need both. Friends make life lighter, while family makes me feel more secure.",
    ],
    answerTranslation: [
      "这要看具体情况，但如果一定要选，我可能和朋友在一起时更放松。我们处在人生中比较相似的阶段，所以很容易聊学习、工作压力或日常小问题。不过，家人给我的情感支持是我的社交圈无法完全替代的。和家人在一起时，我们有很多共同经历，所以我不用从头解释每件事。我觉得两者都需要。朋友让生活变得轻松，而家人让我更有安全感。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-039",
    approach: "建议题要说向谁求助、为什么信任、建议如何帮你厘清问题。用具体对象比泛泛回答更自然。",
    frames: [
      "When I need advice, I usually turn to ...",
      "I trust him/her because ...",
      "He/She doesn’t just tell me what to do; ...",
      "That helps me ...",
    ],
    vocabulary: [
      { phrase: "turn to someone", translation: "向某人求助", note: "建议题核心动词" },
      { phrase: "sound advice", translation: "可靠的建议", note: "比 good advice 更地道" },
      { phrase: "put things in perspective", translation: "帮人看清问题全貌", note: "BBC 常见表达" },
      { phrase: "dilemma", translation: "两难处境", note: "解释为什么需要建议" },
      { phrase: "trustworthy", translation: "值得信任的", note: "描述求助对象" },
    ],
    answer: [
      "When I need advice, I usually turn to my mother first. She is calm and trustworthy, and she gives sound advice without making me feel judged. If I’m facing a dilemma, she doesn’t just tell me what to do. She asks practical questions, like what I’m worried about and what the worst result might be. That really helps me put things in perspective. For study-related problems, I may also ask a teacher or a friend, but for personal decisions I prefer someone who knows my personality well. Advice is most useful when it helps me think clearly, not when it controls my choice.",
    ],
    answerTranslation: [
      "当我需要建议时，我通常会先向妈妈求助。她很冷静，也值得信任，而且她给的建议很可靠，不会让我觉得被评判。如果我处在两难的情况里，她不会直接告诉我该怎么做。她会问一些实际的问题，比如我到底担心什么，最坏的结果可能是什么。这真的能帮我看清问题全貌。学习方面的问题我也可能问老师或朋友，但涉及个人决定时，我更愿意问了解我性格的人。对我来说，好的建议不是控制我的选择，而是帮助我更清楚地思考。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-040",
    approach: "听音乐题可以讲频率、类型和作用。避免只列歌手，用情绪和场景把答案说活。",
    frames: [
      "Yes, I listen to music almost ...",
      "I usually choose music based on ...",
      "When I need to focus, I prefer ...",
      "For me, music is a way to ...",
    ],
    vocabulary: [
      { phrase: "unwind", translation: "放松下来", note: "音乐作用常用" },
      { phrase: "playlist", translation: "歌单", note: "现代听歌场景" },
      { phrase: "background music", translation: "背景音乐", note: "学习或做事时听" },
      { phrase: "lyrics", translation: "歌词", note: "讲音乐内容" },
      { phrase: "lift my mood", translation: "改善心情", note: "BBC 自然表达" },
    ],
    answer: [
      "Yes, I listen to music almost every day. I usually choose music based on my mood rather than one fixed style. If I’m travelling or walking alone, I like songs with clear lyrics because they keep me company. When I need to focus, I prefer soft background music without many words, otherwise I get distracted. Music helps me unwind after a busy day, and sometimes a familiar playlist can lift my mood very quickly. I wouldn’t say I’m an expert on music, but it is part of my daily routine, like a small emotional reset button.",
    ],
    answerTranslation: [
      "是的，我几乎每天都会听音乐。我通常会根据心情来选音乐，而不是固定听一种风格。如果我在路上或一个人散步，我喜欢歌词清楚的歌，因为它们有一种陪伴感。需要专注时，我更喜欢没有太多歌词的轻柔背景音乐，否则容易分心。音乐能帮助我在忙碌的一天后放松下来，有时候一张熟悉的歌单很快就能改善我的心情。我不会说自己是音乐专家，但它确实是我日常生活的一部分，像一个小小的情绪重置按钮。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-041",
    approach: "空闲时间题用真实低成本活动，不要堆很多爱好。重点讲它如何帮你恢复精力。",
    frames: [
      "In my free time, I usually ...",
      "It is not a very exciting hobby, but ...",
      "When I have more time, I might ...",
      "The main reason I enjoy it is ...",
    ],
    vocabulary: [
      { phrase: "downtime", translation: "休息时间", note: "比 free time 更自然" },
      { phrase: "recharge", translation: "恢复精力", note: "解释休闲作用" },
      { phrase: "go for a stroll", translation: "散步", note: "BBC 生活表达" },
      { phrase: "screen time", translation: "屏幕时间", note: "讲刷手机适度" },
      { phrase: "switch off", translation: "放空/暂时不想事情", note: "休闲题高频" },
    ],
    answer: [
      "In my free time, I usually go for a stroll, watch short videos or read something light. It is not a very exciting routine, but it helps me recharge. If I’ve had too much screen time during the day, walking outside is better because it gives my eyes and mind a break. When I have more downtime, I might meet a friend for coffee or go to the gym. The main reason I value free time is that it lets me switch off for a while. Without that kind of pause, I become less patient and less productive later.",
    ],
    answerTranslation: [
      "空闲时间里，我通常会散步、看短视频，或者读一点轻松的内容。这不是特别刺激的安排，但能帮我恢复精力。如果我白天屏幕时间太长，出门走走会更好，因为眼睛和大脑都能休息一下。如果休息时间更多，我可能会和朋友喝咖啡，或者去健身房。我重视空闲时间的主要原因是它能让我暂时放空一下。没有这种暂停，我之后会更没耐心，效率也会降低。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-042",
    approach: "城市乡村题用优缺点平衡。学生口吻可以说当前更适合城市，长期可能更向往乡村。",
    frames: [
      "At this stage of my life, I prefer ...",
      "The biggest advantage is ...",
      "However, I can see why some people like ...",
      "In the future, I might ...",
    ],
    vocabulary: [
      { phrase: "pace of life", translation: "生活节奏", note: "城市乡村对比核心" },
      { phrase: "amenities", translation: "生活设施", note: "城市便利" },
      { phrase: "greenery", translation: "绿植/绿化", note: "乡村或社区环境" },
      { phrase: "hustle and bustle", translation: "喧嚣忙碌", note: "BBC 城市表达" },
      { phrase: "peace and quiet", translation: "安静平和", note: "乡村优势" },
    ],
    answer: [
      "At this stage of my life, I prefer living in a city because it gives me easier access to schools, public transport and different amenities. The biggest advantage is convenience. I can buy things, meet friends or get medical help without travelling far. However, I can see why some people prefer the countryside. The pace of life is slower, there is more greenery, and people can enjoy real peace and quiet. The city’s hustle and bustle can be tiring, especially during rush hour. So for now, the city suits my study and work needs, but later I might want a quieter place.",
    ],
    answerTranslation: [
      "在人生目前这个阶段，我更喜欢住在城市里，因为学校、公共交通和各种生活设施都更容易接触到。最大的优势就是方便。我可以买东西、见朋友，或者获得医疗帮助，而不需要走很远。不过我也能理解为什么有些人更喜欢乡村。那里的生活节奏更慢，绿化更多，人们也能享受真正的安静和平和。城市的喧嚣忙碌有时会让人疲惫，尤其是在高峰期。所以现在城市更适合我的学习和工作需要，但以后我可能会想住在更安静的地方。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-043",
    approach: "放松地点题讲具体环境和感官感受。用一个常去地点，解释为什么它能让你清空大脑。",
    frames: [
      "A place I like to go to relax is ...",
      "I like it because ...",
      "When I’m there, I usually ...",
      "It helps me feel ...",
    ],
    vocabulary: [
      { phrase: "quiet corner", translation: "安静角落", note: "描述放松地点" },
      { phrase: "green space", translation: "绿色空间", note: "公园/自然场景" },
      { phrase: "clear my head", translation: "清空思绪", note: "BBC 常见表达" },
      { phrase: "sensory overload", translation: "感官过载", note: "解释为什么需要安静" },
      { phrase: "retreat", translation: "短暂避风港", note: "让地点更有质感" },
    ],
    answer: [
      "A place I like to go to relax is a small park near my home. It has a quiet corner with benches and trees, and it feels like a little green space away from traffic. When I’m there, I usually walk slowly, listen to music or just sit for ten minutes without checking my phone. It helps me clear my head, especially after a day full of messages, noise and sensory overload. I don’t need an expensive café or a long trip to relax. Sometimes a simple retreat close to home is enough to make me feel calmer and more balanced.",
    ],
    answerTranslation: [
      "我喜欢去放松的地方是家附近的一个小公园。那里有一个带长椅和树木的安静角落，感觉像是远离交通噪音的一小片绿色空间。我在那里的时候，通常会慢慢走路、听音乐，或者只是坐十分钟不看手机。它能帮我清空思绪，尤其是在一天充满消息、噪音和感官过载之后。我并不需要昂贵的咖啡馆或很远的旅行来放松。有时候，家附近一个简单的小避风港就足以让我更平静、更平衡。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-044",
    approach: "工作学习题按学生身份回答：专业、原因、感受、未来用途。保持具体但不泄露个人隐私。",
    frames: [
      "I’m currently a student, and I study ...",
      "I chose it because ...",
      "The challenging part is ...",
      "In the long run, I hope ...",
    ],
    vocabulary: [
      { phrase: "major in", translation: "主修", note: "学生身份核心" },
      { phrase: "coursework", translation: "课程作业", note: "学习细节" },
      { phrase: "career prospects", translation: "职业前景", note: "解释选择原因" },
      { phrase: "interdisciplinary", translation: "跨学科的", note: "BBC 教育类高分词" },
      { phrase: "rewarding", translation: "有收获的", note: "评价学习体验" },
    ],
    answer: [
      "I’m currently a student, and I major in a subject related to business and technology. I chose it because it feels practical, and the career prospects are quite broad. Some of the coursework is challenging, especially when I have to combine numbers, writing and teamwork in one project. But I also find it rewarding, because it trains me to think in a more interdisciplinary way. I don’t love every single class, to be honest, but I like the overall direction. In the long run, I hope what I’m studying can give me more flexibility when I start working.",
    ],
    answerTranslation: [
      "我目前是一名学生，主修和商业及科技相关的专业。我选择它是因为它比较实用，而且职业前景比较宽。一些课程作业挺有挑战性的，尤其是当一个项目里同时需要数据、写作和团队合作时。但我也觉得很有收获，因为它训练我用更跨学科的方式思考。说实话，我并不是喜欢每一门课，但我喜欢整体方向。从长远来看，我希望现在学的东西能让我以后开始工作时有更多选择和灵活性。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-045",
    approach: "独学还是共学题用任务类型区分：输入型独学，讨论型共学。这样比单选更真实。",
    frames: [
      "It depends on what I’m studying.",
      "If I need deep focus, I prefer ...",
      "If the task involves ideas, I like ...",
      "The key is to avoid ...",
    ],
    vocabulary: [
      { phrase: "study partner", translation: "学习搭子", note: "共学自然说法" },
      { phrase: "stay in the zone", translation: "保持专注状态", note: "BBC 学习表达" },
      { phrase: "bounce ideas off someone", translation: "和某人交流想法", note: "讨论型学习" },
      { phrase: "distraction", translation: "干扰", note: "解释独学优势" },
      { phrase: "accountable", translation: "有责任感/有人监督", note: "解释共学好处" },
    ],
    answer: [
      "It depends on what I’m studying. If I need deep focus, like reading a difficult article or writing an essay, I prefer studying alone because I can stay in the zone without too much distraction. But if the task involves ideas, I like studying with a good study partner. It is useful to bounce ideas off someone, and it also makes me feel more accountable. The problem is that group study can easily turn into chatting if people are not serious. So my ideal way is to prepare alone first, then discuss the difficult parts with others.",
    ],
    answerTranslation: [
      "这要看我在学什么。如果我需要深度专注，比如阅读一篇难文章或写一篇作文，我更喜欢独自学习，因为这样能保持专注状态，不会有太多干扰。但如果任务涉及想法，我喜欢和靠谱的学习搭子一起学。和别人交流想法很有用，而且也会让我更有责任感。问题是，如果大家不够认真，小组学习很容易变成聊天。所以我理想的方式是先自己准备，再和别人讨论难点。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-046",
    approach: "国家友好度题避免绝对化。用陌生人、服务场景和熟人圈三种层次来回答。",
    frames: [
      "In general, I think people are ...",
      "They may not always ..., but ...",
      "In daily life, I often notice ...",
      "So I’d describe them as ...",
    ],
    vocabulary: [
      { phrase: "approachable", translation: "容易接近的", note: "描述友好度" },
      { phrase: "community spirit", translation: "社区互助氛围", note: "社会类高分词" },
      { phrase: "lend a hand", translation: "帮忙", note: "口语自然短语" },
      { phrase: "reserved", translation: "内敛的", note: "平衡观点" },
      { phrase: "hospitality", translation: "好客", note: "文化类常用" },
    ],
    answer: [
      "In general, I think people in my country are friendly, but not always in a very obvious way. Some people can seem reserved at first, especially in big cities where everyone is busy. But in daily life, I often notice small examples of kindness, like neighbours lending a hand, strangers giving directions or shop owners being patient with older customers. In smaller communities, the community spirit can be quite strong. I wouldn’t say everyone is warm all the time, because that would be unrealistic, but I do think there is a basic sense of hospitality and willingness to help.",
    ],
    answerTranslation: [
      "总体来说，我觉得我们国家的人是友好的，但不一定总是表现得特别明显。有些人一开始可能显得比较内敛，尤其是在大城市里，大家都很忙。但在日常生活中，我经常能看到一些小小的善意，比如邻居帮忙、陌生人指路，或者店主耐心对待老年顾客。在小社区里，互助氛围会比较强。我不会说每个人一直都很热情，因为那不现实，但我确实觉得这里有一种基本的好客和愿意帮忙的意识。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-047",
    approach: "买礼物题和 Gifts 区分：这里重点回答购买频率、对象和预算，而不是泛讲礼物意义。",
    frames: [
      "I buy gifts for others from time to time, especially ...",
      "I don’t usually buy anything too ...",
      "Before buying, I think about ...",
      "For me, the best gift is ...",
    ],
    vocabulary: [
      { phrase: "from time to time", translation: "偶尔", note: "频率表达自然" },
      { phrase: "thoughtful", translation: "用心的", note: "礼物题核心形容词" },
      { phrase: "within my budget", translation: "在预算范围内", note: "学生口吻真实" },
      { phrase: "wrap up", translation: "包装", note: "送礼动作" },
      { phrase: "practical use", translation: "实际用途", note: "解释选择标准" },
    ],
    answer: [
      "I buy gifts for others from time to time, especially for birthdays or important festivals. As a student, I don’t usually buy anything too expensive, so I try to choose something thoughtful and within my budget. Before buying a gift, I think about whether the person will actually use it, not just whether it looks nice. For example, I might buy a notebook, a small plant or a snack they like, then wrap it up neatly. For me, the best gift has some practical use but also shows that I know the person well. Price matters less than suitability.",
    ],
    answerTranslation: [
      "我偶尔会给别人买礼物，尤其是在生日或重要节日的时候。作为学生，我通常不会买太贵的东西，所以会尽量选择用心而且在预算范围内的礼物。买之前，我会考虑对方是否真的会用到它，而不只是它看起来漂不漂亮。比如我可能会买一本笔记本、一盆小植物，或者对方喜欢的零食，然后把它包装好。对我来说，最好的礼物既有实际用途，也能说明我了解对方。价格没有合适程度那么重要。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-048",
    approach: "家中物品题要选一个有细节的小物件。用地点、用途和情感价值支撑答案。",
    frames: [
      "My favourite object at home is ...",
      "I keep it ...",
      "It is useful because ...",
      "More importantly, it has ...",
    ],
    vocabulary: [
      { phrase: "sentimental value", translation: "情感价值", note: "物品题高分核心" },
      { phrase: "hand-me-down", translation: "家人传下来的东西", note: "有故事感" },
      { phrase: "keepsake", translation: "纪念物", note: "解释为什么珍惜" },
      { phrase: "comforting", translation: "令人安心的", note: "情绪细节" },
      { phrase: "within arm’s reach", translation: "伸手可及", note: "描述放置位置" },
    ],
    answer: [
      "My favourite object at home is a small desk lamp in my room. It is not expensive, but it has a bit of sentimental value because my father bought it for me when I started studying seriously for exams. I keep it within arm’s reach on my desk, and I use it almost every evening. The warm light is comforting, especially when I’m reading or writing notes late at night. In a way, it feels like a small keepsake from that period of hard work. I like it because it is both practical and personal, not just decorative.",
    ],
    answerTranslation: [
      "我家里最喜欢的物品是房间里的一盏小台灯。它并不贵，但有一点情感价值，因为这是我开始认真备考时爸爸给我买的。我把它放在书桌上伸手可及的位置，几乎每天晚上都会用。温暖的灯光让人很安心，尤其是我晚上读书或做笔记的时候。从某种程度上说，它像是那段努力学习时期的一个小纪念物。我喜欢它，是因为它既实用，又有个人意义，而不只是装饰品。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-049",
    approach: "尝试新活动题要承认一开始会紧张，再讲低风险尝试如何扩大生活经验。",
    frames: [
      "I enjoy trying new activities, but ...",
      "At first, I usually feel ...",
      "Once I get started, ...",
      "Trying new things helps me ...",
    ],
    vocabulary: [
      { phrase: "step out of my comfort zone", translation: "走出舒适区", note: "活动题核心" },
      { phrase: "give it a go", translation: "试一试", note: "BBC 口语短语" },
      { phrase: "beginner", translation: "新手", note: "承认不熟练" },
      { phrase: "broaden my horizons", translation: "开阔眼界", note: "解释好处" },
      { phrase: "low-risk", translation: "低风险的", note: "说明尝试边界" },
    ],
    answer: [
      "I enjoy trying new activities, but I’m not the kind of person who jumps into everything immediately. At first, I usually feel a bit nervous, especially if I’m a complete beginner. But if the activity is low-risk, like a new sport, a workshop or a different style of cooking, I’m happy to give it a go. Once I get started, I often find it less scary than I imagined. Trying new things helps me step out of my comfort zone and broaden my horizons. Even if I’m not good at the activity, I can still learn something about myself.",
    ],
    answerTranslation: [
      "我喜欢尝试新活动，但我不是那种什么事都会立刻冲进去的人。一开始我通常会有点紧张，尤其是当我完全是新手的时候。但如果这个活动风险不高，比如一项新运动、一个工作坊，或者一种不同风格的烹饪，我会愿意试一试。一旦开始，我经常发现它没有想象中那么可怕。尝试新事物能帮助我走出舒适区，也能开阔眼界。即使我并不擅长这个活动，我仍然能从中更了解自己。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-050",
    approach: "爱好题不要泛泛说 enjoy。讲一个稳定爱好、频率、具体收益和能否长期坚持。",
    frames: [
      "One hobby I’ve kept for a while is ...",
      "I usually do it ...",
      "It helps me ...",
      "I think I’ll keep it up because ...",
    ],
    vocabulary: [
      { phrase: "keep up with", translation: "坚持", note: "讲长期爱好" },
      { phrase: "fitness routine", translation: "健身习惯", note: "运动类爱好" },
      { phrase: "relieve stress", translation: "缓解压力", note: "BBC 健康生活表达" },
      { phrase: "consistent", translation: "稳定持续的", note: "解释习惯" },
      { phrase: "sense of progress", translation: "进步感", note: "说明为什么喜欢" },
    ],
    answer: [
      "One hobby I’ve kept for a while is going to the gym. I’m not a professional athlete or anything like that, but I try to keep up with a simple fitness routine a few times a week. It helps me relieve stress, especially after sitting at a desk for too long. I also like the sense of progress. For example, if I can lift a little more weight or run for a bit longer, I feel that my effort is paying off. This hobby is not just about appearance for me. It makes my daily life more consistent and gives me more energy.",
    ],
    answerTranslation: [
      "我坚持了一段时间的爱好是去健身房。我不是专业运动员之类的人，但我会尽量每周坚持几次简单的健身习惯。它能帮我缓解压力，尤其是在书桌前坐太久之后。我也喜欢那种进步感。比如如果我能多举一点重量，或者多跑一会儿，我会觉得自己的努力有了回报。对我来说，这个爱好不只是关于外表。它让我的日常生活更稳定，也让我更有精力。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-051",
    approach: "钥匙题用日常细节回答：带几把、如何防丢、丢钥匙的后果。简单题也要有生活感。",
    frames: [
      "Yes, I carry keys almost every day.",
      "I usually keep them ...",
      "I’m careful because ...",
      "If I lost them, ...",
    ],
    vocabulary: [
      { phrase: "keyring", translation: "钥匙圈", note: "物品细节" },
      { phrase: "misplace", translation: "随手放错地方", note: "比 lose 更准确" },
      { phrase: "spare key", translation: "备用钥匙", note: "钥匙题常用" },
      { phrase: "lock myself out", translation: "把自己锁在门外", note: "真实后果" },
      { phrase: "part of my routine", translation: "日常习惯的一部分", note: "解释防丢方法" },
    ],
    answer: [
      "Yes, I carry keys almost every day, mainly for my home and sometimes for a locker. I keep them on a small keyring, and I usually put them in the same pocket of my backpack. That has become part of my routine, because I’m quite likely to misplace small things if I change the place all the time. I’m careful with keys because losing them would be annoying and possibly unsafe. If I locked myself out, I would have to call my family or use a spare key. So even though keys are small, I treat them as something important.",
    ],
    answerTranslation: [
      "是的，我几乎每天都会带钥匙，主要是家里的钥匙，有时还有储物柜钥匙。我把它们挂在一个小钥匙圈上，通常放在背包同一个口袋里。这已经成为我日常习惯的一部分，因为如果我总是换地方放，我很可能会把小东西随手放错。钥匙我会比较小心，因为丢了会很麻烦，也可能不太安全。如果我把自己锁在门外，就得联系家人或使用备用钥匙。所以虽然钥匙很小，我仍然把它当成重要物品。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-052",
    approach: "休息日题按“睡懒觉—补生活事务—轻松活动”展开。体现恢复精力，不要像旅游计划。",
    frames: [
      "On a day off, I usually ...",
      "I don’t like to make it too ...",
      "If I have energy, I might ...",
      "The purpose is to ...",
    ],
    vocabulary: [
      { phrase: "day off", translation: "休息日", note: "题目关键词" },
      { phrase: "sleep in", translation: "睡懒觉", note: "休息日自然表达" },
      { phrase: "recharge my batteries", translation: "恢复精力", note: "BBC 口语短语" },
      { phrase: "catch up on", translation: "补做", note: "补家务/消息/学习" },
      { phrase: "low-key", translation: "低调轻松的", note: "描述轻松安排" },
    ],
    answer: [
      "On a day off, I usually sleep in a little and keep the day quite low-key. I don’t like to make a very full schedule, because then it stops feeling like a real break. I might catch up on laundry, reply to messages or tidy my room in the morning. If I have more energy, I’ll meet a friend, watch a film or go for a walk. The purpose is to recharge my batteries, not to be productive every minute. I think a good day off should give me a sense of space, so I can return to study or work with a clearer mind.",
    ],
    answerTranslation: [
      "休息日我通常会稍微睡个懒觉，然后把一天安排得比较轻松。我不喜欢把日程排得太满，因为那样就不像真正的休息了。早上我可能会补洗衣服、回复消息，或者整理房间。如果精力多一点，我会见朋友、看电影，或者出去散步。休息日的目的不是每一分钟都保持高效，而是恢复精力。我觉得好的休息日应该给我一点空间感，这样我回到学习或工作时头脑会更清楚。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-053",
    approach: "修理东西题用诚实口吻：会做基础排查，但复杂问题找专业人士。顺带讲环保和省钱。",
    frames: [
      "I can fix simple things, but ...",
      "For example, I might ...",
      "If it looks complicated, I ...",
      "I think repairing things is useful because ...",
    ],
    vocabulary: [
      { phrase: "DIY", translation: "自己动手修理", note: "修理题核心" },
      { phrase: "troubleshooting", translation: "故障排查", note: "科技/维修通用" },
      { phrase: "throwaway culture", translation: "用完即丢文化", note: "BBC 环保表达" },
      { phrase: "save money", translation: "省钱", note: "解释修理好处" },
      { phrase: "call in a professional", translation: "请专业人士", note: "复杂问题处理" },
    ],
    answer: [
      "I can fix simple things, but I’m not especially handy. For example, I might do basic troubleshooting if my phone, printer or headphones stop working. I’ll restart the device, check the cable or look up a short guide online. But if it involves electricity, plumbing or anything expensive, I’d rather call in a professional. I think repairing things is useful because it can save money and reduce throwaway culture. At the same time, people need to know their limits. DIY is satisfying when the problem is small, but it can become risky if you pretend to understand everything.",
    ],
    answerTranslation: [
      "我能修一些简单的东西，但我不是特别擅长动手。比如如果手机、打印机或耳机出了问题，我可能会做一些基础故障排查。我会重启设备、检查线缆，或者在网上找一个简短教程。但如果涉及电路、管道，或者比较贵的东西，我宁愿请专业人士。我觉得修理东西很有用，因为它能省钱，也能减少用完即丢的文化。同时，人也要知道自己的能力边界。小问题自己修会很有成就感，但如果假装什么都懂，就可能有风险。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-054",
    approach: "食物题从日常饮食、偏好和健康平衡回答。不要只说最喜欢的菜，补一点饮食习惯。",
    frames: [
      "I’m not a very picky eater, but ...",
      "On a normal day, I usually ...",
      "My comfort food is ...",
      "I try to keep a balance between ...",
    ],
    vocabulary: [
      { phrase: "comfort food", translation: "慰藉食物", note: "自然表达偏爱" },
      { phrase: "balanced diet", translation: "均衡饮食", note: "健康角度" },
      { phrase: "homemade", translation: "家里做的", note: "日常饮食细节" },
      { phrase: "picky eater", translation: "挑食的人", note: "食物题常用" },
      { phrase: "treat myself", translation: "犒劳自己", note: "讲偶尔吃甜食/外卖" },
    ],
    answer: [
      "I’m not a very picky eater, but I do prefer food that is fresh and not too oily. On a normal day, I usually eat homemade meals, like rice, vegetables, eggs and some meat. My comfort food is probably noodles, because they are warm, simple and easy to customise. I also like trying different snacks, but I try not to treat myself too often with fried food or sweet drinks. For me, a balanced diet doesn’t mean being strict all the time. It means eating mostly healthy food while still enjoying something tasty when I really want it.",
    ],
    answerTranslation: [
      "我不算特别挑食，但我确实更喜欢新鲜、不太油的食物。平时我通常吃家里做的饭，比如米饭、蔬菜、鸡蛋和一些肉。我的慰藉食物大概是面条，因为它热乎、简单，而且很容易按自己的口味调整。我也喜欢尝试不同的小吃，但会尽量不要太频繁地用油炸食品或甜饮料犒劳自己。对我来说，均衡饮食不是一直严格控制，而是大多数时候吃得健康，同时在真的想吃时也能享受一点好吃的东西。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-055",
    approach: "梦境题要区分 night dreams 和 goals。讲是否常记得梦、梦的类型和睡眠状态的关系。",
    frames: [
      "I don’t remember my dreams every day, but ...",
      "When I’m stressed, I tend to ...",
      "Most dreams fade away ...",
      "I think dreams are connected with ...",
    ],
    vocabulary: [
      { phrase: "vivid dream", translation: "清晰生动的梦", note: "梦境题核心" },
      { phrase: "nightmare", translation: "噩梦", note: "说明负面梦境" },
      { phrase: "subconscious", translation: "潜意识", note: "BBC 心理类词汇" },
      { phrase: "fade away", translation: "逐渐消失", note: "描述醒后忘记" },
      { phrase: "sleep quality", translation: "睡眠质量", note: "把梦和状态联系起来" },
    ],
    answer: [
      "I don’t remember my dreams every day, but sometimes I have a very vivid dream that stays in my mind after I wake up. When I’m stressed, I tend to dream about being late, missing a train or forgetting something important, which is not exactly a nightmare but still unpleasant. Most dreams fade away after a few minutes, especially if I check my phone immediately. I think dreams are connected with the subconscious and with sleep quality. If I sleep badly, my dreams feel more chaotic. I don’t take them too seriously, but they can show what has been on my mind.",
    ],
    answerTranslation: [
      "我不是每天都记得自己的梦，但有时候会做一个非常清晰生动的梦，醒来之后还留在脑海里。压力大的时候，我经常会梦到自己迟到、错过火车，或者忘记了重要的东西；那不完全算噩梦，但还是让人不舒服。大多数梦几分钟后就会逐渐消失，尤其是如果我醒来马上看手机。我觉得梦和潜意识以及睡眠质量有关。如果睡得不好，梦就会更混乱。我不会把梦看得太严肃，但它们有时能反映我最近在想什么。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-056",
    approach: "交通题用日常通勤回答，再补充高峰期和环保意识。Part1 不需要展开成城市规划。",
    frames: [
      "The transport I use most often is ...",
      "It is convenient because ...",
      "The downside is ...",
      "If possible, I also try to ...",
    ],
    vocabulary: [
      { phrase: "public transport", translation: "公共交通", note: "交通题核心" },
      { phrase: "commute", translation: "通勤", note: "日常交通场景" },
      { phrase: "rush hour", translation: "高峰期", note: "交通问题常用" },
      { phrase: "carbon footprint", translation: "碳足迹", note: "BBC 环境表达" },
      { phrase: "get around", translation: "出行", note: "自然口语动词短语" },
    ],
    answer: [
      "The transport I use most often is public transport, especially the metro. It is convenient because I can get around the city without worrying about parking or traffic jams. For my daily commute, the metro is usually faster and more predictable than taking a taxi. The downside is rush hour, when the train can be packed and a bit stressful. If the distance is short, I also like walking or cycling, partly because it is healthier and partly because it reduces my carbon footprint. I don’t drive much, so public transport is still my main way of travelling around.",
    ],
    answerTranslation: [
      "我最常用的交通方式是公共交通，尤其是地铁。它很方便，因为我可以在城市里出行，不用担心停车或堵车。对日常通勤来说，地铁通常比打车更快，也更可预测。缺点是高峰期，车厢可能非常拥挤，也有点让人紧张。如果距离比较短，我也喜欢步行或骑车，一方面更健康，另一方面也能减少碳足迹。我不太开车，所以公共交通仍然是我最主要的出行方式。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-057",
    approach: "健康题从生活习惯入手，承认不完美但有意识。涵盖运动、饮食、睡眠和心理健康。",
    frames: [
      "I try to stay healthy by ...",
      "I’m not perfect, especially when ...",
      "One habit that helps is ...",
      "For me, health is not only ... but also ...",
    ],
    vocabulary: [
      { phrase: "balanced lifestyle", translation: "均衡的生活方式", note: "健康题总括词" },
      { phrase: "mental wellbeing", translation: "心理健康", note: "BBC 健康类高频" },
      { phrase: "check-up", translation: "体检", note: "健康管理" },
      { phrase: "sedentary", translation: "久坐的", note: "现代生活问题" },
      { phrase: "in moderation", translation: "适度地", note: "饮食/娱乐都适用" },
    ],
    answer: [
      "I try to stay healthy by keeping a reasonably balanced lifestyle. I’m not perfect, especially when I’m busy with study, because I may sit for too long or sleep later than planned. But I try to exercise a few times a week, drink enough water and eat snacks in moderation. One habit that helps is taking short breaks, because a sedentary routine makes me feel stiff and tired. I also think mental wellbeing is part of health. If I’m stressed all the time, I don’t feel healthy even if I’m not physically ill. So health, for me, is about energy and balance.",
    ],
    answerTranslation: [
      "我会尽量通过保持比较均衡的生活方式来维持健康。我并不完美，尤其是在学习很忙的时候，可能会坐太久，或者比计划睡得更晚。但我会尽量每周运动几次、喝足够的水，并且适度吃零食。一个有帮助的习惯是短暂休息，因为久坐的生活会让我觉得僵硬和疲惫。我也认为心理健康是健康的一部分。如果我一直压力很大，即使身体没生病，也不会觉得自己健康。所以对我来说，健康关乎精力和平衡。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-058",
    approach: "公共场所题要讲行为规范：音量、垃圾、排队、个人空间。答案可体现公民意识。",
    frames: [
      "In public places, I think people should ...",
      "For example, they need to ...",
      "I feel uncomfortable when ...",
      "Good behaviour in public shows ...",
    ],
    vocabulary: [
      { phrase: "personal space", translation: "个人空间", note: "公共场所核心" },
      { phrase: "keep my voice down", translation: "压低声音", note: "行为细节" },
      { phrase: "litter", translation: "乱扔垃圾", note: "公共规范" },
      { phrase: "queue up", translation: "排队", note: "日常公共行为" },
      { phrase: "civic-minded", translation: "有公德心的", note: "BBC 社会类表达" },
    ],
    answer: [
      "In public places, I think people should be considerate. For example, they need to queue up, keep their voice down and avoid taking up too much personal space. I feel uncomfortable when people play videos loudly on their phones or leave litter in parks and train stations. These are small things, but they affect everyone around them. I try to behave in a civic-minded way by cleaning up after myself and not blocking walkways. Good behaviour in public doesn’t require a big effort. It just means remembering that shared spaces are not private rooms, so other people’s comfort matters too.",
    ],
    answerTranslation: [
      "在公共场所，我觉得人们应该为他人着想。比如需要排队、压低声音，也不要占用太多个人空间。当有人在手机上大声播放视频，或者在公园和车站乱扔垃圾时，我会觉得不舒服。这些都是小事，但会影响周围的每个人。我会尽量有公德心，比如自己收拾好东西，不挡住通道。公共场所里的良好行为并不需要付出很大努力。它只是意味着要记住，共享空间不是私人房间，所以别人的舒适也很重要。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-059",
    approach: "电视题结合流媒体时代回答。说明不常看传统电视，但会看节目类型和使用场景。",
    frames: [
      "I don’t watch traditional TV very often, but ...",
      "I usually watch ... on ...",
      "Sometimes I use it as ...",
      "The only problem is ...",
    ],
    vocabulary: [
      { phrase: "streaming platform", translation: "流媒体平台", note: "现代电视观看方式" },
      { phrase: "documentary", translation: "纪录片", note: "节目类型" },
      { phrase: "binge-watch", translation: "连续刷剧", note: "BBC 媒体表达" },
      { phrase: "background noise", translation: "背景声音", note: "真实使用场景" },
      { phrase: "quality time", translation: "高质量相处时间", note: "和家人看电视" },
    ],
    answer: [
      "I don’t watch traditional TV very often, but I do watch programmes on streaming platforms. I usually prefer documentaries, light dramas or travel shows, depending on how tired I am. Sometimes I use TV as background noise while I’m eating, but if the programme is really interesting, I’ll sit down and watch it properly. In my family, watching a show together can also be a bit of quality time, because we can talk about it afterwards. The only problem is that it is easy to binge-watch one episode after another, so I try not to start a series too late at night.",
    ],
    answerTranslation: [
      "我不太常看传统电视，但会在流媒体平台上看节目。我通常更喜欢纪录片、轻松的电视剧或旅行节目，具体看我有多累。有时候我吃饭时会把电视当背景声音，但如果节目真的有意思，我会坐下来认真看。在我家里，一起看节目也算是一种高质量相处时间，因为看完之后我们可以聊一聊。唯一的问题是很容易一集接一集地刷下去，所以我会尽量不在太晚的时候开始追剧。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-060",
    approach: "博物馆题讲是否喜欢、喜欢哪类展览和为什么。强调互动展览比背历史更吸引你。",
    frames: [
      "I like museums when ...",
      "The kind of museum I enjoy most is ...",
      "A good exhibit should ...",
      "Museums are useful because ...",
    ],
    vocabulary: [
      { phrase: "exhibit", translation: "展品/展览", note: "博物馆题核心" },
      { phrase: "interactive display", translation: "互动展示", note: "现代博物馆表达" },
      { phrase: "cultural heritage", translation: "文化遗产", note: "解释博物馆价值" },
      { phrase: "spark curiosity", translation: "激发好奇心", note: "学习效果" },
      { phrase: "take in information", translation: "吸收信息", note: "看展动作" },
    ],
    answer: [
      "I like museums when they are well designed and not just full of long labels. The kind of museum I enjoy most is a science or history museum with interactive displays, because I can take in information more easily by seeing and touching things. A good exhibit should spark curiosity, not make visitors feel they are reading a textbook while standing up. Museums are useful because they protect cultural heritage and give people a calm place to learn. I don’t go every month, but when I travel to a new city, I often visit at least one museum to understand the place better.",
    ],
    answerTranslation: [
      "如果博物馆设计得好，而不是只有一大堆很长的说明牌，我是喜欢博物馆的。我最喜欢的是带有互动展示的科学或历史博物馆，因为通过看和触摸，我能更容易吸收信息。好的展览应该激发好奇心，而不是让参观者觉得自己是在站着读课本。博物馆很有用，因为它们保护文化遗产，也给人们提供了一个安静学习的地方。我不是每个月都去，但旅行到一个新城市时，我经常会至少参观一个博物馆，以便更好地了解那个地方。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-061",
    approach: "拥挤场所题讲感受、原因和处理方法。用 peak hours、personal space 表达具体。",
    frames: [
      "I don’t really enjoy crowded places because ...",
      "They make me feel ...",
      "If I have to go, I usually ...",
      "I prefer places that ...",
    ],
    vocabulary: [
      { phrase: "packed", translation: "挤满人的", note: "比 crowded 更口语" },
      { phrase: "personal space", translation: "个人空间", note: "解释不舒服原因" },
      { phrase: "overwhelming", translation: "让人不堪重负的", note: "感受表达" },
      { phrase: "avoid peak hours", translation: "避开高峰期", note: "处理方法" },
      { phrase: "claustrophobic", translation: "憋闷压抑的", note: "描述拥挤空间" },
    ],
    answer: [
      "I don’t really enjoy crowded places because they make me feel a bit overwhelmed. If a shopping mall, station or tourist spot is packed, there is very little personal space, and I become more impatient. I don’t think I’m claustrophobic in a serious way, but I definitely dislike being pushed around or having to speak loudly just to be heard. If I have to go somewhere popular, I usually try to avoid peak hours or book things in advance. I prefer places that are lively but still manageable. A bit of energy is nice, but too much crowding ruins the experience for me.",
    ],
    answerTranslation: [
      "我不太喜欢拥挤的地方，因为它们会让我觉得有点不堪重负。如果商场、车站或旅游景点挤满了人，个人空间就很少，我也会变得更没耐心。我不认为自己有严重的幽闭恐惧，但我确实不喜欢被人挤来挤去，或者为了让别人听见而不得不大声说话。如果必须去热门地点，我通常会尽量避开高峰期，或者提前预约。我更喜欢热闹但仍然可控的地方。有一点活力是好的，但太拥挤会破坏我的体验。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-062",
    approach: "旅行题讲偏好和方式。Part1 用目的、准备和体验感回答，不要展开成 Part2 故事。",
    frames: [
      "I enjoy travelling, especially when ...",
      "Before a trip, I usually ...",
      "I don’t like trips that are too ...",
      "Travel helps me ...",
    ],
    vocabulary: [
      { phrase: "broaden my horizons", translation: "开阔眼界", note: "旅行题经典表达" },
      { phrase: "itinerary", translation: "行程安排", note: "旅行准备" },
      { phrase: "local cuisine", translation: "当地美食", note: "旅行体验" },
      { phrase: "travel light", translation: "轻装旅行", note: "BBC 旅行表达" },
      { phrase: "touristy", translation: "过于游客化的", note: "评价旅行地点" },
    ],
    answer: [
      "I enjoy travelling, especially when the trip gives me enough time to explore rather than rush from one attraction to another. Before a trip, I usually make a simple itinerary, but I don’t plan every minute because that feels stressful. I like trying local cuisine, walking around ordinary neighbourhoods and taking photos of small details. I also prefer to travel light, because carrying too much luggage makes the journey tiring. I don’t mind famous places, but if somewhere is too touristy, it can feel less authentic. Travel helps me broaden my horizons and understand how different daily life can be in other places.",
    ],
    answerTranslation: [
      "我喜欢旅行，尤其是当一趟旅行能给我足够时间探索，而不是从一个景点赶到另一个景点的时候。出发前我通常会做一个简单行程，但不会把每一分钟都安排好，因为那会让人有压力。我喜欢尝试当地美食、在普通街区走走，也喜欢拍一些小细节。我也更喜欢轻装旅行，因为带太多行李会让旅程很累。我不介意去著名景点，但如果一个地方过于游客化，就会显得不那么真实。旅行能开阔我的眼界，也让我理解不同地方的日常生活可以有多不一样。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-063",
    approach: "鞋子题从数量、偏好和实用性回答。重点讲舒适度，不要变成购物广告。",
    frames: [
      "I don’t have a huge number of shoes, but ...",
      "The pair I wear most often is ...",
      "Comfort matters more to me than ...",
      "I usually buy new shoes when ...",
    ],
    vocabulary: [
      { phrase: "trainers", translation: "运动鞋", note: "英式常用" },
      { phrase: "wear out", translation: "穿坏/磨损", note: "买新鞋原因" },
      { phrase: "dress shoes", translation: "正装鞋", note: "正式场合" },
      { phrase: "practical", translation: "实用的", note: "偏好表达" },
      { phrase: "arch support", translation: "足弓支撑", note: "舒适细节" },
    ],
    answer: [
      "I don’t have a huge number of shoes, but I have enough for different situations. The pair I wear most often is probably my trainers, because they are practical and comfortable for walking around campus or going out at weekends. Comfort matters more to me than fashion, especially if I need to stand or walk for a long time. I do have a pair of dress shoes for formal occasions, but I don’t wear them often. I usually buy new shoes when the old ones wear out or stop giving enough arch support. Good shoes should look decent, but they also need to protect my feet.",
    ],
    answerTranslation: [
      "我的鞋子数量不算特别多，但足够应对不同场合。我最常穿的大概是运动鞋，因为它们很实用，也适合在校园里走路或周末出门。对我来说，舒适比时尚更重要，尤其是当我需要长时间站立或走路时。我也有一双正装鞋，用于正式场合，但不常穿。通常是旧鞋磨损了，或者足弓支撑不够了，我才会买新鞋。好的鞋子应该看起来得体，但也需要保护脚。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-064",
    approach: "携带物品题讲日常包里带什么、为什么带、如何避免带太多。用 essentials 做归纳。",
    frames: [
      "When I go out, I usually carry ...",
      "The essentials for me are ...",
      "I also bring ... just in case.",
      "I try not to carry too much because ...",
    ],
    vocabulary: [
      { phrase: "essentials", translation: "必需品", note: "携带物品总括" },
      { phrase: "backpack", translation: "双肩包", note: "学生场景自然" },
      { phrase: "power bank", translation: "充电宝", note: "现代出门必备" },
      { phrase: "clutter", translation: "杂物", note: "避免带太多" },
      { phrase: "come in handy", translation: "派上用场", note: "BBC 口语短语" },
    ],
    answer: [
      "When I go out, I usually carry a small backpack or a tote bag. The essentials for me are my phone, keys, wallet, tissues and sometimes a power bank. If I’m going to class, I also bring a notebook and a pen, because they can still come in handy even when most materials are digital. I try not to carry too much because extra clutter makes my bag heavy and messy. I used to pack things just in case, but many of them were never used. Now I’m more realistic. I carry what I need for the day, not everything I own.",
    ],
    answerTranslation: [
      "出门时，我通常会带一个小双肩包或帆布包。对我来说，必需品包括手机、钥匙、钱包、纸巾，有时还有充电宝。如果我要去上课，我也会带一本笔记本和一支笔，因为即使大部分材料都是电子版，它们仍然可能派上用场。我会尽量不要带太多东西，因为额外的杂物会让包又重又乱。以前我会为了以防万一装很多东西，但其中很多从来没用过。现在我更现实，只带当天需要的东西，而不是把所有东西都带上。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-065",
    approach: "把事情做好题要讲一个可迁移能力，如写作、整理或演讲。强调练习、反馈和细节。",
    frames: [
      "One thing I’m quite good at is ...",
      "I became better at it by ...",
      "What matters most is ...",
      "I still want to improve ...",
    ],
    vocabulary: [
      { phrase: "attention to detail", translation: "注重细节", note: "做好事情核心" },
      { phrase: "practice consistently", translation: "持续练习", note: "能力来源" },
      { phrase: "ask for feedback", translation: "寻求反馈", note: "改进方法" },
      { phrase: "make progress", translation: "取得进步", note: "成长表达" },
      { phrase: "raise the standard", translation: "提高标准", note: "高分表达" },
    ],
    answer: [
      "One thing I’m quite good at is organising written work, like notes, outlines or short essays. I became better at it by practising consistently and asking for feedback from teachers and classmates. What matters most, I think, is attention to detail. A piece of writing can have good ideas, but if the structure is messy, the reader still gets lost. I’m not saying I’m perfect, but I can usually make information clear and easy to follow. I still want to improve my speed, because sometimes I spend too long polishing small parts. But overall, writing is something where I can see real progress.",
    ],
    answerTranslation: [
      "我比较擅长的一件事是整理书面内容，比如笔记、提纲或短作文。我通过持续练习，以及向老师和同学寻求反馈，慢慢变得更好。我觉得最重要的是注重细节。一篇文章可以有不错的想法，但如果结构混乱，读者还是会看不懂。我不是说自己完美，但我通常能把信息整理得清楚、容易理解。我还想提高速度，因为有时我会花太多时间打磨小部分。不过总体来说，写作是一个我能看到真实进步的领域。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-066",
    approach: "与老人共事题可讲尊重、耐心和代际差异。没有真实工作经历时，用志愿活动或家庭互动回答。",
    frames: [
      "I haven’t worked with old people formally, but ...",
      "From my experience, older people often ...",
      "The important thing is to ...",
      "I think it can be rewarding because ...",
    ],
    vocabulary: [
      { phrase: "elderly people", translation: "老年人", note: "更礼貌表达" },
      { phrase: "patient", translation: "有耐心的", note: "相处品质" },
      { phrase: "life experience", translation: "生活经验", note: "老人优势" },
      { phrase: "generation gap", translation: "代沟", note: "平衡观点" },
      { phrase: "rewarding", translation: "有收获的", note: "评价经历" },
    ],
    answer: [
      "I haven’t worked with old people formally, but I’ve spent quite a lot of time helping my grandparents and older relatives. From my experience, elderly people often have a lot of life experience, but they may need more patience when dealing with new technology or complicated forms. The important thing is to speak clearly and not make them feel slow or useless. There can be a generation gap, of course, because our habits and values are not always the same. But I think working with old people can be rewarding. You learn to listen better, and sometimes their stories give you a wider view of life.",
    ],
    answerTranslation: [
      "我没有正式和老人一起工作过，但我花过不少时间帮助祖父母和年长亲戚。根据我的经验，老年人通常有很多生活经验，但在面对新技术或复杂表格时，他们可能需要更多耐心。重要的是说话要清楚，不要让他们觉得自己很慢或没用。当然，代沟是存在的，因为我们的习惯和价值观不总是一样。但我觉得和老人相处或共事会很有收获。你会学着更好地倾听，而且有时他们的故事会让你对生活有更广阔的认识。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-067",
    approach: "规则题先说明总体态度，再举学校或公共场所规则。强调合理规则保护效率和安全。",
    frames: [
      "In general, I think rules are necessary because ...",
      "A rule I follow quite carefully is ...",
      "Some rules can be annoying, but ...",
      "Without rules, ...",
    ],
    vocabulary: [
      { phrase: "ground rules", translation: "基本规则", note: "规则题核心" },
      { phrase: "follow rules", translation: "遵守规则", note: "基础表达" },
      { phrase: "bend the rules", translation: "变通/打擦边球", note: "讲例外" },
      { phrase: "common sense", translation: "常识", note: "评价规则合理性" },
      { phrase: "for safety reasons", translation: "出于安全原因", note: "解释规则必要性" },
    ],
    answer: [
      "In general, I think rules are necessary because they create order and protect people’s safety. A rule I follow quite carefully is being quiet in libraries and study rooms. It sounds simple, but without that ground rule, people wouldn’t be able to concentrate. Some rules can be annoying, especially when they feel too strict or outdated, and I understand why people sometimes want to bend the rules. But most everyday rules are just common sense. For safety reasons, for example, people should follow traffic rules even when they are in a hurry. Rules are not exciting, but they make shared life possible.",
    ],
    answerTranslation: [
      "总体来说，我认为规则是必要的，因为它们能建立秩序，也能保护人们的安全。我比较认真遵守的一条规则是在图书馆和自习室保持安静。这听起来很简单，但如果没有这条基本规则，人们就无法集中注意力。有些规则可能让人烦，尤其是当它们显得太严格或过时时，我也理解为什么人们有时想打擦边球。但大多数日常规则其实只是常识。比如出于安全原因，即使很赶时间，人们也应该遵守交通规则。规则不令人兴奋，但它们让共同生活成为可能。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-068",
    approach: "手机题讲使用频率和依赖感，同时加入通知管理。要平衡便利和分心。",
    frames: [
      "I use my cellphone every day for ...",
      "It is useful because ...",
      "The problem is ...",
      "To control it, I usually ...",
    ],
    vocabulary: [
      { phrase: "smartphone", translation: "智能手机", note: "手机题基础" },
      { phrase: "notifications", translation: "通知", note: "分心来源" },
      { phrase: "put it on silent", translation: "调成静音", note: "管理手机" },
      { phrase: "digital distraction", translation: "数字干扰", note: "BBC 科技生活表达" },
      { phrase: "stay connected", translation: "保持联系", note: "手机好处" },
    ],
    answer: [
      "I use my cellphone every day for messages, maps, payments, photos and study materials. It is useful because it helps me stay connected and solve small problems quickly. If I need to check a word, book a ride or contact a friend, my smartphone can do it in seconds. The problem is digital distraction. Notifications can break my focus, and sometimes I pick up the phone for one thing but end up scrolling for twenty minutes. To control it, I put it on silent when I study and keep only important notifications on. I don’t want to give up my phone, but I do want to use it more deliberately.",
    ],
    answerTranslation: [
      "我每天都会用手机发消息、看地图、付款、拍照和查看学习资料。它很有用，因为它能让我保持联系，也能快速解决小问题。如果我需要查一个单词、叫车或联系朋友，智能手机几秒钟就能做到。问题是数字干扰。通知会打断我的专注力，而且有时候我拿起手机只是为了做一件事，最后却刷了二十分钟。为了控制这一点，我学习时会把手机调成静音，只保留重要通知。我不想放弃手机，但确实想更有意识地使用它。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-069",
    approach: "植物题用是否养植物、喜欢原因和照顾难度回答。学生口吻可以选择低维护植物。",
    frames: [
      "I like plants, although ...",
      "At home, we have ...",
      "Plants make a room feel ...",
      "The only difficulty is ...",
    ],
    vocabulary: [
      { phrase: "houseplants", translation: "室内植物", note: "植物题核心" },
      { phrase: "low-maintenance", translation: "低维护的", note: "适合学生口吻" },
      { phrase: "greenery", translation: "绿色植物/绿意", note: "BBC 环境表达" },
      { phrase: "water them regularly", translation: "定期浇水", note: "照顾植物" },
      { phrase: "brighten up", translation: "让……更明亮/有生气", note: "描述植物作用" },
    ],
    answer: [
      "I like plants, although I’m not an expert at looking after them. At home, we have a few houseplants, mostly low-maintenance ones that don’t need too much attention. I think greenery can brighten up a room and make it feel fresher, especially if the space is small or full of electronic devices. The only difficulty is remembering to water them regularly. I once forgot about a small plant for too long, and it didn’t survive, so now I choose tougher plants. I like them because they make the home feel more alive without requiring a huge amount of space.",
    ],
    answerTranslation: [
      "我喜欢植物，虽然我并不是很会照顾它们。我们家有几盆室内植物，大多是低维护、不需要太多照顾的类型。我觉得绿色植物能让房间更有生气，也显得更清新，尤其是当空间比较小，或者充满电子设备的时候。唯一的困难是要记得定期浇水。我曾经太久忘了给一盆小植物浇水，结果它没活下来，所以现在我会选择更耐活的植物。我喜欢植物，是因为它们不需要占很多空间，却能让家里更有生命力。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-070",
    approach: "天气题讲偏好、天气对心情和计划的影响。不要只说 sunny/rainy，补湿度或阴天细节。",
    frames: [
      "The weather I like most is ...",
      "It affects my mood because ...",
      "I’m not a fan of ...",
      "Before going out, I usually ...",
    ],
    vocabulary: [
      { phrase: "humid", translation: "潮湿闷热的", note: "天气细节" },
      { phrase: "gloomy", translation: "阴沉的", note: "天气影响心情" },
      { phrase: "forecast", translation: "天气预报", note: "出门准备" },
      { phrase: "sunny spell", translation: "一段晴朗天气", note: "BBC 天气表达" },
      { phrase: "affect my mood", translation: "影响心情", note: "解释偏好" },
    ],
    answer: [
      "The weather I like most is mild and sunny, but not too hot. A sunny spell can affect my mood in a positive way, because I feel more energetic and more willing to go outside. I’m not a fan of humid weather, especially in summer, because it makes everything feel sticky and uncomfortable. Gloomy rainy days can also make me a bit lazy, although they are nice if I can stay at home and read. Before going out, I usually check the forecast, mainly to decide whether I need an umbrella or a jacket. Weather doesn’t control my life, but it definitely changes my plans.",
    ],
    answerTranslation: [
      "我最喜欢温和、晴朗但不太热的天气。一段晴朗天气会积极影响我的心情，因为我会觉得更有精力，也更愿意出门。我不太喜欢潮湿闷热的天气，尤其是在夏天，因为它让一切都感觉黏黏的、不舒服。阴沉的雨天也会让我有点懒，虽然如果可以待在家里读书，那种天气也不错。出门前我通常会看天气预报，主要是决定要不要带伞或外套。天气不会控制我的生活，但它确实会改变我的计划。",
    ],
  },
  {
    partId: "part-1",
    questionId: "speaking-part-1-071",
    approach: "艺术题讲个人兴趣，不必装专家。用画展、电影海报、设计等日常艺术入口回答。",
    frames: [
      "I like art, but ...",
      "The kind of art I enjoy is ...",
      "I don’t always understand ..., but ...",
      "For me, art is valuable because ...",
    ],
    vocabulary: [
      { phrase: "art gallery", translation: "美术馆", note: "艺术题核心场景" },
      { phrase: "creative expression", translation: "创造性表达", note: "解释艺术本质" },
      { phrase: "abstract art", translation: "抽象艺术", note: "艺术类型" },
      { phrase: "appreciate", translation: "欣赏", note: "表达兴趣" },
      { phrase: "thought-provoking", translation: "发人深省的", note: "BBC 艺术评论表达" },
    ],
    answer: [
      "I like art, but I wouldn’t call myself an expert. The kind of art I enjoy is usually visual and easy to connect with, like photography, poster design or paintings in an art gallery. I don’t always understand abstract art, but I can still appreciate the colours, shapes and atmosphere. For me, art is valuable because it gives people a form of creative expression that is not limited to words. A good piece of art can be beautiful, but it can also be thought-provoking. Even if I only spend a few minutes looking at it, it may make me notice something in a different way.",
    ],
    answerTranslation: [
      "我喜欢艺术，但我不会说自己是专家。我喜欢的艺术通常是视觉类、比较容易产生连接的，比如摄影、海报设计，或者美术馆里的绘画。我不总是能理解抽象艺术，但仍然可以欣赏其中的颜色、形状和氛围。对我来说，艺术很有价值，因为它给人们提供了一种不局限于语言的创造性表达方式。一件好的艺术作品可以很美，也可以发人深省。即使我只看几分钟，它也可能让我用不同方式注意到某些东西。",
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
  {
    partId: "part-3",
    questionId: "speaking-part-3-006",
    approach: "好老师题要避免只说 kind。把清晰解释、同理心、反馈和高标准结合起来，会更像 Part 3 讨论。",
    frames: [
      "A good teacher needs more than knowledge.",
      "First of all, they should be able to ...",
      "Another important quality is ...",
      "The best teachers balance ... with ...",
    ],
    vocabulary: [
      { phrase: "empathy", translation: "同理心", note: "BBC 高频词，适合教育话题" },
      { phrase: "give constructive feedback", translation: "给建设性反馈", note: "教师品质核心" },
      { phrase: "set high expectations", translation: "设定高期待", note: "解释严格但有帮助" },
      { phrase: "break down complex ideas", translation: "拆解复杂概念", note: "教学能力表达" },
      { phrase: "praise effort", translation: "表扬努力", note: "BBC 词汇 praise 的自然用法" },
    ],
    answer: [
      "A good teacher needs more than knowledge. Of course, they should understand the subject well, but more importantly, they need to break down complex ideas in a way students can actually follow. A teacher who only shows how clever they are may impress people, but that does not always help students learn.",
      "Another important quality is empathy. Different students struggle for different reasons, so a good teacher should notice when someone is confused and give constructive feedback rather than simply criticise. At the same time, I don’t think teachers should be too soft. The best teachers set high expectations and praise effort, so students feel both supported and pushed to improve.",
    ],
    answerTranslation: [
      "一个好老师需要的不只是知识。当然，他们应该很了解自己的学科，但更重要的是，他们要能把复杂概念拆解成学生真正能听懂的方式。一个只展示自己多聪明的老师也许会让人印象深刻，但这并不一定能帮助学生学习。",
      "另一个重要品质是同理心。不同学生遇到困难的原因不一样，所以好老师应该能注意到谁听不懂，并给予建设性反馈，而不是简单批评。不过，我也不认为老师应该过于温和。最好的老师会设定较高期待，也会表扬努力，这样学生既能感到被支持，也会被推动着进步。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-007",
    approach: "情绪表达题用平衡观点：开放表达有利于心理健康，但表达方式和场合也很重要。",
    frames: [
      "I think people should express emotions, but ...",
      "Keeping everything inside can ...",
      "However, being open doesn’t mean ...",
      "A healthy approach is to ...",
    ],
    vocabulary: [
      { phrase: "mental wellbeing", translation: "心理健康", note: "健康/情绪题通用" },
      { phrase: "bottle up emotions", translation: "压抑情绪", note: "表达情绪核心短语" },
      { phrase: "social norms", translation: "社会规范", note: "文化差异角度" },
      { phrase: "emotional maturity", translation: "情绪成熟", note: "高分抽象表达" },
      { phrase: "set boundaries", translation: "设定边界", note: "说明表达要有分寸" },
    ],
    answer: [
      "I think people should express emotions, but not in a completely uncontrolled way. Keeping everything inside can be harmful to mental wellbeing, because stress and sadness do not just disappear when people ignore them. Talking to a trusted friend or family member can help people understand what they are feeling and avoid feeling isolated.",
      "However, being open does not mean pouring every emotion onto everyone around you. Social norms and timing still matter. For example, shouting at a colleague in public may be honest, but it is not emotionally mature. A healthier approach is to name the feeling, explain the reason and set boundaries calmly. So I support emotional openness, as long as it comes with respect and self-control.",
    ],
    answerTranslation: [
      "我认为人们应该表达情绪，但不能完全失控地表达。把所有情绪都压在心里可能会损害心理健康，因为压力和悲伤不会因为被忽视就自动消失。和可信任的朋友或家人谈谈，能帮助人们理解自己的感受，也能避免孤立无援的感觉。",
      "不过，开放表达并不意味着把每一种情绪都倒给周围所有人。社会规范和时机仍然很重要。比如，在公共场合对同事大喊大叫也许很真实，但这并不代表情绪成熟。更健康的方式是说出自己的感受，解释原因，并且冷静地设定边界。所以我支持情绪开放，但前提是它伴随着尊重和自控。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-008",
    approach: "好倾听者题重点不是安静，而是专注、同理心、追问和不急着评判。",
    frames: [
      "A good listener is not just someone who stays silent.",
      "They show attention by ...",
      "They also avoid ...",
      "That makes the speaker feel ...",
    ],
    vocabulary: [
      { phrase: "active listening", translation: "主动倾听", note: "人际沟通核心" },
      { phrase: "empathy", translation: "同理心", note: "BBC 口语/写作高频" },
      { phrase: "jump to conclusions", translation: "急着下结论", note: "解释坏倾听" },
      { phrase: "body language", translation: "肢体语言", note: "非语言沟通" },
      { phrase: "follow-up questions", translation: "追问", note: "体现真正听懂" },
    ],
    answer: [
      "A good listener is not just someone who stays silent. Good listening is active listening. It means the person gives full attention, uses appropriate body language and asks follow-up questions that show they have really understood the point. Small things like nodding or putting the phone away can make a big difference.",
      "A good listener also has empathy and avoids jumping to conclusions. Many people listen only because they are waiting for their turn to speak, so they quickly give advice before understanding the whole situation. That can make the speaker feel dismissed. A good listener, by contrast, creates a safe space where the other person can think aloud and feel respected, even if the listener does not agree with everything.",
    ],
    answerTranslation: [
      "好的倾听者并不只是一个保持沉默的人。好的倾听是主动倾听。它意味着这个人会全神贯注，使用合适的肢体语言，并提出能显示自己真正理解了对方观点的追问。像点头、把手机放下这样的小动作，也会产生很大影响。",
      "好的倾听者还需要有同理心，并避免急着下结论。很多人听别人说话，只是在等自己开口的机会，所以还没理解完整情况就急着给建议。这会让说话的人觉得自己被敷衍。相反，好的倾听者会创造一个安全空间，让对方可以边说边思考，并感到被尊重，即使倾听者并不完全同意所有观点。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-009",
    approach: "早晨习惯题从结构感、精力和心理状态展开，不要只讲早起一定好。",
    frames: [
      "Early morning routines can be beneficial because ...",
      "They give people a sense of ...",
      "However, the benefit depends on ...",
      "A routine should support health, not ...",
    ],
    vocabulary: [
      { phrase: "daily ritual", translation: "日常仪式", note: "BBC 词汇 ritual 的自然用法" },
      { phrase: "kick-start the day", translation: "开启一天", note: "BBC 早晨表达" },
      { phrase: "decision fatigue", translation: "决策疲劳", note: "解释固定流程价值" },
      { phrase: "biological clock", translation: "生物钟", note: "健康角度" },
      { phrase: "perk up", translation: "提振精神", note: "BBC 口语短语" },
    ],
    answer: [
      "Early morning routines can be beneficial because they give people a sense of structure before the day becomes busy. A simple daily ritual, like making the bed, stretching or having breakfast, can kick-start the day and reduce decision fatigue. People do not have to waste energy deciding what to do first.",
      "That said, the benefit depends on sleep quality. If someone sleeps at two in the morning and forces themselves to get up at five, that routine may damage their biological clock rather than improve their life. A good morning routine should help people perk up and feel prepared, not turn into another source of pressure. So I think consistency matters more than waking up extremely early.",
    ],
    answerTranslation: [
      "早晨习惯有好处，因为它能在一天变得忙碌之前给人一种结构感。一个简单的日常仪式，比如整理床铺、拉伸或吃早餐，能开启一天，也能减少决策疲劳。人们不用浪费精力去想第一件事应该做什么。",
      "不过，这种好处取决于睡眠质量。如果一个人凌晨两点才睡，却强迫自己五点起床，那这个习惯可能不是改善生活，而是在破坏生物钟。好的早晨习惯应该帮助人们提振精神、做好准备，而不是变成另一种压力来源。所以我认为，稳定性比极早起床更重要。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-010",
    approach: "坏习惯题要解释机制：即时满足、环境线索、意志力有限。再给解决方向。",
    frames: [
      "People find it hard because bad habits usually provide ...",
      "Another reason is that habits are linked to ...",
      "Willpower alone is often not enough.",
      "It is easier to change a habit by ...",
    ],
    vocabulary: [
      { phrase: "instant gratification", translation: "即时满足感", note: "BBC 词汇，坏习惯核心" },
      { phrase: "cue and reward", translation: "线索和奖励", note: "习惯机制" },
      { phrase: "willpower", translation: "意志力", note: "解释为什么难" },
      { phrase: "trigger", translation: "触发因素", note: "行为改变表达" },
      { phrase: "replace a habit", translation: "替换习惯", note: "解决方案" },
    ],
    answer: [
      "People find it hard to change bad habits because those habits usually provide instant gratification. For example, scrolling on a phone, eating junk food or staying up late may feel good in the moment, even if the long-term result is negative. The brain tends to prefer the quick reward over the distant benefit.",
      "Another reason is that habits are linked to cues and rewards. If a person always eats snacks while watching TV, the sofa and the screen become triggers. Willpower alone is often not enough, especially when people are tired or stressed. It is usually easier to change a habit by changing the environment and replacing the habit with something less harmful, rather than simply telling yourself to stop.",
    ],
    answerTranslation: [
      "人们很难改变坏习惯，是因为这些习惯通常会提供即时满足感。比如刷手机、吃垃圾食品或熬夜，当下可能感觉不错，即使长期结果是负面的。大脑往往更偏好快速奖励，而不是遥远的好处。",
      "另一个原因是，习惯和线索及奖励相关。如果一个人总是在看电视时吃零食，那么沙发和屏幕就会变成触发因素。单靠意志力通常不够，尤其是当人疲惫或压力大时。改变习惯通常更有效的方法，是改变环境，并用一个危害较小的习惯替代原来的习惯，而不是简单告诉自己不要再做。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-011",
    approach: "爱好随年龄变化题按时间、体力、收入和身份变化来分析，避免只说老人喜欢安静。",
    frames: [
      "Hobbies often change because people’s responsibilities change.",
      "When people are young, they may prefer ...",
      "As they get older, they often look for ...",
      "So hobbies reflect both ... and ...",
    ],
    vocabulary: [
      { phrase: "life stage", translation: "人生阶段", note: "年龄变化题核心" },
      { phrase: "physically demanding", translation: "体力要求高的", note: "运动类爱好变化" },
      { phrase: "meaningful leisure", translation: "有意义的休闲", note: "Part 3 抽象表达" },
      { phrase: "social circle", translation: "社交圈", note: "爱好的人际功能" },
      { phrase: "keep up with", translation: "坚持", note: "BBC 口语短语" },
    ],
    answer: [
      "Hobbies often change because people’s responsibilities and life stage change. When people are young, they may prefer hobbies that are social, exciting or physically demanding, like team sports, concerts or travelling with friends. They usually have more energy and may use hobbies to build a social circle.",
      "As people get older, time becomes more limited, so they may look for meaningful leisure that is easier to keep up with, such as gardening, reading, walking or cooking. Income can also make a difference, because adults may be able to afford hobbies they could not try as students. So hobbies are not just personal preferences; they reflect people’s time, health, money and emotional needs.",
    ],
    answerTranslation: [
      "爱好经常会变化，因为人的责任和人生阶段会变化。年轻时，人们可能更喜欢社交性强、刺激或体力要求高的爱好，比如团队运动、演唱会，或者和朋友旅行。他们通常精力更多，也可能通过爱好建立社交圈。",
      "随着年龄增长，时间变得更有限，所以人们可能会寻找更容易坚持、也更有意义的休闲方式，比如园艺、阅读、散步或做饭。收入也会产生影响，因为成年人可能负担得起学生时期无法尝试的爱好。所以爱好不只是个人偏好，它也反映了一个人的时间、健康、金钱和情感需求。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-012",
    approach: "为什么需要爱好题从压力、身份、技能和社交四个角度展开，结尾强调不是浪费时间。",
    frames: [
      "People need hobbies because life cannot be only about ...",
      "A hobby gives people ...",
      "It can also help them ...",
      "So hobbies are not a luxury; they are ...",
    ],
    vocabulary: [
      { phrase: "downtime", translation: "休息时间", note: "BBC 生活表达" },
      { phrase: "mental wellbeing", translation: "心理健康", note: "健康角度" },
      { phrase: "sense of identity", translation: "身份感", note: "抽象高分表达" },
      { phrase: "creative outlet", translation: "创造性出口", note: "爱好作用" },
      { phrase: "work-life balance", translation: "工作生活平衡", note: "社会话题通用" },
    ],
    answer: [
      "People need hobbies because life cannot be only about work, study and responsibilities. A hobby gives people real downtime and protects their mental wellbeing. When someone plays music, goes hiking or does photography, they can focus on something enjoyable without being judged only by results.",
      "Hobbies also give people a sense of identity. A person may be an employee or a student during the day, but their hobby allows them to be a runner, a baker or a volunteer as well. In that sense, hobbies are a creative outlet and sometimes a social bridge. I don’t think they are a luxury. They are part of a healthy work-life balance, especially in a society where people are often under pressure.",
    ],
    answerTranslation: [
      "人们需要爱好，因为生活不能只有工作、学习和责任。爱好能给人真正的休息时间，也能保护心理健康。当一个人弹音乐、徒步或摄影时，他可以专注于一件令人愉快的事，而不是只被结果评价。",
      "爱好还会给人一种身份感。一个人白天可能是员工或学生，但爱好让他也可以成为跑步者、烘焙爱好者或志愿者。从这个意义上说，爱好是一种创造性出口，有时也是社交桥梁。我不认为爱好是奢侈品。它们是健康工作生活平衡的一部分，尤其是在一个人们经常处于压力下的社会中。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-013",
    approach: "宜居城市题可以从交通、住房、绿地和公共服务回答。注意给优先级，不要像清单。",
    frames: [
      "Cities can become more livable by focusing on ...",
      "The first priority should be ...",
      "Another key factor is ...",
      "A livable city is not just ..., but ...",
    ],
    vocabulary: [
      { phrase: "public transport", translation: "公共交通", note: "城市宜居核心" },
      { phrase: "infrastructure", translation: "基础设施", note: "BBC 学术词汇" },
      { phrase: "green spaces", translation: "绿色空间", note: "城市环境" },
      { phrase: "affordable housing", translation: "可负担住房", note: "社会公平角度" },
      { phrase: "city dwellers", translation: "城市居民", note: "BBC 城市词汇" },
    ],
    answer: [
      "Cities can become more livable by focusing on basic quality of life rather than only building taller skyscrapers. The first priority should be public transport and infrastructure. If city dwellers can get to school, work and hospitals without spending hours in traffic, daily life becomes much less stressful.",
      "Another key factor is the balance between development and comfort. Cities need green spaces, affordable housing and safe public areas where people can walk, exercise or meet neighbours. A livable city is not just a place with shopping malls and office towers. It is a place where ordinary people can breathe, move around easily and feel that they belong to a community.",
    ],
    answerTranslation: [
      "城市要变得更宜居，就应该关注基本生活质量，而不是只建更高的摩天大楼。首要任务应该是公共交通和基础设施。如果城市居民能不用花几个小时堵在路上，就能到达学校、工作地点和医院，日常生活的压力会小很多。",
      "另一个关键因素是发展与舒适之间的平衡。城市需要绿色空间、可负担住房，以及安全的公共区域，让人们可以散步、锻炼或和邻居见面。宜居城市不只是一个拥有商场和办公楼的地方。它应该让普通人能够呼吸、方便出行，并感到自己属于一个社区。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-014",
    approach: "居住选择题从现实因素和情感因素两层回答：工作、成本、安全、家人和生活方式。",
    frames: [
      "People choose places for both practical and emotional reasons.",
      "On the practical side, ...",
      "Emotionally, people may ...",
      "So location is really a mix of ...",
    ],
    vocabulary: [
      { phrase: "cost of living", translation: "生活成本", note: "居住选择核心" },
      { phrase: "job opportunities", translation: "工作机会", note: "现实原因" },
      { phrase: "sense of belonging", translation: "归属感", note: "情感原因" },
      { phrase: "neighbourhood", translation: "社区", note: "居住环境" },
      { phrase: "quality of life", translation: "生活质量", note: "总结性表达" },
    ],
    answer: [
      "People choose places for both practical and emotional reasons. On the practical side, job opportunities, cost of living, transport and safety are usually very important. A young graduate, for example, may move to a big city not because it is relaxing, but because it offers better career chances and a wider social network.",
      "Emotionally, people may choose a place because it is close to family, familiar food or a neighbourhood where they feel comfortable. Some people value excitement, while others care more about peace and privacy. So location is really a mix of money, convenience and sense of belonging. A place that looks attractive on paper may not feel right if it does not support the person’s quality of life.",
    ],
    answerTranslation: [
      "人们选择居住地点既有现实原因，也有情感原因。从现实角度看，工作机会、生活成本、交通和安全通常都很重要。比如一个刚毕业的年轻人可能会搬去大城市，并不是因为那里轻松，而是因为它提供更好的职业机会和更广的社交网络。",
      "从情感角度看，人们可能会因为靠近家人、熟悉的食物，或一个让自己感觉舒服的社区而选择某个地方。有些人重视刺激和机会，另一些人更在意安静和隐私。所以居住地点其实是金钱、便利和归属感的混合。一个地方即使纸面上很有吸引力，如果它不能支持这个人的生活质量，也未必真正适合。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-015",
    approach: "噪音污染题要给多层解决方案：规划、交通、建筑、执法和个人习惯。",
    frames: [
      "Noise pollution needs both policy and personal effort.",
      "At the city level, governments can ...",
      "Buildings and businesses should also ...",
      "Individuals can help by ...",
    ],
    vocabulary: [
      { phrase: "noise pollution", translation: "噪音污染", note: "题目关键词" },
      { phrase: "zoning rules", translation: "区域规划规则", note: "城市治理表达" },
      { phrase: "repetitive noise", translation: "重复性噪音", note: "BBC 短语" },
      { phrase: "disrupt", translation: "扰乱", note: "BBC 学术词汇" },
      { phrase: "soundproofing", translation: "隔音", note: "建筑解决方案" },
    ],
    answer: [
      "Noise pollution needs both policy and personal effort. At the city level, governments can use zoning rules to keep very noisy factories, bars or construction sites away from residential areas. They can also improve public transport so there are fewer private cars constantly honking and creating repetitive noise.",
      "Buildings and businesses should also take responsibility. Better soundproofing, limits on night-time construction and stricter rules for loud advertising speakers would help a lot. At the individual level, people can keep their voice down in shared spaces and avoid playing music loudly in public. Noise may seem less serious than air pollution, but it can disrupt sleep, concentration and mental wellbeing, so cities should treat it as a real health issue.",
    ],
    answerTranslation: [
      "噪音污染需要政策和个人努力共同解决。在城市层面，政府可以通过区域规划规则，让非常吵的工厂、酒吧或建筑工地远离居民区。政府也可以改善公共交通，减少私家车不断鸣笛和产生重复噪音的情况。",
      "建筑和商家也应该承担责任。更好的隔音、限制夜间施工，以及更严格管理大声播放广告喇叭，都会有很大帮助。在个人层面，人们可以在共享空间压低声音，并避免在公共场所大声放音乐。噪音看起来可能没有空气污染严重，但它会扰乱睡眠、专注力和心理健康，所以城市应该把它当成真正的健康问题来处理。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-016",
    approach: "这题和 013 相近，但更适合归纳标准：安全、便利、可负担、人情味。",
    frames: [
      "A livable city should meet people’s basic needs first.",
      "Safety and convenience are essential because ...",
      "Affordability is also important.",
      "Finally, a city needs ...",
    ],
    vocabulary: [
      { phrase: "livable city", translation: "宜居城市", note: "题目核心" },
      { phrase: "reliable infrastructure", translation: "可靠基础设施", note: "BBC infrastructure 拓展" },
      { phrase: "affordability", translation: "可负担性", note: "住房和生活成本" },
      { phrase: "community spirit", translation: "社区氛围", note: "城市人情味" },
      { phrase: "access to services", translation: "获得服务的便利性", note: "公共服务表达" },
    ],
    answer: [
      "A livable city should meet people’s basic needs first. Safety and convenience are essential because people cannot enjoy culture or entertainment if they worry about crime, traffic or unreliable infrastructure every day. Good access to services, such as hospitals, schools and public transport, makes daily life smoother.",
      "Affordability is also important. If rent is so high that ordinary workers have to live far from their jobs, the city may look successful but feel exhausting. Finally, a city needs community spirit. Parks, libraries and small public spaces give people chances to meet and relax. So, in my view, a livable city is not the richest city; it is one where people can live with dignity and some breathing room.",
    ],
    answerTranslation: [
      "宜居城市首先应该满足人们的基本需求。安全和便利是必要的，因为如果人们每天都担心犯罪、交通或不可靠的基础设施，就很难享受文化和娱乐。方便获得医院、学校和公共交通等服务，会让日常生活更顺畅。",
      "可负担性也很重要。如果房租高到普通工作者不得不住得离工作地点很远，那么这座城市可能看起来很成功，但生活起来很疲惫。最后，城市需要社区氛围。公园、图书馆和小型公共空间能给人们见面和放松的机会。所以在我看来，宜居城市不是最富有的城市，而是让人们能有尊严、有一点呼吸空间地生活的城市。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-017",
    approach: "媒体可靠性题要避免传统媒体绝对可靠。比较速度、审核、偏见和事实核查。",
    frames: [
      "Social media is faster, but ...",
      "Traditional media usually has ...",
      "That said, traditional media can also ...",
      "The safest approach is to ...",
    ],
    vocabulary: [
      { phrase: "fact-checking", translation: "事实核查", note: "媒体可靠性核心" },
      { phrase: "misinformation", translation: "错误信息", note: "社媒风险" },
      { phrase: "editorial standards", translation: "编辑标准", note: "传统媒体优势" },
      { phrase: "echo chamber", translation: "信息茧房", note: "Part 3 高分表达" },
      { phrase: "verify the source", translation: "核实来源", note: "解决方案" },
    ],
    answer: [
      "Social media is faster, but that speed often makes it less reliable. Anyone can post breaking news, photos or opinions before proper fact-checking happens, so misinformation can spread very quickly. Another problem is the echo chamber effect, where people only see content that confirms what they already believe.",
      "Traditional media usually has stronger editorial standards and professional responsibility, so it is often more reliable for serious news. That said, traditional media can also have bias, and mistakes still happen. I don’t think people should trust a source just because it looks official. The safest approach is to compare several sources, verify the original evidence and be careful with headlines that are designed mainly to shock or attract clicks.",
    ],
    answerTranslation: [
      "社交媒体速度更快，但这种速度往往会让它不那么可靠。任何人都可以在充分事实核查之前发布突发新闻、图片或观点，所以错误信息可能传播得非常快。另一个问题是信息茧房效应，人们只看到那些确认自己已有看法的内容。",
      "传统媒体通常有更强的编辑标准和职业责任，所以在严肃新闻方面往往更可靠。不过，传统媒体也可能有偏见，也仍然会出错。我不认为人们应该因为一个来源看起来正式就完全信任它。最安全的方法是比较多个来源，核实原始证据，并且警惕那些主要为了制造震惊或吸引点击而设计的标题。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-018",
    approach: "影视题从故事、人物、节奏和真实感回答。强调好作品不一定大制作。",
    frames: [
      "A good movie or TV show needs ...",
      "The story should ...",
      "Characters matter because ...",
      "Big budgets help, but ...",
    ],
    vocabulary: [
      { phrase: "well-paced", translation: "节奏好的", note: "评价影视作品" },
      { phrase: "authenticity", translation: "真实感", note: "BBC 艺术/媒体词汇" },
      { phrase: "character development", translation: "人物成长", note: "影视评价核心" },
      { phrase: "thought-provoking", translation: "发人深省的", note: "艺术类高分词" },
      { phrase: "special effects", translation: "特效", note: "大制作评价" },
    ],
    answer: [
      "A good movie or TV show needs a strong story, believable characters and good pacing. The story should make viewers want to know what happens next, but it should not rely only on surprises. If the plot is well-paced, even a quiet scene can be interesting because it builds tension or reveals something about the characters.",
      "Characters matter because people remember emotions more than special effects. A film with a huge budget can still feel empty if the characters do not have authenticity or clear motivation. On the other hand, a simple story can be powerful if the character development is honest and thought-provoking. So I think entertainment value is important, but the best shows also leave viewers with something to think about afterwards.",
    ],
    answerTranslation: [
      "一部好的电影或电视剧需要强有力的故事、可信的人物和良好的节奏。故事应该让观众想知道接下来会发生什么，但不能只依赖反转。如果情节节奏好，即使安静的场景也可以很有意思，因为它能制造张力，或揭示人物的某些东西。",
      "人物很重要，因为人们记住的更多是情感，而不是特效。一部预算很高的电影，如果人物没有真实感或清晰动机，仍然会显得空洞。相反，一个简单故事如果人物成长真实，也可以很有力量、发人深省。所以我认为娱乐性很重要，但最好的作品也会让观众在看完之后仍然有所思考。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-019",
    approach: "在线学习题平衡便利与缺点。强调它扩大了 access，但需要自律和互动设计。",
    frames: [
      "Online learning has made education more flexible.",
      "It gives students access to ...",
      "However, it also requires ...",
      "The best model may be ...",
    ],
    vocabulary: [
      { phrase: "online learning platform", translation: "线上学习平台", note: "BBC 口语词汇" },
      { phrase: "flexible hours", translation: "灵活时间", note: "BBC flexible 用法" },
      { phrase: "self-discipline", translation: "自律", note: "在线学习难点" },
      { phrase: "digital divide", translation: "数字鸿沟", note: "教育公平角度" },
      { phrase: "blended learning", translation: "混合式学习", note: "解决方案" },
    ],
    answer: [
      "Online learning has made education more flexible. Through an online learning platform, students can review lessons, watch lectures from different countries and study at flexible hours. This is especially helpful for people who live far from good schools or have work and family responsibilities.",
      "However, online learning also requires self-discipline. Without a teacher physically in the room, some students get distracted or fall behind. There is also a digital divide, because not everyone has a quiet room, a stable internet connection or a good device. For that reason, I think the best model may be blended learning. Online tools can provide access and convenience, while face-to-face classes still offer discussion, structure and human support.",
    ],
    answerTranslation: [
      "在线学习让教育变得更灵活。通过线上学习平台，学生可以复习课程、观看来自不同国家的讲座，并在灵活时间学习。这对那些住得离优质学校很远，或者有工作和家庭责任的人尤其有帮助。",
      "不过，在线学习也需要自律。如果老师不在同一个房间里，有些学生会分心或落后。数字鸿沟也是问题，因为不是每个人都有安静的房间、稳定的网络或好的设备。因此，我认为最好的模式可能是混合式学习。在线工具可以提供机会和便利，而面对面课堂仍然能提供讨论、结构和人的支持。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-020",
    approach: "好员工题不要只讲 hardworking。按可靠性、沟通、适应力和团队合作组织。",
    frames: [
      "A good employee is not just someone who works long hours.",
      "Reliability matters because ...",
      "Communication is also essential.",
      "In modern workplaces, employees also need ...",
    ],
    vocabulary: [
      { phrase: "reliable", translation: "可靠的", note: "员工品质核心" },
      { phrase: "take initiative", translation: "主动做事", note: "职场高分表达" },
      { phrase: "adaptable", translation: "适应力强的", note: "现代职场关键词" },
      { phrase: "team player", translation: "有团队精神的人", note: "职场常用" },
      { phrase: "constructive feedback", translation: "建设性反馈", note: "沟通能力" },
    ],
    answer: [
      "A good employee is not just someone who works long hours. Reliability matters more. If a person finishes tasks on time, keeps promises and communicates problems early, colleagues can trust them. That kind of trust is the foundation of teamwork, especially when a project involves many people.",
      "Communication is also essential. A good employee should be able to explain ideas clearly, accept constructive feedback and give honest updates instead of hiding mistakes. In modern workplaces, employees also need to be adaptable, because technology and customer needs change quickly. I would say the best employees are team players who take initiative, but they do not create drama or make everything about themselves.",
    ],
    answerTranslation: [
      "好员工并不只是工作时间很长的人。可靠性更重要。如果一个人能按时完成任务、遵守承诺，并且在问题刚出现时就及时沟通，同事就会信任他。这种信任是团队合作的基础，尤其是当一个项目涉及很多人时。",
      "沟通也很关键。好员工应该能够清楚解释想法，接受建设性反馈，并诚实更新进度，而不是隐藏错误。在现代职场中，员工还需要有适应力，因为技术和客户需求变化很快。我会说，最好的员工是有团队精神、能主动做事的人，但他们不会制造戏剧化冲突，也不会把所有事情都变成围绕自己展开。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-021",
    approach: "失败与成功题要避免鸡汤。先承认失败本身不会自动带来成功，再讲反馈、韧性和调整方法。",
    frames: [
      "Failure can lead to success, but only if ...",
      "The useful part of failure is that ...",
      "It teaches people to ...",
      "Without reflection, however, ...",
    ],
    vocabulary: [
      { phrase: "resilience", translation: "韧性；抗挫力", note: "BBC 高频品质词" },
      { phrase: "learn from setbacks", translation: "从挫折中学习", note: "失败题核心" },
      { phrase: "adjust the strategy", translation: "调整策略", note: "说明如何转化失败" },
      { phrase: "fascinating failure", translation: "有启发的失败", note: "BBC 表达，可用于理性讨论" },
      { phrase: "growth mindset", translation: "成长型思维", note: "教育和成功话题通用" },
    ],
    answer: [
      "Failure can lead to success, but only if people are willing to reflect on it. The useful part of failure is that it gives very direct feedback. If someone fails an exam, loses a competition or makes a poor business decision, the experience can show exactly where the weakness is. That gives them a chance to adjust the strategy rather than repeat the same mistake.",
      "Failure also teaches resilience. People who have gone through setbacks may become less afraid of uncertainty, because they know one bad result is not the end of the story. However, failure does not magically create success. If a person blames everyone else or refuses to change, failure is just painful. So I would say failure becomes valuable only when it is treated as information, not as proof that someone is hopeless.",
    ],
    answerTranslation: [
      "失败可以通向成功，但前提是人们愿意反思它。失败有用的地方在于，它会给出非常直接的反馈。如果一个人考试失败、比赛输了，或者做了一个糟糕的商业决定，这段经历能清楚显示弱点在哪里。这就给了他们调整策略的机会，而不是重复同样的错误。",
      "失败也会教会人韧性。经历过挫折的人可能会变得不那么害怕不确定性，因为他们知道一次坏结果并不意味着故事结束。不过，失败不会神奇地自动创造成功。如果一个人总是责怪别人，或者拒绝改变，那失败就只是痛苦而已。所以我认为，只有当失败被看作信息，而不是看作某个人无可救药的证明时，它才有价值。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-022",
    approach: "困难目标动机题从内在动机、外在奖励和社会支持展开。结尾强调长期目标需要意义感。",
    frames: [
      "People are motivated by different things.",
      "External rewards can help, especially when ...",
      "But for difficult goals, inner motivation is ...",
      "Support from others also makes ...",
    ],
    vocabulary: [
      { phrase: "inner motivation", translation: "内在动机", note: "成功抱负题核心" },
      { phrase: "external reward", translation: "外在奖励", note: "与内在动机形成对比" },
      { phrase: "sense of achievement", translation: "成就感", note: "解释坚持原因" },
      { phrase: "long-term commitment", translation: "长期投入", note: "困难目标关键词" },
      { phrase: "keep going", translation: "坚持下去", note: "自然口语表达" },
    ],
    answer: [
      "People are motivated by different things. External rewards, such as money, grades or praise, can certainly help, especially at the beginning. They make the goal feel concrete and give people a reason to keep going when progress is slow. For example, a student may study harder because they want a scholarship or a better career later.",
      "But for truly difficult goals, inner motivation is usually more important. If someone wants to become a doctor, start a business or master a language, they need long-term commitment, not just a quick reward. A strong sense of achievement and personal meaning can carry them through boring or stressful stages. Support from family, teachers or teammates also matters, because people are more likely to persist when they feel their effort is noticed and valued.",
    ],
    answerTranslation: [
      "人们会被不同的东西激励。金钱、分数或表扬这样的外在奖励当然有帮助，尤其是在刚开始的时候。它们会让目标更具体，也会在人进步缓慢时给人继续坚持的理由。比如，学生可能会因为想拿奖学金或以后有更好的职业而更努力学习。",
      "但对于真正困难的目标来说，内在动机通常更重要。如果一个人想成为医生、创业，或者掌握一门语言，他们需要的是长期投入，而不只是快速奖励。强烈的成就感和个人意义能帮助他们熬过无聊或压力大的阶段。来自家人、老师或队友的支持也很重要，因为当人们感觉自己的努力被看见、被重视时，更容易坚持下去。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-023",
    approach: "创造力题不要说天赋决定。强调输入、跨领域经验、试错和安全环境。",
    frames: [
      "Creativity is not only a natural gift.",
      "Individuals can become more creative by ...",
      "They also need space to ...",
      "A creative person often connects ...",
    ],
    vocabulary: [
      { phrase: "creative thinking", translation: "创造性思维", note: "抽象观点核心" },
      { phrase: "trial and error", translation: "试错", note: "创新过程" },
      { phrase: "cross-disciplinary", translation: "跨学科的", note: "高级但可迁移" },
      { phrase: "spark new ideas", translation: "激发新想法", note: "BBC 风格搭配" },
      { phrase: "safe space", translation: "安全空间", note: "解释创造环境" },
    ],
    answer: [
      "Creativity is not only a natural gift. Individuals can become more creative by exposing themselves to different ideas, people and experiences. If someone only reads the same type of book and talks to the same group of people, their thinking may become narrow. Cross-disciplinary learning, like mixing technology with art or business with psychology, can spark new ideas.",
      "People also need space for trial and error. Many creative ideas look strange or unrealistic at first, so if a person is afraid of being judged, they may stop experimenting too early. A safe space does not mean there are no standards; it means mistakes are treated as part of the process. In my opinion, creativity grows when people collect diverse input and have the courage to combine it in unexpected ways.",
    ],
    answerTranslation: [
      "创造力不只是天生的礼物。个人可以通过接触不同的想法、人和经历来变得更有创造力。如果一个人只读同一种书，只和同一群人交流，思维就可能变窄。跨学科学习，比如把科技和艺术结合，或把商业和心理学结合，都可能激发新想法。",
      "人们也需要试错的空间。许多创造性的想法一开始看起来都很奇怪或不现实，所以如果一个人害怕被评价，就可能太早停止尝试。安全空间并不意味着没有标准，而是意味着错误会被看作过程的一部分。在我看来，当人们收集多样化输入，并有勇气以意想不到的方式把它们结合起来时，创造力就会增长。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-024",
    approach: "竞争题要平衡：适度竞争提高标准，过度竞争损害健康和合作。",
    frames: [
      "Competition can be useful when ...",
      "It pushes people to ...",
      "However, it becomes harmful if ...",
      "The healthiest form of competition is ...",
    ],
    vocabulary: [
      { phrase: "raise the standard", translation: "提高标准", note: "竞争积极作用" },
      { phrase: "healthy competition", translation: "良性竞争", note: "核心判断" },
      { phrase: "burnout", translation: "过度消耗；倦怠", note: "负面影响" },
      { phrase: "collaboration", translation: "合作", note: "与竞争对比" },
      { phrase: "zero-sum game", translation: "零和游戏", note: "抽象题高分表达" },
    ],
    answer: [
      "Competition can be useful when it is fair and reasonable. It pushes people to work harder, raise the standard and discover what they are capable of. In school or business, a bit of healthy competition can create energy and prevent people from becoming too comfortable.",
      "However, competition is not always a good thing. If people treat everything as a zero-sum game, they may stop sharing ideas and become anxious or selfish. In extreme cases, constant comparison can lead to burnout, especially among students who feel they must be the best at everything. I think the healthiest form of competition is one where people try to improve themselves while still respecting others. Competition should encourage progress, not destroy collaboration or mental health.",
    ],
    answerTranslation: [
      "当竞争公平且适度时，它是有用的。它会推动人们更努力，提高标准，并发现自己的能力。在学校或商业中，一点良性竞争可以带来活力，也能防止人们过于安逸。",
      "不过，竞争并不总是好事。如果人们把所有事情都看成零和游戏，他们可能会停止分享想法，变得焦虑或自私。在极端情况下，持续比较可能导致倦怠，尤其是对那些觉得自己每件事都必须最优秀的学生来说。我认为最健康的竞争，是人们努力提升自己，同时仍然尊重他人。竞争应该鼓励进步，而不是破坏合作或心理健康。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-025",
    approach: "成功与金钱题要承认金钱重要但不充分。分基本安全、社会贡献、关系和自由度。",
    frames: [
      "Money is one measure of success, but ...",
      "It matters because ...",
      "However, success also includes ...",
      "A person can be wealthy but ...",
    ],
    vocabulary: [
      { phrase: "financial security", translation: "经济安全感", note: "金钱成功题核心" },
      { phrase: "quality of life", translation: "生活质量", note: "综合评价" },
      { phrase: "personal fulfilment", translation: "个人成就感/满足感", note: "非金钱成功" },
      { phrase: "social contribution", translation: "社会贡献", note: "价值维度" },
      { phrase: "measure success", translation: "衡量成功", note: "题干核心动词" },
    ],
    answer: [
      "Money is one measure of success, but it should not be the only measure. It matters because financial security gives people choices. If someone cannot pay rent or medical bills, it is hard to talk about personal dreams. Money can improve quality of life and reduce many practical worries.",
      "However, success also includes personal fulfilment, relationships and social contribution. A person can be wealthy but lonely, unhealthy or ashamed of the way they earned their money. At the same time, a teacher, nurse or volunteer may not be extremely rich, but their work can be meaningful and respected. So I would measure success by whether a person has enough security, a sense of purpose and a positive impact on others, not by income alone.",
    ],
    answerTranslation: [
      "金钱是衡量成功的一种方式，但不应该是唯一方式。它很重要，因为经济安全感会给人选择。如果一个人连房租或医疗账单都付不起，就很难谈个人梦想。金钱能改善生活质量，也能减少很多现实担忧。",
      "不过，成功还包括个人满足感、人际关系和社会贡献。一个人可以很富有，但很孤独、不健康，或者对自己赚钱的方式感到羞愧。同时，老师、护士或志愿者可能并不特别富有，但他们的工作可以很有意义，也值得尊重。所以我会用一个人是否拥有足够安全感、目标感，以及是否对他人产生积极影响来衡量成功，而不只是看收入。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-026",
    approach: "观点影响题从家庭、教育、媒体和同伴四类分析。强调人并非完全理性。",
    frames: [
      "People’s opinions are shaped by several forces.",
      "Family and education often create ...",
      "Media also plays a major role because ...",
      "Peer groups can make people ...",
    ],
    vocabulary: [
      { phrase: "shape opinions", translation: "塑造观点", note: "题目核心" },
      { phrase: "upbringing", translation: "成长环境/家庭教育", note: "家庭影响" },
      { phrase: "media exposure", translation: "媒体接触", note: "现代观点来源" },
      { phrase: "peer pressure", translation: "同伴压力", note: "社交影响" },
      { phrase: "confirmation bias", translation: "确认偏误", note: "抽象观点高分词" },
    ],
    answer: [
      "People’s opinions are shaped by several forces. Family and upbringing often create the first set of beliefs, because children usually absorb what they hear at home before they are able to question it. Education can either strengthen those views or challenge them by teaching people to compare evidence and think more critically.",
      "Media exposure also plays a major role today. News, influencers and algorithms can decide what information people see every day, and that can lead to confirmation bias. Peer pressure matters too, especially for teenagers and young adults who want to fit in. I don’t think people form opinions in a completely rational way. Most of us are influenced by emotion, identity and the people around us, even when we believe we are being independent.",
    ],
    answerTranslation: [
      "人们的观点受到多种力量塑造。家庭和成长环境通常会形成最初的一套信念，因为孩子在能够质疑之前，往往会吸收家里听到的东西。教育可以强化这些观点，也可以通过教人比较证据和更批判性地思考来挑战它们。",
      "如今，媒体接触也扮演着重要角色。新闻、网红和算法可以决定人们每天看到什么信息，而这可能导致确认偏误。同伴压力也很重要，尤其是对想融入群体的青少年和年轻成年人来说。我不认为人们形成观点的过程完全理性。我们大多数人都会受到情绪、身份认同和周围人的影响，即使我们相信自己很独立。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-027",
    approach: "文化与身份题讲语言、习俗、价值观和归属感，同时承认身份会变化。",
    frames: [
      "Culture gives people a framework for ...",
      "It influences ...",
      "At the same time, identity is not fixed.",
      "People can belong to ...",
    ],
    vocabulary: [
      { phrase: "sense of identity", translation: "身份认同感", note: "文化题核心" },
      { phrase: "cultural heritage", translation: "文化遗产", note: "BBC 文化类表达" },
      { phrase: "shared values", translation: "共同价值观", note: "文化凝聚力" },
      { phrase: "belonging", translation: "归属感", note: "身份题核心" },
      { phrase: "adapt to", translation: "适应", note: "身份变化" },
    ],
    answer: [
      "Culture gives people a framework for understanding who they are. It influences language, food, festivals, manners and even the way people show respect. These everyday habits may seem small, but together they create a sense of identity and belonging. Cultural heritage also connects people to previous generations, so they feel part of a longer story.",
      "At the same time, identity is not fixed. People move to new places, learn new languages and adapt to different social norms. A person can belong to more than one culture, especially in a globalised world. I think culture plays an important role in identity, but it should not become a cage. It should give people roots, while still allowing them to grow and choose who they want to become.",
    ],
    answerTranslation: [
      "文化给人们提供了理解自己是谁的框架。它会影响语言、食物、节日、礼仪，甚至人们表达尊重的方式。这些日常习惯看起来可能很小，但合在一起就会形成身份认同感和归属感。文化遗产也把人们和上一代人连接起来，让他们感觉自己属于一个更长的故事。",
      "同时，身份并不是固定不变的。人们会搬到新地方，学习新语言，并适应不同的社会规范。一个人可以属于不止一种文化，尤其是在全球化的世界中。我认为文化在身份认同中扮演重要角色，但它不应该变成牢笼。它应该给人根，同时也允许人们成长，并选择自己想成为什么样的人。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-028",
    approach: "时间价值题从年龄、职业、经济压力和文化差异解释。强调时间对不同人稀缺程度不同。",
    frames: [
      "People value time differently because ...",
      "Age makes a difference because ...",
      "Work and income also affect ...",
      "So time is not just a clock issue; it is ...",
    ],
    vocabulary: [
      { phrase: "time pressure", translation: "时间压力", note: "时间价值题核心" },
      { phrase: "life stage", translation: "人生阶段", note: "年龄差异" },
      { phrase: "opportunity cost", translation: "机会成本", note: "经济学表达" },
      { phrase: "work-life balance", translation: "工作生活平衡", note: "现代时间观" },
      { phrase: "time to spare", translation: "富余时间", note: "BBC 口语短语" },
    ],
    answer: [
      "People value time differently because their life stage and responsibilities are different. A teenager may feel they have plenty of time to spare, while a parent with a full-time job may feel every hour is limited. Age also matters because older people may become more aware that time is not endless, so they value family moments or health more deeply.",
      "Work and income also affect people’s attitude to time. For someone paid by the hour, time has a very clear financial meaning. For someone under heavy time pressure, free time may feel more valuable than money. There is also the idea of opportunity cost: choosing one activity means giving up another. So time is not just a clock issue; it is connected with freedom, responsibility and personal priorities.",
    ],
    answerTranslation: [
      "人们对时间的重视程度不同，是因为他们的人生阶段和责任不同。青少年可能觉得自己有很多富余时间，而一个有全职工作的家长可能觉得每个小时都很有限。年龄也很重要，因为年长的人可能更意识到时间不是无限的，所以会更深刻地重视家庭时刻或健康。",
      "工作和收入也会影响人们对时间的态度。对按小时计酬的人来说，时间有非常明确的金钱意义。对时间压力很大的人来说，空闲时间可能比金钱更宝贵。还有机会成本的概念：选择一项活动就意味着放弃另一项。所以时间不只是钟表问题，它和自由、责任以及个人优先级都有关。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-029",
    approach: "学校实用技能题要平衡理论和实践。列举财务、沟通、数字素养和健康管理。",
    frames: [
      "Yes, schools should teach practical skills, but ...",
      "Academic knowledge is still important because ...",
      "Practical skills help students ...",
      "The ideal curriculum would combine ...",
    ],
    vocabulary: [
      { phrase: "practical skills", translation: "实用技能", note: "题目核心" },
      { phrase: "financial literacy", translation: "金融素养", note: "生活技能例子" },
      { phrase: "digital literacy", translation: "数字素养", note: "现代教育重点" },
      { phrase: "communication skills", translation: "沟通能力", note: "可迁移技能" },
      { phrase: "bridge the gap", translation: "弥合差距", note: "理论与实践衔接" },
    ],
    answer: [
      "Yes, schools should teach practical skills, but not at the expense of academic knowledge. Subjects like maths, science and history still matter because they train students to think logically and understand the world. However, many students leave school without knowing how to manage money, communicate professionally or judge online information.",
      "Practical skills can bridge the gap between school and adult life. Financial literacy, digital literacy, basic first aid and communication skills would help young people become more independent. The ideal curriculum would combine theory with real-life application. For example, maths lessons could include budgeting, and language lessons could include presentations or interviews. That way, students learn both knowledge and how to use it outside the classroom.",
    ],
    answerTranslation: [
      "是的，学校应该教授实用技能，但不能以牺牲学术知识为代价。数学、科学和历史这样的学科仍然重要，因为它们训练学生逻辑思考，也帮助学生理解世界。不过，许多学生毕业时并不知道如何管理金钱、进行职业化沟通，或判断网上信息。",
      "实用技能可以弥合学校和成年生活之间的差距。金融素养、数字素养、基础急救和沟通能力都会帮助年轻人变得更独立。理想的课程应该把理论和现实应用结合起来。比如数学课可以包含预算内容，语言课可以包含演讲或面试。这样，学生既能学习知识，也能学习如何在课堂之外使用知识。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-030",
    approach: "终身学习题从职业变化、个人成长和社会适应回答。强调不是只为考试。",
    frames: [
      "Lifelong learning is valuable because ...",
      "In the workplace, it helps people ...",
      "On a personal level, ...",
      "It also makes society ...",
    ],
    vocabulary: [
      { phrase: "lifelong learning", translation: "终身学习", note: "题目关键词" },
      { phrase: "reskill", translation: "学习新技能以适应新工作", note: "未来工作常用" },
      { phrase: "stay relevant", translation: "保持竞争力/不过时", note: "职业角度" },
      { phrase: "personal growth", translation: "个人成长", note: "非职业好处" },
      { phrase: "adapt to change", translation: "适应变化", note: "社会适应" },
    ],
    answer: [
      "Lifelong learning is valuable because the world changes too quickly for education to stop at graduation. In the workplace, people need to reskill and stay relevant as technology changes. A person who refuses to learn may find that their old knowledge is no longer enough, even if they were successful before.",
      "On a personal level, lifelong learning also brings personal growth. Learning a new language, a musical instrument or even a cooking skill can make life more interesting and give people confidence. It also makes society more adaptable. If adults keep learning, they are less likely to be left behind by new technology or social changes. So lifelong learning is not just about exams; it is a way to remain curious and capable throughout life.",
    ],
    answerTranslation: [
      "终身学习很有价值，因为世界变化太快，教育不能在毕业时就停止。在职场中，随着技术变化，人们需要学习新技能并保持竞争力。一个拒绝学习的人可能会发现，即使自己以前很成功，旧知识也已经不够用了。",
      "从个人层面看，终身学习也会带来个人成长。学习一门新语言、一种乐器，甚至一种烹饪技能，都能让生活更有趣，也能给人自信。它也会让社会更有适应力。如果成年人持续学习，就不太容易被新技术或社会变化甩在后面。所以终身学习不只是为了考试，它是一种让人一生保持好奇和能力的方式。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-031",
    approach: "老建筑保留题要平衡文化认同和城市发展。引入 adaptive reuse，不简单二选一。",
    frames: [
      "Old buildings should be preserved when ...",
      "They carry ...",
      "However, preservation should not mean ...",
      "A practical solution is ...",
    ],
    vocabulary: [
      { phrase: "cultural heritage", translation: "文化遗产", note: "老建筑题核心" },
      { phrase: "historical character", translation: "历史特色", note: "城市风貌" },
      { phrase: "adaptive reuse", translation: "适应性再利用", note: "高分解决方案" },
      { phrase: "urban development", translation: "城市发展", note: "对比观点" },
      { phrase: "knock down", translation: "拆除", note: "自然口语动词短语" },
    ],
    answer: [
      "Old buildings should be preserved when they have real cultural heritage or historical character. They are not just piles of bricks. They show how people lived, what a city valued and how architecture changed over time. If every old building is knocked down and replaced by the same glass towers, cities may become efficient but lose their memory.",
      "However, preservation should not mean freezing a city in the past. Some old buildings are unsafe or have no special value, and cities also need housing, transport and modern services. A practical solution is adaptive reuse. For example, an old factory can become a museum, bookstore or community centre. That way, the building keeps its character while serving present-day needs. So I support preservation, but it has to be selective and useful.",
    ],
    answerTranslation: [
      "当老建筑具有真正的文化遗产价值或历史特色时，就应该被保护。它们不只是一堆砖头。它们展示了人们曾经如何生活、一座城市曾经重视什么，以及建筑如何随着时间变化。如果每一栋老建筑都被拆掉，换成一样的玻璃高楼，城市也许会变得高效，但会失去记忆。",
      "不过，保护并不应该意味着把城市冻结在过去。有些老建筑不安全，或者没有特别价值，而城市也需要住房、交通和现代服务。一个实际的解决方案是适应性再利用。比如，一座老工厂可以变成博物馆、书店或社区中心。这样，建筑保留了自身特色，同时也服务于当代需求。所以我支持保护老建筑，但这种保护必须有选择性，也要有实际用途。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-032",
    approach: "博物馆社会作用题从教育、保护、公共空间和身份认同回答。补充互动体验的重要性。",
    frames: [
      "Museums play several roles in society.",
      "First, they protect ...",
      "They also educate people by ...",
      "Modern museums should make ...",
    ],
    vocabulary: [
      { phrase: "preserve artefacts", translation: "保存文物", note: "博物馆功能" },
      { phrase: "public education", translation: "公共教育", note: "社会角色" },
      { phrase: "interactive exhibits", translation: "互动展览", note: "现代博物馆" },
      { phrase: "collective memory", translation: "集体记忆", note: "文化类高分表达" },
      { phrase: "spark curiosity", translation: "激发好奇心", note: "BBC 风格搭配" },
    ],
    answer: [
      "Museums play several roles in society. First, they preserve artefacts and protect collective memory. Without museums, many objects connected to history, science or art might disappear into private collections or simply be forgotten. They give the public a chance to see evidence of the past directly.",
      "Museums also provide public education outside the classroom. A good museum can spark curiosity because visitors learn through objects, stories and space, not only through textbooks. Modern museums should not be silent rooms full of labels. Interactive exhibits, guided activities and digital displays can help people, especially children, connect with the material. In this sense, museums are cultural institutions, but they are also shared public spaces where society can reflect on who it is.",
    ],
    answerTranslation: [
      "博物馆在社会中扮演多重角色。首先，它们保存文物并保护集体记忆。如果没有博物馆，许多与历史、科学或艺术相关的物品可能会进入私人收藏，或者干脆被遗忘。博物馆让公众有机会直接看到过去留下的证据。",
      "博物馆也提供课堂之外的公共教育。好的博物馆能够激发好奇心，因为参观者是通过物品、故事和空间学习，而不只是通过课本学习。现代博物馆不应该只是满是说明牌的安静房间。互动展览、导览活动和数字展示能帮助人们，尤其是孩子，与展品建立联系。从这个意义上说，博物馆是文化机构，同时也是共享公共空间，让社会能反思自己是谁。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-033",
    approach: "旅游利弊题要平衡经济收益和社区压力。用可持续旅游作为结论。",
    frames: [
      "Tourism can be both beneficial and harmful.",
      "The benefit is that ...",
      "The harm appears when ...",
      "The key is to develop ...",
    ],
    vocabulary: [
      { phrase: "local communities", translation: "当地社区", note: "题干核心" },
      { phrase: "sustainable tourism", translation: "可持续旅游", note: "解决方案" },
      { phrase: "overcrowding", translation: "过度拥挤", note: "旅游负面影响" },
      { phrase: "cultural authenticity", translation: "文化真实感", note: "文化商品化讨论" },
      { phrase: "boost the local economy", translation: "促进当地经济", note: "经济好处" },
    ],
    answer: [
      "Tourism can be both beneficial and harmful to local communities. The clear benefit is that it can boost the local economy. Hotels, restaurants, guides and small shops all receive income from visitors, and tourism can create jobs in places where other industries are limited.",
      "The harm appears when tourism grows too fast. Overcrowding can make daily life difficult for residents, and rising prices may push local people out of their own neighbourhoods. There is also the risk that cultural authenticity becomes a product, where traditions are performed only for tourists. The key is sustainable tourism. Governments should limit damage, involve local residents in decisions and make sure the money does not only go to big companies. Tourism is useful when it supports a community rather than taking it over.",
    ],
    answerTranslation: [
      "旅游对当地社区既可能有益，也可能有害。明显的好处是，它能促进当地经济。酒店、餐馆、导游和小商店都能从游客那里获得收入，而在其他产业有限的地方，旅游也能创造就业。",
      "当旅游发展太快时，危害就会出现。过度拥挤会让居民的日常生活变得困难，价格上涨也可能把当地人挤出自己的社区。还有一种风险是，文化真实感变成商品，传统只为了游客而表演。关键在于可持续旅游。政府应该限制损害，让当地居民参与决策，并确保收入不是只流向大公司。当旅游支持一个社区，而不是占据一个社区时，它才是有用的。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-034",
    approach: "有意义旅行题区分打卡和沉浸。强调人与地方、文化和自我理解之间的连接。",
    frames: [
      "A meaningful travel experience is not only about ...",
      "It becomes meaningful when ...",
      "Local interaction matters because ...",
      "Sometimes the most memorable part is ...",
    ],
    vocabulary: [
      { phrase: "cultural immersion", translation: "文化沉浸", note: "旅行意义核心" },
      { phrase: "checklist tourism", translation: "打卡式旅游", note: "与深度旅行对比" },
      { phrase: "local perspective", translation: "当地视角", note: "旅行深度" },
      { phrase: "broaden one’s horizons", translation: "开阔眼界", note: "旅行题通用" },
      { phrase: "step out of the routine", translation: "跳出日常", note: "旅行作用" },
    ],
    answer: [
      "A meaningful travel experience is not only about visiting famous landmarks or taking good photos. It becomes meaningful when the traveller gains a local perspective or understands something about the place that they did not know before. Cultural immersion, even in a small way, matters more than simply following a checklist.",
      "Local interaction is important because it reminds travellers that a destination is someone’s home, not just a background for pictures. Talking to residents, trying local food respectfully or learning a bit of history can broaden one’s horizons. Sometimes the most memorable part is not the big attraction but a conversation, a quiet street or a moment when you step out of your normal routine and see life differently. That is what makes travel meaningful to me.",
    ],
    answerTranslation: [
      "有意义的旅行不只是参观著名地标或拍好看的照片。当旅行者获得当地视角，或者理解了自己以前不知道的地方内容时，旅行才变得有意义。哪怕只是小范围的文化沉浸，也比单纯按清单打卡更重要。",
      "和当地人的互动很重要，因为它提醒旅行者，一个目的地是某些人的家，而不只是拍照背景。和居民聊天、尊重地尝试当地食物，或者了解一点历史，都能开阔眼界。有时最难忘的部分并不是大型景点，而是一段对话、一条安静的街道，或者一个让你跳出日常、以不同方式看待生活的时刻。对我来说，这才是旅行有意义的地方。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-035",
    approach: "企业培训题从技能更新、员工忠诚度和企业成本角度回答。结尾指出双方责任。",
    frames: [
      "Yes, companies should provide training because ...",
      "It is a long-term investment, not just ...",
      "Employees also benefit because ...",
      "However, workers should also ...",
    ],
    vocabulary: [
      { phrase: "staff training", translation: "员工培训", note: "题目核心" },
      { phrase: "long-term investment", translation: "长期投资", note: "企业角度" },
      { phrase: "upskill employees", translation: "提升员工技能", note: "未来工作高频" },
      { phrase: "employee loyalty", translation: "员工忠诚度", note: "企业收益" },
      { phrase: "keep pace with change", translation: "跟上变化", note: "BBC 风格搭配" },
    ],
    answer: [
      "Yes, companies should provide training because skills become outdated very quickly. Staff training is not just a cost; it is a long-term investment. If a company helps employees learn new software, communication methods or management skills, the whole organisation can keep pace with change instead of constantly hiring new people.",
      "Employees also benefit because training gives them confidence and a clearer career path. It can improve employee loyalty, since people are more likely to stay when they feel the company is investing in their growth. However, workers should also take responsibility for their own learning. A company can provide opportunities, but employees still need to practise and apply the skills. So training works best when both sides treat it seriously.",
    ],
    answerTranslation: [
      "是的，企业应该提供培训，因为技能变得过时的速度很快。员工培训不只是成本，而是一种长期投资。如果公司帮助员工学习新软件、沟通方式或管理技能，整个组织就能跟上变化，而不是不断招聘新人。",
      "员工也会受益，因为培训能给他们信心，也能让职业路径更清晰。它还可以提高员工忠诚度，因为当人们感觉公司在投资他们的成长时，更可能留下来。不过，员工也应该对自己的学习负责。公司可以提供机会，但员工仍然需要练习并应用这些技能。所以，当双方都认真对待时，培训效果最好。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-036",
    approach: "远程工作题平衡效率和社交需求。不要预测绝对化，强调混合办公更可能长期存在。",
    frames: [
      "Remote work will probably remain common, but ...",
      "It is useful because ...",
      "However, it can weaken ...",
      "A hybrid model may be ...",
    ],
    vocabulary: [
      { phrase: "remote work", translation: "远程工作", note: "题目关键词" },
      { phrase: "hybrid model", translation: "混合办公模式", note: "平衡答案核心" },
      { phrase: "workplace culture", translation: "职场文化", note: "远程办公缺点" },
      { phrase: "flexible hours", translation: "灵活时间", note: "BBC 词汇 flexible 用法" },
      { phrase: "blur the boundary", translation: "模糊边界", note: "工作生活边界" },
    ],
    answer: [
      "Remote work will probably remain common, but I don’t think it will completely replace offices. It is useful because it saves commuting time, gives employees flexible hours and allows companies to hire people from different cities. For tasks that require deep focus, working from home can be more efficient than sitting in a noisy office.",
      "However, remote work can weaken workplace culture. New employees may find it harder to learn from others, and teams may miss the casual conversations that build trust. It can also blur the boundary between work and private life, because people keep checking messages at night. For that reason, a hybrid model may be the most realistic future. People can work remotely for focus, but still meet in person for training, teamwork and important discussions.",
    ],
    answerTranslation: [
      "远程工作很可能会继续普遍存在，但我不认为它会完全取代办公室。它很有用，因为它节省通勤时间，给员工灵活时间，也让公司能从不同城市招聘人才。对于需要深度专注的任务来说，在家工作可能比坐在嘈杂办公室里更高效。",
      "不过，远程工作可能会削弱职场文化。新员工可能更难向别人学习，团队也可能失去那些能建立信任的随意交流。它还可能模糊工作和私人生活的边界，因为人们晚上也会不停查看消息。因此，混合办公模式可能是最现实的未来。人们可以远程完成需要专注的工作，但仍然面对面进行培训、团队合作和重要讨论。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-037",
    approach: "广告影响题要承认影响存在，但不是完全控制。分析情绪、名人、重复曝光和理性决策。",
    frames: [
      "Advertisements definitely influence people, even when ...",
      "They often work by ...",
      "Celebrity endorsement can ...",
      "Consumers can protect themselves by ...",
    ],
    vocabulary: [
      { phrase: "purchasing decisions", translation: "购买决策", note: "题目关键词" },
      { phrase: "brand awareness", translation: "品牌认知", note: "广告作用" },
      { phrase: "celebrity endorsement", translation: "名人代言", note: "消费题高频" },
      { phrase: "emotional appeal", translation: "情感吸引", note: "广告心理" },
      { phrase: "make an informed choice", translation: "做出知情选择", note: "理性消费" },
    ],
    answer: [
      "Advertisements definitely influence people, even when they believe they are being rational. Ads do not always make someone buy a product immediately, but they build brand awareness through repetition. Later, when the person sees the product in a shop, it already feels familiar, and that familiarity can affect the purchasing decision.",
      "Many advertisements also use emotional appeal. They connect a product with beauty, success, friendship or a better lifestyle. Celebrity endorsement can make this stronger because fans may trust the celebrity more than the product itself. However, consumers are not helpless. They can compare reviews, check whether they really need the product and make an informed choice. So advertising influences people, but careful consumers can reduce that influence.",
    ],
    answerTranslation: [
      "广告确实会影响人们，即使他们认为自己很理性。广告不一定会让某个人立刻购买产品，但它们会通过重复曝光建立品牌认知。之后，当这个人在商店里看到这个产品时，它已经显得熟悉，而这种熟悉感会影响购买决策。",
      "很多广告也会使用情感吸引。它们把产品和美丽、成功、友谊或更好的生活方式联系起来。名人代言会让这种影响更强，因为粉丝可能信任名人超过信任产品本身。不过，消费者并不是完全无助的。他们可以比较评论，检查自己是否真的需要这个产品，并做出知情选择。所以广告会影响人，但谨慎的消费者可以降低这种影响。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-038",
    approach: "买不需要的东西题用消费主义、情绪消费和极简主义平衡。不要道德审判。",
    frames: [
      "Buying things we don’t need is understandable, but ...",
      "Sometimes people buy for emotional reasons.",
      "The problem appears when ...",
      "A better approach is to ...",
    ],
    vocabulary: [
      { phrase: "consumer culture", translation: "消费文化", note: "消费题核心" },
      { phrase: "instant gratification", translation: "即时满足感", note: "BBC 词汇，情绪消费" },
      { phrase: "impulse buying", translation: "冲动购物", note: "消费行为" },
      { phrase: "minimalism", translation: "极简主义", note: "对比观点" },
      { phrase: "declutter", translation: "清理杂物", note: "购物后果和解决" },
    ],
    answer: [
      "Buying things we don’t need is understandable, but it can become a problem if it turns into a habit. Sometimes people buy for emotional reasons. A new item may offer instant gratification after a stressful day, and online shopping makes impulse buying extremely easy. In consumer culture, people are also encouraged to connect products with identity and happiness.",
      "The problem appears when unnecessary shopping creates waste, debt or clutter. People may own more things but feel less satisfied, because the excitement disappears quickly. I don’t think everyone needs to become a strict minimalist, because small treats can be harmless. A better approach is to pause before buying and ask whether the item will still be useful a month later. That simple delay can prevent a lot of emotional spending.",
    ],
    answerTranslation: [
      "购买并不需要的东西是可以理解的，但如果它变成一种习惯，就会成为问题。有时候人们购物是出于情绪原因。一件新东西可能在压力大的一天后带来即时满足感，而网购让冲动购物变得非常容易。在消费文化中，人们也被鼓励把产品和身份、幸福联系起来。",
      "当不必要的购物造成浪费、债务或杂物时，问题就出现了。人们可能拥有更多东西，却更不满足，因为兴奋感很快就消失。我不认为每个人都需要成为严格的极简主义者，因为偶尔的小犒劳并没有坏处。更好的做法是在购买前暂停一下，问问自己这个东西一个月后是否仍然有用。这个简单的延迟就能避免很多情绪消费。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-039",
    approach: "手工与机器制造题从效率、独特性、文化价值和价格回答。不要把机器制造说得一无是处。",
    frames: [
      "Handmade products and machine-made products have different value.",
      "Machine-made goods are valuable because ...",
      "Handmade products, however, often carry ...",
      "The choice depends on ...",
    ],
    vocabulary: [
      { phrase: "craftsmanship", translation: "工艺；手艺", note: "手工产品核心" },
      { phrase: "mass production", translation: "大规模生产", note: "机器制造" },
      { phrase: "cultural value", translation: "文化价值", note: "传统产品角度" },
      { phrase: "unique character", translation: "独特个性", note: "手工产品优势" },
      { phrase: "cost-effective", translation: "性价比高的", note: "机器制造优势" },
    ],
    answer: [
      "Handmade products and machine-made products have different value. Machine-made goods are valuable because mass production makes items cheaper, more consistent and easier to access. For everyday objects like pens, plates or basic clothes, people often need something cost-effective rather than something unique.",
      "Handmade products, however, often carry craftsmanship and cultural value. A handmade basket, piece of pottery or traditional food may show local skills and family traditions. Small imperfections can give the product unique character, because you can feel that a real person made it. The choice depends on purpose. For daily convenience, machine-made products are practical. For gifts, cultural items or special occasions, handmade products may feel more meaningful.",
    ],
    answerTranslation: [
      "手工产品和机器制造产品有不同的价值。机器制造商品有价值，是因为大规模生产能让物品更便宜、更稳定，也更容易获得。对于笔、盘子或基础衣物这样的日常物品，人们通常需要的是性价比高，而不是独一无二。",
      "不过，手工产品往往承载着工艺和文化价值。一个手工篮子、一件陶器或一种传统食物，可能展示了当地技艺和家庭传统。小小的不完美会给产品独特个性，因为你能感受到它是真人制作的。选择取决于用途。为了日常便利，机器制造产品很实用。对于礼物、文化物品或特殊场合，手工产品可能更有意义。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-040",
    approach: "科技改变日用品题要从多功能、智能化和依赖性回答。举手机、手表、家电。",
    frames: [
      "Technology has made everyday objects smarter and more multifunctional.",
      "For example, ...",
      "This is convenient because ...",
      "The downside is that ...",
    ],
    vocabulary: [
      { phrase: "multifunctional", translation: "多功能的", note: "科技物品核心" },
      { phrase: "smart devices", translation: "智能设备", note: "现代日用品" },
      { phrase: "wearable tech", translation: "可穿戴科技", note: "BBC 词汇，手表耳机等" },
      { phrase: "convenience", translation: "便利性", note: "科技优点" },
      { phrase: "over-reliance", translation: "过度依赖", note: "平衡观点" },
    ],
    answer: [
      "Technology has made everyday objects smarter and more multifunctional. A phone is no longer just for calling; it is also a camera, wallet, map, calendar and study tool. Watches have become wearable tech that can count steps and track sleep. Even home appliances can now be controlled through apps.",
      "This is convenient because people can do many tasks with fewer objects and less time. Smart devices also help people monitor health, save energy and stay organised. The downside is over-reliance. When one device fails, many parts of daily life are affected at once. There is also the issue of privacy, because smart objects often collect data. So technology has improved everyday objects, but it has also made simple life more dependent on systems we do not always understand.",
    ],
    answerTranslation: [
      "科技让日常物品变得更智能，也更多功能。手机不再只是用来打电话，它也是相机、钱包、地图、日历和学习工具。手表已经变成可穿戴科技，可以计步和追踪睡眠。甚至家用电器现在也能通过应用控制。",
      "这很方便，因为人们可以用更少物品和更少时间完成很多任务。智能设备也能帮助人们监测健康、节约能源和保持条理。缺点是过度依赖。当一个设备出问题时，日常生活的很多部分会同时受到影响。隐私也是问题，因为智能物品经常收集数据。所以科技改善了日常物品，但也让简单生活更加依赖我们并不总是理解的系统。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-041",
    approach: "品牌商品题从质量信任、身份表达、社交压力和营销回答。避免批判所有品牌消费。",
    frames: [
      "People buy branded products for several reasons.",
      "One reason is trust.",
      "Another reason is identity and status.",
      "However, brands do not always mean ...",
    ],
    vocabulary: [
      { phrase: "brand loyalty", translation: "品牌忠诚", note: "消费类核心" },
      { phrase: "status symbol", translation: "身份象征", note: "品牌商品动机" },
      { phrase: "perceived quality", translation: "感知质量", note: "消费者心理" },
      { phrase: "social pressure", translation: "社交压力", note: "负面动机" },
      { phrase: "value for money", translation: "物有所值", note: "理性消费" },
    ],
    answer: [
      "People buy branded products for several reasons. One reason is trust. If a brand has a good reputation, consumers may believe the product has higher quality, better service or a safer return policy. This perceived quality reduces risk, especially when the item is expensive.",
      "Another reason is identity and status. Some branded products work as status symbols, showing taste, success or membership of a certain group. Social pressure can make this stronger, especially among young people who do not want to look out of place. However, brands do not always mean value for money. Sometimes people pay mainly for the logo. I think brand loyalty is reasonable when the product is genuinely reliable, but it becomes unhealthy when people buy things mainly to impress others.",
    ],
    answerTranslation: [
      "人们购买品牌商品有几个原因。一个原因是信任。如果一个品牌声誉好，消费者可能会相信产品质量更高、服务更好，或者退换政策更安全。这种感知质量会降低风险，尤其是当商品很贵的时候。",
      "另一个原因是身份和地位。有些品牌商品像身份象征，显示品味、成功或某个群体的成员身份。社交压力会让这种影响更强，尤其是在不想显得格格不入的年轻人中。不过，品牌并不总是意味着物有所值。有时候人们主要是在为标志付钱。我认为，当产品确实可靠时，品牌忠诚是合理的；但如果人们主要是为了给别人留下印象而购买，它就变得不健康了。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-042",
    approach: "个人环保贡献题用小行动和消费选择回答，同时承认制度支持更有效。",
    frames: [
      "Individuals can contribute through daily choices.",
      "Small actions matter when ...",
      "Consumer choices can also ...",
      "But individuals need support from ...",
    ],
    vocabulary: [
      { phrase: "environmental protection", translation: "环境保护", note: "题目核心" },
      { phrase: "carbon footprint", translation: "碳足迹", note: "BBC 环保表达" },
      { phrase: "reduce waste", translation: "减少浪费", note: "日常行动" },
      { phrase: "eco-friendly", translation: "环保的", note: "消费选择" },
      { phrase: "collective impact", translation: "集体影响", note: "小行动累积" },
    ],
    answer: [
      "Individuals can contribute to environmental protection through daily choices. They can reduce waste, carry reusable bags, save electricity, take public transport and avoid buying things they do not need. One person’s carbon footprint may seem small, but when many people change the same habit, the collective impact becomes meaningful.",
      "Consumer choices can also push companies to change. If more people choose eco-friendly products or avoid brands with wasteful packaging, businesses will notice. That said, individuals cannot solve everything alone. People need support from governments and companies, such as better recycling systems, cleaner transport and affordable green products. So personal action matters, but it works best when society makes the greener choice easier.",
    ],
    answerTranslation: [
      "个人可以通过日常选择为环境保护做贡献。他们可以减少浪费，携带可重复使用的袋子，节约用电，乘坐公共交通，并避免购买不需要的东西。一个人的碳足迹看起来可能很小，但当很多人改变同一个习惯时，集体影响就会变得有意义。",
      "消费者选择也能推动企业改变。如果更多人选择环保产品，或者避开包装浪费的品牌，企业会注意到。不过，个人无法独自解决所有问题。人们需要政府和企业的支持，比如更好的回收系统、更清洁的交通，以及价格可承受的绿色产品。所以个人行动很重要，但当社会让环保选择变得更容易时，它效果最好。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-043",
    approach: "污染者惩罚题要讲罚款、执行和预防。强调惩罚应足以改变行为，但不能只靠惩罚。",
    frames: [
      "Polluters should be punished more severely when ...",
      "If fines are too small, ...",
      "However, punishment alone is not enough.",
      "Governments should also ...",
    ],
    vocabulary: [
      { phrase: "polluters", translation: "污染者", note: "题目关键词" },
      { phrase: "strict penalties", translation: "严格处罚", note: "惩罚力度" },
      { phrase: "environmental damage", translation: "环境损害", note: "污染后果" },
      { phrase: "enforcement", translation: "执法", note: "政策有效性" },
      { phrase: "preventive measures", translation: "预防措施", note: "平衡解决" },
    ],
    answer: [
      "Polluters should be punished more severely when their actions cause serious environmental damage. If fines are too small, some companies may simply treat them as a business cost and continue polluting. Strict penalties can send a clear message that damaging public resources is not acceptable.",
      "However, punishment alone is not enough. Enforcement must be consistent, otherwise rules exist only on paper. Governments should also provide preventive measures, such as regular inspections, transparent reporting and support for cleaner technology. For individuals, education and convenient recycling systems may work better than punishment in some cases. So I support stronger penalties for serious polluters, especially companies, but they should be part of a wider system that prevents pollution before it happens.",
    ],
    answerTranslation: [
      "当污染者的行为造成严重环境损害时，应该受到更严厉的惩罚。如果罚款太低，一些企业可能只是把它当作商业成本，然后继续污染。严格处罚可以传递清晰信号：破坏公共资源是不可接受的。",
      "不过，单靠惩罚不够。执法必须持续一致，否则规则只会停留在纸面上。政府还应该提供预防措施，比如定期检查、透明报告，以及对清洁技术的支持。对于个人来说，在某些情况下，教育和便利的回收系统可能比惩罚更有效。所以我支持对严重污染者，尤其是企业，进行更严格处罚，但它应该是一个更大系统的一部分，在污染发生前就加以预防。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-044",
    approach: "环保责任题不要二选一。政府定规则和基础设施，个人改变需求和习惯。",
    frames: [
      "Both governments and individuals should protect the environment.",
      "Governments have the power to ...",
      "Individuals contribute by ...",
      "The two sides depend on each other because ...",
    ],
    vocabulary: [
      { phrase: "environmental policy", translation: "环境政策", note: "政府责任" },
      { phrase: "public infrastructure", translation: "公共基础设施", note: "政府能力" },
      { phrase: "individual action", translation: "个人行动", note: "个人责任" },
      { phrase: "incentives and penalties", translation: "激励与惩罚", note: "政策工具" },
      { phrase: "shared responsibility", translation: "共同责任", note: "总结观点" },
    ],
    answer: [
      "Both governments and individuals should protect the environment, but they play different roles. Governments have the power to create environmental policy, build public infrastructure and set incentives and penalties. For example, individuals cannot build a metro system or regulate factories by themselves, so government action is essential.",
      "Individuals contribute by changing daily habits and consumer choices. If people reduce waste, use public transport and support greener products, they create demand for more sustainable options. The two sides depend on each other. Government rules may fail if citizens ignore them, while individual action is limited if there are no recycling bins, clean buses or affordable alternatives. So environmental protection is a shared responsibility, with governments leading the system and individuals making it work in daily life.",
    ],
    answerTranslation: [
      "政府和个人都应该保护环境，但他们扮演的角色不同。政府有能力制定环境政策、建设公共基础设施，并设置激励和惩罚。比如，个人无法自己建设地铁系统，也无法独自监管工厂，所以政府行动是必要的。",
      "个人则通过改变日常习惯和消费选择做出贡献。如果人们减少浪费、使用公共交通并支持更环保的产品，就会为可持续选择创造需求。两者相互依赖。如果公民忽视规则，政府政策可能失败；如果没有回收箱、清洁公交或可负担替代品，个人行动也会受限。所以环境保护是共同责任，政府负责引导系统，个人则让它在日常生活中真正运转。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-045",
    approach: "名气概念变化题从传统媒体到社媒造星。分析门槛降低、速度变快和名气更短暂。",
    frames: [
      "The concept of fame has changed a lot because ...",
      "In the past, famous people usually ...",
      "Now, social media allows ...",
      "The downside is that fame can be ...",
    ],
    vocabulary: [
      { phrase: "social media fame", translation: "社交媒体名气", note: "现代名气核心" },
      { phrase: "go viral", translation: "走红；病毒式传播", note: "社媒造星" },
      { phrase: "public image", translation: "公众形象", note: "名人话题" },
      { phrase: "fan culture", translation: "粉丝文化", note: "社会影响" },
      { phrase: "short-lived", translation: "短暂的", note: "现代名气特点" },
    ],
    answer: [
      "The concept of fame has changed a lot because of social media. In the past, famous people usually became known through films, music, sport or television, and there were gatekeepers such as studios, publishers and broadcasters. Fame took longer to build and often depended on a clear professional skill.",
      "Now, social media allows ordinary people to go viral very quickly. Someone can become famous for a funny video, a strong opinion or even a mistake. This makes fame more democratic, but also more unstable. A public image can be created overnight and damaged just as quickly. Fan culture has also become more intense because followers interact with celebrities directly. So fame today is faster and more accessible, but it is often more short-lived and stressful.",
    ],
    answerTranslation: [
      "由于社交媒体，名气的概念发生了很大变化。过去，名人通常通过电影、音乐、体育或电视被人认识，而且中间有电影公司、出版社和广播电视机构这样的把关者。名气需要更长时间建立，也往往依赖明确的专业能力。",
      "现在，社交媒体让普通人能非常迅速地走红。一个人可以因为一条搞笑视频、一个强烈观点，甚至一个错误而出名。这让名气更民主化，但也更不稳定。公众形象可以一夜之间被创造，也可以同样迅速地受损。粉丝文化也变得更强烈，因为追随者能直接和名人互动。所以如今的名气更快、更容易获得，但也往往更短暂、更有压力。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-046",
    approach: "童年朋友联系题要平衡情感价值和现实变化。强调不必强求，但值得保持基本连接。",
    frames: [
      "Maintaining contact with childhood friends can be meaningful because ...",
      "They know ...",
      "However, friendships naturally change when ...",
      "So the important thing is ...",
    ],
    vocabulary: [
      { phrase: "shared history", translation: "共同经历", note: "童年朋友核心" },
      { phrase: "stay in touch", translation: "保持联系", note: "关系题基础" },
      { phrase: "drift apart", translation: "渐渐疏远", note: "友谊变化" },
      { phrase: "emotional anchor", translation: "情感锚点", note: "高分表达" },
      { phrase: "life paths", translation: "人生道路", note: "成长变化" },
    ],
    answer: [
      "Maintaining contact with childhood friends can be meaningful because they share a part of your life that newer friends may never fully understand. There is a shared history: old schools, neighbourhoods, games and family stories. That can make childhood friends feel like an emotional anchor, especially when life becomes complicated.",
      "However, friendships naturally change when people’s life paths become different. People move to new cities, choose different careers and develop new values, so it is normal to drift apart. I don’t think people should force a friendship just because it is old. The important thing is to stay in touch in a realistic way, maybe through occasional messages or meetings. If the connection still feels warm and respectful, it is worth keeping.",
    ],
    answerTranslation: [
      "和童年朋友保持联系是有意义的，因为他们共享了你生命中一部分新朋友可能永远无法完全理解的经历。那里有共同历史：老学校、社区、游戏和家庭故事。这会让童年朋友像一种情感锚点，尤其是在生活变得复杂的时候。",
      "不过，当人们的人生道路变得不同，友谊自然会发生变化。人们搬去新城市，选择不同职业，也发展出新的价值观，所以渐渐疏远是正常的。我不认为人们应该只因为一段友谊很久就强行维持。重要的是以现实方式保持联系，比如偶尔发消息或见面。如果这种连接仍然温暖且互相尊重，那就值得保留。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-047",
    approach: "慷慨差异题从家庭教育、经历、经济条件和安全感回答。避免简单说人好或自私。",
    frames: [
      "Generosity is shaped by many factors.",
      "Family upbringing can ...",
      "Personal experience also matters because ...",
      "Economic security can affect ...",
    ],
    vocabulary: [
      { phrase: "generosity", translation: "慷慨", note: "题目关键词" },
      { phrase: "upbringing", translation: "家庭教育；成长环境", note: "原因分析" },
      { phrase: "scarcity mindset", translation: "稀缺心态", note: "经济心理" },
      { phrase: "empathy", translation: "同理心", note: "BBC 高频词" },
      { phrase: "give back", translation: "回馈", note: "慷慨行为" },
    ],
    answer: [
      "Generosity is shaped by many factors, not just personality. Family upbringing can have a strong influence. If children grow up seeing their parents help neighbours, donate things or share food, they may learn that giving is a normal part of life. That kind of behaviour teaches empathy early.",
      "Personal experience also matters. Someone who has received help during a difficult period may feel a stronger desire to give back later. On the other hand, people who grew up with insecurity may develop a scarcity mindset and feel afraid to share, even when they have enough. Economic security can affect generosity too, because it is easier to give when basic needs are met. So I would not judge people too quickly; generosity often reflects both values and life experience.",
    ],
    answerTranslation: [
      "慷慨受到很多因素影响，不只是性格。家庭教育会有很强影响。如果孩子从小看到父母帮助邻居、捐东西或分享食物，他们可能会学到给予是生活中正常的一部分。这种行为很早就会教会人同理心。",
      "个人经历也很重要。一个人在困难时期接受过帮助，后来可能会更强烈地想要回馈。另一方面，在缺乏安全感中长大的人可能会形成稀缺心态，即使已经足够，也害怕分享。经济安全感也会影响慷慨，因为当基本需求得到满足时，人更容易给予。所以我不会太快评判别人；慷慨往往反映了价值观和人生经历。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-048",
    approach: "庆祝活动社会影响题从凝聚力、文化传承、经济和过度消费回答。",
    frames: [
      "Celebrations influence society in several ways.",
      "They bring people together by ...",
      "They also preserve ...",
      "However, celebrations can become ...",
    ],
    vocabulary: [
      { phrase: "social bonds", translation: "社会纽带", note: "庆祝活动作用" },
      { phrase: "cultural traditions", translation: "文化传统", note: "节日传承" },
      { phrase: "community spirit", translation: "社区氛围", note: "社会凝聚力" },
      { phrase: "commercialised", translation: "商业化的", note: "负面影响" },
      { phrase: "shared identity", translation: "共同身份认同", note: "社会影响高分表达" },
    ],
    answer: [
      "Celebrations influence society in several ways. They bring people together by creating shared moments. During festivals, weddings or public events, people eat, talk, dress up and follow rituals together. These activities strengthen social bonds and community spirit, especially in places where daily life is usually busy and individualistic.",
      "Celebrations also preserve cultural traditions. They teach younger generations stories, food, music and values connected to a shared identity. However, celebrations can become too commercialised. If people focus only on buying expensive gifts or showing perfect photos online, the original meaning may become weaker. So I think celebrations are socially valuable when they connect people and culture, but less valuable when they turn into pressure or competition.",
    ],
    answerTranslation: [
      "庆祝活动会以多种方式影响社会。它们通过创造共同的时刻把人们聚在一起。在节日、婚礼或公共活动中，人们一起吃饭、聊天、打扮，并遵循仪式。这些活动会加强社会纽带和社区氛围，尤其是在日常生活通常忙碌且个人化的地方。",
      "庆祝活动也会保存文化传统。它们把与共同身份认同相关的故事、食物、音乐和价值观传递给年轻一代。不过，庆祝活动也可能变得过于商业化。如果人们只关注购买昂贵礼物或在网上展示完美照片，原本的意义可能会变弱。所以我认为，当庆祝活动连接人和文化时，它们具有社会价值；但当它们变成压力或竞争时，价值就会降低。",
    ],
  },
  {
    partId: "part-3",
    questionId: "speaking-part-3-049",
    approach: "记忆清晰度题从情绪强度、新奇性、重复讲述和个人意义解释。符合 Part 3 抽象讨论。",
    frames: [
      "People remember some events more clearly because ...",
      "Strong emotions make memories ...",
      "Novel experiences also ...",
      "Repetition can strengthen ...",
    ],
    vocabulary: [
      { phrase: "emotional intensity", translation: "情绪强度", note: "记忆原因核心" },
      { phrase: "vivid memory", translation: "生动记忆", note: "记忆话题表达" },
      { phrase: "personal significance", translation: "个人意义", note: "解释为何难忘" },
      { phrase: "stand out", translation: "突出；显得特别", note: "自然短语" },
      { phrase: "retell the story", translation: "反复讲述故事", note: "记忆加强机制" },
    ],
    answer: [
      "People remember some events more clearly because those events carry emotional intensity or personal significance. A birthday party, an accident, a graduation ceremony or a serious mistake may stand out because the person felt extremely happy, frightened, proud or embarrassed at the time. Strong emotions make memories more vivid.",
      "Novel experiences also stay in the mind more easily. If something happens every day, the brain may not record the details. But if it is unusual, the memory feels separate from routine life. Repetition can strengthen memory too. When people retell the story to friends or look at photos, they keep rebuilding the memory. Of course, memory is not always perfectly accurate, but events that are emotional, unusual and often repeated are usually remembered more clearly.",
    ],
    answerTranslation: [
      "人们会更清楚地记住某些事件，是因为这些事件带有情绪强度或个人意义。生日聚会、事故、毕业典礼或一次严重错误之所以突出，可能是因为当时这个人感到极度开心、害怕、自豪或尴尬。强烈情绪会让记忆更生动。",
      "新奇经历也更容易留在脑海里。如果某件事每天都发生，大脑可能不会记录细节。但如果它很不寻常，这段记忆就会和日常生活区分开。重复也会加强记忆。当人们向朋友反复讲述故事或看照片时，他们会不断重建这段记忆。当然，记忆并不总是完全准确，但那些情绪强烈、不寻常并且经常被重复的事件，通常会被记得更清楚。",
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

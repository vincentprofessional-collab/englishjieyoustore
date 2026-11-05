export const VOCABULARY_GROUP_SIZE = 20;
export const VOCABULARY_GROUP_REVIEW_LIMIT = 40;

export type VocabularySortMode = "frequency" | "scene";

type SceneWord = {
  articleCategory?: string;
  definitionCn?: string;
  word?: string;
};

const SCENE_RULES: Array<{ label: string; words: string[]; meanings: string[] }> = [
  { label: "校园与学习", words: ["school", "student", "class", "study", "teacher", "lesson", "book", "schoolbag", "homework", "exam", "learn", "classroom", "blackboard", "ruler", "project", "course", "library", "pencil", "pen", "maths", "science", "subject", "desk", "paper", "question", "answer", "read", "write", "english", "computer"], meanings: ["学校", "学生", "学习", "老师", "教师", "课程", "课堂", "教室", "书本", "课本", "书包", "作业", "考试", "黑板", "尺子", "图书馆", "科学", "数学", "英语", "问题", "答案", "读书", "写字"] },
  { label: "家庭与家居", words: ["home", "house", "room", "bed", "kitchen", "bathroom", "door", "window", "chair", "table", "garden", "floor", "wall", "cup", "glass", "box", "bag", "light", "clean", "tidy", "chore", "housework", "toilet", "wash", "sweep"], meanings: ["房子", "住宅", "房屋", "家里", "卧室", "客厅", "厨房", "浴室", "洗手间", "门", "窗", "桌子", "椅子", "地板", "墙壁", "杯子", "打扫", "整理", "家务"] },
  { label: "食物与饮品", words: ["food", "fruit", "vegetable", "breakfast", "lunch", "dinner", "meal", "rice", "bread", "milk", "water", "apple", "banana", "grape", "cream", "juice", "cake", "meat", "egg", "fish", "candy", "noodle", "potato", "soup", "tea", "tomato"], meanings: ["食物", "食品", "水果", "蔬菜", "早餐", "午餐", "晚餐", "一餐", "米饭", "面包", "牛奶", "饮料", "饮水", "苹果", "香蕉", "葡萄", "奶油", "果汁", "蛋糕", "肉类", "鸡蛋", "糖果", "面条", "土豆", "汤", "茶", "番茄"] },
  { label: "动物与自然", words: ["animal", "pet", "cat", "dog", "duck", "bird", "fish", "whale", "tail", "tree", "flower", "grass", "forest", "river", "sea", "lake", "farm", "plant", "zoo", "bear", "bee", "chicken", "cow", "elephant", "horse", "lion", "monkey", "mouse", "panda", "pig", "rabbit", "sheep", "tiger", "earth", "air", "fire", "ice", "rain", "snow", "sun", "moon", "star", "beach", "space", "hill", "world"], meanings: ["动物", "宠物", "猫", "狗", "鸭", "鸟", "鱼", "鲸鱼", "尾巴", "树", "花朵", "草地", "森林", "河流", "大海", "湖", "农场", "植物", "动物园", "熊", "蜜蜂", "鸡", "奶牛", "大象", "马", "狮子", "猴子", "老鼠", "熊猫", "猪", "兔子", "绵羊", "老虎", "地球", "空气", "火", "冰", "雨", "雪", "太阳", "月亮", "星星", "海滩", "太空", "山丘", "世界"] },
  { label: "天气与季节", words: ["weather", "windy", "sunny", "rainy", "cloudy", "snowy", "spring", "summer", "autumn", "fall", "winter", "season", "hot", "cold", "warm", "cool"], meanings: ["天气", "多风", "刮风", "晴朗", "下雨", "雨天", "多云", "下雪", "春天", "夏天", "秋天", "冬天", "季节", "炎热", "寒冷", "温暖", "凉爽"] },
  { label: "身体与健康", words: ["body", "head", "face", "eye", "ear", "nose", "mouth", "tooth", "teeth", "hand", "arm", "leg", "foot", "feet", "health", "doctor", "hospital", "sick", "ill", "pain"], meanings: ["身体", "头部", "脸", "眼睛", "耳朵", "鼻子", "嘴", "牙齿", "手", "手臂", "腿", "脚", "健康", "医生", "医院", "生病", "疼痛"] },
  { label: "衣物与穿戴", words: ["clothes", "clothing", "wear", "sweater", "skirt", "shorts", "trousers", "pants", "sock", "shoe", "cap", "hat", "coat", "dress", "shirt", "jacket"], meanings: ["衣服", "服装", "穿着", "毛衣", "裙子", "短裤", "长裤", "袜子", "鞋", "帽子", "外套", "连衣裙", "衬衫", "夹克"] },
  { label: "交通与出行", words: ["travel", "trip", "journey", "road", "street", "ticket", "bus", "car", "train", "plane", "bike", "bicycle", "station", "airport", "taxi", "drive", "ride", "walk", "ship", "boat"], meanings: ["旅行", "旅游", "出行", "旅程", "公路", "道路", "街道", "车票", "公共汽车", "汽车", "火车", "飞机", "自行车", "车站", "机场", "出租车", "驾驶", "乘坐", "轮船", "船"] },
  { label: "运动与娱乐", words: ["sport", "game", "play", "ball", "ping-pong", "football", "basketball", "dance", "music", "song", "sing", "hobby", "toy", "doll", "film", "movie"], meanings: ["运动", "体育", "游戏", "玩耍", "球", "乒乓球", "足球", "篮球", "跳舞", "音乐", "歌曲", "唱歌", "爱好", "玩具", "洋娃娃", "电影"] },
  { label: "购物与服务", words: ["shop", "store", "buy", "sell", "price", "money", "market", "supermarket", "restaurant", "cafe", "gift", "card", "party"], meanings: ["购物", "商店", "买", "购买", "卖", "价格", "金钱", "市场", "超市", "餐馆", "餐厅", "礼物", "派对"] },
  { label: "家庭与人际关系", words: ["family", "aunt", "uncle", "cousin", "dad", "father", "mother", "parent", "brother", "sister", "grandfather", "grandmother", "woman", "man", "boy", "girl", "child", "kid", "people", "friend", "baby", "mr", "mrs", "ms"], meanings: ["家人", "家庭", "父亲", "母亲", "爸爸", "妈妈", "父母", "兄弟", "姐妹", "叔叔", "阿姨", "祖父", "祖母", "表兄弟", "孩子", "男孩", "女孩", "人们", "朋友"] },
  { label: "交流与语言", words: ["hello", "bye", "goodbye", "speak", "say", "tell", "ask", "talk", "listen", "letter", "email", "phone", "call", "word", "thank", "please", "welcome", "sorry", "chinese", "english", "name", "story", "map", "show", "share", "dear", "ok", "no", "idea"], meanings: ["你好", "再见", "说话", "交谈", "告诉", "询问", "听", "信件", "邮件", "电话", "消息", "单词", "感谢", "请", "欢迎", "名字", "故事", "亲爱的", "好的", "不", "想法"] },
  { label: "时间与日常", words: ["time", "day", "week", "month", "year", "today", "tomorrow", "yesterday", "morning", "afternoon", "evening", "night", "clock", "birthday", "holiday", "hour", "minute", "early", "late", "last", "next", "often", "sometimes", "always", "never", "age", "may"], meanings: ["时间", "一天", "星期", "月份", "年份", "今天", "明天", "昨天", "早上", "上午", "下午", "傍晚", "晚上", "时钟", "日期", "生日", "假期", "小时", "分钟", "每天", "年龄", "五月"] },
  { label: "地点与方位", words: ["place", "park", "city", "town", "village", "street", "left", "right", "near", "far", "behind", "between", "front", "middle", "under", "down", "up", "here", "there", "home", "beach", "cinema", "hospital", "farm", "zoo", "library", "hill", "earth", "world", "space", "back", "way", "china", "hometown", "top"], meanings: ["地方", "地点", "公园", "城市", "城镇", "村庄", "街道", "左边", "右边", "附近", "远处", "后面", "之间", "前面", "中间", "下面", "上面", "这里", "那里", "海滩", "电影院", "医院", "农场", "动物园", "山丘", "地球", "世界", "太空", "后面", "道路", "中国", "家乡", "顶部"] },
  { label: "外貌与感受", words: ["happy", "sad", "excited", "tired", "angry", "kind", "beautiful", "cute", "famous", "good", "great", "nice", "wonderful", "young", "old", "tall", "short", "strong", "big", "small", "long", "little", "thin", "fat", "busy", "hungry", "sorry", "worry", "feel", "love", "like", "interesting", "clever", "difficult", "easy", "safe", "careful", "bad", "best", "better", "fine", "well", "quiet", "loud", "dirty", "clean", "fast", "slow", "heavy", "hard", "light", "free", "wrong", "sure", "helpful", "lovely", "new", "favourite"], meanings: ["开心", "高兴", "难过", "兴奋", "疲倦", "生气", "善良", "漂亮", "英俊", "年轻", "年老", "高的", "矮的", "强壮", "大的", "小的", "长的", "饿", "担心", "喜欢", "有趣", "聪明", "困难", "容易", "安全", "小心", "安静", "干净", "脏", "有帮助", "可爱的", "新的", "最喜欢的"] },
  { label: "颜色与外观", words: ["black", "blue", "brown", "green", "pink", "red", "white", "yellow", "colour", "orange", "purple", "grey", "gray", "circle", "round", "dark", "bright"], meanings: ["黑色", "蓝色", "棕色", "绿色", "粉色", "红色", "白色", "黄色", "颜色", "橙色", "紫色", "灰色", "圆形", "深色", "明亮"] },
  { label: "劳动与动作", words: ["begin", "bring", "catch", "clean", "close", "come", "cook", "cry", "cut", "dance", "do", "draw", "drink", "eat", "exercise", "find", "fly", "get", "give", "go", "grow", "have", "hear", "help", "hurry", "hurt", "jump", "keep", "know", "let", "live", "look", "make", "meet", "miss", "move", "open", "play", "put", "read", "run", "see", "sit", "sleep", "stand", "stop", "sweep", "swim", "take", "think", "try", "turn", "use", "visit", "wait", "wake", "walk", "want", "wash", "watch", "wear", "win", "wish", "work", "write"], meanings: ["开始", "带来", "抓住", "清洁", "关闭", "来", "做饭", "哭", "切", "跳舞", "做", "画", "喝", "吃", "锻炼", "找到", "飞", "得到", "给", "去", "生长", "有", "听见", "帮助", "赶快", "受伤", "跳", "保持", "知道", "让", "居住", "看", "制作", "遇见", "想念", "移动", "打开", "玩", "放", "读", "跑", "看见", "坐", "睡觉", "站", "停止", "打扫", "游泳", "拿", "思考", "尝试", "转弯", "使用", "参观", "等待", "醒来", "步行", "想要", "洗", "观看", "穿着", "赢", "希望", "工作", "写"] },
  { label: "科技与生活用品", words: ["computer", "internet", "phone", "tv", "robot", "camera", "photo", "picture", "radio", "fan", "umbrella", "toy", "doll", "kite", "boat", "ball", "candle", "paper", "piano", "glass", "cup", "clock", "light", "watch"], meanings: ["电脑", "互联网", "电话", "电视", "机器人", "相机", "照片", "图片", "收音机", "风扇", "雨伞", "玩具", "娃娃", "风筝", "船", "球", "蜡烛", "纸", "钢琴", "玻璃杯", "杯子", "时钟", "灯", "手表"] },
  { label: "社区与职业", words: ["astronaut", "driver", "farmer", "job", "nurse", "police", "worker", "doctor", "teacher", "farmer"], meanings: ["宇航员", "司机", "农民", "工作", "护士", "警察", "工人", "医生", "职业"] },
  { label: "艺术与兴趣", words: ["art", "cinema", "film", "music", "song", "dance", "piano", "photo", "picture", "story", "fan", "favourite", "hobby", "game", "party", "toy", "doll", "kite", "ping-pong", "sport", "playground"], meanings: ["艺术", "电影", "音乐", "歌曲", "跳舞", "钢琴", "照片", "图片", "故事", "爱好", "游戏", "玩具", "运动场"] },
  { label: "身体与个人护理", words: ["hair", "healthy", "hurt", "wash", "tooth", "teeth", "toilet"], meanings: ["头发", "健康", "牙齿", "洗漱", "疼痛"] },
  { label: "数量与范围", words: ["all", "any", "every", "half", "lot", "many", "much", "pair", "some", "age"], meanings: ["所有", "任何", "每个", "一半", "许多", "很多", "数量", "一双"] },
  { label: "基础表达与功能词", words: [], meanings: [] },
];

function sceneFor(word: SceneWord): { label: string; score: number; order: number } {
  const explicit = word.articleCategory?.trim();
  if (explicit) {
    const order = SCENE_RULES.findIndex((rule) => rule.label === explicit);
    return { label: explicit, score: 1, order: order < 0 ? SCENE_RULES.length : order };
  }

  const term = (word.word ?? "").trim().toLocaleLowerCase();
  const meaning = (word.definitionCn ?? "").toLocaleLowerCase();
  let best = { label: "基础表达与功能词", score: 0, order: SCENE_RULES.length - 1 };
  SCENE_RULES.slice(0, -1).forEach((rule, order) => {
    const wordScore = rule.words.reduce((score, candidate) => score + (term === candidate ? 6 : 0), 0);
    const meaningScore = rule.meanings.reduce((score, candidate) => score + (meaning.includes(candidate) ? 2 : 0), 0);
    const score = wordScore + meaningScore;
    if (score > best.score) best = { label: rule.label, score, order };
  });
  return best;
}

export function sortVocabularyByScene<T extends SceneWord>(words: readonly T[]): T[] {
  return [...words].sort((left, right) => {
    const leftScene = sceneFor(left);
    const rightScene = sceneFor(right);
    return leftScene.order - rightScene.order
      || leftScene.label.localeCompare(rightScene.label, "zh-CN")
      || rightScene.score - leftScene.score
      || (left.word ?? "").localeCompare(right.word ?? "", "en", { sensitivity: "base" });
  });
}

function groupWordsByMode<T extends SceneWord>(words: readonly T[], mode: VocabularySortMode): Array<{ label: string; words: T[] }> {
  const groups: Array<{ label: string; words: T[] }> = [];
  if (mode === "scene") {
    const scenes = new Map<string, T[]>();
    for (const word of sortVocabularyByScene(words)) {
      const label = sceneFor(word).label;
      const existing = scenes.get(label);
      if (existing) existing.push(word);
      else scenes.set(label, [word]);
    }
    for (const [label, entries] of scenes) {
      for (let start = 0; start < entries.length; start += VOCABULARY_GROUP_SIZE) {
        groups.push({ label, words: entries.slice(start, start + VOCABULARY_GROUP_SIZE) });
      }
    }
    return groups;
  }
  for (let start = 0; start < words.length; start += VOCABULARY_GROUP_SIZE) {
    groups.push({ label: "词频", words: words.slice(start, start + VOCABULARY_GROUP_SIZE) as T[] });
  }
  return groups;
}

export function vocabularyStudyGroupIndex(value: unknown, wordCount?: number, groupCount?: number): number | null {
  if (!Number.isInteger(value) || Number(value) < 0) return null;
  if (wordCount !== undefined && wordCount <= 0) return null;
  const count = groupCount ?? (wordCount === undefined ? undefined : Math.ceil(wordCount / VOCABULARY_GROUP_SIZE));
  return count === undefined ? Number(value) : Math.min(Number(value), count - 1);
}

export function vocabularyStudyGroupCount<T extends SceneWord>(words: readonly T[], mode: VocabularySortMode = "frequency"): number {
  return groupWordsByMode(words, mode).length;
}

export function vocabularyStudyGroupSize<T extends SceneWord>(words: readonly T[], group: number, mode: VocabularySortMode = "frequency"): number {
  return groupWordsByMode(words, mode)[group]?.words.length ?? 0;
}

export function vocabularyStudyGroupLabel<T extends SceneWord>(words: readonly T[], group: number, mode: VocabularySortMode = "frequency"): string {
  const groups = groupWordsByMode(words, mode);
  const selected = groups[group];
  if (!selected) return "";
  if (mode === "frequency") return `第${group + 1}组（${selected.words.length}词）`;
  const localIndex = groups.slice(0, group).filter((item) => item.label === selected.label).length + 1;
  return `${selected.label}·第${localIndex}组（${selected.words.length}词）`;
}

export function selectVocabularyStudyGroup<T extends SceneWord>(words: readonly T[], group: number | null, mode: VocabularySortMode = "frequency"): T[] {
  if (group === null) return [...words];
  return groupWordsByMode(words, mode)[group]?.words ?? [];
}

export function selectVocabularyStudyGroups<T extends SceneWord>(words: readonly T[], groups: readonly number[], mode: VocabularySortMode = "frequency"): T[] {
  const groupedWords = groupWordsByMode(words, mode);
  const selected = [...new Set(groups)]
    .filter((group) => Number.isInteger(group) && group >= 0 && group < groupedWords.length)
    .sort((left, right) => left - right);

  return selected.flatMap((group) => groupedWords[group].words);
}

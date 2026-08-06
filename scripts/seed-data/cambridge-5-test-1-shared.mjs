import { readFileSync } from "node:fs";
import path from "node:path";

const sourceDir = "/Volumes/My HDD3/备课/IELTS/剑桥雅思/剑桥雅思5/test1";

const answersByQuestionNo = {
  1: "minibus / a minibus",
  2: "15 / fifteen / 15 people / fifteen people",
  3: "April 18th / 18th April / the 18th of April",
  4: "Pallisades / The Pallisades",
  5: "B",
  6: "D",
  7: "280 / $280",
  8: "14 / fourteen / fourteen days",
  9: "20% / 20 percent / 20 per cent",
  10: "39745T / 397 45 T",
  11: "move around / move about",
  12: "brakes",
  13: "fingers",
  14: "satisfactory",
  15: "put together",
  16: "wide / too wide",
  17: "dangerous",
  18: "wheels",
  19: "best buy / the best buy",
  20: "sharp",
  21: "B",
  22: "A",
  23: "C",
  24: "B",
  25: "D",
  26: "full-time / full time",
  27: "one term / a term / term",
  28: "intensive",
  29: "two modules",
  30: "a topic / one topic / topic",
  31: "politics",
  32: "learn",
  33: "children's education / their children's education",
  34: "a car / car",
  35: "nursing care",
  36: "crisis",
  37: "early twenties / early 20s",
  38: "confidence",
  39: "money management",
  40: "low-risk investments / low risk investments",
};

const questionTypesByQuestionNo = {
  5: "single_choice",
  6: "single_choice",
  21: "single_choice",
  22: "single_choice",
  23: "single_choice",
  24: "single_choice",
  25: "single_choice",
};

const sectionQuestionPrompts = {
  1: {
    1: "WHALE WATCH EXPERIENCE\nType of transportation: ______",
    2: "WHALE WATCH EXPERIENCE\nMaximum group size: ______",
    3: "WHALE WATCH EXPERIENCE\nNext tour date: ______",
    4: "WHALE WATCH EXPERIENCE\nHotel name: The ______",
    5: "Choose TWO letters A-E. Which TWO activities are included in the tour price?\nA. fishing trip\nB. guided bushwalk\nC. reptile park entry\nD. table tennis\nE. tennis",
    6: "Choose TWO letters A-E. Which TWO activities are included in the tour price?\nA. fishing trip\nB. guided bushwalk\nC. reptile park entry\nD. table tennis\nE. tennis",
    7: "WHALE WATCH EXPERIENCE\nCost: $______",
    8: "WHALE WATCH EXPERIENCE\nBookings must be made at least ______ days before travel.",
    9: "WHALE WATCH EXPERIENCE\nA ______ deposit is required.",
    10: "WHALE WATCH EXPERIENCE\nCustomer reference number: ______",
  },
  2: {
    11: "BABY SAFE cot\nEasy to ______",
    12: "BABY SAFE cot\nProblem: no ______",
    13: "BABY SAFE cot\nBabies could trap their ______ in the side bars.",
    14: "BABY SAFE cot\nVerdict: ______",
    15: "CHOICE COTS cot\nEasy to ______",
    16: "CHOICE COTS cot\nThe gaps between the bars were too ______.",
    17: "CHOICE COTS cot\nVerdict: ______",
    18: "MOTHER'S CHOICE cot\nProblem: no ______",
    19: "MOTHER'S CHOICE cot\nVerdict: ______",
    20: "All cots should have no ______ edges.",
  },
  3: {
    21: "Choose the correct letter A, B or C.\nAndrew has worked at the hospital for:\nA. two years\nB. three years\nC. five years",
    22: "Choose the correct letter A, B or C.\nAndrew's employers will pay for:\nA. course fees\nB. living costs\nC. his salary",
    23: "Choose the correct letter A, B or C.\nThe part-time course lasts for:\nA. one year\nB. eighteen months\nC. two years",
    24: "Choose TWO letters A-E. Which TWO types of coursework are required for the part-time course?\nA. case study\nB. essay\nC. survey\nD. short report\nE. study diary",
    25: "Choose TWO letters A-E. Which TWO types of coursework are required for the part-time course?\nA. case study\nB. essay\nC. survey\nD. short report\nE. study diary",
    26: "MODULAR COURSES\nStudents study ______ during each module.",
    27: "MODULAR COURSES\nEach module takes ______.",
    28: "MODULAR COURSES\nThe work is very ______.",
    29: "MODULAR COURSES\nTo get a diploma, students study ______.",
    30: "MODULAR COURSES\nThen they work on ______ in depth.",
  },
  4: {
    31: "Men are supposed to understand ______, economics and finance.",
    32: "Women are more willing to ______.",
    33: "Women are more likely to save for their ______ and a house.",
    34: "Men tend to save for ______ and retirement.",
    35: "Women without a partner may have to pay for ______ when they are old.",
    36: "Many women only plan their financial future when a ______ occurs.",
    37: "Women should start thinking about pensions in their ______.",
    38: "Women need to develop their ______ with finances.",
    39: "Women can attend evening classes in ______.",
    40: "At least 70% of savings should be in ______.",
  },
};

const sectionTitles = {
  1: "Section 1 - Whale Watch Experience",
  2: "Section 2 - Buyer Beware: Baby Cots",
  3: "Section 3 - Management Diploma Courses",
  4: "Section 4 - Saving for the Future",
};

const sectionOneTranslations = {
  1: "下午好，这里是梦幻时光旅行社。我能为您做些什么？",
  2: "哦，您好。我对你们提供的附近沿海地区的度假项目感兴趣。",
  3: "是的，我们沿海岸经营好几个旅游项目。",
  4: "您特别想去哪里？",
  5: "嗯，我觉得那个提到鲸鱼的度假项目听起来不错。",
  6: "是叫“观鲸之旅”吗？",
  7: "啊，那是我们的“观鲸体验”项目。",
  8: "它很受欢迎，活动地点在一个有漂亮海滩的可爱小镇。",
  9: "哦，好的。这个项目持续多久？",
  10: "为期两天，其中包括从这里出发单程各四小时的路程。",
  11: "很好，我不想离开更久。",
  12: "那么，是坐长途客车去吗？",
  13: "实际上是乘小巴。",
  14: "我们希望这些旅行团小而亲切，所以不会带一整车的大团客。",
  15: "事实上，这个团最多只收15人，不过12或13人也会成团。",
  16: "哦，明白了。那么你们经常办这些旅游团吗？",
  17: "这取决于一年中的时段。",
  18: "当然，像暑假这样的旺季，我们每个周末都会举办。",
  19: "但目前通常最多一个月一次。",
  20: "那下一次是什么时候出发？",
  21: "我看看。",
  22: "三周后有一趟，也就是4月18日。",
  23: "之后要到6月2日才有下一趟。",
  24: "好的，4月是去的好时候吗？",
  25: "还不错，不过真正最好的时候是一年中稍晚一些的时候。",
  26: "不过我得说，观鲸只是众多项目中的一项。",
  27: "真的吗？",
  28: "是的，您入住的酒店本身设施很好，叫作帕利塞兹酒店。",
  29: "巴黎什么？",
  30: "不，实际上叫帕利塞兹。",
  31: "拼作 P-A-L-L-I-S-A-D-E-S。",
  32: "它就在那里的主海滩边。",
  33: "哦，我明白了。",
  34: "所有房间景观都很好，食物也非常不错。",
  35: "好的。",
  36: "那价格中包含的其他项目呢？",
  37: "哦，项目很多。如果您不想参加观鲸巡游，",
  38: "导游会带感兴趣的人去酒店附近的国家公园丛林徒步，",
  39: "这个不另收费；或者参加钓鱼之旅，我想需要另加12美元。",
  40: "镇上还有一个爬行动物公园，费用也差不多。",
  41: "不，我觉得比起蛇我更喜欢鲸鱼。",
  42: "如果您只想放松，可以坐在酒店泳池边，或者去海滩。",
  43: "哦，酒店也有网球场，不过得按小时付费。",
  44: "不过楼下有乒乓球桌，属于住宿套餐的一部分；只要跟导游说一声即可。",
  45: "嗯，听起来不错。那么基本团费是多少？",
  46: "这个时候通常大约300美元，不过我查一下。",
  47: "哦，实际是280美元。",
  48: "下一趟团还有名额吗？",
  49: "是几个人参加？",
  50: "我们两个人。",
  51: "可以，应该没问题。",
  52: "我想说明一下：为避免旅行团取消，所有预订都必须至少在出发前14天完成。",
  53: "如果在出发前七天内取消，您须支付预订总额的50%。",
  54: "好的。",
  55: "另外，预订时还需要支付20%的定金。",
  56: "我可以用信用卡付吗？",
  57: "可以。",
  58: "好的，我会先和同伴商量，然后再联系您。",
  59: "好的。那我先给您做一个暂定预订，可以吗？",
  60: "两位参加观鲸体验项目。",
  61: "我给您一个客户参考编号，方便您回电时使用。",
  62: "您有笔吗？",
  63: "有。",
  64: "好的，编号是39745T，T 代表 Tango 的 T。",
  65: "您回电时，请找旅行团经理，也就是我，特蕾西。",
  66: "好的，我会的。",
};

const sectionTwoTranslations = {
  1: "大家好，欢迎收看今天的《买家须谨慎》节目，我们将提供一些如何",
  2: "明智花钱的建议。",
  3: "今天节目关注的是儿童和婴儿用床。",
  4: "先来看看婴儿床。",
  5: "首先，我们测试了三款不同的婴儿床，价格都属于经济型，照例我们将",
  6: "介绍它们的优点、问题和评判结论。",
  7: "我们看的第一款婴儿床是 Baby Safe 品牌的，有几个值得推荐的优点。",
  8: "它。",
  9: "测试人员喜欢它有四个轮子，便于移动。",
  10: "这款婴儿床唯一的小问题是没有刹车，但测试人员认为",
  11: "这并不太要紧。",
  12: "起初他们有些担心侧边栏杆，因为他们觉得婴儿可能会",
  13: "把手指卡在里面；但测试人员认为这种情况不太可能发生，因此他们",
  14: "给出的评判结论是“令人满意”。",
  15: "下一款是 Choice Cots 品牌的婴儿床，测试人员很高兴发现它",
  16: "很容易组装，不像我们看过的其他产品。",
  17: "负面方面是，测试人员不喜欢这款婴儿床的侧边",
  18: "不能放下，这使抱起新生儿很困难。",
  19: "不过，这款婴儿床真正的问题是栏杆之间的间隙。",
  20: "测试人员发现间隙太宽，婴儿很容易把头卡在里面。",
  21: "我们认为这是真正的安全隐患，因此将它标为“危险”。",
  22: "很遗憾。",
  23: "最后是关于 Mother's Choice 婴儿床的好消息。",
  24: "这款床略有不同：虽然侧边栏杆不能放下，但床底可以",
  25: "上调或下调到两个不同位置，既安全又方便。",
  26: "它的缺点都比较轻微。",
  27: "大家唯一的小抱怨是它没有轮子；能找出的另一个问题",
  28: "是上面的图案只是粘上去的，所以很容易",
  29: "脱落。",
  30: "制造商现已承诺停止这种做法，这样这款婴儿床便会",
  31: "在各方面都很安全。",
  32: "我们把 Mother's Choice 婴儿床评为“最佳购买”。",
  33: "恭喜 Mother's Choice！",
  34: "那么，挑选婴儿床时应该注意哪些特点呢？",
  35: "显然，安全非常重要，舒适和方便也同样重要。",
  36: "我们建议，购买婴儿床时务必确认所有金属部件都没有",
  37: "生锈或变形。",
  38: "还应确保婴儿床的边缘圆润或光滑，没有任何锋利的边角。",
  39: "这对木制婴儿床尤其重要。",
  40: "现在接着谈谈学步儿童的床。",
};

const sectionThreeTranslations = {
  1: "安德鲁：打扰一下。有人让我来这里咨询管理文凭课程。",
  2: "莫妮卡：你来对地方了。你好，我叫莫妮卡。",
  3: "安德鲁：很高兴认识你。我叫安德鲁，安德鲁·哈里斯。",
  4: "莫妮卡：安德鲁，你看过我们的文凭课程招生简章了吗？",
  5: "安德鲁：看过了。我觉得课程内容的信息很有用。",
  6: "安德鲁：但我对不同的修读方式有点困惑。",
  7: "安德鲁：比如全日制强化课程、非全日制课程等等。",
  8: "莫妮卡：嗯，我看看能否帮你。每种课程类型都有优缺点。",
  9: "莫妮卡：所以这要看你个人的学习习惯，当然也取决于你的经济状况。",
  10: "莫妮卡：你目前在工作吗？安德鲁：是的，我过去三年一直在当地医院的行政部门工作。",
  11: "安德鲁：在那之前，我在一家计算机工程公司的办公室工作了两年。",
  12: "安德鲁：所以我大约有五年相关工作经验。我希望专攻人力资源管理。",
  13: "莫妮卡：我明白了。你打算辞去现在的工作去学习，还是只考虑请一年假？",
  14: "安德鲁：我想了解有哪些选择。我不想辞职什么的。",
  15: "安德鲁：我的雇主也希望我获得更多资格证书。不过，若能不用从工作中抽出太多时间来读课程就更好了。",
  16: "莫妮卡：好的，所以你其实不太想读全日制课程，对吗？",
  17: "安德鲁：对，不太想。这也关乎经济问题。你看，我的单位同意支付课程本身的费用。",
  18: "安德鲁：但如果我要全日制学习，就得请无薪假。而且整整一年没有工资，我想我负担不起自己的生活。",
  19: "莫妮卡：好的，你还有两个选择：可以读为期两年的非全日制课程，而且不用请假。",
  20: "莫妮卡：或者读我们所说的模块化课程。你愿意的话可在十八个月内完成，也可以更久；它很灵活，时间由你自己安排。",
  21: "安德鲁：嗯，那非全日制课程包括什么内容？",
  22: "莫妮卡：你需要参加夜校，每周上两次课；每个月还要抽一个周末参加研讨会或讨论工作坊。",
  23: "安德鲁：我需要完成什么样的课程作业？莫妮卡：作业类型很多。你每个月要写一篇论文，这会计入期末评估。",
  24: "莫妮卡：课程结束前还要做一项案例研究，可能要进行调查之类；此外，每四周要交一份简短报告。",
  25: "安德鲁：这样一来，除了每天工作外，作业量就很大了。听起来学习很多，也会很累。",
  26: "莫妮卡：是啊，你肯定没有多少空闲时间。",
  27: "安德鲁：模块化课程怎么样？我需要做些什么？莫妮卡：你可以短期全日制学习，这样能完成大量课程作业，并在白天参加讲座和研讨会。每个模块持续一个学期，时间大约为……",
  28: "莫妮卡：每次约十二周。这样做有明显优势，最主要的是可以更集中地学习，这非常适合一些人。",
  29: "安德鲁：要获得文凭，我得完成多少个模块？莫妮卡：现行课程需要两个模块，之后还要选一个主题深入研究。你可以结合工作来选，所以不必离开工作岗位；用多久完成由你决定。",
  30: "莫妮卡：重点是你不用同时学习和工作，可以一次专注一件事。",
  31: "安德鲁：是的，我明白。这听起来确实很吸引人，不过会更贵。我的意思是，每个模块学习期间我都得在没有工资的情况下养活自己。",
  32: "莫妮卡：没错，这对你来说可能是个问题。你为什么不先和雇主商量一下呢……",
};

const sectionFourTranslations = {
  1: "好的，我们一直在探讨不同社会和文化群体对于",
  2: "管理个人财务的态度：他们认为存钱有多重要，",
  3: "以及他们存钱是为了什么。还有一个我们尚未考虑的方面，就是性别。",
  4: "因此，如果考察性别问题，我们实际上是在问男性和女性是否对",
  5: "存钱抱有不同态度，以及是否为了不同的事情存钱。早在1928年，",
  6: "英国作家乔治·伯纳德·肖在《社会主义与资本主义的聪明女性指南》中写道，",
  7: "人们认为男人懂政治、经济和金融，因此不愿意",
  8: "接受必要的指导。他还说，女性的自命不凡较少，因而更愿意",
  9: "学习。当然，如今人们或许会质疑",
  10: "这些说法中包含的许多假设，不过近期研究确实表明，男性和女性之间存在一些相当根本的",
  11: "差异，体现在对待经济事务的态度上。让我们看看男性和女性实际上",
  12: "会为了什么而存钱。针对北美女性的研究发现，女性更倾向于",
  13: "为子女教育储蓄，也更可能攒钱，以便有一天买",
  14: "一套房子。同样的研究发现，另一方面，男性往往会为买车而存钱，",
  15: "顺便说一句，在北美，汽车在家庭预算中占了惊人大的比例。",
  16: "但男性存钱的另一项主要优先目标是退休生活。他们在有收入时，",
  17: "比女性更可能为晚年存钱。",
  18: "这相当令人不安，因为事实上，女性为晚年存钱的需要",
  19: "远大于男性。让我们稍作考虑。首先，事实是，全世界范围内",
  20: "女性很可能比男性多活很多年，因此她们需要钱来维持",
  21: "这段时期的生活。由于女性在老年时更可能成为没有伴侣的一方，",
  22: "因为没有配偶照料，她们可能因此不得不支付护理费用。",
  23: "此外，北美居高不下的离婚率正在造成女性贫困的循环。",
  24: "离婚女性往往最需要照顾孩子，因此",
  25: "她们需要更多钱来照顾不仅是自己，还有其他人。",
  26: "那么，这种情况可以如何改善呢？北美人口中可能会有",
  27: "越来越多的老年女性。研究表明，目前对女性来说，",
  28: "只有危机发生才会让她们思考未来的财务状况。但当然，",
  29: "这恰恰是任何人作出重要决定的最糟糕时机。",
  30: "今天的女性需要未雨绸缪、提前考虑，而不要等到压力之下才行动。",
  31: "即使是二十岁出头的女性，也需要开始考虑养老金等问题，而且随着",
  32: "越来越多女性担任专业职位，已有迹象表明这种情况正在发生。",
  33: "研究还表明，女性因缺乏信心而避免有效处理自己的经济状况，",
  34: "最好的克服方式是让自己",
  35: "获得充分信息，从而较少依赖他人的建议。",
  36: "已经设立了许多措施来帮助她们做到这一点。例如，本学院",
  37: "是提供资金管理夜校课程的教育机构之一。",
  38: "越来越多女性报名参加这类课程。在这里，她们能够获得",
  39: "有关不同储蓄方法的建议。例如，很多女性不愿投资股票和股份。",
  40: "但这些投资可以非常有利可图。通常建议，至少70%的个人",
  41: "储蓄应放在低风险投资中。但对于其余部分，理财顾问往往建议",
  42: "在充分了解的基础上承担一些风险。这类举措能给予女性所需的经济技能和",
  43: "知识，使她们能够拥有舒适、独立的退休生活。老年女性在总人口中不断提高的比例",
  44: "也可能带来其他经济后果。",
};

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function timecodeToMs(value) {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) {
    throw new Error("Invalid SRT timecode: " + value);
  }

  const [, hours, minutes, seconds, milliseconds] = match.map(Number);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
}

function parseSrtCues(sectionNo) {
  const srtPath = path.join(sourceDir, "5test1-section" + sectionNo + ".srt");
  const rawSrt = readFileSync(srtPath, "utf8").replace(/\r/g, "");

  return rawSrt
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const sentenceNo = Number(lines[0]);
      const timeMatch = lines[1]?.match(
        /^(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})$/,
      );

      if (!Number.isInteger(sentenceNo) || !timeMatch) {
        throw new Error("Invalid SRT block in section " + sectionNo + ": " + block);
      }

      return {
        sentenceNo,
        englishText: cleanText(lines.slice(2).join(" ")),
        startMs: timecodeToMs(timeMatch[1]),
        endMs: timecodeToMs(timeMatch[2]),
      };
    });
}

function buildTranscriptSentences(sectionNo) {
  const translationsBySection = {
    1: sectionOneTranslations,
    2: sectionTwoTranslations,
    3: sectionThreeTranslations,
    4: sectionFourTranslations,
  };
  const translations = translationsBySection[sectionNo];

  if (!translations) {
    throw new Error("Missing Chinese transcript for Cambridge IELTS 5 Test 1 Section " + sectionNo + ".");
  }

  return parseSrtCues(sectionNo).map((cue) => {
    const chineseText = translations[cue.sentenceNo];
    if (!chineseText) {
      throw new Error(
        "Missing Chinese transcript for Cambridge IELTS 5 Test 1 Section " +
          sectionNo +
          " sentence " +
          cue.sentenceNo +
          ".",
      );
    }

    return {
      ...cue,
      chineseText,
      speaker: null,
    };
  });
}

function answerFor(questionNo) {
  const rawAnswer = answersByQuestionNo[questionNo];
  if (!rawAnswer) {
    throw new Error("Missing answer for question " + questionNo + ".");
  }

  const values = rawAnswer
    .split(/\s*(?:\/|、)\s*/u)
    .map(cleanText)
    .filter(Boolean);

  return {
    answerText: values[0],
    variants: values.slice(1),
  };
}

function fillQuestion(sectionNo, questionNo) {
  return {
    questionNo,
    questionType: questionTypesByQuestionNo[questionNo] ?? "fill_blank",
    promptText: sectionQuestionPrompts[sectionNo]?.[questionNo] ?? "Question " + questionNo,
    ...answerFor(questionNo),
  };
}

export function buildSectionSeed(sectionNo) {
  const firstQuestionNo = (sectionNo - 1) * 10 + 1;
  const questionImagePaths = sectionNo === 1 || sectionNo === 3 ? [1, 2] : [1];

  return {
    book: {
      code: "cambridge-5",
      isPublished: true,
      sourceType: "cambridge",
      title: "Cambridge IELTS 5",
    },
    questions: Array.from({ length: 10 }, (_, index) =>
      fillQuestion(sectionNo, firstQuestionNo + index),
    ),
    section: {
      fullAudioPath: "listening/ci5/t1/s" + sectionNo + "/full.mp3",
      questionCount: 10,
      questionImagePath: questionImagePaths
        .map((pageNo) => "listening/ci5/t1/s" + sectionNo + "/questions/t1_s" + sectionNo + "_" + pageNo + ".png")
        .join("\n"),
      sectionNo,
      timeLimitSeconds: 600,
      title: sectionTitles[sectionNo] ?? "Section " + sectionNo,
    },
    test: {
      isPublished: true,
      testNo: 1,
      title: "Test 1",
    },
    transcriptSentences: buildTranscriptSentences(sectionNo).map((sentence) => ({
      ...sentence,
      audioPath:
        "listening/ci5/t1/s" +
        sectionNo +
        "/sentences/ci5_t1_s" +
        sectionNo +
        "_" +
        String(sentence.sentenceNo).padStart(3, "0") +
        ".mp3",
    })),
  };
}

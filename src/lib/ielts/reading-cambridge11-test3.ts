import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  64: [1550, 2212], 65: [1558, 2191], 66: [1484, 2099], 67: [1387, 2193],
  68: [1494, 2103], 69: [1554, 2195], 70: [1542, 2193], 71: [1526, 2192],
  72: [1550, 2193], 73: [1548, 2194], 74: [1546, 2197], 75: [1535, 2194],
  128: [1209, 1127],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci11-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(page: number): SourcePage {
  return {
    page,
    src: "/reading/explanations/cambridge-11-test-3-part3-exp11-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: page === 116 ? 693 : 2331,
  };
}

function rawFillBlock(id: string, title: string, rawText: string, start: number, end: number) {
  return {
    id,
    type: "fill" as const,
    title,
    instruction: "",
    rawText,
    questions: Array.from({ length: end - start + 1 }, (_, index) => ({
      number: start + index,
      before: "Question " + (start + index),
    })),
  };
}

const judgmentOptions = [
  { letter: "TRUE", text: "The statement agrees with the information." },
  { letter: "FALSE", text: "The statement contradicts the information." },
  { letter: "NOT GIVEN", text: "There is no information on this." },
];

const silkParagraphs = [
  "Silk is a fine, smooth material produced from the cocoons — soft protective shells — that are made by mulberry silkworms (insect larvae). Legend has it that it was Lei Tzu, wife of the Yellow Emperor, ruler of China in about 3000 BC, who discovered silkworms. One account of the story goes that as she was taking a walk in her husband’s gardens, she discovered that silkworms were responsible for the destruction of several mulberry trees. She collected a number of cocoons and sat down to have a rest. It just so happened that while she was sipping some tea, one of the cocoons that she had collected landed in the hot tea and started to unravel into a fine thread. Lei Tzu found that she could wind this thread around her fingers. Subsequently, she persuaded her husband to allow her to rear silkworms on a grove of mulberry trees. She also devised a special reel to draw the fibres from the cocoon into a single thread so that they would be strong enough to be woven into fabric. While it is unknown just how much of this is true, it is certainly known that silk cultivation has existed in China for several millennia.",
  "Originally, silkworm farming was solely restricted to women, and it was they who were responsible for the growing, harvesting and weaving. Silk quickly grew into a symbol of status, and originally, only royalty were entitled to have clothes made of silk. The rules were gradually relaxed over the years until finally during the Qing Dynasty (1644–1911 AD), even peasants, the lowest caste, were also entitled to wear silk. Sometime during the Han Dynasty (206 BC–220 AD), silk was so prized that it was also used as a unit of currency. Government officials were paid their salary in silk, and farmers paid their taxes in grain and silk. Silk was also used as diplomatic gifts by the emperor. Fishing lines, bowstrings, musical instruments and paper were all made using silk. The earliest indication of silk paper being used was discovered in the tomb of a noble who is estimated to have died around 168 AD.",
  "Demand for this exotic fabric eventually created the lucrative trade route now known as the Silk Road, taking silk westward and bringing gold, silver and wool to the East. It was named the Silk Road after its most precious commodity, which was considered to be worth more than gold. The Silk Road stretched over 6,000 kilometres from Eastern China to the Mediterranean Sea, following the Great Wall of China, climbing the Pamir mountain range, crossing modern-day Afghanistan and going on to the Middle East, with a major trading market in Damascus. From there, the merchandise was shipped across the Mediterranean Sea. Few merchants travelled the entire route; goods were handled mostly by a series of middlemen.",
  "With the mulberry silkworm being native to China, the country was the world’s sole producer of silk for many hundreds of years. The secret of silk-making eventually reached the rest of the world via the Byzantine Empire, which ruled over the Mediterranean region of southern Europe, North Africa and the Middle East during the period 330–1453 AD. According to another legend, monks working for the Byzantine emperor Justinian smuggled silkworm eggs to Constantinople (Istanbul in modern-day Turkey) in 550 AD, concealed inside hollow bamboo walking canes. The Byzantines were as secretive as the Chinese, however, and for many centuries the weaving and trading of silk fabric was a strict imperial monopoly. Then in the seventh century, the Arabs conquered Persia, capturing their magnificent silks in the process. Silk production thus spread through Africa, Sicily and Spain as the Arabs swept through these lands. Andalusia in southern Spain was Europe’s main silk-producing centre in the tenth century. By the thirteenth century, however, Italy had become Europe’s leader in silk production and export. Venetian merchants traded extensively in silk and encouraged silk growers to settle in Italy. Even now, silk processed in the province of Como in northern Italy enjoys an esteemed reputation.",
  "The nineteenth century and industrialisation saw the downfall of the European silk industry. Cheaper Japanese silk, trade in which was greatly facilitated by the opening of the Suez Canal, was one of the many factors driving the trend. Then in the twentieth century, new manmade fibres, such as nylon, started to be used in what had traditionally been silk products, such as stockings and parachutes. The two world wars, which interrupted the supply of raw material from Japan, also stifled the European silk industry. After the Second World War, Japan’s silk production was restored, with improved production and quality of raw silk. Japan was to remain the world’s biggest producer of raw silk, and practically the only major exporter of raw silk, until the 1970s. However, in more recent decades, China has gradually recaptured its position as the world’s biggest producer and exporter of raw silk and silk yarn. Today, around 125,000 metric tons of silk are produced in the world, and almost two thirds of that production takes place in China.",
];

const silk: ReadingPart = {
  id: "cambridge-11-test-3-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "The Story of Silk",
  subtitle: "The history of the world’s most luxurious fabric, from ancient China to the present day",
  sections: [{ id: "cambridge-11-test-3-part1-passage", format: "pre", paragraphs: silkParagraphs }],
  questionBlocks: [
    rawFillBlock(
      "cambridge-11-test-3-part1-questions-1-9",
      "The Story of Silk",
      "Questions 1–9\nComplete the notes below. Choose ONE WORD ONLY from the passage for each answer.\n\nWrite your answers in boxes 1–9 on your answer sheet.\n\nEarly silk production in China\nAround 3000 BC, according to legend:\n• a silkworm cocoon fell into the emperor’s wife’s 1 .................\n• the emperor’s wife invented a 2 ................. to pull out silk fibres\n• only 3 ................. were allowed to produce silk\n• only 4 ................. were allowed to wear silk\n• silk was used as a form of 5 ................., for example, farmers’ taxes consisted partly of silk\n• silk was used for many purposes; evidence was found of 6 ................. made from silk around 168 AD\n\nSilk reaches the rest of the world\n• Merchants used the Silk Road to take silk westward and bring back 7 ................. and precious metals\n• In 550 AD, 8 ................. hid silkworm eggs in canes and took them to Constantinople\n• Silk production spread across the Middle East and Europe\n• In the twentieth century, 9 ................. and other manmade fibres caused a decline in silk production",
      1,
      9,
    ),
    {
      id: "cambridge-11-test-3-part1-questions-10-13",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information in Reading Passage 1? In boxes 10–13 on your answer sheet, write TRUE, FALSE or NOT GIVEN.",
      questions: [
        { questionNumbers: [10], prompt: "Gold was the most valuable material transported along the Silk Road.", options: judgmentOptions },
        { questionNumbers: [11], prompt: "Most tradesmen only went along certain sections of the Silk Road.", options: judgmentOptions },
        { questionNumbers: [12], prompt: "The Byzantines spread the practice of silk production across the West.", options: judgmentOptions },
        { questionNumbers: [13], prompt: "Silk yarn makes up the majority of silk currently exported from China.", options: judgmentOptions },
      ],
    },
  ],
  source: {
    passagePages: [sourcePage(64), sourcePage(65)],
    questionPages: [sourcePage(66), sourcePage(67)],
    answerPages: [sourcePage(128)],
  },
};

const migrationsParagraphs = [
  "Animal migration, however it is defined, is far more than just the movement of animals. It can loosely be described as travel that takes place at regular intervals — often in an annual cycle — that may involve many members of a species, and is rewarded only after a long journey. It suggests inherited instinct. The biologist Hugh Dingle has identified five characteristics that apply, in varying degrees and combinations, to all migrations. They are prolonged movements that carry animals outside familiar habitats; they tend to be linear, not zigzaggy; they involve special behaviours concerning preparation (such as overfeeding) and arrival; they demand special allocations of energy. And one more: migrating animals maintain an intense attentiveness to the greater mission, which keeps them undistracted by temptations and undeterred by challenges that would turn other animals aside.",
  "An Arctic tern, on its 20,000 km flight from the extreme south of South America to the Arctic Circle, will take no notice of a nice smelly herring offered from a bird-watcher’s boat along the way. While local gulls will dive voraciously for such handouts, the tern flies on. Why? The Arctic tern resists distraction because it is driven at that moment by an instinctive sense of something we humans find admirable: larger purpose. In other words, it is determined to reach its destination. The bird senses that it can eat, rest and mate later. Right now it is totally focused on the journey; its undivided intent is arrival. Reaching some gravelly coastline in the Arctic, upon which other Arctic terns have converged, will serve its larger purpose as shaped by evolution: finding a place, a time, and a set of circumstances in which it can successfully hatch and rear offspring.",
  "But migration is a complex issue, and biologists define it differently, depending in part on what sorts of animals they study. Joel Berger, of the University of Montana, who works on the American pronghorn and other large terrestrial mammals, prefers what he calls a simple, practical definition suited to his beasts’ movements: ‘from a seasonal home area away to another home area and back again’. Generally the reason for such seasonal back-and-forth movement is to seek resources that aren’t available within a single area year-round.",
  "But daily vertical movements by zooplankton in the ocean — upward by night to seek food, downward by day to escape predators — can also be considered migration. So can the movement of aphids when, having depleted the young leaves on one food plant, their offspring then fly onward to a different host plant, with no one aphid ever returning to where it started.",
  "Dingle is an evolutionary biologist who studies insects. His definition is more intricate than Berger’s, citing those five features that distinguish migration from other forms of movement. They allow for the fact that, for example, aphids will become sensitive to blue light (from the sky) when it’s time for takeoff on their big journey, and sensitive to yellow light (reflected from tender young leaves) when it’s appropriate to land. Birds will fatten themselves with heavy feeding in advance of a long migrational flight. The value of his definition, Dingle argues, is that it focuses attention on what the phenomenon of wildebeest migration shares with the phenomenon of the aphids, and therefore helps guide researchers towards understanding how evolution has produced them all.",
  "Human behaviour, however, is having a detrimental impact on animal migration. The pronghorn, which resembles an antelope, though they are unrelated, is the fastest land mammal of the New World. One population, which spends the summer in the mountainous Grand Teton National Park of the western USA, follows a narrow route from its summer range in the mountains, across a river, and down onto the plains. Here they wait out the frozen months, feeding mainly on sagebrush blown clear of snow. These pronghorn are notable for the invariance of their migration route and the severity of its constriction at three bottlenecks. If they can’t pass through each of the three during their spring migration, they can’t reach their bounty of summer grazing; if they can’t pass through again in autumn, escaping south onto those windblown plains, they are likely to die trying to overwinter in the deep snow. Pronghorn, dependent on distance vision and speed to keep safe from predators, traverse high, open shoulders of land, where they can see and run. At one of the bottlenecks, forested hills rise to form a V, leaving a corridor of open ground only about 150 metres wide, filled with private homes. Increasing development is leading toward a crisis for the pronghorn, threatening to choke off their passageway.",
  "Conservation scientists, along with some biologists and land managers within the USA’s National Park Service and other agencies, are now working to preserve migrational behaviours, not just species and habitats. A National Forest has recognised the path of the pronghorn, much of which passes across its land, as a protected migration corridor. But neither the Forest Service nor the Park Service can control what happens on private land at a bottleneck. And with certain other migrating species, the challenge is complicated further — by vastly greater distances traversed, more jurisdictions, more borders, more dangers along the way. We will require wisdom and resoluteness to ensure that migrating species can continue their journeying a while longer.",
];

const migrationEndings = [
  { letter: "A", text: "be discouraged by difficulties." },
  { letter: "B", text: "travel on open land where they can look out for predators." },
  { letter: "C", text: "eat more than they need for immediate purposes." },
  { letter: "D", text: "be repeated daily." },
  { letter: "E", text: "ignore distractions." },
  { letter: "F", text: "be governed by the availability of water." },
  { letter: "G", text: "follow a straight line." },
];

const migrations: ReadingPart = {
  id: "cambridge-11-test-3-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 below.",
  title: "Great Migrations",
  sections: [{ id: "cambridge-11-test-3-part2-passage", format: "pre", paragraphs: migrationsParagraphs }],
  questionBlocks: [
    {
      id: "cambridge-11-test-3-part2-questions-14-18",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 2? In boxes 14–18 on your answer sheet, write TRUE, FALSE or NOT GIVEN.",
      questions: [
        { questionNumbers: [14], prompt: "Local gulls and migrating Arctic terns behave in the same way when offered food.", options: judgmentOptions },
        { questionNumbers: [15], prompt: "Experts’ definitions of migration tend to vary according to their area of study.", options: judgmentOptions },
        { questionNumbers: [16], prompt: "Very few experts agree that the movement of aphids can be considered migration.", options: judgmentOptions },
        { questionNumbers: [17], prompt: "Aphids’ journeys are affected by changes in the light that they perceive.", options: judgmentOptions },
        { questionNumbers: [18], prompt: "Dingle’s aim is to distinguish between the migratory behaviours of different species.", options: judgmentOptions },
      ],
    },
    {
      id: "cambridge-11-test-3-part2-questions-19-22",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete each sentence with the correct ending, A–G. Write the correct letter in boxes 19–22 on your answer sheet.",
      questions: [
        { questionNumbers: [19], prompt: "According to Dingle, migratory routes are likely to", options: migrationEndings },
        { questionNumbers: [20], prompt: "To prepare for migration, animals are likely to", options: migrationEndings },
        { questionNumbers: [21], prompt: "During migration, animals are unlikely to", options: migrationEndings },
        { questionNumbers: [22], prompt: "Arctic terns illustrate migrating animals’ ability to", options: migrationEndings },
      ],
    },
    rawFillBlock(
      "cambridge-11-test-3-part2-questions-23-26",
      "The migration of pronghorns",
      "Questions 23–26\nComplete the summary below. Choose ONE WORD ONLY from the passage for each answer.\n\nThe migration of pronghorns\nPronghorns rely on their eyesight and 23 ................. to avoid predators. One particular population’s summer habitat is a national park, and their winter home is on the 24 ................., where they go to avoid the danger presented by the snow at that time of year. However, their route between these two areas contains three 25 ................. . One problem is the construction of new homes in a narrow 26 ................. of land on the pronghorns’ route.",
      23,
      26,
    ),
  ],
  source: {
    passagePages: [sourcePage(68), sourcePage(69), sourcePage(70)],
    questionPages: [sourcePage(71)],
    answerPages: [sourcePage(128)],
  },
};

const mathematicsSections = [
  {
    id: "cambridge-11-test-3-part3-section-a",
    heading: "A",
    format: "pre" as const,
    paragraphs: [
      "Occasionally, in some difficult musical compositions, there are beautiful, but easy parts — parts so simple a beginner could play them. So it is with mathematics as well. There are some discoveries in advanced mathematics that do not depend on specialized knowledge, not even on algebra, geometry, or trigonometry. Instead they may involve, at most, a little arithmetic, such as ‘the sum of two odd numbers is even’, and common sense. Each of the eight chapters in this book illustrates this phenomenon. Anyone can understand every step in the reasoning.",
      "The thinking in each chapter uses at most only elementary arithmetic, and sometimes not even that. Thus all readers will have the chance to participate in a mathematical experience, to appreciate the beauty of mathematics, and to become familiar with its logical, yet intuitive, style of thinking.",
    ],
  },
  {
    id: "cambridge-11-test-3-part3-section-b",
    heading: "B",
    format: "pre" as const,
    paragraphs: [
      "One of my purposes in writing this book is to give readers who haven’t had the opportunity to see and enjoy real mathematics the chance to appreciate the mathematical way of thinking. I want to reveal not only some of the fascinating discoveries, but, more importantly, the reasoning behind them.",
      "In that respect, this book differs from most books on mathematics written for the general public. Some present the lives of colourful mathematicians. Others describe important applications of mathematics. Yet others go into mathematical procedures, but assume that the reader is adept in using algebra.",
    ],
  },
  {
    id: "cambridge-11-test-3-part3-section-c",
    heading: "C",
    format: "pre" as const,
    paragraphs: [
      "I hope this book will help bridge that notorious gap that separates the two cultures: the humanities and the sciences, or should I say the right brain (intuitive) and the left brain (analytical, numerical). As the chapters will illustrate, mathematics is not restricted to the analytical and numerical; intuition plays a significant role. The alleged gap can be narrowed or completely overcome by anyone, in part because each of us is far from using the full capacity of either side of the brain. To illustrate our human potential, I cite a structural engineer who is an artist, an electrical engineer who is an opera singer, an opera singer who published mathematical research, and a mathematician who publishes short stories.",
    ],
  },
  {
    id: "cambridge-11-test-3-part3-section-d",
    heading: "D",
    format: "pre" as const,
    paragraphs: [
      "Other scientists have written books to explain their fields to non-scientists, but have necessarily had to omit the mathematics, although it provides the foundation of their theories. The reader must remain a tantalized spectator rather than an involved participant, since the appropriate language for describing the details in much of science is mathematics, whether the subject is an expanding universe, subatomic particles, or chromosomes. Though the broad outline of a scientific theory can be sketched intuitively, when a part of the physical universe is finally understood, its description often looks like a page in a mathematics text.",
    ],
  },
  {
    id: "cambridge-11-test-3-part3-section-e",
    heading: "E",
    format: "pre" as const,
    paragraphs: [
      "Still, the non-mathematical reader can go far in understanding mathematical reasoning. This book presents the details that illustrate the mathematical style of thinking, which involves sustained, step-by-step analysis, experiments, and insights. You will turn these pages much more slowly than when reading a novel or a newspaper. It may help to have a pencil and paper ready to check claims and carry out experiments.",
    ],
  },
  {
    id: "cambridge-11-test-3-part3-section-f",
    heading: "F",
    format: "pre" as const,
    paragraphs: [
      "As I wrote, I kept in mind two types of readers: those who enjoyed mathematics until they were turned off by an unpleasant episode, usually around fifth grade, and mathematics aficionados, who will find much that is new throughout the book.",
      "This book also serves readers who simply want to sharpen their analytical skills. Many careers, such as law and medicine, require extended, precise analysis. Each chapter offers practice in following a sustained and closely argued line of thought. That mathematics can develop this skill is shown by these two testimonials:",
    ],
  },
  {
    id: "cambridge-11-test-3-part3-section-g",
    heading: "G",
    format: "pre" as const,
    paragraphs: [
      "A physician wrote, ‘The discipline of analytical thought processes [in mathematics] prepared me extremely well for medical school. In medicine one is faced with a problem which must be thoroughly analyzed before a solution can be found. The process is similar to doing mathematics.’",
      "A lawyer made the same point: ‘Although I had no background in law — not even one political science course — I did well at one of the best law schools. I attribute much of my success there to having learned, through the study of mathematics, and, in particular, theorems, how to analyze complicated principles. Lawyers who have studied mathematics can master the legal principles in a way that most others cannot.’",
      "I hope you will share my delight in watching as simple, even naïve, questions lead to remarkable solutions and purely theoretical discoveries find unanticipated applications.",
    ],
  },
];

const mathematics: ReadingPart = {
  id: "cambridge-11-test-3-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "Preface to ‘How the Other Half Thinks: Adventures in Mathematical Reasoning’",
  sections: mathematicsSections,
  questionBlocks: [
    {
      id: "cambridge-11-test-3-part3-questions-27-34",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 3 has seven sections, A–G. Which section contains the following information? Write the correct letter, A–G, in boxes 27–34 on your answer sheet. You may use any letter more than once.",
      questions: [
        { questionNumbers: [27], prompt: "A reference to books that assume a lack of mathematical knowledge.", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [28], prompt: "The way in which this is not a typical book about mathematics.", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [29], prompt: "Personal examples of being helped by mathematics.", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [30], prompt: "Examples of people who each had abilities that seemed incompatible.", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [31], prompt: "Mention of different focuses of books about mathematics.", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [32], prompt: "A contrast between reading this book and reading other kinds of publication.", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [33], prompt: "A claim that the whole of the book is accessible to everybody.", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [34], prompt: "A reference to different categories of intended readers of this book.", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Section " + letter })) },
      ],
    },
    rawFillBlock(
      "cambridge-11-test-3-part3-questions-35-40",
      "Questions 35–40",
      "Questions 35–40\nComplete the sentences below. Choose ONE WORD ONLY from the passage for each answer.\n\nWrite your answers in boxes 35–40 on your answer sheet.\n\n35 Some areas of both music and mathematics are suitable for someone who is a ................. .\n36 It is sometimes possible to understand advanced mathematics using no more than a limited knowledge of ................. .\n37 The writer intends to show that mathematics requires ................. thinking, as well as analytical skills.\n38 Some books written by ................. have had to leave out the mathematics that is central to their theories.\n39 The writer advises non-mathematical readers to perform ................. while reading the book.\n40 A lawyer found that studying ................. helped even more than other areas of mathematics in the study of law.",
      35,
      40,
    ),
  ],
  source: {
    passagePages: [sourcePage(72), sourcePage(73)],
    questionPages: [sourcePage(74), sourcePage(75)],
    answerPages: [sourcePage(128)],
    explanationPages: [116, 117, 118, 119, 120, 121].map(explanationPage),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集11精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE11_TEST3_PARTS: ReadingPart[] = [silk, migrations, mathematics];

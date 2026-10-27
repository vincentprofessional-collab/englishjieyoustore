import type { ReadingOption, ReadingPart } from "./reading";
import type { ReadingSourcePage } from "./reading-source-model";

function sourcePages(numbers: number[]): ReadingSourcePage[] {
  return numbers.map((page) => ({
    page,
    src: "/reading/source-pages/ci8-p" + String(page).padStart(3, "0") + ".webp",
    width: 1750,
    height: 2472,
  }));
}

function partSource(passagePages: number[], questionPages: number[]) {
  return {
    passagePages: sourcePages(passagePages),
    questionPages: sourcePages(questionPages),
    answerPages: [],
    explanationAttribution: "自编解析｜依据本卷原文与标准答案编写",
  };
}

const trueFalseNotGiven: ReadingOption[] = [
  { letter: "TRUE", text: "TRUE" },
  { letter: "FALSE", text: "FALSE" },
  { letter: "NOT GIVEN", text: "NOT GIVEN" },
];

const glassPassage: ReadingPart = {
  id: "cambridge-8-test-2-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "Sheet glass manufacture: the float process",
  sections: [
    {
      id: "c8t2-p1-a",
      paragraphs: [
        "Glass, which has been made since the time of the Mesopotamians and Egyptians, is little more than a mixture of sand, soda ash and lime. When heated to about 1500 degrees Celsius (°C) this becomes a molten mass that hardens when slowly cooled. The first successful method for making clear, flat glass involved spinning. This method was very effective as the glass had not touched any surfaces between being soft and becoming hard, so it stayed perfectly unblemished, with a ‘fire finish’. However, the process took a long time and was labour intensive.",
      ],
    },
    {
      id: "c8t2-p1-b",
      paragraphs: [
        "Nevertheless, demand for flat glass was very high and glassmakers across the world were looking for a method of making it continuously. The first continuous ribbon process involved squeezing molten glass through two hot rollers, similar to an old mangle. This allowed glass of virtually any thickness to be made non-stop, but the rollers would leave both sides of the glass marked, and these would then need to be ground and polished. This part of the process rubbed away around 20 per cent of the glass, and the machines were very expensive.",
      ],
    },
    {
      id: "c8t2-p1-c",
      paragraphs: [
        "The float process for making flat glass was invented by Alistair Pilkington. This process allows the manufacture of clear, tinted and coated glass for buildings, and clear and tinted glass for vehicles. Pilkington had been experimenting with improving the melting process, and in 1952 he had the idea of using a bed of molten metal to form the flat glass, eliminating altogether the need for rollers within the float bath. The metal had to melt at a temperature less than the hardening point of glass (about 600°C), but could not boil at a temperature below the temperature of the molten glass (about 1500°C). The best metal for the job was tin.",
      ],
    },
    {
      id: "c8t2-p1-d",
      paragraphs: [
        "The rest of the concept relied on gravity, which guaranteed that the surface of the molten metal was perfectly flat and horizontal. Consequently, when pouring molten glass onto the molten tin, the underside of the glass would also be perfectly flat. If the glass were kept hot enough, it would flow over the molten tin until the top surface was also flat, horizontal and perfectly parallel to the bottom surface. Once the glass cooled to 604°C or less it was too hard to mark and could be transported out of the cooling zone by rollers. The glass settled to a thickness of six millimetres because of surface tension interactions between the glass and the tin. By fortunate coincidence, 60 per cent of the flat glass market at that time was for six-millimetre glass.",
      ],
    },
    {
      id: "c8t2-p1-e",
      paragraphs: [
        "Pilkington built a pilot plant in 1953 and by 1955 he had convinced his company to build a full-scale plant. However, it took 14 months of non-stop production, costing the company £100,000 a month, before the plant produced any usable glass. Furthermore, once they succeeded in making marketable flat glass, the machine was turned off for a service to prepare it for years of continuous production. When it started up again it took another four months to get the process right again. They finally succeeded in 1959 and there are now float plants all over the world, with each able to produce around 1000 tons of glass every day, non-stop for around 15 years.",
      ],
    },
    {
      id: "c8t2-p1-f",
      paragraphs: [
        "Float plants today make glass of near optical quality. Several processes — melting, refining, homogenising — take place simultaneously in the 2000 tonnes of molten glass in the furnace. They occur in separate zones in a complex glass flow driven by high temperatures. It adds up to a continuous melting process, lasting as long as 50 hours, that delivers glass smoothly and continuously to the float bath, and from there to a coating zone and finally a heat treatment zone, where stresses formed during cooling are relieved.",
      ],
    },
    {
      id: "c8t2-p1-g",
      paragraphs: [
        "The principle of float glass is unchanged since the 1950s. However, the product has changed dramatically, from a single thickness of 6.8 mm to a range from sub-millimetre to 25 mm, from a ribbon frequently marred by inclusions and bubbles to almost optical perfection. To ensure the highest quality, inspection takes place at every stage. Occasionally, a bubble is not removed during refining, a sand grain refuses to melt, a tremor in the tin puts ripples into the glass ribbon. Automated on-line inspection does two things. Firstly, it reveals process faults upstream that can be corrected. Inspection technology allows more than 100 million measurements a second to be made across the ribbon, locating flaws the unaided eye would be unable to see. Secondly, it enables computers downstream to steer cutters around flaws.",
      ],
    },
    {
      id: "c8t2-p1-h",
      paragraphs: [
        "Float glass is sold by the square metre, and at the final stage computers translate customer requirements into patterns of cuts designed to minimise waste.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c8t2-p1-early-methods-table",
      type: "fill",
      title: "Early methods of producing flat glass",
      instruction: "Complete the table. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
      questions: [1, 2, 3, 4, 5].map((number) => ({ number, before: "Question " + number })),
      table: {
        headers: ["Method", "Advantages", "Disadvantages"],
        rows: [
          [
            { questionNumber: 1 },
            { before: "Glass remained ", questionNumber: 2 },
            { before: "Slow; ", questionNumber: 3 },
          ],
          [
            { text: "Ribbon" },
            { before: "Could produce glass sheets of varying ", questionNumber: 4, after: "; non-stop process" },
            { before: "Glass was ", questionNumber: 5, after: "; 20% of glass rubbed away; machines were expensive" },
          ],
        ],
      },
    },
    {
      id: "c8t2-p1-float-process-diagram",
      type: "fill",
      title: "Pilkington’s float process",
      instruction: "Complete the diagram. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
      questions: [6, 7, 8].map((number) => ({ number, before: "Question " + number })),
      rawText: "Questions 6–8\nComplete the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each answer.\n\nPilkington’s float process\n6 ...................... enters the melting zone and flows across the bed of 7 ...................... .\nAfter the cooling zone, the glass is carried out by 8 ...................... .\n\nThe original process diagram is available in the source-page reference below.",
    },
    {
      id: "c8t2-p1-true-false-not-given",
      type: "choice",
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 9–13 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this",
      questions: [
        { questionNumbers: [9], prompt: "The metal used in the float process had to have specific properties.", options: trueFalseNotGiven },
        { questionNumbers: [10], prompt: "Pilkington invested some of his own money in his float plant.", options: trueFalseNotGiven },
        { questionNumbers: [11], prompt: "Pilkington’s first full-scale plant was an instant commercial success.", options: trueFalseNotGiven },
        { questionNumbers: [12], prompt: "The process invented by Pilkington has now been improved.", options: trueFalseNotGiven },
        { questionNumbers: [13], prompt: "Computers are better than humans at detecting faults in glass.", options: trueFalseNotGiven },
      ],
    },
  ],
  source: partSource([34, 35], [36, 37]),
};

const iceAgeHeadings = [
  { id: "i", text: "Predicting climatic changes" },
  { id: "ii", text: "The relevance of the Little Ice Age today" },
  { id: "iii", text: "How cities contribute to climate change" },
  { id: "iv", text: "Human impact on the climate" },
  { id: "v", text: "How past climatic conditions can be determined" },
  { id: "vi", text: "A growing need for weather records" },
  { id: "vii", text: "A study covering a thousand years" },
  { id: "viii", text: "People have always responded to climate change" },
  { id: "ix", text: "Enough food at last" },
];

const weatherWordBank: ReadingOption[] = [
  { letter: "A", text: "climatic shifts" },
  { letter: "B", text: "ice cores" },
  { letter: "C", text: "tree rings" },
  { letter: "D", text: "glaciers" },
  { letter: "E", text: "interactions" },
  { letter: "F", text: "weather observations" },
  { letter: "G", text: "heat waves" },
  { letter: "H", text: "storms" },
  { letter: "I", text: "written accounts" },
];

const periodOptions: ReadingOption[] = [
  { letter: "A", text: "Medieval Warm Period" },
  { letter: "B", text: "Little Ice Age" },
  { letter: "C", text: "Modern Warm Period" },
];

const iceAgePassage: ReadingPart = {
  id: "cambridge-8-test-2-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 on the following pages.",
  title: "THE LITTLE ICE AGE",
  sections: [
    {
      id: "c8t2-p2-a",
      heading: "Paragraph A (example: viii)",
      paragraphs: [
        "This book will provide a detailed examination of the Little Ice Age and other climatic shifts, but, before I embark on that, let me provide a historical context. We tend to think of climate — as opposed to weather — as something unchanging, yet humanity has been at the mercy of climate change for its entire existence, with at least eight glacial episodes in the past 730,000 years. Our ancestors adapted to the universal but irregular global warming since the end of the last great Ice Age, around 10,000 years ago, with dazzling opportunism. They developed strategies for surviving harsh drought cycles, decades of heavy rainfall or unaccustomed cold; adopted agriculture and stock-raising, which revolutionised human life; and founded the world's first pre-industrial civilisations in Egypt, Mesopotamia and the Americas. But the price of sudden climate change, in famine, disease and suffering, was often high.",
      ],
    },
    {
      id: "c8t2-p2-b",
      heading: "Paragraph B",
      headingQuestionNumber: 14,
      paragraphs: [
        "The Little Ice Age lasted from roughly 1300 until the middle of the nineteenth century. Only two centuries ago, Europe experienced a cycle of bitterly cold winters; mountain glaciers in the Swiss Alps were the lowest in recorded memory, and pack ice surrounded Iceland for much of the year. The climatic events of the Little Ice Age did more than help shape the modern world. They are the deeply important context for the current unprecedented global warming. The Little Ice Age was far from a deep freeze, however; rather an irregular seesaw of rapid climatic shifts, few lasting more than a quarter-century, driven by complex and still little understood interactions between the atmosphere and the ocean. The seesaw brought cycles of intensely cold winters and easterly winds, then switched abruptly to years of heavy spring and early summer rains, mild winters, and frequent Atlantic storms, or to periods of droughts, light northeasterly winds, and summer heat waves.",
      ],
    },
    {
      id: "c8t2-p2-c",
      heading: "Paragraph C (example: v)",
      paragraphs: [
        "Reconstructing the climate changes of the past is extremely difficult, because systematic weather observations began only a few centuries ago, in Europe and North America. Records from India and tropical Africa are even more recent. For the time before records began, we have only ‘proxy records’ reconstructed largely from tree rings and ice cores, supplemented by a few incomplete written accounts. We now have hundreds of tree-ring records from throughout the northern hemisphere, and many from south of the equator, too, amplified with a growing body of temperature data from ice cores drilled in Antarctica, Greenland, the Peruvian Andes, and other locations. We are close to a knowledge of annual summer and winter temperature variations over much of the northern hemisphere going back 600 years.",
      ],
    },
    {
      id: "c8t2-p2-d",
      heading: "Paragraph D",
      headingQuestionNumber: 15,
      paragraphs: [
        "This book is a narrative history of climatic shifts during the past ten centuries, and some of the ways in which people in Europe adapted to them. Part One describes the Medieval Warm Period, roughly 900 to 1200. During these three centuries, Norse voyagers from Northern Europe explored northern seas, settled Greenland, and visited North America. It was not a time of uniform warmth, for then, as always since the Great Ice Age, there were constant shifts in rainfall and temperature. Mean European temperatures were about the same as today, perhaps slightly cooler.",
      ],
    },
    {
      id: "c8t2-p2-e",
      heading: "Paragraph E",
      headingQuestionNumber: 16,
      paragraphs: [
        "It is known that the Little Ice Age cooling began in Greenland and the Arctic in about 1200. As the Arctic ice pack spread southward, Norse voyages to the west were rerouted into the open Atlantic, then ended altogether. Storminess increased in the North Atlantic and North Sea. Colder, much wetter weather descended on Europe between 1315 and 1319, when thousands perished in a continent-wide famine. By 1400, the weather had become decidedly more unpredictable and stormier, with sudden shifts and lower temperatures that culminated in the cold decades of the late sixteenth century. Fish were a vital commodity in growing towns and cities, where food supplies were a constant concern. Dried cod and herring were already the staples of the European fish trade, but changes in water temperatures forced fishing fleets to work further offshore. The Basques, Dutch, and English developed the first offshore fishing boats adapted to a colder and stormier Atlantic. A gradual agricultural revolution in northern Europe stemmed from concerns over food supplies at a time of rising populations. The revolution involved intensive commercial farming and the growing of animal fodder on land not previously used for crops. The increased productivity from farmland made some countries self-sufficient in grain and livestock and offered effective protection against famine.",
      ],
    },
    {
      id: "c8t2-p2-f",
      heading: "Paragraph F",
      headingQuestionNumber: 17,
      paragraphs: [
        "Global temperatures began to rise slowly after 1850, with the beginning of the Modern Warm Period. There was a vast migration from Europe by land-hungry farmers and others, to which the famine caused by the Irish potato blight contributed, to North America, Australia, New Zealand, and southern Africa. Millions of hectares of forest and woodland fell before the newcomers' axes between 1850 and 1890, as intensive European farming methods expanded across the world. The unprecedented land clearance released vast quantities of carbon dioxide into the atmosphere, triggering for the first time humanly caused global warming. Temperatures climbed more rapidly in the twentieth century as the use of fossil fuels proliferated and greenhouse gas levels continued to soar. The rise has been even steeper since the early 1980s. The Little Ice Age has given way to a new climatic regime, marked by prolonged and steady warming. At the same time, extreme weather events like Category 5 hurricanes are becoming more frequent.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c8t2-p2-headings",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 2 has six paragraphs, A–F. Choose the correct heading for paragraphs B and D–F. Paragraphs A and C are examples.",
      options: iceAgeHeadings,
      questionNumbers: [14, 15, 16, 17],
    },
    {
      id: "c8t2-p2-weather-summary",
      type: "fill",
      title: "Weather during the Little Ice Age",
      instruction: "Complete the summary using the list of words, A–I. Write the correct letter, A–I, in boxes 18–22.",
      questions: [18, 19, 20, 21, 22].map((number) => ({ number, before: "Question " + number })),
      wordBank: weatherWordBank.map((option) => option.letter),
      rawText: "Questions 18–22\nComplete the summary using the list of words, A–I, below.\n\nWeather during the Little Ice Age\n\nDocumentation of past weather conditions is limited: our main sources of knowledge of conditions in the distant past are 18 ...................... and 19 ...................... . We can deduce that the Little Ice Age was a time of 20 ......................, rather than of consistent freezing. Within it there were some periods of very cold winters, others of 21 ...................... and heavy rain, and yet others that saw 22 ...................... with no rain at all.\n\n" + weatherWordBank.map((option) => option.letter + " " + option.text).join("\n"),
    },
    {
      id: "c8t2-p2-period-classification",
      type: "fill",
      title: "",
      instruction: "Classify the following events as occurring during the Medieval Warm Period (A), Little Ice Age (B) or Modern Warm Period (C). Write the correct letter, A, B or C, in boxes 23–26.",
      questions: [23, 24, 25, 26].map((number) => ({ number, before: "Question " + number })),
      table: {
        headers: ["Event", "Period"],
        rows: [
          [{ text: "Many Europeans started farming abroad." }, { questionNumber: 23 }],
          [{ text: "The cutting down of trees began to affect the climate." }, { questionNumber: 24 }],
          [{ text: "Europeans discovered other lands." }, { questionNumber: 25 }],
          [{ text: "Changes took place in fishing patterns." }, { questionNumber: 26 }],
        ],
      },
    },
  ],
  source: partSource([39, 40], [38, 41]),
};

const smellHeadings = [
  { id: "i", text: "The difficulties of talking about smells" },
  { id: "ii", text: "The role of smell in personal relationships" },
  { id: "iii", text: "Future studies into smell" },
  { id: "iv", text: "The relationship between the brain and the nose" },
  { id: "v", text: "The interpretation of smells as a factor in defining groups" },
  { id: "vi", text: "Why our sense of smell is not appreciated" },
  { id: "vii", text: "Smell is our superior sense" },
  { id: "viii", text: "The relationship between smell and feelings" },
];

const smellPassage: ReadingPart = {
  id: "cambridge-8-test-2-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 on the following pages.",
  title: "The meaning and power of smell",
  sections: [
    {
      id: "c8t2-p3-intro",
      paragraphs: [
        "The sense of smell, or olfaction, is powerful. Odours affect us on a physical, psychological and social level. For the most part, however, we breathe in the aromas which surround us without being consciously aware of their importance to us. It is only when the faculty of smell is impaired for some reason that we begin to realise the essential role the sense of smell plays in our sense of well-being.",
      ],
    },
    {
      id: "c8t2-p3-a",
      heading: "Paragraph A",
      headingQuestionNumber: 27,
      paragraphs: [
        "A survey conducted by Anthony Synott at Montreal's Concordia University asked participants to comment on how important smell was to them in their lives. It became apparent that smell can evoke strong emotional responses. A scent associated with a good experience can bring a rush of joy, while a foul odour or one associated with a bad memory may make us grimace with disgust. Respondents to the survey noted that many of their olfactory likes and dislikes were based on emotional associations. Such associations can be powerful enough so that odours that we would generally label unpleasant become agreeable, and those that we would generally consider fragrant become disagreeable for particular individuals. The perception of smell, therefore, consists not only of the sensation of the odours themselves, but of the experiences and emotions associated with them.",
      ],
    },
    {
      id: "c8t2-p3-b",
      heading: "Paragraph B",
      headingQuestionNumber: 28,
      paragraphs: [
        "Odours are also essential cues in social bonding. One respondent to the survey believed that there is no true emotional bonding without touching and smelling a loved one. In fact, infants recognise the odours of their mothers soon after birth and adults can often identify their children or spouses by scent. In one well-known test, women and men were able to distinguish by smell alone clothing worn by their marriage partners from similar clothing worn by other people. Most of the subjects would probably never have given much thought to odour as a cue for identifying family members before being involved in the test, but as the experiment revealed, even when not consciously considered, smells register.",
      ],
    },
    {
      id: "c8t2-p3-c",
      heading: "Paragraph C",
      headingQuestionNumber: 29,
      paragraphs: [
        "In spite of its importance to our emotional and sensory lives, smell is probably the most undervalued sense in many cultures. The reason often given for the low regard in which smell is held is that, in comparison with its importance among animals, the human sense of smell is feeble and undeveloped. While it is true that the olfactory powers of humans are nothing like as fine as those possessed by certain animals, they are still remarkably acute. Our noses are able to recognise thousands of smells, and to perceive odours which are present only in extremely small quantities.",
      ],
    },
    {
      id: "c8t2-p3-d",
      heading: "Paragraph D",
      headingQuestionNumber: 30,
      paragraphs: [
        "Smell, however, is a highly elusive phenomenon. Odours, unlike colours, for instance, cannot be named in many languages because the specific vocabulary simply doesn't exist. ‘It smells like . . . ,’ we have to say when describing an odour, struggling to express our olfactory experience. Nor can odours be recorded: there is no effective way to either capture or store them over time. In the realm of olfaction, we must make do with descriptions and recollections. This has implications for olfactory research.",
      ],
    },
    {
      id: "c8t2-p3-e",
      heading: "Paragraph E",
      headingQuestionNumber: 31,
      paragraphs: [
        "Most of the research on smell undertaken to date has been of a physical scientific nature. Significant advances have been made in the understanding of the biological and chemical nature of olfaction, but many fundamental questions have yet to be answered. Researchers have still to decide whether smell is one sense or two — one responding to odours proper and the other registering odourless chemicals in the air. Other unanswered questions are whether the nose is the only part of the body affected by odours, and how smells can be measured objectively given the non-physical components. Questions like these mean that interest in the psychology of smell is inevitably set to play an increasingly important role for researchers.",
      ],
    },
    {
      id: "c8t2-p3-f",
      heading: "Paragraph F",
      headingQuestionNumber: 32,
      paragraphs: [
        "However, smell is not simply a biological and psychological phenomenon. Smell is cultural, hence it is a social and historical phenomenon. Odours are invested with cultural values: smells that are considered to be offensive in some cultures may be perfectly acceptable in others. Therefore, our sense of smell is a means of, and model for, interacting with the world. Different smells can provide us with intimate and emotionally charged experiences and the value that we attach to these experiences is interiorised by the members of society in a deeply personal way. Importantly, our commonly held feelings about smells can help distinguish us from other cultures. The study of the cultural history of smell is, therefore, in a very real sense, an investigation into the essence of human culture.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c8t2-p3-headings",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 3 has six paragraphs, A–F. Choose the correct heading for each paragraph from the list of headings below.",
      options: smellHeadings,
      questionNumbers: [27, 28, 29, 30, 31, 32],
    },
    {
      id: "c8t2-p3-multiple-choice",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 33–36 on your answer sheet.",
      questions: [
        {
          questionNumbers: [33],
          prompt: "According to the introduction, we become aware of the importance of smell when",
          options: [
            { letter: "A", text: "we discover a new smell." },
            { letter: "B", text: "we experience a powerful smell." },
            { letter: "C", text: "our ability to smell is damaged." },
            { letter: "D", text: "we are surrounded by odours." },
          ],
        },
        {
          questionNumbers: [34],
          prompt: "The experiment described in paragraph B",
          options: [
            { letter: "A", text: "shows how we make use of smell without realising it." },
            { letter: "B", text: "demonstrates that family members have a similar smell." },
            { letter: "C", text: "proves that a sense of smell is learnt." },
            { letter: "D", text: "compares the sense of smell in males and females." },
          ],
        },
        {
          questionNumbers: [35],
          prompt: "What is the writer doing in paragraph C?",
          options: [
            { letter: "A", text: "supporting other research" },
            { letter: "B", text: "making a proposal" },
            { letter: "C", text: "rejecting a common belief" },
            { letter: "D", text: "describing limitations" },
          ],
        },
        {
          questionNumbers: [36],
          prompt: "What does the writer suggest about the study of smell in the atmosphere in paragraph E?",
          options: [
            { letter: "A", text: "The measurement of smell is becoming more accurate." },
            { letter: "B", text: "Researchers believe smell is a purely physical reaction." },
            { letter: "C", text: "Most smells are inoffensive." },
            { letter: "D", text: "Smell is yet to be defined." },
          ],
        },
      ],
    },
    {
      id: "c8t2-p3-short-answers",
      type: "fill",
      title: "",
      instruction: "Complete the sentences below. Choose ONE WORD ONLY from the passage for each answer.",
      questions: [
        { number: 37, before: "Tests have shown that odours can help people recognise the ", after: " belonging to their husbands and wives." },
        { number: 38, before: "Certain linguistic groups may have difficulty describing smell because they lack the appropriate ", after: "." },
        { number: 39, before: "The sense of smell may involve response to ", after: " which do not smell, in addition to obvious odours." },
        { number: 40, before: "Odours regarded as unpleasant in certain ", after: " are not regarded as unpleasant in others." },
      ],
    },
  ],
  source: partSource([43, 44], [42, 44, 45]),
};

export const CAMBRIDGE8_TEST2_PARTS: ReadingPart[] = [glassPassage, iceAgePassage, smellPassage];

import type { ReadingPart } from "./reading";
import type { ReadingSourcePage } from "./reading-source-model";

const sourceDimensions: Record<number, [number, number]> = {
  9: [1609, 2268], 10: [1721, 2613], 11: [1606, 2325], 12: [1750, 2149],
  13: [1699, 2467], 14: [1564, 2288], 15: [1613, 2311], 16: [1534, 2353],
  17: [1639, 2340], 18: [1643, 2319], 19: [1605, 2301], 20: [1539, 2455],
  21: [1750, 2308], 144: [1625, 1251],
};

function sourcePage(page: number): ReadingSourcePage {
  const [width, height] = sourceDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci10-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(page: number): ReadingSourcePage {
  return {
    page,
    src: "/reading/explanations/cambridge-10-test-1-part" + (page < 30 ? (page < 29 ? "1" : "2") : page < 35 ? "2" : "3") + "-exp10-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: ({ 21: 1533, 30: 1579, 35: 1203 } as Record<number, number>)[page] ?? 2265,
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

const stepwells: ReadingPart = {
  id: "cambridge-10-test-1-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "Stepwells",
  subtitle: "A millennium ago, stepwells were fundamental to life in the driest parts of India. Richard Cox travelled to north-western India to document these spectacular monuments from a bygone era.",
  sections: [{
    id: "cambridge-10-test-1-part1-passage",
    format: "pre",
    paragraphs: [
      "During the sixth and seventh centuries, the inhabitants of the modern-day states of Gujarat and Rajasthan in north-western India developed a method of gaining access to clean, fresh groundwater during the dry season for drinking, bathing, watering animals and irrigation. However, the significance of this invention — the stepwell — goes beyond its utilitarian application.",
      "Unique to this region, stepwells are architecturally complex and vary greatly in size and shape. During their heyday, they were places of gathering, leisure and relaxation, and of worship for villagers of all but the lowest classes. Stepwells are found dotted around the desert areas of Gujarat (where they are called vav) and Rajasthan (where they are called baori), while a few also survive in Delhi. Some were located near villages as public spaces for the community; others were positioned beside roads as resting places for travellers.",
      "As their name suggests, stepwells comprise a series of stone steps descending from ground level to the water source (normally an underground aquifer) as it recedes following the rains. When the water level was high, the user needed only to descend a few steps to reach it; when it was low, several levels would have to be negotiated.",
      "Some wells are vast, open craters with hundreds of steps paving each sloping side, often in tiers. Others are more elaborate, with long stepped passages leading to the water via several storeys. Built from stone and supported by pillars, they also included pavilions that sheltered visitors from the relentless heat. But perhaps the most impressive features are the intricate decorative sculptures that embellish many stepwells, showing activities from fighting and dancing to everyday acts such as women combing their hair or churning butter.",
      "Down the centuries, thousands of wells were constructed throughout north-western India, but the majority have now fallen into disuse; many are derelict and dry, as groundwater has been diverted for industrial use and the wells no longer reach the water table. Their condition has not been helped by recent dry spells: southern Rajasthan suffered an eight-year drought between 1996 and 2004.",
      "However, some important sites in Gujarat have recently undergone major restoration, and the state government announced in June last year that it plans to restore the stepwells throughout the state.",
      "In Patan, the state’s ancient capital, the stepwell of Rani Ki Vav (Queen’s Stepwell) is perhaps the finest current example. It was built by Queen Udayamati during the late 11th century, but became silted up following a flood during the 13th century. The Archaeological Survey of India began restoring it in the 1960s, and today it is in pristine condition. At 65 metres long, 20 metres wide and 27 metres deep, Rani Ki Vav features 500 sculptures carved into niches throughout the monument. Incredibly, in January 2001, this ancient structure survived an earthquake that measured 7.6 on the Richter scale.",
      "Another example is the Surya Kund in Modhera, northern Gujarat, next to the Sun Temple, built by King Bhima I in 1026 to honour the sun god Surya. It actually resembles a tank (kund means reservoir or pond) rather than a well, but displays the hallmarks of stepwell architecture, including four sides of steps that descend to the bottom in a stunning geometrical formation. The terraces house 108 small, intricately carved shrines between the sets of steps.",
      "Rajasthan also has a wealth of wells. The ancient city of Bundi, 200 kilometres south of Jaipur, is renowned for its architecture, including its stepwells. One of the larger examples is Raniji Ki Baori, which was built by the queen of the region, Nathavatji, in 1699. At 46 metres deep, 20 metres wide and 40 metres long, the intricately carved monument is one of 21 baoris commissioned in the Bundi area by Nathavatji.",
      "In the old ruined town of Abhaneri, about 95 kilometres east of Jaipur, is Chand Baori, one of India’s oldest and deepest wells; aesthetically, it is perhaps one of the most dramatic. Built in around 850 AD next to the temple of Harshat Mata, the baori comprises hundreds of zigzagging steps that run along three of its sides, steeply descending 11 storeys, resulting in a striking pattern when seen from afar. On the fourth side, verandas supported by ornate pillars overlook the steps.",
      "Still in public use is Neemrana Ki Baori, located just off the Jaipur–Delhi highway. Constructed in around 1700, it is nine storeys deep, with the last two being underwater. At ground level, there are 86 colonnaded openings from where the visitor descends 170 steps to the deepest water source.",
      "Today, following years of neglect, many of these monuments to medieval engineering have been saved by the Archaeological Survey of India, which has recognised the importance of preserving them as part of the country’s rich history. Tourists flock to wells in far-flung corners of north-western India to gaze in wonder at these architectural marvels from hundreds of years ago, which serve as a reminder of both the ingenuity and artistry of ancient civilisations and of the value of water to human existence.",
    ],
  }],
  questionBlocks: [
    rawFillBlock(
      "cambridge-10-test-1-part1-questions-1-5",
      "Questions 1–5",
      "Questions 1–5\nDo the following statements agree with the information given in Reading Passage 1?\n\nIn boxes 1–5 on your answer sheet, write\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN if there is no information on this\n\n1 Examples of ancient stepwells can be found all over the world.\n2 Stepwells had a range of functions, in addition to those related to water collection.\n3 The few existing stepwells in Delhi are more attractive than those found elsewhere.\n4 It took workers many years to build the stone steps characteristic of stepwells.\n5 The number of steps above the water level in a stepwell altered during the course of a year.",
      1,
      5,
    ),
    rawFillBlock(
      "cambridge-10-test-1-part1-questions-6-8",
      "Questions 6–8",
      "Questions 6–8\nAnswer the questions below. Choose ONE WORD ONLY from the passage for each answer.\n\n6 Which part of some stepwells provided shade for people?\n7 What type of serious climatic event, which took place in southern Rajasthan, is mentioned in the article?\n8 Who are frequent visitors to stepwells nowadays?",
      6,
      8,
    ),
    {
      id: "cambridge-10-test-1-part1-questions-9-13-table",
      type: "fill",
      title: "Stepwells",
      instruction: "Complete the table. Choose ONE WORD AND/OR A NUMBER from the passage for each answer.",
      questions: [9, 10, 11, 12, 13].map((number) => ({ number, before: "Question " + number })),
      table: {
        headers: ["Stepwell", "Date", "Features", "Other notes"],
        rows: [
          [
            { text: "Rani Ki Vav" },
            { before: "Late 11th ", after: " century" },
            { before: "As many as 500 sculptures decorate the monument" },
            { before: "Restored in the 1960s. Excellent condition, despite the ", questionNumber: 9, after: " of 2001" },
          ],
          [
            { text: "Surya Kund" },
            { text: "1026" },
            { before: "Steps on ", questionNumber: 10, after: " produce a geometrical pattern; carved shrines" },
            { before: "Looks more like a ", questionNumber: 11, after: " than a well" },
          ],
          [
            { text: "Raniji Ki Baori" },
            { text: "1699" },
            { text: "Intricately carved monument" },
            { text: "One of 21 baoris in the area commissioned by Queen Nathavatji" },
          ],
          [
            { text: "Chand Baori" },
            { text: "850 AD" },
            { before: "Steps take you down 11 storeys to the bottom. Has ", questionNumber: 12, after: " which provide a view of the steps" },
            { text: "Old, deep and very dramatic" },
          ],
          [
            { text: "Neemrana Ki Baori" },
            { text: "1700" },
            { before: "Has two ", questionNumber: 13, after: " levels" },
            { text: "Used by public today" },
          ],
        ],
      },
    },
  ],
  source: {
    passagePages: [sourcePage(9), sourcePage(10)],
    questionPages: [sourcePage(11), sourcePage(12)],
    answerPages: [sourcePage(144)],
    explanationPages: [21, 22, 23, 24, 25, 26, 27, 28].map(explanationPage),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集10精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const transportHeadings = [
  { id: "i", text: "A fresh and important long-term goal" },
  { id: "ii", text: "Charging for roads and improving other transport methods" },
  { id: "iii", text: "Changes affecting the distances goods may be transported" },
  { id: "iv", text: "Taking all the steps necessary to change transport patterns" },
  { id: "v", text: "The environmental costs of road transport" },
  { id: "vi", text: "The escalating cost of rail transport" },
  { id: "vii", text: "The need to achieve transport rebalance" },
  { id: "viii", text: "The rapid growth of private transport" },
  { id: "ix", text: "Plans to develop major road networks" },
  { id: "x", text: "Restricting road use through charging policies alone" },
  { id: "xi", text: "Transport trends in countries awaiting EU admission" },
];

const transportParagraphs = [
  {
    letter: "A", number: 14,
    text: "It is difficult to conceive of vigorous economic growth without an efficient transport system. Although modern information technologies can reduce the demand for physical transport by facilitating teleworking and teleservices, the requirement for transport continues to increase. There are two key factors behind this trend. For passenger transport, the determining factor is the spectacular growth in car use. The number of cars on European Union (EU) roads saw an increase of three million cars each year from 1990 to 2010, and in the next decade the EU will see a further substantial increase in its fleet.",
  },
  {
    letter: "B", number: 15,
    text: "As far as goods transport is concerned, growth is due to a large extent to changes in the European economy and its system of production. In the last 20 years, as internal frontiers have been abolished, the EU has moved from a ‘stock’ economy to a ‘flow’ economy. This phenomenon has been emphasised by the relocation of some industries, particularly those which are labour-intensive, to reduce production costs, even though the production site is hundreds or even thousands of kilometres away from the final assembly plant or from users.",
  },
  {
    letter: "C", number: 16,
    text: "The strong economic growth expected in countries which are candidates for entry to the EU will also increase transport flows, in particular road haulage traffic. In 1998, some of these countries already exported more than twice their 1990 volumes and imported more than five times their 1990 volumes. And although many candidate countries inherited a transport system which encourages rail, the distribution between modes has tipped sharply in favour of road transport since the 1990s. Between 1980 and 1998, road haulage increased by 19.4%, while during the same period rail haulage decreased by 43.5%, although — and this could benefit the enlarged EU — it is still on average at a much higher level than in existing member states.",
  },
  {
    letter: "D", number: 17,
    text: "However, a new imperative — sustainable development — offers an opportunity for adapting the EU’s common transport policy. This objective, agreed by the Gothenburg European Council, has to be achieved by integrating environmental considerations into Community policies, and shifting the balance between modes of transport lies at the heart of its strategy. The ambitious objective can only be fully achieved by 2020, but proposed measures are nonetheless a first essential step towards a sustainable transport system which will ideally be in place in 30 years’ time, that is by 2040.",
  },
  {
    letter: "E", number: 18,
    text: "In 1998, energy consumption in the transport sector was to blame for 28% of emissions of CO2, the leading greenhouse gas. According to the latest estimates, if nothing is done to reverse the traffic growth trend, CO2 emissions from transport can be expected to increase by around 50% to 1,113 billion tonnes by 2020, compared with the 739 billion tonnes recorded in 1990. Once again, road transport is the main culprit since it alone accounts for 84% of the CO2 emissions attributable to transport. Using alternative fuels and improving energy efficiency is thus both an ecological necessity and a technological challenge.",
  },
  {
    letter: "F",
    text: "At the same time, greater efforts must be made to achieve a modal shift. Such a change cannot be achieved overnight, all the less so after over half a century of constant deterioration in favour of road. This has reached such a pitch that today rail freight services are facing marginalisation, with just 8% of market share, and international goods trains struggling along at an average speed of 18 km/h. Three possible options have emerged.",
  },
  {
    letter: "G", number: 19,
    text: "The first approach would consist of focusing on road transport solely through pricing. This option would not be accompanied by complementary measures in the other modes of transport. In the short term it might curb the growth in road transport through the better loading ratio of goods vehicles and occupancy rates of passenger vehicles expected as a result of the increase in the price of transport. However, the lack of measures available to revitalise other modes of transport would make it impossible for more sustainable modes of transport to take up the baton.",
  },
  {
    letter: "H", number: 20,
    text: "The second approach also concentrates on road transport pricing but is accompanied by measures to increase the efficiency of the other modes (better quality of services, logistics, technology). However, this approach does not include investment in new infrastructure, nor does it guarantee better regional cohesion. It could help to achieve greater uncoupling than the first approach, but road transport would keep the lion’s share of the market and continue to concentrate on saturated arteries, despite being the most polluting of the modes. It is therefore not enough to guarantee the necessary shift of the balance.",
  },
  {
    letter: "I", number: 21,
    text: "The third approach, which is not new, comprises a series of measures ranging from pricing to revitalising alternative modes of transport and targeting investment in the trans-European network. This integrated approach would allow the market shares of the other modes to return to their 1998 levels and thus make a shift of balance. It is far more ambitious than it looks, bearing in mind the historical imbalance in favour of roads for the last fifty years, but would achieve a marked break in the link between road transport growth and economic growth, without placing restrictions on the mobility of people and goods.",
  },
];

const transport: ReadingPart = {
  id: "cambridge-10-test-1-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 on the following pages.",
  title: "EUROPEAN TRANSPORT SYSTEMS",
  subtitle: "What have been the trends and what are the prospects for European transport systems?",
  sections: transportParagraphs.map(({ letter, number, text }) => ({
    id: "cambridge-10-test-1-part2-paragraph-" + letter.toLowerCase(),
    heading: number ? "Paragraph " + letter : "Paragraph F (example: vii)",
    ...(number ? { headingQuestionNumber: number } : {}),
    format: "pre" as const,
    paragraphs: [text],
  })),
  questionBlocks: [
    {
      id: "cambridge-10-test-1-part2-headings-14-21",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 2 has nine paragraphs, A–I. Choose the correct heading for paragraphs A–E and G–I from the list. Paragraph F is the example (vii).",
      questionNumbers: [14, 15, 16, 17, 18, 19, 20, 21],
      options: transportHeadings,
    },
    rawFillBlock(
      "cambridge-10-test-1-part2-questions-22-26",
      "Questions 22–26",
      "Questions 22–26\nDo the following statements agree with the information given in Reading Passage 2?\n\nIn boxes 22–26 on your answer sheet, write\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN if there is no information on this\n\n22 The need for transport is growing, despite technological developments.\n23 To reduce production costs, some industries have been moved closer to their relevant consumers.\n24 Cars are prohibitively expensive in some EU candidate countries.\n25 The Gothenburg European Council was set up 30 years ago.\n26 By the end of this decade, CO2 emissions from transport are predicted to reach 739 billion tonnes.",
      22,
      26,
    ),
  ],
  source: {
    passagePages: [sourcePage(14), sourcePage(15)],
    questionPages: [sourcePage(13), sourcePage(16)],
    answerPages: [sourcePage(144)],
    explanationPages: [30, 31, 32, 33, 34].map(explanationPage),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集10精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const quartetOptions = [
  { letter: "A", text: "recognising talent" },
  { letter: "B", text: "working as a team" },
  { letter: "C", text: "having a shared objective" },
  { letter: "D", text: "being an effective leader" },
];

const endingOptions = [
  { letter: "A", text: "take chances" },
  { letter: "B", text: "share their ideas" },
  { letter: "C", text: "become competitive" },
  { letter: "D", text: "get promotion" },
  { letter: "E", text: "avoid risk" },
  { letter: "F", text: "ignore their duties" },
  { letter: "G", text: "remain in their jobs" },
];

const innovation: ReadingPart = {
  id: "cambridge-10-test-1-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "The psychology of innovation",
  subtitle: "Why are so few companies truly innovative?",
  sections: [{
    id: "cambridge-10-test-1-part3-passage",
    format: "pre",
    paragraphs: [
      "Innovation is key to business survival, and companies put substantial resources into inspiring employees to develop new ideas. There are, nevertheless, people working in luxurious, state-of-the-art centres designed to stimulate innovation who find that their environment does not make them feel at all creative. And there are those who do not have a budget, or much space, but who innovate successfully.",
      "For Robert B. Cialdini, Professor of Psychology at Arizona State University, one reason that companies do not succeed as often as they should is that innovation starts with recruitment. Research shows that the fit between an employee’s values and a company’s values makes a difference to what contribution they make and whether, two years after they join, they are still at the company. Studies at Harvard Business School show that, although some individuals may be more creative than others, almost every individual can be creative in the right circumstances.",
      "One of the most famous photographs in the history of rock ’n’ roll emphasises Cialdini’s views. The 1956 picture of singers Elvis Presley, Carl Perkins, Johnny Cash and Jerry Lee Lewis jamming at a piano in Sun Studios in Memphis tells a hidden story. This ‘million-dollar quartet’ could have been a quintet. Missing from the picture is Roy Orbison, a greater natural singer than Lewis, Perkins or Cash. Sam Phillips, who owned Sun, wanted to revolutionise popular music with songs that fused black and white music, and country and blues. Presley, Cash, Perkins and Lewis instinctively understood Phillips’s ambition and believed in it. Orbison was not inspired by the goal, and only ever achieved one hit with the Sun label.",
      "The value fit matters, says Cialdini, because innovation is, in part, a process of change, and under that pressure we, as a species, behave differently: ‘When things change, we are hard-wired to play it safe.’ Managers should therefore adopt an approach that appears counter-intuitive — they should explain what stands to be lost if the company fails to seize a particular opportunity. Studies show that we invariably take more gambles when threatened with a loss than when offered a reward.",
      "Managing innovation is a delicate art. It is easy for a company to be pulled in conflicting directions as the marketing, product development, and finance departments each get different feedback from different sets of people. And without a system which ensures collaborative exchanges within the company, it is also easy for small ‘pockets of innovation’ to disappear. Innovation is a contact sport. You cannot brief people just by saying, ‘We’re going in this direction and I’m going to take you with me.’",
      "Cialdini believes that this ‘follow-the-leader syndrome’ is dangerous, not least because it encourages bosses to go it alone. ‘It’s been scientifically proven that three people will be better than one at solving problems, even if that one person is the smartest person in the field.’ To prove his point, Cialdini cites an interview with molecular biologist James Watson. Watson, together with Francis Crick, discovered the structure of DNA, the genetic information carrier of all living organisms. ‘When asked how they had cracked the code ahead of an array of highly accomplished rival investigators, he said something that stunned me. He said he and Crick had succeeded because they were aware that they weren’t the most intelligent of the scientists pursuing the answer. The smartest scientist was called Rosalind Franklin who, Watson said, “was so intelligent she rarely sought advice”.’",
      "Teamwork taps into one of the basic drivers of human behaviour. ‘The principle of social proof is so pervasive that we don’t even recognise it,’ says Cialdini. ‘If your project is being resisted, for example, by a group of veteran employees, ask another old-timer to speak up for it.’ Cialdini is not alone in advocating this strategy. Research shows that peer power, used horizontally not vertically, is much more powerful than any boss’s speech.",
      "Writing, visualising and prototyping can stimulate the flow of new ideas. Cialdini cites scores of research papers and historical events that prove that even something as simple as writing deepens every individual’s engagement in the project. It is, he says, the reason why all those competitions on breakfast cereal packets encouraged us to write in saying, in no more than 10 words: ‘I like Kellogg’s Corn Flakes because…’. The very act of writing makes us more likely to believe it.",
      "Authority does not have to inhibit innovation, but it often does. The wrong kind of leadership will lead to what Cialdini calls ‘captainitis, the regrettable tendency of team members to opt out of team responsibilities that are properly theirs’. He calls it captainitis because, he says, ‘crew members of multipilot aircraft exhibit a sometimes deadly passivity when the flight captain makes a clearly wrong-headed decision’. This behaviour is not, he says, unique to air travel, but can happen in any workplace where the leader is overbearing.",
      "At the other end of the scale is the 1980s Memphis design collective, a group of young designers for whom ‘the only rule was that there were no rules’. This environment encouraged a free interchange of ideas, which led to more creativity with form, function, colour and materials that revolutionised attitudes to furniture design.",
      "Many theorists believe the ideal boss should lead from behind, taking pride in collective accomplishment and giving credit where it is due. Cialdini says: ‘Leaders should encourage everyone to contribute and simultaneously assure all concerned that every recommendation is important to making the right decision and will be given full attention.’ The frustrating thing about innovation is that there are many approaches, but no magic formula. However, a manager who wants to create a truly innovative culture can make their job a lot easier by recognising these psychological realities.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-10-test-1-part3-questions-27-30",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D.",
      questions: [
        {
          questionNumbers: [27],
          prompt: "The example of the ‘million-dollar quartet’ underlines the writer’s point about",
          options: quartetOptions,
        },
        {
          questionNumbers: [28],
          prompt: "James Watson suggests that he and Francis Crick won the race to discover the DNA code because they",
          options: [
            { letter: "A", text: "were conscious of their own limitations" },
            { letter: "B", text: "brought complementary skills to their partnership" },
            { letter: "C", text: "were determined to outperform their brighter rivals" },
            { letter: "D", text: "encouraged each other to realise their joint ambition" },
          ],
        },
        {
          questionNumbers: [29],
          prompt: "The writer mentions competitions on breakfast cereal packets as an example of how to",
          options: [
            { letter: "A", text: "inspire creative thinking" },
            { letter: "B", text: "generate concise writing" },
            { letter: "C", text: "promote loyalty to a group" },
            { letter: "D", text: "strengthen commitment to an idea" },
          ],
        },
        {
          questionNumbers: [30],
          prompt: "In the last paragraph, the writer suggests that it is important for employees to",
          options: [
            { letter: "A", text: "be aware of their company’s goals" },
            { letter: "B", text: "feel that their contributions are valued" },
            { letter: "C", text: "have respect for their co-workers’ achievements" },
            { letter: "D", text: "understand why certain management decisions are made" },
          ],
        },
      ],
    },
    {
      id: "cambridge-10-test-1-part3-questions-31-35",
      type: "choice",
      instruction: "Complete each sentence with the correct ending, A–G, below. Write the correct letter, A–G.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [31], prompt: "Employees whose values match those of their employers are more likely to", options: endingOptions },
        { questionNumbers: [32], prompt: "At times of change, people tend to", options: endingOptions },
        { questionNumbers: [33], prompt: "If people are aware of what they might lose, they will often", options: endingOptions },
        { questionNumbers: [34], prompt: "People working under a dominant boss are liable to", options: endingOptions },
        { questionNumbers: [35], prompt: "Employees working in organisations with few rules are more likely to", options: endingOptions },
      ],
    },
    rawFillBlock(
      "cambridge-10-test-1-part3-questions-36-40",
      "Questions 36–40",
      "Questions 36–40\nDo the following statements agree with the claims of the writer in Reading Passage 3?\n\nIn boxes 36–40 on your answer sheet, write\nYES if the statement agrees with the claims of the writer\nNO if the statement contradicts the claims of the writer\nNOT GIVEN if it is impossible to say what the writer thinks about this\n\n36 The physical surroundings in which a person works play a key role in determining their creativity.\n37 Most people have the potential to be creative.\n38 Teams work best when their members are of equally matched intelligence.\n39 It is easier for smaller companies to be innovative.\n40 A manager’s approval of an idea is more persuasive than that of a colleague.",
      36,
      40,
    ),
  ],
  source: {
    passagePages: [sourcePage(17), sourcePage(18)],
    questionPages: [sourcePage(19), sourcePage(20), sourcePage(21)],
    answerPages: [sourcePage(144)],
    explanationPages: [35, 36, 37, 38, 39, 40, 41, 42, 43].map(explanationPage),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集10精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE10_TEST1_PARTS: ReadingPart[] = [stepwells, transport, innovation];

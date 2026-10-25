import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  82: [1550, 2003], 83: [1390, 2368], 84: [1550, 2001], 85: [1510, 2381],
  86: [1550, 1988], 87: [1359, 2383], 88: [1439, 1988], 89: [1346, 2393],
  90: [1551, 1995], 91: [1457, 2377], 92: [1439, 1997], 93: [1476, 2370],
  94: [1550, 1993], 125: [1270, 1769],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1500, 2240];
  return {
    page,
    src: "/reading/source-pages/ci21-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function rawFillBlock(id: string, title: string, instruction: string, rawText: string, start: number, end: number) {
  return {
    id,
    type: "fill" as const,
    title,
    instruction,
    rawText,
    questions: Array.from({ length: end - start + 1 }, (_, index) => ({
      number: start + index,
      before: "Question " + (start + index),
    })),
  };
}

const trueFalseNotGivenOptions = [
  { letter: "TRUE", text: "The statement agrees with the information." },
  { letter: "FALSE", text: "The statement contradicts the information." },
  { letter: "NOT GIVEN", text: "There is no information on this." },
];

const yesNoNotGivenOptions = [
  { letter: "YES", text: "The statement agrees with the claims of the writer." },
  { letter: "NO", text: "The statement contradicts the claims of the writer." },
  { letter: "NOT GIVEN", text: "It is impossible to say what the writer thinks about this." },
];

const multilingualismWordBank = [
  { letter: "A", text: "basic outlook" }, { letter: "B", text: "employment opportunities" },
  { letter: "C", text: "wealthy visitors" }, { letter: "D", text: "distant country" },
  { letter: "E", text: "primary objective" }, { letter: "F", text: "similar advantages" },
  { letter: "G", text: "thriving economy" }, { letter: "H", text: "nearby district" },
  { letter: "I", text: "dense population" }, { letter: "J", text: "new immigrants" },
];

const globemakingWordBank = [
  { letter: "A", text: "educational use" }, { letter: "B", text: "rare materials" },
  { letter: "C", text: "inferior makes" }, { letter: "D", text: "product exchange markets" },
  { letter: "E", text: "necessary skills" }, { letter: "F", text: "international" },
  { letter: "G", text: "challenging task" }, { letter: "H", text: "memorable object" },
  { letter: "I", text: "internet purchase" }, { letter: "J", text: "numerous problems" },
];

const waterHyacinth: ReadingPart = {
  id: "cambridge-21-test-4-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "The problems and benefits created by the spread of the water hyacinth in Kenya",
  sections: [{
    id: "cambridge-21-test-4-part1-passage",
    format: "pre",
    paragraphs: [
      "Water hyacinth (Eichhornia crassipes), an aquatic plant native to South America, first appeared in countries in Africa in the early 1900s. Scientists there called it the ‘world’s worst aquatic weed’, after it spread from the southernmost tip of Africa in the early 1900s and started obstructing major dams and rivers.",
      "In east Africa the plant arrived with Belgian colonists in Rwanda, who liked the look of its glossy leaves and delicate purple flowers floating in their ponds. But by the 1980s, it had ‘escaped’ out of the country via the Kagera river and made its way downstream to Lake Victoria. There, with no natural predators and perfect temperature conditions, the plant began spreading in the open water, blocking fishing routes and providing a new habitat for disease-carrying mosquitoes.",
      "For the women who smoke fish from the lake to sell it has meant declining income, as the boats that once brought the fish to shore by the hundreds struggle to navigate through the mass of plants. But water hyacinth isn’t their only headache. In order to smoke the fish that they buy, they must gather huge quantities of firewood, sometimes walking as far as 10km each way to collect enough to complete their work. And each day as they cook, they breathe in the thick, grey smoke. About three out of four families in Kenya depend on wood or charcoal to cook their daily meals, and the rate is even higher in rural areas, Kenya’s latest demographic and health survey shows. Using solid fuels like these for cooking increases indoor pollution. The World Health Organization estimates that about 14,300 Kenyans die annually as a result of indoor air pollution — most of which is caused by cooking and heating sources.",
      "Some years ago, on the shores of Lake Victoria, huge piles of water hyacinth that villagers had taken out of the water in an attempt to clear it were a common sight. But buried in those decaying waxy leaves was a renewable energy gold mine. It turns out the floating plant isn’t just good at spreading — its foliage also contains a high ratio of carbon to nitrogen. It’s a magic combination that has captivated researchers’ imaginations since as early as the 1980s when, across the world, they began to explore its potential as a biofuel. Just about 4kg of the dried plant would be enough to cater for a large family’s daily energy needs, early research predicted.",
      "In 2014, Nigerian academics announced they had got better yields of biofuel gas when they mixed the plant with chicken manure. A few years later, Kenyan scientists confirmed what their Nigerian peers and others had already found: manure worked to improve the process of converting the weed into gas.",
      "In 2018, the technology came to a village on the shore of Lake Victoria, called Dunga. The project promised a two-for-one solution to the dual menaces of the water hyacinth and dependence on firewood. The community received a pair of donated biogas digesters — machines that would transform a mix of water hyacinth and cow dung into biogas for cooking.",
      "The digesters work a bit like a stomach. The mixture goes in one end — think of it as a mouth — and over the next 20 to 30 days, it goes through a fermentation process and breaks down, giving off gas that comes out the other end. From there, the clean-burning gas is passed through pipes to the point of use, just like traditional domestic gas. In Dunga, the machines produce enough gas to serve about 60% of the village’s population. It is used in domestic stoves and for other household tasks such as purifying water and incubating chicks.",
      "The project is testing whether biogas can provide an effective alternative to firewood and charcoal in rural Kenyan communities. Results indicate that the programme seems to be working. The women who smoke the lake fish are already getting sick less often. Besides, they don’t have to devote a lot of time every day to gathering firewood, which is a great relief. As a result, they’re able to make more money for their families from other enterprises.",
      "Kanyiva Muindi is an epidemiologist and air pollution research fellow at the African Population and Health Research Centre in Nairobi. She says families who switch to the smokeless cooking method could expect fewer respiratory diseases. Women, young girls and children are particularly vulnerable because they are the ones who cook in the kitchen or outside over fires.",
      "How much better the biogas stoves will be for the community’s health still needs more research, says Dominic Kahumbu Wanjihia, Biogas International’s chief executive. But unless the price of the machines drops, it’s pretty clear that most communities will never be able to afford any, since they sell for about $750.",
      "Kanyiva says affordability is a challenge worth addressing, given the huge health and environmental dangers posed by ‘dirty’ fuels such as wood, charcoal and kerosene. If biogas could become affordable on a large scale, she says it ‘would be life-changing for millions on the African continent and beyond’.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-21-test-4-part1-questions-1-7",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 1–7 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [1], prompt: "Water hyacinth was introduced as a decorative plant in east Africa.", options: trueFalseNotGivenOptions },
        { questionNumbers: [2], prompt: "Fishermen took some water hyacinth plants to Lake Victoria.", options: trueFalseNotGivenOptions },
        { questionNumbers: [3], prompt: "It is now difficult to force boats through the thick water hyacinth on Lake Victoria.", options: trueFalseNotGivenOptions },
        { questionNumbers: [4], prompt: "Chemicals produced by the water hyacinth plants are affecting the numbers of fish in Lake Victoria.", options: trueFalseNotGivenOptions },
        { questionNumbers: [5], prompt: "Cooking with charcoal has been proved to be even worse for people’s health than cooking with wood.", options: trueFalseNotGivenOptions },
        { questionNumbers: [6], prompt: "People found it impossible to remove much water hyacinth from Lake Victoria.", options: trueFalseNotGivenOptions },
        { questionNumbers: [7], prompt: "Scientists started investigating the possibility of using water hyacinth to generate biogas in the last century.", options: trueFalseNotGivenOptions },
      ],
    },
    rawFillBlock(
      "cambridge-21-test-4-part1-questions-8-10",
      "Generating biogas for domestic use in Dunga",
      "Complete the flow-chart below. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 8–10 on your answer sheet.",
      "Generating biogas for domestic use in Dunga\n\nFirst, place water hyacinth together with some 8 ______ into a digester\n\n↓\n\nLeave the mixture until the 9 ______ is completed\n\n↓\n\nCapture the gas emitted by the digester and use 10 ______ to transport it to individual homes\n\n↓\n\nThen use the gas for cooking as well as making water fit for human consumption",
      8,
      10,
    ),
    rawFillBlock(
      "cambridge-21-test-4-part1-questions-11-13",
      "Cooking with biogas in Dunga",
      "Complete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 11–13 on your answer sheet.",
      "Cooking with biogas in Dunga\n\nBenefits for the women in the village of cooking with biogas\n• no need for them to spend so much 11 ______ collecting fuel\n• they can focus on different tasks that bring in 12 ______\n• they are less likely to experience certain diseases connected to burning wood\n\nDrawbacks of changing to biogas\n• the 13 ______ of the digesters is beyond the reach of most villages",
      11,
      13,
    ),
  ],
  source: {
    passagePages: [82, 83, 84, 85].map(sourcePage),
    questionPages: [84, 85].map(sourcePage),
    answerPages: [sourcePage(125)],
  },
};

const multilingualism: ReadingPart = {
  id: "cambridge-21-test-4-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "How could multilingualism benefit India’s poorest schoolchildren?",
  sections: [{
    id: "cambridge-21-test-4-part2-passage",
    format: "pre",
    paragraphs: [
      "The crowded and bustling streets of Delhi teem with life. Stop to listen and, above the din of rickshaws and buses, you’ll hear a multitude of languages, as more than 20 million people go about their daily lives. Many were born and raised here, and many millions more have recently made India’s capital their home, having moved from surrounding neighbourhoods, cities and states or across the country, often in the hope of gaining better jobs and a better life. Some arrive speaking fluent Hindi, the dominant language in Delhi (and the official language of government), but many arrive speaking any number of India’s 22 officially recognised languages, let alone the hundreds of regional languages in a country of more than 1.3 billion people.",
      "A team of researchers led by Professor Ianthi Tsimpli of Cambridge University is currently working on a project collecting data on 1,000 primary-age children in Delhi and the cities of Hyderabad and Bihar. The overriding aim of the four-year project, called ‘Multilingualism and Multiliteracy’, is to find out why in a country where multilingualism is so common (more than 255 million people in India speak at least two languages, and nearly 90 million speak three or more languages), the many benefits of speaking more than one language, observed in schools in Europe for instance, do not apply to many of India’s schoolchildren.",
      "‘Each year across India, 600,000 children are tested, and year after year over 50% of children in Standard 5 [ten-year-olds] cannot read a Standard 2 [seven-year-olds] task fluently, and just under 50% of them cannot solve a Standard 2 subtraction task,’ says Tsimpli. She explains that low educational achievement can lead to many of these students dropping out of school — a problem disproportionately affecting female students.",
      "Tsimpli and her colleagues are investigating whether these low learning outcomes could be caused by an Indian school system where the language that children are taught in often differs from the language used at home. The research project, which focuses on 8- to 11-year-old schoolchildren in rural and urban areas, collects data on whether the schoolchildren live in slum* or non-slum areas. Many of the children have moved from remote, rural areas to urban areas. They are so poor they have to live in slums and, as a result of migration, they may speak languages that are different from the regional language.\n\n* slum: a very densely populated area in which the infrastructure is incomplete and services inadequate or non-existent",
      "Having already tested 1,000 children, the researchers will now embark on retesting them. They intend to look not only at test results, but also at variables such as the standard of schooling, the environment and the teaching practices themselves. It’s possible that one of the causes of low performance is the lack of pupil-centred teaching methods; in many Indian primary schools the teacher dominates and there is little room for independent learning.",
      "Although the findings are at a preliminary stage, Tsimpli and her team have found that the medium of instruction used in schools, especially English, may hold back those children who have little familiarity with, or exposure to, the language before starting school and outside of school life. According to Tsimpli, most of the evidence from this and other projects shows that English instruction for children from low socio-economic areas might not be the best way for them to learn, at least in the first three years of primary education.",
      "‘What we would recommend for everyone, not just low socio-economic status children, would be to start learning in the language they feel comfortable learning in ... English can still be used, but perhaps not as the medium of instruction in primary schools. It could, for example, be one of the subjects that are being taught alongside other subjects. We are not suggesting that English be withdrawn — that ship has sailed — but we perhaps have to think more about learner needs. There is perhaps too much uniformity in teaching and less tailoring to the children’s language abilities and needs,’ says Tsimpli.",
      "While the preliminary results show there is no difference in general intelligence among boys and girls from slum areas versus those from urban poor backgrounds, an unanticipated finding has been that children from slum backgrounds do not seem to lag behind children from other urban poor backgrounds — and in some cases outperform them (e.g. in numeracy and literacy tasks). According to the researchers, this unexpected finding may be down to the life experiences of children growing up in slums. They are likely to mature faster and come into closer contact with the numeracy skills essential for day-to-day survival.",
      "The project has already caught the attention of government ministers, who are keen to use the findings of the study to inform and adjust school policy in Delhi and the wider state. ‘They are as keen as us to understand how the challenging context of deprivation can be attenuated when focusing on the languages children learn and use while at school. Our findings don’t mean you’re doomed if you’re poor. It may be that these low learning outcomes are because of the way education is provided in India, with a huge focus on Hindi and English as the mediums of instruction, to the potential detriment of children unfamiliar with those languages,’ explains Tsimpli.",
      "‘Language is central to the way knowledge is transferred — so the medium of instruction is obviously hugely influential. We hope to ... show that problem solving, numeracy and literacy can and do improve in children who are educated in a language of instruction they know. The trick may be to bridge school skills with life skills and make use of the richness of a child’s life experience to help them learn in the most effective ways possible,’ says Tsimpli.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-21-test-4-part2-questions-14-19",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary using the list of words, A–J, below. Write the correct letter, A–J, in boxes 14–19 on your answer sheet.",
      questions: [
        { questionNumbers: [14], prompt: "Multilingualism in Delhi: the city has a ______ and as you walk through its streets you hear people speaking a variety of languages.", options: multilingualismWordBank },
        { questionNumbers: [15], prompt: "Some of them have spent their entire life in Delhi, while others are ______.", options: multilingualismWordBank },
        { questionNumbers: [16], prompt: "Whether they have come from a ______ or have travelled from the other side of India, they have all come in search of a better life.", options: multilingualismWordBank },
        { questionNumbers: [17], prompt: "Many people move to Delhi in search of improved ______.", options: multilingualismWordBank },
        { questionNumbers: [18], prompt: "The ______ of the research is to discover why multilingual Indian schoolchildren do not experience …", options: multilingualismWordBank },
        { questionNumbers: [19], prompt: "… ______ to those that multilingual schoolchildren in Europe experience.", options: multilingualismWordBank },
      ],
    },
    {
      id: "cambridge-21-test-4-part2-questions-20-23",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 2? In boxes 20–23 on your answer sheet, write YES if the statement agrees with the claims of the writer, NO if it contradicts the claims of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [20], prompt: "Ten-year-old Indian schoolchildren tend to perform better in literacy tests than in numeracy tests.", options: yesNoNotGivenOptions },
        { questionNumbers: [21], prompt: "Tsimpli had problems convincing some female students to take part in the study.", options: yesNoNotGivenOptions },
        { questionNumbers: [22], prompt: "Tsimpli and her team wanted to know if there is a connection between poor academic performance and being taught in an unfamiliar language.", options: yesNoNotGivenOptions },
        { questionNumbers: [23], prompt: "The researchers have decided against investigating the impact teaching methodology may have on learning outcomes.", options: yesNoNotGivenOptions },
      ],
    },
    {
      id: "cambridge-21-test-4-part2-questions-24-26",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 24–26 on your answer sheet.",
      questions: [
        { questionNumbers: [24], prompt: "What point does the writer make about primary schools in India in the sixth paragraph?", options: [
          { letter: "A", text: "Exposure to English outside of school is of limited benefit." }, { letter: "B", text: "Children learn English more easily when they are well motivated." }, { letter: "C", text: "Poor children may be disadvantaged further by being instructed in English." }, { letter: "D", text: "There is little consistency across schools with regard to instruction in English." },
        ] },
        { questionNumbers: [25], prompt: "What is Tsimpli suggesting when she uses the phrase ‘that ship has sailed’?", options: [
          { letter: "A", text: "The findings of the report may be of little help to some Indian schoolchildren." }, { letter: "B", text: "Instruction in English could be better adapted to the needs of schoolchildren." }, { letter: "C", text: "Schools have had limited success in teaching English as a separate subject." }, { letter: "D", text: "It is too late to remove English completely as a language of instruction in schools." },
        ] },
        { questionNumbers: [26], prompt: "In the eighth paragraph, what do we learn has surprised researchers?", options: [
          { letter: "A", text: "Boys and girls from low socio-economic groups have similar general intelligence levels." }, { letter: "B", text: "The age at which children move into a slum does not affect their academic performance." }, { letter: "C", text: "Slum children and children from other urban poor backgrounds have similar life experiences." }, { letter: "D", text: "The literacy and numeracy skills of slum children are not lower than those of children from other urban poor backgrounds." },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [86, 87, 88, 89].map(sourcePage),
    questionPages: [88, 89].map(sourcePage),
    answerPages: [sourcePage(125)],
  },
};

const globemakers: ReadingPart = {
  id: "cambridge-21-test-4-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "The Globemakers: The Curious Story of an Ancient Craft",
  subtitle: "A review of Peter Bellerby’s book The Globemakers",
  sections: [{
    id: "cambridge-21-test-4-part3-passage",
    format: "pre",
    paragraphs: [
      "In 2008, Peter Bellerby, who lived in London, wanted to give his father a model globe for his eightieth birthday. What seemed simple enough to start with triggered an almost obsessive, decade-long journey, marked by a series of obstacles that would have deterred anyone less determined. It ended with his establishing the world’s only bespoke globemaking company.",
      "The first surprise in The Globemakers, Bellerby’s account of this impulsive enterprise, is that obtaining such a globe was not simply a matter of a quick online order and a repressed sigh at the shipping costs. After all, contrary to stubbornly held popular views of our ancestors’ geographical ignorance, we have known that the world is spherical since at least the 6th century BCE. The ancient Greek philosopher Plato in his work Phaedo likened it to a leather ball, while the accolade of producing the first recorded globe goes to the ancient Greek philosopher Crates of Mallus, who is said to have made one in around 150 BCE. Surely, Bellerby reasoned, a good-quality globe wouldn’t be difficult to find.",
      "Nearly two millennia later, however, it seemed that the art of globemaking had been largely forgotten. Bellerby came across shoddy commercial versions designed for school classrooms and genuine antiques in auction houses that would have bust his budget. Even his trips to Morocco and India, where surely the knowledge of artisan cartographers* had been preserved, drew a blank.",
      "Not one to be easily thwarted, Bellerby decided to make his own good-quality globe. In the process, almost everything that could possibly go wrong did so. Even the shape of the Earth posed a problem, as it is not quite a perfect sphere, but oblate (slightly flattened at the poles). Having decided to compromise and opt for two half-spherical pieces that could be fitted together, he was unable to discover anyone capable of casting moulds with sufficient accuracy to ensure that he would not be left with two half-spheres that were not quite the same circumference. Even after he eventually resolved this issue, extracting these from the moulds resulted in piles of cracked plaster of Paris** and clouds of choking dust in the workshop he had set up at the rear of his house.\n\n* cartographer: someone involved in the science or practice of drawing maps\n** plaster of Paris: a quick-setting plaster consisting of a fine white powder that hardens when moistened and allowed to dry",
      "This series of abortive experiments taught Bellerby a lot about the challenges of making globes, which he communicates here to the reader. Finding just the right way to prise the globes from the mould — a high-end air compressor finally did the trick — and locating the right paper and inks with which to make the gores (the sections of flat sheet mapping that are pasted onto the spherical globe) without the ink seeping out to create a mushy, unreadable mess took months and an alarming chunk out of his bank balance. Bellerby’s frustration at the painstaking process of attaching the gores to the globe surface — after having found a glue with precisely the right adhesive qualities — is palpable. Right at the end of the process, he learnt that the paper had stretched slightly and so the final one overlapped the first by a centimetre (which may not seem a great deal, but when that represents 2 per cent of the Earth’s diameter, it’s equivalent to obliterating the Himalayas or wiping out Chile).",
      "Bellerby’s account of the technical challenges of globe production is interspersed with a series of interludes on great globemakers of the past and cartographic history in general. Purists might wish for more map-making details, but Bellerby clearly found a kindred spirit in Martin Behaim. He was the Nuremberg entrepreneur who in 1492 created the Erdapfel, the world’s oldest surviving globe, beautifully finished by a workshop of painters and other craftsmen, only to find that the explorer Christopher Columbus had stumbled upon the Americas the very same year, rendering his masterpiece instantly out of date. Something of Bellerby’s unflinching ambition is reflected in the even more heroic efforts of the Italian cartographer Vincenzo Coronelli, who, in the seventeenth century, created two globes for Louis XIV of France. It took him twenty years to complete the monstrous pair, whose vast bulk — each with a diameter of around four metres — can still be admired in the National Library of France in Paris.",
      "Although a celebration of the revival of an ancient craft, Bellerby’s book is also a lament for the fading away of centuries-old traditions. When he embarked on his globemaking odyssey, he struggled to find artisans with the skills to make the right moulds for the globes or foundries that could shape the meridians (the metal frames which girdle globes) in just the right way. Although he finally located the right craftsmen, some simply dropping in, serendipitously, to his workshop (by now in more suitable premises than his back room), many of these have now retired or passed away.",
      "Bellerby’s father finally did receive his eightieth birthday present, albeit two years late. Bellerby went on to found a company which now turns out over six hundred globes a year for customers who can have their own tiny village marked or more unusual requests fulfilled. His book, beautifully illustrated with photographs of the various stages of his venture and a few illustrations of historic globes and maps, is hardly a blueprint for commercial success. But it is more than enough to stir up admiration for the craftsmanship of the great mapmakers of the past and the obsessive determination of a modern successor who revived their almost moribund art.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-21-test-4-part3-questions-27-32",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary using the list of words, A–J, below. Write the correct letter, A–J, in boxes 27–32 on your answer sheet.",
      questions: [
        { questionNumbers: [27], prompt: "A birthday gift: Peter Bellerby’s plan to give his father a globe was an unexpectedly ______.", options: globemakingWordBank },
        { questionNumbers: [28], prompt: "He had to overcome ______ to complete this plan.", options: globemakingWordBank },
        { questionNumbers: [29], prompt: "He soon learnt that a straightforward ______ would not be possible.", options: globemakingWordBank },
        { questionNumbers: [30], prompt: "What type of commercial globes did Bellerby come across?", options: globemakingWordBank },
        { questionNumbers: [31], prompt: "Some of the commercial globes he found were designed for ______.", options: globemakingWordBank },
        { questionNumbers: [32], prompt: "He even travelled to places where people might still have the ______, but Bellerby could not find what he wanted.", options: globemakingWordBank },
      ],
    },
    {
      id: "cambridge-21-test-4-part3-questions-33-36",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 3? In boxes 33–36 on your answer sheet, write YES if the statement agrees with the claims of the writer, NO if it contradicts the claims of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [33], prompt: "The assumption today that people in the past knew very little about geography is correct.", options: yesNoNotGivenOptions },
        { questionNumbers: [34], prompt: "Plato was criticised for saying the world was shaped like a leather ball.", options: yesNoNotGivenOptions },
        { questionNumbers: [35], prompt: "The globe made by Crates of Mallus was an accurate representation of the known world.", options: yesNoNotGivenOptions },
        { questionNumbers: [36], prompt: "Bellerby assumed he would have few problems locating a well-made globe.", options: yesNoNotGivenOptions },
      ],
    },
    {
      id: "cambridge-21-test-4-part3-questions-37-40",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 37–40 on your answer sheet.",
      questions: [
        { questionNumbers: [37], prompt: "When Bellerby had to attach the gores to the globe surface,", options: [
          { letter: "A", text: "he decided it was best to work quickly." }, { letter: "B", text: "he became aware of an unexpected issue." }, { letter: "C", text: "he was worried about the quality of his materials." }, { letter: "D", text: "he nearly gave up the whole project." },
        ] },
        { questionNumbers: [38], prompt: "The reviewer mentions other globe makers of the past because", options: [
          { letter: "A", text: "Bellerby was particularly inspired by them." }, { letter: "B", text: "their achievements are not widely known." }, { letter: "C", text: "Bellerby had something in common with each of them." }, { letter: "D", text: "their difficulties could have been avoided." },
        ] },
        { questionNumbers: [39], prompt: "What point is made about Bellerby in the seventh paragraph?", options: [
          { letter: "A", text: "He had long working relationships with numerous craftsmen." }, { letter: "B", text: "He understands the lack of interest in traditional crafts." }, { letter: "C", text: "He appreciates the importance of careful planning." }, { letter: "D", text: "He regrets the loss of many globe-making skills." },
        ] },
        { questionNumbers: [40], prompt: "What does the reviewer say about Bellerby’s book in the final paragraph?", options: [
          { letter: "A", text: "It does not tell you how to create a profitable business." }, { letter: "B", text: "It overlooks some important mapmakers." }, { letter: "C", text: "It fails to discuss the future of globe-making." }, { letter: "D", text: "It does not give enough details about individual customers." },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [90, 91, 92, 93, 94].map(sourcePage),
    questionPages: [92, 93, 94].map(sourcePage),
    answerPages: [sourcePage(125)],
  },
};

export const CAMBRIDGE21_TEST4_PARTS: ReadingPart[] = [waterHyacinth, multilingualism, globemakers];

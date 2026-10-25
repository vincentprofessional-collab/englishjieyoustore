import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  82: [1594, 2100], 83: [1677, 2365], 84: [1591, 2161], 85: [1686, 2364],
  86: [1584, 2100], 87: [1689, 2364], 88: [1563, 2127], 89: [1651, 2365],
  90: [1591, 2196], 91: [1666, 2363], 92: [1512, 2103], 93: [1689, 2365],
  94: [1684, 2144], 128: [1088, 1541],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci15-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = {
    193: 575, 194: 2325, 195: 2326, 196: 2327, 197: 2324,
    201: 1908, 202: 2329, 203: 2330, 204: 2330,
    207: 1092, 208: 2332, 209: 2329, 210: 2327, 211: 2328, 212: 2327,
  };
  return {
    page,
    src: "/reading/explanations/cambridge-15-test-4-part" + part + "-exp15-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2263,
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

const huarango: ReadingPart = {
  id: "cambridge-15-test-4-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "The return of the huarango",
  subtitle: "The arid valleys of southern Peru are welcoming the return of a native plant",
  sections: [{
    id: "cambridge-15-test-4-part1-passage",
    format: "pre",
    paragraphs: [
      "The south coast of Peru is a narrow, 2,000-kilometre-long strip of desert squeezed between the Andes and the Pacific Ocean. It is also one of the most fragile ecosystems on Earth. It hardly ever rains there, and the only year-round source of water is located tens of metres below the surface. This is why the huarango tree is so suited to life there: it has the longest roots of any tree in the world. They stretch down 50–80 metres and, as well as sucking up water for the tree, they bring it into the higher subsoil, creating a water source for other plant life.",
      "Dr David Beresford-Jones, archaeobotanist at Cambridge University, has been studying the role of the huarango tree in landscape change in the Lower Ica Valley in southern Peru. He believes the huarango was key to the ancient people’s diet and, because it could reach deep water sources, it allowed local people to withstand years of drought when their other crops failed. But over the centuries huarango trees were gradually replaced with crops. Cutting down native woodland leads to erosion, as there is nothing to keep the soil in place. So when the huarangos go, the land turns into a desert. Nothing grows at all in the Lower Ica Valley now.",
      "For centuries the huarango tree was vital to the people of the neighbouring Middle Ica Valley too. They grew vegetables under it and ate products made from its seed pods. Its leaves and bark were used for herbal remedies, while its branches were used for charcoal for cooking and heating, and its trunk was used to build houses. But now it is disappearing rapidly. The majority of the huarango forests in the valley have already been cleared for fuel and agriculture — initially, these were smallholdings, but now they’re huge farms producing crops for the international market.",
      "‘Of the forests that were here 1,000 years ago, 99 per cent have already gone,’ says botanist Oliver Whaley from Kew Gardens in London, who, together with ethnobotanist Dr William Milliken, is running a pioneering project to protect and restore the rapidly disappearing habitat. In order to succeed, Whaley needs to get the local people on board, and that has meant overcoming local prejudices. ‘Increasingly aspirational communities think that if you plant food trees in your home or street, it shows you are poor, and still need to grow your own food,’ he says. In order to stop the Middle Ica Valley going the same way as the Lower Ica Valley, Whaley is encouraging locals to love the huarangos again. ‘It’s a process of cultural resuscitation,’ he says. He has already set up a huarango festival to reinstate a sense of pride in their eco-heritage, and has helped local schoolchildren plant thousands of trees.",
      "‘In order to get people interested in habitat restoration, you need to plant a tree that is useful to them,’ says Whaley. So, he has been working with local families to attempt to create a sustainable income from the huarangos by turning their products into foodstuffs. ‘Boil up the beans and you get this thick brown syrup like molasses. You can also use it in drinks, soups or stews.’ The pods can be ground into flour to make cakes, and the seeds roasted into a sweet, chocolatey ‘coffee’. ‘It’s packed full of vitamins and minerals,’ Whaley says.",
      "And some farmers are already planting huarangos. Alberto Benevides, owner of Ica Valley’s only certified organic farm, which Whaley helped set up, has been planting the tree for 13 years. He produces syrup and flour, and sells these products at an organic farmers’ market in Lima. His farm is relatively small and doesn’t yet provide him with enough to live on, but he hopes this will change. ‘The organic market is growing rapidly in Peru,’ Benevides says. ‘I am investing in the future.’",
      "But even if Whaley can convince the local people to fall in love with the huarango again, there is still the threat of the larger farms. Some of these cut across the forests and break up the corridors that allow the essential movement of mammals, birds and pollen up and down the narrow forest strip. In the hope of counteracting this, he’s persuading farmers to let him plant forest corridors on their land. He believes the extra woodland will also benefit the farms by reducing their water usage through a lowering of evaporation and providing a refuge for bio-control insects.",
      "‘If we can record biodiversity and see how it all works, then we’re in a good position to move on from there. Desert habitats can reduce down to very little,’ Whaley explains. ‘It’s not like a rainforest that needs to have this huge expanse. Life has always been confined to corridors and islands here. If you just have a few trees left, the population can grow up quickly because it’s used to exploiting water when it arrives.’ He sees his project as a model that has the potential to be rolled out across other arid areas around the world. ‘If we can do it here, in the most fragile system on Earth, then that’s a real message of hope for lots of places, including Africa, where there is drought and they just can’t afford to wait for rain.’",
    ],
  }],
  questionBlocks: [
    rawFillBlock(
      "cambridge-15-test-4-part1-questions-1-5",
      "The importance of the huarango tree",
      "Complete the notes below.\nChoose ONE WORD ONLY from the passage for each answer.\n\nWrite your answers in boxes 1–5 on your answer sheet.\n\nThe importance of the huarango tree\nits roots can extend as far as 80 metres into the soil\ncan access 1 ______ deep below the surface\n\nwas a crucial part of local inhabitants’ 2 ______ a long time ago\n\nhelped people to survive periods of 3 ______\n\nprevents 4 ______ of the soil\n\nprevents land from becoming a 5 ______",
      1,
      5,
    ),
    {
      id: "cambridge-15-test-4-part1-questions-6-8",
      type: "fill",
      title: "Traditional uses of the huarango tree",
      instruction: "Complete the table below. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 6–8 on your answer sheet.",
      questions: [
        { number: 6, before: "" },
        { number: 7, before: "", inputCount: 2, joiners: [" and "], answerMode: "all" },
        { number: 8, before: "" },
      ],
      table: {
        headers: ["Part of tree", "Traditional use"],
        rows: [
          [{ questionNumber: 6 }, { text: "fuel" }],
          [{ questionNumber: 7, inputCount: 2, joiners: [" and "] }, { text: "medicine" }],
          [{ questionNumber: 8 }, { text: "construction" }],
        ],
      },
    },
    {
      id: "cambridge-15-test-4-part1-questions-9-13",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 9–13 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [9], prompt: "Local families have told Whaley about some traditional uses of huarango products.", options: trueFalseNotGivenOptions },
        { questionNumbers: [10], prompt: "Farmer Alberto Benevides is now making a good profit from growing huarangos.", options: trueFalseNotGivenOptions },
        { questionNumbers: [11], prompt: "Whaley needs the co-operation of farmers to help preserve the area’s wildlife.", options: trueFalseNotGivenOptions },
        { questionNumbers: [12], prompt: "For Whaley’s project to succeed, it needs to be extended over a very large area.", options: trueFalseNotGivenOptions },
        { questionNumbers: [13], prompt: "Whaley has plans to go to Africa to set up a similar project.", options: trueFalseNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [82, 83].map(sourcePage),
    questionPages: [84, 85].map(sourcePage),
    answerPages: [sourcePage(128)],
    explanationPages: [193, 194, 195, 196, 197].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集15精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const silbo: ReadingPart = {
  id: "cambridge-15-test-4-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Silbo Gomero — the whistle ‘language’ of the Canary Islands",
  sections: [{
    id: "cambridge-15-test-4-part2-passage",
    format: "pre",
    paragraphs: [
      "La Gomera is one of the Canary Islands situated in the Atlantic Ocean off the northwest coast of Africa. This small volcanic island is mountainous, with steep rocky slopes and deep, wooded ravines, rising to 1,487 metres at its highest peak. It is also home to the best known of the world’s whistle ‘languages’, a means of transmitting information over long distances which is perfectly adapted to the extreme terrain of the island.",
      "This ‘language’, known as ‘Silbo’ or ‘Silbo Gomero’ — from the Spanish word for ‘whistle’ — is now shedding light on the language-processing abilities of the human brain, according to scientists. Researchers say that Silbo activates parts of the brain normally associated with spoken language, suggesting that the brain is remarkably flexible in its ability to interpret sounds as language.",
      "‘Science has developed the idea of brain areas that are dedicated to language, and we are starting to understand the scope of signals that can be recognised as language,’ says David Corina, co-author of a recent study and associate professor of psychology at the University of Washington in Seattle.",
      "Silbo is a substitute for Spanish, with individual words recoded into whistles which have high- and low-frequency tones. A whistler — or silbador — puts a finger in his or her mouth to increase the whistle’s pitch, while the other hand can be cupped to adjust the direction of the sound. ‘There is much more ambiguity in the whistled signal than in the spoken signal,’ explains lead researcher Manuel Carreiras, psychology professor at the University of La Laguna on the Canary island of Tenerife. Because whistled ‘words’ can be hard to distinguish, silbadores rely on repetition, as well as awareness of context, to make themselves understood.",
      "The silbadores of Gomera are traditionally shepherds and other isolated mountain folk, and their novel means of staying in touch allows them to communicate over distances of up to 10 kilometres. Carreiras explains that silbadores are able to pass a surprising amount of information via their whistles. ‘In daily life they use whistles to communicate short commands, but any Spanish sentence could be whistled.’ Silbo has proved particularly useful when fires have occurred on the island and rapid communication across large areas has been vital.",
      "The study team used neuroimaging equipment to contrast the brain activity of silbadores while listening to whistled and spoken Spanish. Results showed the left temporal lobe of the brain, which is usually associated with spoken language, was engaged during the processing of Silbo. The researchers found that other key regions in the brain’s frontal lobe also responded to the whistles, including those activated in response to sign language among deaf people. When the experiments were repeated with non-whistlers, however, activation was observed in all areas of the brain.",
      "‘Our results provide more evidence about the flexibility of human capacity for language in a variety of forms,’ Corina says. ‘These data suggest that left-hemisphere language regions are uniquely adapted for communicative purposes, independent of the modality of signal. The non-Silbo speakers were not recognising Silbo as a language. They had nothing to grab onto, so multiple areas of their brains were activated.’",
      "Carreiras says the origins of Silbo Gomero remain obscure, but that indigenous Canary Islanders, who were of North African origin, already had a whistled language when Spain conquered the volcanic islands in the 15th century. Whistled languages survive today in Papua New Guinea, Mexico, Vietnam, Guyana, China, Nepal, Senegal, and a few mountainous pockets in southern Europe. There are thought to be as many as 70 whistled languages still in use, though only 12 have been described and studied scientifically. This form of communication is an adaptation found among cultures where people are often isolated from each other, according to Julien Meyer, a researcher at the Institute of Human Sciences in Lyon, France. ‘They are mostly used in mountains or dense forests,’ he says. ‘Whistled languages are quite clearly defined and represent an original adaptation of the spoken language for the needs of isolated human groups.’",
      "But with modern communication technology now widely available, researchers say whistled languages like Silbo are threatened with extinction. With dwindling numbers of Gomera islanders still fluent in the language, Canaries’ authorities are taking steps to try to ensure its survival. Since 1999, Silbo Gomero has been taught in all of the island’s elementary schools. In addition, locals are seeking assistance from the United Nations Educational, Scientific and Cultural Organization (UNESCO). ‘The local authorities are trying to get an award from the organisation to declare [Silbo Gomero] as something that should be preserved for humanity,’ Carreiras adds.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-15-test-4-part2-questions-14-19",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 2? In boxes 14–19 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [14], prompt: "La Gomera is the most mountainous of all the Canary Islands.", options: trueFalseNotGivenOptions },
        { questionNumbers: [15], prompt: "Silbo is only appropriate for short and simple messages.", options: trueFalseNotGivenOptions },
        { questionNumbers: [16], prompt: "In the brain-activity study, silbadores and non-whistlers produced different results.", options: trueFalseNotGivenOptions },
        { questionNumbers: [17], prompt: "The Spanish introduced Silbo to the islands in the 15th century.", options: trueFalseNotGivenOptions },
        { questionNumbers: [18], prompt: "There is precise data available regarding all of the whistle languages in existence today.", options: trueFalseNotGivenOptions },
        { questionNumbers: [19], prompt: "The children of Gomera now learn Silbo.", options: trueFalseNotGivenOptions },
      ],
    },
    rawFillBlock(
      "cambridge-15-test-4-part2-questions-20-26",
      "Silbo Gomero",
      "Complete the notes below.\nChoose ONE WORD ONLY from the passage for each answer.\n\nWrite your answers in boxes 20–26 on your answer sheet.\n\nSilbo Gomero\n\nHow Silbo is produced\n• high- and low-frequency tones represent different sounds in Spanish 20 ______\n• the whistler controls the pitch of the whistle using his or her 21 ______\n• the 22 ______ of the sound is changed with a cupped hand\n\nHow Silbo is used\n• has long been used by shepherds and people living in secluded locations\n• in everyday use for the transmission of brief 23 ______\n• can relay essential information quickly, e.g. to inform people about 24 ______\n\nThe future of Silbo\n• future under threat because of new 25 ______\n• Canaries’ authorities hoping to receive a UNESCO 26 ______ to preserve it",
      20,
      26,
    ),
  ],
  source: {
    passagePages: [86, 87].map(sourcePage),
    questionPages: [88, 89].map(sourcePage),
    answerPages: [sourcePage(128)],
    explanationPages: [201, 202, 203, 204].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集15精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const environmentalPractices: ReadingPart = {
  id: "cambridge-15-test-4-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Environmental practices of big businesses",
  sections: [{
    id: "cambridge-15-test-4-part3-passage",
    format: "pre",
    paragraphs: [
      "The environmental practices of big businesses are shaped by a fundamental fact that for many of us offends our sense of justice. Depending on the circumstances, a business may maximize the amount of money it makes, at least in the short term, by damaging the environment and hurting people. That is still the case today for fishermen in an unmanaged fishery without quotas, and for international logging companies with short-term leases on tropical rainforest land in places with corrupt officials and unsophisticated landowners. When government regulation is effective, and when the public is environmentally aware, environmentally clean big businesses may out-compete dirty ones, but the reverse is likely to be true if government regulation is ineffective and if the public doesn’t care.",
      "It is easy for the rest of us to blame a business for helping itself by hurting other people. But blaming alone is unlikely to produce change. It ignores the fact that businesses are not charities but profit-making companies, and that publicly owned companies with shareholders are under obligation to those shareholders to maximize profits, provided that they do so by legal means. US laws make a company’s directors legally liable for something termed ‘breach of fiduciary responsibility’ if they knowingly manage a company in a way that reduces profits. The car manufacturer Henry Ford was in fact successfully sued by shareholders in 1919 for raising the minimum wage of his workers to $5 per day: the courts declared that, while Ford’s humanitarian sentiments about his employees were nice, his business existed to make profits for its stockholders.",
      "Our blaming of businesses also ignores the ultimate responsibility of the public for creating the conditions that let a business profit through destructive environmental policies. In the long run, it is the public, either directly or through its politicians, that has the power to make such destructive policies unprofitable and illegal, and to make sustainable environmental policies profitable.",
      "The public can do that by suing businesses for harming them, as happened after the Exxon Valdez disaster, in which over 40,000 m³ of oil were spilled off the coast of Alaska. The public may also make their opinion felt by preferring to buy sustainably harvested products; by making employees of companies with poor track records feel ashamed of their company and complain to their own management; by preferring their governments to award valuable contracts to businesses with a good environmental track record; and by pressing their governments to pass and enforce laws and regulations requiring good environmental practices.",
      "In turn, big businesses can exert powerful pressure on any suppliers that might ignore public or government pressure. For instance, after the US public became concerned about the spread of a disease known as BSE, which was transmitted to humans through infected meat, the US government’s Food and Drug Administration introduced rules demanding that the meat industry abandon practices associated with the risk of the disease spreading. But for five years the meat packers refused to follow these, claiming that they would be too expensive to obey. However, when a major fast-food company then made the same demands after customer purchases of its hamburgers plummeted, the meat industry complied within weeks. The public’s task is therefore to identify which links in the supply chain are sensitive to public pressure: for instance, fast-food chains or jewelry stores, but not meat packers or gold miners.",
      "Some readers may be disappointed or outraged that I place the ultimate responsibility for business practices harming the public on the public itself. I also believe that the public must accept the necessity for higher prices for products to cover the added costs, if any, of sound environmental practices. My views may seem to ignore the belief that businesses should act in accordance with moral principles even if this leads to a reduction in their profits. But I think we have to recognize that, throughout human history, in all politically complex human societies, government regulation has arisen precisely because it was found that not only did moral principles need to be made explicit, they also needed to be enforced.",
      "To me, the conclusion that the public has the ultimate responsibility for the behavior of even the biggest businesses is empowering and hopeful, rather than disappointing. My conclusion is not a moralistic one about who is right or wrong, admirable or selfish, a good guy or a bad guy. In the past, businesses have changed when the public came to expect and require different behavior, to reward businesses for behavior that the public wanted, and to make things difficult for businesses practicing behaviors that the public didn’t want. I predict that in the future, just as in the past, changes in public attitudes will be essential for changes in businesses’ environmental practices.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-15-test-4-part3-questions-27-31",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary using the list of words, A–J, below. Write the correct letter, A–J, in boxes 27–31 on your answer sheet.",
      questions: [
        { questionNumbers: [27], prompt: "Many big businesses today are prepared to harm people and the environment in order to make money, and they appear to have no …", options: [
          { letter: "A", text: "funding" }, { letter: "B", text: "trees" }, { letter: "C", text: "rare species" },
          { letter: "D", text: "moral standards" }, { letter: "E", text: "control" }, { letter: "F", text: "involvement" },
          { letter: "G", text: "flooding" }, { letter: "H", text: "overfishing" }, { letter: "I", text: "worker support" },
        ] },
        { questionNumbers: [28], prompt: "Lack of … by governments", options: [
          { letter: "A", text: "funding" }, { letter: "B", text: "trees" }, { letter: "C", text: "rare species" },
          { letter: "D", text: "moral standards" }, { letter: "E", text: "control" }, { letter: "F", text: "involvement" },
          { letter: "G", text: "flooding" }, { letter: "H", text: "overfishing" }, { letter: "I", text: "worker support" },
        ] },
        { questionNumbers: [29], prompt: "and lack of public … can lead to environmental problems", options: [
          { letter: "A", text: "funding" }, { letter: "B", text: "trees" }, { letter: "C", text: "rare species" },
          { letter: "D", text: "moral standards" }, { letter: "E", text: "control" }, { letter: "F", text: "involvement" },
          { letter: "G", text: "flooding" }, { letter: "H", text: "overfishing" }, { letter: "I", text: "worker support" },
        ] },
        { questionNumbers: [30], prompt: "such as …", options: [
          { letter: "A", text: "funding" }, { letter: "B", text: "trees" }, { letter: "C", text: "rare species" },
          { letter: "D", text: "moral standards" }, { letter: "E", text: "control" }, { letter: "F", text: "involvement" },
          { letter: "G", text: "flooding" }, { letter: "H", text: "overfishing" }, { letter: "I", text: "worker support" },
        ] },
        { questionNumbers: [31], prompt: "or the destruction of …", options: [
          { letter: "A", text: "funding" }, { letter: "B", text: "trees" }, { letter: "C", text: "rare species" },
          { letter: "D", text: "moral standards" }, { letter: "E", text: "control" }, { letter: "F", text: "involvement" },
          { letter: "G", text: "flooding" }, { letter: "H", text: "overfishing" }, { letter: "I", text: "worker support" },
        ] },
      ],
    },
    {
      id: "cambridge-15-test-4-part3-questions-32-34",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 32–34 on your answer sheet.",
      questions: [
        {
          questionNumbers: [32],
          prompt: "The main idea of the third paragraph is that environmental damage",
          options: [
            { letter: "A", text: "requires political action if it is to be stopped." },
            { letter: "B", text: "is the result of ignorance on the part of the public." },
            { letter: "C", text: "could be prevented by the action of ordinary people." },
            { letter: "D", text: "can only be stopped by educating business leaders." },
          ],
        },
        {
          questionNumbers: [33],
          prompt: "In the fourth paragraph, the writer describes ways in which the public can",
          options: [
            { letter: "A", text: "reduce their own individual impact on the environment." },
            { letter: "B", text: "learn more about the impact of business on the environment." },
            { letter: "C", text: "raise awareness of the effects of specific environmental disasters." },
            { letter: "D", text: "influence the environmental policies of businesses and governments." },
          ],
        },
        {
          questionNumbers: [34],
          prompt: "What pressure was exerted by big business in the case of the disease BSE?",
          options: [
            { letter: "A", text: "Meat packers stopped supplying hamburgers to fast-food chains." },
            { letter: "B", text: "A fast-food company forced their meat suppliers to follow the law." },
            { letter: "C", text: "Meat packers persuaded the government to reduce their expenses." },
            { letter: "D", text: "A fast-food company encouraged the government to introduce legislation." },
          ],
        },
      ],
    },
    {
      id: "cambridge-15-test-4-part3-questions-35-39",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 3? In boxes 35–39 on your answer sheet, write YES if the statement agrees with the claims of the writer, NO if the statement contradicts the claims of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [35], prompt: "The public should be prepared to fund good environmental practices.", options: yesNoNotGivenOptions },
        { questionNumbers: [36], prompt: "There is a contrast between the moral principles of different businesses.", options: yesNoNotGivenOptions },
        { questionNumbers: [37], prompt: "It is important to make a clear distinction between acceptable and unacceptable behaviour.", options: yesNoNotGivenOptions },
        { questionNumbers: [38], prompt: "The public have successfully influenced businesses in the past.", options: yesNoNotGivenOptions },
        { questionNumbers: [39], prompt: "In the future, businesses will show more concern for the environment.", options: yesNoNotGivenOptions },
      ],
    },
    {
      id: "cambridge-15-test-4-part3-question-40",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in box 40 on your answer sheet.",
      questions: [{
        questionNumbers: [40],
        prompt: "What would be the best subheading for this passage?",
        options: [
          { letter: "A", text: "Will the world survive the threat caused by big businesses?" },
          { letter: "B", text: "How can big businesses be encouraged to be less driven by profit?" },
          { letter: "C", text: "What environmental dangers are caused by the greed of businesses?" },
          { letter: "D", text: "Are big businesses to blame for the damage they cause the environment?" },
        ],
      }],
    },
  ],
  source: {
    passagePages: [90, 91].map(sourcePage),
    questionPages: [92, 93, 94].map(sourcePage),
    answerPages: [sourcePage(128)],
    explanationPages: [207, 208, 209, 210, 211, 212].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集15精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE15_TEST4_PARTS: ReadingPart[] = [huarango, silbo, environmentalPractices];

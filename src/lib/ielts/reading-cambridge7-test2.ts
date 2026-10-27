import type { ReadingOption, ReadingPart } from "./reading";
import type { ReadingSourcePage } from "./reading-source-model";

function sourcePages(numbers: number[]): ReadingSourcePage[] {
  return numbers.map((page) => ({
    page,
    src: "/reading/source-pages/ci7-p" + String(page).padStart(3, "0") + ".webp",
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

const yesNoNotGiven: ReadingOption[] = [
  { letter: "YES", text: "YES" },
  { letter: "NO", text: "NO" },
  { letter: "NOT GIVEN", text: "NOT GIVEN" },
];

const pagodaClassifications: ReadingOption[] = [
  { letter: "A", text: "both Chinese and Japanese pagodas" },
  { letter: "B", text: "only Chinese pagodas" },
  { letter: "C", text: "only Japanese pagodas" },
];

const pagodaPassage: ReadingPart = {
  id: "cambridge-7-test-2-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "Why pagodas don't fall down",
  sections: [
    {
      id: "c7t2-p1-a",
      heading: "Paragraph A",
      paragraphs: [
        "In a land swept by typhoons and shaken by earthquakes, how have Japan's tallest and seemingly flimsiest old buildings — 500 or so wooden pagodas — remained standing for centuries? Records show that only two have collapsed during the past 1400 years. Those that have disappeared were destroyed by fire as a result of lightning or civil war. The disastrous Hanshin earthquake in 1995 killed 6,400 people, toppled elevated highways, flattened office blocks and devastated the port area of Kobe. Yet it left the magnificent five-storey pagoda at the Toji temple in nearby Kyoto unscathed, though it levelled a number of buildings in the neighbourhood.",
      ],
    },
    {
      id: "c7t2-p1-b",
      heading: "Paragraph B",
      paragraphs: [
        "Japanese scholars have been mystified for ages about why these tall, slender buildings are so stable. It was only thirty years ago that the building industry felt confident enough to erect office blocks of steel and reinforced concrete that had more than a dozen floors. With its special shock absorbers to dampen the effect of sudden sideways movements from an earthquake, the thirty-six-storey Kasumigaseki building in central Tokyo — Japan's first skyscraper — was considered a masterpiece of modern engineering when it was built in 1968.",
      ],
    },
    {
      id: "c7t2-p1-c",
      heading: "Paragraph C",
      paragraphs: [
        "Yet in 826, with only pegs and wedges to keep his wooden structure upright, the master builder Kobodaishi had no hesitation in sending his majestic Toji pagoda soaring fifty-five metres into the sky — nearly half as high as the Kasumigaseki skyscraper built some eleven centuries later. Clearly, Japanese carpenters of the day knew a few tricks about allowing a building to sway and settle itself rather than fight nature's forces. But what sort of tricks?",
      ],
    },
    {
      id: "c7t2-p1-d",
      heading: "Paragraph D",
      paragraphs: [
        "The multi-storey pagoda came to Japan from China in the sixth century. As in China, they were first introduced with Buddhism and were attached to important temples. The Chinese built their pagodas in brick or stone, with inner staircases, and used them in later centuries mainly as watchtowers. When the pagoda reached Japan, however, its architecture was freely adapted to local conditions — they were built less high, typically five rather than nine storeys, made mainly of wood and the staircase was dispensed with because the Japanese pagoda did not have any practical use but became more of an art object. Because of the typhoons that batter Japan in the summer, Japanese builders learned to extend the eaves of buildings further beyond the walls. This prevents rainwater gushing down the walls. Pagodas in China and Korea have nothing like the overhang that is found on pagodas in Japan.",
      ],
    },
    {
      id: "c7t2-p1-e",
      heading: "Paragraph E",
      paragraphs: [
        "The roof of a Japanese temple building can be made to overhang the sides of the structure by fifty per cent or more of the building's overall width. For the same reason, the builders of Japanese pagodas seem to have further increased their weight by choosing to cover these extended eaves not with the porcelain tiles of many Chinese pagodas but with much heavier earthenware tiles.",
      ],
    },
    {
      id: "c7t2-p1-f",
      heading: "Paragraph F",
      paragraphs: [
        "But this does not totally explain the great resilience of Japanese pagodas. Is the answer that, like a tall pine tree, the Japanese pagoda — with its massive trunk-like central pillar known as shinbashira — simply flexes and sways during a typhoon or earthquake? For centuries, many thought so. But the answer is not so simple because the startling thing is that the shinbashira actually carries no load at all. In fact, in some pagoda designs, it does not even rest on the ground, but is suspended from the top of the pagoda — hanging loosely down through the middle of the building. The weight of the building is supported entirely by twelve outer and four inner columns.",
      ],
    },
    {
      id: "c7t2-p1-g",
      heading: "Paragraph G",
      paragraphs: [
        "And what is the role of the shinbashira, the central pillar? The best way to understand the shinbashira's role is to watch a video made by Shuzo Ishida, a structural engineer at Kyoto Institute of Technology. Mr Ishida, known to his students as ‘Professor Pagoda’ because of his passion to understand the pagoda, has built a series of models and tested them on a ‘shake-table’ in his laboratory. In short, the shinbashira was acting like an enormous stationary pendulum. The ancient craftsmen, apparently without the assistance of very advanced mathematics, seemed to grasp the principles that were, more than a thousand years later, applied in the construction of Japan's first skyscraper. What those early craftsmen had found by trial and error was that under pressure a pagoda's loose stack of floors could be made to slither to and fro independent of one another. Viewed from the side, the pagoda seemed to be doing a snake dance — with each consecutive floor moving in the opposite direction to its neighbours above and below. The shinbashira, running up through a hole in the centre of the building, constrained individual storeys from moving too far because, after moving a certain distance, they banged into it, transmitting energy away along the column.",
      ],
    },
    {
      id: "c7t2-p1-h",
      heading: "Paragraph H",
      paragraphs: [
        "Another strange feature of the Japanese pagoda is that, because the building tapers, with each successive floor plan being smaller than the one below, none of the vertical pillars that carry the weight of the building is connected to its corresponding pillar above. In other words, a five-storey pagoda contains not even one pillar that travels right up through the building to carry the structural loads from the top to the bottom. More surprising is the fact that the individual storeys of a Japanese pagoda, unlike their counterparts elsewhere, are not actually connected to each other. They are simply stacked one on top of another like a pile of hats. Interestingly, such a design would not be permitted under current Japanese building regulations.",
      ],
    },
    {
      id: "c7t2-p1-i",
      heading: "Paragraph I",
      paragraphs: [
        "And the extra-wide eaves? Think of them as a tightrope walker's balancing pole. The bigger the mass at each end of the pole, the easier it is for the tightrope walker to maintain his or her balance. The same holds true for a pagoda. ‘With the eaves extending out on all sides like balancing poles,’ says Mr Ishida, ‘the building responds to even the most powerful jolt of an earthquake with a graceful swaying, never an abrupt shaking.’ Here again, Japanese master builders of a thousand years ago anticipated concepts of modern structural engineering.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c7t2-p1-yes-no",
      type: "choice",
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 1? In boxes 1-4 on your answer sheet, write YES if the statement agrees with the claims of the writer NO if the statement contradicts the claims of the writer NOT GIVEN if it is impossible to say what the writer thinks about this",
      questions: [
        { questionNumbers: [1], prompt: "Only two Japanese pagodas have collapsed in 1400 years.", options: yesNoNotGiven },
        { questionNumbers: [2], prompt: "The Hanshin earthquake of 1995 destroyed the pagoda at the Toji temple.", options: yesNoNotGiven },
        { questionNumbers: [3], prompt: "The other buildings near the Toji pagoda had been built in the last 30 years.", options: yesNoNotGiven },
        { questionNumbers: [4], prompt: "The builders of pagodas knew how to absorb some of the power produced by severe weather conditions.", options: yesNoNotGiven },
      ],
    },
    {
      id: "c7t2-p1-classification",
      type: "choice",
      instruction: "Classify the following as typical of both Chinese and Japanese pagodas, only Chinese pagodas or only Japanese pagodas. Write the correct letter, A, B or C, in boxes 5–10 on your answer sheet.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [5], prompt: "easy interior access to top", options: pagodaClassifications },
        { questionNumbers: [6], prompt: "tiles on eaves", options: pagodaClassifications },
        { questionNumbers: [7], prompt: "use as observation post", options: pagodaClassifications },
        { questionNumbers: [8], prompt: "size of eaves up to half the width of the building", options: pagodaClassifications },
        { questionNumbers: [9], prompt: "original religious purpose", options: pagodaClassifications },
        { questionNumbers: [10], prompt: "floors fitting loosely over each other", options: pagodaClassifications },
      ],
    },
    {
      id: "c7t2-p1-multiple-choice",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 11–13 on your answer sheet.",
      questions: [
        {
          questionNumbers: [11],
          prompt: "In a Japanese pagoda, the shinbashira",
          options: [
            { letter: "A", text: "bears the full weight of the building." },
            { letter: "B", text: "bends under pressure like a tree." },
            { letter: "C", text: "connects the floors with the foundations." },
            { letter: "D", text: "stops the floors moving too far." },
          ],
        },
        {
          questionNumbers: [12],
          prompt: "Shuzo Ishida performs experiments in order to",
          options: [
            { letter: "A", text: "improve skyscraper design." },
            { letter: "B", text: "be able to build new pagodas." },
            { letter: "C", text: "learn about the dynamics of pagodas." },
            { letter: "D", text: "understand ancient mathematics." },
          ],
        },
        {
          questionNumbers: [13],
          prompt: "The storeys of a Japanese pagoda are",
          options: [
            { letter: "A", text: "linked only by wood." },
            { letter: "B", text: "fastened only to the central pillar." },
            { letter: "C", text: "fitted loosely on top of each other." },
            { letter: "D", text: "joined by special weights." },
          ],
        },
      ],
    },
  ],
  source: partSource([33, 34], [35, 36]),
};

const foodParagraphOptions: ReadingOption[] = "ABCDEFG".split("").map((letter) => ({
  letter,
  text: "Paragraph " + letter,
}));

const foodPassage: ReadingPart = {
  id: "cambridge-7-test-2-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 below.",
  title: "The True Cost of Food",
  sections: [
    {
      id: "c7t2-p2-a",
      heading: "Paragraph A",
      paragraphs: [
        "For more than forty years the cost of food has been rising. It has now reached a point where a growing number of people believe that it is far too high, and that bringing it down will be one of the great challenges of the twenty first century. That cost, however, is not in immediate cash. In the West at least, most food is now far cheaper to buy in relative terms than it was in 1960. The cost is in the collateral damage of the very methods of food production that have made the food cheaper: in the pollution of water, the enervation of soil, the destruction of wildlife, the harm to animal welfare and the threat to human health caused by modern industrial agriculture.",
      ],
    },
    {
      id: "c7t2-p2-b",
      heading: "Paragraph B",
      paragraphs: [
        "First mechanisation, then mass use of chemical fertilisers and pesticides, then monocultures, then battery rearing of livestock, and now genetic engineering — the onward march of intensive farming has seemed unstoppable in the last half-century, as the yields of produce have soared. But the damage it has caused has been colossal. In Britain, for example, many of our best-loved farmland birds, such as the skylark, the grey partridge, the lapwing and the corn bunting, have vanished from huge stretches of countryside, as have even more wild flowers and insects. This is a direct result of the way we have produced our food in the last four decades. Thousands of miles of hedgerows, thousands of ponds, have disappeared from the landscape. The faecal filth of salmon farming has driven wild salmon from many of the sea lochs and rivers of Scotland. Natural soil fertility is dropping in many areas because of continuous industrial fertiliser and pesticide use, while the growth of algae is increasing in lakes because of the fertiliser run-off.",
      ],
    },
    {
      id: "c7t2-p2-c",
      heading: "Paragraph C",
      paragraphs: [
        "Put it all together and it looks like a battlefield, but consumers rarely make the connection at the dinner table. That is mainly because the costs of all this damage are what economists refer to as externalities: they are outside the main transaction, which is for example producing and selling a field of wheat, and are borne directly by neither producers nor consumers. To many, the costs may not even appear to be financial at all, but merely aesthetic — a terrible shame, but nothing to do with money. And anyway they, as consumers of food, certainly aren't paying for it, are they?",
      ],
    },
    {
      id: "c7t2-p2-d",
      heading: "Paragraph D",
      paragraphs: [
        "But the costs to society can actually be quantified and, when added up, can amount to staggering sums. A remarkable exercise in doing this has been carried out by one of the world's leading thinkers on the future of agriculture, Professor Jules Pretty, Director of the Centre for Environment and Society at the University of Essex. Professor Pretty and his colleagues calculated the externalities of British agriculture for one particular year. They added up the costs of repairing the damage it caused, and came up with a total figure of £2,343m. This is equivalent to £208 for every hectare of arable land and permanent pasture, almost as much again as the total government and EU spend on British farming in that year. And according to Professor Pretty, it was a conservative estimate.",
      ],
    },
    {
      id: "c7t2-p2-e",
      heading: "Paragraph E",
      paragraphs: [
        "The costs included: £120m for removal of pesticides; £16m for removal of nitrates; £55m for removal of phosphates and soil; £23m for the removal of the bug cryptosporidium from drinking water by water companies; £125m for damage to wildlife habitats, hedgerows and dry stone walls; £1,113m from emissions of gases likely to contribute to climate change; £106m from soil erosion and organic carbon losses; £169m from food poisoning; and £607m from cattle disease. Professor Pretty draws a simple but memorable conclusion from all this: our food bills are actually threefold. We are paying for our supposedly cheaper food in three separate ways: once over the counter, secondly through our taxes, which provide the enormous subsidies propping up modern intensive farming, and thirdly to clean up the mess that modern farming leaves behind.",
      ],
    },
    {
      id: "c7t2-p2-f",
      heading: "Paragraph F",
      paragraphs: [
        "So can the true cost of food be brought down? Breaking away from industrial agriculture as the solution to hunger may be very hard for some countries, but in Britain, where the immediate need to supply food is less urgent, and the costs and the damage of intensive farming have been clearly seen, it may be more feasible. The government needs to create sustainable, competitive and diverse farming and food sectors, which will contribute to a thriving and sustainable rural economy, and advance environmental, economic, health, and animal welfare goals.",
      ],
    },
    {
      id: "c7t2-p2-g",
      heading: "Paragraph G",
      paragraphs: [
        "But if industrial agriculture is to be replaced, what is a viable alternative? Professor Pretty feels that organic farming would be too big a jump in thinking and in practices for many farmers. Furthermore, the price premium would put the produce out of reach of many poorer consumers. He is recommending the immediate introduction of a ‘Greener Food Standard’, which would push the market towards more sustainable environmental practices than the current norm, while not requiring the full commitment to organic production. Such a standard would comprise agreed practices for different kinds of farming, covering agrochemical use, soil health, land management, water and energy use, food safety and animal health. It could go a long way, he says, to shifting consumers as well as farmers towards a more sustainable system of agriculture.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c7t2-p2-paragraph-matching",
      type: "choice",
      instruction: "Reading Passage 2 has seven paragraphs, A–G. Which paragraph contains the following information? Write the correct letter, A–G. You may use any letter more than once.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [14], prompt: "a cost involved in purifying domestic water", options: foodParagraphOptions },
        { questionNumbers: [15], prompt: "the stages in the development of the farming industry", options: foodParagraphOptions },
        { questionNumbers: [16], prompt: "the term used to describe hidden costs", options: foodParagraphOptions },
        { questionNumbers: [17], prompt: "one effect of chemicals on water sources", options: foodParagraphOptions },
      ],
    },
    {
      id: "c7t2-p2-yes-no",
      type: "choice",
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 2? In boxes 18-21 on your answer sheet, write YES if the statement agrees with the claims of the writer NO if the statement contradicts the claims of the writer NOT GIVEN if it is impossible to say what the writer thinks about this",
      questions: [
        { questionNumbers: [18], prompt: "Several species of wildlife in the British countryside are declining.", options: yesNoNotGiven },
        { questionNumbers: [19], prompt: "The taste of food has deteriorated in recent years.", options: yesNoNotGiven },
        { questionNumbers: [20], prompt: "The financial costs of environmental damage are widely recognised.", options: yesNoNotGiven },
        { questionNumbers: [21], prompt: "One of the costs calculated by Professor Pretty was illness caused by food.", options: yesNoNotGiven },
      ],
    },
    {
      id: "c7t2-p2-summary",
      type: "fill",
      title: "",
      instruction: "Complete the summary below. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
      questions: [
        { number: 22, before: "Professor Pretty concludes that our ", after: " are higher than most people realise, because we make three different types of payment." },
        { number: 23, before: "He feels it is realistic to suggest that Britain should reduce its reliance on ", after: "." },
        { number: 24, before: "Although most farmers would be unable to adapt to ", after: ", Professor Pretty wants the government to initiate change by establishing what he refers to as" },
        { number: 25, before: " ", after: ". He feels this would help to change the attitudes of both" },
        { number: 26, before: " ", after: ".", inputCount: 2, joiners: [" and "], answerMode: "all" },
      ],
      rawText: "Questions 22–26\nComplete the summary below. Choose NO MORE THAN THREE WORDS from the passage for each answer.\n\nProfessor Pretty concludes that our 22 ...................... are higher than most people realise, because we make three different types of payment. He feels it is realistic to suggest that Britain should reduce its reliance on 23 ...................... . Although most farmers would be unable to adapt to 24 ......................, Professor Pretty wants the government to initiate change by establishing what he refers to as 25 ...................... . He feels this would help to change the attitudes of both 26 ...................... and ...................... .",
    },
  ],
  source: partSource([37, 38], [39, 40]),
};

const transportHeadings = [
  { id: "i", text: "MIRTP as a future model" },
  { id: "ii", text: "Identifying the main transport problems" },
  { id: "iii", text: "Preference for motorised vehicles" },
  { id: "iv", text: "Government authorities’ instructions" },
  { id: "v", text: "Initial improvements in mobility and transport modes" },
  { id: "vi", text: "Request for improved transport in Makete" },
  { id: "vii", text: "Transport improvements in the northern part of the district" },
  { id: "viii", text: "Improvements in the rail network" },
  { id: "ix", text: "Effects of initial MIRTP measures" },
  { id: "x", text: "Co-operation of district officials" },
  { id: "xi", text: "Role of wheelbarrows and donkeys" },
];

const sentenceEndings: ReadingOption[] = [
  { letter: "A", text: "provided the people of Makete with experience in running bus and truck services." },
  { letter: "B", text: "was especially successful in the northern part of the district." },
  { letter: "C", text: "differed from earlier phases in that the community became less actively involved." },
  { letter: "D", text: "improved paths used for transport up and down hillsides." },
  { letter: "E", text: "was no longer a problem once the roads had been improved." },
  { letter: "F", text: "cost less than locally made wheelbarrows." },
  { letter: "G", text: "was done only at the request of local people who were willing to lend a hand." },
  { letter: "H", text: "was at first considered by MIRTP to be affordable for the people of the district." },
  { letter: "I", text: "hindered attempts to make the existing transport services more efficient." },
  { letter: "J", text: "was thought to be the most important objective of Phase III." },
];

const transportPassage: ReadingPart = {
  id: "cambridge-7-test-2-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 on the following pages.",
  title: "Makete Integrated Rural Transport Project",
  sections: [
    {
      id: "c7t2-p3-a",
      heading: "Section A (example: vi)",
      paragraphs: [
        "The disappointing results of many conventional road transport projects in Africa led some experts to rethink the strategy by which rural transport problems were to be tackled at the beginning of the 1980s. A request for help in improving the availability of transport within the remote Makete District of south-western Tanzania presented the opportunity to try a new approach.",
        "The concept of ‘integrated rural transport’ was adopted in the task of examining the transport needs of the rural households in the district. The objective was to reduce the time and effort needed to obtain access to essential goods and services through an improved rural transport system. The underlying assumption was that the time saved would be used instead for activities that would improve the social and economic development of the communities. The Makete Integrated Rural Transport Project (MIRTP) started in 1985 with financial support from the Swiss Development Corporation and was co-ordinated with the help of the Tanzanian government.",
      ],
    },
    {
      id: "c7t2-p3-b",
      heading: "Section B",
      headingQuestionNumber: 27,
      paragraphs: [
        "When the project began, Makete District was virtually totally isolated during the rainy season. The regional road was in such bad shape that access to the main towns was impossible for about three months of the year. Road traffic was extremely rare within the district, and alternative means of transport were restricted to donkeys in the north of the district. People relied primarily on the paths, which were slippery and dangerous during the rains.",
        "Before solutions could be proposed, the problems had to be understood. Little was known about the transport demands of the rural households, so Phase I, between December 1985 and December 1987, focused on research. The socio-economic survey of more than 400 households in the district indicated that a household in Makete spent, on average, seven hours a day on transporting themselves and their goods, a figure which seemed extreme but which has also been obtained in surveys in other rural areas in Africa. Interesting facts regarding transport were found: 95% was on foot; 80% was within the locality; and 70% was related to the collection of water and firewood and travelling to grinding mills.",
      ],
    },
    {
      id: "c7t2-p3-c",
      heading: "Section C",
      headingQuestionNumber: 28,
      paragraphs: [
        "Having determined the main transport needs, possible solutions were identified which might reduce the time and burden. During Phase II, from January to February 1991, a number of approaches were implemented in an effort to improve mobility and access to transport.",
        "An improvement of the road network was considered necessary to ensure the import and export of goods to the district. These improvements were carried out using methods that were heavily dependent on labour. In addition to the improvement of roads, these methods provided training in the operation of a mechanical workshop and bus and truck services. However, the difference from the conventional approach was that this time consideration was given to local transport needs outside the road network.",
        "Most goods were transported along the paths that provide short-cuts up and down the hillsides, but the paths were a real safety risk and made the journey on foot even more arduous. It made sense to improve the paths by building steps, handrails and footbridges.",
        "It was uncommon to find means of transport that were more efficient than walking but less technologically advanced than motor vehicles. The use of bicycles was constrained by their high cost and the lack of available spare parts. Oxen were not used at all but donkeys were used by a few households in the northern part of the district. MIRTP focused on what would be most appropriate for the inhabitants of Makete in terms of what was available, how much they could afford and what they were willing to accept. After careful consideration, the project chose the promotion of donkeys — a donkey costs less than a bicycle — and the introduction of a locally manufacturable wheelbarrow.",
      ],
    },
    {
      id: "c7t2-p3-d",
      heading: "Section D (example: ix)",
      paragraphs: [
        "At the end of Phase II, it was clear that the selected approaches to Makete's transport problems had had different degrees of success. Phase III, from March 1991 to March 1993, focused on the refinement and institutionalisation of these activities.",
        "The road improvements and accompanying maintenance system had helped make the district centre accessible throughout the year. Essential goods from outside the district had become more readily available at the market, and prices did not fluctuate as much as they had done before.",
        "Paths and secondary roads were improved only at the request of communities who were willing to participate in construction and maintenance. However, the improved paths impressed the inhabitants, and requests for assistance greatly increased soon after only a few improvements had been completed.",
        "The efforts to improve the efficiency of the existing transport services were not very successful because most of the motorised vehicles in the district broke down and there were no resources to repair them. Even the introduction of low-cost means of transport was difficult because of the general poverty of the district. The locally manufactured wheelbarrows were still too expensive for all but a few of the households. Modifications to the original design by local carpenters cut production time and costs. Other local carpenters have been trained in the new design so that they can respond to requests. Nevertheless, a locally produced wooden wheelbarrow which costs around 5000 Tanzanian shillings (less than US$20) in Makete, and is about one quarter the cost of a metal wheelbarrow, is still too expensive for most people.",
        "Donkeys, which were imported to the district, have become more common and contribute, in particular, to the transportation of crops and goods to market. Those who have bought donkeys are mainly from richer households but, with an increased supply through local breeding, donkeys should become more affordable. Meanwhile, local initiatives are promoting the renting out of the existing donkeys. It should be noted, however, that a donkey, which at 20,000 Tanzanian shillings costs less than a bicycle, is still an investment equal to an average household's income over half a year. This clearly illustrates the need for supplementary measures if one wants to assist the rural poor.",
      ],
    },
    {
      id: "c7t2-p3-e",
      heading: "Section E",
      headingQuestionNumber: 29,
      paragraphs: [
        "It would have been easy to criticise the MIRTP for using in the early phases a ‘top-down’ approach, in which decisions were made by experts and officials before being handed down to communities, but it was necessary to start the process from the level of the governmental authorities of the district. It would have been difficult to respond to the requests of villagers and other rural inhabitants without the support and understanding of district authorities.",
      ],
    },
    {
      id: "c7t2-p3-f",
      heading: "Section F",
      headingQuestionNumber: 30,
      paragraphs: [
        "Today, nobody in the district argues about the importance of improved paths and inexpensive means of transport. But this is the result of dedicated work over a long period, particularly from the officers in charge of community development. They played an essential role in raising awareness and interest among the rural communities.",
        "The concept of integrated rural transport is now well established in Tanzania, where a major programme of rural transport is just about to start. The experiences from Makete will help in this initiative, and Makete District will act as a reference for future work.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c7t2-p3-headings",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 3 has six sections, A–F. Choose the correct heading for sections B, C, E and F from the list of headings below.",
      options: transportHeadings,
      questionNumbers: [27, 28, 29, 30],
    },
    {
      id: "c7t2-p3-yes-no",
      type: "choice",
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 3? In boxes 31-35 on your answer sheet, write YES if the statement agrees with the claims of the writer NO if the statement contradicts the claims of the writer NOT GIVEN if it is impossible to say what the writer thinks about this",
      questions: [
        { questionNumbers: [31], prompt: "MIRTP was divided into five phases.", options: yesNoNotGiven },
        { questionNumbers: [32], prompt: "Prior to the start of MIRTP the Makete district was almost inaccessible during the rainy season.", options: yesNoNotGiven },
        { questionNumbers: [33], prompt: "Phase I of MIRTP consisted of a survey of household expenditure on transport.", options: yesNoNotGiven },
        { questionNumbers: [34], prompt: "The survey concluded that one-fifth or 20% of the household transport requirement was outside the local area.", options: yesNoNotGiven },
        { questionNumbers: [35], prompt: "MIRTP hoped to improve the movement of goods from Makete district to the country's capital.", options: yesNoNotGiven },
      ],
    },
    {
      id: "c7t2-p3-sentence-endings",
      type: "choice",
      instruction: "Complete each sentence with the correct ending, A–J. Write the correct letter in boxes 36–39 on your answer sheet.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [36], prompt: "Construction of footbridges, steps and handrails", options: sentenceEndings },
        { questionNumbers: [37], prompt: "Frequent breakdown of buses and trucks in Makete", options: sentenceEndings },
        { questionNumbers: [38], prompt: "The improvement of secondary roads and paths", options: sentenceEndings },
        { questionNumbers: [39], prompt: "The isolation of Makete for part of the year", options: sentenceEndings },
      ],
    },
    {
      id: "c7t2-p3-multiple-choice",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in box 40 on your answer sheet.",
      questions: [
        {
          questionNumbers: [40],
          prompt: "Which of the following phrases best describes the main aim of Reading Passage 3?",
          options: [
            { letter: "A", text: "to suggest that projects such as MIRTP are needed in other countries" },
            { letter: "B", text: "to describe how MIRTP was implemented and how successful it was" },
            { letter: "C", text: "to examine how MIRTP promoted the use of donkeys" },
            { letter: "D", text: "to warn that projects such as MIRTP are likely to have serious problems" },
          ],
        },
      ],
    },
  ],
  source: partSource([42, 43], [41, 44, 45]),
};

export const CAMBRIDGE7_TEST2_PARTS: ReadingPart[] = [pagodaPassage, foodPassage, transportPassage];

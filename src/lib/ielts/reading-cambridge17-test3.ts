import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  59: [1411, 2001], 60: [1412, 2090], 61: [1413, 2090], 62: [1405, 2102],
  63: [1413, 2090], 64: [1410, 2090], 65: [1412, 2090], 66: [1395, 2102],
  67: [1413, 2090], 68: [1412, 2090], 69: [1412, 2090], 70: [1392, 2090],
  71: [1413, 2102], 124: [1269, 1496],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1413, 2090];
  return {
    page,
    src: "/reading/source-pages/ci17-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = {
    148: 745, 149: 2374, 150: 2366, 151: 2344, 152: 2367, 153: 2368,
    158: 478, 159: 2368, 160: 2366, 161: 2377, 162: 2362, 163: 2360, 164: 2363, 165: 2352,
    170: 989, 171: 2371, 172: 2358, 173: 2372, 174: 2358, 175: 2364, 176: 2358,
    177: 2345, 178: 2377, 179: 2347,
  };
  return {
    page,
    src: "/reading/explanations/cambridge-17-test-3-part" + part + "-exp17-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2360,
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

const thylacine: ReadingPart = {
  id: "cambridge-17-test-3-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "The thylacine",
  sections: [{
    id: "cambridge-17-test-3-part1-passage",
    format: "pre",
    paragraphs: [
      "The extinct thylacine, also known as the Tasmanian tiger, was a marsupial* that bore a superficial resemblance to a dog. Its most distinguishing feature was the 13–19 dark brown stripes over its back, beginning at the rear of the body and extending onto the tail. The thylacine’s average nose-to-tail length for adult males was 162.6 cm, compared to 153.7 cm for females.",
      "The thylacine appeared to occupy most types of terrain except dense rainforest, with open eucalyptus forest thought to be its prime habitat. In terms of feeding, it was exclusively carnivorous, and its stomach was muscular with an ability to distend so that it could eat large amounts of food at one time, probably an adaptation to compensate for long periods when hunting was unsuccessful and food scarce. The thylacine was not a fast runner and probably caught its prey by exhausting it during a long pursuit. During long-distance chases, thylacines were likely to have relied more on scent than any other sense. They emerged to hunt during the evening, night and early morning and tended to retreat to the hills and forest for shelter during the day. Despite the common name ‘tiger’, the thylacine had a shy, nervous temperament. Although mainly nocturnal, it was sighted moving during the day and some individuals were even recorded basking in the sun.",
      "The thylacine had an extended breeding season from winter to spring, with indications that some breeding took place throughout the year. The thylacine, like all marsupials, was tiny and hairless when born. Newborns crawled into the pouch on the belly of their mother, and attached themselves to one of the four teats, remaining there for up to three months. When old enough to leave the pouch, the young stayed in a lair such as a deep rocky cave, well-hidden nest or hollow log, whilst the mother hunted.",
      "Approximately 4,000 years ago, the thylacine was widespread throughout New Guinea and most of mainland Australia, as well as the island of Tasmania. The most recent, well-dated occurrence of a thylacine on the mainland is a carbon-dated fossil from Murray Cave in Western Australia, which is around 3,100 years old. Its extinction coincided closely with the arrival of wild dogs called dingoes in Australia and a similar predator in New Guinea. Dingoes never reached Tasmania, and most scientists see this as the main reason for the thylacine’s survival there.",
      "The dramatic decline of the thylacine in Tasmania, which began in the 1830s and continued for a century, is generally attributed to the relentless efforts of sheep farmers and bounty hunters** with shotguns. While this determined campaign undoubtedly played a large part, it is likely that various other factors also contributed to the decline and eventual extinction of the species. These include competition with wild dogs introduced by European settlers, loss of habitat along with the disappearance of prey species, and a distemper-like disease which may also have affected the thylacine.",
      "There was only one successful attempt to breed a thylacine in captivity, at Melbourne Zoo in 1899. This was despite the large numbers that went through some zoos, particularly London Zoo and Tasmania’s Hobart Zoo. The famous naturalist John Gould foresaw the thylacine’s demise when he published his Mammals of Australia between 1848 and 1863, writing, ‘The numbers of this singular animal will speedily diminish, extermination will have its full sway, and it will then, like the wolf of England and Scotland, be recorded as an animal of the past.’",
      "However, there seems to have been little public pressure to preserve the thylacine, nor was much concern expressed by scientists at the decline of this species in the decades that followed. A notable exception was T.T. Flynn, Professor of Biology at the University of Tasmania. In 1914, he was sufficiently concerned about the scarcity of the thylacine to suggest that some should be captured and placed on a small island. But it was not until 1929, with the species on the very edge of extinction, that Tasmania’s Animals and Birds Protection Board passed a motion protecting thylacines only for the month of December, which was thought to be their prime breeding season. The last known wild thylacine to be killed was shot by a farmer in the north-east of Tasmania in 1930, leaving just captive specimens. Official protection of the species by the Tasmanian government was introduced in July 1936, 59 days before the last known individual died in Hobart Zoo on 7th September, 1936.",
      "There have been numerous expeditions and searches for the thylacine over the years, none of which has produced definitive evidence that thylacines still exist. The species was declared extinct by the Tasmanian government in 1986.",
      "* marsupial: a mammal, such as a kangaroo, whose young are born incompletely developed and are typically carried and suckled in a pouch on the mother’s belly. ** Bounty hunters: people who are paid a reward for killing a wild animal.",
    ],
  }],
  questionBlocks: [
    rawFillBlock(
      "cambridge-17-test-3-part1-questions-1-5",
      "The thylacine",
      "Complete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 1–5 on your answer sheet.",
      "The thylacine\n\nAppearance and behaviour\n• Looked rather like a dog.\n• Had a series of stripes along its body and tail.\n• Ate an entirely 1 ______ diet.\n• Probably depended mainly on 2 ______ when hunting.\n• Young spent the first months of life inside its mother’s 3 ______.\n\nDecline and extinction\n• Last evidence in mainland Australia is a 3,100-year-old 4 ______.\n• Probably went extinct in mainland Australia due to animals known as dingoes.\n• Reduction in 5 ______ and available sources of food were partly responsible for decline in Tasmania.",
      1,
      5,
    ),
    {
      id: "cambridge-17-test-3-part1-questions-6-13",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 6–13 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [6], prompt: "Significant numbers of thylacines were killed by humans from the 1830s onwards.", options: trueFalseNotGivenOptions },
        { questionNumbers: [7], prompt: "Several thylacines were born in zoos during the late 1800s.", options: trueFalseNotGivenOptions },
        { questionNumbers: [8], prompt: "John Gould’s prediction about the thylacine surprised some biologists.", options: trueFalseNotGivenOptions },
        { questionNumbers: [9], prompt: "In the early 1900s, many scientists became worried about the possible extinction of the thylacine.", options: trueFalseNotGivenOptions },
        { questionNumbers: [10], prompt: "T. T. Flynn’s proposal to rehome captive thylacines on an island proved to be impractical.", options: trueFalseNotGivenOptions },
        { questionNumbers: [11], prompt: "There were still reasonable numbers of thylacines in existence when a piece of legislation protecting the species during their breeding season was passed.", options: trueFalseNotGivenOptions },
        { questionNumbers: [12], prompt: "From 1930 to 1936, the only known living thylacines were all in captivity.", options: trueFalseNotGivenOptions },
        { questionNumbers: [13], prompt: "Attempts to find living thylacines are now rarely made.", options: trueFalseNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [59, 60].map(sourcePage),
    questionPages: [61, 62].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [148, 149, 150, 151, 152, 153].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集17精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const palmOil: ReadingPart = {
  id: "cambridge-17-test-3-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Palm oil",
  sections: [
    {
      id: "cambridge-17-test-3-part2-section-a",
      heading: "A",
      format: "pre",
      paragraphs: [
        "Palm oil is an edible oil derived from the fruit of the African oil palm tree, and is currently the most consumed vegetable oil in the world. It’s almost certainly in the soap we wash with in the morning, the sandwich we have for lunch, and the biscuits we snack on during the day. Why is palm oil so attractive for manufacturers? Primarily because its unique properties — such as remaining solid at room temperature — make it an ideal ingredient for long-term preservation, allowing many packaged foods on supermarket shelves to have ‘best before’ dates of months, even years, into the future.",
      ],
    },
    {
      id: "cambridge-17-test-3-part2-section-b",
      heading: "B",
      format: "pre",
      paragraphs: [
        "Many farmers have seized the opportunity to maximise the planting of oil palm trees. Between 1990 and 2012, the global land area devoted to growing oil palm trees grew from 6 to 17 million hectares, now accounting for around ten percent of total cropland in the entire world. From a mere two million tonnes of palm oil being produced annually globally 50 years ago, there are now around 60 million tonnes produced every single year, a figure looking likely to double or even triple by the middle of the century.",
      ],
    },
    {
      id: "cambridge-17-test-3-part2-section-c",
      heading: "C",
      format: "pre",
      paragraphs: [
        "However, there are multiple reasons why conservationists cite the rapid spread of oil palm plantations as a major concern. There are countless news stories of deforestation, habitat destruction and dwindling species populations, all as a direct result of land clearing to establish oil palm tree monoculture on an industrial scale, particularly in Malaysia and Indonesia. Endangered species — most famously the Sumatran orangutan, but also rhinos, elephants, tigers, and numerous other fauna — have suffered from the unstoppable spread of oil palm plantations.",
      ],
    },
    {
      id: "cambridge-17-test-3-part2-section-d",
      heading: "D",
      format: "pre",
      paragraphs: [
        "‘Palm oil is surely one of the greatest threats to global biodiversity,’ declares Dr Farnon Ellwood of the University of the West of England, Bristol. ‘Palm oil is replacing rainforest, and rainforest is where all the species are. That’s a problem.’ This has led to some radical questions among environmentalists, such as whether consumers should try to boycott palm oil entirely.",
        "Meanwhile Bhavani Shankar, Professor at London’s School of Oriental and African Studies, argues, ‘It’s easy to say that palm oil is the enemy and we should be against it. It makes for a more dramatic story, and it’s very intuitive. But given the complexity of the argument, I think a much more nuanced story is closer to the truth.’",
      ],
    },
    {
      id: "cambridge-17-test-3-part2-section-e",
      heading: "E",
      format: "pre",
      paragraphs: [
        "One response to the boycott movement has been the argument for the vital role palm oil plays in lifting many millions of people in the developing world out of poverty. Is it desirable to have palm oil boycotted, replaced, eliminated from the global supply chain, given how many low-income people in developing countries depend on it for their livelihoods? How best to strike a utilitarian balance between these competing factors has become a serious bone of contention.",
      ],
    },
    {
      id: "cambridge-17-test-3-part2-section-f",
      heading: "F",
      format: "pre",
      paragraphs: [
        "Even the deforestation argument isn’t as straightforward as it seems. Oil palm plantations produce at least four and potentially up to ten times more oil per hectare than soybean, rapeseed, sunflower or other competing oils. That immensely high yield — which is predominantly what makes it so profitable — is potentially also an ecological benefit. If ten times more palm oil can be produced from a patch of land than any competing oil, then ten times more land would need to be cleared in order to produce the same volume of oil from that competitor.",
        "As for the question of carbon emissions, the issue really depends on what oil palm trees are replacing. Crops vary in the degree to which they sequester carbon — in other words, the amount of carbon they capture from the atmosphere and store within the plant. The more carbon a plant sequesters, the more it reduces the effect of climate change. As Shankar explains: ‘[Palm oil production] actually sequesters more carbon in some ways than other alternatives. [...] Of course, if you’re cutting down virgin forest it’s terrible — that’s what’s happening in Indonesia and Malaysia, it’s been allowed to get out of hand. But if it’s replacing rice, for example, it might actually sequester more carbon.’",
      ],
    },
    {
      id: "cambridge-17-test-3-part2-section-g",
      heading: "G",
      format: "pre",
      paragraphs: [
        "The industry is now regulated by a group called the Roundtable on Sustainable Palm Oil (RSPO), consisting of palm growers, retailers, product manufacturers, and other interested parties. Over the past decade or so, an agreement has gradually been reached regarding standards that producers of palm oil have to meet in order for their product to be regarded as officially ‘sustainable’. The RSPO insists upon no virgin forest clearing, transparency and regular assessment of carbon stocks, among other criteria. Only once these requirements are fully satisfied is the oil allowed to be sold as certified sustainable palm oil (CSPO). Recent figures show that the RSPO now certifies around 12 million tonnes of palm oil annually, equivalent to roughly 21 percent of the world’s total palm oil production.",
      ],
    },
    {
      id: "cambridge-17-test-3-part2-section-h",
      heading: "H",
      format: "pre",
      paragraphs: [
        "There is even hope that oil palm plantations might not need to be such sterile monocultures, or ‘green deserts’, as Ellwood describes them. New research at Ellwood’s lab hints at one plant which might make all the difference. The bird’s nest fern (Asplenium nidus) grows on trees in an epiphytic fashion (meaning it’s dependent on the tree only for support, not for nutrients), and is native to many tropical regions, where as a keystone species it performs a vital ecological role. Ellwood believes that reintroducing the bird’s nest fern into oil palm plantations could potentially allow these areas to recover their biodiversity, providing a home for all manner of species, from fungi and bacteria, to invertebrates such as insects, amphibians, reptiles and even mammals.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-17-test-3-part2-questions-14-20",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has eight sections, A–H. Which section contains the following information? Write the correct letter, A–H, in boxes 14–20 on your answer sheet. NB You may use any letter more than once.",
      questions: [
        { questionNumbers: [14], prompt: "Examples of a range of potential environmental advantages of oil palm tree cultivation.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [15], prompt: "Description of an organisation which controls the environmental impact of palm oil production.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [16], prompt: "Examples of the widespread global use of palm oil.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [17], prompt: "Reference to a particular species which could benefit the ecosystem of oil palm plantations.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [18], prompt: "Figures illustrating the rapid expansion of the palm oil industry.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [19], prompt: "An economic justification for not opposing the palm oil industry.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [20], prompt: "Examples of creatures badly affected by the establishment of oil palm plantations.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Section " + letter })) },
      ],
    },
    {
      id: "cambridge-17-test-3-part2-questions-21-22",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 21 and 22 on your answer sheet.",
      questions: [{
        questionNumbers: [21, 22],
        selectCount: 2,
        prompt: "Which TWO statements are made about the Roundtable on Sustainable Palm Oil (RSPO)?",
        options: [
          { letter: "A", text: "Its membership has grown steadily over the course of the last decade." },
          { letter: "B", text: "It demands that certified producers be open and honest about their practices." },
          { letter: "C", text: "It took several years to establish its set of criteria for sustainable palm oil certification." },
          { letter: "D", text: "Its regulations regarding sustainability are stricter than those governing other industries." },
          { letter: "E", text: "It was formed at the request of environmentalists concerned about the loss of virgin forests." },
        ],
      }],
    },
    rawFillBlock(
      "cambridge-17-test-3-part2-questions-23-26",
      "Palm oil",
      "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 23–26 on your answer sheet.",
      "23 One advantage of palm oil for manufacturers is that it stays 23 ______ when not refrigerated.\n\n24 The 24 ______ is the best known of the animals suffering habitat loss as a result of the spread of oil palm plantations.\n\n25 As one of its criteria for the certification of sustainable palm oil, the RSPO insists that growers check 25 ______ on a routine basis.\n\n26 Ellwood and his researchers are looking into whether the bird’s nest fern could restore 26 ______ in areas where oil palm trees are grown.",
      23,
      26,
    ),
  ],
  source: {
    passagePages: [63, 64].map(sourcePage),
    questionPages: [65, 66].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [158, 159, 160, 161, 162, 163, 164, 165].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集17精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const manhattanSkyscrapers: ReadingPart = {
  id: "cambridge-17-test-3-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Building the Skyline: The Birth and Growth of Manhattan’s Skyscrapers",
  byline: "Katharine L. Shester reviews a book by Jason Barr about the development of New York City",
  sections: [{
    id: "cambridge-17-test-3-part3-passage",
    format: "pre",
    paragraphs: [
      "In Building the Skyline, Jason Barr takes the reader through a detailed history of New York City. The book combines geology, history, economics, and a lot of data to explain why business clusters developed where they did and how the early decisions of workers and firms shaped the skyline we see today. Building the Skyline is organized into two distinct parts. The first is primarily historical and addresses New York’s settlement and growth from 1609 to 1900; the second deals primarily with the 20th century and is a compilation of chapters commenting on different aspects of New York’s urban development. The tone and organization of the book changes somewhat between the first and second parts, as the latter chapters incorporate aspects of Barr’s related research papers.",
      "Barr begins chapter one by taking the reader on a ‘helicopter time-machine’ ride — giving a fascinating account of how the New York landscape in 1609 might have looked from the sky. He then moves on to a subterranean walking tour of the city, indicating the location of rock and water below the subsoil, before taking the reader back to the surface. His love of the city comes through as he describes various fun facts about the location of the New York residence of early 19th-century vice-president Aaron Burr as well as a number of legends about the city.",
      "Chapters two and three take the reader up to the Civil War (1861–1865), with chapter two focusing on the early development of land and the implementation of a grid system in 1811. Chapter three focuses on land use before the Civil War. Both chapters are informative and well researched and set the stage for the economic analysis that comes later in the book. I would have liked Barr to expand upon his claim that existing tenements* prevented skyscrapers in certain neighborhoods because ‘likely no skyscraper developer was interested in performing the necessary “slum clearance”’. Later in the book, Barr makes the claim that the depth of bedrock** was not a limiting factor for developers, as foundation costs were a small fraction of the cost of development. At first glance, it is not obvious why slum clearance would be limiting, while more expensive foundations would not.",
      "Chapter four focuses on immigration and the location of neighborhoods and tenements in the late 19th century. Barr identifies four primary immigrant enclaves and analyzes their locations in terms of the amenities available in the area. Most of these enclaves were located on the least valuable land, between the industries located on the waterfront and the wealthy neighborhoods bordering Central Park.",
      "Part two of the book begins with a discussion of the economics of skyscraper height. In chapter five, Barr distinguishes between engineering height, economic height, and developer height — where engineering height is the tallest building that can be safely made at a given time, economic height is the height that is most efficient from society’s point of view, and developer height is the actual height chosen by the developer, who is attempting to maximize return on investment. Chapter five also has an interesting discussion of the technological advances that led to the construction of skyscrapers. For example, the introduction of iron and steel skeletal frames made thick, load-bearing walls unnecessary, expanding the usable square footage of buildings and increasing the use of windows and availability of natural light. Chapter six then presents data on building height throughout the 20th century and uses regression analysis to ‘predict’ building construction. While less technical than the research paper on which the chapter is based, it is probably more technical than would be preferred by a general audience.",
      "Chapter seven tackles the ‘bedrock myth’, the assumption that the absence of bedrock close to the surface between Downtown and Midtown New York is the reason for skyscrapers not being built between the two urban centers. Rather, Barr argues that while deeper bedrock does increase foundation costs, these costs were neither prohibitively high nor were they large compared to the overall cost of building a skyscraper. What I enjoyed the most about this chapter was Barr’s discussion of how foundations are actually built. He describes the use of caissons, which enable workers to dig down for considerable distances, often below the water table, until they reach bedrock. Barr’s thorough technological history discusses not only how caissons work, but also the dangers involved. While this chapter references empirical research papers, it is a relatively easy read.",
      "Chapters eight and nine focus on the birth of Midtown and the building boom of the 1920s. Chapter eight contains lengthy discussions of urban economic theory that may serve as a distraction to readers primarily interested in New York. However, they would be well-suited for undergraduates learning about the economics of cities. In the next chapter, Barr considers two of the primary explanations for the building boom of the 1920s — the first being exuberance, and the second being financing. He uses data to assess the viability of these two explanations and finds that supply and demand factors explain much of the development of the 1920s; though it enabled the boom, cheap credit was not, he argues, the primary cause.",
      "In the final chapter (chapter 10), Barr discusses another of his empirical papers that estimates Manhattan land values from the mid-19th century to the present day. The data work that went into these estimations is particularly impressive. Toward the end of the chapter, Barr assesses ‘whether skyscrapers are a cause or an effect of high land values’. He finds that changes in land values predict future building height, but the reverse is not true. The book ends with an epilogue, in which Barr discusses the impact of climate change on the city and makes policy suggestions for New York going forward.",
      "* A tenement: a multi-occupancy building of any sort, but particularly a run-down apartment building or slum building. ** Bedrock: the solid, hard rock in the ground that lies under a loose layer of soil.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-17-test-3-part3-questions-27-31",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27–31 on your answer sheet.",
      questions: [
        { questionNumbers: [27], prompt: "What point does Shester make about Barr’s book in the first paragraph?", options: [
          { letter: "A", text: "It gives a highly original explanation for urban development." }, { letter: "B", text: "Elements of Barr’s research papers are incorporated throughout the book." }, { letter: "C", text: "Other books that are available on the subject have taken a different approach." }, { letter: "D", text: "It covers a range of factors that affected the development of New York." },
        ] },
        { questionNumbers: [28], prompt: "How does Shester respond to the information in the book about tenements?", options: [
          { letter: "A", text: "She describes the reasons for Barr’s interest." }, { letter: "B", text: "She indicates a potential problem with Barr’s analysis." }, { letter: "C", text: "She compares Barr’s conclusion with that of other writers." }, { letter: "D", text: "She provides details about the sources Barr used for his research." },
        ] },
        { questionNumbers: [29], prompt: "What does Shester say about chapter six of the book?", options: [
          { letter: "A", text: "It contains conflicting data." }, { letter: "B", text: "It focuses too much on possible trends." }, { letter: "C", text: "It is too specialised for most readers." }, { letter: "D", text: "It draws on research that is out of date." },
        ] },
        { questionNumbers: [30], prompt: "What does Shester suggest about the chapters focusing on the 1920s building boom?", options: [
          { letter: "A", text: "The information should have been organised differently." }, { letter: "B", text: "More facts are needed about the way construction was financed." }, { letter: "C", text: "The explanation that is given for the building boom is unlikely." }, { letter: "D", text: "Some parts will have limited appeal to certain people." },
        ] },
        { questionNumbers: [31], prompt: "What impresses Shester the most about the chapter on land values?", options: [
          { letter: "A", text: "The broad time period that is covered." }, { letter: "B", text: "The interesting questions that Barr asks." }, { letter: "C", text: "The nature of the research into the topic." }, { letter: "D", text: "The recommendations Barr makes for the future." },
        ] },
      ],
    },
    {
      id: "cambridge-17-test-3-part3-questions-32-35",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 3? In boxes 32–35 on your answer sheet, write YES if the statement agrees with the claims of the writer, NO if it contradicts the claims of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [32], prompt: "The description in the first chapter of how New York probably looked from the air in the early 1600s lacks interest.", options: yesNoNotGivenOptions },
        { questionNumbers: [33], prompt: "Chapters two and three prepare the reader well for material yet to come.", options: yesNoNotGivenOptions },
        { questionNumbers: [34], prompt: "The biggest problem for many nineteenth-century New York immigrant neighbourhoods was a lack of amenities.", options: yesNoNotGivenOptions },
        { questionNumbers: [35], prompt: "In the nineteenth century, New York’s immigrant neighbourhoods tended to concentrate around the harbour.", options: yesNoNotGivenOptions },
      ],
    },
    {
      id: "cambridge-17-test-3-part3-questions-36-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary using the list of phrases, A–J, below. Write the correct letter, A–J, in boxes 36–40 on your answer sheet.",
      questions: [
        { questionNumbers: [36], prompt: "The lack of bedrock close to the surface does not explain why skyscrapers are absent from 36 ______.", options: [
          { letter: "A", text: "Development plans" }, { letter: "B", text: "Deep excavations" }, { letter: "C", text: "Great distance" }, { letter: "D", text: "Excessive expense" }, { letter: "E", text: "Impossible tasks" },
          { letter: "F", text: "Associated risks" }, { letter: "G", text: "Water level" }, { letter: "H", text: "Specific areas" }, { letter: "I", text: "Total expenditure" }, { letter: "J", text: "Construction guidelines" },
        ] },
        { questionNumbers: [37], prompt: "Although the cost of foundations increases when bedrock is deep below the surface, this cannot be regarded as 37 ______.", options: [
          { letter: "A", text: "Development plans" }, { letter: "B", text: "Deep excavations" }, { letter: "C", text: "Great distance" }, { letter: "D", text: "Excessive expense" }, { letter: "E", text: "Impossible tasks" },
          { letter: "F", text: "Associated risks" }, { letter: "G", text: "Water level" }, { letter: "H", text: "Specific areas" }, { letter: "I", text: "Total expenditure" }, { letter: "J", text: "Construction guidelines" },
        ] },
        { questionNumbers: [38], prompt: "This is especially so when compared to 38 ______.", options: [
          { letter: "A", text: "Development plans" }, { letter: "B", text: "Deep excavations" }, { letter: "C", text: "Great distance" }, { letter: "D", text: "Excessive expense" }, { letter: "E", text: "Impossible tasks" },
          { letter: "F", text: "Associated risks" }, { letter: "G", text: "Water level" }, { letter: "H", text: "Specific areas" }, { letter: "I", text: "Total expenditure" }, { letter: "J", text: "Construction guidelines" },
        ] },
        { questionNumbers: [39], prompt: "Barr describes how 39 ______ are made possible by the use of caissons.", options: [
          { letter: "A", text: "Development plans" }, { letter: "B", text: "Deep excavations" }, { letter: "C", text: "Great distance" }, { letter: "D", text: "Excessive expense" }, { letter: "E", text: "Impossible tasks" },
          { letter: "F", text: "Associated risks" }, { letter: "G", text: "Water level" }, { letter: "H", text: "Specific areas" }, { letter: "I", text: "Total expenditure" }, { letter: "J", text: "Construction guidelines" },
        ] },
        { questionNumbers: [40], prompt: "He also discusses their 40 ______.", options: [
          { letter: "A", text: "Development plans" }, { letter: "B", text: "Deep excavations" }, { letter: "C", text: "Great distance" }, { letter: "D", text: "Excessive expense" }, { letter: "E", text: "Impossible tasks" },
          { letter: "F", text: "Associated risks" }, { letter: "G", text: "Water level" }, { letter: "H", text: "Specific areas" }, { letter: "I", text: "Total expenditure" }, { letter: "J", text: "Construction guidelines" },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [67, 68].map(sourcePage),
    questionPages: [69, 70, 71].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [170, 171, 172, 173, 174, 175, 176, 177, 178, 179].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集17精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE17_TEST3_PARTS: ReadingPart[] = [thylacine, palmOil, manhattanSkyscrapers];

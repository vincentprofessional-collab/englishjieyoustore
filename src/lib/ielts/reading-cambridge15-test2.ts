import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  39: [1650, 2365], 40: [1579, 2100], 41: [1689, 2365], 42: [1586, 2100],
  43: [1653, 2364], 44: [1555, 2194], 45: [1689, 2364], 46: [1585, 2100],
  47: [1689, 2365], 48: [1523, 2100], 49: [1659, 2365], 50: [1587, 2184],
  124: [1257, 1469],
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
    84: 1930, 85: 2336, 86: 2333, 87: 2332, 88: 2336,
    94: 619, 95: 2332, 96: 2333, 97: 2334, 98: 2337, 99: 2337, 100: 2337,
    106: 1191, 107: 2333, 108: 2333, 109: 2335, 110: 2329, 111: 2328, 112: 2326, 113: 2328,
  };
  return {
    page,
    src: "/reading/explanations/cambridge-15-test-2-part" + part + "-exp15-p" + String(page).padStart(3, "0") + ".webp",
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

const yesNoOptions = [
  { letter: "YES", text: "The statement agrees with the claims of the writer." },
  { letter: "NO", text: "The statement contradicts the claims of the writer." },
  { letter: "NOT GIVEN", text: "It is impossible to say what the writer thinks about this." },
];

const humourWordOptions = [
  { letter: "A", text: "laughter" }, { letter: "B", text: "relaxing" },
  { letter: "C", text: "boring" }, { letter: "D", text: "anxiety" },
  { letter: "E", text: "stimulating" }, { letter: "F", text: "emotion" },
  { letter: "G", text: "enjoyment" }, { letter: "H", text: "amusing" },
];

const urbanEngineers: ReadingPart = {
  id: "cambridge-15-test-2-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Could urban engineers learn from dance?",
  sections: [
    {
      id: "cambridge-15-test-2-part1-section-a",
      heading: "A",
      format: "pre",
      paragraphs: [
        "The way we travel around cities has a major impact on whether they are sustainable. Transportation is estimated to account for 30% of energy consumption in most of the world’s most developed nations, so lowering the need for energy-using vehicles is essential for decreasing the environmental impact of mobility. But as more and more people move to cities, it is important to think about other kinds of sustainable travel too. The ways we travel affect our physical and mental health, our social lives, our access to work and culture, and the air we breathe. Engineers are tasked with changing how we travel round cities through urban design, but the engineering industry still works on the assumptions that led to the creation of the energy-consuming transport systems we have now: the emphasis placed solely on efficiency, speed, and quantitative data. We need radical changes, to make it healthier, more enjoyable, and less environmentally damaging to travel around cities.",
      ],
    },
    {
      id: "cambridge-15-test-2-part1-section-b",
      heading: "B",
      format: "pre",
      paragraphs: [
        "Dance might hold some of the answers. That is not to suggest everyone should dance their way to work, however healthy and happy it might make us, but rather that the techniques used by choreographers to experiment with and design movement in dance could provide engineers with tools to stimulate new ideas in city-making. Richard Sennett, an influential urbanist and sociologist who has transformed ideas about the way cities are made, argues that urban design has suffered from a separation between mind and body since the introduction of the architectural blueprint.",
      ],
    },
    {
      id: "cambridge-15-test-2-part1-section-c",
      heading: "C",
      format: "pre",
      paragraphs: [
        "Whereas medieval builders improvised and adapted construction through their intimate knowledge of materials and personal experience of the conditions on a site, building designs are now conceived and stored in media technologies that detach the designer from the physical and social realities they are creating. While the design practices created by these new technologies are essential for managing the technical complexity of the modern city, they have the drawback of simplifying reality in the process.",
      ],
    },
    {
      id: "cambridge-15-test-2-part1-section-d",
      heading: "D",
      format: "pre",
      paragraphs: [
        "To illustrate, Sennett discusses the Peachtree Center in Atlanta, USA, a development typical of the modernist approach to urban planning prevalent in the 1970s. Peachtree created a grid of streets and towers intended as a new pedestrian-friendly downtown for Atlanta. According to Sennett, this failed because its designers had invested too much faith in computer-aided design to tell them how it would operate. They failed to take into account that purpose-built street cafés could not operate in the hot sun without the protective awnings common in older buildings, and would need energy-consuming air conditioning instead, or that its giant car park would feel so unwelcoming that it would put people off getting out of their cars. What seems entirely predictable and controllable on screen has unexpected results when translated into reality.",
      ],
    },
    {
      id: "cambridge-15-test-2-part1-section-e",
      heading: "E",
      format: "pre",
      paragraphs: [
        "The same is true in transport engineering, which uses models to predict and shape the way people move through the city. Again, these models are necessary, but they are built on specific world views in which certain forms of efficiency and safety are considered and other experiences of the city ignored. Designs that seem logical in models appear counter-intuitive in the actual experience of their users. The guard rails that will be familiar to anyone who has attempted to cross a British road, for example, were an engineering solution to pedestrian safety based on models that prioritise the smooth flow of traffic. On wide major roads, they often guide pedestrians to specific crossing points and slow down their progress across the road by using staggered access points to divide the crossing into two — one for each carriageway. In doing so they make crossings feel longer, introducing psychological barriers greatly impacting those that are the least mobile, and encouraging others to make dangerous crossings to get around the guard rails. These barriers don’t just make it harder to cross the road: they divide communities and decrease opportunities for healthy transport. As a result, many are now being removed, causing disruption, cost, and waste.",
      ],
    },
    {
      id: "cambridge-15-test-2-part1-section-f",
      heading: "F",
      format: "pre",
      paragraphs: [
        "If their designers had had the tools to think with their bodies — like dancers — and imagine how these barriers would feel, there might have been a better solution. In order to bring about fundamental changes to the ways we use our cities, engineering will need to develop a richer understanding of why people move in certain ways, and how this movement affects them. Choreography may not seem an obvious choice for tackling this problem. Yet it shares with engineering the aim of designing patterns of movement within limitations of space. It is an art form developed almost entirely by trying out ideas with the body, and gaining instant feedback on how the results feel. Choreographers have deep understanding of the psychological, aesthetic, and physical implications of different ways of moving.",
      ],
    },
    {
      id: "cambridge-15-test-2-part1-section-g",
      heading: "G",
      format: "pre",
      paragraphs: [
        "Observing the choreographer Wayne McGregor, cognitive scientist David Kirsh described how he ‘thinks with the body’. Kirsh argues that by using the body to simulate outcomes, McGregor is able to imagine solutions that would not be possible using purely abstract thought. This kind of physical knowledge is valued in many areas of expertise, but currently has no place in formal engineering design processes. A suggested method for transport engineers is to improvise design solutions and get instant feedback about how they would work from their own experience of them, or model designs at full scale in the way choreographers experiment with groups of dancers. Above all, perhaps, they might learn to design for emotional as well as functional effects.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-15-test-2-part1-questions-1-6",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 1 has seven paragraphs, A–G. Which paragraph contains the following information? Write the correct letter, A–G, in boxes 1–6 on your answer sheet.",
      questions: [
        { questionNumbers: [1], prompt: "Reference to an appealing way of using dance that the writer is not proposing", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [2], prompt: "An example of a contrast between past and present approaches to building", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [3], prompt: "Mention of an objective of both dance and engineering", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [4], prompt: "Reference to an unforeseen problem arising from ignoring the climate", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [5], prompt: "Why some measures intended to help people are being reversed", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [6], prompt: "Reference to how transport has an impact on human lives", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-15-test-2-part1-questions-7-13",
        "Guard rails",
        "Questions 7–13\nComplete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 7–13 on your answer sheet.\n\nGuard rails\n\nGuard rails were introduced on British roads to improve the 7 ______ of pedestrians, while ensuring that the movement of 8 ______ is not disrupted. Pedestrians are led to access points, and encouraged to cross one 9 ______ at a time.\n\nAn unintended effect is to create psychological difficulties in crossing the road, particularly for less 10 ______ people. Another result is that some people cross the road in a 11 ______ way. The guard rails separate 12 ______, and make it more difficult to introduce forms of transport that are 13 ______.",
        7,
        13,
      ),
    },
  ],
  source: {
    passagePages: [39, 40].map(sourcePage),
    questionPages: [41].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [84, 85, 86, 87, 88].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集15精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const extinctSpecies: ReadingPart = {
  id: "cambridge-15-test-2-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Should we try to bring extinct species back to life?",
  sections: [
    {
      id: "cambridge-15-test-2-part2-section-a",
      heading: "A",
      format: "pre",
      paragraphs: [
        "The passenger pigeon was a legendary species. Flying in vast numbers across North America, with potentially many millions within a single flock, their migration was once one of nature’s great spectacles. Sadly, the passenger pigeon’s existence came to an end on 1 September 1914, when the last living specimen died at Cincinnati Zoo. Geneticist Ben Novak is lead researcher on an ambitious project which now aims to bring the bird back to life through a process known as ‘de-extinction’. The basic premise involves using cloning technology to turn the DNA of extinct animals into a fertilised embryo, which is carried by the nearest relative still in existence — in this case, the abundant band-tailed pigeon — before being born as a living, breathing animal. Passenger pigeons are one of the pioneering species in this field, but they are far from the only ones on which this cutting-edge technology is being trialled.",
      ],
    },
    {
      id: "cambridge-15-test-2-part2-section-b",
      heading: "B",
      format: "pre",
      paragraphs: [
        "In Australia, the thylacine, more commonly known as the Tasmanian tiger, is another extinct creature which genetic scientists are striving to bring back to life. ‘There is no carnivore now in Tasmania that fills the niche which thylacines once occupied,’ explains Michael Archer of the University of New South Wales. He points out that in the decades since the thylacine went extinct, there has been a spread in a ‘dangerously debilitating’ facial tumour syndrome which threatens the existence of the Tasmanian devils, the island’s other notorious resident. Thylacines would have prevented this spread because they would have killed significant numbers of Tasmanian devils. ‘If that contagious cancer had popped up previously, it would have burned out in whatever region it started. The return of thylacines to Tasmania could help to ensure that devils are never again subjected to risks of this kind.’",
      ],
    },
    {
      id: "cambridge-15-test-2-part2-section-c",
      heading: "C",
      format: "pre",
      paragraphs: [
        "If extinct species can be brought back to life, can humanity begin to correct the damage it has caused to the natural world over the past few millennia? ‘The idea of de-extinction is that we can reverse this process, bringing species that no longer exist back to life,’ says Beth Shapiro of University of California Santa Cruz’s Genomics Institute. ‘I don’t think that we can do this. There is no way to bring back something that is 100 per cent identical to a species that went extinct a long time ago.’ A more practical approach for long-extinct species is to take the DNA of existing species as a template, ready for the insertion of strands of extinct animal DNA to create something new: a hybrid, based on the living species, but which looks and/or acts like the animal which died out.",
      ],
    },
    {
      id: "cambridge-15-test-2-part2-section-d",
      heading: "D",
      format: "pre",
      paragraphs: [
        "This complicated process and questionable outcome begs the question: what is the actual point of this technology? ‘For us, the goal has always been replacing the extinct species with a suitable replacement,’ explains Novak. ‘When it comes to breeding, band-tailed pigeons scatter and make maybe one or two nests per hectare, whereas passenger pigeons were very social and would make 10,000 or more nests in one hectare.’ Since the disappearance of this key species, ecosystems in the eastern US have suffered, as the lack of disturbance caused by thousands of passenger pigeons wrecking trees and branches means there has been minimal need for regrowth. This has left forests stagnant and therefore unwelcoming to the plants and animals which evolved to help regenerate the forest after a disturbance. According to Novak, a hybridised band-tailed pigeon, with the added nesting habits of a passenger pigeon, could, in theory, re-establish that forest disturbance, thereby creating a habitat necessary for a great many other native species to thrive.",
      ],
    },
    {
      id: "cambridge-15-test-2-part2-section-e",
      heading: "E",
      format: "pre",
      paragraphs: [
        "Another popular candidate for this technology is the woolly mammoth. George Church, professor at Harvard Medical School and leader of the Woolly Mammoth Revival Project, has been focusing on cold resistance, the main way in which the extinct woolly mammoth and its nearest living relative, the Asian elephant, differ. By pinpointing which genetic traits made it possible for mammoths to survive the icy climate of the tundra, the project’s goal is to return mammoths, or a mammoth-like species, to the area. ‘My highest priority would be preserving the endangered Asian elephant,’ says Church, ‘expanding their range to the huge ecosystem of the tundra. Necessary adaptations would include smaller ears, thicker hair, and extra insulating fat, all for the purpose of reducing heat loss in the tundra, and all traits found in the now extinct woolly mammoth.’ This repopulation of the tundra and boreal forests of Eurasia and North America with large mammals could also be a useful factor in reducing carbon emissions — elephants punch holes through snow and knock down trees, which encourages grass growth. This grass growth would reduce temperatures, and mitigate emissions from melting permafrost.",
      ],
    },
    {
      id: "cambridge-15-test-2-part2-section-f",
      heading: "F",
      format: "pre",
      paragraphs: [
        "While the prospect of bringing extinct animals back to life might capture imaginations, it is, of course, far easier to try to save an existing species which is merely threatened with extinction. ‘Many of the technologies that people have in mind when they think about de-extinction can be used as a form of “genetic rescue”,’ explains Shapiro. She prefers to focus the debate on how this emerging technology could be used to fully understand why various species went extinct in the first place, and therefore how we could use it to make genetic modifications which could prevent mass extinctions in the future. ‘I would also say there’s an incredible moral hazard to not do anything at all,’ she continues. ‘We know that what we are doing today is not enough, and we have to be willing to take some calculated and measured risks.’",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-15-test-2-part2-questions-14-17",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has six paragraphs, A–F. Which paragraph contains the following information? Write the correct letter, A–F, in boxes 14–17 on your answer sheet. You may use any letter more than once.",
      questions: [
        { questionNumbers: [14], prompt: "A reference to how further disappearance of multiple species could be avoided", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [15], prompt: "An explanation of a way of reproducing an extinct animal using the DNA of only that species", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [16], prompt: "A reference to a habitat which has suffered following the extinction of a species", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [17], prompt: "A mention of the exact point at which a particular species became extinct", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-15-test-2-part2-questions-18-22",
        "The woolly mammoth revival project",
        "Questions 18–22\nComplete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 18–22 on your answer sheet.\n\nThe woolly mammoth revival project\n\nProfessor George Church and his team are trying to identify the 18 ______ which enabled mammoths to live in the tundra. The findings could help preserve the mammoth’s close relative, the endangered Asian elephant.\n\nAccording to Church, introducing Asian elephants to the tundra would involve certain physical adaptations to minimise 19 ______. To survive in the tundra, the species would need to have mammoth-like features of thicker hair, 20 ______ of a reduced size and more 21 ______.\n\nRepopulating the tundra with mammoths or Asian elephant/mammoth hybrids would also have an impact on the environment, which could help to reduce temperatures and decrease 22 ______.",
        18,
        22,
      ),
    },
    {
      id: "cambridge-15-test-2-part2-questions-23-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Match each statement with the correct person, A, B or C. Write the correct letter, A, B or C, in boxes 23–26 on your answer sheet. You may use any letter more than once.",
      questions: [
        { questionNumbers: [23], prompt: "Reintroducing an extinct species to its original habitat could improve the health of a particular species living there.", options: [
          { letter: "A", text: "Ben Novak" }, { letter: "B", text: "Michael Archer" }, { letter: "C", text: "Beth Shapiro" },
        ] },
        { questionNumbers: [24], prompt: "It is important to concentrate on the causes of an animal’s extinction.", options: [
          { letter: "A", text: "Ben Novak" }, { letter: "B", text: "Michael Archer" }, { letter: "C", text: "Beth Shapiro" },
        ] },
        { questionNumbers: [25], prompt: "A species brought back from extinction could have an important beneficial impact on the vegetation of its habitat.", options: [
          { letter: "A", text: "Ben Novak" }, { letter: "B", text: "Michael Archer" }, { letter: "C", text: "Beth Shapiro" },
        ] },
        { questionNumbers: [26], prompt: "Our current efforts at preserving biodiversity are insufficient.", options: [
          { letter: "A", text: "Ben Novak" }, { letter: "B", text: "Michael Archer" }, { letter: "C", text: "Beth Shapiro" },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [42, 43].map(sourcePage),
    questionPages: [44, 45].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [94, 95, 96, 97, 98, 99, 100].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集15精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const humour: ReadingPart = {
  id: "cambridge-15-test-2-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Having a laugh",
  subtitle: "The findings of psychological scientists reveal the importance of humour",
  sections: [{
    id: "cambridge-15-test-2-part3-passage",
    format: "pre",
    paragraphs: [
      "Humans start developing a sense of humour as early as six weeks old, when babies begin to laugh and smile in response to stimuli. Laughter is universal across all human cultures and even exists in some form in rats, chimps, and bonobos. Like other human emotions and expressions, laughter and humour provide psychological scientists with rich resources for studying human psychology, ranging from the development of language to the neuroscience of social perception.",
      "Theories focusing on the evolution of laughter point to it as an important adaptation for social communication. Take, for example, the recorded laughter in TV comedy shows. Back in 1950, US sound engineer Charley Douglass hated dealing with the unpredictable laughter of live audiences, so started recording his own ‘laugh tracks’. These were intended to help people at home feel like they were in a social situation, such as a crowded theatre. Douglass even recorded various types of laughter, as well as mixtures of laughter from men, women, and children. In doing so, he picked up on a quality of laughter that is now interesting researchers: a simple ‘haha’ communicates a remarkable amount of socially relevant information.",
      "In one study conducted in 2016, samples of laughter from pairs of English-speaking students were recorded at the University of California, Santa Cruz. A team made up of more than 30 psychological scientists, anthropologists, and biologists then played these recordings to listeners from 24 diverse societies, from indigenous tribes in New Guinea to city-dwellers in India and Europe. Participants were asked whether they thought the people laughing were friends or strangers. On average, the results were remarkably consistent: worldwide, people’s guesses were correct approximately 60% of the time.",
      "Researchers have also found that different types of laughter serve as codes to complex human social hierarchies. A team led by Christopher Oveis from the University of California, San Diego, found that high-status individuals had different laughs from low-status individuals, and that strangers’ judgements of an individual’s social status were influenced by the dominant or submissive quality of their laughter. In their study, 48 male college students were randomly assigned to groups of four, with each group composed of two low-status members, who had just joined their college fraternity group, and two high-status members, older students who had been active in the fraternity for at least two years. Laughter was recorded as each student took a turn at being teased by the others, involving the use of mildly insulting nicknames. Analysis revealed that, as expected, high-status individuals produced more dominant laughs and fewer submissive laughs relative to the low-status individuals. Meanwhile, low-status individuals were more likely to change their laughter based on their position of power; that is, the newcomers produced more dominant laughs when they were in the ‘powerful’ role of teasers. Dominant laughter was higher in pitch, louder, and more variable in tone than submissive laughter.",
      "A random group of volunteers then listened to an equal number of dominant and submissive laughs from both the high- and low-status individuals, and were asked to estimate the social status of the laugher. In line with predictions, laughers producing dominant laughs were perceived to be significantly higher in status than laughers producing submissive laughs. ‘This was particularly true for low-status individuals, who were rated as significantly higher in status when displaying a dominant versus submissive laugh,’ Oveis and colleagues note. ‘Thus, by strategically displaying more dominant laughter when the context allows, low-status individuals may achieve higher status in the eyes of others.’ However, high-status individuals were rated as high-status whether they produced their natural dominant laugh or tried to do a submissive one.",
      "Another study, conducted by David Cheng and Lu Wang of Australian National University, was based on the hypothesis that humour might provide a respite from tedious situations in the workplace. This ‘mental break’ might facilitate the replenishment of mental resources. To test this theory, the researchers recruited 74 business students, ostensibly for an experiment on perception. First, the students performed a tedious task in which they had to cross out every instance of the letter ‘e’ over two pages of text. The students then were randomly assigned to watch a video clip eliciting either humour, contentment, or neutral feelings. Some watched a clip of the BBC comedy Mr. Bean, others a relaxing scene with dolphins swimming in the ocean, and others a factual video about the management profession.",
      "The students then completed a task requiring persistence in which they were asked to guess the potential performance of employees based on provided profiles, and were told that making 10 correct assessments in a row would lead to a win. However, the software was programmed such that it was nearly impossible to achieve 10 consecutive correct answers. Participants were allowed to quit the task at any point. Students who had watched the Mr. Bean video ended up spending significantly more time working on the task, making twice as many predictions as the other two groups.",
      "Cheng and Wang then replicated these results in a second study, during which they had participants complete long multiplication questions by hand. Again, participants who watched the humorous video spent significantly more time working on this tedious task and completed more questions correctly than did the students in either of the other groups.",
      "‘Although humour has been found to help relieve stress and facilitate social relationships, the traditional view of task performance implies that individuals should avoid things such as humour that may distract them from the accomplishment of task goals,’ Cheng and Wang conclude. ‘We suggest that humour is not only enjoyable but more importantly, energising.’",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-15-test-2-part3-questions-27-31",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27–31 on your answer sheet.",
      questions: [
        { questionNumbers: [27], prompt: "When referring to laughter in the first paragraph, the writer emphasises", options: [
          { letter: "A", text: "its impact on language." }, { letter: "B", text: "its function in human culture." }, { letter: "C", text: "its value to scientific research." }, { letter: "D", text: "its universality in animal societies." },
        ] },
        { questionNumbers: [28], prompt: "What does the writer suggest about Charley Douglass?", options: [
          { letter: "A", text: "He understood the importance of enjoying humour in a group setting." }, { letter: "B", text: "He believed that TV viewers at home needed to be told when to laugh." }, { letter: "C", text: "He wanted his shows to appeal to audiences across the social spectrum." }, { letter: "D", text: "He preferred shows where audiences were present in the recording studio." },
        ] },
        { questionNumbers: [29], prompt: "What makes the Santa Cruz study particularly significant?", options: [
          { letter: "A", text: "The various different types of laughter that were studied." }, { letter: "B", text: "The similar results produced by a wide range of cultures." }, { letter: "C", text: "The number of different academic disciplines involved." }, { letter: "D", text: "The many kinds of people whose laughter was recorded." },
        ] },
        { questionNumbers: [30], prompt: "Which of the following happened in the San Diego study?", options: [
          { letter: "A", text: "Some participants became very upset." }, { letter: "B", text: "Participants exchanged roles." }, { letter: "C", text: "Participants who had not met before became friends." }, { letter: "D", text: "Some participants were unable to laugh." },
        ] },
        { questionNumbers: [31], prompt: "In the fifth paragraph, what did the results of the San Diego study suggest?", options: [
          { letter: "A", text: "It is clear whether a dominant laugh is produced by a high- or low-status person." }, { letter: "B", text: "Low-status individuals in a position of power will still produce submissive laughs." }, { letter: "C", text: "The submissive laughs of low- and high-status individuals are surprisingly similar." }, { letter: "D", text: "High-status individuals can always be identified by their way of laughing." },
        ] },
      ],
    },
    {
      id: "cambridge-15-test-2-part3-questions-32-36",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary using the list of words, A–H, below. Write the correct letter, A–H, in boxes 32–36 on your answer sheet.",
      questions: [
        { questionNumbers: [32], prompt: "The three videos were designed to generate different kinds of ______.", options: humourWordOptions },
        { questionNumbers: [33], prompt: "Participants who had watched the ______ video persisted for longer and tried harder.", options: humourWordOptions },
        { questionNumbers: [34], prompt: "The second study involved a particularly ______ task.", options: humourWordOptions },
        { questionNumbers: [35], prompt: "Humour helps reduce ______ and build social connections.", options: humourWordOptions },
        { questionNumbers: [36], prompt: "It may also have a ______ effect on the body and mind.", options: humourWordOptions },
      ],
    },
    {
      id: "cambridge-15-test-2-part3-questions-37-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 3? In boxes 37–40 on your answer sheet, write YES if the statement agrees with the claims of the writer, NO if it contradicts the claims of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [37], prompt: "Participants in the Santa Cruz study were more accurate at identifying the laughs of friends than those of strangers.", options: yesNoOptions },
        { questionNumbers: [38], prompt: "The researchers in the San Diego study were correct in their predictions regarding the behaviour of the high-status individuals.", options: yesNoOptions },
        { questionNumbers: [39], prompt: "The participants in the Australian National University study were given a fixed amount of time to complete the task focusing on employee profiles.", options: yesNoOptions },
        { questionNumbers: [40], prompt: "Cheng and Wang’s conclusions were in line with established notions regarding task performance.", options: yesNoOptions },
      ],
    },
  ],
  source: {
    passagePages: [46, 47].map(sourcePage),
    questionPages: [48, 49, 50].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [106, 107, 108, 109, 110, 111, 112, 113].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集15精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE15_TEST2_PARTS: ReadingPart[] = [urbanEngineers, extinctSpecies, humour];

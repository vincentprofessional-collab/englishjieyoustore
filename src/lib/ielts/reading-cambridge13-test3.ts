import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  61: [1550, 2281], 62: [1588, 2274], 63: [1695, 2391], 64: [1620, 2280],
  65: [1550, 2289], 66: [1594, 2271], 67: [1646, 2416], 68: [1555, 2282],
  69: [1680, 2382], 70: [1550, 2281], 71: [1609, 2391], 72: [1646, 2272],
  73: [1543, 2297], 124: [1552, 1386],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci13-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = { 118: 1071, 125: 398, 133: 2109 };
  return {
    page,
    src: "/reading/explanations/cambridge-13-test-3-part" + part + "-exp13-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2329,
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

const coconutPalm: ReadingPart = {
  id: "cambridge-13-test-3-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "The coconut palm",
  sections: [{
    id: "cambridge-13-test-3-part1-passage",
    format: "pre",
    paragraphs: [
      "For millennia, the coconut has been central to the lives of Polynesian and Asian peoples. In the western world, on the other hand, coconuts have always been exotic and unusual, sometimes rare. The Italian merchant traveller Marco Polo apparently saw coconuts in South Asia in the late 13th century, and among the mid-14th-century travel writings of Sir John Mandeville there is mention of ‘great Notes of Ynde’ (great Nuts of India). Today, images of palm-fringed tropical beaches are clichés in the west to sell holidays, chocolate bars, fizzy drinks and even romance.",
      "Typically, we envisage coconuts as brown cannonballs that, when opened, provide sweet white flesh. But we see only part of the fruit and none of the plant from which they come. The coconut palm has a smooth, slender, grey trunk, up to 30 metres tall. This is an important source of timber for building houses, and is increasingly being used as a replacement for endangered hardwoods in the furniture construction industry. The trunk is surmounted by a rosette of leaves, each of which may be up to six metres long. The leaves have hard veins in their centres which, in many parts of the world, are used as brushes after the green part of the leaf has been stripped away. Immature coconut flowers are tightly clustered together among the leaves at the top of the trunk. The flower stems may be tapped for their sap to produce a drink, and the sap can also be reduced by boiling to produce a type of sugar used for cooking.",
      "Coconut palms produce as many as seventy fruits per year, weighing more than a kilogram each. The wall of the fruit has three layers: a waterproof outer layer, a fibrous middle layer and a hard, inner layer. The thick fibrous middle layer produces coconut fibre, ‘coir’, which has numerous uses and is particularly important in manufacturing ropes. The woody innermost layer, the shell, with its three prominent ‘eyes’, surrounds the seed. An important product obtained from the shell is charcoal, which is widely used in various industries as well as in the home as a cooking fuel. When broken in half, the shells are also used as bowls in many parts of Asia.",
      "Inside the shell are the nutrients (endosperm) needed by the developing seed. Initially, the endosperm is a sweetish liquid, coconut water, which is enjoyed as a drink, but also provides the hormones which encourage other plants to grow more rapidly and produce higher yields. As the fruit matures, the coconut water gradually solidifies to form the brilliant white, fat-rich, edible flesh or meat. Dried coconut flesh, ‘copra’, is made into coconut oil and coconut milk, which are widely used in cooking in different parts of the world, as well as in cosmetics. A derivative of coconut fat, glycerine, acquired strategic importance in a quite different sphere, as Alfred Nobel introduced the world to his nitroglycerine-based invention: dynamite.",
      "Their biology would appear to make coconuts the great maritime voyagers and coastal colonizers of the plant world. The large, energy-rich fruits are able to float in water and tolerate salt, but cannot remain viable indefinitely; studies suggest after about 110 days at sea they are no longer able to germinate. Literally cast onto desert island shores, with little more than sand to grow in and exposed to the full glare of the tropical sun, coconut seeds are able to germinate and root. The air pocket in the seed, created as the endosperm solidifies, protects the embryo. In addition, the fibrous fruit wall that helped it to float during the voyage stores moisture that can be taken up by the roots of the coconut seedling as it starts to grow.",
      "There have been centuries of academic debate over the origins of the coconut. There were no coconut palms in West Africa, the Caribbean or the east coast of the Americas before the voyages of the European explorers Vasco da Gama and Columbus in the late 15th and early 16th centuries. 16th-century trade and human migration patterns reveal that Arab traders and European sailors are likely to have moved coconuts from South and Southeast Asia to Africa and then across the Atlantic to the east coast of America. But the origin of coconuts discovered along the west coast of America by 16th-century sailors has been the subject of centuries of discussion. Two diametrically opposed origins have been proposed: that they came from Asia, or that they were native to America. Both suggestions have problems. In Asia, there is a large degree of coconut diversity and evidence of millennia of human use — but there are no relatives growing in the wild. In America, there are close coconut relatives, but no evidence that coconuts are indigenous. These problems have led to the intriguing suggestion that coconuts originated on coral islands in the Pacific and were dispersed from there.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-13-test-3-part1-questions-1-8",
      type: "fill",
      title: "THE COCONUT PALM",
      instruction: "Complete the table below. Choose ONE WORD ONLY from the passage for each answer.",
      questions: [1, 2, 3, 4, 5, 6, 7, 8].map((number) => ({ number, before: "Question " + number })),
      table: {
        headers: ["Part", "Description", "Uses"],
        rows: [
          [
            { text: "trunk" },
            { text: "up to 30 metres" },
            { before: "Timber for houses and the making of ", questionNumber: 1 },
          ],
          [
            { text: "leaves" },
            { text: "up to 6 metres long" },
            { text: "To make brushes" },
          ],
          [
            { text: "flowers" },
            { text: "at the top of the trunk" },
            { before: "Stems provide sap, used as a drink or a source of ", questionNumber: 2 },
          ],
          [
            { text: "fruits", rowSpan: 8 },
            { text: "outer layer" },
            { text: "" },
          ],
          [
            { text: "middle layer (coir fibres)" },
            { before: "Used for ", questionNumber: 3, after: ", etc." },
          ],
          [
            { text: "inner layer (shell)", rowSpan: 2 },
            { before: "A source of ", questionNumber: 4 },
          ],
          [
            { before: "(When halved) for ", questionNumber: 5 },
          ],
          [
            { text: "coconut water", rowSpan: 2 },
            { text: "A drink" },
          ],
          [
            { before: "A source of ", questionNumber: 6, after: " for other plants" },
          ],
          [
            { text: "coconut flesh", rowSpan: 2 },
            { before: "Oil and milk for cooking and ", questionNumber: 7 },
          ],
          [
            { before: "Glycerine (an ingredient in ", questionNumber: 8, after: ")" },
          ],
        ],
      },
    },
    {
      id: "cambridge-13-test-3-part1-questions-9-13",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 9-13 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [9], prompt: "Coconut seeds need shade in order to germinate.", options: judgmentOptions },
        { questionNumbers: [10], prompt: "Coconuts were probably transported to Asia from America in the 16th century.", options: judgmentOptions },
        { questionNumbers: [11], prompt: "Coconuts found on the west coast of America were a different type from those found on the east coast.", options: judgmentOptions },
        { questionNumbers: [12], prompt: "All the coconuts found in Asia are cultivated varieties.", options: judgmentOptions },
        { questionNumbers: [13], prompt: "Coconuts are cultivated in different ways in America and the Pacific.", options: judgmentOptions },
      ],
    },
  ],
  source: {
    passagePages: [61, 62].map(sourcePage),
    questionPages: [63, 64].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [118, 119, 120, 121, 122].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集13精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const babyTalk: ReadingPart = {
  id: "cambridge-13-test-3-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "How baby talk gives infant brains a boost",
  sections: [
    {
      id: "cambridge-13-test-3-part2-section-a",
      heading: "A",
      format: "pre",
      paragraphs: ["The typical way of talking to a baby — high-pitched, exaggerated and repetitious — is a source of fascination for linguists who hope to understand how ‘baby talk’ impacts on learning. Most babies start developing their hearing while still in the womb, prompting some hopeful parents to play classical music to their pregnant bellies. Some research even suggests that infants are listening to adult speech as early as 10 weeks before being born, gathering the basic building blocks of their family’s native tongue."],
    },
    {
      id: "cambridge-13-test-3-part2-section-b",
      heading: "B",
      format: "pre",
      paragraphs: ["Early language exposure seems to have benefits to the brain — for instance, studies suggest that babies raised in bilingual homes are better at learning how to mentally prioritize information. So how does the sweet if sometimes absurd sound of infant-directed speech influence a baby’s development? Here are some recent studies that explore the science behind baby talk."],
    },
    {
      id: "cambridge-13-test-3-part2-section-c",
      heading: "C",
      format: "pre",
      paragraphs: ["Fathers don’t use baby talk as often or in the same ways as mothers — and that’s perfectly OK, according to a new study. Mark VanDam of Washington State University at Spokane and colleagues equipped parents with recording devices and speech-recognition software to study the way they interacted with their youngsters during a normal day. ‘We found that moms do exactly what you’d expect and what’s been described many times over,’ VanDam explains. ‘But we found that dads aren’t doing the same thing. Dads didn’t raise their pitch or fundamental frequency when they talked to kids.’ Their role may be rooted in what is called the bridge hypothesis, which dates back to 1975. It suggests that fathers use less familial language to provide their children with a bridge to the kind of speech they’ll hear in public. ‘The idea is that a kid gets to practice a certain kind of speech with mom and another kind of speech with dad, so the kid then has a wider repertoire of kinds of speech to practice,’ says VanDam."],
    },
    {
      id: "cambridge-13-test-3-part2-section-d",
      heading: "D",
      format: "pre",
      paragraphs: ["Scientists from the University of Washington and the University of Connecticut collected thousands of 30-second conversations between parents and their babies, fitting 26 children with audio-recording vests that captured language and sound during a typical eight-hour day. The study found that the more baby talk parents used, the more their youngsters began to babble. And when researchers saw the same babies at age two, they found that frequent baby talk had dramatically boosted vocabulary, regardless of socioeconomic status. ‘Those children who listened to a lot of baby talk were talking more than the babies that listened to more adult talk or standard speech,’ says Nairan Ramirez-Esparza of the University of Connecticut. ‘We also found that it really matters whether you use baby talk in a one-on-one context,’ she adds. ‘The more parents use baby talk one-on-one, the more babies babble, and the more they babble, the more words they produce later in life.’"],
    },
    {
      id: "cambridge-13-test-3-part2-section-e",
      heading: "E",
      format: "pre",
      paragraphs: ["Another study suggests that parents might want to pair their youngsters up so they can babble more with their own kind. Researchers from McGill University and Université du Québec à Montréal found that babies seem to like listening to each other rather than to adults — which may be why baby talk is such a universal tool among parents. They played repeating vowel sounds made by a special synthesizing device that mimicked sounds made by either an adult woman or another baby. This way, only the impact of the auditory cues was observed. The team then measured how long each type of sound held the infants’ attention. They found that the ‘infant’ sounds held babies’ attention nearly 40 percent longer. The baby noises also induced more reactions in the listening infants, like smiling or lip moving, which approximates sound making. The team theorizes that this attraction to other infant sounds could help launch the learning process that leads to speech. ‘It may be some property of the sound that is just drawing their attention,’ says study co-author Linda Polka. ‘Or maybe they are really interested in that particular type of sound because they are starting to focus on their own ability to make sounds. We are speculating here but it might catch their attention because they recognize it as a sound they could possibly make.’"],
    },
    {
      id: "cambridge-13-test-3-part2-section-f",
      heading: "F",
      format: "pre",
      paragraphs: ["In a study published in Proceedings of the National Academy of Sciences, a total of 57 babies from two slightly different age groups — seven months and eleven and a half months — were played a number of syllables from both their native language (English) and a non-native tongue (Spanish). The infants were placed in a brain-activation scanner that recorded activity in a brain region known to guide the motor movements that produce speech. The results suggest that listening to baby talk prompts infant brains to start practising their language skills. ‘Finding activation in motor areas of the brain when infants are simply listening is significant, because it means the baby brain is engaged in trying to talk back right from the start, and suggests that seven-month-olds’ brains are already trying to figure out how to make the right movements that will produce words,’ says co-author Patricia Kuhl. Another interesting finding was that while the seven-month-olds responded to all speech sounds regardless of language, the brains of the older infants worked harder at the motor activations of non-native sounds compared to native sounds. The study may have also uncovered a process by which babies recognize differences between their native language and other tongues."],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-13-test-3-part2-questions-14-17",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following ideas and the list of researchers below. Match each idea with the correct researcher, A, B or C. You may use any letter more than once.",
      questions: [
        { questionNumbers: [14], prompt: "The importance of adults giving babies individual attention when talking to them", options: [
          { letter: "A", text: "Mark VanDam" }, { letter: "B", text: "Nairan Ramirez-Esparza" }, { letter: "C", text: "Patricia Kuhl" },
        ] },
        { questionNumbers: [15], prompt: "The connection between what babies hear and their own efforts to create speech", options: [
          { letter: "A", text: "Mark VanDam" }, { letter: "B", text: "Nairan Ramirez-Esparza" }, { letter: "C", text: "Patricia Kuhl" },
        ] },
        { questionNumbers: [16], prompt: "The advantage for the baby of having two parents each speaking in a different way", options: [
          { letter: "A", text: "Mark VanDam" }, { letter: "B", text: "Nairan Ramirez-Esparza" }, { letter: "C", text: "Patricia Kuhl" },
        ] },
        { questionNumbers: [17], prompt: "The connection between the amount of baby talk babies hear and how much vocalising they do themselves", options: [
          { letter: "A", text: "Mark VanDam" }, { letter: "B", text: "Nairan Ramirez-Esparza" }, { letter: "C", text: "Patricia Kuhl" },
        ] },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-13-test-3-part2-questions-18-23",
        "Research into how parents talk to babies",
        "Questions 18–23\nComplete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.\n\nResearch into how parents talk to babies\n\nResearchers at Washington State University used 18 ______, together with specialised computer programs, to analyse how parents interacted with their babies during a normal day. The study revealed that 19 ______ tended not to modify their ordinary speech patterns when interacting with their babies. According to an idea known as the 20 ______, they may use a more adult type of speech to prepare infants for the language they will hear outside the family home. According to the researchers, hearing baby talk from one parent and ‘normal’ language from the other expands the baby’s 21 ______ of types of speech which they can practise.\n\nMeanwhile, another study carried out by scientists from the University of Washington and the University of Connecticut recorded speech and sound using special 22 ______ that the babies were equipped with. When they studied the babies again at age two, they found that those who had heard a lot of baby talk in infancy had a much larger 23 ______ than those who had not.",
        18,
        23,
      ),
    },
    {
      id: "cambridge-13-test-3-part2-questions-24-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has six paragraphs, A–F. Which paragraph contains the following information?",
      questions: [
        { questionNumbers: [24], prompt: "A reference to a change which occurs in babies’ brain activity before the end of their first year", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [25], prompt: "An example of what some parents do for their baby’s benefit before birth", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [26], prompt: "A mention of babies’ preference for the sounds that other babies make", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
      ],
    },
  ],
  source: {
    passagePages: [65, 66].map(sourcePage),
    questionPages: [67, 68].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [125, 126, 127, 128, 129].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集13精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const harappanCivilisation: ReadingPart = {
  id: "cambridge-13-test-3-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Whatever happened to the Harappan Civilisation?",
  subtitle: "New research sheds light on the disappearance of an ancient society",
  sections: [
    {
      id: "cambridge-13-test-3-part3-section-a",
      heading: "A",
      format: "pre",
      paragraphs: ["The Harappan Civilisation of ancient Pakistan and India flourished 5,000 years ago, but a thousand years later their cities were abandoned. The Harappan Civilisation was a sophisticated Bronze Age society who built ‘megacities’ and traded internationally in luxury craft products, and yet seemed to have left almost no depictions of themselves. But their lack of self-imagery — at a time when the Egyptians were carving and painting representations of themselves all over their temples — is only part of the mystery."],
    },
    {
      id: "cambridge-13-test-3-part3-section-b",
      heading: "B",
      format: "pre",
      paragraphs: ["‘There is plenty of archaeological evidence to tell us about the rise of the Harappan Civilisation, but relatively little about its fall,’ explains archaeologist Dr Cameron Petrie of the University of Cambridge. ‘As populations increased, cities were built that had great baths, craft workshops, palaces and halls laid out in distinct sectors. Houses were arranged in blocks, with wide main streets and narrow alleyways, and many had their own wells and drainage systems. It was very much a “thriving” civilisation.’ Then around 2100 BC, a transformation began. Streets went uncleaned, buildings started to be abandoned, and ritual structures fell out of use. After their final demise, a millennium passed before really large-scale cities appeared once more in South Asia."],
    },
    {
      id: "cambridge-13-test-3-part3-section-c",
      heading: "C",
      format: "pre",
      paragraphs: ["Some have claimed that major glacier-fed rivers changed their course, dramatically affecting the water supply and agriculture; or that the cities could not cope with an increasing population, they exhausted their resource base, the trading economy broke down or they succumbed to invasion and conflict; and yet others that climate change caused an environmental change that affected food and water provision. ‘It is unlikely that there was a single cause for the decline of the civilisation. But the fact is, until now, we have had little solid evidence from the area for most of the key elements,’ said Petrie. ‘A lot of the archaeological debate has really only been well-argued speculation.’"],
    },
    {
      id: "cambridge-13-test-3-part3-section-d",
      heading: "D",
      format: "pre",
      paragraphs: ["A research team led by Petrie, together with Dr Ravindanath Singh of Banaras Hindu University in India, found early in their investigations that many of the archaeological sites were not where they were supposed to be, completely altering understanding of the way that this region was inhabited in the past. When they carried out a survey of how the larger area was settled in relation to sources of water, they found inaccuracies in the published geographic locations of ancient settlements ranging from several hundred metres to many kilometres. They realised that any attempts to use the existing data were likely to be fundamentally flawed. Over the course of several seasons of fieldwork they carried out new surveys, finding an astonishing 198 settlement sites that were previously unknown."],
    },
    {
      id: "cambridge-13-test-3-part3-section-e",
      heading: "E",
      format: "pre",
      paragraphs: ["Now, research published by Dr Yama Dixit and Professor David Hodell, both from Cambridge’s Department of Earth Sciences, has provided the first definitive evidence for climate change affecting the plains of north-western India, where hundreds of Harappan sites are known to have been situated. The researchers gathered shells of Melanoides tuberculata snails from the sediments of an ancient lake and used geochemical analysis as a means of tracing the climate history of the region. ‘As today, the major source of water into the lake is likely to have been the summer monsoon,’ says Dixit. ‘But we have observed that there was an abrupt change about 4,100 years ago, when the amount of evaporation from the lake exceeded the rainfall — indicative of a drought.’ Hodell adds: ‘We estimate that the weakening of the Indian summer monsoon climate lasted about 200 years before recovering to the previous conditions, which we still see today.’"],
    },
    {
      id: "cambridge-13-test-3-part3-section-f",
      heading: "F",
      format: "pre",
      paragraphs: ["It has long been thought that other great Bronze Age civilisations also declined at a similar time, with a global-scale climate event being seen as the cause. While it is possible that these local-scale processes were linked, the real archaeological interest lies in understanding the impact of these larger-scale events on different environments and different populations. ‘Considering the vast area of the Harappan Civilisation with its variable weather systems,’ explains Singh, ‘it is essential that we obtain more climate data from areas close to the two great cities at Mohenjodaro and Harappa and also from the Indian Punjab.’"],
    },
    {
      id: "cambridge-13-test-3-part3-section-g",
      heading: "G",
      format: "pre",
      paragraphs: ["Petrie and Singh’s team is now examining archaeological records and trying to understand details of how people led their lives in the region five millennia ago. They are analysing grains cultivated at the time, and trying to work out whether they were grown under extreme conditions of water stress, and whether they were adjusting the combinations of crops they were growing for different weather systems. They are also looking at whether the types of pottery used, and other aspects of their material culture, were distinctive to specific regions or were more similar across larger areas. This gives us insight into the types of interactive networks that the population was involved in, and whether those changed."],
    },
    {
      id: "cambridge-13-test-3-part3-section-h",
      heading: "H",
      format: "pre",
      paragraphs: ["Petrie believes that archaeologists are in a unique position to investigate how past societies responded to environmental and climatic change. ‘By investigating responses to environmental pressures and threats, we can learn from the past to engage with the public, and the relevant governmental and administrative bodies, to be more proactive in issues such as the management and administration of water supply, the balance of urban and rural development, and the importance of preserving cultural heritage in the future.’"],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-13-test-3-part3-questions-27-31",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 3 has eight paragraphs, A–H. Which paragraph contains the following information? You may use any letter more than once.",
      questions: [
        { questionNumbers: [27], prompt: "Proposed explanations for the decline of the Harappan Civilisation", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [28], prompt: "Reference to a present-day application of some archaeological research findings", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [29], prompt: "A difference between the Harappan Civilisation and another culture of the same period", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [30], prompt: "A description of some features of Harappan urban design", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [31], prompt: "Reference to the discovery of errors made by previous archaeologists", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-13-test-3-part3-questions-32-36",
        "Looking at evidence of climate change",
        "Questions 32–36\nComplete the summary below. Choose ONE WORD ONLY from the passage for each answer.\n\nLooking at evidence of climate change\n\nYama Dixit and David Hodell have found the first definitive evidence of climate change affecting the plains of north-western India thousands of years ago. By collecting the 32 ______ of snails and analysing them, they discovered evidence of a change in water levels in 33 ______ in the region. This occurred when there was less 34 ______ than evaporation, and suggests that there was an extended period of drought.\n\nPetrie and Singh’s team are using archaeological records to look at 35 ______ from five millennia ago, in order to know whether people had adapted their agricultural practices to changing climatic conditions. They are also examining objects including 36 ______, so as to find out about links between inhabitants of different parts of the region and whether these changed over time.",
        32,
        36,
      ),
    },
    {
      id: "cambridge-13-test-3-part3-questions-37-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following statements and the list of researchers below. Match each statement with the correct researcher, A, B, C or D. You may use any letter more than once.",
      questions: [
        { questionNumbers: [37], prompt: "Finding further information about changes to environmental conditions in the region is vital.", options: [
          { letter: "A", text: "Cameron Petrie" }, { letter: "B", text: "Ravindanath Singh" }, { letter: "C", text: "Yama Dixit" }, { letter: "D", text: "David Hodell" },
        ] },
        { questionNumbers: [38], prompt: "Examining previous patterns of behaviour may have long-term benefits.", options: [
          { letter: "A", text: "Cameron Petrie" }, { letter: "B", text: "Ravindanath Singh" }, { letter: "C", text: "Yama Dixit" }, { letter: "D", text: "David Hodell" },
        ] },
        { questionNumbers: [39], prompt: "Rough calculations indicate the approximate length of a period of water shortage.", options: [
          { letter: "A", text: "Cameron Petrie" }, { letter: "B", text: "Ravindanath Singh" }, { letter: "C", text: "Yama Dixit" }, { letter: "D", text: "David Hodell" },
        ] },
        { questionNumbers: [40], prompt: "Information about the decline of the Harappan Civilisation has been lacking.", options: [
          { letter: "A", text: "Cameron Petrie" }, { letter: "B", text: "Ravindanath Singh" }, { letter: "C", text: "Yama Dixit" }, { letter: "D", text: "David Hodell" },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [69, 70].map(sourcePage),
    questionPages: [71, 72, 73].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [133, 134, 135, 136, 137].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集13精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE13_TEST3_PARTS: ReadingPart[] = [coconutPalm, babyTalk, harappanCivilisation];

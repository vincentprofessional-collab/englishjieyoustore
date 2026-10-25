import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  56: [1615, 2429], 57: [1659, 2452], 58: [1637, 2410], 59: [1615, 2343],
  60: [1679, 2502], 61: [1679, 2537], 62: [1591, 2376], 63: [1663, 2430],
  64: [1589, 2398], 65: [1661, 2426], 66: [1680, 2453], 67: [1715, 1882],
  68: [1609, 2449], 148: [1642, 1254],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci10-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = { 103: 1093, 111: 503, 5: 1758 };
  const explanationPdf = part === 3 ? "exp102" : "exp10";
  return {
    page,
    src: "/reading/explanations/cambridge-10-test-3-part" + part + "-" + explanationPdf + "-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2265,
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

function paragraphSection(id: string, letter: string, text: string, questionNumber?: number) {
  return {
    id,
    heading: "Paragraph " + letter,
    ...(questionNumber ? { headingQuestionNumber: questionNumber } : {}),
    format: "pre" as const,
    paragraphs: [text],
  };
}

const tourismHeadings = [
  { id: "i", text: "Economic and social significance of tourism" },
  { id: "ii", text: "The development of mass tourism" },
  { id: "iii", text: "Travel for the wealthy" },
  { id: "iv", text: "Earning foreign exchange through tourism" },
  { id: "v", text: "Difficulty in recognising the economic effects of tourism" },
  { id: "vi", text: "The contribution of air travel to tourism" },
  { id: "vii", text: "The world impact of tourism" },
  { id: "viii", text: "The history of travel" },
];

const tourismParagraphs = [
  "Travel has existed since the beginning of time, when primitive man set out, often traversing great distances in search of game, which provided the food and clothing necessary for his survival. Throughout the course of history, people have travelled for purposes of trade, religious conviction, economic gain, war, migration and other equally compelling motivations. In the Roman era, wealthy aristocrats and high government officials also travelled for pleasure. Seaside resorts located at Pompeii and Herculaneum afforded citizens the opportunity to escape to their vacation villas in order to avoid the summer heat of Rome. Travel, except during the Dark Ages, has continued to grow and, throughout recorded history, has played a vital role in the development of civilisations and their economies.",
  "Tourism in the mass form as we know it today is a distinctly twentieth-century phenomenon. Historians suggest that the advent of mass tourism began in England during the Industrial Revolution with the rise of the middle class and the availability of relatively inexpensive transportation. The creation of the commercial airline industry following the Second World War and the subsequent development of the jet aircraft in the 1950s signalled the rapid growth and expansion of international travel. This growth led to the development of a major new industry: tourism. In turn, international tourism became the concern of a number of world governments since it not only provided new employment opportunities but also produced a means of earning foreign exchange.",
  "Tourism today has grown significantly in both economic and social importance. In most industrialised countries over the past few years, the fastest growth has been seen in the area of services. One of the largest segments of the service industry, although largely unrecognised as an entity in some of these countries, is travel and tourism. According to the World Travel and Tourism Council (1992), ‘Travel and tourism is the largest industry in the world on virtually any economic measure including value-added, capital investment, employment and tax contributions.’ In 1992, the industry’s gross output was estimated to be $3.5 trillion, over 12 per cent of all consumer spending. The travel and tourism industry is the world’s largest employer with almost 130 million jobs, or almost 7 per cent of all employees. This industry is the world’s leading industrial contributor, producing over 6 per cent of the world’s gross national product and accounting for capital investment in excess of $422 billion in direct, indirect and personal taxes each year. Thus, tourism has a profound impact both on the world economy and, because of the educative effect of travel and the effects on employment, on society itself.",
  "However, the major problems of the travel and tourism industry that have hidden, or obscured, its economic impact are the diversity and fragmentation of the industry itself. The travel industry includes hotels, motels and other types of accommodation; restaurants and other food services; transportation services and facilities; amusements, attractions and other leisure facilities; gift shops and a large number of other enterprises. Since many of these businesses also serve local residents, the impact of spending by visitors can easily be overlooked or underestimated. In addition, Meis (1992) points out that the tourism industry involves concepts that have remained amorphous to both analysts and decision makers. Moreover, in all nations this problem has made it difficult for the industry to develop any type of reliable or credible tourism information base in order to estimate the contribution it makes to regional, national and global economies. However, the nature of this very diversity makes travel and tourism ideal vehicles for economic development in a wide variety of countries, regions or communities.",
  "Once the exclusive province of the wealthy, travel and tourism have become an institutionalised way of life for most of the population. In fact, McIntosh and Goeldner (1990) suggest that tourism has become the largest commodity in international trade for many nations and, for a significant number of other countries, it ranks second or third. For example, tourism is the major source of income in Bermuda, Greece, Italy, Spain, Switzerland and most Caribbean countries. In addition, Hawkins and Ritchie, quoting from data published by the American Express Company, suggest that the travel and tourism industry is the number one ranked employer in the Bahamas, Brazil, Canada, France, the former West Germany, Hong Kong, Italy, Jamaica, Japan, Singapore, the United Kingdom and the United States. However, because of problems of definition, which directly affect statistical measurement, it is not possible with any degree of certainty to provide precise, valid or reliable data about the extent of world-wide tourism participation or its economic impact. In many cases, similar difficulties arise when attempts are made to measure domestic tourism.",
];

const tourism: ReadingPart = {
  id: "cambridge-10-test-3-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 on the following pages.",
  title: "The Context, Meaning and Scope of Tourism",
  sections: [
    { ...paragraphSection("cambridge-10-test-3-part1-paragraph-a", "A (example: viii)", tourismParagraphs[0]) },
    ...tourismParagraphs.slice(1).map((text, index) => paragraphSection(
      "cambridge-10-test-3-part1-paragraph-" + String.fromCharCode(98 + index),
      String.fromCharCode(66 + index),
      text,
      index + 1,
    )),
  ],
  questionBlocks: [
    {
      id: "cambridge-10-test-3-part1-headings-1-4",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 1 has five paragraphs, A–E. Choose the correct heading for paragraphs B–E from the list. Paragraph A is the example (viii).",
      questionNumbers: [1, 2, 3, 4],
      options: tourismHeadings,
    },
    rawFillBlock(
      "cambridge-10-test-3-part1-questions-5-10",
      "Questions 5–10",
      "Questions 5–10\nDo the following statements agree with the information given in Reading Passage 1?\n\nIn boxes 5–10 on your answer sheet, write\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN if there is no information on this\n\n5 The largest employment figures in the world are found in the travel and tourism industry.\n6 Tourism contributes over six per cent of the Australian gross national product.\n7 Tourism has a social impact because it promotes recreation.\n8 Two main features of the travel and tourism industry make its economic significance difficult to ascertain.\n9 Visitor spending is always greater than the spending of residents in tourist areas.\n10 It is easy to show statistically how tourism affects individual economies.",
      5,
      10,
    ),
    rawFillBlock(
      "cambridge-10-test-3-part1-questions-11-13",
      "Questions 11–13",
      "Questions 11–13\nComplete the sentences below. Choose NO MORE THAN THREE WORDS from the passage for each answer.\n\n11 In Greece, tourism is the most important ______.\n12 The travel and tourism industry in Jamaica is the major ______.\n13 The problems associated with measuring international tourism are often reflected in the measurement of ______.",
      11,
      13,
    ),
  ],
  source: {
    passagePages: [sourcePage(57), sourcePage(58)],
    questionPages: [sourcePage(56), sourcePage(59)],
    answerPages: [sourcePage(148)],
    explanationPages: [103, 104, 105, 106, 107, 108].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集10精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const autumnParagraphs = [
  "One of the most captivating natural events of the year in many areas throughout North America is the turning of the leaves in the fall. The colours are magnificent, but the question of exactly why some trees turn yellow or orange, and others red or purple, is something which has long puzzled scientists.",
  "Summer leaves are green because they are full of chlorophyll, the molecule that captures sunlight and converts that energy into new building materials for the tree. As fall approaches in the northern hemisphere, the amount of solar energy available declines considerably. For many trees — evergreen conifers being an exception — the best strategy is to abandon photosynthesis until the spring. So rather than maintaining the now redundant leaves throughout the winter, the tree saves its precious resources and discards them. But before letting its leaves go, the tree dismantles their chlorophyll molecules and ships their valuable nitrogen back into the twigs. As chlorophyll is depleted, other colours that have been dominated by it throughout the summer begin to be revealed. This unmasking explains the autumn colours of yellow and orange, but not the brilliant reds and purples of trees such as the maple or sumac.",
  "The source of the red is widely known: it is created by anthocyanins, water-soluble plant pigments reflecting the red-to-blue range of the visible spectrum. They belong to a class of sugar-based chemical compounds also known as flavonoids. What is puzzling is that anthocyanins are actually newly minted, made in the leaves at the same time as the tree is preparing to drop them. But it is hard to make sense of the manufacture of anthocyanins — why should a tree bother making new chemicals in its leaves when it is already scrambling to withdraw and preserve the ones already there?",
  "Some theories about anthocyanins have argued that they might act as a chemical defence against attacks by insects or fungi, or that they might attract fruit-eating birds or increase a leaf’s tolerance to freezing. However, there are problems with each of these theories, including the fact that leaves are red for such a relatively short period that the expense of energy needed to manufacture the anthocyanins would outweigh any anti-fungal or anti-herbivore activity achieved.",
  "It has also been proposed that trees may produce vivid red colours to convince herbivorous insects that they are healthy and robust and would be easily able to mount chemical defences against infestation. If insects paid attention to such advertisements, they might be prompted to lay their eggs on a duller, and presumably less resistant, host. The flaw in this theory lies in the lack of proof to support it. No one has as yet ascertained whether more robust trees sport the brightest leaves, or whether insects make choices according to colour intensity.",
  "Perhaps the most plausible suggestion as to why leaves would go to the trouble of making anthocyanins when they are busy packing up for the winter is the theory known as the ‘light screen’ hypothesis. It sounds paradoxical, because the idea behind this hypothesis is that the red pigment is made in autumn leaves to protect chlorophyll, the light-absorbing chemical, from too much light. Why does chlorophyll need protection when it is the natural world’s supreme light absorber? Why protect chlorophyll at a time when the tree is breaking it down to salvage as much of it as possible?",
  "Chlorophyll, although exquisitely evolved to capture the energy of sunlight, can sometimes be overwhelmed by it, especially in situations of drought, low temperatures or nutrient deficiency. Moreover, the problem of oversensitivity to light is even more acute in the fall, when the leaf is busy preparing for winter by dismantling its internal machinery. The energy absorbed by the chlorophyll molecules of the unstable autumn leaf is not immediately channelled into useful products and processes, as it would be in an intact summer leaf. The weakened fall leaf then becomes vulnerable to the highly destructive effects of the oxygen created by the excited chlorophyll molecules.",
  "Even if you had never suspected that this is what is going on when leaves turn red, there are clues out there. One is straightforward: on many trees, the leaves that are the reddest are those on the side of the tree which gets most sun. Not only that, but the red is brighter on the upper side of the leaf. It has also been recognised for decades that the best conditions for intense red colours are dry, sunny days and cool nights, conditions that nicely match those that make leaves susceptible to excess light. And finally, trees such as maples usually get much redder the more north you travel in the northern hemisphere. It is colder there, they are more stressed, their chlorophyll is more sensitive and it needs more sunblock.",
  "What is still not fully understood, however, is why some trees resort to producing red pigments while others do not bother, and simply reveal their orange or yellow hues. Do these trees have other means at their disposal to prevent overexposure to light in autumn? Their story, though not as spectacular to the eye, will surely turn out to be as subtle and as complex.",
];

const autumnParagraphOptions = "ABCDEFGHI".split("").map((letter) => ({ letter, text: "Paragraph " + letter }));

const autumn: ReadingPart = {
  id: "cambridge-10-test-3-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 below.",
  title: "Autumn leaves",
  subtitle: "Canadian writer Jay Ingram investigates the mystery of why leaves turn red in the fall.",
  sections: autumnParagraphs.map((text, index) => paragraphSection(
    "cambridge-10-test-3-part2-paragraph-" + String.fromCharCode(97 + index),
    String.fromCharCode(65 + index),
    text,
  )),
  questionBlocks: [
    {
      id: "cambridge-10-test-3-part2-questions-14-18",
      type: "choice",
      instruction: "Reading Passage 2 has nine paragraphs, A–I. Which paragraph contains the following information? Write the correct letter, A–I. You may use any letter more than once.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [14], prompt: "A description of the substance responsible for the red colouration of leaves", options: autumnParagraphOptions },
        { questionNumbers: [15], prompt: "The reason why trees drop their leaves in autumn", options: autumnParagraphOptions },
        { questionNumbers: [16], prompt: "Some evidence to confirm a theory about the purpose of red leaves", options: autumnParagraphOptions },
        { questionNumbers: [17], prompt: "An explanation of the function of chlorophyll", options: autumnParagraphOptions },
        { questionNumbers: [18], prompt: "A suggestion that the red colouration in leaves could serve as a warning signal", options: autumnParagraphOptions },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-10-test-3-part2-questions-19-22",
        "Questions 19–22",
        "Questions 19–22\nComplete the notes below. Choose ONE WORD ONLY from the passage for each answer.\n\nWhy believe the ‘light screen’ hypothesis?\n• The most vividly coloured red leaves are found on the side of the tree facing the 19 ______.\n• The 20 ______ surfaces of leaves contain the most red pigment.\n• Red leaves are most abundant when daytime weather conditions are 21 ______ and sunny.\n• The intensity of the red colour of leaves increases as you go further 22 ______.",
        19,
        22,
      ),
      questions: [19, 20, 21, 22].map((number) => ({ number, before: "Question " + number })),
    },
    rawFillBlock(
      "cambridge-10-test-3-part2-questions-23-25",
      "Questions 23–25",
      "Questions 23–25\nDo the following statements agree with the information given in Reading Passage 2?\n\nIn boxes 23–25 on your answer sheet, write\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN if there is no information on this\n\n23 It is likely that the red pigments help to protect the leaf from freezing temperatures.\n24 The ‘light screen’ hypothesis would initially seem to contradict what is known about chlorophyll.\n25 Leaves which turn colours other than red are more likely to be damaged by sunlight.",
      23,
      25,
    ),
    {
      id: "cambridge-10-test-3-part2-question-26",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D.",
      questions: [{
        questionNumbers: [26],
        prompt: "Which of the following questions does the writer offer an explanation for?",
        options: [
          { letter: "A", text: "why conifers remain green in winter" },
          { letter: "B", text: "how leaves turn orange and yellow in autumn" },
          { letter: "C", text: "how herbivorous insects choose which trees to lay their eggs in" },
          { letter: "D", text: "why anthocyanins are restricted to certain trees" },
        ],
      }],
    },
  ],
  source: {
    passagePages: [sourcePage(60), sourcePage(61)],
    questionPages: [sourcePage(62), sourcePage(63)],
    answerPages: [sourcePage(148)],
    explanationPages: [111, 112, 114, 115, 116, 117].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集10精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const voyagers = [
  "An important archaeological discovery on the island of Éfaté in the Pacific archipelago of Vanuatu has revealed traces of an ancient seafaring people, the distant ancestors of today’s Polynesians. The site came to light only by chance. An agricultural worker, digging in the grounds of a derelict plantation, scraped open a grave — the first of dozens in a burial ground some 3,000 years old. It is the oldest cemetery ever found in the Pacific islands, and it harbours the remains of an ancient people archaeologists call the Lapita.",
  "They were daring blue-water adventurers who used basic canoes to rove across the ocean. But they were not just explorers. They were also pioneers who carried with them everything they would need to build new lives — their livestock, taro seedlings and stone tools. Within the span of several centuries, the Lapita stretched the boundaries of their world from the jungle-clad volcanoes of Papua New Guinea to the loneliest coral outliers of Tonga.",
  "The Lapita left precious few clues about themselves, but Éfaté expands the volume of data available to researchers dramatically. The remains of 62 individuals have been uncovered so far, and archaeologists were also thrilled to find six complete Lapita pots. Other items included a Lapita burial urn with modelled birds arranged on the rim as though peering down at the human remains sealed inside. ‘It’s an important discovery,’ says Matthew Spriggs, professor of archaeology at the Australian National University and head of the international team digging up the site, ‘for it conclusively identifies the remains as Lapita.’",
  "DNA teased from these human remains may help answer one of the most puzzling questions in Pacific anthropology: did all Pacific islanders spring from one source or many? Was there only one outward migration from a single point in Asia, or several from different points? ‘This represents the best opportunity we’ve had yet,’ says Spriggs, ‘to find out who the Lapita actually were, where they came from, and who their closest descendants are today.’",
  "There is one stubborn question for which archaeology has yet to provide any answers: how did the Lapita accomplish the ancient equivalent of a moon landing, many times over? No one has found one of their canoes or any rigging, which could reveal how the canoes were sailed. Nor do the oral histories and traditions of later Polynesians offer any insights, for they turn into myths long before they reach as far back in time as the Lapita.",
  "‘All we can say for certain is that the Lapita had canoes that were capable of ocean voyages, and they had the ability to sail them,’ says Geoff Irwin, professor of archaeology at the University of Auckland. Those sailing skills, he says, were developed and passed down over thousands of years by earlier mariners who worked their way through the archipelagos of the western Pacific, making short crossings to nearby islands. The real adventure didn’t begin, however, until their Lapita descendants sailed out of sight of land, with empty horizons on every side. This must have been as difficult for them as landing on the moon is for us today. Certainly it distinguished them from their ancestors, but what gave them the courage to launch out on such risky voyages?",
  "The Lapita’s thrust into the Pacific was eastward, against the prevailing trade winds, Irwin notes. Those nagging headwinds, he argues, may have been the key to their success. ‘They could sail out for days into the unknown and assess the area, secure in the knowledge that if they didn’t find anything, they could turn about and catch a swift ride back on the trade winds. This is what would have made the whole thing work.’ Once out there, skilled seafarers would have detected abundant leads to follow to land: sea birds, coconuts and twigs carried out to sea by the tides, and the afternoon pile-up of clouds on the horizon which often indicates an island in the distance.",
  "For returning explorers, successful or not, the geography of their own archipelagos would have provided a safety net. Without this to go by, overshooting their home ports, getting lost and sailing off into eternity would have been all too easy. Vanuatu, for example, stretches more than 500 miles in a northwest–southeast trend, its scores of intervisible islands forming a backstop for mariners riding the trade winds home.",
  "All this presupposes one essential detail, says Atholl Anderson, professor of prehistory at the Australian National University: the Lapita had mastered the advanced art of sailing against the wind. ‘And there’s no proof they could do any such thing,’ Anderson says. ‘There has been this assumption they did, and people have built canoes to re-create those early voyages based on that assumption. But nobody has any idea what their canoes looked like or how they were rigged.’",
  "Rather than give all the credit to human skill, Anderson invokes the winds of chance. El Niño, the same climate disruption that affects the Pacific today, may have helped scatter the Lapita, Anderson suggests. He points out that climate data obtained from slow-growing corals around the Pacific indicate a series of unusually frequent El Niños around the time of the Lapita expansion. By reversing the regular east-to-west flow of the trade winds for weeks at a time, these ‘super El Niños’ might have taken the Lapita on long unplanned voyages.",
  "However they did it, the Lapita spread themselves a third of the way across the Pacific, then called it quits for reasons known only to them. Ahead lay the vast emptiness of the central Pacific and perhaps they were too thinly stretched to venture farther. They probably never numbered more than a few thousand in total, and in their rapid migration eastward they encountered hundreds of islands — more than 300 in Fiji alone.",
];

const lapitaWordBank = [
  { letter: "A", text: "proof" },
  { letter: "B", text: "plantation" },
  { letter: "C", text: "harbour" },
  { letter: "D", text: "bones" },
  { letter: "E", text: "data" },
  { letter: "F", text: "archaeological discovery" },
  { letter: "G", text: "burial urn" },
  { letter: "H", text: "source" },
  { letter: "I", text: "animals" },
  { letter: "J", text: "maps" },
];

const voyager: ReadingPart = {
  id: "cambridge-10-test-3-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "Beyond the blue horizon",
  subtitle: "Ancient voyagers who settled the far-flung islands of the Pacific Ocean.",
  sections: [{ id: "cambridge-10-test-3-part3-passage", format: "pre", paragraphs: voyagers }],
  questionBlocks: [
    {
      ...rawFillBlock(
        "cambridge-10-test-3-part3-questions-27-31",
        "Questions 27–31",
        "Questions 27–31\nComplete the summary using the list of words and phrases, A–J, below. Write the correct letter, A–J.\n\nThe Éfaté burial site\nA 3,000-year-old burial ground of a seafaring people called the Lapita has been found on an abandoned 27 ______ on the Pacific island of Éfaté. The cemetery, which is a significant 28 ______, was uncovered accidentally by an agricultural worker.\n\nThe Lapita explored and colonised many Pacific islands over several centuries. They took many things with them on their voyages including 29 ______ and tools.\n\nThe burial ground increases the amount of information about the Lapita available to scientists. A team of researchers, led by Matthew Spriggs from the Australian National University, are helping with the excavation of the site. Spriggs believes the 30 ______ which was found at the site is very important since it confirms that the 31 ______ found inside are Lapita.\n\nA proof\nB plantation\nC harbour\nD bones\nE data\nF archaeological discovery\nG burial urn\nH source\nI animals\nJ maps",
        27,
        31,
      ),
      questions: [27, 28, 29, 30, 31].map((number) => ({ number, before: "Question " + number })),
      wordBank: lapitaWordBank.map((option) => option.letter),
    },
    {
      id: "cambridge-10-test-3-part3-questions-32-35",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D.",
      questions: [
        {
          questionNumbers: [32],
          prompt: "According to the writer, there are difficulties explaining how the Lapita accomplished their journeys because",
          options: [
            { letter: "A", text: "the canoes that have been discovered offer relatively few clues" },
            { letter: "B", text: "archaeologists have shown limited interest in this area of research" },
            { letter: "C", text: "little information relating to this period can be relied upon for accuracy" },
            { letter: "D", text: "technological advances have altered the way such achievements are viewed" },
          ],
        },
        {
          questionNumbers: [33],
          prompt: "According to the sixth paragraph, what was extraordinary about the Lapita?",
          options: [
            { letter: "A", text: "They sailed beyond the point where land was visible" },
            { letter: "B", text: "Their cultural heritage discouraged the expression of fear" },
            { letter: "C", text: "They were able to build canoes that withstood ocean voyages" },
            { letter: "D", text: "Their navigational skills were passed on from one generation to the next" },
          ],
        },
        {
          questionNumbers: [34],
          prompt: "What does ‘This’ refer to in the seventh paragraph?",
          options: [
            { letter: "A", text: "the Lapita’s seafaring talent" },
            { letter: "B", text: "the Lapita’s ability to detect signs of land" },
            { letter: "C", text: "the Lapita’s extensive knowledge of the region" },
            { letter: "D", text: "the Lapita’s belief they would be able to return home" },
          ],
        },
        {
          questionNumbers: [35],
          prompt: "According to the eighth paragraph, how was the geography of the region significant?",
          options: [
            { letter: "A", text: "It played an important role in Lapita culture" },
            { letter: "B", text: "It meant there were relatively few storms at sea" },
            { letter: "C", text: "It provided a navigational aid for the Lapita" },
            { letter: "D", text: "It made a large number of islands habitable" },
          ],
        },
      ],
    },
    rawFillBlock(
      "cambridge-10-test-3-part3-questions-36-40",
      "Questions 36–40",
      "Questions 36–40\nDo the following statements agree with the views of the writer in Reading Passage 3?\n\nIn boxes 36–40 on your answer sheet, write\nYES if the statement agrees with the views of the writer\nNO if the statement contradicts the views of the writer\nNOT GIVEN if it is impossible to say what the writer thinks about this\n\n36 It is now clear that the Lapita could sail into a prevailing wind.\n37 Extreme climate conditions may have played a role in Lapita migration.\n38 The Lapita learnt to predict the duration of El Niños.\n39 It remains unclear why the Lapita halted their expansion across the Pacific.\n40 It is likely that the majority of Lapita settled on Fiji.",
      36,
      40,
    ),
  ],
  source: {
    passagePages: [sourcePage(64), sourcePage(65)],
    questionPages: [sourcePage(66), sourcePage(67), sourcePage(68)],
    answerPages: [sourcePage(148)],
    explanationPages: [5, 6, 7, 8, 9].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集10精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE10_TEST3_PARTS: ReadingPart[] = [tourism, autumn, voyager];

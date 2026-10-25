import type { ReadingPart } from "./reading";
import type { ReadingSourcePage } from "./reading-source-model";

const sourceDimensions: Record<number, [number, number]> = {
  33: [1630, 2363], 34: [1669, 2422], 35: [1591, 2320], 36: [1675, 2487],
  37: [1635, 2394], 38: [1653, 2413], 39: [1633, 2354], 40: [1676, 2427],
  41: [1748, 2402], 42: [1692, 2453], 43: [1619, 2359], 44: [1669, 2488],
  45: [1662, 2450], 146: [1750, 1343],
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

function explanationPage(part: number, page: number): ReadingSourcePage {
  const shortPageHeights: Record<number, number> = { 62: 462, 69: 772, 77: 1542, 81: 2261 };
  return {
    page,
    src: "/reading/explanations/cambridge-10-test-2-part" + part + "-exp10-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: shortPageHeights[page] ?? 2265,
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

function paragraphSection(id: string, letter: string, text: string) {
  return { id, heading: "Paragraph " + letter, format: "pre" as const, paragraphs: [text] };
}

const industrialHeadings = [
  { id: "i", text: "The search for the reasons for an increase in population" },
  { id: "ii", text: "Industrialisation and the fear of unemployment" },
  { id: "iii", text: "The development of cities in Japan" },
  { id: "iv", text: "The time and place of the Industrial Revolution" },
  { id: "v", text: "The cases of Holland, France and China" },
  { id: "vi", text: "Changes in drinking habits in Britain" },
  { id: "vii", text: "Two keys to Britain’s industrial revolution" },
  { id: "viii", text: "Conditions required for industrialisation" },
  { id: "ix", text: "Comparisons with Japan lead to the answer" },
];

const teaPassage = [
  "Alan Macfarlane, professor of anthropological science at King’s College, Cambridge, has, like other historians, spent decades wrestling with the enigma of the Industrial Revolution. Why did this particular Big Bang — the world-changing birth of industry — happen in Britain? And why did it strike at the end of the 18th century?",
  "Macfarlane compares the puzzle to a combination lock. ‘There are about 20 different factors and all of them need to be present before the revolution can happen,’ he says. For industry to take off, there needs to be the technology and power to drive factories, large urban populations to provide cheap labour, easy transport to move goods around, an affluent middle class willing to buy mass-produced objects, a market-driven economy and a political system that allows this to happen. While this was the case for England, other nations, such as Japan, the Netherlands and France, also met some of these criteria but were not industrialising. ‘All these factors must have been necessary but not sufficient to cause the revolution,’ says Macfarlane. ‘After all, Holland had everything except coal, while China also had many of these factors. Most historians are convinced there are one or two missing factors that you need to open the lock.’",
  "The missing factors, he proposes, are to be found in almost every kitchen cupboard. Tea and beer, two of the nation’s favourite drinks, fuelled the revolution. The antiseptic properties of tannin, the active ingredient in tea, and of hops in beer — plus the fact that both are made with boiled water — allowed urban communities to flourish at close quarters without succumbing to water-borne diseases such as dysentery. The theory sounds eccentric but once he starts to explain the detective work that went into his deduction, the scepticism gives way to wary admiration. Macfarlane’s case has been strengthened by support from notable quarters — Roy Porter, the distinguished medical historian, recently wrote a favourable appraisal of his research.",
  "Macfarlane had wondered for a long time how the Industrial Revolution came about. Historians had alighted on one interesting factor around the mid-18th century that required explanation. Between about 1650 and 1740, the population in Britain was static. But then there was a burst in population growth. Macfarlane says: ‘The infant mortality rate halved in the space of 20 years, and this happened in both rural areas and cities, and across all classes. People suggested four possible causes. Was there a sudden change in the viruses and bacteria around? Unlikely. Was there a revolution in medical science? But this was a century before Lister’s revolution. Was there a change in environmental conditions? There were improvements in agriculture that wiped out malaria, but these were small gains. Sanitation did not become widespread until the 19th century. The only option left is food. But the height and weight statistics show a decline. So the food must have got worse. Efforts to explain this sudden reduction in child deaths appeared to draw a blank.’",
  "This population burst seemed to happen at just the right time to provide labour for the Industrial Revolution. ‘When you start moving towards an industrial revolution, it is economically efficient to have people living close together,’ says Macfarlane. ‘But then you get disease, particularly from human waste.’ Some digging around in historical records revealed that there was a change in the incidence of water-borne disease at that time, especially dysentery. Macfarlane deduced that whatever the British were drinking must have been important in regulating disease. He says, ‘We drank beer. For a long time, the English were protected by the strong antibacterial agent in hops, which were added to help preserve the beer. But in the late 17th century a tax was introduced on malt, the basic ingredient of beer. The poor turned to water and gin and in the 1720s the mortality rate began to rise again. Then it suddenly dropped again. What caused this?’",
  "Macfarlane looked to Japan, which was also developing large cities about the same time, and also had no sanitation. Water-borne diseases had a much looser grip on the Japanese population than those in Britain. Could it be the prevalence of tea in their culture? Macfarlane then noted that the history of tea in Britain provided an extraordinary coincidence of dates. Tea was relatively expensive until Britain started a direct clipper trade with China in the early 18th century. By the 1740s, about the time that infant mortality was dipping, the drink was common. Macfarlane guessed that the fact that water had to be boiled, together with the stomach-purifying properties of tea, meant that the breast milk provided by mothers was healthier than it had ever been. No other European nation sipped tea like the British, which, by Macfarlane’s logic, pushed these other countries out of contention for the revolution.",
  "But if tea is a factor in the combination lock, why did Japan not forge ahead in a tea-soaked industrial revolution of its own? Macfarlane notes that even though 17th-century Japan had large cities, high literacy rates and even a futures market, it had turned its back on the essence of any work-based revolution by giving up labour-saving devices such as animals, afraid that they would put people out of work. So the nation that we now think of as one of the most technologically advanced entered the 19th century having ‘abandoned the wheel’.",
];

const tea: ReadingPart = {
  id: "cambridge-10-test-2-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 on the following pages.",
  title: "Tea and the Industrial Revolution",
  subtitle: "A Cambridge professor says that a change in drinking habits was the reason for the Industrial Revolution in Britain. Anjana Ahuja reports.",
  sections: teaPassage.map((text, index) => ({
    id: "cambridge-10-test-2-part1-paragraph-" + String.fromCharCode(97 + index),
    heading: "Paragraph " + String.fromCharCode(65 + index),
    headingQuestionNumber: index + 1,
    format: "pre" as const,
    paragraphs: [text],
  })),
  questionBlocks: [
    {
      id: "cambridge-10-test-2-part1-headings-1-7",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 1 has seven paragraphs, A–G. Choose the correct heading for each paragraph from the list below. Write the correct number, i–ix.",
      questionNumbers: [1, 2, 3, 4, 5, 6, 7],
      options: industrialHeadings,
    },
    rawFillBlock(
      "cambridge-10-test-2-part1-questions-8-13",
      "Questions 8–13",
      "Questions 8–13\nDo the following statements agree with the information given in Reading Passage 1?\n\nIn boxes 8–13 on your answer sheet, write\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN if there is no information on this\n\n8 China’s transport system was not suitable for industry in the 18th century.\n9 Tea and beer both helped to prevent dysentery in Britain.\n10 Roy Porter disagrees with Professor Macfarlane’s findings.\n11 After 1740, there was a reduction in population in Britain.\n12 People in Britain used to make beer at home.\n13 The tax on malt indirectly caused a rise in the death rate.",
      8,
      13,
    ),
  ],
  source: {
    passagePages: [sourcePage(34), sourcePage(35)],
    questionPages: [sourcePage(33), sourcePage(36)],
    answerPages: [sourcePage(146)],
    explanationPages: [62, 63, 64, 65, 66, 67, 68].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集10精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const giftedParagraphs = [
  "Internationally, ‘giftedness’ is most frequently determined by a score on a general intelligence test, known as an IQ test, which is above a chosen cut-off point, usually at around the top 2–5%. Children’s educational environment contributes to the IQ score and the way intelligence is used. For example, a very close positive relationship was found when children’s IQ scores were compared with their home educational provision (Freeman, 2010). The higher the children’s IQ scores, especially over IQ 130, the better the quality of their educational backup, measured in terms of reported verbal interactions with parents, number of books and activities in their home, etc. Because IQ tests are decidedly influenced by what the child has learned, they are to some extent measures of current achievement based on age-norms; that is, how well the children have learned to manipulate their knowledge and know-how within the terms of the test. The vocabulary aspect, for example, is dependent on having heard those words. But IQ tests can neither identify the processes of learning and thinking nor predict creativity.",
  "Excellence does not emerge without appropriate help. To reach an exceptionally high standard in any area, very able children need the means to learn, which includes material to work with and focused, challenging tuition — and the encouragement to follow their dream. There appears to be a qualitative difference in the way the intellectually highly able think, compared with more average-ability or older pupils, for whom external regulation by the teacher often compensates for lack of internal regulation. To be at their most effective in their self-regulation, all children can be helped to identify their own ways of learning — metacognition — which will include strategies of planning, monitoring, evaluation, and choice of what to learn. Emotional awareness is also part of metacognition, so children should be helped to be aware of their feelings around the area to be learned, feelings of curiosity or confidence, for example.",
  "High achievers have been found to use self-regulatory learning strategies more often and more effectively than lower achievers, and are better able to transfer these strategies to deal with unfamiliar tasks. This happens to such a high degree in some children that they appear to be demonstrating talent in particular areas. Overviewing research on the thinking process of highly able children, Shore and Kanevsky (1993) put the instructor’s problem succinctly: ‘If they [the gifted] merely think more quickly, then we need only teach more quickly. If they merely make fewer errors, then we can shorten the practice.’ But of course, this is not entirely the case; adjustments have to be made in methods of learning and teaching, to take account of the many ways individuals think.",
  "Yet in order to learn by themselves, the gifted do need some support from their teachers. Conversely, teachers who have a tendency to ‘overdirect’ can diminish their gifted pupils’ learning autonomy. Although ‘spoon-feeding’ can produce extremely high examination results, these are not always followed by equally impressive life successes. Too much dependence on the teacher risks loss of autonomy and motivation to discover. However, when teachers help pupils to reflect on their own learning and thinking activities, they increase their pupils’ self-regulation. For a young child, it may be just the simple question ‘What have you learned today?’ which helps them to recognise what they are doing. Given that a fundamental goal of education is to transfer the control of learning from teachers to pupils, improving pupils’ learning-to-learn techniques should be a major outcome of the school experience, especially for the highly competent. There are quite a number of new methods which can help, such as child-initiated learning, ability-peer tutoring, etc. Such practices have been found to be particularly useful for bright children from deprived areas.",
  "But scientific progress is not all theoretical; knowledge is also vital to outstanding performance: individuals who know a great deal about a specific domain will achieve at a higher level than those who do not (Elshout, 1995). Research with creative scientists by Simonton (1988) brought him to the conclusion that above a certain high level, characteristics such as independence seemed to contribute more to reaching the highest levels of expertise than intellectual skills, due to the great demands of effort and time needed for learning and practice. Creativity in all forms can be seen as expertise mixed with a high level of motivation (Weisberg, 1993).",
  "To sum up, learning is affected by emotions of both the individual and significant others. Positive emotions facilitate the creative aspects of learning and negative emotions inhibit it. Fear, for example, can limit the development of curiosity, which is a strong force in scientific advance, because it motivates problem-solving behaviour. In Boekaerts’ (1991) review of emotion in the learning of very high IQ and highly achieving children, she found emotional forces in harness. They were not only curious, but often had a strong desire to control their environment, improve their learning efficiency, and increase their own learning resources.",
];

const paragraphOptions = "ABCDEF".split("").map((letter) => ({ letter, text: "Paragraph " + letter }));
const peopleOptions = [
  { letter: "A", text: "Freeman" },
  { letter: "B", text: "Shore and Kanevsky" },
  { letter: "C", text: "Elshout" },
  { letter: "D", text: "Simonton" },
  { letter: "E", text: "Boekaerts" },
];

const gifted: ReadingPart = {
  id: "cambridge-10-test-2-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 below.",
  title: "Gifted children and learning",
  sections: giftedParagraphs.map((text, index) => paragraphSection(
    "cambridge-10-test-2-part2-paragraph-" + String.fromCharCode(97 + index),
    String.fromCharCode(65 + index),
    text,
  )),
  questionBlocks: [
    {
      id: "cambridge-10-test-2-part2-questions-14-17",
      type: "choice",
      instruction: "Reading Passage 2 has six paragraphs, A–F. Which paragraph contains the following information? Write the correct letter, A–F. You may use any letter more than once.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [14], prompt: "A reference to the influence of the domestic background on the gifted child", options: paragraphOptions },
        { questionNumbers: [15], prompt: "Reference to what can be lost if learners are given too much guidance", options: paragraphOptions },
        { questionNumbers: [16], prompt: "A reference to the damaging effects of anxiety", options: paragraphOptions },
        { questionNumbers: [17], prompt: "Examples of classroom techniques which favour socially disadvantaged children", options: paragraphOptions },
      ],
    },
    {
      id: "cambridge-10-test-2-part2-questions-18-22",
      type: "choice",
      instruction: "Match each statement with the correct person or people, A–E.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [18], prompt: "Less time can be spent on exercises with gifted pupils who produce accurate work.", options: peopleOptions },
        { questionNumbers: [19], prompt: "Self-reliance is a valuable tool that helps gifted students reach their goals.", options: peopleOptions },
        { questionNumbers: [20], prompt: "Gifted children know how to channel their feelings to assist their learning.", options: peopleOptions },
        { questionNumbers: [21], prompt: "The very gifted child benefits from appropriate support from close relatives.", options: peopleOptions },
        { questionNumbers: [22], prompt: "Really successful students have learnt a considerable amount about their subject.", options: peopleOptions },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-10-test-2-part2-questions-23-26",
        "Questions 23–26",
        "Questions 23–26\nComplete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.\n\n23 One study found a strong connection between children’s IQ and the availability of ______ and ______ at home.\n24 Children of average ability seem to need more direction from teachers because they do not have ______.\n25 Metacognition involves children understanding their own learning strategies, as well as developing ______.\n26 Teachers who rely on what is known as ______ often produce sets of impressive grades in class tests.",
        23,
        26,
      ),
      questions: [
        { number: 23, before: "One study found a strong connection between children’s IQ and the availability of ", after: " at home.", inputCount: 2, joiners: [" and "], answerMode: "all" },
        { number: 24, before: "Children of average ability seem to need more direction from teachers because they do not have " },
        { number: 25, before: "Metacognition involves children understanding their own learning strategies, as well as developing " },
        { number: 26, before: "Teachers who rely on what is known as " },
      ],
    },
  ],
  source: {
    passagePages: [sourcePage(37), sourcePage(38)],
    questionPages: [sourcePage(39), sourcePage(40)],
    answerPages: [sourcePage(146)],
    explanationPages: [69, 70, 71, 72, 73, 74, 75].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集10精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const artText = [
  "One of the most famous works of art in the world is Leonardo da Vinci’s Mona Lisa. Nearly everyone who goes to see the original will already be familiar with it from reproductions, but they accept that fine art is more rewardingly viewed in its original form. However, if Mona Lisa was a famous novel, few people would bother to go to a museum to read the writer’s actual manuscript rather than a printed reproduction. This might be explained by the fact that the novel has evolved precisely because of technological developments that made it possible to print out huge numbers of texts, whereas oil paintings have always been produced as unique objects. In addition, it could be argued that the practice of interpreting or ‘reading’ each medium follows different conventions. With novels, the reader attends mainly to the meaning of words rather than the way they are printed on the page, whereas the ‘reader’ of a painting must attend just as closely to the material form of marks and shapes in the picture as to any ideas they may signify.",
  "Yet it has always been possible to make very accurate facsimiles of pretty well any fine art work. The seven surviving versions of Mona Lisa bear witness to the fact that in the 16th century, artists seemed perfectly content to assign the reproduction of their creations to their workshop apprentices as regular ‘bread and butter’ work. And today the task of reproducing pictures is incomparably more simple and reliable, with reprographic techniques that allow the production of high-quality prints made exactly to the original scale, with faithful colour values, and even with duplication of the surface relief of the painting.",
  "But despite an implicit recognition that the spread of good reproductions can be culturally valuable, museums continue to promote the special status of original work. Unfortunately, this seems to place severe limitations on the kind of experience offered to visitors.",
  "One limitation is related to the way the museum presents its exhibits. As repositories of unique historical objects, art museums are often called ‘treasure houses’. We are reminded of this even before we view a collection by the presence of security guards, attendants, ropes and display cases to keep us away from the exhibits. In many cases, the architectural style of the building further reinforces that notion. In addition, a major collection like that of London’s National Gallery is housed in numerous rooms, each with dozens of works, any one of which is likely to be worth more than all the average visitor possesses. In a society that judges the personal status of the individual so much by their material worth, it is therefore difficult not to be impressed by one’s own relative ‘worthlessness’ in such an environment.",
  "Furthermore, consideration of the ‘value’ of the original work in its treasure-house setting impresses upon the viewer that, since these works were originally produced, they have been assigned a huge monetary value by some person or institution more powerful than themselves. Evidently, nothing the viewer thinks about the work is going to alter that value, and so today’s viewer is deterred from trying to extend that spontaneous, immediate, self-reliant kind of reading which would originally have met the work.",
  "The visitor may then be struck by the strangeness of seeing such diverse paintings, drawings and sculptures brought together in an environment for which they were not originally created. This ‘displacement effect’ is further heightened by the sheer volume of exhibits. In the case of a major collection, there are probably more works on display than we could realistically view in weeks or even months.",
  "This is particularly distressing because time seems to be a vital factor in the appreciation of all art forms. A fundamental difference between paintings and other art forms is that there is no prescribed time over which a painting is viewed. By contrast, the audience encounters an opera or a play over a specific time, which is the duration of the performance. Similarly, novels and poems are read in a prescribed temporal sequence, whereas a picture has no clear place at which to start viewing, or at which to finish. Thus art works themselves encourage us to view them superficially, without appreciating the richness of detail and labour that is involved.",
  "Consequently, the dominant critical approach becomes that of the art historian, a specialised academic approach devoted to ‘discovering the meaning’ of art within the cultural context of its time. This is in perfect harmony with the museum’s function, since the approach is dedicated to seeking out and conserving ‘authentic’, ‘original’ readings of the exhibits. Again, this seems to put paid to that spontaneous, participatory criticism which can be found in abundance in criticism of classic works of literature, but is absent from most art history.",
  "The displays of art museums serve as a warning of what critical practices can emerge when spontaneous criticism is suppressed. The museum public, like any other audience, experience art more rewardingly when given the confidence to express their views. If appropriate works of fine art could be rendered permanently accessible to the public by means of high-fidelity reproductions, as literature and music already are, the public may feel somewhat less in awe of them. Unfortunately, that may be too much to ask from those who seek to maintain and control the art establishment.",
];

const summaryOptions = [
  { letter: "A", text: "institution" },
  { letter: "B", text: "mass production" },
  { letter: "C", text: "mechanical processes" },
  { letter: "D", text: "public" },
  { letter: "E", text: "paints" },
  { letter: "F", text: "artist" },
  { letter: "G", text: "size" },
  { letter: "H", text: "underlying ideas" },
  { letter: "I", text: "basic technology" },
  { letter: "J", text: "readers" },
  { letter: "K", text: "picture frames" },
  { letter: "L", text: "assistants" },
];

const art: ReadingPart = {
  id: "cambridge-10-test-2-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "Museums of fine art and their public",
  subtitle: "The fact that people go to the Louvre museum in Paris to see the original painting Mona Lisa when they can see a reproduction anywhere leads us to question some assumptions about the role of museums of fine art in today’s world.",
  sections: [{ id: "cambridge-10-test-2-part3-passage", format: "pre", paragraphs: artText }],
  questionBlocks: [
    {
      ...rawFillBlock(
        "cambridge-10-test-2-part3-questions-27-31",
        "Questions 27–31",
        "Questions 27–31\nComplete the summary using the list of words, A–L, below. Write the correct letter, A–L.\n\nThe value attached to original works of art\nPeople go to art museums because they accept the value of seeing an original work of art. But they do not go to museums to read original manuscripts of novels, perhaps because the availability of novels has depended on 27 ______ for so long, and also because with novels, the 28 ______ are the most important thing.\n\nHowever, in historical times artists such as Leonardo were happy to instruct 29 ______ to produce copies of their work and these days new methods of reproduction allow excellent replication of surface relief features as well as colour and 30 ______.\n\nIt is regrettable that museums still promote the superiority of original works of art, since this may not be in the interests of the 31 ______.\n\nA institution\nB mass production\nC mechanical processes\nD public\nE paints\nF artist\nG size\nH underlying ideas\nI basic technology\nJ readers\nK picture frames\nL assistants",
        27,
        31,
      ),
      questions: [27, 28, 29, 30, 31].map((number) => ({ number, before: "Question " + number })),
      wordBank: summaryOptions.map((option) => option.letter),
    },
    {
      id: "cambridge-10-test-2-part3-questions-32-35",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D.",
      questions: [
        {
          questionNumbers: [32],
          prompt: "The writer mentions London’s National Gallery to illustrate",
          options: [
            { letter: "A", text: "the undesirable cost to a nation of maintaining a huge collection of art" },
            { letter: "B", text: "the conflict that may arise in society between financial and artistic values" },
            { letter: "C", text: "the negative effect a museum can have on visitors’ opinions of themselves" },
            { letter: "D", text: "the need to put individual well-being above large-scale artistic schemes" },
          ],
        },
        {
          questionNumbers: [33],
          prompt: "The writer says that today, viewers may be unwilling to criticise a work because",
          options: [
            { letter: "A", text: "they lack the knowledge needed to support an opinion" },
            { letter: "B", text: "they fear it may have financial implications" },
            { letter: "C", text: "they have no real concept of the work’s value" },
            { letter: "D", text: "they feel their personal reaction is of no significance" },
          ],
        },
        {
          questionNumbers: [34],
          prompt: "According to the writer, the ‘displacement effect’ on the visitor is caused by",
          options: [
            { letter: "A", text: "the variety of works on display and the way they are arranged" },
            { letter: "B", text: "the impossibility of viewing particular works of art over a long period" },
            { letter: "C", text: "the similar nature of the paintings and the lack of great works" },
            { letter: "D", text: "the inappropriate nature of the individual works selected for exhibition" },
          ],
        },
        {
          questionNumbers: [35],
          prompt: "The writer says that unlike other forms of art, a painting does not",
          options: [
            { letter: "A", text: "involve direct contact with an audience" },
            { letter: "B", text: "require a specific location for a performance" },
            { letter: "C", text: "need the involvement of other professionals" },
            { letter: "D", text: "have a specific beginning or end" },
          ],
        },
      ],
    },
    rawFillBlock(
      "cambridge-10-test-2-part3-questions-36-40",
      "Questions 36–40",
      "Questions 36–40\nDo the following statements agree with the views of the writer in Reading Passage 3?\n\nIn boxes 36–40 on your answer sheet, write\nYES if the statement agrees with the views of the writer\nNO if the statement contradicts the views of the writer\nNOT GIVEN if it is impossible to say what the writer thinks about this\n\n36 Art history should focus on discovering the meaning of art using a range of media.\n37 The approach of art historians conflicts with that of art museums.\n38 People should be encouraged to give their opinions openly on works of art.\n39 Reproductions of fine art should only be sold to the public if they are of high quality.\n40 In the future, those with power are likely to encourage more people to enjoy art.",
      36,
      40,
    ),
  ],
  source: {
    passagePages: [sourcePage(41), sourcePage(42)],
    questionPages: [sourcePage(43), sourcePage(44), sourcePage(45)],
    answerPages: [sourcePage(146)],
    explanationPages: [77, 78, 79, 80, 81, 82, 83, 84].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集10精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE10_TEST2_PARTS: ReadingPart[] = [tea, gifted, art];

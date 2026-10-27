import type { ReadingPart, ReadingOption } from "./reading";
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

const trueFalseNotGiven: ReadingOption[] = [
  { letter: "TRUE", text: "TRUE" },
  { letter: "FALSE", text: "FALSE" },
  { letter: "NOT GIVEN", text: "NOT GIVEN" },
];

const yesNoNotGiven: ReadingOption[] = [
  { letter: "YES", text: "YES" },
  { letter: "NO", text: "NO" },
  { letter: "NOT GIVEN", text: "NOT GIVEN" },
];

const batParagraphOptions: ReadingOption[] = "ABCDE".split("").map((letter) => ({
  letter,
  text: "Paragraph " + letter,
}));

const batPassageHeadings: ReadingOption[] = [
  { letter: "i", text: "Scientists’ call for a revision of policy" },
  { letter: "ii", text: "An explanation for reduced water use" },
  { letter: "iii", text: "How a global challenge was met" },
  { letter: "iv", text: "Irrigation systems fall into disuse" },
  { letter: "v", text: "Environmental effects" },
  { letter: "vi", text: "The financial cost of recent technological improvements" },
  { letter: "vii", text: "The relevance to health" },
  { letter: "viii", text: "Addressing the concern over increasing populations" },
  { letter: "ix", text: "A surprising downward trend in demand for water" },
  { letter: "x", text: "The need to raise standards" },
  { letter: "xi", text: "A description of ancient water supplies" },
];

const batPartOne: ReadingPart = {
  id: "cambridge-7-test-1-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "Reading Passage 1",
  sections: [
    {
      id: "c7t1-p1-a",
      heading: "Paragraph A",
      paragraphs: [
        "Bats have a problem: how to find their way around in the dark. They hunt at night, and cannot use light to help them find prey and avoid obstacles. You might say that this is a problem of their own making, one that they could avoid simply by changing their habits and hunting by day. But the daytime economy is already heavily exploited by other creatures such as birds. Given that there is a living to be made at night, and given that alternative daytime trades are thoroughly occupied, natural selection has favoured bats that make a go of the night-hunting trade. It is probable that the nocturnal trades go way back in the ancestry of all mammals. In the time when the dinosaurs dominated the daytime economy, our mammalian ancestors probably only managed to survive at all because they found ways of scraping a living at night. Only after the mysterious mass extinction of the dinosaurs about 65 million years ago were our ancestors able to emerge into the daylight in any substantial numbers.",
      ],
    },
    {
      id: "c7t1-p1-b",
      heading: "Paragraph B",
      paragraphs: [
        "Bats have an engineering problem: how to find their way and find their prey in the absence of light. Bats are not the only creatures to face this difficulty today. Obviously the night-flying insects that they prey on must find their way about somehow. Deep-sea fish and whales have little or no light by day or by night. Fish and dolphins that live in extremely muddy water cannot see because, although there is light, it is obstructed and scattered by the dirt in the water. Plenty of other modern animals make their living in conditions where seeing is difficult or impossible.",
      ],
    },
    {
      id: "c7t1-p1-c",
      heading: "Paragraph C",
      paragraphs: [
        "Given the questions of how to manoeuvre in the dark, what solutions might an engineer consider? The first one that might occur to him is to manufacture light, to use a lantern or a searchlight. Fireflies and some fish (usually with the help of bacteria) have the power to manufacture their own light, but the process seems to consume a large amount of energy. Fireflies use their light for attracting mates. This doesn't require a prohibitive amount of energy: a male's tiny pinprick of light can be seen by a female from some distance on a dark night, since her eyes are exposed directly to the light source itself. However, using light to find one's own way around requires vastly more energy, since the eyes have to detect the tiny fraction of the light that bounces off each part of the scene. The light source must therefore be immensely brighter if it is to be used as a headlight to illuminate the path, than if it is to be used as a signal to others. In any event, whether or not the reason is the energy expense, it seems to be the case that, with the possible exception of some weird deep-sea fish, no animal apart from man uses manufactured light to find its way about.",
      ],
    },
    {
      id: "c7t1-p1-d",
      heading: "Paragraph D",
      paragraphs: [
        "What else might the engineer think of? Well, blind humans sometimes seem to have an uncanny sense of obstacles in their path. It has been given the name ‘facial vision’, because blind people have reported that it feels a bit like the sense of touch, on the face. One report tells of a totally blind boy who could ride his tricycle at good speed round the block near his home, using facial vision. Experiments showed that, in fact, facial vision is nothing to do with touch or the front of the face, although the sensation may be referred to the front of the face, like the referred pain in a phantom limb. The sensation of facial vision, it turns out, really goes in through the ears. Blind people, without even being aware of the fact, are actually using echoes of their own footsteps and of other sounds, to sense the presence of obstacles. Before this was discovered, engineers had already built instruments to exploit the principle, for example to measure the depth of the sea under a ship. After this technique had been invented, it was only a matter of time before weapons designers adapted it for the detection of submarines. Both sides in the Second World War relied heavily on these devices, under such codenames as Asdic (British) and Sonar (American), as well as Radar (American) or RDF (British), which uses radio echoes rather than sound echoes.",
      ],
    },
    {
      id: "c7t1-p1-e",
      heading: "Paragraph E",
      paragraphs: [
        "The Sonar and Radar pioneers didn't know it then, but all the world now knows that bats, or rather natural selection working on bats, had perfected the system tens of millions of years earlier, and their ‘radar’ achieves feats of detection and navigation that would strike an engineer dumb with admiration. It is technically incorrect to talk about bat ‘radar’, since they do not use radio waves. It is sonar. But the underlying mathematical theories of radar and sonar are very similar, and much of our scientific understanding of the details of what bats are doing has come from applying radar theory to them. The American zoologist Donald Griffin, who was largely responsible for the discovery of sonar in bats, coined the term ‘echolocation’ to cover both sonar and radar, whether used by animals or by human instruments.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c7t1-p1-paragraph-matching",
      type: "choice",
      instruction: "Reading Passage 1 has five paragraphs, A–E. Which paragraph contains each piece of information? Write the correct letter, A–E. You may use any letter more than once.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [1], prompt: "examples of wildlife other than bats which do not rely on vision to navigate", options: batParagraphOptions },
        { questionNumbers: [2], prompt: "how early mammals avoided dying out", options: batParagraphOptions },
        { questionNumbers: [3], prompt: "why bats hunt in the dark", options: batParagraphOptions },
        { questionNumbers: [4], prompt: "how a particular discovery has helped our understanding of bats", options: batParagraphOptions },
        { questionNumbers: [5], prompt: "early military uses of echolocation", options: batParagraphOptions },
      ],
    },
    {
      id: "c7t1-p1-facial-vision-summary",
      type: "fill",
      title: "",
      instruction: "Complete the summary. Choose ONE WORD ONLY from the passage for each answer.",
      questions: [6, 7, 8, 9].map((number) => ({ number, before: "Question " + number })),
      rawText: "Questions 6–9\nComplete the summary below. Choose ONE WORD ONLY from the passage for each answer.\nWrite your answers in boxes 6–9 on your answer sheet.\n\nFacial Vision\nBlind people report that so-called ‘facial vision’ is comparable to the sensation of touch on the face. In fact, the sensation is more similar to the way in which pain from a 6 ...... arm or leg might be felt. The ability actually comes from perceiving 7 ...... through the ears. However, even before this was understood, the principle had been applied in the design of instruments which calculated the 8 ...... of the seabed. This was followed by a wartime application in devices for finding 9 ...... .",
    },
    {
      id: "c7t1-p1-completion",
      type: "fill",
      title: "",
      instruction: "Complete the sentences. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
      questions: [
        { number: 10, before: "Long before the invention of radar, ", after: " had resulted in a sophisticated radar-like system in bats." },
        { number: 11, before: "Radar is an inaccurate term when referring to bats because ", after: " are not used in their navigation system." },
        { number: 12, before: "Radar and sonar are based on similar ", after: "." },
        { number: 13, before: "The word ‘echolocation’ was first used by someone working as a ", after: "." },
      ],
    },
  ],
  source: partSource([11, 12], [13, 14]),
};

const waterHeadings: ReadingOption[] = [
  { letter: "i", text: "Scientists’ call for a revision of policy" },
  { letter: "ii", text: "An explanation for reduced water use" },
  { letter: "iii", text: "How a global challenge was met" },
  { letter: "iv", text: "Irrigation systems fall into disuse" },
  { letter: "v", text: "Environmental effects" },
  { letter: "vi", text: "The financial cost of recent technological improvements" },
  { letter: "vii", text: "The relevance to health" },
  { letter: "viii", text: "Addressing the concern over increasing populations" },
  { letter: "ix", text: "A surprising downward trend in demand for water" },
  { letter: "x", text: "The need to raise standards" },
  { letter: "xi", text: "A description of ancient water supplies" },
];

const waterPartTwo: ReadingPart = {
  id: "cambridge-7-test-1-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 on the following pages.",
  title: "MAKING EVERY DROP COUNT",
  sections: [
    {
      id: "c7t1-p2-a",
      heading: "Paragraph A",
      headingQuestionNumber: 14,
      paragraphs: [
        "The history of human civilisation is entwined with the history of the ways we have learned to manipulate water resources. As towns gradually expanded, water was brought from increasingly remote sources, leading to sophisticated engineering efforts such as dams and aqueducts. At the height of the Roman Empire, nine major systems, with an innovative layout of pipes and well-built sewers, supplied the occupants of Rome with as much water per person as is provided in many parts of the industrial world today.",
      ],
    },
    {
      id: "c7t1-p2-b",
      heading: "Paragraph B (example: iii)",
      paragraphs: [
        "During the industrial revolution and population explosion of the 19th and 20th centuries, the demand for water rose dramatically. Unprecedented construction of tens of thousands of monumental engineering projects designed to control floods, protect clean water supplies, and provide water for irrigation and hydropower brought great benefits to hundreds of millions of people. Food production has kept pace with soaring populations mainly because of the expansion of artificial irrigation systems that make possible the growth of 40% of the world's food. Nearly one fifth of all the electricity generated worldwide is produced by turbines spun by the power of falling water.",
      ],
    },
    {
      id: "c7t1-p2-c",
      heading: "Paragraph C",
      headingQuestionNumber: 15,
      paragraphs: [
        "Yet there is a dark side to this picture: despite our progress, half of the world's population still suffers, with water services inferior to those available to the ancient Greeks and Romans. As the United Nations report on access to water reiterated in November 2001, more than one billion people lack access to clean drinking water; some two and a half billion do not have adequate sanitation services. Preventable water-related diseases kill an estimated 10,000 to 20,000 children every day, and the latest evidence suggests that we are falling behind in efforts to solve these problems.",
      ],
    },
    {
      id: "c7t1-p2-d",
      heading: "Paragraph D",
      headingQuestionNumber: 16,
      paragraphs: [
        "The consequences of our water policies extend beyond jeopardising human health. Tens of millions of people have been forced to move from their homes — often with little warning or compensation — to make way for the reservoirs behind dams. More than 20% of all freshwater fish species are now threatened or endangered because dams and water withdrawals have destroyed the free-flowing river ecosystems where they thrive. Certain irrigation practices degrade soil quality and reduce agricultural productivity. Groundwater aquifers* are being pumped down faster than they are naturally replenished in parts of India, China, the USA and elsewhere. And disputes over shared water resources have led to violence and continue to raise local, national and even international tensions.\n\n* underground stores of water",
      ],
    },
    {
      id: "c7t1-p2-e",
      heading: "Paragraph E",
      headingQuestionNumber: 17,
      paragraphs: [
        "At the outset of the new millennium, however, the way resource planners think about water is beginning to change. The focus is slowly shifting back to the provision of basic human and environmental needs as top priority — ensuring ‘some for all,’ instead of ‘more for some’. Some water experts are now demanding that existing infrastructure be used in smarter ways rather than building new facilities, which is increasingly considered the option of last, not first, resort. This shift in philosophy has not been universally accepted, and it comes with strong opposition from some established water organisations. Nevertheless, it may be the only way to address successfully the pressing problems of providing everyone with clean water to drink, adequate water to grow food and a life free from preventable water-related illness.",
      ],
    },
    {
      id: "c7t1-p2-f",
      heading: "Paragraph F",
      headingQuestionNumber: 18,
      paragraphs: [
        "Fortunately — and unexpectedly — the demand for water is not rising as rapidly as some predicted. As a result, the pressure to build new water infrastructures has diminished over the past two decades. Although population, industrial output and economic productivity have continued to soar in developed nations, the rate at which people withdraw water from aquifers, rivers and lakes has slowed. And in a few parts of the world, demand has actually fallen.",
      ],
    },
    {
      id: "c7t1-p2-g",
      heading: "Paragraph G",
      headingQuestionNumber: 19,
      paragraphs: [
        "What explains this remarkable turn of events? Two factors: people have figured out how to use water more efficiently, and communities are rethinking their priorities for water use. Throughout the first three-quarters of the 20th century, the quantity of freshwater consumed per person doubled on average; in the USA, water withdrawals increased tenfold while the population quadrupled. But since 1980, the amount of water consumed per person has actually decreased, thanks to a range of new technologies that help to conserve water in homes and industry. In 1965, for instance, Japan used approximately 13 million gallons* of water to produce $1 million of commercial output; by 1989 this had dropped to 3.5 million gallons (even accounting for inflation) — almost a quadrupling of water productivity. In the USA, water withdrawals have fallen by more than 20% from their peak in 1980.",
      ],
    },
    {
      id: "c7t1-p2-h",
      heading: "Paragraph H",
      headingQuestionNumber: 20,
      paragraphs: [
        "On the other hand, dams, aqueducts and other kinds of infrastructure will still have to be built, particularly in developing countries where basic human needs have not been met. But such projects must be built to higher specifications and with more accountability to local people and their environment than in the past. And even in regions where new projects seem warranted, we must find ways to meet demands with fewer resources, respecting ecological criteria and to a smaller budget.\n\n* 1 gallon: 4.546 litres",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c7t1-p2-headings",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 2 has seven paragraphs, A–H, with Paragraph B as the example. Choose the correct heading for paragraphs A and C–H. Write the correct number, i–xi.",
      options: waterHeadings.map((option) => ({ id: option.letter, text: option.text })),
      questionNumbers: [14, 15, 16, 17, 18, 19, 20],
    },
    {
      id: "c7t1-p2-yes-no",
      type: "choice",
      instruction: "Do the following statements agree with the information given in Reading Passage 2? In boxes 21-26 on your answer sheet, write YES if the statement agrees with the claims of the writer NO if the statement contradicts the claims of the writer NOT GIVEN if it is impossible to say what the writer thinks about this",
      questions: [
        { questionNumbers: [21], prompt: "Water use per person is higher in the industrial world than it was in Ancient Rome.", options: yesNoNotGiven },
        { questionNumbers: [22], prompt: "Feeding increasing populations is possible due primarily to improved irrigation systems.", options: yesNoNotGiven },
        { questionNumbers: [23], prompt: "Modern water systems imitate those of the ancient Greeks and Romans.", options: yesNoNotGiven },
        { questionNumbers: [24], prompt: "Industrial growth is increasing the overall demand for water.", options: yesNoNotGiven },
        { questionNumbers: [25], prompt: "Modern technologies have led to a reduction in domestic water consumption.", options: yesNoNotGiven },
        { questionNumbers: [26], prompt: "In the future, governments should maintain ownership of water infrastructures.", options: yesNoNotGiven },
      ],
    },
  ],
  source: partSource([16, 17], [15, 18]),
};

const suggestopediaWordBank: ReadingOption[] = [
  { letter: "A", text: "spectacular" },
  { letter: "B", text: "teaching" },
  { letter: "C", text: "lesson" },
  { letter: "D", text: "authoritarian" },
  { letter: "E", text: "unpopular" },
  { letter: "F", text: "ritual" },
  { letter: "G", text: "unspectacular" },
  { letter: "H", text: "placebo" },
  { letter: "I", text: "involved" },
  { letter: "J", text: "appropriate" },
  { letter: "K", text: "well known" },
];

const learningMultipleChoice: ReadingOption[][] = [
  [
    { letter: "A", text: "the power of suggestion in learning." },
    { letter: "B", text: "a particular technique for learning based on emotions." },
    { letter: "C", text: "the effects of emotion on the imagination and the unconscious." },
    { letter: "D", text: "ways of learning which are not traditional." },
  ],
  [
    { letter: "A", text: "unimportant details are the easiest to recall." },
    { letter: "B", text: "concentrating hard produces the best results." },
    { letter: "C", text: "the most significant facts are most easily recalled." },
    { letter: "D", text: "peripheral vision is not important." },
  ],
  [
    { letter: "A", text: "both of these are important for developing concentration." },
    { letter: "B", text: "his theory about methods of learning is valid." },
    { letter: "C", text: "reading is a better technique for learning than listening." },
    { letter: "D", text: "we can remember things more easily under hypnosis." },
  ],
  [
    { letter: "A", text: "memorise details of the curriculum." },
    { letter: "B", text: "develop their own sets of indirect instructions." },
    { letter: "C", text: "think about something other than the curriculum content." },
    { letter: "D", text: "avoid overloading the capacity of the brain." },
  ],
];

const suggestopediaWordBankText = suggestopediaWordBank.map((option) => option.letter + " " + option.text).join("\n");

const psychePartThree: ReadingPart = {
  id: "cambridge-7-test-1-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "EDUCATING PSYCHE",
  sections: [
    {
      id: "c7t1-p3-main",
      paragraphs: [
        "Educating Psyche by Bernie Neville is a book which looks at radical new approaches to learning, describing the effects of emotion, imagination and the unconscious on learning. One theory discussed in the book is that proposed by George Lozanov, which focuses on the power of suggestion.",
        "Lozanov's instructional technique is based on the evidence that the connections made in the brain through unconscious processing (which he calls non-specific mental reactivity) are more durable than those made through conscious processing. Besides the laboratory evidence for this, we know from our experience that we often remember what we have perceived peripherally, long after we have forgotten what we set out to learn. If we think of a book we studied months or years ago, we will find it easier to recall peripheral details — the colour, the binding, the typeface, the table at the library where we sat while studying it — than the content on which we were concentrating. If we think of a lecture we listened to with great concentration, we will recall the lecturer's appearance and mannerisms, our place in the auditorium, the failure of the air-conditioning, much more easily than the ideas we went to learn. Even if these peripheral details are a bit elusive, they come back readily in hypnosis or when we relive the event imaginatively, as in psychodrama. The details of the content of the lecture, on the other hand, seem to have gone forever.",
        "This phenomenon can be partly attributed to the common counterproductive approach to study (making extreme efforts to memorise, tensing muscles, inducing fatigue), but it also simply reflects the way the brain functions. Lozanov therefore made indirect instruction (suggestion) central to his teaching system. In suggestopedia, as he called his method, consciousness is shifted away from the curriculum to focus on something peripheral. The curriculum then becomes peripheral and is dealt with by the reserve capacity of the brain.",
        "The suggestopedic approach to foreign language learning provides a good illustration. In its most recent variant (1980), it consists of the reading of vocabulary and text while the class is listening to music. The first session is in two parts. In the first part, the music is classical (Mozart, Beethoven, Brahms) and the teacher reads the text slowly and solemnly, with attention to the dynamics of the music. The students follow the text in their books. This is followed by several minutes of silence. In the second part, they listen to baroque music (Bach, Corelli, Handel) while the teacher reads the text in a normal speaking voice. During this time they have their books closed. During the whole of this session, their attention is passive; they listen to the music but make no attempt to learn the material.",
        "Beforehand, the students have been carefully prepared for the language learning experience. Through meeting with the staff and satisfied students they develop the expectation that learning will be easy and pleasant and that they will successfully learn several hundred words of the foreign language during the class. In a preliminary talk, the teacher introduces them to the material to be covered, but does not ‘teach’ it. Likewise, the students are instructed not to try to learn it during this introduction.",
        "Some hours after the two-part session, there is a follow-up class at which the students are stimulated to recall the material presented. Once again the approach is indirect. The students do not focus their attention on trying to remember the vocabulary, but focus on using the language to communicate (e.g. through games or improvised dramatisations). Such methods are not unusual in language teaching. What is distinctive in the suggestopedic method is that they are devoted entirely to assisting recall. The ‘learning’ of the material is assumed to be automatic and effortless, accomplished while listening to music. The teacher's task is to assist the students to apply what they have learned paraconsciously, and in doing so to make it easily accessible to consciousness. Another difference from conventional teaching is the evidence that students can regularly learn 1000 new words of a foreign language during a suggestopedic session, as well as grammar and idiom.",
        "Lozanov experimented with teaching by direct suggestion during sleep, hypnosis and trance states, but found such procedures unnecessary. Hypnosis, yoga, Silva mind-control, religious ceremonies and faith healing are all associated with successful suggestion, but none of their techniques seem to be essential to it. Such rituals may be seen as placebos. Lozanov acknowledges that the ritual surrounding suggestion in his own system is also a ‘placebo’, but maintains that without such a placebo people are unable or afraid to tap the reserve capacity of their brains. Like any placebo, it must be dispensed with authority to be effective. Just as a doctor calls on the full power of autocratic suggestion by insisting that the patient take precisely this white capsule precisely three times a day before meals, Lozanov is categoric in insisting that the suggestopedic session be conducted exactly in the manner designated, by trained and accredited suggestopedic teachers.",
        "While suggestopedia has gained some notoriety through success in the teaching of modern languages, few teachers are able to emulate the spectacular results of Lozanov and his associates. We can, perhaps, attribute mediocre results to an inadequate placebo effect. The students have not developed the appropriate mind set. They are often not motivated to learn through this method. They do not have enough ‘faith’. They do not see it as ‘real teaching’, especially as it does not seem to involve the ‘work’ they have learned to believe is essential to learning.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c7t1-p3-multiple-choice",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D.",
      questions: [
        { questionNumbers: [27], prompt: "The book Educating Psyche is mainly concerned with", options: learningMultipleChoice[0] },
        { questionNumbers: [28], prompt: "Lozanov’s theory claims that, when we try to remember things,", options: learningMultipleChoice[1] },
        { questionNumbers: [29], prompt: "In this passage, the author uses the examples of a book and a lecture to illustrate that", options: learningMultipleChoice[2] },
        { questionNumbers: [30], prompt: "Lozanov claims that teachers should train students to", options: learningMultipleChoice[3] },
      ],
    },
    {
      id: "c7t1-p3-true-false",
      type: "choice",
      instruction: "Do the following statements agree with the information given in Reading Passage 3? In boxes 31-36 on your answer sheet, write TRUE if the statement agrees with the information FALSE if the statement contradicts the information NOT GIVEN if there is no information on this",
      questions: [
        { questionNumbers: [31], prompt: "In the example of suggestopedic teaching in the fourth paragraph, the only variable that changes is the music.", options: trueFalseNotGiven },
        { questionNumbers: [32], prompt: "Prior to the suggestopedia class, students are made aware that the language experience will be demanding.", options: trueFalseNotGiven },
        { questionNumbers: [33], prompt: "In the follow-up class, the teaching activities are similar to those used in conventional classes.", options: trueFalseNotGiven },
        { questionNumbers: [34], prompt: "As an indirect benefit, students notice improvements in their memory.", options: trueFalseNotGiven },
        { questionNumbers: [35], prompt: "Teachers say they prefer suggestopedia to traditional approaches to language teaching.", options: trueFalseNotGiven },
        { questionNumbers: [36], prompt: "Students in a suggestopedia class retain more new vocabulary than those in ordinary classes.", options: trueFalseNotGiven },
      ],
    },
    {
      id: "c7t1-p3-summary",
      type: "fill",
      title: "",
      instruction: "Complete the summary using the list of words A–K. Write the correct letter for each answer.",
      questions: [37, 38, 39, 40].map((number) => ({ number, before: "Question " + number })),
      rawText: "Questions 37–40\nComplete the summary using the list of words, A–K, below.\nWrite the correct letter, A–K, in boxes 37–40 on your answer sheet.\n\nSuggestopedia uses a less direct method of suggestion than other techniques such as hypnosis. However, Lozanov admits that a certain amount of 37 ...... is necessary in order to convince students, even if this is just a 38 ...... . Furthermore, if the method is to succeed, teachers must follow a set procedure. Although Lozanov’s method has become quite 39 ......, the results of most other teachers using this method have been 40 ...... .\n\n" + suggestopediaWordBankText,
      wordBank: suggestopediaWordBank.map((option) => option.letter),
    },
  ],
  source: partSource([19, 20], [21, 22]),
};

export const CAMBRIDGE7_TEST1_PARTS: ReadingPart[] = [batPartOne, waterPartTwo, psychePartThree];

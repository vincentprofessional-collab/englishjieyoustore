import type { ReadingOption, ReadingPart } from "./reading";

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

const dictionaryStatements: ReadingOption[] = [
  { letter: "A", text: "It avoided all scholarly words." },
  { letter: "B", text: "It was the only English dictionary in general use for 200 years." },
  { letter: "C", text: "It was famous because of the large number of people involved." },
  { letter: "D", text: "It focused mainly on language from contemporary texts." },
  { letter: "E", text: "There was a time limit for its completion." },
  { letter: "F", text: "It ignored work done by previous dictionary writers." },
  { letter: "G", text: "It took into account subtleties of meaning." },
  { letter: "H", text: "Its definitions were famous for their originality." },
];

const milgramParagraphs: ReadingOption[] = "ABCDEFGHI".split("").map((letter) => ({
  letter,
  text: `Paragraph ${letter}`,
}));

const environmentWords: ReadingOption[] = [
  { letter: "A", text: "unrealistic" },
  { letter: "B", text: "agreed" },
  { letter: "C", text: "expensive" },
  { letter: "D", text: "right" },
  { letter: "E", text: "long-term" },
  { letter: "F", text: "usual" },
  { letter: "G", text: "surprising" },
  { letter: "H", text: "personal" },
  { letter: "I", text: "urgent" },
];

const cambridge5Test1PartOne: ReadingPart = {
  id: "cambridge-5-test-1-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "Johnson's Dictionary",
  sections: [
    {
      id: "c5t1-p1-a",
      paragraphs: [
        "For the century before Johnson's Dictionary was published in 1755, there had been concern about the state of the English language. There was no standard way of speaking or writing and no agreement as to the best way of bringing some order to the chaos of English spelling. Dr Johnson provided the solution.",
      ],
    },
    {
      id: "c5t1-p1-b",
      paragraphs: [
        "There had, of course, been dictionaries in the past, the first of these being a little book of some 120 pages, compiled by a certain Robert Cawdray, published in 1604 under the title A Table Alphabetical ‘of hard usuall English wordes’. Like the various dictionaries that came after it during the seventeenth century, Cawdray's tended to concentrate on ‘scholarly’ words; one function of the dictionary was to enable its student to convey an impression of fine learning.",
      ],
    },
    {
      id: "c5t1-p1-c",
      paragraphs: [
        "Beyond the practical need to make order out of chaos, the rise of dictionaries is associated with the rise of the English middle class, who were anxious to define and circumscribe the various worlds to conquer—lexical as well as social and commercial. It is highly appropriate that Dr Samuel Johnson, the very model of an eighteenth-century literary man, as famous in his own time as in ours, should have published his Dictionary at the very beginning of the heyday of the middle class.",
      ],
    },
    {
      id: "c5t1-p1-d",
      paragraphs: [
        "Johnson was a poet and critic who raised common sense to the heights of genius. His approach to the problems that had worried writers throughout the late seventeenth and early eighteenth centuries was intensely practical. Up until his time, the task of producing a dictionary on such a large scale had seemed impossible without the establishment of an academy to make decisions about right and wrong usage. Johnson decided he did not need an academy to settle arguments about language; he would write a dictionary himself; and he would do it single-handed. Johnson signed the contract for the Dictionary with the bookseller Robert Dodsley at a breakfast held at the Golden Anchor Inn near Holborn Bar on 18 June 1764. He was to be paid £1,575 in instalments, and from this he took money to rent 17 Gough Square, in which he set up his ‘dictionary workshop’.",
      ],
    },
    {
      id: "c5t1-p1-e",
      paragraphs: [
        "James Boswell, his biographer, described the garret where Johnson worked as ‘fitted up like a counting house’ with a long desk running down the middle at which the copying clerks would work standing up. Johnson himself was stationed on a rickety chair at an ‘old crazy deal table’ surrounded by a chaos of borrowed books. He was also helped by six assistants, two of whom died whilst the Dictionary was still in preparation.",
      ],
    },
    {
      id: "c5t1-p1-f",
      paragraphs: [
        "The work was immense; filling about eighty large notebooks (and without a library to hand), Johnson wrote the definitions of over 40,000 words, and illustrated their many meanings with some 114,000 quotations drawn from English writing on every subject, from the Elizabethans to his own time. He did not expect to achieve complete originality. Working to a deadline, he had to draw on the best of all previous dictionaries, and to make his work one of heroic synthesis. In fact, it was very much more. Unlike his predecessors, Johnson treated English very practically, as a living language, with many different shades of meaning. He adopted his definitions on the principle of English common law—according to precedent. After its publication, his Dictionary was not seriously rivalled for over a century.",
      ],
    },
    {
      id: "c5t1-p1-g",
      paragraphs: [
        "After many vicissitudes the Dictionary was finally published on 15 April 1755. It was instantly recognised as a landmark throughout Europe. ‘This very noble work,’ wrote the leading Italian lexicographer, ‘will be a perpetual monument of Fame to the Author, an Honour to his own Country in particular, and a general Benefit to the republic of Letters throughout Europe.’ The fact that Johnson had taken on the Academies of Europe and matched them (everyone knew that forty French academics had taken forty years to produce the first French national dictionary) was cause for much English celebration.",
      ],
    },
    {
      id: "c5t1-p1-h",
      paragraphs: [
        "Johnson had worked for nine years, ‘with little assistance of the learned, and without any patronage of the great; not in the soft obscurities of retirement, or under the shelter of academic bowers, but amidst inconvenience and distraction, in sickness and in sorrow.’ For all its faults and eccentricities his two-volume work is a masterpiece and a landmark, in his own words, ‘setting the orthography, displaying the analogy, regulating the structures, and ascertaining the significations of English words’. It is the cornerstone of Standard English, an achievement which, in James Boswell's words, ‘conferred stability on the language of his country’.",
      ],
    },
    {
      id: "c5t1-p1-i",
      paragraphs: [
        "The Dictionary, together with his other writing, made Johnson famous and so well esteemed that his friends were able to prevail upon King George III to offer him a pension. From then on, he was to become the Johnson of folklore.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c5t1-p1-dictionary-features",
      type: "choice",
      instruction: "Choose THREE letters A–H. Your answers may be given in any order. Write your answers in boxes 1–3 on your answer sheet.",
      questions: [
        {
          questionNumbers: [1, 2, 3],
          prompt: "Which THREE of the following statements are true of Johnson's Dictionary?",
          options: dictionaryStatements,
          selectCount: 3,
        },
      ],
    },
    {
      id: "c5t1-p1-summary",
      type: "fill",
      title: "",
      instruction: "Complete the summary. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 4–7 on your answer sheet.",
      questions: [4, 5, 6, 7].map((number) => ({ number, before: `Question ${number}` })),
      rawText: "In 1764 Dr Johnson accepted the contract to produce a dictionary. Having rented a garret, he took on a number of 4 ......, who stood at a long central desk. Johnson did not have a 5 ...... available to him, but eventually produced definitions of in excess of 40,000 words written down in 80 large notebooks. On publication, the Dictionary was immediately hailed in many European countries as a landmark. According to his biographer, James Boswell, Johnson's principal achievement was to bring 6 ...... to the English language. As a reward for his hard work, he was granted a 7 ...... by the king.",
    },
    {
      id: "c5t1-p1-true-false",
      type: "choice",
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 8–13 on your answer sheet write TRUE, FALSE or NOT GIVEN.",
      questions: [
        { questionNumbers: [8], prompt: "The growing importance of the middle classes led to an increased demand for dictionaries.", options: trueFalseNotGiven },
        { questionNumbers: [9], prompt: "Johnson has become more well known since his death.", options: trueFalseNotGiven },
        { questionNumbers: [10], prompt: "Johnson had been planning to write a dictionary for several years.", options: trueFalseNotGiven },
        { questionNumbers: [11], prompt: "Johnson set up an academy to help with the writing of his Dictionary.", options: trueFalseNotGiven },
        { questionNumbers: [12], prompt: "Johnson only received payment for his Dictionary on its completion.", options: trueFalseNotGiven },
        { questionNumbers: [13], prompt: "Not all of the assistants survived to see the publication of the Dictionary.", options: trueFalseNotGiven },
      ],
    },
  ],
};

const cambridge5Test1PartTwo: ReadingPart = {
  id: "cambridge-5-test-1-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 below.",
  title: "Nature or Nurture?",
  sections: [
    {
      id: "c5t1-p2-a",
      heading: "A",
      paragraphs: [
        "A few years ago, in one of the most fascinating and disturbing experiments in behavioural psychology, Stanley Milgram of Yale University tested 40 subjects from all walks of life for their willingness to obey instructions given by a ‘leader’ in a situation in which the subjects might feel a personal distaste for the actions they were called upon to perform. Specifically, Milgram told each volunteer ‘teacher-subject’ that the experiment was in the noble cause of education, and was designed to test whether or not punishing pupils for their mistakes would have a positive effect on the pupils' ability to learn.",
      ],
    },
    {
      id: "c5t1-p2-b",
      heading: "B",
      paragraphs: [
        "Milgram's experimental set-up involved placing the teacher-subject before a panel of thirty switches with labels ranging from ‘15 volts of electricity (slight shock)’ to ‘450 volts (danger—severe shock)’ in steps of 15 volts each. The teacher-subject was told that whenever the pupil gave the wrong answer to a question, a shock was to be administered, beginning at the lowest level and increasing in severity with each successive wrong answer. The supposed ‘pupil’ was in reality an actor hired by Milgram to simulate receiving the shocks by emitting a spectrum of groans, screams and writhings together with an assortment of statements and expletives denouncing both the experiment and the experimenter. Milgram told the teacher-subject to ignore the reactions of the pupil, and to administer whatever level of shock was called for, as per the rule governing the experimental situation of the moment.",
      ],
    },
    {
      id: "c5t1-p2-c",
      heading: "C",
      paragraphs: [
        "As the experiment unfolded, the pupil would deliberately give the wrong answers to questions posed by the teacher, thereby bringing on various electrical punishments, even up to the danger level of 300 volts and beyond. Many of the teacher-subjects balked at administering the higher levels of punishment, and turned to Milgram with questioning looks and/or complaints about continuing the experiment. In these situations, Milgram calmly explained that the teacher-subject was to ignore the pupil's cries for mercy and carry on with the experiment. If the subject was still reluctant to proceed, Milgram said that it was important for the sake of the experiment that the procedure be followed through to the end. His final argument was, ‘You have no other choice. You must go on.’ What Milgram was trying to discover was the number of teacher-subjects who would be willing to administer the highest levels of shock, even in the face of strong personal and moral revulsion against the rules and conditions of the experiment.",
      ],
    },
    {
      id: "c5t1-p2-d",
      heading: "D",
      paragraphs: [
        "Prior to carrying out the experiment, Milgram explained his idea to a group of 39 psychiatrists and asked them to predict the average percentage of people in an ordinary population who would be willing to administer the highest shock level of 450 volts. The overwhelming consensus was that virtually all the teacher-subjects would refuse to obey the experimenter. The psychiatrists felt that ‘most subjects would not go beyond 150 volts’ and they further anticipated that only four per cent would go up to 300 volts. Furthermore, they thought that only a lunatic fringe of about one in 1,000 would give the highest shock of 450 volts.",
      ],
    },
    {
      id: "c5t1-p2-e",
      heading: "E",
      paragraphs: [
        "What were the actual results? Well, over 60 per cent of the teacher-subjects continued to obey Milgram up to the 450-volt limit! In repetitions of the experiment in other countries, the percentage of obedient teacher-subjects was even higher, reaching 85 per cent in one country. How can we possibly account for this vast discrepancy between what calm, rational, knowledgeable people predict in the comfort of their study and what pressured, flustered, but cooperative ‘teachers’ actually do in the laboratory of real life?",
      ],
    },
    {
      id: "c5t1-p2-f",
      heading: "F",
      paragraphs: [
        "One's first inclination might be to argue that there must be some sort of built-in animal aggression instinct that was activated by the experiment, and that Milgram's teacher-subjects were just following a genetic need to discharge this pent-up primal urge onto the pupil by administering the electrical shock. A modern hard-core sociobiologist might even go so far as to claim that this aggressive instinct evolved as an advantageous trait, having been of survival value to our ancestors in their struggle against the hardships of life on the plains and in the caves, ultimately finding its way into our genetic make-up as a remnant of our ancient animal ways.",
      ],
    },
    {
      id: "c5t1-p2-g",
      heading: "G",
      paragraphs: [
        "An alternative to this notion of genetic programming is to see the teacher-subjects' actions as a result of the social environment under which the experiment was carried out. As Milgram himself pointed out, ‘Most subjects in the experiment see their behaviour in a larger context that is benevolent and useful to society—the pursuit of scientific truth. The psychological laboratory has a strong claim to legitimacy and evokes trust and confidence in those who perform there. An action such as shocking a victim, which in isolation appears evil, acquires a completely different meaning when placed in this setting.’",
      ],
    },
    {
      id: "c5t1-p2-h",
      heading: "H",
      paragraphs: [
        "Thus, in this explanation the subject merges his unique personality and personal and moral code with that of larger institutional structures, surrendering individual properties like loyalty, self-sacrifice and discipline to the service of malevolent systems of authority.",
      ],
    },
    {
      id: "c5t1-p2-i",
      heading: "I",
      paragraphs: [
        "Here we have two radically different explanations for why so many teacher-subjects were willing to forgo their sense of personal responsibility for the sake of an institutional authority figure. The problem for biologists, psychologists and anthropologists is to sort out which of these two polar explanations is more plausible. This, in essence, is the problem of modern sociobiology—to discover the degree to which hard-wired genetic programming dictates, or at least strongly biases, the interaction of animals and humans with their environment, that is, their behaviour. Put another way, sociobiology is concerned with elucidating the biological basis of all behaviour.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c5t1-p2-paragraph-matching",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has nine paragraphs, A–I. Which paragraph contains the following information? Write the correct letter A–I in boxes 14–19 on your answer sheet.",
      questions: [
        { questionNumbers: [14], prompt: "a biological explanation of the teacher-subjects' behaviour", options: milgramParagraphs },
        { questionNumbers: [15], prompt: "the explanation Milgram gave the teacher-subjects for the experiment", options: milgramParagraphs },
        { questionNumbers: [16], prompt: "the identity of the pupils", options: milgramParagraphs },
        { questionNumbers: [17], prompt: "the expected statistical outcome", options: milgramParagraphs },
        { questionNumbers: [18], prompt: "the general aim of sociobiological study", options: milgramParagraphs },
        { questionNumbers: [19], prompt: "the way Milgram persuaded the teacher-subjects to continue", options: milgramParagraphs },
      ],
    },
    {
      id: "c5t1-p2-multiple-choice",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write your answers in boxes 20–22 on your answer sheet.",
      questions: [
        {
          questionNumbers: [20],
          prompt: "The teacher-subjects were told that they were testing whether",
          options: [
            { letter: "A", text: "a 450-volt shock was dangerous." },
            { letter: "B", text: "punishment helps learning." },
            { letter: "C", text: "the pupils were honest." },
            { letter: "D", text: "they were suited to teaching." },
          ],
        },
        {
          questionNumbers: [21],
          prompt: "The teacher-subjects were instructed to",
          options: [
            { letter: "A", text: "stop when a pupil asked them to." },
            { letter: "B", text: "denounce pupils who made mistakes." },
            { letter: "C", text: "reduce the shock level after a correct answer." },
            { letter: "D", text: "give punishment according to a rule." },
          ],
        },
        {
          questionNumbers: [22],
          prompt: "Before the experiment took place the psychiatrists",
          options: [
            { letter: "A", text: "believed that a shock of 150 volts was too dangerous." },
            { letter: "B", text: "failed to agree on how the teacher-subjects would respond to instructions." },
            { letter: "C", text: "underestimated the teacher-subjects' willingness to comply with experimental procedure." },
            { letter: "D", text: "thought that many of the teacher-subjects would administer a shock of 450 volts." },
          ],
        },
      ],
    },
    {
      id: "c5t1-p2-true-false",
      type: "choice",
      instruction: "Do the following statements agree with the information given in Reading Passage 2? In boxes 23–26 on your answer sheet write TRUE, FALSE or NOT GIVEN.",
      questions: [
        { questionNumbers: [23], prompt: "Several of the subjects were psychology students at Yale University.", options: trueFalseNotGiven },
        { questionNumbers: [24], prompt: "Some people may believe that the teacher-subjects' behaviour could be explained as a positive survival mechanism.", options: trueFalseNotGiven },
        { questionNumbers: [25], prompt: "In a sociological explanation, personal values are more powerful than authority.", options: trueFalseNotGiven },
        { questionNumbers: [26], prompt: "Milgram's experiment solves an important question in sociobiology.", options: trueFalseNotGiven },
      ],
    },
  ],
};

const cambridge5Test1PartThree: ReadingPart = {
  id: "cambridge-5-test-1-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "The Truth about the Environment",
  sections: [
    {
      id: "c5t1-p3-a",
      paragraphs: [
        "For many environmentalists, the world seems to be getting worse. They have developed a hit-list of our main fears: that natural resources are running out; that the population is ever growing, leaving less and less to eat; that species are becoming extinct in vast numbers, and that the planet's air and water are becoming ever more polluted.",
      ],
    },
    {
      id: "c5t1-p3-b",
      paragraphs: [
        "But a quick look at the facts shows a different picture. First, energy and other natural resources have become more abundant, not less so, since the book ‘The Limits to Growth’ was published in 1972 by a group of scientists. Second, more food is now produced per head of the world's population than at any time in history. Fewer people are starving. Third, although species are indeed becoming extinct, only about 0.7% of them are expected to disappear in the next 50 years, not 25–50%, as has so often been predicted. And finally, most forms of environmental pollution either appear to have been exaggerated, or are transient—associated with the early phases of industrialisation and therefore best cured not by restricting economic growth, but by accelerating it. One form of pollution—the release of greenhouse gases that causes global warming—does appear to be a phenomenon that is going to extend well into our future, but its total impact is unlikely to pose a devastating problem. A bigger problem may well turn out to be an inappropriate response to it.",
      ],
    },
    {
      id: "c5t1-p3-c",
      paragraphs: [
        "Yet opinion polls suggest that many people nurture the belief that environmental standards are declining and four factors seem to cause this disjunction between perception and reality.",
      ],
    },
    {
      id: "c5t1-p3-d",
      paragraphs: [
        "One is the lopsidedness built into scientific research. Scientific funding goes mainly to areas with many problems. That may be wise policy, but it will also create an impression that many more potential problems exist than is the case.",
      ],
    },
    {
      id: "c5t1-p3-e",
      paragraphs: [
        "Secondly, environmental groups need to be noticed by the mass media. They also need to keep the money rolling in. Understandably, perhaps, they sometimes overstate their arguments. In 1997, for example, the World Wide Fund for Nature issued a press release entitled: ‘Two thirds of the world's forests lost forever’. The truth turns out to be nearer 20%.",
      ],
    },
    {
      id: "c5t1-p3-f",
      paragraphs: [
        "Though these groups are run overwhelmingly by selfless folk, they nevertheless share many of the characteristics of other lobby groups. That would matter less if people applied the same degree of scepticism to environmental lobbying as they do to lobby groups in other fields. A trade organisation arguing for, say, weaker pollution controls is instantly seen as self-interested. Yet a green organisation opposing such a weakening is seen as altruistic, even if an impartial view of the controls in question might suggest they are doing more harm than good.",
      ],
    },
    {
      id: "c5t1-p3-g",
      paragraphs: [
        "A third source of confusion is the attitude of the media. People are clearly more curious about bad news than good. Newspapers and broadcasters are there to provide what the public wants. That, however, can lead to significant distortions of perception. An example was America's encounter with El Niño in 1997 and 1998. This climatic phenomenon was accused of wrecking tourism, causing allergies, melting the ski-slopes and causing 22 deaths. However, according to an article in the Bulletin of the American Meteorological Society, the damage it did was estimated at US$4 billion but the benefits amounted to some US$19 billion. These came from higher winter temperatures (which saved an estimated 850 lives, reduced heating costs and diminished spring floods caused by meltwaters).",
      ],
    },
    {
      id: "c5t1-p3-h",
      paragraphs: [
        "The fourth factor is poor individual perception. People worry that the endless rise in the amount of stuff everyone throws away will cause the world to run out of places to dispose of waste. Yet, even if America's trash output continues to rise as it has done in the past, and even if the American population doubles by 2100, all the rubbish America produces through the entire 21st century will still take up only one-12,000th of the area of the entire United States.",
      ],
    },
    {
      id: "c5t1-p3-i",
      paragraphs: [
        "So what of global warming? As we know, carbon dioxide emissions are causing the planet to warm. The best estimates are that the temperatures will rise by 2–3°C in this century, causing considerable problems, at a total cost of US$5,000 billion.",
      ],
    },
    {
      id: "c5t1-p3-j",
      paragraphs: [
        "Despite the intuition that something drastic needs to be done about such a costly problem, economic analyses clearly show it will be far more expensive to cut carbon dioxide emissions radically than to pay the costs of adaptation to the increased temperatures. A model by one of the main authors of the United Nations Climate Change Panel shows how an expected temperature increase of 2.1 degrees in 2100 would only be diminished to an increase of 1.9 degrees. Or to put it another way, the temperature increase that the planet would have experienced in 2094 would be postponed to 2100.",
      ],
    },
    {
      id: "c5t1-p3-k",
      paragraphs: [
        "So this does not prevent global warming, but merely buys the world six years. Yet the cost of reducing carbon dioxide emissions, for the United States alone, will be higher than the cost of solving the world's single, most pressing health problem: providing universal access to clean drinking water and sanitation. Such measures would avoid 2 million deaths every year, and prevent half a billion people from becoming seriously ill.",
      ],
    },
    {
      id: "c5t1-p3-l",
      paragraphs: [
        "It is crucial that we look at the facts if we want to make the best possible decisions for the future. It may be costly to be overly optimistic—but more costly still to be too pessimistic.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c5t1-p3-yes-no",
      type: "choice",
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 3? In boxes 27–32 on your answer sheet write YES, NO or NOT GIVEN.",
      questions: [
        { questionNumbers: [27], prompt: "Environmentalists take a pessimistic view of the world for a number of reasons.", options: yesNoNotGiven },
        { questionNumbers: [28], prompt: "Data on the Earth's natural resources has only been collected since 1972.", options: yesNoNotGiven },
        { questionNumbers: [29], prompt: "The number of starving people in the world has increased in recent years.", options: yesNoNotGiven },
        { questionNumbers: [30], prompt: "Extinct species are being replaced by new species.", options: yesNoNotGiven },
        { questionNumbers: [31], prompt: "Some pollution problems have been correctly linked to industrialisation.", options: yesNoNotGiven },
        { questionNumbers: [32], prompt: "It would be best to attempt to slow down economic growth.", options: yesNoNotGiven },
      ],
    },
    {
      id: "c5t1-p3-multiple-choice",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write your answers in boxes 33–37 on your answer sheet.",
      questions: [
        {
          questionNumbers: [33],
          prompt: "What aspect of scientific research does the writer express concern about in paragraph 4?",
          options: [
            { letter: "A", text: "the need to produce results" },
            { letter: "B", text: "the lack of financial support" },
            { letter: "C", text: "the selection of areas to research" },
            { letter: "D", text: "the desire to solve every research problem" },
          ],
        },
        {
          questionNumbers: [34],
          prompt: "The writer quotes from the World Wide Fund for Nature to illustrate how",
          options: [
            { letter: "A", text: "influential the mass media can be." },
            { letter: "B", text: "effective environmental groups can be." },
            { letter: "C", text: "the mass media can help groups raise funds." },
            { letter: "D", text: "environmental groups can exaggerate their claims." },
          ],
        },
        {
          questionNumbers: [35],
          prompt: "What is the writer's main point about lobby groups in paragraph 6?",
          options: [
            { letter: "A", text: "Some are more active than others." },
            { letter: "B", text: "Some are better organised than others." },
            { letter: "C", text: "Some receive more criticism than others." },
            { letter: "D", text: "Some support more important issues than others." },
          ],
        },
        {
          questionNumbers: [36],
          prompt: "The writer suggests that newspapers print items that are intended to",
          options: [
            { letter: "A", text: "educate readers." },
            { letter: "B", text: "meet their readers' expectations." },
            { letter: "C", text: "encourage feedback from readers." },
            { letter: "D", text: "mislead readers." },
          ],
        },
        {
          questionNumbers: [37],
          prompt: "What does the writer say about America's waste problem?",
          options: [
            { letter: "A", text: "It will increase in line with population growth." },
            { letter: "B", text: "It is not as important as we have been led to believe." },
            { letter: "C", text: "It has been reduced through public awareness of the issues." },
            { letter: "D", text: "It is only significant in certain areas of the country." },
          ],
        },
      ],
    },
    {
      id: "c5t1-p3-summary-choices",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary with the list of words A–I below. Write the correct letter A–I in boxes 38–40 on your answer sheet.",
      questions: [
        { questionNumbers: [38], prompt: "The writer admits that global warming is a ___ challenge", options: environmentWords },
        { questionNumbers: [39], prompt: "but says that it will not have a catastrophic impact on our future, if we deal with it in the ___ way", options: environmentWords },
        { questionNumbers: [40], prompt: "He feels it would be better to spend money on the more ___ health problem of providing the world's population with clean drinking water", options: environmentWords },
      ],
    },
  ],
};

export const CAMBRIDGE5_TEST1_PARTS: ReadingPart[] = [
  cambridge5Test1PartOne,
  cambridge5Test1PartTwo,
  cambridge5Test1PartThree,
];

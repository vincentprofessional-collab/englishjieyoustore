import type { ReadingOption, ReadingPart } from "./reading";

const yesNoNotGiven: ReadingOption[] = [
  { letter: "YES", text: "YES" },
  { letter: "NO", text: "NO" },
  { letter: "NOT GIVEN", text: "NOT GIVEN" },
];

const minorityLanguagePeople: ReadingOption[] = [
  { letter: "A", text: "Michael Krauss" },
  { letter: "B", text: "Salikoko Mufwene" },
  { letter: "C", text: "Nicholas Ostler" },
  { letter: "D", text: "Mark Pagel" },
  { letter: "E", text: "Doug Whalen" },
];

const playParagraphs: ReadingOption[] = "ABCDEFGHI".split("").map((letter) => ({
  letter,
  text: "Paragraph " + letter,
}));

const playFindings: ReadingOption[] = [
  { letter: "A", text: "There is a link between a specific substance in the brain and playing." },
  { letter: "B", text: "Play provides input concerning physical surroundings." },
  { letter: "C", text: "Varieties of play can be matched to different stages of evolutionary history." },
  { letter: "D", text: "There is a tendency for mammals with smaller brains to play less." },
  { letter: "E", text: "Play is not a form of fitness training for the future." },
  { letter: "F", text: "Some species of larger-brained birds engage in play." },
  { letter: "G", text: "A wide range of activities are combined during play." },
  { letter: "H", text: "Play is a method of teaching survival techniques." },
];

const cambridge4Test2PartOne: ReadingPart = {
  id: "cambridge-4-test-2-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13 which are based on Reading Passage 1 below.",
  title: "Lost for Words",
  subtitle: "Many minority languages are on the danger list",
  sections: [
    {
      id: "c4t2-p1-a",
      paragraphs: [
        "In the Native American Navajo nation, which sprawls across four states in the American south-west, the native language is dying. Most of its speakers are middle-aged or elderly. Although many students take classes in Navajo, the schools are run in English. Street signs, supermarket goods and even their own newspaper are all in English. Not surprisingly, linguists doubt that any native speakers of Navajo will remain in a hundred years' time.",
      ],
    },
    {
      id: "c4t2-p1-b",
      paragraphs: [
        "Navajo is far from alone. Half the world's 6,800 languages are likely to vanish within two generations – that's one language lost every ten days. Never before has the planet's linguistic diversity shrunk at such a pace. 'At the moment, we are heading for about three or four languages dominating the world,' says Mark Pagel, an evolutionary biologist at the University of Reading. 'It's a mass extinction, and whether we will ever rebound from the loss is difficult to know.'",
      ],
    },
    {
      id: "c4t2-p1-c",
      paragraphs: [
        "Isolation breeds linguistic diversity: as a result, the world is peppered with languages spoken by only a few people. Only 250 languages have more than a million speakers, and at least 3,000 have fewer than 2,500. It is not necessarily these small languages that are about to disappear. Navajo is considered endangered despite having 150,000 speakers. What makes a language endangered is not just the number of speakers, but how old they are. If it is spoken by children it is relatively safe. The critically endangered languages are those that are only spoken by the elderly, according to Michael Krauss, director of the Alaska Native Language Center, in Fairbanks.",
      ],
    },
    {
      id: "c4t2-p1-d",
      paragraphs: [
        "Why do people reject the language of their parents? It begins with a crisis of confidence, when a small community finds itself alongside a larger, wealthier society, says Nicholas Ostler, of Britain's Foundation for Endangered Languages, in Bath. 'People lose faith in their culture,' he says. 'When the next generation reaches their teens, they might not want to be induced into the old traditions.'",
      ],
    },
    {
      id: "c4t2-p1-e",
      paragraphs: [
        "The change is not always voluntary. Quite often, governments try to kill off a minority language by banning its use in public or discouraging its use in schools, all to promote national unity.",
      ],
    },
    {
      id: "c4t2-p1-f",
      paragraphs: [
        "The former US policy of running Indian reservation schools in English, for example, effectively put languages such as Navajo on the danger list. But Salikoko Mufwene, who chairs the Linguistics Department at the University of Chicago, argues that the deadliest weapon is not government policy but economic globalisation. 'Native Americans have not lost pride in their language, but they have had to adapt to socio-economic pressures,' he says. 'They cannot refuse to speak English if most commercial activity is in English.' But are languages worth saving? At the very least, there is a loss of data for the study of languages and their evolution, which relies on comparisons between languages, both living and dead. When an unwritten and unrecorded language disappears, it is lost to science.",
      ],
    },
    {
      id: "c4t2-p1-g",
      paragraphs: [
        "Language is also intimately bound up with culture, so it may be difficult to preserve one without the other. 'If a person shifts from Navajo to English, they lose something,' Mufwene says. 'Moreover, the loss of diversity may also deprive us of different ways of looking at the world,' says Pagel. There is mounting evidence that learning a language produces physiological changes in the brain. 'Your brain and mine are different from the brain of someone who speaks French, for instance,' Pagel says, and this could affect our thoughts and perceptions. 'The patterns and connections we make among various concepts may be structured by the linguistic habits of our community.'",
      ],
    },
    {
      id: "c4t2-p1-h",
      paragraphs: [
        "So despite linguists' best efforts, many languages will disappear over the next century. But a growing interest in cultural identity may prevent the direst predictions from coming true. 'The key to fostering diversity is for people to learn their ancestral tongue, as well as the dominant language,' says Doug Whalen, founder and president of the Endangered Language Fund in New Haven, Connecticut. 'Most of these languages will not survive without a large degree of bilingualism,' he says. In New Zealand, classes for children have slowed the erosion of Maori and rekindled interest in the language. A similar approach in Hawaii has produced about 8,000 new speakers of Polynesian languages in the past few years. In California, 'apprentice' programmes have provided life support to several indigenous languages. Volunteer 'apprentices' pair up with one of the last living speakers of a Native American tongue to learn a traditional skill such as basket weaving, with instruction exclusively in the endangered language. After about 300 hours of training they are generally sufficiently fluent to transmit the language to the next generation. But Mufwene says that preventing a language dying out is not the same as giving it new life by using it every day. 'Preserving a language is more like preserving fruits in a jar,' he says.",
      ],
    },
    {
      id: "c4t2-p1-i",
      paragraphs: [
        "However, preservation can bring a language back from the dead. There are examples of languages that have survived in written form and then been revived by later generations. But a written form is essential for this, so the mere possibility of revival has led many speakers of endangered languages to develop systems of writing where none existed before.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c4t2-p1-summary",
      type: "fill",
      title: "",
      instruction: "",
      questions: [
        { number: 1, before: "Question 1" },
        { number: 2, before: "Question 2" },
        { number: 3, before: "Question 3" },
        { number: 4, before: "Question 4" },
      ],
      rawText: "Questions 1–4\n\nComplete the summary below.\n\nChoose NO MORE THAN TWO WORDS from the passage for each answer.\n\nWrite your answers in boxes 1–4 on your answer sheet.\n\nThere are currently approximately 6,800 languages in the world. This great variety of languages came about largely as a result of geographical 1 ...... . But in today's world, factors such as government initiatives and 2 ...... are contributing to a huge decrease in the number of languages. One factor which may help to ensure that some endangered languages do not die out completely is people's increasing appreciation of their 3 ...... . This has been encouraged through programmes of language classes for children and through 'apprentice' schemes, in which the endangered language is used as the medium of instruction to teach people a 4 ...... . Some speakers of endangered languages have even produced writing systems in order to help secure the survival of their mother tongue.",
    },
    {
      id: "c4t2-p1-matching",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following statements (Questions 5–9) and the list of people in the box below. Match each statement with the correct person A–E. Write the appropriate letter A–E in boxes 5–9 on your answer sheet. NB You may use any letter more than once.",
      questions: [
        { questionNumbers: [5], prompt: "Endangered languages cannot be saved unless people learn to speak more than one language.", options: minorityLanguagePeople },
        { questionNumbers: [6], prompt: "Saving languages from extinction is not in itself a satisfactory goal.", options: minorityLanguagePeople },
        { questionNumbers: [7], prompt: "The way we think may be determined by our language.", options: minorityLanguagePeople },
        { questionNumbers: [8], prompt: "Young people often reject the established way of life in their community.", options: minorityLanguagePeople },
        { questionNumbers: [9], prompt: "A change of language may mean a loss of traditional culture.", options: minorityLanguagePeople },
      ],
    },
    {
      id: "c4t2-p1-yes-no",
      type: "choice",
      instruction: "Do the following statements agree with the views of the writer in Reading Passage 1? In boxes 10–13 on your answer sheet write YES if the statement agrees with the views of the writer, NO if the statement contradicts the views of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [10], prompt: "The Navajo language will die out because it currently has too few speakers.", options: yesNoNotGiven },
        { questionNumbers: [11], prompt: "A large number of native speakers fail to guarantee the survival of a language.", options: yesNoNotGiven },
        { questionNumbers: [12], prompt: "National governments could do more to protect endangered languages.", options: yesNoNotGiven },
        { questionNumbers: [13], prompt: "The loss of linguistic diversity is inevitable.", options: yesNoNotGiven },
      ],
    },
  ],
};

const cambridge4Test2PartTwo: ReadingPart = {
  id: "cambridge-4-test-2-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26 which are based on Reading Passage 2 below.",
  title: "ALTERNATIVE MEDICINE IN AUSTRALIA",
  sections: [
    {
      id: "c4t2-p2-a",
      paragraphs: [
        "The first students to study alternative medicine at university level in Australia began their four-year, full-time course at the University of Technology, Sydney, in early 1994. Their course covered, among other therapies, acupuncture. The theory they learnt is based on the traditional Chinese explanation of this ancient healing art: that it can regulate the flow of 'Qi' or energy through pathways in the body. This course reflects how far some alternative therapies have come in their struggle for acceptance by the medical establishment.",
      ],
    },
    {
      id: "c4t2-p2-b",
      paragraphs: [
        "Australia has been unusual in the Western world in having a very conservative attitude to natural or alternative therapies, according to Dr Paul Laver, a lecturer in Public Health at the University of Sydney. 'We've had a tradition of doctors being fairly powerful and I guess they are pretty loath to allow any pretenders to their position to come into it.' In many other industrialised countries, orthodox and alternative medicine have worked 'hand in glove' for years. In Europe, only orthodox doctors can prescribe herbal medicine. In Germany, plant remedies account for 10% of the national turnover of pharmaceuticals. Americans made more visits to alternative therapists than to orthodox doctors in 1990, and each year they spend about $US12 billion on therapies that have not been scientifically tested.",
      ],
    },
    {
      id: "c4t2-p2-c",
      paragraphs: [
        "Disenchantment with orthodox medicine has seen the popularity of alternative therapies in Australia climb steadily during the past 20 years. In a 1983 national health survey, 1.9% of people said they had contacted a chiropractor, naturopath, osteopath, acupuncturist or herbalist in the two weeks prior to the survey. By 1990, this figure had risen to 2.6% of the population. The 550,000 consultations with alternative therapists reported in the 1990 survey represented about an eighth of the total number of consultations with medically qualified personnel covered by the survey, according to Dr Laver and colleagues writing in the Australian Journal of Public Health in 1993. 'A better educated and less accepting public has become disillusioned with the experts in general, and increasingly sceptical about science and empirically based knowledge,' they said. 'The high standing of professionals, including doctors, has been eroded as a consequence.'",
      ],
    },
    {
      id: "c4t2-p2-d",
      paragraphs: [
        "Rather than resisting or criticising this trend, increasing numbers of Australian doctors, particularly younger ones, are forming group practices with alternative therapists or taking courses themselves, particularly in acupuncture and herbalism. Part of the incentive was financial, Dr Laver said. 'The bottom line is that most general practitioners are business people. If they see potential clientele going elsewhere, they might want to be able to offer a similar service.'",
      ],
    },
    {
      id: "c4t2-p2-e",
      paragraphs: [
        "In 1993, Dr Laver and his colleagues published a survey of 289 Sydney people who attended eight alternative therapists' practices in Sydney. These practices offered a wide range of alternative therapies from 25 therapists. Those surveyed had experienced chronic illnesses, for which orthodox medicine had been able to provide little relief. They commented that they liked the holistic approach of their alternative therapists and the friendly, concerned and detailed attention they had received. The cold, impersonal manner of orthodox doctors featured in the survey. An increasing exodus from their clinics, coupled with this and a number of other relevant surveys carried out in Australia, all pointing to orthodox doctors' inadequacies, have led mainstream doctors themselves to begin to admit they could learn from the personal style of alternative therapists. Dr Patrick Store, President of the Royal College of General Practitioners, concurs that orthodox doctors could learn a lot about bedside manner and advising patients on preventative health from alternative therapists.",
      ],
    },
    {
      id: "c4t2-p2-f",
      paragraphs: [
        "According to the Australian Journal of Public Health, 18% of patients visiting alternative therapists do so because they suffer from musculo-skeletal complaints; 12% suffer from digestive problems, which is only 1% more than those suffering from emotional problems. Those suffering from respiratory complaints represent 7% of their patients, and candida sufferers represent an equal percentage. Headache sufferers and those complaining of general ill health represent 6% and 5% of patients respectively, and a further 4% see therapists for general health maintenance.",
      ],
    },
    {
      id: "c4t2-p2-g",
      paragraphs: [
        "The survey suggested that complementary medicine is probably a better term than alternative medicine. Alternative medicine appears to be an adjunct, sought in times of disenchantment when conventional medicine seems not to offer the answer.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c4t2-p2-multiple-choice",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write your answers in boxes 14 and 15 on your answer sheet.",
      questions: [
        {
          questionNumbers: [14],
          prompt: "Traditionally, how have Australian doctors differed from doctors in many Western countries?",
          options: [
            { letter: "A", text: "They have worked closely with pharmaceutical companies." },
            { letter: "B", text: "They have often worked alongside other therapists." },
            { letter: "C", text: "They have been reluctant to accept alternative therapists." },
            { letter: "D", text: "They have regularly prescribed alternative remedies." },
          ],
        },
        {
          questionNumbers: [15],
          prompt: "In 1990, Americans",
          options: [
            { letter: "A", text: "were prescribed more herbal medicines than in previous years." },
            { letter: "B", text: "consulted alternative therapists more often than doctors." },
            { letter: "C", text: "spent more on natural therapies than orthodox medicines." },
            { letter: "D", text: "made more complaints about doctors than in previous years." },
          ],
        },
      ],
    },
    {
      id: "c4t2-p2-yes-no",
      type: "choice",
      instruction: "Do the following statements agree with the views of the writer in Reading Passage 2? In boxes 16–23 on your answer sheet write YES if the statement agrees with the views of the writer, NO if the statement contradicts the views of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [16], prompt: "Australians have been turning to alternative therapies in increasing numbers over the past 20 years.", options: yesNoNotGiven },
        { questionNumbers: [17], prompt: "Between 1983 and 1990 the numbers of patients visiting alternative therapists rose to include a further 8% of the population.", options: yesNoNotGiven },
        { questionNumbers: [18], prompt: "The 1990 survey related to 550,000 consultations with alternative therapists.", options: yesNoNotGiven },
        { questionNumbers: [19], prompt: "In the past, Australians had a higher opinion of doctors than they do today.", options: yesNoNotGiven },
        { questionNumbers: [20], prompt: "Some Australian doctors are retraining in alternative therapies.", options: yesNoNotGiven },
        { questionNumbers: [21], prompt: "Alternative therapists earn higher salaries than doctors.", options: yesNoNotGiven },
        { questionNumbers: [22], prompt: "The 1993 Sydney survey involved 289 patients who visited alternative therapists for acupuncture treatment.", options: yesNoNotGiven },
        { questionNumbers: [23], prompt: "All the patients in the 1993 Sydney survey had long-term medical complaints.", options: yesNoNotGiven },
      ],
    },
    {
      id: "c4t2-p2-complaint-chart",
      type: "fill",
      title: "",
      instruction: "Complete the vertical axis on the table below. Choose NO MORE THAN THREE WORDS from Reading Passage 2 for each answer. Write your answers in boxes 24–26 on your answer sheet.",
      questions: [
        { number: 24, before: "Question 24" },
        { number: 25, before: "Question 25" },
        { number: 26, before: "Question 26" },
      ],
      chart: {
        title: "Medical complaints of patients visiting therapists",
        scale: 30,
        ticks: [0, 5, 10, 15, 20, 25, 30],
        rows: [
          { label: "Other", percent: 30 },
          { label: "Musculo-skeletal", percent: 18 },
          { label: "Digestive", percent: 12 },
          { questionNumber: 24, percent: 11 },
          { label: "Respiratory", percent: 7 },
          { label: "Candida", percent: 7 },
          { questionNumber: 25, percent: 6 },
          { questionNumber: 26, percent: 5 },
          { label: "General health maintenance", percent: 4 },
        ],
      },
    },
  ],
};

const cambridge4Test2PartThree: ReadingPart = {
  id: "cambridge-4-test-2-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40 which are based on Reading Passage 3 below.",
  title: "PLAY IS A SERIOUS BUSINESS",
  subtitle: "Does play help develop bigger, better brains?",
  byline: "Bryant Furlow investigates",
  sections: [
    {
      id: "c4t2-p3-a",
      paragraphs: [
        "A Playing is a serious business. Children engrossed in a make-believe world, fox cubs play-fighting or kittens teasing a ball of string aren't just having fun. Play may look like a carefree and exuberant way to pass the time before the hard work of adulthood comes along, but there's much more to it than that. For a start, play can even cost animals their lives. Eighty per cent of deaths among juvenile fur seals occur because playing pups fail to spot predators approaching. It is also extremely expensive in terms of energy. Playful young animals use around two or three per cent of their energy cavorting, and in children that figure can be closer to fifteen per cent. 'Even two or three per cent is huge,' says John Byers of Idaho University. 'You just don't find animals wasting energy like that,' he adds. There must be a reason.",
      ],
    },
    {
      id: "c4t2-p3-b",
      paragraphs: [
        "B But if play is not simply a developmental hiccup, as biologists once thought, why did it evolve? The latest idea suggests that play has evolved to build big brains. In other words, playing makes you intelligent. Playfulness, it seems, is common only among mammals, although a few of the larger-brained birds also indulge. Animals at play often use unique signs – tail-wagging in dogs, for example – to indicate that activity superficially resembling adult behaviour is not really in earnest. A popular explanation of play has been that it helps juveniles develop the skills they will need to hunt, mate and socialise as adults. Another has been that it allows young animals to get in shape for adult life by improving their respiratory endurance. Both these ideas have been questioned in recent years.",
      ],
    },
    {
      id: "c4t2-p3-c",
      paragraphs: [
        "C Take the exercise theory. If play evolved to build muscle or as a kind of endurance training, then you would expect to see permanent benefits. But Byers points out that the benefits of increased exercise disappear rapidly after training stops, so any improvement in endurance resulting from juvenile play would be lost by adulthood. 'If the function of play was to get into shape,' says Byers, 'the optimum time for playing would depend on when it was most advantageous for the young of a particular species to do so. But it doesn't work like that.' Across species, play tends to peak about halfway through the suckling stage and then decline.",
      ],
    },
    {
      id: "c4t2-p3-d",
      paragraphs: [
        "D Then there's the skills-training hypothesis. At first glance, playing animals do appear to be practising the complex manoeuvres they will need in adulthood. But a closer inspection reveals this interpretation as too simplistic. In one study, behavioural ecologist Tim Caro, from the University of California, looked at the predatory play of kittens and their predatory behaviour when they reached adulthood. He found that the way the cats played had no significant effect on their hunting prowess in later life.",
      ],
    },
    {
      id: "c4t2-p3-e",
      paragraphs: [
        "E Earlier this year, Sergio Pellis of Lethbridge University, Canada, reported that there is a strong positive link between brain size and playfulness among mammals in general. Comparing measurements for fifteen orders of mammal, he and his team found larger brains (for a given body size) are linked to greater playfulness. The converse was also found to be true. Robert Barton of Durham University believes that, because large brains are more sensitive to developmental stimuli than smaller brains, they require more play to help mould them for adulthood. 'I concluded it's to do with learning, and with the importance of environmental data to the brain during development,' he says.",
      ],
    },
    {
      id: "c4t2-p3-f",
      paragraphs: [
        "F According to Byers, the timing of the playful stage in young animals provides an important clue to what's going on. If you plot the amount of time a juvenile devotes to play each day over the course of its development, you discover a pattern typically associated with a 'sensitive period' – a brief development window during which the brain can actually be modified in ways that are not possible earlier or later in life. Think of the relative ease with which young children – but not infants or adults – absorb language. Other researchers have found that play in cats, rats and mice is at its most intense just as this 'window of opportunity' reaches its peak.",
      ],
    },
    {
      id: "c4t2-p3-g",
      paragraphs: [
        "G 'People have not paid enough attention to the amount of the brain activated by play,' says Marc Bekoff from Colorado University. Bekoff studied coyote pups at play and found that the kind of behaviour involved was markedly more variable and unpredictable than that of adults. Such behaviour activates many different parts of the brain, he reasons. Bekoff likens it to a behavioural kaleidoscope, with animals at play jumping rapidly between activities. 'They use behaviour from a lot of different contexts – predation, aggression, reproduction,' he says. 'Their developing brain is getting all sorts of stimulation.'",
      ],
    },
    {
      id: "c4t2-p3-h",
      paragraphs: [
        "H Not only is more of the brain involved in play than was suspected, but it also seems to activate higher cognitive processes. 'There's enormous cognitive involvement in play,' says Bekoff. He points out that play often involves complex assessments of playmates, ideas of reciprocity and the use of specialised signals and rules. He believes that play creates a brain that has greater behavioural flexibility and improved potential for learning later in life. The idea is backed up by the work of Stephen Siviy of Gettysburg College. Siviy studied how bouts of play affected the brain's levels of a particular chemical associated with the stimulation and growth of nerve cells. He was surprised by the extent of the activation. 'Play just lights everything up,' he says. By allowing link-ups between brain areas that might not normally communicate with each other, play may enhance creativity.",
      ],
    },
    {
      id: "c4t2-p3-i",
      paragraphs: [
        "I What might further experimentation suggest about the way children are raised in many societies today? We already know that rat pups denied the chance to play grow smaller brain components and fail to develop the ability to apply social rules when they interact with their peers. With schooling beginning earlier and becoming increasingly exam-orientated, play is likely to get even less of a look-in. Who knows what the result of that will be?",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c4t2-p3-paragraph-matching",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 3 has nine paragraphs labelled A–I. Which paragraph contains the following information? Write the correct letter A–I in boxes 27–32 on your answer sheet. NB You may use any letter more than once.",
      questions: [
        { questionNumbers: [27], prompt: "the way play causes unusual connections in the brain which are beneficial", options: playParagraphs },
        { questionNumbers: [28], prompt: "insights from recording how much time young animals spend playing", options: playParagraphs },
        { questionNumbers: [29], prompt: "a description of the physical hazards that can accompany play", options: playParagraphs },
        { questionNumbers: [30], prompt: "a description of the mental activities which are exercised and developed during play", options: playParagraphs },
        { questionNumbers: [31], prompt: "the possible effects that a reduction in play opportunities will have on humans", options: playParagraphs },
        { questionNumbers: [32], prompt: "the classes of animals for which play is important", options: playParagraphs },
      ],
    },
    {
      id: "c4t2-p3-play-theories",
      type: "choice",
      instruction: "Choose THREE letters A–F. Write your answers in boxes 33–35 on your answer sheet. The list below gives some ways of regarding play. Which THREE ways are mentioned by the writer of the text?",
      questions: [
        {
          questionNumbers: [33, 34, 35],
          prompt: "Which THREE ways are mentioned by the writer of the text?",
          selectCount: 3,
          options: [
            { letter: "A", text: "a rehearsal for later adult activities" },
            { letter: "B", text: "a method animals use to prove themselves to their peer group" },
            { letter: "C", text: "an activity intended to build up strength for adulthood" },
            { letter: "D", text: "a means of communicating feelings" },
            { letter: "E", text: "a defensive strategy" },
            { letter: "F", text: "an activity assisting organ growth" },
          ],
        },
      ],
    },
    {
      id: "c4t2-p3-researchers",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following researchers (Questions 36–40) and the list of findings below. Match each researcher with the correct finding. Write the correct letter A–H in boxes 36–40 on your answer sheet.",
      questions: [
        { questionNumbers: [36], prompt: "Robert Barton", options: playFindings },
        { questionNumbers: [37], prompt: "Marc Bekoff", options: playFindings },
        { questionNumbers: [38], prompt: "John Byers", options: playFindings },
        { questionNumbers: [39], prompt: "Sergio Pellis", options: playFindings },
        { questionNumbers: [40], prompt: "Stephen Siviy", options: playFindings },
      ],
    },
  ],
};

export const CAMBRIDGE4_TEST2_PARTS: ReadingPart[] = [
  cambridge4Test2PartOne,
  cambridge4Test2PartTwo,
  cambridge4Test2PartThree,
];

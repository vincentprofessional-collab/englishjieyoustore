import type { ReadingChoiceBlock, ReadingFillBlock, ReadingPart } from "./reading";

const explanationAttribution = "精讲解析｜剑桥雅思考试全真试题集9精讲.pdf，对应阅读章节";

function pageRef(page: number) {
  return {
    page,
    src: "/reading/source-pages/ci9-p" + String(page).padStart(3, "0") + ".webp",
    width: 1750,
    height: page === 131 ? 1228 : 2472,
  };
}

function explanationRef(part: number, page: number) {
  const heights: Record<number, number> = { 155: 1667, 163: 1049, 172: 1477 };
  return {
    page,
    src: "/reading/explanations/cambridge-9-test-4-part" + part + "-exp9-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2007,
  };
}

function questionNumbers(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function rawFillBlock(id: string, title: string, rawText: string, start: number, end: number): ReadingFillBlock {
  return {
    id,
    type: "fill",
    title,
    instruction: "",
    rawText,
    questions: questionNumbers(start, end).map((number) => ({ number, before: "Question " + number })),
  };
}

function choiceQuestion(number: number, prompt: string, options: { letter: string; text: string }[]) {
  return { questionNumbers: [number], prompt, options };
}

function multipleChoiceBlock(id: string, questions: { number: number; prompt: string; options: string[] }[]): ReadingChoiceBlock {
  return {
    id,
    type: "choice",
    instruction: "Choose the correct letter, A, B, C or D.",
    questions: questions.map(({ number, prompt, options }) => choiceQuestion(number, prompt, options.map((text, index) => ({
      letter: String.fromCharCode(65 + index),
      text,
    })))),
  };
}

const identityParagraphs = "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter }));

export const CAMBRIDGE9_TEST4_PARTS: ReadingPart[] = [
  {
    id: "cambridge-9-test-4-part1",
    label: "Part 1",
    questionRange: "questions 1-13",
    intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
    title: "The life and work of Marie Curie",
    sections: [
      {
        id: "cambridge-9-test-4-part1-passage",
        format: "pre",
        paragraphs: [
          "Marie Curie is probably the most famous woman scientist who has ever lived. Born Maria Sklodowska in Poland in 1867, she is famous for her work on radioactivity, and was twice a winner of the Nobel Prize. With her husband, Pierre Curie, and Henri Becquerel, she was awarded the 1903 Nobel Prize for Physics, and was then sole winner of the 1911 Nobel Prize for Chemistry. She was the first woman to win a Nobel Prize.",
          "From childhood, Marie was remarkable for her prodigious memory, and at the age of 16 won a gold medal on completion of her secondary education. Because her father lost his savings through bad investment, she then had to take work as a teacher. From her earnings she was able to finance her sister Bronia’s medical studies in Paris, on the understanding that Bronia would, in turn, later help her to get an education. In 1891 this promise was fulfilled and Marie went to Paris and began to study at the Sorbonne (the University of Paris). She often worked far into the night and lived on little more than bread and butter and tea. She came first in the examination in the physical sciences in 1893, and in 1894 was placed second in the examination in mathematical sciences. It was not until the spring of that year that she was introduced to Pierre Curie.",
          "Their marriage in 1895 marked the start of a partnership that was soon to achieve results of world significance. Following Henri Becquerel’s discovery in 1896 of a new phenomenon, which Marie later called ‘radioactivity’, Marie Curie decided to find out if the radioactivity discovered in uranium was to be found in other elements. She discovered that this was true for thorium.",
          "Turning her attention to minerals, she found her interest drawn to pitchblende, a mineral whose radioactivity, superior to that of pure uranium, could be explained only by the presence in the ore of small quantities of an unknown substance of very high activity. Pierre Curie joined her in the work that she had undertaken to resolve this problem, and that led to the discovery of the new elements, polonium and radium. While Pierre Curie devoted himself chiefly to the physical study of the new radiations, Marie Curie struggled to obtain pure radium in the metallic state. This was achieved with the help of the chemist André-Louis Debierne, one of Pierre Curie’s pupils. Based on the results of this research, Marie Curie received her Doctorate of Science, and in 1903 Marie and Pierre shared with Becquerel the Nobel Prize for Physics for the discovery of radioactivity.",
          "The births of Marie’s two daughters, Irène and Eve, in 1897 and 1904 failed to interrupt her scientific work. She was appointed lecturer in physics at the École Normale Supérieure for girls in Sèvres, France (1900), and introduced a method of teaching based on experimental demonstrations. In December 1904 she was appointed chief assistant in the laboratory directed by Pierre Curie.",
          "The sudden death of her husband in 1906 was a bitter blow to Marie Curie, but was also a turning point in her career: henceforth she was to devote all her energy to completing alone the scientific work that they had undertaken. On May 13, 1906, she was appointed to the professorship that had been left vacant on her husband’s death, becoming the first woman to teach at the Sorbonne. In 1911 she was awarded the Nobel Prize for Chemistry for the isolation of a pure form of radium.",
          "During World War I, Marie Curie, with the help of her daughter Irène, devoted herself to the development of the use of X-radiography, including the mobile units which came to be known as ‘Little Curies’, used for the treatment of wounded soldiers. In 1918 the Radium Institute, whose staff Irène had joined, began to operate in earnest, and became a centre for nuclear physics and chemistry. Marie Curie, now at the highest point of her fame and, from 1922, a member of the Academy of Medicine, researched the chemistry of radioactive substances and their medical applications.",
          "In 1921, accompanied by her two daughters, Marie Curie made a triumphant journey to the United States to raise funds for research on radium. Women there presented her with a gram of radium for her campaign. Marie also gave lectures in Belgium, Brazil, Spain and Czechoslovakia and, in addition, had the satisfaction of seeing the development of the Curie Foundation in Paris, and the inauguration in 1932 in Warsaw of the Radium Institute, where her sister Bronia became director.",
          "One of Marie Curie’s outstanding achievements was to have understood the need to accumulate intense radioactive sources, not only to treat illness but also to maintain an abundant supply for research. The existence in Paris at the Radium Institute of a stock of 1.5 grams of radium made a decisive contribution to the success of the experiments undertaken in the years around 1930. This work prepared the way for the discovery of the neutron by Sir James Chadwick and, above all, for the discovery in 1934 by Irène and Frédéric Joliot-Curie of artificial radioactivity. A few months after this discovery, Marie Curie died as a result of leukaemia caused by exposure to radiation. She had often carried test tubes containing radioactive isotopes in her pocket, remarking on the pretty blue-green light they gave off.",
          "Her contribution to physics had been immense, not only in her own work, the importance of which had been demonstrated by her two Nobel Prizes, but because of her influence on subsequent generations of nuclear physicists and chemists.",
        ],
      },
    ],
    questionBlocks: [
      rawFillBlock(
        "cambridge-9-test-4-part1-questions-1-6",
        "Questions 1–6",
        "Questions 1–6\nDo the following statements agree with the information given in Reading Passage 1?\n\nIn boxes 1–6 on your answer sheet, write\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN if there is no information on this\n\n1 Marie Curie’s husband was a joint winner of both Marie’s Nobel Prizes.\n2 Marie became interested in science when she was a child.\n3 Marie was able to attend the Sorbonne because of her sister’s financial contribution.\n4 Marie stopped doing research for several years when her children were born.\n5 Marie took over the teaching position her husband had held.\n6 Marie’s sister Bronia studied the medical uses of radioactivity.",
        1,
        6,
      ),
      rawFillBlock(
        "cambridge-9-test-4-part1-questions-7-13",
        "Questions 7–13",
        "Questions 7–13\nComplete the notes below. Choose ONE WORD from the passage for each answer.\n\nMarie Curie’s research on radioactivity\nWhen uranium was discovered to be radioactive, Marie Curie found that the element called 7 ...................... had the same property.\nMarie and Pierre Curie’s research into the radioactivity of the mineral known as 8 ...................... led to the discovery of two new elements.\nIn 1911, Marie Curie received recognition for her work on the element 9 ...................... .\nMarie and Irène Curie developed X-radiography which was used as a medical technique for 10 ...................... .\nMarie Curie saw the importance of collecting radioactive material both for research and for cases of 11 ...................... .\nThe radioactive material stocked in Paris contributed to the discoveries in the 1930s of the 12 ...................... and of what was known as artificial radioactivity.\nDuring her research, Marie Curie was exposed to radiation and as a result she suffered from 13 ...................... .",
        7,
        13,
      ),
    ],
    source: {
      passagePages: [pageRef(86), pageRef(87)],
      questionPages: [pageRef(88), pageRef(89)],
      answerPages: [pageRef(131)],
      explanationPages: [155, 156, 157, 158, 159].map((page) => explanationRef(1, page)),
      explanationAttribution,
      analysisVerified: true,
    },
  },
  {
    id: "cambridge-9-test-4-part2",
    label: "Part 2",
    questionRange: "questions 14-26",
    intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 below.",
    title: "Young children’s sense of identity",
    sections: [
      { id: "cambridge-9-test-4-part2-paragraph-a", heading: "A", format: "pre", paragraphs: [
        "A sense of self develops in young children by degrees. The process can usefully be thought of in terms of the gradual emergence of two somewhat separate features: the self as a subject, and the self as an object. William James introduced the distinction in 1892, and contemporaries of his, such as Charles Cooley, added to the developing debate. Ever since then psychologists have continued building on the theory.",
      ] },
      { id: "cambridge-9-test-4-part2-paragraph-b", heading: "B", format: "pre", paragraphs: [
        "According to James, a child’s first step on the road to self-understanding can be seen as the recognition that he or she exists. This is an aspect of the self that he labelled ‘self-as-subject’, and he gave it various elements. These included an awareness of one’s own agency (i.e. one’s power to act), and an awareness of one’s distinctiveness from other people. These features gradually emerge as infants explore their world and interact with caregivers. Cooley (1902) suggested that a sense of the self-as-subject was primarily concerned with being able to exercise power. He proposed that the earliest examples of this are an infant’s attempts to control physical objects, such as toys or his or her own limbs. This is followed by attempts to affect the behaviour of other people. For example, infants learn that when they cry or smile someone responds to them.",
      ] },
      { id: "cambridge-9-test-4-part2-paragraph-c", heading: "C", format: "pre", paragraphs: [
        "Another powerful source of information for infants about the effects they can have on the world around them is provided when others mimic them. Many parents spend a lot of time, particularly in the early months, copying their infant’s vocalizations and expressions. In addition, young children enjoy looking in mirrors, where the movements they can see are dependent upon their own movements. This is not to say that infants recognize the reflection as their own image (a later development). However, Lewis and Brooks-Gunn (1979) suggest that infants’ developing understanding that the movements they see in the mirror are contingent on their own, leads to a growing awareness that they are distinct from other people. This is because they, and only they, can change the reflection in the mirror.",
      ] },
      { id: "cambridge-9-test-4-part2-paragraph-d", heading: "D", format: "pre", paragraphs: [
        "This understanding that children gain of themselves as active agents continues to develop in their attempts to co-operate with others in play. Dunn (1988) points out that it is in such day-to-day relationships and interactions that the child’s understanding of his- or herself emerges. Empirical investigations of the self-as-subject in young children are, however, rather scarce because of difficulties of communication: even if young infants can reflect on their experience, they certainly cannot express this aspect of the self directly.",
      ] },
      { id: "cambridge-9-test-4-part2-paragraph-e", heading: "E", format: "pre", paragraphs: [
        "Once children have acquired a certain level of self-awareness, they begin to place themselves in a whole series of categories, which together play such an important part in defining them uniquely as ‘themselves’. This second step in the development of a full sense of self is what James called the ‘self-as-object’. This has been seen by many to be the aspect of the self which is most influenced by social elements, since it is made up of social roles (such as student, brother, colleague) and characteristics which derive their meaning from comparison or interaction with other people (such as trustworthiness, shyness, sporting ability).",
      ] },
      { id: "cambridge-9-test-4-part2-paragraph-f", heading: "F", format: "pre", paragraphs: [
        "Cooley and other researchers suggested a close connection between a person’s own understanding of their identity and other people’s understanding of it. Cooley believed that people build up their sense of identity from the reactions of others to them, and from the view they believe others have of them. He called the self-as-object the ‘looking-glass self’, since people come to see themselves as they are reflected in others. Mead (1934) went even further, and saw the self and the social world as inextricably bound together: ‘The self is essentially a social structure, and it arises in social experience ... it is impossible to conceive of a self arising outside of social experience.’",
      ] },
      { id: "cambridge-9-test-4-part2-paragraph-g", heading: "G", format: "pre", paragraphs: [
        "Lewis and Brooks-Gunn argued that an important developmental milestone is reached when children become able to recognize themselves visually without the support of seeing contingent movement. This recognition occurs around their second birthday. In one experiment, Lewis and Brooks-Gunn (1979) dabbed some red powder on the noses of children who were playing in front of a mirror, and then observed how often they touched their noses. The psychologists reasoned that if the children knew what they usually looked like, they would be surprised by the unusual red mark and would start touching it. On the other hand, they found that children of 15 to 18 months are generally not able to recognize themselves unless other cues such as movement are present.",
      ] },
      { id: "cambridge-9-test-4-part2-paragraph-h", heading: "H", format: "pre", paragraphs: [
        "Finally, perhaps the most graphic expressions of self-awareness in general can be seen in the displays of rage which are most common from 18 months to 3 years of age. In a longitudinal study of groups of three or four children, Bronson (1975) found that the intensity of the frustration and anger in their disagreements increased sharply between the ages of 1 and 2 years. Often, the children’s disagreements involved a struggle over a toy that none of them had played with before or after the tug-of-war: the children seemed to be disputing ownership rather than wanting to play with it. Although it may be less marked in other societies, the link between the sense of ‘self’ and of ‘ownership’ is a notable feature of childhood in Western societies.",
      ] },
    ],
    questionBlocks: [
      {
        id: "cambridge-9-test-4-part2-questions-14-19",
        type: "choice",
        instruction: "Reading Passage 2 has eight paragraphs, A–H. Which paragraph contains the following information? Write the correct letter, A–H. You may use any letter more than once.",
        sharedOptions: true,
        questions: [
          choiceQuestion(14, "an account of the method used by researchers in a particular study", identityParagraphs),
          choiceQuestion(15, "the role of imitation in developing a sense of identity", identityParagraphs),
          choiceQuestion(16, "the age at which children can usually identify a static image of themselves", identityParagraphs),
          choiceQuestion(17, "a reason for the limitations of scientific research into ‘self-as-subject’", identityParagraphs),
          choiceQuestion(18, "reference to a possible link between culture and a particular form of behaviour", identityParagraphs),
          choiceQuestion(19, "examples of the wide range of features that contribute to the sense of ‘self-as-object’", identityParagraphs),
        ],
      },
      {
        id: "cambridge-9-test-4-part2-questions-20-23",
        type: "choice",
        instruction: "Look at the following findings (Questions 20–23) and the list of researchers below. Match each finding with the correct researcher or researchers, A–E.",
        sharedOptions: true,
        questions: [
          choiceQuestion(20, "A sense of identity can never be formed without relationships with other people.", [
            { letter: "A", text: "James" }, { letter: "B", text: "Cooley" }, { letter: "C", text: "Lewis and Brooks-Gunn" }, { letter: "D", text: "Mead" }, { letter: "E", text: "Bronson" },
          ]),
          choiceQuestion(21, "A child’s awareness of self is related to a sense of mastery over things and people.", [
            { letter: "A", text: "James" }, { letter: "B", text: "Cooley" }, { letter: "C", text: "Lewis and Brooks-Gunn" }, { letter: "D", text: "Mead" }, { letter: "E", text: "Bronson" },
          ]),
          choiceQuestion(22, "At a certain age, children’s sense of identity leads to aggressive behaviour.", [
            { letter: "A", text: "James" }, { letter: "B", text: "Cooley" }, { letter: "C", text: "Lewis and Brooks-Gunn" }, { letter: "D", text: "Mead" }, { letter: "E", text: "Bronson" },
          ]),
          choiceQuestion(23, "Observing their own reflection contributes to children’s self-awareness.", [
            { letter: "A", text: "James" }, { letter: "B", text: "Cooley" }, { letter: "C", text: "Lewis and Brooks-Gunn" }, { letter: "D", text: "Mead" }, { letter: "E", text: "Bronson" },
          ]),
        ],
      },
      rawFillBlock(
        "cambridge-9-test-4-part2-questions-24-26",
        "Questions 24–26",
        "Questions 24–26\nComplete the summary below. Choose ONE WORD ONLY from the passage for each answer.\n\nHow children acquire a sense of identity\nFirst, children come to realise that they can have an effect on the world around them, for example by handling objects, or causing the image to move when they face a 24 ...................... . This aspect of self-awareness is difficult to research directly, because of 25 ...................... problems.\n\nSecondly, children start to become aware of how they are viewed by others. One important stage in this process is the visual recognition of themselves which usually occurs when they reach the age of two. In Western societies at least, the development of self-awareness is often linked to a sense of 26 ......................, and can lead to disputes.",
        24,
        26,
      ),
    ],
    source: {
      passagePages: [pageRef(90), pageRef(91)],
      questionPages: [pageRef(92), pageRef(93), pageRef(94)],
      answerPages: [pageRef(131)],
      explanationPages: [163, 164, 165, 166, 167].map((page) => explanationRef(2, page)),
      explanationAttribution,
      analysisVerified: true,
    },
  },
  {
    id: "cambridge-9-test-4-part3",
    label: "Part 3",
    questionRange: "questions 27-40",
    intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 on the following pages.",
    title: "The Development of Museums",
    sections: [
      { id: "cambridge-9-test-4-part3-paragraph-a", heading: "A", format: "pre", paragraphs: [
        "The conviction that historical relics provide infallible testimony about the past is rooted in the nineteenth and early twentieth centuries, when science was regarded as objective and value free. As one writer observes: ‘Although it is now evident that artefacts are as easily altered as chronicles, public faith in their veracity endures: a tangible relic seems ipso facto real.’ Such conviction was, until recently, reflected in museum displays. Museums used to look — and some still do — much like storage rooms of objects packed together in showcases: good for scholars who wanted to study the subtle differences in design, but not for the ordinary visitor, to whom it all looked alike. Similarly, the information accompanying the objects often made little sense to the lay visitor. The content and format of explanations dated back to a time when the museum was the exclusive domain of the scientific researcher.",
      ] },
      { id: "cambridge-9-test-4-part3-paragraph-b", heading: "B", format: "pre", paragraphs: [
        "Recently, however, attitudes towards history and the way it should be presented have altered. The key word in heritage display is now ‘experience’, the more exciting the better and, if possible, involving all the senses. Good examples of this approach in the UK are the Jorvik Centre in York; the National Museum of Photography, Film and Television in Bradford; and the Imperial War Museum in London. In the US the trend emerged much earlier: Williamsburg has been a prototype for many heritage developments in other parts of the world. No one can predict where the process will end. On so-called heritage sites the re-enactment of historical events is increasingly popular, and computers will soon provide virtual reality experiences, which will present visitors with a vivid image of the period of their choice, in which they themselves can act as if part of the historical environment. Such developments have been criticised as an intolerable vulgarisation, but the success of many historical theme parks and similar locations suggests that the majority of the public does not share this opinion.",
      ] },
      { id: "cambridge-9-test-4-part3-paragraph-c", heading: "C", format: "pre", paragraphs: [
        "In a related development, the sharp distinction between museum and heritage sites on the one hand, and theme parks on the other, is gradually evaporating. They already borrow ideas and concepts from one another. For example, museums have adopted story lines for exhibitions, sites have accepted ‘theming’ as a relevant tool, and theme parks are moving towards more authenticity and research-based presentations. In zoos, animals are no longer kept in cages, but in great spaces, either in the open air or in enormous greenhouses, such as the jungle and desert environments in Burgers’ Zoo in Holland. This particular trend is regarded as one of the major developments in the presentation of natural history in the twentieth century.",
      ] },
      { id: "cambridge-9-test-4-part3-paragraph-d", heading: "D", format: "pre", paragraphs: [
        "Theme parks are undergoing other changes, too, as they try to present more serious social and cultural issues, and move away from fantasy. This development is a response to market forces and, although museums and heritage sites have a special, rather distinct, role to fulfil, they are also operating in a very competitive environment, where visitors make choices on how and where to spend their free time. Heritage and museum experts do not have to invent stories and recreate historical environments to attract their visitors: their assets are already in place. However, exhibits must be both based on artefacts and facts as we know them, and attractively presented. Those who are professionally engaged in the art of interpreting history are thus in a difficult position, as they must steer a narrow course between the demands of ‘evidence’ and ‘attractiveness’, especially given the increasing need in the heritage industry for income-generating activities.",
      ] },
      { id: "cambridge-9-test-4-part3-paragraph-e", heading: "E", format: "pre", paragraphs: [
        "It could be claimed that in order to make everything in heritage more ‘real’, historical accuracy must be increasingly altered. For example, Pithecanthropus erectus is depicted in an Indonesian museum with Malay facial features, because this corresponds to public perceptions. Similarly, in the Museum of Natural History in Washington, Neanderthal man is shown making a dominant gesture to his wife. Such presentations tell us more about contemporary perceptions of the world than about our ancestors. There is one compensation, however, for the professionals who make these interpretations: if they did not provide the interpretation, visitors would do it for themselves, based on their own ideas, misconceptions and prejudices. And no matter how exciting the result, it would contain a lot more bias than the presentations provided by experts.",
      ] },
      { id: "cambridge-9-test-4-part3-paragraph-f", heading: "F", format: "pre", paragraphs: [
        "Human bias is inevitable, but another source of bias in the representation of history has to do with the transitory nature of the materials themselves. The simple fact is that not everything from history survives the historical process. Castles, palaces and cathedrals have a longer lifespan than the dwellings of ordinary people. The same applies to the furnishings and other contents of the premises. In a town like Leyden in Holland, which in the seventeenth century was occupied by approximately the same number of inhabitants as today, people lived within the walled town, an area more than five times smaller than modern Leyden. In most of the houses several families lived together in circumstances beyond our imagination. Yet in museums, fine period rooms give only an image of the lifestyle of the upper class of that era. No wonder that people who stroll around exhibitions are filled with nostalgia; the evidence in museums indicates that life was so much better in the past. This notion is induced by the bias in its representation in museums and heritage centres.",
      ] },
    ],
    questionBlocks: [
      {
        id: "cambridge-9-test-4-part3-headings-27-30",
        type: "headings",
        title: "List of Headings",
        instruction: "Reading Passage 3 has six paragraphs, A–F. Choose the correct heading for paragraphs B–E from the list. Write the correct number, i–vii. Example: Paragraph A — v.",
        questionNumbers: [27, 28, 29, 30],
        options: [
          { id: "i", text: "Commercial pressures on people in charge" },
          { id: "ii", text: "Mixed views on current changes to museums" },
          { id: "iii", text: "Interpreting the facts to meet visitor expectations" },
          { id: "iv", text: "The international dimension" },
          { id: "v", text: "Collections of factual evidence" },
          { id: "vi", text: "Fewer differences between public attractions" },
          { id: "vii", text: "Current reviews and suggestions" },
        ],
      },
      multipleChoiceBlock("cambridge-9-test-4-part3-questions-31-36", [
        {
          number: 31,
          prompt: "Compared with today’s museums, those of the past",
          options: ["did not present history in a detailed way.", "were not primarily intended for the public.", "were more clearly organised.", "preserved items with greater care."],
        },
        {
          number: 32,
          prompt: "According to the writer, current trends in the heritage industry",
          options: ["emphasise personal involvement.", "have their origins in York and London.", "rely on computer images.", "reflect minority tastes."],
        },
        {
          number: 33,
          prompt: "The writer says that museums, heritage sites and theme parks",
          options: ["often work in close partnership.", "try to preserve separate identities.", "have similar exhibits.", "are less easy to distinguish than before."],
        },
        {
          number: 34,
          prompt: "The writer says that in preparing exhibits for museums, experts",
          options: ["should pursue a single objective.", "have to do a certain amount of language translation.", "should be free from commercial constraints.", "have to balance conflicting priorities."],
        },
        {
          number: 35,
          prompt: "In paragraph E, the writer suggests that some museum exhibits",
          options: ["fail to match visitor expectations.", "are based on the false assumptions of professionals.", "reveal more about present beliefs than about the past.", "allow visitors to make more use of their imagination."],
        },
        {
          number: 36,
          prompt: "The passage ends by noting that our view of history is biased because",
          options: ["we fail to use our imagination.", "only very durable objects remain from the past.", "we tend to ignore things that displease us.", "museum exhibits focus too much on the local area."],
        },
      ]),
      rawFillBlock(
        "cambridge-9-test-4-part3-questions-37-40",
        "Questions 37–40",
        "Questions 37–40\nDo the following statements agree with the information given in Reading Passage 3?\n\nIn boxes 37–40 on your answer sheet, write\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN if there is no information on this\n\n37 Consumers prefer theme parks which avoid serious issues.\n38 More people visit museums than theme parks.\n39 The boundaries of Leyden have changed little since the seventeenth century.\n40 Museums can give a false impression of how life used to be.",
        37,
        40,
      ),
    ],
    source: {
      passagePages: [pageRef(96), pageRef(97)],
      questionPages: [pageRef(95), pageRef(98), pageRef(99)],
      answerPages: [pageRef(131)],
      explanationPages: [172, 173, 174, 175, 176, 177, 178].map((page) => explanationRef(3, page)),
      explanationAttribution,
      analysisVerified: true,
    },
  },
];

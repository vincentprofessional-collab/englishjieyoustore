import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  17: [1592, 2335], 18: [1734, 2238], 19: [1704, 2339], 20: [1630, 2280],
  21: [1511, 2239], 22: [1640, 2239], 23: [1548, 2238], 24: [1636, 2239],
  25: [1507, 2238], 26: [1723, 2238], 27: [1454, 2237], 118: [1520, 1211],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci12-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = { 21: 829, 27: 529, 34: 1262 };
  return {
    page,
    src: "/reading/explanations/cambridge-12-test-1-part" + part + "-exp12-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2249,
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

const yesNoOptions = [
  { letter: "YES", text: "The statement agrees with the views of the writer." },
  { letter: "NO", text: "The statement contradicts the views of the writer." },
  { letter: "NOT GIVEN", text: "There is no information on this." },
];

const cork: ReadingPart = {
  id: "cambridge-12-test-1-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "Cork",
  subtitle: "The thick bark of the cork oak",
  sections: [{
    id: "cambridge-12-test-1-part1-passage",
    format: "pre",
    paragraphs: [
      "Cork — the thick bark of the cork oak tree (Quercus suber) — is a remarkable material. It is tough, elastic, buoyant and fire-resistant, and suitable for a wide range of purposes. It has also been used for millennia: the ancient Egyptians sealed their sarcophagi (stone coffins) with cork, while the ancient Greeks and Romans used it for anything from beehives to sandals.",
      "And the cork oak itself is an extraordinary tree. Its bark grows up to 20 cm in thickness, insulating the tree like a coat wrapped around the trunk and branches and keeping the inside at a constant 20°C all year round. Developed most probably as a defence against forest fires, the bark of the cork oak has a particular cellular structure — with about 40 million cells per cubic centimetre — that technology has never succeeded in replicating. The cells are filled with air, which is why cork is so buoyant. It also has an elasticity that means you can squash it and watch it spring back to its original size and shape when you release the pressure.",
      "Cork oaks grow in a number of Mediterranean countries, including Portugal, Spain, Italy, Greece and Morocco. They flourish in warm, sunny climates where there is a minimum of 400 millimetres of rain per year, and not more than 800 millimetres. Like grape vines, the trees thrive in poor soil, putting down deep roots in search of moisture and nutrients. Southern Portugal’s Alentejo region meets all of these requirements, which explains why, by the early 20th century, this region had become the world’s largest producer of cork, and why today it accounts for roughly half of all cork production around the world.",
      "Most cork forests are family-owned. Many of these family businesses, and indeed many of the trees themselves, are around 200 years old. Cork production is, above all, an exercise in patience. From the planting of a cork sapling to the first harvest takes 25 years, and a gap of approximately a decade must separate harvests from an individual tree. And for top-quality cork, it’s necessary to wait a further 15 or 20 years. You even have to wait for the right kind of summer’s day to harvest cork. If the bark is stripped on a day when it’s too cold — or when the air is damp — the tree will be damaged.",
      "Cork harvesting is a very specialised profession. No mechanical means of stripping cork bark has been invented, so the job is done by teams of highly skilled workers. First, they make vertical cuts down the bark using small sharp axes, then lever it away in pieces as large as they can manage. The most skilful cork-strippers prise away a semi-circular husk that runs the length of the trunk from just above ground level to the first branches. It is then dried on the ground for about four months, before being taken to factories, where it is boiled to kill any insects that might remain in the cork. Over 60% of cork then goes on to be made into traditional bottle stoppers, with most of the remainder being used in the construction trade. Corkboard and cork tiles are ideal for thermal and acoustic insulation, while granules of cork are used in the manufacture of concrete.",
      "Recent years have seen the end of the virtual monopoly of cork as the material for bottle stoppers, due to concerns about the effect it may have on the contents of the bottle. This is caused by a chemical compound called 2,4,6-trichloroanisole (TCA), which forms through the interaction of plant phenols, chlorine and mould. The tiniest concentrations — as little as three or four parts to a trillion — can spoil the taste of the product contained in the bottle. The result has been a gradual yet steady move first towards plastic stoppers and, more recently, to aluminium screw caps. These substitutes are cheaper to manufacture and, in the case of screw caps, more convenient for the user.",
      "The classic cork stopper does have several advantages, however. Firstly, its traditional image is more in keeping with that of the type of high-quality goods with which it has long been associated. Secondly — and very importantly — cork is a sustainable product that can be recycled without difficulty. Moreover, cork forests are a resource which support local biodiversity, and prevent desertification in the regions where they are planted. So, given the current concerns about environmental issues, the future of this ancient material once again looks promising.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-12-test-1-part1-questions-1-5",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 1–5 on your answer sheet, write TRUE, FALSE or NOT GIVEN.",
      questions: [
        { questionNumbers: [1], prompt: "The cork oak has the thickest bark of any living tree.", options: judgmentOptions },
        { questionNumbers: [2], prompt: "Scientists have developed a synthetic cork with the same cellular structure as natural cork.", options: judgmentOptions },
        { questionNumbers: [3], prompt: "Individual cork oak trees must be left for 25 years between the first and second harvest.", options: judgmentOptions },
        { questionNumbers: [4], prompt: "Cork bark should be stripped in dry atmospheric conditions.", options: judgmentOptions },
        { questionNumbers: [5], prompt: "The only way to remove the bark from cork oak trees is by hand.", options: judgmentOptions },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-12-test-1-part1-questions-6-13",
        "Questions 6–13",
        "Questions 6–13\nComplete the notes below. Choose ONE WORD ONLY from the passage for each answer.\n\nComparison of aluminium screw caps and cork bottle stoppers\n\nAdvantages of aluminium screw caps\n• do not affect the 6 ______ of the bottle contents\n• are 7 ______ to produce\n• are 8 ______ to use\n\nAdvantages of cork bottle stoppers\n• suit the 9 ______ of quality products\n• made from a 10 ______ material\n• easily 11 ______\n• cork forests aid 12 ______\n• cork forests stop 13 ______ happening",
        6,
        13,
      ),
    },
  ],
  source: {
    passagePages: [sourcePage(17), sourcePage(18)],
    questionPages: [sourcePage(19), sourcePage(20)],
    answerPages: [sourcePage(118)],
    explanationPages: [21, 22, 23, 24].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集12精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const collecting: ReadingPart = {
  id: "cambridge-12-test-1-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 below.",
  title: "Collecting as a hobby",
  sections: [{
    id: "cambridge-12-test-1-part2-passage",
    format: "pre",
    paragraphs: [
      "Collecting must be one of the most varied of human activities, and it’s one that many of us psychologists find fascinating. Many forms of collecting have been dignified with a technical name: an arctophilist collects teddy bears, a philatelist collects postage stamps, and a deltiologist collects postcards. Amassing hundreds or even thousands of postcards, chocolate wrappers or whatever, takes time, energy and money that could surely be put to much more productive use. And yet there are millions of collectors around the world. Why do they do it?",
      "There are the people who collect because they want to make money — this could be called an instrumental reason for collecting; that is, collecting as a means to an end. They’ll look for, say, antiques that they can buy cheaply and expect to be able to sell at a profit. But there may well be a psychological element, too — buying cheap and selling dear can give the collector a sense of triumph. And as selling online is so easy, more and more people are joining in.",
      "Many collectors collect to develop their social life, attending meetings of a group of collectors and exchanging information on items. This is a variant on joining a bridge club or a gym, and similarly brings them into contact with like-minded people.",
      "Another motive for collecting is the desire to find something special, or a particular example of the collected item, such as a rare early recording by a particular singer. Some may spend their whole lives in a hunt for this. Psychologically, this can give a purpose to a life that otherwise feels aimless. There is a danger, though, that if the individual is ever lucky enough to find what they’re looking for, rather than celebrating their success, they may feel empty, now that the goal that drove them on has gone.",
      "If you think about collecting postage stamps, another potential reason for it — or, perhaps, a result of collecting — is its educational value. Stamp collecting opens a window to other countries, and to the plants, animals, or famous people shown on their stamps. Similarly, in the 19th century, many collectors amassed fossils, animals and plants from around the globe, and their collections provided a vast amount of information about the natural world. Without those collections, our understanding would be greatly inferior to what it is.",
      "In the past — and nowadays, too, though to a lesser extent — a popular form of collecting, particularly among boys and men, was trainspotting. This might involve trying to see every locomotive of a particular type, using published data that identifies each one, and ticking off each engine as it is seen. Trainspotters exchange information, these days often by mobile phone, so they can work out where to go to see a particular engine. As a by-product, many practitioners of the hobby become very knowledgeable about railway operations, or the technical specifications of different engine types.",
      "Similarly, people who collect dolls may go beyond simply enlarging their collection, and develop an interest in the way that dolls are made, or the materials that are used. These have changed over the centuries from the wood that was standard in 16th-century Europe, through the wax and porcelain of later centuries, to the plastics of today’s dolls. Or collectors might be inspired to study how dolls reflect notions of what children like, or ought to like.",
      "Not all collectors are interested in learning from their hobby, though, so what we might call a psychological reason for collecting is the need for a sense of control, perhaps as a way of dealing with insecurity. Stamp collectors, for instance, arrange their stamps in albums, usually very neatly, organising their collection according to certain commonplace principles — perhaps by country in alphabetical order, or grouping stamps by what they depict: people, birds, maps, and so on.",
      "One reason, conscious or not, for what someone chooses to collect is to show the collector’s individualism. Someone who decides to collect something as unexpected as dog collars, for instance, may be conveying their belief that they must be interesting themselves. And believe it or not, there is at least one dog-collar museum in existence, and it grew out of a personal collection.",
      "Of course, all hobbies give pleasure, but the common factor in collecting is usually passion: pleasure is putting it far too mildly. More than most other hobbies, collecting can be totally engrossing, and can give a strong sense of personal fulfilment. To non-collectors it may appear an eccentric, if harmless, way of spending time, but potentially, collecting has a lot going for it.",
    ],
  }],
  questionBlocks: [
    {
      ...rawFillBlock(
        "cambridge-12-test-1-part2-questions-14-21",
        "Questions 14–21",
        "Questions 14–21\nComplete the sentences below. Choose ONE WORD ONLY from the passage for each answer.\n\n14 The writer mentions collecting ______ as an example of collecting in order to make money.\n15 Collectors may get a feeling of ______ from buying and selling items.\n16 Collectors’ clubs provide opportunities to share ______.\n17 Collectors’ clubs offer ______ with people who have similar interests.\n18 Collecting sometimes involves a life-long ______ for a special item.\n19 Searching for something particular may prevent people from feeling their life is completely ______.\n20 Stamp collecting may be ______ because it provides facts about different countries.\n21 ______ tends to be mostly a male hobby.",
        14,
        21,
      ),
    },
    {
      id: "cambridge-12-test-1-part2-questions-22-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 2? In boxes 22–26 on your answer sheet, write TRUE, FALSE or NOT GIVEN.",
      questions: [
        { questionNumbers: [22], prompt: "The number of people buying dolls has grown over the centuries.", options: judgmentOptions },
        { questionNumbers: [23], prompt: "Sixteenth-century European dolls were normally made of wax and porcelain.", options: judgmentOptions },
        { questionNumbers: [24], prompt: "Arranging a stamp collection by the size of the stamps is less common than other methods.", options: judgmentOptions },
        { questionNumbers: [25], prompt: "Someone who collects unusual objects may want others to think he or she is also unusual.", options: judgmentOptions },
        { questionNumbers: [26], prompt: "Collecting gives a feeling that other hobbies are unlikely to inspire.", options: judgmentOptions },
      ],
    },
  ],
  source: {
    passagePages: [sourcePage(21), sourcePage(22)],
    questionPages: [sourcePage(23)],
    answerPages: [sourcePage(118)],
    explanationPages: [27, 28, 29, 30, 31].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集12精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const knowledge: ReadingPart = {
  id: "cambridge-12-test-1-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "What’s the purpose of gaining knowledge?",
  sections: [
    {
      id: "cambridge-12-test-1-part3-section-a",
      heading: "A",
      format: "pre",
      paragraphs: ["‘I would found an institution where any person can find instruction in any subject.’ That was the founder’s motto for Cornell University, and it seems an apt characterization of the different university, also in the USA, where I currently teach philosophy. A student can prepare for a career in resort management, engineering, interior design, accounting, music, law enforcement, you name it. But what would the founders of these two institutions have thought of a course called ‘Arson for Profit’? I kid you not: we have it on the books. Any undergraduates who have met the academic requirements can sign up for the course in our programme in ‘fire science’."],
    },
    {
      id: "cambridge-12-test-1-part3-section-b",
      heading: "B",
      format: "pre",
      paragraphs: ["Naturally, the course is intended for prospective arson investigators, who can learn all the tricks of the trade for detecting whether a fire was deliberately set, discovering who did it, and establishing a chain of evidence for effective prosecution in a court of law. But wouldn’t this also be the perfect course for prospective arsonists to sign up for? My point is not to criticize academic programmes in fire science: they are highly welcome as part of the increasing professionalization of this and many other occupations. However, it’s not unknown for a firefighter to torch a building. This example suggests how dishonest and illegal behaviour, with the help of higher education, can creep into every aspect of public and business life."],
    },
    {
      id: "cambridge-12-test-1-part3-section-c",
      heading: "C",
      format: "pre",
      paragraphs: ["I realized this anew when I was invited to speak before a class in marketing, which is another of our degree programmes. The regular instructor is a colleague who appreciates the kind of ethical perspective I can bring as a philosopher. There are endless ways I could have approached this assignment, but I took my cue from the title of the course: ‘Principles of Marketing’. It made me think to ask the students, ‘Is marketing principled?’ After all, a subject matter can have principles in the sense of being codified, having rules, as with football or chess, without being principled in the sense of being ethical. Many of the students immediately assumed that the answer to my question about marketing principles was obvious: no. Just look at the ways in which everything under the sun has been marketed; obviously it need not be done in a principled (=ethical) fashion."],
    },
    {
      id: "cambridge-12-test-1-part3-section-d",
      heading: "D",
      format: "pre",
      paragraphs: ["Is that obvious? I made the suggestion, which may sound downright crazy in light of the evidence, that perhaps marketing is by definition principled. My inspiration for this judgement is the philosopher Immanuel Kant, who argued that any body of knowledge consists of an end (or purpose) and a means."],
    },
    {
      id: "cambridge-12-test-1-part3-section-e",
      heading: "E",
      format: "pre",
      paragraphs: ["Let us apply both the terms ‘means’ and ‘end’ to marketing. The students have signed up for a course in order to learn how to market effectively. But to what end? There seem to be two main attitudes toward that question. One is that the answer is obvious: the purpose of marketing is to sell things and to make money. The other attitude is that the purpose of marketing is irrelevant: each person comes to the programme and course with his or her own plans, and these need not even concern the acquisition of marketing expertise as such. My proposal, which I believe would also be Kant’s, is that neither of these attitudes captures the significance of the end to the means for marketing. A field of knowledge or a professional endeavour is defined by both the means and the end; hence both deserve scrutiny. Students need to study both how to achieve X, and also what X is."],
    },
    {
      id: "cambridge-12-test-1-part3-section-f",
      heading: "F",
      format: "pre",
      paragraphs: ["It is at this point that ‘Arson for Profit’ becomes supremely relevant. That course is presumably all about means: how to detect and prosecute criminal activity. It is therefore assumed that the end is good in an ethical sense. When I ask fire science students to articulate the end, or purpose, of their field, they eventually generalize to something like, ‘The safety and welfare of society,’ which seems right. As we have seen, someone could use the very same knowledge of means to achieve a much less noble end, such as personal profit via destructive, dangerous, reckless activity. But we would not call that firefighting. We have a separate word for it: arson. Similarly, if you employed the ‘principles of marketing’ in an unprincipled way, you would not be doing marketing. We have another term for it: fraud. Kant gives the example of a doctor and a poisoner, who use the identical knowledge to achieve their divergent ends. We would say that one is practising medicine, the other, murder."],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-12-test-1-part3-headings-27-32",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 3 has six sections, A–F. Choose the correct heading for each section from the list below. Write the correct number, i–viii.",
      questionNumbers: [27, 28, 29, 30, 31, 32],
      options: [
        { id: "i", text: "Courses that require a high level of commitment" },
        { id: "ii", text: "A course title with two meanings" },
        { id: "iii", text: "The equal importance of two key issues" },
        { id: "iv", text: "Applying a theory in an unexpected context" },
        { id: "v", text: "The financial benefits of studying" },
        { id: "vi", text: "A surprising course title" },
        { id: "vii", text: "Different names for different outcomes" },
        { id: "viii", text: "The possibility of attracting the wrong kind of student" },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-12-test-1-part3-questions-33-36",
        "Questions 33–36",
        "Questions 33–36\nComplete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.\n\nThe ‘Arson for Profit’ course\nThis is a university course intended for students who are undergraduates and who are studying 33 ______. The expectation is that they will become 34 ______ specialising in arson. The course will help them to detect cases of arson and find 35 ______ of criminal intent, leading to successful 36 ______ in the courts.",
        33,
        36,
      ),
    },
    {
      id: "cambridge-12-test-1-part3-questions-37-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the views of the writer in Reading Passage 3? In boxes 37–40 on your answer sheet, write YES, NO or NOT GIVEN.",
      questions: [
        { questionNumbers: [37], prompt: "It is difficult to attract students onto courses that do not focus on a career.", options: yesNoOptions },
        { questionNumbers: [38], prompt: "The ‘Arson for Profit’ course would be useful for people intending to set fire to buildings.", options: yesNoOptions },
        { questionNumbers: [39], prompt: "Fire science courses are too academic to help people to be good at the job of firefighting.", options: yesNoOptions },
        { questionNumbers: [40], prompt: "The writer’s fire science students provided a detailed definition of the purpose of their studies.", options: yesNoOptions },
      ],
    },
  ],
  source: {
    passagePages: [sourcePage(25), sourcePage(26)],
    questionPages: [sourcePage(24), sourcePage(27)],
    answerPages: [sourcePage(118)],
    explanationPages: [34, 35, 36, 37, 38].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集12精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE12_TEST1_PARTS: ReadingPart[] = [cork, collecting, knowledge];

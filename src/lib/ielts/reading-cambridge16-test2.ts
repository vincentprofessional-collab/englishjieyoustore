import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  38: [1750, 2299], 39: [1750, 2299], 40: [1750, 2299], 41: [1750, 2299],
  42: [1750, 2299], 43: [1750, 2299], 44: [1750, 2299], 45: [1750, 2299],
  46: [1750, 2299], 47: [1750, 2299], 48: [1750, 2299], 49: [1750, 2299],
  50: [1750, 2299], 51: [1750, 2299], 124: [1750, 1641],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1750, 2299];
  return {
    page,
    src: "/reading/source-pages/ci16-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = {
    90: 2105, 91: 2300, 92: 2294, 93: 2301, 94: 2296,
    100: 1907, 101: 2297, 102: 2296, 103: 2299, 104: 2295, 105: 2302, 106: 2295,
    112: 908, 113: 2306, 114: 2297, 115: 2306, 116: 2296, 117: 2301, 118: 2298, 119: 2305,
  };
  return {
    page,
    src: "/reading/explanations/cambridge-16-test-2-part" + part + "-exp16-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2295,
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

const microbesWordBank = [
  { letter: "A", text: "solution" }, { letter: "B", text: "partnership" },
  { letter: "C", text: "destruction" }, { letter: "D", text: "exaggeration" },
  { letter: "E", text: "cleanliness" }, { letter: "F", text: "regulations" },
  { letter: "G", text: "illness" }, { letter: "H", text: "nutrition" },
];

const wisdomWordBank = [
  { letter: "A", text: "opinions" }, { letter: "B", text: "confidence" },
  { letter: "C", text: "view" }, { letter: "D", text: "modesty" },
  { letter: "E", text: "problems" }, { letter: "F", text: "objectivity" },
  { letter: "G", text: "fairness" }, { letter: "H", text: "experiences" },
  { letter: "I", text: "range" }, { letter: "J", text: "reasons" },
];

const whiteHorse: ReadingPart = {
  id: "cambridge-16-test-2-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "The White Horse of Uffington",
  sections: [{
    id: "cambridge-16-test-2-part1-passage",
    format: "pre",
    paragraphs: [
      "The cutting of huge figures or ‘geoglyphs’ into the earth of English hillsides has taken place for more than 3,000 years. There are 56 hill figures scattered around England, with the vast majority on the chalk downlands of the country’s southern counties. The figures include giants, horses, crosses and regimental badges. Although the majority of these geoglyphs date within the last 300 years or so, there are one or two that are much older.",
      "The most famous of these figures is perhaps also the most mysterious — the Uffington White Horse in Oxfordshire. The White Horse has recently been re-dated and shown to be even older than its previously assigned ancient pre-Roman Iron Age date. More controversial is the date of the enigmatic Long Man of Wilmington in Sussex. While many historians are convinced the figure is prehistoric, others believe that it was the work of an artistic monk from a nearby priory and was created between the 11th and 15th centuries.",
      "The method of cutting these huge figures was simply to remove the overlying grass to reveal the gleaming white chalk below. However, the grass would soon grow over the geoglyph again unless it was regularly cleaned or scoured by a fairly large team of people. One reason that the vast majority of hill figures have disappeared is that when the traditions associated with the figures faded, people no longer bothered or remembered to clear away the grass to expose the chalk outline. Furthermore, over hundreds of years the outlines would sometimes change due to people not always cutting in exactly the same place, thus creating a different shape to the original geoglyph. The fact that any ancient hill figures survive at all in England today is testament to the strength and continuity of local customs and beliefs which, in one case at least, must stretch back over millennia.",
      "The Uffington White Horse is a unique, stylised representation of a horse consisting of a long, sleek back, thin disjointed legs, a streaming tail, and a bird-like beaked head. The elegant creature almost melts into the landscape. The horse is situated 2.5 km from Uffington village on a steep slope close to the Late Bronze Age (c. 7th century BCE) hillfort of Uffington Castle and below the Ridgeway, a long-distance Neolithic track.",
      "The Uffington Horse is also surrounded by Bronze Age burial mounds. It is not far from the Bronze Age cemetery of Lambourn Seven Barrows, which consists of more than 30 well-preserved burial mounds. The carving has been placed in such a way as to make it extremely difficult to see from close quarters, and like many geoglyphs is best appreciated from the air. Nevertheless, there are certain areas of the Vale of the White Horse, the valley containing and named after the enigmatic creature, from which an adequate impression may be gained. Indeed on a clear day the carving can be seen from up to 30 km away.",
      "The earliest evidence of a horse at Uffington is from the 1070s CE when ‘White Horse Hill’ is mentioned in documents from the nearby Abbey of Abingdon, and the first reference to the horse itself is soon after, in 1190 CE. However, the carving is believed to date back much further than that. Due to the similarity of the Uffington White Horse to the stylised depictions of horses on 1st century BCE coins, it had been thought that the creature must also date to that period.",
      "However, in 1995 Optically Stimulated Luminescence (OSL) testing was carried out by the Oxford Archaeological Unit on soil from two of the lower layers of the horse’s body, and from another cut near the base. The result was a date for the horse’s construction somewhere between 1400 and 600 BCE — in other words, it had a Late Bronze Age or Early Iron Age origin.",
      "The latter end of this date range would tie the carving of the horse in with occupation of the nearby Uffington hillfort, indicating that it may represent a tribal emblem marking the land of the inhabitants of the hillfort. Alternatively, the carving may have been carried out during a Bronze or Iron Age ritual. Some researchers see the horse as representing the Celtic horse goddess Epona, who was worshipped as a protector of horses, and for her associations with fertility. However, the cult of Epona was not imported from Gaul (France) until around the first century CE. This date is at least six centuries after the Uffington Horse was probably carved. Nevertheless, the horse had great ritual and economic significance during the Bronze and Iron Ages, as attested by its depictions on jewellery and other metal objects. It is possible that the carving represents a goddess in native mythology, such as Rhiannon, described in later Welsh mythology as a beautiful woman dressed in gold and riding a white horse.",
      "The fact that geoglyphs can disappear easily, along with their associated rituals and meaning, indicates that they were never intended to be anything more than temporary gestures. But this does not lessen their importance. These giant carvings are a fascinating glimpse into the minds of their creators and how they viewed the landscape in which they lived.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-16-test-2-part1-questions-1-8",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 1–8 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [1], prompt: "Most geoglyphs in England are located in a particular area of the country.", options: trueFalseNotGivenOptions },
        { questionNumbers: [2], prompt: "There are more geoglyphs in the shape of a horse than any other creature.", options: trueFalseNotGivenOptions },
        { questionNumbers: [3], prompt: "A recent dating of the Uffington White Horse indicates that people were mistaken about its age.", options: trueFalseNotGivenOptions },
        { questionNumbers: [4], prompt: "Historians have come to an agreement about the origins of the Long Man of Wilmington.", options: trueFalseNotGivenOptions },
        { questionNumbers: [5], prompt: "Geoglyphs were created by people placing white chalk on the hillside.", options: trueFalseNotGivenOptions },
        { questionNumbers: [6], prompt: "Many geoglyphs in England are no longer visible.", options: trueFalseNotGivenOptions },
        { questionNumbers: [7], prompt: "The shape of some geoglyphs has been altered over time.", options: trueFalseNotGivenOptions },
        { questionNumbers: [8], prompt: "The fame of the Uffington White Horse is due to its size.", options: trueFalseNotGivenOptions },
      ],
    },
    rawFillBlock(
      "cambridge-16-test-2-part1-questions-9-13",
      "The Uffington White Horse",
      "Complete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 9–13 on your answer sheet.",
      "The Uffington White Horse\n\nThe location of the Uffington White Horse:\n• a distance of 2.5 km from Uffington village\n• near an ancient road known as the 9 ______\n• close to an ancient cemetery that has a number of burial mounds\n\nDating the Uffington White Horse:\n• first reference to White Horse Hill appears in 10 ______ in the 1070s\n• horses shown on coins from the period 100 BCE–1 BCE are similar in appearance\n• according to analysis of the surrounding 11 ______, the Horse is Late Bronze Age / Early Iron Age\n\nPossible reasons for creation of the Uffington White Horse:\n• an emblem to indicate land ownership\n• formed part of an ancient ritual\n• was a representation of goddess Epona — associated with protection of horses and with 12 ______\n• may have represented the native goddess 13 ______",
      9,
      13,
    ),
  ],
  source: {
    passagePages: [38, 39].map(sourcePage),
    questionPages: [40, 41].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [90, 91, 92, 93, 94].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集16精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const microbes: ReadingPart = {
  id: "cambridge-16-test-2-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "I contain multitudes",
  byline: "Wendy Moore reviews Ed Yong’s book about microbes",
  sections: [{
    id: "cambridge-16-test-2-part2-passage",
    format: "pre",
    paragraphs: [
      "Microbes, most of them bacteria, have populated this planet since long before animal life developed and they will outlive us. Invisible to the naked eye, they are ubiquitous. They inhabit the soil, air, rocks and water and are present within every form of life, from seaweed and coral to dogs and humans. And, as Yong explains in his utterly absorbing and hugely important book, we mess with them at our peril.",
      "Every species has its own colony of microbes, called a ‘microbiome’, and these microbes vary not only between species but also between individuals and within different parts of each individual. What is amazing is that while the number of human cells in the average person is about 30 trillion, the number of microbial ones is higher — about 39 trillion. At best, Yong informs us, we are only 50 per cent human. Indeed, some scientists even suggest we should think of each species and its microbes as a single unit, dubbed a ‘holobiont’.",
      "In each human there are microbes that live only in the stomach, the mouth or the armpit and by and large they do so peacefully. So ‘bad’ microbes are just microbes out of context. Microbes that sit contentedly in the human gut (where there are more microbes than there are stars in the galaxy) can become deadly if they find their way into the bloodstream. These communities are constantly changing too. The right hand shares just one sixth of its microbes with the left hand. And, of course, we are surrounded by microbes. Every time we eat, we swallow a million microbes in each gram of food; we are continually swapping microbes with other humans, pets and the world at large.",
      "It’s a fascinating topic and Yong, a young British science journalist, is an extraordinarily adept guide. Writing with lightness and panache, he has a knack of explaining complex science in terms that are both easy to understand and totally enthralling. Yong is on a mission. Leading us gently by the hand, he takes us into the world of microbes — a bizarre, alien planet — in a bid to persuade us to love them as much as he does. By the end, we do.",
      "For most of human history we had no idea that microbes existed. The first man to see these extraordinarily potent creatures was a Dutch lens-maker called Antony van Leeuwenhoek in the 1670s. Using microscopes of his own design that could magnify up to 270 times, he examined a drop of water from a nearby lake and found it teeming with tiny creatures he called ‘animalcules’. It wasn’t until nearly two hundred years later that the research of French biologist Louis Pasteur indicated that some microbes caused disease. It was Pasteur’s ‘germ theory’ that gave bacteria the poor image that endures today.",
      "Yong’s book is in many ways a plea for microbial tolerance, pointing out that while fewer than one hundred species of bacteria bring disease, many thousands more play a vital role in maintaining our health. The book also acknowledges that our attitude towards bacteria is not a simple one. We tend to see the dangers posed by bacteria, yet at the same time we are sold yoghurts and drinks that supposedly nurture ‘friendly’ bacteria. In reality, says Yong, bacteria should not be viewed as either friends or foes, villains or heroes. Instead we should realise we have a symbiotic relationship, that can be mutually beneficial or mutually destructive.",
      "What then do these millions of organisms do? The answer is pretty much everything. New research is now unravelling the ways in which bacteria aid digestion, regulate our immune systems, eliminate toxins, produce vitamins, affect our behaviour and even combat obesity. ‘They actually help us become who we are,’ says Yong. But we are facing a growing problem. Our obsession with hygiene, our overuse of antibiotics and our unhealthy, low-fibre diets are disrupting the bacterial balance and may be responsible for soaring rates of allergies and immune problems, such as inflammatory bowel disease (IBD).",
      "The most recent research actually turns accepted norms upside down. For example, there are studies indicating that the excessive use of household detergents and antibacterial products actually destroys the microbes that normally keep the more dangerous germs at bay. Other studies show that keeping a dog as a pet gives children early exposure to a diverse range of bacteria, which may help protect them against allergies later.",
      "The readers of Yong’s book must be prepared for a decidedly unglamorous world. Among the less appealing case studies is one about a fungus that is wiping out entire populations of frogs and that can be halted by a rare microbial bacterium. Another is about squid that carry luminescent bacteria that protect them against predators. However, if you can overcome your distaste for some of the investigations, the reasons for Yong’s enthusiasm become clear. The microbial world is a place of wonder. Already, in an attempt to stop mosquitoes spreading dengue fever — a disease that infects 400 million people a year — mosquitoes are being loaded with a bacterium to block the disease. In the future, our ability to manipulate microbes means we could construct buildings with useful microbes built into their walls to fight off infections. Just imagine a neonatal hospital ward coated in a specially mixed cocktail of microbes so that babies get the best start in life.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-16-test-2-part2-questions-14-16",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 14–16 on your answer sheet.",
      questions: [
        {
          questionNumbers: [14],
          prompt: "What point does the writer make about microbes in the first paragraph?",
          options: [
            { letter: "A", text: "They adapt quickly to their environment." },
            { letter: "B", text: "The risk they pose has been exaggerated." },
            { letter: "C", text: "They are more plentiful in animal life than plant life." },
            { letter: "D", text: "They will continue to exist for longer than the human race." },
          ],
        },
        {
          questionNumbers: [15],
          prompt: "In the second paragraph, the writer is impressed by the fact that",
          options: [
            { letter: "A", text: "each species tends to have vastly different microbes." },
            { letter: "B", text: "some parts of the body contain relatively few microbes." },
            { letter: "C", text: "the average individual has more microbial cells than human ones." },
            { letter: "D", text: "scientists have limited understanding of how microbial cells behave." },
          ],
        },
        {
          questionNumbers: [16],
          prompt: "What is the writer doing in the fifth paragraph?",
          options: [
            { letter: "A", text: "Explaining how a discovery was made." },
            { letter: "B", text: "Comparing scientists’ theories about microbes." },
            { letter: "C", text: "Describing confusion among scientists." },
            { letter: "D", text: "Giving details of how microbes cause disease." },
          ],
        },
      ],
    },
    {
      id: "cambridge-16-test-2-part2-questions-17-20",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary using the list of words, A–H, below. Write the correct letter in boxes 17–20 on your answer sheet.",
      questions: [
        { questionNumbers: [17], prompt: "Many microbes are beneficial, and only a relatively small number lead to …", options: microbesWordBank },
        { questionNumbers: [18], prompt: "We should accept that our relationship with microbes is one based on …", options: microbesWordBank },
        { questionNumbers: [19], prompt: "Our poor …, our overuse of antibiotics", options: microbesWordBank },
        { questionNumbers: [20], prompt: "and our excessive focus on … are upsetting the bacterial balance.", options: microbesWordBank },
      ],
    },
    {
      id: "cambridge-16-test-2-part2-questions-21-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 2? In boxes 21–26 on your answer sheet, write YES if the statement agrees with the claims of the writer, NO if the statement contradicts the claims of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [21], prompt: "It is possible that using antibacterial products in the home fails to have the desired effect.", options: yesNoNotGivenOptions },
        { questionNumbers: [22], prompt: "It is a good idea to ensure that children come into contact with as few bacteria as possible.", options: yesNoNotGivenOptions },
        { questionNumbers: [23], prompt: "Yong’s book contains more case studies than are necessary.", options: yesNoNotGivenOptions },
        { questionNumbers: [24], prompt: "The case study about bacteria that prevent squid from being attacked may have limited appeal.", options: yesNoNotGivenOptions },
        { questionNumbers: [25], prompt: "Efforts to control dengue fever have been surprisingly successful.", options: yesNoNotGivenOptions },
        { questionNumbers: [26], prompt: "Microbes that reduce the risk of infection have already been put inside the walls of some hospital wards.", options: yesNoNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [42, 43].map(sourcePage),
    questionPages: [44, 45, 46].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [100, 101, 102, 103, 104, 105, 106].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集16精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const wiseDecisions: ReadingPart = {
  id: "cambridge-16-test-2-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "How to make wise decisions",
  sections: [{
    id: "cambridge-16-test-2-part3-passage",
    format: "pre",
    paragraphs: [
      "Across cultures, wisdom has been considered one of the most revered human qualities. Although the truly wise may seem few and far between, empirical research examining wisdom suggests that it isn’t an exceptional trait possessed by a small handful of bearded philosophers after all — in fact, the latest studies suggest that most of us have the ability to make wise decisions, given the right context.",
      "‘It appears that experiential, situational, and cultural factors are even more powerful in shaping wisdom than previously imagined,’ says Associate Professor Igor Grossmann of the University of Waterloo in Ontario, Canada. ‘Recent empirical findings from cognitive, developmental, social, and personality psychology cumulatively suggest that people’s ability to reason wisely varies dramatically across experiential and situational contexts. Understanding the role of such contextual factors offers unique insights into understanding wisdom in daily life, as well as how it can be enhanced and taught.’",
      "It seems that it’s not so much that some people simply possess wisdom and others lack it, but that our ability to reason wisely depends on a variety of external factors. ‘It is impossible to characterize thought processes attributed to wisdom without considering the role of contextual factors,’ explains Grossmann. ‘In other words, wisdom is not solely an “inner quality” but rather unfolds as a function of situations people happen to be in. Some situations are more likely to promote wisdom than others.’",
      "Coming up with a definition of wisdom is challenging, but Grossmann and his colleagues have identified four key characteristics as part of a framework of wise reasoning. One is intellectual humility or recognition of the limits of our own knowledge, and another is appreciation of perspectives wider than the issue at hand. Sensitivity to the possibility of change in social relations is also key, along with compromise or integration of different attitudes and beliefs.",
      "Grossmann and his colleagues have also found that one of the most reliable ways to support wisdom in our own day-to-day decisions is to look at scenarios from a third-party perspective, as though giving advice to a friend. Research suggests that when adopting a first-person viewpoint we focus on ‘the focal features of the environment’ and when we adopt a third-person, ‘observer’ viewpoint we reason more broadly and focus more on interpersonal and moral ideals such as justice and impartiality. Looking at problems from this more expansive viewpoint appears to foster cognitive processes related to wise decisions.",
      "What are we to do, then, when confronted with situations like a disagreement with a spouse or negotiating a contract at work, that require us to take a personal stake? Grossmann argues that even when we aren’t able to change the situation, we can still evaluate these experiences from different perspectives.",
      "For example, in one experiment that took place during the peak of a recent economic recession, graduating college seniors were asked to reflect on their job prospects. The students were instructed to imagine their career either ‘as if you were a distant observer’ or ‘before your own eyes as if you were right there’. Participants in the group assigned to the ‘distant observer’ role displayed more wisdom-related reasoning (intellectual humility and recognition of change) than did participants in the control group.",
      "In another study, couples in long-term romantic relationships were instructed to visualize an unresolved relationship conflict either through the eyes of an outsider or from their own perspective. Participants then discussed the incident with their partner for 10 minutes, after which they wrote down their thoughts about it. Couples in the ‘other’s eyes’ condition were significantly more likely to rely on wise reasoning — recognizing others’ perspectives and searching for a compromise — compared to the couples in the egocentric condition.",
      "‘Ego-decentering promotes greater focus on others and enables a bigger picture, conceptual view of the experience, affording recognition of intellectual humility and change,’ says Grossmann.",
      "We might associate wisdom with intelligence or particular personality traits, but research shows only a small positive relationship between wise thinking and crystallized intelligence and the personality traits of openness and agreeableness. ‘It is remarkable how much people can vary in their wisdom from one situation to the next, and how much stronger such contextual effects are for understanding the relationship between wise judgment and its social and affective outcomes as compared to the generalized “traits”,’ Grossmann explains. ‘That is, knowing how wisely a person behaves in a given situation is more informative for understanding their emotions or likelihood to forgive [or] retaliate as compared to knowing whether the person may be wise “in general”.’",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-16-test-2-part3-questions-27-30",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27–30 on your answer sheet.",
      questions: [
        {
          questionNumbers: [27],
          prompt: "What point does the writer make in the first paragraph?",
          options: [
            { letter: "A", text: "Wisdom appears to be unique to the human race." },
            { letter: "B", text: "A basic assumption about wisdom may be wrong." },
            { letter: "C", text: "Concepts of wisdom may depend on the society we belong to." },
            { letter: "D", text: "There is still much to be discovered about the nature of wisdom." },
          ],
        },
        {
          questionNumbers: [28],
          prompt: "What does Igor Grossmann suggest about the ability to make wise decisions?",
          options: [
            { letter: "A", text: "It can vary greatly from one person to another." },
            { letter: "B", text: "Earlier research into it was based on unreliable data." },
            { letter: "C", text: "The importance of certain influences on it was underestimated." },
            { letter: "D", text: "Various branches of psychology define it according to their own criteria." },
          ],
        },
        {
          questionNumbers: [29],
          prompt: "According to the third paragraph, Grossmann claims that the level of wisdom an individual shows",
          options: [
            { letter: "A", text: "can be greater than they think it is." },
            { letter: "B", text: "will be different in different circumstances." },
            { letter: "C", text: "may be determined by particular aspects of their personality." },
            { letter: "D", text: "should develop over time as a result of their life experiences." },
          ],
        },
        {
          questionNumbers: [30],
          prompt: "What is described in the fifth paragraph?",
          options: [
            { letter: "A", text: "A difficulty encountered when attempting to reason wisely." },
            { letter: "B", text: "An example of the type of person who is likely to reason wisely." },
            { letter: "C", text: "A controversial view about the benefits of reasoning wisely." },
            { letter: "D", text: "A recommended strategy that can help people to reason wisely." },
          ],
        },
      ],
    },
    {
      id: "cambridge-16-test-2-part3-questions-31-35",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary using the list of words, A–J, below. Write the correct letter in boxes 31–35 on your answer sheet.",
      questions: [
        { questionNumbers: [31], prompt: "It is important to have a certain degree of … regarding the extent of our knowledge.", options: wisdomWordBank },
        { questionNumbers: [32], prompt: "We should take into account … which may not be the same as our own.", options: wisdomWordBank },
        { questionNumbers: [33], prompt: "We should be able to take a broad … of any situation.", options: wisdomWordBank },
        { questionNumbers: [34], prompt: "Grossmann believes it is better to regard scenarios with …", options: wisdomWordBank },
        { questionNumbers: [35], prompt: "By avoiding the first-person perspective, we focus more on … and other moral ideals.", options: wisdomWordBank },
      ],
    },
    {
      id: "cambridge-16-test-2-part3-questions-36-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 3? In boxes 36–40 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [36], prompt: "Students participating in the job prospects experiment could choose one of two perspectives to take.", options: trueFalseNotGivenOptions },
        { questionNumbers: [37], prompt: "Participants in the couples experiment were aware that they were taking part in a study about wise reasoning.", options: trueFalseNotGivenOptions },
        { questionNumbers: [38], prompt: "In the couples experiments, the length of the couples’ relationships had an impact on the results.", options: trueFalseNotGivenOptions },
        { questionNumbers: [39], prompt: "In both experiments, the participants who looked at the situation from a more detached viewpoint tended to make wiser decisions.", options: trueFalseNotGivenOptions },
        { questionNumbers: [40], prompt: "Grossmann believes that a person’s wisdom is determined by their intelligence to only a very limited extent.", options: trueFalseNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [47, 48].map(sourcePage),
    questionPages: [49, 50, 51].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [112, 113, 114, 115, 116, 117, 118, 119].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集16精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE16_TEST2_PARTS: ReadingPart[] = [whiteHorse, microbes, wiseDecisions];

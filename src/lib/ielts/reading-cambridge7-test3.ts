import type { ReadingOption, ReadingPart } from "./reading";
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

const antsWordBank: ReadingOption[] = [
  { letter: "A", text: "aphids" },
  { letter: "B", text: "agricultural" },
  { letter: "C", text: "cellulose" },
  { letter: "D", text: "exchanging" },
  { letter: "E", text: "energy" },
  { letter: "F", text: "fertilizers" },
  { letter: "G", text: "food" },
  { letter: "H", text: "fungi" },
  { letter: "I", text: "growing" },
  { letter: "J", text: "interbreeding" },
  { letter: "K", text: "natural" },
  { letter: "L", text: "other species" },
  { letter: "M", text: "secretions" },
  { letter: "N", text: "sustainable" },
  { letter: "O", text: "environment" },
];

const antPassage: ReadingPart = {
  id: "cambridge-7-test-3-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "Ant Intelligence",
  sections: [
    {
      id: "c7t3-p1-a",
      paragraphs: [
        "When we think of intelligent members of the animal kingdom, the creatures that spring immediately to mind are apes and monkeys. But in fact the social lives of some members of the insect kingdom are sufficiently complex to suggest more than a hint of intelligence. Among these, the world of the ant has come in for considerable scrutiny lately, and the idea that ants demonstrate sparks of cognition has certainly not been rejected by those involved in these investigations.",
      ],
    },
    {
      id: "c7t3-p1-b",
      paragraphs: [
        "Ants store food, repel attackers and use chemical signals to contact one another in case of attack. Such chemical communication can be compared to the human use of visual and auditory channels (as in religious chants, advertising images and jingles, political slogans and martial music) to arouse and propagate moods and attitudes. The biologist Lewis Thomas wrote, ‘Ants are so much like human beings as to be an embarrassment. They farm fungi, raise aphids* as livestock, launch armies to war, use chemical sprays to alarm and confuse enemies, capture slaves, engage in child labour, exchange information ceaselessly. They do everything but watch television.’\n\n* aphids: small insects of a different species from ants",
      ],
    },
    {
      id: "c7t3-p1-c",
      paragraphs: [
        "However, in ants there is no cultural transmission — everything must be encoded in the genes — whereas in humans the opposite is true. Only basic instincts are carried in the genes of a newborn baby, other skills being learned from others in the community as the child grows up. It may seem that this cultural continuity gives us a huge advantage over ants. They have never mastered fire nor progressed. Their fungus farming and aphid herding crafts are sophisticated when compared to the agricultural skills of humans five thousand years ago but have been totally overtaken by modern human agribusiness.",
      ],
    },
    {
      id: "c7t3-p1-d",
      paragraphs: [
        "Or have they? The farming methods of ants are at least sustainable. They do not ruin environments or use enormous amounts of energy. Moreover, recent evidence suggests that the crop farming of ants may be more sophisticated and adaptable than was thought.",
      ],
    },
    {
      id: "c7t3-p1-e",
      paragraphs: [
        "Ants were farmers fifty million years before humans were. Ants can't digest the cellulose in leaves — but some fungi can. The ants therefore cultivate these fungi in their nests, bringing them leaves to feed on, and then use them as a source of food. Farmer ants secrete antibiotics to control other fungi that might act as ‘weeds’, and spread waste to fertilise the crop.",
      ],
    },
    {
      id: "c7t3-p1-f",
      paragraphs: [
        "It was once thought that the fungus that ants cultivate was a single type that they had propagated, essentially unchanged from the distant past. Not so. Ulrich Mueller of Maryland and his colleagues genetically screened 862 different types of fungi taken from ants' nests. These turned out to be highly diverse: it seems that ants are continually domesticating new species. Even more impressively, DNA analysis of the fungi suggests that the ants improve or modify the fungi by regularly swapping and sharing strains with neighbouring ant colonies.",
      ],
    },
    {
      id: "c7t3-p1-g",
      paragraphs: [
        "Whereas prehistoric man had no exposure to urban lifestyles — the forcing house of intelligence — the evidence suggests that ants have lived in urban settings for close on a hundred million years, developing and maintaining underground cities of specialised chambers and tunnels.",
      ],
    },
    {
      id: "c7t3-p1-h",
      paragraphs: [
        "When we survey Mexico City, Tokyo, Los Angeles, we are amazed at what has been accomplished by humans. Yet Hoelldobler and Wilson's magnificent work for ant lovers, The Ants, describes a supercolony of the ant Formica yessensis on the Ishikari Coast of Hokkaido. This ‘megalopolis’ was reported to be composed of 360 million workers and a million queens living in 4,500 interconnected nests across a territory of 2.7 square kilometres.",
      ],
    },
    {
      id: "c7t3-p1-i",
      paragraphs: [
        "Such enduring and intricately meshed levels of technical achievement outstrip by far anything achieved by our distant ancestors. We hail as masterpieces the cave paintings in southern France and elsewhere, dating back some 20,000 years. Ant societies existed in something like their present form more than seventy million years ago. Beside this, prehistoric man looks technologically primitive. Is this then some kind of intelligence, albeit of a different kind?",
      ],
    },
    {
      id: "c7t3-p1-j",
      paragraphs: [
        "Research conducted at Oxford, Sussex and Zurich Universities has shown that when desert ants return from a foraging trip, they navigate by integrating bearings and distances, which they continuously update in their heads. They combine the evidence of visual landmarks with a mental library of local directions, all within a framework which is consulted and updated. So ants can learn too.",
      ],
    },
    {
      id: "c7t3-p1-k",
      paragraphs: [
        "And in a twelve-year programme of work, Ryabko and Reznikova have found evidence that ants can transmit very complex messages. Scouts who had located food in a maze returned to mobilise their foraging teams. They engaged in contact sessions, at the end of which the scout was removed in order to observe what her team might do. Often the foragers proceeded to the exact spot in the maze where the food had been. Elaborate precautions were taken to prevent the foraging team using odour clues. Discussion now centres on whether the route through the maze is communicated as a ‘left right’ sequence of turns or as a ‘compass bearing and distance’ message.",
      ],
    },
    {
      id: "c7t3-p1-l",
      paragraphs: [
        "During the course of this exhaustive study, Reznikova has grown so attached to her laboratory ants that she feels she knows them as individuals — even without the paint spots used to mark them. It's no surprise that Edward Wilson, in his essay, ‘In the company of ants’, advises readers who ask what to do with the ants in their kitchen to: ‘Watch where you step. Be careful of little lives.’",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c7t3-p1-true-false-not-given",
      type: "choice",
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 1-6 on your answer sheet, write TRUE if the statement agrees with the information FALSE if the statement contradicts the information NOT GIVEN if there is no information on this",
      questions: [
        { questionNumbers: [1], prompt: "Ants use the same channels of communication as humans do.", options: trueFalseNotGiven },
        { questionNumbers: [2], prompt: "City life is one factor that encourages the development of intelligence.", options: trueFalseNotGiven },
        { questionNumbers: [3], prompt: "Ants can build large cities more quickly than humans do.", options: trueFalseNotGiven },
        { questionNumbers: [4], prompt: "Some ants can find their way by making calculations based on distance and position.", options: trueFalseNotGiven },
        { questionNumbers: [5], prompt: "In one experiment, foraging teams were able to use their sense of smell to find food.", options: trueFalseNotGiven },
        { questionNumbers: [6], prompt: "The essay, ‘In the company of ants’, explores ant communication.", options: trueFalseNotGiven },
      ],
    },
    {
      id: "c7t3-p1-farming-summary",
      type: "fill",
      title: "Ants as farmers",
      instruction: "Complete the summary using the list of words, A–O. Write the correct letter, A–O, in boxes 7–13 on your answer sheet.",
      questions: [7, 8, 9, 10, 11, 12, 13].map((number) => ({ number, before: "Question " + number })),
      wordBank: antsWordBank.map((option) => option.letter),
      rawText: "Questions 7–13\nComplete the summary using the list of words, A–O, below. Write the correct letter, A–O, in boxes 7–13 on your answer sheet.\n\nAnts as farmers\n\nAnts have sophisticated methods of farming, including herding livestock and growing crops, which are in many ways similar to those used in human agriculture. The ants cultivate a large number of different species of edible fungi which convert 7 ...................... into a form which they can digest. They use their own natural 8 ...................... as weed-killers and also use unwanted materials as 9 ...................... . Genetic analysis shows they constantly upgrade these fungi by developing new species and by 10 ...................... species with neighbouring ant colonies. In fact, the farming methods of ants could be said to be more advanced than human agribusiness, since they use 11 ...................... methods, they do not affect the 12 ...................... and do not waste 13 ...................... .\n\n" + antsWordBank.map((option) => option.letter + " " + option.text).join("\n"),
    },
  ],
  source: partSource([58, 59], [60, 61]),
};

const migrationHeadings = [
  { id: "i", text: "The results of the research into blood-variants" },
  { id: "ii", text: "Dental evidence" },
  { id: "iii", text: "Greenberg’s analysis of the dental and linguistic evidence" },
  { id: "iv", text: "Developments in the methods used to study early population movements" },
  { id: "v", text: "Indian migration from Canada to the U.S.A." },
  { id: "vi", text: "Further genetic evidence relating to the three-wave theory" },
  { id: "vii", text: "Long-standing questions about prehistoric migration to America" },
  { id: "viii", text: "Conflicting views of the three-wave theory, based on non-genetic evidence" },
  { id: "ix", text: "Questions about the causes of prehistoric migration to America" },
  { id: "x", text: "How analysis of blood-variants measures the closeness of the relationship between different populations" },
];

const migrationPassage: ReadingPart = {
  id: "cambridge-7-test-3-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 on the following pages.",
  title: "Population movements and genetics",
  sections: [
    {
      id: "c7t3-p2-a",
      heading: "Section A",
      headingQuestionNumber: 14,
      paragraphs: [
        "Study of the origins and distribution of human populations used to be based on archaeological and fossil evidence. A number of techniques developed since the 1950s, however, have placed the study of these subjects on a sounder and more objective footing. The best information on early population movements is now being obtained from the ‘archaeology of the living body’, the clues to be found in genetic material.",
      ],
    },
    {
      id: "c7t3-p2-b",
      heading: "Section B",
      headingQuestionNumber: 15,
      paragraphs: [
        "Recent work on the problem of when people first entered the Americas is an example of the value of these new techniques. North-east Asia and Siberia have long been accepted as the launching ground for the first human colonisers of the New World¹. But was there one major wave of migration across the Bering Strait into the Americas, or several? And when did this event, or events, take place? In recent years, new clues have come from research into genetics, including the distribution of genetic markers in modern Native Americans².\n\n¹ New World: the American continent, as opposed to the so-called Old World of Europe, Asia and Africa\n² modern Native American: an American descended from the groups that were native to America",
      ],
    },
    {
      id: "c7t3-p2-c",
      heading: "Section C",
      headingQuestionNumber: 16,
      paragraphs: [
        "An important project, led by the biological anthropologist Robert Williams, focused on the variants (called Gm allotypes) of one particular protein — immunoglobulin G — found in the fluid portion of human blood. All proteins ‘drift’, or produce variants, over the generations, and members of an interbreeding human population will share a set of such variants. Thus, by comparing the Gm allotypes of two different populations (e.g. two Indian tribes), one can establish their genetic ‘distance’, which itself can be calibrated to give an indication of the length of time since these populations last interbred.",
      ],
    },
    {
      id: "c7t3-p2-d",
      heading: "Section D",
      headingQuestionNumber: 17,
      paragraphs: [
        "Williams and his colleagues sampled the blood of over 5,000 American Indians in western North America during a twenty-year period. They found that their Gm allotypes could be divided into two groups, one of which also corresponded to the genetic typing of Central and South American Indians. Other tests showed that the Inuit (or Eskimo) and Aleut³ formed a third group. From this evidence it was deduced that there had been three major waves of migration across the Bering Strait. The first, Paleo-Indian, wave more than 15,000 years ago was ancestral to all Central and South American Indians. The second wave, about 14,000–12,000 years ago, brought Na-Dene hunters, ancestors of the Navajo and Apache (who only migrated south from Canada about 600 or 700 years ago). The third wave, perhaps 10,000 or 9,000 years ago, saw the migration from North-east Asia of groups ancestral to the modern Eskimo and Aleut.\n\n³ Inuit and Aleut: two of the ethnic groups native to the northern regions of North America (i.e. northern Canada and Greenland)",
      ],
    },
    {
      id: "c7t3-p2-e",
      heading: "Section E",
      headingQuestionNumber: 18,
      paragraphs: [
        "How far does other research support these conclusions? Geneticist Douglas Wallace has studied mitochondrial DNA⁴ in blood samples from three widely separated Native American groups: Pima-Papago Indians in Arizona, Maya Indians on the Yucatán peninsula, Mexico, and Ticuna Indians in the Upper Amazon region of Brazil. As would have been predicted by Robert Williams's work, all three groups appear to be descended from the same ancestral (Paleo-Indian) population.\n\n⁴ DNA: the substance in which genetic information is stored",
      ],
    },
    {
      id: "c7t3-p2-f",
      heading: "Section F",
      headingQuestionNumber: 19,
      paragraphs: [
        "There are two other kinds of research that have thrown some light on the origins of the Native American population; they involve the study of teeth and of languages. The biological anthropologist Christy Turner is an expert in the analysis of changing physical characteristics in human teeth. He argues that tooth crowns and roots⁵ have a high genetic component, minimally affected by environmental and other factors. Studies carried out by Turner of many thousands of New and Old World specimens, both ancient and modern, suggest that the majority of prehistoric Americans are linked to Northern Asian populations by crown and root traits such as incisor⁶ shoveling (a scooping out on one or both surfaces of the tooth), single-rooted upper first premolars⁶ and triple-rooted lower first molars⁶. According to Turner, this ties in with the idea of a single Paleo-Indian migration out of North Asia, which he sets at before 14,000 years ago by calibrating rates of dental micro-evolution. Tooth analyses also suggest that there were two later migrations of Na-Denes and Eskimo-Aleut.\n\n⁵ crown/root: parts of the tooth\n⁶ incisor/premolar/molar: kinds of teeth",
      ],
    },
    {
      id: "c7t3-p2-g",
      heading: "Section G (example: viii)",
      paragraphs: [
        "The linguist Joseph Greenberg has, since the 1950s, argued that all Native American languages belong to a single ‘Amerind’ family, except for Na-Dene and Eskimo-Aleut — a view that gives credence to the idea of three main migrations. Greenberg is in a minority among fellow linguists, most of whom favour the notion of a great many waves of migration to account for the more than 1,000 languages spoken at one time by American Indians. But there is no doubt that the new genetic and dental evidence provides strong backing for Greenberg's view. Dates given for the migrations should nevertheless be treated with caution, except where supported by hard archaeological evidence.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c7t3-p2-headings",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 2 has seven sections, A–G. Choose the correct headings for sections A–F from the list of headings below.",
      options: migrationHeadings,
      questionNumbers: [14, 15, 16, 17, 18, 19],
    },
    {
      id: "c7t3-p2-migration-routes",
      type: "fill",
      title: "",
      instruction: "The discussion of Williams’s research indicates the periods at which early people are thought to have migrated along certain routes. There are six routes, A–F, marked on the map. Complete the table. Write the correct letter, A–F, in boxes 20 and 21 on your answer sheet.",
      questions: [
        { number: 20, before: "", answer: "C" },
        { number: 21, before: "", answer: "D" },
      ],
      table: {
        headers: ["Route", "Period (number of years ago)"],
        rows: [
          [{ questionNumber: 20 }, { text: "15,000 or more" }],
          [{ questionNumber: 21 }, { text: "600 to 700" }],
        ],
      },
    },
    {
      id: "c7t3-p2-wave-classification",
      type: "fill",
      title: "",
      instruction: "Reading Passage 2 refers to the three-wave theory of early migration to the Americas. Classify the groups named in the table according to which wave their ancestors first reached the continent. Write A, B or C in boxes 22–25.",
      questions: [22, 23, 24, 25].map((number) => ({ number, before: "Question " + number })),
      table: {
        headers: ["Name of group", "Wave number"],
        rows: [
          [{ text: "Inuit" }, { questionNumber: 22 }],
          [{ text: "Apache" }, { questionNumber: 23 }],
          [{ text: "Pima-Papago" }, { questionNumber: 24 }],
          [{ text: "Ticuna" }, { questionNumber: 25 }],
        ],
      },
    },
    {
      id: "c7t3-p2-multiple-choice",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in box 26 on your answer sheet.",
      questions: [
        {
          questionNumbers: [26],
          prompt: "Christy Turner’s research involved the examination of",
          options: [
            { letter: "A", text: "teeth from both prehistoric and modern Americans and Asians." },
            { letter: "B", text: "thousands of people who live in either the New or the Old World." },
            { letter: "C", text: "dental specimens from the majority of prehistoric Americans." },
            { letter: "D", text: "the eating habits of American and Asian populations." },
          ],
        },
      ],
    },
  ],
  source: partSource([63, 64], [62, 65, 66]),
};

const forestResolutionOptions: ReadingOption[] = [
  { letter: "A", text: "All kinds of species of trees should be preserved." },
  { letter: "B", text: "Fragile mountain forests should be given priority in research programs." },
  { letter: "C", text: "The surviving natural forests of Europe do not need priority treatment." },
  { letter: "D", text: "Research is to be better co-ordinated throughout Europe." },
  { letter: "E", text: "Information on forest fires should be collected and shared." },
  { letter: "F", text: "Loss of leaves from trees should be more extensively and carefully monitored." },
  { letter: "G", text: "Resources should be allocated to research into tree diseases." },
  { letter: "H", text: "Skiing should be encouraged in thinly populated areas." },
  { letter: "I", text: "Soil imbalances such as acidification should be treated with compounds of nitrogen and sulphur." },
  { letter: "J", text: "Information is to be systematically gathered on any decline in the condition of forests." },
];

const forestPassage: ReadingPart = {
  id: "cambridge-7-test-3-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "Reading Passage 3",
  sections: [
    {
      id: "c7t3-p3-a",
      paragraphs: [
        "Forests are one of the main elements of our natural heritage. The decline of Europe's forests over the last decade and a half has led to an increasing awareness and understanding of the serious imbalances which threaten them. European countries are becoming increasingly concerned by major threats to European forests, threats which know no frontiers other than those of geography or climate: air pollution, soil deterioration, the increasing number of forest fires and sometimes even the mismanagement of our woodland and forest heritage. There has been a growing awareness of the need for countries to get together to co-ordinate their policies. In December 1990, Strasbourg hosted the first Ministerial Conference on the protection of Europe's forests. The conference brought together 31 countries from both Western and Eastern Europe. The topics discussed included the co-ordinated study of the destruction of forests, as well as how to combat forest fires and the extension of European research programs on the forest ecosystem. The preparatory work for the conference had been undertaken at two meetings of experts. Their initial task was to decide which of the many forest problems of concern to Europe involved the largest number of countries and might be the subject of joint action. Those confined to particular geographical areas, such as countries bordering the Mediterranean or the Nordic countries therefore had to be discarded. However, this does not mean that in future they will be ignored.",
      ],
    },
    {
      id: "c7t3-p3-b",
      paragraphs: [
        "As a whole, European countries see forests as performing a triple function: biological, economic and recreational. The first is to act as a ‘green lung’ for our planet; by means of photosynthesis, forests produce oxygen through the transformation of solar energy, thus fulfilling what for humans is the essential role of an immense, non-polluting power plant. At the same time, forests provide raw materials for human activities through their constantly renewed production of wood. Finally, they offer those condemned to spend five days a week in an urban environment an unrivalled area of freedom to unwind and take part in a range of leisure activities, such as hunting, riding and hiking. The economic importance of forests has been understood since the dawn of man — wood was the first fuel. The other aspects have been recognised only for a few centuries but they are becoming more and more important. Hence, there is a real concern throughout Europe about the damage to the forest environment which threatens these three basic roles.",
      ],
    },
    {
      id: "c7t3-p3-c",
      paragraphs: [
        "The myth of the ‘natural’ forest has survived, yet there are effectively no remaining ‘primary’ forests in Europe. All European forests are artificial, having been adapted and exploited by man for thousands of years. This means that a forest policy is vital, that it must transcend national frontiers and generations of people, and that it must allow for the inevitable changes that take place in the forests, in needs, and hence in policy. The Strasbourg conference was one of the first events on such a scale to reach this conclusion. A general declaration was made that ‘a central place in any ecologically coherent forest policy must be given to continuity over time and to the possible effects of unforeseen events, to ensure that the full potential of these forests is maintained’.",
      ],
    },
    {
      id: "c7t3-p3-d",
      paragraphs: [
        "That general declaration was accompanied by six detailed resolutions to assist national policy-making. The first proposes the extension and systematisation of surveillance sites to monitor forest decline. Forest decline is still poorly understood but leads to the loss of a high proportion of a tree's needles or leaves. The entire continent and the majority of species are now affected: between 30% and 50% of the tree population. The condition appears to result from the cumulative effect of a number of factors, with atmospheric pollutants the principal culprits. Compounds of nitrogen and sulphur dioxide should be particularly closely watched. However, their effects are probably accentuated by climatic factors, such as drought and hard winters, or soil imbalances such as soil acidification, which damages the roots. The second resolution concentrates on the need to preserve the genetic diversity of European forests. The aim is to reverse the decline in the number of tree species or at least to preserve the ‘genetic material’ of all of them. Although forest fires do not affect all of Europe to the same extent, the amount of damage caused the experts to propose as the third resolution that the Strasbourg conference consider the establishment of a European databank on the subject. All information used in the development of national preventative policies would become generally available. The subject of the fourth resolution discussed by the ministers was mountain forests. In Europe, it is undoubtedly the mountain ecosystem which has changed most rapidly and is most at risk. A thinly scattered permanent population and development of leisure activities, particularly skiing, have resulted in significant long-term changes to the local ecosystems. Proposed developments include a preferential research program on mountain forests. The fifth resolution relaunched the European research network on the physiology of trees, called Eurosilva. Eurosilva should support joint European research on tree diseases and their physiological and biochemical aspects. Each country concerned could increase the number of scholarships and other financial support for doctoral theses and research projects in this area. Finally, the conference established the framework for a European research network on forest ecosystems. This would also involve harmonising activities in individual countries as well as identifying a number of priority research topics relating to the protection of forests. The Strasbourg conference's main concern was to provide for the future. This was the initial motivation, one now shared by all 31 participants representing 31 European countries. Their final text commits them to on-going discussion between government representatives with responsibility for forests.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c7t3-p3-true-false-not-given",
      type: "choice",
      instruction: "Do the following statements agree with the information given in Reading Passage 3? In boxes 27-33 on your answer sheet, write TRUE if the statement agrees with the information FALSE if the statement contradicts the information NOT GIVEN if there is no information on this",
      questions: [
        { questionNumbers: [27], prompt: "Forest problems of Mediterranean countries are to be discussed at the next meeting of experts.", options: trueFalseNotGiven },
        { questionNumbers: [28], prompt: "Problems in Nordic countries were excluded because they are outside the European Economic Community.", options: trueFalseNotGiven },
        { questionNumbers: [29], prompt: "Forests are a renewable source of raw material.", options: trueFalseNotGiven },
        { questionNumbers: [30], prompt: "The biological functions of forests were recognised only in the twentieth century.", options: trueFalseNotGiven },
        { questionNumbers: [31], prompt: "Natural forests still exist in parts of Europe.", options: trueFalseNotGiven },
        { questionNumbers: [32], prompt: "Forest policy should be limited by national boundaries.", options: trueFalseNotGiven },
        { questionNumbers: [33], prompt: "The Strasbourg conference decided that a forest policy must allow for the possibility of change.", options: trueFalseNotGiven },
      ],
    },
    {
      id: "c7t3-p3-resolution-matching",
      type: "choice",
      instruction: "Look at the following statements issued by the conference. Which six statements, A–J, refer to the resolutions that were issued? Match the statements with the appropriate resolutions. Write the correct letter, A–J, in boxes 34–39.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [34], prompt: "Resolution 1", options: forestResolutionOptions },
        { questionNumbers: [35], prompt: "Resolution 2", options: forestResolutionOptions },
        { questionNumbers: [36], prompt: "Resolution 3", options: forestResolutionOptions },
        { questionNumbers: [37], prompt: "Resolution 4", options: forestResolutionOptions },
        { questionNumbers: [38], prompt: "Resolution 5", options: forestResolutionOptions },
        { questionNumbers: [39], prompt: "Resolution 6", options: forestResolutionOptions },
      ],
    },
    {
      id: "c7t3-p3-multiple-choice",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in box 40 on your answer sheet.",
      questions: [
        {
          questionNumbers: [40],
          prompt: "What is the best title for Reading Passage 3?",
          options: [
            { letter: "A", text: "The biological, economic and recreational role of forests" },
            { letter: "B", text: "Plans to protect the forests of Europe" },
            { letter: "C", text: "The priority of European research into ecosystems" },
            { letter: "D", text: "Proposals for a world-wide policy on forest management" },
          ],
        },
      ],
    },
  ],
  source: partSource([67, 68], [69, 70]),
};

export const CAMBRIDGE7_TEST3_PARTS: ReadingPart[] = [antPassage, migrationPassage, forestPassage];

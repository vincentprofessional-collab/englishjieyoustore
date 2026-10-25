import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  40: [1544, 2214], 41: [1558, 2193], 42: [1544, 2196], 43: [1560, 2191],
  44: [1544, 2195], 45: [1543, 2193], 46: [1546, 2194], 47: [1552, 2193],
  48: [1556, 2193], 49: [1554, 2191], 50: [1542, 2193], 51: [1562, 2192],
  52: [1547, 2194], 126: [1206, 1085],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci11-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = { 61: 882, 68: 1616, 74: 317 };
  return {
    page,
    src: "/reading/explanations/cambridge-11-test-2-part" + part + "-exp11-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2331,
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

const maryRoseParagraphs = [
  "On 19 July 1545, English and French fleets were engaged in a sea battle off the coast of southern England in the area of water called the Solent, between Portsmouth and the Isle of Wight. Among the English vessels was a warship by the name of Mary Rose. Built in Portsmouth some 35 years earlier, she had had a long and successful fighting career, and was a favourite of King Henry VIII. Accounts of what happened to the ship vary: while witnesses agree that she was not hit by the French, some maintain that she was outdated, overladen and sailing too low in the water, others that she was mishandled by undisciplined crew. What is undisputed, however, is that the Mary Rose sank into the Solent that day, taking at least 500 men with her. After the battle, attempts were made to recover the ship, but these failed.",
  "The Mary Rose came to rest on the seabed, lying on her starboard (right) side at an angle of approximately 60 degrees. The hull (the body of the ship) acted as a trap for the sand and mud carried by Solent currents. As a result, the starboard side filled rapidly, leaving the exposed port (left) side to be eroded by marine organisms and mechanical degradation. Because of the way the ship sank, nearly all of the starboard half survived intact. During the seventeenth and eighteenth centuries, the entire site became covered with a layer of hard grey clay, which minimised further erosion.",
  "Then, on 16 June 1836, some fishermen in the Solent found that their equipment was caught on an underwater obstruction, which turned out to be the Mary Rose. Diver John Deane happened to be exploring another sunken ship nearby, and the fishermen approached him, asking him to free their gear. Deane dived down, and found the equipment caught on a timber protruding slightly from the seabed. Exploring further, he uncovered several other timbers and a bronze gun. Deane continued diving on the site intermittently until 1840, recovering several more guns, two bows, various timbers, part of a pump and various other small finds.",
  "The Mary Rose then faded into obscurity for another hundred years. But in 1965, military historian and amateur diver Alexander McKee, in conjunction with the British Sub-Aqua Club, initiated a project called ‘Solent Ships’. While on paper this was a plan to examine a number of known wrecks in the Solent, what McKee really hoped for was to find the Mary Rose. Ordinary search techniques proved unsatisfactory, so McKee entered into collaboration with Harold E. Edgerton, professor of electrical engineering at the Massachusetts Institute of Technology. In 1967, Edgerton’s side-scan sonar systems revealed a large, unusually shaped object, which McKee believed was the Mary Rose.",
  "Further excavations revealed stray pieces of timber and an iron gun. But the climax to the operation came when, on 5 May 1971, part of the ship’s frame was uncovered. McKee and his team now knew for certain that they had found the wreck, but were as yet unaware that it also housed a treasure trove of beautifully preserved artefacts. Interest in the project grew, and in 1979, The Mary Rose Trust was formed, with Prince Charles as its President and Dr Margaret Rule its Archaeological Director. The decision whether or not to salvage the wreck was not an easy one, although an excavation in 1978 had shown that it might be possible to raise the hull. While the original aim was to raise the hull if at all feasible, the operation was not given the go-ahead until January 1982, when all the necessary information was available.",
  "An important factor in trying to salvage the Mary Rose was that the remaining hull was an open shell. This led to an important decision being taken: namely to carry out the lifting operation in three very distinct stages. The hull was attached to a lifting frame via a network of bolts and lifting wires. The problem of the hull being sucked back downwards into the mud was overcome by using 12 hydraulic jacks. These raised it a few centimetres over a period of several days, as the lifting frame rose slowly up its four legs. It was only when the hull was hanging freely from the lifting frame, clear of the seabed and the suction effect of the surrounding mud, that the salvage operation progressed to the second stage. In this stage, the lifting frame was fixed to a hook attached to a crane, and the hull was lifted completely clear of the seabed and transferred underwater into the lifting cradle. This required precise positioning to locate the legs into the ‘stabbing guides’ of the lifting cradle. The lifting cradle was designed to fit the hull using archaeological survey drawings, and was fitted with air bags to provide additional cushioning for the hull’s delicate timber framework.",
  "The third and final stage was to lift the entire structure into the air, by which time the hull was also supported from below. Finally, on 11 October 1982, millions of people around the world held their breath as the timber skeleton of the Mary Rose was lifted clear of the water, ready to be returned home to Portsmouth.",
];

const dates = [
  { letter: "A", text: "1836" },
  { letter: "B", text: "1840" },
  { letter: "C", text: "1965" },
  { letter: "D", text: "1967" },
  { letter: "E", text: "1971" },
  { letter: "F", text: "1979" },
  { letter: "G", text: "1982" },
];

const maryRose: ReadingPart = {
  id: "cambridge-11-test-2-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "Raising the Mary Rose",
  subtitle: "How a sixteenth-century warship was recovered from the seabed",
  sections: [{ id: "cambridge-11-test-2-part1-passage", format: "pre", paragraphs: maryRoseParagraphs }],
  questionBlocks: [
    {
      id: "cambridge-11-test-2-part1-questions-1-4",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 1–4 on your answer sheet, write TRUE, FALSE or NOT GIVEN.",
      questions: [
        { questionNumbers: [1], prompt: "There is some doubt about what caused the Mary Rose to sink.", options: judgmentOptions },
        { questionNumbers: [2], prompt: "The Mary Rose was the only ship to sink in the battle of 19 July 1545.", options: judgmentOptions },
        { questionNumbers: [3], prompt: "Most of one side of the Mary Rose lay undamaged under the sea.", options: judgmentOptions },
        { questionNumbers: [4], prompt: "Alexander McKee knew that the wreck would contain many valuable historical objects.", options: judgmentOptions },
      ],
    },
    {
      id: "cambridge-11-test-2-part1-questions-5-8",
      type: "choice",
      sharedOptions: true,
      instruction: "Match each statement with the correct date, A–G. Write the correct letter in boxes 5–8 on your answer sheet.",
      questions: [
        { questionNumbers: [5], prompt: "A search for the Mary Rose was launched.", options: dates },
        { questionNumbers: [6], prompt: "One person’s exploration of the Mary Rose site stopped.", options: dates },
        { questionNumbers: [7], prompt: "It was agreed that the hull of the Mary Rose should be raised.", options: dates },
        { questionNumbers: [8], prompt: "The site of the Mary Rose was found by chance.", options: dates },
      ],
    },
    rawFillBlock(
      "cambridge-11-test-2-part1-questions-9-13",
      "Questions 9–13",
      "Questions 9–13\nLabel the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each answer.\n\nWrite your answers in boxes 9–13 on your answer sheet.\n\nRaising the hull of the Mary Rose: stages one and two\n\n9 ................. attached to hull by wires\n10 ................. to prevent hull being sucked into mud\n11 legs are placed into .................\n12 hull is lowered into .................\n13 ................. used as extra protection for the hull",
      9,
      13,
    ),
  ],
  source: {
    passagePages: [sourcePage(40), sourcePage(41)],
    questionPages: [sourcePage(42), sourcePage(43)],
    answerPages: [sourcePage(126)],
    explanationPages: [61, 62, 63, 64].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集11精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const easterIslandParagraphs = [
  "Easter Island, or Rapa Nui as it is known locally, is home to several hundred ancient human statues — the moai. After this remote Pacific island was settled by the Polynesians, it remained isolated for centuries. All the energy and resources that went into the moai — some of which are ten metres tall and weigh over 7,000 kilos — came from the island itself. Yet when Dutch explorers landed in 1722, they met a Stone Age culture. The moai were carved with stone tools, then transported for many kilometres, without the use of animals or wheels, to massive stone platforms. The identity of the moai builders was in doubt until well into the twentieth century. Thor Heyerdahl, the Norwegian ethnographer and adventurer, thought the statues had been created by pre-Inca peoples from Peru. Bestselling Swiss author Erich von Daniken believed they were built by stranded extraterrestrials. Modern science — linguistic, archaeological and genetic evidence — has definitively proved the moai builders were Polynesians, but not how they moved their creations. Local folklore maintains that the statues walked, while researchers have tended to assume the ancestors dragged the statues somehow, using ropes and logs.",
  "When the Europeans arrived, Rapa Nui was grassland, with only a few scrawny trees. In the 1970s and 1980s, though, researchers found pollen preserved in lake sediments, which proved the island had been covered in lush palm forests for thousands of years. Only after the Polynesians arrived did those forests disappear. US scientist Jared Diamond believes that the Rapanui people — descendants of Polynesian settlers — wrecked their own environment. They had unfortunately settled on an extremely fragile island — dry, cool, and too remote to be properly fertilised by windblown volcanic ash. When the islanders cleared the forests for firewood and farming, the forests didn’t grow back. As trees became scarce and they could no longer construct wooden canoes for fishing, they ate birds. Soil erosion decreased their crop yields. Before Europeans arrived, the Rapanui had descended into civil war and cannibalism, he maintains. The collapse of their isolated civilisation, Diamond writes, is a ‘worst-case scenario for what may lie ahead of us in our own future’.",
  "The moai, he thinks, accelerated the self-destruction. Diamond interprets them as power displays by rival chieftains who, trapped on a remote little island, lacked other ways of asserting their dominance. They competed by building ever bigger figures. Diamond thinks they laid the moai on wooden sledges, hauled over log rails, but that required both a lot of wood and a lot of people. To feed the people, even more land had to be cleared. When the wood was gone and civil war began, the islanders began toppling the moai. By the nineteenth century none were standing.",
  "Archaeologists Terry Hunt of the University of Hawaii and Carl Lipo of California State University agree that Easter Island lost its lush forests and that it was an ‘ecological catastrophe’ — but they believe the islanders themselves weren’t to blame. And the moai certainly weren’t. Archaeological excavations indicate that the Rapanui went to heroic efforts to protect the resources of their wind-lashed, infertile fields. They built thousands of circular stone windbreaks and gardened inside them, and used broken volcanic rocks to keep the soil moist. In short, Hunt and Lipo argue, the prehistoric Rapanui were pioneers of sustainable farming.",
  "Hunt and Lipo contend that moai-building was an activity that helped keep the peace between islanders. They also believe that moving the moai required few people and no wood, because they were walked upright. On that issue, Hunt and Lipo say, archaeological evidence backs up Rapanui folklore. Recent experiments indicate that as few as 18 people could, with three strong ropes and a bit of practice, easily manoeuvre a 1,000 kg moai replica a few hundred metres. The figures’ fat bellies tilted them forward, and a D-shaped base allowed handlers to roll and rock them side to side.",
  "Moreover, Hunt and Lipo are convinced that the settlers were not wholly responsible for the loss of the island’s trees. Archaeological finds of nuts from the extinct Easter Island palm show tiny grooves, made by the teeth of Polynesian rats. The rats arrived along with the settlers, and in just a few years, Hunt and Lipo calculate, they would have overrun the island. They would have prevented the reseeding of the slow-growing palm trees and thereby doomed Rapa Nui’s forest, even without the settlers’ campaign of deforestation. No doubt the rats ate birds’ eggs too. Hunt and Lipo also see no evidence that Rapanui civilisation collapsed when the palm forest did. They think its population grew rapidly and then remained more or less stable until the arrival of the Europeans, who introduced deadly diseases to which islanders had no immunity. Then in the nineteenth century slave traders decimated the population, which shrivelled to 111 people by 1877.",
  "Hunt and Lipo’s vision, therefore, is one of an island populated by peaceful and ingenious moai builders and careful stewards of the land, rather than by reckless destroyers ruining their own environment and society. ‘Rather than a case of abject failure, Rapa Nui is an unlikely story of success’, they claim. Whichever is the case, there are surely some valuable lessons which the world at large can learn from the story of Rapa Nui.",
];

const easterIslandHeadings = [
  { id: "i", text: "Evidence of innovative environment management practices" },
  { id: "ii", text: "An undisputed answer to a question about the moai" },
  { id: "iii", text: "The future of the moai statues" },
  { id: "iv", text: "A theory which supports a local belief" },
  { id: "v", text: "The future of Easter Island" },
  { id: "vi", text: "Two opposing views about the Rapanui people" },
  { id: "vii", text: "Destruction outside the inhabitants’ control" },
  { id: "viii", text: "How the statues made a situation worse" },
  { id: "ix", text: "Diminishing food resources" },
];

const easterIsland: ReadingPart = {
  id: "cambridge-11-test-2-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 on the following pages.",
  title: "What destroyed the civilisation of Easter Island?",
  sections: easterIslandParagraphs.map((text, index) => ({
    id: "cambridge-11-test-2-part2-paragraph-" + String.fromCharCode(97 + index),
    heading: String.fromCharCode(65 + index),
    format: "pre" as const,
    paragraphs: [text],
  })),
  questionBlocks: [
    {
      id: "cambridge-11-test-2-part2-headings-14-20",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 2 has seven paragraphs, A–G. Choose the correct heading for each paragraph from the list below. Write the correct number, i–ix, in boxes 14–20 on your answer sheet.",
      questionNumbers: [14, 15, 16, 17, 18, 19, 20],
      options: easterIslandHeadings,
    },
    rawFillBlock(
      "cambridge-11-test-2-part2-questions-21-24",
      "Jared Diamond’s View",
      "Questions 21–24\nComplete the summary below. Choose ONE WORD ONLY from the passage for each answer.\n\nJared Diamond’s View\nDiamond believes that the Polynesian settlers on Rapa Nui destroyed its forests, cutting down its trees for fuel and clearing land for 21 ................. Twentieth-century discoveries of pollen prove that Rapa Nui had once been covered in palm forests, which had turned into grassland by the time the Europeans arrived on the island. When the islanders were no longer able to build the 22 ................. they needed to go fishing, they began using the island’s 23 ................. as a food source, according to Diamond. Diamond also claims that the moai were built to show the power of the island’s chieftains, and that the methods of transporting the statues needed not only a great number of people, but also a great deal of 24 .................",
      21,
      24,
    ),
    {
      id: "cambridge-11-test-2-part2-questions-25-26",
      type: "choice",
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 25 and 26 on your answer sheet.",
      questions: [
        {
          questionNumbers: [25, 26],
          prompt: "On what points do Hunt and Lipo disagree with Diamond?",
          options: [
            { letter: "A", text: "the period when the moai were created" },
            { letter: "B", text: "how the moai were transported" },
            { letter: "C", text: "the impact of the moai on Rapanui society" },
            { letter: "D", text: "how the moai were carved" },
            { letter: "E", text: "the origins of the people who made the moai" },
          ],
          selectCount: 2,
        },
      ],
    },
  ],
  source: {
    passagePages: [sourcePage(45), sourcePage(46)],
    questionPages: [sourcePage(44), sourcePage(47)],
    answerPages: [sourcePage(126)],
    explanationPages: [68, 69, 70, 71].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集11精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const neuroaestheticsParagraphs = [
  "An emerging discipline called neuroaesthetics is seeking to bring scientific objectivity to the study of art, and has already given us a better understanding of many masterpieces. The blurred imagery of Impressionist paintings seems to stimulate the brain’s amygdala, for instance. Since the amygdala plays a crucial role in our feelings, that finding might explain why many people find these pieces so moving.",
  "Could the same approach also shed light on abstract twentieth-century pieces, from Mondrian’s geometrical blocks of colour, to Pollock’s seemingly haphazard arrangements of splashed paint on canvas? Sceptics believe that people claim to like such works simply because they are famous. We certainly do have an inclination to follow the crowd. When asked to make simple perceptual decisions such as matching a shape to its rotated image, for example, people often choose a definitely wrong answer if they see others doing the same. It is easy to imagine that this mentality would have even more impact on a fuzzy concept like art appreciation, where there is no right or wrong answer.",
  "Angelina Hawley-Dolan, of Boston College, Massachusetts, responded to this debate by asking volunteers to view pairs of paintings — either the creations of famous abstract artists or the doodles of infants, chimps and elephants. They then had to judge which they preferred. A third of the paintings were given no captions, while many were labelled incorrectly — volunteers might think they were viewing a chimp’s messy brushstrokes when they were actually seeing an acclaimed masterpiece. In each set of trials, volunteers generally preferred the work of renowned artists, even when they believed it was by an animal or a child. It seems that the viewer can sense the artist’s vision in paintings, even if they can’t explain why.",
  "Robert Pepperell, an artist based at Cardiff University, creates ambiguous works that are neither entirely abstract nor clearly representational. In one study, Pepperell and his collaborators asked volunteers to decide how ‘powerful’ they considered an artwork to be, and whether they saw anything familiar in the piece. The longer they took to answer these questions, the more highly they rated the piece under scrutiny, and the greater their neural activity. It would seem that the brain sees these images as puzzles, and the harder it is to decipher the meaning, the more rewarding is the moment of recognition.",
  "And what about artists such as Mondrian, whose paintings consist exclusively of horizontal and vertical lines encasing blocks of colour? Mondrian’s works are deceptively simple, but eye-tracking studies confirm that they are meticulously composed, and that simply rotating a piece radically changes the way we view it. With the originals, volunteers’ eyes tended to stay longer on certain places in the image, but with the altered versions they would flit across a piece more rapidly. As a result, the volunteers considered the altered versions less pleasurable when they later rated the work.",
  "In a similar study, Oshin Vartanian of Toronto University asked volunteers to compare original paintings with ones which he had altered by moving objects around within the frame. He found that almost everyone preferred the original, whether it was a Van Gogh still life or an abstract by Miró. Vartanian also found that changing the composition of the paintings reduced activation in those brain areas linked with meaning and interpretation.",
  "In another experiment, Alex Forsythe of the University of Liverpool analysed the visual intricacy of different pieces of art, and her results suggest that many artists use a key level of detail to please the brain. Too little and the work is boring, but too much results in a kind of ‘perceptual overload’, according to Forsythe. What’s more, appealing pieces both abstract and representational show signs of ‘fractals’ — repeated motifs recurring in different scales. Fractals are common throughout nature, for example in the shapes of mountain peaks or the branches of trees. It is possible that our visual system, which evolved in the great outdoors, finds it easier to process such patterns.",
  "It is also intriguing that the brain appears to process movement when we see a handwritten letter, as if we are replaying the writer’s moment of creation. This has led some to wonder whether Pollock’s works feel so dynamic because the brain reconstructs the energetic actions the artist used as he painted. This may be down to our brain’s ‘mirror neurons’, which are known to mimic others’ actions. The hypothesis will need to be thoroughly tested, however. It might even be the case that we could use neuroaesthetic studies to understand the longevity of some pieces of artwork. While the fashions of the time might shape what is currently popular, works that are best adapted to our visual system may be the most likely to linger once the trends of previous generations have been forgotten.",
  "It’s still early days for the field of neuroaesthetics — and these studies are probably only a taste of what is to come. It would, however, be foolish to reduce art appreciation to a set of scientific laws. We shouldn’t underestimate the importance of the style of a particular artist, their place in history and the artistic environment of their time. Abstract art offers both a challenge and the freedom to play with different interpretations. In some ways, it’s not so different to science, where we are constantly looking for systems and decoding meaning so that we can view and appreciate the world in a new way.",
];

const artWordBank = [
  { letter: "A", text: "interpretation" },
  { letter: "B", text: "complexity" },
  { letter: "C", text: "emotions" },
  { letter: "D", text: "movements" },
  { letter: "E", text: "skill" },
  { letter: "F", text: "layout" },
  { letter: "G", text: "concern" },
  { letter: "H", text: "images" },
];

const neuroaesthetics: ReadingPart = {
  id: "cambridge-11-test-2-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "Neuroaesthetics",
  sections: [{ id: "cambridge-11-test-2-part3-passage", format: "pre", paragraphs: neuroaestheticsParagraphs }],
  questionBlocks: [
    {
      id: "cambridge-11-test-2-part3-questions-27-30",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27–30 on your answer sheet.",
      questions: [
        {
          questionNumbers: [27],
          prompt: "In the second paragraph, the writer refers to a shape-matching test in order to illustrate",
          options: [
            { letter: "A", text: "the subjective nature of art appreciation." },
            { letter: "B", text: "the reliance of modern art on abstract forms." },
            { letter: "C", text: "our tendency to be influenced by the opinions of others." },
            { letter: "D", text: "a common problem encountered when processing visual data." },
          ],
        },
        {
          questionNumbers: [28],
          prompt: "Angelina Hawley-Dolan’s findings indicate that people",
          options: [
            { letter: "A", text: "mostly favour works of art which they know well." },
            { letter: "B", text: "hold fixed ideas about what makes a good work of art." },
            { letter: "C", text: "are often misled by their initial expectations of a work of art." },
            { letter: "D", text: "have the ability to perceive the intention behind works of art." },
          ],
        },
        {
          questionNumbers: [29],
          prompt: "Results of studies involving Robert Pepperell’s pieces suggest that people",
          options: [
            { letter: "A", text: "can appreciate a painting without fully understanding it." },
            { letter: "B", text: "find it satisfying to work out what a painting represents." },
            { letter: "C", text: "vary widely in the time they spend looking at paintings." },
            { letter: "D", text: "generally prefer representational art to abstract art." },
          ],
        },
        {
          questionNumbers: [30],
          prompt: "What do the experiments described in the fifth paragraph suggest about the paintings of Mondrian?",
          options: [
            { letter: "A", text: "They are more carefully put together than they appear." },
            { letter: "B", text: "They can be interpreted in a number of different ways." },
            { letter: "C", text: "They challenge our assumptions about shape and colour." },
            { letter: "D", text: "They are easier to appreciate than many other abstract works." },
          ],
        },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-11-test-2-part3-questions-31-33",
        "Art and the Brain",
        "Questions 31–33\nComplete the summary using the list of words, A–H, below. Write the correct letters in boxes 31–33 on your answer sheet.\n\nArt and the Brain\nThe discipline of neuroaesthetics aims to bring scientific objectivity to the study of art. Neurological studies of the brain, for example, demonstrate the impact which Impressionist paintings have on our 31 ................. . Alex Forsythe of the University of Liverpool believes many artists give their works the precise degree of 32 ................. which most appeals to the viewer’s brain. She also observes that pleasing works of art often contain certain repeated 33 ................. which occur frequently in the natural world.\n\nA interpretation     B complexity     C emotions     D movements\nE skill     F layout     G concern     H images",
        31,
        33,
      ),
      wordBank: artWordBank.map((option) => option.letter),
    },
    {
      id: "cambridge-11-test-2-part3-questions-34-39",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the views of the writer in Reading Passage 3? In boxes 34–39 on your answer sheet, write YES, NO or NOT GIVEN.",
      questions: [
        { questionNumbers: [34], prompt: "Forsythe’s findings contradicted previous beliefs on the function of ‘fractals’ in art.", options: yesNoOptions },
        { questionNumbers: [35], prompt: "Certain ideas regarding the link between ‘mirror neurons’ and art appreciation require further verification.", options: yesNoOptions },
        { questionNumbers: [36], prompt: "People’s taste in paintings depends entirely on the current artistic trends of the period.", options: yesNoOptions },
        { questionNumbers: [37], prompt: "Scientists should seek to define the precise rules which govern people’s reactions to works of art.", options: yesNoOptions },
        { questionNumbers: [38], prompt: "Art appreciation should always involve taking into consideration the cultural context in which an artist worked.", options: yesNoOptions },
        { questionNumbers: [39], prompt: "It is easier to find meaning in the field of science than in that of art.", options: yesNoOptions },
      ],
    },
    {
      id: "cambridge-11-test-2-part3-question-40",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in box 40 on your answer sheet.",
      questions: [
        {
          questionNumbers: [40],
          prompt: "What would be the most appropriate subtitle for the article?",
          options: [
            { letter: "A", text: "Some scientific insights into how the brain responds to abstract art" },
            { letter: "B", text: "Recent studies focusing on the neural activity of abstract artists" },
            { letter: "C", text: "A comparison of the neurological bases of abstract and representational art" },
            { letter: "D", text: "How brain research has altered public opinion about abstract art" },
          ],
        },
      ],
    },
  ],
  source: {
    passagePages: [sourcePage(48), sourcePage(49)],
    questionPages: [sourcePage(50), sourcePage(51), sourcePage(52)],
    answerPages: [sourcePage(126)],
    explanationPages: [74, 75, 76, 77, 78, 79].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集11精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE11_TEST2_PARTS: ReadingPart[] = [maryRose, easterIsland, neuroaesthetics];

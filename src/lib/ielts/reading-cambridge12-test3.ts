import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  60: [1633, 2238], 61: [1505, 2236], 62: [1619, 2237], 63: [1495, 2236],
  64: [1617, 2236], 65: [1490, 2235], 66: [1636, 2238], 67: [1508, 2235],
  68: [1612, 2236], 69: [1463, 2236], 70: [1637, 2238], 71: [1438, 2238],
  122: [1524, 1207],
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
  const heights: Record<number, number> = { 100: 448, 109: 1700, 118: 1974 };
  return {
    page,
    src: "/reading/explanations/cambridge-12-test-3-part" + part + "-exp12-p" + String(page).padStart(3, "0") + ".webp",
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

const tortoiseHeadings = [
  { id: "i", text: "The importance of getting the timing right" },
  { id: "ii", text: "Young meets old" },
  { id: "iii", text: "Developments to the disadvantage of tortoise populations" },
  { id: "iv", text: "Planning a bigger idea" },
  { id: "v", text: "Tortoises populate the islands" },
  { id: "vi", text: "Carrying out a carefully prepared operation" },
  { id: "vii", text: "Looking for a home for the islands’ tortoises" },
  { id: "viii", text: "The start of the conservation project" },
];

const healthParagraphs = "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter }));

const flyingTortoises: ReadingPart = {
  id: "cambridge-12-test-3-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Flying tortoises",
  subtitle: "An airborne reintroduction programme has helped conservationists take significant steps to protect the endangered Galápagos tortoise.",
  sections: [
    { id: "cambridge-12-test-3-part1-section-a", heading: "A", format: "pre", paragraphs: ["Forests of spiny cacti cover much of the uneven lava plains that separate the interior of the Galápagos island of Isabela from the Pacific Ocean. With its five distinct volcanoes, the island resembles a lunar landscape. Only the thick vegetation at the skirt of the often cloud-covered peak of Sierra Negra offers respite from the barren terrain below. This inhospitable environment is home to the giant Galápagos tortoise. Some time after the Galápagos’s birth, around five million years ago, the islands were colonised by one or more tortoises from mainland South America. As these ancestral tortoises settled on the individual islands, the different populations adapted to their unique environments, giving rise to at least 14 different subspecies. Island life agreed with them. In the absence of significant predators, they grew to become the largest and longest-living tortoises on the planet, weighing more than 400 kilograms, occasionally exceeding 1.8 metres in length and living for more than a century."] },
    { id: "cambridge-12-test-3-part1-section-b", heading: "B", format: "pre", paragraphs: ["Before human arrival, the archipelago’s tortoises numbered in the hundreds of thousands. From the 17th century onwards, pirates took a few on board for food, but the arrival of whaling ships in the 1790s saw this exploitation grow exponentially. Relatively immobile and capable of surviving for months without food or water, the tortoises were taken on board these ships to act as food supplies during long ocean passages. Sometimes, their bodies were processed into high-grade oil. In total, an estimated 200,000 animals were taken from the archipelago before the 20th century. This historical exploitation was then exacerbated when settlers came to the islands. They hunted the tortoises and destroyed their habitat to clear land for agriculture. They also introduced alien species — ranging from cattle, pigs, goats, rats and dogs to plants and ants — that either prey on the eggs and young tortoises or damage or destroy their habitat."] },
    { id: "cambridge-12-test-3-part1-section-c", heading: "C", format: "pre", paragraphs: ["Today, only 11 of the original subspecies survive and of these, several are highly endangered. In 1989, work began on a tortoise-breeding centre just outside the town of Puerto Villamil on Isabela, dedicated to protecting the island’s tortoise populations. The centre’s captive-breeding programme proved to be extremely successful, and it eventually had to deal with an overpopulation problem."] },
    { id: "cambridge-12-test-3-part1-section-d", heading: "D", format: "pre", paragraphs: ["The problem was also a pressing one. Captive-bred tortoises can’t be reintroduced into the wild until they’re at least five years old and weigh at least 4.5 kilograms, at which point their size and weight — and their hardened shells — are sufficient to protect them from predators. But if people wait too long after that point, the tortoises eventually become too large to transport."] },
    { id: "cambridge-12-test-3-part1-section-e", heading: "E", format: "pre", paragraphs: ["For years, repatriation efforts were carried out in small numbers, with the tortoises carried on the backs of men over weeks of long, treacherous hikes along narrow trails. But in November 2010, the environmentalist and Galápagos National Park liaison officer Godfrey Merlin, a visiting private motor yacht captain and a helicopter pilot gathered around a table in a small café in Puerto Ayora on the island of Santa Cruz to work out a more ambitious reintroduction. The aim was to use a helicopter to move 300 of the breeding centre’s tortoises to various locations close to Sierra Negra."] },
    { id: "cambridge-12-test-3-part1-section-f", heading: "F", format: "pre", paragraphs: ["This unprecedented effort was made possible by the owners of the 67-metre yacht White Cloud, who provided the Galápagos National Park with free use of their helicopter and its experienced pilot, as well as the logistical support of the yacht, its captain and crew. Originally an air ambulance, the yacht’s helicopter has a rear double door and a large internal space that’s well suited for cargo, so a custom crate was designed to hold up to 33 tortoises with a total weight of about 150 kilograms. This weight, together with that of the fuel, pilot and four crew, approached the helicopter’s maximum payload, and there were times when it was clearly right on the edge of the helicopter’s capabilities. During a period of three days, a group of volunteers from the breeding centre worked around the clock to prepare the young tortoises for transport. Meanwhile, park wardens, dropped off ahead of time in remote locations, cleared landing sites within the thick brush, cacti and lava rocks."] },
    { id: "cambridge-12-test-3-part1-section-g", heading: "G", format: "pre", paragraphs: ["Upon their release, the juvenile tortoises quickly spread out over their ancestral territory, investigating their new surroundings and feeding on the vegetation. Eventually, one tiny tortoise came across a fully grown giant who had been lumbering around the island for around a hundred years. The two stood side by side, a powerful symbol of the regeneration of an ancient species."] },
  ],
  questionBlocks: [
    {
      id: "cambridge-12-test-3-part1-headings-1-7",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 1 has seven paragraphs, A–G. Choose the correct heading for each paragraph from the list of headings below. Write the correct number, i–viii, in boxes 1–7 on your answer sheet.",
      questionNumbers: [1, 2, 3, 4, 5, 6, 7],
      options: tortoiseHeadings,
    },
    {
      ...rawFillBlock(
        "cambridge-12-test-3-part1-questions-8-13",
        "Questions 8–13",
        "Questions 8–13\nComplete the notes below. Choose ONE WORD ONLY from the passage for each answer.\n\nThe decline of the Galápagos tortoise\n• Originally from mainland South America\n• Numbers on Galápagos islands increased, due to lack of predators\n• 17th century: small numbers taken onto ships used by 8 ______\n• 1790s: very large numbers taken onto whaling ships, kept for 9 ______, and also used to produce 10 ______\n• Hunted by 11 ______ on the islands\n• Habitat destruction: for the establishment of agriculture and by various 12 ______ not native to the islands, which also fed on baby tortoises and tortoises’ 13 ______",
        8,
        13,
      ),
    },
  ],
  source: {
    passagePages: [61, 62].map(sourcePage),
    questionPages: [60, 63].map(sourcePage),
    answerPages: [sourcePage(122)],
    explanationPages: [100, 101, 102, 103, 104].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集12精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const healthGeography: ReadingPart = {
  id: "cambridge-12-test-3-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "The Intersection of Health Sciences and Geography",
  sections: [
    { id: "cambridge-12-test-3-part2-section-a", heading: "A", format: "pre", paragraphs: ["While many diseases that affect humans have been eradicated due to improvements in vaccinations and the availability of healthcare, there are still areas around the world where certain health issues are more prevalent. In a world that is far more globalised than ever before, people come into contact with one another through travel and living closer and closer to each other. As a result, super-viruses and other infections resistant to antibiotics are becoming more and more common."] },
    { id: "cambridge-12-test-3-part2-section-b", heading: "B", format: "pre", paragraphs: ["Geography can often play a very large role in the health concerns of certain populations. For instance, depending on where you live, you will not have the same health concerns as someone who lives in a different geographical region. Perhaps one of the most obvious examples of this idea is malaria-prone areas, which are usually tropical regions that foster a warm and damp environment in which the mosquitos that can give people this disease can grow. Malaria is much less of a problem in high-altitude deserts, for instance."] },
    { id: "cambridge-12-test-3-part2-section-c", heading: "C", format: "pre", paragraphs: ["In some countries, geographical factors influence the health and well-being of the population in very obvious ways. In many large cities, the wind is not strong enough to clear the air of the massive amounts of smog and pollution that cause asthma, lung problems, eyesight issues and more in the people who live there. Part of the problem is, of course, the massive number of cars being driven, in addition to factories that run on coal power. The rapid industrialisation of some countries in recent years has also led to the cutting down of forests to allow for the expansion of big cities, which makes it even harder to fight the pollution with the fresh air that is produced by plants."] },
    { id: "cambridge-12-test-3-part2-section-d", heading: "D", format: "pre", paragraphs: ["It is in situations like these that the field of health geography comes into its own. It is an increasingly important area of study in a world where diseases like polio are re-emerging, respiratory diseases continue to spread, and malaria-prone areas are still fighting to find a better cure. Health geography is the combination of, on the one hand, knowledge regarding geography and methods used to analyse and interpret geographical information, and on the other, the study of health, diseases and healthcare practices around the world. The aim of this hybrid science is to create solutions for common geography-based health problems. While people will always be prone to illness, the study of how geography affects our health could lead to the eradication of certain illnesses, and the prevention of others in the future. By understanding why and how we get sick, we can change the way we treat illness and disease specific to certain geographical locations."] },
    { id: "cambridge-12-test-3-part2-section-e", heading: "E", format: "pre", paragraphs: ["The geography of disease and ill health analyses the frequency with which certain diseases appear in different parts of the world, and overlays the data with the geography of the region, to see if there could be a correlation between the two. Health geographers also study factors that could make certain individuals or a population more likely to be taken ill with a specific health concern or disease, as compared with the population of another area. Health geographers in this field are usually trained as healthcare workers, and have an understanding of basic epidemiology as it relates to the spread of diseases among the population."] },
    { id: "cambridge-12-test-3-part2-section-f", heading: "F", format: "pre", paragraphs: ["Researchers study the interactions between humans and their environment that could lead to illness (such as asthma in places with high levels of pollution) and work to create a clear way of categorising illnesses, diseases and epidemics into local and global scales. Health geographers can map the spread of illnesses and attempt to identify the reasons behind an increase or decrease in illnesses, as they work to find a way to halt the further spread or re-emergence of diseases in vulnerable populations."] },
    { id: "cambridge-12-test-3-part2-section-g", heading: "G", format: "pre", paragraphs: ["The second subcategory of health geography is the geography of healthcare provision. This group studies the availability (or lack thereof) of healthcare resources to individuals and populations around the world. In both developed and developing nations there is often a very large discrepancy between the options available to people in different social classes, income brackets, and levels of education. Individuals working in the area of the geography of healthcare provision attempt to assess the levels of healthcare in the area (for instance, it may be very difficult for people to get medical attention because there is a mountain between their village and the nearest hospital). These researchers are on the frontline of making recommendations regarding policy to international organisations, local government bodies and others."] },
    { id: "cambridge-12-test-3-part2-section-h", heading: "H", format: "pre", paragraphs: ["The field of health geography is often overlooked, but it constitutes a huge area of need in the fields of geography and healthcare. If we can understand how geography affects our health no matter where in the world we are located, we can better treat disease, prevent illness, and keep people safe and well."] },
  ],
  questionBlocks: [
    {
      id: "cambridge-12-test-3-part2-questions-14-19",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has eight sections, A–H. Which paragraph contains the following information? Write the correct letter, A–H. You may use any letter more than once.",
      questions: [
        { questionNumbers: [14], prompt: "An acceptance that not all diseases can be totally eliminated", options: healthParagraphs },
        { questionNumbers: [15], prompt: "Examples of physical conditions caused by human behaviour", options: healthParagraphs },
        { questionNumbers: [16], prompt: "A reference to classifying diseases on the basis of how far they extend geographically", options: healthParagraphs },
        { questionNumbers: [17], prompt: "Reasons why the level of access to healthcare can vary within a country", options: healthParagraphs },
        { questionNumbers: [18], prompt: "A description of health geography as a mixture of different academic fields", options: healthParagraphs },
        { questionNumbers: [19], prompt: "A description of the type of area where a particular illness is rare", options: healthParagraphs },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-12-test-3-part2-questions-20-26",
        "Questions 20–26",
        "Questions 20–26\nComplete the sentences below. Choose ONE WORD ONLY from the passage for each answer.\n\n20 Certain diseases have disappeared, thanks to better ______ and healthcare.\n\n21 Because there is more contact between people, ______ are losing their usefulness.\n\n22 Disease-causing ______ are most likely to be found in hot, damp regions.\n\n23 One cause of pollution is ______ that burn a particular fuel.\n\n24 The growth of cities often has an impact on nearby ______.\n\n25 ______ is one disease that is growing after having been eradicated.\n\n26 A physical barrier such as a ______ can prevent people from reaching a hospital.",
        20,
        26,
      ),
    },
  ],
  source: {
    passagePages: [64, 65].map(sourcePage),
    questionPages: [66].map(sourcePage),
    answerPages: [sourcePage(122)],
    explanationPages: [109, 110, 111, 112, 113].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集12精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const musicEmotions: ReadingPart = {
  id: "cambridge-12-test-3-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Music and the emotions",
  subtitle: "Neuroscientist Jonah Lehrer considers the emotional power of music",
  sections: [{
    id: "cambridge-12-test-3-part3-passage",
    format: "pre",
    paragraphs: [
      "Why does music make us feel? On the one hand, music is a purely abstract art form, devoid of language or explicit ideas. And yet, even though music says little, it still manages to touch us deeply. When listening to our favourite songs, our body betrays all the symptoms of emotional arousal. The pupils in our eyes dilate, our pulse and blood pressure rise, the electrical conductance of our skin is lowered, and the cerebellum, a brain region associated with bodily movement, becomes strangely active. Blood is even re-directed to the muscles in our legs. In other words, sound stirs us at our biological roots.",
      "A recent paper in Nature Neuroscience by a research team in Montreal, Canada, marks an important step in revealing the precise underpinnings of ‘the potent pleasurable stimulus’ that is music. Although the study involves plenty of fancy technology, including functional magnetic resonance imaging (fMRI) and ligand-based positron emission tomography (PET) scanning, the experiment itself was rather straightforward. After screening 217 individuals who responded to advertisements requesting people who experience ‘chills’ to instrumental music, the scientists narrowed down the subject pool to ten. They then asked the subjects to bring in their playlist of favourite songs — virtually every genre was represented, from techno to tango — and played them the music while their brain activity was monitored. Because the scientists were combining methodologies (PET and fMRI), they were able to obtain an impressively exact and detailed portrait of music in the brain. The first thing they discovered is that music triggers the production of dopamine — a chemical with a key role in setting people’s moods — by the neurons (nerve cells) in both the dorsal and ventral regions of the brain. As these two regions have long been linked with the experience of pleasure, this finding isn’t particularly surprising.",
      "What is rather more significant is the finding that the dopamine neurons in the caudate — a region of the brain involved in learning stimulus-response associations, and in anticipating food and other ‘reward’ stimuli — were at their most active around 15 seconds before the participants’ favourite moments in the music. The researchers call this the ‘anticipatory phase’ and argue that the purpose of this activity is to help us predict the arrival of our favourite part. The question, of course, is what all these dopamine neurons are up to. Why are they so active in the period preceding the acoustic climax? After all, we typically associate surges of dopamine with pleasure, with the processing of actual rewards. And yet, this cluster of cells is most active when the ‘chills’ have yet to arrive, when the melodic pattern is still unresolved.",
      "One way to answer the question is to look at the music and not the neurons. While music can often seem (at least to the outsider) like a labyrinth of intricate patterns, it turns out that the most important part of every song or symphony is when the patterns break down, when the sound becomes unpredictable. If the music is too obvious, it is annoyingly boring, like an alarm clock. Numerous studies, after all, have demonstrated that dopamine neurons quickly adapt to predictable rewards. If we know what’s going to happen next, then we don’t get excited. This is why composers often introduce a key note in the beginning of a song, spend most of the rest of the piece in the studious avoidance of the pattern, and then finally repeat it only at the end. The longer we are denied the pattern we expect, the greater the emotional release when the pattern returns, safe and sound.",
      "To demonstrate this psychological principle, the musicologist Leonard Meyer, in his classic book Emotion and Meaning in Music (1956), analysed the 5th movement of Beethoven’s String Quartet in C-sharp minor, Op. 131. Meyer wanted to show how music is defined by its flirtation with — but not submission to — our expectations of order. Meyer dissected 50 measures (bars) of the masterpiece, showing how Beethoven begins with the clear statement of a rhythmic and harmonic pattern and then, in an ingenious tonal dance, carefully holds off repeating it. What Beethoven does instead is suggest variations of the pattern. He wants to preserve an element of uncertainty in his music, making our brains beg for the one chord he refuses to give us. Beethoven saves that chord for the end.",
      "According to Meyer, it is the suspenseful tension of music, arising out of our unfulfilled expectations, that is the source of the music’s feeling. While earlier theories of music focused on the way a sound can refer to the real world of images and experiences — its ‘connotative’ meaning — Meyer argued that the emotions we find in music come from the unfolding events of the music itself. This ‘embodied meaning’ arises from the patterns the symphony invokes and then ignores. It is this uncertainty that triggers the surge of dopamine in the caudate, as we struggle to figure out what will happen next. We can predict some of the notes, but we can’t predict them all, and that is what keeps us listening, waiting expectantly for our reward, for the pattern to be completed.",
    ],
  }],
  questionBlocks: [
    {
      ...rawFillBlock(
        "cambridge-12-test-3-part3-questions-27-31",
        "The Montreal Study",
        "Questions 27–31\nComplete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.\n\nThe Montreal Study\nParticipants, who were recruited for the study through advertisements, had their brain activity monitored while listening to their favourite music. It was noted that the music stimulated the brain’s neurons to release a substance called 27 ______ in two of the parts of the brain which are associated with feeling 28 ______.\n\nResearchers also observed that the neurons in the area of the brain called the 29 ______ were particularly active just before the participants’ favourite moments in the music — the period known as the 30 ______. Activity in this part of the brain is associated with the expectation of ‘reward’ stimuli such as 31 ______.",
        27,
        31,
      ),
    },
    {
      id: "cambridge-12-test-3-part3-questions-32-36",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose the correct letter, A, B, C or D.",
      questions: [
        { questionNumbers: [32], prompt: "What point does the writer emphasise in the first paragraph?", options: [
          { letter: "A", text: "How dramatically our reactions to music can vary" }, { letter: "B", text: "How intense our physical responses to music can be" },
          { letter: "C", text: "How little we know about the way that music affects us" }, { letter: "D", text: "How much music can tell us about how our brains operate" },
        ] },
        { questionNumbers: [33], prompt: "What view of the Montreal study does the writer express in the second paragraph?", options: [
          { letter: "A", text: "Its aims were innovative." }, { letter: "B", text: "The approach was too simplistic." },
          { letter: "C", text: "It produced some remarkably precise data." }, { letter: "D", text: "The technology used was unnecessarily complex." },
        ] },
        { questionNumbers: [34], prompt: "What does the writer find interesting about the results of the Montreal study?", options: [
          { letter: "A", text: "The timing of participants’ neural responses to the music" }, { letter: "B", text: "The impact of the music on participants’ emotional state" },
          { letter: "C", text: "The section of participants’ brains which was activated by the music" }, { letter: "D", text: "The type of music which had the strongest effect on participants’ brains" },
        ] },
        { questionNumbers: [35], prompt: "Why does the writer refer to Meyer’s work on music and emotion?", options: [
          { letter: "A", text: "To propose an original theory about the subject" }, { letter: "B", text: "To offer support for the findings of the Montreal study" },
          { letter: "C", text: "To recommend the need for further research into the subject" }, { letter: "D", text: "To present a view which opposes that of the Montreal researchers" },
        ] },
        { questionNumbers: [36], prompt: "According to Leonard Meyer, what causes the listener’s emotional response to music?", options: [
          { letter: "A", text: "The way that the music evokes poignant memories in the listener" }, { letter: "B", text: "The association of certain musical chords with certain feelings" },
          { letter: "C", text: "The listener’s sympathy with the composer’s intentions" }, { letter: "D", text: "The internal structure of the musical composition" },
        ] },
      ],
    },
    {
      id: "cambridge-12-test-3-part3-questions-37-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete each sentence with the correct ending, A–F, below.",
      questions: [
        { questionNumbers: [37], prompt: "The Montreal researchers discovered that", options: [
          { letter: "A", text: "Our response to music depends on our initial emotional state." }, { letter: "B", text: "Neuron activity decreases if outcomes become predictable." },
          { letter: "C", text: "Emotive music can bring to mind actual pictures and events." }, { letter: "D", text: "Experiences in our past can influence our emotional reaction to music." },
          { letter: "E", text: "Emotive music delays giving listeners what they expect to hear." }, { letter: "F", text: "Neuron activity increases prior to key points in a musical piece." },
        ] },
        { questionNumbers: [38], prompt: "Many studies have demonstrated that", options: [
          { letter: "A", text: "Our response to music depends on our initial emotional state." }, { letter: "B", text: "Neuron activity decreases if outcomes become predictable." },
          { letter: "C", text: "Emotive music can bring to mind actual pictures and events." }, { letter: "D", text: "Experiences in our past can influence our emotional reaction to music." },
          { letter: "E", text: "Emotive music delays giving listeners what they expect to hear." }, { letter: "F", text: "Neuron activity increases prior to key points in a musical piece." },
        ] },
        { questionNumbers: [39], prompt: "Meyer’s analysis of Beethoven’s music shows that", options: [
          { letter: "A", text: "Our response to music depends on our initial emotional state." }, { letter: "B", text: "Neuron activity decreases if outcomes become predictable." },
          { letter: "C", text: "Emotive music can bring to mind actual pictures and events." }, { letter: "D", text: "Experiences in our past can influence our emotional reaction to music." },
          { letter: "E", text: "Emotive music delays giving listeners what they expect to hear." }, { letter: "F", text: "Neuron activity increases prior to key points in a musical piece." },
        ] },
        { questionNumbers: [40], prompt: "Earlier theories of music suggested that", options: [
          { letter: "A", text: "Our response to music depends on our initial emotional state." }, { letter: "B", text: "Neuron activity decreases if outcomes become predictable." },
          { letter: "C", text: "Emotive music can bring to mind actual pictures and events." }, { letter: "D", text: "Experiences in our past can influence our emotional reaction to music." },
          { letter: "E", text: "Emotive music delays giving listeners what they expect to hear." }, { letter: "F", text: "Neuron activity increases prior to key points in a musical piece." },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [67, 68].map(sourcePage),
    questionPages: [69, 70, 71].map(sourcePage),
    answerPages: [sourcePage(122)],
    explanationPages: [118, 119, 120, 121, 122, 123].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集12精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE12_TEST3_PARTS: ReadingPart[] = [flyingTortoises, healthGeography, musicEmotions];

import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  82: [1750, 2299], 83: [1750, 2299], 84: [1750, 2299], 85: [1750, 2299],
  86: [1750, 2299], 87: [1750, 2299], 88: [1750, 2299], 89: [1750, 2299],
  90: [1750, 2299], 91: [1750, 2299], 92: [1750, 2299], 93: [1750, 2299],
  94: [1750, 2299], 128: [1750, 1699],
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
    198: 2119, 199: 2316, 200: 2311, 201: 2320, 202: 2311,
    207: 1764, 208: 2313, 209: 2317, 210: 2313, 211: 2314, 212: 2310, 213: 2323,
    217: 1056, 218: 2315, 219: 2313, 220: 2309, 221: 2318, 222: 2312, 223: 2321,
  };
  return {
    page,
    src: "/reading/explanations/cambridge-16-test-4-part" + part + "-exp16-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2310,
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
  { letter: "YES", text: "The statement agrees with the views of the writer." },
  { letter: "NO", text: "The statement contradicts the views of the writer." },
  { letter: "NOT GIVEN", text: "It is impossible to say what the writer thinks about this." },
];

const tunnelMethods: ReadingPart = {
  id: "cambridge-16-test-4-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Roman tunnels",
  subtitle: "The Romans, who once controlled areas of Europe, North Africa and Asia Minor, adopted the construction techniques of other civilizations to build tunnels in their territories",
  sections: [{
    id: "cambridge-16-test-4-part1-passage",
    format: "pre",
    paragraphs: [
      "The Persians, who lived in present-day Iran, were one of the first civilizations to build tunnels that provided a reliable supply of water to human settlements in dry areas. In the early first millennium BCE, they introduced the qanat method of tunnel construction, which consisted of placing posts over a hill in a straight line, to ensure that the tunnel kept to its route, and then digging vertical shafts down into the ground at regular intervals. Underground, workers removed the earth from between the ends of the shafts, creating a tunnel. The excavated soil was taken up to the surface using the shafts, which also provided ventilation during the work. Once the tunnel was completed, it allowed water to flow from the top of a hillside down towards a canal, which supplied water for human use. Remarkably, some qanats built by the Persians 2,700 years ago are still in use today.",
      "They later passed on their knowledge to the Romans, who also used the qanat method to construct water-supply tunnels for agriculture. Roman qanat tunnels were constructed with vertical shafts dug at intervals of between 30 and 60 meters. The shafts were equipped with handholds and footholds to help those climbing in and out of them and were covered with a wooden or stone lid. To ensure that the shafts were vertical, Romans hung a plumb line from a rod placed across the top of each shaft and made sure that the weight at the end of it hung in the center of the shaft. Plumb lines were also used to measure the depth of the shaft and to determine the slope of the tunnel. The 5.6-kilometer-long Claudius tunnel, built in 41 CE to drain the Fucine Lake in central Italy, had shafts that were up to 122 meters deep, took 11 years to build and involved approximately 30,000 workers.",
      "By the 6th century BCE, a second method of tunnel construction appeared called the counter-excavation method, in which the tunnel was constructed from both ends. It was used to cut through high mountains when the qanat method was not a practical alternative. This method required greater planning and advanced knowledge of surveying, mathematics and geometry as both ends of a tunnel had to meet correctly at the center of the mountain. Adjustments to the direction of the tunnel also had to be made whenever builders encountered geological problems or when it deviated from its set path. They constantly checked the tunnel’s advancing direction, for example, by looking back at the light that penetrated through the tunnel mouth, and made corrections whenever necessary. Large deviations could happen, and they could result in one end of the tunnel not being usable. An inscription written on the side of a 428-meter tunnel, built by the Romans as part of the Saldae aqueduct system in modern-day Algeria, describes how the two teams of builders missed each other in the mountain and how the later construction of a lateral link between both corridors corrected the initial error.",
      "The Romans dug tunnels for their roads using the counter-excavation method, whenever they encountered obstacles such as hills or mountains that were too high for roads to pass over. An example is the 37-meter-long, 6-meter-high Furlo Pass Tunnel built in Italy in 69–79 CE. Remarkably, a modern road still uses this tunnel today. Tunnels were also built for mineral extraction. Miners would locate a mineral vein and then pursue it with shafts and tunnels underground. Traces of such tunnels used to mine gold can still be found at the Dolaucothi mines in Wales. When the sole purpose of a tunnel was mineral extraction, construction required less planning, as the tunnel route was determined by the mineral vein.",
      "Roman tunnel projects were carefully planned and carried out. The length of time it took to construct a tunnel depended on the method being used and the type of rock being excavated. The qanat construction method was usually faster than the counter-excavation method as it was more straightforward. This was because the mountain could be excavated not only from the tunnel mouths but also from shafts. The type of rock could also influence construction times. When the rock was hard, the Romans employed a technique called fire quenching which consisted of heating the rock with fire, and then suddenly cooling it with cold water so that it would crack. Progress through hard rock could be very slow, and it was not uncommon for tunnels to take years, if not decades, to be built. Construction marks left on a Roman tunnel in Bologna show that the rate of advance through solid rock was 30 centimeters per day. In contrast, the rate of advance of the Claudius tunnel can be calculated at 1.4 meters per day. Most tunnels had inscriptions showing the names of patrons who ordered construction and sometimes the name of the architect. For example, the 1.4-kilometer Cevlik tunnel in Turkey, built to divert the floodwater threatening the harbor of the ancient city of Seleuceia Pieria, had inscriptions on the entrance, still visible today, that also indicate that the tunnel was started in 69 CE and was completed in 81 CE.",
    ],
  }],
  questionBlocks: [
    rawFillBlock(
      "cambridge-16-test-4-part1-questions-1-6",
      "The Persian Qanat Method and a Roman Qanat Shaft",
      "Label the diagrams below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 1–6 on your answer sheet.",
      "The Persian Qanat Method\n\n1 ______ to direct the tunnelling\nWater runs into a 2 ______ used by local people\nVertical shafts to remove earth and for 3 ______\n\nCross-section of a Roman Qanat Shaft\n4 ______ made of wood or stone\n5 ______ attached to the plumb line\nHandholds and footholds used for 6 ______",
      1,
      6,
    ),
    {
      id: "cambridge-16-test-4-part1-questions-7-10",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 7–10 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [7], prompt: "The counter-excavation method completely replaced the qanat method in the 6th century BCE.", options: trueFalseNotGivenOptions },
        { questionNumbers: [8], prompt: "Only experienced builders were employed to construct a tunnel using the counter-excavation method.", options: trueFalseNotGivenOptions },
        { questionNumbers: [9], prompt: "The information about a problem that occurred during the construction of the Saldae aqueduct system was found in an ancient book.", options: trueFalseNotGivenOptions },
        { questionNumbers: [10], prompt: "The mistake made by the builders of the Saldae aqueduct system was that the two parts of the tunnel failed to meet.", options: trueFalseNotGivenOptions },
      ],
    },
    rawFillBlock(
      "cambridge-16-test-4-part1-questions-11-13",
      "Short-answer questions",
      "Answer the questions below. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 11–13 on your answer sheet.",
      "11 What type of mineral were the Dolaucothi mines in Wales built to extract?\n\n12 In addition to the patron, whose name might be carved onto a tunnel?\n\n13 What part of Seleuceia Pieria was the Cevlik tunnel built to protect?",
      11,
      13,
    ),
  ],
  source: {
    passagePages: [82, 83].map(sourcePage),
    questionPages: [84, 85].map(sourcePage),
    answerPages: [sourcePage(128)],
    explanationPages: [198, 199, 200, 201, 202].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集16精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const readingHabits: ReadingPart = {
  id: "cambridge-16-test-4-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Changes in reading habits",
  subtitle: "What are the implications of the way we read today?",
  sections: [{
    id: "cambridge-16-test-4-part2-passage",
    format: "pre",
    paragraphs: [
      "Look around on your next plane trip. The iPad is the new pacifier for babies and toddlers. Younger school-aged children read stories on smartphones; older kids don’t read at all, but hunch over video games. Parents and other passengers read on tablets or skim a flotilla of email and news feeds. Unbeknown to most of us, an invisible, game-changing transformation links everyone in this picture: the neuronal circuit that underlies the brain’s ability to read is subtly, rapidly changing and this has implications for everyone from the pre-reading toddler to the expert adult.",
      "As work in neurosciences indicates, the acquisition of literacy necessitated a new circuit in our species’ brain more than 6,000 years ago. That circuit evolved from a very simple mechanism for decoding basic information, like the number of goats in one’s herd, to the present, highly elaborated reading brain. My research depicts how the present reading brain enables the development of some of our most important intellectual and affective processes: internalized knowledge, analogical reasoning, and inference; perspective-taking and empathy; critical analysis and the generation of insight. Research surfacing in many parts of the world now cautions that each of these essential ‘deep reading’ processes may be under threat as we move into digital-based modes of reading.",
      "This is not a simple, binary issue of print versus digital reading and technological innovation. As MIT scholar Sherry Turkle has written, we do not err as a society when we innovate but when we ignore what we disrupt or diminish while innovating. In this hinge moment between print and digital cultures, society needs to confront what is diminishing in the expert reading circuit, what our children and older students are not developing, and what we can do about it.",
      "We know from research that the reading circuit is not given to human beings through a genetic blueprint like vision or language; it needs an environment to develop. Further, it will adapt to that environment’s requirements — from different writing systems to the characteristics of whatever medium is used. If the dominant medium advantages processes that are fast, multi-task oriented and well-suited for large volumes of information, like the current digital medium, so will the reading circuit. As UCLA psychologist Patricia Greenfield writes, the result is that less attention and time will be allocated to slower, time-demanding deep reading processes.",
      "Increasing reports from educators and from researchers in psychology and the humanities bear this out. English literature scholar and teacher Mark Edmundson describes how many college students actively avoid the classic literature of the 19th and 20th centuries in favour of something simpler as they no longer have the patience to read longer, denser, more difficult texts. We should be less concerned with students’ ‘cognitive impatience’, however, than by what may underlie it: the potential inability of large numbers of students to read with a level of critical analysis sufficient to comprehend the complexity of thought and argument found in more demanding texts.",
      "Multiple studies show that digital screen use may be causing a variety of troubling downstream effects on reading comprehension in older high school and college students. In Stavanger, Norway, psychologist Anne Mangen and her colleagues studied how high school students comprehend the same material in different mediums. Mangen’s group asked subjects questions about a short story whose plot had universal student appeal; half of the students read the story on a tablet, the other half in paperback. Results indicated that students who read on print were superior in their comprehension to screen-reading peers, particularly in their ability to sequence detail and reconstruct the plot in chronological order.",
      "Ziming Liu from San Jose State University has conducted a series of studies which indicate that the ‘new norm’ in reading is skimming, involving word-spotting and browsing through the text. Many readers now use a pattern when reading in which they sample the first line and then word-spot through the rest of the text. When the reading brain skims like this, it reduces time allocated to deep reading processes. In other words, we don’t have time to grasp complexity, to understand another’s feelings, to perceive beauty, and to create thoughts of the reader’s own.",
      "The possibility that critical analysis, empathy and other deep reading processes could become the unintended ‘collateral damage’ of our digital culture is not a straightforward binary issue about print versus digital reading. It is about how we all have begun to read on various mediums and how that changes not only what we read, but also the purposes for which we read. Nor is it only about the young. The subtle atrophy of critical analysis and empathy affects us all equally. It affects our ability to navigate a constant bombardment of information. It incentivizes a retreat to the most familiar stores of unchecked information, which require and receive no analysis, leaving us susceptible to false information and irrational ideas.",
      "There’s an old rule in neuroscience that does not alter with age: use it or lose it. It is a very hopeful principle when applied to critical thought in the reading brain because it implies choice. The story of the changing reading brain is hardly finished. We possess both the science and the technology to identify and redress the changes in how we read before they become entrenched. If we work to understand exactly what we will lose, alongside the extraordinary new capacities that the digital world has brought us, there is as much reason for excitement as caution.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-16-test-4-part2-questions-14-17",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 14–17 on your answer sheet.",
      questions: [
        { questionNumbers: [14], prompt: "What is the writer’s main point in the first paragraph?", options: [
          { letter: "A", text: "Our use of technology is having a hidden effect on us." },
          { letter: "B", text: "Technology can be used to help youngsters to read." },
          { letter: "C", text: "Travellers should be encouraged to use technology on planes." },
          { letter: "D", text: "Playing games is a more popular use of technology than reading." },
        ] },
        { questionNumbers: [15], prompt: "What main point does Sherry Turkle make about innovation?", options: [
          { letter: "A", text: "Technological innovation has led to a reduction in print reading." },
          { letter: "B", text: "We should pay attention to what might be lost when innovation occurs." },
          { letter: "C", text: "We should encourage more young people to become involved in innovation." },
          { letter: "D", text: "There is a difference between developing products and developing ideas." },
        ] },
        { questionNumbers: [16], prompt: "What point is the writer making in the fourth paragraph?", options: [
          { letter: "A", text: "Humans have an inborn ability to read and write." },
          { letter: "B", text: "Reading can be done using many different mediums." },
          { letter: "C", text: "Writing systems make unexpected demands on the brain." },
          { letter: "D", text: "Some brain circuits adjust to whatever is required of them." },
        ] },
        { questionNumbers: [17], prompt: "According to Mark Edmundson, the attitude of college students", options: [
          { letter: "A", text: "has changed the way he teaches." },
          { letter: "B", text: "has influenced what they select to read." },
          { letter: "C", text: "does not worry him as much as it does others." },
          { letter: "D", text: "does not match the views of the general public." },
        ] },
      ],
    },
    {
      id: "cambridge-16-test-4-part2-questions-18-22",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary using the list of words, A–H, below. Write the correct letter in boxes 18–22 on your answer sheet.",
      questions: [
        { questionNumbers: [18], prompt: "There have been many studies on digital screen use, showing some … trends.", options: [
          { letter: "A", text: "fast" }, { letter: "B", text: "isolated" }, { letter: "C", text: "emotional" }, { letter: "D", text: "worrying" },
          { letter: "E", text: "many" }, { letter: "F", text: "hard" }, { letter: "G", text: "combined" }, { letter: "H", text: "thorough" },
        ] },
        { questionNumbers: [19], prompt: "Her team used questions to find out how … each group’s understanding of the plot was.", options: [
          { letter: "A", text: "fast" }, { letter: "B", text: "isolated" }, { letter: "C", text: "emotional" }, { letter: "D", text: "worrying" },
          { letter: "E", text: "many" }, { letter: "F", text: "hard" }, { letter: "G", text: "combined" }, { letter: "H", text: "thorough" },
        ] },
        { questionNumbers: [20], prompt: "Students who read screens found the order of information … to recall.", options: [
          { letter: "A", text: "fast" }, { letter: "B", text: "isolated" }, { letter: "C", text: "emotional" }, { letter: "D", text: "worrying" },
          { letter: "E", text: "many" }, { letter: "F", text: "hard" }, { letter: "G", text: "combined" }, { letter: "H", text: "thorough" },
        ] },
        { questionNumbers: [21], prompt: "Studies by Ziming Liu show that students tend to read … words and phrases in a text to save time.", options: [
          { letter: "A", text: "fast" }, { letter: "B", text: "isolated" }, { letter: "C", text: "emotional" }, { letter: "D", text: "worrying" },
          { letter: "E", text: "many" }, { letter: "F", text: "hard" }, { letter: "G", text: "combined" }, { letter: "H", text: "thorough" },
        ] },
        { questionNumbers: [22], prompt: "This approach gives the reader a superficial understanding of the … content of the material.", options: [
          { letter: "A", text: "fast" }, { letter: "B", text: "isolated" }, { letter: "C", text: "emotional" }, { letter: "D", text: "worrying" },
          { letter: "E", text: "many" }, { letter: "F", text: "hard" }, { letter: "G", text: "combined" }, { letter: "H", text: "thorough" },
        ] },
      ],
    },
    {
      id: "cambridge-16-test-4-part2-questions-23-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the views of the writer in Reading Passage 2? In boxes 23–26 on your answer sheet, write YES if the statement agrees with the views of the writer, NO if the statement contradicts the views of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [23], prompt: "The medium we use to read can affect our choice of reading content.", options: yesNoNotGivenOptions },
        { questionNumbers: [24], prompt: "Some age groups are more likely to lose their complex reading skills than others.", options: yesNoNotGivenOptions },
        { questionNumbers: [25], prompt: "False information has become more widespread in today’s digital era.", options: yesNoNotGivenOptions },
        { questionNumbers: [26], prompt: "We still have opportunities to rectify the problems that technology is presenting.", options: yesNoNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [86, 87].map(sourcePage),
    questionPages: [88, 89].map(sourcePage),
    answerPages: [sourcePage(128)],
    explanationPages: [207, 208, 209, 210, 211, 212, 213].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集16精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const artificialIntelligence: ReadingPart = {
  id: "cambridge-16-test-4-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Attitudes towards Artificial Intelligence",
  sections: [
    {
      id: "cambridge-16-test-4-part3-section-a",
      heading: "A",
      format: "pre",
      paragraphs: [
        "Artificial intelligence (AI) can already predict the future. Police forces are using it to map when and where crime is likely to occur. Doctors can use it to predict when a patient is most likely to have a heart attack or stroke. Researchers are even trying to give AI imagination so it can plan for unexpected consequences.",
        "Many decisions in our lives require a good forecast, and AI is almost always better at forecasting than we are. Yet for all these technological advances, we still seem to deeply lack confidence in AI predictions. Recent cases show that people don’t like relying on AI and prefer to trust human experts, even if these experts are wrong.",
        "If we want AI to really benefit people, we need to find a way to get people to trust it. To do that, we need to understand why people are so reluctant to trust AI in the first place.",
      ],
    },
    {
      id: "cambridge-16-test-4-part3-section-b",
      heading: "B",
      format: "pre",
      paragraphs: [
        "Take the case of Watson for Oncology, one of technology giant IBM’s supercomputer programs. Their attempt to promote this program to cancer doctors was a PR disaster. The AI promised to deliver top-quality recommendations on the treatment of 12 cancers that accounted for 80% of the world’s cases. But when doctors first interacted with Watson, they found themselves in a rather difficult situation. On the one hand, if Watson provided guidance about a treatment that coincided with their own opinions, physicians did not see much point in Watson’s recommendations. The supercomputer was simply telling them what they already knew, and these recommendations did not change the actual treatment.",
        "On the other hand, if Watson generated a recommendation that contradicted the experts’ opinion, doctors would typically conclude that Watson wasn’t competent. And the machine wouldn’t be able to explain why its treatment was plausible because its machine-learning algorithms were simply too complex to be fully understood by humans. Consequently, this has caused even more suspicion and disbelief, leading many doctors to ignore the seemingly outlandish AI recommendations and stick to their own expertise.",
      ],
    },
    {
      id: "cambridge-16-test-4-part3-section-c",
      heading: "C",
      format: "pre",
      paragraphs: [
        "This is just one example of people’s lack of confidence in AI and their reluctance to accept what AI has to offer. Trust in other people is often based on our understanding of how others think and having experience of their reliability. This helps create a psychological feeling of safety. AI, on the other hand, is still fairly new and unfamiliar to most people. Even if it can be technically explained (and that’s not always the case), AI’s decision-making process is usually too difficult for most people to comprehend. And interacting with something we don’t understand can cause anxiety and give us a sense that we’re losing control.",
        "Many people are also simply not familiar with many instances of AI actually working, because it often happens in the background. Instead, they are acutely aware of instances where AI goes wrong. Embarrassing AI failures receive a disproportionate amount of media attention, emphasising the message that we cannot rely on technology. Machine learning is not foolproof, in part because the humans who design it aren’t.",
      ],
    },
    {
      id: "cambridge-16-test-4-part3-section-d",
      heading: "D",
      format: "pre",
      paragraphs: [
        "Feelings about AI run deep. In a recent experiment, people from a range of backgrounds were given various sci-fi films about AI to watch and then asked questions about automation in everyday life. It was found that, regardless of whether the film they watched depicted AI in a positive or negative light, simply watching a cinematic vision of our technological future polarised the participants’ attitudes. Optimists became more extreme in their enthusiasm for AI and sceptics became even more guarded.",
        "This suggests people use relevant evidence about AI in a biased manner to support their existing attitudes, a deep-rooted human tendency known as ‘confirmation bias’. As AI is represented more and more in media and entertainment, it could lead to a society split between those who benefit from AI and those who reject it. More pertinently, refusing to accept the advantages offered by AI could place a large group of people at a serious disadvantage.",
      ],
    },
    {
      id: "cambridge-16-test-4-part3-section-e",
      heading: "E",
      format: "pre",
      paragraphs: [
        "Fortunately, we already have some ideas about how to improve trust in AI. Simply having previous experience with AI can significantly improve people’s opinions about the technology, as was found in the study mentioned above. Evidence also suggests the more you use other technologies such as the internet, the more you trust them.",
        "Another solution may be to reveal more about the algorithms which AI uses and the purposes they serve. Several high-profile social media companies and online marketplaces already release transparency reports about government requests and surveillance disclosures. A similar practice for AI could help people have a better understanding of the way algorithmic decisions are made.",
      ],
    },
    {
      id: "cambridge-16-test-4-part3-section-f",
      heading: "F",
      format: "pre",
      paragraphs: [
        "Research suggests that allowing people some control over AI decision-making could also improve trust and enable AI to learn from human experience. For example, one study showed that when people were allowed the freedom to slightly modify an algorithm, they felt more satisfied with its decisions, more likely to believe it was superior and more likely to use it in the future.",
        "We don’t need to understand the intricate inner workings of AI systems, but if people are given a degree of responsibility for how they are implemented, they will be more willing to accept AI into their lives.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-16-test-4-part3-headings-27-32",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 3 has six sections, A–F. Choose the correct heading for each section from the list of headings below. Write the correct number, i–viii, in boxes 27–32 on your answer sheet.",
      questionNumbers: [27, 28, 29, 30, 31, 32],
      options: [
        { id: "i", text: "An increasing divergence of attitudes towards AI" },
        { id: "ii", text: "Reasons why we have more faith in human judgement than in AI" },
        { id: "iii", text: "The superiority of AI projections over those made by humans" },
        { id: "iv", text: "The process by which AI can help us make good decisions" },
        { id: "v", text: "The advantages of involving users in AI processes" },
        { id: "vi", text: "Widespread distrust of an AI innovation" },
        { id: "vii", text: "Encouraging openness about how AI functions" },
        { id: "viii", text: "A surprisingly successful AI application" },
      ],
    },
    {
      id: "cambridge-16-test-4-part3-questions-33-35",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 33–35 on your answer sheet.",
      questions: [
        { questionNumbers: [33], prompt: "What is the writer doing in Section A?", options: [
          { letter: "A", text: "Providing a solution to a concern." },
          { letter: "B", text: "Justifying an opinion about an issue." },
          { letter: "C", text: "Highlighting the existence of a problem." },
          { letter: "D", text: "Explaining the reasons for a phenomenon." },
        ] },
        { questionNumbers: [34], prompt: "According to Section C, why might some people be reluctant to accept AI?", options: [
          { letter: "A", text: "They are afraid it will replace humans in decision-making jobs." },
          { letter: "B", text: "Its complexity makes them feel that they are at a disadvantage." },
          { letter: "C", text: "They would rather wait for the technology to be tested over a period of time." },
          { letter: "D", text: "Misunderstandings about how it works make it seem more challenging than it is." },
        ] },
        { questionNumbers: [35], prompt: "What does the writer say about the media in Section C of the text?", options: [
          { letter: "A", text: "It leads the public to be mistrustful of AI." },
          { letter: "B", text: "It devotes an excessive amount of attention to AI." },
          { letter: "C", text: "Its reports of incidents involving AI are often inaccurate." },
          { letter: "D", text: "It gives the impression that AI failures are due to designer error." },
        ] },
      ],
    },
    {
      id: "cambridge-16-test-4-part3-questions-36-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 3? In boxes 36–40 on your answer sheet, write YES if the statement agrees with the claims of the writer, NO if the statement contradicts the claims of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [36], prompt: "Subjective depictions of AI in sci-fi films make people change their opinions about automation.", options: yesNoNotGivenOptions },
        { questionNumbers: [37], prompt: "Portrayals of AI in media and entertainment are likely to become more positive.", options: yesNoNotGivenOptions },
        { questionNumbers: [38], prompt: "Rejection of the possibilities of AI may have a negative effect on many people’s lives.", options: yesNoNotGivenOptions },
        { questionNumbers: [39], prompt: "Familiarity with AI has very little impact on people’s attitudes to the technology.", options: yesNoNotGivenOptions },
        { questionNumbers: [40], prompt: "AI applications which users are able to modify are more likely to gain consumer approval.", options: yesNoNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [91, 92].map(sourcePage),
    questionPages: [90, 93, 94].map(sourcePage),
    answerPages: [sourcePage(128)],
    explanationPages: [217, 218, 219, 220, 221, 222, 223].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集16精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE16_TEST4_PARTS: ReadingPart[] = [tunnelMethods, readingHabits, artificialIntelligence];

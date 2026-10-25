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

const pyramidPassage: ReadingPart = {
  id: "cambridge-7-test-4-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "Pulling strings to build pyramids",
  subtitle: "No one knows exactly how the pyramids were built. Marcus Chown reckons the answer could be ‘hanging in the air’. ",
  sections: [
    {
      id: "c7t4-p1-a",
      paragraphs: [
        "The pyramids of Egypt were built more than three thousand years ago, and no one knows how. The conventional picture is that tens of thousands of slaves dragged stones on sledges. But there is no evidence to back this up. Now a Californian software consultant called Maureen Clemmons has suggested that kites might have been involved. While perusing a book on the monuments of Egypt, she noticed a hieroglyph that showed a row of men standing in odd postures. They were holding what looked like ropes that led, via some kind of mechanical system, to a giant bird in the sky. She wondered if perhaps the bird was actually a giant kite, and the men were using it to lift a heavy object.",
      ],
    },
    {
      id: "c7t4-p1-b",
      paragraphs: [
        "Intrigued, Clemmons contacted Morteza Gharib, aeronautics professor at the California Institute of Technology. He was fascinated by the idea. ‘Coming from Iran, I have a keen interest in Middle Eastern science,’ he says. He too was puzzled by the picture that had sparked Clemmons's interest. The object in the sky apparently had wings far too short and wide for a bird. ‘The possibility certainly existed that it was a kite,’ he says. And since he needed a summer project for his student Emilio Graff, investigating the possibility of using kites as heavy lifters seemed like a good idea.",
      ],
    },
    {
      id: "c7t4-p1-c",
      paragraphs: [
        "Gharib and Graff set themselves the task of raising a 4.5-metre stone column from horizontal to vertical, using no source of energy except the wind. Their initial calculations and scale-model wind-tunnel experiments convinced them they wouldn't need a strong wind to lift the 33.5-tonne column. Even a modest force, if sustained over a long time, would do. The key was to use a pulley system that would magnify the applied force. So they rigged up a tent-shaped scaffold directly above the tip of the horizontal column, with pulleys suspended from the scaffold's apex. The idea was that as one end of the column rose, the base would roll across the ground on a trolley.",
      ],
    },
    {
      id: "c7t4-p1-d",
      paragraphs: [
        "Earlier this year, the team put Clemmons's unlikely theory to the test, using a 40-square-metre rectangular nylon sail. The kite lifted the column clean off the ground. ‘We were absolutely stunned,’ Gharib says. ‘The instant the sail opened into the wind, a huge force was generated and the column was raised to the vertical in a mere 40 seconds.’",
      ],
    },
    {
      id: "c7t4-p1-e",
      paragraphs: [
        "The wind was blowing at a gentle 16 to 20 kilometres an hour, little more than half what they thought would be needed. What they had failed to reckon with was what happened when the kite was opened. ‘There was a huge initial force — five times larger than the steady state force,’ Gharib says. This jerk meant that kites could lift huge weights, Gharib realised. Even a 300-tonne column could have been lifted to the vertical with 40 or so men and four or five sails. So Clemmons was right: the pyramid builders could have used kites to lift massive stones into place. ‘Whether they actually did is another matter,’ Gharib says. There are no pictures showing the construction of the pyramids, so there is no way to tell what really happened. ‘The evidence for using kites to move large stones is no better or worse than the evidence for the brute force method,’ Gharib says.",
      ],
    },
    {
      id: "c7t4-p1-f",
      paragraphs: [
        "Indeed, the experiments have left many specialists unconvinced. ‘The evidence for kite-lifting is non-existent,’ says Willeke Wendrich, an associate professor of Egyptology at the University of California, Los Angeles.",
      ],
    },
    {
      id: "c7t4-p1-g",
      paragraphs: [
        "Others feel there is more of a case for the theory. Harnessing the wind would not have been a problem for accomplished sailors like the Egyptians. And they are known to have used wooden pulleys, which could have been made strong enough to bear the weight of massive blocks of stone. In addition, there is some physical evidence that the ancient Egyptians were interested in flight. A wooden artefact found on the step pyramid at Saqqara looks uncannily like a modern glider. Although it dates from several hundred years after the building of the pyramids, its sophistication suggests that the Egyptians might have been developing ideas of flight for a long time. And other ancient civilisations certainly knew about kites; as early as 1250 BC, the Chinese were using them to deliver messages and dump flaming debris on their foes.",
      ],
    },
    {
      id: "c7t4-p1-h",
      paragraphs: [
        "The experiments might even have practical uses nowadays. There are plenty of places around the globe where people have no access to heavy machinery, but do know how to deal with wind, sailing and basic mechanical principles. Gharib has already been contacted by a civil engineer in Nicaragua, who wants to put up buildings with adobe roofs supported by concrete arches on a site that heavy equipment can't reach. His idea is to build the arches horizontally, then lift them into place using kites. ‘We've given him some design hints,’ says Gharib. ‘We're just waiting for him to report back.’ So whether they were actually used to build the pyramids or not, it seems that kites may make sensible construction tools in the 21st century AD.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c7t4-p1-true-false-not-given",
      type: "choice",
      instruction: "Do the following statements agree with the information given in Reading Passage 1? Write TRUE, FALSE or NOT GIVEN.",
      questions: [
        { questionNumbers: [1], prompt: "It is generally believed that large numbers of people were needed to build the pyramids.", options: trueFalseNotGiven },
        { questionNumbers: [2], prompt: "Clemmons found a strange hieroglyph on the wall of an Egyptian monument.", options: trueFalseNotGiven },
        { questionNumbers: [3], prompt: "Gharib had previously done experiments on bird flight.", options: trueFalseNotGiven },
        { questionNumbers: [4], prompt: "Gharib and Graff tested their theory before applying it.", options: trueFalseNotGiven },
        { questionNumbers: [5], prompt: "The success of the actual experiment was due to the high speed of the wind.", options: trueFalseNotGiven },
        { questionNumbers: [6], prompt: "They found that, as the kite flew higher, the wind force got stronger.", options: trueFalseNotGiven },
        { questionNumbers: [7], prompt: "The team decided that it was possible to use kites to raise very heavy stones.", options: trueFalseNotGiven },
      ],
    },
    {
      id: "c7t4-p1-summary",
      type: "fill",
      title: "Additional evidence for theory of kite-lifting",
      instruction: "Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
      questions: [
        { number: 8, before: "The Egyptians had ", after: ", which could lift large pieces of" },
        { number: 9, before: " ", after: ", and they knew how to use the energy of the wind from their skill as" },
        { number: 10, before: " ", after: ". The discovery on one pyramid of an object which resembled a" },
        { number: 11, before: " ", after: " suggests they may have experimented with" },
        { number: 12, before: " ", after: ". In addition, over two thousand years ago kites were used in China as weapons, as well as for sending" },
        { number: 13, before: " ", after: "." },
      ],
      rawText: "Questions 8–13\nComplete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.\n\nAdditional evidence for theory of kite-lifting\n\nThe Egyptians had 8 ......................, which could lift large pieces of 9 ......................, and they knew how to use the energy of the wind from their skill as 10 ...................... . The discovery on one pyramid of an object which resembled a 11 ...................... suggests they may have experimented with 12 ...................... . In addition, over two thousand years ago kites were used in China as weapons, as well as for sending 13 ...................... .",
    },
  ],
  source: partSource([82, 83], [84]),
};

const salmonEndings: ReadingOption[] = [
  { letter: "A", text: "to recognise fisheries that care for the environment." },
  { letter: "B", text: "to be successful." },
  { letter: "C", text: "to stop fish from spawning." },
  { letter: "D", text: "to set up environmental protection laws." },
  { letter: "E", text: "to stop people fishing for sport." },
  { letter: "F", text: "to label their products using the MSC logo." },
  { letter: "G", text: "to ensure that fish numbers are sufficient to permit fishing." },
  { letter: "H", text: "to assist the subsistence communities in the region." },
  { letter: "I", text: "to freeze a huge number of salmon eggs." },
  { letter: "J", text: "to deny certification to the Alaska fisheries." },
  { letter: "K", text: "to close down all fisheries." },
];

const salmonPassage: ReadingPart = {
  id: "cambridge-7-test-4-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 below.",
  title: "Endless Harvest",
  sections: [
    {
      id: "c7t4-p2-a",
      paragraphs: [
        "More than two hundred years ago, Russian explorers and fur hunters landed on the Aleutian Islands, a volcanic archipelago in the North Pacific, and learned of a land mass that lay farther to the north. The islands' native inhabitants called this land mass Aleyska, the ‘Great Land’; today, we know it as Alaska.",
      ],
    },
    {
      id: "c7t4-p2-b",
      paragraphs: [
        "The forty-ninth state to join the United States of America (in 1959), Alaska is fully one-fifth the size of the mainland 48 states combined. It shares, with Canada, the second longest river system in North America and has over half the coastline of the United States. The rivers feed into the Bering Sea and Gulf of Alaska — cold, nutrient-rich waters which support tens of millions of seabirds, and over 400 species of fish, shellfish, crustaceans, and molluscs. Taking advantage of this rich bounty, Alaska's commercial fisheries have developed into some of the largest in the world.",
      ],
    },
    {
      id: "c7t4-p2-c",
      paragraphs: [
        "According to the Alaska Department of Fish and Game (ADF&G), Alaska's commercial fisheries landed hundreds of thousands of tonnes of shellfish and herring, and well over a million tonnes of groundfish (cod, sole, perch and pollock) in 2000. The true cultural heart and soul of Alaska's fisheries, however, is salmon. ‘Salmon,’ notes writer Susan Ewing in The Great Alaska Nature Factbook, ‘pump through Alaska like blood through a heart, bringing rhythmic, circulating nourishment to land, animals and people.’ The ‘predictable abundance’ of salmon allowed some native cultures to flourish, and ‘dying spawners* feed bears, eagles, other animals, and ultimately the soil itself’. All five species of Pacific salmon — chinook, or king; chum, or dog; coho, or silver; sockeye, or red; and pink, or humpback — spawn** in Alaskan waters, and 90% of all Pacific salmon commercially caught in North America are produced there. Indeed, if Alaska was an independent nation, it would be the largest producer of wild salmon in the world. During 2000, commercial catches of Pacific salmon in Alaska exceeded 320,000 tonnes, with an ex-vessel value of over $US260 million.\n\n* spawners: fish that have released eggs\n** spawn: release eggs",
      ],
    },
    {
      id: "c7t4-p2-d",
      paragraphs: [
        "Catches have not always been so healthy. Between 1940 and 1959, overfishing led to crashes in salmon populations so severe that in 1953 Alaska was declared a federal disaster area. With the onset of statehood, however, the State of Alaska took over management of its own fisheries, guided by a state constitution which mandates that Alaska's natural resources be managed on a sustainable basis. At that time, statewide harvests totalled around 25 million salmon. Over the next few decades average catches steadily increased as a result of this policy of sustainable management, until, during the 1990s, annual harvests were well in excess of 100 million, and on several occasions over 200 million fish.",
      ],
    },
    {
      id: "c7t4-p2-e",
      paragraphs: [
        "The primary reason for such increases is what is known as ‘In-Season Abundance-Based Management’. There are biologists throughout the state constantly monitoring adult fish as they show up to spawn. The biologists sit in streamside counting towers, study sonar, watch from aeroplanes, and talk to fishermen. The salmon season in Alaska is not pre-set. The fishermen know the approximate time of year when they will be allowed to fish, but on any given day, one or more field biologists in a particular area can put a halt to fishing. Even sport fishing can be brought to a halt. It is this management mechanism that has allowed Alaska salmon stocks — and, accordingly, Alaska salmon fisheries — to prosper, even as salmon populations in the rest of the United States are increasingly considered threatened or even endangered.",
      ],
    },
    {
      id: "c7t4-p2-f",
      paragraphs: [
        "In 1999, the Marine Stewardship Council (MSC)*** commissioned a review of the Alaska salmon fishery. The Council, which was founded in 1996, certifies fisheries that meet high environmental standards, enabling them to use a label that recognises their environmental responsibility. The MSC has established a set of criteria by which commercial fisheries can be judged. Recognising the potential benefits of being identified as environmentally responsible, fisheries approach the Council requesting to undergo the certification process. The MSC then appoints a certification committee, composed of a panel of fisheries experts, which gathers information and opinions from fishermen, biologists, government officials, industry representatives, non-governmental organisations and others.",
      ],
    },
    {
      id: "c7t4-p2-g",
      paragraphs: [
        "Some observers thought the Alaska salmon fisheries would not have any chance of certification when, in the months leading up to MSC's final decision, salmon runs throughout western Alaska completely collapsed. In the Yukon and Kuskokwim rivers, chinook and chum runs were probably the poorest since statehood; subsistence communities throughout the region, who normally have priority over commercial fishing, were devastated.",
      ],
    },
    {
      id: "c7t4-p2-h",
      paragraphs: [
        "The crisis was completely unexpected, but researchers believe it had nothing to do with impacts of fisheries. Rather, they contend, it was almost certainly the result of climatic shifts, prompted in part by cumulative effects of the el Niño/la Niña phenomenon on Pacific Ocean temperatures, culminating in a harsh winter in which huge numbers of salmon eggs were frozen. It could have meant the end as far as the certification process was concerned. However, the state reacted quickly, closing down all fisheries, even those necessary for subsistence purposes.",
      ],
    },
    {
      id: "c7t4-p2-i",
      paragraphs: [
        "In September 2000, MSC announced that the Alaska salmon fisheries qualified for certification. Seven companies producing Alaska salmon were immediately granted permission to display the MSC logo on their products. Certification is for an initial period of five years, with an annual review to ensure that the fishery is continuing to meet the required standards.\n\n*** MSC: a joint venture between WWF (World Wildlife Fund) and Unilever, a Dutch-based multinational",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c7t4-p2-true-false-not-given",
      type: "choice",
      instruction: "Do the following statements agree with the information given in Reading Passage 2? Write TRUE, FALSE or NOT GIVEN.",
      questions: [
        { questionNumbers: [14], prompt: "The inhabitants of the Aleutian Islands renamed their islands ‘Aleyska’.", options: trueFalseNotGiven },
        { questionNumbers: [15], prompt: "Alaska's fisheries are owned by some of the world's largest companies.", options: trueFalseNotGiven },
        { questionNumbers: [16], prompt: "Life in Alaska is dependent on salmon.", options: trueFalseNotGiven },
        { questionNumbers: [17], prompt: "Ninety per cent of all Pacific salmon caught are sockeye or pink salmon.", options: trueFalseNotGiven },
        { questionNumbers: [18], prompt: "More than 320,000 tonnes of salmon were caught in Alaska in 2000.", options: trueFalseNotGiven },
        { questionNumbers: [19], prompt: "Between 1940 and 1959, there was a sharp decrease in Alaska's salmon population.", options: trueFalseNotGiven },
        { questionNumbers: [20], prompt: "During the 1990s, the average number of salmon caught each year was 100 million.", options: trueFalseNotGiven },
      ],
    },
    {
      id: "c7t4-p2-sentence-endings",
      type: "choice",
      instruction: "Complete each sentence with the correct ending, A–K. Write the correct letter in boxes 21–26 on your answer sheet.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [21], prompt: "In Alaska, biologists keep a check on adult fish", options: salmonEndings },
        { questionNumbers: [22], prompt: "Biologists have the authority", options: salmonEndings },
        { questionNumbers: [23], prompt: "In-Season Abundance-Based Management has allowed the Alaska salmon fisheries", options: salmonEndings },
        { questionNumbers: [24], prompt: "The Marine Stewardship Council (MSC) was established", options: salmonEndings },
        { questionNumbers: [25], prompt: "As a result of the collapse of the salmon runs in 1999, the state decided", options: salmonEndings },
        { questionNumbers: [26], prompt: "In September 2000, the MSC allowed seven Alaska salmon companies", options: salmonEndings },
      ],
    },
  ],
  source: partSource([85, 86], [87, 88]),
};

const noiseWordBank: ReadingOption[] = [
  { letter: "A", text: "no control over" },
  { letter: "B", text: "unexpected" },
  { letter: "C", text: "intense" },
  { letter: "D", text: "the same amount of" },
  { letter: "E", text: "performed better than" },
  { letter: "F", text: "performed at about the same level as" },
  { letter: "G", text: "no" },
  { letter: "H", text: "showed more irritation than" },
  { letter: "I", text: "made more mistakes than" },
  { letter: "J", text: "different types of" },
];

const noiseResearchers: ReadingOption[] = [
  { letter: "A", text: "Glass and Singer" },
  { letter: "B", text: "Broadbent" },
  { letter: "C", text: "Finkelman and Glass" },
  { letter: "D", text: "Cohen et al." },
  { letter: "E", text: "None of the above" },
];

const noisePassage: ReadingPart = {
  id: "cambridge-7-test-4-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "EFFECTS OF NOISE",
  sections: [
    {
      id: "c7t4-p3-main",
      paragraphs: [
        "In general, it is plausible to suppose that we should prefer peace and quiet to noise. And yet most of us have had the experience of having to adjust to sleeping in the mountains or the countryside because it was initially ‘too quiet’, an experience that suggests that humans are capable of adapting to a wide range of noise levels. Research supports this view. For example, Glass and Singer (1972) exposed people to short bursts of very loud noise and then measured their ability to work out problems and their physiological reactions to the noise. The noise was quite disruptive at first, but after about four minutes the subjects were doing just as well on their tasks as control subjects who were not exposed to noise. Their physiological arousal also declined quickly to the same levels as those of the control subjects.",
        "But there are limits to adaptation and loud noise becomes more troublesome if the person is required to concentrate on more than one task. For example, high noise levels interfered with the performance of subjects who were required to monitor three dials at a time, a task not unlike that of an aeroplane pilot or an air-traffic controller (Broadbent, 1957). Similarly, noise did not affect a subject's ability to track a moving line with a steering wheel, but it did interfere with the subject's ability to repeat numbers while tracking (Finkelman and Glass, 1970).",
        "Probably the most significant finding from research on noise is that its predictability is more important than how loud it is. We are much more able to ‘tune out’ chronic background noise, even if it is quite loud, than to work under circumstances with unexpected intrusions of noise. In the Glass and Singer study, in which subjects were exposed to bursts of noise as they worked on a task, some subjects heard loud bursts and others heard soft bursts. For some subjects, the bursts were spaced exactly one minute apart (predictable noise); others heard the same amount of noise overall, but the bursts",
        "occurred at random intervals (unpredictable noise). Subjects reported finding the predictable and unpredictable noise equally annoying, and all subjects performed at about the same level during the noise portion of the experiment. But the different noise conditions had quite different after-effects when the subjects were required to proofread written material under conditions of no noise. As shown in Table 1 the unpredictable noise produced more errors in the later proofreading task than predictable noise; and soft, unpredictable noise actually produced slightly more errors on this task than the loud, predictable noise.",
        "Apparently, unpredictable noise produces more fatigue than predictable noise, but it takes a while for this fatigue to take its toll on performance.",
        "Predictability is not the only variable that reduces or eliminates the negative effects of noise. Another is control. If the individual knows that he or she can control the noise, this seems to eliminate both its negative effects at the time and its after-effects. This is true even if the individual never actually exercises his or her option to turn the noise off (Glass and Singer, 1972). Just the knowledge that one has control is sufficient.",
        "The studies discussed so far exposed people to noise for only short periods and only transient effects were studied. But the major worry about noisy environments is that living day after day with chronic noise may produce serious, lasting effects. One study, suggesting that this worry is a realistic one, compared elementary school pupils who attended schools near Los Angeles's busiest airport with students who attended schools in quiet neighbourhoods (Cohen et al., 1980). It was found that children from the noisy schools had higher blood pressure and were more easily distracted than those who attended the quiet schools. Moreover, there was no evidence of adaptability to the noise. In fact, the longer the children had attended the noisy schools, the more distractible they became. The effects also seem to be long lasting. A follow-up study showed that children who were moved to less noisy classrooms still showed greater distractibility one year later than students who had always been in the quiet schools (Cohen et al., 1981). It should be noted that the two groups of children had been carefully matched by the investigators so that they were comparable in age, ethnicity, race, and social class.",
      ],
      figures: [
        {
          afterParagraph: 2,
          caption: "Table 1: Proofreading Errors and Noise",
          type: "data-table",
          headers: ["", "Unpredictable Noise", "Predictable Noise", "Average"],
          rows: [
            ["Loud noise", "40.1", "31.8", "35.9"],
            ["Soft noise", "36.7", "27.4", "32.1"],
            ["Average", "38.4", "29.6", ""],
          ],
        },
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c7t4-p3-multiple-choice-27-29",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27–29 on your answer sheet.",
      questions: [
        {
          questionNumbers: [27],
          prompt: "The writer suggests that people may have difficulty sleeping in the mountains because",
          options: [
            { letter: "A", text: "humans do not prefer peace and quiet to noise." },
            { letter: "B", text: "they may be exposed to short bursts of very strange sounds." },
            { letter: "C", text: "humans prefer to hear a certain amount of noise while they sleep." },
            { letter: "D", text: "they may have adapted to a higher noise level in the city." },
          ],
        },
        {
          questionNumbers: [28],
          prompt: "In noise experiments, Glass and Singer found that",
          options: [
            { letter: "A", text: "problem-solving is much easier under quiet conditions." },
            { letter: "B", text: "physiological arousal prevents the ability to work." },
            { letter: "C", text: "bursts of noise do not seriously disrupt problem-solving in the long term." },
            { letter: "D", text: "the physiological arousal of control subjects declined quickly." },
          ],
        },
        {
          questionNumbers: [29],
          prompt: "Researchers discovered that high noise levels are not likely to interfere with the successful performance of",
          options: [
            { letter: "A", text: "a single task." },
            { letter: "B", text: "the tasks of pilots or air traffic controllers." },
            { letter: "C", text: "the ability to repeat numbers while tracking moving lines." },
            { letter: "D", text: "the ability to monitor three dials at once." },
          ],
        },
      ],
    },
    {
      id: "c7t4-p3-noise-summary",
      type: "fill",
      title: "",
      instruction: "Complete the summary using the list of words and phrases, A–J. You may use any letter more than once. Write the correct letter, A–J, in boxes 30–34 on your answer sheet.",
      questions: [30, 31, 32, 33, 34].map((number) => ({ number, before: "Question " + number })),
      wordBank: noiseWordBank.map((option) => option.letter),
      rawText: "Questions 30–34\nComplete the summary using the list of words and phrases, A–J, below. You may use any letter more than once.\n\nGlass and Singer (1972) showed that situations in which there is intense noise have less effect on performance than circumstances in which 30 ...................... noise occurs. Subjects were divided into groups to perform a task. Some heard loud bursts of noise, others soft. For some subjects, the noise was predictable, while for others its occurrence was random. All groups were exposed to 31 ...................... noise. The predictable noise group 32 ...................... the unpredictable noise group on this task.\n\nIn the second part of the experiment, the four groups were given a proofreading task to complete under conditions of no noise. They were required to check written material for errors. The group which had been exposed to unpredictable noise 33 ...................... the group which had been exposed to predictable noise. The group which had been exposed to loud predictable noise performed better than those who had heard soft, unpredictable bursts. The results suggest that 34 ...................... noise produces fatigue but that this manifests itself later.\n\n" + noiseWordBank.map((option) => option.letter + " " + option.text).join("\n"),
    },
    {
      id: "c7t4-p3-researchers",
      type: "choice",
      instruction: "Look at the following statements (Questions 35–40) and the list of researchers below. Match each statement with the correct researcher(s), A–E. You may use any letter more than once.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [35], prompt: "Subjects exposed to noise find it difficult at first to concentrate on problem-solving tasks.", options: noiseResearchers },
        { questionNumbers: [36], prompt: "Long-term exposure to noise can produce changes in behaviour which can still be observed a year later.", options: noiseResearchers },
        { questionNumbers: [37], prompt: "The problems associated with exposure to noise do not arise if the subject knows they can make it stop.", options: noiseResearchers },
        { questionNumbers: [38], prompt: "Exposure to high-pitched noise results in more errors than exposure to low-pitched noise.", options: noiseResearchers },
        { questionNumbers: [39], prompt: "Subjects find it difficult to perform three tasks at the same time when exposed to noise.", options: noiseResearchers },
        { questionNumbers: [40], prompt: "Noise affects a subject's capacity to repeat numbers while carrying out another task.", options: noiseResearchers },
      ],
    },
  ],
  source: partSource([89, 90], [91, 92, 93]),
};

export const CAMBRIDGE7_TEST4_PARTS: ReadingPart[] = [pyramidPassage, salmonPassage, noisePassage];

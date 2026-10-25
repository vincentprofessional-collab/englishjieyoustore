import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  60: [1587, 2100], 61: [1689, 2363], 62: [1568, 2101], 63: [1689, 2365],
  64: [1681, 2100], 65: [1686, 2365], 66: [1594, 2193], 67: [1689, 2365],
  68: [1630, 2198], 69: [1681, 2364], 70: [1499, 2176], 71: [1688, 2365],
  72: [1482, 2112], 126: [1256, 1469],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci15-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = {
    144: 1939, 145: 2332, 146: 2326, 147: 2329, 148: 2329,
    152: 740, 153: 2330, 154: 2338, 155: 2340, 156: 2340,
    160: 945, 161: 2334, 162: 2328, 163: 2329, 164: 2334, 165: 2332, 166: 2324,
  };
  return {
    page,
    src: "/reading/explanations/cambridge-15-test-3-part" + part + "-exp15-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2263,
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

const storyEndingOptions = [
  { letter: "A", text: "May be provided through methods used in biological research." },
  { letter: "B", text: "Are the reason for their survival." },
  { letter: "C", text: "Show considerable global variation." },
  { letter: "D", text: "Contain animals which transform to become humans." },
  { letter: "E", text: "Were originally spoken rather than written." },
  { letter: "F", text: "Have been developed without factual basis." },
];

const storyWordOptions = [
  { letter: "A", text: "ending" }, { letter: "B", text: "events" },
  { letter: "C", text: "warning" }, { letter: "D", text: "links" },
  { letter: "E", text: "records" }, { letter: "F", text: "variations" },
  { letter: "G", text: "horror" }, { letter: "H", text: "people" }, { letter: "I", text: "plot" },
];

const yesNoOptions = [
  { letter: "YES", text: "The statement agrees with the claims of the writer." },
  { letter: "NO", text: "The statement contradicts the claims of the writer." },
  { letter: "NOT GIVEN", text: "It is impossible to say what the writer thinks about this." },
];

const henryMoore: ReadingPart = {
  id: "cambridge-15-test-3-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Henry Moore (1898–1986)",
  subtitle: "The British sculptor Henry Moore was a leading figure in the 20th-century art world",
  sections: [{
    id: "cambridge-15-test-3-part1-passage",
    format: "pre",
    paragraphs: [
      "Henry Moore was born in Castleford, a small town near Leeds in the north of England. He was the seventh child of Raymond Moore and his wife Mary Baker. He studied at Castleford Grammar School from 1909 to 1915, where his early interest in art was encouraged by his teacher Alice Gostick. After leaving school, Moore hoped to become a sculptor, but instead he complied with his father’s wish that he train as a schoolteacher. He had to abandon his training in 1917 when he was sent to France to fight in the First World War.",
      "After the war, Moore enrolled at the Leeds School of Art, where he studied for two years. In his first year, he spent most of his time drawing. Although he wanted to study sculpture, no teacher was appointed until his second year. At the end of that year, he passed the sculpture examination and was awarded a scholarship to the Royal College of Art in London. In September 1921, he moved to London and began three years of advanced study in sculpture.",
      "Alongside the instruction he received at the Royal College, Moore visited many of the London museums, particularly the British Museum, which had a wide-ranging collection of ancient sculpture. During these visits, he discovered the power and beauty of ancient Egyptian and African sculpture. As he became increasingly interested in these ‘primitive’ forms of art, he turned away from European sculptural traditions.",
      "After graduating, Moore spent the first six months of 1925 travelling in France. When he visited the Trocadero Museum in Paris, he was impressed by a cast of a Mayan sculpture of the rain spirit. It was a male reclining figure with its knees drawn up together, and its head at a right angle to its body. Moore became fascinated with this stone sculpture, which he thought had a power and originality that no other stone sculpture possessed. He himself started carving a variety of subjects in stone, including depictions of reclining women, mother-and-child groups, and masks.",
      "Moore’s exceptional talent soon gained recognition, and in 1926 he started work as a sculpture instructor at the Royal College. In 1933, he became a member of a group of young artists called Unit One. The aim of the group was to convince the English public of the merits of the emerging international movement in modern art and architecture.",
      "Around this time, Moore moved away from the human figure to experiment with abstract shapes. In 1931, he held an exhibition at the Leicester Galleries in London. His work was enthusiastically welcomed by fellow sculptors, but the reviews in the press were extremely negative and turned Moore into a notorious figure. There were calls for his resignation from the Royal College, and the following year, when his contract expired, he left to start a sculpture department at the Chelsea School of Art in London.",
      "Throughout the 1930s, Moore did not show any inclination to please the British public. He became interested in the paintings of the Spanish artist Pablo Picasso, whose work inspired him to distort the human body in a radical way. At times, he seemed to abandon the human figure altogether. The pages of his sketchbooks from this period show his ideas for abstract sculptures that bore little resemblance to the human form.",
      "In 1940, during the Second World War, Moore stopped teaching at the Chelsea School and moved to a farmhouse about 20 miles north of London. A shortage of materials forced him to focus on drawing. He did numerous small sketches of Londoners, later turning these ideas into large coloured drawings in his studio. In 1942, he returned to Castleford to make a series of sketches of the miners who worked there.",
      "In 1944, Harlow, a town near London, offered Moore a commission for a sculpture depicting a family. The resulting work signifies a dramatic change in Moore’s style, away from the experimentation of the 1930s towards a more natural and humanistic subject matter. He did dozens of studies in clay for the sculpture, and these were cast in bronze and issued in editions of seven to nine copies each. In this way, Moore’s work became available to collectors all over the world. The boost to his income enabled him to take on ambitious projects and start working on the scale he felt his sculpture demanded.",
      "Critics who had begun to think that Moore had become less revolutionary were proven wrong by the appearance, in 1950, of the first of Moore’s series of standing figures in bronze, with their harsh and angular pierced forms and distinct impression of menace. Moore also varied his subject matter in the 1950s with such works as Warrior with Shield and Falling Warrior. These were rare examples of Moore’s use of the male figure and owe something to his visit to Greece in 1951, when he had the opportunity to study ancient works of art.",
      "In his final years, Moore created the Henry Moore Foundation to promote art appreciation and to display his work. Moore was the first modern English sculptor to achieve international critical acclaim and he is still regarded as one of the most important sculptors of the 20th century.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-15-test-3-part1-questions-1-7",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 1–7 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [1], prompt: "On leaving school, Moore did what his father wanted him to do.", options: judgmentOptions },
        { questionNumbers: [2], prompt: "Moore began studying sculpture in his first term at the Leeds School of Art.", options: judgmentOptions },
        { questionNumbers: [3], prompt: "When Moore started at the Royal College of Art, its reputation for teaching sculpture was excellent.", options: judgmentOptions },
        { questionNumbers: [4], prompt: "Moore became aware of ancient sculpture as a result of visiting London museums.", options: judgmentOptions },
        { questionNumbers: [5], prompt: "The Trocadero Museum’s Mayan sculpture attracted a lot of public interest.", options: judgmentOptions },
        { questionNumbers: [6], prompt: "Moore thought the Mayan sculpture was similar in certain respects to other stone sculptures.", options: judgmentOptions },
        { questionNumbers: [7], prompt: "The artists who belonged to Unit One wanted to make modern art and architecture more popular.", options: judgmentOptions },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-15-test-3-part1-questions-8-13",
        "Moore’s career as an artist",
        "Questions 8–13\nComplete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 8–13 on your answer sheet.\n\nMoore’s career as an artist\n\n1930s\n• Moore’s exhibition at the Leicester Galleries is criticised by the press\n• Moore is urged to offer his 8 ______ and leave the Royal College\n\n1940s\n• Moore turns to drawing because 9 ______ for sculpting are not readily available\n• While visiting his hometown, Moore does some drawings of 10 ______\n• Moore’s commission for a sculpture depicting a 11 ______ results in a more natural style\n• Moore’s work is issued in editions and becomes available to 12 ______ around the world\n• Moore’s increased 13 ______ enables him to take on more ambitious sculptures\n\n1950s\n• Moore’s series of bronze figures marks a further change in his style",
        8,
        13,
      ),
    },
  ],
  source: {
    passagePages: [60, 61].map(sourcePage),
    questionPages: [62, 63].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [144, 145, 146, 147, 148].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集15精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const desolenator: ReadingPart = {
  id: "cambridge-15-test-3-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "The Desolenator: producing clean water",
  sections: [
    {
      id: "cambridge-15-test-3-part2-section-a",
      heading: "A",
      format: "pre",
      paragraphs: [
        "Travelling around Thailand in the 1990s, William Janssen was impressed with the basic rooftop solar heating systems that were on many homes, where energy from the sun was absorbed by a plate and then used to heat water for domestic use. Two decades later Janssen developed that basic idea he saw in Southeast Asia into a portable device that uses the power from the sun to purify water.",
      ],
    },
    {
      id: "cambridge-15-test-3-part2-section-b",
      heading: "B",
      format: "pre",
      paragraphs: [
        "The Desolenator operates as a mobile desalination unit that can take water from different places, such as the sea, rivers, boreholes and rain, and purify it for human consumption. It is particularly valuable in regions where natural groundwater reserves have been polluted, or where seawater is the only water source available.",
        "Janssen saw that there was a need for a sustainable way to clean water in both the developing and the developed countries when he moved to the United Arab Emirates and saw large-scale water processing. ‘I was confronted with the enormous carbon footprint that the Gulf nations have because of all of the desalination that they do,’ he says.",
      ],
    },
    {
      id: "cambridge-15-test-3-part2-section-c",
      heading: "C",
      format: "pre",
      paragraphs: [
        "The Desolenator can produce 15 litres of drinking water per day, enough to sustain a family for cooking and drinking. Its main selling point is that unlike standard desalination techniques, it doesn’t require a generated power supply: just sunlight. It measures 120 cm by 90 cm, and is easy to transport, thanks to its two wheels. Water enters through a pipe, and flows as a thin film between a sheet of double glazing and the surface of a solar panel, where it is heated by the sun. The warm water flows into a small boiler (heated by a solar-powered battery) where it is converted to steam. When the steam cools, it becomes distilled water. The device has a very simple filter to trap particles, and this can easily be shaken to remove them. There are two tubes for liquid coming out: one for the waste — salt from seawater, fluoride, etc. — and another for the distilled water. The performance of the unit is shown on an LCD screen and transmitted to the company which provides servicing when necessary.",
      ],
    },
    {
      id: "cambridge-15-test-3-part2-section-d",
      heading: "D",
      format: "pre",
      paragraphs: [
        "A recent analysis found that at least two-thirds of the world’s population lives with severe water scarcity for at least a month every year. Janssen says that by 2030 half of the world’s population will be living with water stress — where the demand exceeds the supply over a certain period of time. ‘It is really important that a sustainable solution is brought to the market that is able to help these people,’ he says. Many countries ‘don’t have the money for desalination plants, which are very expensive to build. They don’t have the money to operate them, they are very maintenance intensive, and they don’t have the money to buy the diesel to run the desalination plants, so it is a really bad situation.’",
      ],
    },
    {
      id: "cambridge-15-test-3-part2-section-e",
      heading: "E",
      format: "pre",
      paragraphs: [
        "The device is aimed at a wide variety of users — from homeowners in the developing world who do not have a constant supply of water to people living off the grid in rural parts of the US. The first commercial versions of the Desolenator are expected to be in operation in India early next year, after field tests are carried out. The market for the self-sufficient devices in developing countries is twofold — those who cannot afford the money for the device outright and pay through microfinance, and middle-income homes that can lease their own equipment. ‘People in India don’t pay for a fridge outright; they pay for it over six months. They would put the Desolenator on their roof and hook it up to their municipal supply and they would get very reliable drinking water on a daily basis,’ Janssen says. In the developed world, it is aimed at niche markets where tap water is unavailable — for camping, on boats, or for the military, for instance.",
      ],
    },
    {
      id: "cambridge-15-test-3-part2-section-f",
      heading: "F",
      format: "pre",
      paragraphs: [
        "Prices will vary according to where it is bought. In the developing world, the price will depend on what deal aid organisations can negotiate. In developed countries, it is likely to come in at $1,000 (£685) a unit, said Janssen. ‘We are a venture with a social mission. We are aware that the product we have envisioned is mainly finding application in the developing world and humanitarian sector and that this is the way we will proceed. We do realise, though, that to be a viable company there is a bottom line to keep in mind,’ he says.",
      ],
    },
    {
      id: "cambridge-15-test-3-part2-section-g",
      heading: "G",
      format: "pre",
      paragraphs: [
        "The company itself is based at Imperial College London, although Janssen, its chief executive, still lives in the UAE. It has raised £340,000 in funding so far. Within two years, he says, the company aims to be selling 1,000 units a month, mainly in the humanitarian field. They are expected to be sold in areas such as Australia, northern Chile, Peru, Texas and California.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-15-test-3-part2-headings-14-20",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 2 has seven sections, A–G. Choose the correct heading for each section from the list of headings below. Write the correct number, i–x, in boxes 14–20 on your answer sheet.",
      questionNumbers: [14, 15, 16, 17, 18, 19, 20],
      options: [
        { id: "i", text: "Getting the finance for production" },
        { id: "ii", text: "An unexpected benefit" },
        { id: "iii", text: "From initial inspiration to new product" },
        { id: "iv", text: "The range of potential customers for the device" },
        { id: "v", text: "What makes the device different from alternatives" },
        { id: "vi", text: "Cleaning water from a range of sources" },
        { id: "vii", text: "Overcoming production difficulties" },
        { id: "viii", text: "Profit not the primary goal" },
        { id: "ix", text: "A warm welcome for the device" },
        { id: "x", text: "The number of people affected by water shortages" },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-15-test-3-part2-questions-21-26",
        "How the Desolenator works",
        "Questions 21–26\nComplete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 21–26 on your answer sheet.\n\nHow the Desolenator works\n\nThe energy required to operate the Desolenator comes from sunlight. The device can be used in different locations, as it has 21 ______. Water is fed into a pipe, and a 22 ______ of water flows over a solar panel. The water then enters a boiler, where it turns into steam. Any particles in the water are caught in a 23 ______. The purified water comes out through one tube, and all types of 24 ______ come out through another. A screen displays the 25 ______ of the device, and transmits the information to the company so that they know when the Desolenator requires 26 ______.",
        21,
        26,
      ),
    },
  ],
  source: {
    passagePages: [65, 66].map(sourcePage),
    questionPages: [64, 67].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [152, 153, 154, 155, 156].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集15精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const fairyTales: ReadingPart = {
  id: "cambridge-15-test-3-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Why fairy tales are really scary tales",
  subtitle: "Some people think that fairy tales are just stories to amuse children, but their universal and enduring appeal may be due to more serious reasons",
  sections: [{
    id: "cambridge-15-test-3-part3-passage",
    format: "pre",
    paragraphs: [
      "People of every culture tell each other fairy tales but the same story often takes a variety of forms in different parts of the world. In the story of Little Red Riding Hood that European children are familiar with, a young girl on the way to see her grandmother meets a wolf and tells him where she is going. The wolf runs on ahead and disposes of the grandmother, then gets into bed dressed in the grandmother’s clothes to wait for Little Red Riding Hood. You may think you know the story — but which version? In some versions, the wolf swallows up the grandmother, while in others it locks her in a cupboard. In some stories Red Riding Hood gets the better of the wolf on her own, while in others a hunter or a woodcutter hears her cries and comes to her rescue.",
      "The universal appeal of these tales is frequently attributed to the idea that they contain cautionary messages: in the case of Little Red Riding Hood, to listen to your mother, and avoid talking to strangers. ‘It might be what we find interesting about this story is that it’s got this survival-relevant information in it,’ says anthropologist Jamie Tehrani at Durham University in the UK. But his research suggests otherwise. ‘We have this huge gap in our knowledge about the history and prehistory of storytelling, despite the fact that we know this genre is an incredibly ancient one,’ he says. That hasn’t stopped anthropologists, folklorists and other academics devising theories to explain the importance of fairy tales in human society. Now Tehrani has found a way to test these ideas, borrowing a technique from evolutionary biologists.",
      "To work out the evolutionary history, development and relationships among groups of organisms, biologists compare the characteristics of living species in a process called ‘phylogenetic analysis’. Tehrani has used the same approach to compare related versions of fairy tales to discover how they have evolved and which elements have survived longest.",
      "Tehrani’s analysis focused on Little Red Riding Hood in its many forms, which include another Western fairy tale known as The Wolf and the Kids. Checking for variants of these two tales and similar stories from Africa, East Asia and other regions, he ended up with 58 stories recorded from oral traditions. Once his phylogenetic analysis had established that they were indeed related, he used the same methods to explore how they have developed and altered over time.",
      "First he tested some assumptions about which aspects of the story alter least as it evolves, indicating their importance. Folklorists believe that what happens in a story is more central to the story than the characters in it — that visiting a relative, only to be met by a scary animal in disguise, is more fundamental than whether the visitor is a little girl or three siblings, or the animal is a tiger instead of a wolf.",
      "However, Tehrani found no significant difference in the rate of evolution of incidents compared with that of characters. ‘Certain episodes are very stable because they are crucial to the story, but there are lots of other details that can evolve quite freely,’ he says. Neither did his analysis support the theory that the central section of a story is the most conserved part. He found no significant difference in the flexibility of events there compared with the beginning or the end.",
      "But the really big surprise came when he looked at the cautionary elements of the story. ‘Studies on hunter-gatherer folk tales suggest that these narratives include really important information about the environment and the possible dangers that may be faced there — stuff that’s relevant to survival,’ he says. Yet in his analysis such elements were just as flexible as seemingly trivial details. What, then, is important enough to be reproduced from generation to generation?",
      "The answer, it would appear, is fear — blood-thirsty and gruesome aspects of the story, such as the eating of the grandmother by the wolf, turned out to be the best preserved of all. Why are these details retained by generations of storytellers, when other features are not? Tehrani has an idea: ‘In an oral context, a story won’t survive because of one great teller. It also needs to be interesting when it’s told by someone who’s not necessarily a great storyteller.’ Maybe being swallowed whole by a wolf, then cut out of its stomach alive is so gripping that it helps the story remain popular, no matter how badly it’s told.",
      "Jack Zipes at the University of Minnesota, Minneapolis, is unconvinced by Tehrani’s views on fairy tales. ‘Even if they’re gruesome, they won’t stick unless they matter,’ he says. He believes the perennial theme of women as victims in stories like Little Red Riding Hood explains why they continue to feel relevant. But Tehrani points out that although this is often the case in Western versions, it is not always true elsewhere. In Chinese and Japanese versions, often known as The Tiger Grandmother, the villain is a woman, and in both Iran and Nigeria, the victim is a boy.",
      "Mathias Clasen at Aarhus University in Denmark isn’t surprised by Tehrani’s findings. ‘Habits and morals change, but the things that scare us, and the fact that we seek out entertainment that’s designed to scare us — those are constant,’ he says. Clasen believes that scary stories teach us what it feels like to be afraid without having to experience real danger, and so build up resistance to negative emotions.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-15-test-3-part3-questions-27-31",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete each sentence with the correct ending, A–F. Write the correct letter, A–F, in boxes 27–31 on your answer sheet.",
      questions: [
        { questionNumbers: [27], prompt: "In fairy tales, details of the plot", options: storyEndingOptions },
        { questionNumbers: [28], prompt: "Tehrani rejects the idea that the useful lessons for life in fairy tales", options: storyEndingOptions },
        { questionNumbers: [29], prompt: "Various theories about the social significance of fairy tales", options: storyEndingOptions },
        { questionNumbers: [30], prompt: "Insights into the development of fairy tales", options: storyEndingOptions },
        { questionNumbers: [31], prompt: "All the fairy tales analysed by Tehrani", options: storyEndingOptions },
      ],
    },
    {
      id: "cambridge-15-test-3-part3-questions-32-36",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary using the list of words, A–I, below. Write the correct letter, A–I, in boxes 32–36 on your answer sheet.",
      questions: [
        { questionNumbers: [32], prompt: "Tehrani used techniques from evolutionary biology to find out if 32 ______ existed among 58 stories from around the world.", options: storyWordOptions },
        { questionNumbers: [33], prompt: "He also wanted to know which aspects of the stories had fewest 33 ______, as he believed these would be the most important.", options: storyWordOptions },
        { questionNumbers: [34], prompt: "Contrary to other beliefs, he found that some 34 ______ included in a story tended to change over time.", options: storyWordOptions },
        { questionNumbers: [35], prompt: "He was also surprised that parts of a story which seemed to provide some sort of 35 ______ were unimportant.", options: storyWordOptions },
        { questionNumbers: [36], prompt: "The aspect he found most important in a story’s survival was 36 ______.", options: storyWordOptions },
      ],
    },
    {
      id: "cambridge-15-test-3-part3-questions-37-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 37–40 on your answer sheet.",
      questions: [
        { questionNumbers: [37], prompt: "What method did Jamie Tehrani use to test his ideas about fairy tales?", options: [
          { letter: "A", text: "He compared oral and written forms of the same stories." },
          { letter: "B", text: "He looked at many different forms of the same basic story." },
          { letter: "C", text: "He looked at unrelated stories from many different countries." },
          { letter: "D", text: "He contrasted the development of fairy tales with that of living creatures." },
        ] },
        { questionNumbers: [38], prompt: "When discussing Tehrani’s views, Jack Zipes suggests that", options: [
          { letter: "A", text: "Tehrani ignores key changes in the role of women." },
          { letter: "B", text: "Stories which are too horrific are not always taken seriously." },
          { letter: "C", text: "Tehrani overemphasises the importance of violence in stories." },
          { letter: "D", text: "Features of stories only survive if they have a deeper significance." },
        ] },
        { questionNumbers: [39], prompt: "Why does Tehrani refer to Chinese and Japanese fairy tales?", options: [
          { letter: "A", text: "To indicate that Jack Zipes’ theory is incorrect." },
          { letter: "B", text: "To suggest that crime is a global problem." },
          { letter: "C", text: "To imply that all fairy tales have a similar meaning." },
          { letter: "D", text: "To add more evidence for Jack Zipes’ ideas." },
        ] },
        { questionNumbers: [40], prompt: "What does Mathias Clasen believe about fairy tales?", options: [
          { letter: "A", text: "They are a safe way of learning to deal with fear." },
          { letter: "B", text: "They are a type of entertainment that some people avoid." },
          { letter: "C", text: "They reflect the changing values of our society." },
          { letter: "D", text: "They reduce our ability to deal with real-world problems." },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [68, 69].map(sourcePage),
    questionPages: [70, 71, 72].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [160, 161, 162, 163, 164, 165, 166].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集15精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE15_TEST3_PARTS: ReadingPart[] = [henryMoore, desolenator, fairyTales];

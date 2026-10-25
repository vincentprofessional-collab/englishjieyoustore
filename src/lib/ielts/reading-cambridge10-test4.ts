import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  80: [1718, 2421], 81: [1673, 2380], 82: [1689, 2514], 83: [1682, 2489],
  84: [1641, 2423], 85: [1656, 2411], 86: [1649, 2404], 87: [1655, 2456],
  88: [1583, 2472], 89: [1672, 2351], 90: [1681, 2451], 91: [1613, 2380],
  92: [1687, 2554], 150: [1618, 1182],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci10-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  return {
    page,
    src: "/reading/explanations/cambridge-10-test-4-part" + part + "-exp102-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: ({ 31: 593, 39: 613, 50: 1684 } as Record<number, number>)[page] ?? 2265,
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

const wildfires = [
  "Wildfires are becoming an increasing menace in the western United States, with Southern California being the hardest hit area. There's a reason fire squads battling more frequent blazes in Southern California are having such difficulty containing the flames, despite better preparedness than ever and decades of experience fighting fires fanned by the ‘Santa Ana Winds’. The wildfires themselves, experts say, are generally hotter, faster, and spread more erratically than in the past.",
  "Megafires, also called ‘siege fires’, are the increasingly frequent blazes that burn 500,000 acres or more — 10 times the size of the average forest fire of 20 years ago. Some recent wildfires are among the biggest ever in California in terms of acreage burned, according to state figures and news reports.",
  "One explanation for the trend to more superhot fires is that the region, which usually has dry summers, has had significantly below normal precipitation in many recent years. Another reason, experts say, is related to the century-long policy of the US Forest Service to stop wildfires as quickly as possible. The unintentional consequence has been to halt the natural eradication of underbrush, now the primary fuel for megafires.",
  "Three other factors contribute to the trend, they add. First is climate change, marked by a 1-degree Fahrenheit rise in average yearly temperature across the western states. Second is fire seasons that on average are 78 days longer than they were 20 years ago. Third is increased construction of homes in wooded areas.",
  "‘We are increasingly building our homes in fire-prone ecosystems,’ says Dominik Kulakowski, adjunct professor of biology at Clark University Graduate School of Geography in Worcester, Massachusetts. ‘Doing that in many of the forests of the western US is like building homes on the side of an active volcano.’",
  "In California, where population growth has averaged more than 600,000 a year for at least a decade, more residential housing is being built. ‘What once was open space is now residential homes providing fuel to make fires burn with greater intensity,’ says Terry McHale of the California Department of Forestry firefighters’ union. ‘With so much dryness, so many communities to catch fire, so many fronts to fight, it becomes an almost incredible job.’",
  "That said, many experts give California high marks for making progress on preparedness in recent years, after some of the largest fires in state history scorched thousands of acres, burned thousands of homes, and killed numerous people. Stung in the past by criticism of bungling that allowed fires to spread when they might have been contained, personnel are meeting the peculiar challenges of neighborhood- and canyon-hopping fires better than previously, observers say.",
  "State promises to provide more up-to-date engines, planes, and helicopters to fight fires have been fulfilled. Firefighters’ unions that in the past complained of dilapidated equipment, old fire engines, and insufficient blueprints for fire safety are now praising the state’s commitment, noting that funding for firefighting has increased, despite huge cuts in many other programs. ‘We are pleased that the current state administration has been very proactive in its support of us, and [has] come through with budgetary support of the infrastructure needs we have long sought,’ says Mr. McHale of the firefighters’ union.",
  "Besides providing money to upgrade the fire engines that must traverse the mammoth state and wind along serpentine canyon roads, the state has invested in better command-and-control facilities as well as in the strategies to run them. ‘In the fire sieges of earlier years, we found that other jurisdictions and states were willing to offer mutual-aid help, but we were not able to communicate adequately with them,’ says Kim Zagaris, chief of the state’s Office of Emergency Services Fire and Rescue Branch. After a commission examined and revamped communications procedures, the statewide response ‘has become far more professional and responsive,’ he says. There is a sense among both government officials and residents that the speed, dedication, and coordination of firefighters from several states and jurisdictions are resulting in greater efficiency than in past ‘siege fire’ situations.",
  "In recent years, the Southern California region has improved building codes, evacuation procedures, and procurement of new technology. ‘I am extraordinarily impressed by the improvements we have witnessed,’ says Randy Jacobs, a Southern California-based lawyer who has had to evacuate both his home and business to escape wildfires. ‘Notwithstanding all the damage that will continue to be caused by wildfires, we will no longer suffer the loss of life endured in the past because of the fire prevention and firefighting measures that have been put in place,’ he says.",
];

const wildfiresPart: ReadingPart = {
  id: "cambridge-10-test-4-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "The megafires of California",
  subtitle: "Drought, housing expansion, and oversupply of tinder make for bigger, hotter fires in the western United States",
  sections: [{ id: "cambridge-10-test-4-part1-passage", format: "pre", paragraphs: wildfires }],
  questionBlocks: [
    rawFillBlock(
      "cambridge-10-test-4-part1-questions-1-6",
      "Questions 1–6",
      "Questions 1–6\nComplete the notes below.\n\nChoose ONE WORD AND/OR A NUMBER from the passage for each answer.\n\nWrite your answers in boxes 1–6 on your answer sheet.\n\nWildfires\n\nCharacteristics of wildfires and wildfire conditions today compared to the past:\n— occurrence: more frequent\n— temperature: hotter\n— speed: faster\n— movement: 1 ................ more unpredictably\n— size of fires: 2 ................ greater on average than two decades ago\n\nReasons wildfires cause more damage today compared to the past:\n— rainfall: 3 ................ average\n— more brush to act as 4 ................\n— increase in yearly temperature\n— extended fire 5 ................\n— more building of 6 ................ in vulnerable places",
      1,
      6,
    ),
    rawFillBlock(
      "cambridge-10-test-4-part1-questions-7-13",
      "Questions 7–13",
      "Questions 7–13\nDo the following statements agree with the information given in Reading Passage 1?\n\nIn boxes 7–13 on your answer sheet, write\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN if there is no information on this\n\n7 The amount of open space in California has diminished over the last ten years.\n8 Many experts believe California has made little progress in readying itself to fight fires.\n9 Personnel in the past have been criticised for mishandling fire containment.\n10 California has replaced a range of firefighting tools.\n11 More firefighters have been hired to improve fire-fighting capacity.\n12 Citizens and government groups disapprove of the efforts of different states and agencies working together.\n13 Randy Jacobs believes that loss of life from fires will continue at the same levels, despite changes made.",
      7,
      13,
    ),
  ],
  source: {
    passagePages: [sourcePage(80), sourcePage(81)],
    questionPages: [sourcePage(82), sourcePage(83)],
    answerPages: [sourcePage(150)],
    explanationPages: [31, 32, 33, 34].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集10精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const secondNatureSections = [
  {
    id: "cambridge-10-test-4-part2-paragraph-a",
    heading: "A",
    format: "pre" as const,
    paragraphs: [
      "Psychologists have long held that a person’s character cannot undergo a transformation in any meaningful way and that the key traits of personality are determined at a very young age. However, researchers have begun looking more closely at ways we can change. Positive psychologists have identified 24 qualities we admire, such as loyalty and kindness, and are studying them to find out why they come so naturally to some people. What they’re discovering is that many of these qualities amount to habitual behaviour that determines the way we respond to the world. The good news is that all this can be learned.",
      "Some qualities are less challenging to develop than others, optimism being one of them. However, developing qualities requires mastering a range of skills which are diverse and sometimes surprising. For example, to bring more joy and passion into your life, you must be open to experiencing negative emotions. Cultivating such qualities will help you realise your full potential.",
    ],
  },
  {
    id: "cambridge-10-test-4-part2-paragraph-b",
    heading: "B",
    format: "pre" as const,
    paragraphs: ["‘The evidence is good that most personality traits can be altered,’ says Christopher Peterson, professor of psychology at the University of Michigan, who cites himself as an example. Inherently introverted, he realised early on that as an academic, his reticence would prove disastrous in the lecture hall. So he learned to be more outgoing and to entertain his classes. ‘Now my extroverted behaviour is spontaneous,’ he says."],
  },
  {
    id: "cambridge-10-test-4-part2-paragraph-c",
    heading: "C",
    format: "pre" as const,
    paragraphs: ["David Fajgenbaum had to make a similar transition. He was preparing for university, when he had an accident that put an end to his sports career. On campus, he quickly found that beyond ordinary counselling, the university had no services for students who were undergoing physical rehabilitation and suffering from depression like him. He therefore launched a support group to help others in similar situations. He took action despite his own pain — a typical response of an optimist."],
  },
  {
    id: "cambridge-10-test-4-part2-paragraph-d",
    heading: "D",
    format: "pre" as const,
    paragraphs: ["Suzanne Segerstrom, professor of psychology at the University of Kentucky, believes that the key to increasing optimism is through cultivating optimistic behaviour, rather than positive thinking. She recommends you train yourself to pay attention to good fortune by writing down three positive things that come about each day. This will help you convince yourself that favourable outcomes actually happen all the time, making it easier to begin taking action."],
  },
  {
    id: "cambridge-10-test-4-part2-paragraph-e",
    heading: "E",
    format: "pre" as const,
    paragraphs: ["You can recognise a person who is passionate about a pursuit by the way they are so strongly involved in it. Tanya Streeter’s passion is freediving — the sport of plunging deep into the water without tanks or other breathing equipment. Beginning in 1998, she set nine world records and can hold her breath for six minutes. The physical stamina required for this sport is intense but the psychological demands are even more overwhelming. Streeter learned to untangle her fears from her judgment of what her body and mind could do. ‘In my career as a competitive freediver, there was a limit to what I could do — but it wasn’t anywhere near what I thought it was,’ she says."],
  },
  {
    id: "cambridge-10-test-4-part2-paragraph-f",
    heading: "F",
    format: "pre" as const,
    paragraphs: ["Finding a pursuit that excites you can improve anyone’s life. The secret about consuming passions, though, according to psychologist Paul Silvia of the University of North Carolina, is that ‘they require discipline, hard work and ability, which is why they are so rewarding.’ Psychologist Todd Kashdan has this advice for those people taking up a new passion: ‘As a newcomer, you also have to tolerate and laugh at your own ignorance. You must be willing to accept the negative feelings that come your way,’ he says."],
  },
  {
    id: "cambridge-10-test-4-part2-paragraph-g",
    heading: "G",
    format: "pre" as const,
    paragraphs: [
      "In 2004, physician-scientist Mauro Zappaterra began his PhD research at Harvard Medical School. Unfortunately, he was miserable as his research wasn’t compatible with his curiosity about healing. He finally took a break and during eight months in Santa Fe, Zappaterra learned about alternative healing techniques not taught at Harvard. When he got back, he switched labs to study how cerebrospinal fluid nourishes the developing nervous system. He also vowed to look for the joy in everything, including failure, as this could help him learn about his research and himself.",
      "One thing that can hold joy back is a person’s concentration on avoiding failure rather than their looking forward to doing something well. ‘Focusing on being safe might get in the way of your reaching your goals,’ explains Kashdan. For example, are you hoping to get through a business lunch without embarrassing yourself, or are you thinking about how fascinating the conversation might be?",
    ],
  },
  {
    id: "cambridge-10-test-4-part2-paragraph-h",
    heading: "H",
    format: "pre" as const,
    paragraphs: [
      "Usually, we think of courage in physical terms but ordinary life demands something else. For marketing executive Kenneth Pedeleose, it meant speaking out against something he thought was ethically wrong. The new manager was intimidating staff so Pedeleose carefully recorded each instance of bullying and eventually took the evidence to a senior director, knowing his own job security would be threatened. Eventually the manager was the one to go. According to Cynthia Pury, a psychologist at Clemson University, Pedeleose’s story proves the point that courage is not motivated by fearlessness, but by moral obligation. Pury also believes that people can acquire courage. Many of her students said that faced with a risky situation, they first tried to calm themselves down, then looked for a way to mitigate the danger, just as Pedeleose did by documenting his allegations.",
      "Over the long term, picking up a new character trait may help you move toward being the person you want to be. And in the short term, the effort itself could be surprisingly rewarding, a kind of internal adventure.",
    ],
  },
];

const secondNaturePart: ReadingPart = {
  id: "cambridge-10-test-4-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 below.",
  title: "Second nature",
  subtitle: "Your personality isn’t necessarily set in stone. With a little experimentation, people can reshape their temperaments and inject passion, optimism, joy and courage into their lives",
  sections: secondNatureSections,
  questionBlocks: [
    rawFillBlock(
      "cambridge-10-test-4-part2-questions-14-18",
      "Questions 14–18",
      "Questions 14–18\nComplete the summary below.\n\nChoose NO MORE THAN TWO WORDS from the passage for each answer.\n\nWrite your answers in boxes 14–18 on your answer sheet.\n\nPsychologists have traditionally believed that a personality 14 ................ was impossible and that by a 15 ................, a person’s character tends to be fixed. This is not true according to positive psychologists, who say that our personal qualities can be seen as habitual behaviour. One of the easiest qualities to acquire is 16 ................ . However, regardless of the quality, it is necessary to learn a wide variety of different 17 ................ in order for a new quality to develop; for example, a person must understand and feel some 18 ................ in order to increase their happiness.",
      14,
      18,
    ),
    rawFillBlock(
      "cambridge-10-test-4-part2-questions-19-22",
      "Questions 19–22",
      "Questions 19–22\nLook at the following statements and the list of people below. Match each statement with the correct person, A–G.\n\nWrite the correct letter, A–G, in boxes 19–22 on your answer sheet.\n\n19 People must accept that they do not know much when first trying something new.\n20 It is important for people to actively notice when good things happen.\n21 Courage can be learned once its origins in a sense of responsibility are understood.\n22 It is possible to overcome shyness when faced with the need to speak in public.\n\nList of People\nA Christopher Peterson\nB David Fajgenbaum\nC Suzanne Segerstrom\nD Tanya Streeter\nE Todd Kashdan\nF Kenneth Pedeleose\nG Cynthia Pury",
      19,
      22,
    ),
    rawFillBlock(
      "cambridge-10-test-4-part2-questions-23-26",
      "Questions 23–26",
      "Questions 23–26\nReading Passage 2 has eight sections, A–H. Which section contains the following information?\n\nWrite the correct letter, A–H, in boxes 23–26 on your answer sheet.\n\n23 a mention of how rational thinking enabled someone to achieve physical goals\n24 an account of how someone overcame a sad experience\n25 a description of how someone decided to rethink their academic career path\n26 an example of how someone risked his career out of a sense of duty",
      23,
      26,
    ),
  ],
  source: {
    passagePages: [sourcePage(84), sourcePage(85)],
    questionPages: [sourcePage(86), sourcePage(87), sourcePage(88)],
    answerPages: [sourcePage(150)],
    explanationPages: [39, 40, 41, 42, 43].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集10精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const evolutionaryThrowbacks = [
  "The description of any animal as an ‘evolutionary throwback’ is controversial. For the better part of a century, most biologists have been reluctant to use those words, mindful of a principle of evolution that says ‘evolution cannot run backwards’. But as more and more examples come to light and modern genetics enters the scene, that principle is having to be rewritten. Not only are evolutionary throwbacks possible, they sometimes play an important role in the forward march of evolution.",
  "The technical term for an evolutionary throwback is an ‘atavism’, from the Latin atavus, meaning forefather. The word has ugly connotations thanks largely to Cesare Lombroso, a 19th-century Italian medic who argued that criminals were born not made and could be identified by certain physical features that were throwbacks to a primitive, sub-human state.",
  "While Lombroso was measuring criminals, a Belgian palaeontologist called Louis Dollo was studying fossil records and coming to the opposite conclusion. In 1890 he proposed that evolution was irreversible: that ‘an organism is unable to return, even partially, to a previous stage already realised in the ranks of its ancestors’. Early 20th-century biologists came to a similar conclusion, though they qualified it in terms of probability, stating that there is no reason why evolution cannot run backwards — it is just very unlikely. And so the idea of irreversibility in evolution stuck and came to be known as ‘Dollo’s law’.",
  "If Dollo’s law is right, atavisms should occur only very rarely, if at all. Yet almost since the idea took root, exceptions have been cropping up. In 1919, for example, a humpback whale with a pair of leg-like appendages over a metre long, complete with a full set of limb bones, was caught off Vancouver Island in Canada. Explorer Roy Chapman Andrews argued at the time that the whale must be a throwback to a land-living ancestor. ‘I can see no other explanation,’ he wrote in 1921.",
  "Since then, so many other examples have been discovered that it no longer makes sense to say that evolution is as good as irreversible. And this poses a puzzle: how can characteristics that disappeared millions of years ago suddenly reappear? In 1994, Rudolf Raff and colleagues at Indiana University in the USA decided to use genetics to put a number on the probability of evolution going into reverse. They reasoned that while some evolutionary changes involve the loss of genes and are therefore irreversible, others may be the result of genes being switched off. If these silent genes are somehow switched back on, they argued, long-lost traits could reappear.",
  "Raff’s team went on to calculate the likelihood of it happening. Silent genes accumulate random mutations, they reasoned, eventually rendering them useless. So how long can a gene survive in a species if it is no longer used? The team calculated that there is a good chance of silent genes surviving for up to 6 million years in at least a few individuals in a population, and that some might survive as long as 10 million years. In other words, throwbacks are possible, but only to the relatively recent evolutionary past.",
  "As a possible example, the team pointed to the mole salamanders of Mexico and California. Like most amphibians these begin life in a juvenile ‘tadpole’ state, then metamorphose into the adult form — except for one species, the axolotl, which famously lives its entire life as a juvenile. The simplest explanation for this is that the axolotl lineage alone lost the ability to metamorphose, while others retained it. From a detailed analysis of the salamanders’ family tree, however, it is clear that the other lineages evolved from an ancestor that itself had lost the ability to metamorphose. In other words, metamorphosis in mole salamanders is an atavism. The salamander example fits with Raff’s 10-million-year time frame.",
  "More recently, however, examples have been reported that break the time limit, suggesting that silent genes may not be the whole story. In a paper published last year, biologist Gunter Wagner of Yale University reported some work on the evolutionary history of a group of South American lizards called Bachia. Many of these have minuscule limbs; some look more like snakes than lizards and a few have completely lost the toes on their hind limbs. Other species, however, sport up to four toes on their hind legs. The simplest explanation is that the toed lineages never lost their toes, but Wagner begs to differ. According to his analysis of the Bachia family tree, the toed species re-evolved toes from toeless ancestors and, what is more, digit loss and gain has occurred on more than one occasion over tens of millions of years.",
  "So what’s going on? One possibility is that these traits are lost and then simply reappear, in much the same way that similar structures can independently arise in unrelated species, such as the dorsal fins of sharks and killer whales. Another more intriguing possibility is that the genetic information needed to make toes somehow survived for tens or perhaps hundreds of millions of years in the lizards and was reactivated. These atavistic traits provided an advantage and spread through the population, effectively reversing evolution.",
  "But if silent genes degrade within 6 to 10 million years, how can long-lost traits be reactivated over longer timescales? The answer may lie in the womb. Early embryos of many species develop ancestral features. Snake embryos, for example, sprout hind limb buds. Later in development these features disappear thanks to developmental programs that say ‘lose the leg’. If for any reason this does not happen, the ancestral feature may not disappear, leading to an atavism.",
];

const evolutionaryThrowbacksPart: ReadingPart = {
  id: "cambridge-10-test-4-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "When evolution runs backwards",
  subtitle: "Evolution isn’t supposed to run backwards — yet an increasing number of examples show that it does and that it can sometimes represent the future of a species",
  sections: [{ id: "cambridge-10-test-4-part3-passage", format: "pre", paragraphs: evolutionaryThrowbacks }],
  questionBlocks: [
    rawFillBlock(
      "cambridge-10-test-4-part3-questions-27-31",
      "Questions 27–31",
      "Questions 27–31\nChoose the correct letter, A, B, C or D.\n\nWrite the correct letter in boxes 27–31 on your answer sheet.\n\n27 When discussing the theory developed by Louis Dollo, the writer says that\nA it was immediately referred to as Dollo’s law.\nB it supported the possibility of evolutionary throwbacks.\nC it was modified by biologists in the early twentieth century.\nD it was based on many years of research.\n\n28 The humpback whale caught off Vancouver Island is mentioned because of\nA the exceptional size of its body.\nB the way it exemplifies Dollo’s law.\nC the amount of local controversy it caused.\nD the reason given for its unusual features.\n\n29 What is said about ‘silent genes’?\nA Their numbers vary according to species.\nB Raff disagreed with the use of the term.\nC They could lead to the re-emergence of certain characteristics.\nD They can have an unlimited life span.\n\n30 The writer mentions the mole salamander because\nA it exemplifies what happens in the development of most amphibians.\nB it suggests that Raff’s theory is correct.\nC it has lost and regained more than one ability.\nD its ancestors have become the subject of extensive research.\n\n31 Which of the following does Wagner claim?\nA Members of the Bachia lizard family have lost and regained certain features several times.\nB Evidence shows that the evolution of the Bachia lizard is due to the environment.\nC His research into South American lizards supports Raff’s assertions.\nD His findings will apply to other species of South American lizards.",
      27,
      31,
    ),
    rawFillBlock(
      "cambridge-10-test-4-part3-questions-32-36",
      "Questions 32–36",
      "Questions 32–36\nComplete each sentence with the correct ending, A–G, below.\n\nWrite the correct letter, A–G, in boxes 32–36 on your answer sheet.\n\n32 For a long time biologists rejected\n33 Opposing views on evolutionary throwbacks are represented by\n34 Examples of evolutionary throwbacks have led to\n35 The shark and killer whale are mentioned to exemplify\n36 One explanation for the findings of Wagner’s research is\n\nA the question of how certain long-lost traits could reappear.\nB the occurrence of a particular feature in different species.\nC parallels drawn between behaviour and appearance.\nD the continued existence of certain genetic information.\nE the doubts felt about evolutionary throwbacks.\nF the possibility of evolution being reversible.\nG Dollo’s findings and the convictions held by Lombroso.",
      32,
      36,
    ),
    rawFillBlock(
      "cambridge-10-test-4-part3-questions-37-40",
      "Questions 37–40",
      "Questions 37–40\nDo the following statements agree with the claims of the writer in Reading Passage 3?\n\nIn boxes 37–40 on your answer sheet, write\nYES if the statement agrees with the claims of the writer\nNO if the statement contradicts the claims of the writer\nNOT GIVEN if it is impossible to say what the writer thinks about this\n\n37 Wagner was the first person to do research on South American lizards.\n38 Wagner believes that Bachia lizards with toes had toeless ancestors.\n39 The temporary occurrence of long-lost traits in embryos is rare.\n40 Evolutionary throwbacks might be caused by developmental problems in the womb.",
      37,
      40,
    ),
  ],
  source: {
    passagePages: [sourcePage(89), sourcePage(90)],
    questionPages: [sourcePage(91), sourcePage(92)],
    answerPages: [sourcePage(150)],
    explanationPages: [50, 51, 52, 53].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集10精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE10_TEST4_PARTS: ReadingPart[] = [wildfiresPart, secondNaturePart, evolutionaryThrowbacksPart];

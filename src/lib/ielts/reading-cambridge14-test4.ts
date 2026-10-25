import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  83: [1638, 2330], 84: [1614, 2328], 85: [1640, 2327], 86: [1621, 2325],
  87: [1636, 2331], 88: [1572, 2323], 89: [1637, 2327], 90: [1567, 2324],
  91: [1635, 2330], 92: [1516, 2323], 93: [1635, 2236], 94: [1579, 2325],
  127: [1620, 1398],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci14-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = { 163: 971, 170: 1842, 177: 2019 };
  return {
    page,
    src: "/reading/explanations/cambridge-14-test-4-part" + part + "-exp14-p" + String(page).padStart(3, "0") + ".webp",
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

const secretOfStayingYoung: ReadingPart = {
  id: "cambridge-14-test-4-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "The secret of staying young",
  sections: [{
    id: "cambridge-14-test-4-part1-passage",
    format: "pre",
    paragraphs: [
      "Pheidole dentata, a native ant of the south-eastern U.S., isn’t immortal. But scientists have found that it doesn’t seem to show any signs of aging. Old worker ants can do everything just as well as the youngsters, and their brains appear just as sharp. ‘We get a picture that these ants really don’t decline,’ says Ysabel Giraldo, who studied the ants for her doctoral thesis at Boston University.",
      "Such age-defying feats are rare in the animal kingdom. Naked mole rats can live for almost 30 years and stay fit for nearly their entire lives. They can still reproduce even when old, and they never get cancer. But the vast majority of animals deteriorate with age just like people do. Like the naked mole rat, ants are social creatures that usually live in highly organised colonies. ‘It’s this social complexity that makes P. dentata useful for studying aging in people,’ says Giraldo, now at the California Institute of Technology. Humans are also highly social, a trait that has been connected to healthier aging. By contrast, most animal studies of aging use mice, worms or fruit flies, which all lead much more isolated lives.",
      "In the lab, P. dentata worker ants typically live for around 140 days. Giraldo focused on ants at four age ranges: 20 to 22 days, 45 to 47 days, 95 to 97 days and 120 to 122 days. Unlike all previous studies, which only estimated how old the ants were, her work tracked the ants from the time the pupae became adults, so she knew their exact ages. Then she put them through a range of tests.",
      "Giraldo watched how well the ants took care of the young of the colony, recording how often each ant attended to, carried and fed them. She compared how well 20-day-old and 95-day-old ants followed the telltale scent that the insects usually leave to mark a trail to food. She tested how ants responded to light and also measured how active they were by counting how often ants in a small dish walked across a line. And she experimented with how ants react to live prey: a tethered fruit fly. Giraldo expected the older ants to perform poorly in all these tasks. But the elderly insects were all good caretakers and trail-followers — the 95-day-old ants could track the scent even longer than their younger counterparts. They all responded to light well, and the older ants were more active. And when it came to reacting to prey, the older ants attacked the poor fruit fly just as aggressively as the young ones did, flaring their mandibles or pulling at the fly’s legs.",
      "Then Giraldo compared the brains of 20-day-old and 95-day-old ants, identifying any cells that were close to death. She saw no major differences with age, nor was there any difference in the location of the dying cells, showing that age didn’t seem to affect specific brain functions. Ants and other insects have structures in their brains called mushroom bodies, which are important for processing information, learning and memory. She also wanted to see if aging affects the density of synaptic complexes within these structures — regions where neurons come together. Again, the answer was no. What was more, the old ants didn’t experience any drop in the levels of either serotonin or dopamine — brain chemicals whose decline often coincides with aging. In humans, for example, a decrease in serotonin has been linked to Alzheimer’s disease.",
      "‘This is the first time anyone has looked at both behavioral and neural changes in these ants so thoroughly,’ says Giraldo, who recently published the findings in the Proceedings of the Royal Society B. Scientists have looked at some similar aspects in bees, but the results of recent bee studies were mixed — some studies showed age-related declines, which biologists call senescence, and others didn’t. ‘For now, the study raises more questions than it answers,’ Giraldo says, ‘including how P. dentata stays in such good shape.’",
      "Also, if the ants don’t deteriorate with age, why do they die at all? Out in the wild, the ants probably don’t live for a full 140 days thanks to predators, disease and just being in an environment that’s much harsher than the comforts of the lab. ‘The lucky ants that do live into old age may suffer a steep decline just before dying,’ Giraldo says, but she can’t say for sure because her study wasn’t designed to follow an ant’s final moments.",
      "‘It will be important to extend these findings to other species of social insects,’ says Gene E. Robinson, an entomologist at the University of Illinois at Urbana-Champaign. This ant might be unique, or it might represent a broader pattern among other social bugs with possible clues to the science of aging in larger animals. Either way, it seems that for these ants, age really doesn’t matter.",
    ],
  }],
  questionBlocks: [
    {
      ...rawFillBlock(
        "cambridge-14-test-4-part1-questions-1-8",
        "Ysabel Giraldo’s research",
        "Questions 1–8\nComplete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 1–8 on your answer sheet.\n\nYsabel Giraldo’s research\nFocused on a total of 1 ______ different age groups of ants, analysing\n\nBehaviour:\n• how well ants looked after their 2 ______\n• their ability to locate 3 ______ using a scent trail\n• the effect that 4 ______ had on them\n• how 5 ______ they attacked prey\n\nBrains:\n• comparison between age and the 6 ______ of dying cells in the brains of ants\n• condition of synaptic complexes (areas in which 7 ______ meet) in the brain’s ‘mushroom bodies’\n• level of two 8 ______ in the brain associated with ageing",
        1,
        8,
      ),
    },
    {
      id: "cambridge-14-test-4-part1-questions-9-13",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 9–13 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [9], prompt: "Pheidole dentata ants are the only known animals which remain active for almost their whole lives.", options: judgmentOptions },
        { questionNumbers: [10], prompt: "Ysabel Giraldo was the first person to study Pheidole dentata ants using precise data about the insects’ ages.", options: judgmentOptions },
        { questionNumbers: [11], prompt: "The ants in Giraldo’s experiments behaved as she had predicted that they would.", options: judgmentOptions },
        { questionNumbers: [12], prompt: "The recent studies of bees used different methods of measuring age-related decline.", options: judgmentOptions },
        { questionNumbers: [13], prompt: "Pheidole dentata ants kept in laboratory conditions tend to live longer lives.", options: judgmentOptions },
      ],
    },
  ],
  source: {
    passagePages: [83, 84, 85, 86].map(sourcePage),
    questionPages: [85, 86].map(sourcePage),
    answerPages: [sourcePage(127)],
    explanationPages: [163, 164, 165, 166].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集14精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const zooSections = [
  {
    id: "cambridge-14-test-4-part2-section-a",
    heading: "A",
    format: "pre" as const,
    paragraphs: ["In my view, it is perfectly possible for many species of animals living in zoos or wildlife parks to have a quality of life as high as, or higher than, in the wild. Animals in good zoos get a varied and high-quality diet with all the supplements required, and any illnesses they might have will be treated. Their movement might be somewhat restricted, but they have a safe environment in which to live, and they are spared bullying and social ostracism by others of their kind. They do not suffer from the threat or stress of predators, or the irritation and pain of parasites or injuries. The average captive animal will have a greater life expectancy compared with its wild counterpart, and will not die of drought, of starvation or in the jaws of a predator. A lot of very nasty things happen to truly ‘wild’ animals that simply don’t happen in good zoos, and to view a life that is ‘free’ as one that is automatically ‘good’ is, I think, an error. Furthermore, zoos serve several key purposes."],
  },
  {
    id: "cambridge-14-test-4-part2-section-b",
    heading: "B",
    format: "pre" as const,
    paragraphs: ["Firstly, zoos aid conservation. Colossal numbers of species are becoming extinct across the world, and many more are increasingly threatened and therefore risk extinction. Moreover, some of these collapses have been sudden, dramatic and unexpected, or were simply discovered very late in the day. A species protected in captivity can be bred up to provide a reservoir population against a population crash or extinction in the wild. A good number of species only exist in captivity, with many of these living in zoos. Still more only exist in the wild because they have been reintroduced from zoos, or have wild populations that have been boosted by captive-bred animals. Without these efforts there would be fewer species alive today. Although reintroduction successes are few and far between, the numbers are increasing, and the very fact that species have been saved or reintroduced as a result of captive breeding proves the value of such initiatives."],
  },
  {
    id: "cambridge-14-test-4-part2-section-c",
    heading: "C",
    format: "pre" as const,
    paragraphs: ["Zoos also provide education. Many children and adults, especially those in cities, will never see a wild animal beyond a fox or pigeon. While it is true that television documentaries are becoming ever more detailed and impressive, and many natural history specimens are on display in museums, there really is nothing to compare with seeing a living creature in the flesh, hearing it, smelling it, watching what it does and having the time to absorb details. That alone will bring a greater understanding and perspective to many, and hopefully give them a greater appreciation for wildlife, conservation efforts and how they can contribute."],
  },
  {
    id: "cambridge-14-test-4-part2-section-d",
    heading: "D",
    format: "pre" as const,
    paragraphs: ["In addition to this, there is also the education that can take place in zoos through signs, talks and presentations which directly communicate information to visitors about the animals they are seeing and their place in the world. This was an area where zoos used to be lacking, but they are now increasingly sophisticated in their communication and outreach work. Many zoos also work directly to educate conservation workers in other countries, or send their animal keepers abroad to contribute their knowledge and skills to those working in zoos and reserves, thereby helping to improve conditions and reintroductions all over the world."],
  },
  {
    id: "cambridge-14-test-4-part2-section-e",
    heading: "E",
    format: "pre" as const,
    paragraphs: ["Zoos also play a key role in research. If we are to save wild species and restore and repair ecosystems we need to know about how key species live, act and react. Being able to undertake research on animals in zoos where there is less risk and fewer variables means real changes can be effected on wild populations. Finding out about, for example, the oestrus cycle of an animal or its breeding rate helps us manage wild populations. Procedures such as capturing and moving at-risk or dangerous individuals are bolstered by knowledge gained in zoos about doses for anaesthetics, and by experience in handling and transporting animals. This can make a real difference to conservation efforts and to the reduction of human-animal conflicts, and can provide a knowledge base for helping with the increasing threats of habitat destruction and other problems."],
  },
  {
    id: "cambridge-14-test-4-part2-section-f",
    heading: "F",
    format: "pre" as const,
    paragraphs: ["In conclusion, considering the many ongoing global threats to the environment, it is hard for me to see zoos as anything other than essential to the long-term survival of numerous species. They are vital not just in terms of protecting animals, but as a means of learning about them to aid those still in the wild, as well as educating and informing the general population about these animals and their world so that they can assist or at least accept the need to be more environmentally conscious. Without them, the world would be, and would increasingly become, a much poorer place."],
  },
];

const zoos: ReadingPart = {
  id: "cambridge-14-test-4-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Why zoos are good",
  subtitle: "Scientist David Hone makes the case for zoos",
  sections: zooSections,
  questionBlocks: [
    {
      id: "cambridge-14-test-4-part2-questions-14-17",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has six paragraphs, A–F. Which paragraph contains the following information? Write the correct letter, A–F, in boxes 14–17 on your answer sheet.",
      questions: [
        { questionNumbers: [14], prompt: "A reference to how quickly animal species can die out", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [15], prompt: "Reasons why it is preferable to study animals in captivity rather than in the wild", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [16], prompt: "Mention of two ways of learning about animals other than visiting them in zoos", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [17], prompt: "Reasons why animals in zoos may be healthier than those in the wild", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
      ],
    },
    {
      id: "cambridge-14-test-4-part2-questions-18-22",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 2? In boxes 18–22 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [18], prompt: "An animal is likely to live longer in a zoo than in the wild.", options: judgmentOptions },
        { questionNumbers: [19], prompt: "There are some species in zoos which can no longer be found in the wild.", options: judgmentOptions },
        { questionNumbers: [20], prompt: "Improvements in the quality of TV wildlife documentaries have resulted in increased numbers of zoo visitors.", options: judgmentOptions },
        { questionNumbers: [21], prompt: "Zoos have always excelled at transmitting information about animals to the public.", options: judgmentOptions },
        { questionNumbers: [22], prompt: "Studying animals in zoos is less stressful for the animals than studying them in the wild.", options: judgmentOptions },
      ],
    },
    {
      id: "cambridge-14-test-4-part2-questions-23-24",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 23 and 24 on your answer sheet.",
      questions: [{ questionNumbers: [23, 24], selectCount: 2, prompt: "Which TWO of the following are stated about zoo staff in the text?", options: [
        { letter: "A", text: "Some take part in television documentaries about animals." },
        { letter: "B", text: "Some travel to overseas locations to join teams in zoos." },
        { letter: "C", text: "Some get experience with species in the wild before taking up zoo jobs." },
        { letter: "D", text: "Some teach people who are involved with conservation projects." },
        { letter: "E", text: "Some specialise in caring for species which are under threat." },
      ] }],
    },
    {
      id: "cambridge-14-test-4-part2-questions-25-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 25 and 26 on your answer sheet.",
      questions: [{ questionNumbers: [25, 26], selectCount: 2, prompt: "Which TWO of these beliefs about zoos does the writer mention in the text?", options: [
        { letter: "A", text: "They can help children overcome their fears of wild animals." },
        { letter: "B", text: "They can increase public awareness of environmental issues." },
        { letter: "C", text: "They can provide employment for a range of professional people." },
        { letter: "D", text: "They can generate income to support wildlife conservation projects." },
        { letter: "E", text: "They can raise animals which can later be released into the wild." },
      ] }],
    },
  ],
  source: {
    passagePages: [87, 88, 89, 90].map(sourcePage),
    questionPages: [89, 90].map(sourcePage),
    answerPages: [sourcePage(127)],
    explanationPages: [170, 171, 172, 173].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集14精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const marineDebris: ReadingPart = {
  id: "cambridge-14-test-4-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Marine debris",
  sections: [{
    id: "cambridge-14-test-4-part3-passage",
    format: "pre",
    paragraphs: [
      "Chelsea Rochman, an ecologist at the University of California, Davis, has been trying to answer a dismal question: Is everything terrible, or are things just very, very bad?",
      "Rochman is a member of the National Center for Ecological Analysis and Synthesis’s marine-debris working group, a collection of scientists who study, among other things, the growing problem of marine debris, also known as ocean trash. Plenty of studies have sounded alarm bells about the state of marine debris; in a recent paper published in the journal Ecology, Rochman and her colleagues set out to determine how many of those perceived risks are real.",
      "Often, Rochman says, scientists will end a paper by speculating about the broader impacts of what they’ve found. For example, a study could show that certain seabirds eat plastic bags, and go on to warn that whole bird populations are at risk of dying out. ‘But the truth was that nobody had yet tested those perceived threats,’ Rochman says. ‘There wasn’t a lot of information.’",
      "Rochman and her colleagues examined more than a hundred papers on the impacts of marine debris that were published through 2013. Within each paper, they asked what threats scientists had studied — 366 perceived threats in all — and what they’d actually found.",
      "In 83 percent of cases, the perceived dangers of ocean trash were proven true. In the remaining cases, the working group found the studies had weaknesses in design and content which affected the validity of their conclusions — they lacked a control group, for example, or used faulty statistics.",
      "Strikingly, Rochman says, only one well-designed study failed to find the effect it was looking for, an investigation of mussels ingesting microscopic plastic bits. The plastic moved from the mussels’ stomachs to their bloodstreams, scientists found, and stayed there for weeks — but didn’t seem to stress out the shellfish.",
      "While mussels may be fine eating trash, though, the analysis also gave a clearer picture of the many ways that ocean debris is bothersome.",
      "Within the studies they looked at, most of the proven threats came from plastic debris, rather than other materials like metal or wood. Most of the dangers also involved large pieces of debris — animals getting entangled in trash, for example, or eating it and severely injuring themselves.",
      "But a lot of ocean debris is ‘microplastic’, or pieces smaller than five millimeters. These may be ingredients used in cosmetics and toiletries, fibers shed by synthetic clothing in the wash, or eroded remnants of larger debris. Compared to the number of studies investigating large-scale debris, Rochman’s group found little research on the effects of these tiny bits. ‘There are a lot of open questions still for microplastic,’ Rochman says, though she notes that more papers on the subject have been published since 2013, the cutoff point for the group’s analysis.",
      "There are also, she adds, a lot of open questions about the ways that ocean debris can lead to sea-creature death. Many studies have looked at how plastic affects an individual animal, or that animal’s tissues or cells, rather than whole populations. And in the lab, scientists often use higher concentrations of plastic than what’s really in the ocean. None of that tells us how many birds or fish or sea turtles could die from plastic pollution — or how deaths in one species could affect that animal’s predators, or the rest of the ecosystem.",
      "‘We need to be asking more ecologically relevant questions,’ Rochman says. Usually, scientists don’t know exactly how disasters such as a tanker accidentally spilling its whole cargo of oil and polluting huge areas of the ocean will affect the environment until after they’ve happened. ‘We don’t ask the right questions early enough,’ she says. But if ecologists can understand how the slow-moving effect of ocean trash is damaging ecosystems, they might be able to prevent things from getting worse.",
      "Asking the right questions can help policy makers, and the public, figure out where to focus their attention. The problems that look or sound most dramatic may not be the best places to start. For example, the name of the ‘Great Pacific Garbage Patch’ — a collection of marine debris in the northern Pacific Ocean — might conjure up a vast, floating trash island. In reality though, much of the debris is tiny or below the surface; a person could sail through the area without seeing any trash at all. A Dutch group called ‘The Ocean Cleanup’ is currently working on plans to put mechanical devices in the Pacific Garbage Patch and similar areas to suck up plastic. But a recent paper used simulations to show that strategically positioning the cleanup devices closer to shore would more effectively reduce pollution over the long term.",
      "‘I think clearing up some of these misperceptions is really important,’ Rochman says. Among scientists as well as in the media, she says, ‘A lot of the images about strandings and entanglement and all of that cause the perception that plastic debris is killing everything in the ocean.’ Interrogating the existing scientific literature can help ecologists figure out which problems really need addressing, and which ones they’d be better off — like the mussels — absorbing and ignoring.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-14-test-4-part3-questions-27-33",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 3? In boxes 27–33 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [27], prompt: "Rochman and her colleagues were the first people to research the problem of marine debris.", options: judgmentOptions },
        { questionNumbers: [28], prompt: "The creatures most in danger from ocean trash are certain seabirds.", options: judgmentOptions },
        { questionNumbers: [29], prompt: "The studies Rochman has reviewed have already proved that populations of some birds will soon become extinct.", options: judgmentOptions },
        { questionNumbers: [30], prompt: "Rochman analysed papers on the different kinds of danger caused by ocean trash.", options: judgmentOptions },
        { questionNumbers: [31], prompt: "Most of the research analysed by Rochman and her colleagues was badly designed.", options: judgmentOptions },
        { questionNumbers: [32], prompt: "One study examined by Rochman was expecting to find that mussels were harmed by eating plastic.", options: judgmentOptions },
        { questionNumbers: [33], prompt: "Some mussels choose to eat plastic in preference to their natural diet.", options: judgmentOptions },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-14-test-4-part3-questions-34-39",
        "Findings related to marine debris",
        "Questions 34–39\nComplete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 34–39 on your answer sheet.\n\nFindings related to marine debris\n\nStudies of marine debris found the biggest threats were:\n• plastic (not metal or wood)\n• bits of debris that were 34 ______ (harmful to animals)\n• little research into 35 ______, e.g. from synthetic fibres\n\nDrawbacks of the studies examined:\n• most focused on individual animals, not entire 36 ______\n• the 37 ______ of plastic used in the lab did not always reflect those in the ocean\n• there was insufficient information on the numbers of animals which could be affected; the impact of a reduction in numbers on the 38 ______ of that species; and the impact on the ecosystem\n\nMore information is needed on the possible impact of future 39 ______ (e.g. involving oil).",
        34,
        39,
      ),
    },
    {
      id: "cambridge-14-test-4-part3-question-40",
      type: "choice",
      questions: [{ questionNumbers: [40], prompt: "What would be the best title for this passage?", options: [
        { letter: "A", text: "Assessing the threat of marine debris" },
        { letter: "B", text: "Marine debris: who is to blame?" },
        { letter: "C", text: "A new solution to the problem of marine debris" },
        { letter: "D", text: "Marine debris: the need for international action" },
      ] }],
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in box 40 on your answer sheet.",
    },
  ],
  source: {
    passagePages: [91, 92, 93, 94].map(sourcePage),
    questionPages: [93, 94].map(sourcePage),
    answerPages: [sourcePage(127)],
    explanationPages: [177, 178, 179, 180, 181].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集14精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE14_TEST4_PARTS: ReadingPart[] = [secretOfStayingYoung, zoos, marineDebris];

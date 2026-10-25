import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  18: [1594, 2100], 19: [1676, 2365], 20: [1584, 2102], 21: [1686, 2370],
  22: [1583, 2114], 23: [1689, 2364], 24: [1558, 2100], 25: [1689, 2365],
  26: [1586, 2230], 27: [1689, 2364], 28: [1543, 2099], 29: [1673, 2364],
  122: [1286, 1510],
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
    26: 1811, 27: 2337, 28: 2337, 29: 2336, 30: 2336,
    35: 355, 36: 2337, 37: 2338, 38: 2334, 39: 2336, 40: 2340,
    47: 2160, 48: 2336, 49: 2337, 50: 2336, 51: 2333, 52: 2333, 53: 2330,
  };
  return {
    page,
    src: "/reading/explanations/cambridge-15-test-1-part" + part + "-exp15-p" + String(page).padStart(3, "0") + ".webp",
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

const nutmeg: ReadingPart = {
  id: "cambridge-15-test-1-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Nutmeg — a valuable spice",
  sections: [{
    id: "cambridge-15-test-1-part1-passage",
    format: "pre",
    paragraphs: [
      "The nutmeg tree, Myristica fragrans, is a large evergreen tree native to Southeast Asia. Until the late 18th century, it only grew in one place in the world: a small group of islands in the Banda Sea, part of the Moluccas — or Spice Islands — in northeastern Indonesia. The tree is thickly branched with dense foliage of tough, dark green oval leaves, and produces small, yellow, bell-shaped flowers and pale yellow pear-shaped fruits. The fruit is encased in a fleshy husk. When the fruit is ripe, this husk splits into two halves along a ridge running the length of the fruit. Inside is a purple-brown shiny seed, 2–3 cm long by about 2 cm across, surrounded by a lacy red or crimson covering called an ‘aril’. These are the sources of the two spices nutmeg and mace, the former being produced from the dried seed and the latter from the aril.",
      "Nutmeg was a highly prized and costly ingredient in European cuisine in the Middle Ages, and was used as a flavouring, medicinal, and preservative agent. Throughout this period, the Arabs were the exclusive importers of the spice to Europe. They sold nutmeg for high prices to merchants based in Venice, but they never revealed the exact location of the source of this extremely valuable commodity. The Arab-Venetian dominance of the trade finally ended in 1512, when the Portuguese reached the Banda Islands and began exploiting its precious resources.",
      "Always in danger of competition from neighbouring Spain, the Portuguese began subcontracting their spice distribution to Dutch traders. Profits began to flow into the Netherlands, and the Dutch commercial fleet swiftly grew into one of the largest in the world. The Dutch quietly gained control of most of the shipping and trading of spices in Northern Europe. Then, in 1580, Portugal fell under Spanish rule, and by the end of the 16th century the Dutch found themselves locked out of the market. As prices for pepper, nutmeg, and other spices soared across Europe, they decided to fight back.",
      "In 1602, Dutch merchants founded the VOC, a trading corporation better known as the Dutch East India Company. By 1617, the VOC was the richest commercial operation in the world. The company had 50,000 employees worldwide, with a private army of 30,000 men and a fleet of 200 ships. At the same time, thousands of people across Europe were dying of the plague, a highly contagious and deadly disease. Doctors were desperate for a way to stop the spread of this disease, and they decided nutmeg held the cure. Everybody wanted nutmeg, and many were willing to spare no expense to have it. Nutmeg bought for a few pennies in Indonesia could be sold for 68,000 times its original cost on the streets of London. The only problem was the short supply. And that’s where the Dutch found their opportunity.",
      "The Banda Islands were ruled by local sultans who insisted on maintaining a neutral trading policy towards foreign powers. This allowed them to avoid the presence of Portuguese or Spanish troops on their soil, but it also left them unprotected from other invaders. In 1621, the Dutch arrived and took over. Once securely in control of the Bandas, the Dutch went to work protecting their new investment. They concentrated all nutmeg production into a few easily guarded areas, uprooting and destroying any trees outside the plantation zones. Anyone caught growing a nutmeg seedling or carrying seeds without the proper authority was severely punished. In addition, all exported nutmeg was covered with lime to make sure there was no chance a fertile seed which could be grown elsewhere would leave the islands. There was only one obstacle to Dutch domination. One of the Banda Islands, a sliver of land called Run, only 3 km long by less than 1 km wide, was under the control of the British. After decades of fighting for control of this tiny island, the Dutch and British arrived at a compromise settlement, the Treaty of Breda, in 1667. Intent on securing their hold over every nutmeg-producing island, the Dutch offered a trade: if the British would give them the island of Run, they would in turn give Britain a distant and much less valuable island in North America. The British agreed. That other island was Manhattan, which is how New Amsterdam became New York. The Dutch now had a monopoly over the nutmeg trade which would last for another century.",
      "Then, in 1770, a Frenchman named Pierre Poivre successfully smuggled nutmeg plants to safety in Mauritius, an island off the coast of Africa. Some of these were later exported to the Caribbean where they thrived, especially on the island of Grenada. Next, in 1778, a volcanic eruption in the Banda region caused a tsunami that wiped out half the nutmeg groves. Finally, in 1809, the British returned to Indonesia and seized the Banda Islands by force. They returned the islands to the Dutch in 1817, but not before transplanting hundreds of nutmeg seedlings to plantations in several locations across southern Asia. The Dutch nutmeg monopoly was over.",
      "Today, nutmeg is grown in Indonesia, the Caribbean, India, Malaysia, Papua New Guinea and Sri Lanka, and world nutmeg production is estimated to average between 10,000 and 12,000 tonnes per year.",
    ],
  }],
  questionBlocks: [
    {
      ...rawFillBlock(
        "cambridge-15-test-1-part1-questions-1-4",
        "The nutmeg tree and fruit",
        "Questions 1–4\nComplete the notes below.\nChoose ONE WORD ONLY from the passage for each answer.\nWrite your answers in boxes 1–4 on your answer sheet.\n\nThe nutmeg tree and fruit\n\nThe leaves of the tree are 1 ______ in shape.\n\nThe 2 ______ surrounds the fruit and breaks open when the fruit is ripe.\n\nThe 3 ______ is used to produce the spice nutmeg.\n\nThe covering known as the aril is used to produce 4 ______.\n\nThe tree has yellow flowers and fruit.",
        1,
        4,
      ),
    },
    {
      id: "cambridge-15-test-1-part1-questions-5-7",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 5–7 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [5], prompt: "In the Middle Ages, most Europeans knew where nutmeg was grown.", options: judgmentOptions },
        { questionNumbers: [6], prompt: "The VOC was the world’s first major trading company.", options: judgmentOptions },
        { questionNumbers: [7], prompt: "Following the Treaty of Breda, the Dutch had control of all the islands where nutmeg grew.", options: judgmentOptions },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-15-test-1-part1-questions-8-13",
        "The history of the nutmeg trade",
        "Questions 8–13\nComplete the table below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 8–13 on your answer sheet.\n\nThe history of the nutmeg trade\n\nMiddle Ages: Nutmeg was brought to Europe by the 8 ______.\n\n16th century: European nations took control of the nutmeg trade.\n\n17th century: Demand for nutmeg grew, as it was believed to be effective against the disease known as the 9 ______.\n\nThe Dutch took control of the Banda Islands and restricted nutmeg production to a few areas. They put 10 ______ on nutmeg to avoid it being cultivated outside the islands. They finally obtained the island of 11 ______ from the British.\n\nLate 18th century: In 1770, nutmeg plants were secretly taken to 12 ______. In 1778, half the Banda Islands’ nutmeg plantations were destroyed by a 13 ______.",
        8,
        13,
      ),
    },
  ],
  source: {
    passagePages: [18, 19].map(sourcePage),
    questionPages: [20, 21].map(sourcePage),
    answerPages: [sourcePage(122)],
    explanationPages: [26, 27, 28, 29, 30].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集15精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const driverlessCars: ReadingPart = {
  id: "cambridge-15-test-1-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Driverless cars",
  sections: [
    {
      id: "cambridge-15-test-1-part2-section-a",
      heading: "A",
      format: "pre",
      paragraphs: [
        "The automotive sector is well used to adapting to automation in manufacturing. The implementation of robotic car manufacture from the 1970s onwards led to significant cost savings and improvements in the reliability and flexibility of vehicle mass production. A new challenge to vehicle production is now on the horizon and, again, it comes from automation. However, this time it is not to do with the manufacturing process, but with the vehicles themselves.",
        "Research projects on vehicle automation are not new. Vehicles with limited self-driving capabilities have been around for more than 50 years, resulting in significant contributions towards driver assistance systems. But since Google announced in 2010 that it had been trialling self-driving cars on the streets of California, progress in this field has quickly gathered pace.",
      ],
    },
    {
      id: "cambridge-15-test-1-part2-section-b",
      heading: "B",
      format: "pre",
      paragraphs: [
        "There are many reasons why technology is advancing so fast. One frequently cited motive is safety; indeed, research at the UK’s Transport Research Laboratory has demonstrated that more than 90 percent of road collisions involve human error as a contributory factor, and it is the primary cause in the vast majority. Automation may help to reduce the incidence of this.",
        "Another aim is to free the time people spend driving for other purposes. If the vehicle can do some or all of the driving, it may be possible to be productive, to socialise or simply to relax while automation systems have responsibility for safe control of the vehicle. If the vehicle can do the driving, those who are challenged by existing mobility models — such as older or disabled travellers — may be able to enjoy significantly greater travel autonomy.",
      ],
    },
    {
      id: "cambridge-15-test-1-part2-section-c",
      heading: "C",
      format: "pre",
      paragraphs: [
        "Beyond these direct benefits, we can consider the wider implications for transport and society, and how manufacturing processes might need to respond as a result. At present, the average car spends more than 90 percent of its life parked. Automation means that initiatives for car-sharing become much more viable, particularly in urban areas with significant travel demand. If a significant proportion of the population choose to use shared automated vehicles, mobility demand can be met by far fewer vehicles.",
      ],
    },
    {
      id: "cambridge-15-test-1-part2-section-d",
      heading: "D",
      format: "pre",
      paragraphs: [
        "The Massachusetts Institute of Technology investigated automated mobility in Singapore, finding that fewer than 30 percent of the vehicles currently used would be required if fully automated car-sharing could be implemented. If this is the case, it might mean that we need to manufacture far fewer vehicles to meet demand.",
        "However, the number of trips being taken would probably increase, partly because empty vehicles would have to be moved from one customer to the next.",
        "Modelling work by the University of Michigan Transportation Research Institute suggests automated vehicles might reduce vehicle ownership by 43 percent, but that vehicles’ average annual mileage would double as a result. As a consequence, each vehicle would be used more intensively, and might need replacing sooner. This faster rate of turnover may mean that vehicle production will not necessarily decrease.",
      ],
    },
    {
      id: "cambridge-15-test-1-part2-section-e",
      heading: "E",
      format: "pre",
      paragraphs: [
        "Automation may prompt other changes in vehicle manufacture. If we move to a model where consumers are tending not to own a single vehicle but to purchase access to a range of vehicles through a mobility provider, drivers will have the freedom to select one that best suits their needs for a particular journey, rather than making a compromise across all their requirements.",
        "Since, for most of the time, most of the seats in most cars are unoccupied, this may boost production of a smaller, more efficient range of vehicles that suit the needs of individuals. Specialised vehicles may then be available for exceptional journeys, such as going on a family camping trip or helping a son or daughter move to university.",
      ],
    },
    {
      id: "cambridge-15-test-1-part2-section-f",
      heading: "F",
      format: "pre",
      paragraphs: [
        "There are a number of hurdles to overcome in delivering automated vehicles to our roads. These include the technical difficulties in ensuring that the vehicle works reliably in the infinite range of traffic, weather and road situations it might encounter; the regulatory challenges in understanding how liability and enforcement might change when drivers are no longer essential for vehicle operation; and the societal changes that may be required for communities to trust and accept automated vehicles as being a valuable part of the mobility landscape.",
      ],
    },
    {
      id: "cambridge-15-test-1-part2-section-g",
      heading: "G",
      format: "pre",
      paragraphs: [
        "It’s clear that there are many challenges that need to be addressed but, through robust and targeted research, these can most probably be conquered within the next 10 years. Mobility will change in such potentially significant ways and in association with so many other technological developments, such as telepresence and virtual reality, that it is hard to make concrete predictions about the future. However, one thing is certain: change is coming, and the need to be flexible in response to this will be vital for those involved in manufacturing the vehicles that will deliver future mobility.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-15-test-1-part2-questions-14-18",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has seven sections, A–G. Which section contains the following information? Write the correct letter, A–G, in boxes 14–18 on your answer sheet.",
      questions: [
        { questionNumbers: [14], prompt: "A reference to the amount of time when a car is not in use", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [15], prompt: "Mention of several advantages of driverless vehicles for individual road-users", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [16], prompt: "Reference to the opportunity of choosing the most appropriate vehicle for each trip", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [17], prompt: "An estimate of how long it will take to overcome a number of problems", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [18], prompt: "A suggestion that the use of driverless cars may have no effect on the number of vehicles manufactured", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Section " + letter })) },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-15-test-1-part2-questions-19-22",
        "The impact of driverless cars",
        "Questions 19–22\nComplete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 19–22 on your answer sheet.\n\nThe impact of driverless cars\n\nFigures from the Transport Research Laboratory indicate that most motor accidents are partly due to 19 ______, so the introduction of driverless vehicles will result in greater safety. In addition to the direct benefits of automation, it may bring other advantages. For example, schemes for 20 ______ will be more workable, especially in towns and cities, resulting in fewer cars on the road.\n\nAccording to the University of Michigan Transportation Research Institute, there could be a 43 percent drop in 21 ______ of cars. However, this would mean that the yearly 22 ______ of each car would, on average, be twice as high as it currently is. This would lead to a higher turnover of vehicles, and therefore no reduction in automotive manufacturing.",
        19,
        22,
      ),
    },
    {
      id: "cambridge-15-test-1-part2-questions-23-24",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 23 and 24 on your answer sheet.",
      questions: [{ questionNumbers: [23, 24], selectCount: 2, prompt: "Which TWO benefits of automated vehicles does the writer mention?", options: [
        { letter: "A", text: "Car travellers could enjoy considerable cost savings." },
        { letter: "B", text: "It would be easier to find parking spaces in urban areas." },
        { letter: "C", text: "Travellers could spend journeys doing something other than driving." },
        { letter: "D", text: "People who find driving physically difficult could travel independently." },
        { letter: "E", text: "A reduction in the number of cars would mean a reduction in pollution." },
      ] }],
    },
    {
      id: "cambridge-15-test-1-part2-questions-25-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 25 and 26 on your answer sheet.",
      questions: [{ questionNumbers: [25, 26], selectCount: 2, prompt: "Which TWO challenges to automated vehicle development does the writer mention?", options: [
        { letter: "A", text: "Making sure the general public has confidence in automated vehicles." },
        { letter: "B", text: "Managing the pace of transition from conventional to automated vehicles." },
        { letter: "C", text: "Deciding how to compensate professional drivers who become redundant." },
        { letter: "D", text: "Setting up the infrastructure to make roads suitable for automated vehicles." },
        { letter: "E", text: "Getting automated vehicles to adapt to various different driving conditions." },
      ] }],
    },
  ],
  source: {
    passagePages: [22, 23].map(sourcePage),
    questionPages: [24, 25].map(sourcePage),
    answerPages: [sourcePage(122)],
    explanationPages: [35, 36, 37, 38, 39, 40].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集15精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const exploration: ReadingPart = {
  id: "cambridge-15-test-1-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "What is exploration?",
  sections: [{
    id: "cambridge-15-test-1-part3-passage",
    format: "pre",
    paragraphs: [
      "We are all explorers. Our desire to discover, and then share that new-found knowledge, is part of what makes us human — indeed, this has played an important part in our success as a species. Long before the first caveman slumped down beside the fire and grunted news that there were plenty of wildebeest over yonder, our ancestors had learnt the value of sending out scouts to investigate the unknown. This questing nature of ours undoubtedly helped our species spread around the globe, just as it nowadays no doubt helps the last nomadic Penan maintain their existence in the depleted forests of Borneo, and a visitor negotiate the subways of New York.",
      "Over the years, we’ve come to think of explorers as a peculiar breed — different from the rest of us, different from those of us who are merely ‘well travelled’, even; and perhaps there is a type of person more suited to seeking out the new, a type of caveman more inclined to risk venturing out. That, however, doesn’t take away from the fact that we all have this enquiring instinct, even today; and that in all sorts of professions — whether artist, marine biologist or astronomer — borders of the unknown are being tested each day.",
      "Thomas Hardy set some of his novels in Egdon Heath, a fictional area of uncultivated land, and used the landscape to suggest the desires and fears of his characters. He is delving into matters we all recognise because they are common to humanity. This is surely an act of exploration, and into a world as remote as the author chooses. Explorer and travel writer Peter Fleming talks of the moment when the explorer returns to the existence he has left behind with his loved ones. The traveller ‘who has for weeks or months seen himself only as a puny and irrelevant alien crawling laboriously over a country in which he has no roots and no background, suddenly encounters his other self, a relatively solid figure, with a place in the minds of certain people’.",
      "In this book about the exploration of the earth’s surface, I have confined myself to those whose travels were real and who also aimed at more than personal discovery. But that still left me with another problem: the word ‘explorer’ has become associated with a past era. We think back to a golden age, as if exploration peaked somehow in the 19th century — as if the process of discovery is now on the decline, though the truth is that we have named only one and a half million of this planet’s species, and there may be more than 10 million — and that’s not including bacteria. We have studied only 5 per cent of the species we know. We have scarcely mapped the ocean floors, and know even less about ourselves; we fully understand the workings of only 10 per cent of our brains.",
      "Here is how some of today’s ‘explorers’ define the word. Ran Fiennes, dubbed the ‘greatest living explorer’, said, ‘An explorer is someone who has done something that no human has done before — and also done something scientifically useful.’ Chris Bonington, a leading mountaineer, felt exploration was to be found in the act of physically touching the unknown: ‘You have to have gone somewhere new.’ Then Robin Hanbury-Tenison, a campaigner on behalf of remote so-called ‘tribal’ peoples, said, ‘A traveller simply records information about some far-off world, and reports back; but an explorer changes the world.’ Wilfred Thesiger, who crossed Arabia’s Empty Quarter in 1946, and belongs to an era of unmechanised travel now lost to the rest of us, told me, ‘If I’d gone across by camel when I could have gone by car, it would have been a stunt.’ To him, exploration meant bringing back information from a remote place regardless of any great self-discovery.",
      "Each definition is slightly different — and tends to reflect the field of endeavour of each pioneer. It was the same whoever I asked: the prominent historian would say exploration was a thing of the past, the cutting-edge scientist would say it was of the present. And so on. They each set their own particular criteria; the common factor in their approach being that they all had, unlike many of us who simply enjoy travel or discovering new things, both a very definite objective from the outset and also a desire to record their findings.",
      "I’d best declare my own bias. As a writer, I’m interested in the exploration of ideas. I’ve done a great many expeditions and each one was unique. I’ve lived for months alone with isolated groups of people all around the world, even two ‘uncontacted tribes’. But none of these things is of the slightest interest to anyone unless, through my books, I’ve found a new slant, explored a new idea. Why? Because the world has moved on. The time has long passed for the great continental voyages — another walk to the poles, another crossing of the Empty Quarter. We know how the land surface of our planet lies; exploration of it is now down to the details — the habits of microbes, say, or the grazing behaviour of buffalo. Aside from the deep sea and deep underground, it’s the era of specialists. However, this is to disregard the role the human mind has in conveying remote places; and this is what interests me: how a fresh interpretation, even of a well-travelled route, can give its readers new insights.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-15-test-1-part3-questions-27-32",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27–32 on your answer sheet.",
      questions: [
        { questionNumbers: [27], prompt: "The writer refers to visitors to New York to illustrate the point that", options: [
          { letter: "A", text: "exploration is an intrinsic element of being human." }, { letter: "B", text: "most people are enthusiastic about exploring." }, { letter: "C", text: "exploration can lead to surprising results." }, { letter: "D", text: "most people find exploration daunting." },
        ] },
        { questionNumbers: [28], prompt: "According to the second paragraph, what is the writer’s view of explorers?", options: [
          { letter: "A", text: "Their discoveries have brought both benefits and disadvantages." }, { letter: "B", text: "Their main value is in teaching others." }, { letter: "C", text: "They act on an urge that is common to everyone." }, { letter: "D", text: "They tend to be more attracted to certain professions than to others." },
        ] },
        { questionNumbers: [29], prompt: "The writer refers to a description of Egdon Heath to suggest that", options: [
          { letter: "A", text: "Hardy was writing about his own experience of exploration." }, { letter: "B", text: "Hardy was mistaken about the nature of exploration." }, { letter: "C", text: "Hardy’s aim was to investigate people’s emotional states." }, { letter: "D", text: "Hardy’s aim was to show the attraction of isolation." },
        ] },
        { questionNumbers: [30], prompt: "In the fourth paragraph, the writer refers to ‘a golden age’ to suggest that", options: [
          { letter: "A", text: "the amount of useful information produced by exploration has decreased." }, { letter: "B", text: "fewer people are interested in exploring than in the 19th century." }, { letter: "C", text: "recent developments have made exploration less exciting." }, { letter: "D", text: "we are wrong to think that exploration is no longer necessary." },
        ] },
        { questionNumbers: [31], prompt: "In the sixth paragraph, when discussing the definition of exploration, the writer argues that", options: [
          { letter: "A", text: "people tend to relate exploration to their own professional interests." }, { letter: "B", text: "certain people are likely to misunderstand the nature of exploration." }, { letter: "C", text: "the generally accepted definition has changed over time." }, { letter: "D", text: "historians and scientists have more valid definitions than the general public." },
        ] },
        { questionNumbers: [32], prompt: "In the last paragraph, the writer explains that he is interested in", options: [
          { letter: "A", text: "how someone’s personality is reflected in their choice of places to visit." }, { letter: "B", text: "the human ability to cast new light on places that may be familiar." }, { letter: "C", text: "how travel writing has evolved to meet changing demands." }, { letter: "D", text: "the feelings that writers develop about the places that they explore." },
        ] },
      ],
    },
    {
      id: "cambridge-15-test-1-part3-questions-33-37",
      type: "choice",
      sharedOptions: true,
      instruction: "Match each statement with the correct explorer, A–E. Write the correct letter, A–E, in boxes 33–37 on your answer sheet. You may use any letter more than once.",
      questions: [
        { questionNumbers: [33], prompt: "He referred to the relevance of the form of transport used.", options: [
          { letter: "A", text: "Peter Fleming" }, { letter: "B", text: "Ran Fiennes" }, { letter: "C", text: "Chris Bonington" }, { letter: "D", text: "Robin Hanbury-Tenison" }, { letter: "E", text: "Wilfred Thesiger" },
        ] },
        { questionNumbers: [34], prompt: "He described feelings on coming back home after a long journey.", options: [
          { letter: "A", text: "Peter Fleming" }, { letter: "B", text: "Ran Fiennes" }, { letter: "C", text: "Chris Bonington" }, { letter: "D", text: "Robin Hanbury-Tenison" }, { letter: "E", text: "Wilfred Thesiger" },
        ] },
        { questionNumbers: [35], prompt: "He worked for the benefit of specific groups of people.", options: [
          { letter: "A", text: "Peter Fleming" }, { letter: "B", text: "Ran Fiennes" }, { letter: "C", text: "Chris Bonington" }, { letter: "D", text: "Robin Hanbury-Tenison" }, { letter: "E", text: "Wilfred Thesiger" },
        ] },
        { questionNumbers: [36], prompt: "He did not consider learning about oneself an essential part of exploration.", options: [
          { letter: "A", text: "Peter Fleming" }, { letter: "B", text: "Ran Fiennes" }, { letter: "C", text: "Chris Bonington" }, { letter: "D", text: "Robin Hanbury-Tenison" }, { letter: "E", text: "Wilfred Thesiger" },
        ] },
        { questionNumbers: [37], prompt: "He defined exploration as being both unique and of value to others.", options: [
          { letter: "A", text: "Peter Fleming" }, { letter: "B", text: "Ran Fiennes" }, { letter: "C", text: "Chris Bonington" }, { letter: "D", text: "Robin Hanbury-Tenison" }, { letter: "E", text: "Wilfred Thesiger" },
        ] },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-15-test-1-part3-questions-38-40",
        "The writer’s own bias",
        "Questions 38–40\nComplete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 38–40 on your answer sheet.\n\nThe writer’s own bias\n\nThe writer has experience of a large number of 38 ______, and was the first stranger that certain previously 39 ______ people had encountered. He believes there is no need for further exploration of Earth’s 40 ______, except to answer specific questions such as how buffalo eat.",
        38,
        40,
      ),
    },
  ],
  source: {
    passagePages: [26, 27].map(sourcePage),
    questionPages: [28, 29].map(sourcePage),
    answerPages: [sourcePage(122)],
    explanationPages: [47, 48, 49, 50, 51, 52, 53].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集15精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE15_TEST1_PARTS: ReadingPart[] = [nutmeg, driverlessCars, exploration];

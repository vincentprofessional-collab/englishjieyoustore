import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  61: [1444, 2375], 62: [1553, 1989], 63: [1391, 2379], 64: [1434, 1994],
  65: [1414, 2378], 66: [1550, 1998], 67: [1460, 2372], 68: [1433, 1999],
  69: [1525, 2374], 70: [1550, 2001], 71: [1445, 2371], 72: [1550, 2002],
  123: [1312, 1806],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1500, 2240];
  return {
    page,
    src: "/reading/source-pages/ci21-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
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

const savingTheSaiga: ReadingPart = {
  id: "cambridge-21-test-3-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Saving the saiga",
  sections: [{
    id: "cambridge-21-test-3-part1-passage",
    format: "pre",
    paragraphs: [
      "The saiga, a species of antelope native to Central Asia, once roamed the vast grasslands of this region in enormous herds, many millions strong. Regrettably, such spectacular sights are a thing of the past. Today, the saiga is largely confined to a single country: Kazakhstan. This country is estimated to be home to well over 90% of the global saiga population, with Russia, Mongolia and Uzbekistan accounting for the rest.",
      "The saiga is perfectly adapted to the tough conditions of the remote wilderness of the steppes of Central Asia. One such adaptation is its bizarre bulbous nose, which enables the animal to survive the extreme seasonal temperature swings of the region. The swollen nostrils of the nose serve several purposes: they filter out dust and cool the blood during hot, dry summers, and they warm the cold air before it enters the saiga’s lungs in winter. Other seasonal adaptations include a heavy winter coat that the saiga sheds when the weather warms up.",
      "Despite these superb adaptations to harsh conditions, the saiga has no defence against the threats posed by humans. It was almost driven to extinction by hunters in the 19th century. Legal protection ensured its survival for a while, and numbers steadily recovered throughout most of the 20th century. But the respite was only temporary. In the ten years following the break-up of the former Soviet Union in 1991, over 95% of the global population was lost — one of the fastest examples of species loss ever recorded for a mammal.",
      "The dramatic decline during this decade was due to illegal poaching on an industrial scale. Male saiga are a particular target, because their horns are highly prized by traditional medicine practitioners. Poaching reached epidemic levels after misguided conservationists tried to relieve the pressure on threatened African rhinos by actively encouraging the use of saiga horns in traditional medicine as an alternative to those of rhinos. Male saiga were almost wiped out, leading to a population crash from which the species has been struggling to recover ever since.",
      "Another threat to the survival of the saiga is loss of habitat, as a result of agricultural expansion and human settlement. Physical barriers such as railways, pipelines and fences can block the seasonal migration routes of this transboundary species. In the worst cases, herds may starve to death after being trapped.",
      "Then there is the risk of disease. In 2015, an outbreak of haemorrhagic septicaemia, caused by the normally harmless bacterium Pasteurella multocida, killed over 75% of the global adult saiga population in just three weeks. In 2017, 60% of the Mongolian saiga population — a subspecies found nowhere else in the world — was killed by a virus that spilled over from livestock. These so-called mass mortality events represent an unpredictable and serious threat to the species.",
      "Climate change poses a further threat. Although well adapted to cold winters and hot summers, saiga struggle to cope with temperature extremes and unpredictable fluctuations in climate. Experts believe that unusually warm weather may have triggered the 2015 mass mortality event. The steppe region has also become increasingly arid in recent years, and many of the smaller streams that the species normally depended on have dried up and vanished.",
      "Recent efforts to save the saiga have been spearheaded by the Altyn Dala Conservation Initiative, a project led by the Association for the Conservation of Biodiversity of Kazakhstan, working in partnership with the Kazakh government’s Committee for Forestry and Wildlife, Frankfurt Zoological Society and Fauna and Flora, an international conservation charity. Its purpose is to protect and restore Kazakhstan’s steppe, semi-desert and desert ecosystems and the many species they support, including the critically endangered saiga. In 2022 the United Nations recognised the initiative as a World Restoration Flagship project, an accolade reserved for the ten best examples of large-scale ecosystem restoration around the globe.",
      "So, how many saiga are there now? By 2000, the global saiga population had hit an all-time low of just 21,000 individuals. There was some recovery in the first decade of the new millennium but this was then crushed by devastating mass mortality events that saw the loss of hundreds of thousands of the species. But thanks to the intervention of the Altyn Dala Conservation Initiative, the most recent episodes in the ongoing story of the saiga have been relatively uplifting. Three years ago, the Ustyurt Plateau population in Kazakhstan experienced its largest mass birth of saiga calves in many years. An aerial census two years ago recorded an estimated 842,000 saiga across Kazakhstan as a whole, and according to an aerial survey earlier this year, the saiga population in Kazakhstan now exceeds 1.9 million. The world’s strangest-looking antelope remains critically endangered, but the direction of travel is positive.",
    ],
  }],
  questionBlocks: [
    rawFillBlock(
      "cambridge-21-test-3-part1-questions-1-7",
      "The saiga",
      "Complete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 1–7 on your answer sheet.",
      "The saiga\n\nAdaptations\n• has a large bulbous nose with swollen nostrils that\n— keep 1 ______ out\n— lower the temperature of its 2 ______ in summer\n— warm the air entering its lungs in winter\n• grows a thick 3 ______ in winter, which it loses in spring\n\nReasons for population decline\n• poaching, especially for the 4 ______ of male saiga\n• expansion of farms and settlements, causing\n— reduction in the size of the saiga’s 5 ______\n— loss of access to the 6 ______ which they use for migration\n• various forms of disease, leading to mass mortality events\n• climate change, causing the disappearance of 7 ______ which the saiga relied on",
      1,
      7,
    ),
    {
      id: "cambridge-21-test-3-part1-questions-8-13",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 8–13 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [8], prompt: "Today, numbers of saiga are distributed evenly across four nations in Central Asia: Kazakhstan, Russia, Mongolia and Uzbekistan.", options: trueFalseNotGivenOptions },
        { questionNumbers: [9], prompt: "For most of the 20th century, the population of saiga were falling.", options: trueFalseNotGivenOptions },
        { questionNumbers: [10], prompt: "Efforts to protect rhinos in Africa had a significant effect on saiga populations.", options: trueFalseNotGivenOptions },
        { questionNumbers: [11], prompt: "Unpredictable fluctuations in climate are threatening the wildlife of Central Asia more than in other parts of the world.", options: trueFalseNotGivenOptions },
        { questionNumbers: [12], prompt: "The Altyn Dala Conservation Initiative was formed for the benefit of a number of different animals.", options: trueFalseNotGivenOptions },
        { questionNumbers: [13], prompt: "The Altyn Dala Conservation Initiative’s recognition as a World Restoration Flagship project attracted additional international funding for the scheme.", options: trueFalseNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [61, 62, 63, 64].map(sourcePage),
    questionPages: [63, 64].map(sourcePage),
    answerPages: [sourcePage(123)],
  },
};

const darEsSalaam: ReadingPart = {
  id: "cambridge-21-test-3-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "The problems of getting around the city of Dar es Salaam",
  sections: [{
    id: "cambridge-21-test-3-part2-passage",
    format: "pre",
    paragraphs: [
      "Dar es Salaam in Tanzania is one of the fastest growing cities in Africa. Its population has increased eightfold since 1980 and swells by half a million people every year. United Nations projections anticipate it will become a megacity within seven years as its population passes 10 million, reaching 13.4 million by 2035. Daniel Hoornweg for the Global Cities Institute forecasts the city could be home to an incredible 73.7 million people by 2100.",
      "Today, four out of five of its people live in single-storey informal settlements on the spreading edges of the city, where the journey to and from the centre regularly takes over two hours. It can be longer if rain turns the dirt roads to mud. Even in the middle of the day, traffic frequently slows to a stop without warning. It is not unusual for cars and minibuses to queue for 20 minutes at a key intersection. A single suburban rail line serves residents in a few areas to the south but is tiny in the context of the wider city. Outside the centre many rely on boda boda (motorbike taxis) to navigate the narrow side streets and potholed mud roads that make up much of the metropolis. Their safety record is scandalous.",
      "Dar es Salaam’s reliance on four arterial roads into the city is a legacy of the colonial government that planned the city at the start of the 20th century to cater for a population of 35,000. Most of the current growth is made up of young people arriving from the countryside to find work, and as the population has exploded, Dar es Salaam has grown around those four highways. Nearly all the expansion is happening on the periphery, and nearly all takes place informally without any agreed strategy.",
      "But Dar es Salaam is pinning its hopes on a solution that could offer a different model for Africa’s megacities, giving them an alternative to a future controlled by the private car. Unlike many cities on the continent, Dar es Salaam isn’t trying to build a metro. It has chosen a less exciting but cheaper and more achievable method: the bus. The DART bus rapid transit (BRT) system runs on bus lanes separated from other traffic, mostly in the middle of the road to reduce stoppages. Ticket purchase and control takes place at stations prior to boarding and the buses are step-free, which means the entire route is accessible to people using wheelchairs or who are travelling with baby buggies.",
      "‘The new buses are much, much better,’ says Paulas George, a young IT worker. He takes the bus every day and it has cut his journey time by two-thirds. He says it is not perfect, though, complaining that drivers often refuse to turn on the air conditioning to save fuel.",
      "That is not the only problem. A shortage of buses after a serious flood at the main depot during the rainy season means the system is carrying 200,000 people a day — half the expected capacity. Smartcards can’t be used as the mechanical readers aren’t working either, forcing passengers to buy individual paper tickets for every journey. Each is printed with a scannable QR code, but there are no scanners. Staff stand by the gates and tear tickets as people enter. As a result, queues are considerable at peak times.",
      "Morogoro Road to the north-west of the city was phase I of the BRT project. Phases II and III will install bus lanes along Nyerere Road to the south-west and Kilwa Road to the south. Construction on both routes is due to start imminently. Phase IV, towards Bagamoyo in the north, is in the preliminary design stage. ‘Much of the city will have access to a world-class transport system within the space of a few years,’ says Chris Kost, the Africa director of ITDP (the Institute for Transportation and Development Policy). All phases are being planned to high standards and, once complete, a third of city residents will be within a short walk of the BRT network.",
      "The ITDP regrets Africa’s obsession with metros. ‘With a metro, an international firm will often just parachute in its own system,’ says Kost. ‘Bus rapid transit allows existing stakeholders to get involved. That’s what we did in Dar es Salaam and what we’re planning in Nairobi, where the bus bodies will be built in the city and local operators will look after tickets, fare collection and IT ... Bus rapid transit has been transformational for Dar es Salaam. For millions of people in African cities, this is their best hope of ever being connected.’",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-21-test-3-part2-questions-14-18",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 2? In boxes 14–18 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [14], prompt: "The population of Dar es Salaam is rising more rapidly than was previously predicted.", options: trueFalseNotGivenOptions },
        { questionNumbers: [15], prompt: "Most of the residents of Dar es Salaam live in high-rise blocks on the edge of the city.", options: trueFalseNotGivenOptions },
        { questionNumbers: [16], prompt: "Residents have been consulted about their views on the suburban rail line in Dar es Salaam.", options: trueFalseNotGivenOptions },
        { questionNumbers: [17], prompt: "The majority of the present residential development in Dar es Salaam is unplanned.", options: trueFalseNotGivenOptions },
        { questionNumbers: [18], prompt: "Dar es Salaam’s authorities have decided to follow the public transport plan adopted by a large number of African cities.", options: trueFalseNotGivenOptions },
      ],
    },
    rawFillBlock(
      "cambridge-21-test-3-part2-questions-19-26",
      "Dar es Salaam’s DART Bus Rapid Transit system",
      "Complete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 19–26 on your answer sheet.",
      "Dar es Salaam’s DART Bus Rapid Transit system\n\nFeatures\n• the buses use designated 19 ______ to cut down on delays\n• passengers pay fares before 20 ______\n• passengers in 21 ______ can use every part of the system\n\nProblems\n• the temperature control is sometimes not activated in order to reduce 22 ______ use\n• an insufficient number of vehicles are available due to the effects of a severe 23 ______\n• passengers are unable to use 24 ______ because some equipment is out of action\n• tickets have to be checked manually at station 25 ______\n• 26 ______ frequently build up during rush hours",
      19,
      26,
    ),
  ],
  source: {
    passagePages: [65, 66, 67, 68].map(sourcePage),
    questionPages: [67, 68].map(sourcePage),
    answerPages: [sourcePage(123)],
  },
};

const rethinkingThePast: ReadingPart = {
  id: "cambridge-21-test-3-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Rethinking the Past",
  sections: [{
    id: "cambridge-21-test-3-part3-passage",
    format: "pre",
    paragraphs: [
      "It is by now a truism that the story of human evolution is being rethought. Discoveries have come thick and fast over the last decade or so, and these have forced us to rethink many crucial points, such as how old our species is — about 300,000 years old as opposed to 200,000 — and what extinct hominins, such as our cousins the Neanderthals, were really like. But because there are so many species and eras involved, it’s hard to discern the common threads linking them.",
      "However, I do think it’s possible to draw out some overall messages from the blizzard of archaeological finds in recent years. Two things stand out to me. One is the growing evidence that many supposedly ‘advanced’ behaviours, such as architecture and art, can be traced much further back in time than we thought, often to hominin species that existed before modern humans. And the other is that we have badly misunderstood gender roles in prehistoric societies, imposing patriarchal values onto cultures that had very different ideas about how women should behave.",
      "Let’s start with architecture. At Kalambo Falls in Zambia, researchers found buried logs that had been shaped with stone tools so that they interlocked. They seem to have once been part of a larger structure, perhaps a building. This would be unsurprising if they weren’t 476,000 years old. That’s almost 200,000 years before our species, Homo sapiens, evolved. Extinct hominins also managed to settle in extreme places. For instance, we now know that extinct hominins such as the Denisovans lived on the frozen heights of high-altitude regions 200,000 years ago — upending the old notion that such environments were only settled by modern humans around 3,600 years ago.",
      "Art also seems to have been invented by older hominins. We have had evidence for a long time now that Neanderthals painted on cave walls. Even earlier species, such as Homo erectus, may also have made art, for example by engraving patterns on shells. By far the most contentious claim in this area is that Homo naledi made art. H. naledi lived around 250,000 years ago, making it a contemporary of our species. However, it had quite a small brain, typical of older hominins — and was therefore, according to palaeoanthropological dogma, incapable of complex behaviours. Nevertheless, in the Rising Star cave system in South Africa where the H. naledi remains were found, researchers have found what seem to be etchings — resembling rudimentary artwork — on the cave walls, though these have yet to be firmly dated.",
      "To say these claims about H. naledi are controversial is to understate the situation. Many experts say the evidence presented so far is completely inadequate to support them. The dispute has only been heightened by the way the results were released, in a non-traditional journal that publishes peer reviews publicly alongside the paper. My views on the H. naledi controversy are complicated. I do think more evidence is needed: in particular with regard to the dating of the etchings. At the same time, I think the species’ small brains are a distraction. Palaeoanthropologists got fixated on brain size because it was what they could see: if what you have is skeletons, then all you know about brains are their shapes and sizes. But other properties, such as the brain’s internal wiring, are surely equally important and may explain how a species like H. naledi might have been capable of complex behaviours, despite their small brains.",
      "In a sense, we shouldn’t be surprised that so many of these behaviours had their origins in older, extinct hominins. Evolution usually works by incremental steps and so does technology. The first birds weren’t great at flying, and the first mobile phones weren’t great at, well, anything really. The idea that there was a sudden explosion of intelligence and creativity at some point in our evolution isn’t inherently ridiculous: sometimes a system hits a tipping point and undergoes runaway change. But there was never that much evidence that human evolution worked this way. Instead, it seems the Neanderthals and many others all walked so we could run.",
      "One way or another, the H. naledi story is going to be an example of letting our preconceptions get in the way of the evidence. The same is true for our ideas about gender in prehistory. Archaeology was invented by individuals with now unfashionably patriarchal views about gender, and those notions fed into their research. Today’s researchers are trying to unpick this stuff, and there have been some significant steps in recent years.",
      "Perhaps the most dramatic was the demolition of ‘Man the Hunter’. This was the idea, promoted for decades, that in most prehistoric societies the men went out to hunt and the women looked after the home. However, a meta-analysis published in June 2023 compiled data on several dozen foraging societies and found women hunted in 80 per cent of them. In line with this, it emerged that an ancient spear-throwing tool called an atlatl enables women to launch projectiles at the same speed as men. We have also seen growing evidence of women occupying positions of authority in ancient societies. The Viking queen Thyra may have helped unify Denmark in the 900s. Going further back, an Iberian leader from around 4000 years ago turned out to be female, not male as many had assumed, when proteins in her teeth were analysed.",
      "It seems that the more we find out about past societies, the more our preconceptions about the ways society ‘has to be’ turn out to be wrong. Inequality, authoritarianism and patriarchy aren’t inevitable. They’re choices, and prehistory shows us that we can choose differently.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-21-test-3-part3-questions-27-30",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27–30 on your answer sheet.",
      questions: [
        { questionNumbers: [27], prompt: "What is the writer doing in the second paragraph?", options: [
          { letter: "A", text: "pinpointing some key changes in our understanding of prehistory" }, { letter: "B", text: "outlining some aspects of prehistory which are still poorly understood" }, { letter: "C", text: "summarising some attitudes towards recent archaeological revelations" }, { letter: "D", text: "giving an overview of some current disagreements among archaeologists" },
        ] },
        { questionNumbers: [28], prompt: "In the sixth paragraph, the writer mentions mobile phones to make the point that", options: [
          { letter: "A", text: "most developments happen in a gradual way." }, { letter: "B", text: "innovation can come from a variety of sources." }, { letter: "C", text: "not all technological advancements are positive." }, { letter: "D", text: "the path of evolution can often be unpredictable." },
        ] },
        { questionNumbers: [29], prompt: "In the seventh paragraph, the phrase ‘unpick this stuff’ refers to the task of", options: [
          { letter: "A", text: "assessing the impact of certain recent research findings." }, { letter: "B", text: "questioning the authenticity of evidence used in earlier research." }, { letter: "C", text: "conducting research into how prehistoric societies were organised." }, { letter: "D", text: "reevaluating research influenced by outdated beliefs about society." },
        ] },
        { questionNumbers: [30], prompt: "What does the writer suggest in the final paragraph?", options: [
          { letter: "A", text: "Studying past societies could help us create a fairer society today." }, { letter: "B", text: "We should not judge past societies by the standards of modern society." }, { letter: "C", text: "We still have much to learn about how societies have evolved over history." }, { letter: "D", text: "There is more than one way to interpret evidence about societies in prehistoric times." },
        ] },
      ],
    },
    {
      id: "cambridge-21-test-3-part3-questions-31-34",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete each sentence with the correct ending, A–F, below. Write the correct letter, A–F, in boxes 31–34 on your answer sheet.",
      questions: [
        { questionNumbers: [31], prompt: "The findings at Kalambo Falls revealed that", options: [
          { letter: "A", text: "Homo sapiens emerged at an earlier point in time than experts previously believed." }, { letter: "B", text: "previous assumptions about who had power in the prehistoric world were inaccurate." }, { letter: "C", text: "gender roles in extinct hominin species were different from those in Homo sapiens societies." }, { letter: "D", text: "experts may have been mistaken about who looked for food in early human communities." }, { letter: "E", text: "Homo sapiens was probably not the only species capable of sophisticated workmanship." }, { letter: "F", text: "other species managed to survive in harsh environments before the arrival of Homo sapiens." },
        ] },
        { questionNumbers: [32], prompt: "Evidence from high-altitude regions suggests that", options: [
          { letter: "A", text: "Homo sapiens emerged at an earlier point in time than experts previously believed." }, { letter: "B", text: "previous assumptions about who had power in the prehistoric world were inaccurate." }, { letter: "C", text: "gender roles in extinct hominin species were different from those in Homo sapiens societies." }, { letter: "D", text: "experts may have been mistaken about who looked for food in early human communities." }, { letter: "E", text: "Homo sapiens was probably not the only species capable of sophisticated workmanship." }, { letter: "F", text: "other species managed to survive in harsh environments before the arrival of Homo sapiens." },
        ] },
        { questionNumbers: [33], prompt: "An academic publication from June 2023 shows that", options: [
          { letter: "A", text: "Homo sapiens emerged at an earlier point in time than experts previously believed." }, { letter: "B", text: "previous assumptions about who had power in the prehistoric world were inaccurate." }, { letter: "C", text: "gender roles in extinct hominin species were different from those in Homo sapiens societies." }, { letter: "D", text: "experts may have been mistaken about who looked for food in early human communities." }, { letter: "E", text: "Homo sapiens was probably not the only species capable of sophisticated workmanship." }, { letter: "F", text: "other species managed to survive in harsh environments before the arrival of Homo sapiens." },
        ] },
        { questionNumbers: [34], prompt: "Analysis of a 4000-year-old Iberian leader indicates that", options: [
          { letter: "A", text: "Homo sapiens emerged at an earlier point in time than experts previously believed." }, { letter: "B", text: "previous assumptions about who had power in the prehistoric world were inaccurate." }, { letter: "C", text: "gender roles in extinct hominin species were different from those in Homo sapiens societies." }, { letter: "D", text: "experts may have been mistaken about who looked for food in early human communities." }, { letter: "E", text: "Homo sapiens was probably not the only species capable of sophisticated workmanship." }, { letter: "F", text: "other species managed to survive in harsh environments before the arrival of Homo sapiens." },
        ] },
      ],
    },
    {
      id: "cambridge-21-test-3-part3-questions-35-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the views of the writer in Reading Passage 3? In boxes 35–40 on your answer sheet, write YES if the statement agrees with the views of the writer, NO if it contradicts the views of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [35], prompt: "It seems likely that the Neanderthals’ cave paintings were the first examples of artwork ever created.", options: yesNoNotGivenOptions },
        { questionNumbers: [36], prompt: "It is very rare to find prehistoric artwork carved onto shells.", options: yesNoNotGivenOptions },
        { questionNumbers: [37], prompt: "The methods which the researchers used to examine the Rising Star cave system were rather unconventional.", options: yesNoNotGivenOptions },
        { questionNumbers: [38], prompt: "It is unclear how old the etchings in the Rising Star cave system are.", options: yesNoNotGivenOptions },
        { questionNumbers: [39], prompt: "The means used to publicise the findings from the Rising Star cave system added to the controversy that surrounds them.", options: yesNoNotGivenOptions },
        { questionNumbers: [40], prompt: "The size of H. naledi brains is a key factor in the question of whether these hominins were able to produce art.", options: yesNoNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [69, 70, 71, 72].map(sourcePage),
    questionPages: [71, 72].map(sourcePage),
    answerPages: [sourcePage(123)],
  },
};

export const CAMBRIDGE21_TEST3_PARTS: ReadingPart[] = [savingTheSaiga, darEsSalaam, rethinkingThePast];

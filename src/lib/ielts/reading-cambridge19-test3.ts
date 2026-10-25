import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  64: [1499, 2235], 65: [1503, 2239], 66: [1502, 2235], 67: [1504, 2254],
  68: [1503, 2234], 69: [1502, 2239], 70: [1502, 2235], 71: [1507, 2255],
  72: [1502, 2235], 73: [1501, 2240], 74: [1441, 2235], 75: [1501, 2240],
  76: [1489, 2249], 127: [1509, 1571],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1500, 2240];
  return {
    page,
    src: "/reading/source-pages/ci19-p" + String(page).padStart(3, "0") + ".webp",
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

const prehistoricIslandSettlers: ReadingPart = {
  id: "cambridge-19-test-3-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Archaeologists discover evidence of prehistoric island settlers",
  sections: [{
    id: "cambridge-19-test-3-part1-passage",
    format: "pre",
    paragraphs: [
      "In early April 2019, Dr Ceri Shipton and his colleagues from Australian National University became the first archaeologists to explore Obi, one of many tropical islands in Indonesia’s Maluku Utara province. The research team’s discoveries suggest that the prehistoric people who lived on Obi were adept on both land and sea, hunting in the dense rainforest, foraging on the seashore, and possibly even voyaging between islands.",
      "The excavations were part of a project to learn more about how people first dispersed from mainland Asia, through the Indonesian archipelago and into the prehistoric continent that once connected Australia and New Guinea. The team’s earlier research suggested that the northernmost islands in the group, known as the Wallacean islands, including Obi, would have offered the easiest migration route. It also seemed likely that these islands were crucial ‘stepping stones’ on humans’ island-hopping voyages through this region millennia ago. But to support this idea, they needed archaeological evidence for humans living in this remote area in the ancient past. So, they travelled to Obi to look for sites that might reveal evidence of early occupation.",
      "Just inland from the village of Kelo on Obi’s northern coast, Shipton and his colleagues found two caves containing prehistoric rock shelters that were suitable for excavation. With the permission and help of the local people of Kelo, they dug a small test excavation in each shelter. There they found numerous artefacts, including fragments of axes, some dating to about 14,000 years ago. The earliest axes at Kelo were made using clam shells. Axes made from clam shells from roughly the same time had also previously been found elsewhere in this region, including on the nearby island of Gebe to the northeast. As on Gebe, it is highly likely that Obi’s axes were used in the construction of canoes, thus allowing these early peoples to maintain connections between communities on neighbouring islands.",
      "The oldest cultural layers from the Kelo site provided the team with the earliest record for human occupation on Obi, dating back around 18,000 years. At this time the climate was drier and colder than today, and the island’s dense rainforests would likely have been much less impenetrable than they are now. Sea levels were about 120 metres lower, meaning Obi was a much larger island, encompassing what is today the separate island of Bisa, as well as several other small islands nearby.",
      "Roughly 11,700 years ago, as the most recent ice age ended, the climate became significantly warmer and wetter, no doubt making Obi’s jungle much thicker. According to the researchers, it is no coincidence that around this time the first axes crafted from stone rather than sea shells appear, likely in response to their heavy-duty use for clearing and modification of the increasingly dense rainforest. While stone takes about twice as long to grind into an axe compared to shell, the harder material keeps its sharp edge for longer.",
      "Judging by the bones which the researchers unearthed in the Kelo caves, people living there mainly hunted the Rothschild’s cuscus, a possum-like creature that still lives on Obi today. As the forest grew more dense, people probably used axes to clear patches of forest and make hunting easier.",
      "Shipton’s team’s excavation of the shelters at the Kelo site unearthed a volcanic glass substance called obsidian, which must have been brought over from another island, as there is no known source on Obi. It also revealed particular types of beads, similar to those previously found on islands in southern Wallacea. These finds again support the idea that Obi islanders routinely travelled to other islands.",
      "The excavations suggest people successfully lived in the two Kelo shelters for about 10,000 years. But then, about 8,000 years ago, both were abandoned. Did the residents leave Obi completely, or move elsewhere on the island? Perhaps the jungle had grown so thick that axes were no longer a match for the dense undergrowth. Perhaps people simply moved to the coast and turned to fishing rather than hunting as a means of survival.",
      "Whatever the reason for the departure, there is no evidence for use of the Kelo shelters after this time, until about 1,000 years ago, when they were re-occupied by people who owned pottery as well as items made out of gold and silver. It seems likely, in view of Obi’s location, that this final phase of occupation also saw the Kelo shelters used by people involved in the historic trade in spices between the Maluku islands and the rest of the world.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-19-test-3-part1-questions-1-7",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? Write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this. Write your answers in boxes 1–7 on your answer sheet.",
      questions: [
        { questionNumbers: [1], prompt: "Archaeological research had taken place on the island of Obi before the arrival of Ceri Shipton and his colleagues.", options: trueFalseNotGivenOptions },
        { questionNumbers: [2], prompt: "At the Kelo sites, the researchers found the first clam shell axes ever to be discovered in the region.", options: trueFalseNotGivenOptions },
        { questionNumbers: [3], prompt: "The size of Obi today is less than it was 18,000 years ago.", options: trueFalseNotGivenOptions },
        { questionNumbers: [4], prompt: "A change in the climate around 11,700 years ago had a greater impact on Obi than on the surrounding islands.", options: trueFalseNotGivenOptions },
        { questionNumbers: [5], prompt: "The researchers believe there is a connection between warmer, wetter weather and a change in the material used to make axes.", options: trueFalseNotGivenOptions },
        { questionNumbers: [6], prompt: "Shipton’s team were surprised to find evidence of the Obi islanders’ hunting practices.", options: trueFalseNotGivenOptions },
        { questionNumbers: [7], prompt: "It is thought that the Kelo shelters were occupied continuously until about 1,000 years ago.", options: trueFalseNotGivenOptions },
      ],
    },
    rawFillBlock(
      "cambridge-19-test-3-part1-questions-8-13",
      "Archaeological findings on Obi",
      "Complete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 8–13 on your answer sheet.",
      "Archaeological findings on Obi\n\nExcavations of rock shelters inside 8 ______ near the village of Kelo revealed:\n\n• axes from around 14,000 years ago, probably used to make canoes\n\n• axes made out of 9 ______, dating from around 11,700 years ago\n\n• 10 ______ of an animal: evidence of what ancient islanders ate\n\n• evidence of travel between islands:\n  – obsidian: a material that is not found naturally on Obi\n  – 11 ______ which resembled ones found on other islands.\n\nIt is thought that from 8,000 years ago, Obi islanders:\n\n• may have switched from hunting to fishing\n\n• had 12 ______ as well as items made out of metal\n\n• probably took part in the production and sale of 13 ______.",
      8,
      13,
    ),
  ],
  source: {
    passagePages: [64, 65].map(sourcePage),
    questionPages: [66, 67].map(sourcePage),
    answerPages: [sourcePage(127)],
  },
};

const wetlands: ReadingPart = {
  id: "cambridge-19-test-3-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "The global importance of wetlands",
  sections: [{
    id: "cambridge-19-test-3-part2-passage",
    format: "pre",
    paragraphs: [
      "A  Wetlands are areas where water covers the soil, or is present either at or near the surface of the soil, for all or part of the year. These are complex ecosystems, rich in unique plant and animal life. But according to the World Wide Fund for Nature (WWFN), half of the world’s wetlands have disappeared since 1990 — converted or destroyed for commercial development, drainage schemes and the extraction of minerals and peat*. Many of those that remain have been damaged by agricultural pesticides and fertilisers, industrial pollutants, and construction works.",
      "B  Throughout history, humans have gathered around wetlands, and their fertile ecosystems have played an important part in human development. Consequently, they are of considerable religious, historical and archaeological value to many communities around the world. ‘Wetlands directly support the livelihoods and well-being of millions of people,’ says Dr Matthew McCartney, principal researcher and hydrologist at the International Water Management Institute (IWMI). ‘In many developing countries, large numbers of people are dependent on wetland agriculture for their livelihoods.’",
      "C  They also serve a crucial environmental purpose. ‘Wetlands are one of the key tools in mitigating climate change across the planet,’ says Pieter van Eijk, head of Climate Adaptation at Wetlands International (WI), pointing to their use as buffers that protect coastal areas from sea-level rise and extreme weather events such as hurricanes and flooding. Wetland coastal forests provide food and water, as well as shelter from storms, and WI and other agencies are working to restore those forests which have been lost. ‘It can be as simple as planting a few trees per hectare to create shade and substantially change a microclimate,’ he says. ‘Implementing climate change projects isn’t so much about money.’",
      "D  The world’s wetlands are, unfortunately, rich sources for in-demand commodities, such as palm oil and pulpwood. Peatlands — wetlands with a waterlogged organic soil layer — are particularly targeted. When peatlands are drained for cultivation, they become net carbon emitters instead of active carbon stores, and, according to Marcel Silvius, head of Climate-smart Land-use at WI, this practice causes six per cent of all global carbon emissions. The clearance of peatlands for planting also increases the risk of forest fires, which release huge amounts of CO2. ‘We’re seeing huge peatland forests with extremely high biodiversity value being lost for a few decades of oil palm revenues,’ says Silvius.",
      "E  The damage starts when logging companies arrive to clear the trees. They dig ditches to enter the peat swamps by boat and then float the logs out the same way. These are then used to drain water out of the peatlands to allow for the planting of corn, oil palms or pulpwood trees. Once the water has drained away, bacteria and fungi then break down the carbon in the peat and turn it into CO2 and methane. Meanwhile, the remainder of the solid matter in the peat starts to move downwards, in a process known as subsidence**. Peat comprises 90 per cent water, so this is one of the most alarming consequences of peatland clearances. ‘In the tropics, peat subsides at about four centimetres a year, so within half a century, very large landscapes on Sumatra and Borneo will become flooded as the peat drops below water level,’ says Silvius. ‘It’s a huge catastrophe that’s in preparation. Some provinces will lose 40 per cent of their landmass.’",
      "F  And while these industries affect wetlands in ways that can easily be documented, Dr Dave Tickner of the WWFN believes that more subtle impacts can be even more devastating. ‘Sediment run-off and fertilisers can be pretty invisible,’ says Tickner. ‘Over-extraction of water is equally invisible. You do get shock stories about rivers running red, or even catching fire, but there’s seldom one big impact that really hurts a wetland.’ Tickner does not blame anyone for deliberate damage, however. ‘I’ve worked on wetland issues for 20 years and have never met anybody who wanted to damage a wetland,’ he says. ‘It isn’t something that people generally set out to do. Quite often, the effects simply come from people trying to make a living.’",
      "G  Silvius also acknowledges the importance of income generation. ‘It’s not that we just want to restore the biodiversity of wetlands — which we do — but we recognise there’s a need to provide an income for local people.’ This approach is supported by IWMI. ‘The idea is that people in a developing country will only protect wetlands if they value and profit from them,’ says McCartney. ‘For sustainability, it’s essential that local people are involved in wetland planning and decision making and have clear rights to use wetlands.’",
      "H  The fortunes of wetlands would be improved, Silvius suggests, if more governments recognised their long-term value. ‘Different governments have different attitudes,’ he says, and goes on to explain that some countries place a high priority on restoring wetlands, while others still deny the issue. McCartney is cautiously optimistic, however. ‘Awareness of the importance of wetlands is growing,’ he says. ‘It’s true that wetland degradation still continues at a rapid pace, but my impression is that things are slowly changing.’\n\n* Peat: a brown deposit formed by the partial decomposition of vegetation in wet acidic conditions, often cut out and dried for use as fuel.\n\n** Subsidence: the sinking of the Earth’s surface, most often caused by the removal of resources from the ground.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-19-test-3-part2-questions-14-17",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has eight paragraphs, A–H. Which paragraph contains the following information? Write the correct letter, A–H, in boxes 14–17 on your answer sheet.",
      questions: [
        { questionNumbers: [14], prompt: "A reference to the need to ensure that inhabitants of wetland regions continue to benefit from them.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [15], prompt: "The proportion of wetlands which have already been lost.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [16], prompt: "A reference to the idea that people are beginning to appreciate the value of wetlands.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [17], prompt: "A mention of the cultural significance of wetlands.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
      ],
    },
    rawFillBlock(
      "cambridge-19-test-3-part2-questions-18-22",
      "The global importance of wetlands",
      "Complete the sentences below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 18–22 on your answer sheet.",
      "18 Peatlands which have been drained begin to release 18 ______ instead of storing it.\n\n19 Once peatland areas have been cleared, 19 ______ are more likely to occur.\n\n20 Clearing peatland forests to make way for oil palm plantations destroys the 20 ______ of the local environment.\n\n21 Water is drained out of peatlands through the 21 ______ which are created by logging companies.\n\n22 Draining peatlands leads to 22 ______: a serious problem which can eventually result in coastal flooding and land loss.",
      18,
      22,
    ),
    {
      id: "cambridge-19-test-3-part2-questions-23-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following statements and the list of experts below. Match each statement with the correct expert, A–D. Write the correct letter in boxes 23–26 on your answer sheet.",
      questions: [
        { questionNumbers: [23], prompt: "Communities living in wetland regions must be included in discussions about the future of these areas.", options: [
          { letter: "A", text: "Matthew McCartney" }, { letter: "B", text: "Pieter van Eijk" }, { letter: "C", text: "Marcel Silvius" }, { letter: "D", text: "Dave Tickner" },
        ] },
        { questionNumbers: [24], prompt: "Official policies towards wetlands vary from one nation to the next.", options: [
          { letter: "A", text: "Matthew McCartney" }, { letter: "B", text: "Pieter van Eijk" }, { letter: "C", text: "Marcel Silvius" }, { letter: "D", text: "Dave Tickner" },
        ] },
        { questionNumbers: [25], prompt: "People cause harm to wetlands without having any intention to do so.", options: [
          { letter: "A", text: "Matthew McCartney" }, { letter: "B", text: "Pieter van Eijk" }, { letter: "C", text: "Marcel Silvius" }, { letter: "D", text: "Dave Tickner" },
        ] },
        { questionNumbers: [26], prompt: "Initiatives to reverse environmental damage need not be complex.", options: [
          { letter: "A", text: "Matthew McCartney" }, { letter: "B", text: "Pieter van Eijk" }, { letter: "C", text: "Marcel Silvius" }, { letter: "D", text: "Dave Tickner" },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [68, 69].map(sourcePage),
    questionPages: [70, 71].map(sourcePage),
    answerPages: [sourcePage(127)],
  },
};

const artificialSpeechTranslation: ReadingPart = {
  id: "cambridge-19-test-3-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Is the era of artificial speech translation upon us?",
  subtitle: "Once the stuff of science fiction, technology that enables people to talk using different languages is now here. But how effective is it?",
  sections: [{
    id: "cambridge-19-test-3-part3-passage",
    format: "pre",
    paragraphs: [
      "Noise, Alex Waibel tells me, is one of the major challenges that artificial speech translation has to meet. A device may be able to recognise speech in a laboratory, or a meeting room, but will struggle to cope with the kind of background noise I can hear in my office surrounding Professor Waibel as he speaks to me from Kyoto station in Japan. I’m struggling to follow him in English, on a scratchy line that reminds me we are nearly 10,000 kilometres apart — and that distance is still an obstacle to communication even if you’re speaking the same language, as we are. We haven’t reached the future yet. If we had, Waibel would have been able to speak more comfortably in his native German and I would have been able to hear his words in English.",
      "At Karlsruhe Institute of Technology, where he is a professor of computer science, Waibel and his colleagues already give lectures in German that their students can follow in English via an electronic translator. The system generates text that students can read on their laptops or phones, so the process is somewhat similar to subtitling. It helps that lecturers speak clearly, don’t have to compete with background chatter, and say much the same thing each year.",
      "The idea of artificial speech translation has been around for a long time. Douglas Adams’ science fiction novel, The Hitchhiker’s Guide to the Galaxy, published in 1979, featured a life form called the ‘Babel fish’ which, when placed in the ear, enabled a listener to understand any language in the universe. It came to represent one of those devices that technology enthusiasts dream of long before they become practically realisable, like TVs flat enough to hang on walls: objects that we once could only dream of having but that are now commonplace. Now devices that look like prototype Babel fish have started to appear, riding a wave of advances in artificial translation and voice recognition.",
      "At this stage, however, they seem to be regarded as eye-catching novelties rather than steps towards what Waibel calls ‘making a language-transparent society’. They tend to be domestic devices or applications suitable for hotel check-ins, for example, providing a practical alternative to speaking traveller’s English. The efficiency of the translator is less important than the social function. However, ‘Professionals are less inclined to be patient in a conversation,’ founder and CEO at Waverly Labs, Andrew Ochoa, observes. To redress this, Waverly is now preparing a new model for professional applications, which entails performance improvements in speech recognition, translation accuracy and the time it takes to deliver the translated speech.",
      "For a conversation, both speakers need to have devices called Pilots (translator earpieces) in their ears. ‘We find that there’s a barrier with sharing one of the earphones with a stranger,’ says Ochoa. That can’t have been totally unexpected. The problem would be solved if earpiece translators became sufficiently prevalent that strangers would be likely to already have their own in their ears. Whether that happens, and how quickly, will probably depend not so much on the earpieces themselves, but on the prevalence of voice-controlled devices and artificial translation in general.",
      "Waibel highlights the significance of certain Asian nations, noting that voice translation has really taken off in countries such as Japan with a range of systems. There is still a long way to go, though. A translation system needs to be simultaneous, like the translator’s voice speaking over the foreign politician being interviewed on the TV, rather than in sections that oblige speakers to pause after every few remarks and wait for the translation to be delivered. It needs to work offline, for situations where internet access isn’t possible, and to address apprehensions about the amount of private speech data accumulating in the cloud, having been sent to servers for processing.",
      "Systems not only need to cope with physical challenges such as noise, they will also need to be socially aware by addressing people in the right way. Some cultural traditions demand solemn respect for academic status, for example, and it is only polite to respect this. Etiquette-sensitive artificial translators could relieve people of the need to know these differing cultural norms. At the same time, they might help to preserve local customs, slowing the spread of habits associated with international English, such as its readiness to get on first-name terms.",
      "Professors and other professionals will not outsource language awareness to software, though. If the technology matures into seamless, ubiquitous artificial speech translation, it will actually add value to language skills. Whether it will help people conduct their family lives or relationships is open to question — though one noteworthy possibility is that it could overcome the language barriers that often arise between generations after migration, leaving children and their grandparents without a shared language.",
      "Whatever uses it is put to, though, it will never be as good as the real thing. Even if voice-morphing technology simulates the speaker’s voice, their lip movements won’t match, and they will look like they are in a dubbed movie. The contrast will underline the value of shared languages, and the value of learning them. Sharing a language can promote a sense of belonging and community, as with the international scientists who use English as a lingua franca, where their predecessors used Latin. Though the practical need for a common language will diminish, the social value of sharing one will persist. And software will never be a substitute for the subtle but vital understanding that comes with knowledge of a language.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-19-test-3-part3-questions-27-30",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27–30 on your answer sheet.",
      questions: [
        { questionNumbers: [27], prompt: "What does the reader learn about the conversation in the first paragraph?", options: [
          { letter: "A", text: "The speakers are communicating in different languages." },
          { letter: "B", text: "Neither of the speakers is familiar with their environment." },
          { letter: "C", text: "The topic of the conversation is difficult for both speakers." },
          { letter: "D", text: "Aspects of the conversation are challenging for both speakers." },
        ] },
        { questionNumbers: [28], prompt: "What assists the electronic translator during lectures at Karlsruhe Institute of Technology?", options: [
          { letter: "A", text: "the repeated content of lectures" },
          { letter: "B", text: "the students’ reading skills" },
          { letter: "C", text: "the languages used" },
          { letter: "D", text: "the lecturers’ technical ability" },
        ] },
        { questionNumbers: [29], prompt: "When referring to The Hitchhiker’s Guide to the Galaxy, the writer suggests that", options: [
          { letter: "A", text: "the Babel fish was considered undesirable at the time." },
          { letter: "B", text: "this book was not seriously intending to predict the future." },
          { letter: "C", text: "artificial speech translation was not a surprising development." },
          { letter: "D", text: "some speech translation techniques are better than others." },
        ] },
        { questionNumbers: [30], prompt: "What does the writer say about sharing earpieces?", options: [
          { letter: "A", text: "It is something people will get used to doing." },
          { letter: "B", text: "The reluctance to do this is understandable." },
          { letter: "C", text: "The equipment will be unnecessary in the future." },
          { letter: "D", text: "It is something few people need to worry about." },
        ] },
      ],
    },
    {
      id: "cambridge-19-test-3-part3-questions-31-34",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete each sentence with the correct ending, A–F. Write the correct letter, A–F, in boxes 31–34 on your answer sheet.",
      questions: [
        { questionNumbers: [31], prompt: "Speech translation methods are developing fast in Japan", options: [
          { letter: "A", text: "but there are concerns about this." },
          { letter: "B", text: "as systems do not need to conform to standard practices." },
          { letter: "C", text: "but they are far from perfect." },
          { letter: "D", text: "despite the noise issues." },
          { letter: "E", text: "because translation is immediate." },
          { letter: "F", text: "and have an awareness of good manners." },
        ] },
        { questionNumbers: [32], prompt: "TV interviews that use translation voiceover methods are successful", options: [
          { letter: "A", text: "but there are concerns about this." },
          { letter: "B", text: "as systems do not need to conform to standard practices." },
          { letter: "C", text: "but they are far from perfect." },
          { letter: "D", text: "despite the noise issues." },
          { letter: "E", text: "because translation is immediate." },
          { letter: "F", text: "and have an awareness of good manners." },
        ] },
        { questionNumbers: [33], prompt: "Future translation systems should address people appropriately", options: [
          { letter: "A", text: "but there are concerns about this." },
          { letter: "B", text: "as systems do not need to conform to standard practices." },
          { letter: "C", text: "but they are far from perfect." },
          { letter: "D", text: "despite the noise issues." },
          { letter: "E", text: "because translation is immediate." },
          { letter: "F", text: "and have an awareness of good manners." },
        ] },
        { questionNumbers: [34], prompt: "Users may be able to maintain their local customs", options: [
          { letter: "A", text: "but there are concerns about this." },
          { letter: "B", text: "as systems do not need to conform to standard practices." },
          { letter: "C", text: "but they are far from perfect." },
          { letter: "D", text: "despite the noise issues." },
          { letter: "E", text: "because translation is immediate." },
          { letter: "F", text: "and have an awareness of good manners." },
        ] },
      ],
    },
    {
      id: "cambridge-19-test-3-part3-questions-35-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the views of the writer in Reading Passage 3? Write YES if the statement agrees with the views of the writer, NO if the statement contradicts the views of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this. Write your answers in boxes 35–40 on your answer sheet.",
      questions: [
        { questionNumbers: [35], prompt: "Language translation systems will be seen as very useful throughout the academic and professional worlds.", options: yesNoNotGivenOptions },
        { questionNumbers: [36], prompt: "The overall value of automated translation to family life is yet to be shown.", options: yesNoNotGivenOptions },
        { questionNumbers: [37], prompt: "Automated translation could make life more difficult for immigrant families.", options: yesNoNotGivenOptions },
        { questionNumbers: [38], prompt: "Visual aspects of language translation are being considered by scientists.", options: yesNoNotGivenOptions },
        { questionNumbers: [39], prompt: "International scientists have found English easier to translate into other languages than Latin.", options: yesNoNotGivenOptions },
        { questionNumbers: [40], prompt: "As far as language is concerned, there is a difference between people’s social and practical needs.", options: yesNoNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [72, 73].map(sourcePage),
    questionPages: [74, 75, 76].map(sourcePage),
    answerPages: [sourcePage(127)],
  },
};

export const CAMBRIDGE19_TEST3_PARTS: ReadingPart[] = [prehistoricIslandSettlers, wetlands, artificialSpeechTranslation];

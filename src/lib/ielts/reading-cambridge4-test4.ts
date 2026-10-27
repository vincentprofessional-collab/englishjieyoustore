import type { ReadingOption, ReadingPart } from "./reading";

const yesNoNotGiven: ReadingOption[] = [
  { letter: "YES", text: "YES" },
  { letter: "NO", text: "NO" },
  { letter: "NOT GIVEN", text: "NOT GIVEN" },
];

const trueFalseNotGiven: ReadingOption[] = [
  { letter: "TRUE", text: "TRUE" },
  { letter: "FALSE", text: "FALSE" },
  { letter: "NOT GIVEN", text: "NOT GIVEN" },
];

const archaeologyPeople: ReadingOption[] = [
  { letter: "A", text: "It is important for government planners." },
  { letter: "B", text: "It is a continually growing field of study." },
  { letter: "C", text: "It often involves long periods of fieldwork." },
  { letter: "D", text: "It is subdivided for study purposes." },
  { letter: "E", text: "It studies human evolutionary patterns." },
];

const archaeologistTasks: ReadingOption[] = [
  { letter: "A", text: "examining ancient waste sites to investigate diet" },
  { letter: "B", text: "studying cave art to determine its significance" },
  { letter: "C", text: "deducing reasons for the shape of domestic buildings" },
  { letter: "D", text: "investigating the way different cultures make and use objects" },
  { letter: "E", text: "examining evidence for past climate changes" },
];

const archaeologyHeadings: ReadingOption[] = [
  { letter: "i", text: "The connection between health-care and other human rights" },
  { letter: "ii", text: "The development of market-based health systems" },
  { letter: "iii", text: "The role of the state in health-care" },
  { letter: "iv", text: "A problem shared by every economically developed country" },
  { letter: "v", text: "The impact of recent change" },
  { letter: "vi", text: "The views of the medical establishment" },
  { letter: "vii", text: "The end of an illusion" },
  { letter: "viii", text: "Sustainable economic development" },
];

const timeOptions: ReadingOption[] = [
  { letter: "A", text: "between 1945 and 1950" },
  { letter: "B", text: "between 1950 and 1980" },
  { letter: "C", text: "after 1980" },
];

const cambridge4Test4PartOne: ReadingPart = {
  id: "cambridge-4-test-4-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13 which are based on Reading Passage 1 below.",
  title: "How much higher? How much faster?",
  subtitle: "Limits to human sporting performance are not yet in sight",
  sections: [
    {
      id: "c4t4-p1-a",
      paragraphs: [
        "Since the early years of the twentieth century, when the International Athletic Federation began keeping records, there has been a steady improvement in how fast athletes run, how high they jump and how far they are able to hurl massive objects, themselves included, through space. For the so-called power events—that require a relatively brief, explosive release of energy, like the 100-metre sprint and the long jump—times and distances have improved ten to twenty per cent. In the endurance events the results have been more dramatic. At the 1908 Olympics, John Hayes of the U.S. team ran a marathon in a time of 2:55:18. In 1999, Morocco's Khalid Khannouchi set a new world record of 2:05:42, almost thirty per cent faster.",
      ],
    },
    {
      id: "c4t4-p1-b",
      paragraphs: [
        "No one theory can explain improvements in performance, but the most important factor has been genetics. ‘The athlete must choose his parents carefully,’ says Jesus Dapena, a sports scientist at Indiana University, invoking an oft-cited adage. Over the past century, the composition of the human gene pool has not changed appreciably, but with increasing global participation in athletics—and greater rewards to tempt athletes—it is more likely that individuals possessing the unique complement of genes for athletic performance can be identified early. ‘Was there someone like [sprinter] Michael Johnson in the 1920s?’ Dapena asks. ‘I'm sure there was, but his talent was probably never realised.’ Identifying genetically talented individuals is only the first step. Michael Yessis, an emeritus professor of Sports Science at California State University at Fullerton, maintains that ‘genetics only determines about one third of what an athlete can do. But with the right training we can go much further with that one third than we've been going.’ Yessis believes that U.S. runners, despite their impressive achievements, are ‘running on their genetics’. By applying more scientific methods, ‘they're going to go much faster’. These methods include strength training that duplicates what they are doing in their running events as well as plyometrics, a technique pioneered in the former Soviet Union.",
      ],
    },
    {
      id: "c4t4-p1-c",
      paragraphs: [
        "Whereas most exercises are designed to build up strength or endurance, plyometrics focuses on increasing power—the rate at which an athlete can expend energy. When a sprinter runs, Yessis explains, her foot stays in contact with the ground for just under a tenth of a second, half of which is devoted to landing and the other half to pushing off. Plyometric exercises help athletes make the best use of this brief interval.",
      ],
    },
    {
      id: "c4t4-p1-d",
      paragraphs: [
        "Nutrition is another area that sports trainers have failed to address adequately. ‘Many athletes are not getting the best nutrition, even through supplements,’ Yessis insists. Each activity has its own nutritional needs. Few coaches, for instance, understand how deficiencies in trace minerals can lead to injuries.",
      ],
    },
    {
      id: "c4t4-p1-e",
      paragraphs: [
        "Focused training will also play a role in enabling records to be broken. ‘If we applied the Russian training model to some of the outstanding runners we have in this country,’ Yessis asserts, ‘they would be breaking records left and right.’ He will not predict by how much, however: ‘Exactly what the limits are it's hard to say, but there will be increases even if only by hundredths of a second, as long as our training continues to improve.’",
      ],
    },
    {
      id: "c4t4-p1-f",
      paragraphs: [
        "One of the most important new methodologies is biomechanics, the study of the body in motion. A biomechanic films an athlete in action and then digitizes her performance, recording the motion of every joint and limb in three dimensions. By applying Newton's laws to these motions, ‘we can say that this athlete's run is not fast enough; that this one is not using his arms strongly enough during take-off,’ says Dapena, who uses these methods to help high jumpers. To date, however, biomechanics has made only a small difference to athletic performance.",
      ],
    },
    {
      id: "c4t4-p1-g",
      paragraphs: [
        "Revolutionary ideas still come from the athletes themselves. For example, during the 1968 Olympics in Mexico City, a relatively unknown high jumper named Dick Fosbury won the gold by going over the bar backwards, in complete contradiction of all the received high-jumping wisdom, a move instantly dubbed the Fosbury flop. Fosbury himself did not know what he was doing. That understanding took the later analysis of biomechanics specialists, who put their minds to comprehending something that was too complex and unorthodox ever to have been invented through their own mathematical simulations. Fosbury also required another element that lies behind many improvements in athletic performance: an innovation in athletic equipment. In Fosbury's case, it was the cushions that jumpers land on. Traditionally, high jumpers would land in pits filled with sawdust. But by Fosbury's time, sawdust pits had been replaced by soft foam cushions, ideal for flopping.",
      ],
    },
    {
      id: "c4t4-p1-h",
      paragraphs: [
        "In the end, most people who examine human performance are humbled by the resourcefulness of athletes and the powers of the human body. ‘Once you study athletics, you learn that it's a vexingly complex issue,’ says John S. Raglin, a sports psychologist at Indiana University. ‘Core performance is not a simple or mundane thing of higher, faster, longer. So many variables enter into the equation, and our understanding in many cases is fundamental. We've got a long way to go.’ For the foreseeable future, records will be made to be broken.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c4t4-p1-true-false",
      type: "choice",
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 1–6 on your answer sheet write TRUE if the statement agrees with the information FALSE if the statement contradicts the information NOT GIVEN if there is no information on this",
      questions: [
        { questionNumbers: [1], prompt: "Modern official athletic records date from about 1900.", options: trueFalseNotGiven },
        { questionNumbers: [2], prompt: "There was little improvement in athletic performance before the twentieth century.", options: trueFalseNotGiven },
        { questionNumbers: [3], prompt: "Performance has improved most greatly in events requiring an intensive burst of energy.", options: trueFalseNotGiven },
        { questionNumbers: [4], prompt: "Improvements in athletic performance can be fully explained by genetics.", options: trueFalseNotGiven },
        { questionNumbers: [5], prompt: "The parents of top athletes have often been successful athletes themselves.", options: trueFalseNotGiven },
        { questionNumbers: [6], prompt: "The growing international importance of athletics means that gifted athletes can be recognised at a younger age.", options: trueFalseNotGiven },
      ],
    },
    {
      id: "c4t4-p1-one-word",
      type: "fill",
      title: "",
      instruction: "Complete the sentences below with words taken from Reading Passage 1. Use ONE WORD for each answer. Write your answers in boxes 7–10 on your answer sheet.",
      questions: [
        { number: 7, before: "According to Professor Yessis, American runners are relying for their current success on" },
        { number: 8, before: "Yessis describes a training approach from the former Soviet Union that aims to develop an athlete's" },
        { number: 9, before: "Yessis links an inadequate diet to" },
        { number: 10, before: "Yessis claims that the key to setting new records is better" },
      ],
    },
    {
      id: "c4t4-p1-multiple-choice",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write your answers in boxes 11–13 on your answer sheet.",
      questions: [
        {
          questionNumbers: [11],
          prompt: "Biomechanics films are proving particularly useful because they enable trainers to",
          options: [
            { letter: "A", text: "highlight areas for improvement in athletes." },
            { letter: "B", text: "assess the fitness levels of athletes." },
            { letter: "C", text: "select top athletes." },
            { letter: "D", text: "predict the success of athletes." },
          ],
        },
        {
          questionNumbers: [12],
          prompt: "Biomechanics specialists used theoretical models to",
          options: [
            { letter: "A", text: "soften the Fosbury flop." },
            { letter: "B", text: "create the Fosbury flop." },
            { letter: "C", text: "correct the Fosbury flop." },
            { letter: "D", text: "explain the Fosbury flop." },
          ],
        },
        {
          questionNumbers: [13],
          prompt: "John S. Raglin believes our current knowledge of athletics is",
          options: [
            { letter: "A", text: "mistaken." },
            { letter: "B", text: "basic." },
            { letter: "C", text: "diverse." },
            { letter: "D", text: "theoretical." },
          ],
        },
      ],
    },
  ],
};

const cambridge4Test4PartTwo: ReadingPart = {
  id: "cambridge-4-test-4-part2",
  label: "Part 2",
  questionRange: "questions 14-27",
  intro: "You should spend about 20 minutes on Questions 14–27 which are based on Reading Passage 2 below.",
  title: "THE NATURE AND AIMS OF ARCHAEOLOGY",
  sections: [
    {
      id: "c4t4-p2-a",
      paragraphs: [
        "Archaeology is partly the discovery of the treasures of the past, partly the careful work of the scientific analyst, partly the exercise of the creative imagination. It is toiling in the sun on an excavation in the Middle East, it is working with living Inuit in the snows of Alaska, and it is investigating the sewers of Roman Britain. But it is also the painstaking task of interpretation, so that we come to understand what these things mean for the human story. And it is the conservation of the world's cultural heritage against looting and careless harm.",
      ],
    },
    {
      id: "c4t4-p2-b",
      paragraphs: [
        "Archaeology, then, is both a physical activity out in the field, and an intellectual pursuit in the study or laboratory. That is part of its great attraction. The rich mixture of danger and detective work has also made it the perfect vehicle for fiction writers and film-makers, from Agatha Christie with Murder in Mesopotamia to Stephen Spielberg with Indiana Jones. However far from reality such portrayals are, they capture the essential truth that archaeology is an exciting quest—the quest for knowledge about ourselves and our past.",
      ],
    },
    {
      id: "c4t4-p2-c",
      paragraphs: [
        "But how does archaeology relate to disciplines such as anthropology and history, that are also concerned with the human story? Is archaeology itself a science? And what are the responsibilities of the archaeologist in today's world?",
      ],
    },
    {
      id: "c4t4-p2-d",
      paragraphs: [
        "Anthropology, at its broadest, is the study of humanity—our physical characteristics as animals and our unique non-biological characteristics that we call culture. Culture in this sense includes what the anthropologist, Edward Tylor, summarised in 1871 as ‘knowledge, belief, art, morals, custom and any other capabilities and habits acquired by man as a member of society’. Anthropologists also use the term ‘culture’ in a more restricted sense when they refer to the ‘culture’ of a particular society, meaning the non-biological characteristics unique to that society, which distinguish it from other societies. Anthropology is thus a broad discipline—so broad that it is generally broken down into three smaller disciplines: physical anthropology, cultural anthropology and archaeology.",
      ],
    },
    {
      id: "c4t4-p2-e",
      paragraphs: [
        "Physical anthropology, or biological anthropology as it is also called, concerns the study of human biological or physical characteristics and how they evolved. Cultural anthropology—or social anthropology—analyses human culture and society. Two of its branches are ethnography (the study at first hand of individual living cultures) and ethnology (which sets out to compare cultures using ethnographic evidence to derive general principles about human society).",
      ],
    },
    {
      id: "c4t4-p2-f",
      paragraphs: [
        "Archaeology is the ‘past tense of cultural anthropology’. Whereas cultural anthropologists will often base their conclusions on the experience of living within contemporary communities, archaeologists study past societies primarily through their material remains—the buildings, tools, and other artefacts that constitute what is known as the material culture left over from former societies.",
      ],
    },
    {
      id: "c4t4-p2-g",
      paragraphs: [
        "Nevertheless, one of the most important tasks for the archaeologist today is to know how to interpret material culture in human terms. How were those pots used? Why are some dwellings round and others square? Here the methods of archaeology and ethnography overlap. Archaeologists in recent decades have developed ‘ethnoarchaeology’, where, like ethnographers, they live among contemporary communities, but with the specific purpose of learning how such societies use material culture—how they make their tools and weapons, why they build their settlements where they do, and so on. Moreover, archaeology has an active role to play in the field of conservation. Heritage studies constitutes a developing field, where it is realised that the world's cultural heritage is a diminishing resource which holds different meanings for different people.",
      ],
    },
    {
      id: "c4t4-p2-h",
      paragraphs: [
        "If, then, archaeology deals with the past, in what way does it differ from history? In the broadest sense, just as archaeology is an aspect of anthropology, so too is it a part of history—where we mean the whole history of humankind from its beginnings over three million years ago. Indeed, for more than ninety-nine per cent of that huge span of time, archaeology—the study of past material culture—is the only significant source of information. Conventional historical sources begin only with the introduction of written records around 3000 BC in western Asia, and much later in most other parts of the world.",
      ],
    },
    {
      id: "c4t4-p2-i",
      paragraphs: [
        "A commonly drawn distinction is between pre-history, i.e. the period before written records—and history in the narrow sense, meaning the study of the past using written evidence. To archaeology, which studies all cultures and periods, whether with or without writing, the distinction between history and pre-history is a convenient dividing line that recognises the importance of the written word, but in no way lessens the importance of the useful information contained in oral histories.",
      ],
    },
    {
      id: "c4t4-p2-j",
      paragraphs: [
        "Since the aim of archaeology is the understanding of humankind, it is a humanistic study, and since it deals with the human past, it is a historical discipline. But it differs from the study of written history in a fundamental way. The material the archaeologist finds does not tell us directly what to think. Historical records make statements, offer opinions and pass judgements. The objects the archaeologists discover, on the other hand, tell us nothing directly in themselves. In this respect, the practice of the archaeologist is rather like that of the scientist, who collects data, conducts experiments, formulates a hypothesis, tests the hypothesis against more data, and then, in conclusion, devises a model that seems best to summarise the pattern observed in the data. The archaeologist has to develop a picture of the past, just as the scientist has to develop a coherent view of the natural world.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c4t4-p2-yes-no",
      type: "choice",
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 2? In boxes 14–19 on your answer sheet write YES if the statement agrees with the claims of the writer NO if the statement contradicts the claims of the writer NOT GIVEN if it is impossible to say what the writer thinks about this",
      questions: [
        { questionNumbers: [14], prompt: "Archaeology involves creativity as well as careful investigative work.", options: yesNoNotGiven },
        { questionNumbers: [15], prompt: "Archaeologists must be able to translate texts from ancient languages.", options: yesNoNotGiven },
        { questionNumbers: [16], prompt: "Movies give a realistic picture of the work of archaeologists.", options: yesNoNotGiven },
        { questionNumbers: [17], prompt: "Anthropologists define culture in more than one way.", options: yesNoNotGiven },
        { questionNumbers: [18], prompt: "Archaeology is a more demanding field of study than anthropology.", options: yesNoNotGiven },
        { questionNumbers: [19], prompt: "The history of Europe has been documented since 3000 BC.", options: yesNoNotGiven },
      ],
    },
    {
      id: "c4t4-p2-anthropology",
      type: "choice",
      instruction: "Choose TWO letters A–E. Write your answers in boxes 20 and 21 on your answer sheet.",
      questions: [
        {
          questionNumbers: [20, 21],
          prompt: "The list below gives some statements about anthropology. Which TWO statements are mentioned by the writer of the text?",
          options: archaeologyPeople,
          selectCount: 2,
        },
      ],
    },
    {
      id: "c4t4-p2-archaeologist-tasks",
      type: "choice",
      instruction: "Choose TWO letters A–E. Write your answers in boxes 22 and 23 on your answer sheet.",
      questions: [
        {
          questionNumbers: [22, 23],
          prompt: "The list below gives some of the tasks of an archaeologist. Which TWO of these tasks are mentioned by the writer?",
          options: archaeologistTasks,
          selectCount: 2,
        },
      ],
    },
    {
      id: "c4t4-p2-summary",
      type: "fill",
      title: "",
      instruction: "Complete the summary of the last two paragraphs of Reading Passage 2. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 24–27 on your answer sheet.",
      questions: [24, 25, 26, 27].map((number) => ({ number, before: `Question ${number}` })),
      rawText: "Much of the work of archaeologists can be done using written records but they find 24 ...... equally valuable. The writer describes archaeology as both a 25 ...... and a 26 ...... . However, as archaeologists do not try to influence human behaviour, the writer compares their style of working to that of a 27 ...... .",
    },
  ],
};

const cambridge4Test4PartThree: ReadingPart = {
  id: "cambridge-4-test-4-part3",
  label: "Part 3",
  questionRange: "questions 28-40",
  intro: "You should spend about 20 minutes on Questions 28–40 which are based on Reading Passage 3 below.",
  title: "The Problem of Scarce Resources",
  sections: [
    {
      id: "c4t4-p3-a",
      heading: "Section A",
      headingQuestionNumber: 28,
      paragraphs: [
        "The problem of how health-care resources should be allocated or apportioned, so that they are distributed in both the most just and most efficient way, is not a new one. Every health system in an economically developed society is faced with the need to decide (either formally or informally) what proportion of the community's total resources should be spent on health-care; how resources are to be apportioned; what diseases and disabilities and which forms of treatment are to be given priority; which members of the community are to be given special consideration in respect of their health needs; and which forms of treatment are the most cost-effective.",
      ],
    },
    {
      id: "c4t4-p3-b",
      heading: "Section B",
      paragraphs: [
        "What is new is that, from the 1950s onwards, there have been certain general changes in outlook about the finitude of resources as a whole and of health-care resources in particular, as well as more specific changes regarding the clientele of health-care resources and the cost to the community of those resources. Thus, in the 1950s and 1960s, there emerged an awareness in Western societies that resources for the provision of fossil fuel energy were finite and exhaustible and that the capacity of nature or the environment to sustain economic development and population was also finite. In other words, we became aware of the obvious fact that there were ‘limits to growth’. The new consciousness that there were also severe limits to health-care resources was part of this general revelation of the obvious. Looking back, it now seems quite incredible that in the national health systems that emerged in many countries in the years immediately after the 1939–45 World War, it was assumed without question that all the basic health needs of any community could be satisfied, at least in principle; the ‘invisible hand’ of economic progress would provide.",
      ],
    },
    {
      id: "c4t4-p3-c",
      heading: "Section C",
      headingQuestionNumber: 29,
      paragraphs: [
        "However, at exactly the same time as this new realisation of the finite character of health-care resources was sinking in, an awareness of a contrary kind was developing in Western societies: that people have a basic right to health-care as a necessary condition of a proper human life. Like education, political and legal processes and institutions, public order, communication, transport and money supply, health-care came to be seen as one of the fundamental social facilities necessary for people to exercise their other rights as autonomous human beings. People are not in a position to exercise personal liberty and to be self-determining if they are poverty-stricken, or deprived of basic education, or do not live within a context of law and order. In the same way, basic health-care is a condition of the exercise of autonomy.",
      ],
    },
    {
      id: "c4t4-p3-d",
      heading: "Section D",
      headingQuestionNumber: 30,
      paragraphs: [
        "Although the language of ‘rights’ sometimes leads to confusion, by the late 1970s it was recognised in most societies that people have a right to health-care (though there has been considerable resistance in the United States to the idea that there is a formal right to health-care). It is also accepted that this right generates an obligation or duty for the state to ensure that adequate health-care resources are provided out of the public purse. The state has no obligation to provide a health-care system itself, but to ensure that such a system is provided. Put another way, basic health-care is now recognised as a ‘public good’, rather than a ‘private good’ that one is expected to buy for oneself. As the 1976 declaration of the World Health Organisation put it: ‘The enjoyment of the highest attainable standard of health is one of the fundamental rights of every human being without distinction of race, religion, political belief, economic or social condition.’ As has just been remarked, in a liberal society basic health is seen as one of the indispensable conditions for the exercise of personal autonomy.",
      ],
    },
    {
      id: "c4t4-p3-e",
      heading: "Section E",
      headingQuestionNumber: 31,
      paragraphs: [
        "Just at the time when it became obvious that health-care resources could not possibly meet the demands being made upon them, people were demanding that their fundamental right to health-care be satisfied by the state. The second set of more specific changes that have led to the present concern about the distribution of health-care resources stems from the dramatic rise in health costs in most OECD countries, accompanied by large-scale demographic and social changes which have meant, to take one example, that elderly people are now major (and relatively very expensive) consumers of health-care resources. Thus, in OECD countries as a whole, health costs increased from 3.8% of GDP in 1960 to 7% of GDP in 1980, and it has been predicted that the proportion of health costs to GDP will continue to increase. (In the US the current figure is about 12% of GDP, and in Australia about 7.8% of GDP.)",
        "As a consequence, during the 1980s a kind of doomsday scenario (analogous to similar doomsday extrapolations about energy needs and fossil fuels or about population increases) was projected by health administrators, economists and politicians. In this scenario, ever-rising health costs were matched against static or declining resources.",
      ],
    },
    {
      id: "c4t4-p3-footnotes",
      paragraphs: [
        "1 Organisation for Economic Cooperation and Development",
        "2 Gross Domestic Product",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c4t4-p3-headings",
      type: "headings",
      title: "List of Headings",
      instruction: "Choose the correct heading for Sections A and C–E from the list below. Section B is done for you (viii). Write the correct number i–viii in boxes 28–31 on your answer sheet.",
      questionNumbers: [28, 29, 30, 31],
      options: archaeologyHeadings.map(({ letter, text }) => ({ id: letter, text: `${letter}  ${text}` })),
    },
    {
      id: "c4t4-p3-time-classification",
      type: "choice",
      sharedOptions: true,
      instruction: "Classify the following as first occurring. Write the correct letter A, B or C in boxes 32–35 on your answer sheet.",
      questions: [
        { questionNumbers: [32], prompt: "the realisation that the resources of the national health systems were limited", options: timeOptions },
        { questionNumbers: [33], prompt: "a sharp rise in the cost of health-care", options: timeOptions },
        { questionNumbers: [34], prompt: "a belief that all the health-care resources the community needed would be produced by economic growth", options: timeOptions },
        { questionNumbers: [35], prompt: "an acceptance of the role of the state in guaranteeing the provision of health-care", options: timeOptions },
      ],
    },
    {
      id: "c4t4-p3-yes-no",
      type: "choice",
      instruction: "Do the following statements agree with the views of the writer in Reading Passage 3? In boxes 36–40 on your answer sheet write YES if the statement agrees with the views of the writer NO if the statement contradicts the views of the writer NOT GIVEN if it is impossible to say what the writer thinks about this",
      questions: [
        { questionNumbers: [36], prompt: "Personal liberty and independence have never been regarded as directly linked to health-care.", options: yesNoNotGiven },
        { questionNumbers: [37], prompt: "Health-care came to be seen as a right at about the same time that the limits of health-care resources became evident.", options: yesNoNotGiven },
        { questionNumbers: [38], prompt: "In OECD countries population changes have had an impact on health-care costs in recent years.", options: yesNoNotGiven },
        { questionNumbers: [39], prompt: "OECD governments have consistently underestimated the level of health-care provision needed.", options: yesNoNotGiven },
        { questionNumbers: [40], prompt: "In most economically developed countries the elderly will have to make special provision for their health-care in the future.", options: yesNoNotGiven },
      ],
    },
  ],
};

export const CAMBRIDGE4_TEST4_PARTS: ReadingPart[] = [
  cambridge4Test4PartOne,
  cambridge4Test4PartTwo,
  cambridge4Test4PartThree,
];

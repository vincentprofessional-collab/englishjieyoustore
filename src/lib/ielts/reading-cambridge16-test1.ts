import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  16: [1750, 2299], 17: [1750, 2299], 18: [1750, 2299], 19: [1750, 2299],
  20: [1750, 2299], 21: [1750, 2299], 22: [1750, 2299], 23: [1750, 2299],
  24: [1750, 2299], 25: [1750, 2299], 26: [1750, 2299], 27: [1750, 2299],
  28: [1750, 2299], 122: [1750, 1714],
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
    28: 1864, 29: 2281, 30: 2275, 31: 2284, 32: 2275, 33: 2284,
    39: 543, 40: 2281, 41: 2287, 42: 2281, 43: 2287, 44: 2280, 45: 2288,
    51: 852, 52: 2282, 53: 2289, 54: 2285, 55: 2291, 56: 2282,
    57: 2291, 58: 2284, 59: 2291,
  };
  return {
    page,
    src: "/reading/explanations/cambridge-16-test-1-part" + part + "-exp16-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2280,
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

const polarBear: ReadingPart = {
  id: "cambridge-16-test-1-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Why we need to protect polar bears",
  sections: [{
    id: "cambridge-16-test-1-part1-passage",
    format: "pre",
    paragraphs: [
      "Polar bears are being increasingly threatened by the effects of climate change, but their disappearance could have far-reaching consequences. They are uniquely adapted to the extreme conditions of the Arctic Circle, where temperatures can reach −40°C. One reason for this is that they have up to 11 centimetres of fat underneath their skin. Humans with comparative levels of adipose tissue would be considered obese and would be likely to suffer from diabetes and heart disease. Yet the polar bear experiences no such consequences.",
      "A 2014 study by Shi Ping Liu and colleagues sheds light on this mystery. They compared the genetic structure of polar bears with that of their closest relatives from a warmer climate, the brown bears. This allowed them to determine the genes that have allowed polar bears to survive in one of the toughest environments on Earth. Liu and his colleagues found the polar bears had a gene known as APOB, which reduces levels of low-density lipoproteins (LDLs) — a form of ‘bad’ cholesterol. In humans, mutations of this gene are associated with increased risk of heart disease. Polar bears may therefore be an important study model to understand heart disease in humans.",
      "The genome of the polar bear may also provide the solution for another condition, one that particularly affects our older generation: osteoporosis. This is a disease where bones show reduced density, usually caused by insufficient exercise, reduced calcium intake or food starvation. Bone tissue is constantly being remodelled, meaning that bone is added or removed, depending on nutrient availability and the stress that the bone is under. Female polar bears, however, undergo extreme conditions during every pregnancy. Once autumn comes around, these females will dig maternity dens in the snow and will remain there throughout the winter, both before and after the birth of their cubs. This process results in about six months of fasting, where the female bears have to keep themselves and their cubs alive, depleting their own calcium and calorie reserves. Despite this, their bones remain strong and dense.",
      "Physiologists Alanda Lennox and Allen Goodship found an explanation for this paradox in 2008. They discovered that pregnant bears were able to increase the density of their bones before they started to build their dens. In addition, six months later, when they finally emerged from the den with their cubs, there was no evidence of significant loss of bone density. Hibernating brown bears do not have this capacity and must therefore resort to major bone reformation in the following spring. If the mechanism of bone remodelling in polar bears can be understood, many bedridden humans, and even astronauts, could potentially benefit.",
      "The medical benefits of the polar bear for humanity certainly have their importance in our conservation efforts, but these should not be the only factors taken into consideration. We tend to want to protect animals we think are intelligent and possess emotions, such as elephants and primates. Bears, on the other hand, seem to be perceived as stupid and in many cases violent. And yet anecdotal evidence from the field challenges those assumptions, suggesting for example that polar bears have good problem-solving abilities. A male bear called GoGo in Tennoji Zoo, Osaka, has even been observed making use of a tool to manipulate his environment. The bear used a tree branch on multiple occasions to dislodge a piece of meat hung out of his reach. Problem-solving ability has also been witnessed in wild polar bears, although not as obviously as with GoGo. A calculated move by a male bear involved running and jumping onto barrels in an attempt to get to a photographer standing on a platform four metres high.",
      "In other studies, such as one by Alison Ames in 2008, polar bears showed deliberate and focused manipulation. For example, Ames observed bears putting objects in piles and then knocking them over in what appeared to be a game. The study demonstrates that bears are capable of agile and thought-out behaviours. These examples suggest bears have greater creativity and problem-solving abilities than previously thought.",
      "As for emotions, while the evidence is once again anecdotal, many bears have been seen to hit out at ice and snow — seemingly out of frustration — when they have just missed out on a kill. Moreover, polar bears can form unusual relationships with other species, including playing with the dogs used to pull sleds in the Arctic. Remarkably, one hand-raised polar bear called Agee has formed a close relationship with her owner Mark Dumas to the point where they even swim together. This is even more astonishing since polar bears are known to actively hunt humans in the wild.",
      "If climate change were to lead to their extinction, this would mean not only the loss of potential breakthroughs in human medicine, but more importantly, the disappearance of an intelligent, majestic animal.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-16-test-1-part1-questions-1-7",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 1–7 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [1], prompt: "Polar bears suffer from various health problems due to the build-up of fat under their skin.", options: trueFalseNotGivenOptions },
        { questionNumbers: [2], prompt: "The study done by Liu and his colleagues compared different groups of polar bears.", options: trueFalseNotGivenOptions },
        { questionNumbers: [3], prompt: "Liu and colleagues were the first researchers to compare polar bears and brown bears genetically.", options: trueFalseNotGivenOptions },
        { questionNumbers: [4], prompt: "Polar bears are able to control their levels of ‘bad’ cholesterol by genetic means.", options: trueFalseNotGivenOptions },
        { questionNumbers: [5], prompt: "Female polar bears are able to survive for about six months without food.", options: trueFalseNotGivenOptions },
        { questionNumbers: [6], prompt: "It was found that the bones of female polar bears were very weak when they came out of their dens in spring.", options: trueFalseNotGivenOptions },
        { questionNumbers: [7], prompt: "The polar bear’s mechanism for increasing bone density could also be used by people one day.", options: trueFalseNotGivenOptions },
      ],
    },
    rawFillBlock(
      "cambridge-16-test-1-part1-questions-8-13",
      "Reasons why polar bears should be protected",
      "Complete the table below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 8–13 on your answer sheet.",
      "Reasons why polar bears should be protected\n\nPeople think of bears as unintelligent and 8 ______. However, this may not be correct. For example:\n\n• In Tennoji Zoo, a bear has been seen using a branch as a 9 ______. This allowed him to knock down some 10 ______.\n\n• A wild polar bear worked out a method of reaching a platform where a 11 ______ was located.\n\n• Polar bears have displayed behaviour such as conscious manipulation of objects and activity similar to a 12 ______.\n\nBears may also display emotions. For example:\n\n• They may make movements suggesting 13 ______ if disappointed when hunting.\n\n• They may form relationships with other species.",
      8,
      13,
    ),
  ],
  source: {
    passagePages: [16, 17].map(sourcePage),
    questionPages: [18, 19].map(sourcePage),
    answerPages: [sourcePage(122)],
    explanationPages: [28, 29, 30, 31, 32, 33].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集16精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const stepPyramid: ReadingPart = {
  id: "cambridge-16-test-1-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "The Step Pyramid of Djoser",
  sections: [
    {
      id: "cambridge-16-test-1-part2-section-a",
      heading: "A",
      format: "pre",
      paragraphs: ["The pyramids are the most famous monuments of ancient Egypt and still hold enormous interest for people in the present day. These grand, impressive tributes to the memory of the Egyptian kings have become linked with the country even though other cultures, such as the Chinese and Mayan, also built pyramids. The evolution of the pyramid form has been written and argued about for centuries. However, there is no question that, as far as Egypt is concerned, it began with one monument to one king designed by one brilliant architect: the Step Pyramid of Djoser at Saqqara."],
    },
    {
      id: "cambridge-16-test-1-part2-section-b",
      heading: "B",
      format: "pre",
      paragraphs: ["Djoser was the first king of the Third Dynasty of Egypt and the first to build in stone. Prior to Djoser’s reign, tombs were rectangular monuments made of dried clay brick, which covered underground passages where the deceased person was buried. For reasons which remain unclear, Djoser’s main official, whose name was Imhotep, conceived of building a taller, more impressive tomb for his king by stacking stone slabs on top of one another, progressively making them smaller, to form the shape now known as the Step Pyramid. Djoser is thought to have reigned for 19 years, but some historians and scholars attribute a much longer time for his rule, owing to the number and size of the monuments he built."],
    },
    {
      id: "cambridge-16-test-1-part2-section-c",
      heading: "C",
      format: "pre",
      paragraphs: ["The Step Pyramid has been thoroughly examined and investigated over the last century, and it is now known that the building process went through many different stages. Historian Marc Van de Mieroop comments on this, writing ‘Much experimentation was involved, which is especially clear in the construction of the pyramid in the center of the complex. It had several plans ... before it became the first Step Pyramid in history, piling six levels on top of one another ... The weight of the enormous mass was a challenge for the builders, who placed the stones at an inward incline in order to prevent the monument breaking up.’"],
    },
    {
      id: "cambridge-16-test-1-part2-section-d",
      heading: "D",
      format: "pre",
      paragraphs: ["When finally completed, the Step Pyramid rose 62 meters high and was the tallest structure of its time. The complex in which it was built was the size of a city in ancient Egypt and included a temple, courtyards, shrines, and living quarters for the priests. It covered a region of 16 hectares and was surrounded by a wall 10.5 meters high. The wall had 13 false doors cut into it with only one true entrance cut into the south-east corner; the entire wall was then ringed by a trench 750 meters long and 40 meters wide. The false doors and the trench were incorporated into the complex to discourage unwanted visitors. If someone wished to enter, he or she would have needed to know in advance how to find the location of the true opening in the wall. Djoser was so proud of his accomplishment that he broke the tradition of having only his own name on the monument and had Imhotep’s name carved on it as well."],
    },
    {
      id: "cambridge-16-test-1-part2-section-e",
      heading: "E",
      format: "pre",
      paragraphs: ["The burial chamber of the tomb, where the king’s body was laid to rest, was dug beneath the base of the pyramid, surrounded by a vast maze of long tunnels that had rooms off them to discourage robbers. One of the most mysterious discoveries found inside the pyramid was a large number of stone vessels. Over 40,000 of these vessels, of various forms and shapes, were discovered in storerooms off the pyramid’s underground passages. They are inscribed with the names of rulers from the First and Second Dynasties of Egypt and made from different kinds of stone. There is no agreement among scholars and archaeologists on why the vessels were placed in the tomb of Djoser or what they were supposed to represent. The archaeologist Jean-Philippe Lauer, who excavated most of the pyramid and complex, believes they were originally stored and then given a ‘proper burial’ by Djoser in his pyramid to honor his predecessors. There are other historians, however, who claim the vessels were dumped into the shafts as yet another attempt to prevent grave robbers from getting to the king’s burial chamber."],
    },
    {
      id: "cambridge-16-test-1-part2-section-f",
      heading: "F",
      format: "pre",
      paragraphs: ["Unfortunately, all of the precautions and intricate design of the underground network did not prevent ancient robbers from finding a way in. Djoser’s grave goods, and even his body, were stolen at some point in the past and all archaeologists found were a small number of his valuables overlooked by the thieves. There was enough left throughout the pyramid and its complex, however, to astonish and amaze the archaeologists who excavated it."],
    },
    {
      id: "cambridge-16-test-1-part2-section-g",
      heading: "G",
      format: "pre",
      paragraphs: ["Egyptologist Miroslav Verner writes, ‘Few monuments hold a place in human history as significant as that of the Step Pyramid in Saqqara ... It can be said without exaggeration that this pyramid complex constitutes a milestone in the evolution of monumental stone architecture in Egypt and in the world as a whole.’ The Step Pyramid was a revolutionary advance in architecture and became the archetype which all the other great pyramid builders of Egypt would follow."],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-16-test-1-part2-headings-14-20",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 2 has seven paragraphs, A–G. Choose the correct heading for each paragraph from the list of headings below. Write the correct number, i–ix, in boxes 14–20 on your answer sheet.",
      questionNumbers: [14, 15, 16, 17, 18, 19, 20],
      options: [
        { id: "i", text: "The areas and artefacts within the pyramid itself" },
        { id: "ii", text: "A difficult task for those involved" },
        { id: "iii", text: "A king who saved his people" },
        { id: "iv", text: "A single certainty among other less definite facts" },
        { id: "v", text: "An overview of the external buildings and areas" },
        { id: "vi", text: "A pyramid design that others copied" },
        { id: "vii", text: "An idea for changing the design of burial structures" },
        { id: "viii", text: "An incredible experience despite the few remains" },
        { id: "ix", text: "The answers to some unexpected questions" },
      ],
    },
    rawFillBlock(
      "cambridge-16-test-1-part2-questions-21-24",
      "The Step Pyramid of Djoser",
      "Complete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 21–24 on your answer sheet.",
      "The Step Pyramid of Djoser\n\nThe complex that includes the Step Pyramid and its surroundings is considered to be as big as an Egyptian 21 ______ of the past. The area outside the pyramid included accommodation that was occupied by 22 ______, along with many other buildings and features.\n\nA wall ran around the outside of the complex and a number of false entrances were built into this. In addition, a long 23 ______ encircled the wall. As a result, any visitors who had not been invited were cleverly prevented from entering the pyramid grounds unless they knew the 24 ______ of the real entrance.",
      21,
      24,
    ),
    {
      id: "cambridge-16-test-1-part2-questions-25-26",
      type: "choice",
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 25 and 26 on your answer sheet.",
      questions: [{
        questionNumbers: [25, 26],
        selectCount: 2,
        prompt: "Which TWO of the following points does the writer make about King Djoser?",
        options: [
          { letter: "A", text: "Initially he had to be persuaded to build in stone rather than clay." },
          { letter: "B", text: "There is disagreement concerning the length of his reign." },
          { letter: "C", text: "He failed to appreciate Imhotep’s part in the design of the Step Pyramid." },
          { letter: "D", text: "A few of his possessions were still in his tomb when archaeologists found it." },
          { letter: "E", text: "He criticised the design and construction of other pyramids in Egypt." },
        ],
      }],
    },
  ],
  source: {
    passagePages: [21, 22].map(sourcePage),
    questionPages: [20, 23].map(sourcePage),
    answerPages: [sourcePage(122)],
    explanationPages: [39, 40, 41, 42, 43, 44, 45].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集16精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const futureOfWork: ReadingPart = {
  id: "cambridge-16-test-1-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "The future of work",
  sections: [{
    id: "cambridge-16-test-1-part3-passage",
    format: "pre",
    paragraphs: [
      "According to a leading business consultancy, 3–14% of the global workforce will need to switch to a different occupation within the next 10–15 years, and all workers will need to adapt as their occupations evolve alongside increasingly capable machines. Automation — or ‘embodied artificial intelligence’ (AI) — is one aspect of the disruptive effects of technology on the labour market. ‘Disembodied AI’, like the algorithms running in our smartphones, is another.",
      "Dr Stella Pachidi from Cambridge Judge Business School believes that some of the most fundamental changes are happening as a result of the ‘algorithmication’ of jobs that are dependent on data rather than on production — the so-called knowledge economy. Algorithms are capable of learning from data to undertake tasks that previously needed human judgement, such as reading legal contracts, analysing medical scans and gathering market intelligence.",
      "‘In many cases, they can outperform humans,’ says Pachidi. ‘Organisations are attracted to using algorithms because they want to make choices based on what they consider is “perfect information”, as well as to reduce costs and enhance productivity.’",
      "‘But these enhancements are not without consequences,’ says Pachidi. ‘If routine cognitive tasks are taken over by AI, how do professions develop their future experts?’ she asks. ‘One way of learning about a job is “legitimate peripheral participation” — a novice stands next to experts and learns by observation. If this isn’t happening, then you need to find new ways to learn.’",
      "Another issue is the extent to which the technology influences or even controls the workforce. For over two years, Pachidi monitored a telecommunications company. ‘The way telecoms salespeople work is through personal and frequent contact with clients, using the benefit of experience to assess a situation and reach a decision. However, the company had started using an ... algorithm that defined when account managers should contact certain customers about which kinds of campaigns and what to offer them.’",
      "The algorithm — usually built by external designers — often becomes the keeper of knowledge, she explains. In cases like this, Pachidi believes, a short-sighted view begins to creep into working practices whereby workers learn through the ‘algorithm’s eyes’ and become dependent on its instructions. Alternative explorations — where experimentation and human instinct lead to progress and new ideas — are effectively discouraged.",
      "Pachidi and colleagues even observed people developing strategies to make the algorithm work to their own advantage. ‘We are seeing cases where workers feed the algorithm with false data to reach their targets,’ she reports.",
      "It’s scenarios like these that many researchers are working to avoid. Their objective is to make AI technologies more trustworthy and transparent, so that organisations and individuals understand how AI decisions are made. In the meantime, says Pachidi, ‘We need to make sure we fully understand the dilemmas that this new world raises regarding expertise, occupational boundaries and control.’",
      "Economist Professor Hamish Low believes that the future of work will involve major transitions across the whole life course for everyone: ‘The traditional trajectory of full-time education followed by full-time work followed by a pensioned retirement is a thing of the past,’ says Low. Instead, he envisages a multistage employment life: one where retraining happens across the life course, and where multiple jobs and no job happen by choice at different stages.",
      "On the subject of job losses, Low believes the predictions are founded on a fallacy: ‘It assumes that the number of jobs is fixed. If in 30 years, half of 100 jobs are being carried out by robots, that doesn’t mean we are left with just 50 jobs for humans. The number of jobs will increase: we would expect there to be 150 jobs.’",
      "Dr Ewan McGaughey, at Cambridge’s Centre for Business Research and King’s College London, agrees that ‘apocalyptic’ views about the future of work are misguided. ‘It’s the laws that restrict the supply of capital to the job market, not the advent of new technologies that causes unemployment.’",
      "His recently published research answers the question of whether automation, AI and robotics will mean a ‘jobless future’ by looking at the causes of unemployment. ‘History is clear that change can mean redundancies. But social policies can tackle this through retraining and redeployment.’",
      "He adds: ‘If there is going to be change to jobs as a result of AI and robotics then I’d like to see governments seizing the opportunity to improve policy to enforce good job security. We can “reprogramme” the law to prepare for a fairer future of work and leisure.’ McGaughey’s findings are a call to arms to leaders of organisations, governments and banks to pre-empt the coming changes with bold new policies that guarantee full employment, fair incomes and a thriving economic democracy.",
      "‘The promises of these new technologies are astounding. They deliver humankind the capacity to live in a way that nobody could have once imagined,’ he adds. ‘Just as the industrial revolution brought people past subsistence agriculture, and the corporate revolution enabled mass production, a third revolution has been pronounced. But it will not only be one of technology. The next revolution will be social.’",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-16-test-1-part3-questions-27-30",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27–30 on your answer sheet.",
      questions: [
        {
          questionNumbers: [27],
          prompt: "The first paragraph tells us about",
          options: [
            { letter: "A", text: "the kinds of jobs that will be most affected by the growth of AI." },
            { letter: "B", text: "the extent to which AI will alter the nature of the work that people do." },
            { letter: "C", text: "the proportion of the world’s labour force who will have jobs in AI in the future." },
            { letter: "D", text: "the difference between ways that embodied and disembodied AI will impact on workers." },
          ],
        },
        {
          questionNumbers: [28],
          prompt: "According to the second paragraph, what is Stella Pachidi’s view of the ‘knowledge economy’?",
          options: [
            { letter: "A", text: "It is having an influence on the number of jobs available." },
            { letter: "B", text: "It is changing people’s attitudes towards their occupations." },
            { letter: "C", text: "It is the main reason why the production sector is declining." },
            { letter: "D", text: "It is a key factor driving current developments in the workplace." },
          ],
        },
        {
          questionNumbers: [29],
          prompt: "What did Pachidi observe at the telecommunications company?",
          options: [
            { letter: "A", text: "Staff disagreeing with the recommendations of AI." },
            { letter: "B", text: "Staff feeling resentful about the intrusion of AI in their work." },
            { letter: "C", text: "Staff making sure that AI produces the results that they want." },
            { letter: "D", text: "Staff allowing AI to carry out tasks they ought to do themselves." },
          ],
        },
        {
          questionNumbers: [30],
          prompt: "In his recently published research, Ewan McGaughey",
          options: [
            { letter: "A", text: "challenges the idea that redundancy is a negative thing." },
            { letter: "B", text: "shows the profound effect of mass unemployment on society." },
            { letter: "C", text: "highlights some differences between past and future job losses." },
            { letter: "D", text: "illustrates how changes in the job market can be successfully handled." },
          ],
        },
      ],
    },
    {
      id: "cambridge-16-test-1-part3-questions-31-34",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary using the list of words, A–G, below. Write the correct letter, A–G, in boxes 31–34 on your answer sheet.",
      questions: [
        {
          questionNumbers: [31],
          prompt: "Stella Pachidi has been focusing on the ‘algorithmication’ of jobs which rely not on production but on …",
          options: [
            { letter: "A", text: "pressure" }, { letter: "B", text: "satisfaction" }, { letter: "C", text: "intuition" },
            { letter: "D", text: "promotion" }, { letter: "E", text: "reliance" }, { letter: "F", text: "confidence" },
            { letter: "G", text: "information" },
          ],
        },
        {
          questionNumbers: [32],
          prompt: "While monitoring a telecommunications company, Pachidi observed a growing … on the recommendations made by AI, as workers begin to learn through the ‘algorithm’s eyes’.",
          options: [
            { letter: "A", text: "pressure" }, { letter: "B", text: "satisfaction" }, { letter: "C", text: "intuition" },
            { letter: "D", text: "promotion" }, { letter: "E", text: "reliance" }, { letter: "F", text: "confidence" },
            { letter: "G", text: "information" },
          ],
        },
        {
          questionNumbers: [33],
          prompt: "Staff are deterred from experimenting and using their own …, and are therefore prevented from achieving innovation.",
          options: [
            { letter: "A", text: "pressure" }, { letter: "B", text: "satisfaction" }, { letter: "C", text: "intuition" },
            { letter: "D", text: "promotion" }, { letter: "E", text: "reliance" }, { letter: "F", text: "confidence" },
            { letter: "G", text: "information" },
          ],
        },
        {
          questionNumbers: [34],
          prompt: "Researchers are trying to make AI’s decision-making process easier to comprehend, and to increase users’ … with regard to the technology.",
          options: [
            { letter: "A", text: "pressure" }, { letter: "B", text: "satisfaction" }, { letter: "C", text: "intuition" },
            { letter: "D", text: "promotion" }, { letter: "E", text: "reliance" }, { letter: "F", text: "confidence" },
            { letter: "G", text: "information" },
          ],
        },
      ],
    },
    {
      id: "cambridge-16-test-1-part3-questions-35-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following statements (Questions 35–40) and the list of people below. Match each statement with the correct person, A, B or C. Write the correct letter in boxes 35–40 on your answer sheet. NB You may use any letter more than once.",
      questions: [
        { questionNumbers: [35], prompt: "Greater levels of automation will not result in lower employment.", options: [
          { letter: "A", text: "Stella Pachidi" }, { letter: "B", text: "Hamish Low" }, { letter: "C", text: "Ewan McGaughey" },
        ] },
        { questionNumbers: [36], prompt: "There are several reasons why AI is appealing to businesses.", options: [
          { letter: "A", text: "Stella Pachidi" }, { letter: "B", text: "Hamish Low" }, { letter: "C", text: "Ewan McGaughey" },
        ] },
        { questionNumbers: [37], prompt: "AI’s potential to transform people’s lives has parallels with major cultural shifts which occurred in previous eras.", options: [
          { letter: "A", text: "Stella Pachidi" }, { letter: "B", text: "Hamish Low" }, { letter: "C", text: "Ewan McGaughey" },
        ] },
        { questionNumbers: [38], prompt: "It is important to be aware of the range of problems that AI causes.", options: [
          { letter: "A", text: "Stella Pachidi" }, { letter: "B", text: "Hamish Low" }, { letter: "C", text: "Ewan McGaughey" },
        ] },
        { questionNumbers: [39], prompt: "People are going to follow a less conventional career path than in the past.", options: [
          { letter: "A", text: "Stella Pachidi" }, { letter: "B", text: "Hamish Low" }, { letter: "C", text: "Ewan McGaughey" },
        ] },
        { questionNumbers: [40], prompt: "Authorities should take measures to ensure that there will be adequately paid work for everyone.", options: [
          { letter: "A", text: "Stella Pachidi" }, { letter: "B", text: "Hamish Low" }, { letter: "C", text: "Ewan McGaughey" },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [24, 25].map(sourcePage),
    questionPages: [26, 27, 28].map(sourcePage),
    answerPages: [sourcePage(122)],
    explanationPages: [51, 52, 53, 54, 55, 56, 57, 58, 59].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集16精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE16_TEST1_PARTS: ReadingPart[] = [polarBear, stepPyramid, futureOfWork];

import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  39: [1507, 2237], 40: [1580, 2323], 41: [1585, 2328], 42: [1517, 2323],
  43: [1522, 2236], 44: [1515, 2328], 45: [1650, 2237], 46: [1514, 2237],
  47: [1646, 2236], 48: [1517, 2236], 49: [1652, 2237], 50: [1565, 2323],
  123: [1624, 1471],
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
  const heights: Record<number, number> = { 75: 2020, 84: 555, 94: 786 };
  return {
    page,
    src: "/reading/explanations/cambridge-14-test-2-part" + part + "-exp14-p" + String(page).padStart(3, "0") + ".webp",
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

const henderson: ReadingPart = {
  id: "cambridge-14-test-2-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Alexander Henderson (1831-1913)",
  subtitle: "Born in Scotland, Henderson emigrated to Canada in 1855 and became a well-known landscape photographer",
  sections: [{
    id: "cambridge-14-test-2-part1-passage",
    format: "pre",
    paragraphs: [
      "Alexander Henderson was born in Scotland in 1831 and was the son of a successful merchant. His grandfather, also called Alexander, had founded the family business, and later became the first chairman of the National Bank of Scotland. The family had extensive landholdings in Scotland. Besides its residence in Edinburgh, it owned Press Estate, 650 acres of farmland about 35 miles southeast of the city. The family often stayed at Press Castle, the large mansion on the northern edge of the property, and Alexander spent much of his childhood in the area, playing on the beach near Eyemouth or fishing in the streams nearby.",
      "Even after he went to school at Murcheston Academy on the outskirts of Edinburgh, Henderson returned to Press at weekends. In 1849 he began a three-year apprenticeship to become an accountant. Although he never liked the prospect of a business career, he stayed with it to please his family. In October 1855, however, he emigrated to Canada with his wife Agnes Elder Robertson and they settled in Montreal.",
      "Henderson learned photography in Montreal around the year 1857 and quickly took it up as a serious amateur. He became a personal friend and colleague of the Scottish-Canadian photographer William Notman. The two men made a photographic excursion to Niagara Falls in 1860 and they cooperated on experiments with magnesium flares as a source of artificial light in 1865. They belonged to the same societies and were among the founding members of the Art Association of Montreal. Henderson acted as chairman of the association’s first meeting, which was held in Notman’s studio on 11 January 1860.",
      "In spite of their friendship, their styles of photography were quite different. While Notman’s landscapes were noted for their bold realism, Henderson for the first 20 years of his career produced romantic images, showing the strong influence of the British landscape tradition. His artistic and technical progress was rapid and in 1865 he published his first major collection of landscape photographs. The publication had limited circulation (only seven copies have ever been found), and was called Canadian Views and Studies. The contents of each copy vary significantly and have proved a useful source for evaluating Henderson’s early work.",
      "This text is taken, for the most part, verbatim from the Dictionary of Canadian Biography Volume XIV (1911–1920). For design purposes, quotation marks have been omitted. Source: http://www.biographi.ca/en/bio/henderson_alexander_1831_1913_14E.html. Reproduced with permission.",
      "In 1866, he gave up his business to open a photographic studio, advertising himself as a portrait and landscape photographer. From about 1870 he dropped portraiture to specialize in landscape photography and other views. His numerous photographs of city life revealed in street scenes, houses, and markets are alive with human activity, and although his favourite subject was landscape he usually composed his scenes around such human pursuits as farming the land, cutting ice on a river, or sailing down a woodland stream. There was sufficient demand for these types of scenes and others he took depicting the lumber trade, steamboats and waterfalls to enable him to make a living. There was little competing hobby or amateur photography before the late 1880s because of the time-consuming techniques involved and the weight of the equipment. People wanted to buy photographs as souvenirs of a trip or as gifts, and catering to this market, Henderson had stock photographs on display at his studio for mounting, framing, or inclusion in albums.",
      "Henderson frequently exhibited his photographs in Montreal and abroad, in London, Edinburgh, Dublin, Paris, New York, and Philadelphia. He met with greater success in 1877 and 1878 in New York when he won first prizes in the exhibition held by E and H T Anthony and Company for landscapes using the Lambertype process. In 1878 his work won second prize at the world exhibition in Paris.",
      "In the 1870s and 1880s Henderson travelled widely throughout Quebec and Ontario, in Canada, documenting the major cities of the two provinces and many of the villages in Quebec. He was especially fond of the wilderness and often travelled by canoe on the Blanche, du Liévre, and other noted eastern rivers. He went on several occasions to the Maritimes and in 1872 he sailed by yacht along the lower north shore of the St Lawrence River. That same year, while in the lower St Lawrence River region, he took some photographs of the construction of the Intercolonial Railway. This undertaking led in 1875 to a commission from the railway to record the principal structures along the almost-completed line connecting Montreal to Halifax. Commissions from other railways followed. In 1876 he photographed bridges on the Quebec, Montreal, Ottawa and Occidental Railway between Montreal and Ottawa. In 1885 he went west along the Canadian Pacific Railway (CPR) as far as Rogers Pass in British Columbia, where he took photographs of the mountains and the progress of construction.",
      "In 1892 Henderson accepted a full-time position with the CPR as manager of a photographic department which he was to set up and administer. His duties included spending four months in the field each year. That summer he made his second trip west, photographing extensively along the railway line as far as Victoria. He continued in this post until 1897, when he retired completely from photography.",
      "When Henderson died in 1913, his huge collection of glass negatives was stored in the basement of his house. Today collections of his work are held at the National Archives of Canada, Ottawa, and the McCord Museum of Canadian History, Montreal.",
      "This text is taken, for the most part, verbatim from the Dictionary of Canadian Biography Volume XIV (1911–1920). For design purposes, quotation marks have been omitted. Source: http://www.biographi.ca/en/bio/henderson_alexander_1831_1913_14E.html. Reproduced with permission.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-14-test-2-part1-questions-1-8",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 1–8 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [1], prompt: "Henderson rarely visited the area around Press Estate when he was younger.", options: judgmentOptions },
        { questionNumbers: [2], prompt: "Henderson pursued a business career because it was what his family wanted.", options: judgmentOptions },
        { questionNumbers: [3], prompt: "Henderson and Notman were surprised by the results of their 1865 experiment.", options: judgmentOptions },
        { questionNumbers: [4], prompt: "There were many similarities between Henderson’s early landscapes and those of Notman.", options: judgmentOptions },
        { questionNumbers: [5], prompt: "The studio that Henderson opened in 1866 was close to his home.", options: judgmentOptions },
        { questionNumbers: [6], prompt: "Henderson gave up portraiture so that he could focus on taking photographs of scenery.", options: judgmentOptions },
        { questionNumbers: [7], prompt: "When Henderson began work for the Intercolonial Railway, the Montreal to Halifax line had been finished.", options: judgmentOptions },
        { questionNumbers: [8], prompt: "Henderson’s last work as a photographer was with the Canadian Pacific Railway.", options: judgmentOptions },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-14-test-2-part1-questions-9-13",
        "Alexander Henderson",
        "Questions 9–13\nComplete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 9–13 on your answer sheet.\n\nAlexander Henderson\n\nEarly life\n• was born in Scotland in 1831 — father was a 9 ______\n• trained as an accountant, emigrated to Canada in 1855\n\nStart of a photographic career\n• opened up a photographic studio in 1866\n• took photos of city life, but preferred landscape photography\n• people bought Henderson’s photos because photography took up considerable time and the 10 ______ was heavy\n• the photographs Henderson sold were 11 ______ or souvenirs\n\nTravelling as a professional photographer\n• travelled widely in Quebec and Ontario in the 1870s and 1880s\n• took many trips along eastern rivers in a 12 ______\n• worked for Canadian railways between 1875 and 1897\n• worked for CPR in 1885 and photographed the 13 ______ and the railway at Rogers Pass",
        9,
        13,
      ),
    },
  ],
  source: {
    passagePages: [39, 40, 41, 42].map(sourcePage),
    questionPages: [41, 42].map(sourcePage),
    answerPages: [sourcePage(123)],
    explanationPages: [75, 76, 77, 78, 79].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集14精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const skyscraperSections = [
  {
    id: "cambridge-14-test-2-part2-section-a",
    heading: "A",
    format: "pre" as const,
    paragraphs: [
      "The Recovery of Natural Environments in Architecture by Professor Alan Short is the culmination of 30 years of research and award-winning green building design by Short and colleagues in Architecture, Engineering, Applied Maths and Earth Sciences at the University of Cambridge.",
      "‘The crisis in building design is already here,’ said Short. ‘Policy makers think you can solve energy and building problems with gadgets. You can’t. As global temperatures continue to rise, we are going to continue to squander more and more energy on keeping our buildings mechanically cool until we have run out of capacity.’",
    ],
  },
  {
    id: "cambridge-14-test-2-part2-section-b",
    heading: "B",
    format: "pre" as const,
    paragraphs: [
      "Short is calling for a sweeping reinvention of how skyscrapers and major public buildings are designed — to end the reliance on sealed buildings which exist solely via the ‘life support’ system of vast air conditioning units.",
      "Instead, he shows it is entirely possible to accommodate natural ventilation and cooling in large buildings by looking into the past, before the widespread introduction of air conditioning systems, which were ‘relentlessly and aggressively marketed’ by their inventors.",
    ],
  },
  {
    id: "cambridge-14-test-2-part2-section-c",
    heading: "C",
    format: "pre" as const,
    paragraphs: ["Short points out that to make most contemporary buildings habitable, they have to be sealed and air conditioned. The energy use and carbon emissions this generates is spectacular and largely unnecessary. Buildings in the West account for 40–50% of electricity usage, generating substantial carbon emissions, and the rest of the world is catching up at a frightening rate. Short regards glass, steel and air-conditioned skyscrapers as symbols of status, rather than practical ways of meeting our requirements."],
  },
  {
    id: "cambridge-14-test-2-part2-section-d",
    heading: "D",
    format: "pre" as const,
    paragraphs: [
      "Short’s book highlights a developing and sophisticated art and science of ventilating buildings through the 19th and earlier-20th centuries, including the design of ingeniously ventilated hospitals. Of particular interest were those built to the designs of John Shaw Billings, including the first Johns Hopkins Hospital in the US city of Baltimore (1873–1889).",
      "‘We spent three years digitally modelling Billings’ final designs,’ says Short. ‘We put pathogens in the airstreams, modelled for someone with tuberculosis (TB) coughing in the wards and we found the ventilation systems in the room would have kept other patients safe from harm.’",
    ],
  },
  {
    id: "cambridge-14-test-2-part2-section-e",
    heading: "E",
    format: "pre" as const,
    paragraphs: [
      "‘We discovered that 19th-century hospital wards could generate up to 24 air changes an hour — that’s similar to the performance of a modern-day, computer-controlled operating theatre. We believe you could build wards based on these principles now. Single rooms are not appropriate for all patients. Communal wards appropriate for certain patients — older people with dementia, for example — would work just as well in today’s hospitals, at a fraction of the energy cost.’",
      "Professor Short contends the mindset and skill-sets behind these designs have been completely lost, lamenting the disappearance of expertly designed theatres, opera houses, and other buildings where up to half the volume of the building was given over to ensuring everyone got fresh air.",
    ],
  },
  {
    id: "cambridge-14-test-2-part2-section-f",
    heading: "F",
    format: "pre" as const,
    paragraphs: [
      "Much of the ingenuity present in 19th-century hospital and building design was driven by a panicked public clamouring for buildings that could protect against what was thought to be the lethal threat of miasmas — toxic air that spread disease. Miasmas were feared as the principal agents of disease and epidemics for centuries, and were used to explain the spread of infection from the Middle Ages right through to the cholera outbreaks in London and Paris during the 1850s. Foul air, rather than germs, was believed to be the main driver of ‘hospital fever’, leading to disease and frequent death. The prosperous steered clear of hospitals.",
      "While miasma theory has been long since disproved, Short has for the last 30 years advocated a return to some of the building design principles produced in its wake.",
    ],
  },
  {
    id: "cambridge-14-test-2-part2-section-g",
    heading: "G",
    format: "pre" as const,
    paragraphs: [
      "Today, huge amounts of a building’s space and construction cost are given over to air conditioning. ‘But I have designed and built a series of buildings over the past three decades which have tried to reinvent some of these ideas and then measure what happens.’",
      "‘To go forward into our new low-energy, low-carbon future, we would be well advised to look back at design before our high-energy, high-carbon present appeared. What is surprising is what a rich legacy we have abandoned.’",
    ],
  },
  {
    id: "cambridge-14-test-2-part2-section-h",
    heading: "H",
    format: "pre" as const,
    paragraphs: [
      "Successful examples of Short’s approach include the Queen’s Building at De Montfort University in Leicester. Containing as many as 2,000 staff and students, the entire building is naturally ventilated, passively cooled and naturally lit, including the two largest auditoria, each seating more than 150 people. The award-winning building uses a fraction of the electricity of comparable buildings in the UK.",
      "Short contends that glass skyscrapers in London and around the world will become a liability over the next 20 or 30 years if climate modelling predictions and energy price rises come to pass as expected.",
    ],
  },
  {
    id: "cambridge-14-test-2-part2-section-i",
    heading: "I",
    format: "pre" as const,
    paragraphs: [
      "He is convinced that sufficiently cooled skyscrapers using the natural environment can be produced in almost any climate. He and his team have worked on hybrid buildings in the harsh climates of Beijing and Chicago — built with natural ventilation assisted by back-up air conditioning — which, surprisingly perhaps, can be switched off more than half the time on milder days and during the spring and autumn.",
      "Short looks at how we might reimagine the cities, offices and homes of the future. Maybe it’s time we changed our outlook.",
    ],
  },
];

const skyscrapers: ReadingPart = {
  id: "cambridge-14-test-2-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Back to the future of skyscraper design",
  subtitle: "Answers to the problem of excessive electricity use by skyscrapers and large public buildings can be found in ingenious but forgotten architectural designs of the 19th and early-20th centuries",
  sections: skyscraperSections,
  questionBlocks: [
    {
      id: "cambridge-14-test-2-part2-questions-14-18",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has nine sections, A–I. Which section contains the following information? Write the correct letter, A–I, in boxes 14–18 on your answer sheet.",
      questions: [
        { questionNumbers: [14], prompt: "Why some people avoided hospitals in the 19th century", options: "ABCDEFGHI".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [15], prompt: "A suggestion that the popularity of tall buildings is linked to prestige", options: "ABCDEFGHI".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [16], prompt: "A comparison between the circulation of air in a 19th-century building and modern standards", options: "ABCDEFGHI".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [17], prompt: "How Short tested the circulation of air in a 19th-century building", options: "ABCDEFGHI".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [18], prompt: "An implication that advertising led to the large increase in the use of air conditioning", options: "ABCDEFGHI".split("").map((letter) => ({ letter, text: "Section " + letter })) },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-14-test-2-part2-questions-19-26",
        "Ventilation in 19th-century hospital wards",
        "Questions 19–26\nComplete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 19–26 on your answer sheet.\n\nVentilation in 19th-century hospital wards\n\nProfessor Alan Short examined the work of John Shaw Billings, who influenced the architectural 19 ______ of hospitals to ensure they had good ventilation. He calculated that 20 ______ in the air coming from patients suffering from 21 ______ would not have harmed other patients. He also found that the air in 22 ______ in hospitals could change as often as in a modern operating theatre. He suggests that energy use could be reduced by locating more patients in 23 ______ areas.\n\nA major reason for improving ventilation in 19th-century hospitals was the demand from the 24 ______ for protection against bad air, known as 25 ______. These were blamed for the spread of disease for hundreds of years, including epidemics of 26 ______ in London and Paris in the middle of the 19th century.",
        19,
        26,
      ),
    },
  ],
  source: {
    passagePages: [43, 44, 45, 46].map(sourcePage),
    questionPages: [45, 46].map(sourcePage),
    answerPages: [sourcePage(123)],
    explanationPages: [84, 85, 86, 87, 88, 89].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集14精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const disorderHeadings = [
  { id: "i", text: "Complaints about the impact of a certain approach" },
  { id: "ii", text: "Fundamental beliefs that are in fact incorrect" },
  { id: "iii", text: "Early recommendations concerning business activities" },
  { id: "iv", text: "Organisations that put a new approach into practice" },
  { id: "v", text: "Companies that have suffered from changing their approach" },
  { id: "vi", text: "What people are increasingly expected to do" },
  { id: "vii", text: "How to achieve outcomes that are currently impossible" },
  { id: "viii", text: "Neither approach guarantees continuous improvement" },
  { id: "ix", text: "Evidence that a certain approach can have more disadvantages than advantages" },
];

const disorderSections = [
  {
    id: "cambridge-14-test-2-part3-section-a",
    heading: "A",
    format: "pre" as const,
    paragraphs: [
      "Organisation is big business. Whether it is of our lives — all those inboxes and calendars — or how companies are structured, a multi-billion dollar industry helps to meet this need.",
      "We have more strategies for time management, project management and self-organisation than at any other time in human history. We are told that we ought to organise our company, our home life, our week, our day and even our sleep, all as a means to becoming more productive. Every week, countless seminars and workshops take place around the world to tell a paying public that they ought to structure their lives in order to achieve this.",
      "This rhetoric has also crept into the thinking of business leaders and entrepreneurs, much to the delight of self-proclaimed perfectionists with the need to get everything right. The number of business schools and graduates has massively increased over the past 50 years, essentially teaching people how to organise well.",
    ],
  },
  {
    id: "cambridge-14-test-2-part3-section-b",
    heading: "B",
    format: "pre" as const,
    paragraphs: [
      "Ironically, however, the number of businesses that fail has also steadily increased. Work-related stress has increased. A large proportion of workers from all demographics claim to be dissatisfied with the way their work is structured and the way they are managed.",
      "This begs the question: what has gone wrong? Why is it that on paper the drive for organisation seems a sure shot for increasing productivity, but in reality falls well short of what is expected?",
    ],
  },
  {
    id: "cambridge-14-test-2-part3-section-c",
    heading: "C",
    format: "pre" as const,
    paragraphs: ["This has been a problem for a while now. Frederick Taylor was one of the forefathers of scientific management. Writing in the first half of the 20th century, he designed a number of principles to improve the efficiency of the work process, which have since become widespread in modern companies. So the approach has been around for a while."],
  },
  {
    id: "cambridge-14-test-2-part3-section-d",
    heading: "D",
    format: "pre" as const,
    paragraphs: ["New research suggests that this obsession with efficiency is misguided. The problem is not necessarily the management theories or strategies we use to organise our work; it’s the basic assumptions we hold in approaching how we work. Here it’s the assumption that order is a necessary condition for productivity. This assumption has also fostered the idea that disorder must be detrimental to organisational productivity. The result is that businesses and people spend time and money organising themselves for the sake of organising, rather than actually looking at the end goal and usefulness of such an effort."],
  },
  {
    id: "cambridge-14-test-2-part3-section-e",
    heading: "E",
    format: "pre" as const,
    paragraphs: ["What’s more, recent studies show that order actually has diminishing returns. Order does increase productivity to a certain extent, but eventually the usefulness of the process of organisation, and the benefit it yields, reduce until the point where any further increase in order reduces productivity. Some argue that in a business, if the cost of formally structuring something outweighs the benefit of doing it, then that thing ought not to be formally structured. Instead, the resources involved can be better used elsewhere."],
  },
  {
    id: "cambridge-14-test-2-part3-section-f",
    heading: "F",
    format: "pre" as const,
    paragraphs: ["In fact, research shows that, when innovating, the best approach is to create an environment devoid of structure and hierarchy and enable everyone involved to engage as one organic group. These environments can lead to new solutions that, under conventionally structured environments (filled with bottlenecks in terms of information flow, power structures, rules, and routines) would never be reached."],
  },
  {
    id: "cambridge-14-test-2-part3-section-g",
    heading: "G",
    format: "pre" as const,
    paragraphs: [
      "In recent times companies have slowly started to embrace this disorganisation. Many of them embrace it in terms of perception (embracing the idea of disorder, as opposed to fearing it) and in terms of process (putting mechanisms in place to reduce structure).",
      "For example, Oticon, a large Danish manufacturer of hearing aids, used what it called a ‘spaghetti’ structure in order to reduce the organisation’s rigid hierarchies. This involved scrapping formal job titles and giving staff huge amounts of ownership over their own time and projects. This approach proved to be highly successful initially, with clear improvements in worker productivity in all facets of the business.",
      "In similar fashion, the former chairman of General Electric embraced disorganisation, putting forward the idea of the ‘boundaryless’ organisation. Again, it involves breaking down the barriers between different parts of a company and encouraging virtual collaboration and flexible working. Google and a number of other tech companies have embraced (at least in part) these kinds of flexible structures, facilitated by technology and strong company values which glue people together.",
    ],
  },
  {
    id: "cambridge-14-test-2-part3-section-h",
    heading: "H",
    format: "pre" as const,
    paragraphs: [
      "A word of warning to others thinking of jumping on this bandwagon: the evidence so far suggests disorder, much like order, also seems to have diminishing utility, and can also have detrimental effects on performance if overused. Like order, disorder should be embraced only so far as it is useful. But we should not fear it — nor venerate one over the other.",
      "This research also shows that we should continually question whether or not our existing assumptions work.",
    ],
  },
];

const disorder: ReadingPart = {
  id: "cambridge-14-test-2-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 on pages 47 and 48.",
  title: "Why companies should welcome disorder",
  sections: disorderSections,
  questionBlocks: [
    {
      id: "cambridge-14-test-2-part3-headings-27-34",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 3 has eight sections, A–H. Choose the correct heading for each section from the list of headings below. Write the correct number, i–ix, in boxes 27–34 on your answer sheet.",
      questionNumbers: [27, 28, 29, 30, 31, 32, 33, 34],
      options: disorderHeadings,
    },
    {
      ...rawFillBlock(
        "cambridge-14-test-2-part3-questions-35-37",
        "Questions 35–37",
        "Questions 35–37\nComplete the sentences below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 35–37 on your answer sheet.\n\n35 Numerous training sessions are aimed at people who feel they are not ______ enough.\n\n36 Being organised appeals to people who regard themselves as ______.\n\n37 Many people feel ______ with aspects of their work.",
        35,
        37,
      ),
    },
    {
      id: "cambridge-14-test-2-part3-questions-38-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 3? In boxes 38–40 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [38], prompt: "Both businesses and people aim at order without really considering its value.", options: judgmentOptions },
        { questionNumbers: [39], prompt: "Innovation is most successful if the people involved have distinct roles.", options: judgmentOptions },
        { questionNumbers: [40], prompt: "Google was inspired to adopt flexibility by the success of General Electric.", options: judgmentOptions },
      ],
    },
  ],
  source: {
    passagePages: [47, 48, 49, 50].map(sourcePage),
    questionPages: [47, 48, 49, 50].map(sourcePage),
    answerPages: [sourcePage(123)],
    explanationPages: [94, 95, 96, 97, 98, 99].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集14精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE14_TEST2_PARTS: ReadingPart[] = [henderson, skyscrapers, disorder];

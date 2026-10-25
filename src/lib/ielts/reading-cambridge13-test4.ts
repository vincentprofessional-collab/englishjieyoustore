import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  83: [1533, 2286], 84: [1551, 2281], 85: [1551, 2297], 86: [1575, 2367],
  87: [1551, 2291], 88: [1556, 2286], 89: [1430, 2296], 90: [1554, 2366],
  91: [1548, 2288], 92: [1629, 2279], 93: [1504, 2289], 94: [1543, 2270],
  126: [1662, 1384],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci13-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = { 158: 911, 166: 1812, 173: 1162 };
  return {
    page,
    src: "/reading/explanations/cambridge-13-test-4-part" + part + "-exp13-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2329,
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

const yesNoOptions = [
  { letter: "YES", text: "The statement agrees with the views of the writer." },
  { letter: "NO", text: "The statement contradicts the views of the writer." },
  { letter: "NOT GIVEN", text: "There is no information on this." },
];

const cuttySark: ReadingPart = {
  id: "cambridge-13-test-4-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Cutty Sark: the fastest sailing ship of all time",
  sections: [{
    id: "cambridge-13-test-4-part1-passage",
    format: "pre",
    paragraphs: [
      "The nineteenth century was a period of great technological development in Britain, and for shipping the major changes were from wind to steam power, and from wood to iron and steel.",
      "The fastest commercial sailing vessels of all time were clippers, three-masted ships built to transport goods around the world, although some also took passengers. From the 1840s until 1869, when the Suez Canal opened and steam propulsion was replacing sail, clippers dominated world trade. Although many were built, only one has survived more or less intact: Cutty Sark, now on display in Greenwich, southeast London.",
      "Cutty Sark’s unusual name comes from the poem Tam O’Shanter by the Scottish poet Robert Burns. Tam, a farmer, is chased by a witch called Nannie, who is wearing a ‘cutty sark’ — an old Scottish name for a short nightdress. The witch is depicted in Cutty Sark’s figurehead — the carving of a woman typically at the front of old sailing ships. In legend, and in Burns’s poem, witches cannot cross water, so this was a rather strange choice of name for a ship.",
      "Cutty Sark was built in Dumbarton, Scotland, in 1869, for a shipping company owned by John Willis. To carry out construction, Willis chose a new shipbuilding firm, Scott & Linton, and ensured that the contract with them put him in a very strong position. In the end, the firm was forced out of business, and the ship was finished by a competitor.",
      "Willis’s company was active in the tea trade between China and Britain, where speed could bring shipowners both profits and prestige, so Cutty Sark was designed to make the journey more quickly than any other ship. On her maiden voyage, in 1870, she set sail from London, carrying large amounts of goods to China. She returned laden with tea, making the journey back to London in four months. However, Cutty Sark never lived up to the high expectations of her owner, as a result of bad winds and various misfortunes. On one occasion, in 1872, the ship and a rival clipper, Thermopylae, left port in China on the same day. Crossing the Indian Ocean, Cutty Sark gained a lead of over 400 miles, but then her rudder was severely damaged in stormy seas, making her impossible to steer. The ship’s crew had the daunting task of repairing the rudder at sea, and only succeeded at the second attempt. Cutty Sark reached London a week after Thermopylae.",
      "Steam ships posed a growing threat to clippers, as their speed and cargo capacity increased. In addition, the opening of the Suez Canal in 1869, the same year that Cutty Sark was launched, had a serious impact. While steam ships could make use of the quick, direct route between the Mediterranean and the Red Sea, the canal was of no use to sailing ships, which needed the much stronger winds of the oceans, and so had to sail a far greater distance. Steam ships reduced the journey time between Britain and China by approximately two months.",
      "By 1878, tea traders weren’t interested in Cutty Sark, and instead, she took on the much less prestigious work of carrying any cargo between any two ports in the world. In 1880, violence aboard the ship led ultimately to the replacement of the captain with an incompetent drunkard who stole the crew’s wages. He was suspended from service, and a new captain appointed. This marked a turnaround and the beginning of the most successful period in Cutty Sark’s working life, transporting wool from Australia to Britain. One such journey took just under 12 weeks, beating every other ship sailing that year by around a month.",
      "The ship’s next captain, Richard Woodget, was an excellent navigator, who got the best out of both his ship and his crew. As a sailing ship, Cutty Sark depended on the strong trade winds of the southern hemisphere, and Woodget took her further south than any previous captain, bringing her dangerously close to icebergs off the southern tip of South America. His gamble paid off, though, and the ship was the fastest vessel in the wool trade for ten years.",
      "As competition from steam ships increased in the 1890s, and Cutty Sark approached the end of her life expectancy, she became less profitable. She was sold to a Portuguese firm, which renamed her Ferreira. For the next 25 years, she again carried miscellaneous cargoes around the world.",
      "Badly damaged in a gale in 1922, she was put into Falmouth harbour in southwest England, for repairs. Wilfred Dowman, a retired sea captain who owned a training vessel, recognised her and tried to buy her, but without success. She returned to Portugal and was sold to another Portuguese company. Dowman was determined, however, and offered a high price: this was accepted, and the ship returned to Falmouth the following year and had her original name restored.",
      "Dowman used Cutty Sark as a training ship, and she continued in this role after his death. When she was no longer required, in 1954, she was transferred to dry dock at Greenwich to go on public display. The ship suffered from fire in 2007, and again, less seriously, in 2014, but now Cutty Sark attracts a quarter of a million visitors a year.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-13-test-4-part1-questions-1-8",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? Write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [1], prompt: "Clippers were originally intended to be used as passenger ships.", options: judgmentOptions },
        { questionNumbers: [2], prompt: "Cutty Sark was given the name of a character in a poem.", options: judgmentOptions },
        { questionNumbers: [3], prompt: "The contract between John Willis and Scott & Linton favoured Willis.", options: judgmentOptions },
        { questionNumbers: [4], prompt: "John Willis wanted Cutty Sark to be the fastest tea clipper travelling between the UK and China.", options: judgmentOptions },
        { questionNumbers: [5], prompt: "Despite storm damage, Cutty Sark beat Thermopylae back to London.", options: judgmentOptions },
        { questionNumbers: [6], prompt: "The opening of the Suez Canal meant that steam ships could travel between Britain and China faster than clippers.", options: judgmentOptions },
        { questionNumbers: [7], prompt: "Steam ships sometimes used the ocean route to travel between London and China.", options: judgmentOptions },
        { questionNumbers: [8], prompt: "Captain Woodget put Cutty Sark at risk of hitting an iceberg.", options: judgmentOptions },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-13-test-4-part1-questions-9-13",
        "Questions 9–13",
        "Questions 9–13\nComplete the sentences below. Choose ONE WORD ONLY from the passage for each answer.\n\n9 After 1880, Cutty Sark carried ______ as its main cargo during its most successful time.\n\n10 As a captain and ______, Woodget was very skilled.\n\n11 Ferreira went to Falmouth to repair damage that a ______ had caused.\n\n12 Between 1923 and 1954, Cutty Sark was used for ______.\n\n13 Cutty Sark has twice been damaged by ______ in the 21st century.",
        9,
        13,
      ),
    },
  ],
  source: {
    passagePages: [83, 84].map(sourcePage),
    questionPages: [85].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [158, 159, 160, 161, 162].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集13精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const savingSoil: ReadingPart = {
  id: "cambridge-13-test-4-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "SAVING THE SOIL",
  subtitle: "More than a third of the Earth’s top layer is at risk. Is there hope for our planet’s most precious resource?",
  sections: [
    {
      id: "cambridge-13-test-4-part2-section-a",
      heading: "A",
      format: "pre",
      paragraphs: ["More than a third of the world’s soil is endangered, according to a recent UN report. If we don’t slow the decline, all farmable soil could be gone in 60 years. Since soil grows 95% of our food, and sustains human life in other more surprising ways, that is a huge problem."],
    },
    {
      id: "cambridge-13-test-4-part2-section-b",
      heading: "B",
      format: "pre",
      paragraphs: ["Peter Groffman, from the Cary Institute of Ecosystem Studies in New York, points out that soil scientists have been warning about the degradation of the world’s soil for decades. At the same time, our understanding of its importance to humans has grown. A single gram of healthy soil might contain 100 million bacteria, as well as other microorganisms such as viruses and fungi, living amid decomposing plants and various minerals. That means soils do not just grow our food, but are the source of nearly all our existing antibiotics, and could be our best hope in the fight against antibiotic-resistant bacteria. Soil is also an ally against climate change: as microorganisms within soil digest dead animals and plants, they lock in their carbon content, holding three times the amount of carbon as does the entire atmosphere. Soils also store water, preventing flood damage: in the UK, damage to buildings, roads and bridges from floods caused by soil degradation costs £233 million every year."],
    },
    {
      id: "cambridge-13-test-4-part2-section-c",
      heading: "C",
      format: "pre",
      paragraphs: ["If the soil loses its ability to perform these functions, the human race could be in big trouble. The danger is not that the soil will disappear completely, but that the microorganisms that give it its special properties will be lost. And once this has happened, it may take the soil thousands of years to recover. Agriculture is by far the biggest problem. In the wild, when plants grow they remove nutrients from the soil, but then when the plants die and decay these nutrients are returned directly to the soil. Humans tend not to return unused parts of harvested crops directly to the soil to enrich it, meaning that the soil gradually becomes less fertile. In the past we developed strategies to get around the problem, such as regularly varying the types of crops grown, or leaving fields uncultivated for a season."],
    },
    {
      id: "cambridge-13-test-4-part2-section-d",
      heading: "D",
      format: "pre",
      paragraphs: ["But these practices became inconvenient as populations grew and agriculture had to be run on more commercial lines. A solution came in the early 20th century with the Haber-Bosch process for manufacturing ammonium nitrate. Farmers have been putting this synthetic fertiliser on their fields ever since. But over the past few decades, it has become clear this wasn’t such a bright idea. Chemical fertilisers can release polluting nitrous oxide into the atmosphere and excess is often washed away with the rain, releasing nitrogen into rivers. More recently, we have found that indiscriminate use of fertilisers hurts the soil itself, turning it acidic and salty, and degrading the soil they are supposed to nourish."],
    },
    {
      id: "cambridge-13-test-4-part2-section-e",
      heading: "E",
      format: "pre",
      paragraphs: ["One of the people looking for a solution to this problem is Pius Floris, who started out running a tree-care business in the Netherlands, and now advises some of the world’s top soil scientists. He came to realise that the best way to ensure his trees flourished was to take care of the soil, and has developed a cocktail of beneficial bacteria, fungi and humus to do this. Researchers at the University of Valladolid in Spain recently used this cocktail on soils destroyed by years of fertiliser overuse. When they applied Floris’s mix to the desert-like test plots, a good crop of plants emerged that were not just healthy at the surface, but had roots strong enough to pierce dirt as hard as rock. The few plants that grew in the control plots, fed with traditional fertilisers, were small and weak."],
    },
    {
      id: "cambridge-13-test-4-part2-section-f",
      heading: "F",
      format: "pre",
      paragraphs: ["However, measures like this are not enough to solve the global soil degradation problem. To assess our options on a global scale we first need an accurate picture of what types of soil are out there, and the problems they face. That’s not easy. For one thing, there is no agreed international system for classifying soil. In an attempt to unify the different approaches, the UN has created the Global Soil Map project. Researchers from nine countries are working together to create a map linked to a database that can be fed measurements from field surveys, drone surveys, satellite imagery, lab analyses and so on to provide real-time data on the state of the soil. Within the next four years, they aim to have mapped soils worldwide to a depth of 100 metres, with the results freely accessible to all."],
    },
    {
      id: "cambridge-13-test-4-part2-section-g",
      heading: "G",
      format: "pre",
      paragraphs: ["But this is only a first step. We need ways of presenting the problem that bring it home to governments and the wider public, says Pamela Chasek at the International Institute for Sustainable Development, in Winnipeg, Canada. ‘Most scientists don’t speak language that policy-makers can understand, and vice versa.’ Chasek and her colleagues have proposed a goal of ‘zero net land degradation’. Like the idea of carbon neutrality, it is an easily understood target that can help shape expectations and encourage action. For soils on the brink, that may be too late. Several researchers are agitating for the immediate creation of protected zones for endangered soils. One difficulty here is defining what these areas should conserve: areas where the greatest soil diversity is present? Or areas of unspoilt soils that could act as a future benchmark of quality? Whatever we do, if we want our soils to survive, we need to take action now."],
    },
  ],
  questionBlocks: [
    {
      ...rawFillBlock(
        "cambridge-13-test-4-part2-questions-14-17",
        "Why soil degradation could be a disaster for humans",
        "Questions 14–17\nComplete the summary below. Write ONE WORD ONLY from the passage for each answer.\n\nWhy soil degradation could be a disaster for humans\n\nHealthy soil contains a large variety of bacteria and other microorganisms as well as plant remains and 14 ______. It provides us with food and also with antibiotics, and its function in storing 15 ______ has a significant effect on the climate. In addition, it prevents damage to property and infrastructure because it holds 16 ______.\n\nIf these microorganisms are lost, soil may lose its special properties. The main factor contributing to soil degradation is the 17 ______ carried out by humans.",
        14,
        17,
      ),
    },
    {
      id: "cambridge-13-test-4-part2-questions-18-21",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete each sentence with the correct ending, A–F. Write the correct letter, A–F, in boxes 18–21 on your answer sheet.",
      questions: [
        { questionNumbers: [18], prompt: "Nutrients contained in the unused parts of harvested crops", options: [
          { letter: "A", text: "may improve the number and quality of plants growing there." },
          { letter: "B", text: "may contain data from up to nine countries." },
          { letter: "C", text: "may not be put back into the soil." },
          { letter: "D", text: "may help governments to be more aware of soil-related issues." },
          { letter: "E", text: "may cause damage to different aspects of the environment." },
          { letter: "F", text: "may be better for use at a global level." },
        ] },
        { questionNumbers: [19], prompt: "Synthetic fertilisers produced with the Haber-Bosch process", options: [
          { letter: "A", text: "may improve the number and quality of plants growing there." },
          { letter: "B", text: "may contain data from up to nine countries." },
          { letter: "C", text: "may not be put back into the soil." },
          { letter: "D", text: "may help governments to be more aware of soil-related issues." },
          { letter: "E", text: "may cause damage to different aspects of the environment." },
          { letter: "F", text: "may be better for use at a global level." },
        ] },
        { questionNumbers: [20], prompt: "Addition of a mixture developed by Pius Floris to the soil", options: [
          { letter: "A", text: "may improve the number and quality of plants growing there." },
          { letter: "B", text: "may contain data from up to nine countries." },
          { letter: "C", text: "may not be put back into the soil." },
          { letter: "D", text: "may help governments to be more aware of soil-related issues." },
          { letter: "E", text: "may cause damage to different aspects of the environment." },
          { letter: "F", text: "may be better for use at a global level." },
        ] },
        { questionNumbers: [21], prompt: "The idea of zero net soil degradation", options: [
          { letter: "A", text: "may improve the number and quality of plants growing there." },
          { letter: "B", text: "may contain data from up to nine countries." },
          { letter: "C", text: "may not be put back into the soil." },
          { letter: "D", text: "may help governments to be more aware of soil-related issues." },
          { letter: "E", text: "may cause damage to different aspects of the environment." },
          { letter: "F", text: "may be better for use at a global level." },
        ] },
      ],
    },
    {
      id: "cambridge-13-test-4-part2-questions-22-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has seven paragraphs, A–G. Which section contains the following information? You may use any letter more than once.",
      questions: [
        { questionNumbers: [22], prompt: "A reference to one person’s motivation for a soil-improvement project", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [23], prompt: "An explanation of how soil stayed healthy before the development of farming", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [24], prompt: "Examples of different ways of collecting information on soil degradation", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [25], prompt: "A suggestion for a way of keeping some types of soil safe in the near future", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [26], prompt: "A reason why it is difficult to provide an overview of soil degradation", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
      ],
    },
  ],
  source: {
    passagePages: [86, 87].map(sourcePage),
    questionPages: [88, 89].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [166, 167, 168, 169, 170].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集13精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const happinessIndustry: ReadingPart = {
  id: "cambridge-13-test-4-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "The Happiness Industry: How the Government and Big Business Sold Us Well-Being",
  subtitle: "Book Review",
  byline: "By William Davies",
  sections: [{
    id: "cambridge-13-test-4-part3-passage",
    format: "pre",
    paragraphs: [
      "‘Happiness is the ultimate goal because it is self-evidently good. If we are asked why happiness matters we can give no further external reason. It just obviously does matter.’ This pronouncement by Richard Layard, an economist and advocate of ‘positive psychology’, summarises the beliefs of many people today. For Layard and others like him, it is obvious that the purpose of government is to promote a state of collective well-being. The only question is how to achieve it, and here positive psychology — a supposed science that not only identifies what makes people happy but also allows their happiness to be measured — can show the way. Equipped with this science, they say, governments can secure happiness in society in a way they never could in the past.",
      "It is an astonishingly crude and simple-minded way of thinking, and for that very reason increasingly popular. Those who think in this way are oblivious to the vast philosophical literature in which the meaning and value of happiness have been explored and questioned, and write as if nothing of any importance had been thought on the subject until it came to their attention. It was the philosopher Jeremy Bentham (1748–1832) who was more than anyone else responsible for the development of this way of thinking. For Bentham it was obvious that the human good consists of pleasure and the absence of pain. The Greek philosopher Aristotle may have identified happiness with self-realisation in the 4th century BC, and thinkers throughout the ages may have struggled to reconcile the pursuit of happiness with other human values, but for Bentham all this was mere metaphysics or fiction. Without knowing anything much of him or the school of moral theory he established — since they are by education and intellectual conviction illiterate in the history of ideas — our advocates of positive psychology follow in his tracks in rejecting as outmoded and irrelevant pretty much the entirety of ethical reflection on human happiness to date.",
      "But as William Davies notes in his recent book The Happiness Industry, the view that happiness is the only self-evident good is actually a way of limiting moral inquiry. One of the virtues of this rich, lucid and arresting book is that it places the current cult of happiness in a well-defined historical framework. Rightly, Davies begins his story with Bentham, noting that he was far more than a philosopher. Davies writes, ‘Bentham’s activities were those which we might now associate with a public sector management consultant’. In the 1790s, he wrote to the Home Office suggesting that the departments of government be linked together through a set of ‘conversation tubes’, and to the Bank of England with a design for a printing device that could produce unforgeable banknotes. He drew up plans for a ‘frigidarium’ to keep provisions such as meat, fish, fruit and vegetables fresh. His celebrated design for a prison to be known as a ‘Panopticon’, in which prisoners would be kept in solitary confinement while being visible at all times to the guards, was very nearly adopted. (Surprisingly, Davies does not discuss the fact that Bentham meant his Panopticon not just as a model prison but also as an instrument of control that could be applied to schools and factories.)",
      "Bentham was also a pioneer of the ‘science of happiness’. If happiness is to be regarded as a science, it has to be measured, and Bentham suggested two ways in which this might be done. Viewing happiness as a complex of pleasurable sensations, he suggested that it might be quantified by measuring the human pulse rate. Alternatively, money could be used as the standard for quantification: if two different goods have the same price, it can be claimed that they produce the same quantity of pleasure in the consumer. Bentham was more attracted by the latter measure. By associating money so closely to inner experience, Davies writes, Bentham ‘set the stage for the entangling of psychological research and capitalism that would shape the business practices of the twentieth century’.",
      "The Happiness Industry describes how the project of a science of happiness has become integral to capitalism. We learn much that is interesting about how economic problems are being redefined and treated as psychological maladies. In addition, Davies shows how the belief that inner states of pleasure and displeasure can be objectively measured has informed management studies and advertising. The tendency of thinkers such as J B Watson, the founder of behaviourism, was that human beings could be shaped, or manipulated, by policymakers and managers. Watson had no factual basis for his view of human action. When he became president of the American Psychological Association in 1915, he ‘had never even studied a single human being’: his research had been confined to experiments on white rats. Yet Watson’s reductive model is now widely applied, with ‘behaviour change’ becoming the goal of governments: in Britain, a ‘Behaviour Insights Team’ has been established by the government to study how people can be encouraged, at minimum cost to the public purse, to live in what are considered to be socially desirable ways.",
      "Modern industrial societies appear to need the possibility of ever-increasing happiness to motivate them in their labours. But whatever its intellectual pedigree, the idea that governments should be responsible for promoting happiness is always a threat to human freedom.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-13-test-4-part3-questions-27-29",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27–29 on your answer sheet.",
      questions: [
        { questionNumbers: [27], prompt: "What is the reviewer’s attitude to advocates of positive psychology?", options: [
          { letter: "A", text: "They are wrong to reject the ideas of Bentham." },
          { letter: "B", text: "They are over-influenced by their study of Bentham’s theories." },
          { letter: "C", text: "They have a fresh new approach to ideas on human happiness." },
          { letter: "D", text: "They are ignorant about the ideas they should be considering." },
        ] },
        { questionNumbers: [28], prompt: "The reviewer refers to the Greek philosopher Aristotle in order to suggest that happiness", options: [
          { letter: "A", text: "may not be just pleasure and the absence of pain." },
          { letter: "B", text: "should not be the main goal of humans." },
          { letter: "C", text: "is not something that should be fought for." },
          { letter: "D", text: "is not just an abstract concept." },
        ] },
        { questionNumbers: [29], prompt: "According to Davies, Bentham’s suggestion for linking the price of goods to happiness was significant because", options: [
          { letter: "A", text: "it was the first successful way of assessing happiness." },
          { letter: "B", text: "it established a connection between work and psychology." },
          { letter: "C", text: "it was the first successful example of psychological research." },
          { letter: "D", text: "it involved consideration of the rights of consumers." },
        ] },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-13-test-4-part3-questions-30-34",
        "Jeremy Bentham",
        "Questions 30–34\nComplete the summary using the list of words A–G below. Write the correct letter, A–G, in boxes 30–34 on your answer sheet.\n\nJeremy Bentham\n\nJeremy Bentham was active in other areas besides philosophy. In the 1790s he suggested a type of technology to improve 30 ______ for different government departments. He developed a new way of printing banknotes to increase 31 ______ and also designed a method for the 32 ______ of food. He also drew up plans for a prison which allowed the 33 ______ of prisoners at all times, and believed the same design could be used for other institutions as well. When researching happiness, he investigated possibilities for its 34 ______, and suggested some methods of doing this.\n\nA measurement\nB security\nC implementation\nD profits\nE observation\nF communication\nG preservation",
        30,
        34,
      ),
      wordBank: ["A", "B", "C", "D", "E", "F", "G"],
    },
    {
      id: "cambridge-13-test-4-part3-questions-35-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 3? Write YES if the statement agrees with the claims of the writer, NO if it contradicts the claims of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [35], prompt: "One strength of The Happiness Industry is its discussion of the relationship between psychology and economics.", options: yesNoOptions },
        { questionNumbers: [36], prompt: "It is more difficult to measure some emotions than others.", options: yesNoOptions },
        { questionNumbers: [37], prompt: "Watson’s ideas on behaviourism were supported by research on humans he carried out before 1915.", options: yesNoOptions },
        { questionNumbers: [38], prompt: "Watson’s ideas have been most influential on governments outside America.", options: yesNoOptions },
        { questionNumbers: [39], prompt: "The need for happiness is linked to industrialisation.", options: yesNoOptions },
        { questionNumbers: [40], prompt: "A main aim of government should be to increase the happiness of the population.", options: yesNoOptions },
      ],
    },
  ],
  source: {
    passagePages: [90, 91].map(sourcePage),
    questionPages: [92, 93, 94].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [173, 174, 175, 176, 177, 178].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集13精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE13_TEST4_PARTS: ReadingPart[] = [cuttySark, savingSoil, happinessIndustry];

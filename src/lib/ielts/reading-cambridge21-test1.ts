import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  17: [1448, 2371], 18: [1563, 2022], 19: [1414, 2371], 20: [1565, 1997],
  21: [1458, 2376], 22: [1440, 1993], 23: [1500, 2379], 24: [1561, 1993],
  25: [1300, 2387], 26: [1562, 1994], 27: [1459, 2377], 28: [1562, 1991],
  29: [1456, 2390], 119: [1461, 1808],
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

const paragraphOptions = (letters: string) => letters.split("").map((letter) => ({
  letter,
  text: "Paragraph " + letter,
}));

const silencePeopleOptions = [
  { letter: "A", text: "Nick Antonio" }, { letter: "B", text: "Justin Feinstein" },
  { letter: "C", text: "Tal Dotan Ben-Soussan" }, { letter: "D", text: "Eric Pfeifer" },
];

const sugarWordBank = [
  { letter: "A", text: "national governments" }, { letter: "B", text: "agricultural developments" },
  { letter: "C", text: "less wealthy nations" }, { letter: "D", text: "untrained workers" },
  { letter: "E", text: "small-scale cultivation" }, { letter: "F", text: "outdated methods" },
  { letter: "G", text: "financial controls" }, { letter: "H", text: "migrant workers" },
  { letter: "I", text: "powerful individuals and businesses" },
];

const daviesSisters: ReadingPart = {
  id: "cambridge-21-test-1-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "The Davies Sisters",
  subtitle: "Between 1908 and 1924, Gwendoline and Margaret Davies amassed one of the largest collections of late-nineteenth- and early-twentieth-century French paintings in Britain",
  sections: [{
    id: "cambridge-21-test-1-part1-passage",
    format: "pre",
    paragraphs: [
      "Gwendoline (1882–1951) and Margaret (1884–1963) Davies were the granddaughters of David Davies, a Welshman who amassed a fortune in the shipping and mining industries. In 1907, when Gwendoline came into her inheritance (Margaret would follow in 1909), the sisters were said to be the wealthiest unmarried women in Britain. Their religious upbringing in rural Wales gave them a deep sense of social responsibility and they chose to use their inheritance for cultural and philanthropic* purposes.",
      "While there was no real family history of art collecting, the sisters’ education was rigorously geared toward such pursuits. Their London school focused on cultural rather than academic study, and they travelled extensively with their governess, Jane Blaker, visiting art galleries and making extensive notes on the collections there.",
      "The sisters began to make regular art purchases from 1908, which roughly coincided with the dates of their inheritance. They took advice from various people, including the art dealer Hugh Blaker (the brother of Jane Blaker) and David Croal Thompson, who was also an art dealer. While it was long assumed that these men were largely responsible for the nature of the sisters’ collection, it has recently been accepted that Gwendoline and Margaret retained a far more active role in the process.",
      "The sisters’ journals reveal their preference for Old Master** paintings. Yet they initially made very few attempts to secure any such works. While the sisters were wealthy in relative terms, their income was nothing compared to the fortunes of American art collectors of this period, such as J. Pierpont Morgan. Quite simply, high-quality Old Master works were, if not beyond their means, then beyond what they were willing to pay for them. Instead, their early purchases were of the fashionable, safe variety, and included, for example, paintings by the French artist Jean-Baptiste-Camille Corot.",
      "However, it was only a few years before their collecting took a new direction and they turned to the work of the French Impressionists***. We know that Hugh Blaker, as a champion of contemporary French art, had a hand in the decision, and we know also that they would have seen examples on their various trips to Paris. Whatever the precise reason for this change, their first purchases of Impressionist art, made in October 1912, were scenes of Venice by the French artist Claude Monet. Over the next 12 years, the sisters amassed the bulk of their Impressionist collection, including six further works by Monet, two more by Manet, and three by Renoir, including his well-known painting La Parisienne.",
      "The First World War (1914–1918) played a part in the development of the sisters’ collection. Their initial response to the war effort was to finance the safe passage of artists from occupied Belgium to Wales, as a humanitarian act, but also with the hope of establishing a vibrant artists’ community in the area. Later in the conflict, both sisters decided to volunteer at a canteen for troops at Troyes, in northern France; Gwendoline in 1916, followed by Margaret in 1917.",
      "It was tedious and distressing work, which would have a permanent effect on Gwendoline’s health. Yet on one of numerous trips to nearby Paris, she visited the Bernheim-Jeune Gallery. Here she acquired two works by Cézanne — Provencal Landscape and The Frangois Zola Dam. The paintings were shipped directly to Bath, England, where they became the first works by Cézanne to go on display in a public gallery in Britain.",
      "Commentators have often described the sisters as unlikely pioneer collectors. Much is made of their isolation in rural Wales and the fact that they didn’t make friends with artists or gallery owners. Yet they didn’t feel obliged to follow fashionable tastes and were free to pursue their own preferences. Although they relied on a trusted circle of advisers, they made frequent trips to London and Paris, and also regularly had paintings sent to their home for consideration.",
      "By the early 1920s, Gwendoline felt increasingly uncomfortable buying art works when faced with the poverty and social upheaval created by the First World War. Her philanthropic pursuits then became focused almost exclusively on social causes and the development of the sisters’ home at Gregynog Hall into a conference centre and venue for the Gregynog Festival of Music and Poetry. Gwendoline made her final art purchase in March 1926. Margaret also stopped collecting around this time, but started again in the 1930s, acquiring, on a relatively small scale, work by contemporary British artists.",
      "The sisters collected French Impressionist paintings at a time when such art was routinely ignored by individuals and institutions alike. The Gwendoline and Margaret Davies collection, donated in 1951 and 1963 respectively to the National Museum Wales, contains major examples of work by leading French Impressionists. In collecting paintings that they loved, the sisters created a lasting and meaningful cultural legacy for the people of Wales and beyond.\n\n* Philanthropic: seeking to promote the welfare of others, often by charitable funding.\n\n** Old Master: a highly respected artist of great skill who worked in Europe before about 1800.\n\n*** Impressionist: an artist with a style of painting that developed in France in the late 1800s.",
    ],
  }],
  questionBlocks: [
    rawFillBlock(
      "cambridge-21-test-1-part1-questions-1-7",
      "Gwendoline and Margaret Davies",
      "Complete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 1–7 on your answer sheet.",
      "Gwendoline and Margaret Davies\n\nFamily and early life\n• their grandfather’s wealth came from 1 ______ and transportation businesses\n• their upbringing gave them a sense of social responsibility\n• their 2 ______ was designed to give them an interest in activities such as collecting art\n• their governess took them on trips to art galleries\n• they took lengthy 3 ______ about the things they saw in art galleries\n\nThe sisters as art collectors\n• their 4 ______ showed they liked Old Master paintings, but they were expensive to buy\n• their early purchases were safe, popular paintings\n• the first Impressionist paintings they bought showed places in 5 ______\n\nImpact of First World War\n• they helped bring artists from Belgium to Wales\n• they worked in a 6 ______ for soldiers in France\n\nOpinions about the sisters as art collectors\n• were not considered typical collectors — they lived in isolation in the countryside and did not have any 7 ______ who were artists",
      1,
      7,
    ),
    {
      id: "cambridge-21-test-1-part1-questions-8-13",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 8–13 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [8], prompt: "The Davies sisters’ childhood influenced the way they decided to use their wealth.", options: trueFalseNotGivenOptions },
        { questionNumbers: [9], prompt: "The Jean-Baptiste-Camille Corot paintings in the Davies sisters’ collection were purchased from a gallery in France.", options: trueFalseNotGivenOptions },
        { questionNumbers: [10], prompt: "Hugh Blaker opposed the Davies sisters’ decision to buy art by French Impressionists.", options: trueFalseNotGivenOptions },
        { questionNumbers: [11], prompt: "The exhibition of Cézanne paintings at the Bath gallery was very popular with the public.", options: trueFalseNotGivenOptions },
        { questionNumbers: [12], prompt: "The impact of the First World War encouraged Gwendoline to reconsider her interest in collecting art.", options: trueFalseNotGivenOptions },
        { questionNumbers: [13], prompt: "The Davies sisters bought French Impressionist art during a period when very few people were doing so.", options: trueFalseNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [17, 18].map(sourcePage),
    questionPages: [19, 20].map(sourcePage),
    answerPages: [sourcePage(119)],
  },
};

const whyWeNeedSilence: ReadingPart = {
  id: "cambridge-21-test-1-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Why we need silence",
  sections: [{
    id: "cambridge-21-test-1-part2-passage",
    format: "pre",
    paragraphs: [
      "A  Humans are finely attuned to noise, and for good reason. From an evolutionary perspective, sounds give us vital information, helping us navigate the world and avoid danger. To help ensure loud or unexpected noises get the attention they deserve, our internal chemistry alters in response to them. Our blood pressure goes up, muscles tense and glands release hormones that prepare us for fight or flight. In the short term, this is a good thing. When we are exposed to too much noise over the long term, however, those responses can lead to a multitude of health issues, from sleep disturbance to even cardiovascular disease.",
      "B  The World Health Organization has recently designated excessive noise as an ‘underestimated threat’ to public health, and has said that people living in cities such as Mumbai, Tokyo and Buenos Aires are being exposed to far more than the recommended 40 decibels of noise at night. A report from the European Environment Agency concluded that noise was an ongoing and widespread issue in Europe, with at least 1 in 5 people consistently exposed to levels considered harmful to health. ‘There are no “earlids” that can protect your brain from noise,’ says Nick Antonio, an acoustic consultant who has contributed to the British and international standards for noise.",
      "C  The good news is that several cities have been working to turn the volume down. One of the first to do so was London. ‘By providing recommendations for quieter buses, reducing noise from roads and also controlling noise from aircraft, they were able to make the city quieter,’ says Antonio. Other cities have introduced noise-reducing road coatings, for instance, alongside greenery that muffles sound. Some solutions are more specific: Washington DC’s ban on petrol-powered leaf blowers came into effect recently, while in New York City, legislation has been approved to fine people who modify their vehicles to make them noisier. ‘People are seeing the benefits of these more quiet environments in their cities,’ Antonio says. ‘I expect we will see much more of this in the future.’",
      "D  Researchers are also seeking to understand what aspects of silent experiences are most beneficial to our health. One of the best-researched is the flotation tank: a lightproof, soundproof tank of salt water in which a person floats as a form of deep relaxation. While some people experience altered perception in the tanks, involving subtle humming sounds and visual effects, these effects are benign and do not detract from the benefits of the experience, says Justin Feinstein, a clinical neuropsychologist. ‘When you don’t have external sensory stimuli coming in, the brain tries to fill the void to make sense of this dark and silent world,’ he explains. ‘In these tanks, some people can even hear the sound of their eyes blinking,’ says Feinstein. ‘But it is the ability to focus on the breath that helps people reach a relaxed or meditative state.’",
      "E  To further explore flotation tanks as a therapeutic tool, Feinstein and his colleagues recruited 50 people with a variety of conditions related to stress and had them answer a questionnaire prior to and following a flotation session. Participants reported decreases in muscle tension, pain and symptoms of their conditions after a single, 1-hour float, alongside an increase in feelings of relaxation and overall wellbeing. Less is known about what effects sensory deprivation can have on the brain. To investigate, Feinstein’s team had 48 people participate in either three 90-minute float sessions or three 90-minute periods of relaxing on a chair which reclined. Participants had their brains scanned using functional magnetic resonance imaging at the beginning and end of the trial. Float sessions uniquely decreased activity in the default mode network (DMN), a collection of brain regions commonly linked with depression. Feinstein says it is an exciting finding, because flotation tanks seem to offer a way of ‘resetting’ our nervous system to prevent it from getting out of balance.",
      "F  Neurobiologist Tal Dotan Ben-Soussan is also an advocate of silence as a therapy. ‘When we find ways to be quiet, we are not only quiet in our environment, but quiet in our inner selves,’ she explains. ‘This allows us to be more aware of what is happening around us and what the situation may require from us so we can provide [a more] adequate response.’ Not everyone will benefit from silence to the same extent, but Ben-Soussan says one characteristic is key: the person must need to want to engage in the experience. ‘We see from animal models and human studies that volition and intentionality is important,’ she says. ‘When people do not want silence, it can be very distressing.’",
      "G  Eric Pfeifer, a psychotherapy researcher, also concedes that some people may not benefit from silence, particularly those who are in a heightened state of stress. ‘People in these states may not be able to relax or calm down in a silent condition,’ he says. Professional guidance can be useful, he adds, allowing people to approach silence slowly so that they can gradually enjoy the benefits. And Pfeifer is convinced that silence is more attainable in everyday life than people think. First, complete silence isn’t necessary. In a recent study, he found that participants reported more relaxation and less boredom when they sat quietly in an outdoor garden compared with a completely silent room. Second, Pfeifer believes we don’t need a lot of silence to gain benefits. ‘You don’t need to spend hours in silence,’ he says. ‘It is likely better to have more frequency of silence for a few minutes at a time than a longer period of silence only once a week. Just finding those places in your daily life where you can find some silence ... can make a big difference.’",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-21-test-1-part2-questions-14-17",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has seven sections, A–G. Which section contains the following information? Write the correct letter, A–G, in boxes 14–17 on your answer sheet.",
      questions: [
        { questionNumbers: [14], prompt: "Examples of strategies to decrease the noise that the public are exposed to", options: paragraphOptions("ABCDEFG") },
        { questionNumbers: [15], prompt: "Data indicating the extent of the problem of excessive noise", options: paragraphOptions("ABCDEFG") },
        { questionNumbers: [16], prompt: "A description of physiological changes in our bodies when we hear sudden noises", options: paragraphOptions("ABCDEFG") },
        { questionNumbers: [17], prompt: "Evidence that a relatively quiet environment can be more beneficial than a totally silent one", options: paragraphOptions("ABCDEFG") },
      ],
    },
    rawFillBlock(
      "cambridge-21-test-1-part2-questions-18-21",
      "Flotation Tanks",
      "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 18–21 on your answer sheet.",
      "Flotation Tanks\n\nAccording to Justin Feinstein, flotation tanks allow people to concentrate on their own 18 ______, which helps them relax and enables them to meditate.\n\nFeinstein and his colleagues conducted an experiment in which 50 people, who were all suffering from stress and related issues, were given a 19 ______ to complete before and after using a flotation tank. Participants reported a reduction in their symptoms after an hour in the tank, together with signs of relaxation and improved general 20 ______.\n\nIn another experiment, the researchers had 48 people spend periods of 90 minutes either lying back in a chair or floating in a tank. Brain scans then revealed that those people who had been in a tank had decreased activity in parts of the brain associated with 21 ______.",
      18,
      21,
    ),
    {
      id: "cambridge-21-test-1-part2-questions-22-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following statements (Questions 22–26) and the list of people below. Match each statement with the correct person, A, B, C or D. Write the correct letter, A, B, C or D, in boxes 22–26 on your answer sheet. You may use any letter more than once.",
      questions: [
        { questionNumbers: [22], prompt: "It is unpleasant and upsetting for people to be placed in a silent environment against their will.", options: silencePeopleOptions },
        { questionNumbers: [23], prompt: "The trend towards creating quieter urban locations is likely to increase in the coming years.", options: silencePeopleOptions },
        { questionNumbers: [24], prompt: "When our body’s senses are completely deprived of input, our minds compensate for this by creating the illusion of images and sounds.", options: silencePeopleOptions },
        { questionNumbers: [25], prompt: "Even a short amount of silent time can have a positive impact.", options: silencePeopleOptions },
        { questionNumbers: [26], prompt: "External and internal quietness makes us more conscious of events occurring in our surroundings and helps us react appropriately to these events.", options: silencePeopleOptions },
      ],
    },
  ],
  source: {
    passagePages: [21, 22].map(sourcePage),
    questionPages: [23, 24, 25].map(sourcePage),
    answerPages: [sourcePage(119)],
  },
};

const worldOfSugar: ReadingPart = {
  id: "cambridge-21-test-1-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Book review: The World of Sugar by Ulbe Bosma",
  sections: [{
    id: "cambridge-21-test-1-part3-passage",
    format: "pre",
    paragraphs: [
      "Ulbe Bosma’s The World of Sugar is a genuinely global history. Bosma discusses all the sugar-growing places of the world, beginning with Cuba and Java, the largest exporters of the early 20th century. But this is a history not just of cane sugar but also of beet sugar, an equally important form of traded sugar over the last hundred years. Beet sugar is grown mainly in Europe and the United States. It has also been massively subsidised and sold at artificially low prices on world markets, threatening the livelihood of producers of cane sugar.",
      "Bosma’s discussion of the sugar market in Britain gives a sense of the book’s range. The sweet-toothed British first bought cane sugar from their own slavery-dependent colonial plantations. Following the abolition of slavery in the British Empire, cane sugar was imported to Britain from places which retained the practice, such as Cuba and Brazil. Towards the end of the 19th century, the British started to import beet sugar from continental Europe. Only in the 20th century was there a move to develop a national beet sugar industry.",
      "The book provides a global labour history, investigating the wide range of labour regimes associated with growing sugar. Contrary to popular belief, cane sugar production was never just restricted to large, dedicated plantations owned by rich men. For example, in Java, a huge exporter of sugar in the early 20th century, sugar cane was grown together with rice in an extraordinarily labour-intensive way by small farmers.",
      "The World of Sugar is also a story of similarity and continuity in sugar cultivation. For example, imported labour has been used for much large-scale production. German beet fields employed Polish workers; Mexicans and many others, including Sicilians, were vital to US sugar production. Cane cutting, Bosma shows, remains a poorly paid and brutal business to this day in many places in the world. But as well as this, the book is about the continuity of the use of traditional methods on small farms. In the mid-20th century, this type of sugar production dominated in South Asia and Latin America.",
      "This is also a history of capitalists and sugar dynasties, as well as corporations that in some cases have remained influential over very long periods. Great firms and great interests have had profound influence on the policies of states. In many places — not just the British Caribbean but Cuba and the Philippines too — a powerful sugar bourgeoisie played a major role in politics and their interests were consequently protected by trade barriers and subsidies. In the battle for control of the industry, it was inevitably the poor countries which came off worse. All this is explored by Bosma with wonderful subtlety and control.",
      "But sugar production was never just a matter of agriculture. It also involved the extraction, close to the place of harvest, of sucrose from the sugar plant, a process which required machinery powered by humans, animals, wind or steam. Further processes involved boiling (from the 19th century, this often involved vacuum systems) and the separation of sugar from other materials in a process known as refinement. From very early on, sugar production was an energy-intensive industrial process, mostly taking place in the countryside and in refineries in centres of consumption, both small and large. The growth of the industry entailed a very rapid diffusion of ideas and techniques from one country to another. Cuba, for example, developed an extraordinarily dense system of railways to transport workers and cane, as well as steam-powered sugar factories. Particular varieties of cane sugar and beet sugar spread very rapidly across the world, in accordance with local needs and demands. Where once only tiny quantities of sugar could be produced, now new techniques, varieties, fertilisers, irrigation systems and much more have turned gleaming white sugar into a ubiquitous chemical.",
      "Over the same time, there has been a massive increase in consumption. Once regarded as a luxury, sugar came to be promoted as a valuable source of energy. But as the consumption of sugar has increased, so has the harm it does, whether to people’s teeth or weight. In the face of appalling obstruction from the sugar industry to attempts to reduce consumption, some countries have been forced to tax sugar in order to bring that about. The sugar industry has a history of attacking its critics and, when it comes to obesity, of trying to blame fats, and lack of exercise and self-control. And the recent past has seen worrying new developments in mass sweetening. High-fructose corn syrup made from maize using an enzymatic process invented in Japan in the 1960s has a similar number of calories to table sugar but is far cheaper to produce. It is now widely consumed, having been adopted in the making of soft drinks and a large number of processed foods, and is regarded as a leading cause of obesity.",
      "This is a wonderfully rich book, a model of global history, the history of production and the history of capitalism. Bosma avoids outbursts of emotion, celebratory or critical, even if they might have made his analysis of the multiple tragedies involving sugar all the more powerful. He shows that we could always have done without sugar and that today we have many alternative sources of sweetness. Yet many of the poorest people in the world still depend on it to make a living.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-21-test-1-part3-questions-27-30",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27–30 on your answer sheet.",
      questions: [
        { questionNumbers: [27], prompt: "What does the reviewer suggest about the cultivation and trading of sugar in the first paragraph?", options: [
          { letter: "A", text: "Sugar has played a major role in international relations." }, { letter: "B", text: "Beet sugar has been made more internationally competitive." }, { letter: "C", text: "Cane sugar is thought to be of superior quality to beet sugar." }, { letter: "D", text: "New locations for cultivating sugar have increased production." },
        ] },
        { questionNumbers: [28], prompt: "In the second paragraph, when discussing the sugar market in Britain, the reviewer stresses", options: [
          { letter: "A", text: "how the sources used changed over time." }, { letter: "B", text: "how developments in agriculture affected trade." }, { letter: "C", text: "the increased demand for sugar over the years." }, { letter: "D", text: "the growing support for ethical methods of cultivation." },
        ] },
        { questionNumbers: [29], prompt: "What is the reviewer doing in the third paragraph?", options: [
          { letter: "A", text: "describing an efficient approach to sugar cultivation" }, { letter: "B", text: "explaining why the use of sugar plantations declined" }, { letter: "C", text: "addressing a misconception about the growing of sugar cane" }, { letter: "D", text: "evaluating different approaches to the cultivation of sugar cane" },
        ] },
        { questionNumbers: [30], prompt: "In the final paragraph, what does the reviewer suggest is the overall message of Bosma’s book?", options: [
          { letter: "A", text: "Sugar is a harmful and unnecessary product." }, { letter: "B", text: "Economic pressure is needed to control sugar production." }, { letter: "C", text: "Conditions for workers in sugar production should be improved." }, { letter: "D", text: "Intensive marketing of sugar has had disastrous consequences." },
        ] },
      ],
    },
    {
      id: "cambridge-21-test-1-part3-questions-31-36",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary using the list of words, A–I, below. Write the correct letter, A–I, in boxes 31–36 on your answer sheet.",
      questions: [
        { questionNumbers: [31], prompt: "In the big industries in both Germany and the US, sugar farming depended on …", options: sugarWordBank },
        { questionNumbers: [32], prompt: "In other parts of the world such as South Asia and Latin America, … continued.", options: sugarWordBank },
        { questionNumbers: [33], prompt: "Sugar production has also involved … who were eager to protect their markets.", options: sugarWordBank },
        { questionNumbers: [34], prompt: "In countries such as Cuba the sugar industry therefore had a major influence on …", options: sugarWordBank },
        { questionNumbers: [35], prompt: "To support the interests of sugar producers, … were established.", options: sugarWordBank },
        { questionNumbers: [36], prompt: "As a result of this, … were penalised.", options: sugarWordBank },
      ],
    },
    {
      id: "cambridge-21-test-1-part3-questions-37-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the views of the writer in Reading Passage 3? In boxes 37–40 on your answer sheet, write YES if the statement agrees with the views of the writer, NO if it contradicts the views of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [37], prompt: "Sugar has now become available in large quantities due to a range of agricultural developments.", options: yesNoNotGivenOptions },
        { questionNumbers: [38], prompt: "Advertisers initially marketed sugar as a luxury product.", options: yesNoNotGivenOptions },
        { questionNumbers: [39], prompt: "The invention of high-fructose corn syrup was a positive development.", options: yesNoNotGivenOptions },
        { questionNumbers: [40], prompt: "High-fructose corn syrup is an ingredient in many processed foods.", options: yesNoNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [26, 27].map(sourcePage),
    questionPages: [28, 29].map(sourcePage),
    answerPages: [sourcePage(119)],
  },
};

export const CAMBRIDGE21_TEST1_PARTS: ReadingPart[] = [daviesSisters, whyWeNeedSilence, worldOfSugar];

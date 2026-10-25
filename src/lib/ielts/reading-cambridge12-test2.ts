import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  37: [1510, 2237], 38: [1623, 2238], 39: [1505, 2235], 40: [1627, 2239],
  41: [1469, 2237], 42: [1614, 2237], 43: [1490, 2236], 44: [1643, 2238],
  45: [1501, 2235], 46: [1612, 2237], 47: [1504, 2237], 48: [1515, 2237],
  49: [1579, 2333], 50: [1621, 2238], 120: [1564, 1284],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci12-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = { 58: 495, 65: 946, 72: 836 };
  return {
    page,
    src: "/reading/explanations/cambridge-12-test-2-part" + part + "-exp12-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2249,
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

const agriculture: ReadingPart = {
  id: "cambridge-12-test-2-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "The risks agriculture faces in developing countries",
  subtitle: "Synthesis of an online debate",
  sections: [
    {
      id: "cambridge-12-test-2-part1-section-a",
      heading: "A",
      format: "pre",
      paragraphs: ["Two things distinguish food production from all other productive activities: first, every single person needs food each day and has a right to it; and second, it is hugely dependent on nature. These two unique aspects, one political, the other natural, make food production highly vulnerable and different from any other business. At the same time, cultural values are highly entrenched in food and agricultural systems worldwide."],
    },
    {
      id: "cambridge-12-test-2-part1-section-b",
      heading: "B",
      format: "pre",
      paragraphs: ["Farmers everywhere face major risks, including extreme weather, long-term climate change, and price volatility in input and product markets. However, smallholder farmers in developing countries must in addition deal with adverse environments, both natural, in terms of soil quality, rainfall, etc., and human, in terms of infrastructure, financial systems, markets, knowledge and technology. Counter-intuitively, hunger is prevalent among many smallholder farmers in the developing world."],
    },
    {
      id: "cambridge-12-test-2-part1-section-c",
      heading: "C",
      format: "pre",
      paragraphs: ["Participants in the online debate argued that our biggest challenge is to address the underlying causes of the agricultural system’s inability to ensure sufficient food for all, and they identified as drivers of this problem our dependency on fossil fuels and unsupportive government policies."],
    },
    {
      id: "cambridge-12-test-2-part1-section-d",
      heading: "D",
      format: "pre",
      paragraphs: ["On the question of mitigating the risks farmers face, most essayists called for greater state intervention. In his essay, Kanayo F. Nwanze, President of the International Fund for Agricultural Development, argued that governments can significantly reduce risks for farmers by providing basic services like roads to get produce more efficiently to markets, or water and food storage facilities to reduce losses. Sophia Murphy, senior advisor to the Institute for Agriculture and Trade Policy, suggested that the procurement and holding of stocks by governments can also help mitigate wild swings in food prices by alleviating uncertainties about market supply."],
    },
    {
      id: "cambridge-12-test-2-part1-section-e",
      heading: "E",
      format: "pre",
      paragraphs: ["Shenggen Fan, Director General of the International Food Policy Research Institute, held up social safety nets and public welfare programmes in Ethiopia, Brazil and Mexico as valuable ways to address poverty among farming families and reduce their vulnerability to agriculture shocks. However, some commentators responded that cash transfers to poor families do not necessarily translate into increased food security, as these programmes do not always strengthen food production or raise incomes. Regarding state subsidies for agriculture, Rokeya Kabir, Executive Director of Bangladesh Nari Progati Sangha, commented in her essay that these ‘have not compensated for the stranglehold exercised by private traders. In fact, studies show that sixty percent of beneficiaries of subsidies are not poor, but rich landowners and non-farmer traders.’"],
    },
    {
      id: "cambridge-12-test-2-part1-section-f",
      heading: "F",
      format: "pre",
      paragraphs: ["Nwanze, Murphy and Fan argued that private risk management tools, like private insurance, commodity futures markets, and rural finance can help small-scale producers mitigate risk and allow for investment in improvements. Kabir warned that financial support schemes often encourage the adoption of high-input agricultural practices, which in the medium term may raise production costs beyond the value of their harvests. Murphy noted that when futures markets become excessively financialised they can contribute to short-term price volatility, which increases farmers’ food insecurity. Many participants and commentators emphasised that greater transparency in markets is needed to mitigate the impact of volatility, and make evident whether adequate stocks and supplies are available. Others contended that agribusiness companies should be held responsible for paying for negative side effects."],
    },
    {
      id: "cambridge-12-test-2-part1-section-g",
      heading: "G",
      format: "pre",
      paragraphs: ["Many essayists mentioned climate change and its consequences for small-scale agriculture. Fan explained that ‘in addition to reducing crop yields, climate change increases the magnitude and the frequency of extreme weather events, which increase smallholder vulnerability.’ The growing unpredictability of weather patterns increases farmers’ difficulty in managing weather-related risks. According to this author, one solution would be to develop crop varieties that are more resilient to new climate trends and extreme weather patterns. Accordingly, Pat Mooney, co-founder and executive director of the ETC Group, suggested that ‘if we are to survive climate change, we must adopt policies that let peasants diversify the plant and animal species and varieties/breeds that make up our menus.’"],
    },
    {
      id: "cambridge-12-test-2-part1-section-h",
      heading: "H",
      format: "pre",
      paragraphs: ["Some participating authors and commentators argued in favour of community-based and autonomous risk management strategies through collective action groups, co-operatives or producers’ groups. Such groups enhance market opportunities for small-scale producers, reduce marketing costs and synchronise buying and selling with seasonal price conditions. According to Murphy, ‘collective action offers an important way for farmers to strengthen their political and economic bargaining power, and to reduce their business risks.’ One commentator, Giel Ton, warned that collective action does not come as a free good. It takes time, effort and money to organise, build trust and to experiment. Others, like Marcel Vernooij and Marcel Beukeboom, suggested that in order to ‘apply what we already know’, all stakeholders, including business, government, scientists and civil society, must work together, starting at the beginning of the value chain."],
    },
    {
      id: "cambridge-12-test-2-part1-section-i",
      heading: "I",
      format: "pre",
      paragraphs: ["Some participants explained that market price volatility is often worsened by the presence of intermediary purchasers who, taking advantage of farmers’ vulnerability, dictate prices. One commentator suggested farmers can gain greater control over prices and minimise price volatility by selling directly to consumers. Similarly, Sonali Bisht, founder and advisor to the Institute of Himalayan Environmental Research and Education (INHERE), India, wrote that community-supported agriculture, where consumers invest in local farmers by subscription and guarantee producers a fair price, is a risk-sharing model worth more attention. Direct food distribution systems not only encourage small-scale agriculture but also give consumers more control over the food they consume, she wrote."],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-12-test-2-part1-questions-1-3",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 1 has nine paragraphs, A–I. Which paragraph contains the following information? Write the correct letter, A–I, in boxes 1–3 on your answer sheet.",
      questions: [
        { questionNumbers: [1], prompt: "A reference to characteristics that only apply to food production", options: "ABCDEFGHI".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [2], prompt: "A reference to challenges faced only by farmers in certain parts of the world", options: "ABCDEFGHI".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [3], prompt: "A reference to difficulties in bringing about co-operation between farmers", options: "ABCDEFGHI".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
      ],
    },
    {
      id: "cambridge-12-test-2-part1-questions-4-9",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following statements (Questions 4–9) and the list of people below. Match each statement with the correct person, A–G. Write the correct letter, A–G, in boxes 4–9 on your answer sheet. You may use any letter more than once.",
      questions: [
        { questionNumbers: [4], prompt: "Financial assistance from the government does not always go to the farmers who most need it.", options: [
          { letter: "A", text: "Kanayo F. Nwanze" }, { letter: "B", text: "Sophia Murphy" }, { letter: "C", text: "Shenggen Fan" },
          { letter: "D", text: "Rokeya Kabir" }, { letter: "E", text: "Pat Mooney" }, { letter: "F", text: "Giel Ton" }, { letter: "G", text: "Sonali Bisht" },
        ] },
        { questionNumbers: [5], prompt: "Farmers can benefit from collaborating as a group.", options: [
          { letter: "A", text: "Kanayo F. Nwanze" }, { letter: "B", text: "Sophia Murphy" }, { letter: "C", text: "Shenggen Fan" },
          { letter: "D", text: "Rokeya Kabir" }, { letter: "E", text: "Pat Mooney" }, { letter: "F", text: "Giel Ton" }, { letter: "G", text: "Sonali Bisht" },
        ] },
        { questionNumbers: [6], prompt: "Financial assistance from the government can improve the standard of living of farmers.", options: [
          { letter: "A", text: "Kanayo F. Nwanze" }, { letter: "B", text: "Sophia Murphy" }, { letter: "C", text: "Shenggen Fan" },
          { letter: "D", text: "Rokeya Kabir" }, { letter: "E", text: "Pat Mooney" }, { letter: "F", text: "Giel Ton" }, { letter: "G", text: "Sonali Bisht" },
        ] },
        { questionNumbers: [7], prompt: "Farmers may be helped if there is financial input by the same individuals who buy from them.", options: [
          { letter: "A", text: "Kanayo F. Nwanze" }, { letter: "B", text: "Sophia Murphy" }, { letter: "C", text: "Shenggen Fan" },
          { letter: "D", text: "Rokeya Kabir" }, { letter: "E", text: "Pat Mooney" }, { letter: "F", text: "Giel Ton" }, { letter: "G", text: "Sonali Bisht" },
        ] },
        { questionNumbers: [8], prompt: "Governments can help to reduce variation in prices.", options: [
          { letter: "A", text: "Kanayo F. Nwanze" }, { letter: "B", text: "Sophia Murphy" }, { letter: "C", text: "Shenggen Fan" },
          { letter: "D", text: "Rokeya Kabir" }, { letter: "E", text: "Pat Mooney" }, { letter: "F", text: "Giel Ton" }, { letter: "G", text: "Sonali Bisht" },
        ] },
        { questionNumbers: [9], prompt: "Improvements to infrastructure can have a major impact on risk for farmers.", options: [
          { letter: "A", text: "Kanayo F. Nwanze" }, { letter: "B", text: "Sophia Murphy" }, { letter: "C", text: "Shenggen Fan" },
          { letter: "D", text: "Rokeya Kabir" }, { letter: "E", text: "Pat Mooney" }, { letter: "F", text: "Giel Ton" }, { letter: "G", text: "Sonali Bisht" },
        ] },
      ],
    },
    {
      id: "cambridge-12-test-2-part1-questions-10-13",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose TWO letters, A–E.",
      questions: [
        { questionNumbers: [10, 11], prompt: "Which TWO problems are mentioned which affect farmers with small farms in developing countries?", selectCount: 2, options: [
          { letter: "A", text: "Lack of demand for locally produced food" }, { letter: "B", text: "Lack of irrigation programmes" },
          { letter: "C", text: "Being unable to get insurance" }, { letter: "D", text: "The effects of changing weather patterns" },
          { letter: "E", text: "Having to sell their goods to intermediary buyers" },
        ] },
        { questionNumbers: [12, 13], prompt: "Which TWO actions are recommended for improving conditions for farmers?", selectCount: 2, options: [
          { letter: "A", text: "Reducing the size of food stocks" }, { letter: "B", text: "Attempting to ensure that prices rise at certain times of the year" },
          { letter: "C", text: "Organising co-operation between a wide range of interested parties" },
          { letter: "D", text: "Encouraging consumers to take a financial stake in farming" },
          { letter: "E", text: "Making customers aware of the reasons for changing food prices" },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [37, 38, 39].map(sourcePage),
    questionPages: [40, 41, 42].map(sourcePage),
    answerPages: [sourcePage(120)],
    explanationPages: [58, 59, 60, 61, 62].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集12精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const lostCity: ReadingPart = {
  id: "cambridge-12-test-2-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 below.",
  title: "The Lost City",
  subtitle: "An explorer’s encounter with the ruined city of Machu Picchu, the most famous icon of the Inca civilisation",
  sections: [
    { id: "cambridge-12-test-2-part2-section-a", heading: "A", format: "pre", paragraphs: ["When the US explorer and academic Hiram Bingham arrived in South America in 1911, he was ready for what was to be the greatest achievement of his life: the exploration of the remote hinterland to the west of Cusco, the old capital of the Inca empire in the Andes mountains of Peru. His goal was to locate the remains of a city called Vitcos, the last capital of the Inca civilisation. Cusco lies on a high plateau at an elevation of more than 3,000 metres, and Bingham’s plan was to descend from this plateau along the valley of the Urubamba river, which takes a circuitous route down to the Amazon and passes through an area of dramatic canyons and mountain ranges."] },
    { id: "cambridge-12-test-2-part2-section-b", heading: "B", format: "pre", paragraphs: ["When Bingham and his team set off down the Urubamba in late July, they had an advantage over travellers who had preceded them: a track had recently been blasted down the valley canyon to enable rubber to be brought up by mules from the jungle. Almost all previous travellers had left the river at Ollantaytambo and taken a high pass across the mountains to rejoin the river lower down, thereby cutting a substantial corner, but also therefore never passing through the area around Machu Picchu."] },
    { id: "cambridge-12-test-2-part2-section-c", heading: "C", format: "pre", paragraphs: ["On 24 July they were a few days into their descent of the valley. The day began slowly, with Bingham trying to arrange sufficient mules for the next stage of the trek. His companions showed no interest in accompanying him up the nearby hill to see some ruins that a local farmer, Melchor Arteaga, had told them about the night before. The morning was dull and damp, and Bingham also seems to have been less than keen on the prospect of climbing the hill. In his book Lost City of the Incas, he relates that he made the ascent without having the least expectation that he would find anything at the top."] },
    { id: "cambridge-12-test-2-part2-section-d", heading: "D", format: "pre", paragraphs: ["Bingham writes about the approach in vivid style in his book. First, as he climbs up the hill, he describes the ever-present possibility of deadly snakes, ‘capable of making considerable springs when in pursuit of their prey’; not that he sees any. Then there’s a sense of mounting discovery as he comes across great sweeps of terraces, then a mausoleum, followed by monumental staircases and, finally, the grand ceremonial buildings of Machu Picchu. ‘It seemed like an unbelievable dream ... the sight held me spellbound ...’ he wrote."] },
    { id: "cambridge-12-test-2-part2-section-e", heading: "E", format: "pre", paragraphs: ["We should remember, however, that Lost City of the Incas is a work of hindsight, not written until 1948, many years after his journey. His journal entries of the time reveal a much more gradual appreciation of his achievement. He spent the afternoon at the ruins noting down the dimensions of some of the buildings, then descended and rejoined his companions, to whom he seems to have said little about his discovery. At this stage, Bingham didn’t realise the extent or the importance of the site, nor did he realise what use he could make of the discovery."] },
    { id: "cambridge-12-test-2-part2-section-f", heading: "F", format: "pre", paragraphs: ["However, soon after returning it occurred to him that he could make a name for himself from this discovery. When he came to write the National Geographic magazine article that broke the story to the world in April 1913, he knew he had to produce a big idea. He wondered whether it could have been the birthplace of the very first Inca, Manco the Great, and whether it could also have been what chroniclers described as ‘the last city of the Incas’. This term refers to Vilcabamba, the settlement where the Incas had fled from Spanish invaders in the 1530s. Bingham made desperate attempts to prove this belief for nearly 40 years. Sadly, his vision of the site as both the beginning and end of the Inca civilisation, while a magnificent one, is inaccurate. We now know that Vilcabamba actually lies 65 kilometres away in the depths of the jungle."] },
    { id: "cambridge-12-test-2-part2-section-g", heading: "G", format: "pre", paragraphs: ["One question that has perplexed visitors, historians and archaeologists alike ever since Bingham, is why the site seems to have been abandoned before the Spanish Conquest. There are no references to it by any of the Spanish chroniclers — and if they had known of its existence so close to Cusco they would certainly have come in search of gold. An idea which has gained wide acceptance over the past few years is that Machu Picchu was a moya, a country estate built by an Inca emperor to escape the cold winters of Cusco, where the elite could enjoy monumental architecture and spectacular views. Furthermore, the particular architecture of Machu Picchu suggests that it was constructed at the time of the greatest of all the Incas, the emperor Pachacuti (c. 1438–71). By custom, Pachacuti’s descendants built other similar estates for their own use, and so Machu Picchu would have been abandoned after his death, some 50 years before the Spanish Conquest."] },
  ],
  questionBlocks: [
    {
      id: "cambridge-12-test-2-part2-headings-14-20",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 2 has seven paragraphs, A–G. Choose the correct heading for each paragraph from the list below. Write the correct number, i–viii.",
      questionNumbers: [14, 15, 16, 17, 18, 19, 20],
      options: [
        { id: "i", text: "Different accounts of the same journey" }, { id: "ii", text: "Bingham gains support" },
        { id: "iii", text: "A common belief" }, { id: "iv", text: "The aim of the trip" },
        { id: "v", text: "A dramatic description" }, { id: "vi", text: "A new route" },
        { id: "vii", text: "Bingham publishes his theory" }, { id: "viii", text: "Bingham’s lack of enthusiasm" },
      ],
    },
    {
      id: "cambridge-12-test-2-part2-questions-21-24",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 2? Write TRUE, FALSE or NOT GIVEN.",
      questions: [
        { questionNumbers: [21], prompt: "Bingham went to South America in search of an Inca city.", options: judgmentOptions },
        { questionNumbers: [22], prompt: "Bingham chose a particular route down the Urubamba valley because it was the most common route used by travellers.", options: judgmentOptions },
        { questionNumbers: [23], prompt: "Bingham understood the significance of Machu Picchu as soon as he saw it.", options: judgmentOptions },
        { questionNumbers: [24], prompt: "Bingham returned to Machu Picchu in order to find evidence to support his theory.", options: judgmentOptions },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-12-test-2-part2-questions-25-26",
        "Questions 25–26",
        "Questions 25–26\nComplete the sentences below. Choose ONE WORD ONLY from the passage for each answer.\n\n25 The track that took Bingham down the Urubamba valley had been created for the transportation of ______.\n\n26 Bingham found out about the ruins of Machu Picchu from a ______ in the Urubamba valley.",
        25,
        26,
      ),
    },
  ],
  source: {
    passagePages: [44, 45].map(sourcePage),
    questionPages: [43, 46].map(sourcePage),
    answerPages: [sourcePage(120)],
    explanationPages: [65, 66, 67, 68, 69].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集12精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const bilingual: ReadingPart = {
  id: "cambridge-12-test-2-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "The Benefits of Being Bilingual",
  sections: [
    { id: "cambridge-12-test-2-part3-section-a", heading: "A", format: "pre", paragraphs: ["According to the latest figures, the majority of the world’s population is now bilingual or multilingual, having grown up speaking two or more languages. In the past, such children were considered to be at a disadvantage compared with their monolingual peers. Over the past few decades, however, technological advances have allowed researchers to look more deeply at how bilingualism interacts with and changes the cognitive and neurological systems, thereby identifying several clear benefits of being bilingual."] },
    { id: "cambridge-12-test-2-part3-section-b", heading: "B", format: "pre", paragraphs: ["Research shows that when a bilingual person uses one language, the other is active at the same time. When we hear a word, we don’t hear the entire word all at once: the sounds arrive in sequential order. Long before the word is finished, the brain’s language system begins to guess what that word might be. If you hear ‘can’, you will likely activate words like ‘candy’ and ‘candle’ as well, at least during the earlier stages of word recognition. For bilingual people, this activation is not limited to a single language; auditory input activates corresponding words regardless of the language to which they belong. Some of the most compelling evidence for this phenomenon, called ‘language co-activation’, comes from studying eye movements. A Russian-English bilingual asked to ‘pick up a marker’ from a set of objects would look more at a stamp than someone who doesn’t know Russian, because the Russian word for ‘stamp’, marka, sounds like the English word he or she heard, ‘marker’. In cases like this, language co-activation occurs because what the listener hears could map onto words in either language."] },
    { id: "cambridge-12-test-2-part3-section-c", heading: "C", format: "pre", paragraphs: ["Having to deal with this persistent linguistic competition can result in difficulties, however. For instance, knowing more than one language can cause speakers to name pictures more slowly, and can increase ‘tip-of-the-tongue states’, when you can almost, but not quite, bring a word to mind. As a result, the constant juggling of two languages creates a need to control how much a person accesses a language at any given time. For this reason, bilingual people often perform better on tasks that require conflict management. In the classic Stroop Task, people see a word and are asked to name the colour of the word’s font. When the colour and the word match (i.e., the word ‘red’ printed in red), people correctly name the colour more quickly than when the colour and the word don’t match (i.e., the word ‘red’ printed in blue). This occurs because the word itself (‘red’) and its font colour (blue) conflict. Bilingual people often excel at tasks such as this, which tap into the ability to ignore competing perceptual information and focus on the relevant aspects of the input. Bilinguals are also better at switching between two tasks; for example, when bilinguals have to switch from categorizing objects by colour (red or green) to categorizing them by shape (circle or triangle), they do so more quickly than monolingual people, reflecting better cognitive control when having to make rapid changes of strategy."] },
    { id: "cambridge-12-test-2-part3-section-d", heading: "D", format: "pre", paragraphs: ["It also seems that the neurological roots of the bilingual advantage extend to brain areas more traditionally associated with sensory processing. When monolingual and bilingual adolescents listen to simple speech sounds without any intervening background noise, they show highly similar brain stem responses. When researchers play the same sound to both groups in the presence of background noise, however, the bilingual listeners’ neural response is considerably larger, reflecting better encoding of the sound’s fundamental frequency, a feature of sound closely related to pitch perception."] },
    { id: "cambridge-12-test-2-part3-section-e", heading: "E", format: "pre", paragraphs: ["Such improvements in cognitive and sensory processing may help a bilingual person to process information in the environment, and help explain why bilingual adults acquire a third language better than monolingual adults master a second language. This advantage may be rooted in the skill of focussing on information about the new language while reducing interference from the languages they already know."] },
    { id: "cambridge-12-test-2-part3-section-f", heading: "F", format: "pre", paragraphs: ["Research also indicates that bilingual experience may help to keep the cognitive mechanisms sharp by recruiting alternate brain networks to compensate for those that become damaged during aging. Older bilinguals enjoy improved memory relative to monolingual people, which can lead to real-world health benefits. In a study of over 200 patients with Alzheimer’s disease, a degenerative brain disease, bilingual patients reported showing initial symptoms of the disease an average of five years later than monolingual patients. In a follow-up study, researchers compared the brains of bilingual and monolingual patients matched on the severity of Alzheimer’s symptoms. Surprisingly, the bilinguals’ brains had more physical signs of disease than their monolingual counterparts, even though their outward behaviour and abilities were the same. If the brain is an engine, bilingualism may help it to go farther on the same amount of fuel."] },
    { id: "cambridge-12-test-2-part3-section-g", heading: "G", format: "pre", paragraphs: ["Furthermore, the benefits associated with bilingual experience seem to start very early. In one study, researchers taught seven-month-old babies growing up in monolingual or bilingual homes that when they heard a tinkling sound, a puppet appeared on one side of a screen. Halfway through the study, the puppet began appearing on the opposite side of the screen. In order to get a reward, the infants had to adjust the rule they’d learned; only the bilingual babies were able to successfully learn the new rule. This suggests that for very young children, as well as for older people, navigating a multilingual environment imparts advantages that transfer far beyond language."] },
  ],
  questionBlocks: [
    {
      id: "cambridge-12-test-2-part3-questions-27-31",
      type: "fill",
      title: "",
      instruction: "Complete the table below. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 27–31 on your answer sheet.",
      questions: [27, 28, 29, 30, 31].map((number) => ({ number, before: "Question " + number })),
      table: {
        headers: ["Test", "Findings"],
        rows: [
          [
            { before: "Observing the ", questionNumber: 27, after: " of Russian-English bilingual people when asked to select certain objects" },
            { before: "Bilingual people engage both languages simultaneously; a mechanism known as ", questionNumber: 28 },
          ],
          [
            { before: "A test called the ", questionNumber: 29, after: ", focusing on naming colours" },
            { before: "Bilingual people are more able to handle tasks involving a skill called ", questionNumber: 30 },
          ],
          [
            { text: "A test involving switching between tasks" },
            { before: "When changing strategies, bilingual people have superior ", questionNumber: 31 },
          ],
        ],
      },
    },
    {
      id: "cambridge-12-test-2-part3-questions-32-36",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 3? Write YES, NO or NOT GIVEN.",
      questions: [
        { questionNumbers: [32], prompt: "Attitudes towards bilingualism have changed in recent years.", options: yesNoOptions },
        { questionNumbers: [33], prompt: "Bilingual people are better than monolingual people at guessing correctly what words are before they are finished.", options: yesNoOptions },
        { questionNumbers: [34], prompt: "Bilingual people consistently name images faster than monolingual people.", options: yesNoOptions },
        { questionNumbers: [35], prompt: "Bilingual people’s brains process single sounds more efficiently than monolingual people in all situations.", options: yesNoOptions },
        { questionNumbers: [36], prompt: "Fewer bilingual people than monolingual people suffer from brain disease in old age.", options: yesNoOptions },
      ],
    },
    {
      id: "cambridge-12-test-2-part3-questions-37-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 3 has seven paragraphs, A–G. Which paragraph contains the following information? Write the correct letter, A–G.",
      questions: [
        { questionNumbers: [37], prompt: "An example of how bilingual and monolingual people’s brains respond differently to a certain type of non-verbal auditory input", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [38], prompt: "A demonstration of how a bilingual upbringing has benefits even before we learn to speak", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [39], prompt: "A description of the process by which people identify words that they hear", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [40], prompt: "Reference to some negative consequences of being bilingual", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
      ],
    },
  ],
  source: {
    passagePages: [47, 48].map(sourcePage),
    questionPages: [49, 50].map(sourcePage),
    answerPages: [sourcePage(120)],
    explanationPages: [72, 73, 74, 75, 76, 77].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集12精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE12_TEST2_PARTS: ReadingPart[] = [agriculture, lostCity, bilingual];

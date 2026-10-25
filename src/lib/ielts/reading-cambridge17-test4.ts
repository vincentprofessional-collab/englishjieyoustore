import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  81: [1412, 2001], 82: [1413, 2090], 83: [1412, 2090], 84: [1413, 2102],
  85: [1413, 2090], 86: [1411, 2090], 87: [1413, 2090], 88: [1401, 2102],
  89: [1413, 2090], 90: [1408, 2090], 91: [1412, 2091], 92: [1413, 2102],
  126: [1122, 1531],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1413, 2090];
  return {
    page,
    src: "/reading/source-pages/ci17-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = {
    209: 1933, 210: 2365, 211: 2382, 212: 2327, 213: 2372,
    219: 1602, 220: 2358, 221: 2376, 222: 2357, 223: 2372, 224: 2367, 225: 2374,
    230: 350, 231: 2364, 232: 2355, 233: 2351, 234: 2334, 235: 2366, 236: 2358,
  };
  return {
    page,
    src: "/reading/explanations/cambridge-17-test-4-part" + part + "-exp17-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2360,
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

const batsToTheRescue: ReadingPart = {
  id: "cambridge-17-test-4-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Bats to the rescue",
  subtitle: "How Madagascar’s bats are helping to save the rainforest",
  sections: [{
    id: "cambridge-17-test-4-part1-passage",
    format: "pre",
    paragraphs: [
      "There are few places in the world where relations between agriculture and conservation are more strained. Madagascar’s forests are being converted to agricultural land at a rate of one percent every year. Much of this destruction is fuelled by the cultivation of the country’s main staple crop: rice. And a key reason for this destruction is that insect pests are destroying vast quantities of what is grown by local subsistence farmers, leading them to clear forest to create new paddy fields. The result is devastating habitat and biodiversity loss on the island, but not all species are suffering. In fact, some of the island’s insectivorous bats are currently thriving and this has important implications for farmers and conservationists alike.",
      "Enter University of Cambridge zoologist Ricardo Rocha. He’s passionate about conservation, and bats. More specifically, he’s interested in how bats are responding to human activity and deforestation in particular. Rocha’s new study shows that several species of bats are giving Madagascar’s rice farmers a vital pest control service by feasting on plagues of insects. And this, he believes, can ease the financial pressure on farmers to turn forest into fields.",
      "Bats comprise roughly one-fifth of all mammal species in Madagascar and thirty-six recorded bat species are native to the island, making it one of the most important regions for conservation of this animal group anywhere in the world.",
      "Co-leading an international team of scientists, Rocha found that several species of indigenous bats are taking advantage of habitat modification to hunt insects swarming above the country’s rice fields. They include the Malagasy mouse-eared bat, Major’s long-fingered bat, the Malagasy white-bellied free-tailed bat and Peters’ wrinkle-lipped bat.",
      "‘These winner species are providing a valuable free service to Madagascar as biological pest suppressors,’ says Rocha. ‘We found that six species of bat are preying on rice pests, including the paddy swarming caterpillar and grass webworm. The damage which these insects cause puts the island’s farmers under huge financial pressure and that encourages deforestation.’",
      "The study, now published in the journal Agriculture, Ecosystems and Environment, set out to investigate the feeding activity of insectivorous bats in the farmland bordering the Ranomafana National Park in the southeast of the country.",
      "Rocha and his team used state-of-the-art ultrasonic recorders to record over a thousand bat ‘feeding buzzes’ (echolocation sequences used by bats to target their prey) at 54 sites, in order to identify the favourite feeding spots of the bats. They next used DNA barcoding techniques to analyse droppings collected from bats at the different sites.",
      "The recordings revealed that bat activity over rice fields was much higher than it was in continuous forest — seven times higher over rice fields which were on flat ground, and sixteen times higher over fields on the sides of hills — leaving no doubt that the animals are preferentially foraging in these man-made ecosystems. The researchers suggest that the bats favour these fields because lack of water and nutrient run-off make these crops more susceptible to insect pest infestations. DNA analysis showed that all six species of bat had fed on economically important insect pests. While the findings indicated that rice farming benefits most from the bats, the scientists also found indications that the bats were consuming pests of other crops, including the black twig borer (which infests coffee plants), the sugarcane cicada, the macadamia nut-borer, and the sober tabby (a pest of citrus fruits).",
      "‘The effectiveness of bats as pest controllers has already been proven in the USA and Catalonia,’ said co-author James Kemp, from the University of Lisbon. ‘But our study is the first to show this happening in Madagascar, where the stakes for both farmers and conservationists are so high.’",
      "Local people may have a further reason to be grateful to their bats. While the animal is often associated with spreading disease, Rocha and his team found evidence that Malagasy bats feed not just on crop pests but also on mosquitoes — carriers of malaria, Rift Valley fever virus and elephantiasis — as well as blackflies, which spread river blindness.",
      "Rocha points out that the relationship is complicated. When food is scarce, bats become a crucial source of protein for local people. Even the children will hunt them. And as well as roosting in trees, the bats sometimes roost in buildings, but are not welcomed there because they make them unclean. At the same time, however, they are associated with sacred caves and the ancestors, so they can be viewed as beings between worlds, which makes them very significant in the culture of the people. And one potential problem is that while these bats are benefiting from farming, at the same time deforestation is reducing the places where they can roost, which could have long-term effects on their numbers. Rocha says, ‘With the right help, we hope that farmers can promote this mutually beneficial relationship by installing bat houses.’",
      "Rocha and his colleagues believe that maximising bat populations can help to boost crop yields and promote sustainable livelihoods. The team is now calling for further research to quantify this contribution. ‘I’m very optimistic,’ says Rocha. ‘If we give nature a hand, we can speed up the process of regeneration.’",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-17-test-4-part1-questions-1-6",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 1–6 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [1], prompt: "Many Madagascan forests are being destroyed by attacks from insects.", options: trueFalseNotGivenOptions },
        { questionNumbers: [2], prompt: "Loss of habitat has badly affected insectivorous bats in Madagascar.", options: trueFalseNotGivenOptions },
        { questionNumbers: [3], prompt: "Ricardo Rocha has carried out studies of bats in different parts of the world.", options: trueFalseNotGivenOptions },
        { questionNumbers: [4], prompt: "Habitat modification has resulted in indigenous bats in Madagascar becoming useful to farmers.", options: trueFalseNotGivenOptions },
        { questionNumbers: [5], prompt: "The Malagasy mouse-eared bat is more common than other indigenous bat species in Madagascar.", options: trueFalseNotGivenOptions },
        { questionNumbers: [6], prompt: "Bats may feed on paddy swarming caterpillars and grass webworms.", options: trueFalseNotGivenOptions },
      ],
    },
    rawFillBlock(
      "cambridge-17-test-4-part1-questions-7-13",
      "The study carried out by Rocha’s team",
      "Complete the table below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 7–13 on your answer sheet.",
      "The study carried out by Rocha’s team\n\nAim: To investigate the feeding habits of bats in farmland near the Ranomafana National Park.\n\nMethods:\n• Ultrasonic recording to identify favourite feeding spots.\n• DNA analysis of bat 7 ______.\n\nFindings:\n• The bats were most active in rice fields located on hills.\n• They ate pests of rice, 8 ______, sugarcane, nuts and fruit.\n• They prevent the spread of disease by eating 9 ______ and blackflies.\n• Local attitudes to bats are mixed:\n  – They provide food rich in 10 ______.\n  – The buildings where they roost become 11 ______.\n  – They play an important role in local 12 ______.\n\nRecommendation:\n• Farmers should provide special 13 ______ to support the bat population.",
      7,
      13,
    ),
  ],
  source: {
    passagePages: [81, 82].map(sourcePage),
    questionPages: [83, 84].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [209, 210, 211, 212, 213].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集17精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const educationGrowth: ReadingPart = {
  id: "cambridge-17-test-4-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Does education fuel economic growth?",
  sections: [
    {
      id: "cambridge-17-test-4-part2-section-a",
      heading: "A",
      format: "pre",
      paragraphs: [
        "Over the last decade, a huge database about the lives of southwest German villagers between 1600 and 1900 has been compiled by a team led by Professor Sheilagh Ogilvie at Cambridge University’s Faculty of Economics. It includes court records, guild ledgers, parish registers, village censuses, tax lists and — the most recent addition — 9,000 handwritten inventories listing over a million personal possessions belonging to ordinary women and men across three centuries. Ogilvie, who discovered the inventories in the archives of two German communities 30 years ago, believes they may hold the answer to a conundrum that has long puzzled economists: the lack of evidence for a causal link between education and a country’s economic growth.",
      ],
    },
    {
      id: "cambridge-17-test-4-part2-section-b",
      heading: "B",
      format: "pre",
      paragraphs: [
        "As Ogilvie explains, ‘Education helps us to work more productively, invent better technology, and earn more ... surely it must be critical for economic growth? But, if you look back through history, there’s no evidence that having a high literacy rate made a country industrialise earlier.’ Between 1600 and 1900, England had only mediocre literacy rates by European standards, yet its economy grew fast and it was the first country to industrialise. During this period, Germany and Scandinavia had excellent literacy rates, but their economies grew slowly and they industrialised late. ‘Modern cross-country analyses have also struggled to find evidence that education causes economic growth, even though there is plenty of evidence that growth increases education,’ she adds.",
      ],
    },
    {
      id: "cambridge-17-test-4-part2-section-c",
      heading: "C",
      format: "pre",
      paragraphs: [
        "In the handwritten inventories that Ogilvie is analysing are the belongings of women and men at marriage, remarriage and death. From badger skins to Bibles, sewing machines to scarlet bodices — the villagers’ entire worldly goods are included. Inventories of agricultural equipment and craft tools reveal economic activities; ownership of books and education-related objects like pens and slates suggests how people learned. In addition, the tax lists included in the database record the value of farms, workshops, assets and debts; signatures and people’s estimates of their age indicate literacy and numeracy levels; and court records reveal obstacles (such as the activities of the guilds*) that stifled industry.",
        "Previous studies usually had just one way of linking education with economic growth — the presence of schools and printing presses, perhaps, or school enrolment, or the ability to sign names. According to Ogilvie, the database provides multiple indicators for the same individuals, making it possible to analyse links between literacy, numeracy, wealth, and industriousness, for individual women and men over the long term. * guild: an association of artisans or merchants which oversees the practice of their craft or trade in a particular area.",
      ],
    },
    {
      id: "cambridge-17-test-4-part2-section-d",
      heading: "D",
      format: "pre",
      paragraphs: [
        "Ogilvie and her team have been building the vast database of material possessions on top of their full demographic reconstruction of the people who lived in these two German communities. ‘We can follow the same people — and their descendants — across 300 years of educational and economic change,’ she says. Individual lives have unfolded before their eyes. Stories like that of the 24-year-olds Ana Regina and Magdalena Riethmüllerin, who were chastised in 1707 for reading books in church instead of listening to the sermon. ‘This tells us they were continuing to develop their reading skills at least a decade after leaving school,’ explains Ogilvie. The database also reveals the case of Juliana Schweickherdt, a 50-year-old spinster living in the small Black Forest community of Wildberg, who was reprimanded in 1752 by the local weavers’ guild for ‘weaving cloth and combing wool, counter to the guild ordinance’. When Juliana continued taking jobs reserved for male guild members, she was summoned before the guild court and told to pay a fine equivalent to one third of a servant’s annual wage. It was a small act of defiance by today’s standards, but it reflects a time when laws in Germany and elsewhere regulated people’s access to labour markets. The dominance of guilds not only prevented people from using their skills, but also held back even the simplest industrial innovation.",
      ],
    },
    {
      id: "cambridge-17-test-4-part2-section-e",
      heading: "E",
      format: "pre",
      paragraphs: [
        "The data-gathering phase of the project has been completed and now, according to Ogilvie, it is time ‘to ask the big questions’. One way to look at whether education causes economic growth is to ‘hold wealth constant’. This involves following the lives of different people with the same level of wealth over a period of time. If wealth is constant, it is possible to discover whether education was, for example, linked to the cultivation of new crops, or to the adoption of industrial innovations like sewing machines. The team will also ask what aspect of education helped people engage more with productive and innovative activities. Was it, for instance, literacy, numeracy, book ownership, years of schooling? Was there a threshold level — a tipping point — that needed to be reached to affect economic performance?",
      ],
    },
    {
      id: "cambridge-17-test-4-part2-section-f",
      heading: "F",
      format: "pre",
      paragraphs: [
        "Ogilvie hopes to start finding answers to these questions over the next few years. One thing is already clear, she says: the relationship between education and economic growth is far from straightforward. ‘German-speaking central Europe is an excellent laboratory for testing theories of economic growth,’ she explains. Between 1600 and 1900, literacy rates and book ownership were high and yet the region remained poor. It was also the case that local guilds and merchant associations were extremely powerful and legislated against anything that undermined their monopolies. In villages throughout the region, guilds blocked labour migration and resisted changes that might reduce their influence.",
        "‘Early findings suggest that the potential benefits of education for the economy can be held back by other barriers, and this has implications for today,’ says Ogilvie. ‘Huge amounts are spent improving education in developing countries, but this spending can fail to deliver economic growth if restrictions block people — especially women and the poor — from using their education in economically productive ways. If economic institutions are poorly set up, for instance, education can’t lead to growth.’",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-17-test-4-part2-questions-14-18",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has six sections, A–F. Which section contains the following information? Write the correct letter, A–F, in boxes 14–18 on your answer sheet.",
      questions: [
        { questionNumbers: [14], prompt: "An explanation of the need for research to focus on individuals with a fairly consistent income.", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [15], prompt: "Examples of the sources the database has been compiled from.", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [16], prompt: "An account of one individual’s refusal to obey an order.", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [17], prompt: "A reference to a region being particularly suited to research into the link between education and economic growth.", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [18], prompt: "Examples of the items included in a list of personal possessions.", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Section " + letter })) },
      ],
    },
    rawFillBlock(
      "cambridge-17-test-4-part2-questions-19-22",
      "Demographic reconstruction of two German communities",
      "Complete the summary below. Choose ONE WORD from the passage for each answer. Write your answers in boxes 19–22 on your answer sheet.",
      "Demographic reconstruction of two German communities\n\nThe database that Ogilvie and her team has compiled sheds light on the lives of a range of individuals, as well as those of their 19 ______, over a 300-year period. For example, Ana Regina and Magdalena Riethmüllerin were reprimanded for reading while they should have been paying attention to a 20 ______. There was also Juliana Schweickherdt, who came to the notice of the weavers’ guild in the year 1752 for breaking guild rules. As a punishment, she was later given a 21 ______. Cases like these illustrate how the guilds could prevent 22 ______ and stop skilled people from working.",
      19,
      22,
    ),
    {
      id: "cambridge-17-test-4-part2-questions-23-24",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 23 and 24 on your answer sheet.",
      questions: [{
        questionNumbers: [23, 24],
        selectCount: 2,
        prompt: "Which TWO of the following statements does the writer make about literacy rates in Section B?",
        options: [
          { letter: "A", text: "Very little research has been done into the link between high literacy rates and improved earnings." },
          { letter: "B", text: "Literacy rates in Germany between 1600 and 1900 were very good." },
          { letter: "C", text: "There is strong evidence that high literacy rates in the modern world result in economic growth." },
          { letter: "D", text: "England is a good example of how high literacy rates helped a country industrialise." },
          { letter: "E", text: "Economic growth can help to improve literacy rates." },
        ],
      }],
    },
    {
      id: "cambridge-17-test-4-part2-questions-25-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 25 and 26 on your answer sheet.",
      questions: [{
        questionNumbers: [25, 26],
        selectCount: 2,
        prompt: "Which TWO of the following statements does the writer make in Section F about guilds in German-speaking Central Europe between 1600 and 1900?",
        options: [
          { letter: "A", text: "They helped young people to learn a skill." },
          { letter: "B", text: "They were opposed to people moving to an area for work." },
          { letter: "C", text: "They kept better records than guilds in other parts of the world." },
          { letter: "D", text: "They opposed practices that threatened their control over a trade." },
          { letter: "E", text: "They predominantly consisted of wealthy merchants." },
        ],
      }],
    },
  ],
  source: {
    passagePages: [85, 86].map(sourcePage),
    questionPages: [87, 88].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [219, 220, 221, 222, 223, 224, 225].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集17精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const blindfoldChess: ReadingPart = {
  id: "cambridge-17-test-4-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Timur Gareyev — blindfold chess champion",
  sections: [
    {
      id: "cambridge-17-test-4-part3-section-a",
      heading: "A",
      format: "pre",
      paragraphs: [
        "Next month, a chess player named Timur Gareyev will take on nearly 50 opponents at once. But that is not the hard part. While his challengers will play the games as normal, Gareyev himself will be blindfolded. Even by world record standards, it sets a high bar for human performance. The 28-year-old already stands out in the rarefied world of blindfold chess. He has a fondness for bright clothes and unusual hairstyles, and he gets his kicks from the adventure sport of BASE jumping. He has already proved himself a strong chess player, too. In a 10-hour chess marathon in 2013, Gareyev played 33 games in his head simultaneously. He won 29 and lost none. The skill has become his brand: he calls himself the Blindfold King.",
      ],
    },
    {
      id: "cambridge-17-test-4-part3-section-b",
      heading: "B",
      format: "pre",
      paragraphs: [
        "But Gareyev’s prowess has drawn interest from beyond the chess-playing community. In the hope of understanding how he and others like him can perform such mental feats, researchers at the University of California in Los Angeles (UCLA) called him in for tests. They now have their first results. ‘The ability to play a game of chess with your eyes closed is not a far reach for most accomplished players,’ said Jesse Rissman, who runs a memory lab at UCLA. ‘But the thing that’s so remarkable about Timur and a few other individuals is the number of games they can keep active at once. To me it is simply astonishing.’",
      ],
    },
    {
      id: "cambridge-17-test-4-part3-section-c",
      heading: "C",
      format: "pre",
      paragraphs: [
        "Gareyev learned to play chess in his native Uzbekistan when he was six years old. Tutored by his grandfather, he entered his first tournament aged eight and soon became obsessed with competitions. At 16, he was crowned Asia’s youngest ever chess grandmaster. He moved to the US soon after, and as a student helped his university win its first national chess championship. In 2013, Gareyev was ranked the third best chess player in the US.",
      ],
    },
    {
      id: "cambridge-17-test-4-part3-section-d",
      heading: "D",
      format: "pre",
      paragraphs: [
        "To the uninitiated, blindfold chess seems to call for superhuman skill. But displays of the feat go back centuries. The first recorded game in Europe was played in 13th-century Florence. In 1947, the Argentinian grandmaster Miguel Najdorf played 45 simultaneous games in his mind, winning 39 in the 24-hour session.",
      ],
    },
    {
      id: "cambridge-17-test-4-part3-section-e",
      heading: "E",
      format: "pre",
      paragraphs: [
        "Accomplished players can develop the skill of playing blind even without realising it. The nature of the game is to run through possible moves in the mind to see how they play out. From this, regular players develop a memory for the patterns the pieces make, the defences and attacks. ‘You recreate it in your mind,’ said Gareyev. ‘A lot of players are capable of doing what I’m doing.’ The real mental challenge comes from playing multiple games at once in the head. Not only must the positions of each piece on every board be memorised, they must be recalled faithfully when needed, updated with each player’s moves, and then reliably stored again, so the brain can move on to the next board. First moves can be tough to remember because they are fairly uninteresting. But the ends of games are taxing too, as exhaustion sets in. When Gareyev is tired, his recall can get patchy. He sometimes makes moves based on only a fragmented memory of the pieces’ positions.",
      ],
    },
    {
      id: "cambridge-17-test-4-part3-section-f",
      heading: "F",
      format: "pre",
      paragraphs: [
        "The scientists first had Gareyev perform some standard memory tests. These assessed his ability to hold numbers, pictures and words in mind. One classic test measures how many numbers a person can repeat, both forwards and backwards, soon after hearing them. Most people manage about seven. ‘He was not exceptional on any of these standard tests,’ said Rissman. ‘We didn’t find anything other than playing chess that he seems to be supremely gifted at.’ But next came the brain scans. With Gareyev lying down in the machine, Rissman looked at how well connected the various regions of the chess player’s brain were. Though the results are tentative and as yet unpublished, the scans found much greater than average communication between parts of Gareyev’s brain that make up what is called the frontoparietal control network. Of 63 people scanned alongside the chess player, only one or two scored more highly on the measure. ‘You use this network in almost any complex task. It helps you to allocate attention, keep rules in mind, and work out whether you should be responding or not,’ said Rissman.",
      ],
    },
    {
      id: "cambridge-17-test-4-part3-section-g",
      heading: "G",
      format: "pre",
      paragraphs: [
        "It was not the only hint of something special in Gareyev’s brain. The scans also suggest that Gareyev’s visual network is more highly connected to other brain parts than usual. Initial results suggest that the areas of his brain that process visual images — such as chess boards — may have stronger links to other brain regions, and so be more powerful than normal. While the analyses are not finalised yet, they may hold the first clues to Gareyev’s extraordinary ability.",
      ],
    },
    {
      id: "cambridge-17-test-4-part3-section-h",
      heading: "H",
      format: "pre",
      paragraphs: [
        "For the world record attempt, Gareyev hopes to play 47 blindfold games at once in about 16 hours. He will need to win 80% to claim the title. ‘I don’t worry too much about the winning percentage, that’s never been an issue for me,’ he said. ‘The most important part of blindfold chess for me is that I have found the one thing that I can fully dedicate myself to. I miss having an obsession.’",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-17-test-4-part3-questions-27-32",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 3 has eight paragraphs, A–H. Which paragraph contains the following information? Write the correct letter, A–H, in boxes 27–32 on your answer sheet. NB You may use any letter more than once.",
      questions: [
        { questionNumbers: [27], prompt: "A reference to earlier examples of blindfold chess.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [28], prompt: "An outline of what blindfold chess involves.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [29], prompt: "A claim that Gareyev’s skill is limited to chess.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [30], prompt: "Why Gareyev’s skill is of interest to scientists.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [31], prompt: "An outline of Gareyev’s priorities.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [32], prompt: "A reason why the last part of a game may be difficult.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
      ],
    },
    {
      id: "cambridge-17-test-4-part3-questions-33-36",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 3? In boxes 33–36 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [33], prompt: "In the forthcoming games, all the participants will be blindfolded.", options: trueFalseNotGivenOptions },
        { questionNumbers: [34], prompt: "Gareyev has won competitions in BASE jumping.", options: trueFalseNotGivenOptions },
        { questionNumbers: [35], prompt: "UCLA is the first university to carry out research into blindfold chess players.", options: trueFalseNotGivenOptions },
        { questionNumbers: [36], prompt: "Good chess players are likely to be able to play blindfold chess.", options: trueFalseNotGivenOptions },
      ],
    },
    rawFillBlock(
      "cambridge-17-test-4-part3-questions-37-40",
      "How the research was carried out",
      "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 37–40 on your answer sheet.",
      "How the research was carried out\n\nThe researchers started by testing Gareyev’s 37 ______; for example, he was required to recall a string of 38 ______ in order and also in reverse order. Although his performance was normal, scans showed an unusual amount of 39 ______ within the areas of Gareyev’s brain that are concerned with directing attention. In addition, the scans raised the possibility of unusual strength in the parts of his brain that deal with 40 ______ input.",
      37,
      40,
    ),
  ],
  source: {
    passagePages: [89, 90].map(sourcePage),
    questionPages: [91, 92].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [230, 231, 232, 233, 234, 235, 236].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集17精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE17_TEST4_PARTS: ReadingPart[] = [batsToTheRescue, educationGrowth, blindfoldChess];

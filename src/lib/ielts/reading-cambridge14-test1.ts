import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  17: [1656, 2326], 18: [1520, 2325], 19: [1653, 2236], 20: [1580, 2324],
  21: [1655, 2328], 22: [1683, 2323], 23: [1417, 2237], 24: [1579, 2324],
  25: [1579, 2327], 26: [1518, 2322], 27: [1650, 2330], 28: [1545, 2324],
  29: [1735, 2327], 121: [1624, 1471],
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
  const heights: Record<number, number> = { 24: 2005, 32: 1103, 42: 443 };
  return {
    page,
    src: "/reading/explanations/cambridge-14-test-1-part" + part + "-exp14-p" + String(page).padStart(3, "0") + ".webp",
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

const yesNoOptions = [
  { letter: "YES", text: "The statement agrees with the claims of the writer." },
  { letter: "NO", text: "The statement contradicts the claims of the writer." },
  { letter: "NOT GIVEN", text: "It is impossible to say what the writer thinks about this." },
];

const childrenPlay: ReadingPart = {
  id: "cambridge-14-test-1-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "The importance of children’s play",
  sections: [{
    id: "cambridge-14-test-1-part1-passage",
    format: "pre",
    paragraphs: [
      "Brick by brick, six-year-old Alice is building a magical kingdom. Imagining fairy-tale turrets and fire-breathing dragons, wicked witches and gallant heroes, she’s creating an enchanting world. Although she isn’t aware of it, this fantasy is helping her take her first steps towards her capacity for creativity and so it will have important repercussions in her adult life.",
      "Minutes later, Alice has abandoned the kingdom in favour of playing schools with her younger brother. When she bosses him around as his ‘teacher’, she’s practising how to regulate her emotions through pretence. Later on, when they tire of this and settle down with a board game, she’s learning about the need to follow rules and take turns with a partner.",
      "‘Play in all its rich variety is one of the highest achievements of the human species,’ says Dr David Whitebread from the Faculty of Education at the University of Cambridge, UK. ‘It underpins how we develop as intellectual, problem-solving adults and is crucial to our success as a highly adaptable species.’",
      "Recognising the importance of play is not new: over two millennia ago, the Greek philosopher Plato extolled its virtues as a means of developing skills for adult life, and ideas about play-based learning have been developing since the 19th century.",
      "But we live in changing times, and Whitebread is mindful of a worldwide decline in play, pointing out that over half the people in the world now live in cities. ‘The opportunities for free play, which I experienced almost every day of my childhood, are becoming increasingly scarce,’ he says. Outdoor play is curtailed by perceptions of risk to do with traffic, as well as parents’ increased wish to protect their children from being the victims of crime, and by the emphasis on ‘earlier is better’ which is leading to greater competition in academic learning and schools.",
      "International bodies like the United Nations and the European Union have begun to develop policies concerned with children’s right to play, and to consider implications for leisure facilities and educational programmes. But what they often lack is the evidence to base policies on.",
      "‘The type of play we are interested in is child-initiated, spontaneous and unpredictable — but, as soon as you ask a five-year-old “to play”, then you as the researcher have intervened,’ explains Dr Sara Baker. ‘And we want to know what the long-term impact of play is. It’s a real challenge.’",
      "Dr Jenny Gibson agrees, pointing out that although some of the steps in the puzzle of how and why play is important have been looked at, there is very little data on the impact it has on the child’s later life.",
      "Now, thanks to the university’s new Centre for Research on Play in Education, Development and Learning (PEDAL), Whitebread, Baker, Gibson and a team of researchers hope to provide evidence on the role played by play in how a child develops.",
      "‘A strong possibility is that play supports the early development of children’s self-control,’ explains Baker. ‘This is our ability to develop awareness of our own thinking processes — it influences how effectively we go about undertaking challenging activities.’",
      "In a study carried out by Baker with toddlers and young pre-schoolers, she found that children with greater self-control solved problems more quickly when exploring an unfamiliar set-up requiring scientific reasoning. ‘This sort of evidence makes us think that giving children the chance to play will make them more successful problem-solvers in the long run.’",
      "If playful experiences do facilitate this aspect of development, say the researchers, it could be extremely significant for educational practices, because the ability to self-regulate has been shown to be a key predictor of academic performance.",
      "Gibson adds: ‘Playful behaviour is also an important indicator of healthy social and emotional development. In my previous research, I investigated how observing children at play can give us important clues about their well-being and can even be useful in the diagnosis of neurodevelopmental disorders like autism.’",
      "Whitebread’s recent research has involved developing a play-based approach to supporting children’s writing. ‘Many primary school children find writing difficult, but we showed in a previous study that a playful stimulus was far more effective than an instructional one.’ Children wrote longer and better-structured stories when they first played with dolls representing characters in the story. In the latest study, children first created their story with Lego*, with similar results. ‘Many teachers commented that they had always previously had children saying they didn’t know what to write about. With the Lego building, however, not a single child said this through the whole year of the project.’",
      "Whitebread, who directs PEDAL, trained as a primary school teacher in the early 1970s, when, as he describes, ‘the teaching of young children was largely a quiet backwater, untroubled by any serious intellectual debate or controversy.’ Now, the landscape is very different, with hotly debated topics such as school starting age.",
      "‘Somehow the importance of play has been lost in recent decades. It’s regarded as something trivial, or even as something negative that contrasts with “work”. Let’s not lose sight of its benefits, and the fundamental contributions it makes to human achievements in the arts, sciences and technology. Let’s make sure children have a rich diet of play experiences.’",
      "* Lego: coloured plastic building blocks and other pieces that can be joined together",
    ],
  }],
  questionBlocks: [
    {
      ...rawFillBlock(
        "cambridge-14-test-1-part1-questions-1-8",
        "Children’s play",
        "Questions 1–8\nComplete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 1–8 on your answer sheet.\n\nChildren’s play\n\nUses of children’s play\n• building a ‘magical kingdom’ may help develop 1 ______\n• board games involve 2 ______ and turn-taking\n\nRecent changes affecting children’s play\n• populations of 3 ______ have grown\n• opportunities for free play are limited due to:\n  – fear of 4 ______\n  – fear of 5 ______\n  – increased 6 ______ in schools\n\nInternational policies on children’s play\n• it is difficult to find 7 ______ to support new policies\n• research needs to study the impact of play on the rest of the child’s 8 ______",
        1,
        8,
      ),
    },
    {
      id: "cambridge-14-test-1-part1-questions-9-13",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 9–13 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [9], prompt: "Children with good self-control are known to be likely to do well at school later on.", options: judgmentOptions },
        { questionNumbers: [10], prompt: "The way a child plays may provide information about possible medical problems.", options: judgmentOptions },
        { questionNumbers: [11], prompt: "Playing with dolls was found to benefit girls’ writing more than boys’ writing.", options: judgmentOptions },
        { questionNumbers: [12], prompt: "Children had problems thinking up ideas when they first created the story with Lego.", options: judgmentOptions },
        { questionNumbers: [13], prompt: "People nowadays regard children’s play as less significant than they did in the past.", options: judgmentOptions },
      ],
    },
  ],
  source: {
    passagePages: [17, 18, 19, 20].map(sourcePage),
    questionPages: [19, 20].map(sourcePage),
    answerPages: [sourcePage(121)],
    explanationPages: [24, 25, 26, 27].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集14精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const bikeSharingSections = [
  {
    id: "cambridge-14-test-1-part2-section-a",
    heading: "A",
    format: "pre" as const,
    paragraphs: ["The original idea for an urban bike-sharing scheme dates back to a summer’s day in Amsterdam in 1965. Provo, the organisation that came up with the idea, was a group of Dutch activists who wanted to change society. They believed the scheme, which was known as the Witte Fietsenplan, was an answer to the perceived threats of air pollution and consumerism. In the centre of Amsterdam, they painted a small number of used bikes white. They also distributed leaflets describing the dangers of cars and inviting people to use the white bikes. The bikes were then left unlocked at various locations around the city, to be used by anyone in need of transport."],
  },
  {
    id: "cambridge-14-test-1-part2-section-b",
    heading: "B",
    format: "pre" as const,
    paragraphs: ["Luud Schimmelpennink, a Dutch industrial engineer who still lives and cycles in Amsterdam, was heavily involved in the original scheme. He recalls how the scheme succeeded in attracting a great deal of attention — particularly when it came to publicising Provo’s aims — but struggled to get off the ground. The police were opposed to Provo’s initiatives and almost as soon as the white bikes were distributed around the city, they removed them. However, for Schimmelpennink and for bike-sharing schemes in general, this was just the beginning. ‘The first Witte Fietsenplan was just a symbolic thing,’ he says. ‘We painted a few bikes white, that was all. Things got more serious when I became a member of the Amsterdam city council two years later.’"],
  },
  {
    id: "cambridge-14-test-1-part2-section-c",
    heading: "C",
    format: "pre" as const,
    paragraphs: ["Schimmelpennink seized this opportunity to present a more elaborate Witte Fietsenplan to the city council. ‘My idea was that the municipality of Amsterdam would distribute 10,000 white bikes over the city, for everyone to use,’ he explains. ‘I made serious calculations. It turned out that a white bicycle — per person, per kilometre — would cost the municipality only 10% of what it contributed to public transport per person per kilometre.’ Nevertheless, the council unanimously rejected the plan. ‘They said that the bicycle belongs to the past. They saw a glorious future for the car,’ says Schimmelpennink. But he was not in the least discouraged."],
  },
  {
    id: "cambridge-14-test-1-part2-section-d",
    heading: "D",
    format: "pre" as const,
    paragraphs: ["Schimmelpennink never stopped believing in bike-sharing, and in the mid-90s, two Danes asked for his help to set up a system in Copenhagen. The result was the world’s first large-scale bike-share programme. It worked on a deposit: ‘You dropped a coin in the bike and when you returned it, you got your money back.’ After setting up the Danish system, Schimmelpennink decided to try his luck again in the Netherlands — and this time he succeeded in arousing the interest of the Dutch Ministry of Transport. ‘Times had changed,’ he recalls. ‘People had become more environmentally conscious, and the Danish experiment had proved that bike-sharing was a real possibility.’ A new Witte Fietsenplan was launched in 1999 in Amsterdam. However, riding a white bike was no longer free; it cost one guilder per trip and payment was made with a chip card developed by the Dutch bank Postbank. Schimmelpennink designed conspicuous, sturdy white bikes locked in special racks which could be opened with the chip card — the plan started with 250 bikes, distributed over five stations."],
  },
  {
    id: "cambridge-14-test-1-part2-section-e",
    heading: "E",
    format: "pre" as const,
    paragraphs: ["Theo Molenaar, who was a system designer for the project, worked alongside Schimmelpennink. ‘I remember when we were testing the bike racks, he announced that he had already designed better ones. But of course, we had to go through with the ones we had.’ The system, however, was prone to vandalism and theft. ‘After every weekend there would always be a couple of bikes missing,’ Molenaar says. ‘I really have no idea what people did with them, because they could instantly be recognised as white bikes.’ But the biggest blow came when Postbank decided to abolish the chip card, because it wasn’t profitable. ‘That chip card was pivotal to the system,’ Molenaar says. ‘To continue the project we would have needed to set up another system, but the business partner had lost interest.’"],
  },
  {
    id: "cambridge-14-test-1-part2-section-f",
    heading: "F",
    format: "pre" as const,
    paragraphs: ["Schimmelpennink was disappointed, but — characteristically — not for long. In 2002 he got a call from the French advertising corporation JC Decaux, who wanted to set up his bike-sharing scheme in Vienna. ‘That went really well. After Vienna, they set up a system in Lyon. Then in 2007, Paris followed. That was a decisive moment in the history of bike-sharing.’ The huge and unexpected success of the Parisian bike-sharing programme, which now boasts more than 20,000 bicycles, inspired cities all over the world to set up their own schemes, all modelled on Schimmelpennink’s. ‘It’s wonderful that this happened,’ he says. ‘But financially I didn’t really benefit from it, because I never filed for a patent.’"],
  },
  {
    id: "cambridge-14-test-1-part2-section-g",
    heading: "G",
    format: "pre" as const,
    paragraphs: ["In Amsterdam today, 38% of all trips are made by bike and, along with Copenhagen, it is regarded as one of the two most cycle-friendly capitals in the world — but the city never got another Witte Fietsenplan. Molenaar believes this may be because everybody in Amsterdam already has a bike. Schimmelpennink, however, cannot see that this changes Amsterdam’s need for a bike-sharing scheme. ‘People who travel on the underground don’t carry their bikes around. But often they need additional transport to reach their final destination.’ Although he thinks it is strange that a city like Amsterdam does not have a successful bike-sharing scheme, he is optimistic about the future. ‘In the 60s we didn’t stand a chance because people were prepared to give their lives to keep cars in the city. But that mentality has totally changed. Today everybody longs for cities that are not dominated by cars.’"],
  },
];

const bikeSharing: ReadingPart = {
  id: "cambridge-14-test-1-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "The growth of bike-sharing schemes around the world",
  subtitle: "How Dutch engineer Luud Schimmelpennink helped to devise urban bike-sharing schemes",
  sections: bikeSharingSections,
  questionBlocks: [
    {
      id: "cambridge-14-test-1-part2-questions-14-18",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has seven paragraphs, A–G. Which paragraph contains the following information? Write the correct letter, A–G, in boxes 14–18 on your answer sheet. You may use any letter more than once.",
      questions: [
        { questionNumbers: [14], prompt: "A description of how people misused a bike-sharing scheme", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [15], prompt: "An explanation of why a proposed bike-sharing scheme was turned down", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [16], prompt: "A reference to a person being unable to profit from their work", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [17], prompt: "An explanation of the potential savings a bike-sharing scheme would bring", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [18], prompt: "A reference to the problems a bike-sharing scheme was intended to solve", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
      ],
    },
    {
      id: "cambridge-14-test-1-part2-questions-19-20",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 19 and 20 on your answer sheet.",
      questions: [{ questionNumbers: [19, 20], selectCount: 2, prompt: "Which TWO of the following statements are made in the text about the Amsterdam bike-sharing scheme of 1999?", options: [
        { letter: "A", text: "It was initially opposed by a government department." },
        { letter: "B", text: "It failed when a partner in the scheme withdrew support." },
        { letter: "C", text: "It aimed to be more successful than the Copenhagen scheme." },
        { letter: "D", text: "It was made possible by a change in people’s attitudes." },
        { letter: "E", text: "It attracted interest from a range of bike designers." },
      ] }],
    },
    {
      id: "cambridge-14-test-1-part2-questions-21-22",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 21 and 22 on your answer sheet.",
      questions: [{ questionNumbers: [21, 22], selectCount: 2, prompt: "Which TWO of the following statements are made in the text about Amsterdam today?", options: [
        { letter: "A", text: "The majority of residents would like to prevent all cars from entering the city." },
        { letter: "B", text: "There is little likelihood of the city having another bike-sharing scheme." },
        { letter: "C", text: "More trips in the city are made by bike than by any other form of transport." },
        { letter: "D", text: "A bike-sharing scheme would benefit residents who use public transport." },
        { letter: "E", text: "The city has a reputation as a place that welcomes cyclists." },
      ] }],
    },
    {
      ...rawFillBlock(
        "cambridge-14-test-1-part2-questions-23-26",
        "The first urban bike-sharing scheme",
        "Questions 23–26\nComplete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 23–26 on your answer sheet.\n\nThe first urban bike-sharing scheme\n\nThe first bike-sharing scheme was the idea of the Dutch group Provo. The people who belonged to this group were 23 ______. They were concerned about damage to the environment and about 24 ______, and believed that the bike-sharing scheme would draw attention to these issues. As well as painting some bikes white, they handed out 25 ______ that condemned the use of cars.\n\nHowever, the scheme was not a great success: almost as quickly as Provo left the bikes around the city, the 26 ______ took them away. According to Schimmelpennink, the scheme was intended to be symbolic. The idea was to get people thinking about the issues.",
        23,
        26,
      ),
    },
  ],
  source: {
    passagePages: [21, 22, 23, 24, 25].map(sourcePage),
    questionPages: [23, 24, 25].map(sourcePage),
    answerPages: [sourcePage(121)],
    explanationPages: [32, 33, 34, 35, 36, 37].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集14精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const hotelMotivation: ReadingPart = {
  id: "cambridge-14-test-1-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Motivational factors and the hospitality industry",
  sections: [{
    id: "cambridge-14-test-1-part3-passage",
    format: "pre",
    paragraphs: [
      "A critical ingredient in the success of hotels is developing and maintaining superior performance from their employees. How is that accomplished? What Human Resource Management (HRM) practices should organizations invest in to acquire and retain great employees?",
      "Some hotels aim to provide superior working conditions for their employees. The idea originated from workplaces — usually in the non-service sector — that emphasized fun and enjoyment as part of work-life balance. By contrast, the service sector, and more specifically hotels, has traditionally not extended these practices to address basic employee needs, such as good working conditions.",
      "Pfeffer (1994) emphasizes that in order to succeed in a global business environment, organizations must make investment in Human Resource Management (HRM) to allow them to acquire employees who possess better skills and capabilities than their competitors. This investment will be to their competitive advantage. Despite this recognition of the importance of employee development, the hospitality industry has historically been dominated by underdeveloped HR practices (Lucas, 2002).",
      "Lucas also points out that ‘the substance of HRM practices does not appear to be designed to foster constructive relations with employees or to represent a managerial approach that enables developing and drawing out the full potential of people, even though employees may be broadly satisfied with many aspects of their work’ (Lucas, 2002). In addition, or maybe as a result, high employee turnover has been a recurring problem throughout the hospitality industry. Among the many cited reasons are low compensation, inadequate benefits, poor working conditions and compromised employee morale and attitudes (Maroudas et al., 2008).",
      "Ng and Sorensen (2008) demonstrated that when managers provide recognition to employees, motivate employees to work together, and remove obstacles preventing effective performance, employees feel more obligated to stay with the company. This was succinctly summarized by Michel et al. (2013): ‘[P]roviding support to employees gives them the confidence to perform their jobs better and the motivation to stay with the organization.’ Hospitality organizations can therefore enhance employee motivation and retention through the development and improvement of their working conditions. These conditions are inherently linked to the working environment.",
      "While it seems likely that employees’ reactions to their job characteristics could be affected by a predisposition to view their work environment negatively, no evidence exists to support this hypothesis (Spector et al., 2000). However, given the opportunity, many people will find something to complain about in relation to their workplace (Poulston, 2009). There is a strong link between the perceptions of employees and particular factors of their work environment that are separate from the work itself, including company policies, salary and vacations.",
      "Such conditions are particularly troubling for the luxury hotel market, where high-quality service, requiring a sophisticated approach to HRM, is recognized as a critical source of competitive advantage (Maroudas et al., 2008). In a real sense, the services of hotel employees represent their industry (Schneider and Bowen, 1993). This representation has commonly been limited to guest experiences. This suggests that there has been a dichotomy between the guest environment provided in luxury hotels and the working conditions of their employees.",
      "It is therefore essential for hotel management to develop HRM practices that enable them to inspire and retain competent employees. This requires an understanding of what motivates employees at different levels of management and different stages of their careers (Enz and Siguaw, 2000). This implies that it is beneficial for hotel managers to understand what practices are most favorable to increase employee satisfaction and retention.",
      "Herzberg (1966) proposes that people have two major types of needs, the first being extrinsic motivation factors relating to the context in which work is performed, rather than the work itself. These include working conditions and job security. When these factors are unfavorable, job dissatisfaction may result. Significantly, though, just fulfilling these needs does not result in satisfaction, but only in the reduction of dissatisfaction (Maroudas et al., 2008).",
      "Employees also have intrinsic motivation needs or motivators, which include such factors as achievement and recognition. Unlike extrinsic factors, motivator factors may ideally result in job satisfaction (Maroudas et al., 2008). Herzberg’s (1966) theory discusses the need for a ‘balance’ of these two types of needs.",
      "The impact of fun as a motivating factor at work has also been explored. For example, Tews, Michel and Stafford (2013) conducted a study focusing on staff from a chain of themed restaurants in the United States. It was found that fun activities had a favorable impact on performance and manager support for fun had a favorable impact in reducing turnover. Their findings support the view that fun may indeed have a beneficial effect, but the framing of that fun must be carefully aligned with both organizational goals and employee characteristics. ‘Managers must learn how to achieve the delicate balance of allowing employees the freedom to enjoy themselves at work while simultaneously maintaining high levels of performance’ (Tews et al., 2013).",
      "Deery (2008) has recommended several actions that can be adopted at the organizational level to retain good staff as well as assist in balancing work and family life. Those particularly appropriate to the hospitality industry include allowing adequate breaks during the working day, staff functions that involve families, and providing health and well-being opportunities.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-14-test-1-part3-questions-27-31",
      type: "choice",
      sharedOptions: true,
      instruction: "Match each statement with the correct researcher, A–F. Write the correct letter, A–F, in boxes 27–31 on your answer sheet. You may use any letter more than once.",
      questions: [
        { questionNumbers: [27], prompt: "Hotel managers need to know what would encourage good staff to remain.", options: [
          { letter: "A", text: "Pfeffer" }, { letter: "B", text: "Lucas" }, { letter: "C", text: "Maroudas et al." },
          { letter: "D", text: "Ng and Sorensen" }, { letter: "E", text: "Enz and Siguaw" }, { letter: "F", text: "Deery" },
        ] },
        { questionNumbers: [28], prompt: "The actions of managers may make staff feel they shouldn’t move to a different employer.", options: [
          { letter: "A", text: "Pfeffer" }, { letter: "B", text: "Lucas" }, { letter: "C", text: "Maroudas et al." },
          { letter: "D", text: "Ng and Sorensen" }, { letter: "E", text: "Enz and Siguaw" }, { letter: "F", text: "Deery" },
        ] },
        { questionNumbers: [29], prompt: "Little is done in the hospitality industry to help workers improve their skills.", options: [
          { letter: "A", text: "Pfeffer" }, { letter: "B", text: "Lucas" }, { letter: "C", text: "Maroudas et al." },
          { letter: "D", text: "Ng and Sorensen" }, { letter: "E", text: "Enz and Siguaw" }, { letter: "F", text: "Deery" },
        ] },
        { questionNumbers: [30], prompt: "Staff are less likely to change jobs if cooperation is encouraged.", options: [
          { letter: "A", text: "Pfeffer" }, { letter: "B", text: "Lucas" }, { letter: "C", text: "Maroudas et al." },
          { letter: "D", text: "Ng and Sorensen" }, { letter: "E", text: "Enz and Siguaw" }, { letter: "F", text: "Deery" },
        ] },
        { questionNumbers: [31], prompt: "Dissatisfaction with pay is not the only reason why hospitality workers change jobs.", options: [
          { letter: "A", text: "Pfeffer" }, { letter: "B", text: "Lucas" }, { letter: "C", text: "Maroudas et al." },
          { letter: "D", text: "Ng and Sorensen" }, { letter: "E", text: "Enz and Siguaw" }, { letter: "F", text: "Deery" },
        ] },
      ],
    },
    {
      id: "cambridge-14-test-1-part3-questions-32-35",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 3? In boxes 32–35 on your answer sheet, write YES if the statement agrees with the claims of the writer, NO if it contradicts the claims of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [32], prompt: "One reason for high staff turnover in the hospitality industry is poor morale.", options: yesNoOptions },
        { questionNumbers: [33], prompt: "Research has shown that staff have a tendency to dislike their workplace.", options: yesNoOptions },
        { questionNumbers: [34], prompt: "An improvement in working conditions and job security makes staff satisfied with their jobs.", options: yesNoOptions },
        { questionNumbers: [35], prompt: "Staff should be allowed to choose when they take breaks during the working day.", options: yesNoOptions },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-14-test-1-part3-questions-36-40",
        "Fun at work",
        "Questions 36–40\nComplete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 36–40 on your answer sheet.\n\nFun at work\n\nTews, Michel and Stafford carried out research on staff in an American chain of 36 ______. They discovered that activities designed for staff to have fun improved their 37 ______, and that management involvement led to lower staff 38 ______. They also found that the activities needed to fit with both the company’s 39 ______ and the 40 ______ of the staff. A balance was required between a degree of freedom and maintaining work standards.",
        36,
        40,
      ),
    },
  ],
  source: {
    passagePages: [26, 27, 28, 29].map(sourcePage),
    questionPages: [28, 29].map(sourcePage),
    answerPages: [sourcePage(121)],
    explanationPages: [42, 43, 44, 45, 46, 47, 48].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集14精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE14_TEST1_PARTS: ReadingPart[] = [childrenPlay, bikeSharing, hotelMotivation];

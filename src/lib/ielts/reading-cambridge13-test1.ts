import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  17: [1541, 2276], 18: [1607, 2264], 19: [1549, 2283], 20: [1540, 2267],
  21: [1540, 2317], 22: [1619, 2265], 23: [1542, 2280], 24: [1544, 2265],
  25: [1543, 2280], 26: [1542, 2264], 27: [1660, 2374], 28: [1546, 2276],
  29: [1544, 2284], 120: [1546, 1388],
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
  const heights: Record<number, number> = { 22: 497, 31: 968, 41: 2113 };
  return {
    page,
    src: "/reading/explanations/cambridge-13-test-1-part" + part + "-exp13-p" + String(page).padStart(3, "0") + ".webp",
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

const tourismNewZealand: ReadingPart = {
  id: "cambridge-13-test-1-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Case Study: Tourism New Zealand website",
  sections: [{
    id: "cambridge-13-test-1-part1-passage",
    format: "pre",
    paragraphs: [
      "New Zealand is a small country of four million inhabitants, a long-haul flight from all the major tourist-generating markets of the world. Tourism currently makes up 9% of the country’s gross domestic product, and is the country’s largest export sector. Unlike other export sectors, which make products and then sell them overseas, tourism brings its customers to New Zealand. The product is the country itself — the people, the places and the experiences. In 1999, Tourism New Zealand launched a campaign to communicate a new brand position to the world. The campaign focused on New Zealand’s scenic beauty, exhilarating outdoor activities and authentic Maori culture, and it made New Zealand one of the strongest national brands in the world.",
      "A key feature of the campaign was the website www.newzealand.com, which provided potential visitors to New Zealand with a single gateway to everything the destination had to offer. The heart of the website was a database of tourism services operators, both those based in New Zealand and those based abroad which offered tourism services to the country. Any tourism-related business could be listed by filling in a simple form. This meant that even the smallest bed and breakfast address or specialist activity provider could gain a web presence with access to an audience of long-haul visitors. In addition, because participating businesses were able to update the details they gave on a regular basis, the information provided remained accurate. And to maintain and improve standards, Tourism New Zealand organised a scheme whereby organisations appearing on the website underwent an independent evaluation against a set of agreed national standards of quality. As part of this, the effect of each business on the environment was considered.",
      "To communicate the New Zealand experience, the site also carried features relating to famous people and places. One of the most popular was an interview with former New Zealand All Blacks rugby captain Tana Umaga. Another feature that attracted a lot of attention was an interactive journey through a number of the locations chosen for blockbuster films which had made use of New Zealand’s stunning scenery as a backdrop. As the site developed, additional features were added to help independent travellers devise their own customised itineraries. To make it easier to plan motoring holidays, the site catalogued the most popular driving routes in the country, highlighting different routes according to the season and indicating distances and times.",
      "Later, a Travel Planner feature was added, which allowed visitors to click and ‘bookmark’ places or attractions they were interested in, and then view the results on a map. The Travel Planner offered suggested routes and public transport options between the chosen locations. There were also links to accommodation in the area. By registering with the website, users could save their Travel Plan and return to it later, or print it out to take on the visit. The website also had a ‘Your Words’ section where anyone could submit a blog of their New Zealand travels for possible inclusion on the website.",
      "The Tourism New Zealand website won two Webby awards for online achievement and innovation. More importantly perhaps, the growth of tourism to New Zealand was impressive. Overall tourism expenditure increased by an average of 6.9% per year between 1999 and 2004. From Britain, visits to New Zealand grew at an average annual rate of 13% between 2002 and 2006, compared to a rate of 4% overall for British visits abroad.",
      "The website was set up to allow both individuals and travel organisations to create itineraries and travel packages to suit their own needs and interests. On the website, visitors can search for activities not solely by geographical location, but also by the particular nature of the activity. This is important as research shows that activities are the key driver of visitor satisfaction, contributing 74% to visitor satisfaction, while transport and accommodation account for the remaining 26%. The more activities that visitors undertake, the more satisfied they will be. It has also been found that visitors enjoy cultural activities most when they are interactive, such as visiting a marae (meeting ground) to learn about traditional Maori life. Many long-haul travellers enjoy such learning experiences, which provide them with stories to take home to their friends and family. In addition, it appears that visitors to New Zealand don’t want to be ‘one of the crowd’ and find activities that involve only a few people more special and meaningful.",
      "It could be argued that New Zealand is not a typical destination. New Zealand is a small country with a visitor economy composed mainly of small businesses. It is generally perceived as a safe English-speaking country with a reliable transport infrastructure. Because of the long-haul flight, most visitors stay for longer (average 20 days) and want to see as much of the country as possible on what is often seen as a once-in-a-lifetime visit. However, the underlying lessons apply anywhere — the effectiveness of a strong brand, a strategy based on unique experiences and a comprehensive and user-friendly website.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-13-test-1-part1-questions-1-7",
      type: "fill",
      title: "",
      instruction: "Complete the table below. Choose ONE WORD ONLY from the passage for each answer.",
      questions: [1, 2, 3, 4, 5, 6, 7].map((number) => ({ number, before: "Question " + number })),
      table: {
        headers: ["Feature", "Details"],
        rows: [
          [
            { text: "Database of tourism services", rowSpan: 3 },
            { text: "Easy for tourism-related businesses to get on the list." },
          ],
          [
            { before: "Allowed businesses to ", questionNumber: 1, after: " information regularly." },
          ],
          [
            { before: "Provided a country-wide evaluation of businesses, including their impact on the ", questionNumber: 2 },
          ],
          [
            { text: "Special features on local topics", rowSpan: 2 },
            { before: "For example, an interview with a former sports ", questionNumber: 3 },
          ],
          [
            { before: "An interactive tour of various locations used in ", questionNumber: 4 },
          ],
          [
            { text: "Information on driving routes" },
            { before: "Varied depending on the ", questionNumber: 5 },
          ],
          [
            { text: "Travel Planner", rowSpan: 2 },
            { before: "Included a map showing selected places, details of public transport and local ", questionNumber: 6 },
          ],
          [
            { before: "Travellers could send a link to their ", questionNumber: 7 },
          ],
        ],
      },
    },
    {
      id: "cambridge-13-test-1-part1-questions-8-13",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? Write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [8], prompt: "The website www.newzealand.com aimed to provide ready-made itineraries and packages for travel companies and individual tourists.", options: judgmentOptions },
        { questionNumbers: [9], prompt: "It was found that most visitors started searching on the website by geographical location.", options: judgmentOptions },
        { questionNumbers: [10], prompt: "According to research, 26% of visitor satisfaction is related to their accommodation.", options: judgmentOptions },
        { questionNumbers: [11], prompt: "Visitors to New Zealand like to become involved in the local culture.", options: judgmentOptions },
        { questionNumbers: [12], prompt: "Visitors like staying in small hotels in New Zealand rather than in larger ones.", options: judgmentOptions },
        { questionNumbers: [13], prompt: "Many visitors feel it is unlikely that they will return to New Zealand after their visit.", options: judgmentOptions },
      ],
    },
  ],
  source: {
    passagePages: [17, 18].map(sourcePage),
    questionPages: [19, 20].map(sourcePage),
    answerPages: [sourcePage(120)],
    explanationPages: [22, 23, 24, 25, 26].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集13精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const boredom: ReadingPart = {
  id: "cambridge-13-test-1-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Why being bored is stimulating — and useful, too",
  subtitle: "This most common of emotions is turning out to be more interesting than we thought",
  sections: [
    {
      id: "cambridge-13-test-1-part2-section-a",
      heading: "A",
      format: "pre",
      paragraphs: ["We all know how it feels — it’s impossible to keep your mind on anything, time stretches out, and all the things you could do seem equally unlikely to make you feel better. But defining boredom so that it can be studied in the lab has proved difficult. For a start, it can include a lot of other mental states, such as frustration, apathy, depression and indifference. There isn’t even agreement over whether boredom is always a low-energy, flat kind of emotion or whether feeling agitated and restless counts as boredom, too. In his book, Boredom: A Lively History, Peter Toohey at the University of Calgary, Canada, compares it to disgust — an emotion that motivates us to stay away from certain situations. ‘If disgust protects humans from infection, boredom may protect them from “infectious” social situations,’ he suggests."],
    },
    {
      id: "cambridge-13-test-1-part2-section-b",
      heading: "B",
      format: "pre",
      paragraphs: ["By asking people about their experiences of boredom, Thomas Goetz and his team at the University of Konstanz in Germany have recently identified five distinct types: indifferent, calibrating, searching, reactant and apathetic. These can be plotted on two axes — one running left to right, which measures low to high arousal, and the other from top to bottom, which measures how positive or negative the feeling is. Intriguingly, Goetz has found that while people experience all kinds of boredom, they tend to specialise in one. Of the five types, the most damaging is ‘reactant’ boredom with its explosive combination of high arousal and negative emotion. The most useful is what Goetz calls ‘indifferent’ boredom: someone isn’t engaged in anything satisfying but still feels relaxed and calm. However, it remains to be seen whether there are any character traits that predict the kind of boredom each of us might be prone to."],
    },
    {
      id: "cambridge-13-test-1-part2-section-c",
      heading: "C",
      format: "pre",
      paragraphs: ["Psychologist Sandi Mann at the University of Central Lancashire, UK, goes further. ‘All emotions are there for a reason, including boredom,’ she says. Mann has found that being bored makes us more creative. ‘We’re all afraid of being bored but in actual fact it can lead to all kinds of amazing things,’ she says. In experiments published last year, Mann found that people who had been made to feel bored by copying numbers out of the phone book for 15 minutes came up with more creative ideas about how to use a polystyrene cup than a control group. Mann concluded that a passive, boring activity is best for creativity because it allows the mind to wander. In fact, she goes so far as to suggest that we should seek out more boredom in our lives."],
    },
    {
      id: "cambridge-13-test-1-part2-section-d",
      heading: "D",
      format: "pre",
      paragraphs: ["Psychologist John Eastwood at York University in Toronto, Canada, isn’t convinced. ‘If you are in a state of mind-wandering you are not bored,’ he says. ‘In my view, by definition boredom is an undesirable state.’ That doesn’t necessarily mean that it isn’t adaptive, he adds. ‘Pain is adaptive — if we didn’t have physical pain, bad things would happen to us. Does that mean that we should actively cause pain? No. But even if boredom has evolved to help us survive, it can still be toxic if allowed to fester.’ For Eastwood, the central feature of boredom is a failure to put our ‘attention system’ into gear. This causes an inability to focus on anything, which makes time seem to go painfully slowly. What’s more, your efforts to improve the situation can end up making you feel worse. ‘People try to connect with the world and if they are not successful there’s that frustration and irritability,’ he says. Perhaps most worryingly, says Eastwood, repeatedly failing to engage attention can lead to a state where we don’t know what to do any more, and no longer care."],
    },
    {
      id: "cambridge-13-test-1-part2-section-e",
      heading: "E",
      format: "pre",
      paragraphs: ["Eastwood’s team is now trying to explore why the attention system fails. It’s early days but they think that at least some of it comes down to personality. Boredom proneness has been linked with a variety of traits. People who are motivated by pleasure seem to suffer particularly badly. Other personality traits, such as curiosity, are associated with a high boredom threshold. More evidence that boredom has detrimental effects comes from studies of people who are more or less prone to boredom. It seems those who bore easily face poorer prospects in education, their career and even life in general. But of course, boredom itself cannot kill — it’s the things we do to deal with it that may put us in danger. What can we do to alleviate it before it comes to that? Goetz’s group has one suggestion. Working with teenagers, they found that those who ‘approach’ a boring situation — in other words, see that it’s boring and get stuck in anyway — report less boredom than those who try to avoid it by using snacks, TV or social media for distraction."],
    },
    {
      id: "cambridge-13-test-1-part2-section-f",
      heading: "F",
      format: "pre",
      paragraphs: ["Psychologist Francoise Wemelsfelder speculates that our over-connected lifestyles might even be a new source of boredom. ‘In modern human society there is a lot of overstimulation but still a lot of problems finding meaning,’ she says. So instead of seeking yet more mental stimulation, perhaps we should leave our phones alone, and use boredom to motivate us to engage with the world in a more meaningful way."],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-13-test-1-part2-headings-14-19",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 2 has six paragraphs, A–F. Choose the correct heading for each paragraph from the list below. Write the correct number, i–viii.",
      questionNumbers: [14, 15, 16, 17, 18, 19],
      options: [
        { id: "i", text: "The productive outcomes that may result from boredom" },
        { id: "ii", text: "What teachers can do to prevent boredom" },
        { id: "iii", text: "A new explanation and a new cure for boredom" },
        { id: "iv", text: "Problems with a scientific approach to boredom" },
        { id: "v", text: "A potential danger arising from boredom" },
        { id: "vi", text: "Creating a system of classification for feelings of boredom" },
        { id: "vii", text: "Age groups most affected by boredom" },
        { id: "viii", text: "Identifying those most affected by boredom" },
      ],
    },
    {
      id: "cambridge-13-test-1-part2-questions-20-23",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following people and the list of ideas below. Match each person with the correct idea, A–E.",
      questions: [
        { questionNumbers: [20], prompt: "Peter Toohey", options: [
          { letter: "A", text: "The way we live today may encourage boredom." },
          { letter: "B", text: "One sort of boredom is worse than all the others." },
          { letter: "C", text: "Levels of boredom may fall in the future." },
          { letter: "D", text: "Trying to cope with boredom can increase its negative effects." },
          { letter: "E", text: "Boredom may encourage us to avoid an unpleasant experience." },
        ] },
        { questionNumbers: [21], prompt: "Thomas Goetz", options: [
          { letter: "A", text: "The way we live today may encourage boredom." },
          { letter: "B", text: "One sort of boredom is worse than all the others." },
          { letter: "C", text: "Levels of boredom may fall in the future." },
          { letter: "D", text: "Trying to cope with boredom can increase its negative effects." },
          { letter: "E", text: "Boredom may encourage us to avoid an unpleasant experience." },
        ] },
        { questionNumbers: [22], prompt: "John Eastwood", options: [
          { letter: "A", text: "The way we live today may encourage boredom." },
          { letter: "B", text: "One sort of boredom is worse than all the others." },
          { letter: "C", text: "Levels of boredom may fall in the future." },
          { letter: "D", text: "Trying to cope with boredom can increase its negative effects." },
          { letter: "E", text: "Boredom may encourage us to avoid an unpleasant experience." },
        ] },
        { questionNumbers: [23], prompt: "Francoise Wemelsfelder", options: [
          { letter: "A", text: "The way we live today may encourage boredom." },
          { letter: "B", text: "One sort of boredom is worse than all the others." },
          { letter: "C", text: "Levels of boredom may fall in the future." },
          { letter: "D", text: "Trying to cope with boredom can increase its negative effects." },
          { letter: "E", text: "Boredom may encourage us to avoid an unpleasant experience." },
        ] },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-13-test-1-part2-questions-24-26",
        "Responses to boredom",
        "Questions 24–26\nComplete the summary below. Choose ONE WORD ONLY from the passage for each answer.\n\nResponses to boredom\n\nFor John Eastwood, the central feature of boredom is that people cannot 24 ______, due to a failure in what he calls the ‘attention system’, and as a result they become frustrated and irritable. His team suggests that those for whom 25 ______ is an important aim in life may have problems in coping with boredom, whereas those who have the characteristic of 26 ______ can generally cope with it.",
        24,
        26,
      ),
    },
  ],
  source: {
    passagePages: [22, 23].map(sourcePage),
    questionPages: [21, 24].map(sourcePage),
    answerPages: [sourcePage(120)],
    explanationPages: [31, 32, 33, 34, 35, 36].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集13精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const artificialArtists: ReadingPart = {
  id: "cambridge-13-test-1-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Artificial artists",
  subtitle: "Can computers really create works of art?",
  sections: [{
    id: "cambridge-13-test-1-part3-passage",
    format: "pre",
    paragraphs: [
      "The Painting Fool is one of a growing number of computer programs which, so their makers claim, possess creative talents. Classical music by an artificial composer has had audiences enraptured, and even tricked them into believing a human was behind the score. Artworks painted by a robot have sold for thousands of dollars and been hung in prestigious galleries. And software has been built which creates art that could not have been imagined by the programmer.",
      "Human beings are the only species to perform sophisticated creative acts regularly. If we can break this process down into computer code, where does that leave human creativity? ‘This is a question at the very core of humanity,’ says Geraint Wiggins, a computational creativity researcher at Goldsmiths, University of London. ‘It scares a lot of people. They are worried that it is taking something special away from what it means to be human.’",
      "To some extent, we are all familiar with computerised art. The question is: where does the work of the artist stop and the creativity of the computer begin? Consider one of the oldest machine artists, Aaron, a robot that has had paintings exhibited in London’s Tate Modern and the San Francisco Museum of Modern Art. Aaron can pick up a paintbrush and paint on canvas on its own. Impressive perhaps, but it is still little more than a tool to realise the programmer’s own creative ideas.",
      "Simon Colton, the designer of the Painting Fool, is keen to make sure his creation doesn’t attract the same criticism. Unlike earlier ‘artists’ such as Aaron, the Painting Fool only needs minimal direction and can come up with its own concepts by going online for material. The software runs its own web searches and trawls through social media sites. It is now beginning to display a kind of imagination too, creating pictures from scratch. One of its original works is a series of fuzzy landscapes, depicting trees and sky. While some might say they have a mechanical look, Colton argues that such reactions arise from people’s double standards towards software-produced and human-produced art. After all, he says, consider that the Painting Fool painted the landscapes without referring to a photo. ‘If a child painted a new scene from its head, you’d say it has a certain level of imagination,’ he points out. ‘The same should be true of a machine.’ Software bugs can also lead to unexpected results. Some of the Painting Fool’s paintings of a chair came out in black and white, thanks to a technical glitch. This gives the work an eerie, ghostlike quality. Human artists like the renowned Ellsworth Kelly are lauded for limiting their colour palette — so why should computers be any different?",
      "Researchers like Colton don’t believe it is right to measure machine creativity directly to that of humans who ‘have had millennia to develop our skills’. Others, though, are fascinated by the prospect that a computer might create something as original and subtle as our best artists. So far, only one has come close. Composer David Cope invented a program called Experiments in Musical Intelligence, or EMI. Not only did EMI create compositions in Cope’s style, but also that of the most revered classical composers, including Bach, Chopin and Mozart. Audiences were moved to tears, and EMI even fooled classical music experts into thinking they were hearing genuine Bach. Not everyone was impressed, however. Some, such as Wiggins, have blasted Cope’s work as pseudoscience, and condemned him for his deliberately vague explanation of how the software worked. Meanwhile, Douglas Hofstadter of Indiana University said EMI created replicas which still rely completely on the original artist’s creative impulses. When audiences found out the truth they were often outraged with Cope, and one music lover even tried to punch him. Amid such controversy, Cope destroyed EMI’s vital databases.",
      "But why did so many people love the music, yet recoil when they discovered how it was composed? A study by computer scientist David Moffat of Glasgow Caledonian University provides a clue. He asked both expert musicians and non-experts to assess six compositions. The participants weren’t told beforehand whether the tunes were composed by humans or computers, but were asked to guess, and then rate how much they liked each one. People who thought the composer was a computer tended to dislike the piece more than those who believed it was human. This was true even among the experts, who might have been expected to be more objective in their analyses.",
      "Where does this prejudice come from? Paul Bloom of Yale University has a suggestion: he reckons part of the pleasure we get from art stems from the creative process behind the work. This can give it an ‘irresistible essence’, says Bloom. Meanwhile, experiments by Justin Kruger of New York University have shown that people’s enjoyment of an artwork increases if they think more time and effort was needed to create it. Similarly, Colton thinks that when people experience art, they wonder what the artist might have been thinking or what the artist is trying to tell them. It seems obvious, therefore, that with computers producing art, this speculation is cut short — there’s nothing to explore. But as technology becomes increasingly complex, finding those greater depths in computer art could become possible. This is precisely why Colton asks the Painting Fool to tap into online social networks for its inspiration: hopefully this way it will choose themes that will already be meaningful to us.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-13-test-1-part3-questions-27-31",
      type: "choice",
      sharedOptions: true,
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27–31 on your answer sheet.",
      questions: [
        { questionNumbers: [27], prompt: "What is the writer suggesting about computer-produced works in the first paragraph?", options: [
          { letter: "A", text: "People’s acceptance of them can vary considerably." },
          { letter: "B", text: "A great deal of progress has already been attained in this field." },
          { letter: "C", text: "They have had more success in some artistic genres than in others." },
          { letter: "D", text: "The advances are not as significant as the public believes them to be." },
        ] },
        { questionNumbers: [28], prompt: "According to Geraint Wiggins, why are many people worried by computer art?", options: [
          { letter: "A", text: "It is aesthetically inferior to human art." },
          { letter: "B", text: "It may ultimately supersede human art." },
          { letter: "C", text: "It undermines a fundamental human quality." },
          { letter: "D", text: "It will lead to a deterioration in human ability." },
        ] },
        { questionNumbers: [29], prompt: "What is a key difference between Aaron and the Painting Fool?", options: [
          { letter: "A", text: "Its programmer’s background" },
          { letter: "B", text: "Public response to its work" },
          { letter: "C", text: "The source of its subject matter" },
          { letter: "D", text: "The technical standard of its output" },
        ] },
        { questionNumbers: [30], prompt: "What point does Simon Colton make in the fourth paragraph?", options: [
          { letter: "A", text: "Software-produced art is often dismissed as childish and simplistic." },
          { letter: "B", text: "The same concepts of creativity should not be applied to all forms of art." },
          { letter: "C", text: "It is unreasonable to expect a machine to be as imaginative as a human being." },
          { letter: "D", text: "People tend to judge computer art and human art according to different criteria." },
        ] },
        { questionNumbers: [31], prompt: "The writer refers to the paintings of a chair as an example of computer art which", options: [
          { letter: "A", text: "achieves a particularly striking effect." },
          { letter: "B", text: "exhibits a certain level of genuine artistic skill." },
          { letter: "C", text: "closely resembles that of a well-known artist." },
          { letter: "D", text: "highlights the technical limitations of the software." },
        ] },
      ],
    },
    {
      id: "cambridge-13-test-1-part3-questions-32-37",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete each sentence with the correct ending, A–G below. Write the correct letter, A–G, in boxes 32–37 on your answer sheet.",
      questions: [
        { questionNumbers: [32], prompt: "Simon Colton says it is important to consider the long-term view when", options: [
          { letter: "A", text: "generating work that was virtually indistinguishable from that of humans." },
          { letter: "B", text: "knowing whether it was the work of humans or software." },
          { letter: "C", text: "producing work entirely dependent on the imagination of its creator." },
          { letter: "D", text: "comparing the artistic achievements of humans and computers." },
          { letter: "E", text: "revealing the technical details of his program." },
          { letter: "F", text: "persuading the public to appreciate computer art." },
          { letter: "G", text: "discovering that it was the product of a computer program." },
        ] },
        { questionNumbers: [33], prompt: "David Cope’s EMI software surprised people by", options: [
          { letter: "A", text: "generating work that was virtually indistinguishable from that of humans." },
          { letter: "B", text: "knowing whether it was the work of humans or software." },
          { letter: "C", text: "producing work entirely dependent on the imagination of its creator." },
          { letter: "D", text: "comparing the artistic achievements of humans and computers." },
          { letter: "E", text: "revealing the technical details of his program." },
          { letter: "F", text: "persuading the public to appreciate computer art." },
          { letter: "G", text: "discovering that it was the product of a computer program." },
        ] },
        { questionNumbers: [34], prompt: "Geraint Wiggins criticised Cope for not", options: [
          { letter: "A", text: "generating work that was virtually indistinguishable from that of humans." },
          { letter: "B", text: "knowing whether it was the work of humans or software." },
          { letter: "C", text: "producing work entirely dependent on the imagination of its creator." },
          { letter: "D", text: "comparing the artistic achievements of humans and computers." },
          { letter: "E", text: "revealing the technical details of his program." },
          { letter: "F", text: "persuading the public to appreciate computer art." },
          { letter: "G", text: "discovering that it was the product of a computer program." },
        ] },
        { questionNumbers: [35], prompt: "Douglas Hofstadter claimed that EMI was", options: [
          { letter: "A", text: "generating work that was virtually indistinguishable from that of humans." },
          { letter: "B", text: "knowing whether it was the work of humans or software." },
          { letter: "C", text: "producing work entirely dependent on the imagination of its creator." },
          { letter: "D", text: "comparing the artistic achievements of humans and computers." },
          { letter: "E", text: "revealing the technical details of his program." },
          { letter: "F", text: "persuading the public to appreciate computer art." },
          { letter: "G", text: "discovering that it was the product of a computer program." },
        ] },
        { questionNumbers: [36], prompt: "Audiences who had listened to EMI’s music became angry after", options: [
          { letter: "A", text: "generating work that was virtually indistinguishable from that of humans." },
          { letter: "B", text: "knowing whether it was the work of humans or software." },
          { letter: "C", text: "producing work entirely dependent on the imagination of its creator." },
          { letter: "D", text: "comparing the artistic achievements of humans and computers." },
          { letter: "E", text: "revealing the technical details of his program." },
          { letter: "F", text: "persuading the public to appreciate computer art." },
          { letter: "G", text: "discovering that it was the product of a computer program." },
        ] },
        { questionNumbers: [37], prompt: "The participants in David Moffat’s study had to assess music without", options: [
          { letter: "A", text: "generating work that was virtually indistinguishable from that of humans." },
          { letter: "B", text: "knowing whether it was the work of humans or software." },
          { letter: "C", text: "producing work entirely dependent on the imagination of its creator." },
          { letter: "D", text: "comparing the artistic achievements of humans and computers." },
          { letter: "E", text: "revealing the technical details of his program." },
          { letter: "F", text: "persuading the public to appreciate computer art." },
          { letter: "G", text: "discovering that it was the product of a computer program." },
        ] },
      ],
    },
    {
      id: "cambridge-13-test-1-part3-questions-38-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 3? Write YES if the statement agrees with the claims of the writer, NO if it contradicts the claims of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.",
      questions: [
        { questionNumbers: [38], prompt: "Moffat’s research may help explain people’s reactions to EMI.", options: yesNoOptions },
        { questionNumbers: [39], prompt: "The non-experts in Moffat’s study all responded in a predictable way.", options: yesNoOptions },
        { questionNumbers: [40], prompt: "Justin Kruger’s findings cast doubt on Paul Bloom’s theory about people’s prejudice towards computer art.", options: yesNoOptions },
      ],
    },
  ],
  source: {
    passagePages: [25, 26].map(sourcePage),
    questionPages: [27, 28, 29].map(sourcePage),
    answerPages: [sourcePage(120)],
    explanationPages: [41, 42, 43, 44, 45, 46, 47].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集13精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE13_TEST1_PARTS: ReadingPart[] = [tourismNewZealand, boredom, artificialArtists];

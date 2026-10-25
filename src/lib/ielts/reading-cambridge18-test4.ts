import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  86: [1618, 2341], 87: [1615, 2341], 88: [1750, 2341], 89: [1613, 2341],
  90: [1617, 2292], 91: [1750, 2341], 92: [1707, 2300], 93: [1602, 2341],
  94: [1621, 2341], 95: [1610, 2341], 96: [1750, 2300], 97: [1620, 2280],
  128: [1616, 1727],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1684, 2341];
  return {
    page,
    src: "/reading/source-pages/ci18-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = {
    216: 1041, 217: 2367, 218: 2353, 219: 2368, 220: 2353, 221: 2369, 222: 2354,
    228: 1717, 229: 2366, 230: 2358, 231: 2366, 232: 2354, 233: 2363, 234: 2353, 235: 2367,
    240: 1212, 241: 2367, 242: 2355, 243: 2367, 244: 2354, 245: 2363, 246: 2348, 247: 2362, 248: 2353, 249: 2365,
  };
  return {
    page,
    src: "/reading/explanations/cambridge-18-test-4-part" + part + "-exp18-p" + String(page).padStart(3, "0") + ".webp",
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

const yesNoNotGivenOptions = [
  { letter: "YES", text: "The statement agrees with the views of the writer." },
  { letter: "NO", text: "The statement contradicts the views of the writer." },
  { letter: "NOT GIVEN", text: "It is impossible to say what the writer thinks about this." },
];

const greenRoofs: ReadingPart = {
  id: "cambridge-18-test-4-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Green roofs",
  sections: [{
    id: "cambridge-18-test-4-part1-passage",
    format: "pre",
    paragraphs: [
      "A  Rooftops covered with grass, vegetable gardens and lush foliage are now a common sight in many cities around the world. More and more private companies and city authorities are investing in green roofs, drawn to their wide-ranging benefits. Among the benefits are saving on energy costs, mitigating the risk of floods, making habitats for urban wildlife, tackling air pollution and even growing food. These increasingly radical urban designs can help cities adapt to the monumental problems they face, such as access to resources and a lack of green space due to development. But the involvement of city authorities, businesses and other institutions is crucial to ensuring their success — as is research investigating different options to suit the variety of rooftop spaces found in cities. The UK is relatively new to developing green roofs, and local governments and institutions are playing a major role in spreading the practice. London is home to much of the UK’s green roof market, mainly due to forward-thinking policies such as the London Plan, which has paved the way to more than doubling the area of green roofs in the capital.",
      "B  Ongoing research is showcasing how green roofs in cities can integrate with ‘living walls’: environmentally friendly walls which are partially or completely covered with greenery, including a growing medium, such as soil or water. Research also indicates that green roofs can be integrated with drainage systems on the ground, such as street trees, so that the water is managed better and the built environment is made more sustainable. There is also evidence to demonstrate the social value of green roofs. Doctors are increasingly prescribing time spent gardening outdoors for patients dealing with anxiety and depression. And research has found that access to even the most basic green spaces can provide a better quality of life for dementia sufferers and help people avoid obesity.",
      "C  In North America, green roofs have become mainstream, with a wide array of expansive, accessible and food-producing roofs installed in buildings. Again, city leaders and authorities have helped push the movement forward — only recently, San Francisco, USA, created a policy requiring new buildings to have green roofs. Toronto, Canada, has policies dating from the 1990s, encouraging the development of urban farms on rooftops. These countries also benefit from having newer buildings than in many parts of the world, which makes it easier to install green roofs. Being able to keep enough water at roof height and distribute it right across the rooftop is crucial to maintaining the plants on any green roof — especially on ‘edible roofs’ where fruit and vegetables are farmed. And it’s much easier to do this in newer buildings, which can typically hold greater weight, than to retro-fit old ones. Having a stronger roof also makes it easier to grow a greater variety of plants, since the soil can be deeper.",
      "D  For green roofs to become the norm for new developments, there needs to be support from public authorities and private investors. Those responsible for maintaining buildings may have to acquire new skills, such as landscaping, and in some cases, volunteers may be needed to help out. Other considerations include installing drainage paths, meeting health and safety requirements and perhaps allowing access for the public, as well as planning restrictions and disruption from regular activities in and around the buildings during installation. To convince investors and developers that installing green roofs is worthwhile, economic arguments are still the most important. The term ‘natural capital’ has been developed to explain the economic value of nature; for example, measuring the money saved by installing natural solutions to protect against flood damage, adapt to climate change or help people lead healthier and happier lives.",
      "E  As the expertise about green roofs grows, official standards have been developed to ensure that they are designed, constructed and maintained properly, and function well. Improvements in the science and technology underpinning green roof development have also led to new variations in the concept. For example, ‘blue roofs’ enable buildings to hold water over longer periods of time, rather than draining it away quickly — crucial in times of heavier rainfall. There are also combinations of green roofs with solar panels, and ‘brown roofs’ which are wilder in nature and maximise biodiversity. If the trend continues, it could create new jobs and a more vibrant and sustainable local food economy — alongside many other benefits. There are still barriers to overcome, but the evidence so far indicates that green roofs have the potential to transform cities and help them function sustainably long into the future. The success stories need to be studied and replicated elsewhere, to make green, blue, brown and food-producing roofs the norm in cities around the world.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-18-test-4-part1-questions-1-5",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 1 has five paragraphs, A–E. Which paragraph contains the following information? Write the correct letter, A–E, in boxes 1–5 on your answer sheet. You may use any letter more than once.",
      questions: [
        { questionNumbers: [1], prompt: "Mention of several challenges to be overcome before a green roof can be installed.", options: "ABCDE".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [2], prompt: "Reference to a city where green roofs have been promoted for many years.", options: "ABCDE".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [3], prompt: "A belief that existing green roofs should be used as a model for new ones.", options: "ABCDE".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [4], prompt: "Examples of how green roofs can work in combination with other green urban initiatives.", options: "ABCDE".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [5], prompt: "The need to make a persuasive argument for the financial benefits of green roofs.", options: "ABCDE".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
      ],
    },
    rawFillBlock(
      "cambridge-18-test-4-part1-questions-6-9",
      "Advantages of green roofs",
      "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 6–9 on your answer sheet.",
      "Advantages of green roofs\n\nCity rooftops covered with greenery have many advantages. These include lessening the likelihood that floods will occur, reducing how much money is spent on 6 ______ and creating environments that are suitable for wildlife. In many cases, they can also be used for producing 7 ______. There are also social benefits of green roofs. For example, the medical profession recommends 8 ______ as an activity to help people cope with mental health issues. Studies have also shown that the availability of green spaces can prevent physical problems such as 9 ______.",
      6,
      9,
    ),
    {
      id: "cambridge-18-test-4-part1-questions-10-11",
      type: "choice",
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 10 and 11 on your answer sheet.",
      questions: [{
        questionNumbers: [10, 11],
        selectCount: 2,
        prompt: "Which TWO advantages of using newer buildings for green roofs are mentioned in Paragraph C of the passage?",
        options: [
          { letter: "A", text: "a longer growing season for edible produce" },
          { letter: "B", text: "more economical use of water" },
          { letter: "C", text: "greater water-storage capacity" },
          { letter: "D", text: "ability to cultivate more plant types" },
          { letter: "E", text: "a large surface area for growing plants" },
        ],
      }],
    },
    {
      id: "cambridge-18-test-4-part1-questions-12-13",
      type: "choice",
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 12 and 13 on your answer sheet.",
      questions: [{
        questionNumbers: [12, 13],
        selectCount: 2,
        prompt: "Which TWO aims of new variations on the concept of green roofs are mentioned in Paragraph E of the passage?",
        options: [
          { letter: "A", text: "to provide habitats for a wide range of species" },
          { letter: "B", text: "to grow plants successfully even in the wettest climates" },
          { letter: "C", text: "to regulate the temperature of the immediate environment" },
          { letter: "D", text: "to generate power from a sustainable source" },
          { letter: "E", text: "to collect water to supply other buildings" },
        ],
      }],
    },
  ],
  source: {
    passagePages: [86, 87].map(sourcePage),
    questionPages: [88, 89].map(sourcePage),
    answerPages: [sourcePage(128)],
    explanationPages: [216, 217, 218, 219, 220, 221, 222].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集18精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const growthMindset: ReadingPart = {
  id: "cambridge-18-test-4-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "The growth mindset",
  sections: [{
    id: "cambridge-18-test-4-part2-passage",
    format: "pre",
    paragraphs: [
      "Over the past century, a powerful idea has taken root in the educational landscape. The concept of intelligence as something innate has been supplanted by the idea that intelligence is not fixed, and that, with the right training, we can be the authors of our own cognitive capabilities. Psychologist Alfred Binet, the developer of the first intelligence tests, was one of many 19th-century scientists who held that earlier view and sought to quantify cognitive ability. Then, in the early 20th century, progressive thinkers revolted against the notion that inherent ability is destiny. Instead, educators such as John Dewey argued that every child’s intelligence could be developed, given the right environment.",
      "‘Growth mindset theory’ is a relatively new — and extremely popular — version of this idea. In many schools today you will see hallways covered in motivational posters and hear speeches on the mindset of great sporting heroes who simply believed their way to the top. A major focus of the growth mindset in schools is coaxing students away from seeing failure as an indication of their ability, and towards seeing it as a chance to improve that ability. As educationalist Jeff Howard noted several decades ago: ‘Smart is not something that you just are, smart is something that you can get.’",
      "The idea of the growth mindset is based on the work of psychologist Carol Dweck in California in the 1990s. In one key experiment, Dweck divided a group of 10- to 12-year-olds into two groups. All were told that they had achieved a high score on a test but the first group were praised for their intelligence in achieving this, while the others were praised for their effort. The second group — those who had been instilled with a ‘growth mindset’ — were subsequently far more likely to put effort into future tasks. Meanwhile, the former took on only those tasks that would not risk their sense of worth. This group had inferred that success or failure is due to innate ability, and this ‘fixed mindset’ had led them to fear of failure and lack of effort. Praising ability actually made the students perform worse, while praising effort emphasised that change was possible.",
      "One of the greatest impediments to successfully implementing a growth mindset, however, is the education system itself: in many parts of the world, the school climate is obsessed with performance in the form of constant testing, analysing and ranking of students — a key characteristic of the fixed mindset. Nor is it unusual for schools to create a certain cognitive dissonance, when they applaud the benefits of a growth mindset but then hand out fixed target grades in lessons based on performance.",
      "Aside from the implementation problem, the original growth mindset research has also received harsh criticism. The statistician Andrew Gelman claims that ‘their research designs have enough degrees of freedom that they could take their data to support just about any theory at all’. Professor of Psychology Timothy Bates, who has been trying to replicate Dweck’s work, is finding that the results are repeatedly null. He notes that: ‘People with a growth mindset don’t cope any better with failure ... Kids with the growth mindset aren’t getting better grades, either before or after our intervention study.’",
      "Much of this criticism is not lost on Dweck, and she deserves great credit for responding to it and adapting her work accordingly. In fact, she argues that her work has been misunderstood and misapplied in a range of ways. She has also expressed concerns that her theories are being misappropriated in schools by being conflated with the self-esteem movement: ‘For me the growth mindset is a tool for learning and improvement. It’s not just a vehicle for making children feel good.’",
      "But there is another factor at work here. The failure to translate the growth mindset into the classroom might reflect a misunderstanding of the nature of teaching and learning itself. Growth mindset supporters David Yeager and Gregory Walton claim that interventions should be delivered in a subtle way to maximise their effectiveness. They say that if adolescents perceive a teacher’s intervention as conveying that they are in need of help, this could undo its intended effects.",
      "A lot of what drives students is their innate beliefs and how they perceive themselves. There is a strong correlation between self-perception and achievement, but there is evidence to suggest that the actual effect of achievement on self-perception is stronger than the other way round. To stand up in a classroom and successfully deliver a good speech is a genuine achievement, and that is likely to be more powerfully motivating than vague notions of ‘motivation’ itself.",
      "Recent evidence would suggest that growth mindset interventions are not the elixir of student learning that its proponents claim it to be. The growth mindset appears to be a viable construct in the lab, which, when administered in the classroom via targeted interventions, doesn’t seem to work. It is hard to dispute that having faith in the capacity to change is a good attribute for students. Paradoxically, however, that aspiration is not well served by direct interventions that try to instil it.",
      "Motivational posters and talks are often a waste of time, and might well give students a deluded notion of what success actually means. Teaching concrete skills such as how to write an effective introduction to an essay then praising students’ effort in getting there is probably a far better way of improving confidence than telling them how unique they are, or indeed how capable they are of changing their own brains. Perhaps growth mindset works best as a philosophy and not an intervention.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-18-test-4-part2-questions-14-16",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 14–16 on your answer sheet.",
      questions: [
        { questionNumbers: [14], prompt: "What can we learn from the first paragraph?", options: [
          { letter: "A", text: "where the notion of innate intelligence first began" },
          { letter: "B", text: "when ideas about the nature of intelligence began to shift" },
          { letter: "C", text: "how scientists have responded to changing views of intelligence" },
          { letter: "D", text: "why thinkers turned away from the idea of intelligence being fixed" },
        ] },
        { questionNumbers: [15], prompt: "The second paragraph describes how schools encourage students to", options: [
          { letter: "A", text: "identify their personal ambitions." },
          { letter: "B", text: "help each other to realise their goals." },
          { letter: "C", text: "have confidence in their potential to succeed." },
          { letter: "D", text: "concentrate on where their particular strengths lie." },
        ] },
        { questionNumbers: [16], prompt: "In the third paragraph, the writer suggests that students with a fixed mindset", options: [
          { letter: "A", text: "tend to be less competitive." },
          { letter: "B", text: "generally have a low sense of self-esteem." },
          { letter: "C", text: "will only work hard if they are given constant encouragement." },
          { letter: "D", text: "are afraid to push themselves beyond what they see as their limitations." },
        ] },
      ],
    },
    {
      id: "cambridge-18-test-4-part2-questions-17-22",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following statements and the list of people below. Match each statement with the correct person or people, A–E. Write the correct letter in boxes 17–22 on your answer sheet. You may use any letter more than once.",
      questions: [
        { questionNumbers: [17], prompt: "The methodology behind the growth mindset studies was not strict enough.", options: [
          { letter: "A", text: "Alfred Binet" }, { letter: "B", text: "Carol Dweck" }, { letter: "C", text: "Andrew Gelman" }, { letter: "D", text: "Timothy Bates" }, { letter: "E", text: "David Yeager and Gregory Walton" },
        ] },
        { questionNumbers: [18], prompt: "The idea of the growth mindset has been incorrectly interpreted.", options: [
          { letter: "A", text: "Alfred Binet" }, { letter: "B", text: "Carol Dweck" }, { letter: "C", text: "Andrew Gelman" }, { letter: "D", text: "Timothy Bates" }, { letter: "E", text: "David Yeager and Gregory Walton" },
        ] },
        { questionNumbers: [19], prompt: "Intellectual ability is an unchangeable feature of each individual.", options: [
          { letter: "A", text: "Alfred Binet" }, { letter: "B", text: "Carol Dweck" }, { letter: "C", text: "Andrew Gelman" }, { letter: "D", text: "Timothy Bates" }, { letter: "E", text: "David Yeager and Gregory Walton" },
        ] },
        { questionNumbers: [20], prompt: "The growth mindset should be promoted without students being aware of it.", options: [
          { letter: "A", text: "Alfred Binet" }, { letter: "B", text: "Carol Dweck" }, { letter: "C", text: "Andrew Gelman" }, { letter: "D", text: "Timothy Bates" }, { letter: "E", text: "David Yeager and Gregory Walton" },
        ] },
        { questionNumbers: [21], prompt: "The growth mindset is not simply about boosting students’ morale.", options: [
          { letter: "A", text: "Alfred Binet" }, { letter: "B", text: "Carol Dweck" }, { letter: "C", text: "Andrew Gelman" }, { letter: "D", text: "Timothy Bates" }, { letter: "E", text: "David Yeager and Gregory Walton" },
        ] },
        { questionNumbers: [22], prompt: "Research shows that the growth mindset has no effect on academic achievement.", options: [
          { letter: "A", text: "Alfred Binet" }, { letter: "B", text: "Carol Dweck" }, { letter: "C", text: "Andrew Gelman" }, { letter: "D", text: "Timothy Bates" }, { letter: "E", text: "David Yeager and Gregory Walton" },
        ] },
      ],
    },
    {
      id: "cambridge-18-test-4-part2-questions-23-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the views of the writer in Reading Passage 2? Write YES if the statement agrees with the views of the writer, NO if it contradicts the views of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this. Write your answers in boxes 23–26 on your answer sheet.",
      questions: [
        { questionNumbers: [23], prompt: "Dweck has handled criticisms of her work in an admirable way.", options: yesNoNotGivenOptions },
        { questionNumbers: [24], prompt: "Students’ self-perception is a more effective driver of self-confidence than actual achievement is.", options: yesNoNotGivenOptions },
        { questionNumbers: [25], prompt: "Recent evidence about growth mindset interventions has attracted unfair coverage in the media.", options: yesNoNotGivenOptions },
        { questionNumbers: [26], prompt: "Deliberate attempts to encourage students to strive for high achievement may have a negative effect.", options: yesNoNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [90, 91].map(sourcePage),
    questionPages: [92, 93].map(sourcePage),
    answerPages: [sourcePage(128)],
    explanationPages: [228, 229, 230, 231, 232, 233, 234, 235].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集18精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const wegener: ReadingPart = {
  id: "cambridge-18-test-4-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Alfred Wegener: science, exploration and the theory of continental drift",
  byline: "by Mott T Greene",
  sections: [{
    id: "cambridge-18-test-4-part3-passage",
    heading: "Introduction",
    format: "pre",
    paragraphs: [
      "This is a book about the life and scientific work of Alfred Wegener, whose reputation today rests with his theory of continental displacements, better known as ‘continental drift’. Wegener proposed this theory in 1912 and developed it extensively for nearly 20 years. His book on the subject, The Origin of Continents and Oceans, went through four editions and was the focus of an international controversy in his lifetime and for some years after his death.",
      "Wegener’s basic idea was that many mysteries about the Earth’s history could be solved if one supposed that the continents moved laterally, rather than supposing that they remained fixed in place. Wegener showed in great detail how such continental movements were plausible and how they worked, using evidence from a large number of sciences including geology, geophysics, paleontology, and climatology. Wegener’s idea — that the continents move — is at the heart of the theory that guides Earth sciences today: namely plate tectonics. Plate tectonics is in many respects quite different from Wegener’s proposal, in the same way that modern evolutionary theory is very different from the ideas Charles Darwin proposed in the 1850s about biological evolution. Yet plate tectonics is a descendant of Alfred Wegener’s theory of continental drift, in quite the same way that modern evolutionary theory is a descendant of Darwin’s theory of natural selection.",
      "When I started writing about Wegener’s life and work, one of the most intriguing things about him for me was that, although he came up with a theory on continental drift, he was not a geologist. He trained as an astronomer and pursued a career in atmospheric physics. When he proposed the theory of continental displacements in 1912, he was a lecturer in physics and astronomy at the University of Marburg, in southern Germany. However, he was not an ‘unknown’. In 1906 he had set a world record (with his brother Kurt) for time aloft in a hot-air balloon: 52 hours. Between 1906 and 1908 he had taken part in a highly publicized and extremely dangerous expedition to the coast of northeast Greenland. He had also made a name for himself amongst a small circle of meteorologists and atmospheric physicists in Germany as the author of a textbook, Thermodynamics of the Atmosphere (1911), and of a number of interesting scientific papers.",
      "As important as Wegener’s work on continental drift has turned out to be, it was largely a sideline to his interest in atmospheric physics, geophysics, and paleoclimatology, and thus I have been at great pains to put Wegener’s work on continental drift in the larger context of his other scientific work, and in the even larger context of atmospheric sciences in his lifetime. This is a ‘continental drift book’ only to the extent that Wegener was interested in that topic and later became famous for it. My treatment of his other scientific work is no less detailed, though I certainly have devoted more attention to the reception of his ideas on continental displacement, as they were much more controversial than his other work.",
      "Readers interested in the specific detail of Wegener’s career will see that he often stopped pursuing a given line of investigation (sometimes for years on end), only to pick it up later. I have tried to provide guideposts to his rapidly shifting interests by characterizing different phases of his life as careers in different sciences, which is reflected in the titles of the chapters. Thus, the index should be a sufficient guide for those interested in a particular aspect of Wegener’s life but perhaps not all of it. My own feeling, however, is that the parts do not make as much sense on their own as do all of his activities taken together. In this respect I urge readers to try to experience Wegener’s life as he lived it, with all the interruptions, changes of mind, and renewed efforts this entailed.",
      "Wegener left behind a few published works but, as was standard practice, these reported the results of his work — not the journey he took to reach that point. Only a few hundred of the many thousands of letters he wrote and received in his lifetime have survived and he didn’t keep notebooks or diaries that recorded his life and activities. He was not active (with a few exceptions) in scientific societies, and did not seek to find influence or advance his ideas through professional contacts and politics, spending most of his time at home in his study reading and writing, or in the field collecting observations.",
      "Some famous scientists, such as Newton, Darwin, and Einstein, left mountains of written material behind, hundreds of notebooks and letters numbering in the tens of thousands. Others, like Michael Faraday, left extensive journals of their thoughts and speculations, parallel to their scientific notebooks. The more such material a scientist leaves behind, the better chance a biographer has of forming an accurate picture of how a scientist’s ideas took shape and evolved.",
      "I am firmly of the opinion that most of us, Wegener included, are not in any real sense the authors of our own lives. We plan, think, and act, often with apparent freedom, but most of the time our lives ‘happen to us’, and we only retrospectively turn this happenstance into a coherent narrative of fulfilled intentions. This book, therefore, is a story both of the life and scientific work that Alfred Wegener planned and intended and of the life and scientific work that actually ‘happened to him’. These are, as I think you will soon see, not always the same thing.\n\n* Paleoclimatology — The study of past climates",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-18-test-4-part3-questions-27-30",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 3? Write YES if the statement agrees with the claims of the writer, NO if the statement contradicts the claims of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this. Write your answers in boxes 27–30 on your answer sheet.",
      questions: [
        { questionNumbers: [27], prompt: "Wegener’s ideas about continental drift were widely disputed while he was alive.", options: yesNoNotGivenOptions },
        { questionNumbers: [28], prompt: "The idea that the continents remained fixed in place was defended in a number of respected scientific publications.", options: yesNoNotGivenOptions },
        { questionNumbers: [29], prompt: "Wegener relied on a limited range of scientific fields to support his theory of continental drift.", options: yesNoNotGivenOptions },
        { questionNumbers: [30], prompt: "The similarities between Wegener’s theory of continental drift and modern-day plate tectonics are enormous.", options: yesNoNotGivenOptions },
      ],
    },
    {
      id: "cambridge-18-test-4-part3-questions-31-36",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary using the list of phrases, A–J, below. Write the correct letter, A–J, in boxes 31–36 on your answer sheet.",
      questions: [
        { questionNumbers: [31], prompt: "One of the remarkable things about Wegener from a 31 ______ is that although he proposed a theory of continental drift, he was not a geologist.", options: [
          { letter: "A", text: "modest fame" }, { letter: "B", text: "vast range" }, { letter: "C", text: "record-breaking achievement" },
          { letter: "D", text: "research methods" }, { letter: "E", text: "select group" }, { letter: "F", text: "professional interests" },
          { letter: "G", text: "scientific debate" }, { letter: "H", text: "hazardous exploration" }, { letter: "I", text: "biographer’s perspective" },
          { letter: "J", text: "narrow investigation" },
        ] },
        { questionNumbers: [32], prompt: "His 32 ______ were limited to atmospheric physics.", options: [
          { letter: "A", text: "modest fame" }, { letter: "B", text: "vast range" }, { letter: "C", text: "record-breaking achievement" },
          { letter: "D", text: "research methods" }, { letter: "E", text: "select group" }, { letter: "F", text: "professional interests" },
          { letter: "G", text: "scientific debate" }, { letter: "H", text: "hazardous exploration" }, { letter: "I", text: "biographer’s perspective" },
          { letter: "J", text: "narrow investigation" },
        ] },
        { questionNumbers: [33], prompt: "When he proposed his theory in 1912, he was already a person of 33 ______.", options: [
          { letter: "A", text: "modest fame" }, { letter: "B", text: "vast range" }, { letter: "C", text: "record-breaking achievement" },
          { letter: "D", text: "research methods" }, { letter: "E", text: "select group" }, { letter: "F", text: "professional interests" },
          { letter: "G", text: "scientific debate" }, { letter: "H", text: "hazardous exploration" }, { letter: "I", text: "biographer’s perspective" },
          { letter: "J", text: "narrow investigation" },
        ] },
        { questionNumbers: [34], prompt: "Six years previously, there had been his 34 ______ of 52 hours in a hot-air balloon.", options: [
          { letter: "A", text: "modest fame" }, { letter: "B", text: "vast range" }, { letter: "C", text: "record-breaking achievement" },
          { letter: "D", text: "research methods" }, { letter: "E", text: "select group" }, { letter: "F", text: "professional interests" },
          { letter: "G", text: "scientific debate" }, { letter: "H", text: "hazardous exploration" }, { letter: "I", text: "biographer’s perspective" },
          { letter: "J", text: "narrow investigation" },
        ] },
        { questionNumbers: [35], prompt: "This was followed by his well-publicised but 35 ______ of Greenland’s coast.", options: [
          { letter: "A", text: "modest fame" }, { letter: "B", text: "vast range" }, { letter: "C", text: "record-breaking achievement" },
          { letter: "D", text: "research methods" }, { letter: "E", text: "select group" }, { letter: "F", text: "professional interests" },
          { letter: "G", text: "scientific debate" }, { letter: "H", text: "hazardous exploration" }, { letter: "I", text: "biographer’s perspective" },
          { letter: "J", text: "narrow investigation" },
        ] },
        { questionNumbers: [36], prompt: "His textbook brought him to the attention of a 36 ______ of German scientists.", options: [
          { letter: "A", text: "modest fame" }, { letter: "B", text: "vast range" }, { letter: "C", text: "record-breaking achievement" },
          { letter: "D", text: "research methods" }, { letter: "E", text: "select group" }, { letter: "F", text: "professional interests" },
          { letter: "G", text: "scientific debate" }, { letter: "H", text: "hazardous exploration" }, { letter: "I", text: "biographer’s perspective" },
          { letter: "J", text: "narrow investigation" },
        ] },
      ],
    },
    {
      id: "cambridge-18-test-4-part3-questions-37-40",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 37–40 on your answer sheet.",
      questions: [
        { questionNumbers: [37], prompt: "What is Mott T Greene doing in the fifth paragraph?", options: [
          { letter: "A", text: "describing what motivated him to write the book" },
          { letter: "B", text: "explaining why it is desirable to read the whole book" },
          { letter: "C", text: "suggesting why Wegener pursued so many different careers" },
          { letter: "D", text: "indicating what aspects of Wegener’s life interested him most" },
        ] },
        { questionNumbers: [38], prompt: "What is said about Wegener in the sixth paragraph?", options: [
          { letter: "A", text: "He was not a particularly ambitious person." },
          { letter: "B", text: "He kept a record of all his scientific observations." },
          { letter: "C", text: "He did not adopt many of the scientific practices of the time." },
          { letter: "D", text: "He enjoyed discussing new discoveries with other scientists." },
        ] },
        { questionNumbers: [39], prompt: "What does Greene say about some other famous scientists?", options: [
          { letter: "A", text: "Their published works had a greater impact than Wegener’s did." },
          { letter: "B", text: "They had fewer doubts about their scientific ideas than Wegener did." },
          { letter: "C", text: "Their scientific ideas were more controversial than Wegener’s." },
          { letter: "D", text: "They are easier subjects to write about than Wegener." },
        ] },
        { questionNumbers: [40], prompt: "What is Greene’s main point in the final paragraph?", options: [
          { letter: "A", text: "It is not enough in life to have good intentions." },
          { letter: "B", text: "People need to plan carefully if they want to succeed." },
          { letter: "C", text: "People have little control over many aspects of their lives." },
          { letter: "D", text: "It is important that people ensure they have the freedom to act." },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [94, 95].map(sourcePage),
    questionPages: [96, 97].map(sourcePage),
    answerPages: [sourcePage(128)],
    explanationPages: [240, 241, 242, 243, 244, 245, 246, 247, 248, 249].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集18精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE18_TEST4_PARTS: ReadingPart[] = [greenRoofs, growthMindset, wegener];

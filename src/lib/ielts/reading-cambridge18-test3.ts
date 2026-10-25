import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  63: [1750, 2341], 64: [1624, 2341], 65: [1708, 2341], 66: [1613, 2304],
  67: [1750, 2341], 68: [1623, 2341], 69: [1750, 2341], 70: [1706, 2299],
  71: [1646, 2341], 72: [1632, 2341], 73: [1750, 2341], 74: [1620, 2303],
  75: [1604, 2341], 76: [1606, 2308], 126: [1750, 1723],
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
    152: 2148, 153: 2369, 154: 2354, 155: 2365, 156: 2353, 157: 2369, 158: 2350,
    164: 1945, 165: 2369, 166: 2358, 167: 2369, 168: 2353, 169: 2368, 170: 2354, 171: 2370,
    177: 2161, 178: 2356, 179: 2366, 180: 2355, 181: 2369, 182: 2351, 183: 2369, 184: 2355, 185: 2370,
  };
  return {
    page,
    src: "/reading/explanations/cambridge-18-test-3-part" + part + "-exp18-p" + String(page).padStart(3, "0") + ".webp",
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

const yesNoNotGivenOptions = [
  { letter: "YES", text: "The statement agrees with the views of the writer." },
  { letter: "NO", text: "The statement contradicts the views of the writer." },
  { letter: "NOT GIVEN", text: "It is impossible to say what the writer thinks about this." },
];

const materialsBeyondConcrete: ReadingPart = {
  id: "cambridge-18-test-3-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Materials to take us beyond concrete",
  subtitle: "Concrete is everywhere, but it’s bad for the planet, generating large amounts of carbon dioxide — alternatives are being developed",
  sections: [{
    id: "cambridge-18-test-3-part1-passage",
    format: "pre",
    paragraphs: [
      "A  Concrete is the second most used substance in the global economy, after water — and one of the world’s biggest single sources of greenhouse gas emissions. The chemical process by which cement, the key ingredient of concrete, is created results in large quantities of carbon dioxide. The UN estimates that there will be 9.8 billion people living on the planet by mid-century. They will need somewhere to live. If concrete is the only answer to the construction of new cities, then carbon emissions will soar, aggravating global warming. And so scientists have started innovating with other materials, in a scramble for alternatives to a universal commodity that has underpinned our modern life for many years.",
      "B  The problem with replacing concrete is that it is so very good at what it does. Chris Cheeseman, an engineering professor at Imperial College London, says the key thing to consider is the extent to which concrete is used around the world, and is likely to continue to be used. ‘Concrete is not a high-carbon product. Cement is high carbon, but concrete is not. But it is the scale on which it is used that makes it high carbon. The sheer scale of manufacture is so huge, that is the issue.’",
      "C  Not only are the ingredients of concrete relatively cheap and found in abundance in most places around the globe, the stuff itself has marvellous properties: Portland cement, the vital component of concrete, is mouldable and pourable, but quickly sets hard. Cheeseman also notes another advantage: concrete and steel have similar thermal expansion properties, so steel can be used to reinforce concrete, making it far stronger and more flexible as a building material than it could be on its own. According to Cheeseman, all these factors together make concrete hard to beat. ‘Concrete is amazing stuff. Making anything with similar properties is going to be very difficult.’",
      "D  A possible alternative to concrete is wood. Making buildings from wood may seem like a rather medieval idea, but climate change is driving architects to turn to treated timber as a possible resource. Recent years have seen the emergence of tall buildings constructed almost entirely from timber. Vancouver, Vienna and Brumunddal in Norway are all home to constructed tall, wooden buildings.",
      "E  Using wood to construct buildings, however, is not straightforward. Wood expands as it absorbs moisture from the air and is susceptible to pests, not to mention fire. But treating wood and combining it with other materials can improve its properties. Cross-laminated timber is engineered wood. An adhesive is used to stick layers of solid-sawn timber together, crosswise, to form building blocks. This material is light but has the strength of concrete and steel. Construction experts say that wooden buildings can be constructed at a greater speed than ones of concrete and steel and the process, it seems, is quieter.",
      "F  Stora Enso is Europe’s biggest supplier of cross-laminated timber, and its vice-president Markus Mannström reports that the company is seeing increasing demand globally for building in wood, with climate change concerns the key driver. Finland, with its large forests, where Stora Enso is based, has been leading the way, but the company is seeing a rise in demand for its timber products across the world, including in Asia. Of course, using timber in a building also locks away the carbon that it absorbed as it grew. But even treated wood has its limitations and only when a wider range of construction projects has been proven in practice will it be possible to see wood as a real alternative to concrete in constructing tall buildings.",
      "G  Fly ash and slag from iron ore are possible alternatives to cement in a concrete mix. Fly ash, a byproduct of coal-burning power plants, can be incorporated into concrete mixes to make up as much as 15 to 30% of the cement, without harming the strength or durability of the resulting mix. Iron-ore slag, a byproduct of the iron-ore smelting process, can be used in a similar way. Their incorporation into concrete mixes has the potential to reduce greenhouse gas emissions. But Anna Surgenor, of the UK’s Green Building Council, notes that although these waste products can save carbon in the concrete mix, their use is not always straightforward. ‘It’s possible to replace the cement content in concrete with waste products to lower the overall carbon impact. But there are several calculations that need to be considered across the entire life cycle of the building — these include factoring in where these materials are being shipped from. If they are transported over long distances, using fossil fuels, the use of alternative materials might not make sense from an overall carbon reduction perspective.’",
      "H  While these technologies are all promising ideas, they are either unproven or based on materials that are not abundant. In their overview of innovation in the concrete industry, Felix Preston and Johanna Lehne of the UK’s Royal Institute of International Affairs reached the conclusion that, ‘Some novel cements have been discussed for more than a decade within the research community, without breaking through. At present, these alternatives are rarely as cost-effective as conventional cement, and they face raw-material shortages and resistance from customers.’",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-18-test-3-part1-questions-1-4",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 1 has eight sections, A–H. Which section contains the following information? Write the correct letter, A–H, in boxes 1–4 on your answer sheet.",
      questions: [
        { questionNumbers: [1], prompt: "An explanation of the industrial processes that create potential raw materials for concrete.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [2], prompt: "A reference to the various locations where high-rise wooden buildings can be found.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [3], prompt: "An indication of how widely available the raw materials of concrete are.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [4], prompt: "The belief that more high-rise wooden buildings are needed before wood can be regarded as a viable construction material.", options: "ABCDEFGH".split("").map((letter) => ({ letter, text: "Section " + letter })) },
      ],
    },
    rawFillBlock(
      "cambridge-18-test-3-part1-questions-5-8",
      "Making buildings with wood",
      "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 5–8 on your answer sheet.",
      "Making buildings with wood\n\nWood is a traditional building material, but current environmental concerns are encouraging 5 ______ to use wood in modern construction projects. Using wood, however, has its challenges. For example, as 6 ______ in the atmosphere enters wood, it increases in size. In addition, wood is prone to pests and the risk of fire is greater. However, wood can be turned into a better construction material if it is treated and combined with other materials. In one process, 7 ______ of solid wood are glued together to create building blocks. These blocks are lighter than concrete and steel but equal them in strength. Experts say that wooden buildings are an improvement on those made of concrete and steel in terms of the 8 ______ with which they can be constructed and how much noise is generated by the process.",
      5,
      8,
    ),
    {
      id: "cambridge-18-test-3-part1-questions-9-13",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following statements and the list of people below. Match each statement with the correct person, A, B, C or D. Write the correct letter in boxes 9–13 on your answer sheet. You may use any letter more than once.",
      questions: [
        { questionNumbers: [9], prompt: "The environmental advantage of cement alternatives may not be as great as initially assumed.", options: [
          { letter: "A", text: "Chris Cheeseman" }, { letter: "B", text: "Markus Mannström" }, { letter: "C", text: "Anna Surgenor" }, { letter: "D", text: "Felix Preston and Johanna Lehne" },
        ] },
        { questionNumbers: [10], prompt: "It would be hard to create a construction alternative to concrete that offers so many comparable benefits.", options: [
          { letter: "A", text: "Chris Cheeseman" }, { letter: "B", text: "Markus Mannström" }, { letter: "C", text: "Anna Surgenor" }, { letter: "D", text: "Felix Preston and Johanna Lehne" },
        ] },
        { questionNumbers: [11], prompt: "Worries about the environment have led to increased interest in wood as a construction material.", options: [
          { letter: "A", text: "Chris Cheeseman" }, { letter: "B", text: "Markus Mannström" }, { letter: "C", text: "Anna Surgenor" }, { letter: "D", text: "Felix Preston and Johanna Lehne" },
        ] },
        { questionNumbers: [12], prompt: "Expense has been a factor in the negative response to the development of new cements.", options: [
          { letter: "A", text: "Chris Cheeseman" }, { letter: "B", text: "Markus Mannström" }, { letter: "C", text: "Anna Surgenor" }, { letter: "D", text: "Felix Preston and Johanna Lehne" },
        ] },
        { questionNumbers: [13], prompt: "The environmental damage caused by concrete is due to it being produced in large quantities.", options: [
          { letter: "A", text: "Chris Cheeseman" }, { letter: "B", text: "Markus Mannström" }, { letter: "C", text: "Anna Surgenor" }, { letter: "D", text: "Felix Preston and Johanna Lehne" },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [63, 64].map(sourcePage),
    questionPages: [65, 66].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [152, 153, 154, 155, 156, 157, 158].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集18精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const steamCar: ReadingPart = {
  id: "cambridge-18-test-3-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "The steam car",
  subtitle: "The successes and failures of the Doble brothers and their steam cars",
  sections: [{
    id: "cambridge-18-test-3-part2-passage",
    format: "pre",
    paragraphs: [
      "A  When primitive automobiles first began to appear in the 1800s, their engines were based on steam power. Steam had already enjoyed a long and successful career in the railways, so it was only natural that the technology evolved into a miniaturized version which was separate from the trains. But these early cars inherited steam’s weaknesses along with its strengths. The boilers had to be lit by hand, and they required about twenty minutes to build up pressure before they could be driven. Furthermore, their water reservoirs only lasted for about thirty miles before needing replenishment. Despite such shortcomings, these newly designed self-propelled carriages offered quick transportation, and by the early 1900s it was not uncommon to see such machines shuttling wealthy citizens around town.",
      "B  But the glory days of steam cars were few. A new technology called the Internal Combustion Engine soon appeared, which offered the ability to drive down the road just moments after starting up. At first, these noisy gasoline cars were unpopular because they were more complicated to operate and they had difficult hand-crank starters, which were known to break arms when the engines backfired. But in 1912 General Motors introduced the electric starter, and over the following few years steam power was gradually phased out.",
      "C  Even as the market was declining, four brothers made one last effort to rekindle the technology. Between 1906 and 1909, while still attending high school, Abner Doble and his three brothers built their first steam car in their parents’ basement. It comprised parts taken from a wrecked early steam car but reconfigured to drive an engine of their own design. Though it did not run well, the Doble brothers went on to build a second and third prototype in the following years. Though the Doble boys’ third prototype, nicknamed the Model B, still lacked the convenience of an internal combustion engine, it drew the attention of automobile trade magazines due to its numerous improvements over previous steam cars. The Model B proved to be superior to gasoline automobiles in many ways. Its high-pressure steam drove the engine pistons in virtual silence, in contrast to clattering gas engines which emitted the aroma of burned hydrocarbons. Perhaps most impressively, the Model B was amazingly swift. It could accelerate from zero to sixty miles per hour in just fifteen seconds, a feat described as ‘remarkable acceleration’ by Automobile magazine in 1914.",
      "D  The following year Abner Doble drove the Model B from Massachusetts to Detroit in order to seek investment in his automobile design, which he used to open the General Engineering Company. He and his brothers immediately began working on the Model C, which was intended to expand upon the innovations of the Model B. The brothers added features such as a key-based ignition in the cabin, eliminating the need for the operator to manually ignite the boiler. With these enhancements, the Dobles’ new car company promised a steam vehicle which would provide all of the convenience of a gasoline car, but with much greater speed, much simpler driving controls, and a virtually silent powerplant. By the following April, the General Engineering Company had received 5,390 deposits for Doble Detroits, which were scheduled for delivery in early 1918.",
      "E  Later that year Abner Doble delivered unhappy news to those eagerly awaiting the delivery of their modern new cars. Those buyers who received the handful of completed cars complained that the vehicles were sluggish and erratic, sometimes going in reverse when they should go forward. The new engine design, though innovative, was still plagued with serious glitches.",
      "F  The brothers made one final attempt to produce a viable steam automobile. In early 1924, the Doble brothers shipped a Model E to New York City to be road-tested by the Automobile Club of America. After sitting overnight in freezing temperatures, the car was pushed out into the road and left to sit for over an hour in the frosty morning air. At the turn of the key, the boiler lit and reached its operating pressure inside of forty seconds. As they drove the test vehicle further, they found that its evenly distributed weight lent it surprisingly good handling, even though it was so heavy. As the new Doble steamer was further developed and tested, its maximum speed was pushed to over a hundred miles per hour, and it achieved about fifteen miles per gallon of kerosene with negligible emissions.",
      "G  Sadly, the Dobles’ brilliant steam car never was a financial success. Priced at around $18,000 in 1924, it was popular only among the very wealthy. Plus, it is said that no two Model Es were quite the same, because Abner Doble tinkered endlessly with the design. By the time the company folded in 1931, fewer than fifty of the amazing Model E steam cars had been produced. For his whole career, until his death in 1961, Abner Doble remained adamant that steam-powered automobiles were at least equal to gasoline cars, if not superior. Given the evidence, he may have been right. Many of the Model E Dobles which have survived are still in good working condition, some having been driven over half a million miles with only normal maintenance. Astonishingly, an unmodified Doble Model E runs clean enough to pass the emissions laws in California today, and they are pretty strict. It is true that the technology poses some difficult problems, but you cannot help but wonder how efficient a steam car might be with the benefit of modern materials and computers. Under the current pressure to improve automotive performance and reduce emissions, it is not unthinkable that the steam car may rise again.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-18-test-3-part2-questions-14-20",
      type: "headings",
      title: "Reading Passage 2 has seven paragraphs, A–G.",
      instruction: "Choose the correct heading for each paragraph from the list of headings below. Write the correct number, i–viii, in boxes 14–20 on your answer sheet.",
      questionNumbers: [14, 15, 16, 17, 18, 19, 20],
      options: [
        { id: "i", text: "A period in cold conditions before the technology is assessed" },
        { id: "ii", text: "Marketing issues lead to failure" },
        { id: "iii", text: "Good and bad aspects of steam technology are passed on" },
        { id: "iv", text: "A possible solution to the issues of today" },
        { id: "v", text: "Further improvements lead to commercial orders" },
        { id: "vi", text: "Positive publicity at last for this quiet, clean, fast vehicle" },
        { id: "vii", text: "A disappointing outcome for customers" },
        { id: "viii", text: "A better option than the steam car arises" },
      ],
    },
    {
      id: "cambridge-18-test-3-part2-questions-21-23",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 21–23 on your answer sheet.",
      questions: [
        { questionNumbers: [21], prompt: "What point does the writer make about the steam car in Paragraph B?", options: [
          { letter: "A", text: "Its success was short-lived." },
          { letter: "B", text: "Not enough cars were made." },
          { letter: "C", text: "Car companies found them hard to sell." },
          { letter: "D", text: "People found them hard to drive." },
        ] },
        { questionNumbers: [22], prompt: "When building their first steam car, the Doble brothers", options: [
          { letter: "A", text: "constructed all the parts themselves." },
          { letter: "B", text: "made written notes at each stage of the construction." },
          { letter: "C", text: "needed several attempts to achieve a competitive model." },
          { letter: "D", text: "sought the advice of experienced people in the car industry." },
        ] },
        { questionNumbers: [23], prompt: "In order to produce the Model C, the Doble brothers", options: [
          { letter: "A", text: "moved production to a different city." },
          { letter: "B", text: "raised financial capital." },
          { letter: "C", text: "employed an additional worker." },
          { letter: "D", text: "abandoned their earlier designs." },
        ] },
      ],
    },
    rawFillBlock(
      "cambridge-18-test-3-part2-questions-24-26",
      "The Model E",
      "Complete the summary below. Choose ONE WORD AND/OR A NUMBER from the passage for each answer. Write your answers in boxes 24–26 on your answer sheet.",
      "The Model E\n\nThe Model E was road-tested in 1924 by the Automobile Club of America. They found it easy to drive, despite its weight, and it impressed the spectators. A later version of the Model E raised its 24 ______, while keeping its emissions extremely low.\n\nThe steam car was too expensive for many people and its design was constantly being altered. Under 25 ______ were produced before the company went out of business. However, even today, there are Model Es on the road in the US. They are straightforward to maintain, and they satisfy California’s 26 ______ emissions laws. Perhaps today’s technology and materials would help us revive the steam car.",
      24,
      26,
    ),
  ],
  source: {
    passagePages: [68, 69].map(sourcePage),
    questionPages: [67, 70, 71].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [164, 165, 166, 167, 168, 169, 170, 171].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集18精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const mixedAbilityClasses: ReadingPart = {
  id: "cambridge-18-test-3-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "The case for mixed-ability classes",
  sections: [{
    id: "cambridge-18-test-3-part3-passage",
    format: "pre",
    paragraphs: [
      "Picture this scene. It’s an English literature lesson in a UK school, and the teacher has just read an extract from Shakespeare’s Romeo and Juliet with a class of 15-year-olds. He’s given some of the students copies of No Fear Shakespeare, a kid-friendly translation of the original. For three students, even these literacy demands are beyond them. Another girl simply can’t focus and he gives her pens and paper to draw with. The teacher can ask the No Fear group to identify the key characters and maybe provide a tentative plot summary. He can ask most of the class about character development, and five of them might be able to support their statements with textual evidence. Now two curious students are wondering whether Shakespeare advocates living a life of moderation or one of passionate engagement.",
      "As a teacher myself, I’d think my lesson would be going rather well if the discussion went as described above. But wouldn’t this kind of class work better if there weren’t such a huge gap between the top and the bottom? If we put all the kids who needed literacy support into one class, and all the students who want to discuss the virtue of moderation into another?",
      "The practice of ‘streaming’, or ‘tracking’, involves separating students into classes depending on their diagnosed levels of attainment. At a macro level, it requires the establishment of academically selective schools for the brightest students, and comprehensive schools for the rest. Within schools, it means selecting students into a ‘stream’ of general ability, or ‘sets’ of subject-specific ability. The practice is intuitively appealing to almost every stakeholder.",
      "I have heard the mixed-ability model attacked by way of analogy: a group hike. The fittest in the group take the lead and set a brisk pace, only to have to stop and wait every 20 minutes. This is frustrating, and their enthusiasm wanes. Meanwhile, the slowest ones are not only embarrassed but physically struggling to keep up. What’s worse, they never get a long enough break. They honestly just want to quit. Hiking, they feel, is not for them.",
      "Mixed-ability classes bore students, frustrate parents and burn out teachers. The brightest ones will never summit Mount Qomolangma, and the stragglers won’t enjoy the lovely stroll in the park they are perhaps more suited to. Individuals suffer at the demands of the collective, mediocrity prevails. So: is learning like hiking?",
      "The current pedagogical paradigm is arguably that of constructivism, which emerged out of the work of psychologist Lev Vygotsky. In the 1930s, Vygotsky emphasised the importance of targeting a student’s specific ‘zone of proximal development’ (ZPD). This is the gap between what they can achieve only with support — teachers, textbooks, worked examples, parents and so on — and what they can achieve independently. The purpose of teaching is to provide and then gradually remove this ‘scaffolding’ until they are autonomous. If we accept this model, it follows that streaming students with similar ZPDs would be an efficient and effective solution. And that forcing everyone on the same hike — regardless of aptitude — would be madness.",
      "Despite all this, there is limited empirical evidence to suggest that streaming results in better outcomes for students. Professor John Hattie, director of the Melbourne Education Research Institute, notes that ‘tracking has minimal effects on learning outcomes’. What is more, streaming appears to significantly — and negatively — affect those students assigned to the lowest sets. These students tend to have much higher representation of low socioeconomic class. Less significant is the small benefit for those lucky clever students in the higher sets. The overall result is that the smart stay smart and the dumb get dumber, further entrenching the social divide.",
      "In the latest update of Hattie’s influential meta-analysis of factors influencing student achievement, one of the most significant factors is the teachers’ estimate of achievement. Streaming students by diagnosed achievement automatically limits what the teacher feels the student is capable of. Meanwhile, in a mixed environment, teachers’ estimates need to be more diverse and flexible.",
      "While streaming might seem to help teachers effectively target a student’s ZPD, it can underestimate the importance of peer-to-peer learning. A crucial aspect of constructivist theory is the role of the MKO — ‘more-knowledgeable other’ — in knowledge construction. While teachers are traditionally the MKOs in classrooms, the value of knowledgeable student peers must not go unrecognised either.",
      "I find it amazing to watch students get over an idea to their peers in ways that I would never think of. They operate with different language tools and different social tools from teachers and, having just learnt it themselves, they possess similar cognitive structures to their struggling classmates. There is also something exciting about passing on skills and knowledge that you yourself have just mastered — a certain pride and zeal, a certain freshness to the interaction between ‘teacher’ and ‘learner’ that is often lost by the expert for whom the steps are obvious and the joy of discovery forgotten.",
      "Having a variety of different abilities in a collaborative learning environment provides valuable resources for helping students meet their learning needs, not to mention improving their communication and social skills. And today, more than ever, we need the many to flourish — not suffer at the expense of a few bright stars. Once a year, I go on a hike with my class, a mixed bunch of students. It is challenging. The fittest students realise they need to encourage the reluctant. There are lookouts who report back, and extra items to carry for others. We make it — together.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-18-test-3-part3-questions-27-30",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27–30 on your answer sheet.",
      questions: [
        { questionNumbers: [27], prompt: "The writer describes the Romeo and Juliet lesson in order to demonstrate", options: [
          { letter: "A", text: "how few students are interested in literature." },
          { letter: "B", text: "how a teacher handles a range of learning needs." },
          { letter: "C", text: "how unsuitable Shakespeare is for most teenagers." },
          { letter: "D", text: "how weaker students can disrupt their classmates’ learning." },
        ] },
        { questionNumbers: [28], prompt: "What does the writer say about streaming in the third paragraph?", options: [
          { letter: "A", text: "It has a very broad appeal." },
          { letter: "B", text: "It favours cleverer students." },
          { letter: "C", text: "It is relatively simple to implement." },
          { letter: "D", text: "It works better in some schools than others." },
        ] },
        { questionNumbers: [29], prompt: "What idea is suggested by the reference to Mount Qomolangma in the fifth paragraph?", options: [
          { letter: "A", text: "students following unsuitable paths" },
          { letter: "B", text: "students attempting interesting tasks" },
          { letter: "C", text: "students not achieving their full potential" },
          { letter: "D", text: "students not being aware of their limitations" },
        ] },
        { questionNumbers: [30], prompt: "What does the word ‘scaffolding’ in the sixth paragraph refer to?", options: [
          { letter: "A", text: "the factors which prevent a student from learning effectively" },
          { letter: "B", text: "the environment where most of a student’s learning takes place" },
          { letter: "C", text: "the assistance given to a student in their initial stages of learning" },
          { letter: "D", text: "the setting of appropriate learning targets for a student’s aptitude" },
        ] },
      ],
    },
    {
      id: "cambridge-18-test-3-part3-questions-31-35",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete the summary using the list of phrases, A–I, below. Write the correct letter, A–I, in boxes 31–35 on your answer sheet.",
      questions: [
        { questionNumbers: [31], prompt: "According to Professor John Hattie, there is very little indication that streaming leads to 31 ______.", options: [
          { letter: "A", text: "wrong classes" }, { letter: "B", text: "lower expectations" }, { letter: "C", text: "average learners" },
          { letter: "D", text: "bottom sets" }, { letter: "E", text: "brightest pupils" }, { letter: "F", text: "disadvantaged backgrounds" },
          { letter: "G", text: "weaker students" }, { letter: "H", text: "higher achievements" }, { letter: "I", text: "positive impressions" },
        ] },
        { questionNumbers: [32], prompt: "In schools which use streaming, the most significant impact is on those students placed in the 32 ______.", options: [
          { letter: "A", text: "wrong classes" }, { letter: "B", text: "lower expectations" }, { letter: "C", text: "average learners" },
          { letter: "D", text: "bottom sets" }, { letter: "E", text: "brightest pupils" }, { letter: "F", text: "disadvantaged backgrounds" },
          { letter: "G", text: "weaker students" }, { letter: "H", text: "higher achievements" }, { letter: "I", text: "positive impressions" },
        ] },
        { questionNumbers: [33], prompt: "A large proportion of these students have 33 ______.", options: [
          { letter: "A", text: "wrong classes" }, { letter: "B", text: "lower expectations" }, { letter: "C", text: "average learners" },
          { letter: "D", text: "bottom sets" }, { letter: "E", text: "brightest pupils" }, { letter: "F", text: "disadvantaged backgrounds" },
          { letter: "G", text: "weaker students" }, { letter: "H", text: "higher achievements" }, { letter: "I", text: "positive impressions" },
        ] },
        { questionNumbers: [34], prompt: "Meanwhile, for the 34 ______, there appears to be only minimal advantage.", options: [
          { letter: "A", text: "wrong classes" }, { letter: "B", text: "lower expectations" }, { letter: "C", text: "average learners" },
          { letter: "D", text: "bottom sets" }, { letter: "E", text: "brightest pupils" }, { letter: "F", text: "disadvantaged backgrounds" },
          { letter: "G", text: "weaker students" }, { letter: "H", text: "higher achievements" }, { letter: "I", text: "positive impressions" },
        ] },
        { questionNumbers: [35], prompt: "A further issue is that teachers tend to have 35 ______ of students in streamed groups.", options: [
          { letter: "A", text: "wrong classes" }, { letter: "B", text: "lower expectations" }, { letter: "C", text: "average learners" },
          { letter: "D", text: "bottom sets" }, { letter: "E", text: "brightest pupils" }, { letter: "F", text: "disadvantaged backgrounds" },
          { letter: "G", text: "weaker students" }, { letter: "H", text: "higher achievements" }, { letter: "I", text: "positive impressions" },
        ] },
      ],
    },
    {
      id: "cambridge-18-test-3-part3-questions-36-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the views of the writer in Reading Passage 3? Write YES if the statement agrees with the views of the writer, NO if the statement contradicts the views of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this. Write your answers in boxes 36–40 on your answer sheet.",
      questions: [
        { questionNumbers: [36], prompt: "The Vygotsky model of education supports the concept of a mixed-ability class.", options: yesNoNotGivenOptions },
        { questionNumbers: [37], prompt: "Some teachers are uncertain about allowing students to take on MKO roles in the classroom.", options: yesNoNotGivenOptions },
        { questionNumbers: [38], prompt: "It can be rewarding to teach knowledge which you have only recently acquired.", options: yesNoNotGivenOptions },
        { questionNumbers: [39], prompt: "The priority should be to ensure that the highest-achieving students attain their goals.", options: yesNoNotGivenOptions },
        { questionNumbers: [40], prompt: "Taking part in collaborative outdoor activities with teachers and classmates can improve student outcomes in the classroom.", options: yesNoNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [72, 73].map(sourcePage),
    questionPages: [74, 75, 76].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [177, 178, 179, 180, 181, 182, 183, 184, 185].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集18精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE18_TEST3_PARTS: ReadingPart[] = [materialsBeyondConcrete, steamCar, mixedAbilityClasses];

import type { ReadingOption, ReadingPart } from "./reading";

const yesNoNotGiven: ReadingOption[] = [
  { letter: "YES", text: "YES" },
  { letter: "NO", text: "NO" },
  { letter: "NOT GIVEN", text: "NOT GIVEN" },
];

const headings: ReadingOption[] = [
  { letter: "i", text: "Causes of volcanic eruption" },
  { letter: "ii", text: "Efforts to predict volcanic eruption" },
  { letter: "iii", text: "Volcanoes and the features of our planet" },
  { letter: "iv", text: "Different types of volcanic eruption" },
  { letter: "v", text: "International relief efforts" },
  { letter: "vi", text: "The unpredictability of volcanic eruptions" },
];

const paragraphs: ReadingOption[] = "ABCDEFG".split("").map((letter) => ({
  letter,
  text: `Paragraph ${letter}`,
}));

const cambridge4Test3PartOne: ReadingPart = {
  id: "cambridge-4-test-3-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13 which are based on Reading Passage 1 below.",
  title: "Micro-Enterprise Credit for Street Youth",
  sections: [
    {
      id: "c4t3-p1-testimonials",
      paragraphs: [
        "‘I am from a large, poor family and for many years we have done without breakfast. Ever since I joined the Street Kids International program I have been able to buy my family sugar and buns for breakfast. I have also bought myself decent second-hand clothes and shoes.’ — Doreen Soko",
        "‘We've had business experience. Now I'm confident to expand what we've been doing. I've learnt cash management, and the way of keeping money so we save for re-investment. Now business is a part of our lives. As well, we didn't know each other before—now we've made new friends.’ — Fan Kaoma",
        "Participants in the Youth Skills Enterprise Initiative Program, Zambia",
      ],
    },
    {
      id: "c4t3-p1-intro",
      paragraphs: [
        "Although small-scale business training and credit programs have become more common throughout the world, relatively little attention has been paid to the need to direct such opportunities to young people. Even less attention has been paid to children living on the streets or in difficult circumstances.",
        "Over the past nine years, Street Kids International (S.K.I.) has been working with partner organisations in Africa, Latin America and India to support the economic lives of street children. The purpose of this paper is to share some of the lessons S.K.I. and our partners have learned.",
      ],
      heading: "Introduction",
    },
    {
      id: "c4t3-p1-background",
      paragraphs: [
        "Typically, children do not end up on the streets due to a single cause, but to a combination of factors: a dearth of adequately funded schools, the demand for income at home, family breakdown and violence. The street may be attractive to children as a place to find adventurous play and money. However, it is also a place where some children are exposed, with little or no protection, to exploitative employment, urban crime, and abuse.",
        "Children who work on the streets are generally involved in unskilled, labour-intensive tasks which require long hours, such as shining shoes, carrying goods, guarding or washing cars, and informal trading. Some may also earn income through begging, or through theft and other illegal activities. At the same time, there are street children who take pride in supporting themselves and their families and who often enjoy their work. Many children may choose entrepreneurship because it allows them a degree of independence, is less exploitative than many forms of paid employment, and is flexible enough to allow them to participate in other activities such as education and domestic tasks.",
      ],
      heading: "Background",
    },
    {
      id: "c4t3-p1-partnerships",
      paragraphs: [
        "S.K.I. has worked with partner organisations in Latin America, Africa and India to develop innovative opportunities for street children to earn income.",
      ],
      heading: "Street Business Partnerships",
      listItems: [
        "The S.K.I. Bicycle Courier Service first started in the Sudan. Participants in this enterprise were supplied with bicycles, which they used to deliver parcels and messages, and which they were required to pay for gradually from their wages. A similar program was taken up in Bangalore, India.",
        "Another successful project, the Shoe Shine Collective, was a partnership program with the Y.W.C.A. in the Dominican Republic. In this project, participants were lent money to purchase shoe shine boxes. They were also given a safe place to store their equipment, and facilities for individual savings plans.",
        "The Youth Skills Enterprise Initiative in Zambia is a joint program with the Red Cross Society and the Y.W.C.A. Street youths are supported to start their own small business through business training, life skills training and access to credit.",
      ],
    },
    {
      id: "c4t3-p1-lessons",
      paragraphs: [
        "The following lessons have emerged from the programs that S.K.I. and partner organisations have created.",
      ],
      heading: "Lessons Learned",
      listItems: [
        "Being an entrepreneur is not for everyone, nor for every street child. Ideally, potential participants will have been involved in the organisation's programs for at least six months, and trust and relationship-building will have already been established.",
        "The involvement of the participants has been essential to the development of relevant programs. When children have had a major role in determining procedures, they are more likely to abide by and enforce them.",
        "It is critical for all loans to be linked to training programs that include the development of basic business and life skills.",
        "There are tremendous advantages to involving parents or guardians in the program, where such relationships exist. Home visits allow staff the opportunity to know where the participants live, and to understand more about each individual's situation.",
        "Small loans are provided initially for purchasing fixed assets such as bicycles, shoe shine kits and basic building materials for a market stall. As the entrepreneurs gain experience, the enterprises can be gradually expanded and consideration can be given to increasing loan amounts. The loan amounts in S.K.I. programs have generally ranged from US$30–100.",
        "All S.K.I. programs have charged interest on the loans, primarily to get the entrepreneurs used to the concept of paying interest on borrowed money. Generally the rates have been modest (lower than bank rates).",
      ],
    },
    {
      id: "c4t3-p1-conclusion",
      paragraphs: [
        "There is a need to recognise the importance of access to credit for impoverished young people seeking to fulfil economic needs. The provision of small loans to support the entrepreneurial dreams and ambitions of youth can be an effective means to help them change their lives. However, we believe that credit must be extended in association with other types of support that help participants develop critical life skills as well as productive businesses.",
      ],
      heading: "Conclusion",
    },
  ],
  questionBlocks: [
    {
      id: "c4t3-p1-choice-1-4",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write your answers in boxes 1–4 on your answer sheet.",
      questions: [
        {
          questionNumbers: [1],
          prompt: "The quotations in the box at the beginning of the article",
          options: [
            { letter: "A", text: "exemplify the effects of S.K.I." },
            { letter: "B", text: "explain why S.K.I. was set up." },
            { letter: "C", text: "outline the problems of street children." },
            { letter: "D", text: "highlight the benefits to society of S.K.I." },
          ],
        },
        {
          questionNumbers: [2],
          prompt: "The main purpose of S.K.I. is to",
          options: [
            { letter: "A", text: "draw the attention of governments to the problem of street children." },
            { letter: "B", text: "provide schools and social support for street children." },
            { letter: "C", text: "encourage the public to give money to street children." },
            { letter: "D", text: "give business training and loans to street children." },
          ],
        },
        {
          questionNumbers: [3],
          prompt: "Which of the following is mentioned by the writer as a reason why children end up living on the streets?",
          options: [
            { letter: "A", text: "unemployment" },
            { letter: "B", text: "war" },
            { letter: "C", text: "poverty" },
            { letter: "D", text: "crime" },
          ],
        },
        {
          questionNumbers: [4],
          prompt: "In order to become more independent, street children may",
          options: [
            { letter: "A", text: "reject paid employment." },
            { letter: "B", text: "leave their families." },
            { letter: "C", text: "set up their own businesses." },
            { letter: "D", text: "employ other children." },
          ],
        },
      ],
    },
    {
      id: "c4t3-p1-partnership-table",
      type: "fill",
      title: "",
      instruction: "Complete the table below. Choose NO MORE THAN THREE WORDS from Reading Passage 1 for each answer. Write your answers in boxes 5–8 on your answer sheet.",
      questions: [
        { number: 5, before: "", inputCount: 2, joiners: [" and "], answerMode: "all" },
        { number: 6, before: "" },
        { number: 7, before: "" },
        { number: 8, before: "" },
      ],
      table: {
        headers: ["Country", "Organisations Involved", "Type of Project", "Support Provided"],
        rows: [
          [
            { questionNumber: 5, inputCount: 2, joiners: [" and "] },
            { text: "S.K.I." },
            { text: "courier service" },
            { before: "provision of ", questionNumber: 6 },
          ],
          [
            { text: "Dominican Republic" },
            { text: "S.K.I.\nY.W.C.A." },
            { questionNumber: 7 },
            { text: "loans; storage facilities; savings plans" },
          ],
          [
            { text: "Zambia" },
            { text: "S.K.I.\nThe Red Cross\nY.W.C.A." },
            { text: "setting up small businesses" },
            { text: "business training; ", questionNumber: 8, after: " training; access to credit" },
          ],
        ],
      },
    },
    {
      id: "c4t3-p1-yes-no",
      type: "choice",
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 1? In boxes 9–12 on your answer sheet write YES if the statement agrees with the claims of the writer NO if the statement contradicts the claims of the writer NOT GIVEN if it is impossible to say what the writer thinks about this",
      questions: [
        { questionNumbers: [9], prompt: "Any street child can set up their own small business if given enough support.", options: yesNoNotGiven },
        { questionNumbers: [10], prompt: "In some cases, the families of street children may need financial support from S.K.I.", options: yesNoNotGiven },
        { questionNumbers: [11], prompt: "Only one fixed loan should be given to each child.", options: yesNoNotGiven },
        { questionNumbers: [12], prompt: "The children have to pay back slightly more money than they borrowed.", options: yesNoNotGiven },
      ],
    },
    {
      id: "c4t3-p1-choice-13",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D. Write your answer in box 13 on your answer sheet.",
      questions: [
        {
          questionNumbers: [13],
          prompt: "The writers conclude that money should only be lent to street children",
          options: [
            { letter: "A", text: "as part of a wider program of aid." },
            { letter: "B", text: "for programs that are not too ambitious." },
            { letter: "C", text: "when programs are supported by local businesses." },
            { letter: "D", text: "if the projects planned are realistic and useful." },
          ],
        },
      ],
    },
  ],
};

const cambridge4Test3PartTwo: ReadingPart = {
  id: "cambridge-4-test-3-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26 which are based on Reading Passage 2 below.",
  title: "Volcanoes – earth-shattering news",
  subtitle: "When Mount Pinatubo suddenly erupted on 9 June 1991, the power of volcanoes past and present again hit the headlines",
  sections: [
    {
      id: "c4t3-p2-a",
      heading: "A",
      headingQuestionNumber: 14,
      paragraphs: [
        "Volcanoes are the ultimate earth-moving machinery. A violent eruption can blow the top few kilometres off a mountain, scatter fine ash practically all over the globe and hurl rock fragments into the stratosphere to darken the skies a continent away. But the classic eruption—cone-shaped mountain, big bang, mushroom cloud and surges of molten lava—is only a tiny part of a global story. Vulcanism, the name given to volcanic processes, really has shaped the world. Eruptions have rifted continents, raised mountain chains, constructed islands and shaped the topography of the earth. The entire ocean floor has a basement of volcanic basalt. Volcanoes have not only made the continents, they are also thought to have made the world's first stable atmosphere and provided all the water for the oceans, rivers and ice-caps. There are now about 600 active volcanoes. Every year they add two or three cubic kilometres of rock to the continents. Imagine a similar number of volcanoes smoking away for the last 3,500 million years. That is enough rock to explain the continental crust. What comes out of volcanic craters is mostly gas. More than 90% of this gas is water vapour from the deep earth: enough to explain, over 3,500 million years, the water in the oceans. The rest of the gas is nitrogen, carbon dioxide, sulphur dioxide, methane, ammonia and hydrogen. The quantity of these gases, again multiplied over 3,500 million years, is enough to explain the mass of the world's atmosphere. We are alive because volcanoes provided the soil, air and water we need.",
      ],
    },
    {
      id: "c4t3-p2-b",
      heading: "B",
      headingQuestionNumber: 15,
      paragraphs: [
        "Geologists consider the earth as having a molten core, surrounded by a semi-molten mantle and a brittle, outer skin. It helps to think of a soft-boiled egg with a runny yolk, a firm but squishy white and a hard shell. If the shell is even slightly cracked during boiling, the white material bubbles out and sets like a tiny mountain chain over the crack—like an archipelago of volcanic islands such as the Hawaiian Islands. But the earth is so much bigger and the mantle below is so much hotter. Even though the mantle rocks are kept solid by overlying pressure, they can still slowly ‘flow’ like thick treacle. The flow, thought to be in the form of convection currents, is powerful enough to fracture the ‘eggshell’ of the crust into plates, and keep them bumping and grinding against each other, or even overlapping, at the rate of a few centimetres a year. These fracture zones, where the collisions occur, are where earthquakes happen. And, very often, volcanoes.",
      ],
    },
    {
      id: "c4t3-p2-c",
      heading: "C",
      headingQuestionNumber: 16,
      paragraphs: [
        "These zones are lines of weakness, or hot spots. Every eruption is different, but put at its simplest, where there are weaknesses, rocks deep in the mantle, heated to 1,350°C, will start to expand and rise. As they do so, the pressure drops, and they expand and become liquid and rise more swiftly. Sometimes it is slow: vast bubbles of magma—molten rock from the mantle—inch towards the surface, cooling slowly, to show through as granite extrusions (as on Skye, or the Great Whin Sill, the lava dyke squeezed out like toothpaste that carries part of Hadrian’s Wall in northern England). Sometimes—as in Northern Ireland, Wales and the Karoo in South Africa—the magma rose faster, and then flowed out horizontally on to the surface in vast thick sheets. In the Deccan plateau in western India, there are more than two million cubic kilometres of lava, some of it 2,400 metres thick, formed over 500,000 years of slurping eruption. Sometimes the magma moves very swiftly indeed. It does not have time to cool as it surges upwards. The gases trapped inside the boiling rock expand suddenly, the lava glows with heat, it begins to froth, and it explodes with tremendous force. Then the slightly cooler lava following it begins to flow over the lip of the crater. It happens on Mars, it happened on the moon, it even happens on some of the moons of Jupiter and Uranus. By studying the evidence, vulcanologists can read the force of the great blasts of the past. Is the pumice light and full of holes? The explosion was tremendous. Are the rocks heavy, with huge crystalline basalt shapes, like the Giant’s Causeway in Northern Ireland? It was a slow, gentle eruption. The biggest eruptions are deep on the mid-ocean floor, where new lava is forcing the continents apart and widening the Atlantic by perhaps five centimetres a year. Look at maps of volcanoes, earthquakes and island chains like the Philippines and Japan, and you can see the rough outlines of what are called tectonic plates—the plates which make up the earth’s crust and mantle. The most dramatic of these is the Pacific ‘ring of fire’ where there have been the most violent explosions—Mount Pinatubo near Manila, Mount St Helen’s in the Rockies and El Chichón in Mexico about a decade ago, not to mention world-shaking blasts like Krakatoa in the Sunda Straits in 1883.",
      ],
    },
    {
      id: "c4t3-p2-d",
      heading: "D",
      headingQuestionNumber: 17,
      paragraphs: [
        "But volcanoes are not very predictable. That is because geological time is not like human time. During quiet periods, volcanoes cap themselves with their own lava by forming a powerful cone from the molten rocks slopping over the rim of the crater; later the lava cools slowly into a huge, hard, stable plug which blocks any further eruption until the pressure below becomes irresistible. In the case of Mount Pinatubo, this took 600 years. Then, sometimes, with only a small warning, the mountain blows its top. It did this at Mont Pelée in Martinique at 7:49 a.m. on 8 May, 1902. Of a town of 28,000, only two people survived. In 1815, a sudden blast removed the top 1,280 metres of Mount Tambora in Indonesia. The eruption was so fierce that dust thrown into the stratosphere darkened the skies, cancelling the following summer in Europe and North America. Thousands starved as the harvests failed, after snow in June and frosts in August. Volcanoes are potentially world news, especially the quiet ones.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c4t3-p2-headings",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 2 has four sections A–D. Choose the correct heading for each section from the list below. Write the correct number i–vi in boxes 14–17 on your answer sheet.",
      questionNumbers: [14, 15, 16, 17],
      options: headings.map(({ letter, text }) => ({ id: letter, text: `${letter}  ${text}` })),
    },
    {
      id: "c4t3-p2-short-answer",
      type: "fill",
      title: "",
      instruction: "Complete the questions below. Choose NO MORE THAN THREE WORDS AND/OR A NUMBER from the passage for each answer. Write your answers in boxes 18–21 on your answer sheet.",
      questions: [
        { number: 18, before: "What are the sections of the earth’s crust, often associated with volcanic activity, called?" },
        { number: 19, before: "What is the name given to molten rock from the mantle?" },
        { number: 20, before: "What is the earthquake zone on the Pacific Ocean called?" },
        { number: 21, before: "For how many years did Mount Pinatubo remain inactive?" },
      ],
    },
    {
      id: "c4t3-p2-summary",
      type: "fill",
      title: "",
      instruction: "Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 22–26 on your answer sheet.",
      questions: [22, 23, 24, 25, 26].map((number) => ({ number, before: `Question ${number}` })),
      rawText: "Volcanic eruptions have shaped the earth’s land surface. They may also have produced the world’s atmosphere and 22 ...... . Eruptions occur when molten rocks from the earth’s mantle rise and expand. When they become liquid, they move more quickly through cracks in the surface. There are different types of eruption. Sometimes the 23 ...... moves slowly and forms outcrops of granite on the earth’s surface. When it moves more quickly it may flow out in thick horizontal sheets. Examples of this type of eruption can be found in Northern Ireland, Wales, South Africa and 24 ...... . A third type of eruption occurs when the lava emerges very quickly and 25 ...... violently. This happens because the magma moves so suddenly that 26 ...... are emitted.",
    },
  ],
};

const cambridge4Test3PartThree: ReadingPart = {
  id: "cambridge-4-test-3-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40 which are based on Reading Passage 3 below.",
  title: "Obtaining Linguistic Data",
  sections: [
    {
      id: "c4t3-p3-a",
      heading: "A",
      paragraphs: [
        "Many procedures are available for obtaining data about a language. They range from a carefully planned, intensive field investigation in a foreign country to a casual introspection about one's mother tongue carried out in an armchair at home.",
      ],
    },
    {
      id: "c4t3-p3-b",
      heading: "B",
      paragraphs: [
        "In all cases, someone has to act as a source of language data—an informant. Informants are (ideally) native speakers of a language, who provide utterances for analysis and other kinds of information about the language (e.g. translations, comments about correctness, or judgements on usage). Often, when studying their mother tongue, linguists act as their own informants, judging the ambiguity, acceptability, or other properties of utterances against their own intuitions. The convenience of this approach makes it widely used, and it is considered the norm in the generative approach to linguistics. But a linguist's personal judgements are often uncertain, or disagree with the judgements of other linguists, at which point recourse is needed to more objective methods of enquiry, using non-linguists as informants. The latter procedure is unavoidable when working on foreign languages, or child speech.",
      ],
    },
    {
      id: "c4t3-p3-c",
      heading: "C",
      paragraphs: [
        "Many factors must be considered when selecting informants—whether one is working with single speakers (a common situation when languages have not been described before), two people interacting, small groups or large-scale samples. Age, sex, social background and other aspects of identity are important, as these factors are known to influence the kind of language used. The topic of conversation and the characteristics of the social setting (e.g. the level of formality) are also highly relevant, as are the personal qualities of the informants (e.g. their fluency and consistency). For larger studies, scrupulous attention has been paid to the sampling theory employed, and in all cases, decisions have to be made about the best investigative techniques to use.",
      ],
    },
    {
      id: "c4t3-p3-d",
      heading: "D",
      paragraphs: [
        "Today, researchers often tape-record informants. This enables the linguist's claims about the language to be checked, and provides a way of making those claims more accurate (‘difficult’ pieces of speech can be listened to repeatedly). But obtaining naturalistic, good-quality data is never easy. People talk abnormally when they know they are being recorded, and sound quality can be poor. A variety of tape-recording procedures have thus been devised to minimise the ‘observer's paradox’ (how to observe the way people behave when they are not being observed). Some recordings are made without the speakers being aware of the fact—a procedure that obtains very natural data, though ethical objections must be anticipated. Alternatively, attempts can be made to make the speaker forget about the recording, such as keeping the tape recorder out of sight, or using radio microphones. A useful technique is to introduce a topic that quickly involves the speaker, and stimulates a natural language style (e.g. asking older informants about how times have changed in their locality).",
      ],
    },
    {
      id: "c4t3-p3-e",
      heading: "E",
      paragraphs: [
        "An audio tape recording does not solve all the linguist's problems, however. Speech is often unclear and ambiguous. Where possible, therefore, the recording has to be supplemented by the observer's written comments on the non-verbal behaviour of the participants, and about the context in general. A facial expression, for example, can dramatically alter the meaning of what is said. Video recordings avoid these problems to a large extent, but even they have limitations (the camera cannot be everywhere), and transcriptions always benefit from any additional commentary provided by an observer.",
      ],
    },
    {
      id: "c4t3-p3-f",
      heading: "F",
      paragraphs: [
        "Linguists also make great use of structured sessions, in which they systematically ask their informants for utterances that describe certain actions, objects or behaviour. With a bilingual informant, or through use of an interpreter, it is possible to use translation techniques (‘How do you say table in your language?’). A large number of points can be covered in a short time, using interview worksheets and questionnaires. Often, the researcher wishes to obtain information about just a single variable, in which case a restricted set of questions may be used: a particular feature of pronunciation, for example, can be elicited by asking the informant to say a restricted set of words. There are also several direct methods of elicitation, such as asking informants to fill in the blanks in a substitution frame (e.g. ‘I _ see a car’), or feeding them the wrong stimulus for correction (‘Is it possible to say I no can see?’).",
      ],
    },
    {
      id: "c4t3-p3-g",
      heading: "G",
      paragraphs: [
        "A representative sample of language, compiled for the purpose of linguistic analysis, is known as a corpus. A corpus enables the linguist to make unbiased statements about frequency of usage, and it provides accessible data for the use of different researchers. Its range and size are variable. Some corpora attempt to cover the language as a whole, taking extracts from many kinds of text; others are extremely selective, providing a collection of material that deals only with a particular linguistic feature. The size of the corpus depends on practical factors, such as the time available to collect, process and store the data: it can take up to several hours to provide an accurate transcription of a few minutes of speech. Sometimes a small sample of data will be enough to decide a linguistic hypothesis; by contrast, corpora in major research projects can total millions of words. An important principle is that all corpora, whatever their size, are inevitably limited in their coverage, and always need to be supplemented by data derived from the intuitions of native speakers of the language, through either introspection or experimentation.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c4t3-p3-paragraph-matching",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 3 has seven paragraphs labelled A–G. Which paragraph contains the following information? Write the correct letter A–G in boxes 27–31 on your answer sheet. NB You may use any letter more than once.",
      questions: [
        { questionNumbers: [27], prompt: "the effect of recording on the way people talk", options: paragraphs },
        { questionNumbers: [28], prompt: "the importance of taking notes on body language", options: paragraphs },
        { questionNumbers: [29], prompt: "the fact that language is influenced by social situation", options: paragraphs },
        { questionNumbers: [30], prompt: "how informants can be helped to be less self-conscious", options: paragraphs },
        { questionNumbers: [31], prompt: "various methods that can be used to generate specific data", options: paragraphs },
      ],
    },
    {
      id: "c4t3-p3-methods-table",
      type: "fill",
      title: "",
      instruction: "Complete the table below. Choose NO MORE THAN THREE WORDS from the passage for each answer. Write your answers in boxes 32–36 on your answer sheet.",
      questions: [32, 33, 34, 35, 36].map((number) => ({ number, before: `Question ${number}` })),
      table: {
        headers: ["METHODS OF OBTAINING LINGUISTIC DATA", "ADVANTAGES", "DISADVANTAGES"],
        rows: [
          [
            { questionNumber: 32, after: " as informant" },
            { text: "convenient" },
            { text: "method of enquiry not objective enough" },
          ],
          [
            { text: "non-linguist as informant" },
            { before: "necessary with ", questionNumber: 33, after: " and child speech" },
            { text: "the number of factors to be considered" },
          ],
          [
            { text: "recording an informant" },
            { text: "allows linguists' claims to be checked" },
            { questionNumber: 34, after: " of sound" },
          ],
          [
            { text: "videoing an informant" },
            { before: "allows speakers' ", questionNumber: 35, after: " to be observed" },
            { questionNumber: 36, after: " might miss certain things" },
          ],
        ],
      },
    },
    {
      id: "c4t3-p3-corpus-summary",
      type: "fill",
      title: "",
      instruction: "Complete the summary of paragraph G below. Choose NO MORE THAN THREE WORDS from the passage for each answer. Write your answers in boxes 37–40 on your answer sheet.",
      questions: [37, 38, 39, 40].map((number) => ({ number, before: `Question ${number}` })),
      rawText: "A linguist can use a corpus to comment objectively on 37 ...... . Some corpora include a wide range of language while others are used to focus on a 38 ...... . The length of time the process takes will affect the 39 ...... of the corpus. No corpus can ever cover the whole language and so linguists often find themselves relying on the additional information that can be gained from the 40 ...... of those who speak the language concerned.",
    },
  ],
};

export const CAMBRIDGE4_TEST3_PARTS: ReadingPart[] = [
  cambridge4Test3PartOne,
  cambridge4Test3PartTwo,
  cambridge4Test3PartThree,
];

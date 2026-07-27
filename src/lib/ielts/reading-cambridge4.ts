import type { ReadingPart } from "./reading";

const trueFalseNotGivenOptions = [
  { letter: "A", text: "TRUE" },
  { letter: "B", text: "FALSE" },
  { letter: "C", text: "NOT GIVEN" },
];

const passageOneResponseOptions = [
  {
    letter: "A",
    text: "There is a complicated combination of reasons for the loss of the rainforests.",
  },
  {
    letter: "B",
    text: "The rainforests are being destroyed by the same things that are destroying the forests of Western Europe.",
  },
  { letter: "C", text: "Rainforests are located near the Equator." },
  { letter: "D", text: "Brazil is home to the rainforests." },
  { letter: "E", text: "Without rainforests some animals would have nowhere to live." },
  { letter: "F", text: "Rainforests are important habitats for a lot of plants." },
  { letter: "G", text: "People are responsible for the loss of the rainforests." },
  { letter: "H", text: "The rainforests are a source of oxygen." },
  { letter: "I", text: "Rainforests are of consequence for a number of different reasons." },
  { letter: "J", text: "As the rainforests are destroyed, the world gets warmer." },
  { letter: "K", text: "Without rainforests there would not be enough oxygen in the air." },
  { letter: "L", text: "There are people for whom the rainforests are home." },
  { letter: "M", text: "Rainforests are found in Africa." },
  { letter: "N", text: "Rainforests are not really important to human life." },
  { letter: "O", text: "The destruction of the rainforests is the direct result of logging activity." },
  { letter: "P", text: "Humans depend on the rainforests for their continuing existence." },
];

const movementOptions = [
  { letter: "A", text: "steady spinning" },
  { letter: "B", text: "jerky movement" },
  { letter: "C", text: "rapid spinning" },
  { letter: "D", text: "wobbling movement" },
  { letter: "E", text: "use of brakes" },
];

const shapeWordBank = [
  "associations",
  "blind",
  "deep",
  "hard",
  "hundred",
  "identical",
  "pairs",
  "shapes",
  "sighted",
  "similar",
  "shallow",
  "soft",
  "words",
];

const cambridge4Test1PartOne: ReadingPart = {
  id: "cambridge-4-test-1-part1",
  label: "Part 1",
  questionRange: "questions 1-14",
  intro: "You should spend about 20 minutes on Questions 1-14, which are based on Reading Passage 1.",
  title: "Children's ideas about rainforests",
  sections: [
    {
      id: "c4t1-p1-text",
      paragraphs: [
        "Adults and children are frequently confronted with statements about the alarming rate of loss of tropical rainforests. For example, one graphic illustration to which children might readily relate is the estimate that rainforests are being destroyed at a rate equivalent to one thousand football fields every forty minutes - about the duration of a normal classroom period. In the face of the frequent and often vivid media coverage, it is likely that children will have formed ideas about rainforests - what and where they are, why they are important, what endangers them - independent of any formal tuition. It is also possible that some of these ideas will be mistaken.",
        "Many studies have shown that children harbour misconceptions about 'pure', curriculum science. These misconceptions do not remain isolated but become incorporated into a multifaceted, but organised, conceptual framework, making it and the component ideas, some of which are erroneous, more robust but also accessible to modification. These ideas may be developed by children absorbing ideas through the popular media. Sometimes this information may be erroneous. It seems schools may not be providing an opportunity for children to re-express their ideas and so have them tested and refined by teachers and their peers.",
        "Despite the extensive coverage in the popular media of the destruction of rainforests, little formal information is available about children's ideas in this area. The aim of the present study is to start to provide such information, to help teachers design their educational strategies to build upon correct ideas and to displace misconceptions and to plan programmes in environmental studies in their schools.",
        "The study surveys children's scientific knowledge and attitudes to rainforests. Secondary school children were asked to complete a questionnaire containing five open-form questions. The most frequent responses to the first question were descriptions which are self-evident from the term 'rainforest'. Some children described them as damp, wet or hot. The second question concerned the geographical location of rainforests. The commonest responses were continents or countries: Africa, South America and Brazil. Some children also gave more general locations, such as being near the Equator.",
        "Responses to question three concerned the importance of rainforests. The dominant idea, raised by 64% of the pupils, was that rainforests provide animals with habitats. Fewer students responded that rainforests provide plant habitats, and even fewer mentioned the indigenous populations of rainforests. More girls than boys raised the idea of rainforest as animal habitats.",
        "Similarly, but at a lower level, more girls than boys said that rainforests provided human habitats. These observations are generally consistent with previous studies of pupils' views about the use and conservation of rainforests, in which girls were shown to be more sympathetic to animals and expressed views which seem to place an intrinsic value on non-human animal life.",
        "The fourth question concerned the causes of the destruction of rainforests. Perhaps encouragingly, more than half of the pupils identified that it is human activities which are destroying rainforests, some personalising the responsibility by the use of terms such as 'we are'. About 18% of the pupils referred specifically to logging activity.",
        "One misconception, expressed by some pupils, was that acid rain is responsible for rainforest destruction; a similar proportion said that pollution is destroying rainforests. Here, children are confusing rainforest destruction with damage to the forests of Western Europe by these factors. While two fifths of the students provided the information that the rainforests provide oxygen, in some cases this response also embraced the misconception that rainforest destruction would reduce atmospheric oxygen, making the atmosphere incompatible with human life on Earth.",
        "In answer to the final question about the importance of rainforest conservation, the majority of children simply said that we need rainforests to survive. Only a few of the pupils mentioned that rainforest destruction may contribute to global warming. This is surprising considering the high level of media coverage on this issue. Some children expressed the idea that the conservation of rainforests is not important.",
        "The results of this study suggest that certain ideas predominate in the thinking of children about rainforests. Pupils' responses indicate some misconceptions in basic scientific knowledge of rainforests' ecosystems, such as their ideas about rainforests as habitats for animals, plants and humans, and the relationship between climatic change and destruction of rainforests.",
        "Pupils did not volunteer ideas that suggested that they appreciated the complexity of causes of rainforest destruction. In other words, they gave no indication of an appreciation of either the range of ways in which rainforests are important or the complex social, economic and political factors which drive the activities which are destroying the rainforests. One encouragement is that the results of similar studies about other environmental issues suggest that older children seem to acquire the ability to appreciate, value and evaluate conflicting views. Environmental education offers an arena in which these skills can be developed, which is essential for these children as future decision-makers.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c4t1-p1-true-false",
      type: "choice",
      instruction: "Do the following statements agree with the information given in Reading Passage 1?",
      questions: [
        {
          questionNumbers: [1],
          prompt: "The plight of the rainforests has largely been ignored by the media.",
          answer: "FALSE",
          options: trueFalseNotGivenOptions,
        },
        {
          questionNumbers: [2],
          prompt: "Children only accept opinions on rainforests that they encounter in their classrooms.",
          answer: "FALSE",
          options: trueFalseNotGivenOptions,
        },
        {
          questionNumbers: [3],
          prompt: "It has been suggested that children hold mistaken views about the 'pure' science that they study at school.",
          answer: "TRUE",
          options: trueFalseNotGivenOptions,
        },
        {
          questionNumbers: [4],
          prompt: "The fact that children's ideas about science form part of a larger framework of ideas means that it is easier to change them.",
          answer: "TRUE",
          options: trueFalseNotGivenOptions,
        },
        {
          questionNumbers: [5],
          prompt: "The study involved asking children a number of yes/no questions such as 'Are there any rainforests in Africa?'",
          answer: "FALSE",
          options: trueFalseNotGivenOptions,
        },
        {
          questionNumbers: [6],
          prompt: "Girls are more likely than boys to hold mistaken views about the rainforests' destruction.",
          answer: "NOT GIVEN",
          options: trueFalseNotGivenOptions,
        },
        {
          questionNumbers: [7],
          prompt: "The study reported here follows on from a series of studies that have looked at children's understanding of rainforests.",
          answer: "TRUE",
          options: trueFalseNotGivenOptions,
        },
        {
          questionNumbers: [8],
          prompt: "A second study has been planned to investigate primary school children's ideas about rainforests.",
          answer: "NOT GIVEN",
          options: trueFalseNotGivenOptions,
        },
      ],
    },
    {
      id: "c4t1-p1-response-matching",
      type: "choice",
      instruction: "The box gives a list of responses A-P to the questionnaire discussed in Reading Passage 1. Choose the correct response.",
      questions: [
        {
          questionNumbers: [9],
          prompt: "What was the children's most frequent response when asked where the rainforests were?",
          answer: "M",
          options: passageOneResponseOptions,
        },
        {
          questionNumbers: [10],
          prompt: "What was the most common response to the question about the importance of the rainforests?",
          answer: "E",
          options: passageOneResponseOptions,
        },
        {
          questionNumbers: [11],
          prompt: "What did most children give as the reason for the loss of the rainforests?",
          answer: "G",
          options: passageOneResponseOptions,
        },
        {
          questionNumbers: [12],
          prompt: "Why did most children think it important for the rainforests to be protected?",
          answer: "P",
          options: passageOneResponseOptions,
        },
        {
          questionNumbers: [13],
          prompt: "Which response is cited as unexpectedly uncommon, given the amount of time spent on the issue by newspapers and television?",
          answer: "J",
          options: passageOneResponseOptions,
        },
      ],
    },
    {
      id: "c4t1-p1-title",
      type: "choice",
      instruction: "Choose the most suitable title for Reading Passage 1.",
      questions: [
        {
          questionNumbers: [14],
          prompt: "Which of the following is the most suitable title for Reading Passage 1?",
          answer: "B",
          options: [
            {
              letter: "A",
              text: "The development of a programme in environmental studies within a science curriculum",
            },
            {
              letter: "B",
              text: "Children's ideas about the rainforests and the implications for course design",
            },
            {
              letter: "C",
              text: "The extent to which children have been misled by the media concerning the rainforests",
            },
            {
              letter: "D",
              text: "How to collect, collate and describe the ideas of secondary school children",
            },
            {
              letter: "E",
              text: "The importance of the rainforests and the reasons for their destruction",
            },
          ],
        },
      ],
    },
  ],
};

const cambridge4Test1PartTwo: ReadingPart = {
  id: "cambridge-4-test-1-part2",
  label: "Part 2",
  questionRange: "questions 15-26",
  intro: "You should spend about 20 minutes on Questions 15-26, which are based on Reading Passage 2.",
  title: "An examination of the functioning of the senses in cetaceans",
  sections: [
    {
      id: "c4t1-p2-text",
      paragraphs: [
        "Some of the senses that we and other terrestrial mammals take for granted are either reduced or absent in cetaceans or fail to function well in water. For example, it appears from their brain structure that toothed species are unable to smell. Baleen species, on the other hand, appear to have some related brain structures but it is not known whether these are functional. It has been speculated that, as the blowholes evolved and migrated to the top of the head, the neural pathways serving sense of smell may have been nearly all sacrificed. Similarly, although at least some cetaceans have taste buds, the nerves serving these have degenerated or are rudimentary.",
        "The sense of touch has sometimes been described as weak too; but this view is probably mistaken. Trainers of captive dolphins and small whales often remark on their animals' responsiveness to being touched or rubbed, and both captive and free-ranging cetacean individuals of all species appear to make frequent contact. This contact may help to maintain order within a group, and stroking or touching are part of the courtship ritual in most species. The area around the blowhole is also particularly sensitive and captive animals often object strongly to being touched there.",
        "The sense of vision is developed to different degrees in different species. Baleen species studied at close quarters underwater have obviously tracked objects with vision underwater, and they can apparently see moderately well both in water and in air. However, the position of the eyes so restricts the field of vision in baleen whales that they probably do not have stereoscopic vision.",
        "On the other hand, the position of the eyes in most dolphins and porpoises suggests that they have stereoscopic vision forward and downward. Eye position in freshwater dolphins, which often swim on their side or upside down while feeding, suggests that what vision they have is stereoscopic forward and upward. By comparison, the bottlenose dolphin has extremely keen vision in water. Judging from the way it watches and tracks airborne flying fish, it can apparently see fairly well through the air-water interface as well. And although preliminary experimental evidence suggests that their in-air vision is poor, the accuracy with which dolphins leap high to take small fish out of a trainer's hand provides anecdotal evidence to the contrary.",
        "Such variation can no doubt be explained with reference to the habitats in which individual species have developed. For example, vision is obviously more useful to species inhabiting clear open waters than to those living in turbid rivers and flooded plains. The South American boutu and Chinese beiji appear to have very limited vision, and the Indian susus are blind, their eyes reduced to slits that probably allow them to sense only the direction and intensity of light.",
        "Although the senses of taste and smell appear to have deteriorated, and vision in water appears to be uncertain, such weaknesses are more than compensated for by cetaceans' well-developed acoustic sense. Most species are highly vocal, although they vary in the range of sounds they produce, and many forage for food using echolocation. Large baleen whales primarily use the lower frequencies and are often limited in their repertoire. Notable exceptions are the nearly song-like choruses of bowhead whales in summer and the complex, haunting utterances of the humpback whales. Toothed species in general employ more of the frequency spectrum, and produce a wider variety of sounds, than baleen species. Some of the more complicated sounds are clearly communicative, although what role they may play in the social life and 'culture' of cetaceans has been more the subject of wild speculation than of solid science.",
        "Echolocation: the perception of objects by means of sound wave echoes.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c4t1-p2-senses-table",
      type: "fill",
      title: "Senses in cetaceans",
      instruction: "Complete the table. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
      questions: [
        {
          number: 15,
          before: "Taste: in some types, nerves linked to their",
          after: "are underdeveloped.",
          answer: "taste buds",
        },
        {
          number: 16,
          before: "Vision:",
          after: "probably do not have stereoscopic vision.",
          answer: "baleen / the baleen whales",
        },
        {
          number: 17,
          before: "Dolphins and porpoises probably have stereoscopic vision",
          after: ".",
          answer: ["forward", "downward"],
          answerMode: "all",
        },
        {
          number: 18,
          before: "Vision:",
          after: "probably have stereoscopic vision forward and upward.",
          answer: "freshwater dolphin(s) / the freshwater dolphin(s)",
        },
        {
          number: 19,
          before: "Bottlenose dolphins are exceptional in",
          after: "and good in the air-water interface.",
          answer: "water / the water",
        },
        {
          number: 20,
          before: "Most large baleen whales usually use",
          after: "; their repertoire is limited.",
          answer: "lower frequencies / the lower frequencies",
        },
        {
          number: 21,
          before: "Which two whale species produce song-like sounds?",
          answer: ["bowhead", "humpback"],
          answerMode: "all",
        },
      ],
    },
    {
      id: "c4t1-p2-short-answer",
      type: "fill",
      title: "Short answers",
      instruction: "Answer the questions using NO MORE THAN THREE WORDS from the passage.",
      questions: [
        {
          number: 22,
          before: "Which of the senses is described as being involved in mating?",
          answer: "touch / sense of touch",
        },
        {
          number: 23,
          before: "Which species swims upside down while eating?",
          answer: "freshwater dolphin(s) / the freshwater dolphin(s)",
        },
        {
          number: 24,
          before: "What can bottlenose dolphins follow from under the water?",
          answer: "airborne flying fish",
        },
        {
          number: 25,
          before: "Which type of habitat is related to good visual ability?",
          answer: "clear water(s) / clear open water(s)",
        },
        {
          number: 26,
          before: "Which of the senses is best developed in cetaceans?",
          answer: "acoustic sense / the acoustic sense",
        },
      ],
    },
  ],
};

const cambridge4Test1PartThree: ReadingPart = {
  id: "cambridge-4-test-1-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27-40, which are based on Reading Passage 3.",
  title: "Visual Symbols and the Blind",
  sections: [
    {
      id: "c4t1-p3-text",
      paragraphs: [
        "Part 1",
        "From a number of recent studies, it has become clear that blind people can appreciate the use of outlines and perspectives to describe the arrangement of objects and other surfaces in space. But pictures are more than literal representations. This fact was drawn to my attention dramatically when a blind woman in one of my investigations decided on her own initiative to draw a wheel as it was spinning. To show this motion, she traced a curve inside the circle. I was taken aback. Lines of motion, such as the one she used, are a very recent invention in the history of illustration. Indeed, as art scholar David Kunzle notes, Wilhelm Busch, a trend-setting nineteenth-century cartoonist, used virtually no motion lines in his popular figures until about 1877.",
        "When I asked several other blind study subjects to draw a spinning wheel, one particularly clever rendition appeared repeatedly: several subjects showed the wheel's spokes as curved lines. When asked about these curves, they all described them as metaphorical ways of suggesting motion. Majority rule would argue that this device somehow indicated motion very well. But was it a better indicator than broken or wavy lines - or any other kind of line, for that matter? The answer was not clear. So I decided to test whether various lines of motion were apt ways of showing movement or if they were merely idiosyncratic marks. Moreover, I wanted to discover whether there were differences in how the blind and the sighted interpreted lines of motion.",
        "To search out these answers, I created raised-line drawings of five different wheels, depicting spokes with lines that curved, bent, waved, dashed and extended beyond the perimeter of the wheel. I then asked eighteen blind volunteers to feel the wheels and assign one of the following motions to each wheel: wobbling, spinning fast, spinning steadily, jerking or braking. My control group consisted of eighteen sighted undergraduates from the University of Toronto.",
        "All but one of the blind subjects assigned distinctive motions to each wheel. Most guessed that the curved spokes indicated that the wheel was spinning steadily; the wavy spokes suggested that the wheel was wobbling; and the bent spokes were taken as a sign that the wheel was jerking. Subjects assumed that spokes extending beyond the wheel's perimeter signified that the wheel had its brakes on and that dashed spokes indicated the wheel was spinning quickly.",
        "In addition, the favoured description for the sighted was the favoured description for the blind in every instance. What is more, the consensus among the sighted was barely higher than that among the blind. Because motion devices are unfamiliar to the blind, the task involved some problem solving. Evidently, however, the blind not only figured out meanings for each line of motion, but as a group they generally came up with the same meaning at least as frequently as did sighted subjects.",
        "Part 2",
        "We have found that the blind understand other kinds of visual metaphors as well. One blind woman drew a picture of a child inside a heart - choosing that symbol, she said, to show that love surrounded the child. With Chang Hong Liu, a doctoral student from China, I have begun exploring how well blind people understand the symbolism behind shapes such as hearts that do not directly represent their meaning.",
        "We gave a list of twenty pairs of words to sighted subjects and asked them to pick from each pair the term that best related to a circle and the term that best related to a square. For example, we asked: What goes with soft? A circle or a square? Which shape goes with hard?",
        "All our subjects deemed the circle soft and the square hard. A full 94% ascribed happy to the circle, instead of sad. But other pairs revealed less agreement: 79% matched fast to slow and weak to strong, respectively. And only 51% linked deep to circle and shallow to square. When we tested four totally blind volunteers using the same list, we found that their choices closely resembled those made by the sighted subjects. One man, who had been blind since birth, scored extremely well. He made only one match differing from the consensus, assigning 'far' to square and 'near' to circle. In fact, only a small majority of sighted subjects had paired far and near to the opposite partners. Thus, we concluded that the blind interpret abstract shapes as sighted people do.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c4t1-p3-choice",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D.",
      questions: [
        {
          questionNumbers: [27],
          prompt: "In the first paragraph the writer makes the point that blind people",
          answer: "C",
          options: [
            { letter: "A", text: "may be interested in studying art." },
            { letter: "B", text: "can draw outlines of different objects and surfaces." },
            { letter: "C", text: "can recognise conventions such as perspective." },
            { letter: "D", text: "can draw accurately." },
          ],
        },
        {
          questionNumbers: [28],
          prompt: "The writer was surprised because the blind woman",
          answer: "C",
          options: [
            { letter: "A", text: "drew a circle on her own initiative." },
            { letter: "B", text: "did not understand what a wheel looked like." },
            { letter: "C", text: "included a symbol representing movement." },
            { letter: "D", text: "was the first person to use lines of motion." },
          ],
        },
        {
          questionNumbers: [29],
          prompt: "From the experiment described in Part 1, the writer found that the blind subjects",
          answer: "A",
          options: [
            { letter: "A", text: "had good understanding of symbols representing movement." },
            { letter: "B", text: "could control the movement of wheels very accurately." },
            { letter: "C", text: "worked together well as a group in solving problems." },
            { letter: "D", text: "got better results than the sighted undergraduates." },
          ],
        },
      ],
    },
    {
      id: "c4t1-p3-diagrams",
      type: "choice",
      instruction: "Match each diagram to the type of movement A-E generally assigned to it in the experiment.",
      questions: [
        {
          questionNumbers: [30],
          prompt: "Diagram 30",
          answer: "E",
          diagram: "extended-spokes",
          options: movementOptions,
        },
        {
          questionNumbers: [31],
          prompt: "Diagram 31",
          answer: "C",
          diagram: "dashed-spokes",
          options: movementOptions,
        },
        {
          questionNumbers: [32],
          prompt: "Diagram 32",
          answer: "A",
          diagram: "curved-spokes",
          options: movementOptions,
        },
      ],
    },
    {
      id: "c4t1-p3-summary",
      type: "fill",
      title: "Visual metaphors and abstract shapes",
      instruction: "Complete the summary using words from the box. You may use any word more than once.",
      wordBank: shapeWordBank,
      questions: [
        {
          number: 33,
          before: "In Part 2, a set of word",
          after: "was used to investigate whether blind and sighted people perceived symbolism in the same way.",
          answer: "pairs",
        },
        {
          number: 34,
          before: "The study explored symbolism in abstract",
          after: ".",
          answer: "shapes",
        },
        {
          number: 35,
          before: "From the",
          after: "volunteers, everyone thought a circle fitted 'soft' while a square fitted 'hard'.",
          answer: "sighted",
        },
        {
          number: 36,
          before: "Only 51% of the",
          after: "volunteers assigned a circle to the next answer.",
          answer: "sighted",
        },
        {
          number: 37,
          before: "Only 51% assigned a circle to",
          after: ".",
          answer: "deep",
        },
        {
          number: 38,
          before: "When the test was later repeated with",
          after: "volunteers, the result closely resembled the earlier pattern.",
          answer: "blind",
        },
        {
          number: 39,
          before: "The blind volunteers made",
          after: "choices.",
          answer: "similar",
        },
      ],
    },
    {
      id: "c4t1-p3-conclusion",
      type: "choice",
      instruction: "Choose the statement that best summarises the writer's general conclusion.",
      questions: [
        {
          questionNumbers: [40],
          prompt: "Which of the following statements best summarises the writer's general conclusion?",
          answer: "B",
          options: [
            { letter: "A", text: "The blind represent some aspects of reality differently from sighted people." },
            { letter: "B", text: "The blind comprehend visual metaphors in similar ways to sighted people." },
            { letter: "C", text: "The blind may create unusual and effective symbols to represent reality." },
            { letter: "D", text: "The blind may be successful artists if given the right training." },
          ],
        },
      ],
    },
  ],
};

export const CAMBRIDGE4_TEST1_PARTS: ReadingPart[] = [
  cambridge4Test1PartOne,
  cambridge4Test1PartTwo,
  cambridge4Test1PartThree,
];

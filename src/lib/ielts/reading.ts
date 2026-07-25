export type ReadingPartId = string;

export type ReadingOption = {
  letter: string;
  text: string;
};

export type ReadingChoiceQuestion = {
  answer?: string | string[];
  instruction?: string;
  questionNumbers: number[];
  options: ReadingOption[];
  prompt: string;
  selectCount?: number;
};

export type ReadingFillQuestion = {
  after?: string;
  answer?: string | string[];
  answerMode?: "all" | "any";
  before: string;
  number: number;
};

export type ReadingHeadingOption = {
  id: string;
  text: string;
};

export type ReadingPassageSection = {
  headingQuestionNumber?: number;
  id: string;
  paragraphs: string[];
};

export type ReadingChoiceBlock = {
  id: string;
  instruction: string;
  questions: ReadingChoiceQuestion[];
  type: "choice";
};

export type ReadingFillBlock = {
  id: string;
  instruction: string;
  questions: ReadingFillQuestion[];
  title: string;
  type: "fill";
};

export type ReadingHeadingsBlock = {
  answers?: Record<number, string>;
  id: string;
  instruction: string;
  options: ReadingHeadingOption[];
  questionNumbers: number[];
  title: string;
  type: "headings";
};

export type ReadingQuestionBlock = ReadingChoiceBlock | ReadingFillBlock | ReadingHeadingsBlock;

export type ReadingPart = {
  id: ReadingPartId;
  intro: string;
  label: string;
  questionBlocks: ReadingQuestionBlock[];
  questionRange: string;
  sections: ReadingPassageSection[];
  title: string;
};

const partOne: ReadingPart = {
  id: "part1",
  label: "Part 1",
  questionRange: "questions 1–13",
  intro: "Read the text and answer questions 1–13.",
  title: "The life and work of Marie Curie",
  sections: [
    {
      id: "part1-text",
      paragraphs: [
        "Marie Curie is probably the most famous woman scientist who has ever lived. Born Maria Sklodowska in Poland in 1867, she is famous for her work on radioactivity, and was twice a winner of the Nobel Prize. With her husband, Pierre Curie, and Henri Becquerel, she was awarded the 1903 Nobel Prize for Physics, and was then sole winner of the 1911 Nobel Prize for Chemistry. She was the first woman to win a Nobel Prize.",
        "From childhood, Marie was remarkable for her prodigious memory, and at the age of 16 won a gold medal on completion of her secondary education. Because her father lost his savings through bad investment, she then had to take work as a teacher. From her earnings she was able to finance her sister Bronia’s medical studies in Paris, on the understanding that Bronia would, in turn, later help her to get an education.",
        "In 1891 this promise was fulfilled and Marie went to Paris and began to study at the Sorbonne. She often worked far into the night and lived on little more than bread, butter and tea. She came first in the examination in the physical sciences in 1893, and in 1894 was placed second in the examination in mathematical sciences. It was not until the spring of that year that she was introduced to Pierre Curie.",
        "Their marriage in 1895 marked the start of a partnership that was soon to achieve results of world significance. Following Henri Becquerel’s discovery in 1896 of a new phenomenon, which Marie later called ‘radioactivity’, Marie Curie decided to find out if the radioactivity discovered in uranium was to be found in other elements. She discovered that this was true for thorium.",
        "Turning her attention to minerals, she found her interest drawn to pitchblende, a mineral whose radioactivity could be explained only by the presence in the ore of small quantities of an unknown substance of very high activity. Pierre Curie joined her in the work, and that led to the discovery of the new elements polonium and radium.",
        "During the First World War, Marie Curie developed mobile X-radiography units and helped train medical staff to use them. Her long exposure to radiation damaged her health, but the radioactive material collected in Paris later supported important research into nuclear physics and medicine.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "part1-true-false",
      type: "choice",
      instruction:
        "Choose TRUE if the statement agrees with the text, FALSE if it contradicts the text, or NOT GIVEN if the text does not say.",
      questions: [
    {
      questionNumbers: [1],
      prompt: "Marie Curie’s husband was a joint winner of both of Marie’s Nobel Prizes.",
      options: [
        { letter: "A", text: "TRUE" },
        { letter: "B", text: "FALSE" },
        { letter: "C", text: "NOT GIVEN" },
      ],
    },
    {
      questionNumbers: [2],
      prompt: "Marie showed an exceptional memory when she was young.",
      options: [
        { letter: "A", text: "TRUE" },
        { letter: "B", text: "FALSE" },
        { letter: "C", text: "NOT GIVEN" },
      ],
    },
    {
      questionNumbers: [3],
      prompt: "Bronia later helped Marie study in Paris.",
      options: [
        { letter: "A", text: "TRUE" },
        { letter: "B", text: "FALSE" },
        { letter: "C", text: "NOT GIVEN" },
      ],
    },
    {
      questionNumbers: [4],
      prompt: "Marie studied mathematics before she studied physical sciences.",
      options: [
        { letter: "A", text: "TRUE" },
        { letter: "B", text: "FALSE" },
        { letter: "C", text: "NOT GIVEN" },
      ],
    },
    {
      questionNumbers: [5],
      prompt: "Henri Becquerel used the word ‘radioactivity’ before Marie Curie did.",
      options: [
        { letter: "A", text: "TRUE" },
        { letter: "B", text: "FALSE" },
        { letter: "C", text: "NOT GIVEN" },
      ],
    },
    {
      questionNumbers: [6],
      prompt: "Marie Curie’s first mobile X-ray unit was built in Paris.",
      options: [
        { letter: "A", text: "TRUE" },
        { letter: "B", text: "FALSE" },
        { letter: "C", text: "NOT GIVEN" },
      ],
    },
      ],
    },
    {
      id: "part1-notes",
      type: "fill",
      title: "Marie Curie’s research on radioactivity",
      instruction: "Complete the notes. Write ONE WORD ONLY from the text for each answer.",
      questions: [
        { number: 7, before: "Marie Curie found that the element called", after: "had the same radioactive property as uranium." },
        { number: 8, before: "Research into the mineral known as", after: "led to the discovery of two new elements." },
        { number: 9, before: "In 1911, Marie received recognition for her work on the element" },
        { number: 10, before: "Marie and Irène Curie developed X-radiography as a medical technique during" },
        { number: 11, before: "Marie saw the importance of collecting radioactive material for research and cases of" },
        { number: 12, before: "The Paris material contributed to later discoveries in nuclear" },
        { number: 13, before: "Long exposure to radiation eventually damaged Marie Curie’s" },
      ],
    },
  ],
};

const partTwo: ReadingPart = {
  id: "part2",
  label: "Part 2",
  questionRange: "questions 14–26",
  intro: "Read the text and answer questions 14–26.",
  title: "The Physics of Traffic Behavior",
  sections: [
    {
      id: "traffic-section-one",
      headingQuestionNumber: 14,
      paragraphs: [
        "Some years ago, theoretical physicists Dirk Helbing and Boris Kerner began publishing papers on traffic flow. They simulated vehicles on a highway using equations normally used to describe how gas molecules move. After modifying the equations to account for drivers avoiding collisions, the moving-gas model reproduced many phenomena seen in real-world traffic.",
      ],
    },
    {
      id: "traffic-section-two",
      headingQuestionNumber: 15,
      paragraphs: [
        "The strangest result was the implication that congestion can arise spontaneously. Vehicles may be flowing freely and then suddenly form a slow-moving mass. A brief local fluctuation in speed or distance between vehicles can trigger a system-wide breakdown that persists for hours.",
      ],
    },
    {
      id: "traffic-section-three",
      headingQuestionNumber: 16,
      paragraphs: [
        "This discovery showed striking similarities to chaos theory. In a complex interacting system, tiny variations in one part can grow in huge but unpredictable ways. Traffic researchers therefore began to examine how small changes in individual driving could affect an entire road.",
      ],
    },
    {
      id: "traffic-section-four",
      headingQuestionNumber: 17,
      paragraphs: [
        "Later experiments found that drivers who brake too sharply can produce waves of congestion behind them. Researchers suggested that automated systems could smooth acceleration and braking, limiting the human reactions that amplify a minor disturbance into a traffic jam.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "part2-headings",
      type: "headings",
      title: "List of Headings",
      questionNumbers: [14, 15, 16, 17],
      instruction:
        "The text has four sections. Drag the correct heading into each numbered gap. Drag an assigned heading back to this list to remove it.",
      options: [
        { id: "heading-a", text: "How a maths experiment actually reduced traffic congestion" },
        { id: "heading-b", text: "How a concept from one field of study was applied in another" },
        { id: "heading-c", text: "A lack of investment in driver training" },
        { id: "heading-d", text: "Areas of doubt and disagreement between experts" },
        { id: "heading-e", text: "How different countries have dealt with traffic congestion" },
        { id: "heading-f", text: "The impact of driver behavior on traffic speed" },
        { id: "heading-g", text: "A proposal to take control away from the driver" },
      ],
    },
    {
      id: "part2-multiple-choice",
      type: "choice",
      instruction: "Choose TWO correct answers for each question.",
      questions: [
    {
      questionNumbers: [18, 19],
      prompt: "Which TWO statements describe what the writer is doing in section two?",
      selectCount: 2,
      options: [
        { letter: "A", text: "explaining the researchers’ attitude to chaos theory" },
        { letter: "B", text: "clarifying their conclusions about traffic behavior" },
        { letter: "C", text: "showing how weather can change traffic flow" },
        { letter: "D", text: "describing how a small disturbance can spread" },
        { letter: "E", text: "giving examples of road-building projects" },
      ],
    },
    {
      questionNumbers: [20, 21],
      prompt: "Which TWO features of the traffic model are mentioned?",
      selectCount: 2,
      options: [
        { letter: "A", text: "It was adapted from equations used in physics." },
        { letter: "B", text: "It assumes that every driver behaves identically." },
        { letter: "C", text: "It reflects drivers slowing to avoid collisions." },
        { letter: "D", text: "It requires a road to be completely full." },
        { letter: "E", text: "It was first designed by traffic engineers." },
      ],
    },
    {
      questionNumbers: [22, 23],
      prompt: "Which TWO effects of driver behavior are identified?",
      selectCount: 2,
      options: [
        { letter: "A", text: "Sudden braking can create congestion behind a vehicle." },
        { letter: "B", text: "Drivers always react faster than automated systems." },
        { letter: "C", text: "Minor changes can affect the whole traffic system." },
        { letter: "D", text: "Training removes all differences between drivers." },
        { letter: "E", text: "Faster acceleration guarantees a shorter journey." },
      ],
    },
      ],
    },
    {
      id: "part2-summary",
      type: "fill",
      title: "Physicists’ theories on gas molecules and traffic flow",
      instruction: "Complete the summary. Write ONE WORD ONLY from the text for each answer.",
      questions: [
        { number: 24, before: "The simulations were based on", after: "normally used to describe gas molecules." },
        { number: 25, before: "Drivers prevent", after: "by altering their speed." },
        { number: 26, before: "Congestion may occur even when traffic", after: "is within the level a road can handle." },
      ],
    },
  ],
};

const partThree: ReadingPart = {
  id: "part3",
  label: "Part 3",
  questionRange: "questions 27–40",
  intro: "Read the text and answer questions 27–40.",
  title: "The Value of Play in Scientific Discovery",
  sections: [
    {
      id: "play-section-one",
      paragraphs: [
        "For many years, play was treated as the opposite of serious work. Laboratories, classrooms and offices were designed around efficiency, while play was often left to childhood or leisure. Yet a growing number of researchers now argue that playful activity can be one of the conditions that allows original thinking to emerge.",
        "The point is not that discovery happens without discipline. Scientists still need careful methods, accurate records and a willingness to test ideas against evidence. Play becomes useful because it allows a mind to loosen its usual categories and notice relationships that a stricter routine may overlook.",
      ],
    },
    {
      id: "play-section-two",
      paragraphs: [
        "Historical examples are often used to support this view. Several inventors described their early experiments as a kind of game, involving repeated attempts, small failures and sudden changes of direction. Such activity did not produce knowledge immediately, but it created a space in which unusual combinations could be explored before they were judged.",
        "Psychologists studying creativity have found a similar pattern. When people are allowed to manipulate objects, sketches or ideas without a fixed outcome, they often generate more varied solutions. The advantage appears to come from temporary freedom from the pressure to be correct.",
      ],
    },
    {
      id: "play-section-three",
      paragraphs: [
        "However, play has limits. A playful culture can become vague if it is not connected to a clear problem or followed by careful evaluation. Some researchers warn that organisations sometimes copy the appearance of creative play, such as colourful rooms and informal meetings, while avoiding the harder work of giving people time to think deeply.",
        "The most successful examples therefore combine two attitudes. In the early stage, people are encouraged to try ideas that seem incomplete or even odd. Later, those ideas are examined with discipline, and only the strongest are developed further.",
      ],
    },
    {
      id: "play-section-four",
      paragraphs: [
        "This balance matters in education as well as science. Students who are never allowed to explore may learn procedures without understanding why they work. But students who only explore may fail to build the knowledge needed to move beyond first impressions. Effective teaching often moves between guided play and precise explanation.",
        "In this sense, play should not be seen as a decorative extra. It is better understood as a method for opening possibilities, provided that it is followed by the harder process of selection, testing and refinement.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "part3-single-choice",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D.",
      questions: [
        {
          questionNumbers: [27],
          prompt: "What change in attitude does the writer describe in the first paragraph?",
          options: [
            { letter: "A", text: "Play is increasingly viewed as useful for serious thinking." },
            { letter: "B", text: "Play is now considered more important than evidence." },
            { letter: "C", text: "Scientists are rejecting efficient working methods." },
            { letter: "D", text: "Classrooms are becoming less interested in creativity." },
          ],
        },
        {
          questionNumbers: [28],
          prompt: "According to the writer, why can play support discovery?",
          options: [
            { letter: "A", text: "It removes the need for accurate records." },
            { letter: "B", text: "It helps people notice unexpected relationships." },
            { letter: "C", text: "It replaces disciplined scientific testing." },
            { letter: "D", text: "It makes people work more quickly." },
          ],
        },
        {
          questionNumbers: [29],
          prompt: "What do the historical examples suggest about invention?",
          options: [
            { letter: "A", text: "Most discoveries are completed in a single attempt." },
            { letter: "B", text: "Early experiments can involve trial and redirection." },
            { letter: "C", text: "Inventors usually avoid activities that feel like games." },
            { letter: "D", text: "Failures prevent unusual ideas from developing." },
          ],
        },
        {
          questionNumbers: [30],
          prompt: "What criticism does the writer make of some organisations?",
          options: [
            { letter: "A", text: "They spend too much time evaluating every idea." },
            { letter: "B", text: "They ignore the appearance of creative environments." },
            { letter: "C", text: "They copy playful surfaces without supporting deep thought." },
            { letter: "D", text: "They discourage informal meetings in the workplace." },
          ],
        },
        {
          questionNumbers: [31],
          prompt: "What is the writer's main point about education?",
          options: [
            { letter: "A", text: "Guided exploration and clear explanation both have value." },
            { letter: "B", text: "Students should choose between play and procedures." },
            { letter: "C", text: "Precise teaching should be avoided in creative subjects." },
            { letter: "D", text: "First impressions are more reliable than knowledge." },
          ],
        },
      ],
    },
    {
      id: "part3-summary",
      type: "fill",
      title: "Play and creative thought",
      instruction: "Complete the summary. Write ONE WORD ONLY from the text for each answer.",
      questions: [
        { number: 32, before: "Researchers argue that play can help original thinking to", after: "." },
        { number: 33, before: "Scientific ideas still need to be tested against", after: "." },
        { number: 34, before: "Play can loosen the usual", after: "used by the mind." },
        { number: 35, before: "Creative activity may benefit from temporary freedom from the pressure to be", after: "." },
        { number: 36, before: "Strong ideas require selection, testing and", after: "." },
      ],
    },
    {
      id: "part3-multiple-choice",
      type: "choice",
      instruction: "Choose TWO correct answers for each question.",
      questions: [
        {
          questionNumbers: [37, 38],
          prompt: "Which TWO features of productive play are mentioned by the writer?",
          selectCount: 2,
          options: [
            { letter: "A", text: "It creates room for unusual combinations." },
            { letter: "B", text: "It works best without any later evaluation." },
            { letter: "C", text: "It allows incomplete ideas to be tried." },
            { letter: "D", text: "It depends mainly on colourful surroundings." },
            { letter: "E", text: "It avoids all contact with a clear problem." },
          ],
        },
        {
          questionNumbers: [39, 40],
          prompt: "Which TWO risks does the writer associate with play?",
          selectCount: 2,
          options: [
            { letter: "A", text: "It may become vague without careful evaluation." },
            { letter: "B", text: "It always prevents students from learning procedures." },
            { letter: "C", text: "It can be reduced to surface-level workplace design." },
            { letter: "D", text: "It makes scientific records unnecessary." },
            { letter: "E", text: "It stops people from trying unusual solutions." },
          ],
        },
      ],
    },
  ],
};

const cambridge21Test1PartOne: ReadingPart = {
  id: "cambridge21-test1-part1",
  label: "Part 1",
  questionRange: "questions 1–13",
  intro: "Read the text and answer questions 1–13.",
  title: "The Davies Sisters",
  sections: [
    {
      id: "c21t1-p1-text",
      paragraphs: [
        "Between 1908 and 1924, Gwendoline and Margaret Davies amassed one of the largest collections of late-nineteenth and early-twentieth-century French paintings in Britain.",
        "Gwendoline (1882-1951) and Margaret (1884-1963) Davies were the granddaughters of David Davies, a Welshman who amassed a fortune in the shipping and mining industries. In 1907, when Gwendoline came into her inheritance (Margaret would follow in 1909), the sisters were said to be the wealthiest unmarried women in Britain. Their religious upbringing in rural Wales gave them a deep sense of social responsibility and they chose to use their inheritance for cultural and philanthropic purposes.",
        "While there was no real family history of art collecting, the sisters' education was rigorously geared toward such pursuits. Their London school focused on cultural rather than academic study, and they travelled extensively with their governess, Jane Blaker, visiting art galleries and making extensive notes on the collections there.",
        "The sisters began to make regular art purchases from 1908, which roughly coincided with the dates of their inheritance. They took advice from various people, including the art dealer Hugh Blaker (the brother of Jane Blaker) and David Croal Thompson, who was also an art dealer. While it was long assumed that these men were largely responsible for the nature of the sisters' collection, it has recently been accepted that Gwendoline and Margaret retained a far more active role in the process.",
        "The sisters' journals reveal their preference for Old Master paintings. Yet they initially made very few attempts to secure any such works. While the sisters were wealthy in relative terms, their income was nothing compared to the fortunes of American art collectors of this period, such as J. Pierpont Morgan. Quite simply, high quality Old Master works were, if not beyond their means, then beyond what they were willing to pay for them. Instead, their early purchases were of the fashionable, safe variety, and included, for example, paintings by the French artist Jean-Baptiste-Camille Corot.",
        "However, it was only a few years before their collecting took a new direction and they turned to the work of the French Impressionists. We know that Hugh Blaker, as a champion of contemporary French art, had a hand in the decision, and we know also that they would have seen examples on their various trips to Paris. Whatever the precise reason for this change, their first purchases of Impressionist art, made in October 1912, were scenes of Venice by the French artist Claude Monet. Over the next 12 years, the sisters amassed the bulk of their Impressionist collection, including six further works by Monet, two more by Manet, and three by Renoir, including his well-known painting La Parisienne.",
        "The First World War (1914-1918) played a part in the development of the sisters' collection. Their initial response to the war effort was to finance the safe passage of artists from occupied Belgium to Wales, as a humanitarian act, but also with the hope of establishing a vibrant artists' community in the area. Later in the conflict, both sisters decided to volunteer at a canteen for troops at Troyes, in northern France; Gwendoline in 1916, followed by Margaret in 1917.",
        "It was tedious and distressing work, which would have a permanent effect on Gwendoline's health. Yet on one of numerous trips to nearby Paris, she visited the Bernheim-Jeune Gallery. Here she acquired two works by Cezanne - Provencal Landscape and The Francois Zola Dam. The paintings were shipped directly to Bath, England, where they became the first works by Cezanne to go on display in a public gallery in Britain.",
        "Commentators have often described the sisters as unlikely pioneer collectors. Much is made of their isolation in rural Wales and the fact that they didn't make friends with artists or gallery owners. Yet they didn't feel obliged to follow fashionable tastes and were free to pursue their own preferences. Although they relied on a trusted circle of advisers, they made frequent trips to London and Paris, and also regularly had paintings sent to their home for consideration.",
        "By the early 1920s, Gwendoline felt increasingly uncomfortable buying art works when faced with the poverty and social upheaval created by the First World War. Her philanthropic pursuits then became focused almost exclusively on social causes and the development of the sisters' home at Gregynog Hall into a conference center and venue for the Gregynog Festival of Music and Poetry. Gwendoline made her final art purchase in March 1926. Margaret also stopped collecting around this time, but started again in the 1930s acquiring, on a relatively small scale, work by contemporary British artists.",
        "The sisters collected French Impressionist paintings at a time when such art was routinely ignored by individuals and institutions alike. The Gwendoline and Margaret Davies collection, donated in 1951 and 1963 respectively to the National Museum Wales, contains major examples of work by leading French Impressionists. In collecting paintings that they loved, the sisters created a lasting and meaningful cultural legacy for the people of Wales and beyond.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c21t1-p1-notes",
      type: "fill",
      title: "Gwendoline and Margaret Davies",
      instruction: "Complete the notes. Choose ONE WORD ONLY from the passage for each answer.",
      questions: [
        { number: 1, before: "Their grandfather's wealth came from", after: "and transportation businesses.", answer: "mining" },
        { number: 2, before: "Their", after: "was designed to give them an interest in activities such as collecting art.", answer: "education" },
        { number: 3, before: "They took lengthy", after: "about the things they saw in art galleries.", answer: "notes" },
        { number: 4, before: "The", after: "showed they liked Old Master paintings, but these were expensive to buy.", answer: "journals" },
        { number: 5, before: "The first Impressionist paintings they bought showed places in", after: ".", answer: "Venice" },
        { number: 6, before: "They worked in a", after: "for soldiers in France.", answer: "canteen" },
        { number: 7, before: "They did not have any", after: "who were artists.", answer: "friends" },
      ],
    },
    {
      id: "c21t1-p1-true-false",
      type: "choice",
      instruction: "Do the following statements agree with the information given in Reading Passage 1?",
      questions: [
        {
          questionNumbers: [8],
          prompt: "The Davies sisters' childhood influenced the way they decided to use their wealth.",
          answer: "TRUE",
          options: [
            { letter: "A", text: "TRUE" },
            { letter: "B", text: "FALSE" },
            { letter: "C", text: "NOT GIVEN" },
          ],
        },
        {
          questionNumbers: [9],
          prompt: "The Jean-Baptiste-Camille Corot paintings in the Davies sisters' collection were purchased from a gallery in France.",
          answer: "NOT GIVEN",
          options: [
            { letter: "A", text: "TRUE" },
            { letter: "B", text: "FALSE" },
            { letter: "C", text: "NOT GIVEN" },
          ],
        },
        {
          questionNumbers: [10],
          prompt: "Hugh Blaker opposed the Davies sisters' decision to buy art by French Impressionists.",
          answer: "FALSE",
          options: [
            { letter: "A", text: "TRUE" },
            { letter: "B", text: "FALSE" },
            { letter: "C", text: "NOT GIVEN" },
          ],
        },
        {
          questionNumbers: [11],
          prompt: "The exhibition of Cezanne paintings at the Bath gallery was very popular with the public.",
          answer: "NOT GIVEN",
          options: [
            { letter: "A", text: "TRUE" },
            { letter: "B", text: "FALSE" },
            { letter: "C", text: "NOT GIVEN" },
          ],
        },
        {
          questionNumbers: [12],
          prompt: "The impact of the First World War encouraged Gwendoline to reconsider her interest in collecting art.",
          answer: "TRUE",
          options: [
            { letter: "A", text: "TRUE" },
            { letter: "B", text: "FALSE" },
            { letter: "C", text: "NOT GIVEN" },
          ],
        },
        {
          questionNumbers: [13],
          prompt: "The Davies sisters bought French Impressionist art during a period when very few people were doing so.",
          answer: "TRUE",
          options: [
            { letter: "A", text: "TRUE" },
            { letter: "B", text: "FALSE" },
            { letter: "C", text: "NOT GIVEN" },
          ],
        },
      ],
    },
  ],
};

const cambridge21Test1PartTwo: ReadingPart = {
  id: "cambridge21-test1-part2",
  label: "Part 2",
  questionRange: "questions 14–26",
  intro: "Read the text and answer questions 14–26.",
  title: "Why we need silence",
  sections: [
    {
      id: "c21t1-p2-a",
      paragraphs: [
        "A Humans are finely attuned to noise, and for good reason. From an evolutionary perspective, sounds give us vital information, helping us navigate the world and avoid danger. To help ensure loud or unexpected noises get the attention they deserve, our internal chemistry alters in response to them. Our blood pressure goes up, muscles tense and glands release hormones that prepare us for fight or flight. In the short term, this is a good thing. When we are exposed to too much noise over the long term, however, those responses can lead to a multitude of health issues, from sleep disturbance to even cardiovascular disease.",
      ],
    },
    {
      id: "c21t1-p2-b",
      paragraphs: [
        "B The World Health Organization has recently designated excessive noise as an 'underestimated threat' to public health, and has said that people living in cities such as Mumbai, Tokyo and Buenos Aires are being exposed to far more than the recommended 40 decibels of noise at night. A report from the European Environment Agency concluded that noise was an ongoing and widespread issue in Europe, with at least 1 in 5 people consistently exposed to levels considered harmful to health. 'There are no earlids that can protect your brain from noise,' says Nick Antonio, an acoustic consultant who has contributed to the British and international standards for noise.",
      ],
    },
    {
      id: "c21t1-p2-c",
      paragraphs: [
        "C The good news is that several cities have been working to turn the volume down. One of the first to do so was London. 'By providing recommendations for quieter buses, reducing noise from roads and also controlling noise from aircraft, they were able to make the city quieter,' says Antonio. Other cities have introduced noise-reducing road coatings, for instance, alongside greenery that muffles sound. Some solutions are more specific: Washington DC's ban on petrol-powered leaf blowers came into effect recently, while in New York City, legislation has been approved to fine people who modify their vehicles to make them noisier. 'People are seeing the benefits of these more quiet environments in their cities,' Antonio says. 'I expect we will see much more of this in the future.'",
      ],
    },
    {
      id: "c21t1-p2-d",
      paragraphs: [
        "D Researchers are also seeking to understand what aspects of silent experiences are most beneficial to our health. One of the best-researched is the flotation tank: a lightproof, soundproof tank of salt water in which a person floats as a form of deep relaxation. While some people experience altered perception in the tanks, involving subtle humming sounds and visual effects, these effects are benign and do not detract from the benefits of the experience, says Justin Feinstein, a clinical neuropsychologist. 'When you don't have external sensory stimuli coming in, the brain tries to fill the void to make sense of this dark and silent world,' he explains. 'In these tanks, some people can even hear the sound of their eyes blinking,' says Feinstein. 'But it is the ability to focus on the breath that helps people reach a relaxed or meditative state.'",
      ],
    },
    {
      id: "c21t1-p2-e",
      paragraphs: [
        "E To further explore flotation tanks as a therapeutic tool, Feinstein and his colleagues recruited 50 people with a variety of conditions related to stress and had them answer a questionnaire prior to and following a flotation session. Participants reported decreases in muscle tension, pain and symptoms of their conditions after a single, 1-hour float, alongside an increase in feelings of relaxation and overall wellbeing.",
        "Less is known about what effects sensory deprivation can have on the brain. To investigate, Feinstein's team had 48 people participate in either three 90-minute float sessions or three 90-minute periods of relaxing on a chair which reclined. Participants had their brains scanned using functional magnetic resonance imaging at the beginning and end of the trial. Float sessions uniquely decreased activity in the default mode network (DMN), a collection of brain regions commonly linked with depression. Feinstein says it is an exciting finding, because flotation tanks seem to offer a way of 'resetting' our nervous system to prevent it from getting out of balance.",
      ],
    },
    {
      id: "c21t1-p2-f",
      paragraphs: [
        "F Neurobiologist Tal Dotan Ben-Soussan is also an advocate of silence as a therapy. 'When we find ways to be quiet, we are not only quiet in our environment, but quiet in our inner selves,' she explains. 'This allows us to be more aware of what is happening around us and what the situation may require from us so we can provide a more adequate response.'",
        "Not everyone will benefit from silence to the same extent, but Ben-Soussan says one characteristic is key: the person must need to want to engage in the experience. 'We see from animal models and human studies that volition and intentionality is important,' she says. 'When people do not want silence, it can be very distressing.'",
      ],
    },
    {
      id: "c21t1-p2-g",
      paragraphs: [
        "G Eric Pfeifer, a psychotherapy researcher, also concedes that some people may not benefit from silence, particularly those who are in a heightened state of stress. 'People in these states may not be able to relax or calm down in a silent condition,' he says. Professional guidance can be useful, he adds, allowing people to approach silence slowly so that they can gradually enjoy the benefits. And Pfeifer is convinced that silence is more attainable in everyday life than people think. First, complete silence isn't necessary. In a recent study, he found that participants reported more relaxation and less boredom when they sat quietly in an outdoor garden compared with a completely silent room. Second, Pfeifer believes we don't need a lot of silence to gain benefits. 'You don't need to spend hours in silence,' he says. 'It is likely better to have more frequency of silence for a few minutes at a time than a longer period of silence only once a week. Just finding those places in your daily life where you can find some silence can make a big difference.'",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c21t1-p2-section-matching",
      type: "choice",
      instruction: "Reading Passage 2 has seven sections, A-G. Which section contains the following information?",
      questions: [
        {
          questionNumbers: [14],
          prompt: "examples of strategies to decrease the noise that the public are exposed to",
          answer: "C",
          options: "ABCDEFG".split("").map((letter) => ({ letter, text: `Section ${letter}` })),
        },
        {
          questionNumbers: [15],
          prompt: "data indicating the extent of the problem of excessive noise",
          answer: "B",
          options: "ABCDEFG".split("").map((letter) => ({ letter, text: `Section ${letter}` })),
        },
        {
          questionNumbers: [16],
          prompt: "a description of physiological changes in our bodies when we hear sudden noises",
          answer: "A",
          options: "ABCDEFG".split("").map((letter) => ({ letter, text: `Section ${letter}` })),
        },
        {
          questionNumbers: [17],
          prompt: "evidence that a relatively quiet environment can be more beneficial than a totally silent one",
          answer: "G",
          options: "ABCDEFG".split("").map((letter) => ({ letter, text: `Section ${letter}` })),
        },
      ],
    },
    {
      id: "c21t1-p2-summary",
      type: "fill",
      title: "Flotation Tanks",
      instruction: "Complete the summary. Choose ONE WORD ONLY from the passage for each answer.",
      questions: [
        { number: 18, before: "Flotation tanks allow people to concentrate on their own", after: "which helps them relax and enables them to meditate.", answer: "breath" },
        { number: 19, before: "Feinstein and his colleagues gave 50 people a", after: "to complete before and after using a flotation tank.", answer: "questionnaire" },
        { number: 20, before: "Participants reported signs of relaxation and improved general", after: ".", answer: "wellbeing" },
        { number: 21, before: "Brain scans revealed decreased activity in parts of the brain associated with", after: ".", answer: "depression" },
      ],
    },
    {
      id: "c21t1-p2-people-matching",
      type: "choice",
      instruction: "Match each statement with the correct person, A, B, C or D. You may use any letter more than once.",
      questions: [
        {
          questionNumbers: [22],
          prompt: "It is unpleasant and upsetting for people to be placed in a silent environment against their will.",
          answer: "C",
          options: [
            { letter: "A", text: "Nick Antonio" },
            { letter: "B", text: "Justin Feinstein" },
            { letter: "C", text: "Tal Dotan Ben-Soussan" },
            { letter: "D", text: "Eric Pfeifer" },
          ],
        },
        {
          questionNumbers: [23],
          prompt: "The trend towards creating quieter urban locations is likely to increase in the coming years.",
          answer: "A",
          options: [
            { letter: "A", text: "Nick Antonio" },
            { letter: "B", text: "Justin Feinstein" },
            { letter: "C", text: "Tal Dotan Ben-Soussan" },
            { letter: "D", text: "Eric Pfeifer" },
          ],
        },
        {
          questionNumbers: [24],
          prompt: "When our body's senses are completely deprived of input, our minds compensate for this by creating the illusion of images and sounds.",
          answer: "B",
          options: [
            { letter: "A", text: "Nick Antonio" },
            { letter: "B", text: "Justin Feinstein" },
            { letter: "C", text: "Tal Dotan Ben-Soussan" },
            { letter: "D", text: "Eric Pfeifer" },
          ],
        },
        {
          questionNumbers: [25],
          prompt: "Even a short amount of silent time can have a positive impact.",
          answer: "D",
          options: [
            { letter: "A", text: "Nick Antonio" },
            { letter: "B", text: "Justin Feinstein" },
            { letter: "C", text: "Tal Dotan Ben-Soussan" },
            { letter: "D", text: "Eric Pfeifer" },
          ],
        },
        {
          questionNumbers: [26],
          prompt: "External and internal quietness makes us more conscious of events occurring in our surroundings and helps us react appropriately to these events.",
          answer: "C",
          options: [
            { letter: "A", text: "Nick Antonio" },
            { letter: "B", text: "Justin Feinstein" },
            { letter: "C", text: "Tal Dotan Ben-Soussan" },
            { letter: "D", text: "Eric Pfeifer" },
          ],
        },
      ],
    },
  ],
};

const sugarSummaryOptions: ReadingOption[] = [
  { letter: "A", text: "national governments" },
  { letter: "B", text: "agricultural developments" },
  { letter: "C", text: "less wealthy nations" },
  { letter: "D", text: "untrained workers" },
  { letter: "E", text: "small-scale cultivation" },
  { letter: "F", text: "outdated methods" },
  { letter: "G", text: "financial controls" },
  { letter: "H", text: "migrant workers" },
  { letter: "I", text: "powerful individuals and businesses" },
];

const cambridge21Test1PartThree: ReadingPart = {
  id: "cambridge21-test1-part3",
  label: "Part 3",
  questionRange: "questions 27–40",
  intro: "Read the text and answer questions 27–40.",
  title: "Book review: The World of Sugar by Ulbe Bosma",
  sections: [
    {
      id: "c21t1-p3-text",
      paragraphs: [
        "Ulbe Bosma's The World of Sugar is a genuinely global history. Bosma discusses all the sugar-growing places of the world, beginning with Cuba and Java, the largest exporters of the early 20th century. But this is a history not just of cane sugar but also of beet sugar, an equally important form of traded sugar over the last hundred years. Beet sugar is grown mainly in Europe and the United States. It has also been massively subsidised and sold at artificially low prices on world markets, threatening the livelihood of producers of cane sugar.",
        "Bosma's discussion of the sugar market in Britain gives a sense of the book's range. The sweet-toothed British first bought cane sugar from their own slavery-dependent colonial plantations. Following the abolition of slavery in the British Empire, cane sugar was imported to Britain from places which retained the practice, such as Cuba and Brazil. Towards the end of the 19th century, the British started to import beet sugar from continental Europe. Only in the 20th century was there a move to develop a national beet sugar industry.",
        "The book provides a global labour history, investigating the wide range of labour regimes associated with growing sugar. Contrary to popular belief, cane sugar production was never just restricted to large, dedicated plantations owned by rich men. For example, in Java, a huge exporter of sugar in the early 20th century, sugar cane was grown together with rice in an extraordinarily labour-intensive way by small farmers.",
        "The World of Sugar is also a story of similarity and continuity in sugar cultivation. For example, imported labour has been used for much large-scale production. German beet fields employed Polish workers; Mexicans and many others, including Sicilians, were vital to US sugar production. Cane cutting, Bosma shows, remains a poorly paid and brutal business to this day in many places in the world. But as well as this, the book is about the continuity of the use of traditional methods on small farms. In the mid 20th-century, this type of sugar production dominated in South Asia and Latin America.",
        "This is also a history of capitalists and sugar dynasties, as well as corporations that in some cases have remained influential over very long periods. Great firms and great interests have had profound influence on the policies of states. In many places - not just the British Caribbean but Cuba and the Philippines too - a powerful sugar bourgeoisie played a major role in politics and their interests were consequently protected by trade barriers and subsidies. In the battle for control of the industry, it was inevitably the poor countries which came off worse. All this is explored by Bosma with wonderful subtlety and control.",
        "But sugar production was never just a matter of agriculture. It also involved the extraction, close to the place of harvest, of sucrose from the sugar plant, a process which required machinery powered by humans, animals, wind or steam. Further processes involved boiling and the separation of sugar from other materials in a process known as refinement. From very early on, sugar production was an energy-intensive industrial process, mostly taking place in the countryside and in refineries in centres of consumption, both small and large. The growth of the industry entailed a very rapid diffusion of ideas and techniques from one country to another. Cuba, for example, developed an extraordinarily dense system of railways to transport workers and cane, as well as steam-powered sugar factories. Particular varieties of cane sugar and beet sugar spread very rapidly across the world, in accordance with local needs and demands.",
        "Where once only tiny quantities of sugar could be produced, now new techniques, varieties, fertilisers, irrigation systems and much more have turned gleaming white sugar into a ubiquitous chemical. Over the same time, there has been a massive increase in consumption. Once regarded as a luxury, sugar came to be promoted as a valuable source of energy. But as the consumption of sugar has increased, so has the harm it does, whether to people's teeth or weight. In the face of appalling obstruction from the sugar industry to attempts to reduce consumption, some countries have been forced to tax sugar in order to bring that about. The sugar industry has a history of attacking its critics and, when it comes to obesity, of trying to blame fats, and lack of exercise and self-control. And the recent past has seen worrying new developments in mass sweetening. High-fructose corn syrup made from maize using an enzymatic process invented in Japan in the 1960s has a similar number of calories to table sugar but is far cheaper to produce. It is now widely consumed, having been adopted in the making of soft drinks and a large number of processed foods, and is regarded as a leading cause of obesity.",
        "This is a wonderfully rich book, a model of global history, the history of production and the history of capitalism. Bosma avoids outbursts of emotion, celebratory or critical, even if they might have made his analysis of the multiple tragedies involving sugar all the more powerful. He shows that we could always have done without sugar and that today we have many alternative sources of sweetness. Yet many of the poorest people in the world still depend on it to make a living.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c21t1-p3-choice",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D.",
      questions: [
        {
          questionNumbers: [27],
          prompt: "What does the reviewer suggest about the cultivation and trading of sugar in the first paragraph?",
          answer: "B",
          options: [
            { letter: "A", text: "Sugar has played a major role in international relations." },
            { letter: "B", text: "Beet sugar has been made more internationally competitive." },
            { letter: "C", text: "Cane sugar is thought to be of superior quality to beet sugar." },
            { letter: "D", text: "New locations for cultivating sugar have increased production." },
          ],
        },
        {
          questionNumbers: [28],
          prompt: "In the second paragraph, when discussing the sugar market in Britain, the reviewer stresses",
          answer: "A",
          options: [
            { letter: "A", text: "how the sources used changed over time." },
            { letter: "B", text: "how developments in agriculture affected trade." },
            { letter: "C", text: "the increased demand for sugar over the years." },
            { letter: "D", text: "the growing support for ethical methods of cultivation." },
          ],
        },
        {
          questionNumbers: [29],
          prompt: "What is the reviewer doing in the third paragraph?",
          answer: "C",
          options: [
            { letter: "A", text: "describing an efficient approach to sugar cultivation" },
            { letter: "B", text: "explaining why the use of sugar plantations declined" },
            { letter: "C", text: "addressing a misconception about the growing of sugar cane" },
            { letter: "D", text: "evaluating different approaches to the cultivation of sugar cane" },
          ],
        },
        {
          questionNumbers: [30],
          prompt: "In the final paragraph, what does the reviewer suggest is the overall message of Bosma's book?",
          answer: "A",
          options: [
            { letter: "A", text: "Sugar is a harmful and unnecessary product." },
            { letter: "B", text: "Economic pressure is needed to control sugar production." },
            { letter: "C", text: "Conditions for workers in sugar production should be improved." },
            { letter: "D", text: "Intensive marketing of sugar has had disastrous consequences." },
          ],
        },
      ],
    },
    {
      id: "c21t1-p3-summary-list",
      type: "choice",
      instruction: "Complete the summary using the list of words, A-I.",
      questions: [
        {
          questionNumbers: [31],
          prompt: "In the big industries in both Germany and the US, sugar farming depended on",
          answer: "H",
          options: sugarSummaryOptions,
        },
        {
          questionNumbers: [32],
          prompt: "However, in other parts of the world such as South Asia and Latin America, this continued.",
          answer: "E",
          options: sugarSummaryOptions,
        },
        {
          questionNumbers: [33],
          prompt: "Sugar production has also involved people and organisations who were eager to protect their markets.",
          answer: "I",
          options: sugarSummaryOptions,
        },
        {
          questionNumbers: [34],
          prompt: "In countries such as Cuba the sugar industry therefore had a major influence on",
          answer: "A",
          options: sugarSummaryOptions,
        },
        {
          questionNumbers: [35],
          prompt: "To support the interests of sugar producers, these were established.",
          answer: "G",
          options: sugarSummaryOptions,
        },
        {
          questionNumbers: [36],
          prompt: "As a result of this, these were penalised.",
          answer: "C",
          options: sugarSummaryOptions,
        },
      ],
    },
    {
      id: "c21t1-p3-yes-no",
      type: "choice",
      instruction: "Do the following statements agree with the views of the writer in Reading Passage 3?",
      questions: [
        {
          questionNumbers: [37],
          prompt: "Sugar has now become available in large quantities due to a range of agricultural developments.",
          answer: "YES",
          options: [
            { letter: "A", text: "YES" },
            { letter: "B", text: "NO" },
            { letter: "C", text: "NOT GIVEN" },
          ],
        },
        {
          questionNumbers: [38],
          prompt: "Advertisers initially marketed sugar as a luxury product.",
          answer: "NOT GIVEN",
          options: [
            { letter: "A", text: "YES" },
            { letter: "B", text: "NO" },
            { letter: "C", text: "NOT GIVEN" },
          ],
        },
        {
          questionNumbers: [39],
          prompt: "The invention of high-fructose corn syrup was a positive development.",
          answer: "NO",
          options: [
            { letter: "A", text: "YES" },
            { letter: "B", text: "NO" },
            { letter: "C", text: "NOT GIVEN" },
          ],
        },
        {
          questionNumbers: [40],
          prompt: "High-fructose corn syrup is an ingredient in many processed foods.",
          answer: "YES",
          options: [
            { letter: "A", text: "YES" },
            { letter: "B", text: "NO" },
            { letter: "C", text: "NOT GIVEN" },
          ],
        },
      ],
    },
  ],
};

export const READING_PARTS: ReadingPart[] = [
  cambridge21Test1PartOne,
  cambridge21Test1PartTwo,
  cambridge21Test1PartThree,
];

export function getReadingPart(id: ReadingPartId) {
  return READING_PARTS.find((part) => part.id === id) ?? READING_PARTS[0];
}

export function getReadingQuestionNumbers(part: ReadingPart) {
  return part.questionBlocks
    .flatMap((block) => {
      if (block.type === "headings") return block.questionNumbers;
      if (block.type === "fill") return block.questions.map((question) => question.number);
      return block.questions.flatMap((question) => question.questionNumbers);
    })
    .sort((a, b) => a - b);
}

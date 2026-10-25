import type { ReadingOption, ReadingPart } from "./reading";
import type { ReadingSourcePage } from "./reading-source-model";

function sourcePages(numbers: number[]): ReadingSourcePage[] {
  return numbers.map((page) => ({
    page,
    src: "/reading/source-pages/ci8-p" + String(page).padStart(3, "0") + ".webp",
    width: 1750,
    height: 2472,
  }));
}

function partSource(passagePages: number[], questionPages: number[]) {
  return {
    passagePages: sourcePages(passagePages),
    questionPages: sourcePages(questionPages),
    answerPages: [],
    explanationAttribution: "自编解析｜依据本卷原文与标准答案编写",
  };
}

const trueFalseNotGiven: ReadingOption[] = [
  { letter: "TRUE", text: "TRUE" },
  { letter: "FALSE", text: "FALSE" },
  { letter: "NOT GIVEN", text: "NOT GIVEN" },
];

const timeParagraphOptions: ReadingOption[] = "ABCDEFGH".split("").map((letter) => ({
  letter,
  text: "Paragraph " + letter,
}));

const nationalities: ReadingOption[] = [
  { letter: "A", text: "Babylonians" },
  { letter: "B", text: "Egyptians" },
  { letter: "C", text: "Greeks" },
  { letter: "D", text: "English" },
  { letter: "E", text: "Germans" },
  { letter: "F", text: "French" },
];

const timePassage: ReadingPart = {
  id: "cambridge-8-test-1-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "Our conception of time depends on the way we measure it",
  sections: [
    {
      id: "c8t1-p1-a",
      heading: "Paragraph A",
      paragraphs: [
        "According to archaeological evidence, at least 5,000 years ago, and long before the advent of the Roman Empire, the Babylonians began to measure time, introducing calendars to co-ordinate communal activities, to plan the shipment of goods and, in particular, to regulate planting and harvesting. They based their calendars on three natural cycles: the solar day, marked by the successive periods of light and darkness as the earth rotates on its axis; the lunar month, following the phases of the moon as it orbits the earth; and the solar year, defined by the changing seasons that accompany our planet's revolution around the sun.",
      ],
    },
    {
      id: "c8t1-p1-b",
      heading: "Paragraph B",
      paragraphs: [
        "Before the invention of artificial light, the moon had greater social impact. And, for those living near the equator in particular, its waxing and waning was more conspicuous than the passing of the seasons. Hence, the calendars that were developed at the lower latitudes were influenced more by the lunar cycle than by the solar year. In more northern climes, however, where seasonal agriculture was practised, the solar year became more crucial. As the Roman Empire expanded northward, it organised its activity chart for the most part around the solar year.",
      ],
    },
    {
      id: "c8t1-p1-c",
      heading: "Paragraph C",
      paragraphs: [
        "Centuries before the Roman Empire, the Egyptians had formulated a municipal calendar having 12 months of 30 days, with five days added to approximate the solar year. Each period of ten days was marked by the appearance of special groups of stars called decans. At the rise of the star Sirius just before sunrise, which occurred around the all-important annual flooding of the Nile, 12 decans could be seen spanning the heavens. The cosmic significance the Egyptians placed in the 12 decans led them to develop a system in which each interval of darkness (and later, each interval of daylight) was divided into a dozen equal parts. These periods became known as temporal hours because their duration varied according to the changing length of days and nights with the passing of the seasons. Summer hours were long, winter ones short; only at the spring and autumn equinoxes were the hours of daylight and darkness equal. Temporal hours, which were first adopted by the Greeks and then the Romans, who disseminated them through Europe, remained in use for more than 2,500 years.",
      ],
    },
    {
      id: "c8t1-p1-d",
      heading: "Paragraph D",
      paragraphs: [
        "In order to track temporal hours during the day, inventors created sundials, which indicate time by the length or direction of the sun's shadow. The sundial's counterpart, the water clock, was designed to measure temporal hours at night. One of the first water clocks was a basin with a small hole near the bottom through which the water dripped out. The falling water level denoted the passing hour as it dipped below hour lines inscribed on the inner surface. Although these devices performed satisfactorily around the Mediterranean, they could not always be depended on in the cloudy and often freezing weather of northern Europe.",
      ],
    },
    {
      id: "c8t1-p1-e",
      heading: "Paragraph E",
      paragraphs: [
        "The advent of the mechanical clock meant that although it could be adjusted to maintain temporal hours, it was naturally suited to keeping equal ones. With these, however, arose the question of when to begin counting, and so, in the early 14th century, a number of systems evolved. The schemes that divided the day into 24 equal parts varied according to the start of the count: Italian hours began at sunset, Babylonian hours at sunrise, astronomical hours at midday and ‘great clock’ hours, used for some large public clocks in Germany, at midnight. Eventually these were superseded by ‘small clock’, or French, hours, which split the day into two 12-hour periods commencing at midnight.",
      ],
    },
    {
      id: "c8t1-p1-f",
      heading: "Paragraph F",
      paragraphs: [
        "The earliest recorded weight-driven mechanical clock was built in 1283 in Bedfordshire in England. The revolutionary aspect of this new timekeeper was neither the descending weight that provided its motive force nor the gear wheels (which had been around for at least 1,300 years) that transferred the power; it was the part called the escapement. In the early 1400s came the invention of the coiled spring or fusee which maintained constant force to the gear wheels of the timekeeper despite the changing tension of its mainspring. By the 16th century, a pendulum clock had been devised, but the pendulum swung in a large arc and thus was not very efficient.",
      ],
    },
    {
      id: "c8t1-p1-g",
      heading: "Paragraph G",
      paragraphs: [
        "To address this, a variation on the original escapement was invented in 1670, in England. It was called the anchor escapement, which was a lever-based device shaped like a ship's anchor. The motion of a pendulum rocks this device so that it catches and then releases each tooth of the escape wheel, in turn allowing it to turn a precise amount. Unlike the original form used in early pendulum clocks, the anchor escapement permitted the pendulum to travel in a very small arc. Moreover, this invention allowed the use of a long pendulum which could beat once a second and thus led to the development of a new floor-standing case design, which became known as the grandfather clock.",
      ],
    },
    {
      id: "c8t1-p1-h",
      heading: "Paragraph H",
      paragraphs: [
        "Today, highly accurate timekeeping instruments set the beat for most electronic devices. Nearly all computers contain a quartz-crystal clock to regulate their operation. Moreover, not only do time signals beamed down from Global Positioning System satellites calibrate the functions of precision navigation equipment, they do so as well for mobile phones, instant stock-trading systems and nationwide power-distribution grids. So integral have these time-based technologies become to day-to-day existence that our dependency on them is recognised only when they fail to work.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c8t1-p1-paragraph-matching",
      type: "choice",
      instruction: "Reading Passage 1 has eight paragraphs, A–H. Which paragraph contains the following information? Write the correct letter, A–H.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [1], prompt: "a description of an early timekeeping invention affected by cold temperatures", options: timeParagraphOptions },
        { questionNumbers: [2], prompt: "an explanation of the importance of geography in the development of the calendar in farming communities", options: timeParagraphOptions },
        { questionNumbers: [3], prompt: "a description of the origins of the pendulum clock", options: timeParagraphOptions },
        { questionNumbers: [4], prompt: "details of the simultaneous efforts of different societies to calculate time using uniform hours", options: timeParagraphOptions },
      ],
    },
    {
      id: "c8t1-p1-nationality-matching",
      type: "choice",
      instruction: "Look at the following events (Questions 5–8) and the list of nationalities below. Match each event with the correct nationality, A–F.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [5], prompt: "They devised a civil calendar in which the months were equal in length.", options: nationalities },
        { questionNumbers: [6], prompt: "They divided the day into two equal halves.", options: nationalities },
        { questionNumbers: [7], prompt: "They developed a new cabinet shape for a type of timekeeper.", options: nationalities },
        { questionNumbers: [8], prompt: "They created a calendar to organise public events and work schedules.", options: nationalities },
      ],
    },
    {
      id: "c8t1-p1-escapement-diagram",
      type: "fill",
      title: "How the 1670 lever-based device worked",
      instruction: "Label the diagram. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 9–13.",
      questions: [9, 10, 11, 12, 13].map((number) => ({ number, before: "Question " + number })),
      rawText: "Questions 9–13\nLabel the diagram. Choose NO MORE THAN TWO WORDS from the passage for each answer.\n\nHow the 1670 lever-based device worked\n\nescapement (resembling 9 ......................)\nthe 10 ......................\nthe 11 ......................\na 12 ...................... which beats each 13 ......................\n\nThe original diagram is available in the source-page reference below.",
    },
  ],
  source: partSource([11, 12], [13, 14]),
};

const airTrafficHeadings = [
  { id: "i", text: "Disobeying FAA regulations" },
  { id: "ii", text: "Aviation disaster prompts action" },
  { id: "iii", text: "Two coincidental developments" },
  { id: "iv", text: "Setting altitude zones" },
  { id: "v", text: "An oversimplified view" },
  { id: "vi", text: "Controlling pilots’ licences" },
  { id: "vii", text: "Defining airspace categories" },
  { id: "viii", text: "Setting rules to weather conditions" },
  { id: "ix", text: "Taking off safely" },
  { id: "x", text: "First steps towards ATC" },
];

const airTrafficPassage: ReadingPart = {
  id: "cambridge-8-test-1-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 on the following pages.",
  title: "AIR TRAFFIC CONTROL IN THE USA",
  sections: [
    {
      id: "c8t1-p2-a",
      heading: "Paragraph A",
      headingQuestionNumber: 14,
      paragraphs: [
        "An accident that occurred in the skies over the Grand Canyon in 1956 resulted in the establishment of the Federal Aviation Administration (FAA) to regulate and oversee the operation of aircraft in the skies over the United States, which were becoming quite congested. The resulting structure of air traffic control has greatly increased the safety of flight in the United States, and similar air traffic control procedures are also in place over much of the rest of the world.",
      ],
    },
    {
      id: "c8t1-p2-b",
      heading: "Paragraph B (example: x)",
      paragraphs: [
        "Rudimentary air traffic control (ATC) existed well before the Grand Canyon disaster. As early as the 1920s, the earliest air traffic controllers manually guided aircraft in the vicinity of the airports, using lights and flags, while beacons and flashing lights were placed along cross-country routes to establish the earliest airways. However, this purely visual system was useless in bad weather, and, by the 1930s, radio communication was coming into use for ATC. The first region to have something approximating today's ATC was New York City, with other major metropolitan areas following soon after.",
      ],
    },
    {
      id: "c8t1-p2-c",
      heading: "Paragraph C",
      headingQuestionNumber: 15,
      paragraphs: [
        "In the 1940s, ATC centres could and did take advantage of the newly developed radar and improved radio communication brought about by the Second World War, but the system remained rudimentary. It was only after the creation of the FAA that full-scale regulation of America's airspace took place, and this was fortuitous, for the advent of the jet engine suddenly resulted in a large number of very fast planes, reducing pilots' margin of error and practically demanding some set of rules to keep everyone well separated and operating safely in the air.",
      ],
    },
    {
      id: "c8t1-p2-d",
      heading: "Paragraph D",
      headingQuestionNumber: 16,
      paragraphs: [
        "Many people think that ATC consists of a row of controllers sitting in front of their radar screens at the nation's airports, telling arriving and departing traffic what to do. This is a very incomplete part of the picture. The FAA realised that the airspace over the United States would at any time have many different kinds of planes, flying for many different purposes, in a variety of weather conditions, and the same kind of structure was needed to accommodate all of them.",
      ],
    },
    {
      id: "c8t1-p2-e",
      heading: "Paragraph E",
      headingQuestionNumber: 17,
      paragraphs: [
        "To meet this challenge, the following elements were put into effect. First, ATC extends over virtually the entire United States. In general, from 365m above the ground and higher, the entire country is blanketed by controlled airspace. In certain areas, mainly near airports, controlled airspace extends down to 215m above the ground, and, in the immediate vicinity of an airport, all the way down to the surface. Controlled airspace is that airspace in which FAA regulations apply. Elsewhere, in uncontrolled airspace, pilots are bound by fewer regulations. In this way, the recreational pilot who simply wishes to go flying for a while without all the restrictions imposed by the FAA has only to stay in uncontrolled airspace, below 365m, while the pilot who does want the protection afforded by ATC can easily enter the controlled airspace.",
      ],
    },
    {
      id: "c8t1-p2-f",
      heading: "Paragraph F",
      headingQuestionNumber: 18,
      paragraphs: [
        "The FAA then recognised two types of operating environments. In good meteorological conditions, flying would be permitted under Visual Flight Rules (VFR), which suggests a strong reliance on visual cues to maintain an acceptable level of safety. Poor visibility necessitated a set of Instrumental Flight Rules (IFR), under which the pilot relied on altitude and navigational information provided by the plane's instrument panel to fly safely. On a clear day, a pilot in controlled airspace can choose a VFR or IFR flight plan, and the FAA regulations were devised in a way which accommodates both VFR and IFR operations in the same airspace. However, a pilot can only choose to fly IFR if they possess an instrument rating which is above and beyond the basic pilot's license that must also be held.",
      ],
    },
    {
      id: "c8t1-p2-g",
      heading: "Paragraph G",
      headingQuestionNumber: 19,
      paragraphs: [
        "Controlled airspace is divided into several different types, designated by letters of the alphabet. Uncontrolled airspace is designated Class F, while controlled airspace below 5,490m above sea level and not in the vicinity of an airport is Class E. All airspace above 5,490m is designated Class A. The reason for the division of Class E and Class A airspace stems from the type of planes operating in them. Generally, Class E airspace is where one finds general aviation aircraft (few of which can climb above 5,490m anyway), and commercial turboprop aircraft. Above 5,490m is the realm of the heavy jets, since jet engines operate more efficiently at higher altitudes. The difference between Class E and A airspace is that in Class A, all operations are IFR, and pilots must be instrument-rated, that is, skilled and licensed in aircraft instrumentation. This is because ATC control of the entire space is essential. Three other types of airspace, Classes D, C and B, govern the vicinity of airports. These correspond roughly to small municipal, medium-sized metropolitan and major metropolitan airports respectively, and encompass an increasingly rigorous set of regulations. For example, all a VFR pilot has to do to enter Class C airspace is establish two-way radio contact with ATC. No explicit permission from ATC to enter is needed, although the pilot must continue to obey all regulations governing VFR flight. To enter Class B airspace, such as on approach to a major metropolitan airport, an explicit ATC clearance is required. The private pilot who cruises without permission into this airspace risks losing their license.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c8t1-p2-headings",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 2 has seven paragraphs, A–G. Choose the correct heading for paragraphs A and C–G from the list below. Paragraph B is the example.",
      options: airTrafficHeadings,
      questionNumbers: [14, 15, 16, 17, 18, 19],
    },
    {
      id: "c8t1-p2-true-false-not-given",
      type: "choice",
      instruction: "Do the following statements agree with the information given in Reading Passage 2? Write TRUE, FALSE or NOT GIVEN.",
      questions: [
        { questionNumbers: [20], prompt: "The FAA was created as a result of the introduction of the jet engine.", options: trueFalseNotGiven },
        { questionNumbers: [21], prompt: "Air Traffic Control started after the Grand Canyon crash in 1956.", options: trueFalseNotGiven },
        { questionNumbers: [22], prompt: "Beacons and flashing lights are still used by ATC today.", options: trueFalseNotGiven },
        { questionNumbers: [23], prompt: "Some improvements were made in radio communication during World War II.", options: trueFalseNotGiven },
        { questionNumbers: [24], prompt: "Class F airspace is airspace which is below 365m and not near airports.", options: trueFalseNotGiven },
        { questionNumbers: [25], prompt: "All aircraft in Class E airspace must use IFR.", options: trueFalseNotGiven },
        { questionNumbers: [26], prompt: "A pilot entering Class C airspace is flying over an average-sized city.", options: trueFalseNotGiven },
      ],
    },
  ],
  source: partSource([16, 17], [15, 18]),
};

const telepathyEndings: ReadingOption[] = [
  { letter: "A", text: "the discovery of a mechanism for telepathy." },
  { letter: "B", text: "the need to create a suitable environment for telepathy." },
  { letter: "C", text: "their claims of a high success rate." },
  { letter: "D", text: "a solution to the problem posed by random guessing." },
  { letter: "E", text: "the significance of the ganzfeld experiments." },
  { letter: "F", text: "a more careful selection of subjects." },
  { letter: "G", text: "a need to keep altering conditions." },
];

const telepathyPassage: ReadingPart = {
  id: "cambridge-8-test-1-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "TELEPATHY",
  subtitle: "Can human beings communicate by thought alone? For more than a century the issue of telepathy has divided the scientific community, and even today it still sparks bitter controversy among top academics",
  sections: [
    {
      id: "c8t1-p3-a",
      paragraphs: [
        "Since the 1970s, parapsychologists at leading universities and research institutes around the world have risked the derision of sceptical colleagues by putting the various claims for telepathy to the test in dozens of rigorous scientific studies. The results and their implications are dividing even the researchers who uncovered them.",
      ],
    },
    {
      id: "c8t1-p3-b",
      paragraphs: [
        "Some researchers say the results constitute compelling evidence that telepathy is genuine. Other parapsychologists believe the field is on the brink of collapse, having tried to produce definitive scientific proof and failed. Sceptics and advocates alike do concur on one issue, however: that the most impressive evidence so far has come from the so-called ‘ganzfeld’ experiments, a German term that means ‘whole field’. Reports of telepathic experiences had by people during meditation led parapsychologists to suspect that telepathy might involve ‘signals’ passing between people that were so faint that they were usually swamped by normal brain activity. In this case, such signals might be more easily detected by those experiencing meditation-like tranquillity in a relaxing ‘whole field’ of light, sound and warmth.",
      ],
    },
    {
      id: "c8t1-p3-c",
      paragraphs: [
        "The ganzfeld experiment tries to recreate these conditions with participants sitting in soft reclining chairs in a sealed room, listening to relaxing sounds while their eyes are covered with special filters letting in only soft pink light. In early ganzfeld experiments, the telepathy test involved identification of a picture chosen from a random selection of four taken from a large image bank. The idea was that a person acting as a ‘sender’ would attempt to beam the image over to the ‘receiver’ relaxing in the sealed room. Once the session was over, this person was asked to identify which of the four images had been used. Random guessing would give a hit-rate of 25 per cent; if telepathy is real, however, the hit-rate would be higher. In 1982, the results from the first ganzfeld studies were analysed by one of its pioneers, the American parapsychologist Charles Honorton. They pointed to typical hit-rates of better than 30 per cent — a small effect, but one which statistical tests suggested could not be put down to chance.",
      ],
    },
    {
      id: "c8t1-p3-d",
      paragraphs: [
        "The implication was that the ganzfeld method had revealed real evidence for telepathy. But there was a crucial flaw in this argument — one routinely overlooked in more conventional areas of science. Just because chance had been ruled out as an explanation did not prove telepathy must exist; there were many other ways of getting positive results. These ranged from ‘sensory leakage’ — where clues about the pictures accidentally reach the receiver — to outright fraud.",
      ],
    },
    {
      id: "c8t1-p3-e",
      paragraphs: [
        "In response, the researchers issued a review of all the ganzfeld studies done up to 1985 to show that 80 per cent had found statistically significant evidence. However, they also agreed that there were still too many problems in the experiments which could lead to positive results, and they drew up a list demanding new standards for future research.",
      ],
    },
    {
      id: "c8t1-p3-f",
      paragraphs: [
        "After this, many researchers switched to autoganzfeld tests — an automated variant of the technique which used computers to perform many of the key tasks such as the random selection of images. By minimising human involvement, the idea was to minimise the risk of flawed results. In 1987, results from hundreds of autoganzfeld tests were studied by Honorton in a ‘meta-analysis’, a statistical technique for finding the overall results from a set of studies. Though less compelling than before, the outcome was still impressive.",
      ],
    },
    {
      id: "c8t1-p3-g",
      paragraphs: [
        "Yet some parapsychologists remain disturbed by the lack of consistency between individual ganzfeld studies. Defenders of telepathy point out that demanding impressive evidence from every study ignores one basic statistical fact: it takes large samples to detect small effects. If, as current results suggest, telepathy produces hit-rates only marginally above the 25 per cent expected by chance, it's unlikely to be detected by a typical ganzfeld study involving around 40 people: the group is just not big enough. Only when many studies are combined in a meta-analysis will the faint signal of telepathy really become apparent. And that is what researchers do seem to be finding.",
      ],
    },
    {
      id: "c8t1-p3-h",
      paragraphs: [
        "What they are certainly not finding, however, is any change in attitude of mainstream scientists: most still totally reject the very idea of telepathy. The problem stems at least in part from the lack of any plausible mechanism for telepathy.",
      ],
    },
    {
      id: "c8t1-p3-i",
      paragraphs: [
        "Various theories have been put forward, many focusing on esoteric ideas from theoretical physics. They include ‘quantum entanglement’, in which events affecting one group of atoms instantly affect another group, no matter how far apart they may be. While physicists have demonstrated entanglement with specially prepared atoms, no-one knows if it also exists between atoms making up human minds. Answering such questions would transform parapsychology. This has prompted some researchers to argue that the future lies not in collecting more evidence for telepathy, but in probing possible mechanisms. Some work has begun already, with researchers trying to identify people who are particularly successful in autoganzfeld trials. Early results show that creative and artistic people do much better than average: in one study at the University of Edinburgh, musicians achieved a hit-rate of 56 per cent. Perhaps more tests like these will eventually give the researchers the evidence they are seeking and strengthen the case for the existence of telepathy.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "c8t1-p3-sentence-endings",
      type: "choice",
      instruction: "Complete each sentence with the correct ending, A–G. Write the correct letter in boxes 27–30 on your answer sheet.",
      sharedOptions: true,
      questions: [
        { questionNumbers: [27], prompt: "Researchers with differing attitudes towards telepathy agree on", options: telepathyEndings },
        { questionNumbers: [28], prompt: "Reports of experiences during meditation indicated", options: telepathyEndings },
        { questionNumbers: [29], prompt: "Attitudes to parapsychology would alter drastically with", options: telepathyEndings },
        { questionNumbers: [30], prompt: "Recent autoganzfeld trials suggest that success rates will improve with", options: telepathyEndings },
      ],
    },
    {
      id: "c8t1-p3-experiment-table",
      type: "fill",
      title: "Telepathy Experiments",
      instruction: "Complete the table below. Choose NO MORE THAN THREE WORDS from the passage for each answer. Write your answers in boxes 31–40 on your answer sheet.",
      questions: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40].map((number) => ({ number, before: "Question " + number })),
      table: {
        headers: ["Name / Date", "Description", "Result", "Flaw"],
        rows: [
          [
            { text: "Ganzfeld studies (1982)", rowSpan: 3 },
            { before: "Involved a person acting as a ", questionNumber: 31, after: ", who picked out one " },
            { text: "Hit-rates were higher than with random guessing.", rowSpan: 3 },
            { before: "Positive results could be produced by factors such as ", questionNumber: 34, after: " or " },
          ],
          [
            { questionNumber: 32, before: "", after: " from a random selection of four, and a " },
            { before: "", questionNumber: 35, after: "." },
          ],
          [
            { questionNumber: 33, before: "", after: ", who then tried to identify it." },
            { text: "" },
          ],
          [
            { text: "Autoganzfeld studies (1987)", rowSpan: 2 },
            { questionNumber: 36, after: " were used for key tasks to limit the amount of " },
            { before: "The results were then subjected to a ", questionNumber: 38, rowSpan: 2 },
            { before: "The ", questionNumber: 39, after: " between different test results was put down to the fact that sample groups were not " },
          ],
          [
            { questionNumber: 37, before: "", after: " in carrying out the tests." },
            { questionNumber: 40, before: "", after: " (as with most ganzfeld studies)." },
          ],
        ],
      },
    },
  ],
  source: partSource([19, 20], [21, 22]),
};

export const CAMBRIDGE8_TEST1_PARTS: ReadingPart[] = [timePassage, airTrafficPassage, telepathyPassage];

import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  18: [1682, 2341], 19: [1682, 2341], 20: [1682, 2341], 21: [1682, 2341],
  22: [1750, 2341], 23: [1682, 2341], 24: [1682, 2341], 25: [1750, 2341],
  26: [1684, 2341], 27: [1684, 2341], 28: [1684, 2341], 29: [1684, 2341],
  30: [1684, 2341], 122: [1607, 1623],
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
    30: 1322, 31: 2362, 32: 2350, 33: 2364, 34: 2348, 35: 2365,
    40: 934, 41: 2365, 42: 2347, 43: 2367, 44: 2350, 45: 2365,
    50: 553, 51: 2362, 52: 2346, 53: 2367, 54: 2351, 55: 2367, 56: 2351, 57: 2362,
  };
  return {
    page,
    src: "/reading/explanations/cambridge-18-test-1-part" + part + "-exp18-p" + String(page).padStart(3, "0") + ".webp",
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

const urbanFarming: ReadingPart = {
  id: "cambridge-18-test-1-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Urban farming",
  subtitle: "In Paris, urban farmers are trying a soil-free approach to agriculture that uses less space and fewer resources. Could it help cities face the threats to our food supplies?",
  sections: [{
    id: "cambridge-18-test-1-part1-passage",
    format: "pre",
    paragraphs: [
      "On top of a striking new exhibition hall in southern Paris, the world’s largest urban rooftop farm has started to bear fruit. Strawberries that are small, intensely flavoured and resplendently red sprout abundantly from large plastic tubes. Peer inside and you see the tubes are completely hollow, the roots of dozens of strawberry plants dangling down inside them. From identical vertical tubes nearby burst row upon row of lettuces; near those are aromatic herbs, such as basil, sage and peppermint. Opposite, in narrow, horizontal trays packed not with soil but with coconut fibre, grow cherry tomatoes, shiny aubergines and brightly coloured chards.",
      "Pascal Hardy, an engineer and sustainable development consultant, began experimenting with vertical farming and aeroponic growing towers — as the soil-free plastic tubes are known — on his Paris apartment block roof five years ago. The urban rooftop space above the exhibition hall is somewhat bigger: 14,000 square metres and almost exactly the size of a couple of football pitches. Already, the team of young urban farmers who tend it have picked, in one day, 3,000 lettuces and 150 punnets of strawberries. When the remaining two thirds of the vast open area are in production, 20 staff will harvest up to 1,000 kg of perhaps 35 different varieties of fruit and vegetables, every day. ‘We’re not ever, obviously, going to feed the whole city this way,’ cautions Hardy. ‘In the urban environment you’re working with very significant practical constraints, clearly, on what you can do and where. But if enough unused space can be developed like this, there’s no reason why you shouldn’t eventually target maybe between 5% and 10% of consumption.’",
      "Perhaps most significantly, however, this is a real-life showcase for the work of Hardy’s flourishing urban agriculture consultancy, Agripolis, which is currently fielding enquiries from around the world to design, build and equip a new breed of soil-free inner-city farm. ‘The method’s advantages are many,’ he says. ‘First, I don’t much like the fact that most of the fruit and vegetables we eat have been treated with something like 17 different pesticides, or that the intensive farming techniques that produced them are such huge generators of greenhouse gases. I don’t much like the fact, either, that they’ve travelled an average of 2,000 refrigerated kilometres to my plate, that their quality is so poor, because the varieties are selected for their capacity to withstand such substantial journeys, or that 80% of the price I pay goes to wholesalers and transport companies, not the producers.’",
      "Produce grown using this soil-free method, on the other hand — which relies solely on a small quantity of water, enriched with organic nutrients, pumped around a closed circuit of pipes, towers and trays — is ‘produced up here, and sold locally, just down there. It barely travels at all,’ Hardy says. ‘You can select crop varieties for their flavour, not their resistance to the transport and storage chain, and you can pick them when they’re really at their best, and not before.’ No soil is exhausted, and the water that gently showers the plants’ roots every 12 minutes is recycled, so the method uses 90% less water than a classic intensive farm for the same yield.",
      "Urban farming is not, of course, a new phenomenon. Inner-city agriculture is booming from Shanghai to Detroit and Tokyo to Bangkok. Strawberries are being grown in disused shipping containers, mushrooms in underground carparks. Aeroponic farming, he says, is ‘virtuous’. The equipment weighs little, can be installed on almost any flat surface and is cheap to buy: roughly €100 to €150 per square metre. It is cheap to run, too, consuming a tiny fraction of the electricity used by some techniques.",
      "Produce grown this way typically sells at prices that, while generally higher than those of classic intensive agriculture, are lower than soil-based organic growers. There are limits to what farmers can grow this way, of course, and much of the produce is suited to the summer months. ‘Root vegetables we cannot do, at least not yet,’ he says. ‘Radishes are OK, but carrots, potatoes, that kind of thing — the roots are simply too long. Fruit trees are obviously not an option. And beans tend to take up a lot of space for not much return.’ Nevertheless, urban farming of the kind being practised in Paris is one part of a bigger and fast-changing picture that is bringing food production closer to our lives.",
    ],
  }],
  questionBlocks: [
    rawFillBlock(
      "cambridge-18-test-1-part1-questions-1-3",
      "Urban farming in Paris",
      "Complete the sentences below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage for each answer. Write your answers in boxes 1–3 on your answer sheet.",
      "Vertical tubes are used to grow strawberries, 1 ______ and herbs.\n\nThere will eventually be a daily harvest of as much as 2 ______ in weight of fruit and vegetables.\n\nIt may be possible that the farm’s produce will account for as much as 10% of the city’s 3 ______ overall.",
      1,
      3,
    ),
    rawFillBlock(
      "cambridge-18-test-1-part1-questions-4-7",
      "Intensive farming versus aeroponic urban farming",
      "Complete the table below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 4–7 on your answer sheet.",
      "Intensive farming\n• A wide range of 4 ______ used.\n• Techniques chosen that can pollute the air.\n• Varieties chosen that can survive long 5 ______.\n• 80% of overall income goes to wholesalers and transport companies, not the 6 ______.\n\nAeroponic urban farming\n• No soil used.\n• Nutrients added to water, which is recycled.\n• Produce chosen because of its 7 ______.",
      4,
      7,
    ),
    {
      id: "cambridge-18-test-1-part1-questions-8-13",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 8–13 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [8], prompt: "Urban farming can take place above or below ground.", options: trueFalseNotGivenOptions },
        { questionNumbers: [9], prompt: "Some of the equipment used in aeroponic farming can be made by hand.", options: trueFalseNotGivenOptions },
        { questionNumbers: [10], prompt: "Urban farming relies more on electricity than some other types of farming.", options: trueFalseNotGivenOptions },
        { questionNumbers: [11], prompt: "Fruit and vegetables grown on an aeroponic urban farm are cheaper than traditionally grown organic produce.", options: trueFalseNotGivenOptions },
        { questionNumbers: [12], prompt: "Most produce can be grown on an aeroponic urban farm at any time of the year.", options: trueFalseNotGivenOptions },
        { questionNumbers: [13], prompt: "Beans take longer to grow on an urban farm than other vegetables.", options: trueFalseNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [18, 19].map(sourcePage),
    questionPages: [20, 21].map(sourcePage),
    answerPages: [sourcePage(122)],
    explanationPages: [30, 31, 32, 33, 34, 35].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集18精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const forestManagement: ReadingPart = {
  id: "cambridge-18-test-1-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Forest management in Pennsylvania, USA",
  subtitle: "How managing low-quality wood (also known as low-use wood) for bioenergy can encourage sustainable forest management",
  sections: [
    {
      id: "cambridge-18-test-1-part2-section-a",
      heading: "A",
      format: "pre",
      paragraphs: [
        "A tree’s ‘value’ depends on several factors including its species, size, form, condition, quality, function, and accessibility, and depends on the management goals for a given forest. The same tree can be valued very differently by each person who looks at it. A large, straight black cherry tree has high value as timber to be cut into logs or made into furniture, but for a landowner more interested in wildlife habitat, the real value of that stem (or trunk) may be the food it provides to animals. Likewise, if the tree suffers from black knot disease, its value for timber decreases, but to a woodworker interested in making bowls, it brings an opportunity for a unique and beautiful piece of art.",
      ],
    },
    {
      id: "cambridge-18-test-1-part2-section-b",
      heading: "B",
      format: "pre",
      paragraphs: [
        "In the past, Pennsylvania landowners were solely interested in the value of their trees as high-quality timber. The norm was to remove the stems of highest quality and leave behind poorly formed trees that were not as well suited to the site where they grew. This practice, called ‘high-grading’, has left a legacy of ‘low-use wood’ in the forests. Some people even call these ‘junk trees’, and they are abundant in Pennsylvania. These trees have lower economic value for traditional timber markets, compete for growth with higher-value trees, shade out desirable regeneration and decrease the health of a stand* leaving it more vulnerable to poor weather and disease. Management that specifically targets low-use wood can help landowners manage these forest health issues, and wood energy markets help promote this. * Stand: an area covered with trees that have common features (e.g. size).",
      ],
    },
    {
      id: "cambridge-18-test-1-part2-section-c",
      heading: "C",
      format: "pre",
      paragraphs: [
        "Wood energy markets can accept less expensive wood material of lower quality than would be suitable for traditional timber markets. Most wood used for energy in Pennsylvania is used to produce heat or electricity through combustion. Many schools and hospitals use wood boiler systems to heat and power their facilities, many homes are primarily heated with wood, and some coal plants incorporate wood into their coal streams to produce electricity. Wood can also be gasified for electrical generation and can even be made into liquid fuels like ethanol and gasoline for lorries and cars. All these products are made primarily from low-use wood. Several tree- and plant-cutting approaches, which could greatly improve the long-term quality of a forest, focus strongly or solely on the use of wood for those markets.",
      ],
    },
    {
      id: "cambridge-18-test-1-part2-section-d",
      heading: "D",
      format: "pre",
      paragraphs: [
        "One such approach is called a Timber Stand Improvement (TSI) Cut. In a TSI Cut, really poor-quality tree and plant material is cut down to allow more space, light, and other resources to the highest-valued stems that remain. Removing invasive plants might be another primary goal of a TSI Cut. The stems that are left behind might then grow in size and develop more foliage and larger crowns or tops that produce more coverage for wildlife; they have a better chance to regenerate in a less crowded environment. TSI Cuts can be tailored to one farmer’s specific management goals for his or her land.",
      ],
    },
    {
      id: "cambridge-18-test-1-part2-section-e",
      heading: "E",
      format: "pre",
      paragraphs: [
        "Another approach that might yield a high amount of low-use wood is a Salvage Cut. With the many pests and pathogens visiting forests including hemlock wooly adelgid, Asian longhorned beetle, emerald ash borer, and gypsy moth, to name just a few, it is important to remember that those working in the forests can help ease these issues through cutting procedures. These types of cut reduce the number of sick trees and seek to manage the future spread of a pest problem. They leave vigorous trees that have stayed healthy enough to survive the outbreak.",
      ],
    },
    {
      id: "cambridge-18-test-1-part2-section-f",
      heading: "F",
      format: "pre",
      paragraphs: [
        "A Shelterwood Cut, which only takes place in a mature forest that has already been thinned several times, involves removing all the mature trees when other seedlings have become established. This then allows the forester to decide which tree species are regenerated. It leaves a young forest where all trees are at a similar point in their growth. It can also be used to develop a two-tier forest so that there are two harvests and the money that comes in is spread out over a decade or more.",
      ],
    },
    {
      id: "cambridge-18-test-1-part2-section-g",
      heading: "G",
      format: "pre",
      paragraphs: [
        "Thinnings and dense and dead wood removal for fire prevention also center on the production of low-use wood. However, it is important to remember that some retention of what many would classify as low-use wood is very important. The tops of trees that have been cut down should be left on the site so that their nutrients cycle back into the soil. In addition, trees with many cavities are extremely important habitats for insect predators like woodpeckers, bats and small mammals. They help control problem insects and increase the health and resilience of the forest. It is also important to remember that not all small trees are low-use. For example, many species like hawthorn provide food for wildlife. Finally, rare species of trees in a forest should also stay behind as they add to its structural diversity.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-18-test-1-part2-questions-14-18",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has seven paragraphs, A–G. Which paragraph contains the following information? Write the correct letter, A–G, in boxes 14–18 on your answer sheet. NB You may use any letter more than once.",
      questions: [
        { questionNumbers: [14], prompt: "Bad outcomes for a forest when people focus only on its financial reward.", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [15], prompt: "A reference to the aspects of any tree that contribute to its worth.", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [16], prompt: "Mention of the potential use of wood to help run vehicles.", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [17], prompt: "Examples of insects that attack trees.", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
        { questionNumbers: [18], prompt: "An alternative name for trees that produce low-use wood.", options: "ABCDEFG".split("").map((letter) => ({ letter, text: "Paragraph " + letter })) },
      ],
    },
    {
      id: "cambridge-18-test-1-part2-questions-19-21",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following purposes (Questions 19–21) and the list of timber cuts below. Match each purpose with the correct timber cut, A, B or C. Write the correct letter, A, B or C, in boxes 19–21 on your answer sheet. NB You may use any letter more than once.",
      questions: [
        { questionNumbers: [19], prompt: "To remove trees that are diseased.", options: [
          { letter: "A", text: "A TSI Cut" }, { letter: "B", text: "A Salvage Cut" }, { letter: "C", text: "A Shelterwood Cut" },
        ] },
        { questionNumbers: [20], prompt: "To generate income across a number of years.", options: [
          { letter: "A", text: "A TSI Cut" }, { letter: "B", text: "A Salvage Cut" }, { letter: "C", text: "A Shelterwood Cut" },
        ] },
        { questionNumbers: [21], prompt: "To create a forest whose trees are close in age.", options: [
          { letter: "A", text: "A TSI Cut" }, { letter: "B", text: "A Salvage Cut" }, { letter: "C", text: "A Shelterwood Cut" },
        ] },
      ],
    },
    rawFillBlock(
      "cambridge-18-test-1-part2-questions-22-26",
      "Forest management in Pennsylvania",
      "Complete the sentences below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 22–26 on your answer sheet.",
      "22 Some dead wood is removed to avoid the possibility of ______.\n\n23 The ______ from the tops of cut trees can help improve soil quality.\n\n24 Some damaged trees should be left, as their ______ provide habitats for a range of creatures.\n\n25 Some trees that are small, such as ______, are a source of food for animals and insects.\n\n26 Any trees that are ______ should be left to grow, as they add to the variety of species in the forest.",
      22,
      26,
    ),
  ],
  source: {
    passagePages: [22, 23].map(sourcePage),
    questionPages: [24, 25, 26].map(sourcePage),
    answerPages: [sourcePage(122)],
    explanationPages: [40, 41, 42, 43, 44, 45].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集18精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const spaceJunk: ReadingPart = {
  id: "cambridge-18-test-1-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Conquering Earth’s space junk problem",
  subtitle: "Satellites, rocket shards and collision debris are creating major traffic risks in orbit around the planet. Researchers are working to reduce these threats",
  sections: [
    {
      id: "cambridge-18-test-1-part3-section-a",
      heading: "A",
      format: "pre",
      paragraphs: [
        "Last year, commercial companies, military and civil departments and amateurs sent more than 400 satellites into orbit, over four times the yearly average in the previous decade. Numbers could rise even more sharply if leading space companies follow through on plans to deploy hundreds to thousands of large constellations of satellites to space in the next few years.",
        "All that traffic can lead to disaster. Ten years ago, a US commercial Iridium satellite smashed into an inactive Russian communications satellite called Cosmos-2251, creating thousands of new pieces of space shrapnel that now threaten other satellites in low Earth orbit — the zone stretching up to 2,000 kilometres in altitude. Altogether, there are roughly 20,000 human-made objects in orbit, from working satellites to small rocket pieces. And satellite operators can’t steer away from every potential crash, because each move consumes time and fuel that could otherwise be used for the spacecraft’s main job.",
      ],
    },
    {
      id: "cambridge-18-test-1-part3-section-b",
      heading: "B",
      format: "pre",
      paragraphs: [
        "Concern about space junk goes back to the beginning of the satellite era, but the number of objects in orbit is rising so rapidly that researchers are investigating new ways of attacking the problem. Several teams are trying to improve methods for assessing what is in orbit, so that satellite operators can work more efficiently in ever-more-crowded space. Some researchers are now starting to compile a massive data set that includes the best possible information on where everything is in orbit. Others are developing taxonomies of space debris — working on measuring properties such as the shape and size of an object, so that satellite operators know how much to worry about what’s coming their way.",
        "The alternative, many say, is unthinkable. Just a few uncontrolled space crashes could generate enough debris to set off a runaway cascade of fragments, rendering near-Earth space unusable. ‘If we go on like this, we will reach a point of no return,’ says Carolin Frueh, an astrodynamical researcher at Purdue University in West Lafayette, Indiana.",
      ],
    },
    {
      id: "cambridge-18-test-1-part3-section-c",
      heading: "C",
      format: "pre",
      paragraphs: [
        "Even as our ability to monitor space objects increases, so too does the total number of items in orbit. That means companies, governments and other players in space are collaborating in new ways to avoid a shared threat. International groups such as the Inter-Agency Space Debris Coordination Committee have developed guidelines on space sustainability. Those include inactivating satellites at the end of their useful life by venting pressurised materials or leftover fuel that might lead to explosions. The intergovernmental groups also advise lowering satellites deep enough into the atmosphere that they will burn up or disintegrate within 25 years. But so far, only about half of all missions have abided by this 25-year goal, says Holger Krag, head of the European Space Agency’s space-debris office in Darmstadt, Germany. Operators of the planned large constellations of satellites say they will be responsible stewards in their enterprises in space, but Krag worries that problems could increase, despite their best intentions. ‘What happens to those that fail or go bankrupt?’ he asks. ‘They are probably not going to spend money to remove their satellites from space.’",
      ],
    },
    {
      id: "cambridge-18-test-1-part3-section-d",
      heading: "D",
      format: "pre",
      paragraphs: [
        "In theory, given the vastness of space, satellite operators should have plenty of room for all these missions to fly safely without ever nearing another object. So some scientists are tackling the problem of space junk by trying to find out where all the debris is to a high degree of precision. That would alleviate the need for many of the unnecessary manoeuvres that are carried out to avoid potential collisions. ‘If you knew precisely where everything was, you would almost never have a problem,’ says Marlon Sorge, a space-debris specialist at the Aerospace Corporation in El Segundo, California.",
      ],
    },
    {
      id: "cambridge-18-test-1-part3-section-e",
      heading: "E",
      format: "pre",
      paragraphs: [
        "The field is called space traffic management, because it’s similar to managing traffic on the roads or in the air. Think about a busy day at an airport, says Moriba Jah, an astrodynamicist at the University of Texas at Austin: planes line up in the sky, landing and taking off close to one another in a carefully choreographed routine. Air-traffic controllers know the location of the planes down to one metre in accuracy. The same can’t be said for space debris. Not all objects in orbit are known, and even those included in databases are not tracked consistently.",
      ],
    },
    {
      id: "cambridge-18-test-1-part3-section-f",
      heading: "F",
      format: "pre",
      paragraphs: [
        "An additional problem is that there is no authoritative catalogue that accurately lists the orbits of all known space debris. Jah illustrates this with a web-based database that he has developed. It draws on several sources, such as catalogues maintained by the US and Russian governments, to visualise where objects are in space. When he types in an identifier for a particular space object, the database draws a purple line to designate its orbit. Only this doesn’t quite work for a number of objects, such as a Russian rocket body designated in the database as object number 32280. When Jah enters that number, the database draws two purple lines: the US and Russian sources contain two completely different orbits for the same object. Jah says that it is almost impossible to tell which is correct, unless a third source of information made it possible to cross-correlate.",
        "Jah describes himself as a space environmentalist: ‘I want to make space a place that is safe to operate, that is free and useful for generations to come.’ Until that happens, he argues, the space community will continue devolving into a tragedy in which all spaceflight operators are polluting a common resource.",
      ],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-18-test-1-part3-questions-27-31",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 3 has six sections, A–F. Which section contains the following information? Write the correct letter, A–F, in boxes 27–31 on your answer sheet. NB You may use any letter more than once.",
      questions: [
        { questionNumbers: [27], prompt: "A reference to the cooperation that takes place to try and minimise risk.", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [28], prompt: "An explanation of a person’s aims.", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [29], prompt: "A description of a major collision that occurred in space.", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [30], prompt: "A comparison between tracking objects in space and the efficiency of a transportation system.", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Section " + letter })) },
        { questionNumbers: [31], prompt: "A reference to efforts to classify space junk.", options: "ABCDEF".split("").map((letter) => ({ letter, text: "Section " + letter })) },
      ],
    },
    rawFillBlock(
      "cambridge-18-test-1-part3-questions-32-35",
      "The Inter-Agency Space Debris Coordination Committee",
      "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 32–35 on your answer sheet.",
      "The Inter-Agency Space Debris Coordination Committee\n\nThe committee gives advice on how the 32 ______ of space can be achieved. The committee advises that when satellites are no longer active, any unused 33 ______ or pressurised material that could cause 34 ______ should be removed.\n\nAlthough operators of large satellite constellations accept that they have obligations as stewards of space, Holger Krag points out that the operators that become 35 ______ are unlikely to prioritise removing their satellites from space.",
      32,
      35,
    ),
    {
      id: "cambridge-18-test-1-part3-questions-36-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following statements (Questions 36–40) and the list of people below. Match each statement with the correct person, A, B, C or D. Write the correct letter, A, B, C or D, in boxes 36–40 on your answer sheet. NB You may use any letter more than once.",
      questions: [
        { questionNumbers: [36], prompt: "Knowing the exact location of space junk would help prevent any possible danger.", options: [
          { letter: "A", text: "Carolin Frueh" }, { letter: "B", text: "Holger Krag" }, { letter: "C", text: "Marlon Sorge" }, { letter: "D", text: "Moriba Jah" },
        ] },
        { questionNumbers: [37], prompt: "Space should be available to everyone and should be preserved for the future.", options: [
          { letter: "A", text: "Carolin Frueh" }, { letter: "B", text: "Holger Krag" }, { letter: "C", text: "Marlon Sorge" }, { letter: "D", text: "Moriba Jah" },
        ] },
        { questionNumbers: [38], prompt: "A recommendation regarding satellites is widely ignored.", options: [
          { letter: "A", text: "Carolin Frueh" }, { letter: "B", text: "Holger Krag" }, { letter: "C", text: "Marlon Sorge" }, { letter: "D", text: "Moriba Jah" },
        ] },
        { questionNumbers: [39], prompt: "There is conflicting information about where some satellites are in space.", options: [
          { letter: "A", text: "Carolin Frueh" }, { letter: "B", text: "Holger Krag" }, { letter: "C", text: "Marlon Sorge" }, { letter: "D", text: "Moriba Jah" },
        ] },
        { questionNumbers: [40], prompt: "There is a risk we will not be able to undo the damage that occurs in space.", options: [
          { letter: "A", text: "Carolin Frueh" }, { letter: "B", text: "Holger Krag" }, { letter: "C", text: "Marlon Sorge" }, { letter: "D", text: "Moriba Jah" },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [27, 28].map(sourcePage),
    questionPages: [29, 30].map(sourcePage),
    answerPages: [sourcePage(122)],
    explanationPages: [50, 51, 52, 53, 54, 55, 56, 57].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集18精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE18_TEST1_PARTS: ReadingPart[] = [urbanFarming, forestManagement, spaceJunk];

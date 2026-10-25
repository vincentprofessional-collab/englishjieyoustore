import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  83: [1536, 2218], 84: [1664, 2218], 85: [1525, 2205], 86: [1567, 2236],
  87: [1702, 2269], 88: [1708, 2238], 89: [1550, 2261], 90: [1590, 2215],
  91: [1654, 2300], 92: [1523, 2203], 93: [1620, 2206], 94: [1704, 2203],
  95: [1557, 2296], 127: [1505, 1648],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1500, 2240];
  return {
    page,
    src: "/reading/source-pages/ci20-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
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

const paragraphs = (letters: string) => letters.split("").map((letter) => ({
  letter,
  text: "Paragraph " + letter,
}));

const georgiaOkeeffe: ReadingPart = {
  id: "cambridge-20-test-4-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Georgia O'Keeffe",
  sections: [{
    id: "cambridge-20-test-4-part1-passage",
    format: "pre",
    paragraphs: [
      "For seven decades, Georgia O’Keeffe (1887–1986) was a major figure in American art. Remarkably, she remained independent from shifting art trends and her work stayed true to her own vision, which was based on finding the essential, abstract forms in nature. With exceptionally keen powers of observation and great finesse with a paintbrush, she recorded subtle nuances of colour, shape, and light that enlivened her paintings and attracted a wide audience.",
      "Born in 1887 near Sun Prairie, Wisconsin, to cattle breeders Francis and Ida O’Keeffe, Georgia was raised on their farm along with her six siblings. By the time she graduated from high school in 1905, she had determined to make her way as an artist. She studied the techniques of traditional painting at the Art Institute of Chicago school (1905) and the Art Students League of New York (1907–8). After attending university and then training college, she became an art teacher and taught in elementary schools, high schools, and colleges in Virginia, Texas, and South Carolina from 1911 to 1918.",
      "During this period, O’Keeffe began to experiment with creating abstract compositions in charcoal, and produced a series of innovative drawings that led her art in a new direction. She sent some of these drawings to a friend in New York, who showed them to art collector and photographer Alfred Stieglitz in January 1916. Stieglitz was impressed, and exhibited the drawings later that year at his gallery on Fifth Avenue, New York City, where the works of many avant-garde artists and photographers were introduced to the American public.",
      "With Stieglitz’s encouragement and promise of financial support, O’Keeffe arrived in New York in June 1918 to begin a career as an artist. For the next three decades, Stieglitz vigorously promoted her work in twenty-two solo exhibitions and numerous group installations. The two were married in 1924. The ups and downs of their personal and professional relationship were recorded in Stieglitz’s celebrated black-and-white portraits of O’Keeffe, taken over the course of twenty years (1917–37).",
      "By the mid-1920s, O’Keeffe was recognised as one of America’s most important and successful artists, widely known for the architectural pictures that dramatically depict the soaring skyscrapers of New York. But most often, she painted botanical subjects, inspired by annual trips to the Stieglitz family summer home. In her magnified images depicting flowers, begun in 1924, O’Keeffe brings the viewer right into the picture. Enlarging the tiniest details to fill an entire metre-wide canvas emphasised their shapes and lines and made them appear abstract. Such daring compositions helped establish O’Keeffe’s reputation as an innovative modernist.",
      "In 1929, O’Keeffe made her first extended trip to the state of New Mexico. It was a visit that had a lasting impact on her life, and an immediate effect on her work. Over the next two decades she made almost annual trips to New Mexico, staying up to six months there, painting in relative solitude, then returning to New York each winter to exhibit the new work at Stieglitz’s gallery. This pattern continued until she moved permanently to New Mexico in 1949.",
      "There, O’Keeffe found new inspiration: at first, it was the numerous sun-bleached bones she came across in the state’s rugged terrain that sparked her imagination. Two of her earliest and most celebrated Southwestern paintings exquisitely reproduce a cow skull’s weathered surfaces, jagged edges, and irregular openings. Later, she also explored another variation on this theme in her large series of Pelvis pictures, which focused on the contrasts between convex and concave surfaces, and solid and open spaces.",
      "However, it was the region’s spectacular landscape, with its unusual geological formations, vivid colours, clarity of light, and exotic vegetation, that held the artist’s imagination for more than four decades. Often, she painted the rocks, cliffs, and mountains in striking close-up, just as she had done with her botanical subjects.",
      "O’Keeffe eventually owned two homes in New Mexico — the first, her summer retreat at Ghost Ranch, was nestled beneath 200-metre cliffs, while the second, used as her winter residence, was in the small town of Abiquiú. While both locales provided a wealth of imagery for her paintings, one feature of the Abiquiú house — the large walled patio with its black door — was particularly inspirational. In more than thirty pictures between 1946 and 1960, she reinvented the patio into an abstract arrangement of geometric shapes.",
      "From the 1950s into the 1970s, O’Keeffe travelled widely, making trips to Asia, the Middle East, and Europe. Flying in planes inspired her last two major series — aerial views of rivers and expansive paintings of the sky viewed from just above clouds.",
      "In both series, O’Keeffe increased the size of her canvases, sometimes to mural proportions, reflecting perhaps her newly expanded view of the world. When in 1965 she successfully translated one of her cloud motifs to a monumental canvas measuring 6 metres in length (with the help of assistants), it was an enormous challenge and a special feat for an artist nearing eighty years of age.",
      "The last two decades of the artist’s life were relatively unproductive as ill health and blindness hindered her ability to work. O’Keeffe died in 1986 at the age of ninety-eight, but her rich legacy of some 900 paintings has continued to attract subsequent generations of artists and art lovers who derive inspiration from these very American images.",
    ],
  }],
  questionBlocks: [
    rawFillBlock(
      "cambridge-20-test-4-part1-questions-1-7",
      "The life and work of Georgia O’Keeffe",
      "Complete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 1–7 on your answer sheet.",
      "The life and work of Georgia O’Keeffe\n\n• studied art, then worked as a 1 ______ in various places in the USA\n• created drawings using 2 ______ which were exhibited in New York City\n• moved to New York and became famous for her paintings of the city’s 3 ______\n• produced a series of innovative close-up paintings of 4 ______\n• went to New Mexico and was initially inspired to paint the many 5 ______ that could be found there\n• continued to paint various features that together formed the dramatic 6 ______ of New Mexico for over forty years\n• travelled widely by plane in later years, and painted pictures of clouds and 7 ______ seen from above",
      1,
      7,
    ),
    {
      id: "cambridge-20-test-4-part1-questions-8-13",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 8–13 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [8], prompt: "Georgia O’Keeffe’s style was greatly influenced by the changing fashions in art over the seven decades of her career.", options: trueFalseNotGivenOptions },
        { questionNumbers: [9], prompt: "When O’Keeffe finished high school, she had already made her mind up about the career that she wanted.", options: trueFalseNotGivenOptions },
        { questionNumbers: [10], prompt: "Alfred Stieglitz first discovered O’Keeffe’s work when she sent some abstract drawings to his gallery in New York City.", options: trueFalseNotGivenOptions },
        { questionNumbers: [11], prompt: "O’Keeffe was the subject of Stieglitz’s photographic work for many years.", options: trueFalseNotGivenOptions },
        { questionNumbers: [12], prompt: "O’Keeffe’s paintings of the patio of her house in Abiquiú were among the artist’s favourite works.", options: trueFalseNotGivenOptions },
        { questionNumbers: [13], prompt: "O’Keeffe produced a greater quantity of work during the 1950s to 1970s than at any other time in her life.", options: trueFalseNotGivenOptions },
      ],
    },
  ],
  source: {
    passagePages: [83, 84].map(sourcePage),
    questionPages: [85, 86].map(sourcePage),
    answerPages: [sourcePage(127)],
  },
};

const adaptingToClimateChange: ReadingPart = {
  id: "cambridge-20-test-4-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Adapting to the effects of climate change",
  sections: [{
    id: "cambridge-20-test-4-part2-passage",
    format: "pre",
    paragraphs: [
      "A  All around the world, nations are already preparing for, and adapting to, climate change and its impacts. Even if we stopped all CO₂ emissions tomorrow, we would continue to see the impact of the CO₂ already released since industrial times, with scientists forecasting that global warming would continue for around 40 years. In the meantime, ice caps would continue to melt and sea levels rise. Some countries and regions will suffer more extreme impacts from these changes than others. It’s in these places that innovation is thriving.",
      "B  In Miami Beach, Florida, USA, seawater isn’t just breaching the island city’s walls, it’s seeping up through the ground, so the only way to save the city is to lift it up above sea level. Starting in the lowest and most vulnerable neighbourhoods, roads have been raised by as much as 61 centimetres. The elevation work was carried out as part of Miami Beach’s ambitious but much-needed stormwater-management programme. In addition to the road adaptations, the city has set up new pumps that can remove up to 75,000 litres of water per minute. In the face of floods, climate-mitigation strategies have often been overlooked, says Yanira Pineda, a senior sustainability coordinator. She knows that they’re essential and that the job is far from over. ‘We know that in 20, 30, 40 years, we’ll need to go back in there and adjust to the changing environment,’ she says.",
      "C  Seawalls are a staple strategy for many coastal communities, but on the soft, muddy northern shores of Java, Indonesia, they frequently collapse, further exacerbating coastal erosion. There have been many attempts to restore the island’s coastal mangroves: ecosystems of trees and shrubs that help defend coastal areas by trapping sediment in their net-like root systems, elevating the sea bed and dampening the energy of waves and tidal currents. But Susanna Tol of the not-for-profit organisation Wetlands International says that, while hugely popular, the majority of mangrove-planting projects fail. So, Wetlands International started out with a different approach, building semi-permeable dams, made from bamboo poles and brushwood, to mimic the role of mangrove roots and create favourable conditions for mangroves to grow back naturally. The programme has seen moderate success, mainly in areas with less subsidence. ‘Unfortunately, traditional infrastructure is often single-solution focused,’ says Tol. ‘For long-term success, it’s critical that we transition towards multifunctional approaches that embed natural processes and that engage and benefit communities and local decision-makers.’",
      "D  As the floodwaters rose in the rice fields of the Mekong Delta in September 2018, four small houses rose with them. Homes in this part of Vietnam are traditionally built on stilts but these ones had been built to float. The modifications were made by the Buoyant Foundation Project, a not-for-profit organisation that has been researching and retrofitting amphibious houses since 2006. ‘When I started this,’ explains founder Elizabeth English, ‘climate change was not on the tip of everybody’s tongue, but this technology is becoming necessary in places that didn’t previously need it.’ It’s much cheaper than permanently elevating houses, English explains — about a third of what it would cost to completely replace a building’s foundations. It also avoids the problem of taller houses being at greater risk from wind damage. Another plus comes from the fact that amphibious structures can be sensitively adapted to meet cultural needs and match the kind of houses that are already common in a community.",
      "E  Bangladesh is especially vulnerable to climate change. Most of the country is less than a metre above sea level and 80 per cent of its land lies on floodplains. ‘Almost 35 million people living on the coastal belt of Bangladesh are currently affected by soil and water salinity,’ says Raisa Chowdhury of the international development organisation ICCO Cooperation. Rather than fighting against it, one project is helping communities adapt to salt-affected soils. ICCO Cooperation has been working with 10,000 farmers in Bangladesh to start cultivating naturally salt-tolerant crops in the region. Certain varieties of carrot, potato, kohlrabi, cabbage and beetroot have been found to be better suited to salty soil than the rice and wheat that is typically grown there. Chowdhury says that the results are very visible, comparing a barren plot of land to the ‘beautiful, lush green vegetable garden’ sitting beside it, in which he and his team have been working with the farmers. Since the project began, farmers trained in saline agriculture have reported increases of two to three more harvests per year.",
      "F  Greg Spotts from Los Angeles (LA) in the USA is chief sustainability officer of the city’s street services department. He leads the Cool Streets LA programme, a series of pilot projects, which include the planting of trees and the installation of a ‘cool pavement’ system, designed to help reach the city’s goal of bringing down its average temperature by 1.5°C. ‘Urban cooling is literally a matter of life and death for our future in LA,’ says Spotts. Using a Geographic Information System data mapping tool, the programme identified streets with low tree canopy cover in three of the city’s neighbourhoods and covered them with a light-grey, light-reflecting coating, which had already been shown to lower road surface temperature in Los Angeles by 6°C. Spotts says one of these streets, in the Winnetka neighbourhood of San Fernando Valley, can now be seen as a pale crescent, the only cool spot on an otherwise red thermal image, from the International Space Station.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-20-test-4-part2-questions-14-17",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has six paragraphs, A–F. Which paragraph contains the following information? Write the correct letter, A–F, in boxes 14–17 on your answer sheet.",
      questions: [
        { questionNumbers: [14], prompt: "How a type of plant functions as a natural protection for coastlines", options: paragraphs("ABCDEF") },
        { questionNumbers: [15], prompt: "A prediction about how long it could take to stop noticing the effects of climate change", options: paragraphs("ABCDEF") },
        { questionNumbers: [16], prompt: "A reference to the fact that a solution is particularly cost-effective", options: paragraphs("ABCDEF") },
        { questionNumbers: [17], prompt: "A mention of a technology used to locate areas most in need of intervention", options: paragraphs("ABCDEF") },
      ],
    },
    rawFillBlock(
      "cambridge-20-test-4-part2-questions-18-22",
      "Adapting to climate change",
      "Complete the sentences below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 18–22 on your answer sheet.",
      "18 The stormwater-management programme in Miami Beach has involved the installation of efficient ______.\n\n19 The construction of ______ was the first stage of a project to ensure the success of mangroves in Indonesia.\n\n20 As a response to rising floodwaters in the Mekong Delta, a not-for-profit organisation has been building houses that can ______.\n\n21 Rising sea levels in Bangladesh have made it necessary to introduce various ______ that are suitable for areas of high salt content.\n\n22 A project in LA has increased the number of ______ on the city’s streets.",
      18,
      22,
    ),
    {
      id: "cambridge-20-test-4-part2-questions-23-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following statements (Questions 23–26) and the list of people below. Match each statement with the correct person, A–E. Write the correct letter, A–E, in boxes 23–26 on your answer sheet.",
      questions: [
        { questionNumbers: [23], prompt: "It is essential to adopt strategies which involve and help residents of the region.", options: [
          { letter: "A", text: "Yanira Pineda" }, { letter: "B", text: "Susanna Tol" }, { letter: "C", text: "Elizabeth English" }, { letter: "D", text: "Raisa Chowdhury" }, { letter: "E", text: "Greg Spotts" },
        ] },
        { questionNumbers: [24], prompt: "Interventions which reduce heat are absolutely vital for our survival in this location.", options: [
          { letter: "A", text: "Yanira Pineda" }, { letter: "B", text: "Susanna Tol" }, { letter: "C", text: "Elizabeth English" }, { letter: "D", text: "Raisa Chowdhury" }, { letter: "E", text: "Greg Spotts" },
        ] },
        { questionNumbers: [25], prompt: "More work will need to be done in future decades to deal with the impact of rising water levels.", options: [
          { letter: "A", text: "Yanira Pineda" }, { letter: "B", text: "Susanna Tol" }, { letter: "C", text: "Elizabeth English" }, { letter: "D", text: "Raisa Chowdhury" }, { letter: "E", text: "Greg Spotts" },
        ] },
        { questionNumbers: [26], prompt: "The number of locations requiring action to adapt to flooding has grown in recent years.", options: [
          { letter: "A", text: "Yanira Pineda" }, { letter: "B", text: "Susanna Tol" }, { letter: "C", text: "Elizabeth English" }, { letter: "D", text: "Raisa Chowdhury" }, { letter: "E", text: "Greg Spotts" },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [87, 88].map(sourcePage),
    questionPages: [89, 90].map(sourcePage),
    answerPages: [sourcePage(127)],
  },
};

const livestockGuardDogs: ReadingPart = {
  id: "cambridge-20-test-4-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "A new role for livestock guard dogs",
  subtitle: "Livestock guard dogs, traditionally used to protect farm animals from predators, are now being used to protect the predators themselves",
  sections: [{
    id: "cambridge-20-test-4-part3-passage",
    format: "pre",
    paragraphs: [
      "A  For thousands of years, livestock guard dogs worked alongside shepherds to protect their sheep, goats and cattle from predators such as wolves and bears. But in the 19th and 20th centuries, when such predators were largely exterminated, most guard dogs lost their jobs. In recent years, however, as increased efforts have been made to protect wild animals, predators have become more widespread again. As a result, farmers once more need to protect their livestock, and guard dogs are enjoying an unexpected revival.",
      "B  Today there are around 50 breeds of guard dogs on duty in various parts of the world. These dogs are raised from an early age with the animals they will be watching and eventually these animals become the dog’s family. The dogs will place themselves between the livestock and any threat, barking loudly. If necessary, they will chase away predators, but often their mere presence is sufficient. ‘Their initial training is to make them understand that livestock is going to be their life,’ says Dan Macon, a shepherd with three guard dogs. ‘A fluffy white puppy is fun to be around, but too much human affection makes it a great dog for guarding the front porch, rather than a great livestock guard dog.’",
      "C  The evidence indicates that guard dogs are highly effective. For example, in Portugal, biologist Silvia Ribeiro has found that more than 90 per cent of the farmers participating in a programme to train and use guard dogs to protect their herds against attack from wolves rate the performance of the dogs as very good or excellent. In a study carried out in Australia by Linda van Bommel and Chris Johnson at the University of Tasmania, more than 65 per cent of herders reported that predation stopped completely after they got the dogs, and almost all the rest saw a decrease in attacks. ‘If they are managed and used properly, livestock guard dogs are the most efficient control method that we have in terms of the amount of livestock that they save from predation,’ says van Bommel.",
      "D  But today’s guard dogs also have a new role — to help preserve the predators. It is hoped that reductions in livestock losses can make farmers more tolerant of predators and less likely to kill them. In Namibia, more than 90 per cent of cheetahs live outside protected areas, close to humans raising livestock. As a result, the cheetahs are often held responsible for animal losses, and large numbers have been killed by farmers. When guard dogs were introduced, more than 90 per cent of farmers reported a dramatic reduction in livestock losses, and said that as a result they were less likely to kill predators. Julie Young, at Utah State University in the US, believes this result applies widely. ‘There is common ground from the livestock perspective and from the conservation perspective,’ she says. ‘If ranchers don’t have a dead cow, they will not make a call to apply for a permit to kill a wolf.’",
      "E  Looking at all the published evidence, Bethany Smith at Nottingham Trent University in the UK found that up to 88 per cent of farmers said they no longer killed predators after using dogs — but warned that such self-reported results must be taken with a pinch of salt. What’s more, it is possible that livestock guard dogs merely displace predators to unprotected neighbouring properties, where their fate isn’t recorded. ‘In some regions, we work with almost every farmer, but in others only one or two have dogs,’ says Ribeiro. ‘If we are not working with everybody, we are transferring the wolf pressure to the neighbour’s herd and he can use poison and kill an entire pack of wolves.’",
      "F  Another concern is whether there may be unintended ecological effects of using guard dogs. Studies suggest that reducing deaths of one type of predator may have a negative impact on other species. The extent of this problem isn’t known, but the consequences are clear in Namibia. Cheetahs aren’t the only species that cause sheep and goat losses there: other predators also attack livestock. In 2015, researchers reported that in spite of the impact farmers obtaining guard dogs had on cheetahs, the number of jackals killed by dogs and people actually increased. Guard dogs have other ecological impacts too. They have been found to spread diseases to wild animals, including endangered Ethiopian wolves. They may also compete with other carnivores for food. And by creating a ‘landscape of fear’, their mere presence can influence the behaviour of prey animals.",
      "G  The evidence so far, however, indicates that these consequences aren’t always negative. Guard dogs can deliver unexpected benefits by protecting vulnerable wildlife from predators. For example, their presence has been found to protect birds which build their nests on the ground in fields, where foxes would normally raid them. Indeed, Australian researchers are now using dogs to enhance biodiversity and create refuges for species threatened by predation. So if we can get this right, there may be a bright future for guard dogs in promoting harmonious coexistence between humans and wildlife.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-20-test-4-part3-questions-27-31",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 3 has seven paragraphs, A–G. Which paragraph contains the following information? Write the correct letter, A–G, in boxes 27–31 on your answer sheet. You may use any letter more than once.",
      questions: [
        { questionNumbers: [27], prompt: "An example of how one predator has been protected by the introduction of livestock guard dogs", options: paragraphs("ABCDEFG") },
        { questionNumbers: [28], prompt: "An optimistic suggestion about the possible positive developments in the use of livestock guard dogs", options: paragraphs("ABCDEFG") },
        { questionNumbers: [29], prompt: "A description of how the methods used by livestock guard dogs help to keep predators away", options: paragraphs("ABCDEFG") },
        { questionNumbers: [30], prompt: "Claims by different academics that the use of livestock guard dogs is a successful way of protecting farmers’ herds", options: paragraphs("ABCDEFG") },
        { questionNumbers: [31], prompt: "A reference to how livestock guard dogs gain their skills", options: paragraphs("ABCDEFG") },
      ],
    },
    {
      id: "cambridge-20-test-4-part3-questions-32-36",
      type: "choice",
      sharedOptions: true,
      instruction: "Look at the following statements (Questions 32–36) and the list of people below. Match each statement with the correct person, A–E. Write the correct letter, A–E, in boxes 32–36 on your answer sheet.",
      questions: [
        { questionNumbers: [32], prompt: "The use of guard dogs may save the lives of both livestock and wild animals.", options: [
          { letter: "A", text: "Dan Macon" }, { letter: "B", text: "Silvia Ribeiro" }, { letter: "C", text: "Linda van Bommel" }, { letter: "D", text: "Julie Young" }, { letter: "E", text: "Bethany Smith" },
        ] },
        { questionNumbers: [33], prompt: "Claims of a change in behaviour from those using livestock guard dogs may not be totally accurate.", options: [
          { letter: "A", text: "Dan Macon" }, { letter: "B", text: "Silvia Ribeiro" }, { letter: "C", text: "Linda van Bommel" }, { letter: "D", text: "Julie Young" }, { letter: "E", text: "Bethany Smith" },
        ] },
        { questionNumbers: [34], prompt: "There may be negative results if the use of livestock guard dogs is not sufficiently widespread.", options: [
          { letter: "A", text: "Dan Macon" }, { letter: "B", text: "Silvia Ribeiro" }, { letter: "C", text: "Linda van Bommel" }, { letter: "D", text: "Julie Young" }, { letter: "E", text: "Bethany Smith" },
        ] },
        { questionNumbers: [35], prompt: "Livestock guard dogs are the best way of protecting farm animals, as long as the dogs are appropriately handled.", options: [
          { letter: "A", text: "Dan Macon" }, { letter: "B", text: "Silvia Ribeiro" }, { letter: "C", text: "Linda van Bommel" }, { letter: "D", text: "Julie Young" }, { letter: "E", text: "Bethany Smith" },
        ] },
        { questionNumbers: [36], prompt: "Teaching a livestock guard dog how to do its work needs a different focus from teaching a house guard dog.", options: [
          { letter: "A", text: "Dan Macon" }, { letter: "B", text: "Silvia Ribeiro" }, { letter: "C", text: "Linda van Bommel" }, { letter: "D", text: "Julie Young" }, { letter: "E", text: "Bethany Smith" },
        ] },
      ],
    },
    rawFillBlock(
      "cambridge-20-test-4-part3-questions-37-40",
      "Unintended ecological effects of using guard dogs",
      "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 37–40 on your answer sheet.",
      "Unintended ecological effects of using guard dogs\n\nIn Namibia, livestock guard dogs have been used to protect domestic animals from attacks by cheetahs. This has led to a rise in the deaths of other predators, particularly 37 ______. In addition, it has been suggested that the dogs could have 38 ______ which may affect other species, and that they may reduce the amount of 39 ______ available to certain wild animals.\n\nOn the other hand, these dogs may help birds by protecting their nests. These might otherwise be threatened by predators such as 40 ______.",
      37,
      40,
    ),
  ],
  source: {
    passagePages: [91, 92].map(sourcePage),
    questionPages: [93, 94, 95].map(sourcePage),
    answerPages: [sourcePage(127)],
  },
};

export const CAMBRIDGE20_TEST4_PARTS: ReadingPart[] = [georgiaOkeeffe, adaptingToClimateChange, livestockGuardDogs];

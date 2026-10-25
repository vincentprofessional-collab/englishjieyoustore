import type { ReadingPart, ReadingOption } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  61: [1750, 2299], 62: [1750, 2299], 63: [1750, 2299], 64: [1750, 2299],
  65: [1750, 2299], 66: [1750, 2299], 67: [1750, 2299], 68: [1750, 2299],
  69: [1750, 2299], 70: [1750, 2299], 71: [1750, 2299], 72: [1750, 2299],
  126: [1750, 1664],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1750, 2299];
  return {
    page,
    src: "/reading/source-pages/ci16-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = {
    147: 763, 148: 2304, 149: 2312, 150: 2305, 151: 2309,
    156: 1063, 157: 2311, 158: 2304, 159: 2314, 160: 2306,
    165: 1877, 166: 2306, 167: 2312, 168: 2305, 169: 2312, 170: 2306,
  };
  return {
    page,
    src: "/reading/explanations/cambridge-16-test-3-part" + part + "-exp16-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2300,
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

function sectionOptions(last: string): ReadingOption[] {
  return Array.from({ length: last.charCodeAt(0) - 64 }, (_, index) => {
    const letter = String.fromCharCode(65 + index);
    return { letter, text: "Section " + letter };
  });
}

const trueFalseNotGivenOptions = [
  { letter: "TRUE", text: "The statement agrees with the information." },
  { letter: "FALSE", text: "The statement contradicts the information." },
  { letter: "NOT GIVEN", text: "There is no information on this." },
];

const romanShips: ReadingPart = {
  id: "cambridge-16-test-3-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "Roman shipbuilding and navigation",
  sections: [{
    id: "cambridge-16-test-3-part1-passage",
    format: "pre",
    paragraphs: [
      "Shipbuilding today is based on science and ships are built using computers and sophisticated tools. Shipbuilding in ancient Rome, however, was more of an art relying on estimation, inherited techniques and personal experience. The Romans were not traditionally sailors but mostly land-based people, who learned to build ships from the people that they conquered, namely the Greeks and the Egyptians.",
      "There are a few surviving written documents that give descriptions and representations of ancient Roman ships, including the sails and rigging. Excavated vessels also provide some clues about ancient shipbuilding techniques. Studies of these have taught us that ancient Roman shipbuilders built the outer hull first, then proceeded with the frame and the rest of the ship. Planks used to build the outer hull were initially sewn together. Starting from the 6th century BCE, they were fixed using a method called mortise and tenon, whereby one plank locked into another without the need for stitching. Then in the first centuries of the current era, Mediterranean shipbuilders shifted to another shipbuilding method, still in use today, which consisted of building the frame first and then proceeding with the hull and the other components of the ship. This method was more systematic and dramatically shortened ship construction times. The ancient Romans built large merchant ships and warships whose size and technology were unequalled until the 16th century CE.",
      "Warships were built to be lightweight and very speedy. They had to be able to sail near the coast, which is why they had no ballast or excess load and were built with a long, narrow hull. They did not sink when damaged and often would lie crippled on the sea’s surface following naval battles. They had a bronze battering ram, which was used to pierce the timber hulls or break the oars of enemy vessels. Warships used both wind (sails) and human power (oarsmen) and were therefore very fast. Eventually, Rome’s navy became the largest and most powerful in the Mediterranean, and the Romans had control over what they therefore called Mare Nostrum meaning ‘our sea’.",
      "There were many kinds of warship. The ‘trireme’ was the dominant warship from the 7th to 4th century BCE. It had rowers in the top, middle and lower levels, and approximately 50 rowers in each bank. The rowers at the bottom had the most uncomfortable position as they were under the other rowers and were exposed to the water entering through the oar-holes. It is worth noting that contrary to popular perception, rowers were not slaves but mostly Roman citizens enrolled in the military. The trireme was superseded by larger ships with even more rowers.",
      "Merchant ships were built to transport lots of cargo over long distances and at a reasonable cost. They had a wider hull, double planking and a solid interior for added stability. Unlike warships, their V-shaped hull was deep underwater, meaning that they could not sail too close to the coast. They usually had two huge side rudders located off the stern and controlled by a small tiller bar connected to a system of cables. They had from one to three masts with large square sails and a small triangular sail at the bow. Just like warships, merchant ships used oarsmen, but coordinating the hundreds of rowers in both types of ship was not an easy task. In order to assist them, music would be played on an instrument, and oars would then keep time with this.",
      "The cargo on merchant ships included raw materials (e.g. iron bars, copper, marble and granite), and agricultural products (e.g. grain from Egypt’s Nile valley). During the Empire, Rome was a huge city by ancient standards of about one million inhabitants. Goods from all over the world would come to the city through the port of Pozzuoli situated west of the bay of Naples in Italy and through the gigantic port of Ostia situated at the mouth of the Tiber River. Large merchant ships would approach the destination port and, just like today, be intercepted by a number of towboats that would drag them to the quay.",
      "The time of travel along the many sailing routes could vary widely. Navigation in ancient Rome did not rely on sophisticated instruments such as compasses but on experience, local knowledge and observation of natural phenomena. In conditions of good visibility, seamen in the Mediterranean often had the mainland or islands in sight, which greatly facilitated navigation. They sailed by noting their position relative to a succession of recognisable landmarks. When weather conditions were not good or where land was no longer visible, Roman mariners estimated directions from the pole star or, with less accuracy, from the Sun at noon. They also estimated directions relative to the wind and swell. Overall, shipping in ancient Roman times resembled shipping today with large vessels regularly crossing the seas and bringing supplies from their Empire.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-16-test-3-part1-questions-1-5",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 1–5 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [1], prompt: "The Romans’ shipbuilding skills were passed on to the Greeks and the Egyptians.", options: trueFalseNotGivenOptions },
        { questionNumbers: [2], prompt: "Skilled craftsmen were needed for the mortise and tenon method of fixing planks.", options: trueFalseNotGivenOptions },
        { questionNumbers: [3], prompt: "The later practice used by Mediterranean shipbuilders involved building the hull before the frame.", options: trueFalseNotGivenOptions },
        { questionNumbers: [4], prompt: "The Romans called the Mediterranean Sea Mare Nostrum because they dominated its use.", options: trueFalseNotGivenOptions },
        { questionNumbers: [5], prompt: "Most rowers on ships were people from the Roman army.", options: trueFalseNotGivenOptions },
      ],
    },
    rawFillBlock(
      "cambridge-16-test-3-part1-questions-6-13",
      "Warships and merchant ships",
      "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 6–13 on your answer sheet.",
      "Warships and merchant ships\n\nWarships were designed so that they were 6 ______ and moved quickly. They often remained afloat after battles and were able to sail close to land as they lacked any additional weight. A battering ram made of 7 ______ was included in the design for attacking and damaging the timber and oars of enemy ships. Warships, such as the ‘trireme’, had rowers on three different 8 ______.\n\nUnlike warships, merchant ships had a broad 9 ______ that lay far below the surface of the sea. Merchant ships were steered through the water with the help of large rudders and a tiller bar. They had both square and 10 ______ sails. On merchant ships and warships, 11 ______ was used to ensure rowers moved their oars in and out of the water at the same time.\n\nQuantities of agricultural goods such as 12 ______ were transported by merchant ships to two main ports in Italy. The ships were pulled to the shore by 13 ______. When the weather was clear and they could see islands or land, sailors used landmarks that they knew to help them navigate their route.",
      6,
      13,
    ),
  ],
  source: {
    passagePages: [61, 62].map(sourcePage),
    questionPages: [63, 64].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [147, 148, 149, 150, 151].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集16精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const glacierArtefacts: ReadingPart = {
  id: "cambridge-16-test-3-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Climate change reveals ancient artefacts in Norway’s glaciers",
  sections: [
    {
      id: "cambridge-16-test-3-part2-section-a",
      heading: "A",
      format: "pre",
      paragraphs: ["Well above the treeline in Norway’s highest mountains, ancient fields of ice are shrinking as Earth’s climate warms. As the ice has vanished, it has been giving up the treasures it has preserved in cold storage for the last 6,000 years — items such as ancient arrows and skis from Viking Age traders. And those artefacts have provided archaeologists with some surprising insights into how ancient Norwegians made their livings."],
    },
    {
      id: "cambridge-16-test-3-part2-section-b",
      heading: "B",
      format: "pre",
      paragraphs: [
        "Organic materials like textiles and hides are relatively rare finds at archaeological sites. This is because unless they’re protected from the microorganisms that cause decay, they tend not to last long. Extreme cold is one reliable way to keep artefacts relatively fresh for a few thousand years, but once thawed out, these materials experience degradation relatively swiftly.",
        "With climate change shrinking ice cover around the world, glacial archaeologists need to race the clock to find newly revealed artefacts, preserve them, and study them. If something fragile dries and is windblown it might very soon be lost to science, or an arrow might be exposed and then covered again by the next snow and remain well-preserved. The unpredictability means that glacial archaeologists have to be systematic in their approach to fieldwork.",
      ],
    },
    {
      id: "cambridge-16-test-3-part2-section-c",
      heading: "C",
      format: "pre",
      paragraphs: [
        "Over a nine-year period, a team of archaeologists, which included Lars Pilø of Oppland County Council, Norway, and James Barrett of the McDonald Institute for Archaeological Research, surveyed patches of ice in Oppland, an area of south-central Norway that is home to some of the country’s highest mountains. Reindeer once congregated on these icy patches in the later summer months to escape biting insects, and from the late Stone Age, hunters followed. In addition, trade routes threaded through the mountain passes of Oppland, linking settlements in Norway to the rest of Europe.",
        "The slow but steady movement of glaciers tends to destroy anything at their bases, so the team focused on stationary patches of ice, mostly above 1,400 metres. That ice is found amid fields of frost-weathered boulders, fallen rocks, and exposed bedrock that for nine months of the year is buried beneath snow.",
        "‘Fieldwork is hard work — hiking with all our equipment, often camping on permafrost — but very rewarding. You’re rescuing the archaeology, bringing the melting ice to wider attention, discovering a unique environmental history and really connecting with the natural environment,’ says Barrett.",
      ],
    },
    {
      id: "cambridge-16-test-3-part2-section-d",
      heading: "D",
      format: "pre",
      paragraphs: ["At the edges of the contracting ice patches, archaeologists found more than 2,000 artefacts, which formed a material record that ran from 4,000 BCE to the beginnings of the Renaissance in the 14th century. Many of the artefacts are associated with hunting. Hunters would have easily misplaced arrows and they often discarded broken bows rather than take them all the way home. Other items could have been used by hunters traversing the high mountain passes of Oppland: all-purpose items like tools, skis, and horse tack."],
    },
    {
      id: "cambridge-16-test-3-part2-section-e",
      heading: "E",
      format: "pre",
      paragraphs: ["Barrett’s team radiocarbon-dated 153 of the artefacts and compared those dates to the timing of major environmental changes in the region — such as periods of cooling or warming — and major social and economic shifts — such as the growth of farming settlements and the spread of international trade networks leading up to the Viking Age. They found that some periods had produced lots of artefacts, which indicates that people had been pretty active in the mountains during those times. But there were few or no signs of activity during other periods."],
    },
    {
      id: "cambridge-16-test-3-part2-section-f",
      heading: "F",
      format: "pre",
      paragraphs: [
        "What was surprising, according to Barrett, was the timing of these periods. Oppland’s mountains present daunting terrain and in periods of extreme cold, glaciers could block the higher mountain passes and make travel in the upper reaches of the mountains extremely difficult. Archaeologists assumed people would stick to lower elevations during a time like the Late Antique Little Ice Age, a short period of deeper-than-usual cold from about 536–600 CE. But it turned out that hunters kept regularly venturing into the mountains even when the climate turned cold, based on the amount of stuff they had apparently dropped there.",
        "‘Remarkably, though, the finds from the ice may have continued through this period, perhaps suggesting that the importance of mountain hunting increased to supplement failing agricultural harvests in times of low temperatures,’ says Barrett. A colder turn in the Scandinavian climate would likely have meant widespread crop failures, so more people would have depended on hunting to make up for those losses.",
      ],
    },
    {
      id: "cambridge-16-test-3-part2-section-g",
      heading: "G",
      format: "pre",
      paragraphs: ["Many of the artefacts Barrett’s team recovered date from the beginning of the Viking Age, the 700s through to the 900s CE. Trade networks connecting Scandinavia with Europe and the Middle East were expanding around this time. Although we usually think of ships when we think of Scandinavian expansion, these recent discoveries show that plenty of goods travelled on overland routes, like the mountain passes of Oppland. And growing Norwegian towns, along with export markets, would have created a booming demand for hides to fight off the cold, as well as antlers to make useful things like combs. Business must have been good for hunters."],
    },
    {
      id: "cambridge-16-test-3-part2-section-h",
      heading: "H",
      format: "pre",
      paragraphs: ["Norway’s mountains are probably still hiding a lot of history — and prehistory — in remote ice patches. When Barrett’s team looked at the dates for their sample of 153 artefacts, they noticed a gap with almost no artefacts from about 3,800 to 2,200 BCE. In fact, archaeological finds from that period are rare all over Norway. The researchers say that could be because many of those artefacts have already disintegrated or are still frozen in the ice. That means archaeologists could be extracting some of those artefacts from retreating ice in years to come."],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-16-test-3-part2-questions-14-19",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 2 has eight sections, A–H. Which section contains the following information? Write the correct letter, A–H, in boxes 14–19 on your answer sheet.",
      questions: [
        { questionNumbers: [14], prompt: "An explanation for weapons being left behind in the mountains.", options: sectionOptions("H") },
        { questionNumbers: [15], prompt: "A reference to the physical difficulties involved in an archaeological expedition.", options: sectionOptions("H") },
        { questionNumbers: [16], prompt: "An explanation of why less food may have been available.", options: sectionOptions("H") },
        { questionNumbers: [17], prompt: "A reference to the possibility of future archaeological discoveries.", options: sectionOptions("H") },
        { questionNumbers: [18], prompt: "Examples of items that would have been traded.", options: sectionOptions("H") },
        { questionNumbers: [19], prompt: "A reference to the pressure archaeologists are under to work quickly.", options: sectionOptions("H") },
      ],
    },
    rawFillBlock(
      "cambridge-16-test-3-part2-questions-20-22",
      "Interesting finds at an archaeological site",
      "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 20–22 on your answer sheet.",
      "Interesting finds at an archaeological site\n\nOrganic materials such as animal skins and textiles are not discovered very often at archaeological sites. They have little protection against 20 ______, which means that they decay relatively quickly. But this is not always the case. If temperatures are low enough, fragile artefacts can be preserved for thousands of years.\n\nA team of archaeologists have been working in the mountains in Oppland in Norway to recover artefacts revealed by shrinking ice cover. In the past, there were trade routes through these mountains and 21 ______ gathered there in the summer months to avoid being attacked by 22 ______ on lower ground. The people who used these mountains left things behind and it is those objects that are of interest to archaeologists.",
      20,
      22,
    ),
    {
      id: "cambridge-16-test-3-part2-questions-23-24",
      type: "choice",
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 23 and 24 on your answer sheet.",
      questions: [{
        questionNumbers: [23, 24],
        selectCount: 2,
        prompt: "Which TWO of the following statements does the writer make about the discoveries of Barrett’s team?",
        options: [
          { letter: "A", text: "Artefacts found in the higher mountain passes were limited to skiing equipment." },
          { letter: "B", text: "Hunters went into the mountains even during periods of extreme cold." },
          { letter: "C", text: "The number of artefacts from certain time periods was relatively low." },
          { letter: "D", text: "Radiocarbon dating of artefacts produced some unreliable results." },
          { letter: "E", text: "More artefacts were found in Oppland than at any other mountain site." },
        ],
      }],
    },
    {
      id: "cambridge-16-test-3-part2-questions-25-26",
      type: "choice",
      instruction: "Choose TWO letters, A–E. Write the correct letters in boxes 25 and 26 on your answer sheet.",
      questions: [{
        questionNumbers: [25, 26],
        selectCount: 2,
        prompt: "Which TWO of the following statements does the writer make about the Viking Age?",
        options: [
          { letter: "A", text: "Hunters at this time benefited from an increased demand for goods." },
          { letter: "B", text: "The beginning of the period saw the greatest growth in the wealth of Vikings." },
          { letter: "C", text: "Vikings did not rely on ships alone to transport goods." },
          { letter: "D", text: "Norwegian towns at this time attracted traders from around the world." },
          { letter: "E", text: "Vikings were primarily interested in their trading links with the Middle East." },
        ],
      }],
    },
  ],
  source: {
    passagePages: [65, 66].map(sourcePage),
    questionPages: [67, 68].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [156, 157, 158, 159, 160].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集16精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const plantThermometer: ReadingPart = {
  id: "cambridge-16-test-3-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "Plant ‘thermometer’ triggers springtime growth by measuring night-time heat",
  subtitle: "A photoreceptor molecule in plant cells has been found to have a second job as a thermometer after dark — allowing plants to read seasonal temperature changes. Scientists say the discovery could help breed crops that are more resilient to the temperatures expected to result from climate change",
  sections: [
    {
      id: "cambridge-16-test-3-part3-section-a",
      heading: "A",
      format: "pre",
      paragraphs: ["An international team of scientists led by the University of Cambridge has discovered that the ‘thermometer’ molecule in plants enables them to develop according to seasonal temperature changes. Researchers have revealed that molecules called phytochromes — used by plants to detect light during the day — actually change their function in darkness to become cellular temperature gauges that measure the heat of the night. The new findings, published in the journal Science, show that phytochromes control genetic switches in response to temperature as well as light to dictate plant development."],
    },
    {
      id: "cambridge-16-test-3-part3-section-b",
      heading: "B",
      format: "pre",
      paragraphs: ["At night, these molecules change states, and the pace at which they change is ‘directly proportional to temperature’, say scientists, who compare phytochromes to mercury in a thermometer. The warmer it is, the faster the molecular change — stimulating plant growth."],
    },
    {
      id: "cambridge-16-test-3-part3-section-c",
      heading: "C",
      format: "pre",
      paragraphs: ["Farmers and gardeners have known for hundreds of years how responsive plants are to temperature: warm winters cause many trees and flowers to bud early, something humans have long used to predict weather and harvest times for the coming year. The latest research pinpoints for the first time a molecular mechanism in plants that reacts to temperature — often triggering the buds of spring we long to see at the end of winter."],
    },
    {
      id: "cambridge-16-test-3-part3-section-d",
      heading: "D",
      format: "pre",
      paragraphs: ["With weather and temperatures set to become ever more unpredictable due to climate change, researchers say the discovery that this light-sensing molecule also functions as the internal thermometer in plant cells could help us breed tougher crops. ‘It is estimated that agricultural yields will need to double by 2050, but climate change is a major threat to achieving this. Key crops such as wheat and rice are sensitive to high temperatures. Thermal stress reduces crop yields by around 10% for every one degree increase in temperature,’ says lead researcher Dr Philip Wigge from Cambridge’s Sainsbury Laboratory. ‘Discovering the molecules that allow plants to sense temperature has the potential to accelerate the breeding of crops resilient to thermal stress and climate change.’"],
    },
    {
      id: "cambridge-16-test-3-part3-section-e",
      heading: "E",
      format: "pre",
      paragraphs: [
        "In their active state, phytochrome molecules bind themselves to DNA to restrict plant growth. During the day, sunlight activates the molecules, slowing down growth. If a plant finds itself in shade, phytochromes are quickly inactivated — enabling it to grow faster to find sunlight again. This is how plants compete to escape each other’s shade. ‘Light-driven changes to phytochrome activity occur very fast, in less than a second,’ says Wigge.",
        "At night, however, it’s a different story. Instead of a rapid deactivation following sundown, the molecules gradually change from their active to inactive state. This is called ‘dark reversion’. ‘Just as mercury rises in a thermometer, the rate at which phytochromes revert to their inactive state during the night is a direct measure of temperature,’ says Wigge.",
      ],
    },
    {
      id: "cambridge-16-test-3-part3-section-f",
      heading: "F",
      format: "pre",
      paragraphs: ["‘The lower the temperature, the slower the rate at which phytochromes revert to inactivity, so the molecules spend more time in their active, growth-suppressing state. This is why plants are slower to grow in winter. Warm temperatures accelerate dark reversion, so that phytochromes rapidly reach an inactive state and detach themselves from the plant’s DNA — allowing genes to be expressed and plant growth to resume.’ Wigge believes phytochrome thermo-sensing evolved at a later stage, and co-opted the biological network already used for light-based growth during the downtime of night."],
    },
    {
      id: "cambridge-16-test-3-part3-section-g",
      heading: "G",
      format: "pre",
      paragraphs: [
        "Some plants mainly use day length as an indicator of the season. Other species, such as daffodils, have considerable temperature sensitivity, and can flower months in advance during a warm winter. In fact, the discovery of the dual role of phytochromes provides the science behind a well-known rhyme long used to predict the coming season: oak before ash we’ll have a splash, ash before oak we’re in for a soak.",
        "Wigge explains: ‘Oak trees rely much more on temperature, likely using phytochromes as thermometers to dictate development, whereas ash trees rely on measuring day length to determine their seasonal timing. A warmer spring, and consequently a higher likeliness of a hot summer, will result in oak leafing before ash. A cold spring will see the opposite. As the British know only too well, a colder summer is likely to be a rain-soaked one.’",
      ],
    },
    {
      id: "cambridge-16-test-3-part3-section-h",
      heading: "H",
      format: "pre",
      paragraphs: ["The new findings are the culmination of twelve years of research involving scientists from Germany, Argentina and the US, as well as the Cambridge team. The work was done in a model system, using a mustard plant called Arabidopsis, but Wigge says the phytochrome genes necessary for temperature sensing are found in crop plants as well. ‘Recent advances in plant genetics now mean that scientists are able to rapidly identify the genes controlling these processes in crop plants, and even alter their activity using precise molecular “scalpels”,’ adds Wigge. ‘Cambridge is uniquely well-positioned to do this kind of research as we have outstanding collaborators nearby who work on more applied aspects of plant biology, and can help us transfer this new knowledge into the field.’"],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-16-test-3-part3-questions-27-32",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 3? In boxes 27–32 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [27], prompt: "The Cambridge scientists’ discovery of the ‘thermometer molecule’ caused surprise among other scientists.", options: trueFalseNotGivenOptions },
        { questionNumbers: [28], prompt: "The target for agricultural production by 2050 could be missed.", options: trueFalseNotGivenOptions },
        { questionNumbers: [29], prompt: "Wheat and rice suffer from a rise in temperatures.", options: trueFalseNotGivenOptions },
        { questionNumbers: [30], prompt: "It may be possible to develop crops that require less water.", options: trueFalseNotGivenOptions },
        { questionNumbers: [31], prompt: "Plants grow faster in sunlight than in shade.", options: trueFalseNotGivenOptions },
        { questionNumbers: [32], prompt: "Phytochromes change their state at the same speed day and night.", options: trueFalseNotGivenOptions },
      ],
    },
    {
      id: "cambridge-16-test-3-part3-questions-33-37",
      type: "choice",
      sharedOptions: true,
      instruction: "Reading Passage 3 has eight sections, A–H. Which section contains the following information? Write the correct letter, A–H, in boxes 33–37 on your answer sheet.",
      questions: [
        { questionNumbers: [33], prompt: "Mention of specialists who can make use of the research findings.", options: sectionOptions("H") },
        { questionNumbers: [34], prompt: "A reference to a potential benefit of the research findings.", options: sectionOptions("H") },
        { questionNumbers: [35], prompt: "Scientific support for a traditional saying.", options: sectionOptions("H") },
        { questionNumbers: [36], prompt: "A reference to people traditionally making plans based on plant behaviour.", options: sectionOptions("H") },
        { questionNumbers: [37], prompt: "A reference to where the research has been reported.", options: sectionOptions("H") },
      ],
    },
    rawFillBlock(
      "cambridge-16-test-3-part3-questions-38-40",
      "Complete the sentences",
      "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 38–40 on your answer sheet.",
      "38 Daffodils are likely to flower early in response to ______ weather.\n\n39 If ash trees come into leaf before oak trees, the weather in ______ will probably be wet.\n\n40 The research was carried out using a particular species of ______.",
      38,
      40,
    ),
  ],
  source: {
    passagePages: [69, 70].map(sourcePage),
    questionPages: [71, 72].map(sourcePage),
    answerPages: [sourcePage(126)],
    explanationPages: [165, 166, 167, 168, 169, 170].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集16精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE16_TEST3_PARTS: ReadingPart[] = [romanShips, glacierArtefacts, plantThermometer];

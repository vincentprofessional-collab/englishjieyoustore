import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  81: [1580, 2328], 82: [1614, 2239], 83: [1478, 2236],
  84: [1616, 2239], 85: [1502, 2234], 86: [1572, 2237],
  87: [1501, 2237], 88: [1631, 2237], 89: [1492, 2237],
  90: [1619, 2237], 91: [1505, 2236], 92: [1521, 2237],
  124: [1514, 1210],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci12-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(part: number, page: number): SourcePage {
  const heights: Record<number, number> = { 145: 810, 154: 1523, 165: 1650 };
  return {
    page,
    src: "/reading/explanations/cambridge-12-test-4-part" + part + "-exp12-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: heights[page] ?? 2249,
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

const historyOfGlass: ReadingPart = {
  id: "cambridge-12-test-4-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1.",
  title: "The History of Glass",
  sections: [{
    id: "cambridge-12-test-4-part1-passage",
    format: "pre",
    paragraphs: [
      "From our earliest origins, man has been making use of glass. Historians have discovered that a type of natural glass — obsidian — formed in places such as the mouth of a volcano as a result of the intense heat of an eruption melting sand — was first used as tips for spears. Archaeologists have even found evidence of man-made glass which dates back to 4000 BC; this took the form of glazes used for coating stone beads. It was not until 1500 BC, however, that the first hollow glass container was made by covering a sand core with a layer of molten glass.",
      "Glass blowing became the most common way to make glass containers from the first century BC. The glass made during this time was highly coloured due to the impurities of the raw material. In the first century AD, methods of creating colourless glass were developed, which was then tinted by the addition of colouring materials. The secret of glass making was taken across Europe by the Romans during this century. However, they guarded the skills and technology required to make glass very closely, and it was not until their empire collapsed in 476 AD that glass-making knowledge became widespread throughout Europe and the Middle East.",
      "From the 10th century onwards, the Venetians gained a reputation for technical skill and artistic ability in the making of glass bottles, and many of the city’s craftsmen left Italy to set up glassworks throughout Europe.",
      "A major milestone in the history of glass occurred with the invention of lead crystal glass by the English glass manufacturer George Ravenscroft (1632–1683). He attempted to counter the effect of clouding that sometimes occurred in blown glass by introducing lead to the raw materials used in the process. The new glass he created was softer and easier to decorate, and had a higher refractive index, adding to its brilliance and beauty, and it proved invaluable to the optical industry. It is thanks to Ravenscroft’s invention that optical lenses, astronomical telescopes, microscopes and the like became possible.",
      "In Britain, the modern glass industry only really started to develop after the repeal of the Excise Act in 1845. Before that time, heavy taxes had been placed on the amount of glass melted in a glasshouse, and were levied continuously from 1745 to 1845. Joseph Paxton’s Crystal Palace at London’s Great Exhibition of 1851 marked the beginning of glass as a material used in the building industry. This revolutionary new building encouraged the use of glass in public, domestic and horticultural architecture. Glass manufacturing techniques also improved with the advancement of science and the development of better technology.",
      "From 1887 onwards, glass making developed from traditional mouth-blowing to a semi-automatic process, after factory-owner HM Ashley introduced a machine capable of producing 200 bottles per hour in Castleford, Yorkshire, England — more than three times quicker than any previous production method. Then in 1907, the first fully automated machine was developed in the USA by Michael Owens — founder of the Owens Bottle Machine Company (later the major manufacturers Owens-Illinois) — and installed in its factory. Owens’ invention could produce an impressive 2,500 bottles per hour. Other developments followed rapidly, but it was not until the First World War, when Britain became cut off from essential glass suppliers, that glass became part of the scientific sector. Previous to this, glass had been seen as a craft rather than a precise science.",
      "Today, glass making is big business. It has become a modern, hi-tech industry operating in a fiercely competitive global market where quality, design and service levels are critical to maintaining market share. Modern glass plants are capable of making millions of glass containers a day in many different colours, with green, brown and clear remaining the most popular. Few of us can imagine modern life without glass. It features in almost every aspect of our lives — in our homes, our cars and whenever we sit down to eat or drink. Glass packaging is used for many products; many beverages are sold in glass, as are numerous foodstuffs, as well as medicines and cosmetics.",
      "Glass is an ideal material for recycling, and with growing consumer concern for green issues, glass bottles and jars are becoming ever more popular. Glass recycling is good news for the environment. It saves used glass containers being sent to landfill. As less energy is needed to melt recycled glass than to melt down raw materials, this also saves fuel and production costs. Recycling also reduces the need for raw materials to be quarried, thus saving precious resources.",
    ],
  }],
  questionBlocks: [
    {
      ...rawFillBlock(
        "cambridge-12-test-4-part1-questions-1-8",
        "The History of Glass",
        "Questions 1–8\nComplete the notes below. Choose ONE WORD ONLY from the passage for each answer.\n\nThe History of Glass\n\nEarly humans used a material called 1 ______ to make the sharp points of their 2 ______.\n\n4000 BC: 3 ______ made of stone were covered in a coating of man-made glass.\n\nFirst century BC: glass was coloured because of the 4 ______ in the material.\n\nUntil 476 AD: only the 5 ______ knew how to make glass.\n\nFrom 10th century: Venetians became famous for making bottles out of glass.\n\n17th century: George Ravenscroft developed a process using 6 ______ to avoid the occurrence of 7 ______ in blown glass.\n\nMid-19th century: British glass production developed after changes to laws concerning 8 ______.",
        1,
        8,
      ),
    },
    {
      id: "cambridge-12-test-4-part1-questions-9-13",
      type: "choice",
      sharedOptions: true,
      instruction: "In boxes 9–13 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if it contradicts the information, or NOT GIVEN if there is no information on this.",
      questions: [
        { questionNumbers: [9], prompt: "In 1887, HM Ashley had the fastest bottle-producing machine that existed at the time.", options: judgmentOptions },
        { questionNumbers: [10], prompt: "Michael Owens was hired by a large US company to design a fully-automated bottle manufacturing machine for them.", options: judgmentOptions },
        { questionNumbers: [11], prompt: "Nowadays, most glass is produced by large international manufacturers.", options: judgmentOptions },
        { questionNumbers: [12], prompt: "Concern for the environment is leading to an increased demand for glass containers.", options: judgmentOptions },
        { questionNumbers: [13], prompt: "It is more expensive to produce recycled glass than to manufacture new glass.", options: judgmentOptions },
      ],
    },
  ],
  source: {
    passagePages: [81, 82].map(sourcePage),
    questionPages: [83].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [145, 146, 147, 148, 149].map((page) => explanationPage(1, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集12精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const bringBackBigCats: ReadingPart = {
  id: "cambridge-12-test-4-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2.",
  title: "Bring back the big cats",
  byline: "It’s time to start returning vanished native animals to Britain, says John Vesty",
  sections: [{
    id: "cambridge-12-test-4-part2-passage",
    format: "pre",
    paragraphs: [
      "There is a poem, written around 598 AD, which describes hunting a mystery animal called a /lewyn. But what was it? Nothing seemed to fit, until 2006, when an animal bone, dating from around the same period, was found in the Kinsey Cave in northern England. Until this discovery, the lynx — a large spotted cat with tasselled ears — was presumed to have died out in Britain at least 6,000 years ago, before the inhabitants of these islands took up farming. But the 2006 find, together with three others in Yorkshire and Scotland, is compelling evidence that the lynx and the mysterious /lewyn were in fact one and the same animal. If this is so, it would bring forward the tassel-eared cat’s estimated extinction date by roughly 5,000 years.",
      "However, this is not quite the last glimpse of the animal in British culture. A 9th-century stone cross from the Isle of Eigg shows, alongside the deer, boar and aurochs pursued by a mounted hunter, a speckled cat with tasselled ears. Were it not for the animal’s backside having worn away with time, we could have been certain, as the lynx’s stubby tail is unmistakable. But even without this key feature, it’s hard to see what else the creature could have been.",
      "The lynx is now becoming the totemic animal of a movement that is transforming British environmentalism: rewilding.",
      "Rewilding means the mass restoration of damaged ecosystems. It involves letting trees return to places that have been denuded, allowing parts of the seabed to recover from trawling and dredging, permitting rivers to flow freely again. Above all, it means bringing back missing species. One of the most striking findings of modern ecology is that ecosystems without large predators behave in completely different ways from those that retain them. Some of them drive dynamic processes that resonate through the whole food chain, creating niches for hundreds of species that might otherwise struggle to survive. The killers turn out to be bringers of life.",
      "Such findings present a big challenge to British conservation, which has often selected arbitrary assemblages of plants and animals and sought, at great effort and expense, to prevent them from changing. It has tried to preserve the living world as if it were a jar of pickles, letting nothing in and nothing out, keeping nature in a state of arrested development. But ecosystems are not merely collections of species; they are also the dynamic and ever-shifting relationships between them. And this dynamism often depends on large predators.",
      "At sea the potential is even greater: by protecting large areas from commercial fishing, we could once more see what 18th-century literature describes: vast shoals of fish being chased by fin and sperm whales, within sight of the English shore. This policy would also greatly boost catches in the surrounding seas; the fishing industry’s insistence on scouring every inch of seabed, leaving no breeding reserves, could not be more damaging to its own interests.",
      "Rewilding is a rare example of an environmental movement in which campaigners articulate what they are for rather than only what they are against. One of the reasons why the enthusiasm for rewilding is spreading so quickly in Britain is that it helps to create a more inspiring vision than the green movement’s usual promise of ‘Follow us and the world will be slightly less awful than it would otherwise have been.’",
      "The lynx presents no threat to human beings: there is no known instance of one preying on people. It is a specialist predator of roe deer, a species that has exploded in Britain in recent decades, holding back, by intensive browsing, attempts to re-establish forests. It will also winkle out sika deer: an exotic species that is almost impossible for human beings to control, as it hides in impenetrable plantations of young trees. The attempt to reintroduce this predator marries well with the aim of bringing forests back to parts of our bare and barren uplands. The lynx requires deep cover, and as such presents little risk to sheep and other livestock, which are supposed, as a condition of farm subsidies, to be kept out of the woods.",
      "On a recent trip to the Cairngorm Mountains, I heard several conservationists suggest that the lynx could be reintroduced there within 20 years. If trees return to the bare hills elsewhere in Britain, the big cats could soon follow. There is nothing extraordinary about these proposals, seen from the perspective of anywhere else in Europe. The lynx has now been reintroduced to the Jura Mountains, the Alps, the Vosges in eastern France and the Harz mountains in Germany, and has re-established itself in many more places. The European population has tripled since 1970 to roughly 10,000. As with wolves, bears, beavers, boar, bison, moose and many other species, the lynx has been able to spread as farming has left the hills and people discover that it is more lucrative to protect charismatic wildlife than to hunt it, as tourists will pay for the chance to see it. Large-scale rewilding is happening almost everywhere — except Britain.",
      "Here, attitudes are just beginning to change. Conservationists are starting to accept that the old preservation-jar model is failing, even on its own terms. Already, projects such as Trees for Life in the Highlands provide a hint of what might be coming. An organisation is being set up that will seek to catalyse the rewilding of land and sea across Britain, its aim being to reintroduce that rarest of species to British ecosystems: hope.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-12-test-4-part2-questions-14-18",
      type: "choice",
      sharedOptions: true,
      instruction: "Write the correct letter, A, B, C or D, in boxes 14–18 on your answer sheet.",
      questions: [
        { questionNumbers: [14], prompt: "What did the 2006 discovery of the animal bone reveal about the lynx?", options: [
          { letter: "A", text: "Its physical appearance was very distinctive." },
          { letter: "B", text: "Its extinction was linked to the spread of farming." },
          { letter: "C", text: "It vanished from Britain several thousand years ago." },
          { letter: "D", text: "It survived in Britain longer than was previously thought." },
        ] },
        { questionNumbers: [15], prompt: "What point does the writer make about large predators in the third paragraph?", options: [
          { letter: "A", text: "Their presence can increase biodiversity." },
          { letter: "B", text: "They may cause damage to local ecosystems." },
          { letter: "C", text: "Their behaviour can alter according to the environment." },
          { letter: "D", text: "They should be reintroduced only to areas where they were native." },
        ] },
        { questionNumbers: [16], prompt: "What does the writer suggest about British conservation in the fourth paragraph?", options: [
          { letter: "A", text: "It has failed to achieve its aims." },
          { letter: "B", text: "It is beginning to change direction." },
          { letter: "C", text: "It has taken a misguided approach." },
          { letter: "D", text: "It has focused on the most widespread species." },
        ] },
        { questionNumbers: [17], prompt: "Protecting large areas of the sea from commercial fishing would result in", options: [
          { letter: "A", text: "practical benefits for the fishing industry." },
          { letter: "B", text: "some short-term losses to the fishing industry." },
          { letter: "C", text: "widespread opposition from the fishing industry." },
          { letter: "D", text: "certain changes to techniques within the fishing industry." },
        ] },
        { questionNumbers: [18], prompt: "According to the author, what distinguishes rewilding from other environmental campaigns?", options: [
          { letter: "A", text: "Its objective is more achievable." },
          { letter: "B", text: "Its supporters are more articulate." },
          { letter: "C", text: "Its positive message is more appealing." },
          { letter: "D", text: "It is based on sounder scientific principles." },
        ] },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-12-test-4-part2-questions-19-22",
        "Reintroducing the lynx to Britain",
        "Questions 19–22\nComplete the summary using the list of words and phrases A–F below. Write the correct letter, A–F, in boxes 19–22 on your answer sheet.\n\nReintroducing the lynx to Britain\n\nThere would be many advantages to reintroducing the lynx to Britain. While there is no evidence that the lynx has ever put 19 ______ in danger, it would reduce the numbers of certain 20 ______ whose populations have increased enormously in recent decades. It would present only a minimal threat to 21 ______, provided these were kept away from lynx habitats. Furthermore, the reintroduction programme would also link efficiently with initiatives to return native 22 ______ to certain areas of the country.\n\nA trees\nB endangered species\nC hillsides\nD wild animals\nE humans\nF farm animals",
        19,
        22,
      ),
      wordBank: ["A", "B", "C", "D", "E", "F"],
    },
    {
      id: "cambridge-12-test-4-part2-questions-23-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 2? In boxes 23-26 on your answer sheet, write YES if the statement agrees with the claims of the writer NO if the statement contradicts the claims of the writer NOT GIVEN if it is impossible to say what the writer thinks about this",
      questions: [
        { questionNumbers: [23], prompt: "Britain could become the first European country to reintroduce the lynx.", options: yesNoOptions },
        { questionNumbers: [24], prompt: "The large growth in the European lynx population since 1970 has exceeded conservationists’ expectations.", options: yesNoOptions },
        { questionNumbers: [25], prompt: "Changes in agricultural practices have extended the habitat of the lynx in Europe.", options: yesNoOptions },
        { questionNumbers: [26], prompt: "It has become apparent that species reintroduction has commercial advantages.", options: yesNoOptions },
      ],
    },
  ],
  source: {
    passagePages: [84, 85].map(sourcePage),
    questionPages: [86, 87, 88].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [154, 155, 156, 157, 158, 159, 160].map((page) => explanationPage(2, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集12精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const effectiveBoards: ReadingPart = {
  id: "cambridge-12-test-4-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3.",
  title: "UK companies need more effective boards of directors",
  sections: [
    {
      id: "cambridge-12-test-4-part3-section-a",
      heading: "A",
      format: "pre",
      paragraphs: ["After a number of serious failures of governance (that is, how they are managed at the highest level), companies in Britain, as well as elsewhere, should consider radical changes to their directors’ roles. It is clear that the role of a board director today is not an easy one. Following the 2008 financial meltdown, which resulted in a deeper and more prolonged period of economic downturn than anyone expected, the search for explanations in the many post-mortems of the crisis has meant blame has been spread far and wide. Governments, regulators, central banks and auditors have all been in the frame. The role of bank directors and management and their widely publicised failures have been extensively picked over and examined in reports, inquiries and commentaries."],
    },
    {
      id: "cambridge-12-test-4-part3-section-b",
      heading: "B",
      format: "pre",
      paragraphs: ["The knock-on effect of this scrutiny has been to make the governance of companies in general an issue of intense public debate and has significantly increased the pressures on, and the responsibilities of, directors. At the simplest and most practical level, the time involved in fulfilling the demands of a board directorship has increased significantly, calling into question the effectiveness of the classic model of corporate governance by part-time, independent non-executive directors. Where once a board schedule may have consisted of between eight and ten meetings a year, in many companies the number of events requiring board input and decisions has dramatically risen. Furthermore, the amount of reading and preparation required for each meeting is increasing. Agendas can become overloaded and this can mean the time for constructive debate must necessarily be restricted in favour of getting through the business."],
    },
    {
      id: "cambridge-12-test-4-part3-section-c",
      heading: "C",
      format: "pre",
      paragraphs: ["Often, board business is devolved to committees in order to cope with the workload, which may be more efficient but can mean that the board as a whole is less involved in fully addressing some of the most important issues. It is not uncommon for the audit committee meeting to last longer than the main board meeting itself. Process may take the place of discussion and be at the expense of real collaboration, so that boxes are ticked rather than issues tackled."],
    },
    {
      id: "cambridge-12-test-4-part3-section-d",
      heading: "D",
      format: "pre",
      paragraphs: ["A radical solution, which may work for some very large companies whose businesses are extensive and complex, is the professional board, whose members would work up to three or four days a week, supported by their own dedicated staff and advisers. There are obvious risks to this and it would be important to establish clear guidelines for such a board to ensure that it did not step on the toes of management by becoming too engaged in the day-to-day running of the company. Problems of recruitment, remuneration and independence could also arise and this structure would not be appropriate for all companies. However, more professional and better-informed boards would have been particularly appropriate for banks where the executives had access to information that part-time non-executive directors lacked, leaving the latter unable to comprehend or anticipate the 2008 crash."],
    },
    {
      id: "cambridge-12-test-4-part3-section-e",
      heading: "E",
      format: "pre",
      paragraphs: ["One of the main criticisms of boards and their directors is that they do not focus sufficiently on longer-term matters of strategy, sustainability and governance, but instead concentrate too much on short-term financial metrics. Regulatory requirements and the structure of the market encourage this behaviour. The tyranny of quarterly reporting can distort board decision-making, as directors have to ‘make the numbers’ every four months to meet the insatiable appetite of the market for more data. This serves to encourage the trading methodology of a certain kind of investor who moves in and out of a stock without engaging in constructive dialogue with the company about strategy or performance, and is simply seeking a short-term financial gain. This effect has been made worse by the changing profile of investors due to the globalisation of capital and the increasing use of automated trading systems. Corporate culture adapts and management teams are largely incentivised to meet financial goals."],
    },
    {
      id: "cambridge-12-test-4-part3-section-f",
      heading: "F",
      format: "pre",
      paragraphs: ["Compensation for chief executives has become a combat zone where pitched battles between investors, management and board members are fought, often behind closed doors but increasingly frequently in the full glare of press attention. Many would argue that this is in the interest of transparency and good governance as shareholders use their muscle in the area of pay to pressure boards to remove underperforming chief executives. Their powers to vote down executive remuneration policies increased when binding votes came into force. The chair of the remuneration committee can be an exposed and lonely role, as Alison Carnwath, chair of Barclays Bank’s remuneration committee, found when she had to resign, having been roundly criticised for trying to defend the enormous bonus to be paid to the chief executive; the irony being that she was widely understood to have spoken out against it in the privacy of the committee."],
    },
    {
      id: "cambridge-12-test-4-part3-section-g",
      heading: "G",
      format: "pre",
      paragraphs: ["The financial crisis stimulated a debate about the role and purpose of the company and a heightened awareness of corporate ethics. Trust in the corporation has been eroded and academics such as Michael Sandel, in his thoughtful and bestselling book What Money Can’t Buy, are questioning the morality of capitalism and the market economy. Boards of companies in all sectors will need to widen their perspective to encompass these issues and this may involve a realignment of corporate goals. We live in challenging times."],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-12-test-4-part3-headings-27-33",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 3 has seven paragraphs, A–G. Choose the correct heading for each paragraph from the list below. Write the correct number, i–viii.",
      questionNumbers: [27, 28, 29, 30, 31, 32, 33],
      options: [
        { id: "i", text: "Disputes over financial arrangements regarding senior managers" },
        { id: "ii", text: "The impact on companies of being subjected to close examination" },
        { id: "iii", text: "The possible need for fundamental change in every area of business" },
        { id: "iv", text: "Many external bodies being held responsible for problems" },
        { id: "v", text: "The falling number of board members with broad enough experience" },
        { id: "vi", text: "A risk that not all directors take part in solving major problems" },
        { id: "vii", text: "Boards not looking far enough ahead" },
        { id: "viii", text: "A proposal to change the way the board operates" },
      ],
    },
    {
      id: "cambridge-12-test-4-part3-questions-34-37",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the claims of the writer in Reading Passage 3? In boxes 34-37 on your answer sheet, write YES if the statement agrees with the claims of the writer NO if the statement contradicts the claims of the writer NOT GIVEN if it is impossible to say what the writer thinks about this",
      questions: [
        { questionNumbers: [34], prompt: "Close scrutiny of the behaviour of boards has increased since the economic downturn.", options: yesNoOptions },
        { questionNumbers: [35], prompt: "Banks have been mismanaged to a greater extent than other businesses.", options: yesNoOptions },
        { questionNumbers: [36], prompt: "Board meetings normally continue for as long as necessary to debate matters in full.", options: yesNoOptions },
        { questionNumbers: [37], prompt: "Using a committee structure would ensure that board members are fully informed about significant issues.", options: yesNoOptions },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-12-test-4-part3-questions-38-40",
        "Questions 38–40",
        "Questions 38–40\nComplete the sentences below. Choose ONE WORD ONLY from the passage for each answer.\n\n38 Before 2008, non-executive directors were at a disadvantage because of their lack of ______.\n\n39 Boards tend to place too much emphasis on ______ considerations that are only of short-term relevance.\n\n40 On certain matters, such as pay, the board may have to accept the views of ______.",
        38,
        40,
      ),
    },
  ],
  source: {
    passagePages: [90, 91].map(sourcePage),
    questionPages: [89, 92].map(sourcePage),
    answerPages: [sourcePage(124)],
    explanationPages: [165, 166, 167, 168, 169, 170, 171].map((page) => explanationPage(3, page)),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集12精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

export const CAMBRIDGE12_TEST4_PARTS: ReadingPart[] = [historyOfGlass, bringBackBigCats, effectiveBoards];

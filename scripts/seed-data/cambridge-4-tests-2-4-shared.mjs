import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const sourceRoot = "/Volumes/My HDD3/备课/IELTS/剑桥雅思/剑桥雅思4";

const answersByTest = {
  2: {
    1: ["C"],
    2: ["C"],
    3: ["B"],
    4: ["B"],
    5: ["A"],
    6: ["Cathedral"],
    7: ["Markets"],
    8: ["Gardens"],
    9: ["Art Gallery"],
    10: ["climb the tower", "see the view"],
    11: ["C"],
    12: ["B"],
    13: ["A"],
    14: ["C"],
    15: ["B"],
    16: ["C"],
    17: ["A"],
    18: ["B"],
    19: ["B"],
    20: ["A"],
    21: ["collecting data", "gathering data", "data collection"],
    22: ["1,500", "1500"],
    23: ["5", "five"],
    24: ["3,000-4,000", "3000-4000", "3,000 to 4,000", "3000 to 4000"],
    25: ["B", "C"],
    26: ["C", "B"],
    27: ["Mehta"],
    28: ["Survey Research"],
    29: ["London University", "London University Press"],
    30: ["1988"],
    31: ["C"],
    32: ["A"],
    33: ["mass media", "media"],
    34: ["academic circles", "academics", "researchers"],
    35: ["specialist knowledge", "specialised knowledge", "specialized knowledge"],
    36: ["unaware"],
    37: ["individual customers", "individual consumers", "individuals"],
    38: ["illegal profit", "illegal profits"],
    39: ["D", "E"],
    40: ["E", "D"],
  },
  3: {
    1: ["1.5 years", "1½ years", "one and a half years", "one-and-a-half years"],
    2: ["Forest", "Forrest"],
    3: ["Academic"],
    4: ["Thursday"],
    5: ["B"],
    6: ["B"],
    7: ["A"],
    8: ["deposit"],
    9: ["monthly"],
    10: ["telephone", "phone"],
    11: ["C"],
    12: ["A"],
    13: ["C"],
    14: ["B"],
    15: ["lighting", "lights", "light"],
    16: ["adults", "adult"],
    17: ["Studio Theatre", "Studio Theater", "the Studio Theatre", "the Studio Theater"],
    18: ["the whole family", "all the family", "families"],
    19: ["City Gardens", "the City Gardens", "in City Gardens", "outdoors"],
    20: ["young children", "younger children", "children"],
    21: ["A"],
    22: ["B"],
    23: ["C"],
    24: ["A"],
    25: ["B"],
    26: ["A"],
    27: ["C"],
    28: ["B"],
    29: ["B"],
    30: ["B"],
    31: ["questionnaire"],
    32: ["approximately 2,000", "about 2,000", "approximately 2000", "about 2000"],
    33: ["Education"],
    34: ["halls of residence", "living quarters"],
    35: [
      "traffic and parking",
      "parking and traffic",
      "traffic, parking",
      "parking, traffic",
    ],
    36: [
      "lecture rooms",
      "lecture halls",
      "lecture theatres",
      "lecture theaters",
      "most lecture rooms",
    ],
    37: ["facilities", "choice of facilities", "room for facilities"],
    38: ["D and F", "F and D", "D, F", "F, D", "DF", "FD"],
    39: ["B"],
    40: ["A and C", "C and A", "A, C", "C, A", "AC", "CA"],
  },
  4: {
    1: ["College Dining Room"],
    2: ["office staff", "students"],
    3: ["students", "office staff"],
    4: ["10th December", "December 10th", "December 10"],
    5: ["coffee breaks", "coffee break"],
    6: ["6", "six"],
    7: ["set of dictionaries", "dictionaries", "a good dictionary", "good dictionary"],
    8: ["music", "music tapes", "tapes", "photos", "photographs"],
    9: ["photos", "photographs", "music", "music tapes", "tapes"],
    10: ["speech"],
    11: ["B"],
    12: ["A"],
    13: ["A"],
    14: ["A"],
    15: ["B"],
    16: ["180"],
    17: ["nearest station"],
    18: ["local history"],
    19: ["690"],
    20: ["walking club", "local walking club"],
    21: ["20 balloons", "twenty balloons"],
    22: ["units of measurement", "measurements", "measurement units"],
    23: ["rock salt", "salt"],
    24: ["crystals"],
    25: ["string", "piece of string"],
    26: ["ordinary white light", "ordinary light", "white light", "light"],
    27: ["H"],
    28: ["B"],
    29: ["E"],
    30: ["C"],
    31: ["795"],
    32: ["tail"],
    33: ["floor", "bed", "bottom"],
    34: ["sense of smell"],
    35: ["A"],
    36: ["A"],
    37: ["B"],
    38: ["B"],
    39: ["B", "E"],
    40: ["E", "B"],
  },
};

const questionTypesByTest = {
  2: {
    1: "single_choice",
    2: "single_choice",
    3: "single_choice",
    4: "single_choice",
    5: "single_choice",
    11: "single_choice",
    12: "single_choice",
    13: "single_choice",
    14: "single_choice",
    15: "single_choice",
    16: "single_choice",
    17: "single_choice",
    18: "single_choice",
    19: "single_choice",
    20: "single_choice",
    25: "multiple_choice",
    26: "multiple_choice",
    31: "single_choice",
    32: "single_choice",
    39: "multiple_choice",
    40: "multiple_choice",
  },
  3: {
    1: "form",
    2: "form",
    3: "form",
    4: "form",
    5: "single_choice",
    6: "single_choice",
    7: "single_choice",
    8: "form",
    9: "form",
    10: "form",
    11: "single_choice",
    12: "single_choice",
    13: "single_choice",
    14: "single_choice",
    15: "table",
    16: "table",
    17: "table",
    18: "table",
    19: "table",
    20: "table",
    21: "single_choice",
    22: "single_choice",
    23: "single_choice",
    24: "single_choice",
    25: "single_choice",
    26: "single_choice",
    27: "single_choice",
    28: "single_choice",
    29: "single_choice",
    30: "single_choice",
    38: "multiple_choice",
    39: "single_choice",
    40: "multiple_choice",
  },
  4: {
    11: "single_choice",
    12: "single_choice",
    13: "single_choice",
    14: "single_choice",
    15: "single_choice",
    16: "table",
    17: "table",
    18: "table",
    19: "table",
    20: "table",
    21: "table",
    22: "table",
    23: "table",
    24: "table",
    25: "table",
    26: "table",
    27: "matching",
    28: "matching",
    29: "matching",
    30: "matching",
    35: "single_choice",
    36: "single_choice",
    37: "single_choice",
    38: "single_choice",
    39: "multiple_choice",
    40: "multiple_choice",
  },
};

const questionPromptsByTest = {
  2: {
    1: `What does Peter want to drink?
A. tea
B. coffee
C. a cold drink`,
    2: `What caused Peter problems at the bank?
A. The exchange rate was down.
B. He was late.
C. The computers weren't working.`,
    3: `Who did Peter talk to at the bank?
A. an old friend
B. an American man
C. a German man`,
    4: `Henry gave Peter a map of
A. the city.
B. the bus routes.
C. the train system.`,
    5: `What do Peter and Sally decide to order?
A. food and drinks
B. just food
C. just drinks`,
    6: `Complete the notes using a word from the box.
Art Gallery · Cathedral · Castle · Gardens · Markets
Tourist attractions open all day: ______ and Gardens`,
    7: `Complete the notes using a word from the box.
Art Gallery · Cathedral · Castle · Gardens · Markets
Tourist attractions NOT open on Mondays: ______ and Castle`,
    8: `Complete the notes using a word from the box.
Art Gallery · Cathedral · Castle · Gardens · Markets
Tourist attractions which have free entry: ______ and Markets`,
    9: `Write NO MORE THAN THREE WORDS.
The first place Peter and Sally will visit is the ______.`,
    10: `Write NO MORE THAN THREE WORDS.
At the Cathedral, Peter really wants to ______.`,
    11: `The Counselling Service may contact tutors if
A. they are too slow in marking assignments.
B. they give students a lot of work.
C. they don't inform students about their progress.`,
    12: `Stress may be caused by
A. new teachers.
B. time pressure.
C. unfamiliar subject matter.`,
    13: `International students may find stress difficult to handle because
A. they lack support from family and friends.
B. they don't have time to make new friends.
C. they find it difficult to socialise.`,
    14: `A personal crisis may be caused by
A. studying for too long overseas.
B. business problems in the student's own country.
C. disruptions to personal relationships.`,
    15: `Students may lose self-esteem if
A. they have to change courses.
B. they don't complete a course.
C. their family puts too much pressure on them.`,
    16: `Students should consult Glenda Roberts if
A. their general health is poor.
B. their diet is too strict.
C. they can't eat the local food.`,
    17: `Students in financial difficulties can receive
A. assistance to buy books.
B. a loan to pay their course fees.
C. a no-interest loan to cover study expenses.`,
    18: `Loans are also available to students who
A. can't pay their rent.
B. need to buy furniture.
C. can't cover their living expenses.`,
    19: `The number of students counselled by the service last year was
A. 214.
B. 240.
C. 2,600.`,
    20: `The speaker thinks the Counselling Service
A. has been effective in spite of staff shortages.
B. is under-used by students.
C. has suffered badly because of staff cuts.`,
    21: `DETAILS OF ASSIGNMENT — Part 1
Write NO MORE THAN TWO WORDS AND/OR A NUMBER.
Title: "Assess the two main methods of ______ in social science research"`,
    22: `DETAILS OF ASSIGNMENT — Part 1
Number of words: ______`,
    23: `DETAILS OF ASSIGNMENT — Part 2: Small-scale study
Choose one method. Gather data from at least ______ subjects.`,
    24: `DETAILS OF ASSIGNMENT — Part 3: Report on study
Number of words: ______`,
    25: `Choose TWO letters A–E. Enter one letter for this answer.
What TWO disadvantages of the questionnaire form of data collection do the students discuss?
A. The data is sometimes invalid.
B. Too few people may respond.
C. It is less likely to reveal the unexpected.
D. It can only be used with literate populations.
E. There is a delay between the distribution and return of questionnaires.`,
    26: `Choose TWO letters A–E. Enter the other letter for this answer.
What TWO disadvantages of the questionnaire form of data collection do the students discuss?
A. The data is sometimes invalid.
B. Too few people may respond.
C. It is less likely to reveal the unexpected.
D. It can only be used with literate populations.
E. There is a delay between the distribution and return of questionnaires.`,
    27: `Complete the table. Write NO MORE THAN THREE WORDS OR A NUMBER.
AUTHOR: ______
TITLE: "Sample Surveys in Social Science Research"`,
    28: `Complete the table. Write NO MORE THAN THREE WORDS OR A NUMBER.
AUTHOR: Bell
TITLE: ______`,
    29: `Complete the table. Write NO MORE THAN THREE WORDS OR A NUMBER.
AUTHOR: Bell
PUBLISHER: ______`,
    30: `Complete the table. Write NO MORE THAN THREE WORDS OR A NUMBER.
AUTHOR: Wilson
TITLE: "Interviews That Work"
PUBLISHER: Oxford University Press
YEAR OF PUBLICATION: ______`,
    31: `Corporate crime is generally committed
A. against individuals.
B. by groups.
C. for companies.`,
    32: `Corporate crime does NOT include
A. employees stealing from their company.
B. unintentional crime by employees.
C. fraud resulting from company policy.`,
    33: `Complete the notes. Write NO MORE THAN THREE WORDS.
Corporate crime has been ignored by:
a) the ______, e.g. films`,
    34: `Complete the notes. Write NO MORE THAN THREE WORDS.
Corporate crime has been ignored by:
b) ______`,
    35: `Complete the notes. Write NO MORE THAN THREE WORDS.
Reason: corporate crime is often more complex and needs ______.`,
    36: `Complete the notes. Write NO MORE THAN THREE WORDS.
Reason: victims are often ______.`,
    37: `Complete the notes. Write NO MORE THAN THREE WORDS.
Economic costs may appear unimportant to ______.`,
    38: `Complete the notes. Write NO MORE THAN THREE WORDS.
Corporate crime can make large ______ for a company.`,
    39: `Choose TWO letters A–F. Enter one letter for this answer.
The oil tanker explosion was an example of a crime which
A. was no-one's fault.
B. was not a corporate crime.
C. was intentional.
D. was caused by indifference.
E. had tragic results.
F. made a large profit for the company.`,
    40: `Choose TWO letters A–F. Enter the other letter for this answer.
The oil tanker explosion was an example of a crime which
A. was no-one's fault.
B. was not a corporate crime.
C. was intentional.
D. was caused by indifference.
E. had tragic results.
F. made a large profit for the company.`,
  },
  3: {
    1: `Accommodation Request Form
Write NO MORE THAN THREE WORDS AND/OR NUMBERS.
Length of time in Australia: ______`,
    2: `Accommodation Request Form
Present address: Flat 1, 539 ______ Road, Canterbury 2036`,
    3: `Accommodation Request Form
Present course: ______ English`,
    4: `Accommodation Request Form
Accommodation required from: ______, 7th September`,
    5: `Sara requires a
A. single room.
B. twin room.
C. triple room.`,
    6: `She would prefer to live with a
A. family.
B. single person.
C. couple.`,
    7: `She would like to live in a
A. flat.
B. house.
C. studio apartment.`,
    8: `Complete the sentence. Write NO MORE THAN ONE WORD.
The ______ will be $320.`,
    9: `Complete the sentence. Write NO MORE THAN ONE WORD.
She needs to pay the rent by cash or cheque on a ______ basis.`,
    10: `Complete the sentence. Write NO MORE THAN ONE WORD.
She needs to pay her part of the ______ bill.`,
    11: `When is this year's festival being held?
A. 1–13 January
B. 5–17 January
C. 25–31 January`,
    12: `What will the reviewer concentrate on today?
A. theatre
B. dance
C. exhibitions`,
    13: `How many circuses are there in the festival?
A. one
B. two
C. several`,
    14: `Where does Circus Romano perform?
A. in a theatre
B. in a tent
C. in a stadium`,
    15: `Complete the festival notes. Write NO MORE THAN THREE WORDS.
Circus Romano — Type: clowns and acrobats
Highlights: music and ______`,
    16: `Complete the festival notes. Write NO MORE THAN THREE WORDS.
Circus Romano — Type of audience: ______`,
    17: `Complete the festival notes. Write NO MORE THAN THREE WORDS.
Circus Electrica — Where: ______`,
    18: `Complete the festival notes. Write NO MORE THAN THREE WORDS.
Circus Electrica — Type: dancers and magicians
Type of audience: ______`,
    19: `Complete the festival notes. Write NO MORE THAN THREE WORDS.
Mekong Water Puppets — Where: ______`,
    20: `Complete the festival notes. Write NO MORE THAN THREE WORDS.
Mekong Water Puppets — Highlight: seeing the puppeteers at the end
Type of audience: ______`,
    21: `The man wants information on courses for
A. people going back to college.
B. postgraduate students.
C. business executives.`,
    22: `The "Study for Success" seminar lasts for
A. one day.
B. two days.
C. three days.`,
    23: `In the seminar the work on writing aims to improve
A. confidence.
B. speed.
C. clarity.`,
    24: `Reading sessions help students to read
A. analytically.
B. as fast as possible.
C. thoroughly.`,
    25: `The seminar tries to
A. prepare learners physically.
B. encourage interest in learning.
C. develop literacy skills.`,
    26: `A key component of the course is learning how to
A. use time effectively.
B. stay healthy.
C. select appropriate materials.`,
    27: `Students who want to do the "Study for Success" seminar should
A. register with the Faculty Office.
B. contact their Course Convenor.
C. reserve a place in advance.`,
    28: `The "Learning Skills for University Study" course takes place on
A. Monday, Wednesday and Friday.
B. Monday, Tuesday and Wednesday.
C. Monday, Thursday and Friday.`,
    29: `A feature of this course is
A. a physical training component.
B. advice on coping with stress.
C. a detailed weekly planner.`,
    30: `The man chooses the "Study for Success" seminar because
A. he is over forty.
B. he wants to start at the beginning.
C. he seeks to revise his skills.`,
    31: `New Union Building — Procedures to establish student opinion
Write NO MORE THAN TWO WORDS AND/OR A NUMBER.
Students' written suggestions informed the design of a ______.`,
    32: `New Union Building — Procedures to establish student opinion
Number of respondents: ______`,
    33: `CHOICE OF SITE — Site One
Location: City centre near Faculty of ______`,
    34: `CHOICE OF SITE — Site Three
Location: Out of town near the ______`,
    35: `CHOICE OF SITE — Site One
Disadvantages: problems with ______`,
    36: `CHOICE OF SITE — Site Two
Advantages: close to ______`,
    37: `CHOICE OF SITE — Site Three
Advantages: access to living quarters; larger site, so more ______`,
    38: `Choose TWO letters A–G. Enter both letters.
Which TWO facilities did the students request in the new Union building?
A. a library
B. a games room
C. a student health centre
D. a mini fitness centre
E. a large swimming pool
F. a travel agency
G. a lecture theatre`,
    39: `Which argument was used AGAINST having a drama theatre?
A. It would be expensive and no students would use it.
B. It would be a poor use of resources because only a minority would use it.
C. It could not accommodate large productions of plays.`,
    40: `Choose TWO letters A–E. Enter both letters.
Which TWO security measures have been requested?
A. closed-circuit TV
B. show Union Card on entering the building
C. show Union Card when asked
D. spot searches of bags
E. permanent Security Office on site`,
  },
  4: {
    1: `GOODBYE PARTY FOR JOHN
Write NO MORE THAN THREE WORDS AND/OR A NUMBER.
Venue: ______`,
    2: `GOODBYE PARTY FOR JOHN — Invitations
Who to invite: John and his wife; Director; the ______; all the teachers; all the students`,
    3: `GOODBYE PARTY FOR JOHN — Invitations
Who to invite: John and his wife; Director; the office staff; all the teachers; all the ______`,
    4: `GOODBYE PARTY FOR JOHN — Invitations
Date for sending invitations: ______`,
    5: `GOODBYE PARTY FOR JOHN — Present
Collect money during the ______`,
    6: `GOODBYE PARTY FOR JOHN — Present
Suggested amount per person: $______`,
    7: `GOODBYE PARTY FOR JOHN — Present
Check prices for: CD players; ______; coffee maker`,
    8: `GOODBYE PARTY FOR JOHN
Ask guests to bring: snacks; ______; photos`,
    9: `GOODBYE PARTY FOR JOHN
Ask guests to bring: snacks; music; ______`,
    10: `GOODBYE PARTY FOR JOHN
Ask the student representative to prepare a ______`,
    11: `To find out how much holidays cost, you should press button
A. one.
B. two.
C. three.`,
    12: `Travelite currently offer walking holidays
A. only in Western Europe.
B. all over Europe.
C. outside Europe.`,
    13: `The walks offered by Travelite
A. cater for a range of walking abilities.
B. are planned by guides from the local area.
C. are for people with good fitness levels.`,
    14: `On Travelite holidays, people holidaying alone pay
A. the same as other clients.
B. only a little more than other clients.
C. extra only if they stay in a large room.`,
    15: `Entertainment is provided
A. when guests request it.
B. most nights.
C. every night.`,
    16: `Complete the holiday table. Write NO MORE THAN THREE WORDS AND/OR A NUMBER.
Length: 3 days
Cost per person: $______`,
    17: `Complete the holiday table.
Length: 3 days
Special offer: pick up from the ______`,
    18: `Complete the holiday table.
Length: 7 days
Special offers: as above, plus a book of ______ and maps`,
    19: `Complete the holiday table.
Length: 14 days
Cost per person: $______`,
    20: `Complete the holiday table.
Length: 14 days
Special offer: membership of a ______`,
    21: `Complete the experiment table. Write NO MORE THAN THREE WORDS AND/OR A NUMBER.
Experiment 1 — Equipment: ______ and a table
Purpose: to show how things move on a cushion of air`,
    22: `Complete the experiment table.
Experiment 2 — Equipment: lots of paperclips
Purpose: to show why we need standard ______`,
    23: `Complete the experiment table.
Experiment 3 — Equipment: ______ and a jar of water`,
    24: `Complete the experiment table.
Experiment 3 — Purpose: to show how ______ grow`,
    25: `Complete the experiment table.
Experiment 4 — Equipment: cardboard, coloured pens and a ______`,
    26: `Complete the experiment table.
Experiment 4 — Purpose: to teach children about how ______ is made up`,
    27: `Choose a problem A–H for Experiment 1.
A. too messy
B. too boring
C. too difficult
D. too much equipment
E. too long
F. too easy
G. too noisy
H. too dangerous`,
    28: `Choose a problem A–H for Experiment 2.
A. too messy
B. too boring
C. too difficult
D. too much equipment
E. too long
F. too easy
G. too noisy
H. too dangerous`,
    29: `Choose a problem A–H for Experiment 3.
A. too messy
B. too boring
C. too difficult
D. too much equipment
E. too long
F. too easy
G. too noisy
H. too dangerous`,
    30: `Choose a problem A–H for Experiment 5.
A. too messy
B. too boring
C. too difficult
D. too much equipment
E. too long
F. too easy
G. too noisy
H. too dangerous`,
    31: `Sharks in Australia — Complete the notes.
Weight — heaviest: ______ kg`,
    32: `Sharks in Australia — Complete the notes.
Swimming aids: fins and ______`,
    33: `Sharks in Australia — Complete the notes.
Food: gathered from the ocean ______`,
    34: `Sharks in Australia — Complete the notes.
Sharks locate food by using their ______`,
    35: `Shark meshing uses nets laid
A. along the coastline.
B. at an angle to the beach.
C. from the beach to the sea.`,
    36: `Other places that have taken up shark meshing include
A. South Africa.
B. New Zealand.
C. Tahiti.`,
    37: `The average number of sharks caught in nets each year is
A. 15.
B. 150.
C. 1,500.`,
    38: `Most sharks are caught in
A. spring.
B. summer.
C. winter.`,
    39: `Choose TWO letters A–G. Enter one letter for this answer.
Which TWO factors reduce the benefits of shark nets?
A. nets wrongly positioned
B. strong waves and currents
C. too many fish
D. sharks eat holes in nets
E. moving sands
F. nets too short
G. holes in nets scare sharks`,
    40: `Choose TWO letters A–G. Enter the other letter for this answer.
Which TWO factors reduce the benefits of shark nets?
A. nets wrongly positioned
B. strong waves and currents
C. too many fish
D. sharks eat holes in nets
E. moving sands
F. nets too short
G. holes in nets scare sharks`,
  },
};

const fallbackTranslations = new Map([
  ["good morning", "早上好。"],
  ["good evening", "晚上好。"],
  ["thank you", "谢谢。"],
  ["okay", "好的。"],
  ["ok", "好的。"],
  ["right", "好的。"],
  ["oh yes", "哦，是的。"],
  ["yeah", "是的。"],
  ["great", "太好了。"],
  ["10th", "10号吗？"],
  ["uh yes", "嗯，是的。"],
  [
    "you ll hear the beginning of one lecture in a series of lectures about crime",
    "你将听到一系列犯罪主题讲座中某一讲的开头部分。",
  ],
  ["now turn to section two", "现在请翻到第二部分。"],
  ["now turn to section three", "现在请翻到第三部分。"],
  ["now turn to section four", "现在请翻到第四部分。"],
  ["now turn to section 2", "现在请翻到第二部分。"],
  ["now turn to section 3", "现在请翻到第三部分。"],
  ["now turn to section 4", "现在请翻到第四部分。"],
  ["section two", "第二部分。"],
  ["section three", "第三部分。"],
  ["section four", "第四部分。"],
  ["section 2", "第二部分。"],
  ["section 3", "第三部分。"],
  ["section 4", "第四部分。"],
]);

function cleanText(value = "") {
  return value
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanChineseText(value = "") {
  return cleanText(value)
    .replace(/([\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/gu, "$1")
    .replace(/\s+([，。！？；：、）】》])/gu, "$1")
    .replace(/([（【《])\s+/gu, "$1");
}

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function readDocxParagraphLines(filePath) {
  const xml = execFileSync("unzip", ["-p", filePath, "word/document.xml"], {
    encoding: "utf8",
  });

  return [...xml.matchAll(/<w:p(?:\s|>)[\s\S]*?<\/w:p>/g)]
    .map((paragraphMatch) => {
      let text = "";
      const tokenPattern =
        /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(?:br|cr)\b[^>]*\/?>/g;
      let tokenMatch;

      while ((tokenMatch = tokenPattern.exec(paragraphMatch[0])) !== null) {
        text += tokenMatch[1] == null ? "\n" : decodeXmlEntities(tokenMatch[1]);
      }

      return text
        .split(/\n+/)
        .map(cleanText)
        .filter(Boolean);
    })
    .filter((lines) => lines.length > 0);
}

function hasLatinText(value) {
  return (value.match(/[A-Za-z]/g) ?? []).length >= 4;
}

function hasChineseText(value) {
  return /[\u3400-\u9fff]/u.test(value);
}

function stripEnglishSpeaker(value) {
  const match = cleanText(value).match(/^([A-Z][A-Z .'-]{1,28}):\s*(.+)$/);
  return {
    speaker: match?.[1] ? cleanText(match[1]) : null,
    text: cleanText(match?.[2] ?? value),
  };
}

function stripChineseSpeaker(value) {
  return cleanChineseText(value).replace(/^[\u3400-\u9fff·]{1,12}[：:]\s*/u, "");
}

export function parseBilingualPairs(filePath) {
  const paragraphs = readDocxParagraphLines(filePath);
  const pairs = [];

  for (let index = 0; index < paragraphs.length; index += 1) {
    const lines = paragraphs[index];
    let englishText = "";
    let chineseText = "";

    if (lines.length >= 2 && hasLatinText(lines[0]) && hasChineseText(lines[1])) {
      englishText = lines[0];
      chineseText = lines.slice(1).join(" ");
    } else if (
      lines.length === 1 &&
      hasLatinText(lines[0]) &&
      paragraphs[index + 1]?.length === 1 &&
      hasChineseText(paragraphs[index + 1][0]) &&
      !hasLatinText(paragraphs[index + 1][0])
    ) {
      englishText = lines[0];
      chineseText = paragraphs[index + 1][0];
      index += 1;
    } else {
      continue;
    }

    if (/^(?:例句|剑桥雅思|时间|英文原文|中文翻译)/u.test(chineseText)) {
      continue;
    }

    const strippedEnglish = stripEnglishSpeaker(englishText);
    const strippedChinese = stripChineseSpeaker(chineseText);
    if (
      strippedEnglish.text.length < 2 ||
      strippedChinese.length < 1 ||
      !hasLatinText(strippedEnglish.text) ||
      !hasChineseText(strippedChinese)
    ) {
      continue;
    }

    pairs.push({
      chineseText: strippedChinese,
      englishText: strippedEnglish.text,
      speaker: strippedEnglish.speaker,
    });
  }

  return pairs;
}

function timecodeToMs(value) {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) {
    throw new Error(`Invalid SRT timecode: ${value}`);
  }

  const [, hours, minutes, seconds, milliseconds] = match.map(Number);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
}

export function parseSrtCues(testNo, sectionNo) {
  const sourceDir = path.join(sourceRoot, `test${testNo}`);
  const srtPath = path.join(sourceDir, `4test${testNo}_section${sectionNo}.srt`);
  const rawSrt = readFileSync(srtPath, "utf8").replace(/\r/g, "");

  return rawSrt
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map(cleanText)
        .filter(Boolean);
      const sentenceNo = Number(lines[0]);
      const timeMatch = lines[1]?.match(
        /^(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})$/,
      );

      if (!Number.isInteger(sentenceNo) || !timeMatch) {
        throw new Error(`Invalid SRT block in Test ${testNo} Section ${sectionNo}: ${block}`);
      }

      return {
        sentenceNo,
        englishText: cleanText(lines.slice(2).join(" ")),
        startMs: timecodeToMs(timeMatch[1]),
        endMs: timecodeToMs(timeMatch[2]),
      };
    });
}

function wordsForMatch(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9']+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

function similarity(leftText, rightText) {
  const left = wordsForMatch(leftText);
  const right = wordsForMatch(rightText);
  const rightCounts = new Map();
  let common = 0;

  for (const word of right) {
    rightCounts.set(word, (rightCounts.get(word) ?? 0) + 1);
  }

  for (const word of left) {
    const count = rightCounts.get(word) ?? 0;
    if (count > 0) {
      common += 1;
      rightCounts.set(word, count - 1);
    }
  }

  return left.length + right.length === 0 ? 0 : (2 * common) / (left.length + right.length);
}

function findBestCueWindow(pair, cues, cueIndex) {
  let best = null;
  const maxStart = Math.min(cues.length - 1, cueIndex + 4);

  for (let startIndex = cueIndex; startIndex <= maxStart; startIndex += 1) {
    const maxEnd = Math.min(cues.length - 1, startIndex + 23);
    let combined = "";

    for (let endIndex = startIndex; endIndex <= maxEnd; endIndex += 1) {
      combined += ` ${cues[endIndex].englishText}`;
      const score = similarity(pair.englishText, combined) - (startIndex - cueIndex) * 0.025;

      if (!best || score > best.score) {
        best = { endIndex, score, startIndex };
      }

      const pairWordCount = wordsForMatch(pair.englishText).length;
      if (wordsForMatch(combined).length > pairWordCount * 1.65 + 8) {
        break;
      }
    }
  }

  return best;
}

function splitChineseText(text, weights) {
  if (weights.length === 1) {
    return [cleanChineseText(text)];
  }

  const source = cleanChineseText(text);
  const totalWeight = weights.reduce((sum, value) => sum + Math.max(1, value), 0);
  const punctuationIndexes = [];

  for (let index = 1; index < source.length - 1; index += 1) {
    if (/[，。！？；：、]/u.test(source[index])) {
      punctuationIndexes.push(index + 1);
    }
  }

  const boundaries = [0];
  let cumulativeWeight = 0;
  const targets = [];

  for (let partIndex = 0; partIndex < weights.length - 1; partIndex += 1) {
    cumulativeWeight += Math.max(1, weights[partIndex]);
    targets.push(Math.round((source.length * cumulativeWeight) / totalWeight));
  }

  const candidatePositions = Array.from(
    new Set([
      ...punctuationIndexes,
      ...targets.map((target, index) =>
        Math.max(index + 1, Math.min(source.length - (targets.length - index), target)),
      ),
    ]),
  ).sort((a, b) => a - b);
  const punctuationSet = new Set(punctuationIndexes);
  const memo = new Map();

  function chooseBoundaries(targetIndex, previousPosition) {
    if (targetIndex >= targets.length) {
      return { cost: 0, positions: [] };
    }

    const memoKey = `${targetIndex}:${previousPosition}`;
    if (memo.has(memoKey)) {
      return memo.get(memoKey);
    }

    const remainingBoundaries = targets.length - targetIndex - 1;
    const maxPosition = source.length - remainingBoundaries - 1;
    let best = null;

    for (const position of candidatePositions) {
      if (position <= previousPosition || position > maxPosition) {
        continue;
      }

      const next = chooseBoundaries(targetIndex + 1, position);
      if (!next) {
        continue;
      }

      const nonPunctuationPenalty = punctuationSet.has(position)
        ? 0
        : Math.max(10, source.length * 0.3);
      const cost =
        Math.abs(position - targets[targetIndex]) + nonPunctuationPenalty + next.cost;
      if (!best || cost < best.cost) {
        best = { cost, positions: [position, ...next.positions] };
      }
    }

    memo.set(memoKey, best);
    return best;
  }

  boundaries.push(...(chooseBoundaries(0, 0)?.positions ?? targets));
  boundaries.push(source.length);
  return boundaries.slice(0, -1).map((start, index) =>
    cleanChineseText(source.slice(start, boundaries[index + 1])),
  );
}

function splitChineseForCues(text, cues, sourceEnglishText) {
  const rawEnglishSentences =
    cleanText(sourceEnglishText)
      .match(/[^.!?;]+[.!?;]+(?:["')\]]+)?|[^.!?;]+$/g)
      ?.map(cleanText)
      .filter(Boolean) ?? [];
  const rawChineseSentences =
    cleanChineseText(text)
      .match(/[^。！？；]+[。！？；]?/gu)
      ?.map(cleanChineseText)
      .filter(Boolean) ?? [];

  if (rawEnglishSentences.length === 0 || rawChineseSentences.length === 0) {
    return splitChineseText(
      text,
      cues.map((cue) => wordsForMatch(cue.englishText).length),
    );
  }

  const totalEnglishWords = rawEnglishSentences.reduce(
    (sum, sentence) => sum + Math.max(1, wordsForMatch(sentence).length),
    0,
  );
  const totalChineseChars = rawChineseSentences.reduce(
    (sum, sentence) => sum + Math.max(1, sentence.length),
    0,
  );
  const alignmentScores = Array.from(
    { length: rawEnglishSentences.length + 1 },
    () => Array(rawChineseSentences.length + 1).fill(Number.POSITIVE_INFINITY),
  );
  const alignmentPrevious = Array.from(
    { length: rawEnglishSentences.length + 1 },
    () => Array(rawChineseSentences.length + 1).fill(null),
  );
  const englishSpanLimit =
    rawEnglishSentences.length <= rawChineseSentences.length ? 1 : 4;
  const chineseSpanLimit =
    rawChineseSentences.length <= rawEnglishSentences.length ? 1 : 4;
  alignmentScores[0][0] = 0;

  for (
    let englishIndex = 0;
    englishIndex < rawEnglishSentences.length;
    englishIndex += 1
  ) {
    for (
      let chineseIndex = 0;
      chineseIndex < rawChineseSentences.length;
      chineseIndex += 1
    ) {
      if (!Number.isFinite(alignmentScores[englishIndex][chineseIndex])) {
        continue;
      }

      for (
        let englishSpan = 1;
        englishSpan <=
        Math.min(englishSpanLimit, rawEnglishSentences.length - englishIndex);
        englishSpan += 1
      ) {
        const englishShare =
          rawEnglishSentences
            .slice(englishIndex, englishIndex + englishSpan)
            .reduce(
              (sum, sentence) => sum + Math.max(1, wordsForMatch(sentence).length),
              0,
            ) / totalEnglishWords;

        for (
          let chineseSpan = 1;
          chineseSpan <=
          Math.min(chineseSpanLimit, rawChineseSentences.length - chineseIndex);
          chineseSpan += 1
        ) {
          const chineseShare =
            rawChineseSentences
              .slice(chineseIndex, chineseIndex + chineseSpan)
              .reduce((sum, sentence) => sum + Math.max(1, sentence.length), 0) /
            totalChineseChars;
          const nextEnglishIndex = englishIndex + englishSpan;
          const nextChineseIndex = chineseIndex + chineseSpan;
          const transitionCost =
            Math.abs(englishShare - chineseShare) * 10 +
            Math.abs(englishSpan - chineseSpan) * 0.08 +
            (englishSpan + chineseSpan - 2) * 0.015;
          const cost =
            alignmentScores[englishIndex][chineseIndex] + transitionCost;

          if (cost < alignmentScores[nextEnglishIndex][nextChineseIndex]) {
            alignmentScores[nextEnglishIndex][nextChineseIndex] = cost;
            alignmentPrevious[nextEnglishIndex][nextChineseIndex] = {
              chineseIndex,
              englishIndex,
            };
          }
        }
      }
    }
  }

  const alignedUnits = [];
  let englishIndex = rawEnglishSentences.length;
  let chineseIndex = rawChineseSentences.length;

  while (englishIndex > 0 && chineseIndex > 0) {
    const previous = alignmentPrevious[englishIndex][chineseIndex];
    if (!previous) {
      return splitChineseText(
        text,
        cues.map((cue) => wordsForMatch(cue.englishText).length),
      );
    }

    alignedUnits.unshift({
      chineseText: rawChineseSentences
        .slice(previous.chineseIndex, chineseIndex)
        .join(""),
      englishText: rawEnglishSentences
        .slice(previous.englishIndex, englishIndex)
        .join(" "),
    });
    englishIndex = previous.englishIndex;
    chineseIndex = previous.chineseIndex;
  }

  const englishSentences = alignedUnits.map((unit) => unit.englishText);
  const chineseSentences = alignedUnits.map((unit) => unit.chineseText);
  const cueWordCounts = cues.map((cue) =>
    Math.max(1, wordsForMatch(cue.englishText).length),
  );
  const sentenceWordCounts = englishSentences.map((sentence) =>
    Math.max(1, wordsForMatch(sentence).length),
  );
  const totalCueWords = cueWordCounts.reduce((sum, count) => sum + count, 0);
  const totalSentenceWords = sentenceWordCounts.reduce((sum, count) => sum + count, 0);
  const cueBoundaries = [0];
  let cumulativeCueWords = 0;

  for (const count of cueWordCounts) {
    cumulativeCueWords += count;
    cueBoundaries.push((cumulativeCueWords / totalCueWords) * totalSentenceWords);
  }

  const sentenceBoundaries = [];
  let cumulativeSentenceWords = 0;
  for (const count of sentenceWordCounts.slice(0, -1)) {
    cumulativeSentenceWords += count;
    sentenceBoundaries.push(cumulativeSentenceWords);
  }

  let sentenceIndex = 0;
  let cueSegmentStart = 0;

  for (let cueIndex = 0; cueIndex < cues.length - 1; cueIndex += 1) {
    if (!/[.!?;]["')\]]?$/u.test(cues[cueIndex].englishText)) {
      continue;
    }

    const boundaryIndex = cueIndex + 1;
    const cueSegmentText = cues
      .slice(cueSegmentStart, boundaryIndex)
      .map((cue) => cue.englishText)
      .join(" ");
    let best = null;

    for (
      let sentenceSpan = 1;
      sentenceSpan <= Math.min(4, englishSentences.length - sentenceIndex);
      sentenceSpan += 1
    ) {
      const sentenceText = englishSentences
        .slice(sentenceIndex, sentenceIndex + sentenceSpan)
        .join(" ");
      const score = similarity(cueSegmentText, sentenceText);
      if (!best || score > best.score) {
        best = { score, sentenceSpan };
      }
    }

    if (best?.score >= 0.55) {
      sentenceIndex += best.sentenceSpan;
      cueBoundaries[boundaryIndex] =
        sentenceBoundaries[sentenceIndex - 1] ?? totalSentenceWords;
      cueSegmentStart = boundaryIndex;
    }
  }

  const cueRanges = cues.map((_, index) => ({
    end: cueBoundaries[index + 1],
    start: cueBoundaries[index],
  }));
  const partsByCue = cues.map(() => []);
  let sentenceStart = 0;

  for (let sentenceIndex = 0; sentenceIndex < englishSentences.length; sentenceIndex += 1) {
    const sentenceEnd = sentenceStart + sentenceWordCounts[sentenceIndex];
    const overlappingCues = cueRanges
      .map((range, cueIndex) => ({
        cueIndex,
        overlap: Math.max(
          0,
          Math.min(range.end, sentenceEnd) - Math.max(range.start, sentenceStart),
        ),
      }))
      .filter((item) => item.overlap > 0.001);
    const sentenceParts = splitChineseText(
      chineseSentences[sentenceIndex],
      overlappingCues.map((item) => item.overlap),
    );

    overlappingCues.forEach((item, index) => {
      partsByCue[item.cueIndex].push(sentenceParts[index]);
    });
    sentenceStart = sentenceEnd;
  }

  return partsByCue.map((parts, cueIndex) =>
    cleanChineseText(parts.join("")) ||
    splitChineseText(text, cueWordCounts)[cueIndex],
  );
}

function fallbackTranslation(englishText) {
  const normalized = cleanText(englishText)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (fallbackTranslations.has(normalized)) {
    return fallbackTranslations.get(normalized);
  }

  const questionRange = normalized.match(/^questions? (\d+) to (\d+)$/);
  if (questionRange) {
    return `第 ${questionRange[1]} 至 ${questionRange[2]} 题。`;
  }

  const sectionIntro = normalized.match(/^you will hear (.+)$/);
  if (sectionIntro) {
    return `你将听到${sectionIntro[1].replace(/\.$/, "")}。`;
  }

  return "（原文提示语）";
}

export function buildTranscriptSentences(testNo, sectionNo, audit = null) {
  const sourceDir = path.join(sourceRoot, `test${testNo}`);
  const docxPath = path.join(sourceDir, `4test${testNo}_section${sectionNo}.docx`);
  const cues = parseSrtCues(testNo, sectionNo);
  const pairs = parseBilingualPairs(docxPath);
  const translations = Array(cues.length).fill("");
  const speakers = Array(cues.length).fill(null);
  const matchedScores = [];
  let cueIndex = 0;

  for (const pair of pairs) {
    if (cueIndex >= cues.length) {
      break;
    }

    const window = findBestCueWindow(pair, cues, cueIndex);
    if (!window || window.score < 0.48) {
      continue;
    }

    const matchedCues = cues.slice(window.startIndex, window.endIndex + 1);
    const chineseParts = splitChineseForCues(
      pair.chineseText,
      matchedCues,
      pair.englishText,
    );

    for (let index = window.startIndex; index <= window.endIndex; index += 1) {
      translations[index] = chineseParts[index - window.startIndex];
      speakers[index] = pair.speaker;
    }

    matchedScores.push(window.score);
    cueIndex = window.endIndex + 1;
  }

  const unmatched = [];
  const rows = cues.map((cue, index) => {
    const sentenceNoPadded = String(cue.sentenceNo).padStart(3, "0");
    const chineseText = translations[index] || fallbackTranslation(cue.englishText);

    if (!translations[index]) {
      unmatched.push({ englishText: cue.englishText, sentenceNo: cue.sentenceNo });
    }

    return {
      audioPath: `listening/ci4/t${testNo}/s${sectionNo}/sentences/ci4_t${testNo}_s${sectionNo}_${sentenceNoPadded}.mp3`,
      chineseText,
      endMs: cue.endMs,
      englishText: cue.englishText,
      sentenceNo: cue.sentenceNo,
      speaker: speakers[index],
      startMs: cue.startMs,
    };
  });

  if (audit) {
    audit({
      matchedPairCount: matchedScores.length,
      minimumMatchScore: matchedScores.length ? Math.min(...matchedScores) : 0,
      pairCount: pairs.length,
      sentenceCount: rows.length,
      unmatched,
    });
  }

  return rows;
}

function answerFor(testNo, questionNo) {
  const answers = answersByTest[testNo]?.[questionNo];
  if (!answers?.length) {
    throw new Error(`Missing Test ${testNo} answer for question ${questionNo}.`);
  }

  return {
    answerText: answers[0],
    variants: answers.slice(1),
  };
}

function questionPrompt(testNo, questionNo) {
  const prompt = questionPromptsByTest[testNo]?.[questionNo];

  if (!prompt) {
    throw new Error(`Missing Test ${testNo} prompt for question ${questionNo}.`);
  }

  return prompt;
}

export function buildSectionSeed(testNo, sectionNo, audit = null) {
  if (![2, 3, 4].includes(testNo) || ![1, 2, 3, 4].includes(sectionNo)) {
    throw new Error(`Unsupported Cambridge 4 Test ${testNo} Section ${sectionNo}.`);
  }

  const firstQuestionNo = (sectionNo - 1) * 10 + 1;

  return {
    book: {
      code: "cambridge-4",
      isPublished: true,
      sourceType: "cambridge",
      title: "Cambridge IELTS 4",
    },
    questions: Array.from({ length: 10 }, (_, index) => {
      const questionNo = firstQuestionNo + index;
      return {
        questionNo,
        questionType: questionTypesByTest[testNo]?.[questionNo] ?? "fill_blank",
        promptText: questionPrompt(testNo, questionNo),
        ...answerFor(testNo, questionNo),
      };
    }),
    section: {
      fullAudioPath: `listening/ci4/t${testNo}/s${sectionNo}/full.mp3`,
      questionCount: 10,
      questionImagePath: null,
      sectionNo,
      timeLimitSeconds: 600,
      title: `Section ${sectionNo}`,
    },
    test: {
      isPublished: true,
      testNo,
      title: `Test ${testNo}`,
    },
    transcriptSentences: buildTranscriptSentences(testNo, sectionNo, audit),
  };
}

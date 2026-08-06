// Cambridge IELTS 6 - Test 2/3/4 Listening seed data.
// Data verified against 剑桥雅思6.pdf (PDF pages 34-40/56-63/79-85 for questions,
// 154/156/158 for answers). OCR artifacts corrected (internet/primary/1,450 etc).

// questionNo -> [answerText, ...variants]
const answersByTest = {
  2: {
    1: ["8"],
    2: ["in Tamer", "on Tamer", "Tamer"],
    3: ["green button"],
    4: ["library"],
    5: ["education department"],
    6: ["castles"],
    7: ["old clothes"],
    8: ["bottle tops"],
    9: ["Undersea Worlds"],
    10: ["silver paper"],
    11: ["King Street"],
    12: ["central"],
    13: ["half hour", "30 minutes"],
    14: ["refreshments"],
    15: ["10.15", "10:15"],
    16: ["Advance"],
    17: ["seat reservations", "reservations"],
    18: ["C"],
    19: ["D"],
    20: ["G"],
    21: ["catalogue", "catalogs"],
    22: ["computer centre", "computer center"],
    23: ["checklist"],
    24: ["teaching experience"],
    25: ["classroom"],
    26: ["review"],
    27: ["schools"],
    28: ["the year 2000", "year 2000", "2000"],
    29: ["end of term"],
    30: ["research"],
    31: ["A"],
    32: ["B"],
    33: ["C"],
    34: ["A"],
    35: ["A"],
    36: ["C"],
    37: ["A"],
    38: ["Great Train Robbery"],
    39: ["Sound effects"],
    40: ["poor sound quality"],
  },
  3: {
    1: ["Select"],
    2: ["27.01.1973", "27.1.1973"],
    3: ["15 Riverside"],
    4: ["2 weeks", "two weeks"],
    5: ["616295"],
    6: ["engineer"],
    7: ["mother"],
    8: ["2,000", "2000"],
    9: ["month"],
    10: ["internet"],
    11: ["C"],
    12: ["A"],
    13: ["C"],
    14: ["H"],
    15: ["F"],
    16: ["B"],
    17: ["D"],
    18: ["field"],
    19: ["footbridge"],
    20: ["viewpoint"],
    21: ["entertainment industry"],
    22: ["telephone interviews"],
    23: ["30", "thirty"],
    24: ["male and female"],
    25: ["Jazz", "jazz"],
    26: ["classical"],
    27: ["concerts"],
    28: ["department stores"],
    29: ["club"],
    30: ["opera house"],
    31: ["C"],
    32: ["A"],
    33: ["A"],
    34: ["B"],
    35: ["people"],
    36: ["water and sand", "sand and water"],
    37: ["Scotland"],
    38: ["outside"],
    39: ["local"],
    40: ["tops"],
  },
  4: {
    1: ["75"],
    2: ["cheque", "check"],
    3: ["15"],
    4: ["25"],
    5: ["10 minutes", "10 minute", "10 mins", "10 min"],
    6: ["conference pack"],
    7: ["South"],
    8: ["library"],
    9: ["5"],
    10: ["21A"],
    11: ["D"],
    12: ["A"],
    13: ["C"],
    14: ["tax"],
    15: ["security"],
    16: ["ground floor"],
    17: ["lecture room 311"],
    18: ["Safety at Work"],
    19: ["Main Hall"],
    20: ["team leaders"],
    21: ["reference"],
    22: ["textbooks"],
    23: ["secondary"],
    24: ["primary"],
    25: ["back"],
    26: ["overdue books", "overdue ones"],
    27: ["7 working days", "seven working days"],
    28: ["C"],
    29: ["E"],
    30: ["F"],
    31: ["B"],
    32: ["A"],
    33: ["B"],
    34: ["C"],
    35: ["1,450", "1450"],
    36: ["disease"],
    37: ["wealthy prince", "prince"],
    38: ["diet"],
    39: ["attack humans"],
    40: ["leadership"],
  },
};

// questionNo -> question type
const questionTypesByTest = {
  2: {
    1: "fill_blank",
    2: "fill_blank",
    3: "fill_blank",
    4: "fill_blank",
    5: "fill_blank",
    6: "table",
    7: "table",
    8: "table",
    9: "table",
    10: "table",
    11: "sentence_completion",
    12: "sentence_completion",
    13: "sentence_completion",
    14: "sentence_completion",
    15: "table",
    16: "table",
    17: "table",
    18: "multiple_choice",
    19: "multiple_choice",
    20: "multiple_choice",
    21: "fill_blank",
    22: "fill_blank",
    23: "fill_blank",
    24: "fill_blank",
    25: "fill_blank",
    26: "fill_blank",
    27: "fill_blank",
    28: "fill_blank",
    29: "fill_blank",
    30: "fill_blank",
    31: "single_choice",
    32: "single_choice",
    33: "single_choice",
    34: "single_choice",
    35: "single_choice",
    36: "single_choice",
    37: "single_choice",
    38: "sentence_completion",
    39: "sentence_completion",
    40: "sentence_completion",
  },
  3: {
    1: "form",
    2: "form",
    3: "form",
    4: "form",
    5: "form",
    6: "form",
    7: "form",
    8: "form",
    9: "form",
    10: "form",
    11: "single_choice",
    12: "single_choice",
    13: "single_choice",
    14: "map",
    15: "map",
    16: "map",
    17: "map",
    18: "sentence_completion",
    19: "sentence_completion",
    20: "sentence_completion",
    21: "sentence_completion",
    22: "sentence_completion",
    23: "sentence_completion",
    24: "sentence_completion",
    25: "fill_blank",
    26: "fill_blank",
    27: "fill_blank",
    28: "fill_blank",
    29: "fill_blank",
    30: "fill_blank",
    31: "single_choice",
    32: "single_choice",
    33: "single_choice",
    34: "single_choice",
    35: "sentence_completion",
    36: "sentence_completion",
    37: "sentence_completion",
    38: "sentence_completion",
    39: "sentence_completion",
    40: "sentence_completion",
  },
  4: {
    1: "fill_blank",
    2: "fill_blank",
    3: "fill_blank",
    4: "fill_blank",
    5: "fill_blank",
    6: "fill_blank",
    7: "fill_blank",
    8: "fill_blank",
    9: "fill_blank",
    10: "fill_blank",
    11: "matching",
    12: "matching",
    13: "matching",
    14: "table",
    15: "table",
    16: "table",
    17: "table",
    18: "table",
    19: "table",
    20: "table",
    21: "summary",
    22: "summary",
    23: "summary",
    24: "summary",
    25: "summary",
    26: "short_answer",
    27: "short_answer",
    28: "multiple_choice",
    29: "multiple_choice",
    30: "multiple_choice",
    31: "single_choice",
    32: "single_choice",
    33: "single_choice",
    34: "single_choice",
    35: "sentence_completion",
    36: "sentence_completion",
    37: "sentence_completion",
    38: "sentence_completion",
    39: "sentence_completion",
    40: "sentence_completion",
  },
};

const questionPromptsByTest = {
  2: {
    1: `CHILDREN'S ART AND CRAFT WORKSHOPS
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Adults must accompany children under ______ .`,
    2: `CHILDREN'S ART AND CRAFT WORKSHOPS
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Workshops held in: Winter House, ______ Street`,
    3: `CHILDREN'S ART AND CRAFT WORKSHOPS
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Security device: must push the ______ to open door`,
    4: `CHILDREN'S ART AND CRAFT WORKSHOPS
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Should leave car behind the ______ .`,
    5: `CHILDREN'S ART AND CRAFT WORKSHOPS
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Book workshops by phoning the ______ (on 200765)`,
    6: `Next two workshops
Complete the table below.
Write NO MORE THAN TWO WORDS for each answer.
16/11 'Building ______ '`,
    7: `Next two workshops
Complete the table below.
Write NO MORE THAN TWO WORDS for each answer.
Children advised to wear: ______`,
    8: `Next two workshops
Complete the table below.
Write NO MORE THAN TWO WORDS for each answer.
Please bring (if possible): ______`,
    9: `Next two workshops
Complete the table below.
Write NO MORE THAN TWO WORDS for each answer.
23/11 '______ .' (Nothing special)`,
    10: `Next two workshops
Complete the table below.
Write NO MORE THAN TWO WORDS for each answer.
Please bring (if possible): ______`,
    11: `TRAIN INFORMATION
Complete the sentences below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Local services depart from ______ railway station.`,
    12: `TRAIN INFORMATION
Complete the sentences below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
National services depart from the ______ railway station.`,
    13: `TRAIN INFORMATION
Complete the sentences below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Trains for London depart every ______ each day during the week.`,
    14: `TRAIN INFORMATION
Complete the sentences below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
The price of a first class ticket includes ______ .`,
    15: `TRAIN INFORMATION
Complete the table below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Special travel after ______ and at weekends`,
    16: `TRAIN INFORMATION
Complete the table below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
______ buy at least six days ahead limited numbers`,
    17: `TRAIN INFORMATION
Complete the table below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
______ essential`,
    18: `Choose THREE letters, A-G.
Which THREE attractions can you visit at present by train from Trebirch?
A. a science museum
B. a theme park
C. a climbing wall
D. a mining museum
E. an aquarium
F. a castle
G. a zoo`,
    19: `Choose THREE letters, A-G.
Which THREE attractions can you visit at present by train from Trebirch?
A. a science museum
B. a theme park
C. a climbing wall
D. a mining museum
E. an aquarium
F. a castle
G. a zoo`,
    20: `Choose THREE letters, A-G.
Which THREE attractions can you visit at present by train from Trebirch?
A. a science museum
B. a theme park
C. a climbing wall
D. a mining museum
E. an aquarium
F. a castle
G. a zoo`,
    21: `Dissertation Tutorial Record (Education)
Complete the tables below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Read IT ______`,
    22: `Dissertation Tutorial Record (Education)
Complete the tables below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Spoken to Jane Prince, Head of the ______`,
    23: `Dissertation Tutorial Record (Education)
Complete the tables below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Prepare a ______ for survey`,
    24: `Dissertation Tutorial Record (Education)
Complete the tables below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Add questions in section three on ______`,
    25: `Dissertation Tutorial Record (Education)
Complete the tables below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Couldn't find Ericsson's essays on managing the ______`,
    26: `Dissertation Tutorial Record (Education)
Complete the tables below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Give the title: Context ______`,
    27: `Dissertation Tutorial Record (Education)
Complete the tables below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Add statistics on the ______ in various zones`,
    28: `Dissertation Tutorial Record (Education)
Complete the tables below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Include more references to works dated after ______ .`,
    29: `Dissertation Tutorial Record (Education)
Complete the tables below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Obtain from library through special loans service by the ______ .`,
    30: `Dissertation Tutorial Record (Education)
Complete the tables below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Before starting the ______`,
    31: `The history of moving pictures
Choose the correct letter, A, B or C.
Some photographs of a horse running showed
A. all feet off the ground.
B. at least one foot on the ground.
C. two feet off the ground.`,
    32: `The history of moving pictures
Choose the correct letter, A, B or C.
The Scotsman employed by Edison
A. designed a system to use the technology Edison had invented.
B. used available technology to make a new system.
C. was already an expert in motion picture technology.`,
    33: `The history of moving pictures
Choose the correct letter, A, B or C.
One major problem with the first system was that
A. only one person could be filmed.
B. people could only see very short films.
C. the camera was very heavy.`,
    34: `The history of moving pictures
Choose the correct letter, A, B or C.
Rival systems started to appear in Europe after people had
A. been told about the American system.
B. seen the American system.
C. used the American system.`,
    35: `The history of moving pictures
Choose the correct letter, A, B or C.
In 1895, a famous new system was developed by
A. a French team working alone.
B. a French and German team working together.
C. a German team who invented the word 'cinema'.`,
    36: `The history of moving pictures
Choose the correct letter, A, B or C.
Longer films were not made at the time because of problems involving
A. the subject matter.
B. the camera.
C. the film projector.`,
    37: `The history of moving pictures
Choose the correct letter, A, B or C.
The 'Lantham Loop' invention relied on
A. removing tension between the film reels.
B. adding three more film reels to the system.
C. making one of the film reels more effective.`,
    38: `Complete the sentences below.
Write NO MORE THAN THREE WORDS for each answer.
The first motion picture was called The ______ .`,
    39: `Complete the sentences below.
Write NO MORE THAN THREE WORDS for each answer.
______ were used for the first time on film in 1926.`,
    40: `Complete the sentences below.
Write NO MORE THAN THREE WORDS for each answer.
Subtitles were added to The Lights of New York because of its ______ .`,
  },
  3: {
    1: `OPENING A BANK ACCOUNT
Complete the form below.
Write ONE WORD AND/OR A NUMBER for each answer.
Type of current account: The '______' account`,
    2: `OPENING A BANK ACCOUNT
Complete the form below.
Write ONE WORD AND/OR A NUMBER for each answer.
Date of birth: ______`,
    3: `OPENING A BANK ACCOUNT
Complete the form below.
Write ONE WORD AND/OR A NUMBER for each answer.
Current address: ______ Exeter`,
    4: `OPENING A BANK ACCOUNT
Complete the form below.
Write ONE WORD AND/OR A NUMBER for each answer.
Time at current address: ______`,
    5: `OPENING A BANK ACCOUNT
Complete the form below.
Write ONE WORD AND/OR A NUMBER for each answer.
Telephone: work ______ home 796431`,
    6: `OPENING A BANK ACCOUNT
Complete the form below.
Write ONE WORD AND/OR A NUMBER for each answer.
Occupation: ______`,
    7: `OPENING A BANK ACCOUNT
Complete the form below.
Write ONE WORD AND/OR A NUMBER for each answer.
Identity (security): Name of his ______ : Siti`,
    8: `OPENING A BANK ACCOUNT
Complete the form below.
Write ONE WORD AND/OR A NUMBER for each answer.
Opening sum: €______ to be transferred from Fransen Bank, Utrecht`,
    9: `OPENING A BANK ACCOUNT
Complete the form below.
Write ONE WORD AND/OR A NUMBER for each answer.
Statements: Every ______`,
    10: `OPENING A BANK ACCOUNT
Complete the form below.
Write ONE WORD AND/OR A NUMBER for each answer.
Requests: Supply information about the bank's ______ service`,
    11: `THE HISTORY OF ROSEWOOD HOUSE
Choose the correct letter, A, B or C.
When the writer Sebastian George first saw Rosewood House, he
A. thought he might rent it.
B. felt it was too expensive for him.
C. was unsure whether to buy it.`,
    12: `THE HISTORY OF ROSEWOOD HOUSE
Choose the correct letter, A, B or C.
Before buying the house, George had
A. experienced severe family problems.
B. struggled to become a successful author.
C. suffered a serious illness.`,
    13: `THE HISTORY OF ROSEWOOD HOUSE
Choose the correct letter, A, B or C.
According to the speaker, George viewed Rosewood House as
A. a rich source of material for his books.
B. a way to escape from his work.
C. a typical building of the region.`,
    14: `ROSEWOOD HOUSE AND GARDENS
Write the correct letter, A-J, next to questions 14-17.
Pear Alley: ______`,
    15: `ROSEWOOD HOUSE AND GARDENS
Write the correct letter, A-J, next to questions 14-17.
Mulberry Garden: ______`,
    16: `ROSEWOOD HOUSE AND GARDENS
Write the correct letter, A-J, next to questions 14-17.
Shop: ______`,
    17: `ROSEWOOD HOUSE AND GARDENS
Write the correct letter, A-J, next to questions 14-17.
Tea Room: ______`,
    18: `RIVER WALK
Complete the sentences below.
Write ONE WORD ONLY for each answer.
You can walk through the ______ that goes along the river bank.`,
    19: `RIVER WALK
Complete the sentences below.
Write ONE WORD ONLY for each answer.
You can go over the ______ and then into a wooded area.`,
    20: `RIVER WALK
Complete the sentences below.
Write ONE WORD ONLY for each answer.
On your way back, you could also go up to the ______ .`,
    21: `MARKETING ASSIGNMENT
Complete the sentences below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
For their assignment, the students must investigate one part of the ______ .`,
    22: `MARKETING ASSIGNMENT
Complete the sentences below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
The method the students must use to collect data is ______ .`,
    23: `MARKETING ASSIGNMENT
Complete the sentences below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
In total, the students must interview ______ people.`,
    24: `MARKETING ASSIGNMENT
Complete the sentences below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Jack thinks the music preferences of ______ listeners are similar.`,
    25: `Marketing Survey: Music Preferences
Complete the notes below.
Write NO MORE THAN TWO WORDS for each answer.
Music preferences: ______`,
    26: `Marketing Survey: Music Preferences
Complete the notes below.
Write NO MORE THAN TWO WORDS for each answer.
Music preferences: ______`,
    27: `Marketing Survey: Music Preferences
Complete the notes below.
Write NO MORE THAN TWO WORDS for each answer.
Medium for listening to music: ______`,
    28: `Marketing Survey: Music Preferences
Complete the notes below.
Write NO MORE THAN TWO WORDS for each answer.
Source of music: ______`,
    29: `Marketing Survey: Music Preferences
Complete the notes below.
Write NO MORE THAN TWO WORDS for each answer.
Places for listening to music: ______`,
    30: `Marketing Survey: Music Preferences
Complete the notes below.
Write NO MORE THAN TWO WORDS for each answer.
Places for listening to music: ______`,
    31: `IRELAND IN THE NEOLITHIC PERIOD
Choose the correct letter, A, B or C.
According to the speaker, it is not clear
A. when the farming economy was introduced to Ireland.
B. why people began to farm in Ireland.
C. where the early Irish farmers came from.`,
    32: `IRELAND IN THE NEOLITHIC PERIOD
Choose the correct letter, A, B or C.
What point does the speaker make about breeding animals in Neolithic Ireland?
A. Their numbers must have been above a certain level.
B. They were under threat from wild animals.
C. Some species died out during this period.`,
    33: `IRELAND IN THE NEOLITHIC PERIOD
Choose the correct letter, A, B or C.
What does the speaker say about the transportation of animals?
A. Livestock would have limited the distance the farmers could sail.
B. Neolithic boats were too primitive to have been used.
C. Probably only a few breeding animals were imported.`,
    34: `IRELAND IN THE NEOLITHIC PERIOD
Choose the correct letter, A, B or C.
What is the main evidence for cereal crops in Neolithic Ireland?
A. the remains of burnt grain in pots
B. the marks left on pots by grains
C. the patterns painted on the surface of pots`,
    35: `STONE TOOLS
Complete the sentences below.
Write NO MORE THAN TWO WORDS for each answer.
Ploughs could either have been pulled by ______ or by cattle.`,
    36: `STONE TOOLS
Complete the sentences below.
Write NO MORE THAN TWO WORDS for each answer.
In the final stages of axe-making, ______ and ______ were necessary for grinding and polishing.`,
    37: `STONE TOOLS
Complete the sentences below.
Write NO MORE THAN TWO WORDS for each answer.
Irish axes were exported from Ireland to ______ and England.`,
    38: `POTTERY MAKING
Complete the sentences below.
Write NO MORE THAN TWO WORDS for each answer.
The ______ of the pots was often polished to make them watertight.`,
    39: `POTTERY MAKING
Complete the sentences below.
Write NO MORE THAN TWO WORDS for each answer.
Clay from ______ areas was generally used.`,
    40: `POTTERY MAKING
Complete the sentences below.
Write NO MORE THAN TWO WORDS for each answer.
Decoration was only put around the ______ of the earliest pots.`,
  },
  4: {
    1: `Title of conference: Future Directions in Computing
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Three day cost: £______ .`,
    2: `Title of conference: Future Directions in Computing
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Payment by ______ or on arrival`,
    3: `Title of conference: Future Directions in Computing
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Conference Centre £______ per night near to conference rooms`,
    4: `Title of conference: Future Directions in Computing
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Guest House £______ per night`,
    5: `Title of conference: Future Directions in Computing
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Guest House approximately ______ walk from Conference Centre`,
    6: `Title of conference: Future Directions in Computing
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Further documents to be sent: ______ and an application form`,
    7: `Title of conference: Future Directions in Computing
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Conference Centre is on ______ Park Road`,
    8: `Title of conference: Future Directions in Computing
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Conference Centre is next to the ______ .`,
    9: `Title of conference: Future Directions in Computing
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Taxi costs £______ .`,
    10: `Title of conference: Future Directions in Computing
Complete the notes below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
Take bus number ______ from station.`,
    11: `Which team will do each of the following jobs?
Choose THREE answers from the box and write the correct letter, A-D, next to questions 11-13.
Teams
A. the blue team
B. the yellow team
C. the green team
D. the red team
11 checking entrance tickets: ______`,
    12: `Which team will do each of the following jobs?
Choose THREE answers from the box and write the correct letter, A-D, next to questions 11-13.
Teams
A. the blue team
B. the yellow team
C. the green team
D. the red team
12 preparing refreshments: ______`,
    13: `Which team will do each of the following jobs?
Choose THREE answers from the box and write the correct letter, A-D, next to questions 11-13.
Teams
A. the blue team
B. the yellow team
C. the green team
D. the red team
13 directing car-park traffic: ______`,
    14: `Travel Expo
Complete the table below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Talk by Anne Smith will give out the ______ forms`,
    15: `Travel Expo
Complete the table below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Talk by Peter Chen will explain about arrangements for ______ and fire exits`,
    16: `Travel Expo
Complete the table below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Coffee Break go to Staff Canteen on the ______`,
    17: `Travel Expo
Complete the table below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Video Presentation go to ______`,
    18: `Travel Expo
Complete the table below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Video title: ______`,
    19: `Travel Expo
Complete the table below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
Buffet Lunch go to the ______ on 1st floor`,
    20: `Travel Expo
Complete the table below.
Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.
1.00 pm Meet the ______`,
    21: `The School of Education Libraries
Complete the summary below.
Write ONE WORD ONLY for each answer.
The libraries on both sites provide internet access and have a variety of ______ materials on education.`,
    22: `The School of Education Libraries
Complete the summary below.
Write ONE WORD ONLY for each answer.
The Castle Road library has books on sociology, together with ______ and other resources relevant to the majority of 23 school subjects.`,
    23: `The School of Education Libraries
Complete the summary below.
Write ONE WORD ONLY for each answer.
The Castle Road library has books on sociology, together with 22 textbooks and other resources relevant to the majority of ______ school subjects.`,
    24: `The School of Education Libraries
Complete the summary below.
Write ONE WORD ONLY for each answer.
The Fordham library includes resources for teaching in ______ education and special needs.`,
    25: `The School of Education Libraries
Complete the summary below.
Write ONE WORD ONLY for each answer.
Current issues of periodicals are available at both libraries, although ______ issues are only available at Fordham.`,
    26: `Answer the questions below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
26 Which books cannot be renewed by telephone or email? ______`,
    27: `Answer the questions below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
27 How much time is allowed to return recalled books? ______`,
    28: `Choose THREE letters, A-G.
Which THREE topics do this term's study skills workshops cover?
A. An introduction to the Internet
B. How to carry out research for a dissertation
C. Making good use of the whole range of library services
D. Planning a dissertation
E. Standard requirements when writing a dissertation
F. Using the Internet when doing research
G. What books and technical resources are available in the library`,
    29: `Choose THREE letters, A-G.
Which THREE topics do this term's study skills workshops cover?
A. An introduction to the Internet
B. How to carry out research for a dissertation
C. Making good use of the whole range of library services
D. Planning a dissertation
E. Standard requirements when writing a dissertation
F. Using the Internet when doing research
G. What books and technical resources are available in the library`,
    30: `Choose THREE letters, A-G.
Which THREE topics do this term's study skills workshops cover?
A. An introduction to the Internet
B. How to carry out research for a dissertation
C. Making good use of the whole range of library services
D. Planning a dissertation
E. Standard requirements when writing a dissertation
F. Using the Internet when doing research
G. What books and technical resources are available in the library`,
    31: `Choose the correct letter, A, B or C.
When did Asiatic lions develop as a separate sub-species?
A. about 10,000 years ago
B. about 100,000 years ago
C. about 1,000,000 years ago`,
    32: `Choose the correct letter, A, B or C.
Pictures of Asiatic lions can be seen on ancient coins from
A. Greece.
B. The Middle East.
C. India.`,
    33: `Choose the correct letter, A, B or C.
Asiatic lions disappeared from Europe
A. 2,500 years ago.
B. 2,000 years ago.
C. 1,900 years ago.`,
    34: `Choose the correct letter, A, B or C.
Very few African lions have
A. a long mane.
B. a coat with varied colours.
C. a fold of skin on their stomach.`,
    35: `THE GIR SANCTUARY
Complete the sentences below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
The sanctuary has an area of approximately ______ square kilometres.`,
    36: `THE GIR SANCTUARY
Complete the sentences below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
One threat to the lions in the sanctuary is ______ .`,
    37: `THE GIR SANCTUARY
Complete the sentences below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
The ancestors of the Gir Sanctuary lions were protected by a ______ .`,
    38: `THE GIR SANCTUARY
Complete the sentences below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
A large part of the lions' ______ consists of animals belonging to local farmers.`,
    39: `THE GIR SANCTUARY
Complete the sentences below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
The lions sometimes ______ , especially when water is short.`,
    40: `THE GIR SANCTUARY
Complete the sentences below.
Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.
In ancient India a man would fight a lion as a test of ______ .`,
  },
};

const sectionTitlesByTest = {
  2: {
    1: "Section 1 - Children's Art and Craft Workshops",
    2: "Section 2 - Train Information",
    3: "Section 3 - Dissertation Tutorial Record",
    4: "Section 4 - The History of Moving Pictures",
  },
  3: {
    1: "Section 1 - Opening a Bank Account",
    2: "Section 2 - The History of Rosewood House",
    3: "Section 3 - Marketing Assignment",
    4: "Section 4 - Ireland in the Neolithic Period",
  },
  4: {
    1: "Section 1 - Conference Reservations",
    2: "Section 2 - Travel Expo",
    3: "Section 3 - The School of Education Libraries",
    4: "Section 4 - The Gir Sanctuary",
  },
};

// sectionNo -> image page numbers (matches desktop filenames T{test} S{section}-{n}.png)
const sectionImagePagesByTest = {
  2: {
    1: [1, 2],
    2: [1],
    3: [1],
    4: [1, 2, 3],
  },
  3: {
    1: [1, 2],
    2: [1, 2],
    3: [1, 2],
    4: [1, 2],
  },
  4: {
    1: [1],
    2: [1, 2],
    3: [1, 2],
    4: [1, 2],
  },
};

function answerFor(testNo, questionNo) {
  const rawAnswer = answersByTest[testNo]?.[questionNo];
  if (!rawAnswer || rawAnswer.length === 0) {
    throw new Error(`Missing answer for Test ${testNo} question ${questionNo}.`);
  }

  return {
    answerText: rawAnswer[0],
    variants: rawAnswer.slice(1),
  };
}

export function buildSectionSeed(testNo, sectionNo) {
  if (![2, 3, 4].includes(testNo) || ![1, 2, 3, 4].includes(sectionNo)) {
    throw new Error(`Unsupported Cambridge 6 Test ${testNo} Section ${sectionNo}.`);
  }

  const firstQuestionNo = (sectionNo - 1) * 10 + 1;
  const imagePages = sectionImagePagesByTest[testNo][sectionNo] ?? [];
  const questionImagePath = imagePages
    .map((pageNo) => `listening/ci6/t${testNo}/s${sectionNo}/questions/t${testNo}_s${sectionNo}_${pageNo}.png`)
    .join("\n");

  return {
    book: {
      code: "cambridge-6",
      isPublished: true,
      sourceType: "cambridge",
      title: "Cambridge IELTS 6",
    },
    questions: Array.from({ length: 10 }, (_, index) => {
      const questionNo = firstQuestionNo + index;
      return {
        questionNo,
        questionType: questionTypesByTest[testNo]?.[questionNo] ?? "fill_blank",
        promptText: questionPromptsByTest[testNo]?.[questionNo] ?? `Question ${questionNo}`,
        ...answerFor(testNo, questionNo),
      };
    }),
    section: {
      fullAudioPath: null,
      questionCount: 10,
      questionImagePath: questionImagePath || null,
      sectionNo,
      timeLimitSeconds: 600,
      title: sectionTitlesByTest[testNo][sectionNo] ?? `Section ${sectionNo}`,
    },
    test: {
      isPublished: true,
      testNo,
      title: `Test ${testNo}`,
    },
    transcriptSentences: [],
  };
}

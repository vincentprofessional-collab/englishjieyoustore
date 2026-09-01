import type { RuntimeListeningQuestionGroup } from "@/components/listening-runtime-question-groups";

const CI5_TEST_4_SECTION_2 = "cambridge-5:4:2";
const CI5_TEST_4_SECTION_3 = "cambridge-5:4:3";
const CI5_TEST_4_SECTION_1 = "cambridge-5:4:1";
const CI6_TEST_1_SECTION_1 = "cambridge-6:1:1";
const CI6_TEST_1_SECTION_2 = "cambridge-6:1:2";
const CI6_TEST_2_SECTION_4 = "cambridge-6:2:4";
const CI6_TEST_3_SECTION_1 = "cambridge-6:3:1";
const CI6_TEST_3_SECTION_2 = "cambridge-6:3:2";
const CI6_TEST_3_SECTION_3 = "cambridge-6:3:3";
const CI6_TEST_3_SECTION_4 = "cambridge-6:3:4";
const CI6_TEST_4_SECTION_1 = "cambridge-6:4:1";
const CI6_TEST_4_SECTION_2 = "cambridge-6:4:2";
const CI6_TEST_4_SECTION_3 = "cambridge-6:4:3";
const CI6_TEST_4_SECTION_4 = "cambridge-6:4:4";

export function getListeningQuestionPageGroups(
  bookCode: string,
  testNo: number,
  sectionNo: number,
  groups: RuntimeListeningQuestionGroup[],
) {
  const key = `${bookCode}:${testNo}:${sectionNo}`;
  if (key === CI5_TEST_4_SECTION_2) {
    return groups.map((group) => {
      if (group.id === "q11-13") {
        return {
          ...group,
          framed: false,
          instructions: [
            "Complete the sentences below.",
            "Write NO MORE THAN TWO WORDS for each answer.",
          ],
        };
      }
      if (group.id !== "q18-20") return group;
      return {
        ...group,
        content: [
          {
            type: "table" as const,
            headers: [["Name of Office Bearer"], ["Responsibility"]],
            rows: [
              [["Robert Young: President"], ["to manage meetings"]],
              [["Gina Costello: Treasurer"], ["to ", { questionNo: 18 }]],
              [["David West: Secretary"], ["to ", { questionNo: 19 }]],
              [["Jason Dokic: Head Coach"], ["to ", { questionNo: 20 }]],
            ],
          },
        ],
      };
    });
  }

  if (key === CI5_TEST_4_SECTION_1) {
    return groups.map((group) => {
      if (group.id !== "q1-10") return group;
      return {
        ...group,
        content: [
          {
            type: "table" as const,
            variant: "form" as const,
            title: "HOST FAMILY APPLICANT",
            rows: [
              [["Example"], ["Answer"]],
              [["Name:"], ["Jenny Chan"]],
              [["Age:"], ["19"]],
              [["Present address: Sea View Guest House,"], [{ questionNo: 1 }]],
              [["Daytime phone number: 2237676"], [{ text: "\u200B" }]],
              [["NB Best time to contact is"], [{ questionNo: 2 }]],
              [["Age: 19"], [{ text: "\u200B" }]],
              [["Intended length of stay:"], [{ questionNo: 3 }]],
              [["Occupation while in UK: student"], [{ text: "\u200B" }]],
              [["General level of English:"], [{ questionNo: 4 }]],
              [["Preferred location: in the"], [{ questionNo: 5 }]],
              [["Special diet:"], [{ questionNo: 6 }]],
              [["Other requirements:"], [
                { text: "own facilities", italic: true },
                "\nown television\n",
                { questionNo: 7 },
                "\nto be ",
                { questionNo: 8 },
              ]],
              [["Maximum price:"], [{ questionNo: 9, answerPrefix: "£ " }, " a week"]],
              [["Preferred starting date:"], [{ questionNo: 10 }]],
            ],
          },
        ],
      };
    });
  }

  if (key === CI6_TEST_1_SECTION_1) {
    return groups.map((group) => {
      if (group.id !== "q5-8") return group;
      return {
        ...group,
        content: [
          {
            type: "table" as const,
            title: "MEMBERSHIP SCHEMES",
            headers: [
              ["Type"],
              ["Use of facilities"],
              ["Cost of classes"],
              ["Times"],
              ["Joining fee"],
              ["Annual subscription\nfee"],
            ],
            rows: [
              [["GOLD"], ["All"], ["Free"], ["Any time"], ["£250"], [{ questionNo: 5, answerPrefix: "£ " }]],
              [["SILVER"], ["All"], [{ questionNo: 6, answerPrefix: "£ " }], ["from ", { questionNo: 7 }, " to ", { answerLine: "short" as const }], ["£225"], ["£300"]],
              [["BRONZE"], ["Restricted"], ["£3"], ["from 10.30 to 3.30\nweekdays only"], ["£50"], [{ questionNo: 8, answerPrefix: "£ " }]],
            ],
          },
        ],
      };
    });
  }

  if (key === CI6_TEST_1_SECTION_2) {
    return groups.map((group) => {
      if (group.id === "q11-16") {
        return { ...group, optionsLayout: "single-column" as const };
      }
      if (group.id !== "q17-20") return group;
      return {
        ...group,
        content: [
          {
            type: "table" as const,
            headers: [["Play"], ["Dates"], ["Starting time"], ["Tickets available for"], ["Price"]],
            rows: [[
              ["Royal Hunt\nof the Sun"],
              ["October 13th to ", { questionNo: 17 }],
              [{ questionNo: 18, answerSuffix: " pm" }],
              ["for ", { questionNo: 19 }, " and ................"],
              [{ questionNo: 20, answerPrefix: "£ " }],
            ]],
          },
        ],
      };
    });
  }

  if (key === CI6_TEST_2_SECTION_4) {
    return groups.map((group) => {
      if (group.id !== "q38-40") return group;
      return {
        ...group,
        content: [
          {
            type: "list" as const,
            items: [
              [
                { text: "38", strong: true },
                " The first motion picture was called The ",
                { questionNo: 38, showQuestionNumber: false },
                ".",
              ],
              [
                { text: "39", strong: true },
                " ",
                { questionNo: 39, showQuestionNumber: false },
                " were used for the first time on film in 1926.",
              ],
              [
                { text: "40", strong: true },
                " Subtitles were added to The Lights of New York because of its ",
                { questionNo: 40, showQuestionNumber: false },
                ".",
              ],
            ],
            style: "none" as const,
          },
        ],
        framed: false,
      };
    });
  }

  if (key === CI6_TEST_3_SECTION_1) {
    return groups.map((group) => {
      if (group.id !== "q1-10") return group;
      return {
        ...group,
        content: [
          {
            type: "table" as const,
            variant: "form" as const,
            title: "OPENING A BANK ACCOUNT",
            rows: [
              [[{ text: "Example", italic: true }], [{ text: "Answer", italic: true }]],
              [["Application for a"], [{ text: "Current", strong: true, italic: true, underline: true }, " bank account"]],
              [[{ text: "Type of current account:", strong: true }], ["The ", { questionNo: 1 }, " 'account"]],
              [[{ text: "Full name of applicant:", strong: true }], ["Pieter Henes"]],
              [[{ text: "Date of birth:", strong: true }], [{ questionNo: 2 }]],
              [[{ text: "Joint account holder(s):", strong: true }], ["No"]],
              [[{ text: "Current address:", strong: true }], [{ questionNo: 3 }, " Exeter"]],
              [[{ text: "Time at current address:", strong: true }], [{ questionNo: 4 }]],
              [[{ text: "Previous address:", strong: true }], ["Rielsdorf 2, Utrecht, Holland"]],
              [[{ text: "Telephone:", strong: true }], ["work ", { questionNo: 5 }, "\nhome 796431"]],
              [[{ text: "Occupation:", strong: true }], [{ questionNo: 6 }]],
              [[{ text: "Identity (security):", strong: true }], ["Name of his ", { questionNo: 7 }, ": Siti"]],
              [[{ text: "Opening sum:", strong: true }], [{ questionNo: 8, answerPrefix: "€ " }, "\nto be transferred from Fransen Bank, Utrecht"]],
              [[{ text: "Statements:", strong: true }], ["Every ", { questionNo: 9 }]],
              [[{ text: "Requests:", strong: true }], ["Supply information about the bank’s\n", { questionNo: 10 }, " service"]],
            ],
          },
        ],
      };
    });
  }

  if (key === CI6_TEST_3_SECTION_2) {
    return groups.map((group) => {
      if (group.id === "q11-13") {
        return { ...group, title: "THE HISTORY OF ROSEWOOD HOUSE" };
      }
      if (group.id !== "q18-20") return group;
      return {
        ...group,
        framed: false,
        content: [
          {
            type: "list" as const,
            items: [
              [{ text: "18", strong: true }, " You can walk through the ", { questionNo: 18, showQuestionNumber: false }, " that goes along the river bank."],
              [{ text: "19", strong: true }, " You can go over the ", { questionNo: 19, showQuestionNumber: false }, " and then into a wooded area."],
              [{ text: "20", strong: true }, " On your way back, you could also go up to the ", { questionNo: 20, showQuestionNumber: false }, "."],
            ],
            style: "none" as const,
          },
        ],
      };
    });
  }

  if (key === CI6_TEST_3_SECTION_3) {
    return groups.map((group) => {
      if (group.id === "q21-24") {
        return {
          ...group,
          framed: false,
          content: [
            { type: "paragraph" as const, segments: [{ text: "MARKETING ASSIGNMENT", strong: true }] },
            {
              type: "list" as const,
              items: [
                [{ text: "21", strong: true }, " For their assignment, the students must investigate one part of the ", { questionNo: 21, showQuestionNumber: false }, "."],
                [{ text: "22", strong: true }, " The method the students must use to collect data is ", { questionNo: 22, showQuestionNumber: false }, "."],
                [{ text: "23", strong: true }, " In total, the students must interview ", { questionNo: 23, showQuestionNumber: false }, " people."],
                [{ text: "24", strong: true }, " Jack thinks the music preferences of ", { questionNo: 24, showQuestionNumber: false }, " listeners are similar."],
              ],
              style: "none" as const,
            },
          ],
        };
      }
      return group;
    });
  }

  if (key === CI6_TEST_3_SECTION_4) {
    return groups.map((group) => {
      if (group.id !== "q35-40") return group;
      return {
        ...group,
        framed: false,
        content: [
          {
            type: "paragraph" as const,
            segments: [{ text: "STONE TOOLS", strong: true }],
          },
          {
            type: "list" as const,
            items: [
              [{ text: "35", strong: true }, " Ploughs could either have been pulled by ", { questionNo: 35, showQuestionNumber: false }, " or by cattle."],
              ["The farmers needed homes which were permanent dwellings."],
              [{ text: "36", strong: true }, " In the final stages of axe-making, ", { questionNo: 36, showQuestionNumber: false }, " were necessary for grinding and polishing."],
              [{ text: "37", strong: true }, " Irish axes were exported from Ireland to ", { questionNo: 37, showQuestionNumber: false }, " and England."],
            ],
            style: "bullet" as const,
          },
          {
            type: "paragraph" as const,
            segments: [{ text: "POTTERY MAKING", strong: true }],
          },
          {
            type: "list" as const,
            items: [
              ["The colonisers used clay to make pots."],
              [{ text: "38", strong: true }, " The ", { questionNo: 38, showQuestionNumber: false }, " of the pots was often polished to make them watertight."],
              [{ text: "39", strong: true }, " Clay from ", { questionNo: 39, showQuestionNumber: false }, " areas was generally used."],
              [{ text: "40", strong: true }, " Decoration was only put around the ", { questionNo: 40, showQuestionNumber: false }, " of the earliest pots."],
            ],
            style: "bullet" as const,
          },
        ],
      };
    });
  }

  if (key === CI6_TEST_4_SECTION_1) {
    return groups.map((group) => {
      if (group.id !== "q1-10") return group;
      return {
        ...group,
        framed: false,
        instructions: [
          "Complete the notes below.",
          "Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
        ],
        content: [
          {
            type: "example" as const,
            label: "Example",
            answerLabel: "Answer",
            showBullet: false,
            segments: [
              "Title of conference: ",
              { text: "Future Directions in Computing", italic: true, underline: true },
            ],
          },
          {
            type: "paragraph" as const,
            segments: [{ text: "Three day cost:", strong: true }, " ", { questionNo: 1, answerPrefix: "£ " }],
          },
          {
            type: "paragraph" as const,
            segments: ["Payment by ", { questionNo: 2 }, " or on arrival"],
          },
          {
            type: "paragraph" as const,
            segments: [{ text: "Accommodation:", strong: true }],
          },
          {
            type: "paragraph" as const,
            segments: ["Conference Centre"],
          },
          {
            type: "list" as const,
            style: "bullet" as const,
            items: [
              [{ questionNo: 3, answerPrefix: "£ " }, " per night"],
              ["near to conference rooms"],
            ],
          },
          {
            type: "paragraph" as const,
            segments: ["Guest House"],
          },
          {
            type: "list" as const,
            style: "bullet" as const,
            items: [
              [{ questionNo: 4, answerPrefix: "£ " }, " per night"],
              ["approximately ", { questionNo: 5 }, " walk from Conference Centre"],
            ],
          },
          {
            type: "paragraph" as const,
            segments: [{ text: "Further documents to be sent:", strong: true }],
          },
          {
            type: "list" as const,
            style: "bullet" as const,
            items: [
              [{ questionNo: 6 }],
              ["an application form"],
            ],
          },
          {
            type: "paragraph" as const,
            segments: [{ text: "Location:", strong: true }],
          },
          {
            type: "paragraph" as const,
            segments: [
              "Conference Centre is on ",
              { questionNo: 7 },
              " Park Road, next to the ",
              { questionNo: 8 },
              ".",
            ],
          },
          {
            type: "paragraph" as const,
            segments: [
              "Taxi costs ",
              { questionNo: 9, answerPrefix: "£ " },
              " or take bus number ",
              { questionNo: 10 },
              " from station.",
            ],
          },
        ],
      };
    });
  }

  if (key === CI6_TEST_4_SECTION_2) {
    return groups.map((group) => {
      if (group.id === "q11-13") {
        return {
          ...group,
          optionsTitle: "Teams",
          instructions: [
            "Which team will do each of the following jobs?",
            "Choose THREE answers from the box and write the correct letter, A-D, next to questions 11-13.",
          ],
          content: [
            {
              type: "list" as const,
              style: "none" as const,
              items: [
                ["checking entrance tickets ", { questionNo: 11 }],
                ["preparing refreshments ", { questionNo: 12 }],
                ["directing car-park traffic ", { questionNo: 13 }],
              ],
            },
          ],
        };
      }
      if (group.id !== "q14-20") return group;
      return {
        ...group,
        content: [
          {
            type: "table" as const,
            title: "Travel Expo\nTemporary Staff Orientation Programme",
            headers: [["Time"], ["Event"], ["Details"]],
            rows: [
              [["9.30 am"], ["Talk by Anne Smith"], ["• information about pay\n• will give out the ", { questionNo: 14 }, " forms"]],
              [["10.00 am"], ["Talk by Peter Chen"], ["• will discuss Conference Centre plan\n• will explain about arrangements for\n", { questionNo: 15 }, " and fire exits"]],
              [["10.30 am"], ["Coffee Break"], ["• go to Staff Canteen on the\n", { questionNo: 16 }]],
              [["11.00 am"], ["Video Presentation"], ["• go to ", { questionNo: 17 }, "\n• video title: ", { questionNo: 18 }]],
              [["12.00"], ["Buffet Lunch"], ["• go to the ", { questionNo: 19 }, " on 1st floor"]],
              [["1.00 pm"], ["Meet the ", { questionNo: 20 }], []],
              [["3.00 pm"], ["Finish"], []],
            ],
          },
        ],
      };
    });
  }

  if (key === CI6_TEST_4_SECTION_3) {
    return groups.map((group) => {
      if (group.id === "q21-25") {
        return {
          ...group,
          content: [
            {
              type: "paragraph" as const,
              segments: [{ text: "The School of Education Libraries", strong: true }],
            },
            {
              type: "paragraph" as const,
              segments: ["The libraries on both sites provide internet access and have a variety of ", { questionNo: 21 }, " materials on education."],
            },
            {
              type: "paragraph" as const,
              segments: ["The Castle Road library has books on sociology, together with ", { questionNo: 22 }, " and other resources relevant to the majority of ", { questionNo: 23 }, " school subjects."],
            },
            {
              type: "paragraph" as const,
              segments: ["The Fordham library includes resources for teaching in ", { questionNo: 24 }, " education and special needs."],
            },
            {
              type: "paragraph" as const,
              segments: ["Current issues of periodicals are available at both libraries, although ", { questionNo: 25 }, " issues are only available at Fordham."],
            },
          ],
        };
      }
      if (group.id === "q26-27") {
        return {
          ...group,
          framed: false,
          instructions: [
            "Answer the questions below.",
            "Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
          ],
          content: [
            {
              type: "list" as const,
              style: "none" as const,
              items: [
                [{ text: "26", strong: true }, " Which books cannot be renewed by telephone or email?\n", { questionNo: 26, showQuestionNumber: false }],
                [{ text: "27", strong: true }, " How much time is allowed to return recalled books?\n", { questionNo: 27, showQuestionNumber: false }],
              ],
            },
          ],
        };
      }
      return group;
    });
  }

  if (key === CI6_TEST_4_SECTION_4) {
    return groups.map((group) => {
      if (group.id === "q31-34") {
        return {
          ...group,
          instructions: ["Choose the correct letter, A, B or C."],
        };
      }
      if (group.id !== "q35-40") return group;
      return {
        ...group,
        framed: false,
        content: [
          {
            type: "paragraph" as const,
            segments: [{ text: "THE GIR SANCTUARY", strong: true }],
          },
          {
            type: "list" as const,
            style: "none" as const,
            items: [
              [{ text: "35", strong: true }, " The sanctuary has an area of approximately ", { questionNo: 35, showQuestionNumber: false }, " square kilometres."],
              [{ text: "36", strong: true }, " One threat to the lions in the sanctuary is ", { questionNo: 36, showQuestionNumber: false }, "."],
              [{ text: "37", strong: true }, " The ancestors of the Gir Sanctuary lions were protected by a ", { questionNo: 37, showQuestionNumber: false }, "."],
              [{ text: "38", strong: true }, " A large part of the lions’ ", { questionNo: 38, showQuestionNumber: false }, " consists of animals belonging to local farmers."],
              [{ text: "39", strong: true }, " The lions sometimes ", { questionNo: 39, showQuestionNumber: false }, ", especially when water is short."],
              [{ text: "40", strong: true }, " In ancient India a man would fight a lion as a test of ", { questionNo: 40, showQuestionNumber: false }, "."],
            ],
          },
        ],
      };
    });
  }

  if (key === "cambridge-6:1:4") {
    return groups.map((group) => group.id === "q38-40"
      ? { ...group, optionsLayout: "single-column" as const }
      : group);
  }

  if (key === CI5_TEST_4_SECTION_3) {
    return groups.map((group) => {
      if (group.id === "q21-24") {
        return {
          ...group,
          content: (group.content ?? []).map((block, blockIndex) => blockIndex === 0
            ? {
                type: "paragraph" as const,
                segments: [{ text: "Box Telecom", strong: true, underline: true, fontFamily: "sans" as const }],
              }
            : block),
        };
      }
      if (group.id !== "q28-30") return group;
      return {
        ...group,
        optionsLayout: "single-column" as const,
        content: [
          {
            type: "list" as const,
            items: [
              ["Karin", { questionNo: 28 }],
              ["Jason", { questionNo: 29 }],
              ["the tutor", { questionNo: 30 }],
            ],
            style: "none" as const,
          },
        ],
      };
    });
  }

  if (key === "cambridge-5:4:4") {
    return groups.map((group) => group.id === "q37-40"
      ? { ...group, optionsBoxed: false, optionsLayout: "single-column" as const }
      : group);
  }

  return groups;
}

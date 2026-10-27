import type { ReadingPart } from "./reading";
import type { ReadingSourcePage as SourcePage } from "./reading-source-model";

const pageDimensions: Record<number, [number, number]> = {
  86: [1486, 2118], 87: [1553, 2193], 88: [1486, 2099], 89: [1561, 2195],
  90: [1489, 2100], 91: [1549, 2192], 92: [1546, 2191], 93: [1485, 2192],
  94: [1557, 2192], 95: [1542, 2192], 96: [1553, 2193], 97: [1564, 2193],
  98: [1485, 2101], 130: [1213, 1127],
};

function sourcePage(page: number): SourcePage {
  const [width, height] = pageDimensions[page] ?? [1600, 2265];
  return {
    page,
    src: "/reading/source-pages/ci11-p" + String(page).padStart(3, "0") + ".webp",
    width,
    height,
  };
}

function explanationPage(page: number): SourcePage {
  return {
    page,
    src: "/reading/explanations/cambridge-11-test-4-part1-exp11-p" + String(page).padStart(3, "0") + ".webp",
    width: 1600,
    height: page === 143 ? 1749 : 2331,
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

const twinResearchers = [
  { letter: "A", text: "Francis Galton" },
  { letter: "B", text: "Thomas Bouchard" },
  { letter: "C", text: "Danielle Reed" },
];

const twinEpigenetics: ReadingPart = {
  id: "cambridge-11-test-4-part1",
  label: "Part 1",
  questionRange: "questions 1-13",
  intro: "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
  title: "Research using twins",
  sections: [{
    id: "cambridge-11-test-4-part1-passage",
    format: "pre",
    paragraphs: [
      "To biomedical researchers all over the world, twins offer a precious opportunity to untangle the influence of genes and the environment — of nature and nurture. Because identical twins come from a single fertilized egg that splits into two, they share virtually the same genetic code. Any differences between them — one twin having younger-looking skin, for example — must be due to environmental factors such as less time spent in the sun. Alternatively, by comparing the experiences of identical twins with those of fraternal twins, who come from separate eggs and share on average half their DNA, researchers can quantify the extent to which our genes affect our lives. If identical twins are more similar to each other with respect to an ailment than fraternal twins are, then vulnerability to the disease must be rooted at least in part in heredity.",
      "These two lines of research — studying the differences between identical twins to pinpoint the influence of environment, and comparing identical twins with fraternal ones to measure the role of inheritance — have been crucial to understanding the interplay of nature and nurture in determining our personalities, behaviour and vulnerability to disease.",
      "The idea of using twins to measure the influence of heredity dates back to 1875, when the English scientist Francis Galton first suggested the approach (and coined the phrase ‘nature and nurture’). But twin studies took a surprising twist in the 1980s, with the arrival of studies into identical twins who had been separated at birth and reunited as adults. Over two decades, 137 sets of twins eventually visited Thomas Bouchard’s lab in what became known as the Minnesota Study of Twins Reared Apart. Numerous tests were carried out on the twins, and they were each asked more than 15,000 questions. Bouchard and his colleagues used this mountain of data to identify how far twins were affected by their genetic makeup. The key to their approach was a statistical concept called heritability. In broad terms, the heritability of a trait measures the extent to which differences among members of a population can be explained by differences in their genetics. And wherever Bouchard and other scientists looked, it seemed, they found the invisible hand of genetic influence helping to shape our lives.",
      "Lately, however, twin studies have helped lead scientists to a radical new conclusion: that nature and nurture are not the only elemental forces at work. According to a recent field called epigenetics, there is a third factor also in play, one that in some cases serves as a bridge between the environment and our genes, and in others operates on its own to shape who we are. Epigenetic processes are chemical reactions tied to neither nature nor nurture but representing what researchers have called a ‘third component’. These reactions influence how our genetic code is expressed: how each gene is strengthened or weakened, even turned on or off, to build our bones, brains and all the other parts of our bodies.",
      "If you think of our DNA as an immense piano keyboard and our genes as the keys — each key symbolizing a segment of DNA responsible for a particular note, or trait, and all the keys combining to make us who we are — then epigenetic processes determine when and how each key can be struck, changing the tune being played. One way the study of epigenetics is revolutionizing our understanding of biology is by revealing a mechanism by which the environment directly impacts on genes. Studies of animals, for example, have shown that when a rat experiences stress during pregnancy, it can cause epigenetic changes in a fetus that lead to behavioural problems as the rodent grows up. Other epigenetic processes appear to occur randomly, while others are normal, such as those that guide embryonic cells as they become heart, brain or liver cells, for example.",
      "Geneticist Danielle Reed has worked with many twins over the years and thought deeply about what twin studies have taught us. ‘It’s very clear when you look at twins that much of what they share is hardwired,’ she says. ‘Many things about them are absolutely the same and unalterable. But it’s also clear, when you get to know them, that other things about them are different. Epigenetics is the origin of a lot of those differences, in my view.’ Reed credits Thomas Bouchard’s work for today’s surge in twin studies. ‘He was the trailblazer,’ she says. ‘We forget that 50 years ago things like heart disease were thought to be caused entirely by lifestyle. Schizophrenia was thought to be due to poor mothering. Twin studies have allowed us to be more reflective about what people are actually born with and what’s caused by experience.’",
      "Having said that, Reed adds, the latest work in epigenetics promises to take our understanding even further. ‘What I like to say is that nature writes some things in pencil and some things in pen,’ she says. ‘Things written in pen you can’t change. That’s DNA. But things written in pencil you can. That’s epigenetics. Now that we’re actually able to look at the DNA and see where the pencil writings are, it’s sort of a whole new world.’",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-11-test-4-part1-questions-1-4",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 1? In boxes 1–4 on your answer sheet, write TRUE if the statement agrees with the information FALSE if the statement contradicts the information NOT GIVEN if there is no information on this",
      questions: [
        { questionNumbers: [1], prompt: "There may be genetic causes for the differences in how young the skin of identical twins looks.", options: judgmentOptions },
        { questionNumbers: [2], prompt: "Twins are at greater risk of developing certain illnesses than non-twins.", options: judgmentOptions },
        { questionNumbers: [3], prompt: "Bouchard advertised in newspapers for twins who had been separated at birth.", options: judgmentOptions },
        { questionNumbers: [4], prompt: "Epigenetic processes are different from both genetic and environmental processes.", options: judgmentOptions },
      ],
    },
    {
      id: "cambridge-11-test-4-part1-questions-5-9",
      type: "choice",
      sharedOptions: true,
      instruction: "Match each statement with the correct researcher, A, B or C. You may use any letter more than once.",
      questions: [
        { questionNumbers: [5], prompt: "Invented a term used to distinguish two factors affecting human characteristics.", options: twinResearchers },
        { questionNumbers: [6], prompt: "Expressed the view that the study of epigenetics will increase our knowledge.", options: twinResearchers },
        { questionNumbers: [7], prompt: "Developed a mathematical method of measuring genetic influences.", options: twinResearchers },
        { questionNumbers: [8], prompt: "Pioneered research into genetics using twins.", options: twinResearchers },
        { questionNumbers: [9], prompt: "Carried out research into twins who had lived apart.", options: twinResearchers },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-11-test-4-part1-questions-10-13",
        "Questions 10–13",
        "Questions 10–13\nComplete the summary using the list of words, A–F, below. Write the correct letter, A–F.\n\nEpigenetic processes\nIn epigenetic processes, 10 ______ influence the activity of our genes, for example in creating our internal 11 ______. The study of epigenetic processes is uncovering a way in which our genes can be affected by our 12 ______. One example is that if a pregnant rat suffers stress, the new-born rat may later show problems in its 13 ______.\n\nA nurture\nB organs\nC code\nD chemicals\nE environment\nF behaviour/behavior",
        10,
        13,
      ),
      wordBank: ["A", "B", "C", "D", "E", "F"],
    },
  ],
  source: {
    passagePages: [sourcePage(86), sourcePage(87)],
    questionPages: [sourcePage(88), sourcePage(89)],
    answerPages: [sourcePage(130)],
    explanationPages: [143, 144, 145, 146, 147, 148].map(explanationPage),
    explanationAttribution: "精讲解析｜剑桥雅思考试全真试题集11精讲.pdf，对应阅读章节",
    analysisVerified: true,
  },
};

const filmSound: ReadingPart = {
  id: "cambridge-11-test-4-part2",
  label: "Part 2",
  questionRange: "questions 14-26",
  intro: "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 below.",
  title: "An Introduction to Film Sound",
  sections: [{
    id: "cambridge-11-test-4-part2-passage",
    format: "pre",
    paragraphs: [
      "Though we might think of film as an essentially visual experience, we really cannot afford to underestimate the importance of film sound. A meaningful sound track is often as complicated as the image on the screen, and is ultimately just as much the responsibility of the director. The entire sound track consists of three essential ingredients: the human voice, sound effects and music. These three tracks must be mixed and balanced so as to produce the necessary emphases which in turn create desired effects. Topics which essentially refer to the three previously mentioned tracks are discussed below. They include dialogue, synchronous and asynchronous sound effects, and music.",
      "Let us start with dialogue. As is the case with stage drama, dialogue serves to tell the story and expresses feelings and motivations of characters as well. Often with film characterization the audience perceives little or no difference between the character and the actor. Thus, for example, the actor Humphrey Bogart is the character Sam Spade; film personality and life personality seem to merge. Perhaps this is because the very texture of a performer’s voice supplies an element of character.",
      "When voice textures fit the performer’s physiognomy and gestures, a whole and very realistic persona emerges. The viewer sees not an actor working at his craft, but another human being struggling with life. It is interesting to note how dialogue is used and the very amount of dialogue used varies widely among films. For example, in the highly successful science-fiction film 2001, little dialogue was evident, and most of it was banal and of little intrinsic interest. In this way the film-maker was able to portray what Thomas Sobchack and Vivian Sobchack call, in An Introduction to Film, the ‘inadequacy of human responses when compared with the magnificent technology created by man and the visual beauties of the universe’.",
      "The comedy Bringing Up Baby, on the other hand, presents practically non-stop dialogue delivered at breakneck speed. This use of dialogue underscores not only the dizzy quality of the character played by Katherine Hepburn, but also the absurdity of the film itself and thus its humour. The audience is bounced from gag to gag and conversation to conversation; there is no time for audience reflection. The audience is caught up in a whirlwind of activity in simply managing to follow the plot. This film presents pure escapism — largely due to its frenetic dialogue.",
      "Synchronous sound effects are those sounds which are synchronized or matched with what is viewed. For example, if the film portrays a character playing the piano, the sounds of the piano are projected. Synchronous sounds contribute to the realism of film and also help to create a particular atmosphere. For example, the ‘click’ of a door being opened may simply serve to convince the audience that the image portrayed is real, and the audience may only subconsciously note the expected sound. However, if the ‘click’ of an opening door is part of an ominous action such as a burglary, the sound mixer may call attention to the ‘click’ with an increase in volume; this helps to engage the audience in a moment of suspense.",
      "Asynchronous sound effects, on the other hand, are not matched with a visible source of the sound on screen. Such sounds are included so as to provide an appropriate emotional nuance, and they may also add to the realism of the film. For example, a film-maker might opt to include the background sound of an ambulance’s siren while the foreground sound and image portrays an arguing couple. The asynchronous ambulance siren underscores the psychic injury incurred in the argument; at the same time the noise of the siren adds to the realism of the film by acknowledging the film’s city setting.",
      "We are probably all familiar with background music in films, which has become so ubiquitous as to be noticeable in its absence. We are aware that it is used to add emotion and rhythm. Usually not meant to be noticeable, it often provides a tone or an emotional attitude toward the story and/or the characters depicted. In addition, background music often foreshadows a change in mood. For example, dissonant music may be used in film to indicate an approaching (but not yet visible) menace or disaster. Background music may aid viewer understanding by linking scenes. For example, a particular musical theme associated with an individual character or situation may be repeated at various points in a film in order to remind the audience of salient motifs or ideas.",
      "Film sound comprises conventions and innovations. We have come to expect an acceleration of music during car chases and creaky doors in horror films. Yet it is important to note as well that sound is often brilliantly conceived. The effects of sound are often largely subtle and often are noted by only our subconscious minds. We need to foster an awareness of film sound as well as film space so as to truly appreciate an art form that sprang to life during the twentieth century — the modern film.",
    ],
  }],
  questionBlocks: [
    {
      id: "cambridge-11-test-4-part2-questions-14-18",
      type: "choice",
      instruction: "Choose the correct letter, A, B, C or D.",
      questions: [
        { questionNumbers: [14], prompt: "In the first paragraph, the writer makes a point that", options: [
          { letter: "A", text: "the director should plan the sound track at an early stage in filming." },
          { letter: "B", text: "it would be wrong to overlook the contribution of sound to the artistry of films." },
          { letter: "C", text: "the music industry can have a beneficial influence on sound in film." },
          { letter: "D", text: "it is important for those working on the sound in a film to have sole responsibility for it." },
        ] },
        { questionNumbers: [15], prompt: "One reason that the writer refers to Humphrey Bogart is to exemplify", options: [
          { letter: "A", text: "the importance of the actor and the character appearing to have similar personalities." },
          { letter: "B", text: "the audience’s wish that actors are visually appropriate for their roles." },
          { letter: "C", text: "the value of the actor having had similar feelings to the character." },
          { letter: "D", text: "the audience’s preference for dialogue to be as authentic as possible." },
        ] },
        { questionNumbers: [16], prompt: "In the third paragraph, the writer suggests that", options: [
          { letter: "A", text: "audiences are likely to be critical of film dialogue that does not reflect their own experience." },
          { letter: "B", text: "film dialogue that appears to be dull may have a specific purpose." },
          { letter: "C", text: "filmmakers vary considerably in the skill with which they handle dialogue." },
          { letter: "D", text: "the most successful films are those with dialogue of a high quality." },
        ] },
        { questionNumbers: [17], prompt: "What does the writer suggest about Bringing Up Baby?", options: [
          { letter: "A", text: "The plot suffers from the filmmaker’s wish to focus on humorous dialogue." },
          { letter: "B", text: "The dialogue helps to make it one of the best comedy films ever produced." },
          { letter: "C", text: "There is a mismatch between the speed of the dialogue and the speed of actions." },
          { letter: "D", text: "The nature of the dialogue emphasises key elements of the film." },
        ] },
        { questionNumbers: [18], prompt: "The writer refers to the ‘click’ of a door to make the point that realistic sounds", options: [
          { letter: "A", text: "are often used to give the audience a false impression of events in the film." },
          { letter: "B", text: "may be interpreted in different ways by different members of the audience." },
          { letter: "C", text: "may be modified in order to manipulate the audience’s response to the film." },
          { letter: "D", text: "tend to be more significant in films presenting realistic situations." },
        ] },
      ],
    },
    {
      id: "cambridge-11-test-4-part2-questions-19-23",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the information given in Reading Passage 2? In boxes 19–23 on your answer sheet, write TRUE if the statement agrees with the information FALSE if the statement contradicts the information NOT GIVEN if there is no information on this",
      questions: [
        { questionNumbers: [19], prompt: "Audiences are likely to be surprised if a film lacks background music.", options: judgmentOptions },
        { questionNumbers: [20], prompt: "Background music may anticipate a development in a film.", options: judgmentOptions },
        { questionNumbers: [21], prompt: "Background music has more effect on some people than on others.", options: judgmentOptions },
        { questionNumbers: [22], prompt: "Background music may help the audience to make certain connections within the film.", options: judgmentOptions },
        { questionNumbers: [23], prompt: "Audiences tend to be aware of how the background music is affecting them.", options: judgmentOptions },
      ],
    },
    {
      id: "cambridge-11-test-4-part2-questions-24-26",
      type: "choice",
      sharedOptions: true,
      instruction: "Complete each sentence with the correct ending, A–E.",
      questions: [
        { questionNumbers: [24], prompt: "The audience’s response to different parts of a film can be controlled", options: [
          { letter: "A", text: "when the audience listens to the dialogue." },
          { letter: "B", text: "if the film reflects the audience’s own concerns." },
          { letter: "C", text: "if voice, sound and music are combined appropriately." },
          { letter: "D", text: "when the director is aware of how the audience will respond." },
          { letter: "E", text: "when the actor’s appearance, voice and moves are consistent with each other." },
        ] },
        { questionNumbers: [25], prompt: "The feelings and motivations of characters become clear", options: [
          { letter: "A", text: "when the audience listens to the dialogue." },
          { letter: "B", text: "if the film reflects the audience’s own concerns." },
          { letter: "C", text: "if voice, sound and music are combined appropriately." },
          { letter: "D", text: "when the director is aware of how the audience will respond." },
          { letter: "E", text: "when the actor’s appearance, voice and moves are consistent with each other." },
        ] },
        { questionNumbers: [26], prompt: "A character seems to be a real person rather than an actor", options: [
          { letter: "A", text: "when the audience listens to the dialogue." },
          { letter: "B", text: "if the film reflects the audience’s own concerns." },
          { letter: "C", text: "if voice, sound and music are combined appropriately." },
          { letter: "D", text: "when the director is aware of how the audience will respond." },
          { letter: "E", text: "when the actor’s appearance, voice and moves are consistent with each other." },
        ] },
      ],
    },
  ],
  source: {
    passagePages: [sourcePage(90), sourcePage(91)],
    questionPages: [sourcePage(92), sourcePage(93), sourcePage(94)],
    answerPages: [sourcePage(130)],
  },
};

const language: ReadingPart = {
  id: "cambridge-11-test-4-part3",
  label: "Part 3",
  questionRange: "questions 27-40",
  intro: "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
  title: "‘This Marvellous Invention’",
  sections: [
    {
      id: "cambridge-11-test-4-part3-section-a",
      heading: "A",
      format: "pre",
      paragraphs: ["Of all mankind’s manifold creations, language must take pride of place. Other inventions — the wheel, agriculture, sliced bread — may have transformed our material existence, but the advent of language is what made us human. Compared to language, all other inventions pale in significance, since everything we have ever achieved depends on language and originates from it. Without language, we could never have embarked on our ascent to unparalleled power over all other animals, and even over nature itself."],
    },
    {
      id: "cambridge-11-test-4-part3-section-b",
      heading: "B",
      format: "pre",
      paragraphs: ["But language is foremost not just because it came first. In its own right it is a tool of extraordinary sophistication, yet based on an idea of ingenious simplicity: this marvellous invention of composing out of twenty-five or thirty sounds that infinite variety of expressions which, whilst having in themselves no likeness to what is in our mind, allow us to disclose to others its whole secret, and to make known to those who cannot penetrate it all that we imagine, and all the various stirrings of our soul. This was how, in 1660, the renowned French grammarians of the Port-Royal abbey near Versailles distilled the essence of language, and no one since has celebrated more eloquently the magnitude of its achievement. Even so, there is just one flaw in all these hymns of praise, for the homage to language’s unique accomplishment conceals a simple yet critical incongruity. Language is mankind’s greatest invention — except, of course, that it was never invented. This apparent paradox is at the core of our fascination with language, and it holds many of its secrets."],
    },
    {
      id: "cambridge-11-test-4-part3-section-c",
      heading: "C",
      format: "pre",
      paragraphs: ["Language often seems so skilfully crafted that one can hardly imagine it as anything other than the perfected handiwork of a master craftsman. How else could this instrument make so much out of barely three dozen measly morsels of sound? In themselves, these configurations of mouth — p, f, b, v, t, d, k, g, a, e and so on — amount to nothing more than a few haphazard spits and splutters, random noises with no meaning, no ability to express, no power to explain. But run them through the cogs and wheels of the language machine, let it arrange them in some very special orders, and there is nothing that these meaningless streams of air cannot do: from sighing the interminable boredom of existence to unravelling the fundamental order of the universe."],
    },
    {
      id: "cambridge-11-test-4-part3-section-d",
      heading: "D",
      format: "pre",
      paragraphs: ["The most extraordinary thing about language, however, is that one doesn’t have to be a genius to set its wheels in motion. The language machine allows just about everybody — from pre-modern foragers in the subtropical savannah to post-modern philosophers in the suburban sprawl — to tie these meaningless sounds together into an infinite variety of subtle senses, and all apparently without the slightest exertion. Yet it is precisely this deceptive ease which makes language a victim of its own success, since in everyday life its triumphs are usually taken for granted. The wheels of language run so smoothly that one rarely bothers to stop and think about all the resourcefulness and expertise that must have gone into making it tick. Language conceals art."],
    },
    {
      id: "cambridge-11-test-4-part3-section-e",
      heading: "E",
      format: "pre",
      paragraphs: ["Often, it is only the estrangement of foreign tongues, with their many exotic and outlandish features, that brings home the wonder of language’s design. One of the showiest stunts that some languages can pull off is an ability to build up words of breath-breaking length, and thus express in one word what English takes a whole sentence to say. The Turkish word şehirlileştiremediklerimizdensiniz, to take one example, means nothing less than ‘you are one of those whom we can’t turn into a town-dweller’. (In case you were wondering, this monstrosity really is one word, not merely many different words squashed together — most of its components cannot even stand up on their own.)"],
    },
    {
      id: "cambridge-11-test-4-part3-section-f",
      heading: "F",
      format: "pre",
      paragraphs: ["And if that sounds like some one-off freak, then consider Sumerian, the language spoken on the banks of the Euphrates some 5,000 years ago by the people who invented writing and thus enabled the documentation of history. A Sumerian word like munintuma’a (‘when he had made it suitable for her’) might seem rather trim compared to the Turkish colossus above. What is so impressive about it, however, is not its lengthiness but rather the reverse — the thrifty compactness of its construction. The word is made up of different slots, each corresponding to a particular portion of meaning. This sleek design allows single sounds to convey useful information, and in fact even the absence of a sound has been enlisted to express something specific. If you were to ask which bit in the Sumerian word corresponds to the pronoun ‘it’ in the English translation ‘when he had made it suitable for her’, then the answer would have to be nothing. Mind you, a very particular kind of nothing: the nothing that stands in the empty slot in the middle. The technology is so fine-tuned then that even a non-sound, when carefully placed in a particular position, has been invested with a specific function. Who could possibly have come up with such a nifty contraption?"],
    },
  ],
  questionBlocks: [
    {
      id: "cambridge-11-test-4-part3-headings-27-32",
      type: "headings",
      title: "List of Headings",
      instruction: "Reading Passage 3 has six paragraphs, A–F. Choose the correct heading for paragraphs A–F. Write the correct number, i–vii.",
      questionNumbers: [27, 28, 29, 30, 31, 32],
      options: [
        { id: "i", text: "Differences between languages highlight their impressiveness" },
        { id: "ii", text: "The way in which a few sounds are organised to convey a huge range of meaning" },
        { id: "iii", text: "Why the sounds used in different languages are not identical" },
        { id: "iv", text: "Apparently incompatible characteristics of language" },
        { id: "v", text: "Even silence can be meaningful" },
        { id: "vi", text: "Why language is the most important invention of all" },
        { id: "vii", text: "The universal ability to use language" },
      ],
    },
    {
      ...rawFillBlock(
        "cambridge-11-test-4-part3-questions-33-36",
        "Questions 33–36",
        "Questions 33–36\nComplete the summary using the list of words, A–G, below. Write the correct letter, A–G.\n\nThe importance of language\nThe wheel is one invention that has had a major impact on 33 ______ aspects of life, but no impact has been as 34 ______ as that of language. Language is very 35 ______, yet composed of just a small number of sounds. Language appears to be 36 ______ to use. However, its sophistication is often overlooked.\n\nA difficult\nB complex\nC original\nD admired\nE material\nF easy\nG fundamental",
        33,
        36,
      ),
      wordBank: ["A", "B", "C", "D", "E", "F", "G"],
    },
    {
      id: "cambridge-11-test-4-part3-questions-37-40",
      type: "choice",
      sharedOptions: true,
      instruction: "Do the following statements agree with the views of the writer in Reading Passage 3? In boxes 37–40 on your answer sheet, write YES if the statement agrees with the views of the writer NO if the statement contradicts the views of the writer NOT GIVEN if it is impossible to say what the writer thinks about this",
      questions: [
        { questionNumbers: [37], prompt: "Human beings might have achieved their present position without language.", options: yesNoOptions },
        { questionNumbers: [38], prompt: "The Port-Royal grammarians did justice to the nature of language.", options: yesNoOptions },
        { questionNumbers: [39], prompt: "A complex idea can be explained more clearly in a sentence than in a single word.", options: yesNoOptions },
        { questionNumbers: [40], prompt: "The Sumerians were responsible for starting the recording of events.", options: yesNoOptions },
      ],
    },
  ],
  source: {
    passagePages: [sourcePage(96), sourcePage(97)],
    questionPages: [sourcePage(95), sourcePage(98)],
    answerPages: [sourcePage(130)],
  },
};

export const CAMBRIDGE11_TEST4_PARTS: ReadingPart[] = [twinEpigenetics, filmSound, language];

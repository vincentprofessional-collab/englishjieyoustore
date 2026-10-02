export type SpellingCharacterFeedback = { letter: string; correct: boolean };

export function getSpellingCharacterFeedback(answer: string, target: string, revealMissing = false): SpellingCharacterFeedback[] {
  const typedLetters = Array.from(answer);
  const expectedLetters = Array.from(target);
  const feedback = typedLetters.map((letter, index) => ({
    letter,
    correct: index < expectedLetters.length
      && letter.toLowerCase() === expectedLetters[index].toLowerCase(),
  }));

  if (revealMissing) {
    feedback.push(...expectedLetters.slice(typedLetters.length).map((letter) => ({ letter, correct: false })));
  }

  return feedback;
}

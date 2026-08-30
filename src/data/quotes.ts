// Encouraging quotes shown after a wrong answer on the results screen.
// Written to sound like a person, not a chatbot.
export const WRONG_ANSWER_QUOTES: string[] = [
  "Almost — that concept trips everyone up the first time.",
  "Wrong answer, solid attempt. The gap is in one detail.",
  "That one's sneaky. Now you know exactly why.",
  "Close enough to be frustrating — which means your reasoning was on the right track.",
  "Not quite. The correct answer is worth rereading slowly.",
  "You picked the popular wrong answer. Good company, wrong conclusion.",
  "Miss now, ace it next time. That's the actual pattern.",
  "The trap was obvious in hindsight, right? That's on purpose.",
  "Wrong, but a wrong answer you understand beats a right guess.",
  "Your brain was one degree off. That's a fixable thing.",
  "File that one away — it'll come back around.",
  "Nah, but that's why we practise, not why we panic.",
  "Everyone misses that one the first time. Literally everyone.",
  "Tougher than it looks on the surface. Check the explanation.",
  "Wrong, but you were thinking about it. That's more than most.",
  "That answer makes intuitive sense — which is exactly why it's wrong.",
  "One missed question is data, not disaster.",
  "Review the correct answer. It'll click the moment you see it.",
  "You were in the right neighbourhood, just the wrong address.",
  "Knowing what you got wrong is half the preparation for the real thing.",
];

export function getRandomQuote(): string {
  return WRONG_ANSWER_QUOTES[Math.floor(Math.random() * WRONG_ANSWER_QUOTES.length)];
}

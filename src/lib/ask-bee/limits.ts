/** What a browser may send to Bee. Caps keep a request (and its token bill) small. */
export const LIMITS = {
  question: 500,
  sources: 6,
  sourceText: 2400,
  history: 4,
  turnText: 1200,
} as const;

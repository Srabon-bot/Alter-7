export function cannedVerdict({ won, score, streak, closedBy }) {
  if (closedBy === 'auto') {
    return {
      verdict: 'No report. The day closed itself.',
      evidence: [`Score ${score}.`, `Streak ${streak}.`],
      question: 'What were you avoiding saying?',
    };
  }
  if (won) {
    const line =
      streak === 7
        ? 'Seven days. Now it begins.'
        : streak === 14
          ? 'Fourteen days. The floor is higher.'
          : streak === 30
            ? 'Thirty days. This is the work.'
            : 'Noted.';
    return {
      verdict: line,
      evidence: [`Score ${score}.`, `Day ${streak}.`],
      question: 'Do it again tomorrow.',
    };
  }
  return {
    verdict: 'Lost.',
    evidence: [`Score ${score}.`, `Streak reset to ${streak}.`],
    question: 'What did you choose instead?',
  };
}

export function cannedLine(verdictDoc) {
  if (!verdictDoc) return 'Report in. The day is waiting.';
  return [verdictDoc.verdict, verdictDoc.question].filter(Boolean).join(' ');
}

export const FALLBACK_LINE = 'The record stands. Continue.';

// The hero's timings, shared by the page (to draw the first frame) and the runtime (to play it).
export const BUBBLE_AT = 100      // ms until the question rises
export const ANSWER_AT = 450      // ms until the answer starts typing
export const ANSWER_MS = 22.5 / 0.7 // ms per character of the answer
export const LINE_GAP = 150       // ms between the answer's last character and the line
export const LINE_MS = 0.9375     // ms per character of the line, unless hero.lineMs says otherwise

// Seconds from the question rising to the answer's last character, as a turn duration would show it.
export const turnSeconds = answer =>
  Math.max(1, Math.round((ANSWER_AT - BUBBLE_AT + Array.from(answer).length * ANSWER_MS) / 1000))

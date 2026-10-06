/**
 * Lightweight fuzzy scorer (no Fuse.js).
 * Higher is better; 0 = no match.
 */
export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!q) return 1;
  if (!t) return 0;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 900 + Math.min(q.length, 40);
  const idx = t.indexOf(q);
  if (idx >= 0) {
    const wordStart = idx === 0 || /[\s\-_/.:#[\]]/.test(t[idx - 1]);
    return (wordStart ? 780 : 700) + Math.min(q.length, 40);
  }

  let ti = 0;
  let score = 0;
  let consecutive = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    let found = -1;
    for (let j = ti; j < t.length; j++) {
      if (t[j] === ch) {
        found = j;
        break;
      }
    }
    if (found < 0) return 0;
    if (found === 0 || /[\s\-_/.:#[\]]/.test(t[found - 1])) score += 18;
    if (found === ti) {
      consecutive += 1;
      score += 8 * consecutive;
    } else {
      consecutive = 0;
    }
    score += 4;
    ti = found + 1;
  }
  score += Math.max(0, 36 - (t.length - q.length));
  return score;
}

/** Best score across multiple searchable fields. */
export function bestFuzzyScore(query: string, fields: Array<string | undefined | null>): number {
  let best = 0;
  for (const field of fields) {
    if (!field) continue;
    best = Math.max(best, fuzzyScore(query, field));
  }
  return best;
}

/**
 * Advanced Semantic & Typo-Tolerant Similarity Engine for Answer Verification.
 * Combines Soft Token Cosine Matching, Damerau-Levenshtein Edit Ratio,
 * Jaro-Winkler metric, and Character N-gram Cosine.
 * 
 * Handles typos (e.g. "spider man" vs "Spider mann"), formatting variations,
 * plurals, and word reordering while firmly rejecting incorrect answers.
 */

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "with",
  "is", "it", "its", "was", "are", "be", "has", "have", "had",
  "my", "mine", "your", "yours", "their", "there", "this", "that",
  "and", "or", "but", "so", "by", "from", "about", "into", "over"
]);

/**
 * Normalizes text: lowercases, strips excess punctuation, normalizes spaces.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes Damerau-Levenshtein distance (handles insertions, deletions, substitutions, and transpositions).
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  const d: number[][] = Array.from({ length: lenA + 1 }, () =>
    new Array(lenB + 1).fill(0)
  );

  for (let i = 0; i <= lenA; i++) d[i][0] = i;
  for (let j = 0; j <= lenB; j++) d[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[lenA][lenB];
}

/**
 * Computes Levenshtein ratio (0.0 to 1.0).
 */
export function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = damerauLevenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Computes Jaro-Winkler similarity (0.0 to 1.0).
 * Highly effective for short names and strings with typos.
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (!s2Matches[j] && s1[i] === s2[j]) {
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0.0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (s1Matches[i]) {
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) /
    3;

  // Winkler prefix scaling (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Extracts character n-grams (3-grams and 4-grams).
 */
function getCharNgrams(text: string): string[] {
  const compact = text.replace(/\s+/g, "_");
  const ngrams: string[] = [];

  for (let i = 0; i <= compact.length - 3; i++) {
    ngrams.push(`c3:${compact.substring(i, i + 3)}`);
  }
  for (let i = 0; i <= compact.length - 4; i++) {
    ngrams.push(`c4:${compact.substring(i, i + 4)}`);
  }

  return ngrams;
}

/**
 * Builds term frequency vector with sublinear scaling (1 + ln(count)).
 */
function buildTfVector(tokens: string[]): Map<string, number> {
  const freqMap = new Map<string, number>();
  for (const token of tokens) {
    freqMap.set(token, (freqMap.get(token) || 0) + 1);
  }

  const tf = new Map<string, number>();
  for (const [token, count] of freqMap.entries()) {
    tf.set(token, 1 + Math.log(count));
  }
  return tf;
}

/**
 * Vector Cosine calculation.
 */
function computeCosine(vecA: Map<string, number>, vecB: Map<string, number>): number {
  if (vecA.size === 0 || vecB.size === 0) return 0;

  let dot = 0;
  for (const [k, valA] of vecA.entries()) {
    const valB = vecB.get(k);
    if (valB !== undefined) dot += valA * valB;
  }

  let magA = 0;
  for (const v of vecA.values()) magA += v * v;
  magA = Math.sqrt(magA);

  let magB = 0;
  for (const v of vecB.values()) magB += v * v;
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Soft Token Matching (Monge-Elkan / Soft-Cosine).
 * For each token in Candidate, finds the best fuzzy match in Target, and vice versa.
 */
function computeSoftTokenSimilarity(wordsA: string[], wordsB: string[]): number {
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  // Filter stopwords unless the whole string is made of them
  const filterA = wordsA.filter((w) => !STOP_WORDS.has(w));
  const filterB = wordsB.filter((w) => !STOP_WORDS.has(w));
  const listA = filterA.length > 0 ? filterA : wordsA;
  const listB = filterB.length > 0 ? filterB : wordsB;

  let sumMaxSimAtoB = 0;
  for (const wa of listA) {
    let maxSim = 0;
    for (const wb of listB) {
      const sim = Math.max(levenshteinRatio(wa, wb), jaroWinklerSimilarity(wa, wb));
      if (sim > maxSim) maxSim = sim;
    }
    sumMaxSimAtoB += maxSim;
  }
  const scoreAtoB = sumMaxSimAtoB / listA.length;

  let sumMaxSimBtoA = 0;
  for (const wb of listB) {
    let maxSim = 0;
    for (const wa of listA) {
      const sim = Math.max(levenshteinRatio(wb, wa), jaroWinklerSimilarity(wb, wa));
      if (sim > maxSim) maxSim = sim;
    }
    sumMaxSimBtoA += maxSim;
  }
  const scoreBtoA = sumMaxSimBtoA / listB.length;

  return (scoreAtoB + scoreBtoA) / 2;
}

export interface SimilarityResult {
  score: number; // 0.0 to 1.0
  percentage: number; // 0 to 100
  passed: boolean; // true if percentage >= 80
  details: string;
}

/**
 * Computes semantic similarity between user's answer and the target answer.
 * Accurately recognizes answers with typos ("spider man" vs "Spider mann"),
 * rewordings, and partial variations, while rejecting false claims.
 */
export function computeAnswerSimilarity(
  userAnswer: string,
  targetAnswer: string
): SimilarityResult {
  const normUser = normalizeText(userAnswer || "");
  const normTarget = normalizeText(targetAnswer || "");

  if (!normUser || !normTarget) {
    return {
      score: 0,
      percentage: 0,
      passed: false,
      details: "Answer cannot be empty.",
    };
  }

  // 1. Exact match shortcut
  if (normUser === normTarget) {
    return {
      score: 1.0,
      percentage: 100,
      passed: true,
      details: "Exact match (100%).",
    };
  }

  // Also check without any spaces (e.g. "spiderman" vs "spider man")
  const noSpaceUser = normUser.replace(/\s+/g, "");
  const noSpaceTarget = normTarget.replace(/\s+/g, "");
  if (noSpaceUser === noSpaceTarget) {
    return {
      score: 0.98,
      percentage: 98,
      passed: true,
      details: "Normalized phrase match (98%).",
    };
  }

  // 2. Whole String Damerau-Levenshtein Ratio
  const editRatio = levenshteinRatio(normUser, normTarget);

  // 3. Whole String Jaro-Winkler Similarity
  const jwSim = jaroWinklerSimilarity(normUser, normTarget);

  // 4. Soft-Cosine Token Matching (Word by Word)
  const wordsUser = normUser.split(/\s+/).filter(Boolean);
  const wordsTarget = normTarget.split(/\s+/).filter(Boolean);
  const softTokenSim = computeSoftTokenSimilarity(wordsUser, wordsTarget);

  // 5. Character N-gram Cosine
  const ngramsUser = getCharNgrams(normUser);
  const ngramsTarget = getCharNgrams(normTarget);
  const vecUser = buildTfVector(ngramsUser);
  const vecTarget = buildTfVector(ngramsTarget);
  const ngramCosine = computeCosine(vecUser, vecTarget);

  // 6. Substring Containment Bonus
  let containmentBonus = 0;
  if (normUser.includes(normTarget) || normTarget.includes(normUser)) {
    const minL = Math.min(normUser.length, normTarget.length);
    const maxL = Math.max(normUser.length, normTarget.length);
    containmentBonus = 0.80 + 0.20 * (minL / maxL);
  }

  // Weighted combination:
  // softTokenSim handles multi-word matching & reordering (35%)
  // jwSim & editRatio handle typos like "Spider mann" (35%)
  // ngramCosine handles character subword overlap (30%)
  const typoScore = Math.max(jwSim, editRatio);
  let finalScore =
    0.35 * softTokenSim + 0.35 * typoScore + 0.30 * ngramCosine;

  if (containmentBonus > 0) {
    finalScore = Math.max(finalScore, containmentBonus);
  }

  // If both softToken and typoScore are high (> 0.85), reward with high confidence
  if (softTokenSim >= 0.85 && typoScore >= 0.85) {
    finalScore = Math.max(finalScore, (softTokenSim + typoScore) / 2);
  }

  finalScore = Math.min(1.0, Math.max(0.0, finalScore));
  const percentage = Math.round(finalScore * 100);
  const passed = percentage >= 80;

  return {
    score: Number(finalScore.toFixed(3)),
    percentage,
    passed,
    details: passed
      ? `Verification successful (${percentage}% similarity).`
      : `Verification score: ${percentage}%. Accuracy must be at least 80%.`,
  };
}

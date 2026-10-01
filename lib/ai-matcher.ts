import {
  normalizeText,
  jaroWinklerSimilarity,
  damerauLevenshteinDistance,
  computeAnswerSimilarity,
} from "./cosine-similarity";

export interface VisualFeatures {
  grid: number[]; // 64 normalized luminance values (8x8 spatial shape grid)
  histogram: number[]; // 48 normalized color bins (16 R, 16 G, 16 B)
  aspectRatio: number; // width / height
  dominantColorHex?: string;
}

export interface ReportLike {
  _id?: any;
  title: string;
  category: string;
  brand?: string;
  model?: string;
  color?: string;
  location?: string;
  description?: string;
  imageUrl?: string | null;
  visualFeatures?: VisualFeatures | null;
  status?: string;
  hiddenQuestion?: string;
  isLocked?: boolean;
  userEmail?: string;
  userName?: string;
  createdAt?: Date | string;
  [key: string]: any;
}

export interface MatchResult {
  report: ReportLike;
  totalScore: number; // 0.0 to 1.0
  percentage: number; // 0 to 100
  visualScore: number | null; // 0.0 to 1.0 (or null if images not available)
  visualPercentage: number | null;
  textScore: number; // 0.0 to 1.0
  textPercentage: number;
  matchLevel: "HIGH" | "MODERATE" | "LOW";
  reasons: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Visual Similarity (CLIP / Spatial Grid & Color Distribution)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes cosine similarity between two numeric vectors.
 */
function vectorCosine(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA === 0 || magB === 0) return 0;
  return Math.max(0, Math.min(1, dot / (Math.sqrt(magA) * Math.sqrt(magB))));
}

/**
 * Computes visual similarity between two sets of visual features.
 * Combines spatial block luminance (object shape/edges) + color distribution histogram + aspect ratio.
 */
export function computeVisualSimilarity(
  vfA: VisualFeatures,
  vfB: VisualFeatures
): { score: number; percentage: number; details: string } {
  if (!vfA || !vfB) return { score: 0, percentage: 0, details: "No visual features" };

  // 1. Spatial shape similarity (8x8 luminance grid)
  const shapeSim = vectorCosine(vfA.grid, vfB.grid);

  // 2. Color distribution similarity (48 color bins)
  const colorSim = vectorCosine(vfA.histogram, vfB.histogram);

  // 3. Aspect ratio similarity
  const maxAspect = Math.max(vfA.aspectRatio || 1, vfB.aspectRatio || 1);
  const minAspect = Math.min(vfA.aspectRatio || 1, vfB.aspectRatio || 1);
  const aspectSim = maxAspect > 0 ? minAspect / maxAspect : 1;

  // Weighted combination: 50% shape contour + 40% color palette + 10% aspect ratio
  const score = 0.50 * shapeSim + 0.40 * colorSim + 0.10 * aspectSim;
  const percentage = Math.round(score * 100);

  const details = `Shape: ${Math.round(shapeSim * 100)}%, Color: ${Math.round(
    colorSim * 100
  )}%, Frame: ${Math.round(aspectSim * 100)}%`;

  return { score, percentage, details };
}

/**
 * Server-side fallback feature extractor for base64 image strings if pre-computed visualFeatures are missing.
 * Analyzes binary payload sampling & luminance entropy to generate a consistent 64-dim grid and 48-dim color vector.
 */
export function extractFallbackVisualFeatures(base64DataUrl: string): VisualFeatures {
  const parts = base64DataUrl.split(",");
  const rawBase64 = parts[1] || parts[0];
  const buffer = Buffer.from(rawBase64, "base64");

  // Sample bytes across buffer to generate pseudo-spatial and color distribution
  const grid: number[] = new Array(64).fill(0);
  const rBins: number[] = new Array(16).fill(0);
  const gBins: number[] = new Array(16).fill(0);
  const bBins: number[] = new Array(16).fill(0);

  const step = Math.max(1, Math.floor(buffer.length / 512));
  let count = 0;

  for (let i = 0; i < buffer.length - 2; i += step * 3) {
    const r = buffer[i] || 0;
    const g = buffer[i + 1] || 0;
    const b = buffer[i + 2] || 0;

    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const gridIdx = count % 64;
    grid[gridIdx] += lum;

    rBins[Math.min(15, Math.floor(r / 16))]++;
    gBins[Math.min(15, Math.floor(g / 16))]++;
    bBins[Math.min(15, Math.floor(b / 16))]++;

    count++;
  }

  // Normalize grid
  const samplesPerGrid = Math.max(1, count / 64);
  const normalizedGrid = grid.map((v) =>
    parseFloat((v / samplesPerGrid).toFixed(4))
  );

  // Normalize color bins
  const totalColorSamples = Math.max(1, count);
  const histogram = [
    ...rBins.map((v) => parseFloat((v / totalColorSamples).toFixed(4))),
    ...gBins.map((v) => parseFloat((v / totalColorSamples).toFixed(4))),
    ...bBins.map((v) => parseFloat((v / totalColorSamples).toFixed(4))),
  ];

  return {
    grid: normalizedGrid,
    histogram,
    aspectRatio: 1.0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Semantic NLP & Metadata Matching
// ─────────────────────────────────────────────────────────────────────────────

const COMMON_COLORS = [
  "black", "white", "silver", "grey", "gray", "space grey", "space gray",
  "blue", "navy", "dark blue", "light blue", "cyan",
  "red", "maroon", "burgundy", "crimson",
  "green", "olive", "emerald",
  "yellow", "gold", "golden",
  "purple", "violet", "lavender",
  "pink", "rose", "rose gold",
  "orange", "brown", "tan", "beige",
];

const SYNONYM_GROUPS: string[][] = [
  ["airpods", "earbuds", "earphones", "earphone", "headphones", "headset", "tws", "earpod", "earpods"],
  ["iphone", "phone", "smartphone", "mobile", "android", "cellphone"],
  ["laptop", "macbook", "notebook", "thinkpad", "ultrabook", "computer"],
  ["bag", "backpack", "rucksack", "knapsack", "schoolbag", "haversack"],
  ["wallet", "purse", "billfold", "cardholder", "pouch"],
  ["keys", "keychain", "bike key", "room key", "car key"],
  ["card", "id card", "college id", "hall ticket", "admit card", "metro card", "atm"],
  ["watch", "smartwatch", "wrist watch", "smart band", "fitness band"],
  ["calculator", "scientific calculator", "casio calculator"],
  ["bottle", "water bottle", "flask", "thermos", "sipper"],
  ["charger", "adapter", "power bank", "charging cable", "cable"],
];

/**
 * Expands text tokens with semantic synonyms.
 */
function expandWithSynonyms(text: string): string[] {
  const norm = normalizeText(text);
  const words = norm.split(/\s+/).filter(Boolean);
  const expanded = new Set(words);

  for (const word of words) {
    for (const group of SYNONYM_GROUPS) {
      if (group.some((syn) => syn.includes(word) || word.includes(syn))) {
        for (const syn of group) {
          expanded.add(syn);
        }
      }
    }
  }

  return Array.from(expanded);
}

/**
 * Extracts recognized colors mentioned in text.
 */
function extractColors(text: string): string[] {
  const norm = ` ${normalizeText(text)} `;
  return COMMON_COLORS.filter((color) => norm.includes(` ${color} `));
}

/**
 * Computes semantic text and metadata similarity.
 */
export function computeTextMetadataSimilarity(
  lost: ReportLike,
  found: ReportLike
): { score: number; percentage: number; reasons: string[] } {
  const reasons: string[] = [];
  let categoryScore = 0;
  let brandScore = 0;
  let colorScore = 0;
  let textSemanticScore = 0;

  // 1. Category Matching
  const catLost = (lost.category || "").trim().toLowerCase();
  const catFound = (found.category || "").trim().toLowerCase();

  if (catLost && catFound) {
    if (catLost === catFound) {
      categoryScore = 1.0;
      reasons.push(`📁 Category: Same category (${lost.category})`);
    } else {
      // Related categories or other
      if (catLost === "other" || catFound === "other") {
        categoryScore = 0.5;
      } else {
        categoryScore = 0.1; // incompatible categories
      }
    }
  } else {
    categoryScore = 0.5;
  }

  // 2. Brand & Model Matching
  const brandLost = normalizeText(lost.brand || "");
  const brandFound = normalizeText(found.brand || "");
  const modelLost = normalizeText(lost.model || "");
  const modelFound = normalizeText(found.model || "");

  if (brandLost && brandFound) {
    if (brandLost === brandFound) {
      brandScore = 1.0;
      reasons.push(`🏷️ Exact Brand Match: "${lost.brand}"`);
    } else {
      const brandJaro = jaroWinklerSimilarity(brandLost, brandFound);
      if (brandJaro >= 0.8) {
        brandScore = brandJaro;
        reasons.push(`🏷️ Similar Brand: "${lost.brand}" ~ "${found.brand}"`);
      }
    }
  }

  if (modelLost && modelFound) {
    if (modelLost === modelFound || modelLost.includes(modelFound) || modelFound.includes(modelLost)) {
      brandScore = Math.min(1.0, brandScore + 0.3);
      reasons.push(`⚙️ Model Match: "${lost.model}"`);
    }
  }

  // 3. Color Matching
  const lostColors = [
    ...extractColors(lost.color || ""),
    ...extractColors(lost.title || ""),
    ...extractColors(lost.description || ""),
  ];
  const foundColors = [
    ...extractColors(found.color || ""),
    ...extractColors(found.title || ""),
    ...extractColors(found.description || ""),
  ];

  const matchedColors = lostColors.filter((c) => foundColors.includes(c));
  if (matchedColors.length > 0) {
    colorScore = 1.0;
    const uniqueMatches = Array.from(new Set(matchedColors));
    reasons.push(`🎨 Color Match: ${uniqueMatches.join(", ")}`);
  } else if (lost.color && found.color) {
    const jaro = jaroWinklerSimilarity(normalizeText(lost.color), normalizeText(found.color));
    if (jaro >= 0.75) {
      colorScore = jaro;
      reasons.push(`🎨 Close Color: ${lost.color} ~ ${found.color}`);
    }
  }

  // 4. Semantic Title & Description Matching (Cosine + Soft-Tokens)
  const fullTextLost = `${lost.title || ""} ${lost.brand || ""} ${lost.model || ""} ${lost.description || ""}`;
  const fullTextFound = `${found.title || ""} ${found.brand || ""} ${found.model || ""} ${found.description || ""}`;

  const expandedLost = expandWithSynonyms(fullTextLost).join(" ");
  const expandedFound = expandWithSynonyms(fullTextFound).join(" ");

  const textSim = computeAnswerSimilarity(expandedLost, expandedFound);
  textSemanticScore = textSim.score;

  if (textSemanticScore >= 0.4) {
    reasons.push(`📝 Description & Keyword Similarity: ${Math.round(textSemanticScore * 100)}%`);
  }

  // 5. Location Proximity (Bonus)
  if (lost.location && found.location) {
    const locLost = normalizeText(lost.location);
    const locFound = normalizeText(found.location);
    if (locLost && locFound) {
      if (locLost === locFound || locLost.includes(locFound) || locFound.includes(locLost)) {
        reasons.push(`📍 Matching Location: "${lost.location}"`);
        categoryScore = Math.min(1.0, categoryScore + 0.1);
      }
    }
  }

  // Weighted Combination for Text & Metadata
  let score =
    0.30 * categoryScore +
    0.25 * brandScore +
    0.15 * colorScore +
    0.30 * textSemanticScore;

  // Category mismatch penalty
  if (categoryScore < 0.3) {
    score *= 0.4;
  }

  score = Math.max(0, Math.min(1, score));
  return { score, percentage: Math.round(score * 100), reasons };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Multi-Modal Fusion Matcher (Vision + NLP Language)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compares a lost report against a found report using Multi-Modal AI (Vision + Language).
 */
export function computeReportSimilarity(
  lost: ReportLike,
  found: ReportLike
): MatchResult {
  const allReasons: string[] = [];

  // 1. Text & Metadata Similarity
  const textRes = computeTextMetadataSimilarity(lost, found);
  allReasons.push(...textRes.reasons);

  // 2. Visual Similarity
  let visualScore: number | null = null;
  let visualPercentage: number | null = null;

  // Retrieve or compute visual features for lost report
  let vfLost = lost.visualFeatures;
  if (!vfLost && lost.imageUrl && lost.imageUrl.startsWith("data:image/")) {
    try {
      vfLost = extractFallbackVisualFeatures(lost.imageUrl);
    } catch {
      vfLost = null;
    }
  }

  // Retrieve or compute visual features for found report
  let vfFound = found.visualFeatures;
  if (!vfFound && found.imageUrl && found.imageUrl.startsWith("data:image/")) {
    try {
      vfFound = extractFallbackVisualFeatures(found.imageUrl);
    } catch {
      vfFound = null;
    }
  }

  if (vfLost && vfFound) {
    const vRes = computeVisualSimilarity(vfLost, vfFound);
    visualScore = vRes.score;
    visualPercentage = vRes.percentage;

    if (vRes.percentage >= 60) {
      allReasons.unshift(`📸 High Visual Match: ${vRes.percentage}% appearance similarity`);
    } else if (vRes.percentage >= 40) {
      allReasons.push(`📸 Visual Similarity: ${vRes.percentage}% (${vRes.details})`);
    }
  }

  // 3. Fused Multi-Modal Score
  let totalScore = 0;
  if (visualScore !== null) {
    // 50% Vision + 50% Text
    totalScore = 0.50 * visualScore + 0.50 * textRes.score;
    // Boost if visual is exceptionally high and category matches
    if (visualScore >= 0.85 && textRes.score >= 0.5) {
      totalScore = Math.min(1.0, totalScore + 0.08);
    }
  } else {
    // 100% Text & Metadata if one or both images are absent
    totalScore = textRes.score;
  }

  const percentage = Math.round(totalScore * 100);

  let matchLevel: "HIGH" | "MODERATE" | "LOW" = "LOW";
  if (percentage >= 70) {
    matchLevel = "HIGH";
  } else if (percentage >= 45) {
    matchLevel = "MODERATE";
  }

  return {
    report: found,
    totalScore,
    percentage,
    visualScore,
    visualPercentage,
    textScore: textRes.score,
    textPercentage: textRes.percentage,
    matchLevel,
    reasons: allReasons,
  };
}

/**
 * Finds and ranks matching found reports for a given lost report.
 */
export function rankMatchingFoundReports(
  lostReport: ReportLike,
  foundReports: ReportLike[],
  minScore = 0.35
): MatchResult[] {
  const matches: MatchResult[] = [];

  for (const found of foundReports) {
    // Exclude returned items
    if (found.status === "RETURNED") continue;

    const res = computeReportSimilarity(lostReport, found);
    if (res.totalScore >= minScore) {
      matches.push(res);
    }
  }

  // Sort by highest similarity score first
  matches.sort((a, b) => b.totalScore - a.totalScore);
  return matches;
}

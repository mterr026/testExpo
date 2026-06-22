import type { TransactionCategory } from "./categoryVocabulary";
import { scoreTransactionCategories } from "./transactionCategoryRules";
import {
  normalizeTransactionDescription,
  type NormalizedTransactionText,
} from "./transactionNormalizer";

export type UserCategoryAdjustment = {
  category: TransactionCategory;
  normalizedMerchant: string;
  weightAdjustment: number;
};

export type TransactionCategoryPrediction = {
  category: TransactionCategory;
  confidence: number;
  matchedTokens: string[];
  normalized: NormalizedTransactionText;
  reasons: string[];
  scores: Partial<Record<TransactionCategory, number>>;
};

export function classifyTransactionDescription(
  description: string,
  adjustments: UserCategoryAdjustment[] = []
): TransactionCategoryPrediction {
  const normalized = normalizeTransactionDescription(description);
  const scores = scoreTransactionCategories(normalized);
  const adjustedScores = scores.map((score) => {
    const adjustment = adjustments
      .filter((candidate) =>
        normalized.normalizedDescription.includes(candidate.normalizedMerchant)
      )
      .filter((candidate) => candidate.category === score.category)
      .reduce((sum, candidate) => sum + candidate.weightAdjustment, 0);

    return {
      ...score,
      score: score.score + adjustment,
    };
  });
  const [best, secondBest] = adjustedScores.sort(
    (first, second) => second.score - first.score
  );
  const category = best && best.score > 0 ? best.category : "unknown";
  const bestScore = best?.score ?? 0;
  const secondScore = secondBest?.score ?? 0;
  const confidence = calculateConfidence(bestScore, secondScore);
  const scoreRecord: Partial<Record<TransactionCategory, number>> = {};

  for (const score of adjustedScores) {
    if (score.score > 0) {
      scoreRecord[score.category] = score.score;
    }
  }

  return {
    category,
    confidence,
    matchedTokens: best?.matchedTokens ?? [],
    normalized,
    reasons: buildCategoryReasons({
      category,
      confidence,
      matchedTokens: best?.matchedTokens ?? [],
      normalizedDescription: normalized.normalizedDescription,
    }),
    scores: scoreRecord,
  };
}

function calculateConfidence(bestScore: number, secondScore: number) {
  if (bestScore <= 0) {
    return 0;
  }

  const margin = Math.max(0, bestScore - secondScore);
  const rawConfidence = Math.min(100, Math.round(bestScore + margin * 0.35));

  return Math.max(25, rawConfidence);
}

function buildCategoryReasons({
  category,
  confidence,
  matchedTokens,
  normalizedDescription,
}: {
  category: TransactionCategory;
  confidence: number;
  matchedTokens: string[];
  normalizedDescription: string;
}) {
  if (category === "unknown") {
    return [`No category vocabulary matched "${normalizedDescription}"`];
  }

  return [
    `Category ${category} scored ${confidence}`,
    matchedTokens.length > 0
      ? `Matched ${matchedTokens.join(", ")}`
      : "Matched user-trained category adjustment",
  ];
}

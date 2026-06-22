import {
  categoryVocabulary,
  type CategoryKeyword,
  type TransactionCategory,
} from "./categoryVocabulary";
import type { NormalizedTransactionText } from "./transactionNormalizer";

export type CategoryScore = {
  category: TransactionCategory;
  matchedTokens: string[];
  score: number;
};

export function scoreTransactionCategories(
  normalized: NormalizedTransactionText
): CategoryScore[] {
  const scores = Object.entries(categoryVocabulary).map(
    ([category, keywords]) => {
      const matchedTokens: string[] = [];
      let score = 0;

      for (const keyword of keywords) {
        const keywordScore = scoreKeyword(keyword, normalized);

        if (keywordScore > 0) {
          score += keywordScore;
          matchedTokens.push(keyword.token);
        }
      }

      return {
        category: category as TransactionCategory,
        matchedTokens,
        score,
      };
    }
  );

  return scores.sort((first, second) => second.score - first.score);
}

function scoreKeyword(
  keyword: CategoryKeyword,
  normalized: NormalizedTransactionText
) {
  const candidates = [keyword.token, ...(keyword.aliases ?? [])];
  let bestScore = 0;

  for (const candidate of candidates) {
    const candidateScore = scoreCandidate(candidate, keyword.weight, normalized);
    bestScore = Math.max(bestScore, candidateScore);
  }

  return bestScore;
}

function scoreCandidate(
  rawCandidate: string,
  weight: number,
  normalized: NormalizedTransactionText
) {
  const candidate = rawCandidate.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
  const candidateTokens = candidate.split(" ").filter(Boolean);

  if (candidate.length === 0) {
    return 0;
  }

  if (normalized.normalizedDescription.includes(candidate)) {
    return weight;
  }

  const compactCandidate = candidateTokens.join("");

  if (compactCandidate.length >= 3 && normalized.compact.includes(compactCandidate)) {
    return Math.round(weight * 0.95);
  }

  const tokenMatches = candidateTokens.filter((candidateToken) =>
    normalized.tokens.some((token) => tokensMatch(token, candidateToken))
  ).length;

  if (candidateTokens.length === 1 && tokenMatches === 1) {
    return Math.round(weight * 0.9);
  }

  if (candidateTokens.length > 1 && tokenMatches === candidateTokens.length) {
    return Math.round(weight * 0.8);
  }

  return 0;
}

function tokensMatch(token: string, candidateToken: string) {
  if (token === candidateToken) {
    return true;
  }

  if (token.length < 5 || candidateToken.length < 5) {
    return false;
  }

  return levenshteinDistance(token, candidateToken) <= 1;
}

function levenshteinDistance(first: string, second: string) {
  const matrix = Array.from({ length: first.length + 1 }, (_, row) =>
    Array.from({ length: second.length + 1 }, (_, column) =>
      row === 0 ? column : column === 0 ? row : 0
    )
  );

  for (let row = 1; row <= first.length; row += 1) {
    for (let column = 1; column <= second.length; column += 1) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      );
    }
  }

  return matrix[first.length][second.length];
}

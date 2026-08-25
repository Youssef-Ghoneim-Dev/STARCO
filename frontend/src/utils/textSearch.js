export const normalizeArabicSearchText = (value = "") => String(value)
  .normalize("NFKD")
  .replace(/[\u064B-\u065F\u0670]/g, "")
  .replace(/[أإآٱ]/g, "ا")
  .replace(/ؤ/g, "و")
  .replace(/[ئىي]/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/ـ/g, "")
  .toLocaleLowerCase("ar-EG")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim()
  .replace(/\s+/g, " ");

const levenshteinDistance = (first, second) => {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    const current = [firstIndex];
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      current[secondIndex] = Math.min(
        current[secondIndex - 1] + 1,
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[second.length];
};

const similarity = (first, second) => {
  const longest = Math.max(first.length, second.length);
  return longest === 0 ? 1 : 1 - (levenshteinDistance(first, second) / longest);
};

export const matchesSearchText = (candidate, query, threshold = 0.7) => {
  const normalizedCandidate = normalizeArabicSearchText(candidate);
  const normalizedQuery = normalizeArabicSearchText(query);
  if (!normalizedQuery) return true;
  if (!normalizedCandidate) return false;
  if (normalizedCandidate.includes(normalizedQuery)) return true;
  if (normalizedQuery.length < 3) return false;

  const queryWords = normalizedQuery.split(" ");
  const candidateWords = normalizedCandidate.split(" ");
  const windowSize = queryWords.length;
  const candidates = [normalizedCandidate, ...candidateWords];

  if (windowSize > 1) {
    for (let index = 0; index <= candidateWords.length - windowSize; index += 1) {
      candidates.push(candidateWords.slice(index, index + windowSize).join(" "));
    }
  }

  return candidates.some((text) => similarity(text, normalizedQuery) >= threshold);
};

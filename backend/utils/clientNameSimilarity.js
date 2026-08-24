const normalizeName = (value) => String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("ar-EG")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

const similarityPercent = (leftValue, rightValue) => {
    const left = normalizeName(leftValue);
    const right = normalizeName(rightValue);
    if (!left || !right) return 0;
    if (left === right) return 100;

    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        const current = [leftIndex];
        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
            current[rightIndex] = Math.min(current[rightIndex - 1] + 1, previous[rightIndex] + 1, previous[rightIndex - 1] + substitutionCost);
        }
        for (let index = 0; index < current.length; index += 1) previous[index] = current[index];
    }
    return Math.round((1 - previous[right.length] / Math.max(left.length, right.length)) * 100);
};

const compareClientNames = (inputName, existingName) => {
    const normalizedInput = normalizeName(inputName);
    const normalizedExisting = normalizeName(existingName);
    const inputParts = normalizedInput.split(" ").filter(Boolean);
    const existingParts = normalizedExisting.split(" ").filter(Boolean);
    const fullNameSimilarity = similarityPercent(normalizedInput, normalizedExisting);
    const sameFirstName = Boolean(inputParts[0] && inputParts[0] === existingParts[0]);
    const remainingNameSimilarity = sameFirstName ? similarityPercent(inputParts.slice(1).join(" "), existingParts.slice(1).join(" ")) : 0;
    const matchedByFullName = fullNameSimilarity >= 75;
    const matchedByFirstAndRemainingName = sameFirstName && remainingNameSimilarity >= 50;

    return {
        isCandidate: matchedByFullName || matchedByFirstAndRemainingName,
        similarity: fullNameSimilarity,
        fullNameSimilarity,
        sameFirstName,
        remainingNameSimilarity,
        matchReason: matchedByFullName ? "fullName" : matchedByFirstAndRemainingName ? "firstAndRemainingName" : null
    };
};

module.exports = { normalizeName, similarityPercent, compareClientNames };

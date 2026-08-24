const test = require("node:test");
const assert = require("node:assert/strict");
const { compareClientNames } = require("./clientNameSimilarity");

test("marks names with at least 75% full-name similarity as candidates", () => {
    const result = compareClientNames("شركة النور", "شركة النورر");
    assert.equal(result.isCandidate, true);
    assert.equal(result.matchReason, "fullName");
});

test("marks matching first names with at least 50% remaining similarity as candidates", () => {
    const result = compareClientNames("Youssef Mohammed", "Youssef Mohamad");
    assert.equal(result.sameFirstName, true);
    assert.equal(result.remainingNameSimilarity >= 50, true);
    assert.equal(result.isCandidate, true);
});

test("does not mark unrelated names as candidates", () => {
    assert.equal(compareClientNames("شركة النور", "محمود الفتح").isCandidate, false);
});

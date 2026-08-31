const positiveQuantity = (value) => Math.max(1, Math.floor(Number(value) || 1));

const requestedPieceCount = (branch) => positiveQuantity(branch?.quantity) * (branch?.direction === "two" ? 2 : 1);

const branchWithoutFixedLength = (branch) => {
  const clean = { ...branch };
  delete clean.length;
  return clean;
};

const convertedGroup = (branches, template, direction) => {
  const totalPieces = branches.reduce((sum, branch) => sum + requestedPieceCount(branch), 0);
  const cleanTemplate = branchWithoutFixedLength(template);
  if (direction === "one") return [{ ...cleanTemplate, direction: "one", quantity: totalPieces }];

  const pairedQuantity = Math.floor(totalPieces / 2);
  const remainder = totalPieces % 2;
  const converted = pairedQuantity > 0
    ? [{ ...cleanTemplate, direction: "two", quantity: pairedQuantity }]
    : [];
  if (remainder) converted.push({ ...cleanTemplate, branchId: `branch-${Date.now()}-${Math.random().toString(36).slice(2)}`, direction: "one", quantity: 1 });
  return converted;
};

export const convertCopperBranchDirection = (branches = [], index, direction) => {
  const selected = branches[index];
  if (!selected || !["one", "two"].includes(direction)) return branches;
  const groupId = selected.branchGroupId;
  const indexes = branches.reduce((result, branch, currentIndex) => {
    if (currentIndex === index || (groupId && branch.branchGroupId === groupId)) result.push(currentIndex);
    return result;
  }, []);
  const firstIndex = indexes[0];
  const indexSet = new Set(indexes);
  const group = indexes.map((currentIndex) => branches[currentIndex]);
  const replacement = convertedGroup(group, selected, direction);
  return branches.flatMap((branch, currentIndex) => currentIndex === firstIndex ? replacement : indexSet.has(currentIndex) ? [] : [branch]);
};

export const convertAllCopperBranchDirections = (branches = [], direction) => {
  let converted = [...branches];
  const groupKeys = [];
  branches.forEach((branch, index) => {
    const key = branch.branchGroupId ? `group:${branch.branchGroupId}` : `branch:${branch.branchId || index}`;
    if (!groupKeys.includes(key)) groupKeys.push(key);
  });
  groupKeys.forEach((key) => {
    const index = converted.findIndex((branch, currentIndex) => (branch.branchGroupId ? `group:${branch.branchGroupId}` : `branch:${branch.branchId || currentIndex}`) === key);
    if (index >= 0) converted = convertCopperBranchDirection(converted, index, direction);
  });
  return converted;
};

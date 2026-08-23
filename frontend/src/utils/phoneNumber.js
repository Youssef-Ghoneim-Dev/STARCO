const EGYPTIAN_MOBILE_PREFIXES = ["10", "11", "12", "15"];

export function normalizeEgyptianPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("0020")) digits = digits.slice(2);
  if (digits.startsWith("20")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);

  if (digits.length !== 10 || !EGYPTIAN_MOBILE_PREFIXES.includes(digits.slice(0, 2))) {
    return null;
  }

  return `20${digits}`;
}


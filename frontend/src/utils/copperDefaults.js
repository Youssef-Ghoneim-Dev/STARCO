export const DEFAULT_COPPER_CONFIGURATION = {
  pricePerKg: 0,
  catalog: [
    ["2000", 2000, 120, 10], ["1500", 1500, 100, 10], ["1200", 1200, 80, 10],
    ["800", 800, 50, 10], ["630", 630, 40, 10], ["400", 400, 30, 10],
    ["300", 300, 20, 10], ["250", 250, 30, 5], ["160", 160, 20, 5],
    ["125", 125, 15, 5], ["100", 100, 15, 5], ["80", 80, 10, 5], ["63", 63, 10, 5],
  ].map(([key, amperage, width, thickness]) => ({
    key,
    amperage,
    name: `${amperage} أمبير`,
    width,
    thickness,
  })),
  barCounts: [1, 3],
  branchLengths: { oneDirection: 150, twoDirections: 300 },
  weightFormula: "Length * BarCount * Width * Thickness / 1000000",
  priceFormula: "Weight * PricePerKg",
};

export const resolveCopperConfiguration = (configuration) => (
  configuration?.catalog?.length
    ? {
        ...DEFAULT_COPPER_CONFIGURATION,
        ...configuration,
        branchLengths: {
          ...DEFAULT_COPPER_CONFIGURATION.branchLengths,
          ...(configuration.branchLengths || {}),
        },
      }
    : DEFAULT_COPPER_CONFIGURATION
);

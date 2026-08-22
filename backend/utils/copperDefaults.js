const copperConfigurationDefaults = {
    pricePerKg: 0,
    catalog: [
        { key: "2000", name: "2000 أمبير", amperage: 2000, width: 120, thickness: 10 },
        { key: "1500", name: "1500 أمبير", amperage: 1500, width: 100, thickness: 10 },
        { key: "1200", name: "1200 أمبير", amperage: 1200, width: 80, thickness: 10 },
        { key: "800", name: "800 أمبير", amperage: 800, width: 50, thickness: 10 },
        { key: "630", name: "630 أمبير", amperage: 630, width: 40, thickness: 10 },
        { key: "400", name: "400 أمبير", amperage: 400, width: 30, thickness: 10 },
        { key: "300", name: "300 أمبير", amperage: 300, width: 20, thickness: 10 },
        { key: "250", name: "250 أمبير", amperage: 250, width: 30, thickness: 5 },
        { key: "160", name: "160 أمبير", amperage: 160, width: 20, thickness: 5 },
        { key: "125", name: "125 أمبير", amperage: 125, width: 15, thickness: 5 },
        { key: "100", name: "100 أمبير", amperage: 100, width: 15, thickness: 5 },
        { key: "80", name: "80 أمبير", amperage: 80, width: 10, thickness: 5 },
        { key: "63", name: "63 أمبير", amperage: 63, width: 10, thickness: 5 }
    ],
    barCounts: [1, 3],
    branchLengths: { oneDirection: 150, twoDirections: 300 },
    weightFormula: "Length * BarCount * Width * Thickness / 1000000"
};

const cloneCopperConfigurationDefaults = () => JSON.parse(JSON.stringify(copperConfigurationDefaults));

module.exports = { copperConfigurationDefaults, cloneCopperConfigurationDefaults };

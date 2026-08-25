import { resolveCopperConfiguration } from "./copperDefaults";

const DENSITY = 7.85;
const MELION = 1000000;

export const THICKNESS_OPTIONS = ["0.6", "0.7", "0.8", "0.9", "1", "1.25", "1.5", "1.8", "2", "2.5", "3"];
export const PROFIT_PERCENTAGES = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
export const sortThicknesses = (thicknesses = []) => (
    [...thicknesses].sort((first, second) => Number(first) - Number(second))
);

const parseNumber = (value) => {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : 0;
};

const getEffectiveThickness = (partName, selectedThickness) => {
    const thickness = parseNumber(selectedThickness);
    if (/باب/i.test(partName) || /door/i.test(partName)) {
        return thickness > 0 && thickness < 1 ? 1 : thickness;
    }
    return thickness;
};

// part: { name, width, height, quantity }
export const getPartWeight = (part, selectedThickness) => {
    const width = parseNumber(part.width);
    const height = parseNumber(part.height);
    const quantity = parseNumber(part.quantity) || 1;
    const thickness = getEffectiveThickness(part.name, selectedThickness);

    if (!width || !height || !thickness) {
        return 0;
    }

    // includes the 1.15 factor used in the legacy code
    return ((width * height * quantity * thickness * DENSITY) / MELION) * 1.15;
};

export const getPanelWeightForThickness = (panel, thickness) => {
    return panel.parts.reduce((total, part) => total + getPartWeight(part, thickness), 0);
};

export const getPanelWeight = (panel) => {
    const thickness = panel.thickness?.[0] || 0;
    return getPanelWeightForThickness(panel, thickness);
};

const additiveKeys = [
    "manufacturing",
    "locks",
    "hinges",
    "transport",
    "screws",
    "stretch",
    "carton",
    "fiber",
    "rakam",
    "fuse",
];

const getTotalAdds = (panel) => {
    const prices = panel.prices || {};
    return additiveKeys.reduce((sum, key) => sum + parseNumber(prices[key]), 0);
};

const getEltamter = (panel) => {
    return panel.parts.reduce((sum, part) => {
        const area = (parseNumber(part.width) * parseNumber(part.height));
        const quantity = parseNumber(part.quantity) || 1;
        if (!area) return sum;

        return sum + (area * 2 * quantity) / MELION;
    }, 0);
};

const getCopperOption = (configuration, key) => (
    (configuration?.catalog || []).find((item) => item.key === key)
);

const evaluateCopperFormula = (formula, values, fallbackFormula) => {
    const source = String(formula || fallbackFormula).trim();
    const words = source.match(/[A-Za-z]+/g) || [];
    if (words.some((word) => !Object.hasOwn(values, word))) return 0;
    const expression = source.replace(/[A-Za-z]+/g, (word) => String(values[word]));
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) return 0;
    try {
        const result = Function(`"use strict"; return (${expression});`)();
        return Number.isFinite(result) ? result : 0;
    } catch { return 0; }
};

const getCopperWeight = (option, length, barCount, formula) => {
    if (!option) return 0;
    return evaluateCopperFormula(formula, {
        Length: parseNumber(length),
        BarCount: parseNumber(barCount),
        Width: parseNumber(option.width),
        Thickness: parseNumber(option.thickness),
    }, "Length * BarCount * Width * Thickness / 1000000");
};

export const getCopperCalculation = (panel, configuration = {}) => {
    const resolvedConfiguration = resolveCopperConfiguration(configuration);
    const copper = panel?.copper || {};
    const isEnabled = Boolean(copper.enabled || panel?.hasCopper);
    if (!isEnabled) {
        return { weight: 0, barsPrice: 0, earthPrice: 0, groundPrice: 0, total: parseNumber(panel?.prices?.copper) };
    }

    const main = copper.main || {};
    const mainWeight = getCopperWeight(getCopperOption(resolvedConfiguration, main.optionKey), main.length, main.barCount, resolvedConfiguration.weightFormula);
    const branchWeights = (copper.branches || []).reduce((sum, branch) => {
        const length = branch.length ?? (branch.direction === "two"
            ? resolvedConfiguration.branchLengths?.twoDirections
            : resolvedConfiguration.branchLengths?.oneDirection);
        const quantity = Math.max(1, parseNumber(branch.quantity) || 1);
        return sum + (getCopperWeight(getCopperOption(resolvedConfiguration, branch.optionKey), length, branch.barCount, resolvedConfiguration.weightFormula) * quantity);
    }, 0);
    const weight = mainWeight + branchWeights;
    const pricePerKg = parseNumber(copper.pricePerKg ?? resolvedConfiguration.pricePerKg);
    const barsPrice = evaluateCopperFormula(
        resolvedConfiguration.priceFormula,
        { Weight: weight, PricePerKg: pricePerKg },
        "Weight * PricePerKg",
    );
    const earthPrice = parseNumber(copper.earthPrice);
    const groundPrice = parseNumber(copper.groundPrice);
    return { weight, barsPrice, earthPrice, groundPrice, total: barsPrice + earthPrice + groundPrice };
};

export const getPanelFinalPrice = (panel, projectPrices = {}, profitPercentage = 0, copperConfiguration) => {
    const panelPrices = panel.prices || {};
    const sheetPricePerKg = parseNumber(projectPrices.sheetPrice);
    const paintPrice = parseNumber(projectPrices.paintPrice);
    const additionalPrice = parseNumber(panelPrices.additionalPrice);

    const totalWeight = getPanelWeight(panel);
    const price = totalWeight * sheetPricePerKg;
    const copper = getCopperCalculation(panel, copperConfiguration);
    const totaladds = getTotalAdds(panel) + copper.total;

    const eltamter = getEltamter(panel);
    const eldehanprice = (eltamter * paintPrice) / 3;

    let result = 0;
    if (totalWeight !== 0 || copper.total !== 0) {
        result = price + totaladds + eldehanprice;
    }

    const profitMultiplier = 1 + (parseNumber(profitPercentage) / 100);
    const withProfit = Math.round(((result * profitMultiplier) + additionalPrice) / 10) * 10;

    return {
        base: result,
        withProfit,
        totalWeight,
        copper,
    };
};

const getPriceForThickness = (panel, projectPrices, thickness, profitPercentage = 0, copperConfiguration) => {
    return getPanelFinalPrice(
        { ...panel, thickness: [thickness] },
        projectPrices,
        profitPercentage,
        copperConfiguration,
    );
};

export const getPriceTableRows = (panel, projectPrices, profitPercentage = 0, copperConfiguration) => {
    const selectedThicknesses = sortThicknesses(panel.thickness || []);

    if (selectedThicknesses.length === 0) {
        return [{ thickness: "---", price: null, weight: null }];
    }

    return selectedThicknesses.map((thickness) => {
        const info = getPriceForThickness(
            panel,
            projectPrices,
            thickness,
            profitPercentage,
            copperConfiguration,
        );

        return {
            thickness,
            price: info.withProfit,
            weight: info.totalWeight,
        };
    });
};

export const getAllPriceRows = (panel, projectPrices, copperConfiguration) => {
    const getPricesForPercentage = (profitPercentage) => {
        return THICKNESS_OPTIONS.map((thickness) => (
            getPriceForThickness(panel, projectPrices, thickness, profitPercentage, copperConfiguration).withProfit
        ));
    };

    return [
        { label: "السعر", values: getPricesForPercentage(0) },
        ...PROFIT_PERCENTAGES.map((percentage) => ({
            label: `${percentage}%`,
            values: getPricesForPercentage(percentage),
        })),
    ];
};

export const getSheetPriceAndWeightRows = (panel, projectPrices = {}) => {
    const sheetPricePerKg = parseNumber(projectPrices.sheetPrice);

    return THICKNESS_OPTIONS.map((thickness) => {
        const weight = getPanelWeightForThickness(panel, thickness);

        return {
            thickness,
            sheetPrice: weight * sheetPricePerKg,
            weight,
        };
    });
};

export const getProjectTotals = (project, projectPrices = {}, copperConfiguration) => {
    const totalWeight = project.panels.reduce((sum, panel) => sum + getPanelWeight(panel), 0);
    const totalPrice = project.panels.reduce((sum, panel) => sum + (getPanelFinalPrice(panel, projectPrices, project.client?.profitPercentage, copperConfiguration)?.withProfit || 0), 0);
    return {
        totalWeight,
        totalPrice,
    };
};

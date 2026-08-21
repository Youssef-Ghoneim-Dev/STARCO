const controlPrices = {
    manufacturing: 250,
    locks: 120,
    hinges: 80,
    transport: 30,
    screws: 25,
    stretch: 15
};

const part = (key, name, lengthFormula, widthFormula, quantity = 1, manualDimensions = false) => ({
    key, name, lengthFormula, widthFormula, quantity, manualDimensions
});

const panelTypeDefaults = [
    {
        key: "control", name: "كنترول", whatsappType: "كنترول", prices: { ...controlPrices, carton: 0 },
        parts: [
            part("box", "العلبة", "Length", "Width + (Depth + 50 * 2)"),
            part("side", "الجنب", "Width + 40", "Depth + 70", 2),
            part("mirror", "المراية", "Length - 40", "Width - 40"),
            part("seat", "الجلسة", "Length - 40", "Width - 40"),
            part("door", "باب 1", "Length", "Width")
        ]
    },
    {
        key: "waterproof", name: "واتربروف", whatsappType: "واتربروف", prices: { manufacturing: 300, locks: 50, hinges: 75, transport: 0, screws: 25, stretch: 15, carton: 0 },
        parts: [
            part("box", "العلبة", "Length + (Depth + 50 * 2)", "Width + (Depth + 50 * 2)"),
            part("door", "باب 1", "Length", "Width"),
            part("seat", "الجلسة", "Length - 50", "Width - 50"),
            part("mirror", "المراية", "Length - 50", "Width - 50")
        ]
    },
    {
        key: "standard", name: "نمطي", whatsappType: "نمطي", prices: { manufacturing: 130, locks: 5, hinges: 3, transport: 30, screws: 0, stretch: 10, carton: 10 },
        parts: [
            part("box", "العلبة", "Length", "Width + (Depth + 10 * 2)"),
            part("side", "الجنب", "Width + 40", "Depth + 45", 2),
            part("internal", "الداخلي", "Length - 80", "Width + 20"),
            part("external", "الخارجي", "Length + 30", "Width + 30"),
            part("greda", "الجريدة", "Width - 50", "65", 2)
        ]
    },
    {
        key: "booths", name: "بواطات", whatsappType: "نمطي", prices: { manufacturing: 100, locks: 5, hinges: 3, transport: 25, screws: 0, stretch: 10, carton: 0 },
        parts: [
            part("box", "العلبة", "Length", "Width + (Depth + 10 * 2)"),
            part("side", "الجنب", "Width + 40", "Depth + 45", 2),
            part("external", "الخارجي", "Length + 30", "Width + 30"),
            part("greda", "الجريدة", "Width + 50", "35", 2),
            part("lock", "الكالون", "Length - 50", "35", 2),
            part("internal", "الداخلي", "Length - 50", "35", 2)
        ]
    },
    {
        key: "ont", name: "O.N.T", whatsappType: "نمطي", prices: { manufacturing: 150, locks: 10, hinges: 3, transport: 35, screws: 0, stretch: 0, carton: 20 },
        parts: [
            part("box", "العلبة", "Length", "Width + (Depth + 15 * 2)"),
            part("side", "الجنب", "Width + 40", "Depth + 45", 2),
            part("external", "الخارجي", "Length + 50", "Width + 50"),
            part("door", "باب 1", "Length", "Width"),
            part("shared", "المشترك", "", "", 1, true),
            part("seat", "الجلسة", "", "", 1, true)
        ]
    }
];

module.exports = { controlPrices, panelTypeDefaults };

const defaultProject = () => {

    return {
        client: {
            id: null,
            name: "",
            type: "person",
            profitPercentage: 0
        },

        status: "pending",
        prices: {
            sheetPrice: 0,
            paintPrice: 0,
        },
        panels: [
            {
                panelName: "لوحة 1",

                parts: [
                    {
                        name: "العلبة",
                        quantity: 1
                    },
                    {
                        name: "الجنب",
                        quantity: 2
                    },
                    {
                        name: "المراية",
                        quantity: 1
                    },
                    {
                        name: "الجلسة",
                        quantity: 1
                    },
                    {
                        name: "الجريدة",
                        quantity: 2
                    },
                    {
                        name: "باب 1",
                        quantity: 1
                    },
                    {
                        name: "باب 2",
                        quantity: 1
                    }
                ],

                prices: {
                    manufacturing: 0,
                    locks: 0,
                    hinges: 0,
                    transport: 0,
                    screws: 0,
                    stretch: 0,
                    copper: 0,
                    fiber: 0,
                    rakam: 0,
                    fuse: 0,
                    additionalPrice: 0
                },

                thickness: []
            }
        ],
    };

};

module.exports = defaultProject;
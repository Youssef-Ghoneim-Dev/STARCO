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
            sheetPrice: null,
            paintPrice: null,
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
                    manufacturing: null,
                    locks: null,
                    hinges: null,
                    transport: null,
                    screws: null,
                    stretch: null,
                    copper: null,
                    fiber: null,
                    rakam: null,
                    fuse: null,
                    additionalPrice: null
                },

                thickness: []
            }
        ],
    };

};

module.exports = defaultProject;
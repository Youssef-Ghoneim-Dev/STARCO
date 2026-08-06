const defaultProject = () => {

    return {
        client: {
            id: null,
            name: "",
            type: "person",
            profitPercentage: 0
        },

        status: "pending",

        panels: [
            {
                panelName: "لوحة 1",

                parts: [
                    {
                        name: "العلبة",
                        width: 0,
                        height: 0,
                        quantity: 1
                    },
                    {
                        name: "الجنب",
                        width: 0,
                        height: 0,
                        quantity: 2
                    },
                    {
                        name: "المراية",
                        width: 0,
                        height: 0,
                        quantity: 1
                    },
                    {
                        name: "الجلسة",
                        width: 0,
                        height: 0,
                        quantity: 1
                    },
                    {
                        name: "الجريدة",
                        width: 0,
                        height: 0,
                        quantity: 2
                    },
                    {
                        name: "باب1",
                        width: 0,
                        height: 0,
                        quantity: 1
                    },
                    {
                        name: "باب2",
                        width: 0,
                        height: 0,
                        quantity: 1
                    }
                ],

                prices: {
                    sheetPrice: 0,
                    paintPrice: 0,
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

        isDeleted: false
    };

};

module.exports = defaultProject;
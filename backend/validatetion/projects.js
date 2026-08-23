const joi = require("joi");

module.exports = (req, res, next) => {
    // Project autosave intentionally accepts unfinished fields. Final
    // validation belongs to the explicit completion action in the UI.
    const validate = joi.object({
        client: joi.object({
            id: joi.any().optional(),
            name: joi.string().allow("").max(100).optional(),
            type: joi.string().valid("person", "company").optional(),
            profitPercentage: joi.number().min(0).max(100).optional()
        }).optional(),

        status: joi.string()
            .valid("pending", "inProgress", "editing", "completed")
            .optional(),
        prices: joi.object({
            sheetPrice: joi.number().allow(null).optional(),
            paintPrice: joi.number().allow(null).optional(),
        }).optional(),
        panels: joi.array().items(

            joi.object({

                panelId: joi.string().optional(),

                panelName: joi.string().allow("").max(100).optional(),

                panelType: joi.string().allow("").optional(),

                panelTypeKey: joi.string().allow("").optional(),

                dimensions: joi.object({
                    length: joi.number().allow(null).optional(),
                    width: joi.number().allow(null).optional(),
                    depth: joi.number().allow(null).optional()
                }).optional(),

                hasCopper: joi.boolean().allow(null).optional(),

                additionalDetails: joi.string().allow("").optional(),

                controlInstallation: joi.string().allow("").optional(),

                copperDetails: joi.object({
                    switches: joi.string().allow("").optional(),
                    main: joi.string().allow("").optional(),
                    branches: joi.string().allow("").optional()
                }).optional(),

                copper: joi.object({
                    enabled: joi.boolean().optional(),
                    pricePerKg: joi.number().min(0).allow(null).optional(),
                    earthPrice: joi.number().min(0).allow(null).optional(),
                    groundPrice: joi.number().min(0).allow(null).optional(),
                    main: joi.object({
                        optionKey: joi.string().allow("").optional(),
                        length: joi.number().min(0).allow(null).optional(),
                        barCount: joi.number().min(1).optional()
                    }).optional(),
                    branches: joi.array().items(joi.object({
                        branchId: joi.string().optional(),
                        optionKey: joi.string().allow("").optional(),
                        direction: joi.string().valid("one", "two").optional(),
                        length: joi.number().min(0).allow(null).optional(),
                        barCount: joi.number().min(1).optional()
                    })).optional()
                }).optional(),

                parts: joi.array().items(

                    joi.object({

                        name: joi.string().required(),

                    width: joi.number().positive().optional(),

                    height: joi.number().positive().optional(),

                        quantity: joi.number().integer().min(1).default(1)

                    })

                ).optional(),

                prices: joi.object({

                    manufacturing: joi.number().optional(),

                    locks: joi.number().optional(),

                    hinges: joi.number().optional(),

                    transport: joi.number().optional(),

                    screws: joi.number().optional(),

                    stretch: joi.number().optional(),

                    carton: joi.number().optional(),

                    copper: joi.number().optional(),

                    fiber: joi.number().optional(),

                    rakam: joi.number().optional(),

                    fuse: joi.number().optional(),

                    additionalPrice: joi.number()

                }).optional(),

                thickness: joi.array()
                    .items(joi.number())
                    .optional()

            })

        ).optional()

    }).validate(req.body);

    if (validate.error) {
        return res.status(400).json({
            status: "error",
            message: validate.error.details
        });
    }

    next();
};

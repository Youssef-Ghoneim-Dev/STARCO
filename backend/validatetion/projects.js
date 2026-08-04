const joi = require("joi");

module.exports = (req, res, next) => {

    const validate = joi.object({

        client: joi.object({
            id: joi.string(),
            name: joi.string().min(2).max(100).required(),
            type: joi.string().valid("person", "company").required(),
            profitPercentage: joi.number().min(10).max(70).required()
        }).required(),

        status: joi.string()
            .valid("pending", "inProgress", "completed")
            .optional(),

        panels: joi.array().items(

            joi.object({

                panelName: joi.string().min(1).max(100).required(),

                parts: joi.array().items(

                    joi.object({

                        name: joi.string().required(),

                        width: joi.number().positive().required(),

                        height: joi.number().positive().required(),

                        quantity: joi.number().integer().min(1).default(1)

                    })

                ).required(),

                prices: joi.object({

                    sheetPrice: joi.number().required(),

                    paintPrice: joi.number().required(),

                    manufacturing: joi.number().required(),

                    locks: joi.number().required(),

                    hinges: joi.number().required(),

                    transport: joi.number().required(),

                    screws: joi.number().required(),

                    stretch: joi.number().required(),

                    copper: joi.number().required(),

                    fiber: joi.number().required(),

                    rakam: joi.number().required(),

                    fuse: joi.number().required(),

                    additionalPrice: joi.number()

                }).required(),

                thickness: joi.array()
                    .items(joi.number())
                    .min(1)
                    .required()

            })

        ).min(1).required()

    }).validate(req.body);

    if (validate.error) {
        return res.status(400).json({
            status: "error",
            msg: validate.error.details
        });
    }

    next();
};
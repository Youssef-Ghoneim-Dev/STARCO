const joi = require("joi");

module.exports = (req, res, next) => {
    const validation = joi.object({
        name: joi.string().trim().min(2).max(120).required(),
        type: joi.string().valid("person", "company").required(),
        profitPercentage: joi.number().min(10).max(70).required()
    }).validate(req.body);

    if (validation.error) {
        return res.status(400).json({
            status: "error",
            message: validation.error.details[0].message
        });
    }

    next();
};

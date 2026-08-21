const joi = require("joi");

module.exports = (req, res, next) => {
    const validation = joi.object({
        name: joi.string().trim().min(3).max(80).required(),
        email: joi.string().trim().email().max(120).required(),
        phoneNumber: joi.string()
            .trim()
            .pattern(/^\+?[1-9]\d{7,14}$/)
            .allow("", null)
            .optional()
            .messages({ "string.pattern.base": "phoneNumber must be a valid international phone number" })
    }).validate(req.body, { abortEarly: true });

    if (validation.error) {
        return res.status(400).json({
            status: "error",
            message: validation.error.details[0].message
        });
    }

    next();
};

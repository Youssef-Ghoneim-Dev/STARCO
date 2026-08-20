const joi = require("joi")

module.exports = (req, res, next) => {
    const user = { ...req.body };
    const validate = joi.object(
        {
            name: joi.string().min(3).max(20).pattern(/^[a-zA-Z\ ]{3,20}$/).required(),
            email: joi.string().email().min(8).max(30).required(),
            password: joi.string().min(8).max(15).pattern(/^[a-zA-Z0-9#*$&@]{8,15}$/),
            phoneNumber: joi.string()
                .pattern(/^\+?[1-9]\d{7,14}$/)
                .optional()
                .messages({ "string.pattern.base": "phoneNumber must be a valid international phone number" }),
            role: joi.string().valid(
                "OwnerManager",
                "Engineer",
                "Marketer",
                "MarketingManager",
                "ProductionManager"
            )
        }
    ).validate(user);

    if (validate.error) {
        return res.status(400).json({
            status: "error",
            message: validate.error.details,
        })
    }
    next()
}

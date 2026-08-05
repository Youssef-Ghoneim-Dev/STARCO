const joi = require("joi")

module.exports = (req, res, next) => {
    const user = { ...req.body };
    const validate = joi.object(
        {
            name: joi.string().min(3).max(20).pattern(/^[a-zA-Z\ ]{3,20}$/).required(),
            email: joi.string().email().min(8).max(30).required(),
            password: joi.string().min(8).max(15).pattern(/^[a-zA-Z0-9#*$&@]{8,15}$/),
            role: joi.string().valid("OwnerManager", "Employee", "Marketer", "MarketingManager")
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
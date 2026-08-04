const joi = require('joi');

const loginValidation = (req, res, next) => {
    const user = { ...req.body };

    const schema = joi.object({
        email: joi.string().email().required(),
        password: joi.string().min(8).max(15).pattern(/^[a-zA-Z0-9#*$&@]{8,15}$/)
    }).validate(user);

    if (schema.error) {
        return res.status(400).send({
            error: schema.error.details[0].message
        });
    }
    next();
};

module.exports = loginValidation
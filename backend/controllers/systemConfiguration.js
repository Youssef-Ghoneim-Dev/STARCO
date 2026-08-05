const models = require("../models/systemConfiguration");

const get = async (req, res, next) => {
    try {
        if (
            req.decodedToken.role !== "OwnerManager" &&
            req.decodedToken.role !== "Employee"
        ) {
            return res.status(403).json({
                status: "error",
                message: "You are not allowed"
            });
        }
        const config = await models.get();

        return res.status(200).json(config);

    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        if (
            req.decodedToken.role !== "OwnerManager" &&
            req.decodedToken.role !== "Employee"
        ) {
            return res.status(403).json({
                status: "error",
                message: "You are not allowed"
            });
        }
        const config = await models.update(req.body);

        return res.status(200).json({
            status: "ok",
            config
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    get,
    update
};
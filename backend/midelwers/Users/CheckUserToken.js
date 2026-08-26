const models = require("../../models/users");

module.exports = async (req, res, next) => {
    try {
        const decodedToken = req.decodedToken;

        if (!decodedToken || !decodedToken.id) {
            return res.status(403).json({
                status: "error",
                message: "user ID is required in Token",
            });
        }

        const currentUser = await models.select_one({ _id: decodedToken.id });

        if (currentUser === null) {
            return res.status(404).json({
                status: "error",
                message: "User not found",
            });
        }

        if (currentUser.isDeleted) {
            return res.status(403).json({
                status: "error",
                message: "Your account has been deleted",
            });
        }

        if (currentUser.whatsappOptInRequired === true && !currentUser.whatsappOptInVerifiedAt) {
            return res.status(403).json({
                status: "whatsappPending",
                message: "WhatsApp verification is required. Send a message from your registered number.",
            });
        }

        if (!currentUser.approved) {
            return res.status(403).json({
                status: "error",
                message: "Waiting for manager approval",
            });
        }

        req.user = currentUser;
        next();
    } catch (error) {
        next(error);
    }
};

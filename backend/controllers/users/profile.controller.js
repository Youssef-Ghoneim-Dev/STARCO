const models = require("../../models/users")
const { normalizePhoneNumber } = require("../../utils/phoneNumber")

const whatsappActivationUrl = () => {
    const businessPhone = String(process.env.WHATSAPP_BUSINESS_NUMBER || "").replace(/\D/g, "");
    if (!businessPhone) return null;
    return `https://wa.me/${businessPhone}?text=${encodeURIComponent("تأكيد حساب STARCO")}`;
};
const UpdateProfile = async (req, res, next) => {
    try {
        const userId = req.decodedToken.id
        const user = { id: userId, ...req.body };
        const targetUser = await models.select_one({ _id: userId })
        if (targetUser.isDeleted) {
            return res.status(409).json({
                status: "error",
                message: "User is already restored"
            });
        }
        if (
            user.name === targetUser.name &&
            user.email === targetUser.email &&
            user.phoneNumber === targetUser.phoneNumber
        ) {
            return res.status(400).json({
                status: "error",
                message: "No changes detected."
            });
        }
        const isDuplicted = await models.select_one({
            email: user.email,
            _id: { $ne: user.id }
        })
        if (isDuplicted !== null) {
            return res.status(409).json({
                status: "error",
                message: `Duplicted email ${user.email}`,
            })
        }
        const queryResult = await models.update(user);
        if (queryResult === null) {
            return res.status(404).json({
                status: "error",
                message: `user id ${user.id} not found`,
            })
        }
        if (
            targetUser.whatsappOptInRequired === true &&
            normalizePhoneNumber(user.phoneNumber) !== normalizePhoneNumber(targetUser.phoneNumber)
        ) {
            await models.resetWhatsappOptIn(user.id);
        }
        return res.status(200).json({
            status: "ok",
            message: "user update",
        })
    } catch (error) {
        next(error)
    }
}

const DeleteProfile = async (req, res, next) => {
    try {
        const userId = req.decodedToken.id
        const result = await models.deleteOne(userId);
        if (result === null) {
            return res.status(409).json({
                status: "error",
                message: `this id not found ${userId}`,
            })
        }
        return res.status(200).json({
            status: "ok",
            message: "user is deleted",
        })
    } catch (error) {
        next(error)
    }
}
const getProfile = async (req, res, next) => {
    try {

        const user = await models.select_one({
            _id: req.decodedToken.id
        });

        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "Account no longer exists"
            });
        }
        await models.ensureTheme(user._id);
        const theme = ["light", "dark"].includes(user.theme) ? user.theme : "light";
        return res.status(200).json({
            id: user._id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            theme,
            approved: user.approved,
            whatsappOptInRequired: user.whatsappOptInRequired === true,
            whatsappOptInVerifiedAt: user.whatsappOptInVerifiedAt || null,
            whatsappActivationUrl: whatsappActivationUrl(),
            isDeleted: user.isDeleted
        });

    } catch (error) {
        next(error);
    }
};
const UpdateTheme = async (req, res, next) => {
    try {
        const theme = req.body?.theme;
        if (!["light", "dark"].includes(theme)) {
            return res.status(400).json({ status: "error", message: "Invalid theme." });
        }
        const user = await models.updateTheme(req.decodedToken.id, theme);
        if (!user) {
            return res.status(404).json({ status: "error", message: "Account no longer exists" });
        }
        return res.status(200).json({ status: "ok", theme });
    } catch (error) {
        next(error);
    }
};
module.exports = {
    UpdateProfile,
    UpdateTheme,
    DeleteProfile,
    getProfile
}

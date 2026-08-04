const models = require("../../models/users")
const UpdateProfile = async (req, res, next) => {
    try {
        const userId = req.decodedToken.id
        const user = { id: userId, ...req.body };
        const targetUser = await models.select_one({ _id: userId })
        if (targetUser.isDeleted) {
            return res.status(409).json({
                status: "error",
                msg: "User is already restored"
            });
        }
        if (
            user.name === targetUser.name &&
            user.email === targetUser.email
        ) {
            return res.status(400).json({
                status: "error",
                msg: "No changes detected."
            });
        }
        const isDuplicted = await models.select_one({
            email: user.email,
            _id: { $ne: user.id }
        })
        if (isDuplicted !== null) {
            return res.status(409).json({
                status: "error",
                msg: `Duplicted email ${user.email}`,
            })
        }
        const queryResult = await models.update(user);
        if (queryResult === null) {
            return res.status(404).json({
                status: "error",
                msg: `user id ${user.id} not found`,
            })
        }
        return res.status(200).json({
            status: "ok",
            msg: "user update",
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
                msg: `this id not found ${userId}`,
            })
        }
        return res.status(200).json({
            status: "ok",
            msg: "user is deleted",
        })
    } catch (error) {
        next(error)
    }
}

module.exports = {
    UpdateProfile,
    DeleteProfile
}
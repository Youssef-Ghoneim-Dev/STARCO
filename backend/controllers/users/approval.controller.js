const models = require("../../models/users")
const getPendingUsers = async (req, res, next) => {
    try {
        const user = req.user;
        if (user.role === "OwnerManager") {
            const users = await models.selectall({
                approved: false,
                isDeleted: false
            })
            return res.status(200).json(users)
        } else if (user.role === "MarketingManager") {
            const users = await models.selectall({
                approved: false,
                role: "Marketer",
                isDeleted: false,
            })
            return res.status(200).json(users)
        } else {
            return res.status(403).json({
                status: "error",
                message: `you are not admin`,
            })
        }

    } catch (error) {
        next(error)
    }
}

const approveUser = async (req, res, next) => {
    try {
        const manager = req.user
        const userId = req.params.id;
        const targetUser = await models.select_one({ _id: userId })
        if (targetUser.approved) {
            return res.status(409).json({
                status: "error",
                message: "User is already approved"
            });
        }
        if (manager.role === "OwnerManager") {
            const result = await models.approve(userId);
            if (result === null) {
                return res.status(409).json({
                    status: "error",
                    message: `this id not found ${userId}`,
                })
            }
            return res.status(200).json({
                status: "ok",
                message: "user approved",
            })
        } else if (manager.role === "MarketingManager" && targetUser.role === "Marketer") {
            const result = await models.approve(userId);
            if (result === null) {
                return res.status(409).json({
                    status: "error",
                    message: `this id not found ${userId}`,
                })
            }
            return res.status(200).json({
                status: "ok",
                message: "user approved",
            })
        } else {
            return res.status(403).json({
                status: "error",
                message: `you are not admin`,
            })
        }
    } catch (error) {
        next(error)
    }
}
const deletePendingUser = async (req, res, next) => {
    try {
        const manager = req.user
        const userId = req.params.id;
        const targetUser = await models.select_one({ _id: userId })
        if (targetUser === null) {
            return res.status(409).json({
                status: "error",
                message: `this id not found ${userId}`,
            })
        }
        if (manager.role === "OwnerManager") {
            const deletedUser = await models.deleteForever({
                _id: userId,
                approved: false
            });
            if (deletedUser === null) {
                return res.status(409).json({
                    status: "error",
                    message: `User is already approved.`,
                })
            }
            return res.status(200).json({
                status: "ok",
                message: "user is deleted",
            })
        } else if (manager.role === "MarketingManager" && targetUser.role === "Marketer") {
            const deletedUser = await models.deleteForever({
                _id: userId,
                approved: false
            });
            if (deletedUser === null) {
                return res.status(409).json({
                    status: "error",
                    message: `User is already approved.`,
                })
            }
            return res.status(200).json({
                status: "ok",
                message: "user is deleted",
            })
        } else {
            return res.status(403).json({
                status: "error",
                message: `you are not admin`,
            })
        }
    } catch (error) {
        next(error)
    }
}
module.exports = {
    getPendingUsers,
    approveUser,
    deletePendingUser
}

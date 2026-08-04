const models = require("../../models/users")

const getUsers = async (req, res, next) => {
    try {
        const user = req.decodedToken;
        if (user.role === "OwnerManager") {
            const users = await models.selectall({
                isDeleted: false
            })
            return res.status(200).json(users)
        } else if (user.role === "MarketingManager") {
            const users = await models.selectall({
                isDeleted: false,
                role: "Marketer"
            })
            return res.status(200).json(users)
        } else {
            return res.status(403).json({
                status: "error",
                msg: `you are not admin`,
            })
        }

    } catch (error) {
        next(error)
    }
}

const getDeletedUsers = async (req, res, next) => {
    try {
        const user = req.decodedToken;
        if (user.role === "OwnerManager") {
            const users = await models.selectall({
                isDeleted: true
            })
            return res.status(200).json(users)
        } else if (user.role === "MarketingManager") {
            const users = await models.selectall({
                role: "Marketer",
                isDeleted: true
            })
            return res.status(200).json(users)
        } else {
            return res.status(403).json({
                status: "error",
                msg: `you are not admin`,
            })
        }

    } catch (error) {
        next(error)
    }
}

const updateUser = async (req, res, next) => {
    try {
        const manager = req.decodedToken;
        const userId = req.params.id;
        const user = { id: userId, ...req.body };
        const targetUser = await models.select_one({ _id: userId })
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
        if (manager.role === "OwnerManager") {
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
        } else if (manager.role === "MarketingManager" && targetUser.role === "Marketer") {
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
        } else {
            return res.status(403).json({
                status: "error",
                msg: `you are not admin`,
            })
        }
    } catch (error) {
        next(error)
    }
}

const deleteUser = async (req, res, next) => {
    try {
        const manager = req.decodedToken
        const userId = req.params.id;
        const targetUser = await models.select_one({ _id: userId })
        if (targetUser.isDeleted) {
            return res.status(409).json({
                status: "error",
                msg: "User is already deleted"
            });
        }
        if (manager.role === "OwnerManager") {
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
        } else if (manager.role === "MarketingManager" && targetUser.role === "Marketer") {
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
        } else {
            return res.status(403).json({
                status: "error",
                msg: `you are not admin`,
            })
        }
    } catch (error) {
        next(error)
    }
}

const restoreUser = async (req, res, next) => {
    try {
        const manager = req.decodedToken
        const userId = req.params.id;
        const targetUser = await models.select_one({ _id: userId })
        if (!targetUser.isDeleted) {
            return res.status(409).json({
                status: "error",
                msg: "User is already restored"
            });
        }
        if (manager.role === "OwnerManager") {
            const result = await models.restore(userId);
            if (result === null) {
                return res.status(409).json({
                    status: "error",
                    msg: `this id not found ${userId}`,
                })
            }
            return res.status(200).json({
                status: "ok",
                msg: "user restored",
            })
        } else if (manager.role === "MarketingManager" && targetUser.role === "Marketer") {
            const result = await models.restore(userId);
            if (result === null) {
                return res.status(409).json({
                    status: "error",
                    msg: `this id not found ${userId}`,
                })
            }
            return res.status(200).json({
                status: "ok",
                msg: "user restored",
            })
        } else {
            return res.status(403).json({
                status: "error",
                msg: `you are not admin`,
            })
        }
    } catch (error) {
        next(error)
    }
}

module.exports = {
    getUsers,
    updateUser,
    deleteUser,
    restoreUser,
    getDeletedUsers
}
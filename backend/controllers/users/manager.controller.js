const models = require("../../models/users")

const managedRole = (manager) => manager.role === "MarketingManager"
    ? "Marketer"
    : manager.role === "ProductionManager"
        ? "Engineer"
        : null;

const canManageTarget = (manager, targetUser) => manager.role === "OwnerManager"
    || Boolean(targetUser && managedRole(manager) === targetUser.role);

const includeLinkedAccountCreators = async (userList) => {
    const creatorIds = [...new Set(userList.map((user) => String(user.accountCreatedBy || "")).filter(Boolean))];
    if (!creatorIds.length) return userList;
    const creators = await models.selectall({ _id: { $in: creatorIds } });
    const creatorMap = new Map(creators.map((creator) => [String(creator._id), {
        id: creator._id,
        name: creator.name,
        role: creator.role
    }]));
    return userList.map((user) => {
        const plainUser = typeof user.toObject === "function" ? user.toObject() : { ...user };
        return {
            ...plainUser,
            linkedAccountCreator: creatorMap.get(String(user.accountCreatedBy || "")) || null
        };
    });
};

const getUsers = async (req, res, next) => {
    try {
        const user = req.user;
        if (user.role === "OwnerManager") {
            const users = await models.selectall({
                isDeleted: false
            })
            return res.status(200).json(await includeLinkedAccountCreators(users))
        } else if (managedRole(user)) {
            const users = await models.selectall({
                isDeleted: false,
                role: managedRole(user)
            })
            return res.status(200).json(await includeLinkedAccountCreators(users))
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

const getDeletedUsers = async (req, res, next) => {
    try {
        const user = req.user;
        if (user.role === "OwnerManager") {
            const users = await models.selectall({
                isDeleted: true
            })
            return res.status(200).json(await includeLinkedAccountCreators(users))
        } else if (managedRole(user)) {
            const users = await models.selectall({
                role: managedRole(user),
                isDeleted: true,
                deletedBy: user._id
            })
            return res.status(200).json(await includeLinkedAccountCreators(users))
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

const updateUser = async (req, res, next) => {
    try {
        const manager = req.user;
        const userId = req.params.id;
        const user = { id: userId, ...req.body };
        const targetUser = await models.select_one({ _id: userId })
        if (!targetUser) return res.status(404).json({ status: "error", message: "User not found." });
        if (
            user.name === targetUser.name &&
            user.email === targetUser.email &&
            user.phoneNumber === targetUser.phoneNumber &&
            (!user.role || user.role === targetUser.role)
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
        if (manager.role === "OwnerManager") {
            const queryResult = await models.update(user, { allowRole: true });
            if (queryResult === null) {
                return res.status(404).json({
                    status: "error",
                    message: `user id ${user.id} not found`,
                })
            }
            return res.status(200).json({
                status: "ok",
                message: "user update",
            })
        } else if (canManageTarget(manager, targetUser)) {
            const queryResult = await models.update(user);
            if (queryResult === null) {
                return res.status(404).json({
                    status: "error",
                    message: `user id ${user.id} not found`,
                })
            }
            return res.status(200).json({
                status: "ok",
                message: "user update",
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

const deleteUser = async (req, res, next) => {
    try {
        const manager = req.user
        const userId = req.params.id;
        const targetUser = await models.select_one({ _id: userId })
        if (!targetUser) return res.status(404).json({ status: "error", message: "User not found." });
        if (targetUser.isDeleted) {
            return res.status(409).json({
                status: "error",
                message: "User is already deleted"
            });
        }
        if (manager.role === "OwnerManager") {
            const result = await models.deleteOne(userId, manager._id);
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
        } else if (canManageTarget(manager, targetUser)) {
            const result = await models.deleteOne(userId, manager._id);
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

const restoreUser = async (req, res, next) => {
    try {
        const manager = req.user
        const userId = req.params.id;
        const targetUser = await models.select_one({ _id: userId })
        if (!targetUser) return res.status(404).json({ status: "error", message: "User not found." });
        if (!targetUser.isDeleted) {
            return res.status(409).json({
                status: "error",
                message: "User is already restored"
            });
        }
        if (manager.role === "OwnerManager") {
            const result = await models.restore(userId);
            if (result === null) {
                return res.status(409).json({
                    status: "error",
                    message: `this id not found ${userId}`,
                })
            }
            return res.status(200).json({
                status: "ok",
                message: "user restored",
            })
        } else if (canManageTarget(manager, targetUser) && String(targetUser.deletedBy || "") === String(manager._id)) {
            const result = await models.restore(userId);
            if (result === null) {
                return res.status(409).json({
                    status: "error",
                    message: `this id not found ${userId}`,
                })
            }
            return res.status(200).json({
                status: "ok",
                message: "user restored",
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

const deleteUserForever = async (req, res, next) => {
    try {
        const manager = req.user;
        const userId = req.params.id;
        const targetUser = await models.select_one({ _id: userId, isDeleted: true });
        const ownsDeletion = targetUser && canManageTarget(manager, targetUser) && String(targetUser.deletedBy || "") === String(manager._id);
        if (manager.role !== "OwnerManager" && !ownsDeletion) return res.status(403).json({ status: "error", message: "you are not admin" });
        if (String(manager._id) === String(userId)) {
            return res.status(400).json({ status: "error", message: "You cannot permanently delete your own account." });
        }
        const result = await models.deleteForever({ _id: userId, isDeleted: true });
        if (result === null) {
            return res.status(404).json({ status: "error", message: "Deleted user not found." });
        }
        return res.status(200).json({ status: "ok", message: "user permanently deleted" });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getUsers,
    updateUser,
    deleteUser,
    restoreUser,
    deleteUserForever,
    getDeletedUsers
}

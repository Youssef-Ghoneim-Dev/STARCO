const models = require("../models/drafts");

const getDraft = async (req, res, next) => {
    try {

        const userId = req.decodedToken.id;

        const draft = await models.select_one({
            userId
        });

        if (draft === null) {
            return res.status(200).json({
                exists: false
            });
        }

        return res.status(200).json({
            exists: true,
            draft
        });

    } catch (error) {
        next(error);
    }
};

const saveDraft = async (req, res, next) => {
    try {
        const draft = {
            userId: req.decodedToken.id,
            editing: {
                userId: req.decodedToken.id,
                lastSeen: Date.now()
            },
            project: req.body
        };

        await models.save(draft);

        return res.status(200).json({
            status: "ok",
            msg: "draft saved"
        });

    } catch (error) {
        next(error);
    }
};

const deleteDraft = async (req, res, next) => {
    try {

        const userId = req.decodedToken.id;

        const result = await models.deleteOne(userId);

        if (result === null) {
            return res.status(404).json({
                status: "error",
                msg: "draft not found"
            });
        }

        return res.status(200).json({
            status: "ok",
            msg: "draft deleted"
        });

    } catch (error) {
        next(error);
    }
};

const heartbeat = async (req, res, next) => {
    try {

        const userId = req.decodedToken.id;

        const result = await models.heartbeat(userId);

        if (result === null) {
            return res.status(404).json({
                status: "error",
                msg: "draft not found"
            });
        }

        return res.status(200).json({
            status: "ok"
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDraft,
    saveDraft,
    deleteDraft,
    heartbeat
};
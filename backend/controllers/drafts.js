const models = require("../models/drafts");
const defaultProject = require("../utils/defaultProject");
const getDraft = async (req, res, next) => {
    try {

        const userId = req.decodedToken.id;

        const draft = await models.select_one({
            userId
        });

        if (draft === null) {

            const newDraft = {
                userId,

                editing: {
                    userId,
                    lastSeen: Date.now()
                },

                project: defaultProject()
            };

            const systemConfig = await require("../models/systemConfiguration").get();
            newDraft.project = newDraft.project.panels.map(panel => {
                panel.prices =  {
                    sheetPrice: systemConfig.sheetPrice,
                    paintPrice: systemConfig.paintPrice,
                    manufacturing: systemConfig.prices.manufacturing,
                    locks: systemConfig.prices.locks,
                    hinges: systemConfig.prices.hinges,
                    transport: systemConfig.prices.transport,
                    screws: systemConfig.prices.screws,
                    stretch: systemConfig.prices.stretch,
                }
                if (panelConfig) {
                    panel.prices = { ...panel.prices, ...panelConfig.prices };
                }
                return panel;
            });
            const savedDraft = await models.save(newDraft);

            return res.status(200).json({
                exists: true,
                draft: savedDraft
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
            message: "draft saved"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: error.message,
            stack: error.stack
        });

    }
};

const deleteDraft = async (req, res, next) => {
    try {

        const userId = req.decodedToken.id;

        const result = await models.deleteOne(userId);

        if (result === null) {
            return res.status(404).json({
                status: "error",
                message: "draft not found"
            });
        }

        return res.status(200).json({
            status: "ok",
            message: "draft deleted"
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
                message: "draft not found"
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
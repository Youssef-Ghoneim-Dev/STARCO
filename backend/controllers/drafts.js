const models = require("../models/drafts");
const defaultProject = require("../utils/defaultProject");

const hasDraftContent = (draft) => {
    const project = draft?.project;

    if (!project) return false;
    if (project.client?.name?.trim()) return true;

    return (project.panels || []).some((panel) =>
        (panel.thickness || []).length > 0 ||
        (panel.parts || []).some((part) => part.width || part.height)
    );
};

const getDraftStatus = async (req, res, next) => {
    try {
        const draft = await models.select_one({ userId: req.decodedToken.id });

        return res.status(200).json({
            exists: hasDraftContent(draft)
        });
    } catch (error) {
        next(error);
    }
};
const getDraft = async (req, res, next) => {
    try {

        const userId = req.decodedToken.id;

        const draft = await models.select_one({
            userId
        });

        if (draft === null) {
            const systemConfig =
                await require("../models/systemConfiguration").get();

            if (!systemConfig) {
                throw new Error("System configuration not found");
            }

            const newDraft = {
                userId,

                editing: {
                    userId,
                    lastSeen: Date.now()
                },

                prices: {
                    sheetPrice: systemConfig.sheetPrice,
                    paintPrice: systemConfig.paintPrice
                },

                project: defaultProject()
            };

            newDraft.project.panels = newDraft.project.panels.map((panel) => {
                panel.prices = {
                    ...panel.prices,
                    manufacturing: systemConfig.prices.manufacturing,
                    locks: systemConfig.prices.locks,
                    hinges: systemConfig.prices.hinges,
                    transport: systemConfig.prices.transport,
                    screws: systemConfig.prices.screws,
                    stretch: systemConfig.prices.stretch
                };

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
            prices: req.body.prices,
            project: req.body.project
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
    getDraftStatus,
    getDraft,
    saveDraft,
    deleteDraft,
    heartbeat
};

const models = require("../models/clients")
const { compareClientNames } = require("../utils/clientNameSimilarity");

const canManageClients = (req) =>
    ["OwnerManager", "Engineer", "MarketingManager", "ProductionManager"].includes(req.user?.role);
const canSearchClients = (req) =>
    canManageClients(req) || req.user?.role === "Marketer";

const rejectUnauthorized = (res) => res.status(403).json({
    status: "error",
    message: "لا تملك صلاحية إدارة العملاء."
});

const search = async (req, res, next) => {
    try {
        if (!canSearchClients(req)) return rejectUnauthorized(res);
        const searchText = req.query.name;
        const clients = await models.search(searchText)
        if (clients.length === 0) {
            return res.status(200).json(
                {
                    "exists": false
                }
            )
        }
        return res.status(200).json(
            {
                "exists": true,
                "clients": clients
            }
        )
    } catch (error) {
        next(error)
    }
}

const findSimilar = async (req, res, next) => {
    try {
        if (!canSearchClients(req)) return rejectUnauthorized(res);

        const name = String(req.query.name || "").trim();
        if (name.length < 2) return res.status(200).json({ candidates: [] });

        const clients = await models.select_for_name_review();
        const candidates = clients
            .map((client) => ({
                ...client.toObject(),
                ...compareClientNames(name, client.name)
            }))
            .filter((client) => client.isCandidate)
            .sort((left, right) => right.similarity - left.similarity);

        return res.status(200).json({ candidates });
    } catch (error) {
        next(error);
    }
};

const selectAll = async (req, res, next) => {
    try {
        if (!canManageClients(req)) return rejectUnauthorized(res);

        const clients = await models.select_all();

        return res.status(200).json({
            exists: clients.length > 0,
            clients
        });

    } catch (error) {
        next(error);
    }
};
const selectOne = async (req, res, next) => {

    try {
        if (!canManageClients(req)) return rejectUnauthorized(res);

        const client = await models.select_one({
            _id: req.params.id
        });

        if (!client) {

            return res.status(404).json({
                exists: false
            });

        }

        return res.status(200).json({
            exists: true,
            client
        });

    } catch (error) {
        next(error);
    }

};

const addOne = async (req, res, next) => {

    try {
        if (!canManageClients(req)) return rejectUnauthorized(res);

        const client = await models.add_one(req.body);

        return res.status(201).json({
            status: "ok",
            client
        });

    } catch (error) {
        next(error);
    }

};

const update = async (req, res, next) => {

    try {
        if (!canManageClients(req)) return rejectUnauthorized(res);

        await models.update({

            id: req.params.id,

            ...req.body

        });

        return res.status(200).json({

            status: "ok"

        });

    } catch (error) {

        next(error);

    }

};

const deleteOne = async (req, res, next) => {

    try {
        if (!canManageClients(req)) return rejectUnauthorized(res);

        const result = await models.delete_one(req.params.id);

        if (!result) {

            return res.status(404).json({
                exists: false
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
    search,
    findSimilar,
    selectAll,
    selectOne,
    addOne,
    update,
    deleteOne
};

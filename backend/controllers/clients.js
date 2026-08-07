const models = require("../models/clients")

const search = async (req, res, next) => {
    try {
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

const selectAll = async (req, res, next) => {
    try {

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
    selectAll,
    selectOne,
    addOne,
    update,
    deleteOne
};
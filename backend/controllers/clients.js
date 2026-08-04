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

module.exports = {
    search
}
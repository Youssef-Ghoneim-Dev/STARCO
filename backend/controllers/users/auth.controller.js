const models = require("../../models/users")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const register = async (req, res, next) => {
    try {
        const user = { ...req.body };
        const queryResult = await models.select_one({
            email: user.email
        });
        if (queryResult != null) {
            return res.status(409).json({
                status: "error",
                msg: `email ${user.email} is added before`,
            })
        };
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(user.password, salt)
        user.password = hashedPassword
        await models.add_one(user);
        return res.status(201).json({
            status: "ok",
            msg: "user added",
        })
    } catch (error) {
        next(error)
    }
}

const login = async (req, res, next) => {
    try {
        const user = { ...req.body }
        const queryResult = await models.select_one({ email: user.email })
        if (queryResult === null) {
            return res.status(404).json({
                status: "Not found",
                message: `Email:${user.email} is Not found`
            })
        }
        if (queryResult.isDeleted) {
            return res.status(403).json({
                status: "error",
                message: "Your account has been deleted"
            });
        }
        if (!queryResult.approved) {
            return res.status(403).json({
                status: "error",
                message: "Waiting for manager approval"
            });
        }
        const ismatch = bcrypt.compareSync(user.password, queryResult.password)
        if (ismatch) {
            const token = jwt.sign({
                id: queryResult._id,
                name: queryResult.name,
                email: queryResult.email,
                role: queryResult.role
            }, process.env.TOKEN_KEY)
            res.header("Access-Control-Expose-Headers", "*")
            res.header("x-auth-token", token)
            return res.status(200).json({
                status: "ok",
                message: `login`,
            })
        }
        return res.status(401).json({
            status: "error",
            message: "invaild pass"
        })
    } catch (error) {
        next(error)
    }
};


module.exports = {
    register,
    login
}
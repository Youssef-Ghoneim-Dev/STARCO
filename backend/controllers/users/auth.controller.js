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
                message: `email ${user.email} is added before`,
            })
        };
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(user.password, salt)
        user.password = hashedPassword
        await models.add_one(user);
        return res.status(201).json({
            status: "ok",
            message: "Account created successfully",
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
                status: "error",
                message: `Email:${user.email} is Not found`
            })
        }
        if (queryResult.isDeleted) {
            return res.status(403).json({
                status: "error",
                message: "Your account has been deleted"
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
            if (!queryResult.approved) {
                return res.status(200).json({
                    status: "pending",
                    message: "Waiting for manager approval",
                    token,
                    user: {
                        id: queryResult._id,
                        name: queryResult.name,
                        email: queryResult.email,
                        role: queryResult.role
                    }
                });
            }
            return res.status(200).json({
                status: "ok",
                message: "Login Successfully",
                token,
                approved: queryResult.approved,
                user: {
                    id: queryResult._id,
                    name: queryResult.name,
                    email: queryResult.email,
                    role: queryResult.role
                }
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
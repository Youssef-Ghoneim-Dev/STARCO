const jwt = require("jsonwebtoken");
module.exports = (req, res, next) => {
    if (req.headers.authorization) {
        const auth_token = req.headers.authorization.split(" ")[1];
        const verify = jwt.verify(auth_token, process.env.TOKEN_KEY, (error, decodedToken) => {
            if (error) {
                return res.status(401).json({
                    status: "error",
                    msg: `authorization error ${error}`
                })
            }
            else {
                req.decodedToken = decodedToken
                next()
            }
        });
    } else {
        return res.status(403).json({
            status: "error",
            msg: "No token provieded"
        })
    }
}
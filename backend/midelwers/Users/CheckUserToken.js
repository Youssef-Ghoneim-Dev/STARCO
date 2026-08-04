module.exports = (req, res, next) => {
    const decodedToken = req.decodedToken
    if (decodedToken.id) {
        next()
    }else{
        return res.status(403).json({
            status: "error",
            msg: "user ID is required in Token",
        })
    }
}
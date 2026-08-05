module.exports = (req, res, next) => {
    const decodedToken = req.decodedToken
    if (decodedToken.id) {
        next()
    }else{
        return res.status(403).json({
            status: "error",
            message: "user ID is required in Token",
        })
    }
}
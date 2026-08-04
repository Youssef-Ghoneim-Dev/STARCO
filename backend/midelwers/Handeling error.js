module.exports = (error,req,res,next) => {
    return res.status(500).json({
            status: 'error',
            message: `internal server error ${error}`
    });
}
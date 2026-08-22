module.exports = (error,req,res,next) => {
    return res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || "Internal server error"
    });
}

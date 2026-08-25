module.exports = (error,req,res,next) => {
    if (error?.code === 11000) {
        const duplicatedField = Object.keys(error.keyPattern || error.keyValue || {})[0];
        const messages = {
            email: "This email is already registered.",
            phoneNumber: "This phone number is already registered.",
            googleId: "This Google account is already linked to another user."
        };
        return res.status(409).json({
            status: "error",
            message: messages[duplicatedField] || "This account already exists."
        });
    }
    return res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || "Internal server error"
    });
}

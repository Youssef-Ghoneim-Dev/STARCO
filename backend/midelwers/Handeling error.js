module.exports = (error, req, res, next) => {
    // MongoDB duplicate key
    if (error?.code === 11000) {
        const duplicatedField = Object.keys(
            error.keyPattern || error.keyValue || {}
        )[0];

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

    const statusCode = error?.statusCode || 500;

    // Expected user errors
    if (statusCode >= 400 && statusCode < 500) {
        return res.status(statusCode).json({
            status: "error",
            message: error.message || "Something went wrong."
        });
    }

    // Unexpected server / service errors
    console.error("Unhandled Server Error:", error);

    return res.status(500).json({
        status: "error",
        message: "حدث خطأ غير متوقع في الخادم.",
        errorDetails: {
            statusCode,
            method: req.method,
            endpoint: req.originalUrl,
            errorType: error?.name || "Error",
            errorCode: error?.code || null,
            backendMessage: error?.message || "Unknown server error"
        }
    });
};
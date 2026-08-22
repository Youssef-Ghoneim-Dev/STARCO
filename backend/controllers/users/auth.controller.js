const models = require("../../models/users")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { OAuth2Client } = require("google-auth-library");
const { normalizePhoneNumber } = require("../../utils/phoneNumber");

const requirePhoneNumber = (phoneNumber) => {
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    if (!/^\d{8,15}$/.test(normalizedPhoneNumber)) {
        throw Object.assign(new Error("Enter a valid phone number."), { statusCode: 400 });
    }
    return normalizedPhoneNumber;
};

const issueSession = (res, user) => {
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email, role: user.role }, process.env.TOKEN_KEY);
    res.header("Access-Control-Expose-Headers", "*");
    res.header("x-auth-token", token);
    const account = { id: user._id, name: user.name, email: user.email, phoneNumber: user.phoneNumber, role: user.role };
    return res.status(200).json(user.approved ? { status: "ok", message: "Login Successfully", token, approved: true, user: account } : { status: "pending", message: "Waiting for manager approval", token, user: account });
};

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
        user.phoneNumber = requirePhoneNumber(user.phoneNumber);
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
        if (!queryResult.password) {
            return res.status(400).json({ status: "error", message: "هذا الحساب يستخدم تسجيل الدخول عبر Google." });
        }
        const ismatch = bcrypt.compareSync(user.password, queryResult.password)
        if (ismatch) {
            return issueSession(res, queryResult);
        }
        return res.status(401).json({
            status: "error",
            message: "invaild pass"
        })
    } catch (error) {
        next(error)
    }
};

const googleLogin = async (req, res, next) => {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) return res.status(503).json({ status: "error", message: "Google sign-in is not configured yet." });
        const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: req.body.credential, audience: clientId });
        const profile = ticket.getPayload();
        if (!profile?.email_verified) return res.status(401).json({ status: "error", message: "تعذر التحقق من بريد Google." });
        let user = await models.select_one({ email: profile.email.toLowerCase() });
        if (!user) {
            const allowedRoles = ["Engineer", "Marketer"];
            if (!allowedRoles.includes(req.body.role) || !req.body.phoneNumber) {
                return res.status(400).json({ status: "error", message: "أكمل رقم الهاتف والدور أولًا لإنشاء الحساب عبر Google." });
            }
            const phoneNumber = requirePhoneNumber(req.body.phoneNumber);
            await models.add_one({ name: profile.name || profile.email.split("@")[0], email: profile.email.toLowerCase(), phoneNumber, role: req.body.role, password: null, googleId: profile.sub, authProvider: "google" });
            user = await models.select_one({ email: profile.email.toLowerCase() });
        }
        if (user.isDeleted) return res.status(403).json({ status: "error", message: "Your account has been deleted" });
        return issueSession(res, user);
    } catch (error) { next(error); }
};


module.exports = {
    register,
    login,
    googleLogin
}

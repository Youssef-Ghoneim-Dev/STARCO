const models = require("../../models/users")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { OAuth2Client } = require("google-auth-library");
const { normalizePhoneNumber } = require("../../utils/phoneNumber");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const findByEmail = (email) => {
    const normalizedEmail = normalizeEmail(email);
    return normalizedEmail ? models.select_one({ email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i") }) : null;
};

const verifyGoogleCredential = async (credential) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw Object.assign(new Error("Google sign-in is not configured yet."), { statusCode: 503 });
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
    const profile = ticket.getPayload();
    if (!profile?.email_verified) throw Object.assign(new Error("تعذر التحقق من بريد Google."), { statusCode: 401 });
    return profile;
};

const requirePhoneNumber = (phoneNumber) => {
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    if (!/^\d{8,15}$/.test(normalizedPhoneNumber)) {
        throw Object.assign(new Error("Enter a valid phone number."), { statusCode: 400 });
    }
    return normalizedPhoneNumber;
};

const whatsappActivationUrl = () => {
    const businessPhone = String(process.env.WHATSAPP_BUSINESS_NUMBER || "").replace(/\D/g, "");
    if (!businessPhone) return null;
    return `https://wa.me/${businessPhone}?text=${encodeURIComponent("تأكيد حساب STARCO")}`;
};

const issueSession = (res, user) => {
    const token = jwt.sign({ id: user._id }, process.env.TOKEN_KEY);
    res.header("Access-Control-Expose-Headers", "*");
    res.header("x-auth-token", token);
    const account = {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        whatsappOptInRequired: user.whatsappOptInRequired === true,
        whatsappOptInVerifiedAt: user.whatsappOptInVerifiedAt || null,
        whatsappActivationUrl: whatsappActivationUrl()
    };
    if (user.whatsappOptInRequired === true && !user.whatsappOptInVerifiedAt) {
        return res.status(200).json({
            status: "whatsappPending",
            message: "Send a WhatsApp message from your registered number to activate your account.",
            token,
            approved: user.approved,
            user: account
        });
    }
    return res.status(200).json(user.approved ? { status: "ok", message: "Login Successfully", token, approved: true, user: account } : { status: "pending", message: "Waiting for manager approval", token, user: account });
};

const register = async (req, res, next) => {
    try {
        const user = { ...req.body };
        user.email = normalizeEmail(user.email);
        const queryResult = await findByEmail(user.email);
        if (queryResult != null) {
            return res.status(409).json({
                status: "error",
                message: "هذا البريد مسجل بالفعل. انتقل إلى صفحة تسجيل الدخول.",
            })
        };
        user.phoneNumber = requirePhoneNumber(user.phoneNumber);
        user.whatsappOptInRequired = true;
        user.whatsappOptInVerifiedAt = null;
        user.whatsappOptInMessageId = null;
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
        const queryResult = await findByEmail(user.email)
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
        const profile = await verifyGoogleCredential(req.body.credential);
        const user = await models.select_one({ googleId: profile.sub });
        if (!user) {
            const emailAccount = await findByEmail(profile.email);
            if (emailAccount) return res.status(409).json({ status: "error", code: "EMAIL_USES_PASSWORD", message: "هذا البريد مسجل بكلمة مرور، استخدم البريد وكلمة المرور لتسجيل الدخول." });
            return res.status(404).json({ status: "error", code: "GOOGLE_ACCOUNT_NOT_REGISTERED", message: "لا يوجد حساب STARCO مسجل بهذا حساب Google. أنشئ حسابًا أولًا من صفحة التسجيل." });
        }
        if (user.isDeleted) return res.status(403).json({ status: "error", message: "Your account has been deleted" });
        return issueSession(res, user);
    } catch (error) { next(error); }
};

const googleRegister = async (req, res, next) => {
    try {
        const profile = await verifyGoogleCredential(req.body.credential);
        const email = normalizeEmail(profile.email);
        const emailAccount = await findByEmail(email);
        if (emailAccount) {
            return res.status(409).json({ status: "error", code: "EMAIL_ALREADY_REGISTERED", message: "هذا البريد مسجل بالفعل. انتقل إلى تسجيل الدخول واستخدم طريقة دخول الحساب الأصلية." });
        }
        const googleAccount = await models.select_one({ googleId: profile.sub });
        if (googleAccount) {
            return res.status(409).json({ status: "error", code: "GOOGLE_ACCOUNT_ALREADY_REGISTERED", message: "حساب Google هذا مرتبط بحساب موجود بالفعل." });
        }
        const allowedRoles = ["Engineer", "Marketer"];
        if (!allowedRoles.includes(req.body.role) || !req.body.phoneNumber) {
            return res.status(400).json({ status: "error", message: "أكمل رقم الهاتف والدور أولًا لإنشاء الحساب عبر Google." });
        }
        const phoneNumber = requirePhoneNumber(req.body.phoneNumber);
        const created = await models.add_one({
            name: profile.name || email.split("@")[0],
            email,
            phoneNumber,
            role: req.body.role,
            password: null,
            googleId: profile.sub,
            authProvider: "google",
            whatsappOptInRequired: true,
            whatsappOptInVerifiedAt: null,
            whatsappOptInMessageId: null
        });
        const user = await models.select_one({ _id: created._id });
        return issueSession(res, user);
    } catch (error) { next(error); }
};


module.exports = {
    register,
    login,
    googleLogin,
    googleRegister
}

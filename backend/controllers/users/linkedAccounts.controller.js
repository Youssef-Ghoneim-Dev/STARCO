const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const models = require("../../models/users");

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const safeAccount = (account, currentId) => ({
    id: account._id,
    name: account.name,
    email: account.email,
    role: account.role,
    approved: account.approved === true,
    current: String(account._id) === String(currentId),
});

const allowedRoles = {
    OwnerManager: ["Engineer", "Marketer", "MarketingManager", "ProductionManager"],
    MarketingManager: ["Marketer"],
    ProductionManager: ["Engineer", "Marketer"],
};

const getGroupId = (user) => user.accountGroupId || user._id;

const ensureCurrentGroup = async (user) => {
    const groupId = getGroupId(user);
    if (!user.accountGroupId) await models.setAccountGroup(user._id, groupId);
    return groupId;
};

const listLinkedAccounts = async (req, res, next) => {
    try {
        const groupId = getGroupId(req.user);
        const accounts = await models.selectall({
            isDeleted: false,
            $or: [{ _id: groupId }, { accountGroupId: groupId }],
        });
        return res.status(200).json(accounts.map((account) => safeAccount(account, req.user._id)));
    } catch (error) {
        next(error);
    }
};

const createLinkedAccount = async (req, res, next) => {
    try {
        const creator = req.user;
        const roles = allowedRoles[creator.role];
        if (!roles) return res.status(403).json({ status: "error", message: "هذا الحساب لا يملك صلاحية إضافة حسابات." });

        const name = String(req.body?.name || "").trim();
        const email = normalizeEmail(req.body?.email);
        const password = String(req.body?.password || "");
        const role = String(req.body?.role || "");

        if (!/^[a-zA-Z\u0600-\u06FF ]{3,50}$/.test(name)) {
            return res.status(400).json({ status: "error", message: "اكتب اسمًا صحيحًا من 3 إلى 50 حرفًا." });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ status: "error", message: "اكتب بريدًا إلكترونيًا صحيحًا." });
        }
        if (!/^[a-zA-Z0-9#*$&@]{8,15}$/.test(password)) {
            return res.status(400).json({ status: "error", message: "كلمة المرور من 8 إلى 15 حرفًا، وتقبل الحروف والأرقام و # * $ & @ فقط." });
        }
        if (!roles.includes(role)) {
            return res.status(403).json({ status: "error", message: "لا يمكنك إنشاء حساب بهذا الدور." });
        }
        if (await models.select_one({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })) {
            return res.status(409).json({ status: "error", message: "هذا البريد مسجل بالفعل." });
        }

        const groupId = await ensureCurrentGroup(creator);
        const requiresApproval = creator.role === "ProductionManager" && role === "Marketer";
        const created = await models.add_one({
            name,
            email,
            password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
            phoneNumber: null,
            authProvider: "password",
            role,
            approved: !requiresApproval,
            theme: creator.theme === "dark" ? "dark" : "light",
            accountGroupId: groupId,
            accountCreatedBy: creator._id,
            whatsappOptInRequired: false,
            whatsappOptInVerifiedAt: null,
            whatsappOptInMessageId: null,
            isDeleted: false,
        });
        const account = await models.select_one({ _id: created._id });
        return res.status(201).json({
            status: requiresApproval ? "pending" : "ok",
            message: requiresApproval ? "تم إنشاء الحساب وينتظر موافقة مدير التسويق أو مالك النظام." : "تم إنشاء الحساب وتفعيله.",
            account: safeAccount(account, creator._id),
        });
    } catch (error) {
        next(error);
    }
};

const switchLinkedAccount = async (req, res, next) => {
    try {
        const current = req.user;
        const target = await models.select_one({ _id: req.params.id, isDeleted: false });
        if (!target) return res.status(404).json({ status: "error", message: "الحساب غير موجود." });

        const groupId = getGroupId(current);
        const targetGroupId = getGroupId(target);
        if (String(groupId) !== String(targetGroupId)) {
            return res.status(403).json({ status: "error", message: "لا يمكنك فتح هذا الحساب." });
        }
        if (!target.approved) {
            return res.status(409).json({ status: "error", message: "الحساب ما زال بانتظار الموافقة." });
        }
        if (target.whatsappOptInRequired === true && !target.whatsappOptInVerifiedAt) {
            return res.status(409).json({ status: "error", message: "الحساب بانتظار تفعيل WhatsApp." });
        }

        const token = jwt.sign({ id: target._id }, process.env.TOKEN_KEY);
        res.header("Access-Control-Expose-Headers", "*");
        res.header("x-auth-token", token);
        return res.status(200).json({ status: "ok", token });
    } catch (error) {
        next(error);
    }
};

module.exports = { listLinkedAccounts, createLinkedAccount, switchLinkedAccount };

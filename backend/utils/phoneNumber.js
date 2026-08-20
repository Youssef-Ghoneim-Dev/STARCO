const normalizePhoneNumber = (phoneNumber) =>
    String(phoneNumber || "").replace(/\D/g, "");

module.exports = {
    normalizePhoneNumber
};

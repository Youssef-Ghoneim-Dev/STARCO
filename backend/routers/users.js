const usersrouter = require("express").Router();
const approval = require("../controllers/users/approval.controller.js")
const profile = require("../controllers/users/profile.controller")
const manger = require("../controllers/users/manager.controller")
const auth = require("../controllers/users/auth.controller")
const linkedAccounts = require("../controllers/users/linkedAccounts.controller")
const dashboardNotes = require("../controllers/users/dashboardNotes.controller")
const uservalidatetion = require("../validatetion/users")
const profileValidation = require("../validatetion/profile")
const loginvalidatetion = require("../validatetion/login")
const authMw = require("../midelwers/auth");
const CheckuserToken = require("../midelwers/Users/CheckUserToken");

usersrouter.post("/login", loginvalidatetion, auth.login);
usersrouter.post("/register", uservalidatetion, auth.register);
usersrouter.post("/google/login", auth.googleLogin);
usersrouter.post("/google/register", auth.googleRegister);
// Keep the former URL as strict login only for older deployed clients.
usersrouter.post("/google", auth.googleLogin);

usersrouter.get("/admin", authMw, CheckuserToken, manger.getUsers);
usersrouter.get("/admin/deleted", authMw, CheckuserToken, manger.getDeletedUsers);
usersrouter.put("/admin/:id", authMw, CheckuserToken, uservalidatetion, manger.updateUser);
usersrouter.delete("/admin/:id/permanent", authMw, CheckuserToken, manger.deleteUserForever);
usersrouter.delete("/admin/:id", authMw, CheckuserToken, manger.deleteUser);
usersrouter.patch("/admin/:id", authMw, CheckuserToken, manger.restoreUser);


// Pending accounts may open and edit their own profile while all work routes
// remain protected by CheckuserToken.
usersrouter.get("/profile", authMw, profile.getProfile);
usersrouter.put("/profile", authMw, profileValidation, profile.UpdateProfile);
usersrouter.patch("/profile/theme", authMw, profile.UpdateTheme);
usersrouter.delete("/profile", authMw, profile.DeleteProfile);

usersrouter.get("/linked-accounts", authMw, CheckuserToken, linkedAccounts.listLinkedAccounts);
usersrouter.post("/linked-accounts", authMw, CheckuserToken, linkedAccounts.createLinkedAccount);
usersrouter.post("/linked-accounts/:id/switch", authMw, CheckuserToken, linkedAccounts.switchLinkedAccount);

usersrouter.get("/dashboard-notes", authMw, CheckuserToken, dashboardNotes.listNotes);
usersrouter.post("/dashboard-notes", authMw, CheckuserToken, dashboardNotes.addNote);
usersrouter.delete("/dashboard-notes/:noteId", authMw, CheckuserToken, dashboardNotes.deleteNote);


usersrouter.get("/approval", authMw, CheckuserToken, approval.getPendingUsers);
usersrouter.put("/approval/:id", authMw, CheckuserToken, approval.approveUser);
usersrouter.delete("/approval/:id", authMw, CheckuserToken, approval.deletePendingUser);

module.exports = usersrouter

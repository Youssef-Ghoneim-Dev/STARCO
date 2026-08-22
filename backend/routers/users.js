const usersrouter = require("express").Router();
const approval = require("../controllers/users/approval.controller.js")
const profile = require("../controllers/users/profile.controller")
const manger = require("../controllers/users/manager.controller")
const auth = require("../controllers/users/auth.controller")
const uservalidatetion = require("../validatetion/users")
const profileValidation = require("../validatetion/profile")
const loginvalidatetion = require("../validatetion/login")
const authMw = require("../midelwers/auth");
const CheckuserToken = require("../midelwers/Users/CheckUserToken");

usersrouter.post("/login", loginvalidatetion, auth.login);
usersrouter.post("/register", uservalidatetion, auth.register);
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
usersrouter.delete("/profile", authMw, profile.DeleteProfile);


usersrouter.get("/approval", authMw, CheckuserToken, approval.getPendingUsers);
usersrouter.put("/approval/:id", authMw, CheckuserToken, approval.approveUser);
usersrouter.delete("/approval/:id", authMw, CheckuserToken, approval.deletePendingUser);

module.exports = usersrouter

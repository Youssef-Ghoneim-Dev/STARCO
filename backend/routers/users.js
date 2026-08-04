const usersrouter = require("express").Router();
const approval = require("../controllers/users/approval.controller.js")
const profile = require("../controllers/users/profile.controller")
const manger = require("../controllers/users/manager.controller")
const auth = require("../controllers/users/auth.controller")
const uservalidatetion = require("../validatetion/users")
const loginvalidatetion = require("../validatetion/login")
const authMw = require("../midelwers/auth");
const CheckuserToken = require("../midelwers/Users/CheckUserToken");

usersrouter.post("/login", loginvalidatetion, auth.login);
usersrouter.post("/register", uservalidatetion, auth.register);


usersrouter.get("/admin", authMw, CheckuserToken, manger.getUsers);
usersrouter.get("/admin/deleted", authMw, CheckuserToken, manger.getDeletedUsers);
usersrouter.put("/admin/:id", authMw, CheckuserToken, uservalidatetion, manger.updateUser);
usersrouter.delete("/admin/:id", authMw, CheckuserToken, manger.deleteUser);
usersrouter.patch("/admin/:id", authMw, CheckuserToken, manger.restoreUser);


usersrouter.put("/profile", authMw, CheckuserToken, uservalidatetion, profile.UpdateProfile);
usersrouter.delete("/profile", authMw, CheckuserToken, profile.DeleteProfile);


usersrouter.get("/approval", authMw, CheckuserToken, approval.getPendingUsers);
usersrouter.put("/approval/:id", authMw, CheckuserToken, approval.approveUser);
usersrouter.delete("/approval/:id", authMw, CheckuserToken, approval.deletePendingUser);

module.exports = usersrouter
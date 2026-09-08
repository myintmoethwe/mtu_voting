const express = require("express");
const router = express.Router();
const {
  renderAdminLogin,
  adminLogin,
  logout,
} = require("../controller/auth.controller");

router.get("/login", renderAdminLogin);
router.post("/login", adminLogin);
router.get("/logout", logout);

module.exports = router;

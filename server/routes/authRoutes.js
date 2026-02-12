const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  register,
  login,
  me,
  deleteAccount,
  checkUsername, // ✅ username availability
} = require("../controllers/authController");

// ✅ PUBLIC: username availability check
router.get("/check-username", checkUsername);

// ✅ AUTH
router.post("/register", register);
router.post("/login", login);

// ✅ PROTECTED routes
router.get("/me", authMiddleware, me);
router.delete("/delete-account", authMiddleware, deleteAccount);

module.exports = router;

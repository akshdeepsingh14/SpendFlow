const express = require("express");
const router = express.Router();

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// GET total users count
router.get("/users-count", authMiddleware, async (req, res) => {
  try {
    const count = await User.countDocuments({});
    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Expect: "Bearer <token>"
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ FIX: Check if user still exists (account may be deleted)
    const user = await User.findById(decoded.id).select("_id username");
    if (!user) {
      return res.status(401).json({ message: "Account deleted. Please login again." });
    }

    // Keep your req.user shape consistent
    req.user = { id: user._id.toString(), username: user.username };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

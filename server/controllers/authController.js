const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Expense = require("../models/Expense");

const createToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, username: rawUsername, password } = req.body;

    if (!name || !rawUsername || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const username = rawUsername.trim().toLowerCase();

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      username,
      password: hashed,
    });

    const token = createToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, username: user.username },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// LOGIN
exports.login = async (req, res) => {
  try {
    const { username: rawUsername, password } = req.body;

    if (!rawUsername || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const username = rawUsername.trim().toLowerCase();

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = createToken(user);

    res.json({
      token,
      user: { id: user._id, name: user.name, username: user.username },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE ACCOUNT
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // delete user
    await User.findByIdAndDelete(userId);

    // delete all expenses of this user (important)
    await Expense.deleteMany({ userId });

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Profile 
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name username");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ CHECK username availability (real-time)
exports.checkUsername = async (req, res) => {
  try {
    const raw = req.query.username;
    if (!raw) return res.status(400).json({ message: "Username required" });

    const username = raw.trim().toLowerCase();

    // allow only letters, numbers, underscore
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return res.json({ available: false, reason: "invalid" });
    }

    const exists = await User.findOne({ username }).select("_id");
    if (exists) {
      return res.json({ available: false, reason: "taken" });
    }

    res.json({ available: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

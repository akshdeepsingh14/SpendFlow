const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const Expense = require("../models/Expense");

const {
  addExpense,
  getExpenses,
  updateExpense, // ✅ edit
} = require("../controllers/expenseController");

// ✅ PROTECTED routes
router.post("/", authMiddleware, addExpense);
router.get("/", authMiddleware, getExpenses);

// ✅ UPDATE expense (only own)
router.put("/:id", authMiddleware, updateExpense);

// ✅ DELETE expense (only own)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deleted) return res.status(404).json({ message: "Expense not found" });

    res.json({ message: "Expense deleted", deleted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

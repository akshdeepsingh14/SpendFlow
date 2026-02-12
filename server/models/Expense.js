const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },

  // ✅ NEW: connect expense to a user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
});

module.exports = mongoose.model("Expense", expenseSchema);

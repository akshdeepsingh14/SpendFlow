const Expense = require("../models/Expense");

// ADD expense (for logged-in user)
exports.addExpense = async (req, res) => {
  try {
    const expense = new Expense({
      ...req.body,
      userId: req.user.id, // ✅ attach logged-in user
    });

    const saved = await expense.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET expenses (only for logged-in user, with date filters)
exports.getExpenses = async (req, res) => {
  try {
    const { date, from, to } = req.query;

    let filter = { userId: req.user.id }; // ✅ only this user's data

    // Single date filter
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      filter.date = { $gte: start, $lte: end };
    }

    // Date range filter
    if (from && to) {
      filter.date = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// UPDATE expense (only if it belongs to logged-in user)
exports.updateExpense = async (req, res) => {
  try {
    const { title, amount, category, date } = req.body;

    // basic validation
    if (!title || amount === undefined || !category) {
      return res.status(400).json({ message: "Title, amount, category are required" });
    }

    const updated = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id }, // ✅ only own expense
      {
        title: String(title).trim(),
        amount: Number(amount),
        category: String(category).trim(),
        ...(date ? { date: new Date(date) } : {}),
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Expense not found" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

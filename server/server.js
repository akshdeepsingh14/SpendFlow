require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ✅ Middleware
// Allow requests from your desktop + phone (React dev server origins)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://192.168.29.8:3000",
    ],
    credentials: true,
  })
);

app.use(express.json());

// ✅ Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.log("MongoDB connection error:", err));

// ✅ IMPORTANT: listen on all interfaces so phone can access
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on port ${PORT}`);
});

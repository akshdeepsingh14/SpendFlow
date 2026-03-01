require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const statsRoutes = require("./routes/statsRoutes");

// ✅ Middleware
app.use(express.json());

// ✅ CORS (dev + Render)
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.CLIENT_URL, // set this on Render to your frontend URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow non-browser requests (like Postman) with no origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// ✅ Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/stats", statsRoutes);

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// ✅ Start only after DB connects (better for Render)
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  } catch (err) {
    console.log("MongoDB connection error:", err);
    process.exit(1);
  }
}

start();
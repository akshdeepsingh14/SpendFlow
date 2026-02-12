import "./App.css";
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ExpenseList from "./ExpenseList";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import { getToken } from "./auth";

const THEME_KEY = "spendflow-theme";

function App() {
  // ✅ Load theme from localStorage on first render
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_KEY) || "light";
  });

  const token = getToken();

  // ✅ Persist theme whenever it changes
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return (
    <div className={`App ${theme}`}>
      {/* Top Bar: Theme only (Profile removed) */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <button
          className="theme-toggle"
          onClick={() =>
            setTheme((t) => (t === "light" ? "dark" : "light"))
          }
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      <h1>SPEND FLOW</h1>

      <Routes>
        <Route
          path="/"
          element={token ? <ExpenseList /> : <Navigate to="/login" />}
        />

        {/* Profile route kept (no UI button) */}
        <Route
          path="/profile"
          element={token ? <Profile /> : <Navigate to="/login" />}
        />

        <Route
          path="/login"
          element={!token ? <Login /> : <Navigate to="/" />}
        />

        <Route
          path="/register"
          element={!token ? <Register /> : <Navigate to="/" />}
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;

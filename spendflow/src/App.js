import "./App.css";
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ExpenseList from "./ExpenseList";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import { getToken } from "./auth";

import GlobalLoader from "./GlobalLoader";
import { registerGlobalLoader } from "./apiFetch";

const THEME_KEY = "spendflow-theme";

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_KEY) || "light";
  });

  // ✅ ADD THIS (missing in your code)
  const [loading, setLoading] = useState(false);

  const token = getToken();

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    registerGlobalLoader(setLoading);
  }, []);

  return (
    <div className={`App ${theme}`}>
      <GlobalLoader show={loading} />

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
          onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
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

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE from "../api";
import { setToken } from "../auth";
import { apiFetch } from "../apiFetch";

function normalizeUsername(v) {
  return (v || "").trim().toLowerCase();
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState("");
  const [isDark, setIsDark] = useState(false);

  // detect theme from App class
  useEffect(() => {
    const el = document.querySelector(".App");
    const check = () => setIsDark(el?.classList.contains("dark"));
    check();

    const obs = new MutationObserver(check);
    if (el) obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const styles = {
    page: {
      maxWidth: 360,
      margin: "60px auto",
      color: isDark ? "#f5f6fa" : "#2d3436",
    },
    card: {
      padding: 16,
      borderRadius: 12,
      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      border: isDark
        ? "1px solid rgba(255,255,255,0.12)"
        : "1px solid rgba(0,0,0,0.10)",
    },
    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 10,
      border: isDark
        ? "1px solid rgba(255,255,255,0.18)"
        : "1px solid rgba(0,0,0,0.18)",
      background: isDark ? "rgba(255,255,255,0.08)" : "white",
      color: isDark ? "#f5f6fa" : "#2d3436",
      outline: "none",
    },
    msg: {
      padding: 10,
      borderRadius: 10,
      background: isDark ? "rgba(253,203,110,0.18)" : "#ffeaa7",
      color: isDark ? "#ffeaa7" : "#2d3436",
      border: isDark
        ? "1px solid rgba(253,203,110,0.25)"
        : "1px solid rgba(0,0,0,0.06)",
      marginBottom: 10,
    },
    link: {
      color: isDark ? "#74b9ff" : "#0984e3",
      textDecoration: "none",
      fontWeight: 600,
    },
    btn: {
      padding: "10px 12px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
    },
    eyeBtn: {
      position: "absolute",
      right: 6,
      top: "50%",
      transform: "translateY(-50%)",
      height: 34,
      width: 34,
      borderRadius: 10,
      border: isDark
        ? "1px solid rgba(255,255,255,0.18)"
        : "1px solid rgba(0,0,0,0.15)",
      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)",
      cursor: "pointer",
      display: "grid",
      placeItems: "center",
      padding: 0,
      color: isDark ? "#f5f6fa" : "#2d3436",
    },
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      // 🔥 FIXED ENDPOINT HERE
      const res = await apiFetch(`${API_BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: normalizeUsername(username),
    password,
  }),
});

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Login failed");
        return;
      }

      setToken(data.token);
      window.location.href = "/";
    } catch (err) {
      setMsg("Network error");
    }
  };

  return (
    <div style={styles.page}>
      <h2>Login</h2>

      <div style={styles.card}>
        {msg && <p style={styles.msg}>{msg}</p>}

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
          <input
            style={styles.input}
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <div style={{ position: "relative" }}>
            <input
              style={{ ...styles.input, paddingRight: 46 }}
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              aria-label={showPass ? "Hide password" : "Show password"}
              title={showPass ? "Hide password" : "Show password"}
              style={styles.eyeBtn}
            >
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>

          <button type="submit" style={styles.btn}>
            Login
          </button>
        </form>

        <p style={{ marginTop: 12 }}>
          New user?{" "}
          <Link to="/register" style={styles.link}>
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

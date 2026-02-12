import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE from "../api";
import { setToken } from "../auth";
import { apiFetch } from "../apiFetch";

// ---------- Password strength ----------
function scorePassword(pw) {
  const p = pw || "";
  let score = 0;
  if (p.length >= 8) score += 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1;
  if (/\d/.test(p)) score += 1;
  if (/[^A-Za-z0-9]/.test(p)) score += 1;
  if (p.length > 0 && p.length < 6) score = Math.min(score, 1);
  return score; // 0..4
}

function strengthLabel(score) {
  switch (score) {
    case 0:
      return { text: "Too weak", hint: "Use 8+ chars with number & symbol." };
    case 1:
      return { text: "Weak", hint: "Add uppercase + number or symbol." };
    case 2:
      return { text: "Okay", hint: "Add a symbol for stronger security." };
    case 3:
      return { text: "Strong", hint: "Nice! Consider 12+ chars." };
    case 4:
      return { text: "Very strong", hint: "Great password." };
    default:
      return { text: "—", hint: "" };
  }
}

// ---------- Username rules ----------
function normalizeUsername(v) {
  return (v || "").trim().toLowerCase();
}

// allow letters, numbers, underscore. 3-20 chars.
function isValidUsername(v) {
  return /^[a-z0-9_]{3,20}$/.test(v);
}

export default function Register() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState("");

  // ✅ renamed: username availability state
  const [usernameStatus, setUsernameStatus] = useState("idle");
  // idle | checking | available | taken | invalid | error

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

  // password strength
  const pwScore = useMemo(() => scorePassword(password), [password]);
  const pwInfo = useMemo(() => strengthLabel(pwScore), [pwScore]);

  // ✅ Username availability check (debounced)
  useEffect(() => {
    const value = normalizeUsername(username);

    if (!value) {
      setUsernameStatus("idle");
      return;
    }

    if (!isValidUsername(value)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          // ✅ FIXED: add /api
          `${API_BASE}/api/auth/check-username?username=${encodeURIComponent(
            value
          )}`
        );
        const data = await res.json();

        if (!res.ok) {
          setUsernameStatus("error");
          return;
        }

        if (data.available) setUsernameStatus("available");
        else if (data.reason === "taken") setUsernameStatus("taken");
        else setUsernameStatus("invalid");
      } catch {
        setUsernameStatus("error");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const usernameHint = (() => {
    if (usernameStatus === "checking")
      return { text: "Checking...", color: "#74b9ff" };
    if (usernameStatus === "available")
      return { text: "Username available ✅", color: "#00b894" };
    if (usernameStatus === "taken")
      return { text: "Username already exists ❌", color: "#ff7675" };
    if (usernameStatus === "invalid")
      return { text: "Use 3-20 chars: a-z, 0-9, _", color: "#ff7675" };
    if (usernameStatus === "error")
      return { text: "Couldn’t check username (network)", color: "#ff7675" };
    return null;
  })();

  const handleRegister = async (e) => {
    e.preventDefault();
    setMsg("");

    if (usernameStatus === "taken") {
      setMsg("This username already exists. Try another.");
      return;
    }
    if (usernameStatus === "invalid") {
      setMsg("Please enter a valid username.");
      return;
    }
    if (usernameStatus === "checking") {
      setMsg("Checking username... please wait.");
      return;
    }

    try {
      // ✅ FIXED: add /api
     const res = await apiFetch(`${API_BASE}/api/auth/register`, {
  method: "POST", // ✅ add
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name,
    username: normalizeUsername(username),
    password,
  }),
});


      const data = await res.json();

      if (!res.ok) {
        setMsg(data.message || "Register failed");
        return;
      }

      setToken(data.token);
      window.location.href = "/";
    } catch {
      setMsg("Network error");
    }
  };

  const disableBtn =
    usernameStatus === "taken" ||
    usernameStatus === "invalid" ||
    usernameStatus === "checking";

  return (
    <div style={styles.page}>
      <h2>Register</h2>

      <div style={styles.card}>
        {msg && <p style={styles.msg}>{msg}</p>}

        <form onSubmit={handleRegister} style={{ display: "grid", gap: 10 }}>
          <input
            style={styles.input}
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div style={{ display: "grid", gap: 6 }}>
            <input
              style={styles.input}
              type="text"
              placeholder="Create your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {usernameHint && (
              <small style={{ color: usernameHint.color }}>
                {usernameHint.text}
              </small>
            )}
          </div>

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

          {/* Strength meter */}
          <div style={{ display: "grid", gap: 6 }}>
            <div
              style={{
                height: 10,
                borderRadius: 999,
                background: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.12)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(pwScore / 4) * 100}%`,
                  transition: "width 200ms ease",
                  background:
                    pwScore <= 1
                      ? "#ff7675"
                      : pwScore === 2
                      ? "#fdcb6e"
                      : "#00b894",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <small>
                Strength: <b>{pwInfo.text}</b>
              </small>
              <small style={{ opacity: 0.8 }}>{pwInfo.hint}</small>
            </div>
          </div>

          <button
            type="submit"
            disabled={disableBtn}
            style={{
              ...styles.btn,
              opacity: disableBtn ? 0.7 : 1,
              cursor: disableBtn ? "not-allowed" : "pointer",
            }}
          >
            Create account
          </button>
        </form>

        <p style={{ marginTop: 12 }}>
          Already have an account?{" "}
          <Link to="/login" style={styles.link}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

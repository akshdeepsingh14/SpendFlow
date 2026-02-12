import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../api";
import { getToken, logout } from "../auth";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState("");
  const [isDark, setIsDark] = useState(false);

  // ✅ Monthly summary state/data
  const [expenses, setExpenses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(""); // "YYYY-MM"
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // ✅ Delete-with-password modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  // detect theme from App class
  useEffect(() => {
    const el = document.querySelector(".App");
    const check = () => setIsDark(el?.classList.contains("dark"));
    check();

    const obs = new MutationObserver(check);
    if (el) obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Load profile
  useEffect(() => {
    const load = async () => {
      try {
        const t = getToken();
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${t}` },
        });

        const data = await res.json().catch(() => ({}));

        // ✅ If token invalid OR account deleted => logout immediately
        if (res.status === 401) {
          logout();
          navigate("/login");
          return;
        }

        if (!res.ok) {
          setMsg(data.message || "Failed to load profile");
          return;
        }

        setUser(data);
      } catch {
        setMsg("Network error");
      }
    };

    load();
  }, [navigate]);

  // ✅ Load expenses for monthly summary (in Profile page)
  useEffect(() => {
    const loadExpenses = async () => {
      setLoadingMonthly(true);
      try {
        const t = getToken();
        const res = await fetch(`${API_BASE}/expenses`, {
          headers: { Authorization: `Bearer ${t}` },
        });

        const data = await res.json().catch(() => null);

        if (res.status === 401) {
          logout();
          navigate("/login");
          return;
        }

        if (!res.ok) {
          console.error("Failed to load expenses for monthly summary:", data);
          setExpenses([]);
          return;
        }

        setExpenses(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Monthly summary network error:", e);
        setExpenses([]);
      } finally {
        setLoadingMonthly(false);
      }
    };

    loadExpenses();
  }, [navigate]);

  const monthKey = (d) => {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };

  const monthLabel = (key) => {
    if (!key) return "";
    const [y, m] = key.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, 1);
    return dt.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  const months = useMemo(() => {
    const keys = new Set(expenses.map((e) => monthKey(e.date)).filter(Boolean));
    return Array.from(keys).sort((a, b) => b.localeCompare(a)); // newest first
  }, [expenses]);

  useEffect(() => {
    if (!months.length) {
      setSelectedMonth("");
      return;
    }
    if (!selectedMonth || !months.includes(selectedMonth)) {
      setSelectedMonth(months[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months]);

  const monthlyTotal = useMemo(() => {
    if (!selectedMonth) return 0;
    return expenses
      .filter((e) => monthKey(e.date) === selectedMonth)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses, selectedMonth]);

  const monthlyCount = useMemo(() => {
    if (!selectedMonth) return 0;
    return expenses.filter((e) => monthKey(e.date) === selectedMonth).length;
  }, [expenses, selectedMonth]);

  const topCategories = useMemo(() => {
    if (!selectedMonth) return [];
    const map = new Map();
    expenses.forEach((e) => {
      if (monthKey(e.date) !== selectedMonth) return;
      const cat = e.category || "Other";
      map.set(cat, (map.get(cat) || 0) + (Number(e.amount) || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [expenses, selectedMonth]);

  const styles = {
    page: {
      maxWidth: 420,
      margin: "40px auto",
      padding: "0 12px",
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
    // ✅ new card variant for Monthly summary (better UI)
    fancyCard: {
      padding: 16,
      borderRadius: 16,
      marginTop: 14,
      border: isDark
        ? "1px solid rgba(255,255,255,0.14)"
        : "1px solid rgba(0,0,0,0.10)",
      background: isDark
        ? "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))"
        : "linear-gradient(135deg, rgba(0,0,0,0.03), rgba(0,0,0,0.015))",
      boxShadow: isDark
        ? "0 18px 40px rgba(0,0,0,0.55)"
        : "0 14px 34px rgba(0,0,0,0.12)",
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
    infoBox: {
      padding: 14,
      borderRadius: 12,
      textAlign: "left",
      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.35)",
      border: isDark
        ? "1px solid rgba(255,255,255,0.12)"
        : "1px solid rgba(0,0,0,0.06)",
    },
    btnRow: {
      display: "flex",
      gap: 12,
      justifyContent: "center",
      flexWrap: "wrap",
      marginTop: 14,
    },
    btn: {
      padding: "10px 14px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
    },
    dangerBtn: {
      padding: "10px 14px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
      backgroundColor: "#ff7675",
      color: "white",
    },
    backBtn: {
      background: "transparent",
      color: "inherit",
      border: "2px solid currentColor",
      padding: "8px 14px",
      borderRadius: 10,
      cursor: "pointer",
    },
    label: {
      fontWeight: 800,
      fontSize: 12.5,
      opacity: isDark ? 0.85 : 0.8,
      letterSpacing: 0.2,
    },
    select: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 14,
      border: isDark
        ? "1px solid rgba(255,255,255,0.16)"
        : "1px solid rgba(0,0,0,0.12)",
      background: isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.9)",
      color: "inherit",
      outline: "none",
      fontWeight: 800,
      marginTop: 8,
    },
    totalBig: {
      fontSize: 28,
      fontWeight: 950,
      letterSpacing: 0.2,
      marginTop: 6,
    },
    pillRow: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginTop: 10,
    },
    pill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 10px",
      borderRadius: 999,
      border: isDark
        ? "1px solid rgba(255,255,255,0.14)"
        : "1px solid rgba(0,0,0,0.10)",
      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.75)",
      fontSize: 12.5,
      fontWeight: 800,
      opacity: isDark ? 0.95 : 0.92,
      whiteSpace: "nowrap",
    },
    divider: {
      height: 1,
      background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
      margin: "12px 0",
    },
    smallNote: {
      fontSize: 12,
      opacity: isDark ? 0.72 : 0.7,
      lineHeight: 1.35,
      marginTop: 8,
    },
    // ✅ Modal input style (matches your theme)
    input: {
      width: "100%",
      marginTop: 8,
      padding: "10px 12px",
      borderRadius: 14,
      border: isDark
        ? "1px solid rgba(255,255,255,0.16)"
        : "1px solid rgba(0,0,0,0.12)",
      background: isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.9)",
      color: "inherit",
      outline: "none",
      fontWeight: 800,
    },
    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 9999,
    },
    modalCard: {
      width: "100%",
      maxWidth: 420,
      borderRadius: 16,
      padding: 16,
      background: isDark ? "#151515" : "#fff",
      color: isDark ? "#f5f6fa" : "#2d3436",
      border: isDark
        ? "1px solid rgba(255,255,255,0.12)"
        : "1px solid rgba(0,0,0,0.10)",
      boxShadow: isDark
        ? "0 18px 40px rgba(0,0,0,0.65)"
        : "0 14px 34px rgba(0,0,0,0.18)",
    },
    outlineBtn: {
      padding: "10px 14px",
      borderRadius: 10,
      cursor: "pointer",
      background: "transparent",
      color: "inherit",
      border: "2px solid currentColor",
    },
  };

  const doLogout = () => {
    const ok = window.confirm("Are you sure you want to logout?");
    if (!ok) return;
    logout();
    navigate("/login");
  };

  // ✅ Open delete modal
  const openDeleteModal = () => {
    setDeletePassword("");
    setShowDeleteModal(true);
  };

  // ✅ Confirm delete with password
  const confirmDeleteAccount = async () => {
    const ok = window.confirm(
      "This will permanently delete your account and all expenses. Continue?"
    );
    if (!ok) return;

    if (!deletePassword.trim()) {
      alert("Please enter your password.");
      return;
    }

    setDeleting(true);
    try {
      const t = getToken();
      const res = await fetch(`${API_BASE}/auth/delete-account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        // token expired etc.
        logout();
        navigate("/login");
        return;
      }

      if (!res.ok) {
        alert(data.message || "Delete failed. Wrong password or try again.");
        return;
      }

      setShowDeleteModal(false);
      logout();
      navigate("/login");
    } catch {
      alert("Network error. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={styles.page}>
      <h2>Profile</h2>

      <div style={styles.card}>
        {msg && <p style={styles.msg}>{msg}</p>}

        {user && (
          <div style={styles.infoBox}>
            <p style={{ margin: "8px 0" }}>
              <b>Name:</b> {user.name}
            </p>
            <p style={{ margin: "8px 0" }}>
              <b>Username:</b> {user.username}
            </p>
          </div>
        )}

        {/* ✅ Monthly Summary (Profile page) */}
        <div style={styles.fancyCard}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 160 }}>
              <div style={{ fontWeight: 950, fontSize: 16, letterSpacing: 0.2 }}>
                Monthly Summary
              </div>
              <div style={{ fontSize: 12.5, opacity: isDark ? 0.75 : 0.7 }}>
                Choose a month → total spent
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12.5, opacity: isDark ? 0.75 : 0.7 }}>
                Total
              </div>
              <div style={styles.totalBig}>₹{Math.round(monthlyTotal * 100) / 100}</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={styles.label}>Select month</div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={styles.select}
              disabled={loadingMonthly || !months.length}
              aria-label="Select month"
            >
              {loadingMonthly ? (
                <option value="">Loading...</option>
              ) : !months.length ? (
                <option value="">No expenses yet</option>
              ) : (
                months.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))
              )}
            </select>

            <div style={styles.pillRow}>
              <span style={styles.pill}>🧾 {monthlyCount} items</span>
              <span style={styles.pill}>
                📅 {selectedMonth ? monthLabel(selectedMonth) : "—"}
              </span>
            </div>

            <div style={styles.divider} />

            <div style={{ fontWeight: 900, fontSize: 13.5, marginBottom: 6 }}>
              Top categories
            </div>

            {selectedMonth && topCategories.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {topCategories.map(([cat, amt]) => (
                  <div
                    key={cat}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: isDark
                        ? "1px solid rgba(255,255,255,0.12)"
                        : "1px solid rgba(0,0,0,0.08)",
                      background: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(255,255,255,0.7)",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{cat}</div>
                    <div style={{ fontWeight: 950 }}>₹{Math.round(amt * 100) / 100}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.smallNote}>
                {loadingMonthly ? "Loading your expenses…" : "No data for this month yet."}
              </div>
            )}

            <div style={styles.smallNote}>
              This summary is calculated from all your saved expenses.
            </div>
          </div>
        </div>

        <div style={styles.btnRow}>
          <button type="button" onClick={doLogout} style={styles.btn}>
            Logout
          </button>

          <button type="button" onClick={openDeleteModal} style={styles.dangerBtn}>
            Delete Account
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 25 }}>
        <button onClick={() => navigate("/")} style={styles.backBtn}>
          BACK
        </button>
      </div>

      {/* ✅ Delete Password Modal */}
      {showDeleteModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>
              Confirm account deletion
            </div>
            <div style={{ fontSize: 12.5, opacity: isDark ? 0.75 : 0.7, marginTop: 6 }}>
              Enter your password to delete your account permanently.
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={styles.label}>Password</div>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                style={styles.input}
                placeholder="Enter password"
                disabled={deleting}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmDeleteAccount();
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 14,
              }}
            >
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={styles.outlineBtn}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteAccount}
                style={styles.dangerBtn}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

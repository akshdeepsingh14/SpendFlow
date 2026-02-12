import React, { useEffect, useState, useRef } from "react";
import AddExpense from "./AddExpense";
import CategoryChart from "./CategoryChart";
import API_BASE from "./api";
import { getToken, logout } from "./auth";
import { apiFetch } from "./apiFetch";

const UNDO_KEY = "undo_delete_expense_v1";

function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // For undo delete
  const [undoData, setUndoData] = useState(null);

  // ✅ Detect theme for modal (dark/light)
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const el = document.querySelector(".App");
    const check = () => setIsDark(el?.classList.contains("dark"));
    check();

    const obs = new MutationObserver(check);
    if (el) obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ✅ Profile hover (for animated hover)
  const [profileHover, setProfileHover] = useState(false);

  // ✅ Edit states
  const [editing, setEditing] = useState(null); // expense object
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");

  const openEdit = (expense) => {
    setEditing(expense);
    setEditTitle(expense.title || "");
    setEditAmount(String(expense.amount ?? ""));
    setEditCategory(expense.category || "");
    setEditDate(
      expense.date ? new Date(expense.date).toISOString().slice(0, 10) : ""
    );
  };

  const closeEdit = () => {
    setEditing(null);
    setEditTitle("");
    setEditAmount("");
    setEditCategory("");
    setEditDate("");
  };

  // Fetch expenses
  const fetchExpenses = async () => {
    let url = `${API_BASE}/api/expenses`;
    if (selectedDate) url += `?date=${selectedDate}`;

    try {
      const token = getToken();

      const res = await apiFetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      // ✅ If token invalid or deleted account
      if (res.status === 401) {
        logout();
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        console.error("Fetch expenses failed:", data);
        setExpenses([]); // keep UI safe
        return;
      }

      // ✅ Ensure array
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Network error:", err);
      setExpenses([]);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleAdd = (newExpense) => {
    if (!newExpense || !newExpense._id) return;
    setExpenses((prev) => [newExpense, ...prev]);
  };

  // ✅ SAVE EDIT (PUT)
  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;

    const payload = {
      title: editTitle.trim(),
      amount: Number(editAmount),
      category: editCategory.trim(),
      date: editDate ? new Date(editDate) : undefined,
    };

    if (!payload.title || !payload.category || Number.isNaN(payload.amount)) {
      alert("Please enter title, amount and category.");
      return;
    }

    try {
      const token = getToken();

      const res = await apiFetch(`${API_BASE}/api/expenses/${editing._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        logout();
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        alert(data?.message || "Update failed");
        return;
      }

      setExpenses((prev) => prev.map((x) => (x._id === data._id ? data : x)));
      closeEdit();
    } catch (err) {
      console.error("Update error:", err);
      alert("Network error");
    }
  };

  // ================= UNDO DELETE (FIXED) =================
  // ✅ Key fix: delete from backend IMMEDIATELY.
  // ✅ Undo works by RE-CREATING the expense (so refresh won't bring it back).
  const recreateExpense = async (expense) => {
    const payload = {
      title: expense.title,
      amount: Number(expense.amount),
      category: expense.category,
      date: expense.date ? new Date(expense.date) : undefined,
    };

    const token = getToken();
    const res = await apiFetch(`${API_BASE}/api/expenses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (res.status === 401) {
      logout();
      window.location.href = "/login";
      return null;
    }

    if (!res.ok) {
      console.error("Recreate failed:", data);
      return null;
    }

    return data;
  };

  const clearUndoEverywhere = () => {
    if (undoData?.timer) clearTimeout(undoData.timer);
    setUndoData(null);
    try {
      localStorage.removeItem(UNDO_KEY);
    } catch {}
  };

  const handleDelete = async (expense) => {
    // Optimistically remove from UI
    setExpenses((prev) => prev.filter((exp) => exp._id !== expense._id));

    // ✅ Delete from backend NOW (so refresh won't bring it back)
    try {
      const token = getToken();
      const res = await apiFetch(`${API_BASE}/api/expenses/${expense._id}`, {

        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        logout();
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        console.error("Delete failed:", data);
        // Put it back if delete failed
        setExpenses((prev) => [expense, ...prev]);
        return;
      }
    } catch (err) {
      console.error("Delete network error:", err);
      setExpenses((prev) => [expense, ...prev]);
      return;
    }

    // ✅ Start undo window (5s) and persist across refresh
    const createdAt = Date.now();
    const expiresAt = createdAt + 5000;

    try {
      localStorage.setItem(UNDO_KEY, JSON.stringify({ expense, expiresAt }));
    } catch {}

    const timer = setTimeout(() => {
      clearUndoEverywhere();
    }, 5000);

    setUndoData({ expense, timer, expiresAt });
  };

  const handleUndo = async () => {
    if (!undoData?.expense) return;

    // Prevent double actions
    const exp = undoData.expense;
    clearUndoEverywhere();

    // Recreate in backend
    const created = await recreateExpense(exp);
    if (!created || !created._id) {
      alert("Undo failed (could not restore).");
      return;
    }

    // Put it back in UI
    setExpenses((prev) => [created, ...prev]);
  };

  // ✅ If user refreshes during the 5s undo window, restore undo banner from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(UNDO_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const expiresAt = Number(parsed?.expiresAt || 0);
      const expense = parsed?.expense;

      if (!expense || !expiresAt) {
        localStorage.removeItem(UNDO_KEY);
        return;
      }

      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        localStorage.removeItem(UNDO_KEY);
        return;
      }

      const timer = setTimeout(() => {
        clearUndoEverywhere();
      }, remaining);

      setUndoData({ expense, timer, expiresAt });
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ======================================================

  const filteredExpenses = selectedCategory
    ? expenses.filter((exp) => exp.category === selectedCategory)
    : expenses;

  const totalSpent = filteredExpenses.reduce(
    (sum, exp) => sum + (Number(exp.amount) || 0),
    0
  );

  const categories = [...new Set(expenses.map((e) => e.category))];

  // ================= EXPORT/IMPORT CSV (FIXED ONLY THIS) =================
  const fileInputRef = useRef(null);

  const escapeCSV = (v) => {
    const s = String(v ?? "");
    if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const parseCSVLine = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out;
  };

  const exportCSV = () => {
    if (!expenses.length) return;

    // Use stable ISO date (YYYY-MM-DD) so import works perfectly
    const header = ["Title", "Amount", "Category", "Date"];
    const body = expenses.map((exp) => {
      const isoDate = exp.date
        ? new Date(exp.date).toISOString().slice(0, 10)
        : "";
      return [
        escapeCSV(exp.title),
        escapeCSV(exp.amount),
        escapeCSV(exp.category),
        escapeCSV(isoDate),
      ].join(",");
    });

    const csv = [header.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target.result || "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;

      // read header (supports any order if you exported from your app)
      const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
      const idx = {
        title: header.indexOf("title"),
        amount: header.indexOf("amount"),
        category: header.indexOf("category"),
        date: header.indexOf("date"),
      };

      const newExpenses = lines
        .slice(1)
        .map((line) => {
          const cols = parseCSVLine(line);

          const title = cols[idx.title] ?? "";
          const amount = cols[idx.amount] ?? "";
          const category = cols[idx.category] ?? "";
          const dateStr = cols[idx.date] ?? "";

          if (!title || !amount || !category) return null;

          const parsedAmount = Number(amount);
          if (Number.isNaN(parsedAmount)) return null;

          // Accept YYYY-MM-DD (from our export), otherwise fallback to Date()
          const parsedDate = dateStr ? new Date(dateStr) : new Date();
          const safeDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

          return {
            _id: `${Date.now()}-${Math.random()}`,
            title: title.trim(),
            amount: parsedAmount,
            category: category.trim(),
            date: safeDate,
          };
        })
        .filter(Boolean);

      setExpenses((prev) => [...newExpenses, ...prev]);
    };

    reader.readAsText(file);

    // ✅ allow importing same file again
    e.target.value = null;
  };
  // ======================================================================

  // ✅ modal styles
  const modalOverlay = {
    position: "fixed",
    inset: 0,
    background: isDark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.55)",
    display: "grid",
    placeItems: "center",
    zIndex: 2000,
    padding: 12,
    backdropFilter: "blur(6px)",
  };

  // ✅ FIXED: add boxSizing + maxWidth + minWidth so date input won't overflow on iOS
  const modalInput = {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 12,
    border: isDark
      ? "1px solid rgba(255,255,255,0.16)"
      : "1px solid rgba(0,0,0,0.12)",
    background: isDark ? "rgba(255,255,255,0.06)" : "white",
    color: isDark ? "#ecf0f1" : "#2d3436",
    outline: "none",
  };

  const labelStyle = {
    fontWeight: 700,
    fontSize: 12.5,
    opacity: isDark ? 0.9 : 0.85,
    letterSpacing: 0.2,
  };

  const hintStyle = {
    fontSize: 12,
    opacity: isDark ? 0.72 : 0.7,
    marginTop: 6,
    lineHeight: 1.35,
  };

  const buttonBase = {
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 700,
  };

  return (
    <div>
      {/* ✅ PROFILE ICON (gradient + hover + big + centered) */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <button
          aria-label="Profile"
          title="Profile"
          onClick={() => (window.location.href = "/profile")}
          onMouseEnter={() => setProfileHover(true)}
          onMouseLeave={() => setProfileHover(false)}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg, #6c5ce7, #00d2ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition:
              "transform 160ms ease, box-shadow 160ms ease, filter 160ms ease",
            transform: profileHover ? "scale(1.08)" : "scale(1)",
            boxShadow: profileHover
              ? "0 10px 26px rgba(108, 92, 231, 0.45)"
              : "0 6px 16px rgba(0,0,0,0.25)",
            filter: profileHover ? "brightness(1.07)" : "brightness(1)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="40"
            height="40"
            fill="white"
            style={{
              display: "block",
              transform: "translateY(1.5px)", // optical center
            }}
          >
            <path d="M12 12c3.2 0 5.8-2.6 5.8-5.8S15.2.4 12 .4 6.2 3 6.2 6.2 8.8 12 12 12z" />
            <path d="M2.5 23.5c0-4.8 4.8-8 9.5-8s9.5 3.2 9.5 8" />
          </svg>
        </button>
      </div>

      <h4>ADD EXPENSES</h4>

      <AddExpense onAdd={handleAdd} />

      {/* ✅ ONLY UI FIX: make Import button same as Export button (no label styling mismatch) */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "20px",
          gap: "10px",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button
  onClick={exportCSV}
  style={{ display: "flex", alignItems: "center", gap: 10 }}
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3v10m0 0 4-4m-4 4-4-4M4 17v3h16v-3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
  Export CSV
</button>

<input
  ref={fileInputRef}
  type="file"
  accept=".csv"
  onChange={importCSV}
  style={{ display: "none" }}
/>

<button
  onClick={() => fileInputRef.current?.click()}
  style={{ display: "flex", alignItems: "center", gap: 10 }}
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 21V11m0 0 4 4m-4-4-4 4M4 7V4h16v3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
  Import CSV
</button>

      </div>

      {expenses.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", margin: "30px 0" }}>
          <CategoryChart expenses={expenses} />
        </div>
      )}

      <div className="filters-container">
        <div className="date-section">
          <label>Filter by date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          {selectedDate && (
            <button className="clear-date" onClick={() => setSelectedDate("")}>
              Clear Date
            </button>
          )}
        </div>

        <div className="category-section">
          <label>Filter by category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="totals-container">
        {selectedCategory ? (
          <h3>
            Total Spent in {selectedCategory}: ₹{totalSpent}
          </h3>
        ) : (
          <h3>Total Spent: ₹{totalSpent}</h3>
        )}
      </div>

      {undoData && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#ff7675",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            zIndex: 1000,
          }}
        >
          Expense deleted
          <button
            onClick={handleUndo}
            style={{
              marginLeft: "15px",
              background: "white",
              color: "#ff7675",
              border: "none",
              borderRadius: "4px",
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            Undo
          </button>
        </div>
      )}

      <ul>
        {filteredExpenses.map((expense) => (
          <li key={expense._id}>
            <div>
              {expense.title} – ₹{expense.amount} ({expense.category})
              <br />
              <small>
                📅{" "}
                {new Date(expense.date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </small>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => openEdit(expense)}>Edit</button>
              <button onClick={() => handleDelete(expense)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>

      {/* ✅ EDIT MODAL */}
      {editing && (
        <div style={modalOverlay} onClick={closeEdit}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(820px, 96vw)",
              borderRadius: 20,
              overflow: "hidden",
              background: isDark
                ? "rgba(12,12,14,0.97)"
                : "rgba(255,255,255,0.97)",
              color: isDark ? "#ecf0f1" : "#2d3436",
              border: isDark
                ? "1px solid rgba(255,255,255,0.12)"
                : "1px solid rgba(0,0,0,0.08)",
              boxShadow: isDark
                ? "0 22px 60px rgba(0,0,0,0.65)"
                : "0 18px 48px rgba(0,0,0,0.18)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: isDark
                  ? "1px solid rgba(255,255,255,0.10)"
                  : "1px solid rgba(0,0,0,0.08)",
                background: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 0.2 }}>
                  Edit Expense
                </div>
                <div style={{ opacity: isDark ? 0.72 : 0.75, fontSize: 13 }}>
                  Update title, amount, category, or date
                </div>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                style={{
                  background: isDark ? "rgba(255,255,255,0.06)" : "transparent",
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.16)"
                    : "1px solid rgba(0,0,0,0.12)",
                  color: "inherit",
                  borderRadius: 12,
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
                aria-label="Close edit"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 16 }}>
              <form
                onSubmit={saveEdit}
                style={{
                  margin: 0,
                  padding: 0,
                  maxWidth: "100%",
                  boxShadow: "none",
                  background: "transparent",
                  display: "grid",
                  gap: 12,
                  paddingTop: 6,
                }}
              >
                <div className="edit-layout">
                  <div className="edit-fields">
                    <div className="field-block">
                      <label className="field-label" style={labelStyle}>
                        Title
                      </label>
                      <input
                        style={{ ...modalInput, marginTop: 8 }}
                        type="text"
                        placeholder="e.g., Gym"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="edit-row">
                      <div className="field-block">
                        <label className="field-label" style={labelStyle}>
                          Amount
                        </label>
                        <input
                          style={{ ...modalInput, marginTop: 6 }}
                          type="number"
                          placeholder="e.g., 500"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          required
                        />
                      </div>

                      <div className="field-block">
                        <label className="field-label" style={labelStyle}>
                          Date
                        </label>
                        <input
                          style={{ ...modalInput, marginTop: 6 }}
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="field-block">
                      <label className="field-label" style={labelStyle}>
                        Category
                      </label>
                      <input
                        style={{ ...modalInput, marginTop: 6 }}
                        type="text"
                        placeholder="e.g., Fitness"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        required
                      />
                      <div className="field-hint" style={hintStyle}>
                        Tip: keep names consistent (Fitness, Food, Transport…)
                      </div>
                    </div>
                  </div>

                  <div className="edit-preview" aria-label="Expense preview">
                    <div
                      style={{
                        borderRadius: 16,
                        padding: 14,
                        border: isDark
                          ? "1px solid rgba(255,255,255,0.12)"
                          : "1px solid rgba(0,0,0,0.10)",
                        background: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)",
                      }}
                    >
                      <div style={{ fontWeight: 900, marginBottom: 10 }}>
                        Preview
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gap: 10,
                          fontSize: 13.5,
                          lineHeight: 1.35,
                          opacity: isDark ? 0.92 : 0.9,
                        }}
                      >
                        <div>
                          <div style={{ ...labelStyle, opacity: isDark ? 0.75 : 0.7 }}>
                            Title
                          </div>
                          <div style={{ fontWeight: 800 }}>
                            {editTitle?.trim() || "—"}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                          }}
                        >
                          <div>
                            <div style={{ ...labelStyle, opacity: isDark ? 0.75 : 0.7 }}>
                              Amount
                            </div>
                            <div style={{ fontWeight: 900, fontSize: 16 }}>
                              ₹{editAmount ? Number(editAmount || 0) : 0}
                            </div>
                          </div>

                          <div>
                            <div style={{ ...labelStyle, opacity: isDark ? 0.75 : 0.7 }}>
                              Date
                            </div>
                            <div style={{ fontWeight: 800 }}>
                              {editDate
                                ? new Date(editDate).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div style={{ ...labelStyle, opacity: isDark ? 0.75 : 0.7 }}>
                            Category
                          </div>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: isDark
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(0,0,0,0.06)",
                              border: isDark
                                ? "1px solid rgba(255,255,255,0.12)"
                                : "1px solid rgba(0,0,0,0.08)",
                              fontWeight: 800,
                              marginTop: 6,
                            }}
                          >
                            {editCategory?.trim() || "—"}
                          </div>
                        </div>

                        <div style={hintStyle}>
                          This is just a preview—your update happens only when you click{" "}
                          <b>Save Changes</b>.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                    marginTop: 6,
                    paddingTop: 12,
                    borderTop: isDark
                      ? "1px solid rgba(255,255,255,0.10)"
                      : "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeEdit}
                    style={{
                      ...buttonBase,
                      background: "transparent",
                      color: "inherit",
                      border: isDark
                        ? "1px solid rgba(255,255,255,0.18)"
                        : "1px solid rgba(0,0,0,0.14)",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    style={{
                      ...buttonBase,
                      border: "none",
                    }}
                  >
                    Save Changes
                  </button>
                </div>

                <style>{`
                  .edit-layout{
                    display: grid;
                    grid-template-columns: 1.2fr 0.8fr;
                    gap: 12px;
                    align-items: start;
                  }
                  .edit-fields{
                    display: grid;
                    gap: 12px;
                    min-width: 0;
                  }
                  .edit-row{
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    min-width: 0;
                  }
                  .edit-preview{
                    min-width: 0;
                  }

                  /* ✅ prevent overflow on iOS */
                  .edit-layout * { box-sizing: border-box; }
                  .edit-fields input, .edit-fields select {
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                  }
                  .edit-fields input[type="date"]{
                    -webkit-appearance: none;
                    appearance: none;
                  }

                  /* ✅ MOBILE: center labels + inputs */
                  @media (max-width: 620px){
                    .edit-layout{
                      grid-template-columns: 1fr;
                    }
                    .edit-row{
                      grid-template-columns: 1fr;
                    }
                    .field-block{
                      text-align: center;
                    }
                    .field-label{
                      display: block;
                      text-align: center;
                    }
                    .field-hint{
                      text-align: center;
                    }
                    .edit-fields input{
                      text-align: center;
                    }
                    .edit-fields input[type="date"]{
                      text-align: center;
                      text-align-last: center;
                    }
                  }

                  @media (max-width: 900px){
                    .edit-layout{
                      grid-template-columns: 1fr;
                    }
                  }
                `}</style>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseList;
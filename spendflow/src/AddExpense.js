import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "./api";
import { getToken } from "./auth";
import { apiFetch } from "./apiFetch";

const CATS_KEY = "spendflow-custom-categories";

/* ---------- helpers ---------- */
function normalizeCat(s) {
  return String(s || "").trim();
}

function equalsIgnoreCase(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

function loadSavedCats() {
  try {
    const raw = localStorage.getItem(CATS_KEY);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.filter(Boolean).map(normalizeCat) : [];
  } catch {
    return [];
  }
}

function saveCats(cats) {
  localStorage.setItem(CATS_KEY, JSON.stringify(cats));
}

/* ---------- component ---------- */
function AddExpense({ onAdd }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [otherCategory, setOtherCategory] = useState("");

  /* Default categories */
  const defaultCategories = useMemo(
    () => ["Food", "Transport", "Entertainment"],
    []
  );

  /* Custom categories from localStorage */
  const [customCategories, setCustomCategories] = useState(() =>
    loadSavedCats()
  );

  /* Save custom categories whenever they change */
  useEffect(() => {
    saveCats(customCategories);
  }, [customCategories]);

  /* ---------- submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalCategory =
      category === "Other"
        ? normalizeCat(otherCategory)
        : normalizeCat(category);

    if (!normalizeCat(title) || !amount || !finalCategory) return;

    /* Add new custom category if user typed one */
    if (category === "Other") {
      const allCats = [...defaultCategories, ...customCategories];
      const exists = allCats.some((c) =>
        equalsIgnoreCase(c, finalCategory)
      );

      if (!exists) {
        setCustomCategories((prev) => [...prev, finalCategory]);
      }
    }

    const expense = {
      title: normalizeCat(title),
      amount: Number(amount),
      category: finalCategory,
    };

    try {
      const token = getToken();

      /* ✅ use apiFetch so global loader works */
      const res = await apiFetch(`${API_BASE}/api/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(expense),
      });

      const data = await res.json().catch(() => ({}));

      /* ❌ stop if API failed */
      if (!res.ok) {
        console.error(data?.message || "Add expense failed");
        return;
      }

      /* ✅ only add to UI if backend succeeded */
      onAdd(data);

      /* Reset form */
      setTitle("");
      setAmount("");
      setCategory("");
      setOtherCategory("");
    } catch (err) {
      console.error("Network error while adding expense:", err);
    }
  };

  /* ---------- UI ---------- */
  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      {/* Category */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Select Category</option>

          {defaultCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}

          {customCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}

          <option value="Other">Other</option>
        </select>

        {category === "Other" && (
          <input
            type="text"
            placeholder="Enter new category"
            value={otherCategory}
            onChange={(e) => setOtherCategory(e.target.value)}
            required
            style={{ marginTop: "8px" }}
          />
        )}
      </div>

      <button type="submit" style={{ marginTop: "10px" }}>
        Add Expense
      </button>
    </form>
  );
}

export default AddExpense;

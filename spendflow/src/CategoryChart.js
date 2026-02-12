import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#6c5ce7", "#00cec9", "#fdcb6e", "#ff7675", "#74b9ff"];

function CategoryChart({ expenses }) {
  const categories = [...new Set(expenses.map((e) => e.category))];

  const data = categories.map((cat) => {
    const total = expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    return { name: cat, value: total };
  });

  if (data.length === 0) return null;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "420px",
        padding: "20px",
        borderRadius: "18px",
        background: "rgba(255, 255, 255, 0.25)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h4 style={{ marginBottom: "15px" }}>Category Breakdown</h4>

      {/* PERFECTLY CENTERED CHART */}
      <div style={{ width: "100%", height: "240px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={85}
              innerRadius={40}
              paddingAngle={4}
              isAnimationActive
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.9)",
                borderRadius: "10px",
                border: "none",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* CUSTOM LEGEND (does NOT affect centering) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "10px",
          marginTop: "15px",
        }}
      >
        {data.map((item, index) => (
          <div
            key={item.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.35)",
            }}
          >
            <span
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: COLORS[index % COLORS.length],
                borderRadius: "3px",
              }}
            />
            <span style={{ fontSize: "14px" }}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategoryChart;

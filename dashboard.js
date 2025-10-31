// ===== Theme Toggle =====
const themeToggle = document.getElementById("theme-toggle");
themeToggle.addEventListener("click", async () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );

  const transactions = await loadTransactions();
  renderCharts(transactions); // re-render charts with updated colors
});

// Default: Light mode (no class added)
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.body.classList.add("dark");
} else {
  document.body.classList.remove("dark");
  localStorage.setItem("theme", "light");
}

// ===== Data Loading =====
async function loadTransactions() {
  const stored = localStorage.getItem("financeData");
  if (stored) {
    try {
      return JSON.parse(stored).transactions || [];
    } catch {
      return [];
    }
  } else {
    const res = await fetch("data.json");
    const json = await res.json();
    return json.transactions || [];
  }
}

// ===== Summary Rendering =====
function renderSummary(transactions) {
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const net = totalIncome - totalExpense;
  const avgSave = Math.max(0, Math.round(net / 6));

  document.getElementById(
    "totalIncome"
  ).textContent = `₹${totalIncome.toLocaleString()}`;
  document.getElementById(
    "totalExpense"
  ).textContent = `₹${totalExpense.toLocaleString()}`;
  document.getElementById(
    "netBalance"
  ).textContent = `₹${net.toLocaleString()}`;
  document.getElementById(
    "avgSavings"
  ).textContent = `₹${avgSave.toLocaleString()}`;

  document.getElementById("totalTransactions").textContent =
    transactions.length;
  document.getElementById(
    "insightSavings"
  ).textContent = `₹${avgSave.toLocaleString()}`;

  // find highest expense category
  const catTotals = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
    });
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  document.getElementById("topCategory").textContent = topCat ? topCat[0] : "-";
}

// ===== Chart Colors =====
function getColors() {
  const isDark = document.body.classList.contains("dark");
  return {
    text: isDark ? "#e6eef8" : "#1f2937",
    grid: isDark ? "#2a2a3e" : "#e1e8ed",
    income: "#16a34a",
    expense: "#ef4444",
    balance: "#2563eb",
  };
}

let barChart, pieChart, lineChart;

// ===== Chart Renderers =====
function renderCharts(transactions) {
  const colors = getColors();

  const monthly = {};
  transactions.forEach((t) => {
    const month = t.date.slice(0, 7); // YYYY-MM
    if (!monthly[month]) monthly[month] = { income: 0, expense: 0 };
    monthly[month][t.type === "income" ? "income" : "expense"] += Number(
      t.amount
    );
  });

  const months = Object.keys(monthly).sort();
  const incomeData = months.map((m) => monthly[m].income);
  const expenseData = months.map((m) => monthly[m].expense);
  const balanceData = months.map(
    (m, i) =>
      incomeData.slice(0, i + 1).reduce((s, x) => s + x, 0) -
      expenseData.slice(0, i + 1).reduce((s, x) => s + x, 0)
  );

  // destroy old charts
  [barChart, pieChart, lineChart].forEach((ch) => ch && ch.destroy());

  // --- Bar Chart ---
  const barCtx = document.getElementById("barChart").getContext("2d");
  barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          backgroundColor: colors.income,
          borderRadius: 6,
        },
        {
          label: "Expense",
          data: expenseData,
          backgroundColor: colors.expense,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: colors.text } },
        tooltip: {
          enabled: true,
          backgroundColor: "#1f2937",
          titleColor: "#ffffff",
          bodyColor: "#e5e7eb",
          borderColor: "#374151",
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: (c) => `${c.dataset.label}: ₹${c.parsed.y.toLocaleString()}`,
          },
        },
      },
      interaction: {
        mode: "nearest", // detect nearest point, not just x-axis
        intersect: false, // allow hover even if not directly on bar
      },
      hover: {
        mode: "nearest",
        intersect: false,
      },
      scales: {
        x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
        y: { ticks: { color: colors.text }, grid: { color: colors.grid } },
      },
    },
  });

  // --- Pie Chart ---
  const catTotals = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
    });
  const catLabels = Object.keys(catTotals);
  const catValues = Object.values(catTotals);

  const pieCtx = document.getElementById("pieChart").getContext("2d");
  pieChart = new Chart(pieCtx, {
    type: "doughnut",
    data: {
      labels: catLabels,
      datasets: [
        {
          data: catValues,
          backgroundColor: [
            "#ef4444",
            "#f97316",
            "#facc15",
            "#22c55e",
            "#3b82f6",
            "#8b5cf6",
          ],
          borderColor: "transparent",
        },
      ],
    },
    options: {
      plugins: {
        legend: { position: "bottom", labels: { color: colors.text } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = catValues.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return `${ctx.label}: ₹${ctx.parsed.toLocaleString()} (${pct}%)`;
            },
          },
        },
      },
    },
  });

  // --- Line Chart ---
  const lineCtx = document.getElementById("lineChart").getContext("2d");
  lineChart = new Chart(lineCtx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Balance Over Time",
          data: balanceData,
          borderColor: colors.balance,
          backgroundColor: colors.balance + "20",
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: colors.balance,
        },
      ],
    },
    options: {
      plugins: {
        legend: { labels: { color: colors.text } },
        tooltip: {
          callbacks: { label: (c) => `₹${c.parsed.y.toLocaleString()}` },
        },
      },
      scales: {
        x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
        y: { ticks: { color: colors.text }, grid: { color: colors.grid } },
      },
    },
  });
}

// ===== Init =====
loadTransactions().then((transactions) => {
  renderSummary(transactions);
  renderCharts(transactions);
});

const LS_KEY = "financeData";
let data = { transactions: [] };
let editId = null;
let filters = { start: null, end: null, category: "" };
let sortState = { column: null, order: null };

/* ====== Initialization ====== */
const totalIncomeEl = document.getElementById("total-income");
const totalExpenseEl = document.getElementById("total-expense");
const incomeLeftEl = document.getElementById("income-left");
const savingRateEl = document.getElementById("saving-rate");
const tbody = document.getElementById("transaction-body");
const noData = document.getElementById("no-data");

const addBtn = document.getElementById("add-transaction");
const modal = document.getElementById("modal");
const cancelModal = document.getElementById("cancel-modal");
const form = document.getElementById("transaction-form");
const tDate = document.getElementById("t-date");
const tType = document.getElementById("t-type");
const tCategorySelect = document.getElementById("t-category-select");
const tCategoryOther = document.getElementById("t-category-other");
const tAmount = document.getElementById("t-amount");
const tDesc = document.getElementById("t-desc");

const filterModal = document.getElementById("filter-modal");
const openFilter = document.getElementById("open-filter");
const cancelFilter = document.getElementById("cancel-filter");
const filterForm = document.getElementById("filter-form");
const filterStart = document.getElementById("filter-start");
const filterEnd = document.getElementById("filter-end");
const filterCategory = document.getElementById("filter-category");

const resetBtn = document.getElementById("reset-data");
const themeToggle = document.getElementById("theme-toggle");

/* ====== Load from localStorage or data.json ====== */
function loadFromLocal() {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try {
      data = JSON.parse(raw);
      if (!Array.isArray(data.transactions)) data.transactions = [];
    } catch (e) {
      data = { transactions: [] };
    }
    renderAll();
  } else {
    // attempt to load data.json (optional initial file)
    fetch("data.json")
      .then((r) => {
        if (!r.ok) throw new Error("no seed file");
        return r.json();
      })
      .then((json) => {
        // Expecting { transactions: [...] } or similar
        if (json && Array.isArray(json.transactions)) {
          data.transactions = json.transactions;
          saveLocal();
        } else {
          data.transactions = [];
        }
      })
      .catch(() => {
        data.transactions = [];
      })
      .finally(() => renderAll());
  }
}

function saveLocal() {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

/* ====== Totals & Rendering ====== */
function calcTotals(list = data.transactions) {
  const totalIncome = list
    .filter((t) => t.type === "income")
    .reduce((s, x) => s + Number(x.amount || 0), 0);
  const totalExpense = list
    .filter((t) => t.type === "expense")
    .reduce((s, x) => s + Number(x.amount || 0), 0);
  const incomeLeft = totalIncome - totalExpense;
  const savingRate =
    totalIncome > 0 ? Math.round((incomeLeft / totalIncome) * 100) : 0;
  return { totalIncome, totalExpense, incomeLeft, savingRate };
}

function renderSummary(list) {
  const { totalIncome, totalExpense, incomeLeft, savingRate } =
    calcTotals(list);
  totalIncomeEl.textContent = `₹${formatNum(totalIncome)}`;
  totalExpenseEl.textContent = `₹${formatNum(totalExpense)}`;
  incomeLeftEl.textContent = `₹${formatNum(incomeLeft)}`;
  savingRateEl.textContent = `${savingRate}%`;
}

function formatNum(n) {
  const neg = n < 0;
  const abs = Math.abs(n);
  const formatted = Number(abs).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: abs % 1 ? 2 : 0,
  });
  return (neg ? "-" : "") + formatted;
}

function renderTable(list = data.transactions) {
  tbody.innerHTML = "";
  if (!list.length) {
    noData.style.display = "block";
    return;
  }
  noData.style.display = "none";

  list.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${escapeHtml(t.category)}</td>
      <td>${escapeHtml(t.description || "-")}</td>
      <td>₹${formatNum(Number(t.amount))}</td>
      <td>${t.type}</td>
      <td class="center actions">
        <button class="edit" data-id="${t.id}">Edit</button>
        <button class="delete" data-id="${t.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAll(list = data.transactions) {
  renderTable(list);
  renderSummary(list);
}

/* ====== Modal / CRUD ====== */
function openModal(editData = null) {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  if (editData) {
    document.getElementById("modal-title").textContent = "Edit Transaction";
    tDate.value = editData.date;
    tType.value = editData.type;
    // select category or show other
    const cats = Array.from(tCategorySelect.options).map((o) => o.value);
    if (cats.includes(editData.category)) {
      tCategorySelect.value = editData.category;
      tCategoryOther.style.display = "none";
    } else {
      tCategorySelect.value = "Other";
      tCategoryOther.style.display = "block";
      tCategoryOther.value = editData.category;
    }
    tAmount.value = editData.amount;
    tDesc.value = editData.description || "";
    editId = editData.id;
  } else {
    document.getElementById("modal-title").textContent = "Add Transaction";
    form.reset();
    tCategoryOther.style.display = "none";
    editId = null;
    // default date today
    const d = new Date();
    tDate.value = d.toISOString().slice(0, 10);
  }
}

function closeModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  editId = null;
}

tCategorySelect.addEventListener("change", () => {
  if (tCategorySelect.value === "Other") {
    tCategoryOther.style.display = "block";
    tCategoryOther.focus();
  } else {
    tCategoryOther.style.display = "none";
    tCategoryOther.value = "";
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  // get category (handle Other)
  let category = tCategorySelect.value;
  if (category === "Other") {
    const other = tCategoryOther.value.trim();
    if (!other) return alert("Please enter a custom category.");
    category = other;
  }
  const obj = {
    id: editId || Date.now().toString(),
    date: tDate.value,
    type: tType.value,
    category,
    amount: Number(tAmount.value),
    description: tDesc.value.trim(),
  };

  if (editId) {
    const idx = data.transactions.findIndex((x) => x.id === editId);
    if (idx !== -1) data.transactions[idx] = obj;
  } else {
    data.transactions.push(obj);
  }
  saveLocal();
  renderAll();
  closeModal();
});

/* ====== Edit / Delete Delegation ====== */
tbody.addEventListener("click", (e) => {
  if (e.target.classList.contains("edit")) {
    const id = e.target.dataset.id;
    const found = data.transactions.find((x) => x.id === id);
    if (found) openModal(found);
  } else if (e.target.classList.contains("delete")) {
    const id = e.target.dataset.id;
    if (confirm("Delete this transaction?")) {
      data.transactions = data.transactions.filter((x) => x.id !== id);
      saveLocal();
      renderAll();
    }
  }
});

/* ====== Filter ====== */
// applyFilter.addEventListener("click", () => {
//   const s = startDate.value ? new Date(startDate.value) : null;
//   const e = endDate.value ? new Date(endDate.value) : null;
//   if (!s && !e) return alert("Pick a start and/or end date to filter.");
//   const filtered = data.transactions.filter((t) => {
//     const d = new Date(t.date + "T00:00:00");
//     if (s && d < s) return false;
//     if (e) {
//       const dayEnd = new Date(e);
//       dayEnd.setHours(23, 59, 59, 999);
//       if (d > dayEnd) return false;
//     }
//     return true;
//   });
//   startDate.classList.add("active-filter");
//   endDate.classList.add("active-filter");
//   renderAll(filtered);
// });
// clearFilter.addEventListener("click", () => {
//   startDate.value = "";
//   endDate.value = "";
//   startDate.classList.remove("active-filter");
//   endDate.classList.remove("active-filter");
//   renderAll();
// });

/* ====== Reset Data ====== */
resetBtn.addEventListener("click", () => {
  if (!confirm("This will clear all saved data. Proceed?")) return;
  localStorage.removeItem(LS_KEY);
  data = { transactions: [] };
  renderAll();
});

/* ====== Theme Toggle ====== */
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

/* ====== Helpers ====== */
function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ====== Init ====== */
document
  .getElementById("add-transaction")
  .addEventListener("click", () => openModal());
cancelModal.addEventListener("click", () => closeModal());
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

/* ====== Filter Modal ====== */
openFilter.addEventListener("click", () => {
  filterModal.classList.add("show");
});
cancelFilter.addEventListener("click", () => {
  filterModal.classList.remove("show");
});
filterModal.addEventListener("click", (e) => {
  if (e.target === filterModal) filterModal.classList.remove("show");
});

filterForm.addEventListener("submit", (e) => {
  e.preventDefault();
  filters.start = filterStart.value ? new Date(filterStart.value) : null;
  filters.end = filterEnd.value ? new Date(filterEnd.value) : null;
  filters.category = filterCategory.value;
  applyFiltersAndSort();
  filterModal.classList.remove("show");
});

document.getElementById("clear-filter").addEventListener("click", () => {
  filters = { start: null, end: null, category: "" };
  filterStart.value = "";
  filterEnd.value = "";
  filterCategory.value = "";
  applyFiltersAndSort();
  filterModal.classList.remove("show");
});

/* ====== Sorting ====== */
const sortDateBtn = document.getElementById("sort-date");
const sortAmountBtn = document.getElementById("sort-amount");

sortDateBtn.addEventListener("click", () => handleSortClick("date"));
sortAmountBtn.addEventListener("click", () => handleSortClick("amount"));

function handleSortClick(col) {
  if (sortState.column !== col) {
    sortState = { column: col, order: "asc" };
  } else if (sortState.order === "asc") {
    sortState.order = "desc";
  } else if (sortState.order === "desc") {
    sortState = { column: null, order: null };
  } else {
    sortState.order = "asc";
  }

  updateSortIcons();
  applyFiltersAndSort(); // always reload from localStorage
}

function updateSortIcons() {
  const icons = { asc: "↑", desc: "↓", none: "⬍" };

  // Handle date icon
  if (sortState.column === "date") {
    sortDateBtn.textContent = icons[sortState.order] || icons.none;
  } else {
    sortDateBtn.textContent = icons.none;
  }

  // Handle amount icon
  if (sortState.column === "amount") {
    sortAmountBtn.textContent = icons[sortState.order] || icons.none;
  } else {
    sortAmountBtn.textContent = icons.none;
  }
}

function applyFiltersAndSort() {
  let localData = { transactions: [] };
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.transactions)) {
        localData = parsed;
      }
    }
  } catch (err) {
    console.warn("Error reading localStorage:", err);
  }

  let list = Array.isArray(localData.transactions)
    ? [...localData.transactions]
    : [];

  // Filters
  list = list.filter((t) => {
    const d = new Date(t.date + "T00:00:00");
    if (filters.start && d < filters.start) return false;
    if (filters.end && d > filters.end) return false;
    if (filters.category && t.category !== filters.category) return false;
    return true;
  });

  // === Sorting ===
  if (sortState.column && sortState.order) {
    const dir = sortState.order === "asc" ? 1 : -1;

    if (sortState.column === "date") {
      list.sort((a, b) => {
        const da = new Date(a.date + "T00:00:00");
        const db = new Date(b.date + "T00:00:00");
        return dir * (da - db);
      });
    } else if (sortState.column === "amount") {
      list.sort((a, b) => dir * (a.amount - b.amount));
    }
  } else {
    // ✅ Neutral state — restore original order (as stored)
    list.sort((a, b) => {
      const ida = Number(a.id);
      const idb = Number(b.id);
      return ida - idb; // oldest first (original insertion order)
    });
  }

  renderAll(list);
}

function resetSortState() {
  sortState = { column: null, order: null };
  updateSortIcons();
  applyFiltersAndSort(); // re-render with neutral data
}

loadFromLocal();
resetSortState(); // ⬍ icon visible but no sorting applied

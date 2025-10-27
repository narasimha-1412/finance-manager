let data = { income: 0, transactions: [] };
let editId = null;

const totalIncome = document.getElementById("total-income");
const totalExpense = document.getElementById("total-expense");
const incomeLeft = document.getElementById("income-left");
const savingRate = document.getElementById("saving-rate");
const tbody = document.getElementById("transaction-body");
const noData = document.getElementById("no-data");

const incomeInput = document.getElementById("income-input");
const setIncome = document.getElementById("set-income");
const addTransactionBtn = document.getElementById("add-transaction");

const modal = document.getElementById("modal");
const cancelModal = document.getElementById("cancel-modal");
const form = document.getElementById("transaction-form");
const tDate = document.getElementById("t-date");
const tCategory = document.getElementById("t-category");
const tAmount = document.getElementById("t-amount");
const tType = document.getElementById("t-type");

const startDate = document.getElementById("start-date");
const endDate = document.getElementById("end-date");
const applyFilter = document.getElementById("apply-filter");
const clearFilter = document.getElementById("clear-filter");

const themeToggle = document.getElementById("theme-toggle");

// Summary update
function updateSummary(list = data.transactions) {
  const totalExp = list
    .filter((t) => t.type === "expense")
    .reduce((a, b) => a + +b.amount, 0);
  const totalInc = data.income;
  const left = Math.max(0, totalInc - totalExp);
  const rate = totalInc ? Math.round((left / totalInc) * 100) : 0;

  totalIncome.textContent = `₹${totalInc}`;
  totalExpense.textContent = `₹${totalExp}`;
  incomeLeft.textContent = `₹${left}`;
  savingRate.textContent = `${rate}%`;
}

// Table render
function renderTable(list = data.transactions) {
  tbody.innerHTML = "";
  if (list.length === 0) {
    noData.style.display = "block";
    return;
  }
  noData.style.display = "none";
  list.forEach((t) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${t.date}</td>
      <td>${t.category}</td>
      <td>₹${t.amount}</td>
      <td>${t.type}</td>
      <td class="actions">
        <button class="edit" data-id="${t.id}">Edit</button>
        <button class="delete" data-id="${t.id}">Delete</button>
      </td>`;
    tbody.appendChild(row);
  });
}

function renderAll() {
  renderTable();
  updateSummary();
}

// CRUD
function openModal(editData = null) {
  modal.classList.add("show");
  if (editData) {
    document.getElementById("modal-title").textContent = "Edit Transaction";
    tDate.value = editData.date;
    tCategory.value = editData.category;
    tAmount.value = editData.amount;
    tType.value = editData.type;
    editId = editData.id;
  } else {
    document.getElementById("modal-title").textContent = "Add Transaction";
    form.reset();
    editId = null;
  }
}
function closeModal() {
  modal.classList.remove("show");
}

setIncome.onclick = () => {
  const val = +incomeInput.value;
  if (!val) return alert("Enter valid income");
  data.income = val;
  incomeInput.value = "";
  renderAll();
};

addTransactionBtn.onclick = () => openModal();
cancelModal.onclick = () => closeModal();

form.onsubmit = (e) => {
  e.preventDefault();
  const newData = {
    id: editId || Date.now().toString(),
    date: tDate.value,
    category: tCategory.value,
    amount: +tAmount.value,
    type: tType.value,
  };
  if (editId) {
    const index = data.transactions.findIndex((t) => t.id === editId);
    data.transactions[index] = newData;
  } else {
    data.transactions.push(newData);
  }
  closeModal();
  renderAll();
};

// Edit/Delete
tbody.onclick = (e) => {
  if (e.target.classList.contains("edit")) {
    const id = e.target.dataset.id;
    const trans = data.transactions.find((t) => t.id === id);
    openModal(trans);
  }
  if (e.target.classList.contains("delete")) {
    const id = e.target.dataset.id;
    if (confirm("Delete this transaction?")) {
      data.transactions = data.transactions.filter((t) => t.id !== id);
      renderAll();
    }
  }
};

// Filter
applyFilter.onclick = () => {
  const s = startDate.value ? new Date(startDate.value) : null;
  const e = endDate.value ? new Date(endDate.value) : null;
  const filtered = data.transactions.filter((t) => {
    const d = new Date(t.date);
    return (!s || d >= s) && (!e || d <= e);
  });
  renderTable(filtered);
  updateSummary(filtered);
  startDate.classList.add("active-filter");
  endDate.classList.add("active-filter");
};

clearFilter.onclick = () => {
  startDate.value = "";
  endDate.value = "";
  startDate.classList.remove("active-filter");
  endDate.classList.remove("active-filter");
  renderAll();
};

// Theme
themeToggle.onclick = () => {
  document.body.classList.toggle("dark");
};

// Initialize
window.onload = () => {
  renderAll();
};

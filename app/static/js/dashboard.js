const state = {
  categoryChart: null,
  periodChart: null,
  currency: "EUR",
  categoryRows: [],
  periodRows: [],
};

const expenseTypes = new Set(["gasto", "gastos", "expense", "egreso", "egresos"]);
const incomeTypes = new Set(["ingreso", "ingresos", "income"]);

const elements = {
  connectionStatus: document.querySelector("#connectionStatus"),
  themeToggle: document.querySelector("#themeToggle"),
  totalExpenses: document.querySelector("#totalExpenses"),
  totalIncome: document.querySelector("#totalIncome"),
  monthBalance: document.querySelector("#monthBalance"),
  movementCount: document.querySelector("#movementCount"),
  startDate: document.querySelector("#startDate"),
  endDate: document.querySelector("#endDate"),
  categoryFilter: document.querySelector("#categoryFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  periodFilter: document.querySelector("#periodFilter"),
  applyFilters: document.querySelector("#applyFilters"),
  resetFilters: document.querySelector("#resetFilters"),
  categoryTotal: document.querySelector("#categoryTotal"),
  categoryEmpty: document.querySelector("#categoryEmpty"),
  periodEmpty: document.querySelector("#periodEmpty"),
  tableCount: document.querySelector("#tableCount"),
  movementsTable: document.querySelector("#movementsTable"),
  tableEmpty: document.querySelector("#tableEmpty"),
};

function getStoredTheme() {
  return localStorage.getItem("dashboard-theme") || "dark";
}

function applyTheme(theme) {
  const normalizedTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = normalizedTheme;
  localStorage.setItem("dashboard-theme", normalizedTheme);
  const targetTheme = normalizedTheme === "dark" ? "claro" : "oscuro";
  elements.themeToggle.setAttribute("aria-label", `Cambiar a modo ${targetTheme}`);
  elements.themeToggle.title = `Cambiar a modo ${targetTheme}`;
  elements.themeToggle.setAttribute("aria-pressed", String(normalizedTheme === "dark"));

  if (state.categoryChart) renderCategoryChart(state.categoryRows);
  if (state.periodChart) renderPeriodChart(state.periodRows);
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function formatCurrency(value, currency = state.currency) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(number);
}

function formatDate(value) {
  if (!value) return "-";
  const normalizedValue = String(value).includes("T") ? value : String(value).replace(" ", "T");
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(normalizedValue));
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end),
  };
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setConnectionStatus(status, text) {
  elements.connectionStatus.textContent = text;
  elements.connectionStatus.className = `status-pill ${status}`;
}

function buildParams({ includeType = true } = {}) {
  const params = new URLSearchParams();

  if (elements.startDate.value) params.set("start_date", elements.startDate.value);
  if (elements.endDate.value) params.set("end_date", elements.endDate.value);
  if (elements.categoryFilter.value) params.set("category", elements.categoryFilter.value);
  if (includeType && elements.typeFilter.value) params.set("type", elements.typeFilter.value);

  return params;
}

async function fetchJson(path, params = null) {
  const query = params && params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${path}${query}`);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Error HTTP ${response.status}`);
  }

  return response.json();
}

async function loadSummary() {
  const summary = await fetchJson("/api/summary/month");
  state.currency = summary.currency || "EUR";
  elements.totalExpenses.textContent = formatCurrency(summary.total_expenses);
  elements.totalIncome.textContent = formatCurrency(summary.total_income);
  elements.monthBalance.textContent = formatCurrency(summary.balance);
  elements.movementCount.textContent = summary.movement_count ?? 0;
}

async function loadOptions() {
  const [categories, types] = await Promise.all([
    fetchJson("/api/categories"),
    fetchJson("/api/types"),
  ]);

  elements.categoryFilter.replaceChildren(new Option("Todas", ""));
  categories.forEach((item) => {
    elements.categoryFilter.append(new Option(item.category, item.category));
  });

  elements.typeFilter.replaceChildren(new Option("Todos", ""));
  types.forEach((item) => {
    elements.typeFilter.append(new Option(item.type, item.type));
  });
}

function chartColors(count) {
  const palette = [
    cssVar("--expense"),
    cssVar("--income"),
    cssVar("--balance"),
    cssVar("--accent"),
    "#b891ff",
    "#56c7d8",
    "#f49d6e",
    "#b8c46f",
  ];
  return Array.from({ length: count }, (_, index) => palette[index % palette.length]);
}

function setEmptyState(element, isVisible) {
  element.classList.toggle("visible", isVisible);
}

function renderCategoryChart(rows) {
  state.categoryRows = rows;
  const labels = rows.map((row) => row.category);
  const values = rows.map((row) => Number(row.total));
  const total = values.reduce((sum, value) => sum + value, 0);
  elements.categoryTotal.textContent = rows.length ? formatCurrency(total) : "";
  setEmptyState(elements.categoryEmpty, rows.length === 0);

  if (state.categoryChart) state.categoryChart.destroy();

  state.categoryChart = new Chart(document.querySelector("#categoryChart"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: chartColors(values.length),
        borderColor: cssVar("--surface"),
        borderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            color: cssVar("--muted"),
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${formatCurrency(context.parsed)}`,
          },
        },
      },
      cutout: "62%",
    },
  });
}

function renderPeriodChart(rows) {
  state.periodRows = rows;
  const labels = rows.map((row) => row.period);
  const values = rows.map((row) => Number(row.total));
  setEmptyState(elements.periodEmpty, rows.length === 0);

  if (state.periodChart) state.periodChart.destroy();

  state.periodChart = new Chart(document.querySelector("#periodChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Gasto",
        data: values,
        backgroundColor: cssVar("--balance"),
        borderRadius: 6,
        maxBarThickness: 34,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: cssVar("--muted") },
        },
        y: {
          beginAtZero: true,
          grid: { color: cssVar("--chart-grid") },
          ticks: {
            color: cssVar("--muted"),
            callback: (value) => formatCurrency(value),
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatCurrency(context.parsed.y),
          },
        },
      },
    },
  });
}

function movementTypeClass(type) {
  const normalized = String(type || "").toLowerCase();
  if (expenseTypes.has(normalized)) return "type-expense";
  if (incomeTypes.has(normalized)) return "type-income";
  return "type-other";
}

function renderMovements(rows) {
  elements.movementsTable.replaceChildren();
  elements.tableCount.textContent = `${rows.length} mostrados`;
  setEmptyState(elements.tableEmpty, rows.length === 0);

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const typeClass = movementTypeClass(row.tipo);
    const category = row.categoria || "Sin categoria";
    const concept = row.concepto || row.nota || "-";
    const cells = [
      formatDate(row.created_at),
      row.tipo || "-",
      category,
      concept,
      row.cuenta || row.metodo_pago || "-",
      formatCurrency(row.cantidad, row.moneda || state.currency),
    ];

    cells.forEach((value, index) => {
      const td = document.createElement("td");

      if (index === 1) {
        const badge = document.createElement("span");
        badge.className = `type-badge ${typeClass}`;
        badge.textContent = value;
        td.append(badge);
      } else {
        td.textContent = value;
      }

      if (index === 3) {
        td.className = "concept";
        td.title = value;
      }

      if (index === 5) {
        td.className = "amount-cell";
      }

      tr.append(td);
    });

    elements.movementsTable.append(tr);
  });
}

async function loadDashboardData() {
  setConnectionStatus("", "Actualizando");

  const movementParams = buildParams();
  movementParams.set("limit", "50");

  const expenseParams = buildParams({ includeType: false });
  const periodParams = buildParams({ includeType: false });
  periodParams.set("period", elements.periodFilter.value);

  const [categoryRows, periodRows, movementRows] = await Promise.all([
    fetchJson("/api/expenses/by-category", expenseParams),
    fetchJson("/api/expenses/by-period", periodParams),
    fetchJson("/api/movements", movementParams),
  ]);

  renderCategoryChart(categoryRows);
  renderPeriodChart(periodRows);
  renderMovements(movementRows);
  setConnectionStatus("ok", "Conectado");
}

async function initializeDashboard() {
  const range = getCurrentMonthRange();
  elements.startDate.value = range.start;
  elements.endDate.value = range.end;

  try {
    await fetchJson("/api/db-health");
    await Promise.all([loadSummary(), loadOptions()]);
    await loadDashboardData();
  } catch (error) {
    console.error(error);
    setConnectionStatus("error", "Sin conexion");
  }
}

elements.applyFilters.addEventListener("click", () => {
  loadDashboardData().catch((error) => {
    console.error(error);
    setConnectionStatus("error", "Error");
  });
});

elements.resetFilters.addEventListener("click", () => {
  const range = getCurrentMonthRange();
  elements.startDate.value = range.start;
  elements.endDate.value = range.end;
  elements.categoryFilter.value = "";
  elements.typeFilter.value = "";
  elements.periodFilter.value = "day";
  loadDashboardData().catch((error) => {
    console.error(error);
    setConnectionStatus("error", "Error");
  });
});

elements.periodFilter.addEventListener("change", () => {
  loadDashboardData().catch((error) => {
    console.error(error);
    setConnectionStatus("error", "Error");
  });
});

elements.themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

applyTheme(getStoredTheme());
initializeDashboard();

const state = {
  categoryChart: null,
  periodChart: null,
  currency: "EUR",
  categoryRows: [],
  periodRows: [],
  banks: [],
};

const expenseTypes = new Set(["gasto", "gastos", "expense", "egreso", "egresos"]);
const incomeTypes = new Set(["ingreso", "ingresos", "income"]);
const fallbackBanks = [
  { id: "fallback-ing", name: "ING", logo_url: "/static/vendor/banks/ing.svg" },
  { id: "fallback-santander", name: "Santander", logo_url: "/static/vendor/banks/santander.svg" },
  { id: "fallback-bbva", name: "BBVA", logo_url: "/static/vendor/banks/bbva.svg" },
  { id: "fallback-caixabank", name: "CaixaBank", logo_url: "/static/vendor/banks/caixabank.svg" },
  { id: "fallback-sabadell", name: "Banco Sabadell", logo_url: "/static/vendor/banks/sabadell.svg" },
  { id: "fallback-bankinter", name: "Bankinter", logo_url: "/static/vendor/banks/bankinter.svg" },
  { id: "fallback-openbank", name: "Openbank", logo_url: "/static/vendor/banks/openbank.svg" },
  { id: "fallback-revolut", name: "Revolut", logo_url: "/static/vendor/banks/revolut.svg" },
  { id: "fallback-n26", name: "N26", logo_url: "/static/vendor/banks/n26.svg" },
  { id: "fallback-unicaja", name: "Unicaja", logo_url: "/static/vendor/banks/unicaja.svg" },
];

const elements = {
  loginView: document.querySelector("#loginView"),
  loginForm: document.querySelector("#loginForm"),
  loginUser: document.querySelector("#loginUser"),
  loginPassword: document.querySelector("#loginPassword"),
  loginMessage: document.querySelector("#loginMessage"),
  connectionStatus: document.querySelector("#connectionStatus"),
  logoutButton: document.querySelector("#logoutButton"),
  themeToggle: document.querySelector("#themeToggle"),
  totalExpenses: document.querySelector("#totalExpenses"),
  totalIncome: document.querySelector("#totalIncome"),
  monthBalance: document.querySelector("#monthBalance"),
  movementCount: document.querySelector("#movementCount"),
  dailyAverage: document.querySelector("#dailyAverage"),
  annualExpenses: document.querySelector("#annualExpenses"),
  monthFilter: document.querySelector("#monthFilter"),
  startDate: document.querySelector("#startDate"),
  endDate: document.querySelector("#endDate"),
  categoryFilter: document.querySelector("#categoryFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  periodFilter: document.querySelector("#periodFilter"),
  applyFilters: document.querySelector("#applyFilters"),
  resetFilters: document.querySelector("#resetFilters"),
  exportExcel: document.querySelector("#exportExcel"),
  integrationPanel: document.querySelector("#integrationPanel"),
  n8nStatus: document.querySelector("#n8nStatus"),
  n8nEndpoint: document.querySelector("#n8nEndpoint"),
  n8nHeader: document.querySelector("#n8nHeader"),
  n8nKeyState: document.querySelector("#n8nKeyState"),
  n8nExample: document.querySelector("#n8nExample"),
  copyN8nEndpoint: document.querySelector("#copyN8nEndpoint"),
  copyN8nExample: document.querySelector("#copyN8nExample"),
  toggleMovementForm: document.querySelector("#toggleMovementForm"),
  movementEditor: document.querySelector("#movementEditor"),
  movementForm: document.querySelector("#movementForm"),
  movementFormMode: document.querySelector("#movementFormMode"),
  movementId: document.querySelector("#movementId"),
  movementType: document.querySelector("#movementType"),
  movementAmount: document.querySelector("#movementAmount"),
  movementDate: document.querySelector("#movementDate"),
  movementCategory: document.querySelector("#movementCategory"),
  movementSubcategory: document.querySelector("#movementSubcategory"),
  movementConcept: document.querySelector("#movementConcept"),
  movementPayment: document.querySelector("#movementPayment"),
  movementAccount: document.querySelector("#movementAccount"),
  openBanksPanel: document.querySelector("#openBanksPanel"),
  movementNote: document.querySelector("#movementNote"),
  movementMessage: document.querySelector("#movementMessage"),
  cancelEdit: document.querySelector("#cancelEdit"),
  categoryTotal: document.querySelector("#categoryTotal"),
  categoryEmpty: document.querySelector("#categoryEmpty"),
  periodEmpty: document.querySelector("#periodEmpty"),
  tableCount: document.querySelector("#tableCount"),
  movementsTable: document.querySelector("#movementsTable"),
  tableEmpty: document.querySelector("#tableEmpty"),
  banksModal: document.querySelector("#banksModal"),
  closeBanksPanel: document.querySelector("#closeBanksPanel"),
  bankForm: document.querySelector("#bankForm"),
  bankId: document.querySelector("#bankId"),
  bankName: document.querySelector("#bankName"),
  bankLogo: document.querySelector("#bankLogo"),
  bankMessage: document.querySelector("#bankMessage"),
  bankList: document.querySelector("#bankList"),
  cancelBankEdit: document.querySelector("#cancelBankEdit"),
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

  if (response.status === 401) {
    showLogin();
    throw new Error("No autenticado");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Error HTTP ${response.status}`);
  }

  return response.json();
}

async function loadSummary() {
  const monthParams = selectedMonthParams();
  const insights = await fetchJson("/api/insights/month", monthParams);
  const summary = insights.current;
  state.currency = summary.currency || "EUR";
  elements.totalExpenses.textContent = formatCurrency(summary.total_expenses);
  elements.totalIncome.textContent = formatCurrency(summary.total_income);
  elements.monthBalance.textContent = formatCurrency(summary.balance);
  elements.movementCount.textContent = summary.movement_count ?? 0;
  elements.dailyAverage.textContent = formatCurrency(insights.average_daily_expense);
  elements.annualExpenses.textContent = formatCurrency(insights.annual.annual_expenses);
}

function selectedMonthParams() {
  const params = new URLSearchParams();
  if (elements.monthFilter.value) {
    const [year, month] = elements.monthFilter.value.split("-");
    params.set("year", year);
    params.set("month", String(Number(month)));
  }
  return params;
}

async function loadOptions() {
  const [categories, types] = await Promise.all([
    fetchJson("/api/categories"),
    fetchJson("/api/types"),
  ]);
  let banks = fallbackBanks;
  try {
    banks = await fetchJson("/api/banks");
  } catch (error) {
    console.warn("Usando bancos locales de reserva", error);
  }

  elements.categoryFilter.replaceChildren(new Option("Todas", ""));
  categories.forEach((item) => {
    elements.categoryFilter.append(new Option(item.category, item.category));
  });

  elements.typeFilter.replaceChildren(new Option("Todos", ""));
  types.forEach((item) => {
    elements.typeFilter.append(new Option(item.type, item.type));
  });

  state.banks = banks;
  renderBankDropdown();
  renderBankList();
}

function integrationExampleJson() {
  return JSON.stringify(
    {
      tipo: "gasto",
      cantidad: 12.5,
      moneda: "EUR",
      categoria: "comida",
      subcategoria: "restaurante",
      concepto: "Menu diario",
      metodo_pago: "tarjeta",
      cuenta: "BBVA",
      nota: "Creado desde n8n",
      created_at: "2026-05-14T14:30:00",
    },
    null,
    2,
  );
}

async function loadIntegrationStatus() {
  try {
    const status = await fetchJson("/api/integrations/status");
    elements.integrationPanel.classList.toggle("ready", status.api_key_configured);
    elements.integrationPanel.setAttribute("aria-hidden", String(status.api_key_configured));
    elements.n8nEndpoint.value = status.n8n_endpoint_url;
    elements.n8nHeader.textContent = `${status.api_key_header}: tu INTEGRATION_API_KEY`;
    elements.n8nKeyState.textContent = status.api_key_configured ? "Configurada" : "Pendiente en .env";
    elements.n8nStatus.textContent = status.api_key_configured ? "Lista" : "Falta API key";
    elements.n8nStatus.className = `status-pill ${status.api_key_configured ? "ok" : "error"}`;
  } catch (error) {
    console.error(error);
    elements.integrationPanel.classList.remove("ready");
    elements.integrationPanel.setAttribute("aria-hidden", "false");
    elements.n8nStatus.textContent = "No disponible";
    elements.n8nStatus.className = "status-pill error";
  }
  elements.n8nExample.value = integrationExampleJson();
}

async function copyText(value, button, confirmationText) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
  } else {
    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.left = "-9999px";
    document.body.append(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }
  const previous = button.textContent;
  button.textContent = confirmationText;
  window.setTimeout(() => {
    button.textContent = previous;
  }, 1400);
}

function bankInitials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function bankLogoNode(bank) {
  if (bank.logo_url) {
    const image = document.createElement("img");
    image.className = "bank-logo";
    image.src = bank.logo_url;
    image.alt = "";
    image.onerror = () => {
      image.replaceWith(bankFallbackNode(bank.name));
    };
    return image;
  }
  return bankFallbackNode(bank.name);
}

function bankFallbackNode(name) {
  const fallback = document.createElement("span");
  fallback.className = "bank-fallback";
  fallback.textContent = bankInitials(name);
  return fallback;
}

function renderBankDropdown(extraValue = "") {
  const selectedValue = extraValue || elements.movementAccount.value;
  elements.movementAccount.replaceChildren(new Option("Selecciona un banco", ""));

  state.banks.forEach((bank) => {
    elements.movementAccount.append(new Option(bank.name, bank.name));
  });

  if (selectedValue && !state.banks.some((bank) => bank.name === selectedValue)) {
    elements.movementAccount.append(new Option(selectedValue, selectedValue));
  }

  elements.movementAccount.value = selectedValue || "";
}

function renderBankSelect(extraValue = "") {
  return renderBankDropdown(extraValue);
  const selectedValue = extraValue || elements.movementAccount.value;
  elements.movementAccount.replaceChildren(new Option("Selecciona un banco", ""));
  if (!state.banks.length) {
    const empty = document.createElement("button");
    empty.type = "button";
    empty.className = "bank-card";
    empty.textContent = "Añadir banco";
    empty.addEventListener("click", openBanksModal);
    elements.bankRail.append(empty);
    return;
  }

  state.banks.forEach((bank) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `bank-card ${elements.movementAccount.value === bank.name ? "selected" : ""}`;
    button.append(bankLogoNode(bank));

    const name = document.createElement("span");
    name.className = "bank-name";
    name.textContent = bank.name;
    button.append(name);

    button.addEventListener("click", () => selectBank(bank.name));
    elements.bankRail.append(button);
  });
}

function selectBank(name) {
  elements.movementAccount.value = name;
  renderBankDropdown(name);
}

function renderBankList() {
  elements.bankList.replaceChildren();
  state.banks.forEach((bank) => {
    const row = document.createElement("div");
    row.className = "bank-row";
    row.append(bankLogoNode(bank));

    const name = document.createElement("strong");
    name.textContent = bank.name;
    row.append(name);

    const actions = document.createElement("div");
    actions.className = "actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary";
    edit.textContent = "Editar";
    edit.addEventListener("click", () => fillBankForm(bank));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary";
    remove.textContent = "Ocultar";
    remove.disabled = String(bank.id).startsWith("fallback-");
    remove.addEventListener("click", () => deleteBank(bank.id));

    actions.append(edit, remove);
    row.append(actions);
    elements.bankList.append(row);
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
      "",
    ];

    cells.forEach((value, index) => {
      const td = document.createElement("td");

      if (index === 1) {
        const badge = document.createElement("span");
        badge.className = `type-badge ${typeClass}`;
        badge.textContent = value;
        td.append(badge);
      } else if (index === 6) {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "secondary";
        editButton.textContent = "Editar";
        editButton.addEventListener("click", () => fillMovementForm(row));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "secondary";
        deleteButton.textContent = "Borrar";
        deleteButton.addEventListener("click", () => deleteMovement(row.id));

        const actionWrap = document.createElement("div");
        actionWrap.className = "actions";
        actionWrap.append(editButton, deleteButton);
        td.append(actionWrap);
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
  await loadSummary();
  setConnectionStatus("ok", "Conectado");
}

async function initializeDashboard() {
  const range = getCurrentMonthRange();
  elements.monthFilter.value = range.start.slice(0, 7);
  elements.startDate.value = range.start;
  elements.endDate.value = range.end;

  try {
    await ensureAuthenticated();
    await fetchJson("/api/db-health");
    await Promise.all([loadSummary(), loadOptions(), loadIntegrationStatus()]);
    await loadDashboardData();
  } catch (error) {
    console.error(error);
    setConnectionStatus("error", "Sin conexion");
  }
}

async function ensureAuthenticated() {
  try {
    await fetchJson("/api/auth/me");
    hideLogin();
  } catch (error) {
    showLogin();
    throw error;
  }
}

function showLogin() {
  document.body.classList.remove("auth-ready", "auth-loading");
  document.body.classList.add("auth-login");
  elements.loginView.classList.add("visible");
}

function hideLogin() {
  document.body.classList.remove("auth-login", "auth-loading");
  document.body.classList.add("auth-ready");
  elements.loginView.classList.remove("visible");
}

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `form-message ${type}`;
}

function currentDateTimeInputValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function movementPayloadFromForm() {
  const createdAt = elements.movementDate.value ? `${elements.movementDate.value}:00` : null;
  return {
    tipo: elements.movementType.value,
    cantidad: elements.movementAmount.value,
    moneda: "EUR",
    categoria: elements.movementCategory.value || null,
    subcategoria: elements.movementSubcategory.value || null,
    concepto: elements.movementConcept.value || null,
    metodo_pago: elements.movementPayment.value || null,
    cuenta: elements.movementAccount.value || null,
    nota: elements.movementNote.value || null,
    created_at: createdAt,
  };
}

function fillMovementForm(row) {
  openMovementEditor();
  elements.movementId.value = row.id;
  elements.movementType.value = row.tipo || "gasto";
  elements.movementAmount.value = row.cantidad || "";
  elements.movementDate.value = row.created_at ? String(row.created_at).replace(" ", "T").slice(0, 16) : "";
  elements.movementCategory.value = row.categoria || "";
  elements.movementSubcategory.value = row.subcategoria || "";
  elements.movementConcept.value = row.concepto || "";
  elements.movementPayment.value = row.metodo_pago || "";
  elements.movementAccount.value = row.cuenta || "";
  renderBankDropdown(row.cuenta || "");
  elements.movementNote.value = row.nota || "";
  elements.movementFormMode.textContent = `Editando #${row.id}`;
  elements.movementAmount.focus();
}

function resetMovementForm() {
  elements.movementForm.reset();
  elements.movementId.value = "";
  elements.movementDate.value = currentDateTimeInputValue();
  elements.movementAccount.value = "";
  renderBankDropdown();
  elements.movementFormMode.textContent = "Alta manual";
  setMessage(elements.movementMessage, "");
}

function openMovementEditor() {
  elements.movementEditor.hidden = false;
  elements.toggleMovementForm.setAttribute("aria-expanded", "true");
  elements.toggleMovementForm.title = "Cerrar formulario";
  requestAnimationFrame(() => {
    elements.movementEditor.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function closeMovementEditor() {
  resetMovementForm();
  elements.movementEditor.hidden = true;
  elements.toggleMovementForm.setAttribute("aria-expanded", "false");
  elements.toggleMovementForm.title = "Nuevo movimiento";
}

function startNewMovement() {
  resetMovementForm();
  openMovementEditor();
  elements.movementType.focus();
}

function openBanksModal() {
  elements.banksModal.classList.add("visible");
  elements.banksModal.setAttribute("aria-hidden", "false");
}

function closeBanksModal() {
  elements.banksModal.classList.remove("visible");
  elements.banksModal.setAttribute("aria-hidden", "true");
}

function fillBankForm(bank) {
  elements.bankId.value = bank.id;
  elements.bankName.value = bank.name;
  elements.bankLogo.value = bank.logo_url || "";
}

function resetBankForm() {
  elements.bankForm.reset();
  elements.bankId.value = "";
}

function bankPayloadFromForm() {
  return {
    name: elements.bankName.value,
    logo_url: elements.bankLogo.value || null,
    is_active: true,
  };
}

async function saveBank(event) {
  event.preventDefault();
  const id = elements.bankId.value;
  const response = await fetch(id ? `/api/banks/${id}` : "/api/banks", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bankPayloadFromForm()),
  });

  if (!response.ok) {
    setMessage(elements.bankMessage, "No se pudo guardar el banco", "error");
    return;
  }

  resetBankForm();
  setMessage(elements.bankMessage, "Banco guardado", "ok");
  await loadOptions();
}

async function deleteBank(id) {
  if (!confirm("¿Ocultar este banco del selector?")) return;
  const response = await fetch(`/api/banks/${id}`, { method: "DELETE" });
  if (!response.ok) {
    setMessage(elements.bankMessage, "No se pudo ocultar el banco", "error");
    return;
  }
  await loadOptions();
}

async function deleteMovement(id) {
  if (!confirm("¿Borrar este movimiento?")) return;
  const response = await fetch(`/api/movements/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("No se pudo borrar");
  await loadDashboardData();
}

elements.applyFilters.addEventListener("click", () => {
  loadDashboardData().catch((error) => {
    console.error(error);
    setConnectionStatus("error", "Error");
  });
});

elements.monthFilter.addEventListener("change", () => {
  if (!elements.monthFilter.value) return;
  const [year, month] = elements.monthFilter.value.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  elements.startDate.value = toDateInputValue(start);
  elements.endDate.value = toDateInputValue(end);
  loadDashboardData().catch((error) => {
    console.error(error);
    setConnectionStatus("error", "Error");
  });
});

elements.resetFilters.addEventListener("click", () => {
  const range = getCurrentMonthRange();
  elements.monthFilter.value = range.start.slice(0, 7);
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

elements.exportExcel.addEventListener("click", () => {
  const params = buildParams();
  params.set("limit", "10000");
  const query = params.toString() ? `?${params.toString()}` : "";
  window.location.href = `/api/export/movements.xlsx${query}`;
});

elements.copyN8nEndpoint.addEventListener("click", () => {
  copyText(elements.n8nEndpoint.value, elements.copyN8nEndpoint, "Copiado").catch(console.error);
});

elements.copyN8nExample.addEventListener("click", () => {
  copyText(elements.n8nExample.value, elements.copyN8nExample, "Copiado").catch(console.error);
});

elements.toggleMovementForm.addEventListener("click", () => {
  if (elements.movementEditor.hidden) {
    startNewMovement();
  } else {
    closeMovementEditor();
  }
});

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(elements.loginMessage, "Entrando...");
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: elements.loginUser.value,
      password: elements.loginPassword.value,
    }),
  });

  if (!response.ok) {
    setMessage(elements.loginMessage, "Usuario o contraseña incorrectos", "error");
    return;
  }

  hideLogin();
  setMessage(elements.loginMessage, "");
  await initializeDashboard();
});

elements.logoutButton.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  showLogin();
});

elements.movementForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = elements.movementId.value;
  const response = await fetch(id ? `/api/movements/${id}` : "/api/movements", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(movementPayloadFromForm()),
  });

  if (!response.ok) {
    setMessage(elements.movementMessage, "No se pudo guardar el movimiento", "error");
    return;
  }

  closeMovementEditor();
  setMessage(elements.movementMessage, "Movimiento guardado", "ok");
  await Promise.all([loadOptions(), loadDashboardData()]);
});

elements.cancelEdit.addEventListener("click", closeMovementEditor);

elements.openBanksPanel.addEventListener("click", openBanksModal);
elements.closeBanksPanel.addEventListener("click", closeBanksModal);
elements.cancelBankEdit.addEventListener("click", resetBankForm);
elements.bankForm.addEventListener("submit", saveBank);
elements.banksModal.addEventListener("click", (event) => {
  if (event.target === elements.banksModal) closeBanksModal();
});

elements.themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

applyTheme(getStoredTheme());
resetMovementForm();
initializeDashboard();

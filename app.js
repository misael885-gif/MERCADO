const storageKey = "mercado-lista-simples";
const historyKey = "mercado-produtos-inteligentes";
const purchasesKey = "mercado-compras-salvas";

const commonProducts = [
  "Arroz",
  "Feijao",
  "Acucar",
  "Cafe",
  "Leite",
  "Oleo",
  "Macarrao",
  "Farinha",
  "Pao",
  "Manteiga",
  "Queijo",
  "Presunto",
  "Ovos",
  "Banana",
  "Maca",
  "Tomate",
  "Cebola",
  "Alho",
  "Batata",
  "Carne",
  "Frango",
  "Peixe",
  "Detergente",
  "Sabao em po",
  "Papel higienico"
];

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

let items = [];
let productHistory = [];
let savedPurchases = [];
let currentSuggestions = [];
let activeSuggestionIndex = -1;

const itemForm = document.querySelector("#itemForm");
const purchaseForm = document.querySelector("#purchaseForm");
const finishPurchaseForm = document.querySelector("#finishPurchaseForm");
const productInput = document.querySelector("#productInput");
const priceInput = document.querySelector("#priceInput");
const quantityInput = document.querySelector("#quantityInput");
const purchaseMonth = document.querySelector("#purchaseMonth");
const marketName = document.querySelector("#marketName");
const finishMonth = document.querySelector("#finishMonth");
const finishMarketName = document.querySelector("#finishMarketName");
const suggestionsList = document.querySelector("#suggestionsList");
const itemsList = document.querySelector("#itemsList");
const itemTemplate = document.querySelector("#itemTemplate");
const subtotalValue = document.querySelector("#subtotalValue");
const clearButton = document.querySelector("#clearButton");
const tabButtons = document.querySelectorAll(".tab-button");
const screens = document.querySelectorAll(".screen");
const comparisonA = document.querySelector("#comparisonA");
const comparisonB = document.querySelector("#comparisonB");
const comparisonResult = document.querySelector("#comparisonResult");
const savedPurchasesList = document.querySelector("#savedPurchases");

function parseMoney(value) {
  const normalized = String(value)
    .trim()
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=.*,)/g, "")
    .replace(",", ".");

  return Number(normalized) || 0;
}

function formatInputMoney(value) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

function formatMoney(value) {
  return formatter.format(Number(value) || 0);
}

function normalizeText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCurrentMonthValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function formatMonth(value) {
  if (!value || !value.includes("-")) {
    return value || "";
  }

  const [year, month] = value.split("-");
  return `${month}/${year}`;
}

function saveItems() {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

function loadItems() {
  const saved = localStorage.getItem(storageKey);

  if (!saved) {
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    items = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    localStorage.removeItem(storageKey);
  }
}

function saveProductHistory() {
  localStorage.setItem(historyKey, JSON.stringify(productHistory));
}

function loadProductHistory() {
  const saved = localStorage.getItem(historyKey);

  if (!saved) {
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    productHistory = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    localStorage.removeItem(historyKey);
  }
}

function savePurchases() {
  localStorage.setItem(purchasesKey, JSON.stringify(savedPurchases));
}

function loadPurchases() {
  const saved = localStorage.getItem(purchasesKey);

  if (!saved) {
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    savedPurchases = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    localStorage.removeItem(purchasesKey);
  }
}

function rememberProduct(name, price) {
  const key = normalizeText(name);

  if (!key) {
    return;
  }

  productHistory = productHistory.filter((product) => normalizeText(product.name) !== key);
  productHistory.unshift({ name, price });
  productHistory = productHistory.slice(0, 60);
  saveProductHistory();
}

function seedHistoryFromCurrentItems() {
  let changed = false;

  items.forEach((item) => {
    const key = normalizeText(item.name);
    const alreadySaved = productHistory.some((product) => normalizeText(product.name) === key);

    if (key && !alreadySaved) {
      productHistory.push({ name: item.name, price: item.price });
      changed = true;
    }
  });

  productHistory = productHistory.slice(0, 60);

  if (changed) {
    saveProductHistory();
  }
}

function getSuggestionSource() {
  const source = new Map();

  productHistory.forEach((product) => {
    const key = normalizeText(product.name);
    source.set(key, product);
  });

  savedPurchases.forEach((purchase) => {
    purchase.items.forEach((item) => {
      const key = normalizeText(item.name);

      if (key && !source.has(key)) {
        source.set(key, { name: item.name, price: item.price });
      }
    });
  });

  commonProducts.forEach((name) => {
    const key = normalizeText(name);

    if (!source.has(key)) {
      source.set(key, { name, price: 0 });
    }
  });

  return Array.from(source.values());
}

function getSuggestions() {
  const typed = normalizeText(productInput.value);

  if (!typed) {
    return [];
  }

  return getSuggestionSource()
    .filter((product) => {
      const name = normalizeText(product.name);
      return name.startsWith(typed) || name.includes(typed);
    })
    .slice(0, 8);
}

function hideSuggestions() {
  suggestionsList.classList.remove("is-open");
  suggestionsList.innerHTML = "";
  currentSuggestions = [];
  activeSuggestionIndex = -1;
}

function setActiveSuggestion(index) {
  activeSuggestionIndex = index;

  suggestionsList.querySelectorAll(".suggestion-button").forEach((button, buttonIndex) => {
    button.classList.toggle("is-active", buttonIndex === activeSuggestionIndex);
  });
}

function selectSuggestion(product) {
  productInput.value = product.name;

  if (product.price > 0 && !priceInput.value.trim()) {
    priceInput.value = formatInputMoney(product.price);
  }

  hideSuggestions();
  quantityInput.focus();
}

function renderSuggestions() {
  currentSuggestions = getSuggestions();
  suggestionsList.innerHTML = "";

  if (!currentSuggestions.length) {
    hideSuggestions();
    return;
  }

  currentSuggestions.forEach((product, index) => {
    const button = document.createElement("button");
    const name = document.createElement("strong");
    const price = document.createElement("span");

    button.className = "suggestion-button";
    button.type = "button";
    button.setAttribute("role", "option");
    name.textContent = product.name;
    price.textContent = product.price > 0 ? formatMoney(product.price) : "Sugestao";

    button.append(name, price);
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectSuggestion(currentSuggestions[index]);
    });

    suggestionsList.append(button);
  });

  suggestionsList.classList.add("is-open");
  setActiveSuggestion(-1);
}

function fillPriceFromExactMatch() {
  if (priceInput.value.trim()) {
    return;
  }

  const typed = normalizeText(productInput.value);
  const product = getSuggestionSource().find((suggestion) => normalizeText(suggestion.name) === typed);

  if (product && product.price > 0) {
    priceInput.value = formatInputMoney(product.price);
  }
}

function getSubtotal(list = items) {
  return list.reduce((total, item) => total + item.price * item.quantity, 0);
}

function renderItems() {
  itemsList.innerHTML = "";

  items.forEach((item) => {
    const node = itemTemplate.content.firstElementChild.cloneNode(true);
    const name = node.querySelector(".item-name");
    const price = node.querySelector(".item-price");
    const quantity = node.querySelector(".item-quantity");
    const total = node.querySelector(".item-total");
    const removeButton = node.querySelector(".remove-button");

    name.textContent = item.name;
    price.textContent = formatMoney(item.price);
    quantity.textContent = item.quantity;
    total.textContent = formatMoney(item.price * item.quantity);
    removeButton.addEventListener("click", () => removeItem(item.id));

    itemsList.append(node);
  });

  subtotalValue.textContent = formatMoney(getSubtotal());
}

function addItem(name, price, quantity) {
  items.push({
    id: createId(),
    name,
    price,
    quantity
  });

  rememberProduct(name, price);
  saveItems();
  renderItems();
}

function removeItem(id) {
  items = items.filter((item) => item.id !== id);
  saveItems();
  renderItems();
}

function clearItems() {
  items = [];
  saveItems();
  renderItems();
}

function showToast(message) {
  const currentToast = document.querySelector(".toast");

  if (currentToast) {
    currentToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  document.body.append(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 1800);
}

function showScreen(view) {
  tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });

  screens.forEach((screen) => {
    const isActive = screen.id === `${view}Screen`;
    screen.classList.toggle("is-active", isActive);
  });

  if (view === "compare") {
    hideSuggestions();
    renderHistoryArea();
  }
}

function getPurchaseTitle(purchase) {
  return `${purchase.market} - ${formatMonth(purchase.month)}`;
}

function getCleanItemsForSnapshot() {
  return items.map((item) => ({
    id: createId(),
    name: item.name,
    price: item.price,
    quantity: item.quantity
  }));
}

function saveCurrentPurchase(month, market) {
  const snapshot = {
    id: createId(),
    month,
    market,
    savedAt: new Date().toISOString(),
    items: getCleanItemsForSnapshot()
  };

  const sameIndex = savedPurchases.findIndex((purchase) => {
    return purchase.month === month && normalizeText(purchase.market) === normalizeText(market);
  });

  if (sameIndex >= 0) {
    snapshot.id = savedPurchases[sameIndex].id;
    savedPurchases[sameIndex] = snapshot;
    savePurchases();
    return { purchase: snapshot, updated: true };
  }

  savedPurchases.unshift(snapshot);
  savePurchases();
  return { purchase: snapshot, updated: false };
}

function savePurchaseFromFields(monthInput, marketInput) {
  const month = monthInput.value;
  const market = marketInput.value.trim();

  if (!items.length) {
    showToast("Adicione produtos antes de salvar.");
    return;
  }

  if (!month || !market) {
    showToast("Informe o mes e o mercado.");
    return;
  }

  const result = saveCurrentPurchase(month, market);
  purchaseMonth.value = month;
  finishMonth.value = month;
  marketInput.value = "";
  renderHistoryArea(result.purchase.id);
  showToast(result.updated ? "Compra atualizada." : "Compra salva.");
}

function removePurchase(id) {
  savedPurchases = savedPurchases.filter((purchase) => purchase.id !== id);
  savePurchases();
  renderHistoryArea();
}

function renderSavedPurchases() {
  savedPurchasesList.innerHTML = "";

  if (!savedPurchases.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhuma compra salva ainda.";
    savedPurchasesList.append(empty);
    return;
  }

  savedPurchases.forEach((purchase) => {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const info = document.createElement("p");
    const total = document.createElement("strong");
    const removeButton = document.createElement("button");

    card.className = "saved-card";
    title.textContent = getPurchaseTitle(purchase);
    info.textContent = `${purchase.items.length} produtos`;
    total.textContent = formatMoney(getSubtotal(purchase.items));
    removeButton.type = "button";
    removeButton.textContent = "Remover";
    removeButton.addEventListener("click", () => removePurchase(purchase.id));

    card.append(title, info, total, removeButton);
    savedPurchasesList.append(card);
  });
}

function renderCompareOptions(preferredB = "") {
  const oldA = comparisonA.value;
  const oldB = comparisonB.value;
  const ids = savedPurchases.map((purchase) => purchase.id);

  comparisonA.innerHTML = "";
  comparisonB.innerHTML = "";

  if (!ids.length) {
    comparisonA.disabled = true;
    comparisonB.disabled = true;
    return;
  }

  comparisonA.disabled = false;
  comparisonB.disabled = false;

  savedPurchases.forEach((purchase) => {
    const optionA = document.createElement("option");
    const optionB = document.createElement("option");
    const label = `${getPurchaseTitle(purchase)} (${formatMoney(getSubtotal(purchase.items))})`;

    optionA.value = purchase.id;
    optionB.value = purchase.id;
    optionA.textContent = label;
    optionB.textContent = label;
    comparisonA.append(optionA);
    comparisonB.append(optionB);
  });

  const valueB = ids.includes(preferredB) ? preferredB : ids.includes(oldB) ? oldB : ids[0];
  const valueA = ids.includes(oldA) && oldA !== valueB ? oldA : ids.find((id) => id !== valueB) || valueB;

  comparisonA.value = valueA;
  comparisonB.value = valueB;
}

function aggregateItems(list) {
  const map = new Map();

  list.forEach((item) => {
    const key = normalizeText(item.name);

    if (!key) {
      return;
    }

    const current = map.get(key) || {
      name: item.name,
      quantity: 0,
      total: 0
    };

    current.quantity += Number(item.quantity) || 0;
    current.total += (Number(item.price) || 0) * (Number(item.quantity) || 0);
    current.unit = current.quantity > 0 ? current.total / current.quantity : 0;
    map.set(key, current);
  });

  return map;
}

function createCell(text, className = "") {
  const span = document.createElement("span");
  span.textContent = text;

  if (className) {
    span.className = className;
  }

  return span;
}

function getComparisonStatus(itemA, itemB) {
  if (!itemA) {
    return { text: "Novo na compra B", className: "status-new" };
  }

  if (!itemB) {
    return { text: "Nao aparece na B", className: "status-missing" };
  }

  const difference = itemB.unit - itemA.unit;

  if (Math.abs(difference) < 0.01) {
    return { text: "Igual", className: "status-same" };
  }

  if (difference > 0) {
    return { text: `Subiu ${formatMoney(difference)}`, className: "status-up" };
  }

  return { text: `Baixou ${formatMoney(Math.abs(difference))}`, className: "status-down" };
}

function renderComparison() {
  comparisonResult.innerHTML = "";

  if (savedPurchases.length < 2) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Salve pelo menos duas compras para comparar.";
    comparisonResult.append(empty);
    return;
  }

  if (comparisonA.value === comparisonB.value) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Escolha duas compras diferentes.";
    comparisonResult.append(empty);
    return;
  }

  const purchaseA = savedPurchases.find((purchase) => purchase.id === comparisonA.value);
  const purchaseB = savedPurchases.find((purchase) => purchase.id === comparisonB.value);

  if (!purchaseA || !purchaseB) {
    return;
  }

  const mapA = aggregateItems(purchaseA.items);
  const mapB = aggregateItems(purchaseB.items);
  const keys = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));
  const totalA = getSubtotal(purchaseA.items);
  const totalB = getSubtotal(purchaseB.items);
  const totalDifference = totalB - totalA;

  keys.sort((keyA, keyB) => {
    const nameA = (mapA.get(keyA) || mapB.get(keyA)).name;
    const nameB = (mapA.get(keyB) || mapB.get(keyB)).name;
    return nameA.localeCompare(nameB, "pt-BR");
  });

  const summary = document.createElement("div");
  const table = document.createElement("div");
  const head = document.createElement("div");

  summary.className = "comparison-summary";
  summary.append(
    createCell(`${getPurchaseTitle(purchaseA)}: ${formatMoney(totalA)}`),
    createCell(`${getPurchaseTitle(purchaseB)}: ${formatMoney(totalB)}`),
    createCell(`Diferenca total: ${formatMoney(totalDifference)}`, totalDifference > 0 ? "status-up" : totalDifference < 0 ? "status-down" : "status-same")
  );

  table.className = "comparison-table";
  head.className = "comparison-head";
  head.append(
    createCell("Produto"),
    createCell("Compra A"),
    createCell("Compra B"),
    createCell("Diferenca"),
    createCell("Status")
  );
  table.append(head);

  keys.forEach((key) => {
    const itemA = mapA.get(key);
    const itemB = mapB.get(key);
    const row = document.createElement("article");
    const status = getComparisonStatus(itemA, itemB);
    const difference = itemA && itemB ? itemB.unit - itemA.unit : null;
    const name = itemA ? itemA.name : itemB.name;

    row.className = "comparison-row";
    row.append(
      createCell(name),
      createCell(itemA ? `${formatMoney(itemA.unit)} / qtd. ${itemA.quantity}` : "-"),
      createCell(itemB ? `${formatMoney(itemB.unit)} / qtd. ${itemB.quantity}` : "-"),
      createCell(difference === null ? "-" : formatMoney(difference), difference > 0 ? "status-up" : difference < 0 ? "status-down" : "status-same"),
      createCell(status.text, status.className)
    );

    table.append(row);
  });

  comparisonResult.append(summary, table);
}

function renderHistoryArea(preferredB = "") {
  renderSavedPurchases();
  renderCompareOptions(preferredB);
  renderComparison();
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showScreen(button.dataset.view);
  });
});

itemForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = productInput.value.trim();
  const price = parseMoney(priceInput.value);
  const quantity = Number(quantityInput.value) || 0;

  if (!name || price <= 0 || quantity <= 0) {
    showToast("Preencha produto, valor e quantidade.");
    return;
  }

  addItem(name, price, quantity);
  itemForm.reset();
  quantityInput.value = 0;
  hideSuggestions();
  productInput.focus();
});

purchaseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  savePurchaseFromFields(purchaseMonth, marketName);
});

finishPurchaseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  savePurchaseFromFields(finishMonth, finishMarketName);
});

clearButton.addEventListener("click", () => {
  clearItems();
  productInput.focus();
});

comparisonA.addEventListener("change", renderComparison);
comparisonB.addEventListener("change", renderComparison);

productInput.addEventListener("input", () => {
  renderSuggestions();
});

productInput.addEventListener("focus", () => {
  renderSuggestions();
});

productInput.addEventListener("blur", () => {
  fillPriceFromExactMatch();
  window.setTimeout(hideSuggestions, 100);
});

productInput.addEventListener("keydown", (event) => {
  if (!suggestionsList.classList.contains("is-open")) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    const nextIndex = activeSuggestionIndex + 1 >= currentSuggestions.length ? 0 : activeSuggestionIndex + 1;
    setActiveSuggestion(nextIndex);
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    const nextIndex = activeSuggestionIndex <= 0 ? currentSuggestions.length - 1 : activeSuggestionIndex - 1;
    setActiveSuggestion(nextIndex);
  }

  if (event.key === "Enter" && activeSuggestionIndex >= 0) {
    event.preventDefault();
    selectSuggestion(currentSuggestions[activeSuggestionIndex]);
  }

  if (event.key === "Escape") {
    hideSuggestions();
  }
});

purchaseMonth.value = getCurrentMonthValue();
finishMonth.value = getCurrentMonthValue();
loadItems();
loadProductHistory();
loadPurchases();
seedHistoryFromCurrentItems();
renderItems();
renderHistoryArea();

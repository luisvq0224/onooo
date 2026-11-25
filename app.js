let cart = [];
let salesHistory = JSON.parse(localStorage.getItem("pos_sales_history")) || [];

function getLocalDateKey(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toggleSalesModal() {
  const modal = document.getElementById("salesModal");
  modal.classList.toggle("active");
}

function closeModalOutside(event) {
  if (event.target.id === "salesModal") {
    toggleSalesModal();
  }
}

// Mostrar u ocultar calculadora según método de pago
function toggleCashBox() {
  const method = document.getElementById("paymentMethod").value;
  const cashBox = document.getElementById("cashCalculator");
  cashBox.style.display = method === "Efectivo" ? "block" : "none";
}

// Botones rápidos de billetes (S/ 10, 20, 50, 100)
function setBill(amount) {
  document.getElementById("cashReceived").value = amount.toFixed(2);
  calculateChange();
}

// Calcular vuelto automáticamente
function calculateChange() {
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const received = parseFloat(document.getElementById("cashReceived").value) || 0;
  const changeEl = document.getElementById("changeAmount");

  if (received === 0) {
    changeEl.innerText = "S/ 0.00";
    changeEl.classList.remove("insufficient");
    return;
  }

  const diff = received - total;
  if (diff < 0) {
    changeEl.innerText = `Falta S/ ${Math.abs(diff).toFixed(2)}`;
    changeEl.classList.add("insufficient");
  } else {
    changeEl.innerText = `S/ ${diff.toFixed(2)}`;
    changeEl.classList.remove("insufficient");
  }
}

function renderMenu() {
  const dishesContainer = document.getElementById("dishesContainer");
  const drinksContainer = document.getElementById("drinksContainer");

  const dishes = MENU_ITEMS.filter(item => item.category !== "bebida");
  const drinks = MENU_ITEMS.filter(item => item.category === "bebida");

  dishesContainer.innerHTML = dishes.map(item => `
    <button class="dish-btn" onclick="addToCart(${item.id})">
      <span class="dish-name">${item.name}</span>
      <span class="dish-price">S/ ${item.price.toFixed(2)}</span>
    </button>
  `).join("");

  drinksContainer.innerHTML = drinks.map(item => `
    <button class="dish-btn drink-btn" onclick="addToCart(${item.id})">
      <span class="dish-name">${item.name}</span>
      <span class="dish-price">S/ ${item.price.toFixed(2)}</span>
    </button>
  `).join("");
}

function addToCart(id) {
  const dish = MENU_ITEMS.find(m => m.id === id);
  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...dish, qty: 1 });
  }
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  renderCart();
}

function renderCart() {
  const tbody = document.getElementById("cartBody");
  let total = 0;

  tbody.innerHTML = cart.map(item => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    return `
      <tr>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>S/ ${subtotal.toFixed(2)}</td>
        <td><button class="btn-del" onclick="removeFromCart(${item.id})">X</button></td>
      </tr>
    `;
  }).join("");

  document.getElementById("orderTotal").innerText = total.toFixed(2);
  calculateChange();
}

function checkout() {
  if (cart.length === 0) return alert("Selecciona al menos un producto.");

  const now = new Date();
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const details = cart.map(item => `${item.qty}x ${item.name}`).join(" | ");
  const method = document.getElementById("paymentMethod").value;

  const sale = {
    id: salesHistory.length + 1,
    dateKey: getLocalDateKey(now),
    date: now.toLocaleString(),
    details: details,
    method: method,
    total: total
  };

  salesHistory.unshift(sale);
  localStorage.setItem("pos_sales_history", JSON.stringify(salesHistory));

  // Limpiar orden y calculadora de efectivo
  cart = [];
  document.getElementById("cashReceived").value = "";
  renderCart();
  renderHistory();
}

function getBadgeClass(method) {
  if (method === "Yape/Plin") return "badge-yape";
  if (method === "Tarjeta") return "badge-tarjeta";
  return "badge-efectivo";
}

function renderHistory() {
  const tbody = document.getElementById("historyBody");
  const todayKey = getLocalDateKey();
  const currentMonthKey = todayKey.slice(0, 7);

  let todayTotal = 0;
  let monthTotal = 0;
  let grandTotal = 0;

  let cashToday = 0;
  let yapeToday = 0;
  let cardToday = 0;

  tbody.innerHTML = salesHistory.map(sale => {
    grandTotal += sale.total;
    const saleDateKey = sale.dateKey || "";
    const method = sale.method || "Efectivo";

    if (saleDateKey === todayKey) {
      todayTotal += sale.total;
      if (method === "Efectivo") cashToday += sale.total;
      if (method === "Yape/Plin") yapeToday += sale.total;
      if (method === "Tarjeta") cardToday += sale.total;
    }

    if (saleDateKey.startsWith(currentMonthKey)) {
      monthTotal += sale.total;
    }

    return `
      <tr>
        <td>#${sale.id}</td>
        <td>${sale.date}</td>
        <td>${sale.details}</td>
        <td><span class="badge ${getBadgeClass(method)}">${method}</span></td>
        <td><strong>S/ ${sale.total.toFixed(2)}</strong></td>
      </tr>
    `;
  }).join("");

  document.getElementById("todayTotal").innerText = todayTotal.toFixed(2);
  document.getElementById("monthTotal").innerText = monthTotal.toFixed(2);
  document.getElementById("grandTotal").innerText = grandTotal.toFixed(2);

  document.getElementById("cashToday").innerText = cashToday.toFixed(2);
  document.getElementById("yapeToday").innerText = yapeToday.toFixed(2);
  document.getElementById("cardToday").innerText = cardToday.toFixed(2);
}

function exportToExcel() {
  if (salesHistory.length === 0) return alert("No hay ventas registradas para exportar.");

  const todayKey = getLocalDateKey();
  const currentMonthKey = todayKey.slice(0, 7);

  let csv = "\uFEFFNro Venta;Fecha y Hora;Detalle de Consumo;Metodo de Pago;Total (S/)\n";
  let todayTotal = 0, monthTotal = 0, grandTotal = 0;
  let cashToday = 0, yapeToday = 0, cardToday = 0;

  salesHistory.forEach(sale => {
    grandTotal += sale.total;
    const saleDateKey = sale.dateKey || "";
    const method = sale.method || "Efectivo";

    if (saleDateKey === todayKey) {
      todayTotal += sale.total;
      if (method === "Efectivo") cashToday += sale.total;
      if (method === "Yape/Plin") yapeToday += sale.total;
      if (method === "Tarjeta") cardToday += sale.total;
    }
    if (saleDateKey.startsWith(currentMonthKey)) monthTotal += sale.total;

    csv += `${sale.id};"${sale.date}";"${sale.details}";"${method}";${sale.total.toFixed(2)}\n`;
  });

  csv += `\n;;;EFECTIVO HOY;${cashToday.toFixed(2)}\n`;
  csv += `;;;YAPE/PLIN HOY;${yapeToday.toFixed(2)}\n`;
  csv += `;;;TARJETA HOY;${cardToday.toFixed(2)}\n`;
  csv += `;;;TOTAL VENTAS DE HOY (${todayKey});${todayTotal.toFixed(2)}\n`;
  csv += `;;;TOTAL VENTAS DEL MES (${currentMonthKey});${monthTotal.toFixed(2)}\n`;
  csv += `;;;TOTAL HISTORICO ACUMULADO;${grandTotal.toFixed(2)}\n`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", `Ventas_Onoo_${todayKey}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function clearHistory() {
  if (confirm("¿Seguro que deseas borrar todo el historial de ventas?")) {
    salesHistory = [];
    localStorage.removeItem("pos_sales_history");
    renderHistory();
  }
}

renderMenu();
renderHistory();

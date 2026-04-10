// =========================
// LOGIN CONFIG
// =========================
const USER = "Jesus96";
const PASS = "soyunapuerca";

// =========================
// PROTEGER PÁGINAS
// =========================
const currentPage = window.location.pathname.split("/").pop() || "index.html";
const protectedPages = ["home.html", "new-control.html", "products.html", "history.html", "scan.html"];

if (currentPage === "index.html" || currentPage === "") {
  if (localStorage.getItem("logged") === "true") {
    window.location.href = "home.html";
  }
}

if (protectedPages.includes(currentPage)) {
  if (localStorage.getItem("logged") !== "true") {
    window.location.href = "index.html";
  }
}

// =========================
// RECORDAR USUARIO + LOGIN
// =========================
document.addEventListener("DOMContentLoaded", () => {

  const userInput = document.getElementById("user");
  const passInput = document.getElementById("pass");
  const loginBtn = document.getElementById("loginBtn");
  const error = document.getElementById("error");
  const rememberCheckbox = document.getElementById("rememberUser");

  // recordar usuario
  const savedUser = localStorage.getItem("rememberedUser");
  if (userInput && savedUser) {
    userInput.value = savedUser;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  // mostrar contraseña
  const togglePass = document.getElementById("togglePass");
  if (togglePass && passInput) {
    togglePass.addEventListener("click", () => {
      if (passInput.type === "password") {
        passInput.type = "text";
        togglePass.textContent = "🙈";
      } else {
        passInput.type = "password";
        togglePass.textContent = "👁";
      }
    });
  }

  // login
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const user = userInput.value.trim();
      const pass = passInput.value.trim();
      const remember = rememberCheckbox?.checked;

      if (user.toLowerCase() === USER.toLowerCase() && pass === PASS) {
        localStorage.setItem("logged", "true");

        if (remember) {
          localStorage.setItem("rememberedUser", user);
        } else {
          localStorage.removeItem("rememberedUser");
        }

        window.location.href = "home.html";
      } else {
        if (error) error.textContent = "Usuario o contraseña incorrectos";
      }
    });
  }

  setupProductsPage();
  setupScanPage();
});

// =========================
// NAVEGACIÓN
// =========================
function goTo(page) {
  window.location.href = page;
}

function logout() {
  localStorage.removeItem("logged");
  window.location.href = "index.html";
}

// =========================
// PRODUCTOS
// =========================
function getProducts() {
  return JSON.parse(localStorage.getItem("products")) || [];
}

function saveProducts(products) {
  localStorage.setItem("products", JSON.stringify(products));
}

function renderProducts() {
  const list = document.getElementById("productsList");
  if (!list) return;

  const products = getProducts();

  if (products.length === 0) {
    list.innerHTML = "<p>No hay productos</p>";
    return;
  }

  list.innerHTML = products.map(p => `
    <div class="product-item">
      <strong>${p.name}</strong><br>
      Código: ${p.code}<br>
      Teórico: ${p.stockTeorico}<br>
      Real: ${p.stockReal || 0}<br>
      Dif: ${(p.stockReal || 0) - p.stockTeorico}
    </div>
  `).join("");
}

function setupProductsPage() {
  const btn = document.getElementById("saveProductBtn");
  if (!btn) return;

  renderProducts();

  btn.addEventListener("click", () => {
    const name = document.getElementById("productName").value.trim();
    const code = document.getElementById("productCode").value.trim();
    const stock = parseInt(document.getElementById("productStock").value);

    if (!name || !code || isNaN(stock)) return;

    const products = getProducts();

    products.push({
      name,
      code,
      stockTeorico: stock,
      stockReal: 0
    });

    saveProducts(products);
    renderProducts();
  });
}

// =========================
// SONIDO / VIBRACIÓN
// =========================
function playBeep(ok = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = ok ? 800 : 200;
    gain.gain.value = 0.05;

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {}
}

function vibrate(ms = 100) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

// =========================
// ESCANEO
// =========================
function findProduct(code) {
  return getProducts().find(p => p.code === code);
}

function updateReal(code, val) {
  const products = getProducts();
  const p = products.find(x => x.code === code);
  if (!p) return null;

  p.stockReal = (p.stockReal || 0) + val;
  if (p.stockReal < 0) p.stockReal = 0;

  saveProducts(products);
  return p;
}

function processScan(code) {
  const msg = document.getElementById("scanMsg");
  const p = findProduct(code);

  if (!p) {
    msg.textContent = "No encontrado";
    playBeep(false);
    vibrate([100,50,100]);
    return;
  }

  const updated = updateReal(code, 1);

  msg.textContent = "OK";
  showResult(updated);
  renderSummary();

  playBeep(true);
  vibrate(80);
}

function showResult(p) {
  document.getElementById("scanResult").classList.remove("hidden");
  document.getElementById("resultName").textContent = p.name;
  document.getElementById("resultCode").textContent = p.code;
  document.getElementById("resultTeorico").textContent = p.stockTeorico;
  document.getElementById("resultReal").textContent = p.stockReal;
  document.getElementById("resultDiff").textContent = p.stockReal - p.stockTeorico;
}

function renderSummary() {
  const box = document.getElementById("scanSummary");
  if (!box) return;

  const products = getProducts();

  box.innerHTML = products.map(p => `
    <div class="product-item">
      ${p.name} → ${p.stockReal || 0}
    </div>
  `).join("");
}

// =========================
// ESCANEO INPUT
// =========================
function setupScanPage() {
  const input = document.getElementById("scanCode");
  if (!input) return;

  input.focus();

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      processScan(input.value.trim());
      input.value = "";
    }
  });

  document.getElementById("minusOneBtn")?.addEventListener("click", () => {
    const code = document.getElementById("resultCode").textContent;
    const p = updateReal(code, -1);
    if (p) showResult(p);
    renderSummary();
  });

  document.getElementById("undoScanBtn")?.addEventListener("click", () => {
    const code = document.getElementById("resultCode").textContent;
    const p = updateReal(code, -1);
    if (p) showResult(p);
    renderSummary();
  });
}
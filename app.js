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
    list.innerHTML = "<p class='placeholder-text'>Todavía no hay productos cargados.</p>";
    return;
  }

  list.innerHTML = products.map(p => `
    <div class="product-item">
      <strong>${p.name}</strong><br>
      Código: ${p.code}<br>
      Stock teórico: ${p.stockTeorico}<br>
      Stock real: ${p.stockReal || 0}<br>
      Diferencia: ${(p.stockReal || 0) - p.stockTeorico}
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
    const msg = document.getElementById("productMsg");

    if (!name || !code || isNaN(stock)) {
      if (msg) msg.textContent = "Completá nombre, código y stock teórico.";
      return;
    }

    const products = getProducts();
    const exists = products.find(p => p.code === code);

    if (exists) {
      if (msg) msg.textContent = "Ya existe un producto con ese código.";
      return;
    }

    products.push({
      name,
      code,
      stockTeorico: stock,
      stockReal: 0
    });

    saveProducts(products);

    document.getElementById("productName").value = "";
    document.getElementById("productCode").value = "";
    document.getElementById("productStock").value = "";

    if (msg) msg.textContent = "Producto guardado correctamente.";

    renderProducts();
    renderScanSummary();
  });
}

// =========================
// ÚLTIMO ESCANEO
// =========================
function getLastScan() {
  return JSON.parse(localStorage.getItem("lastScan")) || null;
}

function saveLastScan(scan) {
  localStorage.setItem("lastScan", JSON.stringify(scan));
}

function clearLastScan() {
  localStorage.removeItem("lastScan");
}

// =========================
// SONIDO / VIBRACIÓN
// =========================
function playBeep(type = "ok") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "ok") {
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else {
      osc.frequency.value = 220;
      gain.gain.value = 0.06;
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch (e) {
    // no romper si el navegador bloquea audio
  }
}

function vibrateDevice(pattern = 100) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function setScanMessage(text, type = "info") {
  const msg = document.getElementById("scanMsg");
  if (!msg) return;

  msg.textContent = text;
  msg.classList.remove("success-msg", "error-msg");

  if (type === "success") msg.classList.add("success-msg");
  if (type === "error") msg.classList.add("error-msg");
}

// =========================
// ESCANEO - LÓGICA
// =========================
function findProductByCode(code) {
  return getProducts().find(p => p.code === code);
}

function updateProductReal(code, amount) {
  const products = getProducts();
  const index = products.findIndex(p => p.code === code);

  if (index === -1) return null;

  products[index].stockReal = (products[index].stockReal || 0) + amount;

  if (products[index].stockReal < 0) {
    products[index].stockReal = 0;
  }

  saveProducts(products);
  return products[index];
}

function showScannedProduct(product) {
  const box = document.getElementById("scanResult");
  if (!box || !product) return;

  document.getElementById("resultName").textContent = product.name;
  document.getElementById("resultCode").textContent = product.code;
  document.getElementById("resultTeorico").textContent = product.stockTeorico;
  document.getElementById("resultReal").textContent = product.stockReal || 0;
  document.getElementById("resultDiff").textContent = (product.stockReal || 0) - product.stockTeorico;

  box.classList.remove("hidden");
}

function renderScanSummary() {
  const box = document.getElementById("scanSummary");
  if (!box) return;

  const products = getProducts();

  if (products.length === 0) {
    box.innerHTML = "<p class='placeholder-text'>No hay productos cargados todavía.</p>";
    return;
  }

  box.innerHTML = products.map(p => `
    <div class="product-item">
      <strong>${p.name}</strong><br>
      Código: ${p.code}<br>
      Teórico: ${p.stockTeorico}<br>
      Real: ${p.stockReal || 0}<br>
      Diferencia: ${(p.stockReal || 0) - p.stockTeorico}
    </div>
  `).join("");
}

function processScannedCode(rawCode) {
  const code = String(rawCode).trim();
  if (!code) return;

  const found = findProductByCode(code);

  if (!found) {
    setScanMessage(`Producto no encontrado: ${code}`, "error");
    playBeep("error");
    vibrateDevice([120, 80, 120]);
    return;
  }

  const updated = updateProductReal(code, 1);
  saveLastScan({ code, amount: 1 });

  setScanMessage(`Escaneo sumado: ${updated.name}`, "success");
  showScannedProduct(updated);
  renderScanSummary();
  playBeep("ok");
  vibrateDevice(80);
}

// =========================
// CÁMARA
// =========================
let html5QrCodeInstance = null;
let cameraRunning = false;
let lastCameraScan = "";
let lastCameraScanTime = 0;
let scanAutoTimeout = null;

async function startCameraScanner() {
  const reader = document.getElementById("reader");
  if (!reader || cameraRunning) return;

  if (typeof Html5Qrcode === "undefined") {
    setScanMessage("No se cargó la librería de cámara.", "error");
    return;
  }

  reader.classList.remove("hidden");

  try {
    html5QrCodeInstance = new Html5Qrcode("reader");

    await html5QrCodeInstance.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 140 },
        aspectRatio: 1.7778
      },
      (decodedText) => {
        const now = Date.now();

        if (decodedText === lastCameraScan && (now - lastCameraScanTime) < 1200) {
          return;
        }

        lastCameraScan = decodedText;
        lastCameraScanTime = now;

        processScannedCode(decodedText);
      },
      () => {
        // ignorar errores de lectura continua
      }
    );

    cameraRunning = true;
    setScanMessage("Cámara activa. Apuntá al código.", "success");
  } catch (error) {
    console.error("Error al abrir cámara:", error);
    reader.classList.add("hidden");
    setScanMessage("No se pudo abrir la cámara. Revisá permisos del navegador.", "error");
  }
}

async function stopCameraScanner() {
  const reader = document.getElementById("reader");

  if (!cameraRunning || !html5QrCodeInstance) {
    if (reader) reader.classList.add("hidden");
    return;
  }

  try {
    await html5QrCodeInstance.stop();
    await html5QrCodeInstance.clear();
  } catch (error) {
    console.warn("Error al cerrar cámara:", error);
  }

  cameraRunning = false;
  html5QrCodeInstance = null;

  if (reader) reader.classList.add("hidden");
  setScanMessage("Cámara detenida.");
}

// =========================
// ESCANEO POR INPUT / PISTOLA
// =========================
function setupScanInputAuto() {
  const input = document.getElementById("scanCode");
  if (!input) return;

  input.addEventListener("input", () => {
    clearTimeout(scanAutoTimeout);

    scanAutoTimeout = setTimeout(() => {
      const code = input.value.trim();
      if (!code) return;

      processScannedCode(code);
      input.value = "";
      input.focus();
    }, 180);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const code = input.value.trim();
      if (!code) return;

      clearTimeout(scanAutoTimeout);
      processScannedCode(code);
      input.value = "";
      input.focus();
    }
  });
}

// =========================
// SETUP SCAN PAGE
// =========================
function setupScanPage() {
  const input = document.getElementById("scanCode");
  const minusBtn = document.getElementById("minusOneBtn");
  const undoBtn = document.getElementById("undoScanBtn");
  const startCameraBtn = document.getElementById("startCameraBtn");
  const stopCameraBtn = document.getElementById("stopCameraBtn");

  if (!input) return;

  renderScanSummary();
  setupScanInputAuto();
  input.focus();

  if (startCameraBtn) {
    startCameraBtn.addEventListener("click", async () => {
      await startCameraScanner();
    });
  }

  if (stopCameraBtn) {
    stopCameraBtn.addEventListener("click", async () => {
      await stopCameraScanner();
    });
  }

  if (minusBtn) {
    minusBtn.addEventListener("click", () => {
      const code = document.getElementById("resultCode").textContent.trim();
      if (!code) return;

      const updated = updateProductReal(code, -1);
      saveLastScan({ code, amount: -1 });

      if (updated) {
        setScanMessage(`Se restó 1 a ${updated.name}.`, "success");
        showScannedProduct(updated);
        renderScanSummary();
        playBeep("ok");
        vibrateDevice(60);
      }

      input.focus();
    });
  }

  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      const lastScan = getLastScan();

      if (!lastScan) {
        setScanMessage("No hay último escaneo para deshacer.", "error");
        playBeep("error");
        vibrateDevice([100, 60, 100]);
        return;
      }

      const reverseAmount = lastScan.amount === 1 ? -1 : 1;
      const updated = updateProductReal(lastScan.code, reverseAmount);

      if (updated) {
        setScanMessage("Último escaneo deshecho correctamente.", "success");
        showScannedProduct(updated);
        renderScanSummary();
        playBeep("ok");
        vibrateDevice(70);
      }

      clearLastScan();
      input.focus();
    });
  }

  window.addEventListener("beforeunload", () => {
    if (cameraRunning) {
      stopCameraScanner();
    }
  });
}

// =========================
// DOM READY
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
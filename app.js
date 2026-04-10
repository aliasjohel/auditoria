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
// RECORDAR USUARIO
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("rememberedUser");
  const userInput = document.getElementById("user");
  const rememberCheckbox = document.getElementById("rememberUser");

  if (userInput && savedUser) {
    userInput.value = savedUser;
    if (rememberCheckbox) {
      rememberCheckbox.checked = true;
    }
  }

  // Mostrar / ocultar contraseña
const togglePassBtn = document.getElementById("togglePass");
const passInput = document.getElementById("pass");

if (togglePassBtn && passInput) {
  togglePassBtn.addEventListener("click", () => {
    if (passInput.type === "password") {
      passInput.type = "text";
      togglePassBtn.textContent = "🙈";
    } else {
      passInput.type = "password";
      togglePassBtn.textContent = "👁";
    }
  });
}

  // Login
  const loginBtn = document.getElementById("loginBtn");

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const user = document.getElementById("user").value.trim();
      const pass = document.getElementById("pass").value.trim();
      const error = document.getElementById("error");
      const remember = document.getElementById("rememberUser").checked;

      if (user.toLowerCase() === USER.toLowerCase() && pass === PASS) {
        localStorage.setItem("logged", "true");

        if (remember) {
          localStorage.setItem("rememberedUser", user);
        } else {
          localStorage.removeItem("rememberedUser");
        }

        window.location.href = "home.html";
      } else {
        error.textContent = "Usuario o contraseña incorrectos";
      }
    });
  }
});

// =========================
// NAVEGACIÓN
// =========================
function goTo(page) {
  window.location.href = page;
}

// =========================
// CERRAR SESIÓN
// =========================
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
  const productsList = document.getElementById("productsList");
  if (!productsList) return;

  const products = getProducts();

  if (products.length === 0) {
    productsList.innerHTML = "<p class='placeholder-text'>Todavía no hay productos cargados.</p>";
    return;
  }

  productsList.innerHTML = products.map(product => `
    <div class="product-item">
      <strong>${product.name}</strong><br>
      Código: ${product.code}<br>
      Stock teórico: ${product.stockTeorico}<br>
      Stock real: ${product.stockReal ?? 0}<br>
      Diferencia: ${(product.stockReal ?? 0) - product.stockTeorico}
    </div>
  `).join("");
}

function setupProductsPage() {
  const saveBtn = document.getElementById("saveProductBtn");
  if (!saveBtn) return;

  renderProducts();

  saveBtn.addEventListener("click", () => {
    const name = document.getElementById("productName").value.trim();
    const code = document.getElementById("productCode").value.trim();
    const stock = parseInt(document.getElementById("productStock").value);
    const msg = document.getElementById("productMsg");

    if (!name || !code || isNaN(stock)) {
      msg.textContent = "Completá nombre, código y stock teórico.";
      return;
    }

    const products = getProducts();
    const existing = products.find(p => p.code === code);

    if (existing) {
      msg.textContent = "Ya existe un producto con ese código.";
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

    msg.textContent = "Producto guardado correctamente.";
    renderProducts();
    renderScanSummary();
  });
}

// =========================
// ESCANEO
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

function findProductByCode(code) {
  const products = getProducts();
  return products.find(product => product.code === code);
}

function updateProductReal(code, amount) {
  const products = getProducts();
  const index = products.findIndex(product => product.code === code);

  if (index === -1) return null;

  products[index].stockReal = (products[index].stockReal || 0) + amount;

  if (products[index].stockReal < 0) {
    products[index].stockReal = 0;
  }

  saveProducts(products);
  return products[index];
}

function showScannedProduct(product) {
  const scanResult = document.getElementById("scanResult");
  if (!scanResult) return;

  document.getElementById("resultName").textContent = product.name;
  document.getElementById("resultCode").textContent = product.code;
  document.getElementById("resultTeorico").textContent = product.stockTeorico;
  document.getElementById("resultReal").textContent = product.stockReal || 0;
  document.getElementById("resultDiff").textContent = (product.stockReal || 0) - product.stockTeorico;

  scanResult.classList.remove("hidden");
}

function renderScanSummary() {
  const summary = document.getElementById("scanSummary");
  if (!summary) return;

  const products = getProducts();

  if (products.length === 0) {
    summary.innerHTML = "<p class='placeholder-text'>No hay productos cargados todavía.</p>";
    return;
  }

  summary.innerHTML = products.map(product => `
    <div class="product-item">
      <strong>${product.name}</strong><br>
      Código: ${product.code}<br>
      Teórico: ${product.stockTeorico}<br>
      Real: ${product.stockReal || 0}<br>
      Diferencia: ${(product.stockReal || 0) - product.stockTeorico}
    </div>
  `).join("");
}


      

  

  if (minusBtn) {
    minusBtn.addEventListener("click", () => {
      const code = document.getElementById("resultCode").textContent.trim();
      if (!code) return;

      const updated = updateProductReal(code, -1);
      saveLastScan({ code, amount: -1 });

      scanMsg.textContent = "Se restó 1 unidad.";
      showScannedProduct(updated);
      renderScanSummary();
      scanInput.focus();
    });
  }

  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      const lastScan = getLastScan();

      if (!lastScan) {
        scanMsg.textContent = "No hay último escaneo para deshacer.";
        return;
      }

      const reverseAmount = lastScan.amount === 1 ? -1 : 1;
      const updated = updateProductReal(lastScan.code, reverseAmount);

      if (updated) {
        scanMsg.textContent = "Último escaneo deshecho correctamente.";
        showScannedProduct(updated);
        renderScanSummary();
      }

      clearLastScan();
      scanInput.focus();
    });
  }
}

// =========================
// INICIALIZAR PÁGINAS
// =========================
document.addEventListener("DOMContentLoaded", () => {
  setupProductsPage();
  setupScanPage();
});

// =========================
// SONIDO / VIBRACIÓN
// =========================
function playBeep(type = "ok") {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "ok") {
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } else {
      osc.frequency.value = 220;
      gain.gain.value = 0.06;
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    }
  } catch (error) {
    // si el navegador bloquea audio automático, no rompe nada
  }
}

function vibrateDevice(pattern = 120) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function setScanMessage(text, type = "info") {
  const scanMsg = document.getElementById("scanMsg");
  if (!scanMsg) return;

  scanMsg.textContent = text;
  scanMsg.classList.remove("success-msg", "error-msg");

  if (type === "success") {
    scanMsg.classList.add("success-msg");
  } else if (type === "error") {
    scanMsg.classList.add("error-msg");
  }
}

// =========================
// PROCESAR ESCANEO
// =========================
function processScannedCode(code) {
  const cleanCode = String(code).trim();
  if (!cleanCode) return;

  const found = findProductByCode(cleanCode);

  if (!found) {
    setScanMessage(`Producto no encontrado: ${cleanCode}`, "error");
    playBeep("error");
    vibrateDevice([120, 80, 120]);
    return;
  }

  const updated = updateProductReal(cleanCode, 1);
  saveLastScan({ code: cleanCode, amount: 1 });

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

        // evita duplicados instantáneos por lectura repetida de la cámara
        if (
          decodedText === lastCameraScan &&
          now - lastCameraScanTime < 1200
        ) {
          return;
        }

        lastCameraScan = decodedText;
        lastCameraScanTime = now;

        processScannedCode(decodedText);
      },
      () => {
        // ignoramos errores de lectura continuos
      }
    );

    cameraRunning = true;
    setScanMessage("Cámara activa. Apuntá al código.", "success");
  } catch (error) {
    reader.classList.add("hidden");
    setScanMessage("No se pudo abrir la cámara. Revisá permisos y HTTPS.", "error");
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
    // evitar que rompa si ya estaba cerrada
  }

  cameraRunning = false;
  html5QrCodeInstance = null;
  if (reader) reader.classList.add("hidden");
  setScanMessage("Cámara detenida.");
}

// =========================
// ESCANEO CON PISTOLA / MANUAL
// =========================
let scanAutoTimeout;

function setupScanInputAuto() {
  const scanInput = document.getElementById("scanCode");
  if (!scanInput) return;

  scanInput.addEventListener("input", () => {
    clearTimeout(scanAutoTimeout);

    scanAutoTimeout = setTimeout(() => {
      const code = scanInput.value.trim();
      if (!code) return;

      processScannedCode(code);
      scanInput.value = "";
      scanInput.focus();
    }, 180);
  });

  scanInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const code = scanInput.value.trim();
      if (!code) return;

      clearTimeout(scanAutoTimeout);
      processScannedCode(code);
      scanInput.value = "";
      scanInput.focus();
    }
  });
}

// =========================
// REEMPLAZO DE setupScanPage
// =========================
function setupScanPage() {
  const scanInput = document.getElementById("scanCode");
  const minusBtn = document.getElementById("minusOneBtn");
  const undoBtn = document.getElementById("undoScanBtn");
  const startCameraBtn = document.getElementById("startCameraBtn");
  const stopCameraBtn = document.getElementById("stopCameraBtn");

  if (!scanInput) return;

  renderScanSummary();
  setupScanInputAuto();
  scanInput.focus();

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

      setScanMessage(`Se restó 1 a ${updated.name}.`, "success");
      showScannedProduct(updated);
      renderScanSummary();
      playBeep("ok");
      vibrateDevice(60);
      scanInput.focus();
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
      scanInput.focus();
    });
  }

  window.addEventListener("beforeunload", () => {
    if (cameraRunning) {
      stopCameraScanner();
    }
  });
}
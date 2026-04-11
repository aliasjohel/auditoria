// =========================
// LOGIN CONFIG
// =========================
const USER = "Jesus96";
const PASS = "soyunapuerca";

// =========================
// RUTAS / PÁGINAS
// =========================
const currentPage = window.location.pathname.split("/").pop() || "index.html";
const protectedPages = ["home.html", "new-control.html", "products.html", "history.html", "scan.html"];

// =========================
// PROTEGER PÁGINAS
// =========================
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
// HELPERS
// =========================
function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeUpper(value) {
  return normalizeText(value).toUpperCase();
}

function safeNumber(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function showInfoMessage(id, text, type = "info") {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = text;
  el.classList.remove("success-msg", "error-msg");

  if (type === "success") el.classList.add("success-msg");
  if (type === "error") el.classList.add("error-msg");
}

// =========================
// STORAGE KEYS
// =========================
const STORAGE_KEYS = {
  products: "products",
  lastScan: "lastScan",
  finishedPasillos: "finishedPasillos",
  centralImports: "centralImports"
};

// =========================
// PRODUCTOS
// =========================
function normalizeProduct(product) {
  return {
    name: normalizeText(product?.name),
    code: normalizeText(product?.code),
    stockTeorico: safeNumber(product?.stockTeorico, 0),
    stockReal: safeNumber(product?.stockReal, 0),
    pasillo: normalizeUpper(product?.pasillo || "SIN PASILLO"),
    fila: normalizeUpper(product?.fila || "SIN FILA")
  };
}

function getProducts() {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.products)) || [];
  return raw.map(normalizeProduct);
}

function saveProducts(products) {
  const normalized = products.map(normalizeProduct);
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(normalized));
}

function findProductByCode(code) {
  const normalizedCode = normalizeText(code);
  return getProducts().find(p => p.code === normalizedCode);
}

function getUniquePasillos(products = getProducts()) {
  return [...new Set(products.map(p => p.pasillo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}

function getUniqueFilasByPasillo(pasillo = "", products = getProducts()) {
  const filtered = pasillo
    ? products.filter(p => p.pasillo === pasillo)
    : products;

  return [...new Set(filtered.map(p => p.fila).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}

function getFinishedPasillos() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.finishedPasillos)) || [];
}

function saveFinishedPasillos(list) {
  localStorage.setItem(STORAGE_KEYS.finishedPasillos, JSON.stringify(list));
}

function markPasilloAsFinished(pasillo) {
  if (!pasillo) return false;

  const current = getFinishedPasillos();
  if (current.includes(pasillo)) return false;

  current.push(pasillo);
  saveFinishedPasillos(current);
  return true;
}

function unmarkPasilloAsFinished(pasillo) {
  if (!pasillo) return false;

  const current = getFinishedPasillos();
  const next = current.filter(item => item !== pasillo);

  if (next.length === current.length) return false;

  saveFinishedPasillos(next);
  return true;
}

function productMatchesFilters(product, pasilloFilter = "", filaFilter = "") {
  const matchesPasillo = !pasilloFilter || product.pasillo === pasilloFilter;
  const matchesFila = !filaFilter || product.fila === filaFilter;
  return matchesPasillo && matchesFila;
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
      Pasillo: ${p.pasillo}<br>
      Fila: ${p.fila}<br>
      Stock teórico: ${p.stockTeorico}<br>
      Stock real: ${p.stockReal || 0}<br>
      Diferencia: ${(p.stockReal || 0) - p.stockTeorico}
    </div>
  `).join("");
}

function setupProductsPage() {
  const btn = document.getElementById("saveProductBtn");
  const importBtn = document.getElementById("importCsvBtn");

  renderProducts();

  if (btn) {
    btn.addEventListener("click", () => {
      const name = normalizeText(document.getElementById("productName")?.value);
      const code = normalizeText(document.getElementById("productCode")?.value);
      const stock = safeNumber(document.getElementById("productStock")?.value, NaN);
      const pasillo = normalizeUpper(document.getElementById("productPasillo")?.value || "SIN PASILLO");
      const fila = normalizeUpper(document.getElementById("productFila")?.value || "SIN FILA");
      const msg = document.getElementById("productMsg");

      if (!name || !code || Number.isNaN(stock)) {
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
        stockReal: 0,
        pasillo,
        fila
      });

      saveProducts(products);

      document.getElementById("productName").value = "";
      document.getElementById("productCode").value = "";
      document.getElementById("productStock").value = "";
      document.getElementById("productPasillo").value = "";
      document.getElementById("productFila").value = "";

      if (msg) msg.textContent = "Producto guardado correctamente.";

      renderProducts();
      renderScanSummary();
      populateScanFilters();
      renderZoneProgress();
    });
  }

  if (importBtn) {
    importBtn.addEventListener("click", () => {
      const fileInput = document.getElementById("csvFileInput");
      const csvMsg = document.getElementById("csvMsg");

      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        if (csvMsg) csvMsg.textContent = "Seleccioná un archivo CSV.";
        return;
      }

      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          const text = e.target.result;
          const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");

          if (lines.length < 2) {
            if (csvMsg) csvMsg.textContent = "El archivo no tiene datos válidos.";
            return;
          }

          const header = lines[0].split(",").map(h => h.trim());
          const codeIndex = header.indexOf("codigo");
          const nameIndex = header.indexOf("nombre");
          const stockIndex = header.indexOf("stockTeorico");
          const pasilloIndex = header.indexOf("pasillo");
          const filaIndex = header.indexOf("fila");

          if (codeIndex === -1 || nameIndex === -1 || stockIndex === -1) {
            if (csvMsg) csvMsg.textContent = "El CSV debe tener: codigo, nombre, stockTeorico. Puede incluir también: pasillo, fila.";
            return;
          }

          const products = getProducts();
          let added = 0;
          let skipped = 0;

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",").map(c => c.trim());

            const code = normalizeText(cols[codeIndex]);
            const name = normalizeText(cols[nameIndex]);
            const stock = safeNumber(cols[stockIndex], NaN);
            const pasillo = pasilloIndex !== -1 ? normalizeUpper(cols[pasilloIndex] || "SIN PASILLO") : "SIN PASILLO";
            const fila = filaIndex !== -1 ? normalizeUpper(cols[filaIndex] || "SIN FILA") : "SIN FILA";

            if (!code || !name || Number.isNaN(stock)) {
              skipped++;
              continue;
            }

            const exists = products.find(p => p.code === code);
            if (exists) {
              skipped++;
              continue;
            }

            products.push({
              name,
              code,
              stockTeorico: stock,
              stockReal: 0,
              pasillo,
              fila
            });

            added++;
          }

          saveProducts(products);
          renderProducts();
          renderScanSummary();
          populateScanFilters();
          renderZoneProgress();

          if (csvMsg) {
            csvMsg.textContent = `Importación lista. Agregados: ${added}. Omitidos: ${skipped}.`;
          }

          fileInput.value = "";
        } catch (error) {
          if (csvMsg) csvMsg.textContent = "Error al leer el archivo CSV.";
        }
      };

      reader.readAsText(file, "UTF-8");
    });
  }
}

// =========================
// ÚLTIMO ESCANEO
// =========================
function getLastScan() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.lastScan)) || null;
}

function saveLastScan(scan) {
  localStorage.setItem(STORAGE_KEYS.lastScan, JSON.stringify(scan));
}

function clearLastScan() {
  localStorage.removeItem(STORAGE_KEYS.lastScan);
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
  showInfoMessage("scanMsg", text, type);
}

function setZoneMessage(text, type = "info") {
  showInfoMessage("zoneMsg", text, type);
}

function setCentralMessage(text, type = "info") {
  showInfoMessage("centralMsg", text, type);
}

// =========================
// ESCANEO - LÓGICA
// =========================
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

  setText("resultName", product.name);
  setText("resultCode", product.code);
  setText("resultPasillo", product.pasillo || "SIN PASILLO");
  setText("resultFila", product.fila || "SIN FILA");
  setText("resultTeorico", product.stockTeorico);
  setText("resultReal", product.stockReal || 0);
  setText("resultDiff", (product.stockReal || 0) - product.stockTeorico);

  box.classList.remove("hidden");
}

function getCurrentScanFilters() {
  return {
    pasillo: normalizeUpper(document.getElementById("scanPasilloFilter")?.value || ""),
    fila: normalizeUpper(document.getElementById("scanFilaFilter")?.value || "")
  };
}

function renderScanSummary() {
  const box = document.getElementById("scanSummary");
  if (!box) return;

  const products = getProducts();
  const { pasillo, fila } = getCurrentScanFilters();
  const filtered = products.filter(p => productMatchesFilters(p, pasillo, fila));

  if (products.length === 0) {
    box.innerHTML = "<p class='placeholder-text'>No hay productos cargados todavía.</p>";
    return;
  }

  if (filtered.length === 0) {
    box.innerHTML = "<p class='placeholder-text'>No hay productos en el filtro seleccionado.</p>";
    return;
  }

  box.innerHTML = filtered.map(p => `
    <div class="product-item">
      <strong>${p.name}</strong><br>
      Código: ${p.code}<br>
      Pasillo: ${p.pasillo}<br>
      Fila: ${p.fila}<br>
      Teórico: ${p.stockTeorico}<br>
      Real: ${p.stockReal || 0}<br>
      Diferencia: ${(p.stockReal || 0) - p.stockTeorico}
    </div>
  `).join("");
}

function processScannedCode(rawCode) {
  const code = normalizeText(rawCode);
  if (!code) return;

  const found = findProductByCode(code);

  if (!found) {
    setScanMessage(`Producto no encontrado: ${code}`, "error");
    playBeep("error");
    vibrateDevice([120, 80, 120]);
    return;
  }

  const { pasillo } = getCurrentScanFilters();
  if (pasillo && found.pasillo !== pasillo) {
    setScanMessage(`El producto ${found.name} pertenece al pasillo ${found.pasillo}, no al filtro actual.`, "error");
    playBeep("error");
    vibrateDevice([120, 80, 120]);
    return;
  }

  const updated = updateProductReal(code, 1);
  saveLastScan({ code, amount: 1 });

  setScanMessage(`Escaneo sumado: ${updated.name}`, "success");
  showScannedProduct(updated);
  renderScanSummary();
  renderZoneProgress();
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
// FILTROS / PROGRESO ZONAS
// =========================
function populateSelect(select, items, emptyLabel) {
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = `<option value="">${emptyLabel}</option>`;

  items.forEach(item => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });

  if ([...select.options].some(opt => opt.value === currentValue)) {
    select.value = currentValue;
  }
}

function populateScanFilters() {
  const pasilloSelect = document.getElementById("scanPasilloFilter");
  const filaSelect = document.getElementById("scanFilaFilter");
  if (!pasilloSelect || !filaSelect) return;

  const products = getProducts();
  const selectedPasillo = normalizeUpper(pasilloSelect.value || "");
  const pasillos = getUniquePasillos(products);

  populateSelect(pasilloSelect, pasillos, "Todos los pasillos");

  const filas = getUniqueFilasByPasillo(selectedPasillo, products);
  populateSelect(filaSelect, filas, "Todas las filas");
}

function renderZoneProgress() {
  const box = document.getElementById("zoneProgressBox");
  if (!box) return;

  const products = getProducts();
  const finishedPasillos = getFinishedPasillos();

  if (products.length === 0) {
    box.innerHTML = "<p class='placeholder-text'>Todavía no hay productos para calcular progreso.</p>";
    return;
  }

  const pasillos = getUniquePasillos(products);

  box.innerHTML = pasillos.map(pasillo => {
    const zoneProducts = products.filter(p => p.pasillo === pasillo);
    const total = zoneProducts.length;
    const counted = zoneProducts.filter(p => (p.stockReal || 0) > 0).length;
    const percent = total > 0 ? Math.round((counted / total) * 100) : 0;
    const isDone = finishedPasillos.includes(pasillo);

    return `
      <div class="zone-card ${isDone ? "done" : ""}">
        <strong>Pasillo ${pasillo}</strong><br>
        Productos contados: ${counted} de ${total}<br>
        Progreso: ${percent}%<br>
        Estado: ${isDone ? "Terminado" : "Pendiente"}
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

function setupZoneFilters() {
  const pasilloSelect = document.getElementById("scanPasilloFilter");
  const filaSelect = document.getElementById("scanFilaFilter");
  const markBtn = document.getElementById("markPasilloDoneBtn");
  const unmarkBtn = document.getElementById("unmarkPasilloDoneBtn");

  if (!pasilloSelect || !filaSelect) return;

  populateScanFilters();
  renderZoneProgress();

  pasilloSelect.addEventListener("change", () => {
    const selectedPasillo = normalizeUpper(pasilloSelect.value || "");
    const filas = getUniqueFilasByPasillo(selectedPasillo, getProducts());
    populateSelect(filaSelect, filas, "Todas las filas");
    filaSelect.value = "";
    renderScanSummary();

    if (selectedPasillo) {
      setZoneMessage(`Filtrando pasillo ${selectedPasillo}.`, "success");
    } else {
      setZoneMessage("Mostrando todos los pasillos.");
    }
  });

  filaSelect.addEventListener("change", () => {
    renderScanSummary();

    const selectedFila = normalizeUpper(filaSelect.value || "");
    if (selectedFila) {
      setZoneMessage(`Filtrando fila ${selectedFila}.`, "success");
    } else {
      setZoneMessage("Mostrando todas las filas.");
    }
  });

  if (markBtn) {
    markBtn.addEventListener("click", () => {
      const selectedPasillo = normalizeUpper(pasilloSelect.value || "");

      if (!selectedPasillo) {
        setZoneMessage("Elegí un pasillo para marcarlo como terminado.", "error");
        return;
      }

      const changed = markPasilloAsFinished(selectedPasillo);
      renderZoneProgress();

      if (changed) {
        setZoneMessage(`Pasillo ${selectedPasillo} marcado como terminado.`, "success");
      } else {
        setZoneMessage(`El pasillo ${selectedPasillo} ya estaba marcado como terminado.`);
      }
    });
  }

  if (unmarkBtn) {
    unmarkBtn.addEventListener("click", () => {
      const selectedPasillo = normalizeUpper(pasilloSelect.value || "");

      if (!selectedPasillo) {
        setZoneMessage("Elegí un pasillo para quitarle el estado terminado.", "error");
        return;
      }

      const changed = unmarkPasilloAsFinished(selectedPasillo);
      renderZoneProgress();

      if (changed) {
        setZoneMessage(`Pasillo ${selectedPasillo} marcado nuevamente como pendiente.`, "success");
      } else {
        setZoneMessage(`El pasillo ${selectedPasillo} no estaba marcado como terminado.`);
      }
    });
  }
}

// =========================
// MODO CENTRAL
// =========================
function getCentralImports() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.centralImports)) || [];
}

function saveCentralImports(data) {
  localStorage.setItem(STORAGE_KEYS.centralImports, JSON.stringify(data));
}

function renderCentralSummary() {
  const box = document.getElementById("centralSummary");
  if (!box) return;

  const imports = getCentralImports();

  if (!imports.length) {
    box.innerHTML = "<p class='placeholder-text'>Todavía no se importaron conteos de equipos.</p>";
    return;
  }

  box.innerHTML = imports.map((item, index) => `
    <div class="product-item">
      <strong>Importación ${index + 1}</strong><br>
      Equipo: ${item.team || "Sin nombre"}<br>
      Registros: ${Array.isArray(item.counts) ? item.counts.length : 0}
    </div>
  `).join("");
}

function applyCentralCountsToProducts(importedData) {
  const products = getProducts();
  let updatedCount = 0;

  importedData.forEach(fileData => {
    const counts = Array.isArray(fileData.counts) ? fileData.counts : [];

    counts.forEach(entry => {
      const code = normalizeText(entry.code);
      const amount = safeNumber(entry.amount, 0);

      if (!code || amount <= 0) return;

      const index = products.findIndex(p => p.code === code);
      if (index === -1) return;

      products[index].stockReal = (products[index].stockReal || 0) + amount;
      updatedCount++;
    });
  });

  saveProducts(products);
  return updatedCount;
}

function setupCentralMode() {
  const fileInput = document.getElementById("teamCountFileInput");
  const importBtn = document.getElementById("importTeamCountsBtn");

  if (!fileInput || !importBtn) return;

  renderCentralSummary();

  importBtn.addEventListener("click", async () => {
    if (!fileInput.files || fileInput.files.length === 0) {
      setCentralMessage("Seleccioná uno o más archivos JSON.", "error");
      return;
    }

    const files = Array.from(fileInput.files);

    try {
      const parsedFiles = await Promise.all(files.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = function (e) {
            try {
              const parsed = JSON.parse(e.target.result);
              resolve(parsed);
            } catch (err) {
              reject(new Error(`El archivo ${file.name} no tiene JSON válido.`));
            }
          };

          reader.onerror = function () {
            reject(new Error(`No se pudo leer el archivo ${file.name}.`));
          };

          reader.readAsText(file, "UTF-8");
        });
      }));

      const existing = getCentralImports();
      const merged = existing.concat(parsedFiles);
      saveCentralImports(merged);

      const updatedCount = applyCentralCountsToProducts(parsedFiles);

      renderCentralSummary();
      renderScanSummary();
      renderZoneProgress();
      setCentralMessage(`Importación completada. Registros aplicados a productos: ${updatedCount}.`, "success");

      fileInput.value = "";
    } catch (error) {
      setCentralMessage(error.message || "Error al importar archivos del modo central.", "error");
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

  populateScanFilters();
  renderScanSummary();
  renderZoneProgress();
  renderCentralSummary();
  setupScanInputAuto();
  setupZoneFilters();
  setupCentralMode();

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
      const code = normalizeText(document.getElementById("resultCode")?.textContent);
      if (!code) return;

      const updated = updateProductReal(code, -1);
      saveLastScan({ code, amount: -1 });

      if (updated) {
        setScanMessage(`Se restó 1 a ${updated.name}.`, "success");
        showScannedProduct(updated);
        renderScanSummary();
        renderZoneProgress();
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
        renderZoneProgress();
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
// LOGIN
// =========================
function setupLogin() {
  const userInput = document.getElementById("user");
  const passInput = document.getElementById("pass");
  const loginBtn = document.getElementById("loginBtn");
  const error = document.getElementById("error");
  const rememberCheckbox = document.getElementById("rememberUser");

  if (!loginBtn) return;

  const savedUser = localStorage.getItem("rememberedUser");
  if (userInput && savedUser) {
    userInput.value = savedUser;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

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

  loginBtn.addEventListener("click", () => {
    const user = userInput?.value.trim() || "";
    const pass = passInput?.value.trim() || "";
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

// =========================
// MIGRACIÓN SUAVE DE DATOS
// =========================
function migrateStoredProductsIfNeeded() {
  const products = getProducts();
  saveProducts(products);
}

// =========================
// DOM READY
// =========================
document.addEventListener("DOMContentLoaded", () => {
  migrateStoredProductsIfNeeded();
  setupLogin();
  setupProductsPage();
  setupScanPage();
});
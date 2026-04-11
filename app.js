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
// STORAGE KEYS
// =========================
const STORAGE_KEYS = {
  products: "products",
  lastScan: "lastScan",
  currentZone: "currentZone",
  scanLogs: "scanLogs",
  finishedPasillos: "finishedPasillos",
  centralImports: "centralImports",
  teamName: "teamName"
};

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

function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function formatZoneLabel(pasillo, fila) {
  const p = normalizeUpper(pasillo || "SIN PASILLO");
  const f = normalizeUpper(fila || "SIN FILA");
  return `Pasillo ${p} · Fila ${f}`;
}

function downloadTextFile(filename, content, mimeType = "application/json") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCsv(value) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

// =========================
// PRODUCTOS (CATÁLOGO)
// =========================
function normalizeProduct(product) {
  return {
    name: normalizeText(product?.name),
    code: normalizeText(product?.code),
    stockTeorico: safeNumber(product?.stockTeorico, 0)
  };
}

function getProducts() {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.products)) || [];
  return raw.map(normalizeProduct);
}

function saveProducts(products) {
  localStorage.setItem(
    STORAGE_KEYS.products,
    JSON.stringify(products.map(normalizeProduct))
  );
}

function findProductByCode(code) {
  const normalizedCode = normalizeText(code);
  return getProducts().find(p => p.code === normalizedCode);
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
      Stock teórico: ${p.stockTeorico}
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
        stockTeorico: stock
      });

      saveProducts(products);

      document.getElementById("productName").value = "";
      document.getElementById("productCode").value = "";
      document.getElementById("productStock").value = "";

      if (msg) msg.textContent = "Producto guardado correctamente.";

      renderProducts();
      renderScanSummary();
      renderCentralDashboard();
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

          if (codeIndex === -1 || nameIndex === -1 || stockIndex === -1) {
            if (csvMsg) csvMsg.textContent = "El CSV debe tener: codigo, nombre, stockTeorico.";
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
              stockTeorico: stock
            });

            added++;
          }

          saveProducts(products);
          renderProducts();
          renderScanSummary();
          renderCentralDashboard();

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
// ZONA ACTUAL
// =========================
function getCurrentZone() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.currentZone)) || {
    pasillo: "",
    fila: ""
  };
}

function saveCurrentZone(zone) {
  const normalized = {
    pasillo: normalizeUpper(zone?.pasillo),
    fila: normalizeUpper(zone?.fila)
  };

  localStorage.setItem(STORAGE_KEYS.currentZone, JSON.stringify(normalized));
  return normalized;
}

function renderCurrentZoneInputs() {
  const zone = getCurrentZone();
  const pasilloInput = document.getElementById("currentPasillo");
  const filaInput = document.getElementById("currentFila");

  if (pasilloInput) pasilloInput.value = zone.pasillo || "";
  if (filaInput) filaInput.value = zone.fila || "";
}

function getZoneFromInputs() {
  return {
    pasillo: normalizeUpper(document.getElementById("currentPasillo")?.value),
    fila: normalizeUpper(document.getElementById("currentFila")?.value)
  };
}

function hasValidZone(zone) {
  return !!normalizeText(zone?.pasillo) && !!normalizeText(zone?.fila);
}

// =========================
// EQUIPO
// =========================
function getTeamName() {
  return normalizeText(localStorage.getItem(STORAGE_KEYS.teamName) || "");
}

function saveTeamName(name) {
  localStorage.setItem(STORAGE_KEYS.teamName, normalizeText(name));
}

function renderTeamNameInput() {
  const input = document.getElementById("teamName");
  if (!input) return;
  input.value = getTeamName();
}

function setTeamMessage(text, type = "info") {
  showInfoMessage("teamMsg", text, type);
}

// =========================
// REGISTROS DE ESCANEO
// =========================
function normalizeScanLog(log) {
  return {
    id: normalizeText(log?.id) || makeId("scan"),
    code: normalizeText(log?.code),
    amount: safeNumber(log?.amount, 0),
    pasillo: normalizeUpper(log?.pasillo),
    fila: normalizeUpper(log?.fila),
    timestamp: log?.timestamp || new Date().toISOString(),
    source: normalizeText(log?.source || "local"),
    team: normalizeText(log?.team || "")
  };
}

function getScanLogs() {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.scanLogs)) || [];
  return raw.map(normalizeScanLog);
}

function saveScanLogs(logs) {
  localStorage.setItem(
    STORAGE_KEYS.scanLogs,
    JSON.stringify(logs.map(normalizeScanLog))
  );
}

function addScanLog(entry) {
  const logs = getScanLogs();
  const normalized = normalizeScanLog(entry);
  logs.push(normalized);
  saveScanLogs(logs);
  return normalized;
}

function removeScanLogById(logId) {
  const logs = getScanLogs();
  const index = logs.findIndex(log => log.id === logId);

  if (index === -1) return false;

  logs.splice(index, 1);
  saveScanLogs(logs);
  return true;
}

function clearAllLocalScanLogs() {
  localStorage.setItem(STORAGE_KEYS.scanLogs, JSON.stringify([]));
  clearLastScan();
}

function getLastScan() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.lastScan)) || null;
}

function saveLastScan(scan) {
  localStorage.setItem(STORAGE_KEYS.lastScan, JSON.stringify(scan));
}

function clearLastScan() {
  localStorage.removeItem(STORAGE_KEYS.lastScan);
}

function getCountedTotalForCode(code) {
  const logs = getScanLogs().filter(log => log.code === normalizeText(code));
  const total = logs.reduce((acc, log) => acc + safeNumber(log.amount, 0), 0);
  return Math.max(0, total);
}

function getLogsForCode(code) {
  return getScanLogs().filter(log => log.code === normalizeText(code));
}

function getZoneBreakdownForCode(code) {
  const logs = getLogsForCode(code);
  const map = {};

  logs.forEach(log => {
    const key = `${log.pasillo}__${log.fila}`;
    if (!map[key]) {
      map[key] = {
        pasillo: log.pasillo,
        fila: log.fila,
        total: 0
      };
    }
    map[key].total += safeNumber(log.amount, 0);
  });

  return Object.values(map)
    .filter(item => item.total > 0)
    .sort((a, b) => {
      const byPasillo = a.pasillo.localeCompare(b.pasillo, "es", { numeric: true });
      if (byPasillo !== 0) return byPasillo;
      return a.fila.localeCompare(b.fila, "es", { numeric: true });
    });
}

// =========================
// PASILLOS TERMINADOS
// =========================
function getFinishedPasillos() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.finishedPasillos)) || [];
}

function saveFinishedPasillos(list) {
  localStorage.setItem(STORAGE_KEYS.finishedPasillos, JSON.stringify(list));
}

function markPasilloAsFinished(pasillo) {
  const normalized = normalizeUpper(pasillo);
  if (!normalized) return false;

  const current = getFinishedPasillos();
  if (current.includes(normalized)) return false;

  current.push(normalized);
  saveFinishedPasillos(current);
  return true;
}

// =========================
// IMPORTACIONES CENTRALES
// =========================
function normalizeCentralImport(fileData) {
  return {
    team: normalizeText(fileData?.team || ""),
    exportedAt: fileData?.exportedAt || "",
    counts: Array.isArray(fileData?.counts)
      ? fileData.counts.map(entry => ({
          code: normalizeText(entry?.code),
          amount: safeNumber(entry?.amount, 0),
          pasillo: normalizeUpper(entry?.pasillo),
          fila: normalizeUpper(entry?.fila),
          timestamp: entry?.timestamp || ""
        }))
      : []
  };
}

function getCentralImports() {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.centralImports)) || [];
  return raw.map(normalizeCentralImport);
}

function saveCentralImports(data) {
  localStorage.setItem(
    STORAGE_KEYS.centralImports,
    JSON.stringify(data.map(normalizeCentralImport))
  );
}

function clearCentralImports() {
  localStorage.setItem(STORAGE_KEYS.centralImports, JSON.stringify([]));
}

// =========================
// MENSAJES
// =========================
function setScanMessage(text, type = "info") {
  showInfoMessage("scanMsg", text, type);
}

function setZoneMessage(text, type = "info") {
  showInfoMessage("zoneMsg", text, type);
}

function setCentralMessage(text, type = "info") {
  showInfoMessage("centralMsg", text, type);
}

function setHistoryMessage(text, type = "info") {
  showInfoMessage("historyMsg", text, type);
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

// =========================
// ESCANEO - PRESENTACIÓN
// =========================
function showScannedProduct(product, zoneOverride = null) {
  const box = document.getElementById("scanResult");
  if (!box || !product) return;

  const totalCounted = getCountedTotalForCode(product.code);
  const zone = zoneOverride || getCurrentZone();

  setText("resultName", product.name);
  setText("resultCode", product.code);
  setText("resultPasillo", zone.pasillo || "-");
  setText("resultFila", zone.fila || "-");
  setText("resultTeorico", product.stockTeorico);
  setText("resultReal", totalCounted);
  setText("resultDiff", totalCounted - product.stockTeorico);

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

  box.innerHTML = products.map(product => {
    const totalCounted = getCountedTotalForCode(product.code);
    const diff = totalCounted - product.stockTeorico;
    const zones = getZoneBreakdownForCode(product.code);

    const zonesHtml = zones.length
      ? zones.map(z => `${formatZoneLabel(z.pasillo, z.fila)}: ${z.total}`).join("<br>")
      : "Sin conteos todavía";

    return `
      <div class="product-item">
        <strong>${product.name}</strong><br>
        Código: ${product.code}<br>
        Teórico: ${product.stockTeorico}<br>
        Contado total: ${totalCounted}<br>
        Diferencia: ${diff}<br>
        <span class="subtitle">Detalle por zona</span><br>
        ${zonesHtml}
      </div>
    `;
  }).join("");
}

function renderZoneProgress() {
  const box = document.getElementById("zoneProgressBox");
  if (!box) return;

  const logs = getScanLogs();
  const currentZone = getCurrentZone();
  const finished = getFinishedPasillos();

  const pasillosSet = new Set();

  logs.forEach(log => {
    if (log.pasillo) pasillosSet.add(log.pasillo);
  });

  finished.forEach(p => {
    if (p) pasillosSet.add(p);
  });

  if (currentZone.pasillo) {
    pasillosSet.add(currentZone.pasillo);
  }

  const pasillos = [...pasillosSet].sort((a, b) =>
    a.localeCompare(b, "es", { numeric: true })
  );

  if (!pasillos.length) {
    box.innerHTML = "<p class='placeholder-text'>Todavía no hay actividad de zonas.</p>";
    return;
  }

  box.innerHTML = pasillos.map(pasillo => {
    const logsPasillo = logs.filter(log => log.pasillo === pasillo);
    const filas = [...new Set(logsPasillo.map(log => log.fila).filter(Boolean))];
    const uniqueCodes = [...new Set(logsPasillo.map(log => log.code).filter(Boolean))];
    const totalScans = logsPasillo.reduce((acc, log) => acc + Math.max(0, safeNumber(log.amount, 0)), 0);
    const isDone = finished.includes(pasillo);
    const progressWidth = isDone ? 100 : logsPasillo.length > 0 ? 60 : 0;
    const stateText = isDone ? "Terminado" : logsPasillo.length > 0 ? "En trabajo" : "Sin actividad";

    return `
      <div class="zone-card ${isDone ? "done" : ""}">
        <strong>Pasillo ${pasillo}</strong><br>
        Estado: ${stateText}<br>
        Filas trabajadas: ${filas.length}<br>
        Productos únicos escaneados: ${uniqueCodes.length}<br>
        Escaneos registrados: ${totalScans}
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressWidth}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

// =========================
// ESCANEO - LÓGICA
// =========================
function processScannedCode(rawCode) {
  const code = normalizeText(rawCode);
  if (!code) return;

  const zone = getCurrentZone();

  if (!hasValidZone(zone)) {
    setScanMessage("Primero elegí y guardá pasillo y fila antes de escanear.", "error");
    playBeep("error");
    vibrateDevice([120, 80, 120]);
    return;
  }

  const found = findProductByCode(code);

  if (!found) {
    setScanMessage(`Producto no encontrado: ${code}`, "error");
    playBeep("error");
    vibrateDevice([120, 80, 120]);
    return;
  }

  const log = addScanLog({
    code,
    amount: 1,
    pasillo: zone.pasillo,
    fila: zone.fila,
    timestamp: new Date().toISOString(),
    source: "local",
    team: getTeamName()
  });

  saveLastScan({
    logId: log.id,
    code: code,
    amount: 1
  });

  setScanMessage(`Escaneo sumado: ${found.name} en ${formatZoneLabel(zone.pasillo, zone.fila)}.`, "success");
  showScannedProduct(found, zone);
  renderScanSummary();
  renderZoneProgress();
  playBeep("ok");
  vibrateDevice(80);
}

function subtractOneFromCurrentProduct() {
  const code = normalizeText(document.getElementById("resultCode")?.textContent);
  if (!code) return;

  const zone = getCurrentZone();

  if (!hasValidZone(zone)) {
    setScanMessage("No hay zona actual guardada.", "error");
    return;
  }

  const product = findProductByCode(code);
  if (!product) return;

  const currentTotal = getCountedTotalForCode(code);
  if (currentTotal <= 0) {
    setScanMessage("Ese producto ya está en cero.", "error");
    playBeep("error");
    vibrateDevice([100, 60, 100]);
    return;
  }

  const log = addScanLog({
    code,
    amount: -1,
    pasillo: zone.pasillo,
    fila: zone.fila,
    timestamp: new Date().toISOString(),
    source: "local",
    team: getTeamName()
  });

  saveLastScan({
    logId: log.id,
    code: code,
    amount: -1
  });

  setScanMessage(`Se restó 1 a ${product.name} en ${formatZoneLabel(zone.pasillo, zone.fila)}.`, "success");
  showScannedProduct(product, zone);
  renderScanSummary();
  renderZoneProgress();
  playBeep("ok");
  vibrateDevice(60);
}

function undoLastScanAction() {
  const lastScan = getLastScan();

  if (!lastScan || !lastScan.logId) {
    setScanMessage("No hay último escaneo para deshacer.", "error");
    playBeep("error");
    vibrateDevice([100, 60, 100]);
    return;
  }

  const removed = removeScanLogById(lastScan.logId);

  if (!removed) {
    setScanMessage("No se pudo deshacer el último escaneo.", "error");
    return;
  }

  const product = findProductByCode(lastScan.code);
  if (product) {
    showScannedProduct(product, getCurrentZone());
  }

  clearLastScan();
  renderScanSummary();
  renderZoneProgress();
  setScanMessage("Último escaneo deshecho correctamente.", "success");
  playBeep("ok");
  vibrateDevice(70);
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
      () => {}
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
// ZONA ACTUAL - SETUP
// =========================
function setupZoneControls() {
  const saveZoneBtn = document.getElementById("saveZoneBtn");
  const nextFilaBtn = document.getElementById("nextFilaBtn");
  const markPasilloDoneBtn = document.getElementById("markPasilloDoneBtn");

  renderCurrentZoneInputs();
  renderZoneProgress();

  if (saveZoneBtn) {
    saveZoneBtn.addEventListener("click", () => {
      const zone = getZoneFromInputs();

      if (!hasValidZone(zone)) {
        setZoneMessage("Completá pasillo y fila para guardar la zona actual.", "error");
        return;
      }

      saveCurrentZone(zone);
      renderZoneProgress();
      setZoneMessage(`Zona guardada: ${formatZoneLabel(zone.pasillo, zone.fila)}.`, "success");
    });
  }

  if (nextFilaBtn) {
    nextFilaBtn.addEventListener("click", () => {
      const filaInput = document.getElementById("currentFila");
      const pasilloInput = document.getElementById("currentPasillo");

      const currentFilaValue = normalizeText(filaInput?.value);
      const currentPasilloValue = normalizeText(pasilloInput?.value);

      if (!currentPasilloValue) {
        setZoneMessage("Primero escribí el pasillo actual.", "error");
        return;
      }

      const currentFilaNumber = safeNumber(currentFilaValue, NaN);

      if (Number.isNaN(currentFilaNumber)) {
        setZoneMessage("Para usar 'Siguiente fila', la fila actual debe ser numérica.", "error");
        return;
      }

      const nextZone = {
        pasillo: normalizeUpper(currentPasilloValue),
        fila: String(currentFilaNumber + 1)
      };

      saveCurrentZone(nextZone);
      renderCurrentZoneInputs();
      renderZoneProgress();
      setZoneMessage(`Ahora estás en ${formatZoneLabel(nextZone.pasillo, nextZone.fila)}.`, "success");
    });
  }

  if (markPasilloDoneBtn) {
    markPasilloDoneBtn.addEventListener("click", () => {
      const zone = getZoneFromInputs();
      const pasillo = normalizeUpper(zone.pasillo);

      if (!pasillo) {
        setZoneMessage("Escribí el pasillo actual para marcarlo como terminado.", "error");
        return;
      }

      const changed = markPasilloAsFinished(pasillo);
      renderZoneProgress();

      if (changed) {
        setZoneMessage(`Pasillo ${pasillo} marcado como terminado.`, "success");
      } else {
        setZoneMessage(`El pasillo ${pasillo} ya estaba marcado como terminado.`);
      }
    });
  }
}

// =========================
// EQUIPO - SETUP / EXPORT
// =========================
function buildTeamExportData() {
  const team = getTeamName() || "Equipo sin nombre";
  const counts = getScanLogs()
    .filter(log => log.source === "local")
    .map(log => ({
      code: log.code,
      amount: log.amount,
      pasillo: log.pasillo,
      fila: log.fila,
      timestamp: log.timestamp
    }));

  return {
    team,
    exportedAt: new Date().toISOString(),
    counts
  };
}

function exportTeamCounts() {
  const logs = getScanLogs().filter(log => log.source === "local");

  if (!logs.length) {
    setTeamMessage("No hay conteos locales para exportar.", "error");
    return;
  }

  const team = getTeamName() || "equipo";
  const safeTeam = team.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `conteo_${safeTeam || "equipo"}_${timestamp}.json`;

  const exportData = buildTeamExportData();
  downloadTextFile(filename, JSON.stringify(exportData, null, 2));
  setTeamMessage(`Conteos exportados correctamente como ${filename}.`, "success");
}

function setupTeamControls() {
  const saveTeamBtn = document.getElementById("saveTeamBtn");
  const exportBtn = document.getElementById("exportTeamCountsBtn");
  const clearBtn = document.getElementById("clearLocalCountsBtn");

  renderTeamNameInput();

  if (saveTeamBtn) {
    saveTeamBtn.addEventListener("click", () => {
      const input = document.getElementById("teamName");
      const name = normalizeText(input?.value);

      if (!name) {
        setTeamMessage("Escribí un nombre de equipo.", "error");
        return;
      }

      saveTeamName(name);
      setTeamMessage(`Nombre de equipo guardado: ${name}.`, "success");
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportTeamCounts();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const logs = getScanLogs().filter(log => log.source === "local");

      if (!logs.length) {
        setTeamMessage("No hay conteos locales para borrar.", "error");
        return;
      }

      clearAllLocalScanLogs();
      renderScanSummary();
      renderZoneProgress();
      setTeamMessage("Conteos locales borrados correctamente.", "success");
    });
  }
}

// =========================
// MODO CENTRAL EN SCAN
// =========================
function renderCentralSummary() {
  const box = document.getElementById("centralSummary");
  if (!box) return;

  const imports = getCentralImports();

  if (!imports.length) {
    box.innerHTML = "<p class='placeholder-text'>Todavía no se importaron conteos de equipos.</p>";
    return;
  }

  box.innerHTML = imports.map((item, index) => {
    const counts = Array.isArray(item.counts) ? item.counts : [];
    return `
      <div class="product-item">
        <strong>Importación ${index + 1}</strong><br>
        Equipo: ${item.team || "Sin nombre"}<br>
        Registros: ${counts.length}
      </div>
    `;
  }).join("");
}

function applyCentralCountsToLogs(importedData) {
  let added = 0;

  importedData.forEach(fileData => {
    const counts = Array.isArray(fileData.counts) ? fileData.counts : [];
    const team = normalizeText(fileData.team || "");

    counts.forEach(entry => {
      const code = normalizeText(entry.code);
      const amount = safeNumber(entry.amount, 0);
      const pasillo = normalizeUpper(entry.pasillo);
      const fila = normalizeUpper(entry.fila);

      if (!code || amount === 0 || !pasillo || !fila) return;
      if (!findProductByCode(code)) return;

      addScanLog({
        code,
        amount,
        pasillo,
        fila,
        timestamp: entry.timestamp || new Date().toISOString(),
        source: "central-import",
        team
      });

      added++;
    });
  });

  return added;
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
              resolve(normalizeCentralImport(parsed));
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

      const added = applyCentralCountsToLogs(parsedFiles);

      renderCentralSummary();
      renderScanSummary();
      renderZoneProgress();
      renderCentralDashboard();
      setCentralMessage(`Importación completada. Registros agregados: ${added}.`, "success");

      fileInput.value = "";
    } catch (error) {
      setCentralMessage(error.message || "Error al importar archivos del modo central.", "error");
    }
  });
}

// =========================
// CENTRAL DE CONTROL (HISTORY)
// =========================
function getCentralCountsFlat() {
  const imports = getCentralImports();
  const all = [];

  imports.forEach(fileData => {
    const team = normalizeText(fileData.team || "");
    const counts = Array.isArray(fileData.counts) ? fileData.counts : [];

    counts.forEach(entry => {
      all.push({
        team,
        code: normalizeText(entry.code),
        amount: safeNumber(entry.amount, 0),
        pasillo: normalizeUpper(entry.pasillo),
        fila: normalizeUpper(entry.fila),
        timestamp: entry.timestamp || ""
      });
    });
  });

  return all;
}

function buildCentralComparisonData() {
  const products = getProducts();
  const counts = getCentralCountsFlat();

  return products.map(product => {
    const related = counts.filter(item => item.code === product.code);
    const contado = related.reduce((acc, item) => acc + item.amount, 0);
    const diferencia = contado - product.stockTeorico;

    const porEquipoMap = {};
    const porZonaMap = {};

    related.forEach(item => {
      const teamKey = item.team || "Sin nombre";
      if (!porEquipoMap[teamKey]) porEquipoMap[teamKey] = 0;
      porEquipoMap[teamKey] += item.amount;

      const zoneKey = `${item.pasillo}__${item.fila}`;
      if (!porZonaMap[zoneKey]) {
        porZonaMap[zoneKey] = {
          pasillo: item.pasillo,
          fila: item.fila,
          total: 0
        };
      }
      porZonaMap[zoneKey].total += item.amount;
    });

    return {
      ...product,
      contado,
      diferencia,
      porEquipo: Object.entries(porEquipoMap).map(([team, total]) => ({ team, total })),
      porZona: Object.values(porZonaMap)
    };
  });
}

function renderCentralStats() {
  const box = document.getElementById("centralStats");
  if (!box) return;

  const imports = getCentralImports();
  const counts = getCentralCountsFlat();
  const products = getProducts();
  const comparison = buildCentralComparisonData();

  const totalArchivos = imports.length;
  const totalRegistros = counts.length;
  const totalProductos = products.length;
  const totalContado = counts.reduce((acc, item) => acc + item.amount, 0);
  const conDiferencia = comparison.filter(item => item.diferencia !== 0).length;

  box.innerHTML = `
    <div class="product-item">
      <strong>Archivos importados</strong><br>
      ${totalArchivos}
    </div>
    <div class="product-item">
      <strong>Registros importados</strong><br>
      ${totalRegistros}
    </div>
    <div class="product-item">
      <strong>Productos en catálogo</strong><br>
      ${totalProductos}
    </div>
    <div class="product-item">
      <strong>Total contado consolidado</strong><br>
      ${totalContado}
    </div>
    <div class="product-item">
      <strong>Productos con diferencia</strong><br>
      ${conDiferencia}
    </div>
  `;
}

function renderCentralComparisonList() {
  const box = document.getElementById("centralComparisonList");
  if (!box) return;

  const searchInput = document.getElementById("centralSearch");
  const search = normalizeText(searchInput?.value).toLowerCase();

  const comparison = buildCentralComparisonData();

  let filtered = comparison;

  if (search) {
    filtered = comparison.filter(item =>
      item.name.toLowerCase().includes(search) ||
      item.code.toLowerCase().includes(search)
    );
  }

  if (!filtered.length) {
    box.innerHTML = "<p class='placeholder-text'>No hay resultados.</p>";
    return;
  }

  box.innerHTML = filtered.map(item => {
    let diffClass = "diff-ok";
    let diffText = "OK";

    if (item.diferencia < 0) {
      diffClass = "diff-negative";
      diffText = "FALTANTE";
    }

    if (item.diferencia > 0) {
      diffClass = "diff-positive";
      diffText = "SOBRANTE";
    }

    const equipos = item.porEquipo.length
      ? item.porEquipo.map(eq => `${eq.team}: ${eq.total}`).join("<br>")
      : "Sin registros";

    const zonas = item.porZona.length
      ? item.porZona.map(z => `${formatZoneLabel(z.pasillo, z.fila)}: ${z.total}`).join("<br>")
      : "Sin registros";

    return `
      <div class="product-item ${diffClass}">
        <strong>${item.name}</strong><br>
        Código: ${item.code}<br>
        Stock teórico: ${item.stockTeorico}<br>
        Contado consolidado: ${item.contado}<br>
        Diferencia: ${item.diferencia} (${diffText})<br>
        <span class="subtitle">Por equipo</span><br>
        ${equipos}<br>
        <span class="subtitle">Por zona</span><br>
        ${zonas}
      </div>
    `;
  }).join("");
}

function renderCentralTeamsList() {
  const box = document.getElementById("centralTeamsList");
  if (!box) return;

  const imports = getCentralImports();

  if (!imports.length) {
    box.innerHTML = "<p class='placeholder-text'>Todavía no se importaron equipos.</p>";
    return;
  }

  box.innerHTML = imports.map((item, index) => {
    const counts = Array.isArray(item.counts) ? item.counts : [];
    const total = counts.reduce((acc, entry) => acc + safeNumber(entry.amount, 0), 0);

    const zones = {};
    counts.forEach(entry => {
      const key = `${normalizeUpper(entry.pasillo)}__${normalizeUpper(entry.fila)}`;
      if (!zones[key]) {
        zones[key] = {
          pasillo: normalizeUpper(entry.pasillo),
          fila: normalizeUpper(entry.fila),
          total: 0
        };
      }
      zones[key].total += safeNumber(entry.amount, 0);
    });

    const zonesHtml = Object.values(zones).length
      ? Object.values(zones).map(z => `${formatZoneLabel(z.pasillo, z.fila)}: ${z.total}`).join("<br>")
      : "Sin detalle de zonas";

    return `
      <div class="product-item">
        <strong>Equipo ${item.team || index + 1}</strong><br>
        Exportado: ${item.exportedAt || "Sin fecha"}<br>
        Registros: ${counts.length}<br>
        Total contado: ${total}<br>
        <span class="subtitle">Zonas trabajadas</span><br>
        ${zonesHtml}
      </div>
    `;
  }).join("");
}

function renderCentralDashboard() {
  renderCentralStats();
  renderCentralComparisonList();
  renderCentralTeamsList();
}

// =========================
// EXPORTACIÓN CENTRAL
// =========================
function exportToExcel() {
  const data = buildCentralComparisonData();

  if (!data.length) {
    alert("No hay datos para exportar");
    return;
  }

  let csv = "Codigo,Nombre,Teorico,Contado,Diferencia,Estado\n";

  data.forEach(item => {
    const estado = item.diferencia < 0 ? "FALTANTE" : item.diferencia > 0 ? "SOBRANTE" : "OK";
    csv += [
      escapeCsv(item.code),
      escapeCsv(item.name),
      item.stockTeorico,
      item.contado,
      item.diferencia,
      escapeCsv(estado)
    ].join(",") + "\n";
  });

  downloadTextFile("reporte_auditoria.csv", csv, "text/csv;charset=utf-8");
}

function exportToPDF() {
  const data = buildCentralComparisonData();

  if (!data.length) {
    alert("No hay datos para exportar");
    return;
  }

  const totalProductos = data.length;
  const faltantes = data.filter(item => item.diferencia < 0).length;
  const sobrantes = data.filter(item => item.diferencia > 0).length;
  const ok = data.filter(item => item.diferencia === 0).length;

  let rows = "";

  data.forEach(item => {
    const estado = item.diferencia < 0 ? "FALTANTE" : item.diferencia > 0 ? "SOBRANTE" : "OK";
    rows += `
      <tr>
        <td>${item.code}</td>
        <td>${item.name}</td>
        <td>${item.stockTeorico}</td>
        <td>${item.contado}</td>
        <td>${item.diferencia}</td>
        <td>${estado}</td>
      </tr>
    `;
  });

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte de Auditoría</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 24px;
          color: #111;
        }
        h1 {
          margin-bottom: 8px;
        }
        .meta {
          margin-bottom: 20px;
        }
        .summary {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .summary-box {
          border: 1px solid #ccc;
          padding: 10px 14px;
          border-radius: 8px;
          min-width: 140px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 8px;
          text-align: left;
        }
        th {
          background: #f3f3f3;
        }
      </style>
    </head>
    <body>
      <h1>Reporte de Auditoría</h1>
      <div class="meta">
        <div>Fecha: ${new Date().toLocaleString()}</div>
      </div>

      <div class="summary">
        <div class="summary-box"><strong>Productos</strong><br>${totalProductos}</div>
        <div class="summary-box"><strong>OK</strong><br>${ok}</div>
        <div class="summary-box"><strong>Faltantes</strong><br>${faltantes}</div>
        <div class="summary-box"><strong>Sobrantes</strong><br>${sobrantes}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Teórico</th>
            <th>Contado</th>
            <th>Diferencia</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (!win) {
    alert("El navegador bloqueó la ventana del PDF. Permití ventanas emergentes.");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

function setupCentralExportButtons() {
  const excelBtn = document.getElementById("exportExcelBtn");
  const pdfBtn = document.getElementById("exportPdfBtn");

  if (excelBtn) {
    excelBtn.addEventListener("click", exportToExcel);
  }

  if (pdfBtn) {
    pdfBtn.addEventListener("click", exportToPDF);
  }
}

// =========================
// CENTRAL DE CONTROL - SETUP
// =========================
function setupHistoryPage() {
  const importBtn = document.getElementById("centralHistoryImportBtn");
  const fileInput = document.getElementById("centralHistoryFileInput");
  const clearBtn = document.getElementById("clearCentralDataBtn");
  const searchInput = document.getElementById("centralSearch");

  if (!importBtn || !fileInput) {
    renderCentralDashboard();
    setupCentralExportButtons();
    return;
  }

  renderCentralDashboard();
  setupCentralExportButtons();

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderCentralComparisonList();
    });
  }

  importBtn.addEventListener("click", async () => {
    if (!fileInput.files || fileInput.files.length === 0) {
      setHistoryMessage("Seleccioná uno o más archivos JSON.", "error");
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
              resolve(normalizeCentralImport(parsed));
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

      renderCentralDashboard();
      renderCentralSummary();
      setHistoryMessage(`Archivos importados correctamente: ${parsedFiles.length}.`, "success");
      fileInput.value = "";
    } catch (error) {
      setHistoryMessage(error.message || "Error al importar archivos.", "error");
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearCentralImports();
      renderCentralDashboard();
      renderCentralSummary();
      setHistoryMessage("Datos centrales borrados correctamente.", "success");
    });
  }
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

  renderCurrentZoneInputs();
  renderTeamNameInput();
  renderScanSummary();
  renderZoneProgress();
  renderCentralSummary();
  setupScanInputAuto();
  setupZoneControls();
  setupTeamControls();
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
      subtractOneFromCurrentProduct();
      input.focus();
    });
  }

  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      undoLastScanAction();
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
// MIGRACIÓN SUAVE
// =========================
function migrateStoredProductsIfNeeded() {
  const products = getProducts().map(product => ({
    name: product.name,
    code: product.code,
    stockTeorico: product.stockTeorico
  }));

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
  setupHistoryPage();
});
// =========================
// CONFIG
// =========================
const USER = "Jesus96";
const PASS = "123";

const STORAGE_KEYS = {
  logged: "logged",
  rememberedUser: "rememberedUser",
  products: "products",
  lastScan: "lastScan",
  currentZone: "currentZone",
  zoneProgress: "zoneProgress",
  teamName: "teamName"
};

const protectedPages = [
  "home.html",
  "new-control.html",
  "products.html",
  "history.html",
  "scan.html"
];

// =========================
// HELPERS
// =========================
function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function toPositiveInt(value) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

function getCurrentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =========================
// STORAGE
// =========================
function getLogged() {
  return localStorage.getItem(STORAGE_KEYS.logged) === "true";
}

function setLogged(value) {
  localStorage.setItem(STORAGE_KEYS.logged, value ? "true" : "false");
}

function getProducts() {
  const products = safeParse(localStorage.getItem(STORAGE_KEYS.products), []);
  return Array.isArray(products) ? products : [];
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
}

function getLastScan() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.lastScan), null);
}

function saveLastScan(scan) {
  localStorage.setItem(STORAGE_KEYS.lastScan, JSON.stringify(scan));
}

function clearLastScan() {
  localStorage.removeItem(STORAGE_KEYS.lastScan);
}

function getCurrentZone() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.currentZone), {
    pasillo: "",
    fila: ""
  });
}

function saveCurrentZone(zone) {
  localStorage.setItem(STORAGE_KEYS.currentZone, JSON.stringify(zone));
}

function getZoneProgress() {
  const progress = safeParse(localStorage.getItem(STORAGE_KEYS.zoneProgress), []);
  return Array.isArray(progress) ? progress : [];
}

function saveZoneProgress(progress) {
  localStorage.setItem(STORAGE_KEYS.zoneProgress, JSON.stringify(progress));
}

function getTeamName() {
  return localStorage.getItem(STORAGE_KEYS.teamName) || "";
}

function saveTeamName(name) {
  localStorage.setItem(STORAGE_KEYS.teamName, name);
}

// =========================
// NAVEGACIÓN / SEGURIDAD
// =========================
function protectPages() {
  const currentPage = getCurrentPage();

  if ((currentPage === "index.html" || currentPage === "") && getLogged()) {
    window.location.href = "home.html";
    return;
  }

  if (protectedPages.includes(currentPage) && !getLogged()) {
    window.location.href = "index.html";
  }
}

function goTo(page) {
  window.location.href = page;
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.logged);
  window.location.href = "index.html";
}

// =========================
// MENSAJES
// =========================
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setMessage(id, text, type = "info") {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = text;
  el.classList.remove("success-msg", "error-msg");

  if (type === "success") el.classList.add("success-msg");
  if (type === "error") el.classList.add("error-msg");
}

function setScanMessage(text, type = "info") {
  setMessage("scanMsg", text, type);
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
  } catch {
    // evitar romper si el navegador bloquea audio
  }
}

function vibrateDevice(pattern = 100) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

// =========================
// PRODUCTOS
// =========================
function createProduct({ name, code, stockTeorico }) {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name: normalizeText(name),
    code: normalizeCode(code),
    stockTeorico: toPositiveInt(stockTeorico),
    stockReal: 0,
    countsByZone: {}
  };
}

function findProductByCode(code) {
  const normalized = normalizeCode(code);
  return getProducts().find((p) => normalizeCode(p.code) === normalized) || null;
}

function renderProducts() {
  const list = document.getElementById("productsList");
  if (!list) return;

  const products = getProducts();

  if (products.length === 0) {
    list.innerHTML = "<p class='placeholder-text'>Todavía no hay productos cargados.</p>";
    return;
  }

  list.innerHTML = products
    .map((p) => {
      const diff = (p.stockReal || 0) - (p.stockTeorico || 0);
      return `
        <div class="product-item">
          <strong>${escapeHtml(p.name)}</strong><br>
          Código: ${escapeHtml(p.code)}<br>
          Stock teórico: ${p.stockTeorico || 0}<br>
          Stock real: ${p.stockReal || 0}<br>
          Diferencia: ${diff}
        </div>
      `;
    })
    .join("");
}

function addProductFromForm() {
  const nameInput = document.getElementById("productName");
  const codeInput = document.getElementById("productCode");
  const stockInput = document.getElementById("productStock");

  if (!nameInput || !codeInput || !stockInput) return;

  const name = normalizeText(nameInput.value);
  const code = normalizeCode(codeInput.value);
  const stock = toPositiveInt(stockInput.value);

  if (!name || !code || stockInput.value === "") {
    setMessage("productMsg", "Completá nombre, código y stock teórico.", "error");
    return;
  }

  const products = getProducts();
  const exists = products.some((p) => normalizeCode(p.code) === code);

  if (exists) {
    setMessage("productMsg", "Ya existe un producto con ese código.", "error");
    return;
  }

  products.push(createProduct({ name, code, stockTeorico: stock }));
  saveProducts(products);

  nameInput.value = "";
  codeInput.value = "";
  stockInput.value = "";

  setMessage("productMsg", "Producto guardado correctamente.", "success");
  renderProducts();
  renderScanSummary();
}

function importProductsFromCsvText(csvText) {
  const lines = String(csvText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { added: 0, skipped: 0, error: "El archivo CSV está vacío." };
  }

  const products = getProducts();
  const existingCodes = new Set(products.map((p) => normalizeCode(p.code)));

  let startIndex = 0;
  const firstLine = lines[0].toLowerCase();
  if (
    firstLine.includes("codigo") ||
    firstLine.includes("nombre") ||
    firstLine.includes("stock")
  ) {
    startIndex = 1;
  }

  let added = 0;
  let skipped = 0;

  for (let i = startIndex; i < lines.length; i += 1) {
    const row = lines[i];
    const parts = row.split(",").map((part) => part.trim());

    if (parts.length < 3) {
      skipped += 1;
      continue;
    }

    const code = normalizeCode(parts[0]);
    const name = normalizeText(parts[1]);
    const stockTeorico = toPositiveInt(parts[2]);

    if (!code || !name) {
      skipped += 1;
      continue;
    }

    if (existingCodes.has(code)) {
      skipped += 1;
      continue;
    }

    products.push(createProduct({ name, code, stockTeorico }));
    existingCodes.add(code);
    added += 1;
  }

  saveProducts(products);
  return { added, skipped, error: null };
}

function setupProductsPage() {
  const saveBtn = document.getElementById("saveProductBtn");
  const importBtn = document.getElementById("importCsvBtn");
  const csvInput = document.getElementById("csvFileInput");
  const scanProductCodeBtn = document.getElementById("scanProductCodeBtn");
  const stopProductCameraBtn = document.getElementById("stopProductCameraBtn");

  if (!saveBtn && !importBtn && !scanProductCodeBtn) return;

  renderProducts();

  if (saveBtn) {
    saveBtn.addEventListener("click", addProductFromForm);
  }

  if (importBtn && csvInput) {
    importBtn.addEventListener("click", () => {
      const file = csvInput.files?.[0];

      if (!file) {
        setMessage("csvMsg", "Seleccioná un archivo CSV.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = importProductsFromCsvText(reader.result || "");
        if (result.error) {
          setMessage("csvMsg", result.error, "error");
          return;
        }

        setMessage(
          "csvMsg",
          `Importación terminada. Agregados: ${result.added}. Omitidos: ${result.skipped}.`,
          "success"
        );

        csvInput.value = "";
        renderProducts();
        renderScanSummary();
      };

      reader.onerror = () => {
        setMessage("csvMsg", "No se pudo leer el archivo CSV.", "error");
      };

      reader.readAsText(file);
    });
  }

  if (scanProductCodeBtn) {
    scanProductCodeBtn.addEventListener("click", async () => {
      await startProductCameraScanner();
    });
  }

  if (stopProductCameraBtn) {
    stopProductCameraBtn.addEventListener("click", async () => {
      await stopProductCameraScanner();
    });
  }
}

// =========================
// ZONAS
// =========================
function getZoneKey(pasillo, fila) {
  return `P${normalizeText(pasillo)}-F${normalizeText(fila)}`;
}

function getReadableZone(pasillo, fila) {
  if (!pasillo && !fila) return "Sin zona";
  return `Pasillo ${pasillo || "-"} / Fila ${fila || "-"}`;
}

function renderCurrentZone() {
  const zone = getCurrentZone();
  const pasilloInput = document.getElementById("currentPasillo");
  const filaInput = document.getElementById("currentFila");

  if (pasilloInput) pasilloInput.value = zone.pasillo || "";
  if (filaInput) filaInput.value = zone.fila || "";
}

function saveZoneFromInputs() {
  const pasillo = normalizeText(document.getElementById("currentPasillo")?.value);
  const fila = normalizeText(document.getElementById("currentFila")?.value);

  if (!pasillo || !fila) {
    setMessage("zoneMsg", "Completá pasillo y fila.", "error");
    return null;
  }

  const zone = { pasillo, fila };
  saveCurrentZone(zone);
  setMessage("zoneMsg", `Zona guardada: ${getReadableZone(pasillo, fila)}.`, "success");
  return zone;
}

function nextFila() {
  const pasilloInput = document.getElementById("currentPasillo");
  const filaInput = document.getElementById("currentFila");

  if (!pasilloInput || !filaInput) return;

  const pasillo = normalizeText(pasilloInput.value);
  const fila = normalizeText(filaInput.value);

  if (!pasillo || !fila) {
    setMessage("zoneMsg", "Primero guardá una zona válida.", "error");
    return;
  }

  const filaNum = parseInt(fila, 10);
  const nextValue = Number.isNaN(filaNum) ? `${fila}-1` : String(filaNum + 1);

  filaInput.value = nextValue;
  saveZoneFromInputs();
  renderZoneProgress();
}

function markPasilloDone() {
  const zone = getCurrentZone();

  if (!zone.pasillo) {
    setMessage("zoneMsg", "No hay pasillo actual para marcar.", "error");
    return;
  }

  const progress = getZoneProgress();
  const existing = progress.find((item) => item.pasillo === zone.pasillo);

  if (existing) {
    existing.done = true;
    existing.lastFila = zone.fila || existing.lastFila || "";
  } else {
    progress.push({
      pasillo: zone.pasillo,
      lastFila: zone.fila || "",
      done: true
    });
  }

  saveZoneProgress(progress);
  setMessage("zoneMsg", `Pasillo ${zone.pasillo} marcado como terminado.`, "success");
  renderZoneProgress();
}

function updateZoneProgressAfterScan(zone) {
  if (!zone?.pasillo) return;

  const progress = getZoneProgress();
  const existing = progress.find((item) => item.pasillo === zone.pasillo);

  if (existing) {
    existing.lastFila = zone.fila || existing.lastFila || "";
    if (existing.done !== true) existing.done = false;
  } else {
    progress.push({
      pasillo: zone.pasillo,
      lastFila: zone.fila || "",
      done: false
    });
  }

  saveZoneProgress(progress);
}

function renderZoneProgress() {
  const box = document.getElementById("zoneProgressBox");
  if (!box) return;

  const progress = getZoneProgress();

  if (progress.length === 0) {
    box.innerHTML = "<p class='placeholder-text'>Todavía no hay progreso de zonas.</p>";
    return;
  }

  const sorted = [...progress].sort((a, b) => {
    const aNum = parseInt(a.pasillo, 10);
    const bNum = parseInt(b.pasillo, 10);

    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return String(a.pasillo).localeCompare(String(b.pasillo));
  });

  const doneCount = sorted.filter((item) => item.done).length;
  const percent = Math.round((doneCount / sorted.length) * 100);

  box.innerHTML = `
    <div class="zone-card">
      <strong>Progreso general</strong>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${percent}%"></div>
      </div>
      <p style="margin-top:8px;">${doneCount} de ${sorted.length} pasillos marcados como terminados.</p>
    </div>
    ${sorted
      .map(
        (item) => `
          <div class="zone-card ${item.done ? "done" : ""}">
            <strong>Pasillo ${escapeHtml(item.pasillo)}</strong><br>
            Última fila: ${escapeHtml(item.lastFila || "-")}<br>
            Estado: ${item.done ? "Terminado" : "En progreso"}
          </div>
        `
      )
      .join("")}
  `;
}

// =========================
// ESCANEO
// =========================
function updateProductReal(code, amount, zone = null) {
  const products = getProducts();
  const normalizedCode = normalizeCode(code);
  const index = products.findIndex((p) => normalizeCode(p.code) === normalizedCode);

  if (index === -1) return null;

  const product = products[index];
  const currentReal = toPositiveInt(product.stockReal);
  const nextReal = Math.max(0, currentReal + amount);

  product.stockReal = nextReal;
  product.countsByZone = product.countsByZone || {};

  if (zone?.pasillo && zone?.fila) {
    const zoneKey = getZoneKey(zone.pasillo, zone.fila);
    const currentZoneCount = toPositiveInt(product.countsByZone[zoneKey]);
    const nextZoneCount = Math.max(0, currentZoneCount + amount);

    if (nextZoneCount === 0) {
      delete product.countsByZone[zoneKey];
    } else {
      product.countsByZone[zoneKey] = nextZoneCount;
    }
  }

  saveProducts(products);
  return product;
}

function showScannedProduct(product, zone = null) {
  const box = document.getElementById("scanResult");
  if (!box || !product) return;

  const currentZone = zone || getCurrentZone();

  setText("resultName", product.name);
  setText("resultCode", product.code);
  setText("resultPasillo", currentZone.pasillo || "-");
  setText("resultFila", currentZone.fila || "-");
  setText("resultTeorico", String(product.stockTeorico || 0));
  setText("resultReal", String(product.stockReal || 0));
  setText("resultDiff", String((product.stockReal || 0) - (product.stockTeorico || 0)));

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

  box.innerHTML = products
    .map((p) => {
      const diff = (p.stockReal || 0) - (p.stockTeorico || 0);
      return `
        <div class="product-item">
          <strong>${escapeHtml(p.name)}</strong><br>
          Código: ${escapeHtml(p.code)}<br>
          Teórico: ${p.stockTeorico || 0}<br>
          Real: ${p.stockReal || 0}<br>
          Diferencia: ${diff}
        </div>
      `;
    })
    .join("");
}

function processScannedCode(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return;

  const zone = getCurrentZone();

  if (!zone.pasillo || !zone.fila) {
    setScanMessage("Guardá primero pasillo y fila antes de escanear.", "error");
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

  const updated = updateProductReal(code, 1, zone);
  if (!updated) return;

  saveLastScan({
    code,
    amount: 1,
    zone
  });

  updateZoneProgressAfterScan(zone);
  setScanMessage(`Escaneo sumado: ${updated.name}`, "success");
  showScannedProduct(updated, zone);
  renderScanSummary();
  renderZoneProgress();
  playBeep("ok");
  vibrateDevice(80);
}

// =========================
// CÁMARA SCAN PAGE
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

        if (decodedText === lastCameraScan && now - lastCameraScanTime < 1200) {
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
// CÁMARA PRODUCTS PAGE
// =========================
let productCameraInstance = null;
let productCameraRunning = false;
let lastProductCameraScan = "";
let lastProductCameraScanTime = 0;

async function startProductCameraScanner() {
  const reader = document.getElementById("productReader");
  const codeInput = document.getElementById("productCode");

  if (!reader || !codeInput || productCameraRunning) return;

  if (typeof Html5Qrcode === "undefined") {
    setMessage("productMsg", "No se cargó la librería de cámara.", "error");
    return;
  }

  reader.classList.remove("hidden");

  try {
    productCameraInstance = new Html5Qrcode("productReader");

    await productCameraInstance.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 140 },
        aspectRatio: 1.7778
      },
      async (decodedText) => {
        const now = Date.now();

        if (
          decodedText === lastProductCameraScan &&
          now - lastProductCameraScanTime < 1200
        ) {
          return;
        }

        lastProductCameraScan = decodedText;
        lastProductCameraScanTime = now;

        codeInput.value = normalizeCode(decodedText);
        setMessage("productMsg", "Código escaneado correctamente.", "success");
        playBeep("ok");
        vibrateDevice(60);

        await stopProductCameraScanner();
        codeInput.focus();
      },
      () => {
        // ignorar errores de lectura continua
      }
    );

    productCameraRunning = true;
    setMessage("productMsg", "Cámara activa para cargar código.", "success");
  } catch (error) {
    console.error("Error al abrir cámara de producto:", error);
    reader.classList.add("hidden");
    setMessage("productMsg", "No se pudo abrir la cámara.", "error");
  }
}

async function stopProductCameraScanner() {
  const reader = document.getElementById("productReader");

  if (!productCameraRunning || !productCameraInstance) {
    if (reader) reader.classList.add("hidden");
    return;
  }

  try {
    await productCameraInstance.stop();
    await productCameraInstance.clear();
  } catch (error) {
    console.warn("Error al cerrar cámara de producto:", error);
  }

  productCameraRunning = false;
  productCameraInstance = null;

  if (reader) reader.classList.add("hidden");
}

// =========================
// INPUT / PISTOLA
// =========================
function setupScanInputAuto() {
  const input = document.getElementById("scanCode");
  if (!input) return;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const code = normalizeCode(input.value);
      if (!code) return;

      processScannedCode(code);
      input.value = "";
      input.focus();
    }
  });
}

// =========================
// EQUIPO / EXPORTACIÓN JSON
// =========================
function exportTeamCounts() {
  const teamNameInput = document.getElementById("teamName");
  const teamName = normalizeText(teamNameInput?.value || getTeamName());

  if (!teamName) {
    setMessage("teamMsg", "Escribí un nombre de equipo antes de exportar.", "error");
    return;
  }

  saveTeamName(teamName);

  const products = getProducts()
    .filter((p) => (p.stockReal || 0) > 0)
    .map((p) => ({
      name: p.name,
      code: p.code,
      stockTeorico: p.stockTeorico || 0,
      stockReal: p.stockReal || 0,
      difference: (p.stockReal || 0) - (p.stockTeorico || 0),
      countsByZone: p.countsByZone || {}
    }));

  const payload = {
    teamName,
    exportedAt: new Date().toISOString(),
    zoneProgress: getZoneProgress(),
    products
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });

  const safeTeamName = teamName.replace(/[^\w-]+/g, "_");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `conteos_${safeTeamName}.json`;
  link.click();
  URL.revokeObjectURL(link.href);

  setMessage("teamMsg", "Conteos del equipo exportados correctamente.", "success");
}

function clearLocalCounts() {
  const products = getProducts().map((p) => ({
    ...p,
    stockReal: 0,
    countsByZone: {}
  }));

  saveProducts(products);
  clearLastScan();
  saveZoneProgress([]);

  setMessage("teamMsg", "Conteos locales borrados correctamente.", "success");
  renderScanSummary();
  renderZoneProgress();

  const scanResult = document.getElementById("scanResult");
  if (scanResult) scanResult.classList.add("hidden");
}

function importTeamCountsFiles(files) {
  if (!files.length) {
    setMessage("centralMsg", "Seleccioná al menos un archivo JSON.", "error");
    return;
  }

  const readers = [...files].map(
    (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          try {
            const parsed = JSON.parse(reader.result);
            resolve(parsed);
          } catch {
            reject(new Error(`Archivo inválido: ${file.name}`));
          }
        };

        reader.onerror = () => reject(new Error(`No se pudo leer: ${file.name}`));
        reader.readAsText(file);
      })
  );

  Promise.all(readers)
    .then((data) => {
      renderCentralSummary(data);
      setMessage("centralMsg", "Archivos importados correctamente.", "success");
    })
    .catch((error) => {
      setMessage("centralMsg", error.message, "error");
    });
}

function renderCentralSummary(teamPayloads) {
  const box = document.getElementById("centralSummary");
  if (!box) return;

  const aggregate = new Map();

  for (const payload of teamPayloads) {
    const products = Array.isArray(payload?.products) ? payload.products : [];

    for (const item of products) {
      const code = normalizeCode(item.code);
      if (!code) continue;

      if (!aggregate.has(code)) {
        aggregate.set(code, {
          name: item.name || "Sin nombre",
          code,
          stockTeorico: toPositiveInt(item.stockTeorico),
          stockReal: 0,
          teams: new Set()
        });
      }

      const current = aggregate.get(code);
      current.stockReal += toPositiveInt(item.stockReal);
      if (payload?.teamName) current.teams.add(payload.teamName);
    }
  }

  const consolidated = [...aggregate.values()];

  if (consolidated.length === 0) {
    box.innerHTML = "<p class='placeholder-text'>Todavía no hay datos importados.</p>";
    return;
  }

  consolidated.sort((a, b) => a.code.localeCompare(b.code));

  box.innerHTML = consolidated
    .map((item) => {
      const diff = item.stockReal - item.stockTeorico;
      let diffClass = "diff-ok";

      if (diff < 0) diffClass = "diff-negative";
      if (diff > 0) diffClass = "diff-positive";

      return `
        <div class="product-item ${diffClass}">
          <strong>${escapeHtml(item.name)}</strong><br>
          Código: ${escapeHtml(item.code)}<br>
          Teórico: ${item.stockTeorico}<br>
          Consolidado real: ${item.stockReal}<br>
          Diferencia: ${diff}<br>
          Equipos: ${escapeHtml([...item.teams].join(", ") || "-")}
        </div>
      `;
    })
    .join("");
}

// =========================
// LOGIN
// =========================
function setupLoginPage() {
  const userInput = document.getElementById("user");
  const passInput = document.getElementById("pass");
  const loginBtn = document.getElementById("loginBtn");
  const rememberCheckbox = document.getElementById("rememberUser");
  const togglePass = document.getElementById("togglePass");

  if (!userInput || !passInput || !loginBtn) return;

  const savedUser = localStorage.getItem(STORAGE_KEYS.rememberedUser);
  if (savedUser) {
    userInput.value = savedUser;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  if (togglePass) {
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
    const user = normalizeText(userInput.value);
    const pass = normalizeText(passInput.value);
    const remember = rememberCheckbox?.checked;

    if (user.toLowerCase() === USER.toLowerCase() && pass === PASS) {
      setLogged(true);

      if (remember) {
        localStorage.setItem(STORAGE_KEYS.rememberedUser, user);
      } else {
        localStorage.removeItem(STORAGE_KEYS.rememberedUser);
      }

      window.location.href = "home.html";
    } else {
      setText("error", "Usuario o contraseña incorrectos");
    }
  });
}

// =========================
// SETUP SCAN PAGE
// =========================
function setupScanPage() {
  const input = document.getElementById("scanCode");
  if (!input) return;

  const minusBtn = document.getElementById("minusOneBtn");
  const undoBtn = document.getElementById("undoScanBtn");
  const startCameraBtn = document.getElementById("startCameraBtn");
  const stopCameraBtn = document.getElementById("stopCameraBtn");
  const saveZoneBtn = document.getElementById("saveZoneBtn");
  const nextFilaBtn = document.getElementById("nextFilaBtn");
  const markPasilloDoneBtn = document.getElementById("markPasilloDoneBtn");
  const saveTeamBtn = document.getElementById("saveTeamBtn");
  const exportTeamCountsBtn = document.getElementById("exportTeamCountsBtn");
  const clearLocalCountsBtn = document.getElementById("clearLocalCountsBtn");
  const importTeamCountsBtn = document.getElementById("importTeamCountsBtn");
  const teamCountFileInput = document.getElementById("teamCountFileInput");
  const teamNameInput = document.getElementById("teamName");

  renderCurrentZone();
  renderZoneProgress();
  renderScanSummary();
  setupScanInputAuto();
  input.focus();

  if (teamNameInput) {
    teamNameInput.value = getTeamName();
  }

  if (saveZoneBtn) {
    saveZoneBtn.addEventListener("click", () => {
      saveZoneFromInputs();
      renderZoneProgress();
      input.focus();
    });
  }

  if (nextFilaBtn) {
    nextFilaBtn.addEventListener("click", () => {
      input.focus();
    });
  }

  if (markPasilloDoneBtn) {
    markPasilloDoneBtn.addEventListener("click", () => {
      markPasilloDone();
      input.focus();
    });
  }

  if (startCameraBtn) {
    startCameraBtn.addEventListener("click", async () => {
      await startCameraScanner();
    });
  }

  if (stopCameraBtn) {
    stopCameraBtn.addEventListener("click", async () => {
      await stopCameraScanner();
      input.focus();
    });
  }

  if (minusBtn) {
    minusBtn.addEventListener("click", () => {
      const code = normalizeCode(document.getElementById("resultCode")?.textContent);
      const zone = getCurrentZone();

      if (!code) return;

      const updated = updateProductReal(code, -1, zone);
      saveLastScan({ code, amount: -1, zone });

      if (updated) {
        setScanMessage(`Se restó 1 a ${updated.name}.`, "success");
        showScannedProduct(updated, zone);
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
      const updated = updateProductReal(lastScan.code, reverseAmount, lastScan.zone);

      if (updated) {
        setScanMessage("Último escaneo deshecho correctamente.", "success");
        showScannedProduct(updated, lastScan.zone);
        renderScanSummary();
        renderZoneProgress();
        playBeep("ok");
        vibrateDevice(70);
      }

      clearLastScan();
      input.focus();
    });
  }

  if (saveTeamBtn && teamNameInput) {
    saveTeamBtn.addEventListener("click", () => {
      const name = normalizeText(teamNameInput.value);
      if (!name) {
        setMessage("teamMsg", "Escribí un nombre de equipo.", "error");
        return;
      }

      saveTeamName(name);
      setMessage("teamMsg", "Nombre de equipo guardado.", "success");
    });
  }

  if (exportTeamCountsBtn) {
    exportTeamCountsBtn.addEventListener("click", exportTeamCounts);
  }

  if (clearLocalCountsBtn) {
    clearLocalCountsBtn.addEventListener("click", clearLocalCounts);
  }

  if (importTeamCountsBtn && teamCountFileInput) {
    importTeamCountsBtn.addEventListener("click", () => {
      importTeamCountsFiles(teamCountFileInput.files || []);
    });
  }

  window.addEventListener("beforeunload", () => {
    if (cameraRunning) {
      stopCameraScanner();
    }
    if (productCameraRunning) {
      stopProductCameraScanner();
    }
  });
}

// =========================
// SERVICE WORKER / ACTUALIZACIONES
// =========================
let refreshing = false;

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js");

     registration.addEventListener("updatefound", () => {
  const newWorker = registration.installing;
  if (!newWorker) return;

  newWorker.addEventListener("statechange", () => {
    if (
      newWorker.state === "installed" &&
      navigator.serviceWorker.controller
    ) {
      alert("Hay una nueva versión disponible. La aplicación se actualizará automáticamente.");
      newWorker.postMessage({ type: "SKIP_WAITING" });
    }
  });
});

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (error) {
      console.error("Error registrando service worker:", error);
    }
  });
}

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
  protectPages();
  setupLoginPage();
  setupProductsPage();
  setupScanPage();
  registerServiceWorker();
});
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
  teamName: "teamName",
  controls: "controls",
  currentControl: "currentControl"
};

const protectedPages = [
  "home.html",
  "new-control.html",
  "products.html",
  "history.html",
  "central.html",
  "scan.html"
];

let editingProductId = null;

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

function getDiffClass(diff) {
  if (diff === 0) return "diff-ok";
  if (diff < 0) return "diff-negative";
  return "diff-positive";
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
  if (!Array.isArray(products)) return [];

  let changed = false;

  const normalizedProducts = products.map((p) => {
    if (!p.id) {
      changed = true;
      return {
        ...p,
        id: Date.now() + Math.floor(Math.random() * 100000)
      };
    }

    return p;
  });

  if (changed) {
    saveProducts(normalizedProducts);
  }

  return normalizedProducts;
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

function getControls() {
  const controls = safeParse(localStorage.getItem(STORAGE_KEYS.controls), []);
  return Array.isArray(controls) ? controls : [];
}

function saveControls(controls) {
  localStorage.setItem(STORAGE_KEYS.controls, JSON.stringify(controls));
}

function getCurrentControl() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.currentControl), null);
}

function saveCurrentControl(control) {
  localStorage.setItem(STORAGE_KEYS.currentControl, JSON.stringify(control));
}

function clearCurrentControl() {
  localStorage.removeItem(STORAGE_KEYS.currentControl);
}

function resetAuditData() {
  const products = getProducts().map((p) => ({
    ...p,
    stockReal: 0,
    countsByZone: {}
  }));

  saveProducts(products);
  saveZoneProgress([]);
  clearLastScan();
}

// =========================
// CONTROLES / AUDITORÍAS
// =========================
function createControl({ cliente, sucursal, fecha, observaciones }) {
  return {
    id: `control_${Date.now()}`,
    cliente: normalizeText(cliente),
    sucursal: normalizeText(sucursal),
    fecha: normalizeText(fecha),
    observaciones: normalizeText(observaciones),
    createdAt: new Date().toISOString(),
    closedAt: null,
    status: "open"
  };
}

function getControlDisplayName(control) {
  if (!control) return "Sin auditoría activa";

  const cliente = control.cliente || "Sin cliente";
  const sucursal = control.sucursal || "Sin sucursal";
  const fecha = control.fecha || "Sin fecha";

  return `${cliente} - ${sucursal} - ${fecha}`;
}

function closeCurrentControl() {
  const currentControl = getCurrentControl();
  if (!currentControl) return null;

  const products = getProducts();
  const zoneProgress = getZoneProgress();
  const controls = getControls();

  const finalControl = {
    ...currentControl,
    status: "closed",
    closedAt: new Date().toISOString(),
    zoneProgress,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      stockTeorico: p.stockTeorico || 0,
      stockReal: p.stockReal || 0,
      difference: (p.stockReal || 0) - (p.stockTeorico || 0),
      countsByZone: p.countsByZone || {}
    }))
  };

  controls.unshift(finalControl);
  saveControls(controls);
  clearCurrentControl();

  return finalControl;
}

function findControlById(controlId) {
  return getControls().find((control) => control.id === controlId) || null;
}

function renderHistoryList(filterText = "") {
  const list = document.getElementById("historyList");
  const detail = document.getElementById("historyDetail");
  if (!list) return;

  const controls = getControls();
  const term = normalizeText(filterText).toLowerCase();

  const filtered = controls.filter((control) => {
    const cliente = (control.cliente || "").toLowerCase();
    const sucursal = (control.sucursal || "").toLowerCase();
    const fecha = (control.fecha || "").toLowerCase();

    return (
      !term ||
      cliente.includes(term) ||
      sucursal.includes(term) ||
      fecha.includes(term)
    );
  });

  if (filtered.length === 0) {
    list.innerHTML = "<p class='placeholder-text'>No hay auditorías guardadas todavía.</p>";
    if (detail) {
      detail.innerHTML = "<p class='placeholder-text'>Seleccioná una auditoría para ver el detalle.</p>";
    }
    return;
  }

  list.innerHTML = filtered
    .map(
      (control) => `
        <div class="product-item">
          <strong>${escapeHtml(control.cliente || "Sin cliente")}</strong><br>
          Sucursal: ${escapeHtml(control.sucursal || "-")}<br>
          Fecha: ${escapeHtml(control.fecha || "-")}<br>
          Estado: ${escapeHtml(control.status || "-")}<br>
          Productos: ${Array.isArray(control.products) ? control.products.length : 0}<br>
          <div class="scan-actions">
            <button type="button" onclick="showHistoryDetail('${control.id}')">Ver detalle</button>
          </div>
        </div>
      `
    )
    .join("");
}

function showHistoryDetail(controlId) {
  const detail = document.getElementById("historyDetail");
  if (!detail) return;

  const control = findControlById(controlId);

  if (!control) {
    detail.innerHTML = "<p class='placeholder-text'>No se encontró la auditoría seleccionada.</p>";
    return;
  }

  const products = Array.isArray(control.products) ? control.products : [];

  detail.innerHTML = `
    <div class="product-item">
      <strong>${escapeHtml(control.cliente || "Sin cliente")}</strong><br>
      Sucursal: ${escapeHtml(control.sucursal || "-")}<br>
      Fecha: ${escapeHtml(control.fecha || "-")}<br>
      Observaciones: ${escapeHtml(control.observaciones || "-")}<br>
      Estado: ${escapeHtml(control.status || "-")}<br>
      Creada: ${escapeHtml(control.createdAt || "-")}<br>
      Cerrada: ${escapeHtml(control.closedAt || "-")}

      <div class="scan-actions">
        <button type="button" onclick="exportControlCsv('${control.id}')">
          Exportar CSV
        </button>

        <button type="button" class="secondary-btn" onclick="exportControlPdf('${control.id}')">
          Exportar PDF
        </button>

        <button 
  type="button" 
  class="danger-btn"
  onclick="deleteControl('${control.id}')"
>
  Eliminar auditoría
</button>
      </div>
    </div>

    ${
      products.length === 0
        ? "<p class='placeholder-text'>Esta auditoría no tiene productos guardados.</p>"
        : products
            .map((p) => {
              const diff = (p.stockReal || 0) - (p.stockTeorico || 0);
              const diffClass = getDiffClass(diff);

              return `
                <div class="product-item ${diffClass}">
                  <strong>${escapeHtml(p.name || "Sin nombre")}</strong><br>
                  Código: ${escapeHtml(p.code || "-")}<br>
                  Teórico: ${p.stockTeorico || 0}<br>
                  Real: ${p.stockReal || 0}<br>
                  Diferencia: ${diff}
                </div>
              `;
            })
            .join("")
    }
  `;
}

function sanitizeFileName(text) {
  return String(text || "auditoria")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_");
}

function downloadTextFile(content, fileName, type = "text/plain") {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(link.href);
}

function exportControlCsv(controlId) {
  const control = findControlById(controlId);

  if (!control) {
    alert("No se encontró la auditoría.");
    return;
  }

  const products = Array.isArray(control.products) ? control.products : [];

  const rows = [
    ["Cliente", control.cliente || ""],
    ["Sucursal", control.sucursal || ""],
    ["Fecha", control.fecha || ""],
    ["Observaciones", control.observaciones || ""],
    [],
    ["Código", "Producto", "Stock teórico", "Stock real", "Diferencia"]
  ];

  products.forEach((p) => {
    rows.push([
      p.code || "",
      p.name || "",
      p.stockTeorico || 0,
      p.stockReal || 0,
      (p.stockReal || 0) - (p.stockTeorico || 0)
    ]);
  });

  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(";")
    )
    .join("\n");

  const fileName = `auditoria_${sanitizeFileName(control.cliente)}_${sanitizeFileName(control.fecha)}.csv`;

  downloadTextFile("\uFEFF" + csv, fileName, "text/csv;charset=utf-8");
}

function exportControlPdf(controlId) {
  const control = findControlById(controlId);

  if (!control) {
    alert("No se encontró la auditoría.");
    return;
  }

  const products = Array.isArray(control.products) ? control.products : [];

  const rows = products
    .map((p) => {
      const diff = (p.stockReal || 0) - (p.stockTeorico || 0);

      return `
        <tr>
          <td>${escapeHtml(p.code || "")}</td>
          <td>${escapeHtml(p.name || "")}</td>
          <td>${p.stockTeorico || 0}</td>
          <td>${p.stockReal || 0}</td>
          <td>${diff}</td>
        </tr>
      `;
    })
    .join("");

  const win = window.open("", "_blank");

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Auditoría ${escapeHtml(control.cliente || "")}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 24px;
          color: #111;
        }

        h1 {
          margin-bottom: 5px;
        }

        .info {
          margin-bottom: 20px;
          line-height: 1.5;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        th, td {
          border: 1px solid #ccc;
          padding: 8px;
          font-size: 13px;
          text-align: left;
        }

        th {
          background: #f0f0f0;
        }
      </style>
    </head>
    <body>
      <h1>Auditoría de Stock</h1>

      <div class="info">
        <strong>Cliente:</strong> ${escapeHtml(control.cliente || "-")}<br>
        <strong>Sucursal:</strong> ${escapeHtml(control.sucursal || "-")}<br>
        <strong>Fecha:</strong> ${escapeHtml(control.fecha || "-")}<br>
        <strong>Observaciones:</strong> ${escapeHtml(control.observaciones || "-")}
      </div>

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Stock teórico</th>
            <th>Stock real</th>
            <th>Diferencia</th>
          </tr>
        </thead>
        <tbody>
          ${rows || "<tr><td colspan='5'>Sin productos registrados.</td></tr>"}
        </tbody>
      </table>

      <script>
        window.print();
      </script>
    </body>
    </html>
  `);

  win.document.close();
}

function deleteControl(controlId) {
  const controls = getControls();

  const confirmDelete = confirm("¿Seguro que querés eliminar esta auditoría?");
  if (!confirmDelete) return;

  const updated = controls.filter(c => c.id !== controlId);

  saveControls(updated);

  // limpiar detalle
  const detail = document.getElementById("historyDetail");
  if (detail) {
    detail.innerHTML = "<p class='placeholder-text'>Auditoría eliminada.</p>";
  }

  renderHistoryList();

  alert("Auditoría eliminada correctamente");
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
// MENSAJES / UI
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

function renderCurrentControlInfo() {
  const currentControl = getCurrentControl();

  setText("currentControlInfo", getControlDisplayName(currentControl));

  if (currentControl) {
    setText(
      "currentControlExtra",
      `Cliente: ${currentControl.cliente} | Sucursal: ${currentControl.sucursal} | Fecha: ${currentControl.fecha}`
    );
  } else {
    setText("currentControlExtra", "Todavía no hay una auditoría activa.");
  }
}

// =========================
// SONIDO / VIBRACIÓN
// =========================
function playBeep(type = "ok") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    function beep(frequency, duration, volume) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = frequency;
      gain.gain.value = volume;

      osc.start();
      osc.stop(ctx.currentTime + duration);
    }

    if (type === "ok") {
      // 🔊 doble beep fuerte
      beep(900, 0.12, 0.25);

      setTimeout(() => {
        beep(900, 0.12, 0.25);
      }, 140);

    } else {
      // 🔻 sonido error más grave
      beep(220, 0.2, 0.3);
    }

  } catch {
    // evitar errores si el navegador bloquea audio
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
    id: Date.now() + Math.floor(Math.random() * 100000),
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

function renderProducts(filterText = "") {
  const list = document.getElementById("productsList");
  if (!list) return;

  const products = getProducts();
  const term = normalizeText(filterText).toLowerCase();

  const filteredProducts = products.filter((p) => {
    const name = String(p.name || "").toLowerCase();
    const code = String(p.code || "").toLowerCase();

    return !term || name.includes(term) || code.includes(term);
  });

  if (filteredProducts.length === 0) {
    list.innerHTML = "<p class='placeholder-text'>No se encontraron productos.</p>";
    return;
  }

  list.innerHTML = filteredProducts
    .map((p) => {
      const teorico = p.stockTeorico || 0;
      const real = p.stockReal || 0;
      const diff = real - teorico;
      const diffClass = getDiffClass(diff);

      return `
        <div class="product-item ${diffClass}">
          <strong>${escapeHtml(p.name)}</strong><br>
          Código: ${escapeHtml(p.code)}<br>
          Stock teórico: ${teorico}<br>
          Stock real: ${real}<br>
          Diferencia: ${diff}<br>

          <div class="scan-actions">
            <button onclick="editProduct('${p.code}')">Editar</button>
<button onclick="deleteProduct('${p.code}')" style="margin-left:8px; background:#dc3545; color:white;">
  Eliminar
</button>
          </div>
        </div>
      `;
    })
    .join("");
}
function editProduct(code) {
  const products = getProducts();
  const product = products.find(p => p.code === code);

  if (!product) return;

  const newName = prompt("Editar nombre:", product.name);
  if (newName === null) return;

  const newStock = prompt("Editar stock teórico:", product.stockTeorico);
  if (newStock === null) return;

  product.name = normalizeText(newName);
  product.stockTeorico = toPositiveInt(newStock);

  saveProducts(products);
  renderProducts();

  alert("Producto actualizado correctamente");
}
function deleteProduct(code) {
  const confirmDelete = confirm("¿Seguro que querés eliminar este producto?");
  if (!confirmDelete) return;

  let products = getProducts();

  products = products.filter(p => p.code !== code);

  localStorage.setItem("products", JSON.stringify(products));

  renderProducts();
}

function resetProductForm() {
  const nameInput = document.getElementById("productName");
  const codeInput = document.getElementById("productCode");
  const stockInput = document.getElementById("productStock");
  const saveBtn = document.getElementById("saveProductBtn");

  if (nameInput) nameInput.value = "";
  if (codeInput) codeInput.value = "";
  if (stockInput) stockInput.value = "";
  if (saveBtn) saveBtn.textContent = "Guardar producto";

  editingProductId = null;
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

  if (editingProductId !== null) {
    const index = products.findIndex((p) => String(p.id) === String(editingProductId));

    if (index === -1) {
      setMessage("productMsg", "No se encontró el producto para editar.", "error");
      editingProductId = null;
      return;
    }

    const duplicatedCode = products.some(
      (p) => normalizeCode(p.code) === code && String(p.id) !== String(editingProductId)
    );

    if (duplicatedCode) {
      setMessage("productMsg", "Ya existe otro producto con ese código.", "error");
      return;
    }

    products[index].name = name;
    products[index].code = code;
    products[index].stockTeorico = stock;

    saveProducts(products);
    setMessage("productMsg", "Producto actualizado correctamente.", "success");
  } else {
    const exists = products.some((p) => normalizeCode(p.code) === code);

    if (exists) {
      setMessage("productMsg", "Ya existe un producto con ese código. Usá Editar para modificarlo.", "error");
      return;
    }

    products.push(createProduct({ name, code, stockTeorico: stock }));
    saveProducts(products);

    setMessage("productMsg", "Producto guardado correctamente.", "success");
  }

  resetProductForm();
  renderProducts();
  renderScanSummary();
}

function importProductsFromCsvText(csvText) {
  const lines = String(csvText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { added: 0, updated: 0, skipped: 0, error: "El archivo CSV está vacío." };
  }

  const products = getProducts();

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
  let updated = 0;
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

    const existing = products.find((p) => normalizeCode(p.code) === code);

    if (existing) {
      existing.name = name;
      existing.stockTeorico = stockTeorico;
      updated += 1;
    } else {
      products.push(createProduct({ name, code, stockTeorico }));
      added += 1;
    }
  }

  saveProducts(products);
  return { added, updated, skipped, error: null };
}

function setupProductsPage() {
  const saveBtn = document.getElementById("saveProductBtn");
  const importBtn = document.getElementById("importCsvBtn");
  const csvInput = document.getElementById("csvFileInput");
  const scanProductCodeBtn = document.getElementById("scanProductCodeBtn");
  const stopProductCameraBtn = document.getElementById("stopProductCameraBtn");
  const productSearch = document.getElementById("productSearch");

  if (!saveBtn && !importBtn && !scanProductCodeBtn) return;

  renderProducts();

  if (productSearch) {
    productSearch.addEventListener("input", () => {
      renderProducts(productSearch.value);
    });
  }

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
          `Importación terminada. Nuevos: ${result.added}, Actualizados: ${result.updated}, Omitidos: ${result.skipped}.`,
          "success"
        );

        csvInput.value = "";
        renderProducts(productSearch?.value || "");
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
let selectedAdjustCode = null;

function renderAdjustResults(search = "") {
  const box = document.getElementById("adjustResults");
  if (!box) return;

  const term = normalizeText(search).toLowerCase();

  if (!term) {
    box.innerHTML = "<p class='placeholder-text'>Buscá un producto para ajustar.</p>";
    return;
  }

  const products = getProducts().filter((p) => {
    const name = String(p.name || "").toLowerCase();
    const code = String(p.code || "").toLowerCase();

    return name.includes(term) || code.includes(term);
  });

  if (products.length === 0) {
    box.innerHTML = "<p class='placeholder-text'>No se encontraron productos.</p>";
    return;
  }

  box.innerHTML = products
    .map((p) => {
      const diff = (p.stockReal || 0) - (p.stockTeorico || 0);
      const diffClass = getDiffClass(diff);

      return `
        <div class="product-item ${diffClass}">
          <strong>${escapeHtml(p.name)}</strong><br>
          Código: ${escapeHtml(p.code)}<br>
          Teórico: ${p.stockTeorico || 0}<br>
          Real: ${p.stockReal || 0}<br>
          Diferencia: ${diff}<br>

          <div class="scan-actions">
            <button type="button" onclick="selectAdjustProduct('${p.code}')">
              Seleccionar
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function selectAdjustProduct(code) {
  const product = findProductByCode(code);
  if (!product) return;

  selectedAdjustCode = product.code;

  setMessage(
    "adjustMsg",
    `Producto seleccionado: ${product.name} - Código: ${product.code}`,
    "success"
  );
}

function adjustSelectedProduct(amount) {
  if (!selectedAdjustCode) {
    setMessage("adjustMsg", "Primero seleccioná un producto.", "error");
    return;
  }

  const qtyInput = document.getElementById("adjustQty");
  const qty = toPositiveInt(qtyInput?.value);

  if (qty <= 0) {
    setMessage("adjustMsg", "Ingresá una cantidad mayor a 0.", "error");
    return;
  }

  const realAmount = amount > 0 ? qty : -qty;
  const zone = getCurrentZone();
  const validZone = zone?.pasillo && zone?.fila ? zone : null;

  const updated = updateProductReal(selectedAdjustCode, realAmount, validZone);

  if (!updated) {
    setMessage("adjustMsg", "No se pudo ajustar el producto.", "error");
    return;
  }

  saveLastScan({
    code: selectedAdjustCode,
    amount: realAmount,
    zone: validZone
  });

  setMessage(
    "adjustMsg",
    `Ajuste aplicado a ${updated.name}. Cantidad: ${realAmount}`,
    "success"
  );

  showScannedProduct(updated, validZone);
  renderScanSummary();
  renderZoneProgress();
  renderAdjustResults(document.getElementById("adjustSearch")?.value || "");

  if (qtyInput) qtyInput.value = "";
}

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
  const teorico = product.stockTeorico || 0;
  const real = product.stockReal || 0;
  const diff = real - teorico;

  setText("resultName", product.name);
  setText("resultCode", product.code);
  setText("resultPasillo", currentZone.pasillo || "-");
  setText("resultFila", currentZone.fila || "-");
  setText("resultTeorico", String(teorico));
  setText("resultReal", String(real));
  setText("resultDiff", String(diff));

  box.classList.remove("hidden", "diff-ok", "diff-negative", "diff-positive");
  box.classList.add(getDiffClass(diff));
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
      const teorico = p.stockTeorico || 0;
      const real = p.stockReal || 0;
      const diff = real - teorico;
      const diffClass = getDiffClass(diff);

      return `
        <div class="product-item ${diffClass}">
          <strong>${escapeHtml(p.name)}</strong><br>
          Código: ${escapeHtml(p.code)}<br>
          Teórico: ${teorico}<br>
          Real: ${real}<br>
          Diferencia: ${diff}
        </div>
      `;
    })
    .join("");
}

function processScannedCode(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return;

  const currentControl = getCurrentControl();

  if (!currentControl) {
    setScanMessage("Primero creá una auditoría en Nuevo Control.", "error");
    playBeep("error");
    vibrateDevice([120, 80, 120]);
    return;
  }

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
      () => {}
    );

    // 🔦 intentar encender flash
try {
  await html5QrCodeInstance.applyVideoConstraints({
    advanced: [{ torch: true }]
  });
} catch (err) {
  console.log("Flash no soportado en este dispositivo");
}

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
      () => {}
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
// CENTRAL / EXPORTACIÓN JSON
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
  if (scanResult) {
    scanResult.classList.add("hidden");
    scanResult.classList.remove("diff-ok", "diff-negative", "diff-positive");
  }
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
      const diffClass = getDiffClass(diff);

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
// SETUPS
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

function setupNewControlPage() {
  const saveControlBtn = document.getElementById("saveControlBtn");
  if (!saveControlBtn) return;

  const clienteInput = document.getElementById("controlCliente");
  const sucursalInput = document.getElementById("controlSucursal");
  const fechaInput = document.getElementById("controlFecha");
  const obsInput = document.getElementById("controlObs");

  const currentControl = getCurrentControl();
  if (currentControl) {
    clienteInput.value = currentControl.cliente || "";
    sucursalInput.value = currentControl.sucursal || "";
    fechaInput.value = currentControl.fecha || "";
    obsInput.value = currentControl.observaciones || "";
  }

  saveControlBtn.addEventListener("click", () => {
    const cliente = normalizeText(clienteInput.value);
    const sucursal = normalizeText(sucursalInput.value);
    const fecha = normalizeText(fechaInput.value);
    const observaciones = normalizeText(obsInput.value);

    if (!cliente || !sucursal || !fecha) {
      setMessage("controlMsg", "Completá cliente, sucursal y fecha.", "error");
      return;
    }

    resetAuditData();

    const control = createControl({
      cliente,
      sucursal,
      fecha,
      observaciones
    });

    saveCurrentControl(control);
    setMessage("controlMsg", "Auditoría guardada y activada correctamente.", "success");
  });
}

function setupHistoryPage() {
  const historyList = document.getElementById("historyList");
  const searchInput = document.getElementById("historySearch");

  if (!historyList) return;

  renderHistoryList();

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderHistoryList(searchInput.value);
    });
  }
}

function setupCentralPage() {
  const importTeamCountsBtn = document.getElementById("importTeamCountsBtn");
  const teamCountFileInput = document.getElementById("teamCountFileInput");

  if (!importTeamCountsBtn || !teamCountFileInput) return;

  importTeamCountsBtn.addEventListener("click", () => {
    importTeamCountsFiles(teamCountFileInput.files || []);
  });
}

function setupScanPage() {
  const input = document.getElementById("scanCode");
  if (!input) return;

  const closeControlBtn = document.getElementById("closeControlBtn");
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
  const teamNameInput = document.getElementById("teamName");

  const adjustSearch = document.getElementById("adjustSearch");
  const addQtyBtn = document.getElementById("addQtyBtn");
  const subtractQtyBtn = document.getElementById("subtractQtyBtn");

  renderCurrentZone();
  renderZoneProgress();
  renderScanSummary();
  renderCurrentControlInfo();
  renderAdjustResults();
  setupScanInputAuto();
  input.focus();

  if (teamNameInput) {
    teamNameInput.value = getTeamName();
  }

  if (adjustSearch) {
    adjustSearch.addEventListener("input", () => {
      renderAdjustResults(adjustSearch.value);
    });
  }

  if (addQtyBtn) {
    addQtyBtn.addEventListener("click", () => {
      adjustSelectedProduct(1);
      input.focus();
    });
  }

  if (subtractQtyBtn) {
    subtractQtyBtn.addEventListener("click", () => {
      adjustSelectedProduct(-1);
      input.focus();
    });
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
      nextFila();
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

  if (closeControlBtn) {
    closeControlBtn.addEventListener("click", () => {
      const currentControl = getCurrentControl();

      if (!currentControl) {
        setScanMessage("No hay auditoría activa para cerrar.", "error");
        return;
      }

      const savedControl = closeCurrentControl();

      if (savedControl) {
        setScanMessage("Auditoría cerrada y guardada en historial.", "success");
        renderCurrentControlInfo();
      }
    });
  }
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
  setupNewControlPage();
  setupProductsPage();
  setupHistoryPage();
  setupCentralPage();
  setupScanPage();
  registerServiceWorker();
});
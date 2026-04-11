// =========================
// LOGIN CONFIG
// =========================
const USER = "Jesus96";
const PASS = "soyunapuerca";

// =========================
// PROTECCIÓN
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

// =========================
// CONTROLES
// =========================
function getControls() {
  return JSON.parse(localStorage.getItem("controls")) || [];
}

function saveControls(data) {
  localStorage.setItem("controls", JSON.stringify(data));
}

// =========================
// IMPORTACIONES CENTRALES
// =========================
function getCentralImports() {
  return JSON.parse(localStorage.getItem("centralImports")) || [];
}

function saveCentralImports(data) {
  localStorage.setItem("centralImports", JSON.stringify(data));
}

function clearCentralImports() {
  localStorage.setItem("centralImports", JSON.stringify([]));
}

// =========================
// NUEVO CONTROL
// =========================
function setupNewControlPage() {
  const btn = document.getElementById("saveControlBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const cliente = document.getElementById("controlCliente")?.value.trim() || "";
    const sucursal = document.getElementById("controlSucursal")?.value.trim() || "";
    const fecha = document.getElementById("controlFecha")?.value || "";
    const obs = document.getElementById("controlObs")?.value.trim() || "";
    const msg = document.getElementById("controlMsg");

    if (!cliente || !sucursal || !fecha) {
      if (msg) msg.textContent = "Completá cliente, sucursal y fecha.";
      return;
    }

    const controls = getControls();

    controls.push({
      id: Date.now(),
      cliente,
      sucursal,
      fecha,
      observaciones: obs
    });

    saveControls(controls);

    if (msg) msg.textContent = "Control guardado correctamente.";

    document.getElementById("controlCliente").value = "";
    document.getElementById("controlSucursal").value = "";
    document.getElementById("controlFecha").value = "";
    document.getElementById("controlObs").value = "";
  });
}

// =========================
// CENTRAL
// =========================
function buildCentralComparisonData() {
  const products = getProducts();
  const imports = getCentralImports();
  const counts = [];

  imports.forEach(file => {
    const list = Array.isArray(file.counts) ? file.counts : [];
    list.forEach(item => counts.push(item));
  });

  return products.map(product => {
    const related = counts.filter(c => c.code === product.code);
    const contado = related.reduce((acc, item) => acc + (parseInt(item.amount, 10) || 0), 0);

    return {
      ...product,
      contado,
      diferencia: contado - (parseInt(product.stockTeorico, 10) || 0)
    };
  });
}

function renderCentralStats() {
  const box = document.getElementById("centralStats");
  if (!box) return;

  const imports = getCentralImports();
  const data = buildCentralComparisonData();

  const totalArchivos = imports.length;
  const totalProductos = data.length;
  const totalContado = data.reduce((acc, item) => acc + item.contado, 0);
  const conDiferencia = data.filter(item => item.diferencia !== 0).length;

  box.innerHTML = `
    <div class="product-item">
      <strong>Archivos importados</strong><br>
      ${totalArchivos}
    </div>
    <div class="product-item">
      <strong>Productos</strong><br>
      ${totalProductos}
    </div>
    <div class="product-item">
      <strong>Total contado</strong><br>
      ${totalContado}
    </div>
    <div class="product-item">
      <strong>Con diferencia</strong><br>
      ${conDiferencia}
    </div>
  `;
}

function renderCentralComparisonList() {
  const box = document.getElementById("centralComparisonList");
  if (!box) return;

  const searchInput = document.getElementById("centralSearch");
  const search = (searchInput?.value || "").trim().toLowerCase();

  let data = buildCentralComparisonData();

  if (search) {
    data = data.filter(item =>
      String(item.name || "").toLowerCase().includes(search) ||
      String(item.code || "").toLowerCase().includes(search)
    );
  }

  if (!data.length) {
    box.innerHTML = "<p class='placeholder-text'>No hay resultados.</p>";
    return;
  }

  box.innerHTML = data.map(item => {
    let diffClass = "diff-ok";
    let diffText = "OK";

    if (item.diferencia < 0) {
      diffClass = "diff-negative";
      diffText = "FALTANTE";
    } else if (item.diferencia > 0) {
      diffClass = "diff-positive";
      diffText = "SOBRANTE";
    }

    return `
      <div class="product-item ${diffClass}">
        <strong>${item.name}</strong><br>
        Código: ${item.code}<br>
        Stock teórico: ${item.stockTeorico}<br>
        Contado: ${item.contado}<br>
        Diferencia: ${item.diferencia} (${diffText})
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
    const total = counts.reduce((acc, entry) => acc + (parseInt(entry.amount, 10) || 0), 0);

    return `
      <div class="product-item">
        <strong>Equipo ${item.team || index + 1}</strong><br>
        Exportado: ${item.exportedAt || "Sin fecha"}<br>
        Registros: ${counts.length}<br>
        Total contado: ${total}
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
// EXPORTAR EXCEL
// =========================
function exportToExcel() {
  const data = buildCentralComparisonData();

  if (!data.length) {
    alert("No hay datos para exportar");
    return;
  }

  let csv = "Codigo,Nombre,Teorico,Contado,Diferencia\n";

  data.forEach(item => {
    csv += `"${item.code}","${item.name}",${item.stockTeorico},${item.contado},${item.diferencia}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "reporte_auditoria.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// =========================
// EXPORTAR PDF
// =========================
function exportToPDF() {
  const data = buildCentralComparisonData();

  if (!data.length) {
    alert("No hay datos para exportar");
    return;
  }

  const controls = getControls();
  const last = controls[controls.length - 1] || {};

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
          margin-bottom: 10px;
        }
        .meta {
          margin-bottom: 18px;
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
          min-width: 120px;
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
        <p><strong>Cliente:</strong> ${last.cliente || "-"}</p>
        <p><strong>Sucursal:</strong> ${last.sucursal || "-"}</p>
        <p><strong>Fecha:</strong> ${last.fecha || "-"}</p>
        <p><strong>Observaciones:</strong> ${last.observaciones || "-"}</p>
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

// =========================
// HISTORY
// =========================
function setupHistoryPage() {
  const excelBtn = document.getElementById("exportExcelBtn");
  const pdfBtn = document.getElementById("exportPdfBtn");
  const searchInput = document.getElementById("centralSearch");
  const importBtn = document.getElementById("centralHistoryImportBtn");
  const fileInput = document.getElementById("centralHistoryFileInput");
  const clearBtn = document.getElementById("clearCentralDataBtn");
  const historyMsg = document.getElementById("historyMsg");

  renderCentralDashboard();

  if (excelBtn) {
    excelBtn.addEventListener("click", exportToExcel);
  }

  if (pdfBtn) {
    pdfBtn.addEventListener("click", exportToPDF);
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderCentralComparisonList();
    });
  }

  if (importBtn && fileInput) {
    importBtn.addEventListener("click", async () => {
      if (!fileInput.files || fileInput.files.length === 0) {
        if (historyMsg) historyMsg.textContent = "Seleccioná uno o más archivos JSON.";
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
        saveCentralImports(existing.concat(parsedFiles));
        renderCentralDashboard();

        if (historyMsg) historyMsg.textContent = `Archivos importados correctamente: ${parsedFiles.length}.`;
        fileInput.value = "";
      } catch (error) {
        if (historyMsg) historyMsg.textContent = error.message || "Error al importar archivos.";
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearCentralImports();
      renderCentralDashboard();
      if (historyMsg) historyMsg.textContent = "Datos centrales borrados correctamente.";
    });
  }
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
  const togglePass = document.getElementById("togglePass");

  if (!loginBtn || !userInput || !passInput) return;

  const savedUser = localStorage.getItem("rememberedUser");
  if (savedUser) {
    userInput.value = savedUser;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  if (togglePass) {
    togglePass.onclick = () => {
      if (passInput.type === "password") {
        passInput.type = "text";
        togglePass.textContent = "🙈";
      } else {
        passInput.type = "password";
        togglePass.textContent = "👁";
      }
    };
  }

  loginBtn.onclick = () => {
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
  };

  passInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loginBtn.click();
    }
  });
}

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
  setupLogin();
  setupNewControlPage();
  setupHistoryPage();
});
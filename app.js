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

function saveProducts(p) {
  localStorage.setItem("products", JSON.stringify(p));
}

// =========================
// CONTROLES (NUEVO)
// =========================
function getControls() {
  return JSON.parse(localStorage.getItem("controls")) || [];
}

function saveControls(data) {
  localStorage.setItem("controls", JSON.stringify(data));
}

// =========================
// GUARDAR CONTROL
// =========================
function setupNewControlPage() {
  const btn = document.getElementById("saveControlBtn");

  if (!btn) return;

  btn.addEventListener("click", () => {
    const cliente = document.getElementById("controlCliente").value.trim();
    const sucursal = document.getElementById("controlSucursal").value.trim();
    const fecha = document.getElementById("controlFecha").value;
    const obs = document.getElementById("controlObs").value.trim();
    const msg = document.getElementById("controlMsg");

    if (!cliente || !sucursal || !fecha) {
      msg.textContent = "Completá cliente, sucursal y fecha.";
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

    msg.textContent = "Control guardado correctamente.";

    document.getElementById("controlCliente").value = "";
    document.getElementById("controlSucursal").value = "";
    document.getElementById("controlFecha").value = "";
    document.getElementById("controlObs").value = "";
  });
}

// =========================
// CENTRAL DATA
// =========================
function getCentralImports() {
  return JSON.parse(localStorage.getItem("centralImports")) || [];
}

function buildCentralComparisonData() {
  const products = getProducts();
  const imports = getCentralImports();

  const counts = [];

  imports.forEach(file => {
    file.counts.forEach(c => {
      counts.push(c);
    });
  });

  return products.map(p => {
    const related = counts.filter(c => c.code === p.code);
    const contado = related.reduce((a, b) => a + b.amount, 0);

    return {
      ...p,
      contado,
      diferencia: contado - p.stockTeorico
    };
  });
}

// =========================
// EXPORTAR EXCEL
// =========================
function exportToExcel() {
  const data = buildCentralComparisonData();

  let csv = "Codigo,Nombre,Teorico,Contado,Diferencia\n";

  data.forEach(p => {
    csv += `${p.code},${p.name},${p.stockTeorico},${p.contado},${p.diferencia}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "reporte.csv";
  a.click();
}

// =========================
// EXPORTAR PDF
// =========================
function exportToPDF() {
  const data = buildCentralComparisonData();
  const controls = getControls();
  const last = controls[controls.length - 1] || {};

  let rows = "";

  data.forEach(p => {
    rows += `
      <tr>
        <td>${p.code}</td>
        <td>${p.name}</td>
        <td>${p.stockTeorico}</td>
        <td>${p.contado}</td>
        <td>${p.diferencia}</td>
      </tr>
    `;
  });

  const html = `
    <h2>Reporte de Auditoría</h2>

    <p><b>Cliente:</b> ${last.cliente || "-"}</p>
    <p><b>Sucursal:</b> ${last.sucursal || "-"}</p>
    <p><b>Fecha:</b> ${last.fecha || "-"}</p>
    <p><b>Observaciones:</b> ${last.observaciones || "-"}</p>

    <table border="1" style="width:100%; border-collapse:collapse;">
      <tr>
        <th>Código</th>
        <th>Producto</th>
        <th>Teórico</th>
        <th>Contado</th>
        <th>Diferencia</th>
      </tr>
      ${rows}
    </table>
  `;

  const win = window.open("");
  win.document.write(html);
  win.print();
}

// =========================
// BOTONES CENTRAL
// =========================
function setupHistoryPage() {
  const excelBtn = document.getElementById("exportExcelBtn");
  const pdfBtn = document.getElementById("exportPdfBtn");

  if (excelBtn) excelBtn.onclick = exportToExcel;
  if (pdfBtn) pdfBtn.onclick = exportToPDF;
}

// =========================
// LOGIN
// =========================
function setupLogin() {
  const loginBtn = document.getElementById("loginBtn");

  if (!loginBtn) return;

  loginBtn.addEventListener("click", () => {
    const user = document.getElementById("user").value;
    const pass = document.getElementById("pass").value;

    if (user.toLowerCase() === USER.toLowerCase() && pass === PASS) {
      localStorage.setItem("logged", "true");
      window.location.href = "home.html";
    } else {
      document.getElementById("error").textContent = "Datos incorrectos";
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
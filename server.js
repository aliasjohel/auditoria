const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const DATA_DIR = path.join(__dirname, "central-data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

app.get("/", (req, res) => {
  res.send("Servidor central de Control Stock funcionando ✅");
});

app.post("/sync", (req, res) => {
  const data = req.body;

  if (!data || !data.teamName) {
    return res.status(400).json({
      ok: false,
      message: "Datos inválidos. Falta teamName."
    });
  }

  const safeTeamName = String(data.teamName).replace(/[^\w-]+/g, "_");
  const fileName = `conteo_${safeTeamName}_${Date.now()}.json`;
  const filePath = path.join(DATA_DIR, fileName);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

  console.log(`✅ Recibido: ${fileName}`);

  res.json({
    ok: true,
    message: "Conteo recibido correctamente",
    fileName
  });
});

app.get("/files", (req, res) => {
  const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith(".json"));
  res.json(files);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor central activo en puerto ${PORT}`);
  console.log(`Abrí desde esta PC: http://localhost:${PORT}`);
});
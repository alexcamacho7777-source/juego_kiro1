// Servidor local mínimo para jugar MONSTRU.
// No necesita instalar nada: solo Node (que ya tienes).
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = 5174;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(ROOT, urlPath);

  // seguridad: no salir de la carpeta
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("Prohibido"); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("No encontrado"); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${PORT}/`;
  console.log("MONSTRU está servido en:", url);
  // abre el navegador solo
  const { exec } = require("child_process");
  const cmd = process.platform === "win32" ? `start "" "${url}"`
            : process.platform === "darwin" ? `open "${url}"`
            : `xdg-open "${url}"`;
  exec(cmd);
  console.log("Deja esta ventana abierta mientras juegas. Ciérrala para apagar el juego.");
});

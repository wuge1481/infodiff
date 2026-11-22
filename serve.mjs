// 本地预览服务器(零依赖)
// 用法: node serve.mjs  然后浏览器打开 http://127.0.0.1:8787
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "site");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

http.createServer((req, res) => {
  const raw = decodeURIComponent(req.url.split("?")[0] || "/");
  let p = raw === "/" ? "/index.html" : normalize(raw);
  const file = join(root, p);
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end("403"); return; }
  if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end("404 Not Found"); return; }
  res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
  res.end(readFileSync(file));
}).listen(8787, () => console.log("预览: http://127.0.0.1:8787"));

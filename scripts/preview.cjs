const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const buildRoot = path.join(projectRoot, "dist");
const publicRoot = fs.existsSync(path.join(buildRoot, "index.html"))
  ? buildRoot
  : path.join(projectRoot, "public");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Invalid request path.");
    return;
  }

  const filePath = path.resolve(publicRoot, `.${pathname}`);
  if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${path.sep}`)) {
    response.writeHead(403).end("Forbidden.");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    const isPageRoute = !path.extname(pathname);
    const target = !error && stats.isFile()
      ? filePath
      : !error && stats.isDirectory() && isPageRoute
        ? path.join(filePath, "index.html")
        : isPageRoute
          ? path.join(publicRoot, "index.html")
          : "";
    if (!target) {
      response.writeHead(404).end("Not found.");
      return;
    }

    fs.readFile(target, (readError, content) => {
      if (readError) {
        response.writeHead(500).end("Could not read the requested file.");
        return;
      }
      response.writeHead(200, {
        "Content-Type": contentTypes[path.extname(target)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(content);
    });
  });
}).listen(4173, "127.0.0.1", () => {
  console.log("Local preview: http://127.0.0.1:4173");
});

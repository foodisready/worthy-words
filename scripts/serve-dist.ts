// Serves the GitHub Pages build the way GitHub Pages does: under /worthy-words/,
// with 404.html for unknown paths. Used by the browser tests.
// Usage: node scripts/serve-dist.ts [port]
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('../dist/worthy-words/browser/', import.meta.url).pathname;
const BASE = '/worthy-words/';
const PORT = Number(process.argv[2] ?? 4300);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.db': 'application/octet-stream',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/') {
    res.writeHead(302, { location: BASE }).end();
    return;
  }
  if (!path.startsWith(BASE)) {
    res.writeHead(404).end('Not found');
    return;
  }
  let file = normalize(join(ROOT, path.slice(BASE.length)));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  if (file.endsWith('/')) file = join(file, 'index.html');
  try {
    const body = await readFile(file);
    res
      .writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
      .end(body);
  } catch {
    const body = await readFile(join(ROOT, '404.html')).catch(() => 'Not found');
    res.writeHead(404, { 'content-type': TYPES['.html'] }).end(body);
  }
}).listen(PORT, () => console.log(`Serving the Pages build at http://localhost:${PORT}${BASE}`));

import http from 'node:http';
import { readFile } from 'node:fs/promises';
const port = Number(process.env.PET_PREVIEW_PORT || 4178);
const server = http.createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/favicon.ico') { response.writeHead(204).end(); return; }
  const file = path === '/' ? 'preview/index.html' : path === '/bundle.js' ? 'preview/bundle.js' : null;
  if (!file) { response.writeHead(404).end(); return; }
  try { response.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8'); response.end(await readFile(file)); }
  catch { response.writeHead(500).end('Run npm run build first'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Pet preview: http://127.0.0.1:${port}`));

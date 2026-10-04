// Credential-free, loopback-only safe-demo preview of the current source assets.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
const root = new URL('../', import.meta.url);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.txt':'text/plain; charset=utf-8' };
createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (process.env.OPSDECK_PREVIEW_WITHOUT_FX === '1' && pathname === '/fx-studio.js') { response.writeHead(404); return response.end(); }
  if (request.method !== 'GET' || !/^\/[A-Za-z0-9_.-]*$/u.test(pathname)) { response.writeHead(404); return response.end(); }
  const file = pathname === '/' || pathname === '/index.html' ? 'demo/index.html' : pathname === '/demo-provider.js' ? 'demo/demo-provider.js' :
    pathname === '/iris-provider.js' ? 'src/iris-provider.js' : `public${pathname}`;
  try {
    const bytes = await readFile(new URL(file, root));
    response.writeHead(200, { 'Content-Type':types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'" });
    response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
}).listen(Number(process.env.OPSDECK_PREVIEW_PORT || 4175), '127.0.0.1', () => console.log('OpsDeck safe source preview http://127.0.0.1:4175'));

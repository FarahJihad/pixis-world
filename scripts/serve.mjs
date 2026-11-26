import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist', import.meta.url));
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const port = Number(process.argv[2] ?? 4173);
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    const file = path.startsWith(root + sep) && await stat(path);
    if (!file || !file.isFile()) {
      response.writeHead(404).end();
      return;
    }
    const type = types[extname(path)] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Content-Length': file.size, 'Cache-Control': 'no-store' };
    const range = type === 'audio/mpeg' && /^bytes=(\d+)-(\d*)$/.exec(request.headers.range);
    let span;
    if (type === 'audio/mpeg') headers['Accept-Ranges'] = 'bytes';
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Math.min(Number(range[2]), file.size - 1) : file.size - 1;
      if (start > end) {
        response.writeHead(416, { 'Content-Range': 'bytes */' + file.size }).end();
        return;
      }
      span = { start, end };
      headers['Content-Length'] = end - start + 1;
      headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + file.size;
    }
    response.writeHead(span ? 206 : 200, headers);
    if (request.method === 'HEAD') response.end();
    else createReadStream(path, span).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, '127.0.0.1', () => console.log('Local http://127.0.0.1:' + port));


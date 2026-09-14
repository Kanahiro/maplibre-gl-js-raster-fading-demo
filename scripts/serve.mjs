import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css'};
const server = createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
        if (!file.startsWith(root)) throw new Error('Invalid path');
        const body = await readFile(file);
        response.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'});
        response.end(body);
    } catch {
        response.writeHead(404);
        response.end('Not found');
    }
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`Demo: http://127.0.0.1:${server.address().port}`));

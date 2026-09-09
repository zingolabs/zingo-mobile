import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(
  new URL(process.env.VISUAL_ROOT ?? '../storybook-static/', import.meta.url),
);
const port = Number(process.env.VISUAL_PORT ?? 6007);

const mime: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const file = join(root, normalize(path === '/' ? '/index.html' : path));
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': mime[extname(file)] ?? 'application/octet-stream',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => {
  console.log(`serving ${root} on ${port}`);
  if (process.env.VISUAL_OPEN) {
    spawn('open', [process.env.VISUAL_OPEN], { stdio: 'ignore' });
  }
});

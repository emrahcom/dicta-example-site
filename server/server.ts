// The Teamboard web server: the API, the page and the compiled frontend in
// dist/.

import { readFile } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { handleApi } from "./api.ts";

const DIST = new URL("../dist/", import.meta.url);

const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Teamboard</title>
    <script type="module" src="/dist/main.js"></script>
  </head>
  <body></body>
</html>
`;

async function handle(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", "http://localhost");
  const { pathname } = url;
  if (pathname.startsWith("/api/")) {
    await handleApi(request, response, url);
    return;
  }
  if (pathname === "/") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(PAGE);
    return;
  }
  if (pathname.startsWith("/dist/") && !pathname.includes("..")) {
    try {
      const file = await readFile(new URL(pathname.slice(6), DIST));
      response.writeHead(200, { "content-type": "text/javascript" });
      response.end(file);
      return;
    } catch {
      // Not found, below.
    }
  }
  response.writeHead(404, { "content-type": "text/plain" });
  response.end("Not found");
}

export function startServer(port: number): Server {
  const server = createServer((request, response) => {
    handle(request, response).catch(() => {
      response.writeHead(500).end();
    });
  });
  server.listen(port);
  return server;
}

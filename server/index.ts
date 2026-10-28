import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { startServer } from "./server.ts";

const server = startServer(Number(process.env.PORT ?? 8080));
await once(server, "listening");
const { port } = server.address() as AddressInfo;
console.log(`Teamboard on http://localhost:${port}/`);

import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { startServer } from "../server/server.ts";

test("serves the page", async (t) => {
  const server = startServer(0);
  t.after(() => server.close());
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;

  const response = await fetch(`http://localhost:${port}/`);

  assert.equal(response.status, 200);
  assert.match(await response.text(), /<title>Teamboard<\/title>/);
});

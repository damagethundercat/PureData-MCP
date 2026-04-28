#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPdMcpServer } from "./mcp/server.js";
import { PdSession } from "./pd/session.js";

async function main(): Promise<void> {
  const session = new PdSession();
  const server = createPdMcpServer(session);
  const transport = new StdioServerTransport();

  const shutdown = async (code: number) => {
    await session.stop({ force: true }).catch(() => undefined);
    await server.close();
    process.exit(code);
  };

  process.once("SIGINT", () => {
    void shutdown(130);
  });

  process.once("SIGTERM", () => {
    void shutdown(143);
  });

  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPdPrompts } from "./prompts.js";
import { registerPdResources } from "./resources.js";
import { registerPdTools } from "./tools.js";
import { PdSession } from "../pd/session.js";

export function createPdMcpServer(session = new PdSession()): McpServer {
  const server = new McpServer(
    {
      name: "pd-mcp-server",
      version: "0.1.0"
    },
    {
      instructions:
        "Use the Pure Data tools to start one quiet demo session, adjust only bounded parameters, use safe live-patching tools for GUI edits, inspect logs on errors, and always stop Pd when finished."
    }
  );

  registerPdTools(server, session);
  registerPdResources(server, session);
  registerPdPrompts(server);

  return server;
}

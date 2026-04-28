import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { parameterSchemaResource } from "./schemas.js";
import type { PdSession } from "../pd/session.js";

function jsonResource(uri: URL, value: unknown) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

function textResource(uri: URL, text: string | null) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "text/plain",
        text: text ?? ""
      }
    ]
  };
}

export function registerPdResources(server: McpServer, session: PdSession): void {
  server.registerResource(
    "pd-session-status",
    "pd://session/status",
    {
      title: "Pure Data Session Status",
      description: "Current Pd lifecycle state and safe control parameters.",
      mimeType: "application/json"
    },
    async (uri) => jsonResource(uri, session.status())
  );

  server.registerResource(
    "pd-current-patch",
    "pd://patch/current",
    {
      title: "Current Pure Data Patch",
      description: "Generated Vanilla .pd patch text for the active or preview session.",
      mimeType: "text/plain"
    },
    async (uri) => textResource(uri, session.currentPatch())
  );

  server.registerResource(
    "pd-recent-logs",
    "pd://logs/recent",
    {
      title: "Recent Pure Data Logs",
      description: "Bounded stdout/stderr lines from the Pd process.",
      mimeType: "application/json"
    },
    async (uri) => jsonResource(uri, session.logs().entries())
  );

  server.registerResource(
    "pd-parameter-schema",
    "pd://schema/parameters",
    {
      title: "Pure Data Parameter Schema",
      description: "Machine-readable ranges for controllable v0.1 sound parameters.",
      mimeType: "application/json"
    },
    async (uri) => jsonResource(uri, parameterSchemaResource)
  );

  server.registerResource(
    "pd-live-graph",
    "pd://live/graph",
    {
      title: "Live Pure Data Graph",
      description: "Agent-managed live patch objects and connections.",
      mimeType: "application/json"
    },
    async (uri) => jsonResource(uri, session.livePatchSnapshot())
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  emptyToolSchema,
  pdLiveAddObjectSchema,
  pdLiveConnectSchema,
  pdLiveMoveObjectSchema,
  pdSetParamsSchema,
  pdStartDemoSchema,
  pdStopSchema
} from "./schemas.js";
import type { PdSession } from "../pd/session.js";

export function toToolResult(value: unknown): CallToolResult {
  const payload = value === undefined ? { status: "ok" } : value;

  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>
  };
}

function toolError(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);

  return {
    content: [{ type: "text", text: message }],
    isError: true
  };
}

export function registerPdTools(server: McpServer, session: PdSession): void {
  server.registerTool(
    "pd_start_demo",
    {
      title: "Start Pure Data Demo",
      description:
        "Generate a Vanilla Pure Data demo patch, launch Pd headless by default or with gui=true, start DSP, and prepare FUDI control.",
      inputSchema: pdStartDemoSchema
    },
    async (input) => {
      try {
        return toToolResult(await session.startDemo(input));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "pd_set_params",
    {
      title: "Set Pure Data Parameters",
      description: "Update bounded live parameters on the running Pd demo patch.",
      inputSchema: pdSetParamsSchema
    },
    async (input) => {
      try {
        return toToolResult(await session.setParams(input));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "pd_live_add_object",
    {
      title: "Add Live Pure Data Object",
      description:
        "Add a safe-palette object to the visible MCP live canvas in the running Pd GUI patch.",
      inputSchema: pdLiveAddObjectSchema
    },
    async (input) => {
      try {
        return toToolResult(await session.addLiveObject(input));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "pd_live_connect",
    {
      title: "Connect Live Pure Data Objects",
      description:
        "Connect two agent-created live objects by stable ids. Direct signal-to-dac~ connections are blocked.",
      inputSchema: pdLiveConnectSchema
    },
    async (input) => {
      try {
        return toToolResult(await session.connectLiveObjects(input));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "pd_live_move_object",
    {
      title: "Move Live Pure Data Object",
      description:
        "Move an agent-created live object by rebuilding the visible MCP live canvas at the new coordinates.",
      inputSchema: pdLiveMoveObjectSchema
    },
    async (input) => {
      try {
        return toToolResult(await session.moveLiveObject(input));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "pd_live_clear",
    {
      title: "Clear Live Pure Data Canvas",
      description: "Clear the agent-managed MCP live canvas and reset its object ids.",
      inputSchema: emptyToolSchema
    },
    async () => {
      try {
        return toToolResult(await session.clearLivePatch());
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "pd_live_graph",
    {
      title: "Inspect Live Pure Data Graph",
      description: "Return the agent-managed live patch object and connection graph.",
      inputSchema: emptyToolSchema
    },
    async () => toToolResult(session.livePatchSnapshot())
  );

  server.registerTool(
    "pd_stop",
    {
      title: "Stop Pure Data",
      description: "Silence and stop the currently running Pd process.",
      inputSchema: pdStopSchema
    },
    async (input) => {
      try {
        return toToolResult(await session.stop(input));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "pd_status",
    {
      title: "Pure Data Status",
      description: "Return Pd lifecycle state, patch path, parameters, and recent errors.",
      inputSchema: emptyToolSchema
    },
    async () => toToolResult(session.status())
  );

  server.registerTool(
    "pd_list_audio_devices",
    {
      title: "List Pd Audio Devices",
      description: "Best-effort query of Pd audio devices using the configured Pd binary.",
      inputSchema: emptyToolSchema
    },
    async () => {
      try {
        return toToolResult(await session.listAudioDevices());
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "pd_preview_patch",
    {
      title: "Preview Current Pd Patch",
      description: "Return the current generated Vanilla .pd patch text.",
      inputSchema: emptyToolSchema
    },
    async () => toToolResult({ patch: session.currentPatch() })
  );
}

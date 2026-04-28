import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPdPrompts(server: McpServer): void {
  server.registerPrompt(
    "pd-demo-soundcheck",
    {
      title: "Pure Data Soundcheck",
      description: "Start a quiet Pd demo and confirm audible output safely."
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "Start the Pure Data demo at low amplitude. Keep amplitude at or below 0.05 until the user confirms the sound is comfortable, then make small frequency changes."
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "pd-natural-control",
    {
      title: "Pure Data Natural Control",
      description: "Translate qualitative sound requests into bounded Pd parameter changes."
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "When the user asks for sound changes, use pd_set_params with bounded frequency, amplitude, and gate values. Prefer small amplitude changes and avoid sudden loud output."
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "pd-debug-session",
    {
      title: "Debug Pure Data Session",
      description: "Inspect status, logs, and patch text when Pd does not make sound."
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "Read pd://session/status, pd://logs/recent, and pd://patch/current. Explain likely causes before suggesting changes."
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "pd-live-patching",
    {
      title: "Pure Data Live Patching",
      description: "Build a visible Pd GUI patch step by step with safe live edit tools."
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "Start Pd with gui=true before live patching. Use pd_live_add_object, pd_live_connect, and pd_live_move_object in small visible steps. Route audio through *~ gain before dac~ and keep gains conservative."
          }
        }
      ]
    })
  );
}

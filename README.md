# PureData-MCP

Control and live-patch [Pure Data](https://puredata.info/) from AI agents via the Model Context Protocol.

PureData-MCP lets an MCP client start Pd, open visible GUI patches, generate Vanilla `.pd` patches, and edit objects and connections while a patch is running. The goal is simple: ask for sound in natural language, watch Pd become the instrument.

Pure Data, also known as Pd or Pd Vanilla, is the open-source visual programming language for multimedia created by Miller Puckette and maintained by the Pd community. This project is independent and is not affiliated with or endorsed by the Pure Data project. Many thanks to the Pure Data creators and community for making this kind of work possible.

## Quick Start

Install [Pure Data](https://puredata.info/downloads) and Node.js 20 or newer, then run the MCP server with npm:

```bash
npx -y @damagethundercat/puredata-mcp
```

Most users do not run that command directly. Instead, add it to an MCP client such as Codex, Claude Desktop, Cursor, or VS Code.

## Connect To Codex

Add this to your Codex MCP config:

```toml
[mcp_servers.puredata]
command = "npx"
args = ["-y", "@damagethundercat/puredata-mcp"]
```

On Windows, use `cmd /c` so the MCP client avoids PowerShell npm policy issues:

```toml
[mcp_servers.puredata]
command = "cmd"
args = ["/c", "npx", "-y", "@damagethundercat/puredata-mcp"]
```

Restart Codex after changing the config.

## Other MCP Clients

For clients that use JSON MCP config, add:

```json
{
  "mcpServers": {
    "puredata": {
      "command": "npx",
      "args": ["-y", "@damagethundercat/puredata-mcp"]
    }
  }
}
```

On Windows:

```json
{
  "mcpServers": {
    "puredata": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@damagethundercat/puredata-mcp"]
    }
  }
}
```

## Try It

After connecting the server, ask your agent:

```text
Create a visible Pure Data patch with an osc~ -> *~ -> dac~ signal chain.
```

```text
Make a 120 BPM electronic loop with kick, hi-hat, bass, a mixer, and dac~ in one Pure Data GUI window.
```

```text
Add a delay effect to the current patch and keep the output quiet.
```

```text
Move the bass section to the left, remove the old hi-hat object, and reconnect the mixer.
```

## What It Can Do

- Start and stop local Pure Data.
- Open Pd headless or with the visible Pd GUI.
- Generate small Vanilla `.pd` patches.
- Control frequency, amplitude, gate, and DSP over TCP FUDI.
- Add, connect, move, update, remove, replace, clear, and inspect agent-owned live patch graphs.
- List audio devices and inspect session status/logs.

## Tools

PureData-MCP exposes a small set of MCP tools:

- Lifecycle: `pd_start_demo`, `pd_stop`, `pd_status`
- Audio: `pd_set_params`, `pd_list_audio_devices`
- Patch preview: `pd_preview_patch`
- Live GUI editing: `pd_live_add_object`, `pd_live_connect`, `pd_live_move_object`, `pd_live_update_object`, `pd_live_remove_object`, `pd_live_disconnect`, `pd_live_replace_graph`, `pd_live_clear`, `pd_live_graph`

The live editing tools let an agent build and modify a visible Pure Data patch while it is running.

## Resources

- `pd://session/status`
- `pd://patch/current`
- `pd://logs/recent`
- `pd://schema/parameters`
- `pd://live/graph`

## Local Demos

Clone the repository if you want to run the included demos directly:

```bash
git clone https://github.com/damagethundercat/PureData-MCP.git
cd PureData-MCP
npm install
npm run build
```

Run the current electronic rhythm demo:

```bash
npm run demo:electro
```

On Windows PowerShell, prefer:

```powershell
cmd /c npm run demo:electro
```

The demo patch lives at `patches/electro-rhythm-loop.pd`.

## Development

```bash
npm run test:unit
npm run typecheck
npm run build
```

Opt-in Pd integration tests:

```bash
PD_INTEGRATION=1 PD_EXE="/path/to/pd" npm run test:pd
```

On Windows:

```powershell
$env:PD_EXE="C:\Program Files\Pd\bin\pd.com"
$env:PD_INTEGRATION="1"
cmd /c npm run test:pd
```

## Troubleshooting

- If Pd is not found, set `PD_EXE` for headless sessions or `PD_GUI_EXE` for visible GUI sessions.
- If audio is silent or routed to the wrong device, ask the agent to run `pd_list_audio_devices`, then start again with the right `audioOutDevice`.
- If PowerShell blocks npm scripts on Windows, run npm through `cmd /c npm ...`.

## License

MIT

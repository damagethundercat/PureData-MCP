# PureData-MCP

PureData-MCP is a TypeScript MCP server for launching, controlling, and live-patching Pure Data from an AI agent.

The current best demo is a visible Pure Data electronic rhythm patch: kick, hi-hat, bass, mixer, and `dac~` running in one Pd window.

## What It Does

- Starts and stops local Pure Data from an MCP client.
- Generates safe Vanilla `.pd` patches.
- Controls `frequency`, `amplitude`, and `gate` over TCP FUDI.
- Opens Pd headless by default, or with the Pd GUI when `gui: true`.
- Lets an agent add, connect, disconnect, move, update, remove, replace, clear, and inspect safe live GUI graphs.
- Includes a ready-to-record electronic rhythm demo patch.

## Best Demo

Run the electronic rhythm loop:

```powershell
cmd /c npm run demo:electro
```

By default the demo uses Pd's default audio output device. To choose a specific device, first inspect Pd's device list with `pd_list_audio_devices`, then pass the numeric device explicitly:

```powershell
$env:PD_AUDIO_OUT_DEVICE="1"
cmd /c npm run demo:electro
```

The patch lives at:

```text
patches/electro-rhythm-loop.pd
```

It contains:

- 16-step clock at roughly 120 BPM
- sine kick with pitch and amplitude envelopes
- noise hi-hat with high-pass/band-pass filtering
- phasor bass sequence with envelope and low-pass filtering
- live delay FX control on TCP port `19777`
- conservative mixer, clipping, and stereo output

Change the delay effect while the patch is running:

```powershell
cmd /c npm run demo:fx -- fxmix 0.18 delay 320 feedback 0.35 tone 1200
```

The Pd patch clamps live FX values:

- `fxmix`: `0..0.35`
- `delay`: `60..500` ms
- `feedback`: `0..0.65`
- `tone`: `300..6000` Hz

## Requirements

- Node.js 20+
- Pure Data Vanilla
- Windows: Pd is auto-discovered from common install locations or `PATH`.
- macOS: Pd is auto-discovered from `PATH`, `/Applications/Pd.app`, `/Applications/Pure Data.app`, and versioned app bundles such as `/Applications/Pd-0.56-2.app`.
- If auto-discovery fails, set `PD_EXE` for headless MCP use or `PD_GUI_EXE` for visible GUI demos.

Install from npm for MCP clients:

```powershell
cmd /c npx -y @damagethundercat/puredata-mcp
```

Or clone the repository for demos and development:

```powershell
cmd /c npm install
cmd /c npm run build
```

PowerShell may block `npm.ps1`; `cmd /c npm ...` avoids that on Windows.

## Connect To Codex

Add this to your Codex config file:

```toml
[mcp_servers.puredata]
command = "npx"
args = ["-y", "@damagethundercat/puredata-mcp"]
```

Restart Codex after changing MCP config.

For a local checkout instead of npm, build once and point Codex at the compiled entrypoint:

```powershell
cmd /c npm run build
```

```toml
[mcp_servers.puredata]
command = "node"
args = ["C:\\path\\to\\PureData-MCP\\dist\\src\\index.js"]
```

On macOS the local checkout path usually looks like:

```toml
[mcp_servers.puredata]
command = "node"
args = ["/path/to/PureData-MCP/dist/src/index.js"]
```

If auto-discovery cannot find Pd, add an explicit `PD_EXE` environment entry. For visible GUI demos you can set `PD_GUI_EXE`.

## MCP Tools

- `pd_start_demo`
- `pd_set_params`
- `pd_stop`
- `pd_status`
- `pd_list_audio_devices`
- `pd_preview_patch`
- `pd_live_add_object`
- `pd_live_connect`
- `pd_live_move_object`
- `pd_live_remove_object`
- `pd_live_disconnect`
- `pd_live_update_object`
- `pd_live_replace_graph`
- `pd_live_clear`
- `pd_live_graph`

Start a visible GUI session:

```json
{
  "patch": "basic_sine",
  "frequency": 220,
  "amplitude": 0.04,
  "gui": true
}
```

Build a visible live patch:

```text
pd_live_add_object({ "type": "osc~", "x": 120, "y": 80, "args": [220] })
pd_live_add_object({ "type": "*~", "x": 120, "y": 140, "args": [0.08] })
pd_live_add_object({ "type": "dac~", "x": 120, "y": 210 })
pd_live_connect({ "sourceId": "obj-1", "targetId": "obj-2" })
pd_live_connect({ "sourceId": "obj-2", "targetId": "obj-3" })
```

Replace the whole agent-owned live graph in one shot:

```text
pd_live_replace_graph({
  "nodes": [
    { "id": "obj-1", "type": "noise~", "x": 90, "y": 80 },
    { "id": "obj-2", "type": "*~", "x": 90, "y": 130, "args": [0.04] },
    { "id": "obj-3", "type": "dac~", "x": 90, "y": 190 }
  ],
  "connections": [
    { "id": "conn-1", "sourceId": "obj-1", "targetId": "obj-2" },
    { "id": "conn-2", "sourceId": "obj-2", "targetId": "obj-3" }
  ]
})
```

The live editor uses a safe object palette: `osc~`, `phasor~`, `noise~`, `*~`, `+~`, `-~`, `/~`, `hip~`, `lop~`, `line~`, `dac~`, `metro`, `random`, `float`, `bng`, and `tgl`.

Direct signal connections into `dac~` are blocked unless they pass through `*~` gain first.

## MCP Resources

- `pd://session/status`
- `pd://patch/current`
- `pd://logs/recent`
- `pd://schema/parameters`
- `pd://live/graph`

## Tests

Fast tests, no Pd required:

```powershell
cmd /c npm run test:unit
```

Typecheck and build:

```powershell
cmd /c npm run typecheck
cmd /c npm run build
```

Opt-in Pd integration test:

```powershell
$env:PD_EXE="C:\Program Files\Pd\bin\pd.com"
$env:PD_INTEGRATION="1"
cmd /c npm run test:pd
```

On macOS, `PD_EXE` can point to the app-bundled binary:

```bash
PD_EXE="/Applications/Pd.app/Contents/Resources/bin/pd" PD_INTEGRATION=1 npm run test:pd
```

## Recording Notes

For the current best demo, run:

```powershell
cmd /c npm run demo:electro
```

Then record the Pd window with your screen recorder. If recording on macOS, verify that your recorder captures system audio or route Pd audio into the recorder before doing the final take. Only set `PD_AUDIO_OUT_DEVICE` after confirming the device number on that machine.

## Safety

The server keeps demo levels conservative by default. Start with low amplitude, inspect `pd://logs/recent` when audio fails, and stop Pd with `pd_stop` or `Ctrl+C` after a demo.

## License

MIT

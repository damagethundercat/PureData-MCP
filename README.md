# PureData-MCP

PureData-MCP is a TypeScript MCP server for launching, controlling, and live-patching Pure Data from an AI agent.

The current best demo is a visible Pure Data electronic rhythm patch: kick, hi-hat, bass, mixer, and `dac~` running in one Pd window.

## What It Does

- Starts and stops local Pure Data from an MCP client.
- Generates safe Vanilla `.pd` patches.
- Controls `frequency`, `amplitude`, and `gate` over TCP FUDI.
- Opens Pd headless by default, or with the Pd GUI when `gui: true`.
- Lets an agent add, connect, move, clear, and inspect safe live GUI objects.
- Includes a ready-to-record electronic rhythm demo patch.

## Best Demo

Run the electronic rhythm loop:

```powershell
cmd /c npm run demo:electro
```

On this Windows setup, USB-C headphones were output device `1`:

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
- conservative mixer, clipping, and stereo output

## Requirements

- Node.js 20+
- Pure Data Vanilla
- Windows: tested with Pd 0.56.2 at `C:\Program Files\Pd`
- macOS: set `PD_EXE` if Pd is not on `PATH`

Install and build:

```powershell
cmd /c npm install
cmd /c npm run build
```

PowerShell may block `npm.ps1`; `cmd /c npm ...` avoids that on Windows.

## Connect To Codex

Build once:

```powershell
cmd /c npm run build
```

Add this to `C:\Users\ikidk\.codex\config.toml`:

```toml
[mcp_servers.puredata]
command = "node"
args = ["C:\\Users\\ikidk\\Documents\\New project\\dist\\src\\index.js"]
env = { PD_EXE = "C:\\Program Files\\Pd\\bin\\pd.com" }
```

Restart Codex after changing MCP config.

On macOS, the same idea looks like this:

```toml
[mcp_servers.puredata]
command = "node"
args = ["/path/to/PureData-MCP/dist/src/index.js"]
env = { PD_EXE = "/Applications/Pd.app/Contents/Resources/bin/pd" }
```

If your Pd binary is already on `PATH`, the `PD_EXE` entry can be omitted.

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
- `pd_live_clear`
- `pd_live_graph`

Start a visible GUI session:

```json
{
  "patch": "basic_sine",
  "frequency": 220,
  "amplitude": 0.04,
  "audioOutDevice": 1,
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

## Recording Notes

For the current best demo, run:

```powershell
$env:PD_AUDIO_OUT_DEVICE="1"
cmd /c npm run demo:electro
```

Then record the Pd window with your screen recorder. If recording on macOS, verify that your recorder captures system audio or route Pd audio into the recorder before doing the final take.

## Safety

The server keeps demo levels conservative by default. Start with low amplitude, inspect `pd://logs/recent` when audio fails, and stop Pd with `pd_stop` or `Ctrl+C` after a demo.

## License

MIT

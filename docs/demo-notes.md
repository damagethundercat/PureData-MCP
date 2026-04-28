# PureData-MCP Demo Notes

## Snapshot

This is the first strong public demo snapshot for PureData-MCP.

- Version: `0.2.0`
- Main demo patch: `patches/electro-rhythm-loop.pd`
- Main command: `npm run demo:electro`
- Live FX command: `npm run demo:fx -- fxmix 0.18 delay 320 feedback 0.35 tone 1200`
- Confirmed locally: Windows, Pd 0.56.2, USB-C audio output device `1`

## What To Show

1. Open the repository.
2. Run the electronic rhythm demo.
3. Show the visible Pure Data patch window.
4. Explain that an AI agent can launch Pd, generate patches, send FUDI control messages, and live-edit a safe GUI canvas.
5. While the patch keeps playing, send an FX command to show real-time delay changes.

## Recording Script

Suggested narration:

> This is PureData-MCP: an MCP server that lets an AI agent launch and control Pure Data. The current demo opens a Vanilla Pd patch with a small electronic rhythm loop: kick, hi-hat, bass, mixer, and output. The same server can also expose live GUI patching tools, so an agent can add and connect safe Pd objects while you watch the patch form.

Run:

```powershell
$env:PD_AUDIO_OUT_DEVICE="1"
cmd /c npm run demo:electro
```

Add delay while it is running:

```powershell
cmd /c npm run demo:fx -- fxmix 0.18 delay 320 feedback 0.35 tone 1200
```

Stop:

```powershell
Ctrl+C
```

or close the Pd window.

## MacBook Transfer

1. Clone the GitHub repository.
2. Install Node.js 20+ and Pure Data Vanilla.
3. Run `npm install`.
4. Run `npm run build`.
5. If Pd is not on `PATH`, set `PD_EXE`:

```bash
export PD_EXE="/Applications/Pd.app/Contents/Resources/bin/pd"
```

6. Run:

```bash
npm run demo:electro
```

If no sound is captured in a screen recording, check the recorder's system-audio capture settings before the final take.

import { setTimeout as delay } from "node:timers/promises";
import { parseOptionalAudioOutDevice } from "../src/pd/audioConfig.js";
import { PdSession } from "../src/pd/session.js";

const durationMs = Number(process.env.PD_DEMO_DURATION_MS ?? 12_000);
const audioOutDevice = parseOptionalAudioOutDevice(process.env.PD_AUDIO_OUT_DEVICE);

const session = new PdSession();

process.once("SIGINT", () => {
  void stopAndExit(130);
});

process.once("SIGTERM", () => {
  void stopAndExit(143);
});

async function main(): Promise<void> {
  console.log("Pure Data MCP manual demo");
  console.log(`Pd binary: ${process.env.PD_EXE ?? "auto-detect"}`);
  console.log(`Duration: ${durationMs}ms`);
  console.log(`Audio output device: ${audioOutDevice ?? "Pd default"}`);
  console.log("Starting quiet. Press Ctrl+C to stop.");

  const status = await session.startDemo({
    patch: "basic_sine",
    frequency: 220,
    amplitude: 0.03,
    audioOutDevice
  });

  console.log(`Patch: ${status.patchPath}`);
  console.log(`Control port: ${status.port}`);

  await delay(1_500);
  await session.setParams({ gate: true, frequency: 330, amplitude: 0.04 });
  console.log("Changed to 330 Hz");

  await delay(2_000);
  await session.setParams({ frequency: 440 });
  console.log("Changed to 440 Hz");

  await delay(2_000);
  await session.setParams({ frequency: 550, amplitude: 0.05 });
  console.log("Changed to 550 Hz");

  await delay(Math.max(0, durationMs - 5_500));
  await stopAndExit(0);
}

async function stopAndExit(code: number): Promise<void> {
  try {
    await session.setParams({ amplitude: 0, gate: false }).catch(() => undefined);
    await delay(200);
    await session.stop({ force: true });
  } finally {
    console.log("Stopped Pd.");
    process.exit(code);
  }
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  await stopAndExit(1);
});

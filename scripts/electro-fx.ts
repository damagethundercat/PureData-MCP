import { Socket } from "node:net";

const port = Number(process.env.PD_ELECTRO_FX_PORT ?? 19_777);
const args = process.argv.slice(2);

if (args.length === 0 || args.length % 2 !== 0) {
  printUsageAndExit();
}

const allowed = new Set(["fxmix", "delay", "feedback", "tone", "stop"]);
const messages: string[] = [];

for (let index = 0; index < args.length; index += 2) {
  const command = args[index];
  const rawValue = args[index + 1];
  if (!allowed.has(command)) {
    throw new Error(`Unsupported FX command: ${command}`);
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    throw new Error(`FX value must be numeric: ${rawValue}`);
  }

  messages.push(`${command} ${value};\n`);
}

const socket = new Socket();
await new Promise<void>((resolve, reject) => {
  socket.once("connect", resolve);
  socket.once("error", reject);
  socket.connect(port, "127.0.0.1");
});

for (const message of messages) {
  await new Promise<void>((resolve, reject) => {
    socket.write(message, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

socket.end();
console.log(`Sent ${messages.length} FX message(s) to Pd port ${port}.`);

function printUsageAndExit(): never {
  console.error(
    [
      "Usage:",
      "  npm run demo:fx -- fxmix 0.18 delay 320 feedback 0.35 tone 1200",
      "",
      "Ranges are clamped inside Pd:",
      "  fxmix 0..0.35",
      "  delay 60..500",
      "  feedback 0..0.65",
      "  tone 300..6000"
    ].join("\n")
  );
  process.exit(1);
}

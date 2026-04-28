import { Socket } from "node:net";

export type FudiValue = number | boolean;

const FUDI_COMMAND_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const RAW_FUDI_MESSAGE_PATTERN = /^[A-Za-z_][A-Za-z0-9_.~-]*(?: [A-Za-z0-9_.~+\-/#]+)*$/;
export const CONTROL_CONNECT_TIMEOUT_MS = 8_000;

export function formatFudiMessage(command: string, value: FudiValue): string {
  if (!FUDI_COMMAND_PATTERN.test(command)) {
    throw new Error(`Invalid FUDI command: ${command}`);
  }

  const formattedValue = typeof value === "boolean" ? (value ? "1" : "0") : String(value);
  return `${command} ${formattedValue};\n`;
}

export function formatRawFudiMessage(message: string): string {
  const trimmed = message.trim();
  if (!RAW_FUDI_MESSAGE_PATTERN.test(trimmed)) {
    throw new Error(`Invalid raw FUDI message: ${message}`);
  }

  return `${trimmed};\n`;
}

export class ControlClient {
  private socket: Socket | null = null;

  async connect(port: number, host = "127.0.0.1"): Promise<void> {
    if (this.socket && !this.socket.destroyed) {
      return;
    }

    this.socket = await connectWithRetry(port, host);
  }

  async setParams(params: Record<string, unknown>): Promise<void> {
    if (typeof params.frequency === "number") {
      await this.send("freq", params.frequency);
    }

    if (typeof params.amplitude === "number") {
      await this.send("amp", params.amplitude);
    }

    if (typeof params.gate === "boolean") {
      await this.send("gate", params.gate);
    }
  }

  async send(command: string, value: FudiValue): Promise<void> {
    await this.write(formatFudiMessage(command, value));
  }

  async sendRaw(message: string): Promise<void> {
    await this.write(formatRawFudiMessage(message));
  }

  async sendRawMessages(messages: string[]): Promise<void> {
    for (const message of messages) {
      await this.sendRaw(message);
    }
  }

  private async write(message: string): Promise<void> {
    if (!this.socket || this.socket.destroyed) {
      throw new Error("Pure Data control socket is not connected");
    }

    await new Promise<void>((resolve, reject) => {
      this.socket!.write(message, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  async close(): Promise<void> {
    if (!this.socket) {
      return;
    }

    const socket = this.socket;
    this.socket = null;

    if (socket.destroyed) {
      return;
    }

    await new Promise<void>((resolve) => {
      socket.once("close", () => resolve());
      socket.end();
      setTimeout(() => {
        if (!socket.destroyed) {
          socket.destroy();
        }
        resolve();
      }, 250).unref();
    });
  }
}

async function connectWithRetry(port: number, host: string): Promise<Socket> {
  const deadline = Date.now() + CONTROL_CONNECT_TIMEOUT_MS;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      return await connectOnce(port, host);
    } catch (error) {
      lastError = error;
      await delay(50);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Unable to connect to Pd control port ${port}`);
}

async function connectOnce(port: number, host: string): Promise<Socket> {
  return await new Promise((resolve, reject) => {
    const socket = new Socket();

    const cleanup = () => {
      socket.off("connect", onConnect);
      socket.off("error", onError);
    };

    const onConnect = () => {
      cleanup();
      resolve(socket);
    };

    const onError = (error: Error) => {
      cleanup();
      socket.destroy();
      reject(error);
    };

    socket.once("connect", onConnect);
    socket.once("error", onError);
    socket.connect(port, host);
  });
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

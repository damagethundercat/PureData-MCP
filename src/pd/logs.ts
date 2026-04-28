export type LogStream = "stdout" | "stderr";

export interface LogEntry {
  stream: LogStream;
  line: string;
}

const ERROR_PATTERNS = [/couldn't create/i, /\berror:/i];

export class LogRing {
  private readonly limit: number;
  private readonly buffer: LogEntry[] = [];

  constructor(limit: number) {
    this.limit = Math.max(0, Math.floor(limit));
  }

  add(stream: LogStream, text: string): void {
    for (const line of text.split(/\r?\n/)) {
      if (line.length === 0) {
        continue;
      }

      this.buffer.push({ stream, line });
      while (this.buffer.length > this.limit) {
        this.buffer.shift();
      }
    }
  }

  entries(): LogEntry[] {
    return [...this.buffer];
  }

  errorSummary(): string[] {
    return this.buffer
      .filter((entry) => entry.stream === "stderr")
      .map((entry) => entry.line)
      .filter((line) => ERROR_PATTERNS.some((pattern) => pattern.test(line)));
  }
}

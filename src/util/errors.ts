export class PdSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdSessionError";
  }
}

export class PdNotRunningError extends PdSessionError {
  constructor(message = "Pd session is not running") {
    super(message);
    this.name = "PdNotRunningError";
  }
}

export function parseOptionalAudioOutDevice(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const device = Number(value);
  if (!Number.isInteger(device) || device < 0) {
    throw new Error("PD_AUDIO_OUT_DEVICE must be a non-negative integer device number");
  }

  return device;
}

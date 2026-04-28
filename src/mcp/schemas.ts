import { z } from "zod";
import { LIVE_OBJECT_TYPES } from "../pd/livePatch.js";

export const PARAMETER_LIMITS = {
  frequency: { min: 20, max: 20_000, default: 220 },
  amplitude: { min: 0, max: 0.2, default: 0.05 }
} as const;

export const patchNameSchema = z.enum(["basic_sine", "drone"]);

export const pdStartDemoSchema = z.object({
  patch: patchNameSchema.default("basic_sine"),
  frequency: z
    .number()
    .min(PARAMETER_LIMITS.frequency.min)
    .max(PARAMETER_LIMITS.frequency.max)
    .default(PARAMETER_LIMITS.frequency.default),
  amplitude: z
    .number()
    .min(PARAMETER_LIMITS.amplitude.min)
    .max(PARAMETER_LIMITS.amplitude.max)
    .default(PARAMETER_LIMITS.amplitude.default),
  audioOutDevice: z.number().int().nonnegative().optional(),
  gui: z.boolean().default(false)
});

export const pdSetParamsSchema = z
  .object({
    frequency: z
      .number()
      .min(PARAMETER_LIMITS.frequency.min)
      .max(PARAMETER_LIMITS.frequency.max)
      .optional(),
    amplitude: z
      .number()
      .min(PARAMETER_LIMITS.amplitude.min)
      .max(PARAMETER_LIMITS.amplitude.max)
      .optional(),
    gate: z.boolean().optional()
  })
  .refine(
    (value) =>
      value.frequency !== undefined ||
      value.amplitude !== undefined ||
      value.gate !== undefined,
    "At least one parameter is required"
  );

export const pdStopSchema = z.object({
  force: z.boolean().default(false)
});

export const emptyToolSchema = z.object({});

const liveObjectIdSchema = z.string().regex(/^obj-\d+$/);
const canvasCoordinateSchema = z.number().int().min(0).max(2_000);
const portIndexSchema = z.number().int().min(0).max(32);

export const liveObjectTypeSchema = z.enum(LIVE_OBJECT_TYPES);

export const pdLiveAddObjectSchema = z.object({
  type: liveObjectTypeSchema,
  x: canvasCoordinateSchema,
  y: canvasCoordinateSchema,
  args: z.array(z.number().finite()).max(4).optional()
});

export const pdLiveConnectSchema = z.object({
  sourceId: liveObjectIdSchema,
  outlet: portIndexSchema.default(0),
  targetId: liveObjectIdSchema,
  inlet: portIndexSchema.default(0)
});

export const pdLiveMoveObjectSchema = z.object({
  id: liveObjectIdSchema,
  x: canvasCoordinateSchema,
  y: canvasCoordinateSchema
});

export type PatchName = z.infer<typeof patchNameSchema>;
export type PdStartDemoInput = z.infer<typeof pdStartDemoSchema>;
export type PdSetParamsInput = z.infer<typeof pdSetParamsSchema>;
export type PdStopInput = z.infer<typeof pdStopSchema>;
export type PdLiveAddObjectInput = z.infer<typeof pdLiveAddObjectSchema>;
export type PdLiveConnectInput = z.infer<typeof pdLiveConnectSchema>;
export type PdLiveMoveObjectInput = z.infer<typeof pdLiveMoveObjectSchema>;

export const parameterSchemaResource = {
  frequency: {
    type: "number",
    unit: "Hz",
    min: PARAMETER_LIMITS.frequency.min,
    max: PARAMETER_LIMITS.frequency.max,
    default: PARAMETER_LIMITS.frequency.default
  },
  amplitude: {
    type: "number",
    min: PARAMETER_LIMITS.amplitude.min,
    max: PARAMETER_LIMITS.amplitude.max,
    default: PARAMETER_LIMITS.amplitude.default
  },
  gate: {
    type: "boolean",
    default: true
  },
  liveObjects: {
    type: "safe-palette",
    values: LIVE_OBJECT_TYPES
  }
} as const;

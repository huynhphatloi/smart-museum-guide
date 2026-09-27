import { z } from 'zod';

/**
 * A zone's outline on its floor plan, in metres from the plan's top-left
 * corner. A circle suits "the area around one exhibit"; a polygon suits a
 * gallery with walls.
 */
export type MapShape =
  | { type: 'circle'; x: number; y: number; r: number }
  | { type: 'polygon'; points: Array<[number, number]> };

const metres = z.number().finite().min(0).max(1000);

const mapShapeSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('circle'),
      x: metres,
      y: metres,
      r: z.number().finite().gt(0).max(500),
    })
    .strict(),
  z
    .object({
      type: z.literal('polygon'),
      points: z
        .array(z.tuple([metres, metres]))
        .min(3)
        .max(200),
    })
    .strict(),
]);

/**
 * Validates an untrusted outline. Returns a readable reason instead of
 * throwing, so the caller decides which HTTP error it becomes.
 */
export function parseMapShape(
  value: unknown,
): { ok: true; shape: MapShape } | { ok: false; reason: string } {
  const result = mapShapeSchema.safeParse(value);
  if (result.success) return { ok: true, shape: result.data as MapShape };

  const issue = result.error.issues[0];
  const where = issue.path.length > 0 ? ` at ${issue.path.join('.')}` : '';
  return { ok: false, reason: `mapShape is invalid${where}: ${issue.message}` };
}

/** True when the whole outline fits inside a plan of the given size. */
export function shapeFitsPlan(shape: MapShape, width: number, height: number): boolean {
  if (shape.type === 'circle') return shape.x <= width && shape.y <= height;
  return shape.points.every(([x, y]) => x <= width && y <= height);
}

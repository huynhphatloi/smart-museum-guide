import { MapShape } from './types';

/** True when (x, y) lies inside the outline (on the edge counts as inside). */
export function containsPoint(shape: MapShape, x: number, y: number): boolean {
  if (shape.type === 'circle') return Math.hypot(x - shape.x, y - shape.y) <= shape.r;

  // Ray casting: count edge crossings of a ray from the point to the right.
  let inside = false;
  const { points } = shape;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Where a zone-level "you are here" goes when there is no fingerprint
 * position: the circle's centre, or the polygon's area centroid (falling
 * back to the vertex average for a degenerate polygon).
 */
export function centroid(shape: MapShape): { x: number; y: number } {
  if (shape.type === 'circle') return { x: shape.x, y: shape.y };

  const { points } = shape;
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const cross = xj * yi - xi * yj;
    area += cross;
    cx += (xj + xi) * cross;
    cy += (yj + yi) * cross;
  }

  if (Math.abs(area) < 1e-9) {
    return {
      x: points.reduce((sum, [px]) => sum + px, 0) / points.length,
      y: points.reduce((sum, [, py]) => sum + py, 0) / points.length,
    };
  }

  return { x: cx / (3 * area), y: cy / (3 * area) };
}

export type MapRotation = 0 | 90 | 180 | 270;
export interface MapPoint {
  x: number;
  y: number;
}

export function mapRotation(value: number): MapRotation {
  return value === 90 || value === 180 || value === 270 ? value : 0;
}

/** Display rotation only; dimensions and coordinates remain in the surveyed room. */
export function rotatedSize(width: number, height: number, rotation: MapRotation) {
  return rotation === 90 || rotation === 270 ? { width: height, height: width } : { width, height };
}

export function toRoomPoint(
  point: MapPoint,
  width: number,
  height: number,
  rotation: MapRotation,
): MapPoint {
  switch (rotation) {
    case 90:
      return { x: point.y, y: height - point.x };
    case 180:
      return { x: width - point.x, y: height - point.y };
    case 270:
      return { x: width - point.y, y: point.x };
    default:
      return point;
  }
}

export function mapTransform(
  width: number,
  height: number,
  rotation: MapRotation,
): string | undefined {
  switch (rotation) {
    case 90:
      return `translate(${height} 0) rotate(90)`;
    case 180:
      return `translate(${width} ${height}) rotate(180)`;
    case 270:
      return `translate(0 ${width}) rotate(270)`;
    default:
      return undefined;
  }
}

import { mapRotation, rotatedSize, toRoomPoint } from './map-view';

describe('rotated map interaction on a rectangular room', () => {
  const w = 11.84;
  const h = 9.958331;
  it('swaps the visible dimensions for quarter turns only', () => {
    expect(rotatedSize(w, h, 90)).toEqual({ width: h, height: w });
    expect(rotatedSize(w, h, 270)).toEqual({ width: h, height: w });
    expect(rotatedSize(w, h, 180)).toEqual({ width: w, height: h });
  });
  it.each([
    [0, 10.3, 1.48],
    [90, h - 1.48, 10.3],
    [180, w - 10.3, h - 1.48],
    [270, 1.48, w - 10.3],
  ] as const)('keeps the F132 room coordinates when viewed at %d degrees', (angle, x, y) => {
    const room = toRoomPoint({ x, y }, w, h, angle);
    expect(room.x).toBeCloseTo(10.3);
    expect(room.y).toBeCloseTo(1.48);
  });
  it('also inverts padded pixel coordinates used by mobile touch hit testing', () => {
    // A reference point at (2.48, 8.5), scale 20px/m, padding 10px.
    const room = toRoomPoint({ x: 20 * h + 20 - 180, y: 59.6 }, w * 20 + 20, h * 20 + 20, 90);
    expect((room.x - 10) / 20).toBeCloseTo(2.48);
    expect((room.y - 10) / 20).toBeCloseTo(8.5);
  });
  it('ignores malformed saved preferences', () => {
    expect(mapRotation(Number.NaN)).toBe(0);
    expect(mapRotation(45)).toBe(0);
  });
});

export interface SmootherConfig {
  /**
   * Exponential moving average factor per tick, 0..1. Lower is steadier but
   * lags a walking visitor more. At 500 ms ticks, 0.35 settles in ~3 s.
   */
  alpha: number;
  /** After this long without an estimate, start over instead of gliding. */
  resetAfterMs: number;
}

export const DEFAULT_SMOOTHER: SmootherConfig = { alpha: 0.35, resetAfterMs: 4000 };

/**
 * Smooths the marker, not the measurement: WKNN jumps between combinations
 * of reference points from one tick to the next, and a marker that twitches
 * half a metre every half second looks broken even when it is right on
 * average.
 */
export class PositionSmoother {
  private current: { x: number; y: number } | null = null;
  private lastAt: number | null = null;

  constructor(private readonly config: SmootherConfig = DEFAULT_SMOOTHER) {}

  update(x: number, y: number, at: number): { x: number; y: number } {
    const stale = this.lastAt === null || at - this.lastAt > this.config.resetAfterMs;
    this.lastAt = at;

    if (this.current === null || stale) {
      this.current = { x, y };
      return this.current;
    }

    const { alpha } = this.config;
    this.current = {
      x: this.current.x + alpha * (x - this.current.x),
      y: this.current.y + alpha * (y - this.current.y),
    };
    return this.current;
  }

  reset(): void {
    this.current = null;
    this.lastAt = null;
  }
}

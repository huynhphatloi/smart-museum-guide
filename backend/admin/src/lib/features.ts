/**
 * Build-time feature flags. Next.js inlines NEXT_PUBLIC_* values, so changing
 * one requires rebuilding the Admin panel.
 */

/** Experimental floor plan editor and indoor positioning tools. Off by default. */
export const indoorMapEnabled = process.env.NEXT_PUBLIC_INDOOR_MAP === 'true';

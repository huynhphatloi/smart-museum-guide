/** A calm, content first palette. Museums are not dashboards. */
export const theme = {
  colors: {
    background: '#FAF8F5',
    surface: '#FFFFFF',
    ink: '#1C1917',
    muted: '#78716C',
    line: '#E7E2DA',
    accent: '#7C5C3E',
    accentSoft: '#F0E7DC',
    success: '#2F6B4F',
    warning: '#9A6B12',
    danger: '#9B2C2C',
  },
  radius: { sm: 8, md: 14, lg: 22 },
  spacing: (units: number) => units * 8,
} as const;

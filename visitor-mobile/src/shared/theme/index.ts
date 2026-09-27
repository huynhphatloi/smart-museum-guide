/**
 * A gallery palette inspired by lacquer, aged paper and museum brass.
 * The visitor app should feel like an exhibition companion, not an admin dashboard.
 */
export const theme = {
  colors: {
    canvas: '#F5F2EB',
    background: '#F5F2EB',
    paper: '#FBFAF6',
    surface: '#FBFAF6',
    ink: '#22211E',
    muted: '#66635E',
    faint: '#9A9185',
    line: '#D9D5CD',
    accent: '#803E31',
    accentDark: '#522C26',
    accentSoft: '#E9D8D1',
    brass: '#A77C42',
    brassSoft: '#E8DDCA',
    success: '#486655',
    warning: '#8A621F',
    danger: '#8F332B',
    white: '#FFFFFF',
  },
  radius: { sm: 6, md: 12, lg: 22, arch: 120 },
  spacing: (units: number) => units * 8,
  type: { display: 'Newsreader', body: 'BeVietnamPro' },
} as const;

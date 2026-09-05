import { Platform } from 'react-native';

/**
 * A gallery palette inspired by lacquer, aged paper and museum brass.
 * The visitor app should feel like an exhibition companion, not an admin dashboard.
 */
export const theme = {
  colors: {
    canvas: '#F1EDE4',
    background: '#F1EDE4',
    paper: '#FAF7F0',
    surface: '#FAF7F0',
    ink: '#201D19',
    muted: '#70695F',
    faint: '#9A9185',
    line: '#D7CFC2',
    accent: '#8C392F',
    accentDark: '#5E261F',
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
  type: {
    display: Platform.select({ ios: 'Iowan Old Style', android: 'serif', default: 'serif' }),
    body: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'sans-serif' }),
  },
} as const;

import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export function BrandMark({ size = 40, light = false }: { size?: number; light?: boolean }) {
  const color = light ? '#F7F1E7' : '#2D2824';
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" accessibilityLabel="Museum Guide" accessible>
      <Path d="M8 23V8h15M41 8h15v15M56 41v15H41M23 56H8V41" stroke={color} strokeWidth={3.5} />
      <Path d="M32 16 48 32 32 48 16 32 32 16Z" stroke={color} strokeWidth={2.5} />
      <Circle cx={32} cy={32} r={5} fill="#C89A58" />
    </Svg>
  );
}

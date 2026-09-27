export function BrandMark({ size = 40, light = false }: { size?: number; light?: boolean }) {
  const color = light ? '#F7F1E7' : '#2D2824';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M8 23V8h15M41 8h15v15M56 41v15H41M23 56H8V41" stroke={color} strokeWidth="3.5" />
      <path d="M32 16 48 32 32 48 16 32 32 16Z" stroke={color} strokeWidth="2.5" />
      <circle cx="32" cy="32" r="5" fill="#C89A58" />
    </svg>
  );
}

import { useEffect, useState } from 'react';
import { API_URL } from '../api/client';

type MapShape =
  | { type: 'circle'; x: number; y: number; r: number }
  | { type: 'polygon'; points: Array<[number, number]> };

interface FloorPlan {
  id: string;
  name: string;
  level: string | null;
  widthMeters: number;
  heightMeters: number;
  imageUrl: string | null;
  zones: Array<{ code: string; name: string; mapShape: MapShape | null }>;
}

const COPY: Record<string, { title: string; here: string }> = {
  vi: { title: 'Vị trí trên bản đồ', here: 'Bạn đang ở đây' },
  en: { title: 'Where you are', here: 'You are here' },
};

function centreOf(shape: MapShape): { x: number; y: number } {
  if (shape.type === 'circle') return { x: shape.x, y: shape.y };
  return {
    x: shape.points.reduce((sum, [x]) => sum + x, 0) / shape.points.length,
    y: shape.points.reduce((sum, [, y]) => sum + y, 0) / shape.points.length,
  };
}

function mediaUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${API_URL.replace(/\/api\/?$/, '')}${url}`;
}

/**
 * The QR sticker hangs in the zone, so on this page the visitor's location is
 * known exactly at zone level - show that zone on the room plan. Renders
 * nothing when the zone is not on any plan.
 */
export function ZoneMap({ zoneCode, language }: { zoneCode: string; language: string }) {
  const [plan, setPlan] = useState<FloorPlan | null>(null);
  const copy = COPY[language.split('-')[0]] ?? COPY.en;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/public/floor-plans`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<FloorPlan[]>) : []))
      .then((plans) =>
        setPlan(
          plans.find((candidate) =>
            candidate.zones.some((zone) => zone.code === zoneCode && zone.mapShape),
          ) ?? null,
        ),
      )
      .catch(() => setPlan(null));
    return () => controller.abort();
  }, [zoneCode]);

  if (!plan) return null;

  const { widthMeters: w, heightMeters: h } = plan;
  const unit = Math.max(w, h) / 50;
  const current = plan.zones.find((zone) => zone.code === zoneCode);
  const marker = current?.mapShape ? centreOf(current.mapShape) : null;

  return (
    <section className="mx-auto max-w-6xl px-5 pb-16 md:px-8">
      <h2 className="mb-1 font-serif text-2xl text-museum-ink">{copy.title}</h2>
      <p className="mb-4 text-sm text-museum-muted">
        {plan.name}
        {plan.level ? ` · ${plan.level}` : ''}
      </p>
      <svg
        viewBox={`${-unit * 2} ${-unit * 2} ${w + unit * 4} ${h + unit * 4}`}
        className="w-full max-w-xl border border-museum-line bg-museum-paper"
        role="img"
        aria-label={`${copy.here}: ${current?.name ?? zoneCode}`}
      >
        {plan.imageUrl ? (
          <image
            href={mediaUrl(plan.imageUrl)}
            x={0}
            y={0}
            width={w}
            height={h}
            preserveAspectRatio="none"
            opacity={0.85}
          />
        ) : null}
        <defs>
          <clipPath id="zone-map-room">
            <rect x={0} y={0} width={w} height={h} />
          </clipPath>
        </defs>
        {plan.zones.map((zone) => {
          const shape = zone.mapShape;
          if (!shape) return null;
          const active = zone.code === zoneCode;
          const style = {
            fill: active ? 'rgba(140,57,47,0.24)' : 'rgba(167,124,66,0.1)',
            stroke: active ? '#8c392f' : '#d7cfc2',
            strokeWidth: unit * (active ? 0.3 : 0.15),
          };
          const centre = centreOf(shape);
          return (
            <g key={zone.code}>
              <g clipPath="url(#zone-map-room)">
                {shape.type === 'circle' ? (
                  <circle cx={shape.x} cy={shape.y} r={shape.r} {...style} />
                ) : (
                  <polygon
                    points={shape.points.map(([x, y]) => `${x},${y}`).join(' ')}
                    {...style}
                  />
                )}
              </g>
              <text
                x={centre.x}
                y={centre.y + (active ? unit * 3 : unit * 0.4)}
                fontSize={unit * 1.2}
                textAnchor="middle"
                fill={active ? '#5e261f' : '#70695f'}
                fontWeight={active ? 700 : 400}
              >
                {zone.name}
              </text>
            </g>
          );
        })}
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill="none"
          stroke="#201d19"
          strokeWidth={unit * 0.3}
        />
        {marker ? (
          <g>
            <circle
              cx={marker.x}
              cy={marker.y}
              r={unit * 0.9}
              fill="#8c392f"
              stroke="#fff"
              strokeWidth={unit * 0.35}
            />
            <text
              x={marker.x}
              y={marker.y - unit * 1.6}
              fontSize={unit * 1.1}
              textAnchor="middle"
              fill="#8c392f"
              fontWeight={700}
            >
              {copy.here}
            </text>
          </g>
        ) : null}
      </svg>
    </section>
  );
}

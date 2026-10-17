'use client';

import { RotateCcw, RotateCw } from 'lucide-react';
import { MouseEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { mediaUrl } from '@/lib/api-client';
import { useFloorPlanI18n } from '../i18n';
import { FloorPlanDetail, MapShape } from '../types';

const PAD = 0.35;

interface PlanCanvasProps {
  plan: FloorPlanDetail;
  /** Outline being drawn, shown dashed on top. */
  draft?: MapShape | null;
  selectedZoneId?: string | null;
  selectedBeaconId?: string | null;
  selectedPointId?: string | null;
  onClick?: (x: number, y: number) => void;
}

function shapePath(shape: Extract<MapShape, { type: 'polygon' }>): string {
  return (
    shape.points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z'
  );
}

/**
 * The room in metres: the SVG viewBox *is* the floor plan's coordinate
 * system, so a click converts straight to metres with the screen CTM.
 */
export function PlanCanvas({
  plan,
  draft,
  selectedZoneId,
  selectedBeaconId,
  selectedPointId,
  onClick,
}: PlanCanvasProps) {
  const worldRef = useRef<SVGGElement>(null);
  const { t } = useFloorPlanI18n();
  const [view, setView] = useState({ planId: plan.id, angle: 0 });
  const rotation = view.planId === plan.id ? view.angle : 0;
  const storageKey = `museum.map.rotation:${plan.id}`;
  useEffect(() => {
    let angle = 0;
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if ([0, 90, 180, 270].includes(saved)) angle = saved;
    } catch {
      /* Viewing still works when browser storage is unavailable. */
    }
    setView({ planId: plan.id, angle });
  }, [plan.id, storageKey]);
  const rotate = (angle: number) => {
    angle = (angle + 360) % 360;
    setView({ planId: plan.id, angle });
    try {
      localStorage.setItem(storageKey, String(angle));
    } catch {
      /* View-only preference. */
    }
  };
  const { widthMeters: w, heightMeters: h } = plan;
  const sideways = rotation === 90 || rotation === 270;
  const transform =
    rotation === 90
      ? `translate(${h} 0) rotate(90)`
      : rotation === 180
        ? `translate(${w} ${h}) rotate(180)`
        : rotation === 270
          ? `translate(0 ${w}) rotate(270)`
          : undefined;
  const upright = (x: number, y: number) =>
    rotation ? `rotate(${-rotation} ${x} ${y})` : undefined;
  // Keep label offsets vertical on screen, rather than rotating them into other labels.
  const labelAt = (x: number, y: number, offset: number) =>
    rotation === 90
      ? { x: x + offset, y }
      : rotation === 180
        ? { x, y: y - offset }
        : rotation === 270
          ? { x: x - offset, y }
          : { x, y: y + offset };
  const unit = Math.max(w, h) / 60;

  const handleClick = (event: MouseEvent<SVGSVGElement>) => {
    const world = worldRef.current;
    const svg = world?.ownerSVGElement;
    // Invert the rotated world, so editing always saves original room coordinates.
    const matrix = world?.getScreenCTM();
    if (!svg || !matrix || !onClick) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    const round = (value: number, max: number) =>
      Math.round(Math.min(max, Math.max(0, value)) * 100) / 100;
    onClick(round(local.x, w), round(local.y, h));
  };

  const gridLines = [];
  for (let x = 1; x < w; x += 1) gridLines.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={h} />);
  for (let y = 1; y < h; y += 1) gridLines.push(<line key={`y${y}`} x1={0} y1={y} x2={w} y2={y} />);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {t('viewAngle', { angle: rotation })}
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('rotateMap')}>
          <Button type="button" size="sm" variant="outline" onClick={() => rotate(rotation - 90)}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t('rotateLeft')}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => rotate(rotation + 90)}>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            {t('rotateRight')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={rotation === 0}
            onClick={() => rotate(0)}
          >
            {t('resetView')}
          </Button>
        </div>
      </div>
      <svg
        viewBox={`${-PAD} ${-PAD} ${(sideways ? h : w) + PAD * 2} ${(sideways ? w : h) + PAD * 2}`}
        className="max-h-[75vh] w-full cursor-crosshair select-none rounded-md border bg-muted/30"
        onClick={handleClick}
        role="img"
        aria-label={plan.name}
      >
        <g ref={worldRef} transform={transform}>
          <rect x={0} y={0} width={w} height={h} fill="#FAF7F0" />
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
          <g
            stroke="#D7CFC2"
            strokeWidth={unit * 0.08}
            strokeDasharray={`${unit * 0.3} ${unit * 0.5}`}
          >
            {gridLines}
          </g>
          {Array.from({ length: Math.floor(w) + 1 }, (_, x) => (
            <text
              key={`lx${x}`}
              x={x}
              y={-PAD * 0.35}
              transform={upright(x, -PAD * 0.35)}
              fontSize={unit * 0.9}
              textAnchor="middle"
              fill="#9A9185"
            >
              {x}
            </text>
          ))}
          {Array.from({ length: Math.floor(h) + 1 }, (_, y) => (
            <text
              key={`ly${y}`}
              x={-PAD * 0.5}
              y={y + unit * 0.3}
              transform={upright(-PAD * 0.5, y + unit * 0.3)}
              fontSize={unit * 0.9}
              textAnchor="middle"
              fill="#9A9185"
            >
              {y}
            </text>
          ))}

          {plan.zones.map((zone) => {
            const shape = zone.mapShape;
            if (!shape) return null;
            const selected = zone.id === selectedZoneId;
            const style = {
              fill: selected ? 'rgba(140,57,47,0.22)' : 'rgba(167,124,66,0.12)',
              stroke: selected ? '#8C392F' : '#A77C42',
              strokeWidth: unit * (selected ? 0.25 : 0.15),
            };
            const labelAt =
              shape.type === 'circle'
                ? { x: shape.x, y: shape.y }
                : {
                    x: shape.points.reduce((sum, [x]) => sum + x, 0) / shape.points.length,
                    y: shape.points.reduce((sum, [, y]) => sum + y, 0) / shape.points.length,
                  };
            return (
              <g key={zone.id}>
                {shape.type === 'circle' ? (
                  <circle cx={shape.x} cy={shape.y} r={shape.r} {...style} />
                ) : (
                  <path d={shapePath(shape)} {...style} />
                )}
                <text
                  x={labelAt.x}
                  y={labelAt.y}
                  transform={upright(labelAt.x, labelAt.y)}
                  fontSize={unit * 1.1}
                  textAnchor="middle"
                  fill="#5E261F"
                >
                  {zone.code}
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
            stroke="#201D19"
            strokeWidth={unit * 0.3}
          />

          {plan.surveyPoints.map((point) => {
            const selected = point.id === selectedPointId;
            const recorded = point.captures.some((capture) => capture.platform !== 'simulator');
            return (
              <g key={point.id}>
                {point.kind === 'TEST' ? (
                  <rect
                    x={point.x - unit * 0.55}
                    y={point.y - unit * 0.55}
                    width={unit * 1.1}
                    height={unit * 1.1}
                    fill={recorded ? '#486655' : '#FFFFFF'}
                    stroke={selected ? '#5E261F' : '#8A621F'}
                    strokeWidth={unit * (selected ? 0.35 : 0.15)}
                  />
                ) : (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={unit * 0.6}
                    fill={recorded ? '#486655' : '#FFFFFF'}
                    stroke={selected ? '#5E261F' : '#70695F'}
                    strokeWidth={unit * (selected ? 0.35 : 0.15)}
                  />
                )}
                <text
                  x={labelAt(point.x, point.y, -unit * 1.1).x}
                  y={labelAt(point.x, point.y, -unit * 1.1).y}
                  transform={upright(
                    labelAt(point.x, point.y, -unit * 1.1).x,
                    labelAt(point.x, point.y, -unit * 1.1).y,
                  )}
                  fontSize={unit * 0.8}
                  textAnchor="middle"
                  fill="#70695F"
                >
                  {point.label}
                </text>
              </g>
            );
          })}

          {plan.zones.flatMap((zone) =>
            zone.beacons.map((beacon) =>
              beacon.mapX === null || beacon.mapY === null ? null : (
                <g key={beacon.id}>
                  <rect
                    x={beacon.mapX - unit * 0.7}
                    y={beacon.mapY - unit * 0.7}
                    width={unit * 1.4}
                    height={unit * 1.4}
                    transform={`rotate(45 ${beacon.mapX} ${beacon.mapY})`}
                    fill="#A77C42"
                    stroke={beacon.id === selectedBeaconId ? '#5E261F' : '#FFFFFF'}
                    strokeWidth={unit * 0.25}
                  />
                  <text
                    x={labelAt(beacon.mapX, beacon.mapY, unit * 2).x}
                    y={labelAt(beacon.mapX, beacon.mapY, unit * 2).y}
                    transform={upright(
                      labelAt(beacon.mapX, beacon.mapY, unit * 2).x,
                      labelAt(beacon.mapX, beacon.mapY, unit * 2).y,
                    )}
                    fontSize={unit * 0.85}
                    textAnchor="middle"
                    fill="#A77C42"
                  >
                    {beacon.identifier}
                  </text>
                </g>
              ),
            ),
          )}

          {draft ? (
            draft.type === 'circle' ? (
              <circle
                cx={draft.x}
                cy={draft.y}
                r={draft.r}
                fill="rgba(140,57,47,0.12)"
                stroke="#8C392F"
                strokeWidth={unit * 0.2}
                strokeDasharray={`${unit * 0.6} ${unit * 0.4}`}
              />
            ) : (
              <g>
                {draft.points.length > 1 ? (
                  <path
                    d={draft.points
                      .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`)
                      .join(' ')}
                    fill="none"
                    stroke="#8C392F"
                    strokeWidth={unit * 0.2}
                    strokeDasharray={`${unit * 0.6} ${unit * 0.4}`}
                  />
                ) : null}
                {draft.points.map(([x, y], index) => (
                  <circle key={index} cx={x} cy={y} r={unit * 0.4} fill="#8C392F" />
                ))}
              </g>
            )
          ) : null}
        </g>
      </svg>
    </div>
  );
}

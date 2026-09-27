import React, { useMemo, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  Line,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { env } from '../../../shared/config/env';
import { theme } from '../../../shared/theme';
import { centroid } from '../model/zone-geometry';
import { FloorPlan, MapShape, PositionEstimate, ReferencePoint } from '../model/types';

export interface FloorMapProps {
  plan: FloorPlan;
  /** Fingerprint position (the smoothed marker). */
  estimate?: PositionEstimate | null;
  /** Zone-level stand-in marker when there is no fingerprint position. */
  fallbackPoint?: { x: number; y: number } | null;
  confirmedZone?: string | null;
  candidateZone?: string | null;
  /** Draw reference points, neighbours and weights - the WKNN explanation. */
  showAlgorithm?: boolean;
  /** Reference points to draw (overlay or calibration). */
  referencePoints?: ReferencePoint[];
  /** Calibration: recordings per point on this phone. */
  pointBadges?: Record<string, number>;
  selectedPointId?: string | null;
  virtualVisitor?: { x: number; y: number } | null;
  /** Tap (and drag, with `draggable`) anywhere, in metres. */
  onPressMap?: (x: number, y: number) => void;
  /** Tap near a reference point. Wins over onPressMap. */
  onPressPoint?: (pointId: string) => void;
  draggable?: boolean;
  onDragStateChange?: (dragging: boolean) => void;
}

const PAD = 10;
/** A tap this close to a reference point selects it, in metres. */
const POINT_HIT_M = 0.45;

function resolveMediaUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const origin = env.apiUrl.replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * The room, drawn to scale from its metre dimensions: walls, zones, beacons,
 * and where the visitor is. Everything is vector, so a plan works without any
 * background drawing.
 */
export function FloorMap(props: FloorMapProps) {
  const { plan } = props;
  const [width, setWidth] = useState(0);

  const scale = width > 0 ? (width - PAD * 2) / plan.widthMeters : 0;
  const height = plan.heightMeters * scale + PAD * 2;
  const px = (metres: number) => PAD + metres * scale;

  const toMetres = (event: GestureResponderEvent) => ({
    x: Math.min(plan.widthMeters, Math.max(0, (event.nativeEvent.locationX - PAD) / scale)),
    y: Math.min(plan.heightMeters, Math.max(0, (event.nativeEvent.locationY - PAD) / scale)),
  });

  const handleTouch = (event: GestureResponderEvent, moving: boolean) => {
    if (scale <= 0) return;
    const { x, y } = toMetres(event);
    if (!moving && props.onPressPoint && props.referencePoints) {
      const nearest = props.referencePoints
        .map((point) => ({ point, d: Math.hypot(point.x - x, point.y - y) }))
        .sort((a, b) => a.d - b.d)[0];
      if (nearest && nearest.d <= POINT_HIT_M) {
        props.onPressPoint(nearest.point.id);
        return;
      }
    }
    if (moving && !props.draggable) return;
    props.onPressMap?.(x, y);
  };

  const interactive = Boolean(props.onPressMap || props.onPressPoint);
  const gridLines = useMemo(() => {
    const lines: Array<{ key: string; x1: number; y1: number; x2: number; y2: number }> = [];
    for (let x = 1; x < plan.widthMeters; x += 1)
      lines.push({ key: `x${x}`, x1: x, y1: 0, x2: x, y2: plan.heightMeters });
    for (let y = 1; y < plan.heightMeters; y += 1)
      lines.push({ key: `y${y}`, x1: 0, y1: y, x2: plan.widthMeters, y2: y });
    return lines;
  }, [plan.widthMeters, plan.heightMeters]);

  const marker = props.estimate ?? null;
  const neighbourIds = new Set(marker?.neighbours.map((n) => n.pointId) ?? []);

  const renderShape = (shape: MapShape, fill: string, stroke: string, dashed: boolean) =>
    shape.type === 'circle' ? (
      <Circle
        cx={px(shape.x)}
        cy={px(shape.y)}
        r={shape.r * scale}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        strokeDasharray={dashed ? '5 4' : undefined}
      />
    ) : (
      <Polygon
        points={shape.points.map(([x, y]) => `${px(x)},${px(y)}`).join(' ')}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        strokeDasharray={dashed ? '5 4' : undefined}
      />
    );

  return (
    <View
      style={styles.frame}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => interactive}
      onMoveShouldSetResponder={() => interactive && Boolean(props.draggable)}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        props.onDragStateChange?.(true);
        handleTouch(event, false);
      }}
      onResponderMove={(event) => handleTouch(event, true)}
      onResponderRelease={() => props.onDragStateChange?.(false)}
      onResponderTerminate={() => props.onDragStateChange?.(false)}
    >
      {scale > 0 ? (
        <Svg width={width} height={height}>
          <Rect
            x={PAD}
            y={PAD}
            width={plan.widthMeters * scale}
            height={plan.heightMeters * scale}
            fill={theme.colors.paper}
          />
          {plan.imageUrl ? (
            <SvgImage
              x={PAD}
              y={PAD}
              width={plan.widthMeters * scale}
              height={plan.heightMeters * scale}
              href={{ uri: resolveMediaUrl(plan.imageUrl) }}
              preserveAspectRatio="none"
              opacity={0.85}
            />
          ) : null}

          {gridLines.map((line) => (
            <Line
              key={line.key}
              x1={px(line.x1)}
              y1={px(line.y1)}
              x2={px(line.x2)}
              y2={px(line.y2)}
              stroke={theme.colors.line}
              strokeWidth={0.6}
              strokeDasharray="2 4"
            />
          ))}

          <Defs>
            <ClipPath id="room">
              <Rect
                x={PAD}
                y={PAD}
                width={plan.widthMeters * scale}
                height={plan.heightMeters * scale}
              />
            </ClipPath>
          </Defs>
          {plan.zones.map((zone) => {
            if (!zone.mapShape) return null;
            const confirmed = zone.code === props.confirmedZone;
            const candidate = !confirmed && zone.code === props.candidateZone;
            const centre = centroid(zone.mapShape);
            return (
              <G key={zone.code}>
                <G clipPath="url(#room)">
                  {renderShape(
                    zone.mapShape,
                    confirmed ? 'rgba(140,57,47,0.24)' : 'rgba(167,124,66,0.10)',
                    confirmed
                      ? theme.colors.accent
                      : candidate
                        ? theme.colors.brass
                        : theme.colors.line,
                    candidate,
                  )}
                </G>
                {/* In calibration the survey point labels need the room. */}
                {props.pointBadges ? null : (
                  <SvgText
                    x={px(centre.x)}
                    // Below the centre: the zone-level marker sits on the centre itself.
                    y={
                      px(centre.y) +
                      (zone.mapShape.type === 'circle'
                        ? Math.min(zone.mapShape.r * scale * 0.5, 26)
                        : 4)
                    }
                    fontSize={11}
                    fontWeight={confirmed ? '700' : '500'}
                    fill={confirmed ? theme.colors.accentDark : theme.colors.muted}
                    textAnchor="middle"
                  >
                    {zone.name}
                  </SvgText>
                )}
              </G>
            );
          })}

          <Rect
            x={PAD}
            y={PAD}
            width={plan.widthMeters * scale}
            height={plan.heightMeters * scale}
            fill="none"
            stroke={theme.colors.ink}
            strokeWidth={2}
          />

          {(props.showAlgorithm || props.pointBadges) && props.referencePoints
            ? props.referencePoints.map((point) => {
                const count = props.pointBadges?.[point.id];
                const selected = point.id === props.selectedPointId;
                const neighbour = props.showAlgorithm && neighbourIds.has(point.id);
                const recorded = count !== undefined && count > 0;
                return (
                  <G key={point.id}>
                    <Circle
                      cx={px(point.x)}
                      cy={px(point.y)}
                      r={selected ? 9 : props.pointBadges ? 7 : 3}
                      fill={
                        neighbour
                          ? theme.colors.accent
                          : recorded
                            ? theme.colors.success
                            : props.pointBadges
                              ? theme.colors.white
                              : theme.colors.faint
                      }
                      stroke={selected ? theme.colors.accentDark : theme.colors.faint}
                      strokeWidth={selected ? 2.5 : 1}
                    />
                    {props.pointBadges ? (
                      <SvgText
                        x={px(point.x)}
                        y={px(point.y) - 11}
                        fontSize={9}
                        fill={theme.colors.muted}
                        textAnchor="middle"
                      >
                        {recorded ? `${point.label}·${count}` : point.label}
                      </SvgText>
                    ) : null}
                  </G>
                );
              })
            : null}

          {plan.beacons.map((beacon) =>
            beacon.mapX === null || beacon.mapY === null ? null : (
              <G key={beacon.identifier}>
                <Polygon
                  points={[
                    `${px(beacon.mapX)},${px(beacon.mapY) - 7}`,
                    `${px(beacon.mapX) + 7},${px(beacon.mapY)}`,
                    `${px(beacon.mapX)},${px(beacon.mapY) + 7}`,
                    `${px(beacon.mapX) - 7},${px(beacon.mapY)}`,
                  ].join(' ')}
                  fill={theme.colors.brass}
                  stroke={theme.colors.white}
                  strokeWidth={1.5}
                />
                {/* Visitors need the zones, not hardware names - labels only when explaining. */}
                {props.showAlgorithm ? (
                  <SvgText
                    // Beside the diamond, on the same line - clear of the reference grid.
                    x={px(beacon.mapX) + (beacon.mapX > plan.widthMeters / 2 ? -11 : 11)}
                    y={px(beacon.mapY) + 3}
                    fontSize={9}
                    fill={theme.colors.brass}
                    textAnchor={beacon.mapX > plan.widthMeters / 2 ? 'end' : 'start'}
                  >
                    {beacon.identifier}
                  </SvgText>
                ) : null}
              </G>
            ),
          )}

          {props.showAlgorithm && marker
            ? marker.neighbours.map((neighbour) => (
                <G key={`n-${neighbour.pointId}`}>
                  <Line
                    x1={px(marker.rawX)}
                    y1={px(marker.rawY)}
                    x2={px(neighbour.x)}
                    y2={px(neighbour.y)}
                    stroke={theme.colors.accent}
                    strokeOpacity={0.7}
                    strokeWidth={1 + neighbour.weight * 5}
                  />
                  <SvgText
                    x={px(neighbour.x) + 6}
                    y={px(neighbour.y) - 6}
                    fontSize={9}
                    fontWeight="700"
                    fill={theme.colors.accentDark}
                  >
                    {`${neighbour.label} ${neighbour.weight.toFixed(2)}`}
                  </SvgText>
                </G>
              ))
            : null}

          {props.virtualVisitor ? (
            <Circle
              cx={px(props.virtualVisitor.x)}
              cy={px(props.virtualVisitor.y)}
              r={11}
              fill="none"
              stroke={theme.colors.ink}
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          ) : null}

          {marker ? (
            <G>
              <Circle
                cx={px(marker.x)}
                cy={px(marker.y)}
                r={Math.max(0.3, marker.spreadM) * scale}
                fill="rgba(140,57,47,0.12)"
                stroke="rgba(140,57,47,0.35)"
                strokeWidth={1}
              />
              {props.showAlgorithm ? (
                <Circle
                  cx={px(marker.rawX)}
                  cy={px(marker.rawY)}
                  r={4}
                  fill="none"
                  stroke={theme.colors.accentDark}
                  strokeWidth={1.5}
                />
              ) : null}
              <Circle
                cx={px(marker.x)}
                cy={px(marker.y)}
                r={8}
                fill={theme.colors.accent}
                stroke={theme.colors.white}
                strokeWidth={3}
              />
            </G>
          ) : props.fallbackPoint ? (
            <Circle
              cx={px(props.fallbackPoint.x)}
              cy={px(props.fallbackPoint.y)}
              r={8}
              fill={theme.colors.brass}
              stroke={theme.colors.white}
              strokeWidth={3}
            />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
});

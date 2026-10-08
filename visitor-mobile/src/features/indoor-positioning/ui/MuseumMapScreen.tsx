import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../shared/theme';
import { Body, Button, Eyebrow, Pill, Row, Title } from '../../../shared/ui';
import { useGuide } from '../../tour/model/GuideContext';
import { pt } from '../i18n';
import { usePositioning } from '../model/PositioningContext';
import { proximityMarker } from '../model/proximity-marker';
import { FloorMap } from './FloorMap';

export function MuseumMapScreen() {
  const { language, scanning, startScanning, snapshot, registry } = useGuide();
  const { floorPlans, plan, radioMap, tick, selectPlan, moveVirtualVisitor, virtualVisitor } =
    usePositioning();
  const [explain, setExplain] = useState(false);
  const [dragging, setDragging] = useState(false);

  const estimate = tick?.estimate ?? null;
  const confirmedZone = snapshot.confirmedZone;
  const zoneName =
    registry.find((beacon) => beacon.zoneCode === confirmedZone)?.zoneName ?? confirmedZone;

  // Quick testing needs only registered beacon positions. This marker is a
  // nearby landmark; fingerprints remain the source of phone coordinates.
  const fallbackPoint = useMemo(() => {
    if (estimate || !plan || !scanning) return null;
    return proximityMarker(plan, confirmedZone, snapshot.stats);
  }, [estimate, plan, scanning, confirmedZone, snapshot.stats]);

  const referencePoints = useMemo(
    () =>
      radioMap?.entries.map((entry) => ({
        id: entry.pointId,
        label: entry.label,
        x: entry.x,
        y: entry.y,
      })) ?? [],
    [radioMap],
  );

  const status = !scanning
    ? pt(language, 'statusIdle')
    : !tick || tick.status === 'no-radio-map'
      ? pt(language, fallbackPoint ? 'statusNearbyZone' : 'statusNoRadioMap')
      : tick.status === 'weak-signal'
        ? pt(language, 'statusWeak', { n: 2 })
        : pt(language, 'statusOk', { m: (estimate?.spreadM ?? 0).toFixed(1) });

  const sourceLabel =
    radioMap?.source === 'model'
      ? pt(language, 'sourceModel')
      : radioMap?.source === 'platform'
        ? pt(language, 'sourcePlatform')
        : pt(language, 'sourceAny');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={!dragging}
        showsVerticalScrollIndicator={false}
      >
        <Row style={styles.header}>
          <View style={styles.headerCopy}>
            <Eyebrow>
              {pt(language, 'mapEyebrow')}
              {plan ? ` · ${plan.name}` : ''}
            </Eyebrow>
            <Title>{pt(language, 'mapTitle')}</Title>
          </View>
        </Row>

        {floorPlans.length > 1 ? (
          <Row style={styles.plans}>
            {floorPlans.map((candidate) => (
              <Pressable key={candidate.id} onPress={() => selectPlan(candidate.id)}>
                <Pill
                  label={
                    candidate.level ? `${candidate.name} · ${candidate.level}` : candidate.name
                  }
                  tone={candidate.id === plan?.id ? 'good' : 'neutral'}
                />
              </Pressable>
            ))}
          </Row>
        ) : null}

        {!plan ? (
          <Body>{pt(language, 'statusNoMap')}</Body>
        ) : (
          <>
            <View style={styles.statusRow}>
              <View style={[styles.dot, estimate ? styles.dotLive : null]} />
              <Text style={styles.status}>{status}</Text>
            </View>
            <Text style={styles.zone}>
              {confirmedZone
                ? pt(language, 'zoneHere', { zone: zoneName ?? confirmedZone })
                : pt(language, 'noZone')}
            </Text>

            <FloorMap
              plan={plan}
              estimate={estimate}
              fallbackPoint={fallbackPoint}
              confirmedZone={confirmedZone}
              candidateZone={snapshot.candidateZone}
              showAlgorithm={explain}
              referencePoints={referencePoints}
              virtualVisitor={moveVirtualVisitor ? virtualVisitor : null}
              onPressMap={moveVirtualVisitor ?? undefined}
              draggable={Boolean(moveVirtualVisitor)}
              onDragStateChange={setDragging}
            />

            {fallbackPoint ? (
              <Text style={styles.hint}>{pt(language, 'nearbyZoneHelp')}</Text>
            ) : null}

            {moveVirtualVisitor ? (
              <Text style={styles.hint}>{pt(language, 'simulatorHint')}</Text>
            ) : null}

            {!scanning ? (
              <View style={styles.action}>
                <Button label={pt(language, 'startGuide')} onPress={() => void startScanning()} />
              </View>
            ) : null}

            <Row style={styles.toggle}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>{pt(language, 'explain')}</Text>
                <Text style={styles.hint}>{pt(language, 'explainHelp')}</Text>
              </View>
              <Switch
                value={explain}
                onValueChange={setExplain}
                trackColor={{ false: theme.colors.line, true: theme.colors.accentSoft }}
                thumbColor={explain ? theme.colors.accentDark : theme.colors.faint}
                ios_backgroundColor={theme.colors.line}
              />
            </Row>

            {explain ? (
              <View style={styles.panel}>
                {radioMap ? (
                  <Text style={styles.meta}>
                    {pt(language, 'radioMap', {
                      points: radioMap.entries.length,
                      source: sourceLabel,
                    })}{' '}
                    · k = {plan.positioningK}
                  </Text>
                ) : null}

                {estimate && radioMap ? (
                  <>
                    <Text style={styles.panelTitle}>{pt(language, 'liveVector')}</Text>
                    {radioMap.beaconOrder.map((identifier, index) => (
                      <Row key={identifier} style={styles.tableRow}>
                        <Text style={styles.cell}>{identifier}</Text>
                        <Text style={styles.cellValue}>
                          {estimate.vector[index].toFixed(1)} dBm
                        </Text>
                      </Row>
                    ))}
                    <Text style={styles.meta}>
                      {pt(language, 'beaconsHeard', {
                        n: estimate.beaconsHeard,
                        total: radioMap.beaconOrder.length,
                      })}
                    </Text>

                    <Text style={styles.panelTitle}>{pt(language, 'neighbours')}</Text>
                    {estimate.neighbours.map((neighbour) => (
                      <Row key={neighbour.pointId} style={styles.tableRow}>
                        <Text style={styles.cell}>
                          {neighbour.label} ({neighbour.x}, {neighbour.y})
                        </Text>
                        <Text style={styles.cellValue}>
                          d = {neighbour.distance.toFixed(1)} · {pt(language, 'weight')}{' '}
                          {neighbour.weight.toFixed(2)}
                        </Text>
                      </Row>
                    ))}
                    <Text style={styles.formula}>
                      (x, y) = Σ wᵢ·(xᵢ, yᵢ) = ({estimate.rawX.toFixed(2)},{' '}
                      {estimate.rawY.toFixed(2)})
                    </Text>
                  </>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { paddingHorizontal: theme.spacing(2.25), paddingBottom: theme.spacing(5) },
  header: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 4,
    marginBottom: theme.spacing(1),
  },
  headerCopy: { flex: 1, paddingRight: theme.spacing(2) },
  plans: { flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing(1.5) },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.faint },
  dotLive: { backgroundColor: theme.colors.success },
  status: { color: theme.colors.ink, fontFamily: theme.type.body, fontSize: 13, fontWeight: '600' },
  zone: {
    color: theme.colors.muted,
    fontFamily: theme.type.body,
    fontSize: 12,
    marginBottom: theme.spacing(1.5),
  },
  hint: {
    color: theme.colors.muted,
    fontFamily: theme.type.body,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
  },
  action: { marginTop: theme.spacing(1.5) },
  toggle: {
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: theme.colors.line,
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(1.5),
  },
  toggleCopy: { flex: 1, paddingRight: theme.spacing(2) },
  toggleTitle: {
    color: theme.colors.ink,
    fontFamily: theme.type.body,
    fontSize: 14,
    fontWeight: '600',
  },
  panel: {
    backgroundColor: theme.colors.paper,
    padding: theme.spacing(2),
    marginTop: theme.spacing(1.5),
    borderRadius: theme.radius.sm,
  },
  panelTitle: {
    color: theme.colors.ink,
    fontFamily: theme.type.body,
    fontSize: 12,
    fontWeight: '700',
    marginTop: theme.spacing(1.5),
    marginBottom: 4,
  },
  tableRow: { justifyContent: 'space-between', paddingVertical: 2 },
  cell: { color: theme.colors.ink, fontFamily: theme.type.body, fontSize: 12 },
  cellValue: { color: theme.colors.muted, fontFamily: theme.type.body, fontSize: 12 },
  meta: { color: theme.colors.muted, fontFamily: theme.type.body, fontSize: 11, marginTop: 4 },
  formula: {
    color: theme.colors.accentDark,
    fontFamily: theme.type.body,
    fontSize: 12,
    fontWeight: '600',
    marginTop: theme.spacing(1),
  },
});

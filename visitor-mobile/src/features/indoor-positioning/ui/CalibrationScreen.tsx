import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, StaffFloorPlan, api } from '../../../shared/api/client';
import { env } from '../../../shared/config/env';
import { theme } from '../../../shared/theme';
import { Body, Button, Eyebrow, Pill, Row, Subtitle } from '../../../shared/ui';
import { useGuide } from '../../tour/model/GuideContext';
import { pt } from '../i18n';
import { CalibrationRecorder, RecordedCapture } from '../model/calibration-recorder';
import { MinRssiSuggestion, suggestMinRssi } from '../model/calibration-tuning';
import { beaconOrderFor } from '../model/fingerprint-vector';
import { DEFAULT_POSITIONING_PROCESSOR } from '../model/position-engine';
import { usePositioning } from '../model/PositioningContext';
import { ReplayResult, replayCapture } from '../model/replay';
import { FloorMap } from './FloorMap';

const ORIENTATIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: '–' },
  { value: 0, label: '↑ 0°' },
  { value: 90, label: '→ 90°' },
  { value: 180, label: '↓ 180°' },
  { value: 270, label: '← 270°' },
];
const DURATIONS = [5, 10];

type Phase =
  | { kind: 'idle' }
  | { kind: 'recording'; recorder: CalibrationRecorder; endsAt: number }
  | { kind: 'review'; capture: RecordedCapture; result: ReplayResult }
  | { kind: 'saving'; capture: RecordedCapture; result: ReplayResult };

/**
 * Staff tool: stand on a survey point, hold still, record. The phone replays
 * the recording through the positioning processor to get the fingerprint,
 * uploads raw samples and fingerprint, and the radio map updates immediately.
 */
export function CalibrationScreen() {
  const { language, scanner, scanning, startScanning, reloadRegistry } = useGuide();
  const { floorPlans, plan, radioMap, device, reload, selectPlan, moveVirtualVisitor } =
    usePositioning();

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [detail, setDetail] = useState<StaffFloorPlan | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(10);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [now, setNow] = useState(Date.now());
  const [triggerM, setTriggerM] = useState(1.5);
  const [applied, setApplied] = useState<Record<string, number>>({});

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const loadDetail = useCallback(async () => {
    if (!token || !plan) return;
    try {
      setDetail(await api.staffFloorPlan(token, plan.id));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : String(error));
    }
  }, [token, plan]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  // A room pinned for calibration goes back to "loudest beacon" on leaving.
  useEffect(() => () => selectPlan(null), [selectPlan]);

  // Feed the recorder from the live pipeline while recording.
  useEffect(() => {
    if (!scanner) return undefined;
    return scanner.onSignal((signal) => {
      const current = phaseRef.current;
      if (current.kind === 'recording') current.recorder.record(signal);
    });
  }, [scanner]);

  // Countdown and automatic stop.
  useEffect(() => {
    if (phase.kind !== 'recording') return undefined;
    const timer = setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (at < phase.endsAt || !plan) return;
      clearInterval(timer);
      const capture = phase.recorder.finish(at);
      const result = replayCapture(capture.samples, {
        processor: DEFAULT_POSITIONING_PROCESSOR,
        // The scanner's own cadence, so fingerprints match what live ticks see.
        tickMs: env.ble.tickIntervalMs,
        fillDbm: plan.fillDbm,
      });
      setPhase({ kind: 'review', capture, result });
    }, 250);
    return () => clearInterval(timer);
  }, [phase, plan]);

  const points = useMemo(() => detail?.surveyPoints ?? [], [detail]);
  const selected = points.find((point) => point.id === selectedId) ?? null;

  const badges = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const point of points) {
      counts[point.id] = point.captures.filter(
        (capture) => capture.deviceModel === device.model && capture.platform === device.platform,
      ).length;
    }
    return counts;
  }, [points, device]);

  const references = points.filter((point) => point.kind === 'REFERENCE');
  const referencesDone = references.filter((point) => (badges[point.id] ?? 0) > 0).length;

  const suggestions = useMemo(() => {
    // A reach fitted on another platform's radio map would be off by that
    // platform's RSSI offset - only suggest from this phone's own kind of data.
    if (!plan || !radioMap || radioMap.source === 'any') return [] as MinRssiSuggestion[];
    return plan.beacons.flatMap((beacon) => {
      if (beacon.mapX === null || beacon.mapY === null) return [];
      const suggestion = suggestMinRssi(
        radioMap,
        beacon.identifier,
        { x: beacon.mapX, y: beacon.mapY },
        triggerM,
      );
      return suggestion ? [suggestion] : [];
    });
  }, [plan, radioMap, triggerM]);

  // --- actions -------------------------------------------------------------

  const choosePoint = (pointId: string) => {
    setSelectedId(pointId);
    // Simulation: stand the virtual visitor on the point, so the recording is
    // what a phone there would hear.
    const point = points.find((candidate) => candidate.id === pointId);
    if (point && moveVirtualVisitor) moveVirtualVisitor(point.x, point.y);
  };

  const signIn = async () => {
    setSigningIn(true);
    setMessage(null);
    try {
      const response = await api.staffLogin(email.trim(), password);
      setToken(response.accessToken);
      setPassword('');
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : pt(language, 'loginFailed'));
    } finally {
      setSigningIn(false);
    }
  };

  const record = async () => {
    if (!plan || !selected) return;
    if (!scanning) await startScanning();
    const startedAt = Date.now();
    setMessage(null);
    setNow(startedAt);
    setPhase({
      kind: 'recording',
      recorder: new CalibrationRecorder(startedAt, new Set(beaconOrderFor(plan))),
      endsAt: startedAt + seconds * 1000,
    });
  };

  const save = async () => {
    if (phase.kind !== 'review' || !token || !selected) return;
    setPhase({ kind: 'saving', capture: phase.capture, result: phase.result });
    try {
      await api.uploadCapture(token, selected.id, {
        deviceModel: device.model,
        platform: device.platform,
        ...(orientation === null ? {} : { orientationDeg: orientation }),
        startedAt: new Date(phase.capture.startedAt).toISOString(),
        durationMs: phase.capture.durationMs,
        samples: phase.capture.samples,
        fingerprint: phase.result.fingerprint,
      });
      setMessage(pt(language, 'saved'));
      setPhase({ kind: 'idle' });
      await Promise.all([loadDetail(), reload()]);
    } catch (error) {
      setMessage(
        pt(language, 'saveFailed', {
          message: error instanceof ApiError ? error.message : String(error),
        }),
      );
      setPhase({ kind: 'review', capture: phase.capture, result: phase.result });
    }
  };

  const apply = async (suggestion: MinRssiSuggestion) => {
    if (!token) return;
    try {
      const found = await api.findBeacon(token, suggestion.beacon);
      const beacon = found.items.find((item) => item.identifier === suggestion.beacon);
      if (!beacon) throw new Error(suggestion.beacon);
      await api.setBeaconMinRssi(token, beacon.id, suggestion.minRssi);
      setApplied((current) => ({ ...current, [suggestion.beacon]: suggestion.minRssi }));
      // The running zone detector picks the new reach up straight away.
      await reloadRegistry();
    } catch (error) {
      setMessage(
        pt(language, 'saveFailed', {
          message: error instanceof ApiError ? error.message : String(error),
        }),
      );
    }
  };

  // --- render --------------------------------------------------------------

  if (!token) {
    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Eyebrow>{pt(language, 'staffOnly')}</Eyebrow>
        <Body>{pt(language, 'calibrationEntryHelp')}</Body>
        <TextInput
          style={styles.input}
          placeholder={pt(language, 'email')}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder={pt(language, 'password')}
          secureTextEntry
          autoCorrect={false}
          textContentType="password"
          value={password}
          onChangeText={setPassword}
        />
        <Button
          label={signingIn ? pt(language, 'signingIn') : pt(language, 'signIn')}
          onPress={() => void signIn()}
          loading={signingIn}
          disabled={!email || !password}
        />
        {message ? <Text style={styles.error}>{message}</Text> : null}
      </ScrollView>
    );
  }

  if (!plan) {
    return (
      <View style={styles.content}>
        <Body>{pt(language, 'statusNoMap')}</Body>
      </View>
    );
  }

  const recording = phase.kind === 'recording';
  const heard = recording ? phase.recorder.heardRecently(now) : 0;
  const review = phase.kind === 'review' || phase.kind === 'saving' ? phase : null;

  return (
    <ScrollView contentContainerStyle={styles.content} scrollEnabled={!recording}>
      {floorPlans.length > 1 ? (
        <Row style={styles.chips}>
          {floorPlans.map((candidate) => (
            <Pressable
              key={candidate.id}
              onPress={() => {
                // Calibrating a room pins it, whatever beacon is loudest.
                selectPlan(candidate.id);
                setSelectedId(null);
              }}
            >
              <Pill label={candidate.name} tone={candidate.id === plan.id ? 'good' : 'neutral'} />
            </Pressable>
          ))}
        </Row>
      ) : null}
      <Eyebrow>
        {plan.name} · {plan.widthMeters} × {plan.heightMeters} m
      </Eyebrow>
      <Text style={styles.meta}>
        {pt(language, 'device', { model: device.model, platform: device.platform })}
      </Text>
      <Text style={styles.meta}>
        {pt(language, 'progress', { done: referencesDone, total: references.length })}
      </Text>

      <View style={styles.map}>
        <FloorMap
          plan={plan}
          referencePoints={points}
          pointBadges={badges}
          selectedPointId={selectedId}
          onPressPoint={recording ? undefined : choosePoint}
        />
      </View>

      {selected ? (
        <Text style={styles.selected}>
          {pt(language, 'selectedPoint', { label: selected.label, x: selected.x, y: selected.y })}
          {selected.kind === 'TEST' ? ` (${pt(language, 'testPoint')})` : ''} ·{' '}
          {pt(language, 'pointCoverage', { n: badges[selected.id] ?? 0 })}
        </Text>
      ) : (
        <Text style={styles.meta}>{pt(language, 'choosePoint')}</Text>
      )}

      <Subtitle>{pt(language, 'orientation')}</Subtitle>
      <Row style={styles.chips}>
        {ORIENTATIONS.map((option) => (
          <Pressable key={option.label} onPress={() => setOrientation(option.value)}>
            <Pill
              label={option.value === null ? pt(language, 'orientationNone') : option.label}
              tone={orientation === option.value ? 'good' : 'neutral'}
            />
          </Pressable>
        ))}
      </Row>

      <Subtitle>{pt(language, 'duration')}</Subtitle>
      <Row style={styles.chips}>
        {DURATIONS.map((value) => (
          <Pressable key={value} onPress={() => setSeconds(value)}>
            <Pill label={`${value} s`} tone={seconds === value ? 'good' : 'neutral'} />
          </Pressable>
        ))}
      </Row>

      {recording ? (
        <View style={styles.panel}>
          <Text style={styles.big}>
            {pt(language, 'capturing', { s: Math.max(0, Math.ceil((phase.endsAt - now) / 1000)) })}
          </Text>
          <Text style={heard < 3 ? styles.warn : styles.meta}>
            {heard < 3
              ? pt(language, 'fewBeacons', { n: heard })
              : pt(language, 'heardNow', { n: heard })}
          </Text>
        </View>
      ) : review ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{pt(language, 'result')}</Text>
          {Object.keys(review.result.fingerprint).length === 0 ? (
            <Text style={styles.warn}>{pt(language, 'emptyCapture')}</Text>
          ) : (
            Object.entries(review.result.fingerprint).map(([beacon, dbm]) => (
              <Row key={beacon} style={styles.tableRow}>
                <Text style={styles.cell}>{beacon}</Text>
                <Text style={styles.cellValue}>
                  {dbm.toFixed(1)} dBm · {review.result.samplesPerBeacon[beacon] ?? 0} ·{' '}
                  {Math.round((review.result.presence[beacon] ?? 0) * 100)}%
                </Text>
              </Row>
            ))
          )}
          <Row style={styles.actions}>
            <View style={styles.flex}>
              <Button
                label={phase.kind === 'saving' ? pt(language, 'saving') : pt(language, 'save')}
                onPress={() => void save()}
                loading={phase.kind === 'saving'}
                disabled={Object.keys(review.result.fingerprint).length === 0}
              />
            </View>
            <View style={styles.flex}>
              <Button
                label={pt(language, 'discard')}
                variant="secondary"
                onPress={() => setPhase({ kind: 'idle' })}
              />
            </View>
          </Row>
        </View>
      ) : (
        <View style={styles.action}>
          <Button
            label={pt(language, 'startCapture')}
            onPress={() => void record()}
            disabled={!selected}
          />
        </View>
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.section}>
        <Subtitle>{pt(language, 'suggestions')}</Subtitle>
        <Text style={styles.meta}>
          {pt(language, 'suggestionsHelp', { m: triggerM.toFixed(1) })}
        </Text>
        <Row style={styles.chips}>
          {[1, 1.5, 2].map((value) => (
            <Pressable key={value} onPress={() => setTriggerM(value)}>
              <Pill label={`${value} m`} tone={triggerM === value ? 'good' : 'neutral'} />
            </Pressable>
          ))}
        </Row>
        {suggestions.length === 0 ? (
          <Text style={styles.meta}>
            {radioMap?.source === 'any'
              ? pt(language, 'suggestNeedsOwnData')
              : pt(language, 'notEnoughData')}
          </Text>
        ) : (
          suggestions.map((suggestion) => (
            <Row key={suggestion.beacon} style={styles.suggestion}>
              <View style={styles.flex}>
                <Text style={styles.cell}>
                  {suggestion.beacon}: minRssi {suggestion.minRssi} dBm
                </Text>
                <Text style={styles.meta}>
                  {pt(language, 'pathLoss', {
                    p0: suggestion.rssiAtOneMetre.toFixed(1),
                    n: suggestion.pathLossExponent.toFixed(2),
                  })}
                </Text>
                {applied[suggestion.beacon] === suggestion.minRssi ? (
                  <Text style={styles.meta}>{pt(language, 'applied')}</Text>
                ) : null}
              </View>
              <Button
                label={pt(language, 'apply')}
                variant="ghost"
                onPress={() => void apply(suggestion)}
              />
            </Row>
          ))
        )}
      </View>

      <View style={styles.action}>
        <Button label={pt(language, 'signOut')} variant="ghost" onPress={() => setToken(null)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing(2.5), paddingBottom: theme.spacing(6), gap: theme.spacing(1) },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.type.body,
    fontSize: 15,
    color: theme.colors.ink,
  },
  map: { marginVertical: theme.spacing(1) },
  meta: { color: theme.colors.muted, fontFamily: theme.type.body, fontSize: 12 },
  selected: {
    color: theme.colors.ink,
    fontFamily: theme.type.body,
    fontSize: 13,
    fontWeight: '600',
  },
  chips: { flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing(1) },
  panel: {
    backgroundColor: theme.colors.paper,
    padding: theme.spacing(2),
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing(1),
  },
  panelTitle: {
    color: theme.colors.ink,
    fontFamily: theme.type.body,
    fontSize: 13,
    fontWeight: '700',
  },
  big: { color: theme.colors.accentDark, fontFamily: theme.type.display, fontSize: 26 },
  warn: { color: theme.colors.warning, fontFamily: theme.type.body, fontSize: 12, marginTop: 4 },
  error: { color: theme.colors.danger, fontFamily: theme.type.body, fontSize: 13 },
  message: { color: theme.colors.ink, fontFamily: theme.type.body, fontSize: 13, marginTop: 6 },
  tableRow: { justifyContent: 'space-between', paddingVertical: 2 },
  cell: { color: theme.colors.ink, fontFamily: theme.type.body, fontSize: 12 },
  cellValue: { color: theme.colors.muted, fontFamily: theme.type.body, fontSize: 12 },
  actions: { gap: 8, marginTop: theme.spacing(1.5) },
  action: { marginTop: theme.spacing(1.5) },
  flex: { flex: 1 },
  section: {
    borderTopWidth: 1,
    borderColor: theme.colors.line,
    marginTop: theme.spacing(2.5),
    paddingTop: theme.spacing(2),
    gap: 4,
  },
  suggestion: { alignItems: 'center', paddingVertical: 6 },
});

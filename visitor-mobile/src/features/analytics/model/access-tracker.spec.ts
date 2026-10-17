import { AccessTracker, VisitEvent, VisitInput } from './access-tracker';

const input: VisitInput = {
  exhibitId: 'exhibit-a',
  zoneCode: 'ZONE_A',
  source: 'QR',
  platform: 'WEB',
};
function setup() {
  const saved = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => saved.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      saved.set(key, value);
    },
  };
  const send = jest.fn(async (_event: VisitEvent) => ({ recorded: true }));
  const clock = { at: 1000 };
  return {
    saved,
    storage,
    send,
    clock,
    tracker: new AccessTracker(
      storage,
      send,
      () => clock.at,
      async () => undefined,
    ),
  };
}
describe('Content access tracking', () => {
  it('counts once for concurrent opens and language/polling updates', async () => {
    const { tracker, send } = setup();
    await Promise.all([tracker.track(input), tracker.track(input), tracker.track(input)]);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('keeps an anonymous visitor and dedup receipt across app restarts', async () => {
    const { tracker, storage, send, clock } = setup();
    await tracker.track(input);
    const next = new AccessTracker(
      storage,
      send,
      () => clock.at,
      async () => undefined,
    );
    await next.track(input);
    expect(send).toHaveBeenCalledTimes(1);
    clock.at += 31 * 60_000;
    await next.track(input);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0].visitorId).toBe(send.mock.calls[1][0].visitorId);
    expect(send.mock.calls[0][0].eventId).not.toBe(send.mock.calls[1][0].eventId);
  });
  it('counts different exhibits/channels separately', async () => {
    const { tracker, send } = setup();
    await tracker.track(input);
    await tracker.track({ ...input, source: 'BLE' });
    await tracker.track({ ...input, exhibitId: 'exhibit-b' });
    expect(send).toHaveBeenCalledTimes(3);
  });
  it('retries with the same event id when the server response is lost', async () => {
    const { tracker, send } = setup();
    send.mockRejectedValueOnce(new Error('network'));
    await tracker.track(input);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0].eventId).toBe(send.mock.calls[1][0].eventId);
  });
  it('does not mark a failed delivery as counted or block future views', async () => {
    const { tracker, send } = setup();
    send.mockRejectedValue(new Error('offline'));
    await expect(tracker.track(input)).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(3);
    send.mockResolvedValue({ recorded: true });
    await tracker.track(input);
    expect(send).toHaveBeenCalledTimes(4);
  });
});

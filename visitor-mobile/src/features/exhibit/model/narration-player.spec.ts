import type { AVPlaybackStatus } from 'expo-av';
import { NarrationPlayer, NarrationSound, NarrationState } from './narration-player';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function sound(): NarrationSound & { status: (status: AVPlaybackStatus) => void } {
  const fake = {
    playAsync: jest.fn(async () => undefined),
    pauseAsync: jest.fn(async () => undefined),
    replayAsync: jest.fn(async () => undefined),
    unloadAsync: jest.fn(async () => undefined),
    status: (_status: AVPlaybackStatus): void => undefined,
    setOnPlaybackStatusUpdate: jest.fn((listener: ((status: AVPlaybackStatus) => void) | null) => {
      fake.status = listener ?? (() => undefined);
    }),
  };
  return fake;
}

const finished = { isLoaded: true, isPlaying: false, didJustFinish: true } as AVPlaybackStatus;

describe('exclusive narration player', () => {
  it('waits for the old sound to unload before allocating or playing the replacement', async () => {
    const first = sound();
    const second = sound();
    const unloading = deferred<void>();
    const started = deferred<void>();
    const factory = jest
      .fn<Promise<NarrationSound>, [string]>()
      .mockResolvedValueOnce(first)
      .mockResolvedValue(second);
    const player = new NarrationPlayer(factory);
    const a = player.open('a.mp3', jest.fn());
    await a.play();
    first.unloadAsync = jest.fn(() => {
      started.resolve();
      return unloading.promise;
    });
    const b = player.open('b.mp3', jest.fn());
    const playingB = b.play();
    await started.promise;
    expect(factory).toHaveBeenCalledTimes(1);
    expect(second.playAsync).not.toHaveBeenCalled();
    unloading.resolve();
    await playingB;
    expect(factory).toHaveBeenCalledTimes(2);
    expect(second.playAsync).toHaveBeenCalledTimes(1);
  });

  it('discards a slow old load without playing it when another exhibit is selected', async () => {
    const first = sound();
    const second = sound();
    const loading = deferred<NarrationSound>();
    const started = deferred<void>();
    const factory = jest.fn((url: string) => {
      if (url === 'a.mp3') {
        started.resolve();
        return loading.promise;
      }
      return Promise.resolve(second);
    });
    const player = new NarrationPlayer(factory);
    const a = player.open('a.mp3', jest.fn());
    const playingA = a.play();
    await started.promise;
    const b = player.open('b.mp3', jest.fn());
    const playingB = b.play();
    loading.resolve(first);
    await Promise.all([playingA, playingB]);
    expect(first.playAsync).not.toHaveBeenCalled();
    expect(first.unloadAsync).toHaveBeenCalledTimes(1);
    expect(second.playAsync).toHaveBeenCalledTimes(1);
  });

  it('unloads an in-flight sound after leaving the screen and never auto-plays it', async () => {
    const first = sound();
    const loading = deferred<NarrationSound>();
    const started = deferred<void>();
    const player = new NarrationPlayer(() => {
      started.resolve();
      return loading.promise;
    });
    const a = player.open('a.mp3', jest.fn());
    const playing = a.play();
    await started.promise;
    const closing = a.close();
    loading.resolve(first);
    await Promise.all([playing, closing]);
    expect(first.playAsync).not.toHaveBeenCalled();
    expect(first.unloadAsync).toHaveBeenCalledTimes(1);
  });

  it('ignores cleanup and playback callbacks from the previous screen', async () => {
    const first = sound();
    const second = sound();
    const factory = jest
      .fn<Promise<NarrationSound>, [string]>()
      .mockResolvedValueOnce(first)
      .mockResolvedValue(second);
    const player = new NarrationPlayer(factory);
    const a = player.open('a.mp3', jest.fn());
    await a.play();
    const staleCallback = first.status;
    const update = jest.fn<void, [NarrationState]>();
    const b = player.open('b.mp3', update);
    await b.play();
    await a.close();
    staleCallback(finished);
    expect(second.unloadAsync).not.toHaveBeenCalled();
    expect(update.mock.calls.at(-1)?.[0].playing).toBe(true);
  });

  it('coalesces rapid play taps while loading into one sound and one play', async () => {
    const first = sound();
    const loading = deferred<NarrationSound>();
    const started = deferred<void>();
    const factory = jest.fn(() => {
      started.resolve();
      return loading.promise;
    });
    const player = new NarrationPlayer(factory);
    const a = player.open('a.mp3', jest.fn());
    const play = a.play();
    await started.promise;
    await Promise.all([a.play(), a.toggle(), a.play()]);
    loading.resolve(first);
    await play;
    expect(factory).toHaveBeenCalledTimes(1);
    expect(first.playAsync).toHaveBeenCalledTimes(1);
  });

  it('pauses, resumes and replays a finished track without creating extra players', async () => {
    const first = sound();
    const factory = jest.fn(async () => first);
    const player = new NarrationPlayer(factory);
    const a = player.open('a.mp3', jest.fn());
    await a.play();
    await a.toggle();
    expect(first.pauseAsync).toHaveBeenCalledTimes(1);
    await a.toggle();
    expect(first.playAsync).toHaveBeenCalledTimes(2);
    first.status(finished);
    await a.play();
    expect(first.replayAsync).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(1);
    await a.close();
    expect(first.unloadAsync).toHaveBeenCalledTimes(1);
  });

  it('refuses a second sound if unloading the first fails', async () => {
    const first = sound();
    const factory = jest.fn(async () => first);
    const player = new NarrationPlayer(factory);
    const a = player.open('a.mp3', jest.fn());
    await a.play();
    first.unloadAsync = jest.fn(async () => {
      throw new Error('native unload failed');
    });
    const update = jest.fn<void, [NarrationState]>();
    const b = player.open('b.mp3', update);
    await b.play();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(update.mock.calls.at(-1)?.[0].error).toBe(true);
  });
});

import type { AVPlaybackStatus } from 'expo-av';

export interface NarrationSound {
  playAsync(): Promise<unknown>;
  pauseAsync(): Promise<unknown>;
  replayAsync(): Promise<unknown>;
  unloadAsync(): Promise<unknown>;
  setOnPlaybackStatusUpdate(listener: ((status: AVPlaybackStatus) => void) | null): void;
}

export interface NarrationState {
  playing: boolean;
  loading: boolean;
  error: boolean;
}

export interface NarrationSession {
  play(): Promise<void>;
  toggle(): Promise<void>;
  close(): Promise<void>;
}

interface Entry {
  url: string;
  state: NarrationState;
  finished: boolean;
  notify: (state: NarrationState) => void;
}

/** One native sound across all screens. The factory must load without playing. */
export class NarrationPlayer {
  private current: Entry | null = null;
  private loadedFor: Entry | null = null;
  private sound: NarrationSound | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly createSound: (url: string) => Promise<NarrationSound>) {}

  open(url: string, notify: Entry['notify']): NarrationSession {
    if (this.current) this.publish(this.current, { playing: false, loading: false });
    const entry: Entry = {
      url,
      notify,
      finished: false,
      state: { playing: false, loading: false, error: false },
    };
    // Invalidate pending loads immediately, before awaiting native operations.
    this.current = entry;
    notify(entry.state);
    void this.enqueue(() => this.unload()).catch(() => this.publish(entry, { error: true }));

    return {
      play: () => this.play(entry),
      toggle: () => {
        if (this.current !== entry || entry.state.loading) return Promise.resolve();
        if (!entry.state.playing) return this.play(entry);
        return this.run(entry, async () => {
          await this.sound?.pauseAsync();
          this.publish(entry, { playing: false });
        });
      },
      close: () => {
        // Cleanup from an older screen must never stop its replacement.
        if (this.current !== entry) return Promise.resolve();
        this.current = null;
        return this.enqueue(() => this.unload()).catch(() => undefined);
      },
    };
  }

  private play(entry: Entry): Promise<void> {
    if (this.current !== entry || entry.state.loading || entry.state.playing) {
      return Promise.resolve();
    }
    this.publish(entry, { loading: true, error: false });
    return this.run(entry, async () => {
      if (this.loadedFor !== entry) {
        // Never allocate the replacement until the previous sound is unloaded.
        await this.unload();
        if (this.current !== entry) return;
        this.sound = await this.createSound(entry.url);
        this.loadedFor = entry;
        if (this.current !== entry) {
          await this.unload();
          return;
        }
        this.sound.setOnPlaybackStatusUpdate((status) => {
          if (this.current !== entry || this.loadedFor !== entry) return;
          if (!status.isLoaded) {
            if (status.error) this.publish(entry, { error: true, playing: false });
            return;
          }
          if (status.didJustFinish) entry.finished = true;
          this.publish(entry, { playing: status.isPlaying });
        });
      }
      if (entry.finished) await this.sound?.replayAsync();
      else await this.sound?.playAsync();
      entry.finished = false;
      this.publish(entry, { playing: true, loading: false });
    });
  }

  private publish(entry: Entry, change: Partial<NarrationState>) {
    if (this.current !== entry) return;
    entry.state = { ...entry.state, ...change };
    entry.notify(entry.state);
  }

  private run(entry: Entry, action: () => Promise<void>): Promise<void> {
    return this.enqueue(async () => {
      if (this.current === entry) await action();
    }).catch(() => this.publish(entry, { error: true, loading: false, playing: false }));
  }

  private enqueue(action: () => Promise<void>): Promise<void> {
    const result = this.queue.then(action);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async unload(): Promise<void> {
    if (!this.sound) return;
    this.sound.setOnPlaybackStatusUpdate(null);
    await this.sound.unloadAsync();
    // If unloading fails, retain the reference and refuse a second player.
    this.sound = null;
    this.loadedFor = null;
  }
}

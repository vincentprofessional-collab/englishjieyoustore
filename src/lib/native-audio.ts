import type { HowlOptions } from "howler";

// Baidu's mobile media engine may never emit canplaythrough before play().
// Use metadata for duration and call the native play() during the user's tap.
export class NativeAudio {
  private media: HTMLAudioElement;
  private status: "unloaded" | "loading" | "loaded" = "unloaded";
  private pendingSeek: number | null = null;
  private cleanup: Array<() => void> = [];
  private disposed = false;
  readonly _sounds: Array<{ _node: HTMLAudioElement }>;

  constructor(private options: HowlOptions) {
    this.media = new Audio();
    this._sounds = [{ _node: this.media }];
    this.media.preload = options.preload === false ? "none" : "metadata";
    this.media.src = typeof options.src === "string" ? options.src : options.src[0];
    this.media.playbackRate = options.rate ?? 1;
    this.media.volume = options.volume ?? 1;
    this.listen("loadedmetadata", () => {
      this.status = "loaded";
      this.applySeek();
      options.onload?.(0);
    });
    this.listen("durationchange", () => {
      if (this.status === "loaded" && this.duration() > 0) options.onload?.(0);
    });
    this.listen("playing", () => options.onplay?.(0));
    this.listen("pause", () => options.onpause?.(0));
    this.listen("ended", () => options.onend?.(0));
    this.listen("error", () => {
      this.status = "unloaded";
      options.onloaderror?.(0, this.media.error?.code ?? 0);
    });
    if (options.preload !== false) this.load();
  }

  private listen(event: string, callback: () => void) {
    this.media.addEventListener(event, callback);
    this.cleanup.push(() => this.media.removeEventListener(event, callback));
  }

  private applySeek() {
    if (this.pendingSeek == null || this.media.readyState === 0) return;
    try {
      this.media.currentTime = this.pendingSeek;
      this.pendingSeek = null;
    } catch {
      // Keep the requested position until metadata is available.
    }
  }

  state() { return this.status; }
  duration() { return Number.isFinite(this.media.duration) ? this.media.duration : 0; }
  playing() { return !this.media.paused && !this.media.ended; }

  load() {
    if (this.disposed) return;
    this.status = "loading";
    this.media.load();
  }

  play() {
    if (this.disposed) return;
    this.applySeek();
    try {
      // Do not wait for metadata/canplaythrough: that loses the tap activation.
      const result = this.media.play();
      result?.catch((error: unknown) => {
        if (!this.disposed) this.options.onplayerror?.(0, String(error));
      });
    } catch (error) {
      this.options.onplayerror?.(0, String(error));
    }
  }

  pause() { this.media.pause(); }

  stop() {
    this.media.pause();
    this.seek(0);
    this.options.onstop?.(0);
  }

  seek(position?: number) {
    if (position == null) return this.pendingSeek ?? this.media.currentTime;
    this.pendingSeek = position;
    this.applySeek();
    return this;
  }

  rate(value?: number) {
    if (value != null) this.media.playbackRate = value;
    return this.media.playbackRate;
  }

  once(event: string, callback: () => void) {
    if (event !== "unlock") return;
    const unlock = () => {
      remove();
      if (!this.disposed) callback();
    };
    const remove = () => {
      document.removeEventListener("touchend", unlock);
      document.removeEventListener("click", unlock);
    };
    document.addEventListener("touchend", unlock);
    document.addEventListener("click", unlock);
    this.cleanup.push(remove);
  }

  unload() {
    this.disposed = true;
    this.cleanup.forEach((remove) => remove());
    this.cleanup = [];
    this.media.pause();
    this.media.removeAttribute("src");
    this.media.load();
  }
}

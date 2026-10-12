import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Execute the actual component with controlled media events, including mobile
// engines that report playerror before a delayed successful play event.
const source = ts.transpileModule(
  fs.readFileSync(new URL("../src/components/audio-player.tsx", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;

function harness() {
  let effects = [];
  const sounds = [];
  class Sound {
    constructor(options) {
      this.options = options;
      this.status = options.preload ? "loaded" : "unloaded";
      this.plays = 0;
      this.stops = 0;
      this.loads = 0;
      this.active = false;
      this.listeners = new Map();
      sounds.push(this);
    }
    state() { return this.status; }
    duration() { return 60; }
    playing() { return this.active; }
    seek(value) { return value ?? 0; }
    rate() {}
    load() { this.loads++; this.status = "loading"; }
    play() { this.plays++; }
    pause() { this.emit("pause"); }
    stop() { this.stops++; this.emit("stop"); }
    unload() { this.active = false; }
    once(event, fn) { this.listeners.set(event, fn); }
    emit(event) {
      this.active = event === "play";
      this.options[`on${event}`]?.();
      const fn = this.listeners.get(event);
      this.listeners.delete(event);
      fn?.();
    }
  }
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  const context = vm.createContext({
    exports,
    require(name) {
      if (name === "howler") return { Howl: Sound };
      if (name === "@/lib/native-audio") return { NativeAudio: Sound };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react") return {
        useRef: (current) => ({ current }),
        useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
        useEffect: (effect) => effects.push(effect),
      };
      if (name === "@/lib/audio-pronunciation") return {};
      throw new Error(`Unexpected import: ${name}`);
    },
    window: { matchMedia: () => ({ matches: true }), setTimeout, clearTimeout },
    navigator: { userAgent: "Android Chrome" },
  });
  vm.runInContext(source, context);
  function mount(props = {}) {
    const changes = [];
    effects = [];
    const tree = exports.AudioPlayer({ src: "/api/bbc-audio/2026/260727/full-content.mp3", onPlayingChange: (value) => changes.push(value), ...props });
    const cleanup = effects.map((effect) => effect()).filter(Boolean);
    const sound = sounds.at(-1);
    function findButton(node, label) {
      if (!node || typeof node !== "object") return null;
      if (node.type === "button" && node.props["aria-label"] === label) return node.props.onClick;
      for (const child of [node.props?.children].flat(Infinity)) {
        const found = findButton(child, label);
        if (found) return found;
      }
      return null;
    }
    return { sound, changes, play: findButton(tree, "播放"), pause: findButton(tree, "暂停"), unmount: () => cleanup.forEach((fn) => fn()) };
  }
  return { mount };
}

test("a second play event from the current audio is not mistaken for stale playback", () => {
  const { mount } = harness();
  const player = mount();
  player.play();
  player.sound.emit("play");
  player.sound.emit("play");
  assert.equal(player.sound.stops, 0);
  assert.equal(player.changes.at(-1), true);
});

test("a delayed successful play survives an earlier mobile playerror", () => {
  const player = harness().mount();
  player.play();
  player.sound.emit("playerror");
  player.sound.emit("play");
  assert.equal(player.sound.stops, 0);
  assert.equal(player.changes.at(-1), true);
});

test("mobile unlock retries only the still-current request", () => {
  const { mount } = harness();
  const current = mount();
  current.play();
  current.sound.emit("playerror");
  current.sound.emit("unlock");
  assert.equal(current.sound.plays, 2);
  current.sound.emit("playerror");
  const next = mount();
  next.play();
  current.sound.emit("unlock");
  assert.equal(current.sound.plays, 2);
  current.sound.emit("play");
  assert.equal(current.sound.active, false);
});

test("explicit pause cancels a late play event and an unlock retry", () => {
  const player = harness().mount({ compactControls: true });
  player.play();
  player.sound.emit("playerror");
  player.pause();
  player.sound.emit("unlock");
  assert.equal(player.sound.plays, 1);
  player.sound.emit("play");
  assert.equal(player.sound.active, false);
});

test("automatic sentence playback loads an unpreloaded audio source", () => {
  const player = harness().mount({ preload: false, autoPlaySignal: 1 });
  assert.equal(player.sound.loads, 1);
  assert.equal(player.sound.plays, 1);
});

test("overlapping autoplay and restore requests do not stop their own pending audio", () => {
  const player = harness().mount({ autoPlaySignal: 1, seekRequest: { id: 1, play: true, positionSeconds: 2 } });
  assert.equal(player.sound.stops, 0);
  assert.equal(player.sound.plays, 1);
});

test("a delayed pause callback does not cancel a newer play request", () => {
  const player = harness().mount({ compactControls: true });
  player.play();
  player.pause();
  player.play();
  player.sound.options.onpause();
  player.sound.emit("play");
  assert.equal(player.sound.stops, 0);
  assert.equal(player.changes.at(-1), true);
});

test("Baidu's native backend starts within the tap and reads duration from metadata", () => {
  class Media extends EventTarget {
    readyState = 0;
    duration = NaN;
    currentTime = 0;
    paused = true;
    ended = false;
    plays = 0;
    load() {}
    play() { this.plays++; this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() {}
  }
  const exports = {};
  const nativeSource = ts.transpileModule(
    fs.readFileSync(new URL("../src/lib/native-audio.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  vm.runInNewContext(nativeSource, { exports, Audio: Media, document: new EventTarget() });
  let loaded = 0;
  const sound = new exports.NativeAudio({ src: ["/private-bbc.mp3"], onload: () => loaded++ });
  sound.seek(7);
  sound.play();
  const media = sound._sounds[0]._node;
  assert.equal(media.plays, 1, "native play must run before any readiness event");
  assert.equal(loaded, 0);
  media.readyState = 1;
  media.duration = 84;
  media.dispatchEvent(new Event("loadedmetadata"));
  assert.equal(loaded, 1, "canplaythrough is not required for the duration");
  assert.equal(sound.duration(), 84);
  assert.equal(media.currentTime, 7);
  sound.unload();
});

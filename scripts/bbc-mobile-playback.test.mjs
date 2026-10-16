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
  let elapsed = 0;
  let timerId = 0;
  const timers = new Map();
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
    seek(value) { if (value != null) this.position = value; return this.position ?? 0; }
    rate(value) { if (value != null) this.playbackRate = value; return this.playbackRate; }
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
    window: {
      matchMedia: () => ({ matches: true }),
      setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, at: elapsed + delay }); return id; },
      clearTimeout(id) { timers.delete(id); },
    },
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
    function findProgress(node) {
      if (!node || typeof node !== "object") return null;
      if (node.type === "input" && node.props.type === "range") return node.props;
      for (const child of [node.props?.children].flat(Infinity)) {
        const found = findProgress(child);
        if (found) return found;
      }
      return null;
    }
    return { sound, changes, progress: findProgress(tree), play: findButton(tree, "播放"), pause: findButton(tree, "暂停"), unmount: () => cleanup.forEach((fn) => fn()) };
  }
  function advance(milliseconds) {
    elapsed += milliseconds;
    for (const [id, timer] of timers) {
      if (timer.at <= elapsed) { timers.delete(id); timer.callback(); }
    }
  }
  return { mount, advance };
}

test("a mobile sentence loop waits a full second before replaying the same audio", () => {
  const { mount, advance } = harness();
  let ended = 0;
  const player = mount({ settings: { playMode: "sentence-loop" }, sentenceLoopDelayMs: 1000, onEnded: () => ended++ });
  player.play(); player.sound.emit("play"); player.sound.emit("end");
  assert.equal(player.sound.plays, 1);
  advance(999);
  assert.equal(player.sound.plays, 1);
  advance(1);
  assert.equal(player.sound.plays, 2);
  assert.equal(ended, 0, "looping must not advance the sentence");
  player.unmount();
});

test("pausing in the one-second loop gap cancels the queued replay", () => {
  const { mount, advance } = harness();
  const player = mount({ compactControls: true, settings: { playMode: "sentence-loop" }, sentenceLoopDelayMs: 1000 });
  player.play(); player.sound.emit("play"); player.sound.emit("end");
  player.pause(); advance(1000);
  assert.equal(player.sound.plays, 1);
  assert.equal(player.changes.at(-1), false);
  player.unmount();
});

test("another player or an unmount cannot leave a stale sentence replay behind", () => {
  const { mount, advance } = harness();
  const first = mount({ settings: { playMode: "sentence-loop" }, sentenceLoopDelayMs: 1000 });
  first.play(); first.sound.emit("play"); first.sound.emit("end");
  const next = mount(); next.play(); advance(1000);
  assert.equal(first.sound.plays, 1);
  next.sound.emit("play"); next.unmount(); first.unmount();
  advance(1000);
  assert.equal(first.sound.plays, 1);
});

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
  let loaded = 0, paused = 0, ended = 0;
  const sound = new exports.NativeAudio({ src: ["/private-bbc.mp3"], onload: () => loaded++, onpause: () => paused++, onend: () => ended++ });
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
  media.ended = true;
  media.dispatchEvent(new Event("pause"));
  media.dispatchEvent(new Event("ended"));
  assert.equal(paused, 0, "natural completion must not cancel the loop playback request");
  assert.equal(ended, 1);
  media.ended = false;
  media.dispatchEvent(new Event("pause"));
  assert.equal(paused, 1, "explicit pause still stops playback");
  sound.unload();
  const nextSound = new exports.NativeAudio({ src: ["/next-sentence.mp3"], onload: () => {} }, media);
  nextSound.seek(0);
  nextSound.play();
  assert.equal(nextSound._sounds[0]._node, media, "changing sentences retains the gesture-unlocked element");
  assert.equal(media.src, "/next-sentence.mp3");
  assert.equal(media.currentTime, 0);
  media.dispatchEvent(new Event("loadedmetadata"));
  assert.equal(loaded, 1, "the previous sentence's event handlers were removed");
  assert.equal(media.plays, 2);
  nextSound.unload();
});

test("releasing or ending a touch drag uses the actual slider value and starts BBC playback", () => {
  const player = harness().mount({ playOnSeek: true });
  player.progress.onPointerDown();
  player.progress.onPointerUp({ currentTarget: { value: "23.7" } });
  assert.equal(player.sound.seek(), 23.7, "a stale React draft must not replace the final pointer position");
  assert.equal(player.sound.plays, 1);
  player.progress.onTouchEnd({ currentTarget: { value: "41.2" } });
  assert.equal(player.sound.seek(), 41.2);
  player.unmount();
});

test("seeking inside a sentence stays within its range without forcing playback for other players", () => {
  const player = harness().mount({ playbackRange: { startSeconds: 5, endSeconds: 12 } });
  player.progress.onPointerUp({ currentTarget: { value: "30" } });
  assert.equal(player.sound.seek(), 12);
  assert.equal(player.sound.plays, 0);
  player.unmount();
});

test("0.75 and 1.25 rates survive native media loads and metadata reloads", () => {
  class Media extends EventTarget {
    defaultPlaybackRate = 1;
    playbackRate = 1;
    readyState = 1;
    duration = 60;
    currentTime = 0;
    paused = true;
    load() { this.playbackRate = this.defaultPlaybackRate; }
    pause() { this.paused = true; }
    removeAttribute() {}
  }
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL("../src/lib/native-audio.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, Audio: Media, document: new EventTarget() });
  const sound = new exports.NativeAudio({ src: ["/bbc.mp3"], rate: 0.75 });
  const media = sound._sounds[0]._node;
  assert.equal(media.playbackRate, 0.75);
  sound.rate(1.25); sound.load(); media.dispatchEvent(new Event("loadedmetadata"));
  assert.equal(media.playbackRate, 1.25);
  assert.equal(media.defaultPlaybackRate, 1.25);
  sound.unload();
});

test("all mobile sentence training modes advance, repeat, and retain looping after Next", async () => {
  const { getNextSentenceNo, getSpeakingPracticeDelayMs } = await import("../src/lib/articles/bbc-speaking-training.mjs");
  const ast = ts.createSourceFile("article.tsx", fs.readFileSync(new URL("../src/components/bbc-article-detail-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const functions = [];
  const names = new Set(["playSentenceByMode", "handleSentenceEnded", "selectStudySentence", "startSpeakingPractice", "clearSpeakingPracticeTimers"]);
  function collect(node) {
    if (ts.isFunctionDeclaration(node) && names.has(node.name?.text)) functions.push(node.getText(ast));
    ts.forEachChild(node, collect);
  }
  collect(ast);
  assert.equal(functions.length, names.size);
  const code = ts.transpileModule(functions.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  for (const studyMode of ["intensive", "listening", "writing", "speaking"]) {
    const requests = [];
    const current = { current: 1 };
    const settings = { current: { playMode: "sequential", speakingMode: "imitation" } };
    const timers = new Map();
    let timerId = 0;
    const context = vm.createContext({
      studyMode, isMobileAudioViewport: true, isSentenceAudioPlaying: true,
      article: { fullAudioUrl: "/full.mp3", sentences: [1, 2, 3].map(sentenceNo => ({ sentenceNo })) },
      activeSentenceNoRef: current, audioSettingsRef: settings, getNextSentenceNo, getSpeakingPracticeDelayMs,
      speakingCountdownRef: { current: null }, speakingAdvanceRef: { current: null },
      window: { setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); }, setInterval() { return ++timerId; }, clearInterval() {} },
      setActiveSentenceNo() {}, setActiveSentencePosition() {}, setIsSentenceAudioPlaying() {}, setIsFullAudioPlaying() {},
      setSentenceRestoreSeekRequest() {}, centerSentenceCard() {}, setSpeakingTraining() {},
      requestSentenceAutoPlay: (sentenceNo) => requests.push(sentenceNo),
    });
    vm.runInContext(code, context);
    function end(sentenceNo) {
      context.handleSentenceEnded({ sentenceNo, startMs: 0, endMs: 2000 });
      const id = context.speakingAdvanceRef.current;
      if (id != null) { const callback = timers.get(id); timers.delete(id); callback(); }
    }
    end(1);
    assert.equal(current.current, 2, studyMode);
    assert.deepEqual(requests, [2]);
    settings.current.playMode = "sentence-loop";
    end(2);
    assert.deepEqual(requests, [2, 2]);
    context.selectStudySentence(3, true);
    assert.equal(settings.current.playMode, "sentence-loop");
    end(2);
    assert.deepEqual(requests, [2, 2, 3], "an old sentence completion cannot undo Next");
    end(3);
    assert.deepEqual(requests, [2, 2, 3, 3]);
    settings.current.playMode = "sequential";
    end(3);
    assert.deepEqual(requests, [2, 2, 3, 3], "the last sequential sentence stops");
  }
});

test("BBC's native media reapplies the selected rate when a mobile engine resets it during play", async () => {
  class Media extends EventTarget {
    defaultPlaybackRate = 1; playbackRate = 1; readyState = 1;
    duration = 60; currentTime = 0; paused = true;
    load() {} pause() { this.paused = true; } removeAttribute() {}
    play() { this.playbackRate = 1; this.paused = false; return Promise.resolve(); }
  }
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL("../src/lib/native-audio.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, Audio: Media, document: new EventTarget() });
  const sound = new exports.NativeAudio({ src: ["/bbc.mp3"], rate: 0.75 });
  const media = sound._sounds[0]._node;
  for (const rate of [0.75, 1.25]) {
    sound.rate(rate); sound.play(); await Promise.resolve();
    assert.equal(media.playbackRate, rate);
    media.playbackRate = 1; media.dispatchEvent(new Event("playing"));
    assert.equal(media.playbackRate, rate);
    media.playbackRate = 1; media.dispatchEvent(new Event("loadedmetadata"));
    assert.equal(media.playbackRate, rate);
  }
  sound.unload();
});

test("entering retelling stops existing playback without changing the selected listening mode", () => {
  const ast = ts.createSourceFile("article.tsx", fs.readFileSync(new URL("../src/components/bbc-article-detail-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function collect(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === "enterRetellingPractice") handler = node.getText(ast); ts.forEachChild(node, collect); }
  collect(ast); assert.ok(handler);
  for (const playMode of ["sequential", "sentence-loop"]) {
    const state = { settings: { playMode, speakingMode: "imitation" }, version: 0, requests: 0 };
    const context = vm.createContext({
      clearSpeakingPracticeTimers() { state.clearedTimers = true; }, updateAudioSettings(next) { Object.assign(state.settings, next); },
      setStudyMode(mode) { state.studyMode = mode; }, setSentenceAutoPlaySignals(signals) { state.signals = signals; }, setSentenceRestoreSeekRequest(value) { state.restore = value; },
      setActiveSentencePosition(value) { state.position = value; }, setIsSentenceAudioPlaying(value) { state.playing = value; }, setIsFullAudioPlaying(value) { state.fullPlaying = value; },
      setModeSelectionVersion(update) { state.version = update(state.version); }, setIsVocabularyVisible(value) { state.words = value; }, setIsRetellingPractice(value) { state.retelling = value; },
      requestSentenceAutoPlay() { state.requests++; },
    });
    vm.runInContext(ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
    context.enterRetellingPractice();
    assert.equal(state.requests, 0); assert.equal(state.playing, false); assert.equal(state.fullPlaying, false);
    assert.equal(state.version, 1); assert.equal(state.settings.playMode, playMode); assert.equal(state.settings.speakingMode, "none");
    assert.equal(state.studyMode, "speaking"); assert.equal(state.retelling, true); assert.equal(Object.keys(state.signals).length, 0);
  }
});

test("mobile BBC study-mode buttons render below the article title, outside the sticky audio panel", () => {
  const article = fs.readFileSync(new URL("../src/components/bbc-article-detail-page.tsx", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const hero = article.indexOf('className="page-heading bbc-article-hero"');
  const modes = article.indexOf('className="bbc-mobile-mode-controls"');
  const annotationTools = article.indexOf("<StudyAnnotationTools", modes);
  const study = article.indexOf('<div className="bbc-article-study"', modes);
  const audioPanel = article.indexOf('<section className="bbc-full-audio-panel"', study);
  const ast = ts.createSourceFile("article.tsx", article, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let phoneLayoutFunction;
  function collect(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "shouldUsePhoneAudioLayout") phoneLayoutFunction = node.getText(ast);
    ts.forEachChild(node, collect);
  }
  collect(ast);

  assert.ok(hero >= 0 && hero < modes && modes < annotationTools && annotationTools < study && study < audioPanel);
  assert.ok(article.slice(modes, annotationTools).includes("{articleModeControls}"));
  assert.ok(!article.slice(audioPanel).includes('className="bbc-mobile-mode-controls"'));
  assert.ok(css.includes('.bbc-article-page[data-mobile-audio-viewport="true"] .bbc-desktop-audio-toolbar { display: none !important; }'));

  const code = ts.transpileModule(phoneLayoutFunction, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const [userAgent, maxTouchPoints, narrow, expected] of [
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5, false, true],
    ["Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Mobile/22A3354 Safari/604.1", 5, true, false],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605.1.15", 5, true, false],
    ["Mozilla/5.0 (Linux; Android 14; Pixel Tablet)", 5, true, false],
    ["Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 Mobile Safari/537.36", 5, false, true],
  ]) {
    const context = vm.createContext({ navigator: { userAgent, maxTouchPoints }, window: { matchMedia: () => ({ matches: narrow }) } });
    vm.runInContext(code, context);
    assert.equal(context.shouldUsePhoneAudioLayout(), expected, userAgent);
  }
});

test("retelling listening choices preserve a paused state until the user presses Play", () => {
  const ast = ts.createSourceFile("article.tsx", fs.readFileSync(new URL("../src/components/bbc-article-detail-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function collect(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === "updateAudioSettings") handler = node.getText(ast); ts.forEachChild(node, collect); }
  collect(ast); assert.ok(handler);
  for (const [retelling, playing, expected] of [[true, false, 0], [true, true, 1], [false, false, 1]]) {
    let plays = 0;
    const context = vm.createContext({
      audioSettingsRef: { current: {} }, studyMode: "speaking", isRetellingPractice: retelling, isSentenceAudioPlaying: playing,
      setAudioSettings() {}, clearSpeakingPracticeTimers() {}, currentStudySentenceNo: () => 2,
      requestSentenceAutoPlay() { plays++; }, setOriginalDisplayMode() {},
    });
    vm.runInContext(ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
    context.updateAudioSettings({ playMode: "sentence-loop" });
    assert.equal(plays, expected); assert.equal(context.audioSettingsRef.current.playMode, "sentence-loop");
  }
});

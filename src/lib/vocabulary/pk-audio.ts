import { getVocabularyAudioUrl } from "@/lib/vocabulary/pronunciation-audio";

export function createVocabularyPkAudio() {
  const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const context = Constructor ? new Constructor() : null;
  let source: AudioBufferSourceNode | null = null;
  let request: AbortController | null = null;
  let generation = 0;
  let speaking = false;
  const notes = new Set<OscillatorNode>();

  const stopWord = () => {
    generation += 1;
    request?.abort();
    request = null;
    if (source) { try { source.stop(); } catch { /* Already ended. */ } }
    source = null;
    if (speaking) window.speechSynthesis?.cancel();
    speaking = false;
  };

  return {
    get ready() { return context?.state === "running"; },
    async unlock() {
      if (!context) return false;
      try { await context.resume(); } catch { return false; }
      return context.state === "running";
    },
    stopWord,
    async pronounce(word: string) {
      stopWord();
      if (!context || context.state !== "running") return;
      const token = generation;
      const controller = new AbortController();
      request = controller;
      const timeout = window.setTimeout(() => controller.abort(), 4500);
      try {
        const response = await fetch(getVocabularyAudioUrl(word, "uk"), { signal: controller.signal });
        if (!response.ok) throw new Error("Word audio unavailable");
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        if (generation !== token || context.state !== "running") return;
        const node = context.createBufferSource();
        node.buffer = buffer;
        node.connect(context.destination);
        node.onended = () => { node.disconnect(); if (source === node) source = null; };
        source = node;
        node.start();
      } catch {
        if (generation === token && "speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(word);
          utterance.lang = "en-GB";
          utterance.rate = .88;
          speaking = true;
          utterance.onend = () => { speaking = false; };
          window.speechSynthesis.speak(utterance);
        }
      } finally { window.clearTimeout(timeout); }
    },
    feedback(correct: boolean) {
      if (!context || context.state !== "running") return;
      stopWord();
      const frequencies = correct ? [523.25, 659.25, 783.99, 1046.5] : [220, 146.83];
      const duration = correct ? .12 : .18;
      frequencies.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + index * duration;
        oscillator.type = correct ? "sine" : "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(.1, start + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
        oscillator.connect(gain); gain.connect(context.destination); notes.add(oscillator);
        oscillator.onended = () => { notes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(start); oscillator.stop(start + duration);
      });
    },
    stop() {
      stopWord();
      for (const note of notes) { try { note.stop(); } catch { /* Already ended. */ } }
    },
    close() {
      this.stop();
      void context?.close().catch(() => undefined);
    },
  };
}

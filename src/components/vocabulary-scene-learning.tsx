"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { getVocabularyAudioUrl } from "@/lib/vocabulary/pronunciation-audio";
import { SCENE_MODES, isSceneSpellingCorrect, normalizeSceneSettings, sceneFieldVisible, shuffleSceneWordIds, type SceneMode, type SceneRect, type SceneSettings, type SceneSummary, type SceneWord, type VocabularyScene } from "@/lib/vocabulary/scene-learning";
import styles from "./vocabulary-scene-learning.module.css";

const labels: Record<SceneMode, string> = { reading: "阅读", listening: "听力", speaking: "口语", writing: "写作" };
const position = (r: SceneRect): CSSProperties => ({ left: r[0]*100+"%", top: r[1]*100+"%", width: r[2]*100+"%", height: r[3]*100+"%" });
type Phase = "browse" | "playing" | "question" | "revealed" | "complete";

export function VocabularySceneLearning({ scenes, initialScene, initialSettings }: { scenes: SceneSummary[]; initialScene: string; initialSettings?: Partial<SceneSettings> | null }) {
  const [sceneId, setSceneId] = useState(initialScene);
  const [scene, setScene] = useState<VocabularyScene | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageReady, setImageReady] = useState(false);
  const [settings, setSettings] = useState(() => normalizeSceneSettings(initialSettings));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("browse");
  const [order, setOrder] = useState<string[]>([]);
  const [cursor, setCursor] = useState({ word: 0, mode: 0, run: 0 });
  const [deadline, setDeadline] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [fields, setFields] = useState({ en: true, ipa: true, zh: true });
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(false);
  const poster = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioAbort = useRef<(() => void) | null>(null);
  const runToken = useRef(0);
  const expiry = useRef<() => void>(() => {});
  const answered = useRef(false);
  const autoStart = useRef(Boolean(initialSettings));
  const mode = settings.modes[cursor.mode] ?? settings.modes[0];
  const target = scene?.words.find(word => word.id === order[cursor.word]);

  const stopAudio = useCallback(() => {
    audio.current?.pause(); audio.current = null;
    audioAbort.current?.(); audioAbort.current = null;
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }, []);

  const playWord = useCallback((word: SceneWord): Promise<boolean> => {
    stopAudio();
    return new Promise(resolve => {
      let done = false, fallback = false;
      let safety = 0;
      const finish = (ok: boolean) => { if (done) return; done = true; window.clearTimeout(safety); audioAbort.current = null; resolve(ok); };
      audioAbort.current = () => finish(false);
      const synthesize = () => {
        if (done || fallback) return;
        fallback = true; audio.current?.pause(); window.clearTimeout(safety);
        if (!("speechSynthesis" in window)) { finish(false); return; }
        const utterance = new SpeechSynthesisUtterance(word.audioWord);
        utterance.lang = settings.voice === "uk" ? "en-GB" : "en-US";
        utterance.voice = speechSynthesis.getVoices().find(voice => voice.lang === utterance.lang) ?? null;
        utterance.rate = .85; utterance.onend = () => finish(true); utterance.onerror = () => finish(false);
        safety = window.setTimeout(() => finish(false), 12000);
        speechSynthesis.speak(utterance);
      };
      const player = new Audio(getVocabularyAudioUrl(word.audioWord, settings.voice));
      audio.current = player;
      player.onended = () => finish(true); player.onerror = synthesize;
      player.onplaying = () => { window.clearTimeout(safety); safety = window.setTimeout(() => finish(false), 15000); };
      safety = window.setTimeout(synthesize, 5000);
      void player.play().catch(synthesize);
    });
  }, [settings.voice, stopAudio]);

  const pause = useCallback(() => {
    runToken.current++; stopAudio(); setRunning(false); setDeadline(null);
  }, [stopAudio]);

  const loadScene = useCallback(async (id: string, signal?: AbortSignal) => {
    pause(); setScene(null); setImageReady(false); setImageUrl(""); setError(""); setPhase("browse"); setOverrides({});
    try {
      const response = await fetch("/api/vocabulary-scenes/" + encodeURIComponent(id), { signal, cache: "no-store" });
      if (response.status === 403) { window.location.assign("/vocabulary/scene-images"); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "场景加载失败");
      setScene(result.scene); setImageUrl(result.imageUrl); setOrder(shuffleSceneWordIds(result.scene.words)); setCursor({ word: 0, mode: 0, run: 0 });
    } catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "场景加载失败，请重试"); }
  }, [pause]);

  useEffect(() => { const controller = new AbortController(); void loadScene(sceneId, controller.signal); return () => controller.abort(); }, [sceneId, loadScene]);
  useEffect(() => () => { runToken.current++; stopAudio(); }, [stopAudio]);
  useEffect(() => {
    try { if (!initialSettings) setSettings(normalizeSceneSettings(JSON.parse(localStorage.getItem("vocabulary-scene-settings-v1") || "null"))); } catch { /* Ignore invalid saved settings. */ }
  }, [initialSettings]);

  useEffect(() => {
    if (!running || !imageReady || !target) return;
    const token = ++runToken.current;
    answered.current = false;
    setDeadline(null); setFeedback(""); setWrongId(null); setAnswer(""); setOverrides({});
    const ask = () => { if (runToken.current === token) { setError(""); setPhase("question"); setSeconds(settings.reactionSeconds[mode]); setDeadline(Date.now() + settings.reactionSeconds[mode]*1000); } };
    if (mode === "listening") {
      setPhase("playing");
      void playWord(target).then(ok => { if (runToken.current !== token) return; if (ok) ask(); else { pause(); setError("音频未能播放，请检查声音后重试。"); } });
    } else ask();
    return () => { runToken.current++; stopAudio(); };
  // A new cursor starts one question; editing the seconds applies to the next question.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, imageReady, sceneId, cursor.word, cursor.mode, cursor.run]);

  const tone = (correct: boolean) => {
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.connect(gain); gain.connect(context.destination); gain.gain.value = .06;
      oscillator.frequency.setValueAtTime(correct ? 660 : 180, context.currentTime);
      oscillator.frequency.setValueAtTime(correct ? 880 : 120, context.currentTime + .1);
      oscillator.start(); oscillator.stop(context.currentTime + .22);
      oscillator.onended = () => { void context.close(); };
    } catch { /* Visual feedback remains available if device sound is disabled. */ }
  };

  const reveal = (result: "correct" | "wrong" | "timeout" | "speaking") => {
    if (!target || answered.current) return;
    answered.current = true;
    setPhase("revealed"); setDeadline(null);
    setFeedback(result === "correct" ? "回答正确" : result === "wrong" ? "再记一次，正确词框已标绿" : result === "timeout" ? "时间到，看看正确词汇" : "跟读并核对发音");
    if (result !== "speaking") tone(result === "correct");
    const token = runToken.current;
    const wait = () => { if (runToken.current === token) { setSeconds(settings.detailSeconds[mode]); setDeadline(Date.now()+settings.detailSeconds[mode]*1000); } };
    if (result === "speaking") void playWord(target).then(wait); else wait();
  };
  const next = () => {
    stopAudio(); setDeadline(null);
    if (cursor.word + 1 < order.length) setCursor(current => ({ ...current, word: current.word+1 }));
    else if (cursor.mode+1 < settings.modes.length) { setOrder(shuffleSceneWordIds(scene?.words ?? [])); setCursor(current => ({ ...current, word: 0, mode: current.mode+1 })); }
    else { setRunning(false); setPhase("complete"); setFeedback("本场景练习完成"); }
  };
  expiry.current = () => { if (phase === "question") reveal(mode === "speaking" ? "speaking" : "timeout"); else if (phase === "revealed") next(); };
  useEffect(() => {
    if (!running || deadline === null) return;
    const tick = window.setInterval(() => { const remaining = Math.max(0, Math.ceil((deadline-Date.now())/1000)); setSeconds(remaining); if (!remaining) { window.clearInterval(tick); expiry.current(); } }, 100);
    return () => window.clearInterval(tick);
  }, [deadline, running]);

  useEffect(() => {
    const element = poster.current; if (!element || !scene) return;
    const fit = () => {
      const scale = element.clientWidth / 1088; element.style.setProperty("--s", String(scale));
      const title = element.querySelector<HTMLElement>("[data-scene-title]");
      if (title) for (const line of title.querySelectorAll<HTMLElement>("strong")) {
        line.style.setProperty("--title-fit", "1");
        line.style.setProperty("--title-fit", String(Math.min(1, title.clientWidth/Math.max(1,line.scrollWidth))));
      }
      for (const card of element.querySelectorAll<HTMLElement>("[data-card]")) {
        card.style.setProperty("--fit", "1");
        for (const field of card.querySelectorAll<HTMLElement>("span[data-field]")) {
          field.style.setProperty("--field-fit", "1");
          field.style.setProperty("--field-fit", String(Math.min(1, (card.clientWidth-10*scale)/Math.max(1, field.scrollWidth))));
        }
        const height = [...card.querySelectorAll<HTMLElement>("span[data-field]")].reduce((sum, item) => sum+item.getBoundingClientRect().height,0);
        card.style.setProperty("--fit", String(Math.min(1,(card.clientHeight-10*scale)/Math.max(1,height))));
      }
      for (const row of element.querySelectorAll<HTMLElement>("[data-row]")) {
        row.style.setProperty("--fit", "1");
        const width = [...row.children].reduce((sum, field) => sum+field.getBoundingClientRect().width,0)+10*scale;
        row.style.setProperty("--fit", String(Math.min(1,(row.clientWidth-2)/Math.max(1,width))));
      }
    };
    const observer = new ResizeObserver(fit); observer.observe(element); void document.fonts.ready.then(fit); fit(); return () => observer.disconnect();
  }, [scene]);

  const start = (selected?: SceneMode) => {
    pause(); setError("");
    if (selected) setSettings(current => ({ ...current, modes: [selected] }));
    setOrder(shuffleSceneWordIds(scene?.words ?? [])); setCursor({ word: 0, mode: 0, run: cursor.run+1 }); setRunning(true);
  };
  const chooseWord = (id: string) => {
    if (phase === "browse") { setOverrides(current => ({ ...current, [id]: !(current[id] ?? (fields.en && fields.ipa && fields.zh)) })); return; }
    if (answered.current) return;
    if (!running || phase !== "question" || (mode !== "reading" && mode !== "listening") || !target) return;
    setWrongId(id === target.id ? null : id); reveal(id === target.id ? "correct" : "wrong");
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (running && phase === "question" && target) reveal(isSceneSpellingCorrect(answer,target) ? "correct" : "wrong"); };
  const browse = () => { pause(); setPhase("browse"); setFeedback(""); setOverrides({}); };
  const fieldVisible = (scope: "scene" | "list", word: SceneWord, field: "en" | "ipa" | "zh") => phase === "browse"
    ? scope === "scene" && word.id in overrides ? overrides[word.id] : fields[field]
    : sceneFieldVisible(mode, phase === "revealed", scope, word.id === target?.id, field);
  const renderFields = (word: SceneWord, scope: "scene" | "list") => ([['en',word.english],['ipa',word.ipa],['zh',word.pos+' '+word.definition]] as const).map(([field,text]) => <span className={styles[field]} data-field={field} key={field} style={{ visibility: fieldVisible(scope,word,field) ? "visible" : "hidden" }}>{text}</span>);
  const activeIndex = scenes.findIndex(item => item.id === sceneId);

  return <section className={styles.page} aria-label="场景图片词汇学习">
    <header className={styles.header}><a href={"/vocabulary/books?setup=1&level="+encodeURIComponent(sceneId.startsWith("senior-") ? "高中大纲词汇" : "初中")}>返回背单词</a><h1>场景图片词汇学习</h1><p>初中80组 · 高中155组</p></header>
    <div className={styles.toolbar}>
      <label>场景 <select aria-label="选择词汇场景" value={sceneId} onChange={event => setSceneId(event.target.value)}>{scenes.map(item => <option key={item.id} value={item.id}>{item.level === "middle" ? "初中" : "高中"} · {item.title}（{item.wordCount}词）</option>)}</select></label>
      <button onClick={browse} type="button" aria-pressed={phase === "browse"}>浏览</button>
      {SCENE_MODES.map(item => <button key={item} disabled={!imageReady} onClick={() => start(item)} type="button" aria-pressed={phase !== "browse" && mode === item}>{labels[item]}</button>)}
      <button onClick={() => { pause(); setSettingsOpen(!settingsOpen); }} type="button">设置</button>
      <button onClick={() => setZoom(!zoom)} type="button">{zoom ? "适应屏幕" : "放大图片"}</button>
    </div>
    {settingsOpen && <div className={styles.settings}><h2>反应时间 / 详情停留时间</h2><p>单位：秒。口语使用口语自己的反应时间。</p>
      {SCENE_MODES.map(item => <div className={styles.timing} key={item}><label><input type="checkbox" disabled={settings.modes.length===1 && settings.modes.includes(item)} checked={settings.modes.includes(item)} onChange={event => setSettings(current => normalizeSceneSettings({ ...current,modes:event.target.checked ? [...current.modes,item] : current.modes.filter(value => value!==item) }))}/>{labels[item]}</label>
        {(["reactionSeconds","detailSeconds"] as const).map(key => <label key={key}><span>{key === "reactionSeconds" ? "反应" : "停留"}</span><input aria-label={labels[item]+(key === "reactionSeconds" ? "反应秒数" : "停留秒数")} type="number" min="1" max="120" value={settings[key][item]} onChange={event => setSettings(current => normalizeSceneSettings({ ...current,[key]:{...current[key],[item]:Number(event.target.value)} }))}/></label>)}</div>)}
      <label>发音 <select value={settings.voice} onChange={event => setSettings(current => ({ ...current,voice:event.target.value === "uk" ? "uk" : "us" }))}><option value="us">美音</option><option value="uk">英音</option></select></label>
      <button type="button" onClick={() => { localStorage.setItem("vocabulary-scene-settings-v1",JSON.stringify(settings));setSettingsOpen(false);start(); }}>保存并开始</button>
    </div>}
    <div className={styles.status} aria-live="polite">{error || feedback || (phase === "browse" ? "点击词框可显示或隐藏该词；点击下方词条可播放发音。" : phase === "playing" ? "正在播放，请听词音" : phase === "question" ? mode === "speaking" ? "看中文说英文" : mode === "writing" ? "看高亮中文，写英文" : "点击图片中对应的词框" : "")}{running && deadline !== null ? ` · ${seconds}秒` : ""}{running ? ` · ${cursor.word+1}/${order.length}词 · ${labels[mode]}` : ""}</div>
    {phase === "browse" && <div className={styles.toolbar}>{([['en','英文'],['ipa','音标'],['zh','中文']] as const).map(([key,label]) => <label key={key}><input type="checkbox" checked={fields[key]} onChange={event => { setFields(current => ({...current,[key]:event.target.checked}));setOverrides({}); }}/>{label}</label>)}<button type="button" onClick={() => {setFields({en:false,ipa:false,zh:false});setOverrides({});}}>隐藏词汇</button><button type="button" onClick={() => {setFields({en:true,ipa:true,zh:true});setOverrides({});}}>显示全部</button></div>}
    {phase !== "browse" && scene && <div className={styles.toolbar}><button type="button" onClick={() => running ? pause() : setRunning(true)}>{running ? "暂停" : "继续"}</button><button type="button" disabled={!target} onClick={() => target && void playWord(target)}>播放词音</button><button type="button" onClick={next}>下一词</button>{phase === "complete" && <button type="button" onClick={() => setSceneId(scenes[(activeIndex+1)%scenes.length].id)}>下一场景</button>}</div>}
    {phase !== "browse" && mode === "writing" && <form className={styles.spelling} onSubmit={submit}><label>英文拼写 <input aria-label="看中文写英文" autoComplete="off" autoCapitalize="none" spellCheck={false} value={answer} onChange={event => setAnswer(event.target.value)} disabled={!running || phase !== "question"}/></label><button type="submit" disabled={!running || phase !== "question"}>提交</button></form>}
    {!scene && !error && <p>正在加载场景…</p>}{error && <button type="button" onClick={() => void loadScene(sceneId)}>重新加载</button>}
    {scene && <div className={styles.viewport}><div className={styles.poster} ref={poster} onContextMenu={event => event.preventDefault()} style={{ width:zoom ? "200%" : "100%" }}>
      {/* A plain image loads the private object directly; Next image optimization must not proxy it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.image} src={imageUrl} alt={scene.title+"场景插画"} width={scene.imageWidth} height={scene.imageHeight} draggable={false} referrerPolicy="no-referrer" onLoad={() => { setImageReady(true);if(autoStart.current){autoStart.current=false;setRunning(true);} }} onError={() => { pause();setError("图片加载失败，请重新加载。"); }}/>
      {!scene.bakedTitle && <div data-scene-title className={styles.title} style={position(scene.titleRect)}><strong>{scene.titleEnglish}</strong><strong>{scene.titleChinese}</strong></div>}
      <div className={styles.footer} style={position(scene.footerRect)}>{[1,2,3].map(column => <i key={column} style={{left:column*25+"%",top:0,width:"1px",height:"100%"}}/>)}{[0,1,2,3].flatMap(column => Array.from({length:(scene.columnCounts?.[column] ?? scene.footerRows)-1},(_,row) => <i key={column+"-"+row} style={{left:column*25+"%",top:(row+1)/(scene.columnCounts?.[column] ?? scene.footerRows)*100+"%",width:"25%",height:"1px"}}/>))}</div>
      {scene.words.map((word,index) => <div key={word.id}>
        {word.leaderPoints && <svg className={styles.leader} viewBox="0 0 1000 1000" preserveAspectRatio="none"><line x1={word.leaderPoints[0][0]*1000} y1={word.leaderPoints[0][1]*1000} x2={word.leaderPoints[1][0]*1000} y2={word.leaderPoints[1][1]*1000}/></svg>}
        <button type="button" className={styles.hit} style={position(word.illustrationRect)} aria-label={`选择第${index+1}个词汇区域`} onClick={() => chooseWord(word.id)}/>
        <button type="button" data-card data-word-id={word.id} className={`${styles.card} ${word.opaqueFrame ? styles.opaque : ""} ${phase === "revealed" && word.id === target?.id ? styles.correct : ""} ${wrongId === word.id ? styles.wrong : ""}`} style={position(word.cardRect)} aria-label={`第${index+1}个词框`} onClick={() => chooseWord(word.id)}>{renderFields(word,"scene")}</button>
        <button type="button" data-row data-word-id={word.id} className={`${styles.glossary} ${(mode === "reading" || mode === "writing") && phase === "question" && word.id === target?.id ? styles.prompt : ""} ${phase === "revealed" && word.id === target?.id ? styles.correct : ""}`} style={position(word.glossaryRect)} aria-label={phase === "browse" ? "播放词音" : "词汇提示"} onClick={() => { if (phase === "browse" || phase === "revealed") void playWord(word); }}>{renderFields(word,"list")}</button>
      </div>)}
    </div></div>}
  </section>;
}

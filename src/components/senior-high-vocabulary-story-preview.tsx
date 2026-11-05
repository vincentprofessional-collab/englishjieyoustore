"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { playVocabularyPronunciation, type VocabularyAccent } from "@/lib/vocabulary/pronunciation-audio";
import styles from "./senior-high-vocabulary-story.module.css";

type StoryWord = {
  order: number;
  word: string;
  partOfSpeech: string;
  meaning: string;
  uk: string;
  us: string;
};

type ImageWordLabel = {
  word: string;
  x: number;
  y: number;
};

const scenes: Array<{
  title: string;
  image: string;
  alt: string;
  story: ReactNode;
  imageLabels: ImageWordLabel[];
  words: StoryWord[];
}> = [
  {
    title: "清晨的交换旅行",
    image: "/vocabulary-stories/senior-high-group-01/01-dawn-classroom.png",
    alt: "清晨的教室里，学生看见空座位，桌上放着地图、行李和苹果",
    story: <>At 6 <Target>a.m.（上午）</Target>, Lin arrived at school and found his friend <Target>absent（缺席的）</Target>. Her <Target>absence（缺席）</Target> was explained by a note: she had gone <Target>abroad（到国外）</Target> on an exchange trip. He wrote “a map” and “an apple” on his packing list, remembering <Target>a/an（不定冠词）</Target> from English class.</>,
    imageLabels: [
      { word: "a.m.", x: 61, y: 17 },
      { word: "absent", x: 43, y: 54 },
      { word: "absence", x: 57, y: 59 },
      { word: "abroad", x: 25, y: 72 },
      { word: "a/an", x: 76, y: 86 },
    ],
    words: [
      { order: 1, word: "abroad", partOfSpeech: "adv.", meaning: "在国外；到国外", uk: "əˈbrɔːd", us: "əˈbrɑːd" },
      { order: 2, word: "a.m.", partOfSpeech: "abbr.", meaning: "上午", uk: "ˌeɪ ˈem", us: "ˌeɪ ˈem" },
      { order: 3, word: "absence", partOfSpeech: "n.", meaning: "缺席；不存在", uk: "ˈæbsəns", us: "ˈæbsəns" },
      { order: 4, word: "a/an", partOfSpeech: "det.", meaning: "一个（不定冠词）", uk: "ə / ən", us: "ə / ən" },
      { order: 5, word: "absent", partOfSpeech: "adj.", meaning: "缺席的；不在的", uk: "ˈæbsənt", us: "ˈæbsənt" },
    ],
  },
  {
    title: "没有放弃的科学计划",
    image: "/vocabulary-stories/senior-high-group-01/02-project-study.png",
    alt: "交换生和伙伴一起完成科学小实验与学习项目",
    story: <>On the exchange, Lin wanted to <Target>abandon（放弃）</Target> his science project. His host sister was <Target>absolutely（完全地）</Target> sure of his <Target>ability（能力）</Target>. She showed him how plants <Target>absorb（吸收）</Target> water and told him he was <Target>able（能够）</Target> to finish the project, too.</>,
    imageLabels: [
      { word: "abandon", x: 28, y: 25 },
      { word: "absolutely", x: 80, y: 13 },
      { word: "absorb", x: 19, y: 38 },
      { word: "able", x: 81, y: 63 },
    ],
    words: [
      { order: 6, word: "abandon", partOfSpeech: "v.", meaning: "放弃；抛弃", uk: "əˈbændən", us: "əˈbændən" },
      { order: 7, word: "absolutely", partOfSpeech: "adv.", meaning: "绝对地；完全地", uk: "ˈæbsəluːtli", us: "ˈæbsəluːtli" },
      { order: 8, word: "ability", partOfSpeech: "n.", meaning: "能力；才能", uk: "əˈbɪləti", us: "əˈbɪləti" },
      { order: 9, word: "absorb", partOfSpeech: "v.", meaning: "吸收；理解", uk: "əbˈzɔːb", us: "əbˈzɔːrb" },
      { order: 10, word: "able", partOfSpeech: "adj.", meaning: "能够；有能力的", uk: "ˈeɪbl", us: "ˈeɪbl" },
    ],
  },
  {
    title: "火车上的自然读物",
    image: "/vocabulary-stories/senior-high-group-01/03-train-and-nature.png",
    alt: "两位学生在火车上阅读自然文章，窗外有河流和野生动物救护员",
    story: <><Target>Aboard（在……上）</Target> the train, Lin read an <Target>academic（学术的）</Target> article about the <Target>abuse（虐待）</Target> of wild animals. Its <Target>abstract（抽象的）</Target> diagram showed an <Target>abnormal（反常的）</Target> pattern of pollution near a protected river.</>,
    imageLabels: [
      { word: "aboard", x: 13, y: 43 },
      { word: "abnormal", x: 26, y: 35 },
      { word: "academic", x: 46, y: 84 },
      { word: "abstract", x: 74, y: 84 },
    ],
    words: [
      { order: 11, word: "abstract", partOfSpeech: "adj.", meaning: "抽象的", uk: "ˈæbstrækt", us: "ˈæbstrækt" },
      { order: 12, word: "abnormal", partOfSpeech: "adj.", meaning: "反常的；不正常的", uk: "æbˈnɔːməl", us: "æbˈnɔːrməl" },
      { order: 13, word: "abuse", partOfSpeech: "n.", meaning: "虐待；滥用", uk: "əˈbjuːs", us: "əˈbjuːs" },
      { order: 14, word: "aboard", partOfSpeech: "prep./adv.", meaning: "在（船、飞机、火车）上", uk: "əˈbɔːd", us: "əˈbɔːrd" },
      { order: 15, word: "academic", partOfSpeech: "adj.", meaning: "学术的", uk: "ˌækəˈdemɪk", us: "ˌækəˈdemɪk" },
    ],
  },
  {
    title: "校园播客欢迎新同学",
    image: "/vocabulary-stories/senior-high-group-01/04-school-podcast.png",
    alt: "校园播客录音室里，学生在悬挂的麦克风前欢迎新同学",
    story: <>Back at school, Lin made a podcast <Target>about（关于）</Target> <Target>accents（口音）</Target>. The club agreed to <Target>accept（接纳）</Target> a new classmate and gave her <Target>access（使用机会）</Target> to the recording room; a microphone hung <Target>above（在……上方）</Target> the desk.</>,
    imageLabels: [
      { word: "about", x: 26, y: 24 },
      { word: "accent", x: 30, y: 34 },
      { word: "above", x: 52, y: 42 },
      { word: "accept", x: 82, y: 22 },
      { word: "access", x: 83, y: 37 },
    ],
    words: [
      { order: 16, word: "about", partOfSpeech: "prep.", meaning: "关于；对于", uk: "əˈbaʊt", us: "əˈbaʊt" },
      { order: 17, word: "accent", partOfSpeech: "n.", meaning: "口音；腔调", uk: "ˈæksent", us: "ˈæksent" },
      { order: 18, word: "above", partOfSpeech: "prep./adv.", meaning: "在……上方；高于", uk: "əˈbʌv", us: "əˈbʌv" },
      { order: 19, word: "accept", partOfSpeech: "v.", meaning: "接受；接纳", uk: "əkˈsept", us: "əkˈsept" },
      { order: 20, word: "access", partOfSpeech: "n.", meaning: "使用权；进入机会", uk: "ˈækses", us: "ˈækses" },
    ],
  },
];

function Target({ children }: { children: ReactNode }) {
  return <strong className={styles.target}>{children}</strong>;
}

function playWord(word: string, accent: VocabularyAccent) {
  playVocabularyPronunciation({ accent, word });
}

export function SeniorHighVocabularyStoryPreview() {
  return (
    <section aria-labelledby="senior-high-story-title" className={styles.preview}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>普通高中英语课标词汇 · 第 1 组</span>
          <h2 id="senior-high-story-title">从清晨教室到校园播客</h2>
          <p className={styles.intro}>按词表序号 1–20 分成四幅故事图，每幅五个词。</p>
        </div>
      </header>

      <div className={styles.sceneGrid}>
        {scenes.map((scene, sceneIndex) => (
          <article className={styles.scene} key={scene.image}>
            <div className={styles.imageFrame} onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}>
              <Image alt={scene.alt} draggable={false} fill sizes="(max-width: 760px) 100vw, 48vw" src={scene.image.replace("/vocabulary-stories/", "/api/vocabulary-scene-images/")} unoptimized />
              <div aria-label={`${scene.title}图片中的词汇标注`} className={styles.imageWordLabels}>
                {scene.imageLabels.map((label) => (
                  <span className={styles.imageWordLabel} key={label.word} style={{ left: `${label.x}%`, top: `${label.y}%` }}>{label.word}</span>
                ))}
              </div>
            </div>
            <div className={styles.sceneBody}>
              <h3><span>{String(sceneIndex + 1).padStart(2, "0")}</span>{scene.title}</h3>
              <p className={styles.sceneStory}>{scene.story}</p>
              <ul aria-label={`${scene.title}词汇卡`} className={styles.wordGrid}>
                {scene.words.map((item) => (
                  <li className={styles.wordCard} key={item.word}>
                    <div className={styles.wordHeading}>
                      <span className={styles.wordOrder}>{item.order}</span>
                      <strong>{item.word}</strong>
                      <small>{item.partOfSpeech}</small>
                    </div>
                    <p className={styles.meaning}>{item.meaning}</p>
                    <div className={styles.pronunciationRow}>
                      <span className={styles.accentLabel}>英</span>
                      <span className={styles.ipa}>/{item.uk}/</span>
                      <button aria-label={`播放 ${item.word} 的英式发音`} className={styles.playButton} onClick={() => playWord(item.word, "uk")} type="button">播放</button>
                    </div>
                    <div className={styles.pronunciationRow}>
                      <span className={styles.accentLabel}>美</span>
                      <span className={styles.ipa}>/{item.us}/</span>
                      <button aria-label={`播放 ${item.word} 的美式发音`} className={styles.playButton} onClick={() => playWord(item.word, "us")} type="button">播放</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

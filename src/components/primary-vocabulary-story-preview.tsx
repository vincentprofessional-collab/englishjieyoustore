"use client";

import Image from "next/image";
import { useState } from "react";

import { type VocabularySortMode } from "@/lib/vocabulary/study-groups";
import { playVocabularyPronunciation, type VocabularyAccent } from "@/lib/vocabulary/pronunciation-audio";
import { PrimaryVocabularySceneStoryPreview } from "./primary-vocabulary-scene-story-preview";
import styles from "./primary-vocabulary-story.module.css";

type StoryIllustration = {
  alt: string;
  caption: string;
  callouts?: VocabularyCallout[];
  wordCards?: VocabularyCard[];
  src: string;
};

type VocabularyCard = {
  meaning: string;
  phonetic: string;
  word: string;
};

type VocabularyCallout = {
  anchorX: number;
  anchorY: number;
  labelX: number;
  labelY: number;
  word: string;
};

type StoryGroup = "first" | "secondLast" | "last";

const firstVocabulary: VocabularyCard[] = [
  { word: "the", phonetic: "[ðə]", meaning: "这；那" },
  { word: "a / an", phonetic: "[ə] / [æn]", meaning: "一个；一盏" },
  { word: "to", phonetic: "[tuː]", meaning: "到；给" },
  { word: "be", phonetic: "[biː]", meaning: "是；成为" },
  { word: "of", phonetic: "[əv]", meaning: "……的" },
  { word: "in", phonetic: "[ɪn]", meaning: "在……里" },
  { word: "and", phonetic: "[ænd]", meaning: "和；并且" },
  { word: "have", phonetic: "[hæv]", meaning: "有" },
  { word: "do", phonetic: "[duː]", meaning: "做" },
  { word: "for", phonetic: "[fɔːr]", meaning: "给；为了" },
  { word: "that", phonetic: "[ðæt]", meaning: "那个；那" },
  { word: "it", phonetic: "[ɪt]", meaning: "它" },
  { word: "on", phonetic: "[ɑːn]", meaning: "在……上" },
  { word: "can", phonetic: "[kæn]", meaning: "能；会" },
  { word: "with", phonetic: "[wɪð]", meaning: "和；用" },
  { word: "what", phonetic: "[wʌt]", meaning: "什么" },
  { word: "I", phonetic: "[aɪ]", meaning: "我" },
  { word: "you", phonetic: "[juː]", meaning: "你；你们" },
  { word: "at", phonetic: "[æt]", meaning: "在" },
  { word: "from", phonetic: "[frəm]", meaning: "从" },
];
const secondLastVocabulary: VocabularyCard[] = [
  { word: "clock", phonetic: "[klɑːk]", meaning: "时钟" },
  { word: "tail", phonetic: "[teɪl]", meaning: "尾巴" },
  { word: "schoolbag", phonetic: "[ˈskuːlˌbæɡ]", meaning: "书包" },
  { word: "cream", phonetic: "[kriːm]", meaning: "奶油" },
  { word: "banana", phonetic: "[bəˈnænə]", meaning: "香蕉" },
  { word: "windy", phonetic: "[ˈwɪndi]", meaning: "多风的" },
  { word: "sweater", phonetic: "[ˈswetər]", meaning: "毛衣" },
  { word: "skirt", phonetic: "[skɜːrt]", meaning: "裙子" },
  { word: "duck", phonetic: "[dʌk]", meaning: "鸭子" },
  { word: "ping-pong", phonetic: "[ˈpɪŋ pɑːŋ]", meaning: "乒乓球" },
  { word: "candle", phonetic: "[ˈkændl]", meaning: "蜡烛" },
  { word: "sock", phonetic: "[sɑːk]", meaning: "短袜" },
  { word: "cap", phonetic: "[kæp]", meaning: "帽子" },
  { word: "trousers", phonetic: "[ˈtraʊzərz]", meaning: "长裤" },
  { word: "blackboard", phonetic: "[ˈblækbɔːrd]", meaning: "黑板" },
  { word: "ruler", phonetic: "[ˈruːlər]", meaning: "尺子" },
  { word: "grape", phonetic: "[ɡreɪp]", meaning: "葡萄" },
  { word: "toilet", phonetic: "[ˈtɔɪlət]", meaning: "洗手间" },
  { word: "bye", phonetic: "[baɪ]", meaning: "再见" },
  { word: "doll", phonetic: "[dɑːl]", meaning: "洋娃娃" },
];
const lastVocabulary: VocabularyCard[] = [
  { word: "left", phonetic: "[left]", meaning: "左边" },
  { word: "clothes", phonetic: "[kloʊðz]", meaning: "衣服" },
  { word: "excited", phonetic: "[ɪkˈsaɪtɪd]", meaning: "兴奋的" },
  { word: "shorts", phonetic: "[ʃɔːrts]", meaning: "短裤" },
  { word: "tired", phonetic: "[ˈtaɪərd]", meaning: "累的" },
];
const firstWords = firstVocabulary.map(({ word }) => word);
const secondLastWords = secondLastVocabulary.map(({ word }) => word);
const lastWords = lastVocabulary.map(({ word }) => word);

function cardsFor(vocabulary: VocabularyCard[], words: string[]) {
  const cardsByWord = new Map(vocabulary.map((card) => [card.word, card] as const));
  return words.flatMap((word) => {
    const card = cardsByWord.get(word);
    return card ? [card] : [];
  });
}

const firstIllustrations: StoryIllustration[] = [
  { alt: "小红旗背着书包，与萌萌和珍珠在月亮森林相遇", caption: "森林相遇", wordCards: cardsFor(firstVocabulary, ["I", "have", "a / an", "and", "the"]), src: "/vocabulary-stories/primary-group-01/simple-01.png" },
  { alt: "萌萌和珍珠陪小红旗沿着月光小路寻找方向", caption: "地图提问", wordCards: cardsFor(firstVocabulary, ["what", "can", "you", "do", "with"]), src: "/vocabulary-stories/primary-group-01/simple-02.png" },
  { alt: "小红旗、萌萌和珍珠乘着月亮鲸鱼前往云城", caption: "月亮鲸鱼", wordCards: cardsFor(firstVocabulary, ["to", "in", "of", "on", "that"]), src: "/vocabulary-stories/primary-group-01/simple-03.png" },
  { alt: "三位伙伴为迷路的小星星点亮灯笼", caption: "云城归星", wordCards: cardsFor(firstVocabulary, ["be", "for", "it", "at", "from"]), src: "/vocabulary-stories/primary-group-01/simple-04.svg" },
];

const lastIllustrations: StoryIllustration[] = [
  { alt: "小红旗、萌萌和珍珠在月亮森林的衣帽屋发现礼服", caption: "魔法衣帽屋", wordCards: cardsFor(lastVocabulary, ["clothes"]), src: "/vocabulary-stories/primary-group-25/simple-02.png" },
  { alt: "小红旗展示星星短裤，萌萌和珍珠为她鼓掌", caption: "星星短裤", wordCards: cardsFor(lastVocabulary, ["shorts"]), src: "/vocabulary-stories/primary-group-26/simple-02.svg" },
  { alt: "珍珠指向月亮森林岔路左边的发光小路", caption: "左边的小路", wordCards: cardsFor(lastVocabulary, ["left"]), src: "/vocabulary-stories/primary-group-01/simple-02.png" },
  { alt: "三位伙伴在星星舞会后坐在月牙秋千上休息", caption: "月牙秋千", wordCards: cardsFor(lastVocabulary, ["excited", "tired"]), src: "/vocabulary-stories/primary-group-26/simple-04.svg" },
];

const secondLastIllustrations: StoryIllustration[] = [
  { alt: "瓦力和伊芙在太空教室检查时钟、书包、玩偶和小鸭", caption: "星际课堂", wordCards: cardsFor(secondLastVocabulary, ["clock", "tail", "schoolbag", "windy", "doll"]), callouts: [{ word: "clock", labelX: 18, labelY: 12, anchorX: 18, anchorY: 27 }, { word: "schoolbag", labelX: 51, labelY: 12, anchorX: 33, anchorY: 54 }, { word: "doll", labelX: 84, labelY: 14, anchorX: 81, anchorY: 53 }, { word: "windy", labelX: 18, labelY: 51, anchorX: 20, anchorY: 40 }, { word: "tail", labelX: 81, labelY: 49, anchorX: 63, anchorY: 59 }], src: "/vocabulary-stories/primary-group-25/poster-01.svg" },
  { alt: "瓦力和伊芙在衣物展示架旁认识毛衣、裙子、帽子、长裤和短袜", caption: "太空衣帽间", wordCards: cardsFor(secondLastVocabulary, ["sweater", "skirt", "cap", "trousers", "sock"]), callouts: [{ word: "sweater", labelX: 17, labelY: 13, anchorX: 19, anchorY: 43 }, { word: "skirt", labelX: 50, labelY: 13, anchorX: 78, anchorY: 43 }, { word: "cap", labelX: 84, labelY: 13, anchorX: 22, anchorY: 58 }, { word: "trousers", labelX: 19, labelY: 63, anchorX: 74, anchorY: 57 }, { word: "sock", labelX: 81, labelY: 63, anchorX: 48, anchorY: 64 }], src: "/vocabulary-stories/primary-group-25/poster-02.svg" },
  { alt: "瓦力和伊芙在教室里用尺子看黑板地图，小鸭和乒乓球在洗手间门口", caption: "黑板寻线索", wordCards: cardsFor(secondLastVocabulary, ["blackboard", "ruler", "duck", "ping-pong", "toilet"]), callouts: [{ word: "blackboard", labelX: 50, labelY: 12, anchorX: 50, anchorY: 35 }, { word: "ruler", labelX: 17, labelY: 42, anchorX: 36, anchorY: 56 }, { word: "duck", labelX: 18, labelY: 68, anchorX: 21, anchorY: 62 }, { word: "ping-pong", labelX: 81, labelY: 62, anchorX: 68, anchorY: 61 }, { word: "toilet", labelX: 84, labelY: 22, anchorX: 87, anchorY: 51 }], src: "/vocabulary-stories/primary-group-25/poster-03.svg" },
  { alt: "瓦力和伊芙点亮蜡烛，和小鸭分享奶油蛋糕、香蕉和葡萄", caption: "月球庆祝会", wordCards: cardsFor(secondLastVocabulary, ["candle", "cream", "banana", "grape", "bye"]), callouts: [{ word: "candle", labelX: 16, labelY: 39, anchorX: 22, anchorY: 56 }, { word: "cream", labelX: 50, labelY: 14, anchorX: 50, anchorY: 49 }, { word: "banana", labelX: 83, labelY: 40, anchorX: 71, anchorY: 57 }, { word: "grape", labelX: 25, labelY: 66, anchorX: 34, anchorY: 63 }, { word: "bye", labelX: 81, labelY: 14, anchorX: 82, anchorY: 33 }], src: "/vocabulary-stories/primary-group-25/poster-04.svg" },
];

type PrimaryVocabularyStoryPreviewProps = {
  onAdjustSettings?: () => void;
  onContinue?: () => void;
  sortMode?: VocabularySortMode;
  voice?: VocabularyAccent;
};

function PrimaryVocabularyFrequencyStoryPreview({ onAdjustSettings, onContinue, voice = "us" }: Pick<PrimaryVocabularyStoryPreviewProps, "onAdjustSettings" | "onContinue" | "voice">) {
  const [activeGroup] = useState<StoryGroup>("secondLast");
  const isLastGroup = activeGroup === "last";
  const isSecondLastGroup = activeGroup === "secondLast";
  const groupNumber = isLastGroup ? 26 : isSecondLastGroup ? 25 : 1;
  const words = isLastGroup ? lastWords : isSecondLastGroup ? secondLastWords : firstWords;
  const illustrations = isLastGroup ? lastIllustrations : isSecondLastGroup ? secondLastIllustrations : firstIllustrations;

  return (
    <section aria-labelledby="primary-vocabulary-story-title" className={styles.preview}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>小学大纲词汇 · 总词频顺序</span>
          <h2 id="primary-vocabulary-story-title">{isLastGroup ? "月亮舞会的魔法衣帽屋" : isSecondLastGroup ? "瓦力和伊芙的星际课堂" : "小红旗、萌萌与月亮鲸鱼"}</h2>
          <p className={styles.intro}>{isLastGroup ? "读完星星舞会的童话，再认一遍词。" : isSecondLastGroup ? "和瓦力、伊芙一起找回魔法钟摆。" : "读一段中英杂合童话，在四幅插画里认识词汇。"}</p>
        </div>
        <div aria-label="继续记忆" className={styles.resumePrompt}>
          <strong>是否继续按照之前进度进行记忆？</strong>
          <span>将从上次保存的位置继续。</span>
          <div>
            {onContinue ? <button className={styles.resumeContinue} onClick={onContinue} type="button">继续记忆</button> : null}
            {onAdjustSettings ? <button className={styles.resumeAdjust} onClick={onAdjustSettings} type="button">调整设置</button> : null}
          </div>
        </div>
      </header>

      <div className={styles.story}>
        {isSecondLastGroup ? (
          <>
            <p>从前，瓦力和伊芙来到一间安静的太空教室。墙上的 <strong>clock</strong>（时钟）忽然停了。瓦力背着 <strong>schoolbag</strong>（书包），里面装着一个 <strong>doll</strong>（玩偶）和一只黄色小鸭。舱门旁的空气很 <strong>windy</strong>（多风的），吹得小鸭的 <strong>tail</strong>（尾巴）摇来摇去。</p>
            <p>为了参加月球派对，他们找到一件 <strong>sweater</strong>（毛衣）、一条 <strong>skirt</strong>（裙子）、一顶 <strong>cap</strong>（帽子）、一只 <strong>sock</strong>（短袜），还有一条长裤 <strong>trousers</strong>（长裤），摆好给小鸭挑选。瓦力和伊芙看着小鸭试穿，开心地拍起手来。</p>
            <p>教室的 <strong>blackboard</strong>（黑板）上画着太空地图。瓦力拿起 <strong>ruler</strong>（尺子）沿着地图找路线，伊芙和小鸭玩起 <strong>ping-pong</strong>（乒乓球），球一下滚到了 <strong>toilet</strong>（洗手间）门后。原来钟摆的小球也掉进了那里。</p>
            <p>他们点亮 <strong>candle</strong>（蜡烛），找到钟摆小球，把时钟修好了。小鸭端来抹着 <strong>cream</strong>（奶油）的 <strong>banana</strong>（香蕉）蛋糕和一串紫色 <strong>grape</strong>（葡萄），挥翅膀说：“<strong>bye</strong>（再见）！”瓦力和伊芙笑着送它回家，月球派对开始了。</p>
          </>
        ) : isLastGroup ? (
          <>
            <p>从前，月亮森林里有一间会变戏法的衣帽屋。小红旗、萌萌和珍珠收到星星舞会的邀请。柜门轻轻打开，里面挂着一排闪闪发光的 <strong>clothes</strong>（衣服）。</p>
            <p>萌萌挑了件银色斗篷，珍珠选中一条蓝色星星图案的 <strong>shorts</strong>（短裤）。她们刚换好衣服，窗外飘来一张地图：走到大橡树，沿着 <strong>left</strong>（左边）那条发光小路，就能找到舞会大厅。</p>
            <p>三位伙伴穿过树林，星光一路为她们引路。舞会大门一开，小红旗、萌萌和珍珠都觉得 <strong>excited</strong>（兴奋的），跟着星星跳起舞来，还帮一颗迷路的小星星找到回家的方向。</p>
            <p>跳到午夜，她们终于 <strong>tired</strong>（累了），坐在月牙秋千上休息。星星把月光洒在她们的肩头，照亮了回家的路。</p>
          </>
        ) : (
          <>
            <p>从前，月亮森林里住着小红旗、白兔萌萌和花兔珍珠。一天，小红旗迷路了。她翻出一张地图和一盏空灯笼，着急地说：“<strong>I</strong>（我）<strong>have</strong>（有）<strong>a</strong>（一张）地图 <strong>and</strong>（和）<strong>an</strong>（一盏）空灯笼，可我找不到回家的路！”</p>
            <p>萌萌指着地图问：“<strong>What</strong>（什么）<strong>can</strong>（能）<strong>you</strong>（你）<strong>do</strong>（做）<strong>with</strong>（用）<strong>it</strong>（它）？”小红旗摇摇头。珍珠笑着说：“<strong>Do</strong>（请）别担心，我们一起去找月亮鲸鱼！”</p>
            <p>地图上的字一边发光一边告诉他们：“<strong>The</strong>（这条）小路 <strong>to</strong>（通往）云城，藏 <strong>in</strong>（在……里）森林深处。”地图旁的小提示说：“‘月亮的钥匙’表示所属关系，<strong>of</strong>（……的）能把两样东西连起来。”月光钥匙就在鲸鱼背上，地图旁标着 <strong>on</strong>（在……上），提醒他们找准位置。地图上还画着一头鲸鱼，旁边写着 <strong>that</strong>（那头）鲸鱼正睡在湖底。</p>
            <p>午夜，小红旗、萌萌和珍珠赶到湖边。<strong>At</strong>（在）湖边，月亮鲸鱼醒了。<strong>It</strong>（它）驮着三位朋友 <strong>from</strong>（从）湖边飞向云城。小红旗举起空灯笼说：“这盏灯是 <strong>for</strong>（给）迷路的星星准备的。”她有些犹豫，萌萌鼓励她：“<strong>You</strong>（你）只要 <strong>be</strong>（变得）勇敢，就能把星星送回家！”</p>
            <p>灯光亮起，六颗小星星从鲸鱼背上飞回夜空。森林和云城一下亮了起来，小红旗、萌萌和珍珠沿着月光路高高兴兴地回家。</p>
          </>
        )}
      </div>

      <ol aria-label={`第${groupNumber}组按总词频顺序排列的${words.length}个词汇`} className={styles.wordOrder}>
        {words.map((word, index) => <li key={word}><span className={styles.number}>{index + 1}</span>{word}</li>)}
      </ol>

      <div className={styles.gallery}>
        {illustrations.map((illustration, index) => (
          <figure className={styles.figure} key={illustration.src}>
            <div className={styles.imageFrame} onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}>
              <Image alt={illustration.alt} draggable={false} fill sizes="(max-width: 760px) 100vw, (max-width: 1450px) 44vw, 22vw" src={illustration.src.replace("/vocabulary-stories/", "/api/vocabulary-scene-images/")} unoptimized />
              {illustration.callouts && illustration.wordCards ? (
                <div aria-label="图片中的词汇指示" className={styles.imageCalloutLayer}>
                  <svg aria-hidden="true" className={styles.calloutLines} preserveAspectRatio="none" viewBox="0 0 100 100">
                    {illustration.callouts.map(({ anchorX, anchorY, labelX, labelY, word }) => (
                      <g key={word}>
                        <line x1={labelX} x2={anchorX} y1={labelY} y2={anchorY} />
                        <circle cx={anchorX} cy={anchorY} r=".75" />
                      </g>
                    ))}
                  </svg>
                  {illustration.callouts.map(({ labelX, labelY, word }) => {
                    const card = illustration.wordCards?.find((item) => item.word === word);
                    return card ? (
                      <button
                        aria-label={`播放 ${card.word} ${voice === "uk" ? "英音" : "美音"}`}
                        className={styles.imageCallout}
                        key={word}
                        onClick={() => playVocabularyPronunciation({ accent: voice, word: card.word })}
                        style={{ left: `${labelX}%`, top: `${labelY}%` }}
                        title={`播放 ${card.word}`}
                        type="button"
                      >
                        <strong>{card.word}</strong><span>{card.meaning}</span>
                      </button>
                    ) : null;
                  })}
                </div>
              ) : null}
              {illustration.wordCards ? (
                <div aria-label={`图片词汇：${illustration.wordCards.map(({ word, meaning }) => `${word} ${meaning}`).join("、")}`} className={styles.imageWordCards} role="group">
                  {illustration.wordCards.map(({ word, phonetic, meaning }) => (
                    <button
                      aria-label={`播放 ${word} ${voice === "uk" ? "英音" : "美音"}`}
                      className={styles.imageWordCard}
                      key={word}
                      onClick={() => playVocabularyPronunciation({ accent: voice, word })}
                      title={`播放 ${word}`}
                      type="button"
                    >
                      <strong>{word}</strong>
                      <span>{phonetic}</span>
                      <small>{meaning}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <figcaption className={styles.caption}>
              <span className={styles.captionIndex}>{String(index + 1).padStart(2, "0")}</span>
              <strong>{illustration.caption}</strong>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function PrimaryVocabularyStoryPreview({ sortMode = "frequency", voice = "us", onContinue, onAdjustSettings }: PrimaryVocabularyStoryPreviewProps) {
  return sortMode === "scene"
    ? <PrimaryVocabularySceneStoryPreview onAdjustSettings={onAdjustSettings} onContinue={onContinue} />
    : <PrimaryVocabularyFrequencyStoryPreview onAdjustSettings={onAdjustSettings} onContinue={onContinue} voice={voice} />;
}

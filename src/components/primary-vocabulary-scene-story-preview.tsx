"use client";

import styles from "./primary-vocabulary-scene-story.module.css";

const words = [
  "answer", "blackboard", "book", "class", "classroom", "computer", "desk", "English", "learn", "lesson",
  "library", "maths", "paper", "pen", "pencil", "question", "read", "ruler", "school", "schoolbag",
];

export function PrimaryVocabularySceneStoryPreview({ onContinue, onAdjustSettings }: { onContinue?: () => void; onAdjustSettings?: () => void }) {
  return (
    <section aria-labelledby="primary-scene-story-title" className={styles.preview}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>小学大纲词汇 · 场景分组</span>
          <h2 id="primary-scene-story-title">校园与学习：一堂有趣的课</h2>
          <p className={styles.intro}>第 1 组 · 20 词。配图任务已取消，以下保留中英故事和本组词汇。</p>
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
        <section aria-labelledby="primary-scene-english-story">
          <h3 id="primary-scene-english-story">English story</h3>
          <p>
            On Monday, Class 3 walks from its <strong>classroom</strong> across the <strong>school</strong> to the <strong>library</strong>.
            Everyone chooses a <strong>book</strong> to <strong>read</strong>. Ms Lee opens an <strong>English</strong> book on the <strong>desk</strong>
            and writes a <strong>maths</strong> <strong>question</strong> on the <strong>blackboard</strong>. A <strong>computer</strong> and a sheet of <strong>paper</strong> are ready beside it. Mia takes a <strong>pencil</strong>, a <strong>pen</strong> and a <strong>ruler</strong> from her
            <strong>schoolbag</strong>. The <strong>class</strong> tries to <strong>answer</strong> the question. They <strong>learn</strong> a new word
            together, and the <strong>lesson</strong> ends with everyone smiling.
          </p>
        </section>
        <section aria-labelledby="primary-scene-chinese-story">
          <h3 id="primary-scene-chinese-story">中文故事</h3>
          <p>
            星期一，三年级的同学从教室穿过校园，来到图书馆。大家各自挑了一本书来读。李老师把一本英语书放在课桌上，
            又在黑板上写下一道数学题。旁边备好了一台电脑和一张纸。米娅从书包里拿出铅笔、钢笔和尺子。全班一起试着回答问题，
            学会了一个新单词。这堂课就在大家的笑声中结束了。
          </p>
        </section>
      </div>

      <ol aria-label="本组 20 个校园与学习词汇" className={styles.wordList}>
        {words.map((word, index) => <li key={word}><span>{String(index + 1).padStart(2, "0")}</span>{word}</li>)}
      </ol>
    </section>
  );
}

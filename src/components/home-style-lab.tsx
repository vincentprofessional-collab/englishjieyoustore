"use client";

import Link from "next/link";
import { useState } from "react";

const themes = [
  {
    id: "doodle",
    index: "01",
    name: "手绘治愈",
    note: "亲切、有记忆点",
  },
  {
    id: "sunrise",
    index: "02",
    name: "明亮成长",
    note: "积极、行动感强",
  },
  {
    id: "retro",
    index: "03",
    name: "暗夜复古",
    note: "个性、沉浸感强",
  },
  {
    id: "editorial",
    index: "04",
    name: "编辑极简",
    note: "清晰、专业耐看",
  },
] as const;

type ThemeId = (typeof themes)[number]["id"];

const studyEntries = [
  {
    eyebrow: "Vocabulary",
    href: "/vocabulary/books",
    mark: "Aa",
    title: "查词与词汇",
    description: "中文释义、发音、词根词源和自己的词汇书。",
  },
  {
    eyebrow: "Daily English",
    href: "/articles",
    mark: "文",
    title: "外刊精读",
    description: "从 BBC 随身英语开始，积累真实语境里的表达。",
  },
  {
    eyebrow: "IELTS Listening",
    href: "/listening",
    mark: "听",
    title: "雅思听力",
    description: "练习、精听与模考，逐步适应真实考试节奏。",
  },
  {
    eyebrow: "IELTS Reading",
    href: "/reading",
    mark: "读",
    title: "雅思阅读",
    description: "按题型练习，建立定位、理解与时间管理能力。",
  },
  {
    eyebrow: "IELTS Writing",
    href: "/writing",
    mark: "写",
    title: "雅思写作",
    description: "题型拆解、限时练习、词汇与范文放在一起学。",
  },
  {
    eyebrow: "Skill Training",
    href: "/training",
    mark: "练",
    title: "专项训练",
    description: "针对写作、翻译与薄弱技能进行短时高频训练。",
  },
];

function DoodleScene() {
  return (
    <div className="home-scene doodle-scene" aria-hidden="true">
      <span className="doodle doodle-star-one">✦</span>
      <span className="doodle doodle-star-two">✧</span>
      <span className="doodle doodle-loop">⌁</span>
      <span className="doodle doodle-cloud-one">☁</span>
      <span className="doodle doodle-cloud-two">☁</span>
      <span className="doodle doodle-heart">♡</span>
      <div className="doodle-book">
        <span>ENGLISH</span>
        <strong>解忧小册</strong>
        <i />
        <small>每天学一点，慢慢变厉害。</small>
      </div>
      <div className="doodle-pencil" />
      <div className="doodle-cat">
        <span>⌁</span>
        <strong>ᵕ · ᵕ</strong>
      </div>
    </div>
  );
}

function SunriseScene() {
  return (
    <div className="home-scene sunrise-scene" aria-hidden="true">
      <span className="sunrise-dot dot-one" />
      <span className="sunrise-dot dot-two" />
      <span className="sunrise-dot dot-three" />
      <div className="growth-path">
        <span className="growth-arrow" />
      </div>
      <div className="growth-person">
        <span />
        <i />
      </div>
      <strong className="growth-word">UP</strong>
    </div>
  );
}

function RetroScene() {
  return (
    <div className="home-scene retro-scene" aria-hidden="true">
      <div className="retro-glow" />
      <div className="retro-monitor">
        <div className="retro-screen">
          <span>READY?</span>
          <strong>EN</strong>
          <i>LEARN · PRACTICE · GROW</i>
        </div>
        <div className="retro-controls">
          <span />
          <span />
        </div>
      </div>
      <div className="retro-desk" />
      <div className="retro-tape">90</div>
    </div>
  );
}

function EditorialScene() {
  return (
    <div className="home-scene editorial-scene" aria-hidden="true">
      <span className="editorial-index">VOL. 01</span>
      <strong>
        English,
        <br />
        gently.
      </strong>
      <div className="editorial-rule" />
      <p>
        LISTEN
        <br />
        READ
        <br />
        WRITE
        <br />
        SPEAK
      </p>
      <span className="editorial-orbit">→</span>
    </div>
  );
}

export function HomeStyleLab() {
  const [activeTheme, setActiveTheme] = useState<ThemeId>("doodle");

  return (
    <div className={`home-style-lab theme-${activeTheme}`}>
      <section className="style-lab-toolbar" aria-label="首页风格选择器">
        <div className="style-lab-intro">
          <span>HOME STYLE LAB</span>
          <strong>选择一种首页气质</strong>
          <small>四套方案使用完全相同的内容，点击即可对比。</small>
        </div>
        <div className="style-lab-tabs" role="tablist" aria-label="风格方案">
          {themes.map((theme) => (
            <button
              aria-selected={activeTheme === theme.id}
              className={activeTheme === theme.id ? "active" : ""}
              data-testid={`theme-${theme.id}`}
              key={theme.id}
              role="tab"
              type="button"
              onClick={() => setActiveTheme(theme.id)}
            >
              <span>{theme.index}</span>
              <strong>{theme.name}</strong>
              <small>{theme.note}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="home-hero-panel">
        <div className="home-hero-copy">
          <span className="home-kicker">英文解忧杂货铺 · YOUR ENGLISH CORNER</span>
          <h1>
            把英语学习，
            <br />
            变成每天都想
            <em>打开</em>的事。
          </h1>
          <p>
            查一个词、听懂一段话、读完一篇外刊，或者认真准备一次雅思考试。
            这里把分散的学习工具，整理成一条可以安心走下去的路。
          </p>
          <div className="home-hero-actions">
            <Link className="home-primary-action" href="/vocabulary/books">
              开始今天的学习
              <span aria-hidden="true">↗</span>
            </Link>
            <Link className="home-secondary-action" href="/listening">
              进入雅思训练
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="home-proof-row" aria-label="平台学习内容">
            <span>
              <strong>4</strong>
              雅思单项
            </span>
            <span>
              <strong>6+</strong>
              学习模块
            </span>
            <span>
              <strong>1</strong>
              条清晰路径
            </span>
          </div>
        </div>

        {activeTheme === "doodle" ? <DoodleScene /> : null}
        {activeTheme === "sunrise" ? <SunriseScene /> : null}
        {activeTheme === "retro" ? <RetroScene /> : null}
        {activeTheme === "editorial" ? <EditorialScene /> : null}

        <span className="hero-corner-label">SCROLL TO EXPLORE ↓</span>
      </section>

      <section className="home-learning-section">
        <header className="home-section-heading">
          <div>
            <span>LEARNING MAP / 学习地图</span>
            <h2>今天想从哪里开始？</h2>
          </div>
          <p>没有必须完成的路线。选择最需要的一件事，先学二十分钟。</p>
        </header>

        <div className="home-entry-grid">
          {studyEntries.map((entry, index) => (
            <Link className="home-entry-card" href={entry.href} key={entry.title}>
              <span className="entry-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="entry-mark" aria-hidden="true">
                {entry.mark}
              </span>
              <small>{entry.eyebrow}</small>
              <h3>{entry.title}</h3>
              <p>{entry.description}</p>
              <strong className="entry-arrow" aria-hidden="true">
                ↗
              </strong>
            </Link>
          ))}
        </div>
      </section>

      <aside className="home-gentle-note">
        <span>今日份小提醒</span>
        <p>不用一次解决所有问题。每天让一个地方变清楚，就已经在向前走了。</p>
        <Link href="/articles">
          读一篇短文
          <span aria-hidden="true">→</span>
        </Link>
      </aside>
    </div>
  );
}

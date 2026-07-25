import Link from "next/link";

export function HomeStyleLab() {
  return (
    <div className="home-style-lab home-simple">
      <section className="home-hero-panel" aria-label="英文解忧杂货铺首页介绍">
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
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getListeningSections } from "@/lib/ielts/listening";

export const dynamic = "force-dynamic";

export default async function ListeningBookPage({
  params,
}: {
  params: Promise<{ bookCode: string }>;
}) {
  const { bookCode } = await params;
  const { sections, error } = await getListeningSections();
  const bookSections = sections.filter((section) => section.bookCode === bookCode);
  const firstSection = bookSections[0];
  const firstMockSection = bookSections.find((section) => section.questionCount > 0);

  if (error) {
    return (
      <section className="panel">
        <div className="eyebrow">Listening</div>
        <h1>读取失败</h1>
        <p className="lead">这本听力内容暂时无法读取：{error}</p>
      </section>
    );
  }

  if (!firstSection) {
    notFound();
  }

  return (
    <section className="stack">
      <div className="page-heading">
        <Link className="back-link" href="/listening">
          ← 返回
        </Link>
        <div className="eyebrow">Listening Book</div>
        <h1>{firstSection.bookTitle}</h1>
        <p className="lead">
          {firstMockSection
            ? "先选择练习或模考。练习和模考都会显示统一倒计时；模考模式会隐藏学习工具，并按考试流程开始。"
            : "当前已导入音频和中英原文，暂未导入题目与模考内容。"}
        </p>
      </div>

      <div className="mode-choice-grid">
        <Link className="mode-choice-card practice" href={`/listening/${firstSection.id}?mode=practice`}>
          <span>Practice</span>
          <strong>{firstMockSection ? "练习" : "原文学习"}</strong>
          <p>自己点击播放音频，可看原文、中文和单句音频。</p>
        </Link>
        {firstMockSection ? (
          <Link className="mode-choice-card mock" href={`/listening/${firstMockSection.id}?mode=mock`}>
            <span>Mock Test</span>
            <strong>模考</strong>
            <p>进入正式考试界面，点击 Play 后开始；后续会接 Part1-4 连播和自动提交。</p>
          </Link>
        ) : null}
      </div>

      <div className="section-title-row">
        <div>
          <div className="eyebrow">Available Sections</div>
          <h2>已导入内容</h2>
        </div>
      </div>

      <div className="section-grid">
        {bookSections.map((section) => (
          <Link className="section-card" href={`/listening/${section.id}?mode=practice`} key={section.id}>
            <div className="card-topline">
              <span>Test {section.testNo}</span>
              <span>{section.isPublished ? "已发布" : "草稿"}</span>
            </div>
            <h2>Section {section.sectionNo}</h2>
            <p>{section.title}</p>
            <div className="card-meta">
              <span>{section.questionCount > 0 ? `${section.questionCount} 题` : "原文学习"}</span>
              <span>{section.fullAudioUrl ? "有完整音频" : "待上传音频"}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

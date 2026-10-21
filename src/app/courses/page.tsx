import Link from "next/link";
import { GuideBoard } from "@/components/guide-board";
import { coursePageHref } from "@/lib/courses/course-directory";
import { getCachedPublishedCourseDirectory } from "@/lib/courses/course-directory-server";

export default async function CoursesPage() {
  const directory = await getCachedPublishedCourseDirectory();

  return (
    <main className="course-page course-index-page">
      <header className="course-page-hero">
        <span>COURSE DIRECTORY</span>
        <h1>英语课程</h1>
        <p>按考试目标与英语能力，选择适合自己的课程。</p>
      </header>
      <section aria-label="课程栏目" className="course-page-grid">
        {directory.groups.map((group) => (
          <Link className="course-page-card" href={coursePageHref([group.slug])} key={group.id}>
            <span>{group.children.length} 个课程页面</span>
            <h2>{group.label}</h2>
            {group.summary ? <p>{group.summary}</p> : null}
            <strong>进入栏目 <span aria-hidden="true">→</span></strong>
          </Link>
        ))}
      </section>
      <GuideBoard compact hideWhenEmpty initialExpanded placementPath="/courses" title="英语课程帖子" />
    </main>
  );
}

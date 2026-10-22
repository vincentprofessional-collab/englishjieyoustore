import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideBoard } from "@/components/guide-board";
import { coursePageHref, findCoursePage } from "@/lib/courses/course-directory";
import { getCachedPublishedCourseDirectory } from "@/lib/courses/course-directory-server";

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const directory = await getCachedPublishedCourseDirectory();
  const page = findCoursePage(directory, slug);
  if (!page) notFound();

  return (
    <main className="course-page course-detail-page">
      <nav aria-label="面包屑" className="course-page-breadcrumbs">
        <Link href="/courses">英语课程</Link>
        {page.trail.map((node, index) => (
          <span key={node.id}>
            <span aria-hidden="true">/</span>
            {index === page.trail.length - 1
              ? <strong aria-current="page">{node.label}</strong>
              : <Link href={coursePageHref(slug.slice(0, index + 1))}>{node.label}</Link>}
          </span>
        ))}
      </nav>
      <header className="course-page-hero">
        <span>ENGLISH COURSE</span>
        <h1>{page.node.label}</h1>
        {page.node.summary ? <p>{page.node.summary}</p> : <p>课程内容与配套学习资料。</p>}
      </header>
      {page.children.length ? (
        <section aria-label={`${page.node.label}子页面`} className="course-page-grid">
          {page.children.map((child) => (
            <Link className="course-page-card" href={coursePageHref([...slug, child.slug])} key={child.id}>
              <span>课程页面</span>
              <h2>{child.label}</h2>
              {child.summary ? <p>{child.summary}</p> : null}
              <strong>查看内容 <span aria-hidden="true">→</span></strong>
            </Link>
          ))}
        </section>
      ) : null}
      <GuideBoard compact hideWhenEmpty initialExpanded placementPath={page.href} title={`${page.node.label}帖子`} />
    </main>
  );
}

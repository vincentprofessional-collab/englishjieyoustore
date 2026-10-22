import Link from "next/link";
import { notFound } from "next/navigation";
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
        <p>暂无内容，稍晚会有演示课及课程介绍等内容。</p>
      </header>
    </main>
  );
}

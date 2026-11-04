import { getCachedPublishedCourseDirectory } from "@/lib/courses/course-directory-server";

export default async function CoursesPage() {
  const { homepage } = await getCachedPublishedCourseDirectory();
  const paragraphs = homepage.content.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean);

  return (
    <main className="course-page course-index-page">
      <header className="course-page-hero">
        <span>COURSE DIRECTORY</span>
        <h1>{homepage.title}</h1>
        {homepage.summary ? <p>{homepage.summary}</p> : null}
        {paragraphs.length ? <div className="course-page-content">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div> : null}
      </header>
    </main>
  );
}

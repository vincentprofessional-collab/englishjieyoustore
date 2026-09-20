import Link from "next/link";
import { WRITING_QUESTIONS, getWritingCategories, type WritingTask } from "@/lib/ielts/writing";

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task } = await searchParams;
  const selectedTask: WritingTask = task === "task1" ? "task1" : "task2";
  const categories = getWritingCategories(selectedTask);

  return (
    <section className="stack training-page">
      <div className="directory-page-heading">
        <span>WRITING PRACTICE</span>
        <h1>{selectedTask === "task1" ? "小作文写作训练" : "大作文写作训练"}</h1>
      </div>

      {categories.map((category) => {
        const questions = WRITING_QUESTIONS.filter(
          (question) => question.task === selectedTask && question.category === category.id,
        );
        if (!questions.length) return null;

        return (
          <section className="training-category" key={category.id}>
            <h2>{category.label}</h2>
            <div className="training-question-grid">
              {questions.map((question) => (
                <Link className="training-question-card" href={`/writing/practice/${question.id}`} key={question.id}>
                  <span>{question.book} · {question.test}</span>
                  <strong>{question.title}</strong>
                  <small>{question.shortTitle}</small>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}

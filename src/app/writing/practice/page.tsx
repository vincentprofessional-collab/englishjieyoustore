import Link from "next/link";
import {
  WRITING_QUESTIONS,
  getWritingCategories,
  type WritingTask,
} from "@/lib/ielts/writing";

const taskCopy = {
  task1: {
    label: "TASK 1",
    title: "图表与流程写作",
  },
  task2: {
    label: "TASK 2",
    title: "议论文写作",
  },
};

export default async function WritingPracticeIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task: requestedTask } = await searchParams;
  const visibleTasks = (Object.keys(taskCopy) as WritingTask[]).filter(
    (task) => requestedTask !== "task1" || task === "task1",
  );

  return (
    <section className="stack writing-home-page writing-practice-index-page">
      <div className="writing-mode-panel">
        <div className="listening-library-head">
          <div>
            <span>Practice</span>
            <strong>选择写作题型</strong>
          </div>
        </div>

        <div className="writing-practice-tree writing-practice-index-tree" id="writing-practice-library">
          <div className="writing-task-grid">
            {visibleTasks.map((task) => {
              const item = taskCopy[task];
              const categories = getWritingCategories(task);

              return (
                <section className="writing-task-column" id={task} key={task}>
                  <div className="writing-task-card">
                    <strong><span>{item.label}</span>{item.title}</strong>
                  </div>

                  <div className="writing-category-list">
                    {categories.map((category, categoryIndex) => {
                      const questions = WRITING_QUESTIONS.filter(
                        (question) => question.task === task && question.category === category.id,
                      );

                      return (
                        <details className="writing-category-item" key={category.id}>
                          <summary className="writing-category-banner">
                            <span className="writing-category-number">
                              {String(categoryIndex + 1).padStart(2, "0")}
                            </span>
                            {category.id === "advantages" ? (
                              <span className="writing-category-copy advantages-row">
                                <strong>
                                  <span>ADVANTAGES</span>
                                  <span>DISADVANTAGES</span>
                                </strong>
                                <small>{category.label}</small>
                              </span>
                            ) : (
                              <span className="writing-category-copy">
                                <strong>{category.labelEnglish.toUpperCase()}</strong>
                                <small>{category.label}</small>
                              </span>
                            )}
                            <span className="writing-category-count">{questions.length}</span>
                            <i>
                              <span className="disclosure-label-closed">▸</span>
                              <span className="disclosure-label-open">▾</span>
                            </i>
                          </summary>

                          <div className="writing-question-list">
                            {questions.map((question) => (
                              <Link
                                className="writing-question-card"
                                href={`/writing/practice/${question.id}`}
                                key={question.id}
                              >
                                <span>{question.book} · {question.test}</span>
                                <strong>{question.title}</strong>
                                <small>{question.shortTitle}</small>
                                <i>START →</i>
                              </Link>
                            ))}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

import { ListeningPracticeLibrary } from "@/components/listening-practice-library";
import { getListeningSections } from "@/lib/ielts/listening";

export const dynamic = "force-dynamic";

export default async function JiufenListeningPage() {
  const { sections, error } = await getListeningSections();

  return (
    <section className="stack ielts-module-page listening-library-page">
      <div className="listening-library-panel">
        {error ? <div className="notice danger">读取听力题库失败：{error}</div> : null}

        <ListeningPracticeLibrary bookScope="jiufen" sections={sections} />
      </div>
    </section>
  );
}

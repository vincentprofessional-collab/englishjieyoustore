import { supabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default async function SupabaseDebugPage() {
  const { data, error } = await supabase
    .from("feature_access_rules")
    .select("feature_key,module,title,access_level")
    .order("sort_order", { ascending: true })
    .limit(8);

  return (
    <section className="panel">
      <div className="eyebrow">Connection check</div>
      <h1>Supabase 连接测试</h1>
      {error ? (
        <p className="lead">连接失败：{error.message}</p>
      ) : (
        <>
          <p className="lead">
            连接成功。下面这些功能开关来自 Supabase 数据库。
          </p>
          <div className="module-list">
            {data?.map((item) => (
              <div className="module" key={item.feature_key}>
                <strong>{item.title}</strong>
                <span>
                  {item.module} / {item.access_level} / {item.feature_key}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

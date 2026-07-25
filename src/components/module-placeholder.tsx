import Link from "next/link";

type ModulePlaceholderProps = {
  badge: string;
  title: string;
  description: string;
  items: string[];
  primaryHref?: string;
  primaryLabel?: string;
};

export function ModulePlaceholder({
  badge,
  title,
  description,
  items,
  primaryHref = "/",
  primaryLabel = "回到首页",
}: ModulePlaceholderProps) {
  return (
    <section className="stack">
      <div className="page-heading">
        <div className="eyebrow">{badge}</div>
        <h1>{title}</h1>
        <p className="lead">{description}</p>
        <div className="actions">
          <Link className="button primary" href={primaryHref}>
            {primaryLabel}
          </Link>
        </div>
      </div>

      <div className="grid three">
        {items.map((item) => (
          <article className="module large" key={item}>
            <strong>{item}</strong>
            <span>后台框架已预留，后续接入真实内容和权限开关。</span>
          </article>
        ))}
      </div>
    </section>
  );
}

import Link from "next/link";
import {
  getManagedPageItemClassName,
  type ManagedPageItem,
} from "@/lib/content/page-content";

type ModulePlaceholderProps = {
  badge: string;
  title: string;
  description: string;
  items: Array<
    | string
    | {
        description: string;
        href?: string;
        item?: ManagedPageItem;
        title: string;
      }
  >;
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
        {items.map((item, index) => {
          const title = typeof item === "string" ? item : item.title;
          const description =
            typeof item === "string"
              ? "后台框架已预留，后续接入真实内容和权限开关。"
              : item.description;

          const className =
            typeof item !== "string" && item.item
              ? getManagedPageItemClassName(item.item, index, "module large")
              : "module large";

          if (typeof item !== "string" && item.href) {
            return (
              <Link className={className} href={item.href} key={title}>
                <strong>{title}</strong>
                <span>{description}</span>
              </Link>
            );
          }

          return (
            <article className={className} key={title}>
              <strong>{title}</strong>
              <span>{description}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

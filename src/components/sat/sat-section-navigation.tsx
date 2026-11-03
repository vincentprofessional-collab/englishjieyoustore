import Link from "next/link";
import styles from "./sat.module.css";

const SECTIONS = [
  { href: "/sat", label: "题型训练", id: "practice" },
  { href: "/sat/knowledge", label: "知识点", id: "knowledge" },
  { href: "/sat/past-papers", label: "历年真题", id: "past-papers" },
] as const;

export function SatSectionNavigation({ current }: { current: (typeof SECTIONS)[number]["id"] }) {
  return <nav aria-label="SAT 页面" className={styles.homeTabs}>
    {SECTIONS.map((section) => <Link
      aria-current={section.id === current ? "page" : undefined}
      className={`${styles.homeTab} ${section.id === current ? styles.homeTabActive : ""}`}
      href={section.href}
      key={section.id}
    >{section.label}</Link>)}
  </nav>;
}

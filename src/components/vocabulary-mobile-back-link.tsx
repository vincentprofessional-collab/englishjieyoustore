import Link from "next/link";

export function VocabularyMobileBackLink({
  ariaLabel,
  className = "",
  desktopLabel = "← 返回",
  href,
}: {
  ariaLabel: string;
  className?: string;
  desktopLabel?: string;
  href: string;
}) {
  return (
    <Link aria-label={ariaLabel} className={`vocabulary-mobile-back-link ${className}`.trim()} href={href}>
      <span className="vocabulary-back-link-desktop-label">{desktopLabel}</span>
      <span aria-hidden="true" className="vocabulary-back-link-mobile-arrow">‹</span>
    </Link>
  );
}

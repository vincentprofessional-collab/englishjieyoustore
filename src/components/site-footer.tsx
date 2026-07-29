import Link from "next/link";

const footerLinks = [
  { label: "使用说明", href: "/contact" },
  { label: "雅思听力", href: "/listening" },
  { label: "雅思口语", href: "/speaking" },
  { label: "英语专项训练", href: "/training" },
  { label: "我的收藏", href: "/me/favorites" },
];

const socialLinks = [
  { label: "微信", mark: "微", href: "/contact" },
  { label: "微博", mark: "博", href: "/contact" },
  { label: "公众号", mark: "公", href: "/contact" },
  { label: "小红书", mark: "红", href: "/contact" },
  { label: "B站", mark: "B", href: "/contact" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <section className="footer-brand-band">
        <Link className="footer-brand" href="/">
          <span className="footer-brand-mark">英</span>
          <span>
            <strong>英文解忧杂货铺</strong>
            <small>IELTS · 外刊 · 词典 · 专项训练</small>
          </span>
        </Link>

        <div className="footer-socials" aria-label="社交媒体入口">
          {socialLinks.map((item) => (
            <Link href={item.href} key={item.label} title={item.label}>
              <span>{item.mark}</span>
              <small>{item.label}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="footer-action-band">
        <nav className="footer-links" aria-label="底部导航">
          {footerLinks.map((item) => (
            <Link href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </nav>

        <aside className="footer-promo-card">
          <span className="promo-close" aria-hidden="true">
            ×
          </span>
          <div>
            <strong>扫码关注学习更新</strong>
            <p>发布课程通知、免费资料、活动广告和平台消息。</p>
          </div>
          <div className="qr-card" aria-label="二维码占位">
            <span />
            <span />
            <span />
            <span />
            <strong>QR</strong>
          </div>
          <small>二维码、广告文案和跳转链接后期都可后台替换。</small>
        </aside>
      </section>

      <div className="footer-bottom">
        <span>© 2026 英文解忧杂货铺</span>
        <span>学习内容持续更新中</span>
      </div>
    </footer>
  );
}

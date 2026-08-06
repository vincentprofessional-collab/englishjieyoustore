"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getPublishedSiteChromeConfig,
  type SiteChromeConfig,
} from "@/lib/content/site-chrome";

type SiteFooterStyle = CSSProperties & {
  "--footer-bottom-text-color": string;
  "--footer-brand-mark-size": string;
  "--footer-brand-subtitle-color": string;
  "--footer-brand-subtitle-size": string;
  "--footer-brand-title-color": string;
  "--footer-brand-title-size": string;
  "--footer-link-color": string;
  "--footer-link-size": string;
  "--footer-promo-text-color": string;
  "--footer-promo-title-size": string;
  "--footer-social-color": string;
  "--footer-social-size": string;
};

export function SiteFooter({ config: initialConfig }: { config: SiteChromeConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const footerStyle: SiteFooterStyle = {
    "--footer-bottom-text-color": config.footer.bottomTextColor,
    "--footer-brand-mark-size": `${config.footer.brandMarkFontSize}px`,
    "--footer-brand-subtitle-color": config.footer.brandSubtitleColor,
    "--footer-brand-subtitle-size": `${config.footer.brandSubtitleFontSize}px`,
    "--footer-brand-title-color": config.footer.brandTitleColor,
    "--footer-brand-title-size": `${config.footer.brandTitleFontSize}px`,
    "--footer-link-color": config.footer.linkTextColor,
    "--footer-link-size": `${config.footer.linkFontSize}px`,
    "--footer-promo-text-color": config.footer.promo.textColor,
    "--footer-promo-title-size": `${config.footer.promo.titleFontSize}px`,
    "--footer-social-color": config.footer.socialTextColor,
    "--footer-social-size": `${config.footer.socialFontSize}px`,
  };
  const footerLinks = config.footer.links.filter((item) => item.enabled);
  const socialLinks = config.footer.socials.filter((item) => item.enabled);

  useEffect(() => {
    let isMounted = true;

    async function loadSiteChrome() {
      const nextConfig = await getPublishedSiteChromeConfig();

      if (isMounted) {
        setConfig(nextConfig);
      }
    }

    void loadSiteChrome();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer className="site-footer" style={footerStyle}>
      <section className="footer-brand-band">
        <Link className="footer-brand" href={config.footer.brandHref || "/"}>
          <span className="footer-brand-mark">
            {config.footer.brandImageUrl ? (
              <img alt={config.footer.brandTitle} src={config.footer.brandImageUrl} />
            ) : (
              config.footer.brandMark
            )}
          </span>
          <span>
            <strong>{config.footer.brandTitle}</strong>
            {config.footer.brandSubtitle ? <small>{config.footer.brandSubtitle}</small> : null}
          </span>
        </Link>

        <div className="footer-socials" aria-label="社交媒体入口">
          {socialLinks.map((item) => (
            <Link href={item.href || "/contact"} key={item.id} title={item.label}>
              <span>
                {item.imageUrl ? <img alt={item.label} src={item.imageUrl} /> : item.mark}
              </span>
              <small>{item.label}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="footer-action-band">
        <nav className="footer-links" aria-label="底部导航">
          {footerLinks.map((item) => (
            <Link href={item.href || "/"} key={item.id}>
              {item.imageUrl ? (
                <img className="footer-link-icon" alt="" src={item.imageUrl} />
              ) : null}
              {item.label}
            </Link>
          ))}
        </nav>

        {config.footer.promo.enabled ? (
          <aside className="footer-promo-card">
            <div className="qr-card" aria-label="二维码">
              {config.footer.promo.imageUrl ? (
                <img alt={config.footer.promo.title} src={config.footer.promo.imageUrl} />
              ) : (
                <>
                  <span />
                  <span />
                  <span />
                  <span />
                  <strong>QR</strong>
                </>
              )}
            </div>
            <div>
              <strong>{config.footer.promo.title}</strong>
              {config.footer.promo.text ? <p>{config.footer.promo.text}</p> : null}
              {config.footer.promo.note ? <small>{config.footer.promo.note}</small> : null}
            </div>
          </aside>
        ) : null}
      </section>

      <div className="footer-bottom">
        <span>{config.footer.bottomLeft}</span>
        <span>{config.footer.bottomRight}</span>
      </div>
    </footer>
  );
}

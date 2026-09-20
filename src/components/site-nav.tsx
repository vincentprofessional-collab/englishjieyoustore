"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type {
  SiteChromeConfig,
  SiteChromeNavItem,
} from "@/lib/content/site-chrome";

type SiteNavStyle = CSSProperties & {
  "--brand-mark-size": string;
  "--brand-subtitle-size": string;
  "--brand-title-size": string;
  "--nav-tab-size": string;
};

function getNavPath(href: string) {
  return href.split(/[?#]/, 1)[0];
}

function isNavItemActive(item: SiteChromeNavItem, pathname: string): boolean {
  const itemPath = getNavPath(item.href);
  const isDirectMatch = itemPath === "/"
    ? pathname === "/"
    : Boolean(itemPath && (pathname === itemPath || pathname.startsWith(`${itemPath}/`)));

  return isDirectMatch || item.children.some((child) => isNavItemActive(child, pathname));
}

function isTopLevelItemActive(item: SiteChromeNavItem, pathname: string) {
  if (item.id === "home") return pathname === "/";
  if (item.id === "dictionary") return pathname.startsWith("/vocabulary") && !pathname.startsWith("/vocabulary/books");
  if (item.id === "memorize") return pathname.startsWith("/vocabulary/books");
  if (item.id === "articles") return pathname.startsWith("/articles");
  if (item.id === "exams") {
    return ["/junior-high", "/senior-high", "/exams", "/listening", "/speaking", "/reading", "/writing", "/sat"]
      .some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }
  if (item.id === "skill-training") return pathname.startsWith("/training");
  if (item.id === "me") return pathname.startsWith("/me");
  return isNavItemActive(item, pathname);
}

function getFirstLeafHref(item: SiteChromeNavItem): string {
  for (const child of item.children.filter((candidate) => candidate.enabled)) {
    const href = getFirstLeafHref(child);
    if (href) return href;
  }

  return item.href;
}

export function SiteNav({ config: initialConfig }: { config: SiteChromeConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const pathname = usePathname();
  const navStyle: SiteNavStyle = {
    "--brand-mark-size": `${config.brand.markFontSize}px`,
    "--brand-subtitle-size": `${config.brand.subtitleFontSize}px`,
    "--brand-title-size": `${config.brand.titleFontSize}px`,
    "--nav-tab-size": `${config.nav.fontSize}px`,
  };
  const navItems = config.nav.items.filter(
    (item) => item.enabled && item.label !== "公告栏" && item.label !== "使用说明",
  );

  useEffect(() => {
    setConfig((current) => ({
      ...current,
      nav: {
        ...current.nav,
        items: current.nav.items.map((item) => item.id === "me" ? {
          ...item,
          children: item.children.map((child) => child.id === "learning-records" ? { ...child, href: "/me/progress", label: "学习进度" } : child),
        } : item),
      },
    }));
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    async function setupAdminAccess() {
      const { supabase } = await import("@/lib/supabase/client");

      async function checkAdminAccess() {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (isMounted) {
            setCanAccessAdmin(false);
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (isMounted) {
          setCanAccessAdmin(!profileError && profile?.role === "admin");
        }
      }

      await checkAdminAccess();

      if (!isMounted) {
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        setTimeout(() => {
          void checkAdminAccess();
        }, 0);
      });
      unsubscribe = () => subscription.unsubscribe();
    }

    void setupAdminAccess();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <header className="site-header" style={navStyle}>
      <div className="nav-topbar">
        <Link className="brand" href={config.brand.href || "/"}>
          <span className="brand-mark">
            {config.brand.imageUrl ? (
              <Image
                alt={config.brand.title}
                height={96}
                sizes="96px"
                src={config.brand.imageUrl}
                width={96}
              />
            ) : (
              config.brand.mark
            )}
          </span>
          <span className="brand-copy">
            <strong>{config.brand.title}</strong>
            {config.brand.subtitle ? <small>{config.brand.subtitle}</small> : null}
          </span>
        </Link>
        <div className="nav-actions">
          {canAccessAdmin ? (
            <Link className="nav-admin-link" href={config.nav.adminHref || "/admin"}>
              {config.nav.adminLabel}
            </Link>
          ) : null}
          <Link className="nav-cta" href={config.nav.loginHref || "/login"}>
            {config.nav.loginLabel}
          </Link>
        </div>
      </div>

      <nav className="nav-main" aria-label="主导航">
        {navItems.map((item) => {
          const children = item.children.filter((child) => child.enabled);
          const isActive = isTopLevelItemActive(item, pathname);

          return (
            <div className="nav-menu" key={item.id}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`nav-tab nav-link-tab ${isActive ? "active" : ""}`}
                href={getFirstLeafHref(item) || item.href || "/"}
              >
                {item.label}
                {children.length ? <span className="nav-caret" aria-hidden="true">▼</span> : null}
              </Link>
            </div>
          );
        })}
      </nav>
    </header>
  );
}

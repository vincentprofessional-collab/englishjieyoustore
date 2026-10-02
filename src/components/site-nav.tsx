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

function firstEnabledHref(item: SiteChromeNavItem): string {
  if (item.href) {
    return item.href;
  }

  for (const child of item.children) {
    if (!child.enabled) {
      continue;
    }

    const href = firstEnabledHref(child);
    if (href) {
      return href;
    }
  }

  return "/";
}

export function SiteNav({ config: initialConfig }: { config: SiteChromeConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const navStyle: SiteNavStyle = {
    "--brand-mark-size": `${config.brand.markFontSize}px`,
    "--brand-subtitle-size": `${config.brand.subtitleFontSize}px`,
    "--brand-title-size": `${config.brand.titleFontSize}px`,
    "--nav-tab-size": `${config.nav.fontSize}px`,
  };
  const navItems = config.nav.items
    .filter(
      (item) =>
        item.enabled &&
        item.id !== "dictionary" &&
        item.id !== "skill-training" &&
        item.label !== "英语专项技能训练" &&
        item.label !== "公告栏" &&
        item.label !== "使用说明",
    )
    .map((item) =>
      item.id === "articles"
        ? {
            ...item,
            children: item.children.filter(
              (child) => child.id !== "american" && !child.label.includes("专辑"),
            ),
            label: "综合英语",
          }
        : item,
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

    const adminCheckTimer = window.setTimeout(() => {
      void setupAdminAccess();
    }, 5_000);

    return () => {
      isMounted = false;
      window.clearTimeout(adminCheckTimer);
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
        {navItems.map((item) => (
          <div className="nav-menu" key={item.id}>
            <Link className="nav-tab nav-link-tab" href={firstEnabledHref(item)}>
              {item.label}
            </Link>
          </div>
        ))}
      </nav>
    </header>
  );
}

const mobileNavItems = [
  { href: "/", id: "home", label: "主页" },
  { href: "/vocabulary", id: "word", label: "单词" },
  { href: "/textbooks", id: "books", label: "教材" },
  { href: "/exams", id: "exams", label: "考试" },
  { href: "/me", id: "me", label: "我的" },
] as const;

function isMobileNavItemActive(id: (typeof mobileNavItems)[number]["id"], pathname: string) {
  if (id === "home") return pathname === "/";
  if (id === "word") return pathname.startsWith("/vocabulary");
  if (id === "books") return pathname.startsWith("/textbooks") || pathname.startsWith("/articles") || pathname.startsWith("/new-concept");
  if (id === "me") return pathname.startsWith("/me");
  return ["/listening", "/reading", "/writing", "/speaking", "/junior-high", "/senior-high", "/cet4", "/cet6", "/sat", "/exams"].some((path) => pathname.startsWith(path));
}

function isFocusedPracticeRoute(pathname: string) {
  if (pathname === "/writing/mock") return true;
  if (/^\/(?:listening|reading|sat)\/(?:practice|mock)\/[^/]+/.test(pathname)) return true;
  if (/^\/listening\/[^/]+$/.test(pathname) && !["/listening/practice", "/listening/mock", "/listening/jiufen", "/listening/past-papers"].includes(pathname)) return true;
  if (/^\/senior-high\/(?:practice|papers)\//.test(pathname)) return true;
  if (/^\/writing\/practice\/[^/]+/.test(pathname)) return true;
  return false;
}

function isMobileNavigationHub(pathname: string) {
  return ["/", "/vocabulary", "/textbooks", "/exams", "/me"].includes(pathname);
}

function MobileNavIcon({ id }: { id: (typeof mobileNavItems)[number]["id"] }) {
  if (id === "word") return <span aria-hidden="true" className="mobile-bottom-nav-aa">Aa</span>;

  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h5v-6h4v6h5V9" /></>,
    books: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z" /><path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20" /><path d="M8 7h8M8 11h8" /></>,
    exams: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    me: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  }[id];

  return <svg aria-hidden="true" className="mobile-bottom-nav-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">{paths}</svg>;
}

export function MobileBottomNav() {
  const pathname = usePathname();

  if (isFocusedPracticeRoute(pathname) || !isMobileNavigationHub(pathname)) return null;

  return (
    <nav aria-label="手机主导航" className="mobile-bottom-nav">
      {mobileNavItems.map((item) => {
        const active = isMobileNavItemActive(item.id, pathname);
        return (
          <Link aria-current={active ? "page" : undefined} className={active ? "active" : ""} href={item.href} key={item.id}>
            <MobileNavIcon id={item.id} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

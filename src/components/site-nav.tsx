"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
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

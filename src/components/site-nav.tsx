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

function renderNavItem(item: SiteChromeNavItem, pathname: string, depth = 0) {
  const enabledChildren = item.children.filter((child) => child.enabled);
  const isActive = isNavItemActive(item, pathname);
  const itemClassName = [
    "nav-sidebar-item",
    `nav-sidebar-level-${Math.min(depth, 2)}`,
    enabledChildren.length ? "has-children" : "",
    isActive ? "active" : "",
  ].filter(Boolean).join(" ");
  const label = (
    <>
      <span className="nav-sidebar-marker" aria-hidden="true" />
      <strong>{item.label}</strong>
      {item.note ? <small>{item.note}</small> : null}
    </>
  );

  return (
    <div className={itemClassName} key={item.id}>
      {item.href ? (
        <Link
          aria-current={isActive && !enabledChildren.length ? "page" : undefined}
          className="nav-sidebar-link"
          href={item.href}
        >
          {label}
        </Link>
      ) : (
        <div className="nav-sidebar-link nav-sidebar-heading">{label}</div>
      )}

      {enabledChildren.length ? (
        <div className="nav-sidebar-children">
          {enabledChildren.map((child) => renderNavItem(child, pathname, depth + 1))}
        </div>
      ) : null}
    </div>
  );
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
        {navItems.map((item) => renderNavItem(item, pathname))}
      </nav>
    </header>
  );
}

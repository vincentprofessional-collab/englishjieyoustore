"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getPublishedSiteChromeConfig,
  type SiteChromeConfig,
  type SiteChromeNavItem,
} from "@/lib/content/site-chrome";
import { supabase } from "@/lib/supabase/client";

type SiteNavStyle = CSSProperties & {
  "--brand-mark-size": string;
  "--brand-subtitle-size": string;
  "--brand-title-size": string;
  "--nav-tab-size": string;
};

function renderNavChild(child: SiteChromeNavItem, onNavigate: () => void) {
  const enabledChildren = child.children.filter((nestedChild) => nestedChild.enabled);

  if (enabledChildren.length) {
    return (
      <div className="nav-dropdown-branch" key={child.id}>
        <button className="nav-dropdown-branch-trigger" type="button">
          <strong>{child.label}</strong>
          <em aria-hidden="true">›</em>
        </button>
        <div className="nav-submenu">
          {enabledChildren.map((nestedChild) => renderNavChild(nestedChild, onNavigate))}
        </div>
      </div>
    );
  }

  if (!child.href) {
    return (
      <div className="nav-dropdown-static" key={child.id}>
        <strong>{child.label}</strong>
      </div>
    );
  }

  return (
    <Link href={child.href} key={child.id} onClick={onNavigate}>
      <strong>{child.label}</strong>
    </Link>
  );
}

export function SiteNav({ config: initialConfig }: { config: SiteChromeConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const navStyle: SiteNavStyle = {
    "--brand-mark-size": `${config.brand.markFontSize}px`,
    "--brand-subtitle-size": `${config.brand.subtitleFontSize}px`,
    "--brand-title-size": `${config.brand.titleFontSize}px`,
    "--nav-tab-size": `${config.nav.fontSize}px`,
  };
  const navItems = config.nav.items.filter((item) => item.enabled);

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

  useEffect(() => {
    let isMounted = true;

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

    void checkAdminAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        void checkAdminAccess();
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="site-header" style={navStyle}>
      <div className="nav-topbar">
        <Link className="brand" href={config.brand.href || "/"}>
          <span className="brand-mark">
            {config.brand.imageUrl ? (
              <img alt={config.brand.title} src={config.brand.imageUrl} />
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
          const isOpen = openMenu === item.id;
          const enabledChildren = item.children.filter((child) => child.enabled);
          const hasDropdown = Boolean(enabledChildren.length);

          if (!hasDropdown && item.href) {
            return (
              <div className="nav-menu" key={item.id}>
                <Link className="nav-tab nav-link-tab" href={item.href}>
                  {item.label}
                </Link>
              </div>
            );
          }

          return (
            <div
              className={`nav-menu ${item.dropdownAlign === "left" ? "open-left" : ""}`}
              key={item.id}
              onMouseEnter={() => setOpenMenu(item.id)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                aria-expanded={isOpen}
                className={`nav-tab ${isOpen ? "active" : ""}`}
                type="button"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setOpenMenu(null);
                  }
                }}
                onClick={() => setOpenMenu(isOpen ? null : item.id)}
              >
                {item.label}
                <span className="nav-caret">{isOpen ? "▲" : "▼"}</span>
              </button>
              <div className={`nav-dropdown ${isOpen ? "open" : ""}`}>
                {item.note ? <div className="nav-dropdown-note">{item.note}</div> : null}
                <div className="nav-dropdown-grid">
                  {enabledChildren.map((child) =>
                    renderNavChild(child, () => setOpenMenu(null)),
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </header>
  );
}

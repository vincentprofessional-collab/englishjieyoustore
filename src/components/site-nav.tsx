"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VocabularyAutoplaySettings } from "@/components/vocabulary-autoplay-settings";
import { supabase } from "@/lib/supabase/client";

type NavChild = {
  children?: NavChild[];
  href?: string;
  label: string;
};

type NavItem = {
  children?: NavChild[];
  dropdownAlign?: "left" | "right";
  href?: string;
  label: string;
  note?: string;
};

// 后期这组配置可以直接迁移到后台表，支持增删模块和调整顺序。
const navItems: NavItem[] = [
  {
    label: "查单词",
    href: "/",
  },
  {
    label: "背单词",
    note: "暂时未开发",
    children: [
      { label: "词汇书", href: "/vocabulary/books" },
      { label: "SRS 复习", href: "/vocabulary/books" },
    ],
  },
  {
    label: "外刊学习",
    children: [
      { label: "BBC随身英语", href: "/articles" },
      { label: "美音专辑待定", href: "/articles" },
    ],
  },
  {
    label: "语言考试",
    children: [
      {
        label: "雅思",
        children: [
          { label: "听力", href: "/listening" },
          { label: "口语", href: "/speaking" },
          { label: "阅读", href: "/reading" },
          { label: "写作", href: "/writing" },
        ],
      },
      { label: "其他考试正在开发中" },
    ],
  },
  {
    label: "英语专项技能训练",
    children: [
      { label: "写作翻译训练", href: "/training" },
      { label: "专项训练库", href: "/training" },
    ],
  },
  {
    label: "信息中心",
    children: [
      { label: "最新消息", href: "/news" },
      { label: "后台公告", href: "/news" },
    ],
  },
  {
    label: "有事您说话",
    children: [
      { label: "联系方式", href: "/contact" },
      { label: "学习咨询", href: "/contact" },
    ],
  },
  {
    label: "我的",
    dropdownAlign: "left",
    children: [
      { label: "收藏夹", href: "/me/favorites" },
      { label: "学习记录", href: "/me/favorites" },
      { label: "个人设置", href: "/me/settings" },
    ],
  },
];

export function SiteNav() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);

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
    <header className="site-header">
      <div className="nav-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">英</span>
          <span className="brand-copy">
            <strong>英文解忧杂货铺</strong>
          </span>
        </Link>
        <div className="nav-actions">
          {canAccessAdmin ? (
            <Link className="nav-admin-link" href="/admin">
              内容后台
            </Link>
          ) : null}
          <Link className="nav-cta" href="/login">
            登录 / 注册
          </Link>
        </div>
      </div>

      <nav className="nav-main" aria-label="主导航">
        {navItems.map((item) => {
          const isOpen = openMenu === item.label;
          const hasDropdown = Boolean(item.children?.length);

          if (!hasDropdown && item.href) {
            return (
              <div className="nav-menu" key={item.label}>
                <Link className="nav-tab nav-link-tab" href={item.href}>
                  {item.label}
                </Link>
              </div>
            );
          }

          return (
            <div
              className={`nav-menu ${item.dropdownAlign === "left" ? "open-left" : ""}`}
              key={item.label}
              onMouseEnter={() => setOpenMenu(item.label)}
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
                onClick={() => setOpenMenu(isOpen ? null : item.label)}
              >
                {item.label}
                <span className="nav-caret">{isOpen ? "▲" : "▼"}</span>
              </button>
              <div className={`nav-dropdown ${isOpen ? "open" : ""}`}>
                {item.note ? <div className="nav-dropdown-note">{item.note}</div> : null}
                <div className="nav-dropdown-grid">
                  {item.children?.map((child) => {
                    if (child.children?.length) {
                      return (
                        <div className="nav-dropdown-branch" key={child.label}>
                          <button className="nav-dropdown-branch-trigger" type="button">
                            <strong>{child.label}</strong>
                            <em aria-hidden="true">›</em>
                          </button>
                          <div className="nav-submenu">
                            {child.children.map((nestedChild) => (
                              <Link
                                href={nestedChild.href ?? "#"}
                                key={nestedChild.label}
                                onClick={() => setOpenMenu(null)}
                              >
                                <strong>{nestedChild.label}</strong>
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (!child.href) {
                      return (
                        <div className="nav-dropdown-static" key={child.label}>
                          <strong>{child.label}</strong>
                        </div>
                      );
                    }

                    return (
                      <Link href={child.href} key={child.label} onClick={() => setOpenMenu(null)}>
                        <strong>{child.label}</strong>
                      </Link>
                    );
                  })}
                </div>
                {item.label === "我的" ? <VocabularyAutoplaySettings variant="dropdown" /> : null}
              </div>
            </div>
          );
        })}
      </nav>
    </header>
  );
}

"use client";

import type { ChangeEvent, ReactNode } from "react";
import {
  DEFAULT_SITE_CHROME_CONFIG,
  SITE_CHROME_SLUG,
  SITE_CHROME_VERSION,
  cloneSiteChromeConfig,
  mergeSiteChromeConfig,
  type SiteChromeConfig,
  type SiteChromeLink,
  type SiteChromeNavItem,
} from "@/lib/content/site-chrome";
import { uploadAdminImage } from "@/lib/admin/upload-image";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type ChromeRow = {
  id: string;
  meta_json: unknown;
  published_at: string | null;
  updated_at: string | null;
};

type LinkListKey = "links" | "socials";
type ChromeEditorSection =
  | "brand"
  | "navigation"
  | "footer-brand"
  | "socials"
  | "footer-links"
  | "promo";
type ImageTarget =
  | { kind: "brand" }
  | { kind: "footer-brand" }
  | { kind: "links"; index: number }
  | { kind: "promo" }
  | { kind: "socials"; index: number };

function imageTargetKey(target: ImageTarget) {
  return "index" in target ? `${target.kind}-${target.index}` : target.kind;
}

function createNavItem(label = "新导航模块"): SiteChromeNavItem {
  return {
    children: [],
    dropdownAlign: "right",
    enabled: true,
    href: "",
    id: `nav-${Date.now()}`,
    label,
    note: "",
  };
}

function createFooterLink(label = "新链接"): SiteChromeLink {
  return {
    enabled: true,
    href: "",
    id: `link-${Date.now()}`,
    imageUrl: "",
    label,
    mark: "",
  };
}

function updateNavTree(
  items: SiteChromeNavItem[],
  path: number[],
  updater: (item: SiteChromeNavItem) => SiteChromeNavItem,
): SiteChromeNavItem[] {
  const [index, ...rest] = path;

  return items.map((item, itemIndex) => {
    if (itemIndex !== index) {
      return item;
    }

    if (!rest.length) {
      return updater(item);
    }

    return {
      ...item,
      children: updateNavTree(item.children, rest, updater),
    };
  });
}

function removeNavItem(items: SiteChromeNavItem[], path: number[]): SiteChromeNavItem[] {
  const [index, ...rest] = path;

  if (!rest.length) {
    return items.filter((_, itemIndex) => itemIndex !== index);
  }

  return items.map((item, itemIndex) =>
    itemIndex === index
      ? { ...item, children: removeNavItem(item.children, rest) }
      : item,
  );
}

function moveNavItem(
  items: SiteChromeNavItem[],
  path: number[],
  direction: -1 | 1,
): SiteChromeNavItem[] {
  const [index, ...rest] = path;

  if (!rest.length) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= items.length) {
      return items;
    }

    const nextItems = [...items];
    [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
    return nextItems;
  }

  return items.map((item, itemIndex) =>
    itemIndex === index
      ? { ...item, children: moveNavItem(item.children, rest, direction) }
      : item,
  );
}

function updateLinkList(
  links: SiteChromeLink[],
  index: number,
  patch: Partial<SiteChromeLink>,
) {
  return links.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

function moveLink(links: SiteChromeLink[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= links.length) {
    return links;
  }

  const nextLinks = [...links];
  [nextLinks[index], nextLinks[nextIndex]] = [nextLinks[nextIndex], nextLinks[index]];
  return nextLinks;
}

function NumberField({
  label,
  max = 80,
  min = 10,
  onChange,
  value,
}: {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
  );
}

function ColorField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="admin-color-field">
      <span>{label}</span>
      <input onChange={(event) => onChange(event.target.value)} type="color" value={value} />
    </label>
  );
}

function ImageUploadField({
  label,
  onClear,
  onUpload,
  uploading,
  value,
}: {
  label: string;
  onClear: () => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  value: string;
}) {
  return (
    <label className="admin-image-upload-field">
      <span>{label}</span>
      {value ? (
        <img alt={label} src={value} />
      ) : (
        <small>还没有上传图片。选择本地图片后会自动上传。</small>
      )}
      <input accept="image/*" disabled={uploading} onChange={onUpload} type="file" />
      {value ? (
        <button disabled={uploading} type="button" onClick={onClear}>
          移除图片
        </button>
      ) : null}
      {uploading ? <small>上传中…</small> : null}
    </label>
  );
}

function NavItemEditor({
  depth,
  item,
  path,
  siblingsLength,
  onAddChild,
  onChange,
  onMove,
  onRemove,
}: {
  depth: number;
  item: SiteChromeNavItem;
  path: number[];
  siblingsLength: number;
  onAddChild: (path: number[]) => void;
  onChange: (path: number[], patch: Partial<SiteChromeNavItem>) => void;
  onMove: (path: number[], direction: -1 | 1) => void;
  onRemove: (path: number[]) => void;
}) {
  const index = path[path.length - 1];

  return (
    <article className={`admin-nested-item depth-${depth}`}>
      <header>
        <div>
          <span>{depth === 0 ? "导航模块" : "子菜单"}</span>
          <strong>{item.label}</strong>
        </div>
        <div className="admin-list-actions">
          <button disabled={index === 0} type="button" onClick={() => onMove(path, -1)}>
            ↑
          </button>
          <button
            disabled={index === siblingsLength - 1}
            type="button"
            onClick={() => onMove(path, 1)}
          >
            ↓
          </button>
          {depth < 2 ? (
            <button type="button" onClick={() => onAddChild(path)}>
              增加下级
            </button>
          ) : null}
          <button className="admin-delete-module" type="button" onClick={() => onRemove(path)}>
            删除
          </button>
        </div>
      </header>

      <div className="admin-field-grid compact">
        <label>
          <span>显示文字</span>
          <input
            onChange={(event) => onChange(path, { label: event.target.value })}
            value={item.label}
          />
        </label>
        <label>
          <span>跳转链接</span>
          <input
            onChange={(event) => onChange(path, { href: event.target.value })}
            placeholder="/writing"
            value={item.href}
          />
        </label>
        <label>
          <span>下拉说明</span>
          <input
            onChange={(event) => onChange(path, { note: event.target.value })}
            placeholder="没有说明可以留空"
            value={item.note}
          />
        </label>
        <label>
          <span>下拉方向</span>
          <select
            onChange={(event) =>
              onChange(path, { dropdownAlign: event.target.value === "left" ? "left" : "right" })
            }
            value={item.dropdownAlign}
          >
            <option value="right">向右展开</option>
            <option value="left">向左展开</option>
          </select>
        </label>
        <label className="admin-checkbox-field">
          <input
            checked={item.enabled}
            onChange={(event) => onChange(path, { enabled: event.target.checked })}
            type="checkbox"
          />
          <span>前台显示</span>
        </label>
      </div>

      {item.children.length ? (
        <div className="admin-nested-list">
          {item.children.map((child, childIndex) => (
            <NavItemEditor
              depth={depth + 1}
              item={child}
              key={child.id}
              onAddChild={onAddChild}
              onChange={onChange}
              onMove={onMove}
              onRemove={onRemove}
              path={[...path, childIndex]}
              siblingsLength={item.children.length}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function LinkEditor({
  index,
  item,
  labelPrefix,
  onClearImage,
  onChange,
  onImageUpload,
  onMove,
  onRemove,
  showMark,
  uploadingImage,
  total,
}: {
  index: number;
  item: SiteChromeLink;
  labelPrefix: string;
  onClearImage: (index: number) => void;
  onChange: (index: number, patch: Partial<SiteChromeLink>) => void;
  onImageUpload: (index: number, event: ChangeEvent<HTMLInputElement>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  showMark: boolean;
  uploadingImage: boolean;
  total: number;
}) {
  return (
    <article className="admin-nested-item">
      <header>
        <div>
          <span>{labelPrefix}</span>
          <strong>{item.label}</strong>
        </div>
        <div className="admin-list-actions">
          <button disabled={index === 0} type="button" onClick={() => onMove(index, -1)}>
            ↑
          </button>
          <button disabled={index === total - 1} type="button" onClick={() => onMove(index, 1)}>
            ↓
          </button>
          <button className="admin-delete-module" type="button" onClick={() => onRemove(index)}>
            删除
          </button>
        </div>
      </header>

      <div className="admin-field-grid compact">
        <label>
          <span>文字</span>
          <input
            onChange={(event) => onChange(index, { label: event.target.value })}
            value={item.label}
          />
        </label>
        <label>
          <span>链接</span>
          <input
            onChange={(event) => onChange(index, { href: event.target.value })}
            placeholder="/contact"
            value={item.href}
          />
        </label>
        {showMark ? (
          <label>
            <span>圆标文字</span>
            <input
              onChange={(event) => onChange(index, { mark: event.target.value })}
              placeholder="微"
              value={item.mark}
            />
          </label>
        ) : null}
        <ImageUploadField
          label="本地上传图片"
          onClear={() => onClearImage(index)}
          onUpload={(event) => onImageUpload(index, event)}
          uploading={uploadingImage}
          value={item.imageUrl}
        />
        <label className="admin-checkbox-field">
          <input
            checked={item.enabled}
            onChange={(event) => onChange(index, { enabled: event.target.checked })}
            type="checkbox"
          />
          <span>前台显示</span>
        </label>
      </div>
    </article>
  );
}

export function AdminSiteChromeEditor({ adminUserId }: { adminUserId: string }) {
  const [draft, setDraft] = useState<SiteChromeConfig>(() =>
    cloneSiteChromeConfig(DEFAULT_SITE_CHROME_CONFIG),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [row, setRow] = useState<ChromeRow | null>(null);
  const [uploadingImageKey, setUploadingImageKey] = useState("");
  const [activeSection, setActiveSection] = useState<ChromeEditorSection>("brand");

  useEffect(() => {
    void loadChromeConfig();
  }, []);

  async function loadChromeConfig() {
    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("managed_content_pages")
      .select("id,meta_json,published_at,updated_at")
      .eq("slug", SITE_CHROME_SLUG)
      .maybeSingle();

    if (error) {
      setMessage(`读取导航与底部失败：${error.message}`);
      setIsLoading(false);
      return;
    }

    setRow(data as ChromeRow | null);
    setDraft(cloneSiteChromeConfig(mergeSiteChromeConfig(data?.meta_json)));
    setIsLoading(false);
  }

  function updateBrand(patch: Partial<SiteChromeConfig["brand"]>) {
    setDraft((current) => ({ ...current, brand: { ...current.brand, ...patch } }));
    setMessage("");
  }

  function updateNav(patch: Partial<SiteChromeConfig["nav"]>) {
    setDraft((current) => ({ ...current, nav: { ...current.nav, ...patch } }));
    setMessage("");
  }

  function updateFooter(patch: Partial<SiteChromeConfig["footer"]>) {
    setDraft((current) => ({ ...current, footer: { ...current.footer, ...patch } }));
    setMessage("");
  }

  function updatePromo(patch: Partial<SiteChromeConfig["footer"]["promo"]>) {
    setDraft((current) => ({
      ...current,
      footer: {
        ...current.footer,
        promo: { ...current.footer.promo, ...patch },
      },
    }));
    setMessage("");
  }

  function updateNavItem(path: number[], patch: Partial<SiteChromeNavItem>) {
    setDraft((current) => ({
      ...current,
      nav: {
        ...current.nav,
        items: updateNavTree(current.nav.items, path, (item) => ({ ...item, ...patch })),
      },
    }));
    setMessage("");
  }

  function addTopNavItem() {
    setDraft((current) => ({
      ...current,
      nav: { ...current.nav, items: [...current.nav.items, createNavItem()] },
    }));
    setMessage("");
  }

  function addChildNavItem(path: number[]) {
    setDraft((current) => ({
      ...current,
      nav: {
        ...current.nav,
        items: updateNavTree(current.nav.items, path, (item) => ({
          ...item,
          children: [...item.children, createNavItem("新子菜单")],
        })),
      },
    }));
    setMessage("");
  }

  function removeNav(path: number[]) {
    setDraft((current) => ({
      ...current,
      nav: { ...current.nav, items: removeNavItem(current.nav.items, path) },
    }));
    setMessage("");
  }

  function moveNav(path: number[], direction: -1 | 1) {
    setDraft((current) => ({
      ...current,
      nav: { ...current.nav, items: moveNavItem(current.nav.items, path, direction) },
    }));
    setMessage("");
  }

  function updateFooterLink(kind: LinkListKey, index: number, patch: Partial<SiteChromeLink>) {
    setDraft((current) => ({
      ...current,
      footer: {
        ...current.footer,
        [kind]: updateLinkList(current.footer[kind], index, patch),
      },
    }));
    setMessage("");
  }

  function setImageTarget(target: ImageTarget, imageUrl: string) {
    if (target.kind === "brand") {
      updateBrand({ imageUrl });
      return;
    }

    if (target.kind === "footer-brand") {
      updateFooter({ brandImageUrl: imageUrl });
      return;
    }

    if (target.kind === "promo") {
      updatePromo({ imageUrl });
      return;
    }

    updateFooterLink(target.kind, target.index, { imageUrl });
  }

  async function uploadImage(target: ImageTarget, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("请选择图片文件。");
      return;
    }

    const targetKey = imageTargetKey(target);
    setUploadingImageKey(targetKey);
    setMessage("");

    try {
      const publicUrl = await uploadAdminImage(file, `site/chrome/${targetKey}`);
      setImageTarget(target, publicUrl);
      setMessage("图片上传成功，记得点击发布导航与底部。");
    } catch (error) {
      setMessage(`图片上传失败：${error instanceof Error ? error.message : "请稍后再试。"}`);
    } finally {
      setUploadingImageKey("");
    }
  }

  function addFooterLink(kind: LinkListKey) {
    setDraft((current) => ({
      ...current,
      footer: {
        ...current.footer,
        [kind]: [...current.footer[kind], createFooterLink()],
      },
    }));
    setMessage("");
  }

  function removeFooterLink(kind: LinkListKey, index: number) {
    setDraft((current) => ({
      ...current,
      footer: {
        ...current.footer,
        [kind]: current.footer[kind].filter((_, itemIndex) => itemIndex !== index),
      },
    }));
    setMessage("");
  }

  function moveFooterLink(kind: LinkListKey, index: number, direction: -1 | 1) {
    setDraft((current) => ({
      ...current,
      footer: {
        ...current.footer,
        [kind]: moveLink(current.footer[kind], index, direction),
      },
    }));
    setMessage("");
  }

  function restoreDefaults() {
    setDraft(cloneSiteChromeConfig(DEFAULT_SITE_CHROME_CONFIG));
    setMessage("已恢复默认导航与底部，尚未发布。");
  }

  async function publishChromeConfig() {
    setIsSaving(true);
    setMessage("");

    const now = new Date().toISOString();
    const payload = {
      access_feature_key: null,
      created_by: adminUserId,
      is_paid_only: false,
      meta_json: { ...draft, version: SITE_CHROME_VERSION },
      module: "site",
      published_at: now,
      slug: SITE_CHROME_SLUG,
      status: "published",
      summary: "网站导航栏、品牌信息、底部链接、社交入口和二维码广告设置。",
      template_key: "site_announcement_page",
      title: "导航与底部",
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("managed_content_pages")
      .upsert(payload, { onConflict: "slug" })
      .select("id,meta_json,published_at,updated_at")
      .single();

    if (error) {
      setMessage(`发布失败：${error.message}`);
      setIsSaving(false);
      return;
    }

    setRow(data as ChromeRow);
    setMessage("发布成功，刷新网站页面即可看到导航和底部更新。");
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <section className="admin-editor-card">
        <p className="admin-empty-text">正在读取导航与底部配置…</p>
      </section>
    );
  }

  const sectionTabs: {
    eyebrow: string;
    id: ChromeEditorSection;
    meta: string;
    summary: string;
    title: string;
  }[] = [
    {
      eyebrow: "HEADER",
      id: "brand",
      meta: draft.brand.title || "未填写",
      summary: "品牌、登录按钮、后台按钮",
      title: "顶部品牌",
    },
    {
      eyebrow: "NAV",
      id: "navigation",
      meta: `${draft.nav.items.length} 个一级导航`,
      summary: "一级导航、下拉菜单、跳转链接",
      title: "导航菜单",
    },
    {
      eyebrow: "FOOTER",
      id: "footer-brand",
      meta: draft.footer.brandTitle || "未填写",
      summary: "底部 Logo、标题和副标题",
      title: "底部品牌",
    },
    {
      eyebrow: "SOCIAL",
      id: "socials",
      meta: `${draft.footer.socials.length} 个入口`,
      summary: "微信、微博、小红书等入口",
      title: "社交入口",
    },
    {
      eyebrow: "LINKS",
      id: "footer-links",
      meta: `${draft.footer.links.length} 个链接`,
      summary: "底部页面导航链接",
      title: "底部链接",
    },
    {
      eyebrow: "PROMO",
      id: "promo",
      meta: draft.footer.promo.enabled ? "前台显示" : "已隐藏",
      summary: "二维码卡片与最底部文字",
      title: "二维码卡片",
    },
  ];
  const activeTab = sectionTabs.find((section) => section.id === activeSection) ?? sectionTabs[0];
  let editorPanel: ReactNode;

  if (activeSection === "brand") {
    editorPanel = (
      <>
        <div className="admin-field-grid">
          <label>
            <span>品牌圆标文字</span>
            <input onChange={(event) => updateBrand({ mark: event.target.value })} value={draft.brand.mark} />
          </label>
          <ImageUploadField
            label="品牌图片"
            onClear={() => setImageTarget({ kind: "brand" }, "")}
            onUpload={(event) => uploadImage({ kind: "brand" }, event)}
            uploading={uploadingImageKey === "brand"}
            value={draft.brand.imageUrl}
          />
          <label>
            <span>品牌标题</span>
            <input onChange={(event) => updateBrand({ title: event.target.value })} value={draft.brand.title} />
          </label>
          <label>
            <span>品牌副标题</span>
            <input
              onChange={(event) => updateBrand({ subtitle: event.target.value })}
              value={draft.brand.subtitle}
            />
          </label>
          <label>
            <span>品牌链接</span>
            <input onChange={(event) => updateBrand({ href: event.target.value })} value={draft.brand.href} />
          </label>
          <NumberField
            label="导航文字字号"
            max={28}
            min={12}
            onChange={(value) => updateNav({ fontSize: value })}
            value={draft.nav.fontSize}
          />
          <NumberField
            label="品牌标题字号"
            max={56}
            min={16}
            onChange={(value) => updateBrand({ titleFontSize: value })}
            value={draft.brand.titleFontSize}
          />
          <NumberField
            label="圆标字号"
            max={56}
            min={12}
            onChange={(value) => updateBrand({ markFontSize: value })}
            value={draft.brand.markFontSize}
          />
          <label>
            <span>登录按钮文字</span>
            <input onChange={(event) => updateNav({ loginLabel: event.target.value })} value={draft.nav.loginLabel} />
          </label>
          <label>
            <span>登录按钮链接</span>
            <input onChange={(event) => updateNav({ loginHref: event.target.value })} value={draft.nav.loginHref} />
          </label>
          <label>
            <span>后台按钮文字</span>
            <input onChange={(event) => updateNav({ adminLabel: event.target.value })} value={draft.nav.adminLabel} />
          </label>
          <label>
            <span>后台按钮链接</span>
            <input onChange={(event) => updateNav({ adminHref: event.target.value })} value={draft.nav.adminHref} />
          </label>
        </div>
      </>
    );
  } else if (activeSection === "navigation") {
    editorPanel = (
      <>
        <div className="admin-section-toolbar">
          <NumberField
            label="导航文字字号"
            max={28}
            min={12}
            onChange={(value) => updateNav({ fontSize: value })}
            value={draft.nav.fontSize}
          />
          <button className="button secondary" type="button" onClick={addTopNavItem}>
            + 新增一级导航
          </button>
        </div>
        <div className="admin-nested-list">
          {draft.nav.items.map((item, index) => (
            <NavItemEditor
              depth={0}
              item={item}
              key={item.id}
              onAddChild={addChildNavItem}
              onChange={updateNavItem}
              onMove={moveNav}
              onRemove={removeNav}
              path={[index]}
              siblingsLength={draft.nav.items.length}
            />
          ))}
        </div>
      </>
    );
  } else if (activeSection === "footer-brand") {
    editorPanel = (
      <div className="admin-field-grid">
        <label>
          <span>底部圆标文字</span>
          <input
            onChange={(event) => updateFooter({ brandMark: event.target.value })}
            value={draft.footer.brandMark}
          />
        </label>
        <ImageUploadField
          label="底部品牌图片"
          onClear={() => setImageTarget({ kind: "footer-brand" }, "")}
          onUpload={(event) => uploadImage({ kind: "footer-brand" }, event)}
          uploading={uploadingImageKey === "footer-brand"}
          value={draft.footer.brandImageUrl}
        />
        <label>
          <span>底部标题</span>
          <input
            onChange={(event) => updateFooter({ brandTitle: event.target.value })}
            value={draft.footer.brandTitle}
          />
        </label>
        <label>
          <span>底部副标题</span>
          <input
            onChange={(event) => updateFooter({ brandSubtitle: event.target.value })}
            value={draft.footer.brandSubtitle}
          />
        </label>
        <label>
          <span>底部品牌链接</span>
          <input
            onChange={(event) => updateFooter({ brandHref: event.target.value })}
            value={draft.footer.brandHref}
          />
        </label>
        <NumberField
          label="底部标题字号"
          max={64}
          min={16}
          onChange={(value) => updateFooter({ brandTitleFontSize: value })}
          value={draft.footer.brandTitleFontSize}
        />
        <ColorField
          label="底部标题颜色"
          onChange={(value) => updateFooter({ brandTitleColor: value })}
          value={draft.footer.brandTitleColor}
        />
        <NumberField
          label="底部圆标字号"
          max={72}
          min={14}
          onChange={(value) => updateFooter({ brandMarkFontSize: value })}
          value={draft.footer.brandMarkFontSize}
        />
        <NumberField
          label="底部副标题字号"
          max={32}
          min={10}
          onChange={(value) => updateFooter({ brandSubtitleFontSize: value })}
          value={draft.footer.brandSubtitleFontSize}
        />
        <ColorField
          label="底部副标题颜色"
          onChange={(value) => updateFooter({ brandSubtitleColor: value })}
          value={draft.footer.brandSubtitleColor}
        />
      </div>
    );
  } else if (activeSection === "socials") {
    editorPanel = (
      <>
        <div className="admin-section-toolbar">
          <NumberField
            label="社交文字字号"
            max={32}
            min={12}
            onChange={(value) => updateFooter({ socialFontSize: value })}
            value={draft.footer.socialFontSize}
          />
          <ColorField
            label="社交文字颜色"
            onChange={(value) => updateFooter({ socialTextColor: value })}
            value={draft.footer.socialTextColor}
          />
          <button className="button secondary" type="button" onClick={() => addFooterLink("socials")}>
            + 新增社交入口
          </button>
        </div>
        <div className="admin-nested-list">
          {draft.footer.socials.map((item, index) => (
            <LinkEditor
              index={index}
              item={item}
              key={item.id}
              labelPrefix="社交入口"
              onClearImage={(itemIndex) =>
                setImageTarget({ kind: "socials", index: itemIndex }, "")
              }
              onChange={(itemIndex, patch) => updateFooterLink("socials", itemIndex, patch)}
              onImageUpload={(itemIndex, event) =>
                uploadImage({ kind: "socials", index: itemIndex }, event)
              }
              onMove={(itemIndex, direction) => moveFooterLink("socials", itemIndex, direction)}
              onRemove={(itemIndex) => removeFooterLink("socials", itemIndex)}
              showMark
              uploadingImage={uploadingImageKey === `socials-${index}`}
              total={draft.footer.socials.length}
            />
          ))}
        </div>
      </>
    );
  } else if (activeSection === "footer-links") {
    editorPanel = (
      <>
        <div className="admin-section-toolbar">
          <NumberField
            label="底部链接字号"
            max={32}
            min={12}
            onChange={(value) => updateFooter({ linkFontSize: value })}
            value={draft.footer.linkFontSize}
          />
          <ColorField
            label="底部链接颜色"
            onChange={(value) => updateFooter({ linkTextColor: value })}
            value={draft.footer.linkTextColor}
          />
          <button className="button secondary" type="button" onClick={() => addFooterLink("links")}>
            + 新增底部链接
          </button>
        </div>
        <div className="admin-nested-list">
          {draft.footer.links.map((item, index) => (
            <LinkEditor
              index={index}
              item={item}
              key={item.id}
              labelPrefix="底部链接"
              onClearImage={(itemIndex) =>
                setImageTarget({ kind: "links", index: itemIndex }, "")
              }
              onChange={(itemIndex, patch) => updateFooterLink("links", itemIndex, patch)}
              onImageUpload={(itemIndex, event) =>
                uploadImage({ kind: "links", index: itemIndex }, event)
              }
              onMove={(itemIndex, direction) => moveFooterLink("links", itemIndex, direction)}
              onRemove={(itemIndex) => removeFooterLink("links", itemIndex)}
              showMark={false}
              uploadingImage={uploadingImageKey === `links-${index}`}
              total={draft.footer.links.length}
            />
          ))}
        </div>
      </>
    );
  } else {
    editorPanel = (
      <div className="admin-field-grid">
        <label className="admin-checkbox-field">
          <input
            checked={draft.footer.promo.enabled}
            onChange={(event) => updatePromo({ enabled: event.target.checked })}
            type="checkbox"
          />
          <span>显示二维码卡片</span>
        </label>
        <NumberField
          label="广告标题字号"
          max={48}
          min={14}
          onChange={(value) => updatePromo({ titleFontSize: value })}
          value={draft.footer.promo.titleFontSize}
        />
        <ColorField
          label="二维码文字颜色"
          onChange={(value) => updatePromo({ textColor: value })}
          value={draft.footer.promo.textColor}
        />
        <label>
          <span>广告标题</span>
          <input
            onChange={(event) => updatePromo({ title: event.target.value })}
            value={draft.footer.promo.title}
          />
        </label>
        <ImageUploadField
          label="二维码图片"
          onClear={() => setImageTarget({ kind: "promo" }, "")}
          onUpload={(event) => uploadImage({ kind: "promo" }, event)}
          uploading={uploadingImageKey === "promo"}
          value={draft.footer.promo.imageUrl}
        />
        <label className="admin-field-wide">
          <span>广告说明</span>
          <textarea
            onChange={(event) => updatePromo({ text: event.target.value })}
            rows={3}
            value={draft.footer.promo.text}
          />
        </label>
        <label className="admin-field-wide">
          <span>底部小字</span>
          <textarea
            onChange={(event) => updatePromo({ note: event.target.value })}
            rows={2}
            value={draft.footer.promo.note}
          />
        </label>
        <label>
          <span>最底部左侧文字</span>
          <input
            onChange={(event) => updateFooter({ bottomLeft: event.target.value })}
            value={draft.footer.bottomLeft}
          />
        </label>
        <label>
          <span>最底部右侧文字</span>
          <input
            onChange={(event) => updateFooter({ bottomRight: event.target.value })}
            value={draft.footer.bottomRight}
          />
        </label>
        <ColorField
          label="最底部文字颜色"
          onChange={(value) => updateFooter({ bottomTextColor: value })}
          value={draft.footer.bottomTextColor}
        />
      </div>
    );
  }

  return (
    <section className="admin-chrome-editor">
      <div className="admin-chrome-topbar">
        <div>
          <span>GLOBAL CHROME</span>
          <h2>导航与底部编辑器</h2>
          <p>点击上方模块，只显示当前模块的修改页面；发布后前台读取同一份数据库配置。</p>
        </div>
        <div className="admin-chrome-actions">
          <button className="button secondary" disabled={isSaving} type="button" onClick={restoreDefaults}>
            恢复默认
          </button>
          <button className="button primary" disabled={isSaving} type="button" onClick={publishChromeConfig}>
            {isSaving ? "发布中…" : "发布导航与底部"}
          </button>
        </div>
        {message ? (
          <p className={`admin-form-message ${message.includes("失败") ? "error" : ""}`}>
            {message}
          </p>
        ) : null}
        <small>{row ? "已连接数据库配置" : "当前使用默认配置，发布后会写入数据库"}</small>
      </div>

      <div className="admin-chrome-layout">
        <nav className="admin-chrome-section-nav" aria-label="导航与底部模块">
          {sectionTabs.map((section) => (
            <button
              className={activeSection === section.id ? "active" : ""}
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
            >
              <span>{section.title}</span>
              <small>{activeSection === section.id ? "▲" : "▼"}</small>
            </button>
          ))}
        </nav>

        <section className="admin-editor-card admin-chrome-edit-page">
          <header className="admin-editor-heading">
            <div>
              <span>{activeTab.eyebrow}</span>
              <h2>{activeTab.title}</h2>
              <p>{activeTab.summary}</p>
            </div>
          </header>
          {editorPanel}
        </section>
      </div>
    </section>
  );
}

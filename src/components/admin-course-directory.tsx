"use client";

import { useEffect, useState } from "react";
import {
  COURSE_DIRECTORY_SLUG,
  createCoursePageNode,
  DEFAULT_COURSE_DIRECTORY,
  normalizeCourseDirectory,
  type CourseDirectory,
  type CoursePageNode,
} from "@/lib/courses/course-directory";
import { supabase } from "@/lib/supabase/client";

function updateCourseNodes(
  nodes: CoursePageNode[],
  path: string[],
  update: (node: CoursePageNode) => CoursePageNode,
): CoursePageNode[] {
  if (!path.length) return nodes;
  return nodes.map((node) => {
    if (node.id !== path[0]) return node;
    return path.length === 1
      ? update(node)
      : { ...node, children: updateCourseNodes(node.children, path.slice(1), update) };
  });
}

function addCourseNode(nodes: CoursePageNode[], parentPath: string[], node: CoursePageNode): CoursePageNode[] {
  if (!parentPath.length) return [...nodes, node];
  return nodes.map((parent) => parent.id === parentPath[0]
    ? parentPath.length === 1
      ? { ...parent, children: [...parent.children, node] }
      : { ...parent, children: addCourseNode(parent.children, parentPath.slice(1), node) }
    : parent);
}

function removeCourseNode(nodes: CoursePageNode[], id: string): CoursePageNode[] {
  return nodes.filter((node) => node.id !== id).map((node) => ({
    ...node,
    children: removeCourseNode(node.children, id),
  }));
}

function countCoursePages(nodes: CoursePageNode[]): number {
  return nodes.reduce((count, node) => count + 1 + countCoursePages(node.children), 0);
}

export function AdminCourseDirectory() {
  const [directory, setDirectory] = useState<CourseDirectory>(DEFAULT_COURSE_DIRECTORY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDirectory() {
      const { data, error } = await supabase
        .from("managed_content_pages")
        .select("meta_json")
        .eq("slug", COURSE_DIRECTORY_SLUG)
        .eq("status", "published")
        .maybeSingle();
      if (!active) return;
      if (!error && data?.meta_json) setDirectory(normalizeCourseDirectory(data.meta_json));
      setIsLoading(false);
    }
    void loadDirectory();
    return () => { active = false; };
  }, []);

  function updateNode(path: string[], update: (node: CoursePageNode) => CoursePageNode) {
    setDirectory((current) => ({ ...current, groups: updateCourseNodes(current.groups, path, update) }));
    setMessage("");
  }

  function addNode(parentPath: string[] = []) {
    const node = createCoursePageNode();
    setDirectory((current) => ({ ...current, groups: addCourseNode(current.groups, parentPath, node) }));
    setMessage("新页面已添加；修改标题、路径和说明后发布目录。新增子页面后可在帖子管理中选择它的路径。 ");
  }

  function deleteNode(id: string, label: string, hasChildren: boolean) {
    const detail = hasChildren ? "此页面及其全部子页面将从目录移除" : "此页面将从目录移除";
    if (!window.confirm(`${detail}。已发布到这些路径的帖子会保留在后台，但不再显示在对应页面。确认删除“${label}”？`)) return;
    setDirectory((current) => ({ ...current, groups: removeCourseNode(current.groups, id) }));
    setMessage("页面已从目录移除。页面帖子仍保留在帖子管理中。");
  }

  async function publishDirectory() {
    setIsSaving(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setMessage("登录状态已失效，请重新登录后再发布。");
        return;
      }
      const response = await fetch("/api/course-directory", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ directory }),
      });
      const result = await response.json().catch(() => null);
      setMessage(response.ok ? "课程目录已发布。" : `发布失败：${result?.error ?? "请稍后重试。"}`);
    } catch {
      setMessage("发布失败：网络暂时不可用，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  function renderNodes(nodes: CoursePageNode[], parentPath: string[] = [], depth = 0) {
    return nodes.map((node) => {
      const path = [...parentPath, node.id];
      return (
        <article className="course-admin-node" key={node.id}>
          <div className="course-admin-node-fields">
            <label>
              页面名称
              <input maxLength={80} onChange={(event) => updateNode(path, (current) => ({ ...current, label: event.target.value }))} value={node.label} />
            </label>
            <label>
              页面路径
              <input maxLength={64} onChange={(event) => updateNode(path, (current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} value={node.slug} />
            </label>
            <label className="course-admin-summary-field">
              页面说明
              <textarea maxLength={500} onChange={(event) => updateNode(path, (current) => ({ ...current, summary: event.target.value }))} rows={2} value={node.summary} />
            </label>
          </div>
          <div className="course-admin-node-actions">
            <small>层级 {depth + 1} · {node.children.length ? `${countCoursePages(node.children)} 个下级页面` : "可在此页面发布帖子"}</small>
            <button className="button secondary" onClick={() => addNode(path)} type="button">添加子页面</button>
            <button className="button secondary" onClick={() => deleteNode(node.id, node.label, node.children.length > 0)} type="button">删除页面</button>
          </div>
          {node.children.length ? <div className="course-admin-children">{renderNodes(node.children, path, depth + 1)}</div> : null}
        </article>
      );
    });
  }

  if (isLoading) {
    return <section className="admin-editor-card"><p className="admin-empty-text">正在读取课程目录…</p></section>;
  }

  return (
    <section className="admin-editor-card course-admin-editor">
      <header className="admin-editor-heading">
        <div>
          <span>COURSE DIRECTORY</span>
          <h2>英语课程页面</h2>
          <p>维护左侧栏目和页面层级。帖子管理中选择课程页面路径，即可将帖子发布到相应页面。</p>
        </div>
        <div className="course-admin-heading-actions">
          <button className="button secondary" onClick={() => addNode()} type="button">新增一级页面</button>
          <button className="button" disabled={isSaving} onClick={() => void publishDirectory()} type="button">{isSaving ? "发布中…" : "发布目录"}</button>
        </div>
      </header>
      {message ? <p className="course-admin-message" role="status">{message}</p> : null}
      <div className="course-admin-tree">{renderNodes(directory.groups)}</div>
      <p className="course-admin-footnote">页面路径只能使用小写英文字母、数字和连字符；同级页面路径不能重复。修改或删除路径后，发布在旧路径的帖子仍保留在后台，需要在帖子管理中重新选择新路径。当前目录共 {countCoursePages(directory.groups)} 个页面。</p>
    </section>
  );
}

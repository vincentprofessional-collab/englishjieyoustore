"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_EXAM_PAGE_COPY,
  DEFAULT_LANGUAGE_EXAM_NAVIGATION,
  loadLanguageExamContent,
  type ExamMenuGroup,
  type ExamMenuNode,
  type ExamPageBlock,
  type LanguageExamContent,
  type LanguageExamId,
} from "@/lib/language-exam-content";
import { saveLanguageExamContent } from "@/lib/language-exam-content-admin";
import styles from "./admin-language-exam-content-editor.module.css";

const examOptions: Array<{ id: LanguageExamId; label: string }> = [
  { id: "cet4", label: "大学英语四级" },
  { id: "cet6", label: "大学英语六级" },
  { id: "postgraduate", label: "考研英语" },
  { id: "ielts", label: "雅思阅读" },
  { id: "sat", label: "SAT" },
  { id: "gre", label: "GRE" },
  { id: "gmat", label: "GMAT" },
];

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function changeMenuNode(groups: ExamMenuGroup[], path: number[], updater: (node: ExamMenuNode) => ExamMenuNode): ExamMenuGroup[] {
  const next = clone(groups);
  let siblings: ExamMenuNode[] = next;
  let node: ExamMenuNode | undefined;
  for (const index of path) {
    node = siblings[index];
    if (!node) return groups;
    siblings = node.children;
  }
  if (!node) return groups;
  const index = path[path.length - 1];
  if (path.length === 1) next[index] = updater(node) as ExamMenuGroup;
  else {
    let parent: ExamMenuNode = next[path[0]];
    for (const part of path.slice(1, -1)) parent = parent.children[part];
    parent.children[index] = updater(node);
  }
  return next;
}

function MenuNodeEditor({
  depth,
  node,
  path,
  onAdd,
  onChange,
  onDelete,
}: {
  depth: number;
  node: ExamMenuNode;
  path: number[];
  onAdd: (path: number[]) => void;
  onChange: (path: number[], patch: Partial<ExamMenuNode> & { mark?: string }) => void;
  onDelete: (path: number[]) => void;
}) {
  return <div className={`${styles.menuNode} ${depth ? styles.nestedNode : ""}`}>
    <div className={styles.menuFields}>
      {depth === 0 ? <label>侧栏分组名称<input onChange={(event) => onChange(path, { label: event.target.value })} value={node.label} /></label> : null}
      {depth === 0 ? <label>标记<input maxLength={2} onChange={(event) => onChange(path, { mark: event.target.value })} value={(node as ExamMenuGroup).mark} /></label> : null}
      {depth > 0 ? <label>菜单文字<input onChange={(event) => onChange(path, { label: event.target.value })} value={node.label} /></label> : null}
      <label className={styles.hrefField}>跳转路径<input onChange={(event) => onChange(path, { href: event.target.value })} placeholder="/cet4?entry=papers" value={node.href} /></label>
      {depth > 0 ? <label className={styles.matchField}><input checked={node.matchSubroutes === true} onChange={(event) => onChange(path, { matchSubroutes: event.target.checked })} type="checkbox" /><span>匹配下级页面</span></label> : null}
      <div className={styles.menuActions}>
        {depth < 2 ? <button onClick={() => onAdd(path)} type="button">增加下级</button> : null}
        <button className={styles.danger} onClick={() => onDelete(path)} type="button">删除</button>
      </div>
    </div>
    {node.children.map((child, index) => <MenuNodeEditor depth={depth + 1} key={child.id} node={child} onAdd={onAdd} onChange={onChange} onDelete={onDelete} path={[...path, index]} />)}
  </div>;
}

export function AdminLanguageExamContentEditor({ adminUserId }: { adminUserId: string }) {
  const [content, setContent] = useState<LanguageExamContent>({ navigation: clone(DEFAULT_LANGUAGE_EXAM_NAVIGATION), pages: clone(DEFAULT_EXAM_PAGE_COPY) });
  const [selectedExam, setSelectedExam] = useState<LanguageExamId>("cet4");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void loadLanguageExamContent().then((result) => {
      if (!cancelled) setContent(result);
    }).catch((error: unknown) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : "读取考试页面配置失败。");
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  function updateMenu(path: number[], patch: Partial<ExamMenuNode> & { mark?: string }) {
    setContent((current) => ({
      ...current,
      navigation: changeMenuNode(current.navigation, path, (node) => ({ ...node, ...patch })),
    }));
  }

  function addMenuChild(path: number[]) {
    setContent((current) => ({
      ...current,
      navigation: changeMenuNode(current.navigation, path, (node) => ({
        ...node,
        children: [...node.children, { id: newId("exam-menu"), label: "新菜单", href: "", children: [] }],
      })),
    }));
  }

  function deleteMenuNode(path: number[]) {
    if (!window.confirm("删除这个菜单项及其下级菜单？")) return;
    setContent((current) => {
      const next = clone(current.navigation);
      const index = path[path.length - 1];
      if (path.length === 1) next.splice(index, 1);
      else {
        let parent: ExamMenuNode = next[path[0]];
        for (const part of path.slice(1, -1)) parent = parent.children[part];
        parent.children.splice(index, 1);
      }
      return { ...current, navigation: next };
    });
  }

  function updatePage(patch: Partial<LanguageExamContent["pages"][LanguageExamId]>) {
    setContent((current) => ({ ...current, pages: { ...current.pages, [selectedExam]: { ...current.pages[selectedExam], ...patch } } }));
  }

  function updateBlock(index: number, patch: Partial<ExamPageBlock>) {
    updatePage({ blocks: content.pages[selectedExam].blocks.map((block, blockIndex) => blockIndex === index ? { ...block, ...patch } : block) });
  }

  async function publish() {
    setIsSaving(true);
    setMessage("");
    try {
      await saveLanguageExamContent(adminUserId, content);
      setMessage("语言考试侧栏和页面内容已保存，前台刷新后生效。题型练习与整套试卷请在“考试题目管理”中维护。");
    } catch (error) {
      setMessage(error instanceof Error ? `保存失败：${error.message}` : "保存失败，请重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return <section className={`admin-editor-card ${styles.editor}`}>
    <header className={styles.heading}>
      <div><span className="eyebrow">EXAM PAGES</span><h2>语言考试菜单与页面内容</h2><p>管理语言考试页面的左侧菜单，以及各考试首页右侧展示的标题、说明和内容卡片。</p></div>
      <button className="button primary" disabled={isLoading || isSaving} onClick={() => void publish()} type="button">{isSaving ? "保存中…" : "保存并发布"}</button>
    </header>
    {message ? <p className={styles.message} role="status">{message}</p> : null}
    {isLoading ? <p>正在读取页面配置…</p> : <div className={styles.columns}>
      <section className={styles.panel}>
        <div className={styles.sectionHead}><div><h3>语言考试左侧菜单</h3><p>可调整分组、菜单文字、跳转路径及层级。</p></div><button className="button secondary" onClick={() => setContent((current) => ({ ...current, navigation: [...current.navigation, { id: newId("exam"), label: "新考试", mark: "新", href: "", children: [] }] }))} type="button">新增分组</button></div>
        {content.navigation.map((group, index) => <MenuNodeEditor depth={0} key={group.id} node={group} onAdd={addMenuChild} onChange={updateMenu} onDelete={deleteMenuNode} path={[index]} />)}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}><div><h3>右侧页面内容</h3><p>可编辑首页介绍和补充内容卡片；训练题与试卷本身在考试题目管理中编辑。</p></div></div>
        <label className={styles.examSelect}>考试页面<select onChange={(event) => setSelectedExam(event.target.value as LanguageExamId)} value={selectedExam}>{examOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <label>眉题<input onChange={(event) => updatePage({ eyebrow: event.target.value })} value={content.pages[selectedExam].eyebrow} /></label>
        <label>页面大标题<input onChange={(event) => updatePage({ title: event.target.value })} value={content.pages[selectedExam].title} /></label>
        <label>副标题／介绍<textarea onChange={(event) => updatePage({ description: event.target.value })} rows={3} value={content.pages[selectedExam].description} /></label>
        <div className={styles.sectionHead}><div><h3>补充内容卡片</h3></div><button className="button secondary" onClick={() => updatePage({ blocks: [...content.pages[selectedExam].blocks, { id: newId("exam-block"), title: "新内容", body: "", href: "", linkLabel: "" }] })} type="button">新增内容</button></div>
        {content.pages[selectedExam].blocks.map((block, index) => <article className={styles.block} key={block.id}>
          <div className={styles.blockHeader}><strong>内容 {index + 1}</strong><button className={styles.danger} onClick={() => updatePage({ blocks: content.pages[selectedExam].blocks.filter((_, itemIndex) => itemIndex !== index) })} type="button">删除</button></div>
          <label>标题<input onChange={(event) => updateBlock(index, { title: event.target.value })} value={block.title} /></label>
          <label>正文<textarea onChange={(event) => updateBlock(index, { body: event.target.value })} rows={3} value={block.body} /></label>
          <div className={styles.menuFields}><label>跳转路径<input onChange={(event) => updateBlock(index, { href: event.target.value })} placeholder="可留空" value={block.href || ""} /></label><label>按钮文字<input onChange={(event) => updateBlock(index, { linkLabel: event.target.value })} placeholder="可留空" value={block.linkLabel || ""} /></label></div>
        </article>)}
      </section>
    </div>}
  </section>;
}

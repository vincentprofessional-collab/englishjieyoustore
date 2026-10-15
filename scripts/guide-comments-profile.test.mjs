import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url);
function load(path, modules = {}, suffix = "") {
  const exports = {};
  const text = fs.readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code + suffix, { exports, process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: "fixture-only" } }, File, Buffer, FormData, URL, Date,
    require: name => name in modules ? modules[name] : require(name) });
  return exports;
}
const model = load("../src/lib/guide/comments.ts");
const membership = load("../src/lib/membership/current-membership.ts");
const postId = "11111111-1111-4111-8111-111111111111", otherPostId = "22222222-2222-4222-8222-222222222222", owner = "33333333-3333-4333-8333-333333333333";
function comment(id, parent = null, admin = false) {
  return { id, parentCommentId: parent ? "root" : null, replyToCommentId: parent, body: `${id}正文`, displayName: id, createdAt: "2026-10-01T00:00:00Z", isAdmin: admin, isGuest: !admin };
}
const chain = [comment("root"), comment("member", "root"), comment("admin", "member", true), comment("child", "admin"), comment("admin2", "child", true)];

test("every reply has its own subtree count; admin messages survive collapsed ancestors without duplication", () => {
  const tree = model.buildGuideCommentTree(chain);
  assert.equal(tree.descendantCount("root"), 4); assert.equal(tree.descendantCount("member"), 3); assert.equal(tree.descendantCount("admin"), 2); assert.equal(tree.descendantCount("child"), 1);
  assert.deepEqual([...tree.visibleChildren(null, false).map(item => item.id)], ["admin"]);
  assert.deepEqual([...tree.visibleChildren("admin", false).map(item => item.id)], ["admin2"]);
  assert.deepEqual([...tree.visibleChildren("admin", true).map(item => item.id)], ["child"]);
  assert.equal(tree.rootId("admin2"), "root");
});

test("orphaned or cyclic imported threads remain finite and readable", () => {
  const tree = model.buildGuideCommentTree([comment("a", "b"), comment("b", "a"), comment("orphan", "absent", true)]);
  assert.equal(tree.visibleChildren(null, true).length, 2);
  assert.equal(tree.descendantCount("a") + tree.descendantCount("b"), 1);
  assert.equal(tree.rootId("orphan"), "orphan");
});

test("the real post card renders administrator bodies when collapsed and independent reply controls when expanded", () => {
  function fixture(initialExpanded = false) {
    let cursor = 0;
    const states = [];
    const react = { useEffect() {}, useRef: () => ({ current: null }), useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = index === 0 ? chain : typeof initial === "function" ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    } };
    const component = load("../src/components/guide-board.tsx", { react, "react/jsx-runtime": jsx,
      "next/link": { __esModule: true, default: props => React.createElement("a", props) }, "next/navigation": {}, "@/lib/content/guide-post-navigation": {},
      "@/lib/guide/posts": {}, "@/lib/membership/current-membership": membership, "@/lib/supabase/client": {}, "@/lib/visitor-identity": {}, "@/lib/guide/comments": model,
    }, "\nexports.Card = GuidePostCard;");
    let tree;
    const render = () => { cursor = 0; tree = component.Card({ post: { id: postId, title: "原帖", slug: "guide-fixture", publishedAt: "2026-10-01", blocks: [], excerpt: "" }, initialExpanded, hidePostChrome: true, titleOnly: true }); return renderToStaticMarkup(tree); };
    function find(node, predicate) {
      if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
      if (!node || typeof node !== "object") return;
      return predicate(node) ? node : find(node.props?.children, predicate);
    }
    return { render, click(predicate) { const button = find(tree, item => item.type === "button" && predicate(item.props)); assert.ok(button, "requested toggle exists"); button.props.onClick(); return render(); } };
  }
  for (const detailPage of [false, true]) {
    const card = fixture(detailPage), collapsed = card.render();
    assert.ok(collapsed.includes("admin正文") && collapsed.includes("admin2正文"));
    assert.ok(!collapsed.includes("root正文") && !collapsed.includes("member正文") && !collapsed.includes("child正文"));
    card.click(props => props.className === "guide-post-thread-toggle");
    let expanded;
    for (const id of ["root", "member", "admin", "child"]) expanded = card.click(props => props["aria-label"]?.startsWith(`${id}的留言：`));
    for (const item of chain) assert.equal(expanded.split(`${item.id}正文`).length - 1, 1, item.id);
    assert.ok(expanded.includes("4 条回复，隐藏") && expanded.includes("3 条回复，隐藏"));
    const hidden = card.click(props => props.className === "guide-post-thread-toggle");
    assert.ok(!hidden.includes("root正文") && !hidden.includes("member正文"));
    assert.ok(hidden.includes("admin正文"));
  }
});

function database({ admin = false, metadataFailure = false, profileFailure = false } = {}) {
  const tables = {
    managed_content_pages: [{ id: postId, slug: "guide-fixture", status: "published" }, { id: otherPostId, slug: "guide-other", status: "published" }],
    guide_comments: [], profiles: [{ id: owner, role: admin ? "admin" : "user", display_name: "当前昵称", avatar_url: "/new-avatar.webp" }], user_project_entitlements: [],
  };
  const updates = [], metadata = [];
  const user = { id: owner, user_metadata: { retained: "keep" } };
  class Query {
    filters = []; action = null;
    constructor(table) { this.table = table; }
    select() { return this; }
    eq(key, value) { this.filters.push(row => row[key] === value); return this; }
    like(key, value) { this.filters.push(row => row[key].startsWith(value.replace(/%$/, ""))); return this; }
    in(key, values) { this.filters.push(row => values.includes(row[key])); return this; }
    order() { return this; }
    insert(row) { this.action = { insert: row }; return this; }
    update(row) { this.action = { update: row }; return this; }
    async execute(single) {
      if ((this.table === "user_project_entitlements" && metadataFailure) || (this.table === "profiles" && profileFailure)) return { data: null, error: { code: "unavailable" } };
      let rows = tables[this.table].filter(row => this.filters.every(filter => filter(row)));
      if (this.action?.insert) {
        if (tables[this.table].some(row => row.id === this.action.insert.id)) return { data: null, error: { code: "23505" } };
        const row = { created_at: "2026-10-01T00:00:00Z", ...this.action.insert }; tables[this.table].push(row); rows = [row];
      }
      if (this.action?.update) { for (const row of rows) { Object.assign(row, this.action.update); updates.push({ id: row.id, ...this.action.update }); } }
      return { data: single ? rows[0] ?? null : rows, error: null };
    }
    maybeSingle() { return this.execute(true); }
    single() { return this.execute(true); }
    then(resolve, reject) { return this.execute(false).then(resolve, reject); }
  }
  const db = { from: name => new Query(name), auth: {
    getUser: async token => token === "valid" ? { data: { user }, error: null } : { data: { user: null }, error: { status: 401 } },
    admin: { updateUserById: async (id, value) => { metadata.push({ id, ...value }); return { error: null }; } },
  }, storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: path => ({ data: { publicUrl: `https://fixture.invalid/${path}` } }) }) } };
  return { db, tables, updates, metadata };
}
function routes(fixture, path = "../src/app/api/guide-comments/route.ts") {
  return load(path, { "node:crypto": { createHash, randomUUID }, "@supabase/supabase-js": { createClient: () => fixture.db }, "next/server": { NextResponse: { json: (value, options) => new Response(JSON.stringify(value), options) } }, "@/lib/membership/current-membership": membership, "@/lib/cos/storage": {}, "@/lib/media/url": {} });
}
function request(input, token, origin = "https://fixture.invalid") {
  return { nextUrl: new URL(`https://fixture.invalid/api/guide-comments?postId=${input.postId ?? postId}`), headers: new Headers({ origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) }), json: async () => input };
}
function payload(extra = {}) { return { postId, body: "公开留言", clientId: "local-fixture-0001", displayName: "访客", ...extra }; }

test("a published comment is durable for an independent device; identity and administrator flags come from the server", async () => {
  const fixture = database({ admin: true }), api = routes(fixture);
  const posted = await api.POST(request(payload(), "valid")); assert.equal(posted.status, 200);
  const saved = (await posted.json()).comment; assert.equal(saved.is_admin, true); assert.equal(saved.display_name, "当前昵称");
  const independent = await api.GET(request({ postId }));
  const rows = (await independent.json()).comments;
  assert.equal(rows.length, 1); assert.equal(rows[0].id, saved.id); assert.equal(rows[0].is_admin, true); assert.equal(rows[0].avatar_url, "/new-avatar.webp");
  assert.equal(rows[0].user_id, undefined);
  await api.POST(request(payload(), "valid")); assert.equal(fixture.tables.guide_comments.length, 1, "a network retry must not duplicate the comment");
});

test("guest payloads cannot impersonate admin; invalid credentials, cross-post targets and foreign origins are rejected", async () => {
  const fixture = database({ admin: true }), api = routes(fixture);
  const guest = await api.POST(request(payload({ is_admin: true, user_id: owner, role: "admin" })));
  assert.equal((await guest.json()).comment.is_admin, false);
  assert.equal((await api.POST(request(payload(), "expired"))).status, 401);
  assert.equal((await api.POST(request(payload(), undefined, "https://foreign.invalid"))).status, 403);
  const root = fixture.tables.guide_comments[0];
  const invalid = await api.POST(request(payload({ postId: otherPostId, clientId: "local-wrong-parent", parentCommentId: root.id, replyToCommentId: root.id }), "valid"));
  assert.equal(invalid.status, 400); assert.equal(fixture.tables.guide_comments.length, 1);
});

test("nested replies preserve the original root and the immediate reply target", async () => {
  const fixture = database(), api = routes(fixture);
  const root = (await (await api.POST(request(payload(), "valid"))).json()).comment;
  const child = (await (await api.POST(request(payload({ clientId: "local-child-0002", parentCommentId: root.id, replyToCommentId: root.id }), "valid"))).json()).comment;
  const grandchild = await api.POST(request(payload({ clientId: "local-grandchild-0003", parentCommentId: root.id, replyToCommentId: child.id }), "valid"));
  assert.equal(grandchild.status, 200); const row = (await grandchild.json()).comment;
  assert.equal(row.parent_comment_id, root.id); assert.equal(row.reply_to_comment_id, child.id);
});

test("an optional membership lookup failure does not make public comments disappear", async () => {
  const fixture = database({ metadataFailure: true }), api = routes(fixture);
  const result = await api.POST(request(payload(), "valid")); assert.equal(result.status, 200);
  assert.equal((await (await api.GET(request({ postId }))).json()).comments.length, 1);
});

test("nickname-only updates save the authenticated profile and metadata without requiring a new avatar", async () => {
  const fixture = database(), api = routes(fixture, "../src/app/api/profile-avatar-upload/route.ts");
  const data = new FormData(); data.set("displayName", "  新昵称  "); data.set("userId", "someone-else"); data.set("role", "admin");
  const response = await api.POST({ headers: new Headers({ Authorization: "Bearer valid" }), formData: async () => data });
  assert.equal(response.status, 200); assert.equal((await response.json()).displayName, "新昵称");
  assert.equal(fixture.updates[0].id, owner); assert.equal(fixture.updates[0].display_name, "新昵称"); assert.equal(fixture.updates[0].role, undefined);
  assert.equal(fixture.metadata[0].user_metadata.retained, "keep"); assert.equal(fixture.metadata[0].user_metadata.display_name, "新昵称");
});

test("profile edits require a valid session and enforce nickname and avatar limits", async () => {
  const fixture = database(), api = routes(fixture, "../src/app/api/profile-avatar-upload/route.ts");
  for (const [token, name, size, expected] of [[null, "valid", 0, 401], ["expired", "valid", 0, 401], ["valid", "", 0, 400], ["valid", "x".repeat(31), 0, 400], ["valid", "valid", 2 * 1024 * 1024 + 1, 413]]) {
    const data = new FormData(); data.set("displayName", name); if (size) data.set("file", new File([new Uint8Array(size)], "avatar.png", { type: "image/png" }));
    const response = await api.POST({ headers: new Headers(token ? { Authorization: `Bearer ${token}` } : {}), formData: async () => data });
    assert.equal(response.status, expected);
  }
  assert.equal(fixture.updates.length, 0);
});

test("an avatar-only save uses the authenticated account's storage path and keeps its nickname", async () => {
  const fixture = database(), api = routes(fixture, "../src/app/api/profile-avatar-upload/route.ts");
  const data = new FormData(); data.set("file", new File([new Uint8Array([137, 80, 78, 71])], "avatar.png", { type: "image/png" }));
  const response = await api.POST({ headers: new Headers({ Authorization: "Bearer valid" }), formData: async () => data });
  assert.equal(response.status, 200); const value = await response.json();
  assert.ok(value.avatarUrl.startsWith(`https://fixture.invalid/profiles/${owner}/avatar-`));
  assert.equal(fixture.tables.profiles[0].display_name, "当前昵称");
  assert.equal(fixture.updates[0].id, owner); assert.equal(fixture.metadata[0].user_metadata.avatar_url, value.avatarUrl);
});

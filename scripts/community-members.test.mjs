import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(path, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Date, Map, Intl, process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: "fixture-only" } }, require: name => {
    if (name in modules) return modules[name];
    throw new Error(`Unexpected import ${name}`);
  } });
  return exports;
}
const model = load("../src/lib/community/inbox.ts");
const members = load("../src/lib/payment/granted-members.ts");
const sales = load("../src/lib/payment/membership-sales.ts", { "./granted-members": members });
const now = Date.parse("2026-10-15T10:00:00Z");
const entitlement = (user, extra = {}) => ({ user_id: user, project_key: "bbc", plan: "yearly", status: "active", starts_at: "2026-10-01T00:00:00Z", expires_at: "2027-10-01T00:00:00Z", ...extra });
const comment = (id, user, extra = {}) => ({ id, user_id: user, status: "published", post_id: "page", article_id: "260803", parent_comment_id: null, reply_to_comment_id: null, body: `${id}正文`, display_name: "昵称", author_name: "昵称", created_at: "2026-10-14T00:00:00Z", ...extra });

function database() {
  const tables = {
    managed_content_pages: [{ id: "page", created_by: "other", status: "published", slug: "guide-post", title: "原帖", summary: "摘要", created_at: "2026-10-01T00:00:00Z" }, { id: "mine", created_by: "owner", status: "published", slug: "guide-mine", title: "我发的原帖", summary: "内容", created_at: "2026-10-01T00:00:00Z" }],
    guide_comments: [comment("root", "owner"), comment("child", "owner", { parent_comment_id: "root", reply_to_comment_id: "root" }), comment("reply", "other", { parent_comment_id: "root", reply_to_comment_id: "child" }), comment("guest", null, { parent_comment_id: "root", reply_to_comment_id: "reply" }), comment("mine-reply", "other", { post_id: "mine" }), comment("unrelated", "other")],
    bbc_article_comments: [comment("bbc-root", "owner"), comment("bbc-reply", "other", { parent_comment_id: "bbc-root", reply_to_comment_id: "bbc-root" }), comment("unrelated-bbc", "other")],
    user_project_entitlements: [entitlement("owner"), entitlement("other", { status: "canceled" }), entitlement("owner", { starts_at: "2026-10-02T00:00:00Z", plan: "lifetime", expires_at: "infinity" })],
    access_projects: [{project_key: "bbc", title: "BBC"}, {project_key: "writing", title: "写作"}],
    project_payment_requests: [{id:"sale-1",user_id:"owner",project_key:"bbc",plan:"lifetime",status:"fulfilled",amount_cny:199,fulfilled_at:"2026-10-14T00:00:00Z"}],
    profiles: [{ id: "owner", role: "admin", email: "sensitive12345@example.invalid" }, { id: "other", email: "private98765@example.invalid" }],
  };
  const queries = [], updates = [], user = { id: "owner", user_metadata: { nickname: "保留昵称", [model.COMMUNITY_READ_KEY]: "2026-10-13T00:00:00Z" } };
  let failedTable = "";
  class Query {
    filters = []; fromIndex = 0; toIndex = Infinity;
    constructor(table) { this.table = table; queries.push(table); }
    select() { return this; }
    eq(key, value) { this.filters.push(row => row[key] === value); return this; }
    gt(key, value) { this.filters.push(row => row[key] > value); return this; }
    in(key, values) { this.filters.push(row => values.includes(row[key])); return this; }
    like(key, value) { this.filters.push(row => row[key].startsWith(value.replace(/%$/, ""))); return this; }
    order() { return this; }
    range(from, to) { this.fromIndex = from; this.toIndex = to; return this; }
    maybeSingle() { return this.then(value => ({ ...value, data: value.data?.[0] ?? null })); }
    then(resolve, reject) { return Promise.resolve(this.table === failedTable ? { data: null, error: { code: "unavailable" } } : { data: tables[this.table].filter(row => this.filters.every(fn => fn(row))).slice(this.fromIndex, this.toIndex + 1), error: null }).then(resolve, reject); }
  }
  const client = { from: table => new Query(table), auth: {
    getUser: async token => ({ data: { user: token === "valid" ? user : null }, error: token === "valid" ? null : { status: 401 } }),
    admin: { updateUserById: async (id, data) => { updates.push({ id, data }); Object.assign(user.user_metadata, data.user_metadata); return { error: null }; } },
  } };
  return { tables, client, user, updates, queries, fail: table => failedTable = table };
}
const json = { NextResponse: { json: (body, options) => new Response(JSON.stringify(body), options) } };
function inboxApi(fixture) {
  const server = load("../src/lib/community/inbox-server.ts", { "server-only": {}, "./inbox": model, "@/lib/articles/bbc": { getBbcArticleById: () => ({ title: "BBC 标题" }) } });
  const api = load("../src/app/api/my-community/route.ts", { "next/server": json, "@supabase/supabase-js": { createClient: () => fixture.client }, "@/lib/community/inbox": model, "@/lib/community/inbox-server": server });
  return { api, server };
}
const request = (path = "", token = "valid", body = {}, origin = "https://fixture.invalid") => ({ nextUrl: new URL(`https://fixture.invalid/api/my-community${path}`), headers: new Headers({ ...(token ? { Authorization: `Bearer ${token}` } : {}), origin }), json: async () => body });

test("incoming replies target only this user's original posts or replies; duplicate paths count once and guests count", async () => {
  const fixture = database(), { api } = inboxApi(fixture);
  const response = await api.GET(request("?userId=other")), data = await response.json();
  assert.equal(response.status, 200); assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(data.unread, 4);
  assert.deepEqual(data.incoming.map(row => row.id).sort(), ["bbc-reply", "guest", "mine-reply", "reply"]);
  assert.deepEqual(data.authored.map(row => row.id).sort(), ["bbc-root", "child", "mine", "root"]);
  assert.ok(data.incoming.every(row => !row.href.includes("undefined")));
  assert.ok(!JSON.stringify(data).includes("unrelated"));
});

test("summary returns counts without bodies; pagination retains replies beyond the database page limit", async () => {
  const fixture = database();
  fixture.tables.guide_comments.push(...Array.from({ length: 505 }, (_, i) => comment(`extra-${i}`, "other", { parent_comment_id: "root", reply_to_comment_id: "root" })));
  const response = await inboxApi(fixture).api.GET(request("?summary=1")), data = await response.json();
  assert.equal(data.unread, 509); assert.equal(data.incoming, undefined); assert.equal(data.authored, undefined); assert.ok(!JSON.stringify(data).includes("正文"));
});

test("unpublished parent pages and their replies stay out of personal feeds", async () => {
  const fixture = database(); fixture.tables.managed_content_pages[0].status = "draft";
  const data = await (await inboxApi(fixture).api.GET(request())).json();
  assert.equal(data.unread, 2); assert.ok(!data.authored.some(row => row.id === "root"));
});

test("authentication and origin checks protect feeds and read state; query or body owner IDs cannot select another account", async () => {
  const fixture = database(), { api } = inboxApi(fixture);
  for (const token of [null, "expired"]) { assert.equal((await api.GET(request("", token))).status, 401); assert.equal((await api.POST(request("", token))).status, 401); }
  assert.equal((await api.POST(request("", "valid", { until: "2026-10-14T00:00:00Z" }, "https://foreign.invalid"))).status, 403);
  assert.equal((await api.POST(request("", "valid", { until: "bad" }))).status, 400);
  const saved = await api.POST(request("", "valid", { until: "2026-10-14T00:00:00Z", userId: "other", role: "admin" }));
  assert.equal(saved.status, 200); assert.equal(fixture.updates[0].id, "owner"); assert.equal(fixture.user.user_metadata.nickname, "保留昵称");
  const independentDevice = await (await api.GET(request("?summary=1"))).json(); assert.equal(independentDevice.unread, 0);
  await api.POST(request("", "valid", { until: "2026-10-01T00:00:00Z" }));
  assert.equal(fixture.user.user_metadata[model.COMMUNITY_READ_KEY], "2026-10-14T00:00:00.000Z");
});

test("a new reply after the displayed snapshot remains unread on another device", async () => {
  const fixture = database(), { api } = inboxApi(fixture);
  const first = await (await api.GET(request())).json();
  fixture.tables.guide_comments.push(comment("new-arrival", "other", { parent_comment_id: "root", reply_to_comment_id: "root", created_at: "2026-10-15T00:00:00Z" }));
  await api.POST(request("", "valid", { until: first.latestReplyAt }));
  assert.equal((await (await api.GET(request("?summary=1"))).json()).unread, 1);
});

test("read errors stay visible instead of being reported as an empty inbox", async () => {
  const fixture = database(); fixture.fail("bbc_article_comments");
  assert.equal((await inboxApi(fixture).api.GET(request())).status, 503);
});

test("membership roster counts currently granted BBC users once, includes manual grants, and excludes canceled, expired and future access", () => {
  const rows = [entitlement("year"), entitlement("month", { plan: "monthly" }), entitlement("quarter", { plan: "quarterly" }), entitlement("life", { plan: "lifetime", expires_at: "infinity" }), entitlement("year", { starts_at: "2026-10-02T00:00:00Z", plan: "lifetime", expires_at: "+infinity" }), entitlement("cancel", { status: "canceled" }), entitlement("past", { expires_at: "2026-10-14T00:00:00Z" }), entitlement("future", { starts_at: "2026-10-20T00:00:00Z" }), entitlement("other-project", { project_key: "writing" })];
  const publicRows = members.publicBbcMembers(rows, new Map(rows.map(row => [row.user_id, "ABCprivate45@example.invalid"])), now);
  assert.equal(publicRows.length, 4); assert.equal(publicRows[0].plan, "终身会员"); assert.equal(publicRows[0].startedAt, "2026-10-02");
  assert.ok(publicRows.every(row => row.maskedAccount === "***45"));
  const serialized = JSON.stringify(publicRows); assert.ok(!serialized.includes("private") && !serialized.includes("example") && !serialized.includes("user_id"));
  assert.equal(members.maskMemberAccount("ab@domain.invalid"), "***");
});

test("public roster reads entitlement records only and removes revoked members on the next request", async () => {
  const fixture = database();
  const api = load("../src/app/api/bbc-members/route.ts", { "next/server": json, "@supabase/supabase-js": { createClient: () => fixture.client }, "@/lib/payment/granted-members": members });
  const response = await api.GET(request()), data = await response.json();
  assert.equal(data.total, 1); assert.equal(data.members[0].maskedAccount, "***45"); assert.equal(data.members[0].plan, "终身会员");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.ok(!fixture.queries.includes("project_payment_requests"));
  assert.ok(!JSON.stringify(data).includes("sensitive"));
  fixture.tables.user_project_entitlements.forEach(row => row.status = "canceled");
  assert.equal((await (await api.GET(request())).json()).total, 0);
  fixture.fail("user_project_entitlements"); assert.equal((await api.GET(request())).status, 503);
});


test("admin report retains manually granted memberships with blank purchase fields and counts distinct users across projects", () => {
  const grants = [{...entitlement("owner"),id:"bbc-grant"},{...entitlement("owner", {project_key:"writing"}),id:"writing-grant"},{...entitlement("manual"),id:"manual-grant"},{...entitlement("canceled",{status:"canceled"}),id:"canceled-grant"}];
  const orders = [{id:"confirmed",user_id:"owner",project_key:"bbc",plan:"yearly",status:"fulfilled",amount_cny:"69.95",fulfilled_at:"2026-10-13T16:30:00Z"},{id:"pending",user_id:"manual",project_key:"bbc",plan:"yearly",status:"pending",amount_cny:999,fulfilled_at:null}];
  const report=sales.buildMembershipSalesReport(grants,[...orders,orders[0]], [{id:"owner",email:"owner@example.invalid",display_name:"昵称"}], [{project_key:"bbc",title:"BBC"},{project_key:"writing",title:"写作"}], now);
  assert.equal(report.totalMembers,2); assert.equal(report.totalQualifications,3); assert.equal(report.totalSalesCny,69.95);
  assert.equal(report.members.find(row=>row.id==="bbc-grant").priceCny,69.95);
  for(const id of ["manual-grant","writing-grant"]){ const row=report.members.find(row=>row.id===id);assert.equal(row.priceCny,null);assert.equal(row.purchasedAt,null); }
  assert.ok(!report.members.some(row=>row.id==="canceled-grant"));
});

test("sales charts use China dates, zero-fill gaps, and group real confirmed sales by day, month, quarter and year", () => {
  const order=(id,date,amount,status="fulfilled")=>({id,user_id:"owner",project_key:"bbc",plan:"yearly",status,amount_cny:amount,fulfilled_at:date});
  const orders=[order("a","2026-09-30T16:30:00Z",10.1),order("b","2026-10-01T01:00:00Z",20.2),order("c","2026-10-13T16:30:00Z",69.7),order("pending","2026-10-14T00:00:00Z",999,"pending"),order("future","2026-10-20T00:00:00Z",999)];
  const day=sales.buildSalesSeries(orders,"day",now),month=sales.buildSalesSeries(orders,"month",now),quarter=sales.buildSalesSeries(orders,"quarter",now),year=sales.buildSalesSeries(orders,"year",now);
  assert.equal(day.length,30);assert.equal(month.length,12);assert.equal(quarter.length,8);assert.equal(year.length,5);
  assert.equal(day.find(p=>p.label==="2026-10-01").amountCny,30.3); assert.equal(day.find(p=>p.label==="2026-10-14").amountCny,69.7);
  assert.equal(month.at(-1).amountCny,100);assert.equal(quarter.at(-1).label,"2026-Q4"); assert.equal(quarter.at(-1).amountCny,100);assert.equal(year.at(-1).amountCny,100);
  assert.equal(day.at(-1).amountCny,0);
});

test("admin sales endpoint rejects visitors and ordinary accounts and returns private no-store data only to verified admins", async () => {
  const fixture=database();
  const api=load("../src/app/api/admin/membership-sales/route.ts",{"next/server":json,"@supabase/supabase-js":{createClient:()=>fixture.client},"@/lib/payment/membership-sales":sales});
  assert.equal((await api.GET(request("",null))).status,401);
  assert.equal((await api.GET(request("","expired"))).status,401);
  fixture.tables.profiles[0].role="student"; assert.equal((await api.GET(request())).status,403);
  fixture.tables.profiles[0].role="admin"; const response=await api.GET(request()),report=await response.json();
  assert.equal(response.status,200);assert.equal(report.totalMembers,1);assert.equal(report.totalSalesCny,199);assert.equal(report.members[0].priceCny,199);assert.equal(response.headers.get("Cache-Control"),"private, no-store");
  fixture.fail("project_payment_requests");assert.equal((await api.GET(request())).status,503);
});

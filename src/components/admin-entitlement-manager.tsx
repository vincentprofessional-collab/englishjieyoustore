"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  formatProjectPrice,
  PROJECT_ACCESS_PLANS,
  PROJECT_ACCESS_PROJECTS,
  type ProjectAccessPlan,
} from "@/lib/access-control";
import { supabase } from "@/lib/supabase/client";

type ProfileRow = {
  created_at: string | null;
  display_name: string | null;
  email: string | null;
  id: string;
  role: "student" | "admin";
};

type EntitlementRow = {
  created_at: string | null;
  expires_at: string;
  id: string;
  plan: ProjectAccessPlan;
  project_key: string;
  starts_at: string;
  status: "active" | "canceled" | "expired";
  user_id: string;
};

type PaymentRequestRow = {
  amount_cny: number | string;
  created_at: string | null;
  id: string;
  order_no: string;
  plan: ProjectAccessPlan;
  project_key: string;
  status: "pending" | "fulfilled" | "canceled";
  user_email: string;
  user_id: string;
};

type AccessProjectRow = {
  description: string | null;
  gate_title: string | null;
  is_enabled: boolean;
  project_key: string;
  short_title: string | null;
  sort_order: number;
  title: string;
};

type AccessProjectPlanRow = {
  duration_label: string;
  is_enabled: boolean;
  label: string;
  plan: ProjectAccessPlan;
  price_cny: number | string;
  project_key: string;
  sort_order: number;
};

type CatalogDraft = {
  description: string;
  gateTitle: string;
  isEnabled: boolean;
  planEnabled: Record<ProjectAccessPlan, boolean>;
  planPrices: Record<ProjectAccessPlan, number>;
  projectKey: string;
  shortTitle: string;
  sortOrder: number;
  title: string;
};

const PLAN_ORDER: ProjectAccessPlan[] = ["monthly", "quarterly", "yearly", "lifetime"];

function createDefaultPrices() {
  return Object.fromEntries(PROJECT_ACCESS_PLANS.map((plan) => [plan.plan, plan.priceCny])) as Record<
    ProjectAccessPlan,
    number
  >;
}

function createDefaultPlanEnabled() {
  return Object.fromEntries(PROJECT_ACCESS_PLANS.map((plan) => [plan.plan, true])) as Record<
    ProjectAccessPlan,
    boolean
  >;
}

function createEmptyCatalogDraft(): CatalogDraft {
  return {
    description: "",
    gateTitle: "",
    isEnabled: true,
    planEnabled: createDefaultPlanEnabled(),
    planPrices: createDefaultPrices(),
    projectKey: "",
    shortTitle: "",
    sortOrder: 50,
    title: "",
  };
}

function createFallbackProjects(): AccessProjectRow[] {
  return PROJECT_ACCESS_PROJECTS.map((project, index) => ({
    description: project.description || null,
    gate_title: project.gateTitle ?? null,
    is_enabled: true,
    project_key: project.key,
    short_title: project.shortTitle,
    sort_order: (index + 1) * 10,
    title: project.title,
  }));
}

function createFallbackPlans(projects: AccessProjectRow[]): AccessProjectPlanRow[] {
  return projects.flatMap((project) =>
    PROJECT_ACCESS_PLANS.map((plan, index) => ({
      duration_label: plan.durationLabel,
      is_enabled: true,
      label: plan.label,
      plan: plan.plan,
      price_cny: plan.priceCny,
      project_key: project.project_key,
      sort_order: (index + 1) * 10,
    })),
  );
}

function createCatalogDraft(project: AccessProjectRow, plans: AccessProjectPlanRow[]): CatalogDraft {
  const planPrices = createDefaultPrices();
  const planEnabled = createDefaultPlanEnabled();

  for (const plan of plans) {
    if (plan.project_key === project.project_key) {
      planPrices[plan.plan] = Number(plan.price_cny);
      planEnabled[plan.plan] = plan.is_enabled;
    }
  }

  return {
    description: project.description ?? "",
    gateTitle: project.gate_title ?? "",
    isEnabled: project.is_enabled,
    planEnabled,
    planPrices,
    projectKey: project.project_key,
    shortTitle: project.short_title ?? project.title,
    sortOrder: project.sort_order,
    title: project.title,
  };
}

function formatDateTime(value: string | null) {
  if (!value) return "暂无";
  if (value === "infinity" || value.startsWith("9999-")) return "永久";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function isActiveEntitlement(entitlement: EntitlementRow) {
  if (entitlement.status !== "active") return false;
  if (entitlement.plan === "lifetime" || entitlement.expires_at === "infinity") return true;
  return new Date(entitlement.expires_at).getTime() > Date.now();
}

function getUserLabel(profile: ProfileRow) {
  return profile.email ?? profile.display_name ?? profile.id;
}

export function AdminEntitlementManager() {
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestRow[]>([]);
  const [accessProjects, setAccessProjects] = useState<AccessProjectRow[]>([]);
  const [accessProjectPlans, setAccessProjectPlans] = useState<AccessProjectPlanRow[]>([]);
  const [catalogDrafts, setCatalogDrafts] = useState<Record<string, CatalogDraft>>({});
  const [newCatalogDraft, setNewCatalogDraft] = useState<CatalogDraft>(createEmptyCatalogDraft);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedProjectKey, setSelectedProjectKey] = useState("speaking");
  const [selectedPlan, setSelectedPlan] = useState<ProjectAccessPlan>("monthly");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const entitlementByUserId = useMemo(() => {
    const groupedEntitlements = new Map<string, EntitlementRow[]>();

    for (const entitlement of entitlements) {
      const current = groupedEntitlements.get(entitlement.user_id) ?? [];
      current.push(entitlement);
      groupedEntitlements.set(entitlement.user_id, current);
    }

    return groupedEntitlements;
  }, [entitlements]);

  const selectedProjectPlans = useMemo(
    () =>
      accessProjectPlans
        .filter((plan) => plan.project_key === selectedProjectKey && plan.is_enabled)
        .sort((left, right) => left.sort_order - right.sort_order),
    [accessProjectPlans, selectedProjectKey],
  );

  useEffect(() => {
    void loadAccessData();
  }, []);

  useEffect(() => {
    if (selectedProjectPlans.length && !selectedProjectPlans.some((plan) => plan.plan === selectedPlan)) {
      setSelectedPlan(selectedProjectPlans[0].plan);
    }
  }, [selectedPlan, selectedProjectPlans]);

  async function loadAccessData() {
    setIsLoading(true);
    setMessage("");

    const [usersResult, entitlementsResult, paymentRequestsResult, projectsResult, plansResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,display_name,role,created_at")
        .neq("role", "admin")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("user_project_entitlements")
        .select("id,user_id,project_key,plan,status,starts_at,expires_at,created_at")
        .order("expires_at", { ascending: false })
        .limit(1000),
      supabase
        .from("project_payment_requests")
        .select("id,order_no,user_id,user_email,project_key,plan,amount_cny,status,created_at")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("access_projects")
        .select("project_key,title,short_title,gate_title,description,is_enabled,sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("access_project_plans")
        .select("project_key,plan,label,duration_label,price_cny,is_enabled,sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    if (usersResult.error) {
      setMessage("无法读取用户：" + usersResult.error.message);
      setIsLoading(false);
      return;
    }

    const nextUsers = (usersResult.data ?? []) as ProfileRow[];
    setUsers(nextUsers);
    setEntitlements((entitlementsResult.data ?? []) as EntitlementRow[]);
    setPaymentRequests((paymentRequestsResult.data ?? []) as PaymentRequestRow[]);

    const catalogUnavailable = Boolean(projectsResult.error || plansResult.error);
    const nextProjects = catalogUnavailable
      ? createFallbackProjects()
      : ((projectsResult.data ?? []) as AccessProjectRow[]);
    const nextPlans = catalogUnavailable
      ? createFallbackPlans(nextProjects)
      : ((plansResult.data ?? []) as AccessProjectPlanRow[]);

    setAccessProjects(nextProjects);
    setAccessProjectPlans(nextPlans);
    setCatalogDrafts(
      Object.fromEntries(nextProjects.map((project) => [project.project_key, createCatalogDraft(project, nextPlans)])),
    );

    const enabledProjects = nextProjects.filter((project) => project.is_enabled);
    if (!enabledProjects.some((project) => project.project_key === selectedProjectKey) && enabledProjects[0]) {
      setSelectedProjectKey(enabledProjects[0].project_key);
    }
    if (!selectedUserId && nextUsers[0]) setSelectedUserId(nextUsers[0].id);

    if (entitlementsResult.error) {
      setMessage(
        entitlementsResult.error.message.includes("user_project_entitlements")
          ? "项目权限表还没有创建。请先执行 supabase/006_project_entitlements.sql。"
          : "无法读取项目权限：" + entitlementsResult.error.message,
      );
    } else if (paymentRequestsResult.error) {
      setMessage(
        paymentRequestsResult.error.message.includes("project_payment_requests")
          ? "付款申请表还没有创建。请先执行 supabase/010_project_payment_requests.sql。"
          : "无法读取付款申请：" + paymentRequestsResult.error.message,
      );
    } else if (catalogUnavailable) {
      setMessage("项目价格配置尚未启用。请先执行 supabase/012_access_project_catalog_pricing.sql。");
    }

    setIsLoading(false);
  }

  function getProjectLabel(projectKey: string) {
    const project = accessProjects.find((item) => item.project_key === projectKey);
    return project?.short_title || project?.title || projectKey;
  }

  function getPlanLabel(projectKey: string, plan: ProjectAccessPlan) {
    const projectPlan = accessProjectPlans.find(
      (item) => item.project_key === projectKey && item.plan === plan,
    );
    return projectPlan?.label ?? PROJECT_ACCESS_PLANS.find((item) => item.plan === plan)?.label ?? plan;
  }

  function updateCatalogDraft(projectKey: string, patch: Partial<CatalogDraft>) {
    setCatalogDrafts((current) => ({
      ...current,
      [projectKey]: { ...current[projectKey], ...patch },
    }));
  }

  function updateCatalogPrice(projectKey: string, plan: ProjectAccessPlan, value: number) {
    const draft = catalogDrafts[projectKey];
    if (!draft) return;
    updateCatalogDraft(projectKey, { planPrices: { ...draft.planPrices, [plan]: value } });
  }

  function updateCatalogPlanEnabled(projectKey: string, plan: ProjectAccessPlan, isEnabled: boolean) {
    const draft = catalogDrafts[projectKey];
    if (!draft) return;
    updateCatalogDraft(projectKey, {
      planEnabled: { ...draft.planEnabled, [plan]: isEnabled },
    });
  }

  function validateCatalogDraft(draft: CatalogDraft) {
    if (!/^[a-z0-9]+([._-][a-z0-9]+)*$/.test(draft.projectKey.trim().toLowerCase())) {
      return "项目标识只能使用小写字母、数字、点、横线或下划线。";
    }
    if (!draft.title.trim()) return "请填写项目名称。";
    if (PLAN_ORDER.some((plan) => !Number.isFinite(draft.planPrices[plan]) || draft.planPrices[plan] < 0)) {
      return "价格必须是大于或等于 0 的数字。";
    }
    return "";
  }

  async function saveCatalogProject(draft: CatalogDraft, isNew: boolean) {
    const validationMessage = validateCatalogDraft(draft);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    const projectKey = draft.projectKey.trim().toLowerCase();
    if (isNew && accessProjects.some((project) => project.project_key === projectKey)) {
      setMessage("该项目标识已经存在，请直接修改已有项目。");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { error } = await supabase.rpc("admin_upsert_access_project", {
      _description: draft.description.trim() || null,
      _gate_title: draft.gateTitle.trim() || null,
      _is_enabled: draft.isEnabled,
      _plans: PROJECT_ACCESS_PLANS.map((plan, index) => ({
        duration_label: plan.durationLabel,
        is_enabled: draft.planEnabled[plan.plan],
        label: plan.label,
        plan: plan.plan,
        price_cny: draft.planPrices[plan.plan],
        sort_order: (index + 1) * 10,
      })),
      _project_key: projectKey,
      _short_title: draft.shortTitle.trim() || draft.title.trim(),
      _sort_order: draft.sortOrder,
      _title: draft.title.trim(),
    });

    if (error) {
      setMessage(
        error.message.includes("admin_upsert_access_project")
          ? "保存接口尚未启用。请先执行 supabase/012_access_project_catalog_pricing.sql。"
          : "保存失败：" + error.message,
      );
      setIsSaving(false);
      return;
    }

    await loadAccessData();
    if (isNew) setNewCatalogDraft(createEmptyCatalogDraft());
    setMessage(isNew ? "单项已增加，价格已同步到前台。" : "项目内容与价格已保存。");
    setIsSaving(false);
  }

  async function grantAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUserId) {
      setMessage("请先选择用户。");
      return;
    }

    setIsSaving(true);
    setMessage("");
    const { error } = await supabase.rpc("grant_project_access", {
      _plan: selectedPlan,
      _project_key: selectedProjectKey,
      _user_id: selectedUserId,
    });

    if (error) {
      setMessage("开通失败：" + error.message);
      setIsSaving(false);
      return;
    }

    await loadAccessData();
    setMessage("项目权限已开通。");
    setIsSaving(false);
  }

  async function cancelAccess(entitlementId: string) {
    setIsSaving(true);
    setMessage("");
    const { error } = await supabase.rpc("cancel_project_access", { _entitlement_id: entitlementId });

    if (error) {
      setMessage("取消失败：" + error.message);
      setIsSaving(false);
      return;
    }

    await loadAccessData();
    setMessage("项目权限已取消。");
    setIsSaving(false);
  }

  async function fulfillPaymentRequest(requestId: string) {
    setIsSaving(true);
    setMessage("");
    const { error } = await supabase.rpc("fulfill_project_payment_request", { _request_id: requestId });

    if (error) {
      setMessage("确认失败：" + error.message);
      setIsSaving(false);
      return;
    }

    await loadAccessData();
    setMessage("已确认付款并开通项目权限。");
    setIsSaving(false);
  }

  const pendingPaymentRequests = paymentRequests.filter((request) => request.status === "pending");
  const enabledProjects = accessProjects.filter((project) => project.is_enabled);

  return (
    <section className="admin-entitlement-manager">
      <header className="admin-editor-heading">
        <div>
          <span>Project access</span>
          <h2>项目开通</h2>
        </div>
        <button className="button secondary" disabled={isLoading} type="button" onClick={loadAccessData}>
          {isLoading ? "刷新中..." : "刷新数据"}
        </button>
      </header>

      {message ? <p className="admin-form-message">{message}</p> : null}

      <section className="admin-editor-card admin-access-catalog">
        <header className="admin-compact-heading">
          <div>
            <h3>网站单项与价格</h3>
            <p>每个周期可单独启用；修改后，用户购买页和开通 / 续期会自动使用最新配置。</p>
          </div>
          <span>{accessProjects.length} 个单项</span>
        </header>

        <div className="admin-access-catalog-list">
          {accessProjects.map((project) => {
            const draft = catalogDrafts[project.project_key];
            if (!draft) return null;

            return (
              <article className="admin-access-catalog-item" key={project.project_key}>
                <header>
                  <div>
                    <strong>{draft.title || project.project_key}</strong>
                    <code>{project.project_key}</code>
                  </div>
                  <label className="admin-access-toggle">
                    <input
                      checked={draft.isEnabled}
                      type="checkbox"
                      onChange={(event) => updateCatalogDraft(project.project_key, { isEnabled: event.target.checked })}
                    />
                    <span>启用</span>
                  </label>
                </header>

                <div className="admin-access-field-grid">
                  <label>
                    <span>项目名称</span>
                    <input
                      value={draft.title}
                      onChange={(event) => updateCatalogDraft(project.project_key, { title: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>简称</span>
                    <input
                      value={draft.shortTitle}
                      onChange={(event) => updateCatalogDraft(project.project_key, { shortTitle: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>购买页标题（可选）</span>
                    <input
                      value={draft.gateTitle}
                      onChange={(event) => updateCatalogDraft(project.project_key, { gateTitle: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>排序</span>
                    <input
                      min="0"
                      type="number"
                      value={draft.sortOrder}
                      onChange={(event) =>
                        updateCatalogDraft(project.project_key, { sortOrder: Number(event.target.value) })
                      }
                    />
                  </label>
                </div>

                <label className="admin-access-description">
                  <span>内容说明</span>
                  <textarea
                    rows={2}
                    value={draft.description}
                    onChange={(event) => updateCatalogDraft(project.project_key, { description: event.target.value })}
                  />
                </label>

                <div className="admin-access-price-grid">
                  {PROJECT_ACCESS_PLANS.map((plan) => (
                    <label key={plan.plan}>
                      <span className="admin-access-plan-heading">
                        <input
                          checked={draft.planEnabled[plan.plan]}
                          className="admin-access-plan-toggle"
                          type="checkbox"
                          onChange={(event) =>
                            updateCatalogPlanEnabled(project.project_key, plan.plan, event.target.checked)
                          }
                        />
                        {plan.label}
                      </span>
                      <div>
                        <input
                          min="0"
                          step="0.01"
                          type="number"
                          value={draft.planPrices[plan.plan]}
                          onChange={(event) =>
                            updateCatalogPrice(project.project_key, plan.plan, Number(event.target.value))
                          }
                        />
                        <em>元</em>
                      </div>
                      <small>{plan.durationLabel}</small>
                    </label>
                  ))}
                </div>

                <div className="admin-access-actions">
                  <button
                    className="button primary"
                    disabled={isSaving}
                    type="button"
                    onClick={() => void saveCatalogProject(draft, false)}
                  >
                    {isSaving ? "保存中..." : "保存内容与价格"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <form
          className="admin-access-catalog-item admin-access-new-item"
          onSubmit={(event) => {
            event.preventDefault();
            void saveCatalogProject(newCatalogDraft, true);
          }}
        >
          <header>
            <div>
              <strong>增加网站单项</strong>
              <small>创建后可以像现有项目一样单独定价和开通。</small>
            </div>
            <label className="admin-access-toggle">
              <input
                checked={newCatalogDraft.isEnabled}
                type="checkbox"
                onChange={(event) => setNewCatalogDraft((draft) => ({ ...draft, isEnabled: event.target.checked }))}
              />
              <span>启用</span>
            </label>
          </header>

          <div className="admin-access-field-grid">
            <label>
              <span>项目标识</span>
              <input
                placeholder="例如：reading"
                value={newCatalogDraft.projectKey}
                onChange={(event) =>
                  setNewCatalogDraft((draft) => ({ ...draft, projectKey: event.target.value.toLowerCase() }))
                }
              />
            </label>
            <label>
              <span>项目名称</span>
              <input
                value={newCatalogDraft.title}
                onChange={(event) => setNewCatalogDraft((draft) => ({ ...draft, title: event.target.value }))}
              />
            </label>
            <label>
              <span>简称</span>
              <input
                value={newCatalogDraft.shortTitle}
                onChange={(event) => setNewCatalogDraft((draft) => ({ ...draft, shortTitle: event.target.value }))}
              />
            </label>
            <label>
              <span>购买页标题（可选）</span>
              <input
                value={newCatalogDraft.gateTitle}
                onChange={(event) => setNewCatalogDraft((draft) => ({ ...draft, gateTitle: event.target.value }))}
              />
            </label>
          </div>

          <label className="admin-access-description">
            <span>内容说明</span>
            <textarea
              rows={2}
              value={newCatalogDraft.description}
              onChange={(event) => setNewCatalogDraft((draft) => ({ ...draft, description: event.target.value }))}
            />
          </label>

          <div className="admin-access-price-grid">
            {PROJECT_ACCESS_PLANS.map((plan) => (
              <label key={plan.plan}>
                <span className="admin-access-plan-heading">
                  <input
                    checked={newCatalogDraft.planEnabled[plan.plan]}
                    className="admin-access-plan-toggle"
                    type="checkbox"
                    onChange={(event) =>
                      setNewCatalogDraft((draft) => ({
                        ...draft,
                        planEnabled: { ...draft.planEnabled, [plan.plan]: event.target.checked },
                      }))
                    }
                  />
                  {plan.label}
                </span>
                <div>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={newCatalogDraft.planPrices[plan.plan]}
                    onChange={(event) =>
                      setNewCatalogDraft((draft) => ({
                        ...draft,
                        planPrices: { ...draft.planPrices, [plan.plan]: Number(event.target.value) },
                      }))
                    }
                  />
                  <em>元</em>
                </div>
                <small>{plan.durationLabel}</small>
              </label>
            ))}
          </div>

          <div className="admin-access-actions">
            <button className="button primary" disabled={isSaving} type="submit">
              {isSaving ? "增加中..." : "增加单项"}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-editor-card admin-payment-request-list">
        <header className="admin-compact-heading">
          <h3>待付款申请</h3>
          <span>{pendingPaymentRequests.length} 条</span>
        </header>

        {pendingPaymentRequests.length ? (
          <div className="admin-payment-requests">
            {pendingPaymentRequests.map((request) => (
              <article key={request.id}>
                <div>
                  <strong>{request.order_no}</strong>
                  <span>{request.user_email}</span>
                </div>
                <small>
                  {getProjectLabel(request.project_key)} · {getPlanLabel(request.project_key, request.plan)} ·{" "}
                  {formatProjectPrice(Number(request.amount_cny))}
                </small>
                <time>{formatDateTime(request.created_at)}</time>
                <button
                  className="button primary"
                  disabled={isSaving}
                  type="button"
                  onClick={() => void fulfillPaymentRequest(request.id)}
                >
                  确认开通
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-empty-text">暂无待付款申请。</p>
        )}
      </section>

      <form className="admin-editor-card admin-entitlement-form" onSubmit={grantAccess}>
        <label>
          <span>用户</span>
          <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {getUserLabel(user)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>项目</span>
          <select value={selectedProjectKey} onChange={(event) => setSelectedProjectKey(event.target.value)}>
            {enabledProjects.map((project) => (
              <option key={project.project_key} value={project.project_key}>
                {project.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>周期</span>
          <select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value as ProjectAccessPlan)}>
            {selectedProjectPlans.map((plan) => (
              <option key={plan.plan} value={plan.plan}>
                {plan.label} · {formatProjectPrice(Number(plan.price_cny))} · {plan.duration_label}
              </option>
            ))}
          </select>
        </label>

        <button
          className="button primary"
          disabled={isSaving || users.length === 0 || !selectedProjectPlans.length}
          type="submit"
        >
          {isSaving ? "处理中..." : "开通 / 续期"}
        </button>
      </form>

      <section className="admin-editor-card admin-entitlement-table">
        <header className="admin-compact-heading">
          <h3>用户项目权限</h3>
          <span>{users.length} 个用户</span>
        </header>

        <div className="admin-table">
          {users.map((user) => {
            const userEntitlements = entitlementByUserId.get(user.id) ?? [];
            const activeEntitlements = userEntitlements.filter(isActiveEntitlement);

            return (
              <div className="admin-entitlement-row" key={user.id}>
                <span>{getUserLabel(user)}</span>
                <small>
                  {activeEntitlements.length
                    ? activeEntitlements.map((entitlement) => getProjectLabel(entitlement.project_key)).join(" / ")
                    : "未开通项目"}
                </small>
                <div className="admin-entitlement-list">
                  {userEntitlements.length ? (
                    userEntitlements.map((entitlement) => {
                      const isActive = isActiveEntitlement(entitlement);

                      return (
                        <article className={isActive ? "active" : ""} key={entitlement.id}>
                          <strong>{getProjectLabel(entitlement.project_key)}</strong>
                          <span>{getPlanLabel(entitlement.project_key, entitlement.plan)}</span>
                          <small>{formatDateTime(entitlement.expires_at)}</small>
                          {isActive ? (
                            <button
                              className="button subtle"
                              disabled={isSaving}
                              type="button"
                              onClick={() => void cancelAccess(entitlement.id)}
                            >
                              取消
                            </button>
                          ) : null}
                        </article>
                      );
                    })
                  ) : (
                    <em>暂无记录</em>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}

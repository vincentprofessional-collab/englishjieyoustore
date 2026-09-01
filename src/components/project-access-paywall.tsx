"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatProjectPrice,
  PROJECT_ACCESS_PLANS,
  getProjectAccessRule,
  type ProjectAccessKey,
  type ProjectAccessPlan,
  type ProjectAccessPlanOption,
  type ProjectAccessRule,
} from "@/lib/access-control";
import { supabase } from "@/lib/supabase/client";

type ProjectAccessPaywallProps = {
  description?: string;
  projectKey: ProjectAccessKey;
  title?: string;
};

type PaymentRequest = {
  amount_cny: number | string;
  order_no: string;
};

type ProjectRow = {
  description: string | null;
  gate_title: string | null;
  project_key: string;
  short_title: string | null;
  title: string;
};

type ProjectPlanRow = {
  duration_label: string;
  label: string;
  plan: ProjectAccessPlan;
  price_cny: number | string;
};

export function ProjectAccessPaywall({
  description,
  projectKey,
  title,
}: ProjectAccessPaywallProps) {
  const fallbackProject = getProjectAccessRule(projectKey);
  const [project, setProject] = useState<ProjectAccessRule>(fallbackProject);
  const [plans, setPlans] = useState<ProjectAccessPlanOption[]>(PROJECT_ACCESS_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<ProjectAccessPlan>("monthly");
  const selectedPlanOption = plans.find((plan) => plan.plan === selectedPlan) ?? plans[0];
  const [showPaymentCode, setShowPaymentCode] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const loginHref = currentPath ? "/login?redirect=" + encodeURIComponent(currentPath) : "/login";

  useEffect(() => {
    setCurrentPath(window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const nextFallbackProject = getProjectAccessRule(projectKey);
    setProject(nextFallbackProject);
    setPlans(PROJECT_ACCESS_PLANS);

    async function loadCatalog() {
      const [projectResult, plansResult] = await Promise.all([
        supabase
          .from("access_projects")
          .select("project_key,title,short_title,gate_title,description")
          .eq("project_key", projectKey)
          .eq("is_enabled", true)
          .maybeSingle(),
        supabase
          .from("access_project_plans")
          .select("plan,label,duration_label,price_cny")
          .eq("project_key", projectKey)
          .eq("is_enabled", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (!isMounted) return;

      if (!projectResult.error && projectResult.data) {
        const row = projectResult.data as ProjectRow;
        setProject({
          description: row.description ?? "",
          gateTitle: row.gate_title ?? undefined,
          key: row.project_key,
          shortTitle: row.short_title ?? row.title,
          title: row.title,
        });
      }

      if (!plansResult.error && plansResult.data?.length) {
        const nextPlans = (plansResult.data as ProjectPlanRow[]).map((plan) => {
          const priceCny = Number(plan.price_cny);
          return {
            durationLabel: plan.duration_label,
            label: plan.label,
            plan: plan.plan,
            priceCny,
            priceLabel: formatProjectPrice(priceCny),
          };
        });
        setPlans(nextPlans);
        setSelectedPlan((current) =>
          nextPlans.some((plan) => plan.plan === current) ? current : nextPlans[0].plan,
        );
      }
    }

    void loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [projectKey]);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) setUserEmail(session?.user.email ?? "");
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setUserEmail(session?.user.email ?? "");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function selectPlan(plan: ProjectAccessPlan) {
    setSelectedPlan(plan);
    setShowPaymentCode(false);
    setPaymentMessage("");
    setPaymentRequest(null);
  }

  async function createPaymentRequest() {
    if (!userEmail || !selectedPlanOption) return;

    setIsCreatingPayment(true);
    setPaymentMessage("");

    const { data, error } = await supabase.rpc("create_project_payment_request", {
      _plan: selectedPlan,
      _project_key: projectKey,
    });

    if (error || !data) {
      setPaymentMessage(error?.message ? "生成付款申请失败：" + error.message : "生成付款申请失败，请稍后重试。");
      setIsCreatingPayment(false);
      return;
    }

    setPaymentRequest(data as PaymentRequest);
    setShowPaymentCode(true);
    setIsCreatingPayment(false);
  }

  return (
    <section className="project-access-gate" aria-label={project.shortTitle + "付费内容"}>
      <div className="project-access-gate-copy">
        <span>PROJECT ACCESS</span>
        <h2>{title ?? project.gateTitle ?? project.title + "需要单独开通"}</h2>
        {description ?? project.description ? <p>{description ?? project.description}</p> : null}
      </div>

      <div className="project-access-plan-list" aria-label="可开通周期">
        {plans.map((plan) => (
          <button
            aria-pressed={selectedPlan === plan.plan}
            className={"project-access-plan " + (selectedPlan === plan.plan ? "selected" : "")}
            key={plan.plan}
            onClick={() => selectPlan(plan.plan)}
            type="button"
          >
            <strong>
              {plan.label} {plan.durationLabel} {plan.priceLabel}
            </strong>
          </button>
        ))}
      </div>

      <div className="project-access-actions">
        {userEmail ? (
          <button
            className="button primary"
            disabled={isCreatingPayment || !selectedPlanOption}
            type="button"
            onClick={() => void createPaymentRequest()}
          >
            {isCreatingPayment
              ? "生成订单中..."
              : "开通" + selectedPlanOption.label + " " + selectedPlanOption.priceLabel}
          </button>
        ) : (
          <Link className="button primary" href={loginHref}>
            先注册/登录邮箱
          </Link>
        )}
      </div>

      {paymentMessage ? <p className="project-access-message">{paymentMessage}</p> : null}

      {showPaymentCode && userEmail && paymentRequest && selectedPlanOption ? (
        <section className="project-access-payment" aria-label="微信收款码">
          <div>
            <strong>微信扫码支付</strong>
            <p>订单号：{paymentRequest.order_no}</p>
            <p>开通账号：{userEmail}</p>
            <p>
              当前选择：{project.title} · {selectedPlanOption.label} · {selectedPlanOption.durationLabel} ·{" "}
              {formatProjectPrice(Number(paymentRequest.amount_cny))}
            </p>
            <p>付款后20分钟内开通权限，如有问题，请联系我的微信号：13432086750</p>
          </div>
          <Image alt="微信支付收款码" height={894} priority src="/payment/wechat-pay.jpg" width={640} />
        </section>
      ) : null}
    </section>
  );
}

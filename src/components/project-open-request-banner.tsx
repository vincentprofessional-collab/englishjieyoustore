"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  formatProjectPrice,
  PROJECT_ACCESS_PLANS,
  PROJECT_ACCESS_RULES,
  type ProjectAccessPlan,
} from "@/lib/access-control";
import { supabase } from "@/lib/supabase/client";

type RequestProject = {
  gateTitle?: string;
  title: string;
};

type RequestPlan = {
  durationLabel: string;
  label: string;
  priceLabel: string;
};

const PLAN_KEYS = PROJECT_ACCESS_PLANS.map((plan) => plan.plan);

function isProjectAccessPlan(value: string | null): value is ProjectAccessPlan {
  return PLAN_KEYS.includes(value as ProjectAccessPlan);
}

export function ProjectOpenRequestBanner() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [project, setProject] = useState<RequestProject | null>(null);
  const [plan, setPlan] = useState<RequestPlan | null>(null);
  const projectKey = searchParams.get("project");
  const planKey = searchParams.get("plan");

  useEffect(() => {
    let isMounted = true;
    setCopied(false);
    setProject(null);
    setPlan(null);

    if (!projectKey || !isProjectAccessPlan(planKey)) return;

    const fallbackProject = PROJECT_ACCESS_RULES[projectKey];
    const fallbackPlan = PROJECT_ACCESS_PLANS.find((item) => item.plan === planKey);

    async function loadRequestCatalog() {
      const [projectResult, planResult] = await Promise.all([
        supabase
          .from("access_projects")
          .select("title,gate_title")
          .eq("project_key", projectKey)
          .eq("is_enabled", true)
          .maybeSingle(),
        supabase
          .from("access_project_plans")
          .select("label,duration_label,price_cny")
          .eq("project_key", projectKey)
          .eq("plan", planKey)
          .eq("is_enabled", true)
          .maybeSingle(),
      ]);

      if (!isMounted) return;

      if (!projectResult.error) {
        setProject(
          projectResult.data
            ? {
                gateTitle: projectResult.data.gate_title ?? undefined,
                title: projectResult.data.title,
              }
            : null,
        );
      } else if (fallbackProject) {
        setProject({ gateTitle: fallbackProject.gateTitle, title: fallbackProject.title });
      }

      if (!planResult.error) {
        setPlan(
          planResult.data
            ? {
                durationLabel: planResult.data.duration_label,
                label: planResult.data.label,
                priceLabel: formatProjectPrice(Number(planResult.data.price_cny)),
              }
            : null,
        );
      } else if (fallbackPlan) {
        setPlan({
          durationLabel: fallbackPlan.durationLabel,
          label: fallbackPlan.label,
          priceLabel: fallbackPlan.priceLabel,
        });
      }
    }

    void loadRequestCatalog();
    return () => {
      isMounted = false;
    };
  }, [planKey, projectKey]);

  if (!projectKey || !isProjectAccessPlan(planKey) || !project || !plan) return null;

  const requestText =
    "我要开通：" + project.title + "，" + plan.label + "，" + plan.priceLabel + "，" + plan.durationLabel + "。";

  async function copyRequestText() {
    await navigator.clipboard.writeText(requestText);
    setCopied(true);
  }

  return (
    <section className="project-open-request-banner" aria-label="开通信息">
      <div>
        <span>开通信息</span>
        <h2>{project.gateTitle ?? project.title}</h2>
        <p>
          已选择：{project.title} · {plan.label} · {plan.priceLabel} · {plan.durationLabel}
        </p>
      </div>
      <button className="button primary" type="button" onClick={() => void copyRequestText()}>
        {copied ? "已复制" : "复制开通信息"}
      </button>
    </section>
  );
}

import {
  isDestructiveStep,
  isMapStep,
  type ZapDashboardStep,
  type ZapDecision,
  type ZapPlan,
} from "./zap-plan";

/**
 * The decisions that a preview asks again, with their options as chips: each
 * decision that is not clear, and the `target` decision, which always holds
 * the next targets (a removal or a new period can wait with all decisions
 * clear).
 */
export function previewDecisions(plan: ZapPlan): ZapDecision[] {
  return plan.decisions.filter(
    (d) =>
      (d.options?.length ?? 0) > 0 && (d.clear === false || d.key === "target")
  );
}

const WIDGET_TARGETS = new Set(["move", "resize", "change_period"]);

/** The question of a decision in a preview, e.g. "Which widget?". */
export function previewQuestion(decision: ZapDecision, plan: ZapPlan): string {
  switch (decision.key) {
    case "target":
      return plan.steps.every((step) => WIDGET_TARGETS.has(step.kind))
        ? "Which widget?"
        : "Which item?";
    case "destination":
      return "Move to where?";
    case "size":
      return "Which width?";
    case "widgets":
      return "And its widgets?";
    case "action":
      return "Which edit?";
    default:
      return `${decision.question}?`;
  }
}

/** True when a step of the plan cannot be taken back: a removal or a new period. */
export const hasDestructiveStep = (plan: ZapPlan): boolean =>
  plan.steps.some(isDestructiveStep);

/** The widgets that a section removal names, for the preview. */
export function affectedWidgets(step: ZapDashboardStep): string[] {
  return step.kind === "remove" && step.args.target_type === "section"
    ? (step.args.widget_labels ?? [])
    : [];
}

export const dashboardStepsOf = (plan: ZapPlan): ZapDashboardStep[] =>
  plan.steps.filter((step): step is ZapDashboardStep => !isMapStep(step));

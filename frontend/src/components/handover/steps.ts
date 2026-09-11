import type { HandoverStep } from "@/lib/api/handover";

export const STEP_ORDER: HandoverStep[] = ["FRONT", "BACK", "LEFT", "RIGHT", "DAMAGE", "SERIAL", "ACCESSORIES", "VIDEO"];

export const STEP_LABELS: Record<HandoverStep, string> = {
  FRONT: "Ön yüzü çek",
  BACK: "Arka yüzü çek",
  LEFT: "Sol tarafı çek",
  RIGHT: "Sağ tarafı çek",
  DAMAGE: "Varsa hasarları göster",
  SERIAL: "Seri numarasını göster",
  ACCESSORIES: "Aksesuarları göster",
  VIDEO: "Kısa bir video çek",
};

export function buildWizardSteps(requiredSteps: HandoverStep[]): { step: HandoverStep; required: boolean }[] {
  const requiredSet = new Set(requiredSteps);
  const steps: HandoverStep[] = STEP_ORDER.filter((step) => step === "DAMAGE" || requiredSet.has(step));
  return steps.map((step) => ({ step, required: step !== "DAMAGE" }));
}

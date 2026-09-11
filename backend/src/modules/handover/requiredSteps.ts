import type { HandoverStep } from "../../db/types";

const ALWAYS_REQUIRED: HandoverStep[] = ["FRONT", "BACK", "LEFT", "RIGHT", "VIDEO"];

export function computeRequiredSteps(hasSerialNumber: boolean, hasAccessories: boolean): HandoverStep[] {
  const steps = [...ALWAYS_REQUIRED];
  if (hasSerialNumber) steps.push("SERIAL");
  if (hasAccessories) steps.push("ACCESSORIES");
  return steps;
}

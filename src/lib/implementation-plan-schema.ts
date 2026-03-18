import { z } from "zod";

export const affectedAreaEnum = z.enum([
  "frontend",
  "backend",
  "database",
  "infra",
]);

export type AffectedArea = z.infer<typeof affectedAreaEnum>;

export const riskSchema = z.object({
  text: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
});

export type Risk = z.infer<typeof riskSchema>;

export const implementationPlanSchema = z.object({
  summary: z.string().min(1),
  affectedAreas: z
    .array(affectedAreaEnum)
    .min(1)
    .transform((areas) => [...new Set(areas)]),
  risks: z.array(riskSchema),
  implementationSteps: z.array(z.string()).min(1),
  testIdeas: z.array(z.string()).min(1),
  requiresApproval: z.boolean(),
});

export type ImplementationPlan = z.infer<typeof implementationPlanSchema>;

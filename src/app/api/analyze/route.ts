import { streamText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { implementationPlanSchema } from "@/lib/implementation-plan-schema";

export async function POST(req: Request) {
  const apiKey =
    req.headers.get("x-provider-api-key") || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "No provider API key supplied" },
      { status: 401 }
    );
  }

  const rawBaseUrl = req.headers.get("x-provider-base-url");
  const modelId = req.headers.get("x-model-id") || "gpt-4.1";

  const provider = createOpenAI({
    apiKey,
    ...(rawBaseUrl ? { baseURL: rawBaseUrl } : {}),
  });

  let body: { text: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.text || typeof body.text !== "string" || !body.text.trim()) {
    return Response.json(
      { error: "Request body must include a non-empty 'text' field" },
      { status: 400 }
    );
  }

  const result = streamText({
    model: provider(modelId),
    output: Output.object({
      schema: implementationPlanSchema,
      name: "implementationPlan",
      description: "A structured implementation plan for a software change",
    }),
    system: `You are a senior staff engineer who produces structured implementation plans.

Given the input text (a user story, GitHub issue, Jira ticket, or implementation request),
produce exactly ONE implementation plan as a JSON object matching the required schema.

Rules:
- Use ONLY information present in the input text. Do not invent repository names, file paths, or details not mentioned.
- Keep the summary concise (1-3 sentences).
- affectedAreas must only contain values from: "frontend", "backend", "database", "infra". Pick all that apply.
- implementationSteps should be concrete, actionable, and ordered.
- testIdeas should be specific and testable.
- risks should highlight real concerns, not generic boilerplate.
- Set requiresApproval to true when the change involves ANY of:
  database migrations, infra/deployment changes, secrets management,
  auth/permissions changes, billing logic, destructive data changes,
  externally visible API breaking changes, or broad/high-risk refactors.
  Otherwise set it to false.
- Be concise, practical, and actionable. This is for engineers, not managers.`,
    prompt: body.text,
  });

  return result.toTextStreamResponse();
}

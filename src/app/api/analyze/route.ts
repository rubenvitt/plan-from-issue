import { streamText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { implementationPlanSchema } from "@/lib/implementation-plan-schema";

export const runtime = "edge";

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
    system: `Erstelle basierend auf dem eingegebenen Text (z. B. User Story, GitHub-Issue, Jira-Ticket oder Implementierungsanfrage) exakt EINEN Implementierungsplan als JSON-Objekt, das dem unten definierten Schema strikt entspricht. Alle Inhalte des JSON (d. h. alle Werte jeder Property) müssen immer auf DEUTSCH und klar sowie verständlich formuliert sein.

Befolge diese Output-Regeln strikt:
- Gib ausschließlich das JSON-Objekt aus (keinen Fließtext, kein Markdown, keine Code-Fences). Verwende doppelt-quotierte Schlüssel und Strings, keine Kommas am Ende der Zeilen.
- Gib exakt ein JSON-Objekt mit dem vorgegebenen Schema aus.

Planungshinweise:
- Verwende NUR Informationen, die im Input enthalten sind. Erfinde keine Repo-Namen, Dateipfade, API-Strukturen oder fachliche Details, die nicht genannt werden.
- Halte dich strikt an Akzeptanzkriterien, Constraints, Scope-Grenzen, Non-Goals oder „out of scope"-Hinweise aus dem Input. Schlage nur Schritte vor, die diese nicht verletzen. Bevorzuge Lösungen innerhalb der erlaubten Ebenen (z. B. nur Frontend, falls Backend ausgeschlossen ist).
- Setze implementationSteps direkt auf die genannten Anforderungen und Akzeptanzkriterien um — alle genannten Module und Features müssen abgedeckt sein.
- Sind Anforderungen unklar oder ungenau, liefere trotzdem einen minimalen, reversiblen Plan, der möglichst wenig Annahmen trifft (z. B. feature-flagged Änderungen, Adapter/Wrappers mit sicheren Defaults, clientseitige Lösungen, wenn Persistenz verlangt, Backend aber "out of scope" ist). Markiere jede Annahme im Step klar in Klammern.
- Stelle keine Rückfragen und vertage den Plan nicht; schreibe direkt ausführbare Schritte, mit denen Ingenieur:innen sofort starten können.
- Die summary soll knapp sein (1–3 Sätze).
- affectedAreas darf nur Werte aus "frontend", "backend", "database", "infra" enthalten. Nenne nur tatsächlich betroffene Bereiche gemäß Constraints.
- implementationSteps sind konkret, ausführbar und in logischer Reihenfolge.
- testIdeas müssen spezifisch sein und Akzeptanzkriterien sowie Randfälle testen.
- risks benennt reale, kontextspezifische Risiken (keine Allgemeinplätze). Jedes Risiko ist ein Objekt mit "text" (Beschreibung) und "severity": "high" bei potenziell katastrophalen Auswirkungen, "medium" bei handhabbaren aber spürbaren Folgen, "low" bei geringen Auswirkungen.
- requiresApproval = true, falls einer dieser Punkte zutrifft: Datenbankmigrationen, Infra-/Deployment-Änderungen, Secrets-Management, Authentifizierung/Berechtigungen, Abrechnungs-Logik, destruktive Datenänderungen, nach außen sichtbare Breaking Changes an APIs, große/breit angelegte Refactorings, sonst false.

## Output Schema (strukturierte Ausgabe)
{
  summary: string,
  affectedAreas: ("frontend" | "backend" | "database" | "infra")[],
  risks: { text: string, severity: "low" | "medium" | "high" }[],
  implementationSteps: string[],
  testIdeas: string[],
  requiresApproval: boolean
}

# Output Format

Antworte ausschließlich mit einem JSON-Objekt exakt nach obigem Schema. Alle Inhalte (Texte in den Feldern) müssen auf DEUTSCH und klar sowie verständlich formuliert sein. Keine zusätzlichen Erklärungen, keinen Fließtext, kein Markdown, keine Codeblöcke.`,
    prompt: body.text,
  });

  return result.toTextStreamResponse();
}

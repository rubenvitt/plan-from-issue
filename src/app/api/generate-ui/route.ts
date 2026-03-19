import { streamText, convertToModelMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

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
  const modelId = req.headers.get("x-model-id") || "gpt-5.4";

  const provider = createOpenAI({
    apiKey,
    ...(rawBaseUrl ? { baseURL: rawBaseUrl } : {}),
  });

  const { messages: uiMessages } = await req.json();
  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: provider(modelId),
    system: `Du bist ein erfahrener UI/UX-Designer. Basierend auf Feature-Beschreibungen und Implementierungsplänen erstellst du UI-Mockups mithilfe der verfügbaren Tools.

Regeln:
- Rufe ein oder mehrere Tools auf, um die UI-Komponenten zu generieren, die zum beschriebenen Feature passen.
- Verwende deutsche Labels, Platzhalter und Beispieldaten.
- Generiere realistische, praxisnahe Beispieldaten (keine Lorem-ipsum-Platzhalter).
- Wähle die passenden Komponenten: Formulare für Eingaben, Tabellen für Datenübersichten, Metrik-Karten für Dashboards/KPIs, Listen für Aufzählungen/Navigation.
- Erkläre kurz (1-2 Sätze), was du generierst, bevor du die Tools aufrufst.
- Du kannst mehrere Tools in einem Schritt aufrufen, um eine vollständige Seiten-Komposition zu erstellen.`,
    messages: modelMessages,
    tools: {
      renderForm: {
        description:
          "Rendert ein Formular mit Eingabefeldern. Verwende dies für Formulare, Eingabemasken, Login-Screens, Registrierung, Einstellungen etc.",
        inputSchema: z.object({
          title: z.string(),
          description: z.string().optional(),
          fields: z.array(
            z.object({
              name: z.string(),
              label: z.string(),
              type: z.enum([
                "text",
                "email",
                "password",
                "number",
                "textarea",
                "select",
                "checkbox",
                "date",
                "url",
                "tel",
              ]),
              placeholder: z.string().optional(),
              required: z.boolean().optional(),
              options: z.array(z.string()).optional(),
            })
          ),
          submitLabel: z.string(),
        }),
        execute: async (params) => params,
      },
      renderDataTable: {
        description:
          "Rendert eine Datentabelle. Verwende dies für Übersichten, Listen mit mehreren Spalten, Admin-Ansichten, Logs etc.",
        inputSchema: z.object({
          title: z.string(),
          description: z.string().optional(),
          columns: z.array(z.string()),
          rows: z.array(z.array(z.string())),
        }),
        execute: async (params) => params,
      },
      renderMetricCards: {
        description:
          "Rendert Metrik-Karten für Dashboards, KPIs, Statistik-Übersichten.",
        inputSchema: z.object({
          title: z.string(),
          metrics: z.array(
            z.object({
              label: z.string(),
              value: z.string(),
              change: z.string().optional(),
              trend: z.enum(["up", "down", "neutral"]).optional(),
            })
          ),
        }),
        execute: async (params) => params,
      },
      renderList: {
        description:
          "Rendert eine Liste von Einträgen. Verwende dies für Navigation, Todo-Listen, Feed-Items, Sidebar-Menüs, Benachrichtigungen etc.",
        inputSchema: z.object({
          title: z.string(),
          items: z.array(
            z.object({
              title: z.string(),
              description: z.string().optional(),
              badge: z.string().optional(),
              badgeColor: z
                .enum(["gray", "blue", "green", "amber", "red"])
                .optional(),
            })
          ),
          variant: z.enum(["simple", "detailed", "navigation"]).optional(),
        }),
        execute: async (params) => params,
      },
    },
  });

  return result.toUIMessageStreamResponse();
}

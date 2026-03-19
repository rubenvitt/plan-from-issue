"use client";

import { useState, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { LocalSettings } from "@/lib/types";
import type { EditablePlan } from "@/components/plan-canvas";

/* ------------------------------------------------------------------ */
/*  Types for tool results                                             */
/* ------------------------------------------------------------------ */

interface FormResult {
  title: string;
  description?: string;
  fields: {
    name: string;
    label: string;
    type: string;
    placeholder?: string;
    required?: boolean;
    options?: string[];
  }[];
  submitLabel: string;
}

interface DataTableResult {
  title: string;
  description?: string;
  columns: string[];
  rows: string[][];
}

interface MetricCardsResult {
  title: string;
  metrics: {
    label: string;
    value: string;
    change?: string;
    trend?: "up" | "down" | "neutral";
  }[];
}

interface ListResult {
  title: string;
  items: {
    title: string;
    description?: string;
    badge?: string;
    badgeColor?: "gray" | "blue" | "green" | "amber" | "red";
  }[];
  variant?: "simple" | "detailed" | "navigation";
}

/* ------------------------------------------------------------------ */
/*  MockupPreview — main wrapper                                       */
/* ------------------------------------------------------------------ */

export function MockupPreview({
  plan,
  settings,
}: {
  plan: EditablePlan;
  settings: LocalSettings;
}) {
  const [started, setStarted] = useState(false);
  const [refineInput, setRefineInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/generate-ui",
        headers: {
          "x-provider-api-key": settings.providerApiKey,
          "x-model-id": settings.modelId || "gpt-5.4",
          ...(settings.baseUrl
            ? { "x-provider-base-url": settings.baseUrl }
            : {}),
        },
      }),
    [settings.providerApiKey, settings.modelId, settings.baseUrl]
  );

  const { messages, sendMessage, stop, status, error } = useChat({
    transport,
  });

  const isActive = status === "streaming" || status === "submitted";

  const handleGenerate = () => {
    setStarted(true);
    const stepsText = plan.implementationSteps
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n");

    sendMessage({
      text: `Erstelle ein UI-Mockup basierend auf folgendem Implementierungsplan:

**Zusammenfassung:** ${plan.summary}

**Betroffene Bereiche:** ${plan.affectedAreas.join(", ")}

**Implementierungsschritte:**
${stepsText}

Generiere passende UI-Komponenten, die den Frontend-Teil dieser Story visuell darstellen. Fokussiere dich auf die wichtigsten Screens und Ansichten.`,
    });
  };

  const handleRefine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refineInput.trim()) return;
    sendMessage({ text: refineInput });
    setRefineInput("");
  };

  const assistantMessages = messages.filter((m) => m.role === "assistant");

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
        {/* Title bar */}
        <div className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
            UI Mockup Preview
          </span>
          {isActive && (
            <button
              onClick={stop}
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Stopp
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5">
          {!started ? (
            /* ---- Initial state ---- */
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-md">
                Generiere ein UI-Mockup basierend auf dem analysierten Plan. Die
                KI erstellt passende Komponenten für die Frontend-Anforderungen.
              </p>
              <button
                onClick={handleGenerate}
                className="rounded-lg bg-sky-600 hover:bg-sky-500 px-5 py-2.5 text-sm font-medium text-white transition-colors"
              >
                Mockup erstellen
              </button>
            </div>
          ) : (
            /* ---- Generated content ---- */
            <div className="space-y-6">
              {/* Streaming indicator */}
              {isActive && (
                <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 rounded-lg">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
                  </span>
                  <span className="text-sm font-medium text-sky-700 dark:text-sky-300">
                    Generiere Mockup…
                  </span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400">
                  {error.message}
                </div>
              )}

              {/* Render assistant messages via parts */}
              {assistantMessages.map((message) => (
                <div key={message.id} className="space-y-4">
                  {message.parts.map((part, index) => {
                    if (part.type === "text" && part.text) {
                      return (
                        <p
                          key={index}
                          className="text-sm text-zinc-600 dark:text-zinc-400 italic"
                        >
                          {part.text}
                        </p>
                      );
                    }

                    // Typed tool parts arrive as "tool-renderForm", "tool-renderDataTable", etc.
                    if (part.type.startsWith("tool-")) {
                      const toolPart = part as unknown as {
                        type: string;
                        toolCallId: string;
                        state: string;
                        output?: unknown;
                      };
                      const toolName = part.type.slice("tool-".length);

                      if (toolPart.state === "output-available") {
                        return (
                          <div
                            key={toolPart.toolCallId || index}
                            className="animate-fade-in"
                          >
                            <MockupComponent
                              toolName={toolName}
                              result={toolPart.output}
                            />
                          </div>
                        );
                      }
                      // Loading skeleton for pending tools
                      return (
                        <div
                          key={toolPart.toolCallId || index}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6 animate-pulse"
                        >
                          <div className="h-4 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800 mb-3" />
                          <div className="space-y-2">
                            <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                            <div className="h-3 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800" />
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              ))}

              {/* Refine input */}
              {!isActive && assistantMessages.length > 0 && (
                <form onSubmit={handleRefine} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={refineInput}
                    onChange={(e) => setRefineInput(e.target.value)}
                    placeholder="Mockup verfeinern… (z.B. 'Füge ein Suchfeld hinzu')"
                    className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-600"
                  />
                  <button
                    type="submit"
                    disabled={!refineInput.trim()}
                    className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 transition-colors"
                  >
                    Verfeinern
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MockupComponent dispatcher                                         */
/* ------------------------------------------------------------------ */

function MockupComponent({
  toolName,
  result,
}: {
  toolName: string;
  result: unknown;
}) {
  switch (toolName) {
    case "renderForm":
      return <FormMockup {...(result as FormResult)} />;
    case "renderDataTable":
      return <DataTableMockup {...(result as DataTableResult)} />;
    case "renderMetricCards":
      return <MetricCardsMockup {...(result as MetricCardsResult)} />;
    case "renderList":
      return <ListMockup {...(result as ListResult)} />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Form Mockup                                                        */
/* ------------------------------------------------------------------ */

function FormMockup({ title, description, fields, submitLabel }: FormResult) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h4>
        {description && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      <div className="p-5 space-y-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {field.label}
              {field.required && (
                <span className="text-red-500 ml-0.5">*</span>
              )}
            </label>
            {field.type === "textarea" ? (
              <textarea
                placeholder={field.placeholder}
                rows={3}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                readOnly
              />
            ) : field.type === "select" ? (
              <select className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100">
                <option>{field.placeholder || "Auswählen…"}</option>
                {field.options?.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === "checkbox" ? (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-zinc-300 dark:border-zinc-700"
                  readOnly
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {field.placeholder || field.label}
                </span>
              </div>
            ) : (
              <input
                type={field.type}
                placeholder={field.placeholder}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                readOnly
              />
            )}
          </div>
        ))}
        <button className="w-full rounded-md bg-sky-600 px-4 py-2.5 text-sm font-medium text-white cursor-default">
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data Table Mockup                                                  */
/* ------------------------------------------------------------------ */

function DataTableMockup({
  title,
  description,
  columns,
  rows,
}: DataTableResult) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h4>
        {description && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Metric Cards Mockup                                                */
/* ------------------------------------------------------------------ */

function MetricCardsMockup({ title, metrics }: MetricCardsResult) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {metric.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {metric.value}
            </p>
            {metric.change && (
              <p
                className={`mt-1 text-xs font-medium ${
                  metric.trend === "up"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : metric.trend === "down"
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {metric.trend === "up"
                  ? "↑"
                  : metric.trend === "down"
                    ? "↓"
                    : "→"}{" "}
                {metric.change}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  List Mockup                                                        */
/* ------------------------------------------------------------------ */

const badgeColors: Record<string, string> = {
  gray: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
  blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  green:
    "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  amber:
    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  red: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

function ListMockup({ title, items, variant = "detailed" }: ListResult) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h4>
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {items.map((item, i) => (
          <li
            key={i}
            className={`px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${
              variant === "navigation" ? "cursor-pointer" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {variant === "navigation" && (
                    <span className="mr-2 text-zinc-400">→</span>
                  )}
                  {item.title}
                </p>
                {variant !== "simple" && item.description && (
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {item.description}
                  </p>
                )}
              </div>
              {item.badge && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    badgeColors[item.badgeColor || "gray"]
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

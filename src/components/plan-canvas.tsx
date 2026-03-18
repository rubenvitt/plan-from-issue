"use client";

import { useEffect, useState } from "react";
import { EditableField } from "./editable-field";
import { RiskPanel } from "./risk-panel";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type EditablePlan = {
  summary: string;
  affectedAreas: string[];
  risks: { text: string; severity: string }[];
  implementationSteps: string[];
  testIdeas: string[];
  requiresApproval: boolean;
};

/* ------------------------------------------------------------------ */
/*  Area config                                                        */
/* ------------------------------------------------------------------ */

const areaConfig: Record<string, { color: string; icon: string }> = {
  frontend: {
    color:
      "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 ring-sky-200 dark:ring-sky-800",
    icon: "◻",
  },
  backend: {
    color:
      "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 ring-violet-200 dark:ring-violet-800",
    icon: "⬡",
  },
  database: {
    color:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800",
    icon: "◉",
  },
  infra: {
    color:
      "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 ring-rose-200 dark:ring-rose-800",
    icon: "△",
  },
};

/* ------------------------------------------------------------------ */
/*  PlanCanvas                                                         */
/* ------------------------------------------------------------------ */

export function PlanCanvas({
  plan,
  onChange,
  onClose,
}: {
  plan: EditablePlan;
  onChange: (plan: EditablePlan) => void;
  onClose: () => void;
}) {
  const [approvalStatus, setApprovalStatus] = useState<
    "pending" | "confirming" | "approved"
  >("pending");
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyLabel, setCopyLabel] = useState("");

  // Lock body scroll + Escape to close
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  /* ---- Helpers ---- */

  const update = <K extends keyof EditablePlan>(
    key: K,
    value: EditablePlan[K]
  ) => onChange({ ...plan, [key]: value });

  const updateListItem = (
    key: "implementationSteps" | "testIdeas",
    index: number,
    text: string
  ) => {
    const list = [...plan[key]];
    list[index] = text;
    update(key, list);
  };

  const removeListItem = (
    key: "implementationSteps" | "testIdeas",
    index: number
  ) => update(key, plan[key].filter((_, i) => i !== index));

  const addListItem = (
    key: "implementationSteps" | "testIdeas",
    defaultText: string
  ) => update(key, [...plan[key], defaultText]);

  const updateRisk = (index: number, text: string) => {
    const risks = [...plan.risks];
    risks[index] = { ...risks[index], text };
    update("risks", risks);
  };

  const removeRisk = (index: number) =>
    update(
      "risks",
      plan.risks.filter((_, i) => i !== index)
    );

  const flash = (label: string) => {
    setCopied(true);
    setCopyLabel(label);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(plan, null, 2));
    flash("JSON kopiert!");
  };

  const handleCopyMarkdown = async () => {
    const md = [
      `# Implementierungsplan`,
      ``,
      `**Bereiche:** ${plan.affectedAreas.join(", ")}`,
      plan.requiresApproval
        ? `**Status:** Genehmigung erforderlich`
        : `**Status:** Keine Genehmigung nötig`,
      ``,
      `## Zusammenfassung`,
      ``,
      plan.summary,
      ``,
      `## Risiken`,
      ``,
      ...plan.risks.map(
        (r) => `- **[${r.severity.toUpperCase()}]** ${r.text}`
      ),
      ``,
      `## Implementierungsschritte`,
      ``,
      ...plan.implementationSteps.map((s, i) => `${i + 1}. ${s}`),
      ``,
      `## Testideen`,
      ``,
      ...plan.testIdeas.map((t) => `- ${t}`),
    ].join("\n");
    await navigator.clipboard.writeText(md);
    flash("Markdown kopiert!");
  };

  /* ---- Render ---- */

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 overflow-auto animate-canvas-open font-[family-name:var(--font-geist-sans)]">
      {/* ---- Toolbar ---- */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-6 h-14">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <span className="text-lg leading-none">&larr;</span>
            <span className="hidden sm:inline">Schließen</span>
          </button>

          <span className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Plan Canvas
          </span>

          <div className="flex items-center gap-1">
            {copied ? (
              <span className="rounded-md px-2.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-fade-in">
                {copyLabel}
              </span>
            ) : (
              <>
                <button
                  onClick={() => setShowJson(!showJson)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    showJson
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {"{ }"}
                </button>
                <button
                  onClick={handleCopyJson}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  JSON
                </button>
                <button
                  onClick={handleCopyMarkdown}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Markdown
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ---- Document ---- */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Meta bar: areas + approval */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-wrap gap-2">
            {plan.affectedAreas.map((area) => {
              const cfg = areaConfig[area] || areaConfig.frontend;
              return (
                <span
                  key={area}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${cfg.color}`}
                >
                  <span>{cfg.icon}</span>
                  {area}
                </span>
              );
            })}
          </div>

          {plan.requiresApproval ? (
            <div className="flex items-center gap-2">
              {approvalStatus === "approved" ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800 animate-fade-in">
                  ✓ Genehmigt
                </span>
              ) : approvalStatus === "confirming" ? (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Sicher?
                  </span>
                  <button
                    onClick={() => setApprovalStatus("approved")}
                    className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                  >
                    Ja, genehmigen
                  </button>
                  <button
                    onClick={() => setApprovalStatus("pending")}
                    className="rounded-md border border-amber-300 dark:border-amber-700 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setApprovalStatus("confirming")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-200 dark:ring-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
                >
                  ⚠ Genehmigung erforderlich
                </button>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800">
              ✓ Keine Genehmigung nötig
            </span>
          )}
        </div>

        {/* Summary */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
            Zusammenfassung
          </h2>
          <EditableField
            value={plan.summary}
            onSave={(v) => update("summary", v)}
            className="text-base text-zinc-800 dark:text-zinc-200 leading-relaxed"
          />
        </section>

        {/* Risks */}
        {plan.risks.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
              Risiken
            </h2>
            <RiskPanel
              risks={plan.risks}
              onEdit={updateRisk}
              onRemove={removeRisk}
            />
          </section>
        )}

        {/* Implementation Steps */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
            Implementierungsschritte
          </h2>
          <div className="space-y-0.5">
            {plan.implementationSteps.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-4 group py-2 -mx-3 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 flex items-start gap-1">
                  <EditableField
                    value={step}
                    onSave={(v) =>
                      updateListItem("implementationSteps", i, v)
                    }
                    className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"
                  />
                  <button
                    onClick={() =>
                      removeListItem("implementationSteps", i)
                    }
                    className="shrink-0 opacity-0 group-hover:opacity-100 mt-0.5 p-1 text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-all text-xs"
                    title="Entfernen"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() =>
              addListItem("implementationSteps", "Neuer Schritt")
            }
            className="mt-2 -mx-3 px-3 flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-2"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-zinc-300 dark:border-zinc-600 text-[10px]">
              +
            </span>
            Schritt hinzufügen
          </button>
        </section>

        {/* Test Ideas */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
            Testideen
          </h2>
          <div className="space-y-0.5">
            {plan.testIdeas.map((idea, i) => (
              <div
                key={i}
                className="flex items-start gap-4 group py-2 -mx-3 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <span className="shrink-0 mt-2.5 h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                <div className="flex-1 min-w-0 flex items-start gap-1">
                  <EditableField
                    value={idea}
                    onSave={(v) =>
                      updateListItem("testIdeas", i, v)
                    }
                    className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"
                  />
                  <button
                    onClick={() => removeListItem("testIdeas", i)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 mt-0.5 p-1 text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-all text-xs"
                    title="Entfernen"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => addListItem("testIdeas", "Neue Testidee")}
            className="mt-2 -mx-3 px-3 flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-2"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-zinc-300 dark:border-zinc-600 text-[10px]">
              +
            </span>
            Testidee hinzufügen
          </button>
        </section>

        {/* JSON panel */}
        {showJson && (
          <section className="mb-10 animate-fade-in">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
              JSON
            </h2>
            <pre className="overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 text-xs text-zinc-700 dark:text-zinc-300 font-[family-name:var(--font-geist-mono)]">
              {JSON.stringify(plan, null, 2)}
            </pre>
          </section>
        )}

        {/* Footer hint */}
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center pt-6 pb-8 border-t border-zinc-100 dark:border-zinc-800/50">
          Klicke auf Texte, um sie direkt zu bearbeiten · Esc zum Schließen
        </p>
      </div>
    </div>
  );
}

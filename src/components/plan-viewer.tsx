"use client";

import { useState } from "react";
import { RiskPanel } from "./risk-panel";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PartialRisk = { text?: string; severity?: string };

export type PartialPlan = {
  summary?: string;
  affectedAreas?: (string | undefined)[];
  risks?: (PartialRisk | undefined)[];
  implementationSteps?: (string | undefined)[];
  testIdeas?: (string | undefined)[];
  requiresApproval?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Area badges config                                                 */
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
/*  Streaming status bar                                               */
/* ------------------------------------------------------------------ */

function StreamStatus({ plan }: { plan: PartialPlan }) {
  const phases = [
    { label: "Zusammenfassung", done: !!plan.summary },
    { label: "Bereiche", done: (plan.affectedAreas?.length ?? 0) > 0 },
    { label: "Risiken", done: (plan.risks?.length ?? 0) > 0 },
    {
      label: "Schritte",
      done: (plan.implementationSteps?.length ?? 0) > 0,
    },
    { label: "Tests", done: (plan.testIdeas?.length ?? 0) > 0 },
  ];

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
        </span>
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          Streame…
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {phases.map((p) => (
          <span
            key={p.label}
            className={
              p.done
                ? "text-blue-600 dark:text-blue-400 font-medium"
                : "text-zinc-300 dark:text-zinc-600"
            }
          >
            {p.done ? "✓" : "○"} {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Canvas cell                                                        */
/* ------------------------------------------------------------------ */

function CanvasCell({
  title,
  children,
  className = "",
  empty = false,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  empty?: boolean;
}) {
  return (
    <div
      className={`relative border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 ${className}`}
    >
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
        {title}
      </h3>
      {empty ? (
        <div className="flex items-center justify-center py-4">
          <div className="h-2 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>
      ) : (
        <div className="animate-fade-in">{children}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PlanViewer — Canvas-style grid view                                */
/* ------------------------------------------------------------------ */

export function PlanViewer({
  plan,
  isLoading,
  error,
  onOpenCanvas,
}: {
  plan: PartialPlan;
  isLoading: boolean;
  error?: string;
  onOpenCanvas?: () => void;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const summary = plan.summary;
  const areas =
    (plan.affectedAreas?.filter(Boolean) as string[]) || [];
  const risks =
    plan.risks?.filter((r): r is PartialRisk => !!r) || [];
  const steps =
    (plan.implementationSteps?.filter(Boolean) as string[]) || [];
  const testIdeas =
    (plan.testIdeas?.filter(Boolean) as string[]) || [];
  const requiresApproval = plan.requiresApproval;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(plan, null, 2)
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Streaming status */}
      {isLoading && <StreamStatus plan={plan} />}

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50 text-red-500 text-xs font-bold">
              !
            </span>
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {summary
                  ? "Stream unterbrochen — Teildaten werden angezeigt"
                  : "Analyse fehlgeschlagen"}
              </p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/*  CANVAS GRID                                                   */}
      {/* ============================================================= */}
      <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
        {/* Canvas title bar */}
        <div className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
            Implementation Plan Canvas
          </span>
          {!isLoading && summary && (
            <div className="flex items-center gap-2">
              {onOpenCanvas && (
                <button
                  onClick={onOpenCanvas}
                  className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Bearbeiten →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Row 1: Summary (full width) */}
        <CanvasCell title="Zusammenfassung" empty={!summary}>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {summary}
          </p>
        </CanvasCell>

        {/* Row 2: 3-column grid — Bereiche | Risiken | Genehmigung */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr]">
          {/* Bereiche */}
          <CanvasCell title="Bereiche" empty={areas.length === 0}>
            <div className="flex flex-wrap gap-1.5">
              {areas.map((area) => {
                const cfg =
                  areaConfig[area] || areaConfig.frontend;
                return (
                  <span
                    key={area}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ring-1 ring-inset ${cfg.color}`}
                  >
                    <span>{cfg.icon}</span>
                    {area}
                  </span>
                );
              })}
            </div>
          </CanvasCell>

          {/* Risiken */}
          <CanvasCell title="Risiken" empty={risks.length === 0}>
            <RiskPanel risks={risks} />
          </CanvasCell>

          {/* Genehmigung */}
          <CanvasCell
            title="Genehmigung"
            empty={requiresApproval == null}
          >
            {requiresApproval != null && (
              <div className="flex flex-col items-start gap-2">
                {requiresApproval ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-300 dark:ring-amber-700">
                      Erforderlich
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Dieser Plan benötigt eine Genehmigung vor der Umsetzung.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-300 dark:ring-emerald-700">
                      Nicht nötig
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Kann ohne weitere Freigabe umgesetzt werden.
                    </p>
                  </>
                )}
              </div>
            )}
          </CanvasCell>
        </div>

        {/* Row 3: Implementation Steps (full width) */}
        <CanvasCell
          title="Implementierungsschritte"
          empty={steps.length === 0}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </CanvasCell>

        {/* Row 4: Test Ideas (full width) */}
        <CanvasCell title="Testideen" empty={testIdeas.length === 0}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {testIdeas.map((idea, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {idea}
                </span>
              </div>
            ))}
          </div>
        </CanvasCell>
      </div>

      {/* Raw JSON toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2"
        >
          {showRaw ? "JSON ausblenden" : "JSON anzeigen"}
        </button>
        {showRaw && (
          <button
            onClick={handleCopy}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2"
          >
            {copied ? "Kopiert!" : "Kopieren"}
          </button>
        )}
      </div>
      {showRaw && (
        <pre className="overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 text-xs text-zinc-700 dark:text-zinc-300 font-[family-name:var(--font-geist-mono)]">
          {JSON.stringify(plan, null, 2)}
        </pre>
      )}
    </div>
  );
}

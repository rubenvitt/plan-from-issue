"use client";

import { EditableField } from "./editable-field";

type PartialRisk = { text?: string; severity?: string };

const severityConfig = {
  high: {
    border: "border-l-red-500",
    bg: "bg-red-50/80 dark:bg-red-950/20",
    badge:
      "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-800",
    label: "Hoch",
  },
  medium: {
    border: "border-l-amber-500",
    bg: "bg-amber-50/80 dark:bg-amber-950/20",
    badge:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800",
    label: "Mittel",
  },
  low: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-50/80 dark:bg-emerald-950/20",
    badge:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800",
    label: "Niedrig",
  },
} as const;

export function RiskPanel({
  risks,
  onEdit,
  onRemove,
}: {
  risks: (PartialRisk | undefined)[];
  onEdit?: (index: number, text: string) => void;
  onRemove?: (index: number) => void;
}) {
  const validRisks = risks.filter(
    (r): r is PartialRisk => !!r?.text
  );
  if (validRisks.length === 0) return null;

  return (
    <div className="space-y-2">
      {validRisks.map((risk, i) => {
        const sev =
          (risk.severity as keyof typeof severityConfig) || "medium";
        const config = severityConfig[sev] || severityConfig.medium;

        return (
          <div
            key={i}
            className={`group/risk rounded-lg border-l-4 ${config.border} ${config.bg} p-3 pl-4 animate-fade-in`}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${config.badge}`}
              >
                {config.label}
              </span>
              <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {onEdit ? (
                  <EditableField
                    value={risk.text!}
                    onSave={(v) => onEdit(i, v)}
                  />
                ) : (
                  risk.text
                )}
              </span>
              {onRemove && (
                <button
                  onClick={() => onRemove(i)}
                  className="shrink-0 opacity-0 group-hover/risk:opacity-100 text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-all text-xs p-1"
                  title="Risiko entfernen"
                >
                  &#10005;
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

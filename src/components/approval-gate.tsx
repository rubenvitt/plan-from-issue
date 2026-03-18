"use client";

import { useState } from "react";

export function ApprovalGate({
  requiresApproval,
  affectedAreas,
}: {
  requiresApproval: boolean;
  affectedAreas?: string[];
}) {
  const [status, setStatus] = useState<
    "pending" | "confirming" | "approved"
  >("pending");

  if (!requiresApproval) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs">
          &#10003;
        </span>
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Keine Genehmigung erforderlich
        </span>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="flex items-center gap-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 animate-fade-in">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs">
          &#10003;
        </span>
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Plan genehmigt
        </span>
      </div>
    );
  }

  const reasons: string[] = [];
  if (affectedAreas?.includes("database"))
    reasons.push("Datenbankmigrationen");
  if (affectedAreas?.includes("infra"))
    reasons.push("Infrastruktur-Änderungen");
  if (affectedAreas?.includes("backend"))
    reasons.push("Backend-Änderungen");

  return (
    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
      <div className="flex items-start gap-3">
        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 text-sm">
          !
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Dieser Plan erfordert eine Genehmigung
          </p>
          {reasons.length > 0 && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Grund: {reasons.join(", ")}
            </p>
          )}
          <div className="mt-3">
            {status === "pending" ? (
              <button
                onClick={() => setStatus("confirming")}
                className="rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors shadow-sm"
              >
                Plan genehmigen
              </button>
            ) : (
              <div className="flex items-center gap-3 animate-fade-in">
                <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  Bist du sicher?
                </span>
                <button
                  onClick={() => setStatus("approved")}
                  className="rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                >
                  Ja, genehmigen
                </button>
                <button
                  onClick={() => setStatus("pending")}
                  className="rounded-lg border border-amber-300 dark:border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

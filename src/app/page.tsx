"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { implementationPlanSchema } from "@/lib/implementation-plan-schema";
import {
  type GitHubIssuePreview,
  type LocalSettings,
  DEFAULT_SETTINGS,
} from "@/lib/types";
import { loadSettings, saveSettings, clearSettings } from "@/lib/storage";
import { SettingsPanel } from "@/components/settings-panel";
import { PlanViewer } from "@/components/plan-viewer";
import { PlanCanvas, type EditablePlan } from "@/components/plan-canvas";
import { MockupPreview } from "@/components/mockup-preview";

const SEED_EXAMPLES = [
  {
    label: "Auth migration",
    text: `As a platform engineer, I need to migrate our authentication system from session-based cookies to JWT tokens.

Requirements:
- Replace express-session with jsonwebtoken
- Add refresh token rotation
- Update all API middleware to validate JWTs
- Migrate existing sessions (500k+ active users)
- Update the React frontend to store tokens and handle refresh
- Add rate limiting to the auth endpoints
- Ensure backwards compatibility for mobile clients on older app versions

The auth database table needs a new refresh_tokens table and we need to update the users table schema.
The deployment needs coordinated rollout across 3 services.`,
  },
  {
    label: "Dashboard feature",
    text: `Add a real-time analytics dashboard to the admin panel.

- Show active users count (WebSocket)
- Display request latency p50/p95/p99 charts
- Add error rate trending graph
- Filter by time range (1h, 6h, 24h, 7d)
- Pull data from existing Prometheus metrics API
- Use recharts for visualization
- Must work on mobile viewports
- Add to existing admin sidebar navigation`,
  },
];

type SourceMode = "manual" | "github";

export default function Home() {
  /* ---- Settings ---- */
  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSetting = <K extends keyof LocalSettings>(
    key: K,
    value: LocalSettings[K]
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  };

  /* ---- Source mode ---- */
  const [mode, setMode] = useState<SourceMode>("manual");
  const [inputText, setInputText] = useState("");
  const [issueUrl, setIssueUrl] = useState("");
  const [issuePreview, setIssuePreview] =
    useState<GitHubIssuePreview | null>(null);
  const [fetchingIssue, setFetchingIssue] = useState(false);
  const [issueError, setIssueError] = useState("");

  /* ---- Analysis ---- */
  const [error, setError] = useState("");

  const { object, submit, isLoading, stop, error: streamError } = useObject({
    api: "/api/analyze",
    schema: implementationPlanSchema,
    headers: {
      "x-provider-api-key": settings.providerApiKey,
      "x-model-id": settings.modelId || "gpt-5.4",
      ...(settings.baseUrl ? { "x-provider-base-url": settings.baseUrl } : {}),
    },
    onError: (err) => setError(err.message),
  });

  const analysisText =
    mode === "github" && issuePreview
      ? `# ${issuePreview.title}\n\nRepository: ${issuePreview.repository}\nLabels: ${issuePreview.labels.join(", ") || "none"}\nState: ${issuePreview.state}\n\n${issuePreview.body}`
      : inputText;

  const canAnalyze = analysisText.trim().length > 0 && !isLoading;

  const handleAnalyze = () => {
    setError("");
    if (!settings.providerApiKey && !process.env.NEXT_PUBLIC_HAS_OPENAI_KEY) {
      setError("Bitte setze einen Provider API Key in den Einstellungen.");
      return;
    }
    submit({ text: analysisText });
  };

  const handleReset = () => {
    stop();
    setInputText("");
    setIssueUrl("");
    setIssuePreview(null);
    setIssueError("");
    setError("");
    setCanvasPlan(null);
    setCanvasOpen(false);
  };

  /* ---- GitHub fetch ---- */
  const fetchIssue = useCallback(async () => {
    setIssueError("");
    setIssuePreview(null);
    setFetchingIssue(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (settings.githubToken) {
        headers["x-github-token"] = settings.githubToken;
      }
      const res = await fetch("/api/github/issue", {
        method: "POST",
        headers,
        body: JSON.stringify({ issueUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIssueError(data.error || `Failed (${res.status})`);
      } else {
        setIssuePreview(data as GitHubIssuePreview);
      }
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setFetchingIssue(false);
    }
  }, [issueUrl, settings.githubToken]);

  /* ---- Canvas ---- */
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasPlan, setCanvasPlan] = useState<EditablePlan | null>(null);

  // Resolve streaming object to editable plan once streaming finishes
  const resolvedPlan = useMemo<EditablePlan | null>(() => {
    if (isLoading || !object?.summary) return null;
    return {
      summary: object.summary,
      affectedAreas:
        (object.affectedAreas?.filter(Boolean) as string[]) || [],
      risks:
        object.risks
          ?.filter((r) => !!r?.text)
          .map((r) => ({
            text: r!.text as string,
            severity: (r!.severity as string) || "medium",
          })) || [],
      implementationSteps:
        (object.implementationSteps?.filter(Boolean) as string[]) || [],
      testIdeas:
        (object.testIdeas?.filter(Boolean) as string[]) || [],
      requiresApproval: object.requiresApproval ?? false,
    };
  }, [isLoading, object]);

  // Initialize canvas plan from resolved plan (only if user hasn't edited yet)
  useEffect(() => {
    if (resolvedPlan && !canvasPlan) {
      setCanvasPlan(resolvedPlan);
    }
  }, [resolvedPlan, canvasPlan]);

  // Reset canvas when new streaming starts
  useEffect(() => {
    if (isLoading) {
      setCanvasPlan(null);
      setCanvasOpen(false);
    }
  }, [isLoading]);

  const displayError = error || streamError?.message || "";

  return (
    <>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-[family-name:var(--font-geist-sans)]">
        <div className={`mx-auto px-4 py-12 transition-all duration-300 ${object ? "max-w-5xl" : "max-w-3xl"}`}>
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Plan from Issue
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Strukturierte AI-Analyse — Text eingeben oder GitHub Issue
              importieren, gestreamten Implementierungsplan erhalten.
            </p>
          </header>

          {/* Settings */}
          <SettingsPanel
            settings={settings}
            onUpdate={updateSetting}
            onClear={() => {
              clearSettings();
              setSettings(DEFAULT_SETTINGS);
            }}
          />

          {/* Mode toggle */}
          <div className="mb-4 flex gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 w-fit">
            {(["manual", "github"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {m === "manual" ? "Manuell" : "GitHub Issue"}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div className="mb-6">
            {mode === "manual" ? (
              <>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={8}
                  placeholder="User Story, Issue, Ticket-Beschreibung oder Implementierungsanfrage hier einfügen..."
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 resize-y"
                />
                <div className="mt-2 flex gap-2">
                  {SEED_EXAMPLES.map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => setInputText(ex.text)}
                      className="rounded border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Beispiel: {ex.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={issueUrl}
                    onChange={(e) => setIssueUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo/issues/123"
                    className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                  />
                  <button
                    onClick={fetchIssue}
                    disabled={!issueUrl.trim() || fetchingIssue}
                    className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 transition-colors"
                  >
                    {fetchingIssue ? "Laden..." : "Laden"}
                  </button>
                </div>
                {issueError && (
                  <p className="mt-2 text-sm text-red-500">{issueError}</p>
                )}
                {issuePreview && <IssuePreview issue={issuePreview} />}
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="mb-8 flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 transition-colors"
            >
              {isLoading ? "Analysiere..." : "Analysieren"}
            </button>
            {isLoading && (
              <button
                onClick={stop}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Stopp
              </button>
            )}
            <button
              onClick={handleReset}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Zurücksetzen
            </button>
          </div>

          {/* Results */}
          {object ? (
            <>
              <PlanViewer
                plan={object}
                isLoading={isLoading}
                error={displayError}
                onOpenCanvas={
                  canvasPlan ? () => setCanvasOpen(true) : undefined
                }
              />

              {/* UI Mockup Preview — visible when plan is loaded and has frontend area */}
              {(canvasPlan || resolvedPlan)?.affectedAreas?.includes(
                "frontend"
              ) && (
                <MockupPreview
                  plan={(canvasPlan || resolvedPlan)!}
                  settings={settings}
                />
              )}
            </>
          ) : isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                </span>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Analysiere…
                </span>
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 animate-pulse space-y-4">
                <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-3 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
                <div className="h-4 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800 mt-4" />
                <div className="space-y-2">
                  <div className="h-3 w-5/6 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-3 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
              </div>
            </div>
          ) : displayError ? (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50 text-red-500 text-xs font-bold">
                  !
                </span>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {displayError}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-6 py-16 text-center">
              <p className="text-sm text-zinc-400">
                Gib Text ein oder importiere ein Issue, dann klicke auf
                Analysieren.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Canvas overlay */}
      {canvasOpen && canvasPlan && (
        <PlanCanvas
          plan={canvasPlan}
          onChange={setCanvasPlan}
          onClose={() => setCanvasOpen(false)}
        />
      )}
    </>
  );
}

/* ----- Issue Preview ----- */

function IssuePreview({ issue }: { issue: GitHubIssuePreview }) {
  return (
    <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            #{issue.number} {issue.title}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {issue.repository} · {issue.state}
          </p>
        </div>
        <a
          href={issue.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Öffnen
        </a>
      </div>
      {issue.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {issue.labels.map((l) => (
            <span
              key={l}
              className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-300"
            >
              {l}
            </span>
          ))}
        </div>
      )}
      {issue.body && (
        <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400 font-[family-name:var(--font-geist-mono)]">
          {issue.body.slice(0, 2000)}
          {issue.body.length > 2000 && "…"}
        </pre>
      )}
    </div>
  );
}

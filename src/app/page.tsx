"use client";

import { useState, useEffect, useCallback } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { implementationPlanSchema } from "@/lib/implementation-plan-schema";
import { type GitHubIssuePreview, type LocalSettings, DEFAULT_SETTINGS } from "@/lib/types";
import { loadSettings, saveSettings, clearSettings } from "@/lib/storage";

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
  // --- Settings ---
  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);

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

  // --- Source mode ---
  const [mode, setMode] = useState<SourceMode>("manual");
  const [inputText, setInputText] = useState("");
  const [issueUrl, setIssueUrl] = useState("");
  const [issuePreview, setIssuePreview] = useState<GitHubIssuePreview | null>(null);
  const [fetchingIssue, setFetchingIssue] = useState(false);
  const [issueError, setIssueError] = useState("");

  // --- Analysis ---
  const [error, setError] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const { object, submit, isLoading, stop, error: streamError } = useObject({
    api: "/api/analyze",
    schema: implementationPlanSchema,
    headers: {
      "x-provider-api-key": settings.providerApiKey,
      "x-model-id": settings.modelId || "gpt-4.1",
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
      setError("Please set a provider API key in Local test settings.");
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
  };

  // --- GitHub fetch ---
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

  // --- Copy ---
  const handleCopy = async () => {
    if (!object) return;
    await navigator.clipboard.writeText(JSON.stringify(object, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayError = error || streamError?.message || "";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-[family-name:var(--font-geist-sans)]">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Plan from Issue
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Schema-first structured output demo — paste text or import a GitHub
            issue, get a typed implementation plan via streaming.
          </p>
        </header>

        {/* Settings panel */}
        <div className="mb-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg"
          >
            Local test settings
            <span className="text-xs">{settingsOpen ? "▲" : "▼"}</span>
          </button>
          {settingsOpen && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-4 space-y-4">
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-3 py-2">
                Tokens are stored in localStorage for local testing only. Do not
                use production keys in shared environments.
              </p>

              {/* Provider API Key */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Provider API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={settings.providerApiKey}
                    onChange={(e) =>
                      updateSetting("providerApiKey", e.target.value)
                    }
                    placeholder="sk-..."
                    className="flex-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="rounded border border-zinc-300 dark:border-zinc-700 px-2 text-xs text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Model ID */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Model ID
                </label>
                <input
                  type="text"
                  value={settings.modelId}
                  onChange={(e) => updateSetting("modelId", e.target.value)}
                  placeholder="gpt-4.1"
                  className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Base URL (optional)
                </label>
                <input
                  type="text"
                  value={settings.baseUrl}
                  onChange={(e) => updateSetting("baseUrl", e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>

              {/* GitHub Token */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  GitHub Token (optional, for private repos)
                </label>
                <div className="flex gap-2">
                  <input
                    type={showGithubToken ? "text" : "password"}
                    value={settings.githubToken}
                    onChange={(e) =>
                      updateSetting("githubToken", e.target.value)
                    }
                    placeholder="ghp_..."
                    className="flex-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGithubToken(!showGithubToken)}
                    className="rounded border border-zinc-300 dark:border-zinc-700 px-2 text-xs text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    {showGithubToken ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  clearSettings();
                  setSettings(DEFAULT_SETTINGS);
                }}
                className="text-xs text-red-500 hover:text-red-600 underline"
              >
                Clear all settings
              </button>
            </div>
          )}
        </div>

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
              {m === "manual" ? "Manual text" : "GitHub issue"}
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
                placeholder="Paste a user story, issue body, ticket description, or implementation request..."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 resize-y"
              />
              <div className="mt-2 flex gap-2">
                {SEED_EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => setInputText(ex.text)}
                    className="rounded border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Try: {ex.label}
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
                  {fetchingIssue ? "Fetching..." : "Fetch"}
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
            {isLoading ? "Analyzing..." : "Analyze"}
          </button>
          {isLoading && (
            <button
              onClick={stop}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Stop
            </button>
          )}
          <button
            onClick={handleReset}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Error */}
        {displayError && (
          <div className="mb-6 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {displayError}
          </div>
        )}

        {/* Results */}
        {object && <ResultView plan={object} showRaw={showRaw} setShowRaw={setShowRaw} copied={copied} onCopy={handleCopy} />}

        {/* Empty state */}
        {!object && !isLoading && !displayError && (
          <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-6 py-12 text-center text-sm text-zinc-400">
            Paste text or import an issue, then click Analyze to generate a
            structured implementation plan.
          </div>
        )}
      </div>
    </div>
  );
}

/* ----- Sub-components ----- */

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
          Open
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

type PartialPlan = {
  summary?: string;
  affectedAreas?: (string | undefined)[];
  risks?: (string | undefined)[];
  implementationSteps?: (string | undefined)[];
  testIdeas?: (string | undefined)[];
  requiresApproval?: boolean;
};

function ResultView({
  plan,
  showRaw,
  setShowRaw,
  copied,
  onCopy,
}: {
  plan: PartialPlan;
  showRaw: boolean;
  setShowRaw: (v: boolean) => void;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Human-friendly view */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
        {/* Approval badge */}
        {plan.requiresApproval != null && (
          <div className="px-4 py-3">
            {plan.requiresApproval ? (
              <span className="inline-flex items-center rounded-md bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700 ring-inset">
                Requires approval
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-green-100 dark:bg-green-900/40 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300 ring-1 ring-green-300 dark:ring-green-700 ring-inset">
                No approval needed
              </span>
            )}
          </div>
        )}

        {/* Summary */}
        {plan.summary && (
          <Section title="Summary">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{plan.summary}</p>
          </Section>
        )}

        {/* Affected Areas */}
        {plan.affectedAreas && plan.affectedAreas.length > 0 && (
          <Section title="Affected Areas">
            <div className="flex flex-wrap gap-1.5">
              {plan.affectedAreas.filter(Boolean).map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {area}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Risks */}
        {plan.risks && plan.risks.length > 0 && (
          <Section title="Risks">
            <ul className="list-disc list-inside space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              {plan.risks.filter(Boolean).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </Section>
        )}

        {/* Implementation Steps */}
        {plan.implementationSteps && plan.implementationSteps.length > 0 && (
          <Section title="Implementation Steps">
            <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              {plan.implementationSteps.filter(Boolean).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </Section>
        )}

        {/* Test Ideas */}
        {plan.testIdeas && plan.testIdeas.length > 0 && (
          <Section title="Test Ideas">
            <ul className="list-disc list-inside space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              {plan.testIdeas.filter(Boolean).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* Raw JSON toggle */}
      <div>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
        >
          {showRaw ? "Hide" : "Show"} raw JSON
        </button>
        {showRaw && (
          <div className="relative mt-2">
            <pre className="overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 text-xs text-zinc-700 dark:text-zinc-300 font-[family-name:var(--font-geist-mono)]">
              {JSON.stringify(plan, null, 2)}
            </pre>
            <button
              onClick={onCopy}
              className="absolute top-2 right-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

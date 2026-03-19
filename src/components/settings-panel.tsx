"use client";

import { useState } from "react";
import type { LocalSettings } from "@/lib/types";

export function SettingsPanel({
  settings,
  onUpdate,
  onClear,
}: {
  settings: LocalSettings;
  onUpdate: <K extends keyof LocalSettings>(
    key: K,
    value: LocalSettings[K]
  ) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);

  return (
    <div className="mb-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg"
      >
        Local test settings
        <span className="text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-4 space-y-4">
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-3 py-2">
            Tokens are stored in localStorage for local testing only. Do
            not use production keys in shared environments.
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
                  onUpdate("providerApiKey", e.target.value)
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
              onChange={(e) => onUpdate("modelId", e.target.value)}
              placeholder="gpt-5.4"
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
              onChange={(e) => onUpdate("baseUrl", e.target.value)}
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
                  onUpdate("githubToken", e.target.value)
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
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-600 underline"
          >
            Clear all settings
          </button>
        </div>
      )}
    </div>
  );
}

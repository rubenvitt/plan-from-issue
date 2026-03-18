"use client";

import { useState, useRef, useEffect } from "react";

export function EditableField({
  value,
  onSave,
  className = "",
}: {
  value: string;
  onSave: (value: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <div className="space-y-1.5">
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSave(draft.trim() || value);
              setEditing(false);
            }
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          rows={Math.max(2, draft.split("\n").length)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 resize-y"
        />
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              onSave(draft.trim() || value);
              setEditing(false);
            }}
            className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-2.5 py-1 text-xs font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          >
            Speichern
          </button>
          <button
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <span
      className={`cursor-pointer rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors inline-flex items-start gap-1 group/edit ${className}`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="Klicke zum Bearbeiten"
    >
      <span className="flex-1">{value}</span>
      <span className="shrink-0 opacity-0 group-hover/edit:opacity-100 transition-opacity text-zinc-400 dark:text-zinc-500 text-[10px] mt-0.5 select-none">
        &#9998;
      </span>
    </span>
  );
}

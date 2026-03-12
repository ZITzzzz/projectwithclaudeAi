"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

function getFileName(path: unknown): string {
  if (typeof path !== "string" || !path) return "file";
  return path.split("/").filter(Boolean).pop() ?? "file";
}

export function getToolLabel(toolName: string, args: Record<string, unknown>): string {
  const fileName = getFileName(args.path);

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":    return `Creating ${fileName}`;
      case "str_replace": return `Editing ${fileName}`;
      case "insert":    return `Inserting into ${fileName}`;
      case "view":      return `Viewing ${fileName}`;
      case "undo_edit": return `Undoing edit in ${fileName}`;
      default:          return `Editing ${fileName}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args.command) {
      case "rename": return `Renaming ${fileName} → ${getFileName(args.new_path)}`;
      case "delete": return `Deleting ${fileName}`;
      default:       return `Managing ${fileName}`;
    }
  }

  return toolName;
}

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const { toolName, state, args } = toolInvocation;
  const isDone = state === "result";
  const label = getToolLabel(toolName, args as Record<string, unknown>);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div data-testid="done-indicator" className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      ) : (
        <Loader2 data-testid="spinner" className="w-3 h-3 animate-spin text-blue-600 flex-shrink-0" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}

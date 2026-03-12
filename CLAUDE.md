# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies, generate Prisma client, run DB migrations
npm run setup

# Start dev server (Next.js + Turbopack)
npm run dev

# Build for production
npm run build

# Run all tests
npm test

# Run a single test file
npx vitest run src/lib/__tests__/file-system.test.ts

# Run tests in watch mode
npx vitest

# Reset the database
npm run db:reset

# Lint
npm run lint
```

## Environment

Copy `.env` and set `ANTHROPIC_API_KEY` to use Claude AI. Without it, the app runs with a `MockLanguageModel` that returns hardcoded sequences — useful for development without API costs.

## Architecture

UIGen is a Next.js 15 app where users describe React components in a chat interface and AI generates/edits them in real time using a **virtual file system** (in-memory, never touches disk).

### Data Flow

```
User prompt → ChatProvider (useChat) → POST /api/chat
  → streamText (Claude claude-haiku-4-5) + tool calls
  → str_replace_editor / file_manager tools
  → VirtualFileSystem mutations
  → FileSystemContext.handleToolCall()
  → refreshTrigger++ → PreviewFrame re-renders
  → onFinish: serialize + persist to SQLite (if authenticated)
```

### Key Abstractions

**`VirtualFileSystem`** (`src/lib/file-system.ts`)
In-memory tree of `FileNode` objects. Supports CRUD, path normalization, serialization/deserialization. Powers the text-editor-style commands (`view`, `create`, `str_replace`, `insert`) used by AI tools.

**`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`)
Wraps `VirtualFileSystem` with React state. Exposes `handleToolCall()` — dispatches `str_replace_editor` and `file_manager` tool calls from the AI stream to mutate the FS and increment `refreshTrigger`.

**`ChatProvider`** (`src/lib/contexts/chat-context.tsx`)
Wraps `@ai-sdk/react`'s `useChat`. Serializes the full file system into every request so the server can reconstruct state. Handles tool result processing by calling `FileSystemContext.handleToolCall()` on each tool invocation.

**`PreviewFrame`** (`src/components/preview/PreviewFrame.tsx`)
Reacts to `refreshTrigger`. Detects entry point (`App.jsx` → `App.tsx` → `index.jsx` → `index.tsx`). Calls:
1. `createImportMap()` — Babel-transforms all JSX/TSX files into blob URLs, resolves third-party packages to `esm.sh`, builds an ES module import map.
2. `createPreviewHTML()` — Generates sandboxed HTML with the import map, Tailwind CDN, an error boundary, and React rendering logic.
Sets the result as `iframe.srcdoc`.

**`/api/chat`** (`src/app/api/chat/route.ts`)
POST endpoint. Reconstructs `VirtualFileSystem` from request body, calls `streamText` with `str_replace_editor` and `file_manager` tools. On finish, persists messages + file system to Prisma if the user is authenticated. `maxDuration = 120s`, `maxSteps = 40` (real) / `4` (mock).

**AI Tools**
- `str_replace_editor` (built by `buildStrReplaceTool`) — `view`, `create`, `str_replace`, `insert` commands on the virtual FS.
- `file_manager` (built by `buildFileManagerTool`) — `rename`, `delete` operations.

**Authentication** (`src/lib/auth.ts`, `src/actions/index.ts`)
JWT sessions via `jose`. 7-day expiry, stored in `httpOnly` cookie. Password hashing with `bcrypt`. Anonymous users are supported — projects with `userId = null` persist in SQLite but are not linked to any account. `src/middleware.ts` protects `/api/projects` and `/api/filesystem` routes.

### Path Conventions

- All paths in `VirtualFileSystem` are absolute (start with `/`).
- AI-generated imports use `@/` prefix (maps to virtual FS root `/`).
- System prompt (`src/lib/prompts/generation.tsx`) instructs Claude to place the entry point at `/App.jsx` and use `@/` for local imports.

### Provider / Model

`src/lib/provider.ts` → `getLanguageModel()` returns:
- `MockLanguageModel` if `ANTHROPIC_API_KEY` is unset — streams fixed hardcoded responses.
- `anthropic('claude-haiku-4-5')` otherwise — the real model.

To switch models, edit `getLanguageModel()` in `src/lib/provider.ts`.

### Testing

Vitest with `jsdom` environment. Tests are colocated in `__tests__/` subdirectories next to source files. Uses `@testing-library/react` for component tests.

Notable test areas: `VirtualFileSystem` operations, JSX transformer, chat and file-system contexts, and all chat/editor components.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI to generate and modify React components in real-time through a chat interface, featuring a virtual file system, sandboxed live preview, and optional user authentication.

## Commands

```bash
# Setup (first time)
npm run setup          # install deps, generate Prisma, run migrations

# Development
npm run dev            # start dev server with Turbopack
npm run dev:daemon     # start dev server in background (logs to logs.txt)

# Build & Run
npm run build
npm run start

# Testing
npm run test           # run vitest (watch mode)
npx vitest run         # run tests once
npx vitest run src/lib/__tests__/file-system.test.ts  # single test file

# Lint
npm run lint

# Database
npm run db:reset       # reset database and re-run migrations
npx prisma generate    # regenerate Prisma client after schema changes
npx prisma migrate dev # create/apply new migration
```

## Architecture

### Tech Stack
- **Framework:** Next.js 15 (App Router, Turbopack)
- **Frontend:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui (new-york style)
- **Editor:** Monaco Editor
- **AI:** Anthropic Claude via Vercel AI SDK (`ai` package), streams responses with tool calls
- **Database:** SQLite via Prisma ORM
- **Auth:** JWT sessions (jose) with bcrypt password hashing

### Key Architectural Concepts

**Virtual File System** (`src/lib/file-system.ts`): All generated code lives in an in-memory tree structure — no files written to disk. The VFS serializes to JSON for database persistence. `/App.jsx` is the required entry point for all generated projects.

**Code Transformation Pipeline** (`src/lib/transform/`): Babel standalone compiles JSX in-browser. Modules are loaded via blob URLs with an import map resolving third-party packages through esm.sh CDN. The `@/` import alias maps to local virtual files.

**AI Tool System** (`src/lib/tools/`): Claude uses two tools — `str_replace_editor` for file create/edit/insert and `file_manager` for rename/delete. Tool calls execute against the virtual file system client-side in `FileSystemContext`.

**State Management**: Two React Contexts — `ChatContext` (messages, form state) and `FileSystemContext` (virtual file system, selected file, tool call handling).

### Layout Structure
The app uses `react-resizable-panels` with a chat panel (left, 35%) and a preview/code panel (right, 65%). The code panel has a file tree (30%) and Monaco editor (70%). Preview runs in a sandboxed iframe.

### API
- `POST /api/chat` — Streaming chat endpoint. Accepts messages, files, and projectId. Max 10,000 tokens, 40 tool-call steps, 120s timeout. Auto-saves project state for authenticated users.

### Auth Flow
JWT tokens in httpOnly cookies with 7-day expiration. Middleware protects `/api/projects` and `/api/filesystem`. Anonymous users can work but lose state on refresh. Server actions in `src/actions/` handle sign up/in/out.

### Environment
- `ANTHROPIC_API_KEY` — optional; falls back to mock provider for offline dev/testing
- `JWT_SECRET` — defaults to `"development-secret-key"` in dev
- Path alias: `@/*` maps to `src/*`

### Database Models (Prisma)
The database schema is defined in the @prisma/schema.prisma file. Reference is anytime you need to understand the structure of the database
- **User**: email (unique), hashed password
- **Project**: name, userId (nullable for anonymous), messages (JSON), data (JSON file system state). Cascade deletes with User.

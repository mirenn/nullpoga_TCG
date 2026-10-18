# Nullpoga TCG - Development Guidelines

## Multi-Session & Git Worktree Best Practices

To maintain high development velocity while preventing merge conflicts and race conditions across concurrent sessions/agents:

### 1. Default Workflow (Direct on Main)
- Develop directly on `main` by default, verifying changes with typecheck/tests and committing/pushing directly.
- Feature branches (`feat/*`) are **not required** for normal tasks to eliminate merge overhead, PR drift, and branch clutter.
- Keep development fast, simple, and unified on `main`.

### 2. Multi-Session & Parallel Tasks Awareness
- **Parallel Work Check**: Before making changes, check `git status`. If another session, subagent, or external tool (e.g., Jules) is actively modifying files or has uncommitted work (`git status --porcelain` is dirty), be careful not to overwrite or conflict with their changes.
- When working concurrently with other active sessions or when explicitly instructed, use a short-lived branch or dedicated `git worktree`:
  ```bash
  # Optional: worktree for parallel isolated work
  git worktree add ../nullpoga_worktrees/<task-name> -b feat/<task-name>
  git worktree remove ../nullpoga_worktrees/<task-name>
  ```

### 3. Modular Architecture (Conflict Prevention)
- Avoid concentrating logic in massive files (e.g., keep card definitions, CPU AI logic, and UI components modular).
- Separating concerns allows concurrent sessions to modify distinct files without merge conflicts.

### 4. Git Operations & Verification
- Always run `npm run typecheck` and `npm test` to verify changes before committing.
- Commit messages must clearly articulate the **intent and background** behind the changes.

## 5. Coding Principles (Ponytail Mode)
- This project adopts **Ponytail** principles for lean, robust, and minimal code changes (see [AGENTS.md](file:///c:/Users/ngihy/Documents/nagai/nullpoga_TCG/AGENTS.md) and [.agents/rules/ponytail.md](file:///c:/Users/ngihy/Documents/nagai/nullpoga_TCG/.agents/rules/ponytail.md)).
- Prioritize existing helpers, stdlib, and installed packages over new abstractions or unnecessary dependencies.
- Never write unrequested features, options, or boilerplate. Keep diffs minimal and focused.
- Ensure risky logic has tests, and end responses with 1-2 lines detailing what was skipped and any residual risk.

# Nullpoga TCG - Development Guidelines

## Multi-Session & Git Worktree Best Practices

To maintain high development velocity while preventing merge conflicts and race conditions across concurrent sessions/agents:

### 1. Default Workflow (Single Session)
- When the working tree is clean and no concurrent sessions are modifying files, develop directly in the repository (using short-lived feature branches `feat/*` or `fix/*`).
- Do **not** create git worktrees unnecessarily to avoid filesystem clutter and overhead.

### 2. When to Use Git Worktree (On-Demand Worktree)
Create and switch to a dedicated `git worktree` when:
- Another session, subagent, or external tool (e.g., Jules) is actively working or running tasks in the repository.
- The working directory has uncommitted changes belonging to another ongoing task (`git status --porcelain` is dirty).
- Explicitly instructed by the user to work in parallel with other sessions.

#### Worktree Commands:
- Create worktree adjacent to the project directory:
  ```bash
  git worktree add ../nullpoga_worktrees/<branch-name> -b feat/<branch-name>
  ```
- Remove worktree after completion and push:
  ```bash
  git worktree remove ../nullpoga_worktrees/<branch-name>
  ```

### 3. Modular Architecture (Conflict Prevention)
- Avoid concentrating logic in massive files (e.g., keep card definitions, CPU AI logic, and UI components modular).
- Separating concerns allows concurrent sessions to modify distinct files without merge conflicts.

### 4. Git Operations & Verification
- Always run `npm run typecheck` and `npm test` to verify changes before committing.
- Commit messages must clearly articulate the **intent and background** behind the changes.

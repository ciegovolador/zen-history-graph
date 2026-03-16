## Context

The repository currently has no push restrictions. Any developer can push directly to `main`, bypassing code review. The repo is hosted on GitHub at `ciegovolador/zen-history-graph`.

## Goals / Non-Goals

**Goals:**
- Prevent accidental direct pushes to `main` via a local Git hook
- Document the required branch-and-PR workflow
- Provide GitHub branch protection configuration guidance

**Non-Goals:**
- Server-side enforcement via GitHub API (requires admin/paid plan features)
- Complex CI pipelines or status checks
- Automated PR creation tooling

## Decisions

### 1. Local pre-push hook via `.githooks/`

**Decision:** Use a custom `.githooks/pre-push` script that rejects pushes targeting `main` or `master` on the remote. Configure the repo to use `.githooks/` as the hooks directory.

**Rationale:** Local hooks are free, immediate, and don't require GitHub plan features. Storing hooks in `.githooks/` (committed to the repo) means every developer gets them automatically after running a setup step.

**Alternative considered:** Git's default `.git/hooks/` directory. Rejected because it's not version-controlled — each developer would need to set it up manually.

### 2. Setup via npm postinstall

**Decision:** Add a `postinstall` script in `package.json` that runs `git config core.hooksPath .githooks` to activate the hooks directory automatically when developers run `npm install`.

**Rationale:** Zero-friction setup. Developers don't need to remember a separate step.

**Alternative considered:** Manual `git config` step documented in CONTRIBUTING.md. Rejected as too easy to forget.

### 3. CONTRIBUTING.md for workflow docs

**Decision:** Add a `CONTRIBUTING.md` file documenting the branch workflow, not embedded in README.

**Rationale:** Standard GitHub convention. GitHub surfaces this file automatically when opening PRs and issues.

## Risks / Trade-offs

- **Hook can be bypassed with `--no-verify`** → Mitigation: This is a guardrail, not a security boundary. Document that `--no-verify` should not be used. True enforcement requires GitHub branch protection (paid feature for private repos).
- **Developers may not run `npm install`** → Mitigation: Document the manual `git config` step in CONTRIBUTING.md as a fallback.

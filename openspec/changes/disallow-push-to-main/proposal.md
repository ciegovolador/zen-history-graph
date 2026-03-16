## Why

Direct pushes to `main` risk introducing untested or unreviewed code into the primary branch. Enforcing a branch-and-PR workflow protects the codebase and establishes a review gate before changes land.

## What Changes

- **Add a Git pre-push hook** that rejects pushes directly to `main` (or `master`), requiring developers to push to feature branches and open PRs instead
- **Add GitHub branch protection rules** configuration guidance for the `main` branch
- **Add a contributing guide** documenting the required branch workflow

## Capabilities

### New Capabilities
- `branch-protection`: Local Git hook and CI configuration to prevent direct pushes to main

### Modified Capabilities
<!-- None — this is a new workflow enforcement, not a change to existing specs -->

## Impact

- **Git workflow**: Developers must create feature branches and open PRs to merge into main
- **New files**: `.githooks/pre-push` hook script, contributing guide
- **CI**: Optional GitHub Actions workflow to enforce PR-only merges
- **Existing code**: No changes to extension source code

## ADDED Requirements

### Requirement: Pre-push hook rejects direct pushes to main
The repository SHALL include a Git pre-push hook that rejects any push targeting the `main` or `master` branch on a remote.

#### Scenario: Push to main is rejected
- **WHEN** a developer runs `git push origin main`
- **THEN** the push is rejected with an error message explaining that direct pushes to main are not allowed and they must use a feature branch with a PR

#### Scenario: Push to feature branch is allowed
- **WHEN** a developer runs `git push origin feature/my-change`
- **THEN** the push proceeds normally without any hook interference

#### Scenario: Push to main with --no-verify bypasses hook
- **WHEN** a developer runs `git push --no-verify origin main`
- **THEN** the push proceeds (hooks are advisory, not a security boundary)

### Requirement: Hooks directory is version-controlled
The repository SHALL store Git hooks in a `.githooks/` directory that is committed to version control.

#### Scenario: Clone and setup
- **WHEN** a developer clones the repo and runs `npm install`
- **THEN** the Git hooks directory is automatically configured to `.githooks/` via a postinstall script

#### Scenario: Manual setup
- **WHEN** a developer clones the repo without running `npm install`
- **THEN** they can manually run `git config core.hooksPath .githooks` to activate the hooks

### Requirement: Contributing guide documents branch workflow
The repository SHALL include a `CONTRIBUTING.md` file that documents the required workflow: create a branch, push to the branch, open a PR to merge into main.

#### Scenario: Developer reads contributing guide
- **WHEN** a new contributor opens `CONTRIBUTING.md`
- **THEN** they find clear instructions on the branch-and-PR workflow, how the pre-push hook works, and how to set up their local environment

### Requirement: Hook provides actionable error message
The pre-push hook SHALL display a clear, actionable error message when rejecting a push, including the commands to create a branch and push to it instead.

#### Scenario: Error message content
- **WHEN** a push to main is rejected by the hook
- **THEN** the error message includes: the reason (direct push to main not allowed), and a suggested workflow (`git checkout -b my-branch` then `git push origin my-branch`)

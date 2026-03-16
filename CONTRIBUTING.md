# Contributing

## Branch Workflow

Direct pushes to `main` are not allowed. All changes must go through a pull request.

1. Create a feature branch from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b my-feature-branch
   ```

2. Make your changes and commit:
   ```bash
   git add <files>
   git commit -m "Description of changes"
   ```

3. Push your branch:
   ```bash
   git push origin my-feature-branch
   ```

4. Open a pull request on GitHub to merge into `main`.

## Pre-push Hook

This repo includes a pre-push hook that blocks direct pushes to `main` or `master`. It activates automatically when you run `npm install`.

If you see this error when pushing:

```
  PUSH REJECTED

  Direct pushes to 'main' are not allowed.
  Please use a feature branch and open a pull request.
```

Follow the workflow above to push to a feature branch instead.

## Local Setup

```bash
git clone git@github.com:ciegovolador/zen-history-graph.git
cd zen-history-graph
npm install        # Installs deps + activates git hooks
npm run build      # Build the extension
npm test           # Run tests
```

If you skip `npm install`, activate the hooks manually:

```bash
git config core.hooksPath .githooks
```

## Running Tests

```bash
npm test
```

All tests must pass before opening a PR.

# Sandtable

A web app that plays back famous battles as animated 2D "grand strategy" sequences, driven by a reusable JSON timeline format. See `docs/CONCEPT.md`.

## Agent skills

### Issue tracker

Issues live as GitHub issues, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Git workflow

Branch from `main` before any change; conventional commits; squash-merged PR whose title is the commit and whose body ends `Closes #<n>`. Direct pushes to `main` are blocked. See `docs/agents/git-workflow.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

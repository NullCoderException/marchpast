# Git workflow: branch, conventional commits, squash-merged PR

Every change to `main` arrives as a squash-merged pull request whose title is a conventional commit line. A ruleset on `main` blocks direct pushes and requires the CI checks, so the steps below are the only path that works.

## Before touching code: branch from main

```sh
git checkout main && git pull --ff-only
git checkout -b <type>/<issue>-<slug>      # e.g. feat/20-schema-validator
```

`<type>` is the conventional commit type of the change (below); `<issue>` is the GitHub issue number when there is one. Research and prototype branches from the wayfinder (`research/*`, `prototype/*`) are artefacts, not candidates for merge, and stay as they are.

## Commits: conventional commits

```
<type>(<scope>): <subject>

<body: what changed and why, wrapped at 72>

<trailers>
```

- **type**: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`. A breaking schema change adds `!` after the scope (`feat(schema)!: ...`).
- **scope**, optional: the area, e.g. `schema`, `renderer`, `player`, `data`, `docs`, `ci`.
- **subject**: imperative, lower case, no trailing period, under 72 characters. `add runtime validator for map files`, not `Added validator`.
- Keep existing trailers (`Co-Authored-By`, `Claude-Session`) at the end of the body.

Commits on a branch are squashed on merge, so a branch may carry several small commits; the PR title is what lands on `main`.

## Pull request

```sh
git push -u origin HEAD
gh pr create --title "<type>(<scope>): <subject>" --body-file - <<'EOF'
...body following .github/PULL_REQUEST_TEMPLATE.md...
EOF
```

- **Title** is a conventional commit line. CI rejects a PR whose title is not one; the title becomes the squash commit's subject on `main`.
- **Body** becomes the squash commit's body. It follows `.github/PULL_REQUEST_TEMPLATE.md` and ends with `Closes #<n>` for every issue the PR completes; GitHub closes those issues when the PR merges. Use `Part of #<n>` for an issue the PR advances without finishing.
- Merge only when CI is green: `gh pr merge --squash` (the only method the repo allows). The branch is deleted automatically.

## When a check fails

Fix on the branch and push again; the PR re-runs CI. A failing `pr-title` check means the title is not a conventional commit line: `gh pr edit <n> --title "..."`.

@AGENTS.md

# Secrets — DO NOT SKIP

**Never read `.env.local`** (or any `.env*` file containing real secrets). Do not open it, cat it, grep it, or print its contents. If you need to know which environment variables exist, consult `.env.example` instead, which lists the variable names without values.

# Git workflow — DO NOT SKIP

## Rules

1. **Track lines changed.** Count lines added/modified across all files during implementation. When you exceed **500 lines changed**, stop and cut a new PR.
2. **Stacking PRs:**
   - Create a feature branch, implement until ~500 lines, commit, push, open PR against master, merge.
   - Then create the next feature branch off master (pull latest), implement next ~500 lines, repeat.
   - Continue until session is over.
3. **When told to push:** commit, push to a feature branch, open a PR against master, merge the PR.
4. **Always merge PRs.** Do not leave PRs open — push, open, merge.

## Flow per session

```
git checkout master && git pull
git checkout -b feat/part-1
# ... implement until ~500 lines ...
# commit, push, gh pr create, gh pr merge
git checkout master && git pull
git checkout -b feat/part-2
# ... implement until ~500 lines ...
# commit, push, gh pr create, gh pr merge
# ... repeat ...
```

This is **not optional**. Do this every session.

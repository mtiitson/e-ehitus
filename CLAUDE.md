# e-ehitus skill repo

## Before pushing changes

Bump the version in `.claude-plugin/plugin.json` — Claude Code caches skills by version number (`~/.claude/plugins/cache/.../VERSION/`), so the cached copy won't update until the version changes.

- **Patch (1.0.x)** — doc fixes, corrected examples, field clarifications
- **Minor (1.x.0)** — new workflow steps, new document types, new scripts
- **Major (x.0.0)** — breaking changes (renamed files, restructured steps, changed auth flow)

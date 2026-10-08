---
title: Vault & Markdown
description: Folder layout, tasks/docs/knowledge, and Obsidian compatibility.
order: 2
slug: vault-markdown
duration: 8 min
---

## What is the vault?

The vault is **one folder** on your machine or NAS. ProMan reads and writes there — no backend. Without a connected folder, the app falls back to the browser (localStorage); for daily use and teams, the folder is the right path.

## Typical layout

```
my-vault/
  clients.json       # clients, projects, team members
  tasks/             # one Markdown file per task
  tasks/archive/     # archived tasks
  docs/              # working notes
  knowledge/         # client/project knowledge
  attachments/       # attachments
```

Issue keys (e.g. `ACM-WEB-1`) are filenames under `tasks/`. You can open files in Obsidian or any editor — ProMan stays the surface.

## Tasks, docs, knowledge

| Area | Purpose |
|---|---|
| **Tasks** | Work items with status, dates, assignees |
| **Docs** | Free-form notes in the vault |
| **Knowledge** | Structured client/project knowledge (categories, templates) |

Edits in ProMan write Markdown back. Outside edits (another editor, teammate) surface via the refresh banner — then **Reload**.

## Tips

- Pick one vault root, not a deep Downloads path
- Don’t save the same task in two tools without reloading
- Keep client/project codes stable — they feed issue keys

Next: [Day-to-day: tasks & views](/en/docs/day-to-day-views/index.html)

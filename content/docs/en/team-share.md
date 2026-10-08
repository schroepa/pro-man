---
title: Team on a share
description: Shared vault on NAS/SMB, session person, and soft concurrent guards.
order: 4
slug: team-share
duration: 8 min
---

## Who it’s for

Small teams (about 2–8 people) who use **the same folder** on a NAS, SMB share, or shared volume — without a sync server and without accounts.

## Setup

1. Create one vault root (e.g. `ProMan-Vault/` on the NAS).
2. Each member mounts the same path with write access.
3. In ProMan: **Connect folder** → pick that folder.
4. Backoffice → **Team & people**: create everyone once (stable IDs).
5. In the sidebar pick **I am …** (local to the browser only).

## Working rules

- After others change files: banner **Reload** (or reload the folder).
- On save with a stale warning: default = **Reload**; “Save anyway” only on purpose (last-write-wins).
- Coordinate big changes (codes, bulk import).
- Renaming members is fine; don’t hand-edit IDs in files.

## What ProMan is not

No live collab, no automatic merge, no presence. Soft concurrent detects conflict risk and warns — it does not replace a CRDT.

Cloud folders (iCloud, Dropbox, OneDrive) as the primary path under parallel use are risky (conflict files, lag).

## Browser

Chrome/Edge recommended. After a reload you may need to re-grant folder access.

Full playbook for admins: `docs/TEAM-VAULT.md` in the repo.

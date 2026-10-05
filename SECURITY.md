# Security

ProMan is a **local-first** app. All project data stays on your device.

## What we do

- Store tasks/docs in a folder you choose (File System Access API) or in browser `localStorage` / IndexedDB (directory handle only).
- Request filesystem permission only when you connect or re-authorize a vault.
- Keep processing in the browser — no ProMan backend, no account, no sync service.

## What we do not do

- No telemetry, analytics, or remote logging.
- No automatic uploads of vault contents.
- No multi-device sync (by design for this release).

## Permissions

- **Folder access** is granted per vault connection and can be revoked in the browser site settings.
- Disconnecting a vault clears the saved directory handle from IndexedDB; local fallback data in `localStorage` remains until you clear site data.

## Reporting

If you find a security issue in this repo, open a private report with the maintainer or a GitHub security advisory if available.

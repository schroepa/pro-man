---
title: Team auf einem Share
description: Gemeinsamer Vault auf NAS/SMB, Session-Person und Soft Concurrent.
order: 4
slug: team-share
duration: 8 Min.
---

## Für wen

Kleine Teams (ca. 2–8 Personen), die **denselben Ordner** auf NAS, SMB oder einem gemeinsamen Datenträger nutzen — ohne Sync-Server und ohne Accounts.

## Setup

1. Einen Vault-Root anlegen (z. B. `ProMan-Vault/` auf dem NAS).
2. Jedes Mitglied mountet denselben Pfad mit Schreibrechten.
3. In ProMan: **Ordner verbinden** → diesen Ordner wählen.
4. Backoffice → **Team & Personen**: alle Personen einmal anlegen (stabile IDs).
5. In der Sidebar **Ich bin …** wählen (nur lokal im Browser).

## Arbeitsregeln

- Nach Fremd-Änderungen: Banner **Neu laden** (oder Ordner neu laden).
- Bei Speichern mit Stale-Hinweis: Standard = **Neu laden**; „Trotzdem speichern“ nur bewusst (last-write-wins).
- Große Umbauten (Codes, Massen-Import) absprechen.
- Member umbenennen ist ok; IDs nicht manuell in Dateien ändern.

## Was ProMan nicht ist

Kein Live-Collab, kein automatisches Merge, keine Präsenz. Soft Concurrent erkennt Konfliktrisiken und warnt — ersetzt aber kein CRDT.

Cloud-Ordner (iCloud, Dropbox, OneDrive) als Primärpfad bei paralleler Nutzung sind riskant (Konfliktdateien, Verzögerung).

## Browser

Chrome/Edge empfohlen. Nach Reload ggf. Ordnerzugriff erneut erlauben.

Ausführliches Playbook für Entwickler und Admins: im Repo unter `docs/TEAM-VAULT.md`.

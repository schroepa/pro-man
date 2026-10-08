---
title: Vault & Markdown
description: Ordnerstruktur, Tasks/Docs/Wissen und Obsidian-Kompatibilität.
order: 2
slug: vault-markdown
duration: 8 Min.
---

## Was ist der Vault?

Der Vault ist **ein Ordner** auf deinem Rechner oder NAS. ProMan liest und schreibt darin — ohne Backend. Ohne verbundenen Ordner nutzt die App einen Browser-Fallback (localStorage); für den Alltag und Teams ist der Ordner der richtige Weg.

## Typische Struktur

```
mein-vault/
  clients.json       # Kunden, Projekte, Team-Personen
  tasks/             # eine Markdown-Datei pro Aufgabe
  tasks/archive/     # archivierte Aufgaben
  docs/              # Arbeitsnotizen
  knowledge/         # Kunden-/Projektwissen
  attachments/       # Anhänge
```

Issue-Keys (z. B. `ACM-WEB-1`) sind Dateinamen unter `tasks/`. Du kannst Dateien in Obsidian oder im Editor öffnen — ProMan bleibt die Oberfläche.

## Tasks, Docs, Wissen

| Bereich | Zweck |
|---|---|
| **Tasks** | Arbeitspakete mit Status, Datum, Zuweisung |
| **Docs** | Freie Notizen und Arbeitsdokumente im Vault |
| **Wissen** | Strukturiertes Kunden-/Projektwissen (Kategorien, Vorlagen) |

Änderungen in ProMan schreiben Markdown zurück. Änderungen von außen (anderer Editor, Teamkollege) erkennst du über den Aktualisierungs-Hinweis — dann **Neu laden**.

## Tipps

- Einen Vault-Root wählen, nicht irgendwo tief in Downloads
- Nicht parallel denselben Task in zwei Tools speichern, ohne neu zu laden
- Codes für Kunden/Projekte stabil halten — sie stecken in Issue-Keys

Weiter: [Alltag: Aufgaben & Views](/de/docs/alltag-views/index.html)

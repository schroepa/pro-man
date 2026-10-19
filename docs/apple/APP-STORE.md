# ProMan — App Store Release Checklist

ProMan bleibt **dauerhaft kostenlos**. Keine Accounts, keine Telemetrie, kein Sync-Server.

## Apple Developer

1. [Apple Developer Program](https://developer.apple.com/programs/) Mitgliedschaft
2. In Xcode: Target **ProMan** / **ProMan-iOS** → Signing → Team wählen
3. Bundle ID `app.proman.ProMan` in App Store Connect anlegen (Mac + iOS)

## Privacy Nutrition Labels

| Daten | Antwort |
|---|---|
| Kontodaten | Nein |
| Standort | Nein |
| Nutzungsdaten / Analytics | Nein |
| Diagnose | Nein (keine Telemetrie) |
| Dateien | Vault-Ordner nur lokal auf dem Gerät / in der vom Nutzer gewählten iCloud-Drive-Location |

**Privacy Policy URL:** Landing `/de/` bzw. `/en/` (Support-URL) — kurze Local-First-Erklärung ergänzen, falls Review danach fragt.

## Entitlements (Sandbox)

- App Sandbox: an
- User-selected file read/write: an
- App-scoped bookmarks: an
- Kein Network Client (außer künftig explizit nötig)

## Listing (Deutsch, Entwurf)

**Name:** ProMan  
**Untertitel:** Local-First Projektmanagement  
**Beschreibung (Kurz):**

> ProMan ist lokales Projektmanagement ohne Cloud-Zwang. Verbinde einen Vault-Ordner (Markdown, Obsidian-kompatibel) — auch in iCloud Drive. Kanban, Liste, Gantt, Kalender, Docs und Wissen in einer typischen Mac-App. Kostenlos, ohne Account.

**Keywords:** projektmanagement, kanban, markdown, obsidian, local-first, gantt, aufgaben  

**Kategorie:** Produktivität  
**Support URL:** https://\<deine-domain\>/de/  
**Marketing URL:** https://\<deine-domain\>/de/

## Screenshots

Mindestens:

1. Board (Kanban) mit verbundenem Vault  
2. Liste + Task-Detail  
3. Vault-Connect / Sidebar mit Kunden  

Ablage vorschlagen: `docs/apple/screenshots/` (nicht im Repo nötig vor dem Upload).

## TestFlight → Review

```bash
# Archive in Xcode: Product → Archive (Mac bzw. iOS)
# Organizer → Distribute App → App Store Connect → Upload
```

Manueller Smoke vor Upload:

- [ ] Vault in iCloud Drive verbinden, App neu starten → automatisch verbunden  
- [ ] Task anlegen/ändern → Datei unter `tasks/` sichtbar (auch in Web-App)  
- [ ] Extern ändern (Web oder Obsidian) → Stale-Banner → Neu laden  
- [ ] Kein Arbeiten ohne Vault  
- [ ] iPhone: Lesen ok; Schreiben nur wenn Toggle aus  

## Meilensteine

| # | Store | Status im Repo |
|---|---|---|
| M1c | Mac App Store | Code + Listing-Vorlage fertig; Upload braucht Team-ID |
| M2 | iOS App Store | Target `ProMan-iOS` baubar; Read-first Default |

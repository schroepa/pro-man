# Team-Vault — kleine Teams auf zentralem Datenträger

> **Zwischenlösung ohne Sync-Server.** Derselbe Vault-Ordner ist die Quelle der Wahrheit. ProMan bleibt local-first: kein Backend, keine Accounts, kein CRDT.

Zielgruppe: Studios / Teams mit ca. **2–8 Personen**, die einen gemeinsamen Ordner auf NAS, SMB-Share oder einem gemeinsam gemounteten Datenträger nutzen.

---

## Empfohlenes Setup

1. **Einen** Vault-Root anlegen (z. B. `ProMan-Vault/` auf dem NAS).
2. Jedes Teammitglied mountet denselben Pfad (gleiche Freigabe, gleiche Rechte: Lesen + Schreiben).
3. In ProMan (Chrome/Edge): Sidebar → **Ordner verbinden** → diesen Ordner wählen.
4. Im Backoffice unter **Team & Personen** einmalig alle Personen anlegen. Member-IDs bleiben stabil (`assigneeId` in Tasks).
5. Jede Person wählt in der Sidebar **Ich bin …** (Session-Identität, nur lokal im Browser).

Vault-Layout (unverändert):

```
mein-vault/
  clients.json            # clients, projects, members
  tasks/<ISSUE-KEY>.md
  tasks/archive/
  docs/
  attachments/
```

---

## Nicht empfohlen

| Praxis | Warum |
|--------|--------|
| iCloud / Dropbox / OneDrive als Primärpfad bei paralleler Nutzung | Sync-Konflikte (`.conflict`, Duplikate) und verzögerte Sichtbarkeit |
| Lokale Kopien / Offline-Ordner pro Person | Drift — keine gemeinsame Wahrheit |
| Mehrere Vault-Roots „pro Person“ | Zuweisungen und Issue-Keys laufen auseinander |
| Gleichzeitiges Bearbeiten **derselben** Task-Datei ohne Reload | Soft-Concurrent warnt, ersetzt aber kein Merge |

---

## Rollen (sozial, nicht technisch)

| Rolle | Verantwortung |
|--------|----------------|
| **Vault-Owner** | Members/Clients/Projekte pflegen; Codes und große Umbauten koordiniert |
| **Contributor** | Tasks, Docs, Kommentare, Status — nach Reload speichern |

ProMan hat **keine** ACL: wer Schreibzugriff auf den Ordner hat, kann alles ändern.

---

## Arbeitsregeln

1. Nach Fremd-Änderungen: Banner **Neu laden** nutzen (oder Sidebar → Ordner neu laden).
2. Bei Speichern mit Stale-Hinweis: Standard = **Neu laden**; „Trotzdem speichern“ nur bewusst (last-write-wins).
3. Große Umbauten (Kunden-Codes, Member löschen, Massen-Import) zeitlich absprechen.
4. Member umbenennen ist ok; **IDs nicht manuell in Dateien ändern**.
5. Kommentare und Default-Zuweisung folgen der gewählten Session-Person („Ich bin …“).

---

## Soft Concurrent — Limits

ProMan erkennt Änderungen am Vault und warnt vor dem Überschreiben. Das ist **kein** Live-Collab:

- **Fingerprint:** mtime + Größe + kurzer Inhalts-Digest (auch bei launischen NAS-mtimes).
- **Banner** nennt betroffene Dateien; „Später“ blendet nur den Hinweis aus — Speichern bleibt geschützt.
- **Speichern bei Stale:** Dialog mit Primäraktion **Neu laden**; Secondary **Trotzdem speichern** (last-write-wins).
- **Atomic writes:** Tasks, Docs und `clients.json` werden über Temp→Replace geschrieben (weniger Partial-Writes auf Shares).
- Keine Cursors, keine Präsenz, kein automatisches Merge.
- UI-Prefs (Theme, Favoriten, Sidebar) bleiben **pro Browser** — sie liegen nicht im Vault.

Multi-Device-Sync und CRDT bleiben bewusst geparkt (`docs/ROADMAP.md`).

---

## Browser & Berechtigungen

- **Chrome oder Edge** empfohlen (File System Access API).
- Nach Browser-Reload ggf. erneut Zugriff erlauben (`permission_needed`).
- Safari/Firefox: oft kein voller Ordner-Zugriff → Daten nur im Browser, nicht teamfähig über den Share.

---

## Checkliste Erstes Team-Setup

- [ ] Vault-Ordner auf dem Share angelegt und für alle schreibbar
- [ ] Owner verbindet Ordner und legt Members an
- [ ] Jede Person verbindet denselben Ordner und wählt „Ich bin …“
- [ ] Smoke: Person A speichert Task → Person B sieht Banner → Neu laden → sieht Änderung
- [ ] Kommentar von B trägt B’s Namen

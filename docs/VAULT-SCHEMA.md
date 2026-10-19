# Vault-Schema (Web ↔ Native)

Gemeinsamer Vertrag für Browser-App und Apple-Apps. **Ein Format, keine Forks.**

## Layout

```
vault/
  clients.json           # clients[], projects[], members?[]
  tasks/<KEY>.md         # aktive Tasks
  tasks/archive/<KEY>.md # archiviert
  docs/DOC-*.md
  knowledge/KN-*.md
  attachments/           # optional Binärdateien
```

Legacy: `TASK-*.md` im Vault-Root werden noch gelesen; neue Tasks landen unter `tasks/`.

## Task-Markdown

- YAML-Frontmatter (kompakt, ohne leeres Rauschen) + Body `# Titel` + Beschreibung
- Checkliste: `## Checkliste` oder legacy `### Checkliste`, Zeilen `- [x] Titel <!-- id:… -->`
- Kommentare: `## Kommentare`
- `schemaOrg`-Blöcke in Altbeständen werden beim Lesen ignoriert (nicht mehr geschrieben)

Referenz-Implementierungen:

- Web: [`src/storage/serializer.ts`](../src/storage/serializer.ts)
- Native: [`apple/Sources/ProManKit/Storage/TaskSerializer.swift`](../apple/Sources/ProManKit/Storage/TaskSerializer.swift)

## Soft Concurrent

Fingerprint aus relativen Pfaden + mtime/size/digest. Bei Abweichung: Banner, kein stilles Überschreiben. Details: [`TEAM-VAULT.md`](./TEAM-VAULT.md).

## Native Besonderheiten

- Security-scoped Bookmark statt File System Access API
- Kein localStorage-Fallback als Arbeitsmodus ohne Vault
- iCloud Drive = Nutzerordner, kein App-Container

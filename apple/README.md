# ProMan — Native Apple Apps

SwiftUI-Apps für **macOS** und **iPhone**, die denselben Local-First-Vault nutzen wie die Web-App (`clients.json`, `tasks/*.md`, `docs/`, `knowledge/`).

| | |
|---|---|
| **Xcode-Projekt** | [`ProMan.xcodeproj`](./ProMan.xcodeproj) (generiert aus [`project.yml`](./project.yml)) |
| **Shared Core** | Swift Package `ProManKit` ([`Package.swift`](./Package.swift)) |
| **Schemes** | `ProMan` (Mac) · `ProMan-iOS` (iPhone) |
| **Bundle ID** | `app.proman.ProMan` |
| **Preis** | Kostenlos (keine IAP) |
| **Typo** | System (SF Pro / SF Mono) — bewusst kein Geist aus der Web-App |

## Voraussetzungen

- Xcode 16+ (Developer Directory: `/Applications/Xcode.app/Contents/Developer`)
- Optional: [XcodeGen](https://github.com/yonaskolb/XcodeGen) — nach Änderungen an `project.yml`:

```bash
cd apple && xcodegen generate
```

## Bauen & Testen

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
cd apple

# Vault-Core / Serializer
swift test

# Mac App
xcodebuild -project ProMan.xcodeproj -scheme ProMan -destination 'platform=macOS' build

# iPhone (Simulator)
xcodebuild -project ProMan.xcodeproj -scheme ProMan-iOS \
  -destination 'generic/platform=iOS Simulator' build
```

Oder in Xcode: `apple/ProMan.xcodeproj` öffnen → Scheme **ProMan** / **ProMan-iOS** → Run.

## Vault verbinden

1. App starten → Screen **Vault verbinden**
2. Ordner wählen (z. B. in iCloud Drive)
3. Security-Scoped Bookmark bleibt über Restarts erhalten
4. Ohne Vault: kein stiller localStorage-Fallback

iPhone startet standardmäßig **nur Lesen** (Backoffice → Schreiben freischalten).

## App Store

Siehe [`docs/apple/APP-STORE.md`](../docs/apple/APP-STORE.md) (Privacy, Listing, TestFlight-Checkliste).

Team-ID in Xcode unter Signing & Capabilities setzen (`DEVELOPMENT_TEAM`).

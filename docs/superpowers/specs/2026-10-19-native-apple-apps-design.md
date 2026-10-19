# Native Apple Apps — Design

**Datum:** 2026-10-19  
**Status:** umgesetzt (M0–M2 im Repo; Store-Upload ausstehend Team-ID)

## Intent

ProMan als native SwiftUI-Apps im App Store (Mac zuerst, iPhone danach), ohne Browser-Tabs. Vault bleibt Local-First in einem Nutzerordner (typisch iCloud Drive). Web-App bleibt parallel und teilt das Format. Produkt dauerhaft kostenlos.

## Goals

- Volle Feature-Fläche der Web-App in der Mac-App (HIG, nicht Web-Port)
- Dauerhafte Vault-Verbindung (security-scoped bookmark)
- iPhone auf der Timeline; zuerst Lesen, Schreiben optional
- Korrektheit: Roundtrip-Tests gegen `vault-example`

## Non-Goals

- Electron / Capacitor / WebView-UI
- Sync-Server, Accounts, CRDT, Bezahlmodelle
- CloudKit-App-Container als Vault-Quelle

## Architektur

- `apple/ProManKit` — Modelle, Serializer, Domänenregeln, Vault I/O, `AppModel`
- `apple/Apps/ProMan` — SwiftUI Shell (macOS + iOS Targets)
- Vertrag: Vault-Markdown + `clients.json` (siehe README / dieses Repo)

## Look & Feel (festgelegt)

- HIG-Chrome (Split View, Toolbar, Menüs) + Custom Surfaces/Brand/Icons
- **Typografie: Systemfont (SF Pro / SF Mono)** — kein Geist aus der Web-App

## Qualität

- Kein stiller Fallback ohne Vault
- Soft Concurrent via Fingerprint + Banner
- `swift test` grün vor Releases

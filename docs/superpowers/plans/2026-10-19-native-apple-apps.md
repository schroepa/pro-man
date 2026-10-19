# Native Apple Apps — Implementation Plan

> **For agentic workers:** Execute via Xcode + `apple/` SPM.

**Goal:** Native Mac/iPhone apps sharing vault format with web.

**Tech:** Swift 5.9, SwiftUI, XcodeGen (`project.yml`), ProManKit package.

## Tasks

- [x] ProManKit serializers + VaultStore + bookmark persistence
- [x] Roundtrip tests against vault-example
- [x] Mac HIG shell (NavigationSplitView, views, Command Palette, export)
- [x] Feature views: Dashboard, Kanban, Liste, Gantt, Kalender, Docs, Wissen, Kunde, Backoffice
- [x] Soft Concurrent stale banner
- [x] iOS target, read-only default
- [x] App Store docs + entitlements
- [ ] App Store Connect upload (requires DEVELOPMENT_TEAM)

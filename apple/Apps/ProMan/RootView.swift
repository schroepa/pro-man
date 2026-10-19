import SwiftUI
import ProManKit
import UniformTypeIdentifiers
#if os(macOS)
import AppKit
#endif

struct RootView: View {
    @Environment(AppModel.self) private var model
    @State private var showImporter = false
    @State private var commandQuery = ""
    @State private var showCommandPalette = false
    @State private var newTaskTitle = ""
    @State private var showNewTask = false

    var body: some View {
        Group {
            if model.connectionState == .connected {
                connectedShell
            } else {
                ConnectVaultView(showImporter: $showImporter)
            }
        }
        .fileImporter(
            isPresented: $showImporter,
            allowedContentTypes: [.folder],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                guard let url = urls.first else { return }
                let scoped = url.startAccessingSecurityScopedResource()
                defer { if scoped { url.stopAccessingSecurityScopedResource() } }
                do {
                    try model.connect(to: url)
                } catch {
                    model.errorMessage = error.localizedDescription
                }
            case .failure(let error):
                model.errorMessage = error.localizedDescription
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .promanPickVault)) { _ in
            showImporter = true
        }
        .onReceive(NotificationCenter.default.publisher(for: .promanExportCSV)) { _ in
            exportText(ExportSupport.csv(for: model.filteredTasks), name: "proman-tasks.csv")
        }
        .onReceive(NotificationCenter.default.publisher(for: .promanExportICS)) { _ in
            exportText(ExportSupport.ics(for: model.filteredTasks), name: "proman-tasks.ics")
        }
        .alert("Fehler", isPresented: Binding(
            get: { model.errorMessage != nil },
            set: { if !$0 { model.errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) { model.errorMessage = nil }
        } message: {
            Text(model.errorMessage ?? "")
        }
        #if os(macOS)
        .onAppear {
            NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
                if event.modifierFlags.contains(.command), event.charactersIgnoringModifiers == "k" {
                    showCommandPalette = true
                    return nil
                }
                return event
            }
        }
        #endif
    }

    private var connectedShell: some View {
        @Bindable var model = model
        return NavigationSplitView {
            SidebarView()
        } detail: {
            VStack(spacing: 0) {
                if model.staleFingerprint != nil {
                    StaleVaultBanner()
                }
                destinationView
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .background(ProManTheme.canvas)
            .navigationTitle(model.destination.title)
            #if os(macOS)
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    TextField("Filter", text: $model.filterQuery)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 180)
                    Button {
                        showCommandPalette = true
                    } label: {
                        ProManIconView(icon: .search, size: 15)
                    }
                    .help("Suche ⌘K")
                    Button {
                        showNewTask = true
                    } label: {
                        ProManIconView(icon: .plus, size: 15)
                    }
                    .help("Neue Aufgabe")
                    .disabled(model.isReadOnly)
                    Button {
                        model.checkStale()
                        try? model.reload()
                    } label: {
                        ProManIconView(icon: .refresh, size: 15)
                    }
                    .help("Neu laden")
                }
            }
            #endif
        }
        .tint(ProManTheme.brand)
        .sheet(isPresented: $showCommandPalette) {
            CommandPaletteView(isPresented: $showCommandPalette)
        }
        .sheet(isPresented: $showNewTask) {
            NavigationStack {
                Form {
                    TextField("Titel", text: $newTaskTitle)
                }
                .navigationTitle("Neue Aufgabe")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Abbrechen") { showNewTask = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Anlegen") {
                            try? model.createTask(title: newTaskTitle)
                            newTaskTitle = ""
                            showNewTask = false
                        }
                        .disabled(newTaskTitle.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            }
            #if os(macOS)
            .frame(minWidth: 360, minHeight: 140)
            #endif
        }
    }

    private func exportText(_ text: String, name: String) {
        #if os(macOS)
        let panel = NSSavePanel()
        panel.nameFieldStringValue = name
        panel.canCreateDirectories = true
        if panel.runModal() == .OK, let url = panel.url {
            try? text.write(to: url, atomically: true, encoding: .utf8)
        }
        #else
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        try? text.write(to: url, atomically: true, encoding: .utf8)
        #endif
    }

    @ViewBuilder
    private var destinationView: some View {
        switch model.destination {
        case .dashboard: DashboardView()
        case .kanban: KanbanView()
        case .list: ListView()
        case .gantt: GanttView()
        case .calendar: CalendarView()
        case .docs: DocsView()
        case .knowledge: KnowledgeView()
        case .client: ClientDetailView()
        case .backoffice: BackofficeView()
        }
    }
}

struct ConnectVaultView: View {
    @Environment(AppModel.self) private var model
    @Binding var showImporter: Bool

    var body: some View {
        VStack(spacing: 20) {
            ProManIconView(icon: .folder, size: 48, lineWidth: 1.5)
                .foregroundStyle(ProManTheme.brand)
            Text("Vault verbinden")
                .font(.largeTitle.bold())
                .foregroundStyle(ProManTheme.textPrimary)
            Text("Wähle deinen Vault-Ordner (z. B. in iCloud Drive). Ohne Vault startet die App nicht mit leeren Ersatzdaten.")
                .multilineTextAlignment(.center)
                .foregroundStyle(ProManTheme.textSecondary)
                .frame(maxWidth: 420)
            if model.connectionState == .permissionNeeded {
                Text("Der gespeicherte Vault braucht erneut Zugriff.")
                    .foregroundStyle(.orange)
                Button("Erneut verbinden") {
                    if !model.tryReconnect() {
                        showImporter = true
                    }
                }
                .buttonStyle(.borderedProminent)
            }
            Button("Ordner wählen…") {
                showImporter = true
            }
            .buttonStyle(.borderedProminent)
            .keyboardShortcut("o", modifiers: [.command])
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(ProManTheme.canvas)
    }
}

struct StaleVaultBanner: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill")
            Text("Vault wurde extern geändert.")
            Spacer()
            Button("Später") { model.staleFingerprint = nil }
            Button("Neu laden") { try? model.acceptRemoteReload() }
                .buttonStyle(.borderedProminent)
        }
        .padding(10)
        .background(.yellow.opacity(0.25))
    }
}

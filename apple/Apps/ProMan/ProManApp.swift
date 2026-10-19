import SwiftUI
import ProManKit
import UniformTypeIdentifiers
#if os(macOS)
import AppKit
#endif

@main
struct ProManApp: App {
    @State private var model = AppModel()
    @AppStorage("proman.colorScheme") private var colorSchemePreference = "system"

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .tint(ProManTheme.brand)
                .preferredColorScheme(preferredScheme)
                .task {
                    #if os(iOS)
                    model.isReadOnly = true
                    #endif
                    _ = model.tryReconnect()
                }
        }
        #if os(macOS)
        .defaultSize(width: 1280, height: 840)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("Vault verbinden…") {
                    NotificationCenter.default.post(name: .promanPickVault, object: nil)
                }
                .keyboardShortcut("o", modifiers: [.command])
            }
            CommandMenu("Bearbeiten") {
                Button("Rückgängig") { try? model.undo() }
                    .keyboardShortcut("z", modifiers: [.command])
                Button("Wiederholen") { try? model.redo() }
                    .keyboardShortcut("z", modifiers: [.command, .shift])
            }
            CommandMenu("Gehe zu") {
                ForEach(AppModel.Destination.allCases.filter { $0 != .client }) { dest in
                    Button(dest.title) { model.destination = dest }
                }
            }
            CommandMenu("Export") {
                Button("Tasks als CSV…") {
                    NotificationCenter.default.post(name: .promanExportCSV, object: nil)
                }
                Button("Tasks als ICS…") {
                    NotificationCenter.default.post(name: .promanExportICS, object: nil)
                }
            }
        }
        #endif
    }

    private var preferredScheme: ColorScheme? {
        switch colorSchemePreference {
        case "light": return .light
        case "dark": return .dark
        default: return nil
        }
    }
}

extension Notification.Name {
    static let promanPickVault = Notification.Name("proman.pickVault")
    static let promanExportCSV = Notification.Name("proman.exportCSV")
    static let promanExportICS = Notification.Name("proman.exportICS")
}

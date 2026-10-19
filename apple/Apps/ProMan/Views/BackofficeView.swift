import SwiftUI
import ProManKit

struct BackofficeView: View {
    @Environment(AppModel.self) private var model
    @State private var newClientName = ""
    @State private var newMemberName = ""
    @AppStorage("proman.colorScheme") private var colorSchemePreference = "system"

    var body: some View {
        Form {
            Section("Erscheinungsbild") {
                Picker("Theme", selection: $colorSchemePreference) {
                    Text("System").tag("system")
                    Text("Hell").tag("light")
                    Text("Dunkel").tag("dark")
                }
                Text("Surfaces folgen Warm Obsidian; Akzent ist Copper. Typografie ist SF Pro.")
                    .font(ProManTheme.body(11))
                    .foregroundStyle(ProManTheme.textMuted)
            }
            Section("Kunden") {
                ForEach(model.snapshot.clientsFile.clients) { client in
                    LabeledContent {
                        Text(client.code ?? client.id)
                            .font(ProManTheme.mono(11))
                            .foregroundStyle(ProManTheme.textSecondary)
                    } label: {
                        Text(client.name)
                            .foregroundStyle(ProManTheme.textPrimary)
                    }
                }
                HStack {
                    TextField("Neuer Kunde", text: $newClientName)
                    Button("Anlegen") {
                        let name = newClientName.trimmingCharacters(in: .whitespaces)
                        guard !name.isEmpty else { return }
                        var file = model.snapshot.clientsFile
                        let code = String(name.prefix(3)).uppercased()
                        file.clients.append(Client(
                            id: "cli-\(UUID().uuidString.prefix(6).lowercased())",
                            name: name,
                            color: "#c25e1a",
                            code: code
                        ))
                        try? model.saveClients(file)
                        newClientName = ""
                    }
                    .disabled(model.isReadOnly)
                }
            }
            Section("Team & Personen") {
                ForEach(model.snapshot.clientsFile.members ?? []) { member in
                    Text(member.name)
                        .foregroundStyle(ProManTheme.textPrimary)
                }
                HStack {
                    TextField("Neue Person", text: $newMemberName)
                    Button("Anlegen") {
                        let name = newMemberName.trimmingCharacters(in: .whitespaces)
                        guard !name.isEmpty else { return }
                        var file = model.snapshot.clientsFile
                        var members = file.members ?? []
                        members.append(WorkspaceMember(
                            id: "mem-\(UUID().uuidString.prefix(6).lowercased())",
                            name: name,
                            kind: "internal"
                        ))
                        file.members = members
                        try? model.saveClients(file)
                        newMemberName = ""
                    }
                    .disabled(model.isReadOnly)
                }
            }
            Section("Vault") {
                LabeledContent("Pfad") {
                    Text(model.snapshot.rootURL?.path ?? "—")
                        .font(ProManTheme.mono(10))
                        .foregroundStyle(ProManTheme.textSecondary)
                        .lineLimit(2)
                }
                LabeledContent("Tasks", value: "\(model.snapshot.tasks.count)")
                LabeledContent("Docs", value: "\(model.snapshot.docs.count)")
                LabeledContent("Wissen", value: "\(model.snapshot.knowledge.count)")
                Button("Fingerprint prüfen") { model.checkStale() }
            }
            #if os(iOS)
            Section("iPhone") {
                Toggle("Nur Lesen", isOn: Binding(
                    get: { model.isReadOnly },
                    set: { model.isReadOnly = $0 }
                ))
                Text("Schreiben kannst du jederzeit freischalten — der Vault bleibt derselbe.")
                    .font(ProManTheme.body(11))
                    .foregroundStyle(ProManTheme.textMuted)
            }
            #endif
        }
        .formStyle(.grouped)
        .scrollContentBackground(.hidden)
        .background(ProManTheme.canvas)
        .tint(ProManTheme.brand)
        .preferredColorScheme(scheme)
    }

    private var scheme: ColorScheme? {
        switch colorSchemePreference {
        case "light": return .light
        case "dark": return .dark
        default: return nil
        }
    }
}

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
            }
            Section("Kunden") {
                ForEach(model.snapshot.clientsFile.clients) { client in
                    LabeledContent(client.name, value: client.code ?? client.id)
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
                            color: "#3b82f6",
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
                LabeledContent("Pfad", value: model.snapshot.rootURL?.path ?? "—")
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
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            #endif
        }
        .formStyle(.grouped)
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

import SwiftUI
import ProManKit

struct ClientDetailView: View {
    @Environment(AppModel.self) private var model

    private var client: Client? {
        model.snapshot.clientsFile.clients.first { $0.id == model.selectedClientId }
    }

    private var projects: [Project] {
        model.snapshot.clientsFile.projects.filter { $0.clientId == model.selectedClientId }
    }

    private var knowledge: [KnowledgeItem] {
        model.snapshot.knowledge.filter { $0.clientId == model.selectedClientId }
    }

    var body: some View {
        if let client {
            List {
                Section("Kunde") {
                    LabeledContent("Name", value: client.name)
                    LabeledContent("Code", value: client.code ?? "—")
                    if let description = client.description {
                        Text(description)
                    }
                }
                Section("Projekte") {
                    ForEach(projects) { project in
                        Button {
                            model.selectedProjectId = project.id
                            model.destination = .kanban
                        } label: {
                            Label(project.name, systemImage: "folder")
                        }
                    }
                }
                Section("Wissen") {
                    ForEach(knowledge) { item in
                        Text(item.title)
                    }
                }
                Section("Aktionen") {
                    Button("Board öffnen") { model.destination = .kanban }
                    Button("Docs öffnen") { model.destination = .docs }
                    Button("Wissen öffnen") { model.destination = .knowledge }
                }
            }
            .navigationTitle(client.name)
        } else {
            ContentUnavailableView("Kunde wählen", systemImage: "building.2", description: Text("Wähle einen Kunden in der Sidebar."))
        }
    }
}

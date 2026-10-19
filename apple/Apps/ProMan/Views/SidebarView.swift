import SwiftUI
import ProManKit

struct SidebarView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        #if os(macOS)
        macSidebar
        #else
        iosSidebar
        #endif
    }

    #if os(macOS)
    private var macSidebar: some View {
        @Bindable var model = model
        return List(selection: $model.destination) {
            sidebarContent
        }
        .navigationSplitViewColumnWidth(min: 200, ideal: 240)
        .safeAreaInset(edge: .bottom) { vaultFooter }
    }
    #endif

    private var iosSidebar: some View {
        List {
            Section("Ansichten") {
                ForEach(viewDestinations, id: \.self) { dest in
                    Button {
                        model.destination = dest
                    } label: {
                        Label(dest.title, systemImage: icon(for: dest))
                    }
                }
            }
            Section("Kunden") {
                ForEach(model.snapshot.clientsFile.clients) { client in
                    Button {
                        model.selectedClientId = client.id
                        model.selectedProjectId = nil
                        model.destination = .client
                    } label: {
                        Label(client.name, systemImage: "building.2")
                    }
                }
            }
            Section("Projekte") {
                ForEach(model.snapshot.clientsFile.projects) { project in
                    Button {
                        model.selectedClientId = project.clientId
                        model.selectedProjectId = project.id
                        model.destination = .kanban
                    } label: {
                        Label(project.name, systemImage: "folder")
                    }
                }
            }
        }
        .safeAreaInset(edge: .bottom) { vaultFooter }
    }

    @ViewBuilder
    private var sidebarContent: some View {
        Section("Ansichten") {
            ForEach(viewDestinations, id: \.self) { dest in
                Label(dest.title, systemImage: icon(for: dest))
                    .tag(dest)
            }
        }
        Section("Kunden") {
            ForEach(model.snapshot.clientsFile.clients) { client in
                Button {
                    model.selectedClientId = client.id
                    model.selectedProjectId = nil
                    model.destination = .client
                } label: {
                    Label(client.name, systemImage: "building.2")
                }
                .buttonStyle(.plain)
            }
        }
        Section("Projekte") {
            ForEach(model.snapshot.clientsFile.projects) { project in
                Button {
                    model.selectedClientId = project.clientId
                    model.selectedProjectId = project.id
                    model.destination = .kanban
                } label: {
                    Label(project.name, systemImage: "folder")
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var viewDestinations: [AppModel.Destination] {
        [.dashboard, .kanban, .list, .gantt, .calendar, .docs, .knowledge, .backoffice]
    }

    private var vaultFooter: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(model.snapshot.rootURL?.lastPathComponent ?? "Vault")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            #if os(iOS)
            if model.isReadOnly {
                Text("Nur Lesen")
                    .font(.caption2)
                    .foregroundStyle(.orange)
            }
            #endif
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
    }

    private func icon(for dest: AppModel.Destination) -> String {
        switch dest {
        case .dashboard: return "square.grid.2x2"
        case .kanban: return "rectangle.split.3x1"
        case .list: return "list.bullet"
        case .gantt: return "chart.bar.xaxis"
        case .calendar: return "calendar"
        case .docs: return "doc.text"
        case .knowledge: return "lightbulb"
        case .client: return "building.2"
        case .backoffice: return "gearshape"
        }
    }
}

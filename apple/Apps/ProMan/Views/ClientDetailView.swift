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
        Group {
            if let client {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(client.name)
                                .font(ProManTheme.body(24, weight: .bold))
                                .foregroundStyle(ProManTheme.textPrimary)
                            if let code = client.code {
                                Text(code)
                                    .font(ProManTheme.mono(12, weight: .semibold))
                                    .foregroundStyle(ProManTheme.brand)
                            }
                            if let description = client.description {
                                Text(description)
                                    .font(ProManTheme.body(13))
                                    .foregroundStyle(ProManTheme.textSecondary)
                            }
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .promanCard()

                        sectionBlock(title: "Projekte") {
                            if projects.isEmpty {
                                Text("Keine Projekte")
                                    .foregroundStyle(ProManTheme.textMuted)
                            }
                            ForEach(projects) { project in
                                Button {
                                    model.selectedProjectId = project.id
                                    model.destination = .kanban
                                } label: {
                                    HStack {
                                        ProManIconView(icon: .folder, size: 14)
                                        Text(project.name)
                                            .font(ProManTheme.body(13, weight: .medium))
                                        Spacer()
                                    }
                                    .foregroundStyle(ProManTheme.textPrimary)
                                    .padding(12)
                                    .promanSurface(radius: ProManTheme.radiusSm)
                                }
                                .buttonStyle(.plain)
                            }
                        }

                        sectionBlock(title: "Wissen") {
                            if knowledge.isEmpty {
                                Text("Keine Einträge")
                                    .foregroundStyle(ProManTheme.textMuted)
                            }
                            ForEach(knowledge) { item in
                                Text(item.title)
                                    .font(ProManTheme.body(13))
                                    .foregroundStyle(ProManTheme.textPrimary)
                                    .padding(12)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .promanSurface(radius: ProManTheme.radiusSm)
                            }
                        }

                        HStack(spacing: 10) {
                            actionChip("Board", icon: .layoutKanban) { model.destination = .kanban }
                            actionChip("Docs", icon: .fileText) { model.destination = .docs }
                            actionChip("Wissen", icon: .sparkles) { model.destination = .knowledge }
                        }
                    }
                    .padding(20)
                }
            } else {
                ContentUnavailableView {
                    Label {
                        Text("Kunde wählen").foregroundStyle(ProManTheme.textPrimary)
                    } icon: {
                        ProManIconView(icon: .briefcase, size: 28)
                            .foregroundStyle(ProManTheme.textMuted)
                    }
                } description: {
                    Text("Wähle einen Kunden in der Sidebar.")
                        .foregroundStyle(ProManTheme.textSecondary)
                }
            }
        }
        .promanCanvas()
    }

    private func sectionBlock<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundStyle(ProManTheme.textMuted)
                .tracking(0.4)
            content()
        }
    }

    private func actionChip(_ title: String, icon: ProManIcon, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                ProManIconView(icon: icon, size: 13)
                Text(title).font(ProManTheme.body(12, weight: .semibold))
            }
            .foregroundStyle(ProManTheme.brand)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .promanSurface(radius: ProManTheme.radiusSm)
        }
        .buttonStyle(.plain)
    }
}

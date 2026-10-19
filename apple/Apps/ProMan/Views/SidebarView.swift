import SwiftUI
import ProManKit

struct SidebarView: View {
    @Environment(AppModel.self) private var model
    @State private var hoveredId: String?

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    navSection(title: "Ansichten") {
                        ForEach(viewDestinations, id: \.self) { dest in
                            SidebarNavRow(
                                title: dest.title,
                                icon: .forDestination(dest),
                                isActive: isViewActive(dest),
                                isHovered: hoveredId == "view-\(dest.rawValue)"
                            ) {
                                model.selectedClientId = nil
                                model.selectedProjectId = nil
                                model.destination = dest
                            }
                            .sidebarHover(id: "view-\(dest.rawValue)", hoveredId: $hoveredId)
                        }
                    }

                    navSection(title: "Kunden") {
                        if model.snapshot.clientsFile.clients.isEmpty {
                            Text("Keine Kunden")
                                .font(.caption)
                                .foregroundStyle(ProManTheme.textMuted)
                                .padding(.horizontal, 10)
                        }
                        ForEach(model.snapshot.clientsFile.clients) { client in
                            SidebarNavRow(
                                title: client.name,
                                icon: .briefcase,
                                isActive: isClientActive(client.id),
                                isHovered: hoveredId == "client-\(client.id)",
                                accentDot: Color(hex: parseHex(client.color) ?? 0x3B82F6)
                            ) {
                                model.selectedClientId = client.id
                                model.selectedProjectId = nil
                                model.destination = .client
                            }
                            .sidebarHover(id: "client-\(client.id)", hoveredId: $hoveredId)
                        }
                    }

                    navSection(title: "Projekte") {
                        if model.snapshot.clientsFile.projects.isEmpty {
                            Text("Keine Projekte")
                                .font(.caption)
                                .foregroundStyle(ProManTheme.textMuted)
                                .padding(.horizontal, 10)
                        }
                        ForEach(model.snapshot.clientsFile.projects) { project in
                            SidebarNavRow(
                                title: project.name,
                                icon: .folder,
                                isActive: isProjectActive(project.id),
                                isHovered: hoveredId == "project-\(project.id)"
                            ) {
                                model.selectedClientId = project.clientId
                                model.selectedProjectId = project.id
                                model.destination = .kanban
                            }
                            .sidebarHover(id: "project-\(project.id)", hoveredId: $hoveredId)
                        }
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 12)
            }

            Divider().opacity(0.35)
            vaultFooter
        }
        .background(ProManTheme.sidebar)
        #if os(macOS)
        .navigationSplitViewColumnWidth(min: 220, ideal: 252, max: 320)
        #endif
    }

    private func navSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundStyle(ProManTheme.textMuted)
                .tracking(0.4)
                .padding(.horizontal, 10)
                .padding(.bottom, 2)
            content()
        }
    }

    private var viewDestinations: [AppModel.Destination] {
        [.dashboard, .kanban, .list, .gantt, .calendar, .docs, .knowledge, .backoffice]
    }

    /// Board row is active only without project filter (matches web sidebar).
    private func isViewActive(_ dest: AppModel.Destination) -> Bool {
        guard model.destination == dest else { return false }
        if dest == .kanban { return model.selectedProjectId == nil }
        return true
    }

    private func isClientActive(_ id: String) -> Bool {
        model.destination == .client && model.selectedClientId == id
    }

    private func isProjectActive(_ id: String) -> Bool {
        model.selectedProjectId == id && model.destination != .client
    }

    private var vaultFooter: some View {
        HStack(spacing: 8) {
            ProManIconView(icon: .folder, size: 14)
                .foregroundStyle(ProManTheme.textMuted)
            VStack(alignment: .leading, spacing: 2) {
                Text(model.snapshot.rootURL?.lastPathComponent ?? "Vault")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(ProManTheme.textSecondary)
                    .lineLimit(1)
                #if os(iOS)
                if model.isReadOnly {
                    Text("Nur Lesen")
                        .font(.caption2)
                        .foregroundStyle(ProManTheme.brand)
                }
                #endif
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(ProManTheme.sidebar)
    }

    private func parseHex(_ raw: String) -> UInt32? {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
        return v
    }
}

/// Custom nav row with explicit default / hover / active states (web sidebar parity).
struct SidebarNavRow: View {
    let title: String
    let icon: ProManIcon
    let isActive: Bool
    var isHovered: Bool = false
    var accentDot: Color? = nil
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if let accentDot {
                    Circle()
                        .fill(accentDot)
                        .frame(width: 6, height: 6)
                }
                ProManIconView(icon: icon, size: 16)
                    .foregroundStyle(isActive ? ProManTheme.brand : ProManTheme.textSecondary)
                Text(title)
                    .font(.system(size: 13, weight: isActive ? .semibold : .medium))
                    .foregroundStyle(isActive ? ProManTheme.brand : ProManTheme.textSecondary)
                    .lineLimit(1)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 10)
            .frame(height: ProManTheme.navRowHeight)
            .background(background, in: RoundedRectangle(cornerRadius: ProManTheme.radiusSm, style: .continuous))
            .shadow(color: isActive ? .black.opacity(0.04) : .clear, radius: 2, y: 1)
            .contentShape(RoundedRectangle(cornerRadius: ProManTheme.radiusSm, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isActive ? .isSelected : [])
    }

    private var background: Color {
        if isActive { return ProManTheme.surface }
        if isHovered { return ProManTheme.muted.opacity(0.7) }
        return .clear
    }
}

private extension View {
    @ViewBuilder
    func sidebarHover(id: String, hoveredId: Binding<String?>) -> some View {
        #if os(macOS)
        self.onHover { hovering in
            hoveredId.wrappedValue = hovering ? id : (hoveredId.wrappedValue == id ? nil : hoveredId.wrappedValue)
        }
        #else
        self
        #endif
    }
}

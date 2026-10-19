import SwiftUI
import ProManKit

struct CommandPaletteView: View {
    @Environment(AppModel.self) private var model
    @Binding var isPresented: Bool
    @State private var query = ""
    @FocusState private var focused: Bool

    private var results: [PaletteItem] {
        let q = query.lowercased()
        var items: [PaletteItem] = AppModel.Destination.allCases
            .filter { $0 != .client }
            .map { .destination($0) }
        items += model.snapshot.tasks.map { .task($0) }
        items += model.snapshot.docs.map { .doc($0) }
        items += model.snapshot.knowledge.map { .knowledge($0) }
        items += model.snapshot.clientsFile.clients.map { .client($0) }
        guard !q.isEmpty else { return Array(items.prefix(30)) }
        return items.filter { $0.searchText.contains(q) }.prefix(40).map { $0 }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                ProManIconView(icon: .search, size: 18)
                    .foregroundStyle(ProManTheme.textMuted)
                TextField("Suchen…", text: $query)
                    .textFieldStyle(.plain)
                    .font(ProManTheme.body(17))
                    .foregroundStyle(ProManTheme.textPrimary)
                    .focused($focused)
            }
            .padding(16)
            .background(ProManTheme.elevated)

            Rectangle()
                .fill(ProManTheme.muted.opacity(0.5))
                .frame(height: 1)

            ScrollView {
                LazyVStack(spacing: 2) {
                    ForEach(results) { item in
                        Button {
                            select(item)
                        } label: {
                            HStack(spacing: 10) {
                                ProManIconView(icon: item.icon, size: 15)
                                    .foregroundStyle(ProManTheme.textSecondary)
                                Text(item.title)
                                    .font(ProManTheme.body(13, weight: .medium))
                                    .foregroundStyle(ProManTheme.textPrimary)
                                    .lineLimit(1)
                                Spacer()
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(8)
            }
            .background(ProManTheme.elevated)
        }
        .promanElevated()
        #if os(macOS)
        .frame(width: 520, height: 420)
        #endif
        .onAppear { focused = true }
    }

    private func select(_ item: PaletteItem) {
        switch item {
        case .destination(let d):
            model.destination = d
        case .task(let t):
            model.selectedTaskId = t.id
            model.destination = .list
        case .doc:
            model.destination = .docs
        case .knowledge:
            model.destination = .knowledge
        case .client(let c):
            model.selectedClientId = c.id
            model.destination = .client
        }
        isPresented = false
    }
}

private enum PaletteItem: Identifiable {
    case destination(AppModel.Destination)
    case task(Task)
    case doc(DocItem)
    case knowledge(KnowledgeItem)
    case client(Client)

    var id: String {
        switch self {
        case .destination(let d): return "dest-\(d.rawValue)"
        case .task(let t): return "task-\(t.id)"
        case .doc(let d): return "doc-\(d.id)"
        case .knowledge(let k): return "kn-\(k.id)"
        case .client(let c): return "cli-\(c.id)"
        }
    }

    var title: String {
        switch self {
        case .destination(let d): return d.title
        case .task(let t): return "\(t.displayKey): \(t.title)"
        case .doc(let d): return "Doc: \(d.title)"
        case .knowledge(let k): return "Wissen: \(k.title)"
        case .client(let c): return "Kunde: \(c.name)"
        }
    }

    var icon: ProManIcon {
        switch self {
        case .destination(let d): return .forDestination(d)
        case .task: return .listDetails
        case .doc: return .fileText
        case .knowledge: return .sparkles
        case .client: return .briefcase
        }
    }

    var searchText: String { title.lowercased() }
}

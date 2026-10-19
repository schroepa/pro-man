import SwiftUI
import ProManKit
#if os(macOS)
import AppKit
#endif

struct KanbanView: View {
    @Environment(AppModel.self) private var model

    private let columns = [
        DefaultTaskStatus.todo,
        .inProgress,
        .inReview,
        .done,
    ]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: true) {
            HStack(alignment: .top, spacing: 14) {
                ForEach(columns, id: \.rawValue) { column in
                    KanbanColumn(
                        title: columnTitle(column),
                        status: column.rawValue,
                        accent: columnAccent(column),
                        tasks: model.filteredTasks
                            .filter { $0.status == column.rawValue }
                            .sorted { $0.order < $1.order }
                    )
                }
            }
            .padding(16)
            .frame(minHeight: 560, alignment: .top)
        }
        .background(KanbanPalette.windowBackground)
    }

    private func columnTitle(_ status: DefaultTaskStatus) -> String {
        switch status {
        case .todo: return "Zu erledigen"
        case .inProgress: return "In Bearbeitung"
        case .inReview: return "In Review"
        case .done: return "Erledigt"
        }
    }

    private func columnAccent(_ status: DefaultTaskStatus) -> Color {
        switch status {
        case .todo: return Color(red: 0.55, green: 0.58, blue: 0.64)
        case .inProgress: return Color(red: 0.20, green: 0.48, blue: 0.96)
        case .inReview: return Color(red: 0.72, green: 0.42, blue: 0.95)
        case .done: return Color(red: 0.18, green: 0.68, blue: 0.42)
        }
    }
}

struct KanbanColumn: View {
    @Environment(AppModel.self) private var model
    let title: String
    let status: String
    let accent: Color
    let tasks: [Task]

    @State private var isTargeted = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(Array(tasks.enumerated()), id: \.element.id) { index, task in
                        dropGap(beforeId: task.id, isFirst: index == 0)
                        KanbanCard(task: task, clientName: clientName(for: task))
                            .padding(.horizontal, 10)
                            .onTapGesture {
                                model.selectedTaskId = task.id
                                model.destination = .list
                            }
                            .contextMenu { statusMenu(for: task) }
                            .draggable(task.id) {
                                KanbanCard(task: task, clientName: clientName(for: task))
                                    .frame(width: 268)
                                    .opacity(0.92)
                            }
                    }
                    dropGap(beforeId: nil, isFirst: tasks.isEmpty)
                        .frame(minHeight: tasks.isEmpty ? 120 : 28)
                }
                .padding(.bottom, 12)
            }
        }
        .frame(width: 300)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(KanbanPalette.columnBackground)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(isTargeted ? accent.opacity(0.7) : Color.primary.opacity(0.06), lineWidth: isTargeted ? 2 : 1)
        )
        .dropDestination(for: String.self) { ids, _ in
            guard let id = ids.first else { return false }
            return applyDrop(id: id, beforeId: nil)
        } isTargeted: {
            isTargeted = $0
        }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(accent)
                .frame(width: 8, height: 8)
            Text(title)
                .font(.system(.headline, design: .default).weight(.semibold))
            Spacer()
            Text("\(tasks.count)")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Capsule().fill(Color.primary.opacity(0.06)))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    @ViewBuilder
    private func dropGap(beforeId: String?, isFirst: Bool) -> some View {
        KanbanDropGap(isFirst: isFirst, accent: accent) { draggedId in
            applyDrop(id: draggedId, beforeId: beforeId)
        }
    }

    private func applyDrop(id: String, beforeId: String?) -> Bool {
        guard !model.isReadOnly else { return false }
        // Dropping onto self before-slot is a no-op
        if beforeId == id { return true }
        do {
            try model.reorderTask(id: id, toStatus: status, beforeId: beforeId)
            return true
        } catch {
            model.errorMessage = error.localizedDescription
            return false
        }
    }

    @ViewBuilder
    private func statusMenu(for task: Task) -> some View {
        ForEach([
            DefaultTaskStatus.todo,
            .inProgress,
            .inReview,
            .done,
        ], id: \.rawValue) { s in
            Button(columnTitle(s)) {
                try? model.reorderTask(id: task.id, toStatus: s.rawValue, beforeId: nil)
            }
            .disabled(model.isReadOnly || s.rawValue == task.status)
        }
    }

    private func columnTitle(_ status: DefaultTaskStatus) -> String {
        switch status {
        case .todo: return "Zu erledigen"
        case .inProgress: return "In Bearbeitung"
        case .inReview: return "In Review"
        case .done: return "Erledigt"
        }
    }

    private func clientName(for task: Task) -> String? {
        guard let clientId = task.clientId else { return nil }
        return model.snapshot.clientsFile.clients.first { $0.id == clientId }?.name
    }
}

/// Thin hit target between cards so drops can insert at a precise index.
private struct KanbanDropGap: View {
    let isFirst: Bool
    let accent: Color
    let onDrop: (String) -> Bool

    @State private var isTargeted = false

    var body: some View {
        Color.clear
            .frame(height: isFirst ? 10 : 8)
            .overlay(alignment: .center) {
                if isTargeted {
                    Capsule()
                        .fill(accent)
                        .frame(height: 3)
                        .padding(.horizontal, 16)
                }
            }
            .contentShape(Rectangle())
            .dropDestination(for: String.self) { ids, _ in
                guard let id = ids.first else { return false }
                return onDrop(id)
            } isTargeted: {
                isTargeted = $0
            }
    }
}

struct KanbanCard: View {
    let task: Task
    var clientName: String?

    private var priorityColor: Color {
        switch task.priority {
        case .urgent: return Color(red: 0.90, green: 0.22, blue: 0.27)
        case .high: return Color(red: 0.95, green: 0.55, blue: 0.15)
        case .normal: return Color(red: 0.35, green: 0.55, blue: 0.95)
        case .low: return Color(red: 0.55, green: 0.58, blue: 0.64)
        }
    }

    private var doneSubtasks: Int { task.subtasks.filter(\.completed).count }

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(priorityColor)
                .frame(width: 4)
                .padding(.vertical, 2)

            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(task.displayKey)
                        .font(.caption.weight(.semibold).monospaced())
                        .foregroundStyle(.secondary)
                    Spacer(minLength: 0)
                    Text(task.priority.rawValue)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(priorityColor)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(priorityColor.opacity(0.14)))
                }

                Text(task.title)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)

                if !snippet.isEmpty {
                    Text(snippet)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                HStack(spacing: 8) {
                    if let clientName {
                        Label(clientName, systemImage: "building.2")
                            .labelStyle(.titleAndIcon)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    if !task.dueDate.isEmpty {
                        Label(task.dueDate, systemImage: "calendar")
                            .font(.caption2.monospaced())
                            .foregroundStyle(dueStyle)
                    }
                    if !task.subtasks.isEmpty {
                        Label("\(doneSubtasks)/\(task.subtasks.count)", systemImage: "checklist")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                if !task.tags.isEmpty {
                    FlowTags(tags: Array(task.tags.prefix(4)))
                }
            }
            .padding(.leading, 10)
            .padding(.trailing, 12)
            .padding(.vertical, 12)
        }
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(KanbanPalette.cardBackground)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.07), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.06), radius: 3, x: 0, y: 1)
        .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 3)
        .padding(.bottom, 8)
    }

    private var snippet: String {
        task.description
            .replacingOccurrences(of: #"^#+\s*"#, with: "", options: .regularExpression)
            .replacingOccurrences(of: #"\*+"#, with: "", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var dueStyle: Color {
        let today = ISO8601DateFormatter().string(from: Date()).prefix(10)
        if task.status != DefaultTaskStatus.done.rawValue, task.dueDate < String(today) {
            return Color(red: 0.90, green: 0.22, blue: 0.27)
        }
        return .secondary
    }
}

private struct FlowTags: View {
    let tags: [String]

    var body: some View {
        HStack(spacing: 4) {
            ForEach(tags, id: \.self) { tag in
                Text(tag)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Capsule().fill(Color.primary.opacity(0.06)))
            }
        }
    }
}

private enum KanbanPalette {
    static var windowBackground: Color {
        #if os(macOS)
        Color(nsColor: .windowBackgroundColor)
        #else
        Color(.systemGroupedBackground)
        #endif
    }

    static var columnBackground: Color {
        #if os(macOS)
        Color(nsColor: .controlBackgroundColor).opacity(0.72)
        #else
        Color(.secondarySystemGroupedBackground)
        #endif
    }

    static var cardBackground: Color {
        #if os(macOS)
        Color(nsColor: .textBackgroundColor)
        #else
        Color(.systemBackground)
        #endif
    }
}

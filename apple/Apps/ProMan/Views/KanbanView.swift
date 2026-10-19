import SwiftUI
import ProManKit

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
        .background(ProManTheme.canvas)
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
        case .todo: return ProManTheme.statusTodo
        case .inProgress: return ProManTheme.statusProgress
        case .inReview: return ProManTheme.statusReview
        case .done: return ProManTheme.statusDone
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
            RoundedRectangle(cornerRadius: ProManTheme.radiusLg, style: .continuous)
                .fill(ProManTheme.subtle)
        )
        .overlay(
            RoundedRectangle(cornerRadius: ProManTheme.radiusLg, style: .continuous)
                .strokeBorder(isTargeted ? accent.opacity(0.8) : Color.clear, lineWidth: isTargeted ? 2 : 0)
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
                .font(ProManTheme.body(13, weight: .semibold))
                .foregroundStyle(ProManTheme.textPrimary)
            Spacer()
            Text("\(tasks.count)")
                .font(ProManTheme.mono(11, weight: .semibold))
                .foregroundStyle(ProManTheme.textSecondary)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Capsule().fill(ProManTheme.muted.opacity(0.7)))
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
        case .urgent: return ProManTheme.priorityUrgent
        case .high: return ProManTheme.priorityHigh
        case .normal: return ProManTheme.priorityNormal
        case .low: return ProManTheme.priorityLow
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
                        .font(ProManTheme.mono(11, weight: .semibold))
                        .foregroundStyle(ProManTheme.textMuted)
                    Spacer(minLength: 0)
                    Text(task.priority.rawValue)
                        .font(ProManTheme.body(10, weight: .semibold))
                        .foregroundStyle(priorityColor)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(priorityColor.opacity(0.14)))
                }

                Text(task.title)
                    .font(ProManTheme.body(14, weight: .semibold))
                    .foregroundStyle(ProManTheme.textPrimary)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)

                if !snippet.isEmpty {
                    Text(snippet)
                        .font(ProManTheme.body(12))
                        .foregroundStyle(ProManTheme.textSecondary)
                        .lineLimit(2)
                }

                HStack(spacing: 8) {
                    if let clientName {
                        Text(clientName)
                            .font(ProManTheme.body(10))
                            .foregroundStyle(ProManTheme.textMuted)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    if !task.dueDate.isEmpty {
                        Text(task.dueDate)
                            .font(ProManTheme.mono(10))
                            .foregroundStyle(dueStyle)
                    }
                    if !task.subtasks.isEmpty {
                        Text("\(doneSubtasks)/\(task.subtasks.count)")
                            .font(ProManTheme.mono(10))
                            .foregroundStyle(ProManTheme.textMuted)
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
        .promanCard()
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
            return ProManTheme.priorityUrgent
        }
        return ProManTheme.textSecondary
    }
}

private struct FlowTags: View {
    let tags: [String]

    var body: some View {
        HStack(spacing: 4) {
            ForEach(tags, id: \.self) { tag in
                Text(tag)
                    .font(.caption2)
                    .foregroundStyle(ProManTheme.textSecondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Capsule().fill(ProManTheme.muted.opacity(0.8)))
            }
        }
    }
}

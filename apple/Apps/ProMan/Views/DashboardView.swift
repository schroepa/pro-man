import SwiftUI
import ProManKit

struct DashboardView: View {
    @Environment(AppModel.self) private var model

    private var openCount: Int {
        model.filteredTasks.filter { $0.status != DefaultTaskStatus.done.rawValue }.count
    }

    private var overdue: [Task] {
        let today = ISO8601DateFormatter().string(from: Date()).prefix(10)
        return model.filteredTasks.filter {
            !$0.dueDate.isEmpty
                && $0.dueDate < String(today)
                && $0.status != DefaultTaskStatus.done.rawValue
        }
    }

    var body: some View {
        List {
            Section("Fokus") {
                LabeledContent("Offen", value: "\(openCount)")
                LabeledContent("Überfällig", value: "\(overdue.count)")
                LabeledContent("Gesamt", value: "\(model.filteredTasks.count)")
            }
            Section("Attention") {
                if overdue.isEmpty {
                    Text("Nichts Überfälliges.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(overdue) { task in
                        TaskRow(task: task)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                model.selectedTaskId = task.id
                                model.destination = .list
                            }
                    }
                }
            }
            Section("Weiter") {
                Button("Zum Board") { model.destination = .kanban }
                Button("Zur Liste") { model.destination = .list }
            }
        }
    }
}

struct TaskRow: View {
    let task: Task

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(task.displayKey)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
                Spacer()
                Text(task.status)
                    .font(.caption)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(.quaternary, in: Capsule())
            }
            Text(task.title)
                .font(.body.weight(.medium))
            if !task.dueDate.isEmpty {
                Text("Fällig \(task.dueDate)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }
}

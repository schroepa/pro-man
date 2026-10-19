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
        ScrollView(.horizontal) {
            HStack(alignment: .top, spacing: 12) {
                ForEach(columns, id: \.rawValue) { column in
                    KanbanColumn(
                        title: columnTitle(column),
                        status: column.rawValue,
                        tasks: model.filteredTasks.filter { $0.status == column.rawValue }
                    )
                }
            }
            .padding()
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
}

struct KanbanColumn: View {
    @Environment(AppModel.self) private var model
    let title: String
    let status: String
    let tasks: [Task]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title).font(.headline)
                Spacer()
                Text("\(tasks.count)")
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 4)

            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(tasks) { task in
                        TaskRow(task: task)
                            .padding(10)
                            .background(.background.secondary, in: RoundedRectangle(cornerRadius: 8))
                            .onTapGesture {
                                model.selectedTaskId = task.id
                                model.destination = .list
                            }
                            .contextMenu {
                                ForEach([
                                    DefaultTaskStatus.todo,
                                    .inProgress,
                                    .inReview,
                                    .done,
                                ], id: \.rawValue) { s in
                                    Button(s.rawValue) {
                                        try? model.updateTaskStatus(id: task.id, status: s.rawValue)
                                    }
                                    .disabled(model.isReadOnly || s.rawValue == task.status)
                                }
                            }
                            .draggable(task.id)
                    }
                }
            }
            .dropDestination(for: String.self) { ids, _ in
                guard !model.isReadOnly else { return false }
                for id in ids {
                    try? model.updateTaskStatus(id: id, status: status)
                }
                return true
            }
        }
        .frame(width: 280)
        .padding(8)
        .background(.quaternary.opacity(0.35), in: RoundedRectangle(cornerRadius: 12))
    }
}

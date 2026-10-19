import SwiftUI
import ProManKit

struct GanttView: View {
    @Environment(AppModel.self) private var model

    private var rangedTasks: [Task] {
        model.filteredTasks.filter { !$0.startDate.isEmpty || !$0.dueDate.isEmpty }
    }

    var body: some View {
        if rangedTasks.isEmpty {
            ContentUnavailableView("Keine Termine", systemImage: "chart.bar.xaxis", description: Text("Aufgaben mit Start-/Fälligkeitsdatum erscheinen hier."))
        } else {
            List(rangedTasks) { task in
                VStack(alignment: .leading, spacing: 6) {
                    Text(task.title).font(.headline)
                    Text("\(task.startDate.isEmpty ? "—" : task.startDate) → \(task.dueDate.isEmpty ? "—" : task.dueDate)")
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                    GeometryReader { geo in
                        let progress = barProgress(for: task)
                        ZStack(alignment: .leading) {
                            Capsule().fill(.quaternary)
                            Capsule()
                                .fill(Color.accentColor.opacity(0.75))
                                .frame(width: max(8, geo.size.width * progress))
                        }
                    }
                    .frame(height: 10)
                }
                .padding(.vertical, 4)
                .contentShape(Rectangle())
                .onTapGesture {
                    model.selectedTaskId = task.id
                    model.destination = .list
                }
            }
        }
    }

    private func barProgress(for task: Task) -> CGFloat {
        switch task.status {
        case DefaultTaskStatus.done.rawValue: return 1
        case DefaultTaskStatus.inReview.rawValue: return 0.8
        case DefaultTaskStatus.inProgress.rawValue: return 0.5
        default: return 0.2
        }
    }
}

import SwiftUI
import ProManKit

struct GanttView: View {
    @Environment(AppModel.self) private var model

    private var rangedTasks: [Task] {
        model.filteredTasks.filter { !$0.startDate.isEmpty || !$0.dueDate.isEmpty }
    }

    var body: some View {
        Group {
            if rangedTasks.isEmpty {
                ContentUnavailableView {
                    Label {
                        Text("Keine Termine")
                            .foregroundStyle(ProManTheme.textPrimary)
                    } icon: {
                        ProManIconView(icon: .timeline, size: 28)
                            .foregroundStyle(ProManTheme.textMuted)
                    }
                } description: {
                    Text("Aufgaben mit Start-/Fälligkeitsdatum erscheinen hier.")
                        .foregroundStyle(ProManTheme.textSecondary)
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(rangedTasks) { task in
                            Button {
                                model.selectedTaskId = task.id
                                model.destination = .list
                            } label: {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(task.title)
                                        .font(ProManTheme.body(14, weight: .semibold))
                                        .foregroundStyle(ProManTheme.textPrimary)
                                    Text("\(task.startDate.isEmpty ? "—" : task.startDate) → \(task.dueDate.isEmpty ? "—" : task.dueDate)")
                                        .font(ProManTheme.mono(11))
                                        .foregroundStyle(ProManTheme.textMuted)
                                    GeometryReader { geo in
                                        let progress = barProgress(for: task)
                                        ZStack(alignment: .leading) {
                                            Capsule().fill(ProManTheme.muted.opacity(0.8))
                                            Capsule()
                                                .fill(ProManTheme.brand.opacity(0.85))
                                                .frame(width: max(8, geo.size.width * progress))
                                        }
                                    }
                                    .frame(height: 8)
                                }
                                .padding(14)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .promanCard()
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(20)
                }
            }
        }
        .promanCanvas()
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

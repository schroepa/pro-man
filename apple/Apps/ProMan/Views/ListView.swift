import SwiftUI
import ProManKit

struct ListView: View {
    @Environment(AppModel.self) private var model
    @State private var selection = Set<String>()
    @State private var sortOrder = [KeyPathComparator(\Task.order)]

    var body: some View {
        #if os(macOS)
        macList
        #else
        iosList
        #endif
    }

    #if os(macOS)
    private var macList: some View {
        @Bindable var model = model
        return HSplitView {
            Table(model.filteredTasks, selection: $selection, sortOrder: $sortOrder) {
                TableColumn("Key") { (task: Task) in
                    Text(task.displayKey)
                        .font(ProManTheme.mono(11, weight: .medium))
                        .foregroundStyle(ProManTheme.textSecondary)
                }
                .width(min: 80, ideal: 100)
                TableColumn("Titel") { (task: Task) in
                    Text(task.title)
                        .font(ProManTheme.body(13, weight: .medium))
                        .foregroundStyle(ProManTheme.textPrimary)
                }
                TableColumn("Status") { (task: Task) in
                    Text(task.status)
                        .font(ProManTheme.body(12))
                        .foregroundStyle(ProManTheme.textSecondary)
                }
                .width(min: 90, ideal: 110)
                TableColumn("Priorität") { (task: Task) in
                    Text(task.priority.rawValue)
                        .font(ProManTheme.body(12, weight: .medium))
                        .foregroundStyle(priorityColor(task.priority))
                }
                .width(70)
                TableColumn("Fällig") { (task: Task) in
                    Text(task.dueDate)
                        .font(ProManTheme.mono(11))
                        .foregroundStyle(ProManTheme.textMuted)
                }
                .width(100)
            }
            .scrollContentBackground(.hidden)
            .background(ProManTheme.canvas)
            .onChange(of: selection) { _, newValue in
                model.selectedTaskId = newValue.first
            }
            .contextMenu(forSelectionType: String.self) { ids in
                Button("Archivieren") {
                    for id in ids { try? model.archiveTask(id: id) }
                }
                .disabled(model.isReadOnly)
            } primaryAction: { ids in
                model.selectedTaskId = ids.first
            }

            Group {
                if let task = model.selectedTask {
                    TaskDetailView(task: task)
                        .frame(minWidth: 340)
                } else {
                    ContentUnavailableView {
                        Label {
                            Text("Aufgabe wählen")
                                .foregroundStyle(ProManTheme.textPrimary)
                        } icon: {
                            ProManIconView(icon: .listDetails, size: 28)
                                .foregroundStyle(ProManTheme.textMuted)
                        }
                    }
                    .frame(minWidth: 280)
                    .promanCanvas()
                }
            }
            .background(ProManTheme.surface)
        }
    }
    #endif

    private var iosList: some View {
        List(model.filteredTasks) { task in
            NavigationLink(value: task.id) {
                TaskRow(task: task)
            }
            .listRowBackground(ProManTheme.surface)
        }
        .promanScrollContent()
        .navigationDestination(for: String.self) { id in
            if let task = model.snapshot.tasks.first(where: { $0.id == id }) {
                TaskDetailView(task: task)
            }
        }
    }

    private func priorityColor(_ p: TaskPriority) -> Color {
        switch p {
        case .urgent: return ProManTheme.priorityUrgent
        case .high: return ProManTheme.priorityHigh
        case .normal: return ProManTheme.priorityNormal
        case .low: return ProManTheme.priorityLow
        }
    }
}

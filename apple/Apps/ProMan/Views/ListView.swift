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
                    Text(task.displayKey).font(.caption.monospaced())
                }
                .width(min: 80, ideal: 100)
                TableColumn("Titel", value: \.title)
                TableColumn("Status") { (task: Task) in
                    Text(task.status)
                }
                .width(min: 90, ideal: 110)
                TableColumn("Priorität") { (task: Task) in
                    Text(task.priority.rawValue)
                }
                .width(70)
                TableColumn("Fällig", value: \.dueDate)
                    .width(100)
            }
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

            if let task = model.selectedTask {
                TaskDetailView(task: task)
                    .frame(minWidth: 320)
            } else {
                ContentUnavailableView("Aufgabe wählen", systemImage: "checklist")
                    .frame(minWidth: 280)
            }
        }
        .padding(.top, 1)
    }
    #endif

    private var iosList: some View {
        List(model.filteredTasks) { task in
            NavigationLink(value: task.id) {
                TaskRow(task: task)
            }
        }
        .navigationDestination(for: String.self) { id in
            if let task = model.snapshot.tasks.first(where: { $0.id == id }) {
                TaskDetailView(task: task)
            }
        }
    }
}

import SwiftUI
import ProManKit

struct TaskDetailView: View {
    @Environment(AppModel.self) private var model
    @State private var draft: Task
    @State private var newComment = ""
    @State private var newSubtask = ""

    init(task: Task) {
        _draft = State(initialValue: task)
    }

    var body: some View {
        Form {
            Section("Essentials") {
                TextField("Titel", text: $draft.title)
                TextField("Issue-Key", text: Binding(
                    get: { draft.issueKey ?? "" },
                    set: { draft.issueKey = $0.isEmpty ? nil : $0 }
                ))
                .font(ProManTheme.mono(12))
                Picker("Status", selection: $draft.status) {
                    ForEach([
                        DefaultTaskStatus.todo.rawValue,
                        DefaultTaskStatus.inProgress.rawValue,
                        DefaultTaskStatus.inReview.rawValue,
                        DefaultTaskStatus.done.rawValue,
                    ], id: \.self) { Text($0).tag($0) }
                }
                Picker("Priorität", selection: $draft.priority) {
                    ForEach(TaskPriority.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                TextField("Start", text: $draft.startDate)
                    .font(ProManTheme.mono(12))
                TextField("Fällig", text: $draft.dueDate)
                    .font(ProManTheme.mono(12))
                TextField("Cycle", text: Binding(
                    get: { draft.cycle ?? "" },
                    set: { draft.cycle = $0.isEmpty ? nil : $0 }
                ))
                TextField("Git URL", text: Binding(
                    get: { draft.gitUrl ?? "" },
                    set: { draft.gitUrl = $0.isEmpty ? nil : $0 }
                ))
                Picker("Wiederholung", selection: Binding(
                    get: { draft.recurrence?.rawValue ?? "" },
                    set: { draft.recurrence = TaskRecurrence(rawValue: $0) }
                )) {
                    Text("Keine").tag("")
                    Text("Wöchentlich").tag("weekly")
                    Text("Monatlich").tag("monthly")
                }
            }
            Section("Beschreibung") {
                TextEditor(text: $draft.description)
                    .frame(minHeight: 120)
                    .font(ProManTheme.body(13))
            }
            Section("Checkliste") {
                ForEach($draft.subtasks) { $sub in
                    Toggle(isOn: $sub.completed) {
                        TextField("Subtask", text: $sub.title)
                    }
                }
                HStack {
                    TextField("Neuer Punkt", text: $newSubtask)
                    Button("Add") {
                        let title = newSubtask.trimmingCharacters(in: .whitespaces)
                        guard !title.isEmpty else { return }
                        draft.subtasks.append(Subtask(id: "sub-\(UUID().uuidString.prefix(6))", title: title, completed: false))
                        newSubtask = ""
                    }
                }
            }
            Section("Kommentare") {
                ForEach(draft.comments ?? []) { c in
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(c.author) · \(c.createdAt)")
                            .font(ProManTheme.mono(10))
                            .foregroundStyle(ProManTheme.textMuted)
                        Text(c.body)
                            .font(ProManTheme.body(13))
                            .foregroundStyle(ProManTheme.textPrimary)
                    }
                }
                HStack {
                    TextField("Kommentar", text: $newComment)
                    Button("Senden") {
                        let body = newComment.trimmingCharacters(in: .whitespaces)
                        guard !body.isEmpty else { return }
                        var comments = draft.comments ?? []
                        comments.append(TaskComment(
                            id: "cmt-\(UUID().uuidString.prefix(6))",
                            author: "Ich",
                            body: body,
                            createdAt: ISO8601DateFormatter().string(from: Date())
                        ))
                        draft.comments = comments
                        newComment = ""
                    }
                }
            }
            Section {
                Button("Speichern") { try? model.saveTask(draft) }
                    .disabled(model.isReadOnly)
                Button("Duplizieren") {
                    var copy = draft
                    copy.id = "TASK-\(UUID().uuidString.prefix(8).uppercased())"
                    copy.issueKey = nil
                    copy.title = draft.title + " (Kopie)"
                    copy.createdAt = ISO8601DateFormatter().string(from: Date())
                    copy.updatedAt = copy.createdAt
                    try? model.saveTask(copy)
                }
                .disabled(model.isReadOnly)
                Button("Archivieren", role: .destructive) {
                    try? model.archiveTask(id: draft.id)
                }
                .disabled(model.isReadOnly)
            }
        }
        .formStyle(.grouped)
        .scrollContentBackground(.hidden)
        .background(ProManTheme.surface)
        .tint(ProManTheme.brand)
        .onChange(of: model.selectedTaskId) { _, _ in
            if let task = model.selectedTask { draft = task }
        }
    }
}

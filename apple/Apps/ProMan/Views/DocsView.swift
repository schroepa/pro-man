import SwiftUI
import ProManKit

struct DocsView: View {
    @Environment(AppModel.self) private var model
    @State private var selectedId: String?
    @State private var draft: DocItem?

    var body: some View {
        NavigationSplitView {
            List(model.snapshot.docs, selection: $selectedId) { doc in
                Text(doc.title)
                    .tag(doc.id)
            }
            .navigationTitle("Docs")
            .toolbar {
                Button {
                    let id = "DOC-\(UUID().uuidString.prefix(6).uppercased())"
                    let now = ISO8601DateFormatter().string(from: Date())
                    let doc = DocItem(id: id, title: "Neues Doc", createdAt: now, updatedAt: now)
                    try? model.saveDoc(doc)
                    selectedId = id
                } label: {
                    Image(systemName: "plus")
                }
                .disabled(model.isReadOnly)
            }
        } detail: {
            if var doc = draft {
                Form {
                    TextField("Titel", text: Binding(
                        get: { doc.title },
                        set: { doc.title = $0; draft = doc }
                    ))
                    TextEditor(text: Binding(
                        get: { doc.content },
                        set: { doc.content = $0; draft = doc }
                    ))
                    .frame(minHeight: 240)
                    Button("Speichern") {
                        try? model.saveDoc(doc)
                    }
                    .disabled(model.isReadOnly)
                }
                .padding()
            } else {
                ContentUnavailableView("Doc wählen", systemImage: "doc.text")
            }
        }
        .onChange(of: selectedId) { _, id in
            draft = model.snapshot.docs.first { $0.id == id }
        }
    }
}

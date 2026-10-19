import SwiftUI
import ProManKit

struct KnowledgeView: View {
    @Environment(AppModel.self) private var model
    @State private var selectedId: String?
    @State private var draft: KnowledgeItem?

    var body: some View {
        NavigationSplitView {
            List(model.snapshot.knowledge, selection: $selectedId) { item in
                VStack(alignment: .leading) {
                    Text(item.title)
                    Text(item.category.rawValue)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .tag(item.id)
            }
            .navigationTitle("Wissen")
            .toolbar {
                Button {
                    let id = "KN-\(UUID().uuidString.prefix(6).uppercased())"
                    let now = ISO8601DateFormatter().string(from: Date())
                    let item = KnowledgeItem(
                        id: id,
                        clientId: model.selectedClientId ?? "",
                        category: .other,
                        title: "Neuer Eintrag",
                        createdAt: now,
                        updatedAt: now
                    )
                    try? model.saveKnowledge(item)
                    selectedId = id
                } label: {
                    Image(systemName: "plus")
                }
                .disabled(model.isReadOnly)
            }
        } detail: {
            if var item = draft {
                Form {
                    TextField("Titel", text: Binding(
                        get: { item.title },
                        set: { item.title = $0; draft = item }
                    ))
                    Picker("Kategorie", selection: Binding(
                        get: { item.category },
                        set: { item.category = $0; draft = item }
                    )) {
                        ForEach(KnowledgeCategory.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    TextEditor(text: Binding(
                        get: { item.content },
                        set: { item.content = $0; draft = item }
                    ))
                    .frame(minHeight: 240)
                    Button("Speichern") { try? model.saveKnowledge(item) }
                        .disabled(model.isReadOnly)
                }
                .padding()
            } else {
                ContentUnavailableView("Eintrag wählen", systemImage: "lightbulb")
            }
        }
        .onChange(of: selectedId) { _, id in
            draft = model.snapshot.knowledge.first { $0.id == id }
        }
    }
}

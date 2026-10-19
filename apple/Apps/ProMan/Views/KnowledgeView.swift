import SwiftUI
import ProManKit

struct KnowledgeView: View {
    @Environment(AppModel.self) private var model
    @State private var selectedId: String?
    @State private var draft: KnowledgeItem?

    var body: some View {
        NavigationSplitView {
            List(model.snapshot.knowledge, selection: $selectedId) { item in
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title)
                        .font(ProManTheme.body(13, weight: .medium))
                        .foregroundStyle(ProManTheme.textPrimary)
                    Text(item.category.rawValue)
                        .font(ProManTheme.body(11))
                        .foregroundStyle(ProManTheme.textMuted)
                }
                .tag(item.id)
                .listRowBackground(
                    (selectedId == item.id ? ProManTheme.surface : Color.clear)
                )
            }
            .promanScrollContent()
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
                    ProManIconView(icon: .plus, size: 14)
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
                    .font(ProManTheme.body(14))
                    Button("Speichern") { try? model.saveKnowledge(item) }
                        .disabled(model.isReadOnly)
                }
                .formStyle(.grouped)
                .scrollContentBackground(.hidden)
                .background(ProManTheme.surface)
                .tint(ProManTheme.brand)
            } else {
                ContentUnavailableView {
                    Label {
                        Text("Eintrag wählen").foregroundStyle(ProManTheme.textPrimary)
                    } icon: {
                        ProManIconView(icon: .sparkles, size: 28)
                            .foregroundStyle(ProManTheme.textMuted)
                    }
                }
                .promanCanvas()
            }
        }
        .tint(ProManTheme.brand)
        .onChange(of: selectedId) { _, id in
            draft = model.snapshot.knowledge.first { $0.id == id }
        }
    }
}

import Foundation

public enum KnowledgeSerializer {
    public static func toMarkdown(_ item: KnowledgeItem) -> String {
        var lines: [String] = [
            "---",
            "id: \(item.id)",
            "type: knowledge",
            "clientId: \(item.clientId)",
        ]
        if let projectId = item.projectId {
            lines.append("projectId: \(projectId)")
        }
        lines.append("category: \(item.category.rawValue)")
        lines.append("title: \(YAMLFrontmatter.jsonString(item.title))")
        lines.append("createdAt: \(item.createdAt)")
        lines.append("updatedAt: \(item.updatedAt)")
        if item.tags.isEmpty {
            lines.append("tags: []")
        } else {
            lines.append("tags:")
            item.tags.forEach { lines.append("  - \($0)") }
        }
        lines.append("---")
        lines.append("")
        lines.append(item.content.trimmingCharacters(in: .whitespacesAndNewlines))
        return lines.joined(separator: "\n") + "\n"
    }

    public static func fromMarkdown(_ rawContent: String, fallbackId: String) -> KnowledgeItem {
        let now = ISO8601DateFormatter().string(from: Date())
        let (fm, body) = YAMLFrontmatter.split(rawContent)
        guard let frontmatter = fm else {
            return KnowledgeItem(id: fallbackId, title: fallbackId, content: rawContent.trimmingCharacters(in: .whitespacesAndNewlines), createdAt: now, updatedAt: now)
        }
        let parsed = YAMLFrontmatter.parse(frontmatter)
        let tags: [String]
        if let arr = parsed["tags"] as? [Any] {
            tags = arr.map { "\($0)" }
        } else {
            tags = []
        }
        return KnowledgeItem(
            id: stringValue(parsed["id"]) ?? fallbackId,
            clientId: stringValue(parsed["clientId"]) ?? "",
            projectId: stringValue(parsed["projectId"]),
            category: KnowledgeCategory.parse(stringValue(parsed["category"]) ?? "other"),
            title: stringValue(parsed["title"]) ?? fallbackId,
            content: body.trimmingCharacters(in: .whitespacesAndNewlines),
            tags: tags,
            createdAt: stringValue(parsed["createdAt"]) ?? now,
            updatedAt: stringValue(parsed["updatedAt"]) ?? now
        )
    }

    private static func stringValue(_ any: Any?) -> String? {
        guard let any else { return nil }
        if let s = any as? String { return s.isEmpty ? nil : s }
        return "\(any)"
    }
}

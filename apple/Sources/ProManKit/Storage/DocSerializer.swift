import Foundation

public enum DocSerializer {
    public static func toMarkdown(_ doc: DocItem) -> String {
        var lines: [String] = [
            "---",
            "id: \(doc.id)",
            "type: doc",
            "clientId: \(doc.clientId)",
            "projectId: \(doc.projectId)",
            "title: \(YAMLFrontmatter.jsonString(doc.title))",
            "createdAt: \(doc.createdAt)",
            "updatedAt: \(doc.updatedAt)",
        ]
        if doc.tags.isEmpty {
            lines.append("tags: []")
        } else {
            lines.append("tags:")
            doc.tags.forEach { lines.append("  - \($0)") }
        }
        if let parent = doc.parentDocId {
            lines.append("parentDocId: \(parent)")
        }
        lines.append("---")
        lines.append("")
        lines.append(doc.content.trimmingCharacters(in: .whitespacesAndNewlines))
        return lines.joined(separator: "\n") + "\n"
    }

    public static func fromMarkdown(_ rawContent: String, fallbackId: String) -> DocItem {
        let now = ISO8601DateFormatter().string(from: Date())
        let (fm, body) = YAMLFrontmatter.split(rawContent)
        guard let frontmatter = fm else {
            return DocItem(id: fallbackId, title: fallbackId, content: rawContent.trimmingCharacters(in: .whitespacesAndNewlines), createdAt: now, updatedAt: now)
        }
        let parsed = YAMLFrontmatter.parse(frontmatter)
        let tags: [String]
        if let arr = parsed["tags"] as? [Any] {
            tags = arr.map { "\($0)" }
        } else {
            tags = []
        }
        return DocItem(
            id: stringValue(parsed["id"]) ?? fallbackId,
            clientId: stringValue(parsed["clientId"]) ?? "",
            projectId: stringValue(parsed["projectId"]) ?? "",
            title: stringValue(parsed["title"]) ?? fallbackId,
            content: body.trimmingCharacters(in: .whitespacesAndNewlines),
            tags: tags,
            parentDocId: stringValue(parsed["parentDocId"]),
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

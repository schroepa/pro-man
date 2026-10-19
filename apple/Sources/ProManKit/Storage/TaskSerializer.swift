import Foundation

public enum TaskSerializer {
    public static func normalizeTag(_ tag: String) -> String {
        var t = tag.trimmingCharacters(in: .whitespacesAndNewlines)
        if let range = t.range(of: #"^auch:\s*"#, options: [.regularExpression, .caseInsensitive]) {
            t.removeSubrange(range)
        }
        return t.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    public static func normalizeTags(_ tags: [String]?) -> [String] {
        guard let tags, !tags.isEmpty else { return [] }
        var seen = Set<String>()
        var out: [String] = []
        for raw in tags {
            let tag = normalizeTag(raw)
            guard !tag.isEmpty, !seen.contains(tag) else { continue }
            seen.insert(tag)
            out.append(tag)
        }
        return out
    }

    public static func toMarkdown(_ task: Task) -> String {
        var lines: [String] = ["---"]
        func push(_ key: String, _ value: String) { lines.append("\(key): \(value)") }
        func pushQuoted(_ key: String, _ value: String) { lines.append("\(key): \(YAMLFrontmatter.jsonString(value))") }

        push("id", task.id)
        if let issueKey = task.issueKey { pushQuoted("issueKey", issueKey) }
        pushQuoted("title", task.title)
        push("status", task.status)
        push("priority", task.priority.rawValue)
        if !task.startDate.isEmpty { push("startDate", task.startDate) }
        if !task.dueDate.isEmpty { push("dueDate", task.dueDate) }
        if let clientId = task.clientId { push("clientId", clientId) }
        if let projectId = task.projectId { push("projectId", projectId) }
        if let assigneeId = task.assigneeId { push("assigneeId", assigneeId) }
        push("order", String(task.order))
        push("createdAt", task.createdAt)
        push("updatedAt", task.updatedAt)
        if let archivedAt = task.archivedAt { push("archivedAt", archivedAt) }
        if let estimateHours = task.estimateHours {
            push("estimateHours", estimateHours.truncatingRemainder(dividingBy: 1) == 0
                 ? String(Int(estimateHours)) : String(estimateHours))
        }
        if let timeSpentHours = task.timeSpentHours {
            push("timeSpentHours", timeSpentHours.truncatingRemainder(dividingBy: 1) == 0
                 ? String(Int(timeSpentHours)) : String(timeSpentHours))
        }
        if let isMilestone = task.isMilestone { push("isMilestone", isMilestone ? "true" : "false") }
        if let cycle = task.cycle { pushQuoted("cycle", cycle) }
        if let gitUrl = task.gitUrl { pushQuoted("gitUrl", gitUrl) }
        if let recurrence = task.recurrence { push("recurrence", recurrence.rawValue) }

        let tags = normalizeTags(task.tags)
        if !tags.isEmpty {
            lines.append("tags:")
            tags.forEach { lines.append("  - \($0)") }
        }
        if !task.dependencies.isEmpty {
            lines.append("dependencies:")
            task.dependencies.forEach { lines.append("  - \($0)") }
        }
        if let attachments = task.attachments, !attachments.isEmpty {
            lines.append("attachments:")
            for att in attachments {
                lines.append("  - id: \(att.id)")
                lines.append("    name: \(YAMLFrontmatter.jsonString(att.name))")
                lines.append("    relativePath: \(YAMLFrontmatter.jsonString(att.relativePath))")
            }
        }
        if let timeLogs = task.timeLogs, !timeLogs.isEmpty {
            lines.append("timeLogs:")
            for log in timeLogs {
                lines.append("  - id: \(log.id)")
                lines.append("    hours: \(log.hours)")
                lines.append("    date: \(log.date)")
                if let description = log.description {
                    lines.append("    description: \(YAMLFrontmatter.jsonString(description))")
                }
                lines.append("    createdAt: \(log.createdAt)")
            }
        }

        lines.append("---")
        lines.append("")
        lines.append("# \(task.title)")
        let description = task.description.trimmingCharacters(in: .whitespacesAndNewlines)
        if !description.isEmpty {
            lines.append("")
            lines.append(description)
        }
        if !task.subtasks.isEmpty {
            lines.append("")
            lines.append("## Checkliste")
            for sub in task.subtasks {
                let mark = sub.completed ? "x" : " "
                lines.append("- [\(mark)] \(sub.title) <!-- id:\(sub.id) -->")
            }
        }
        if let comments = task.comments, !comments.isEmpty {
            lines.append("")
            lines.append("## Kommentare")
            for c in comments {
                lines.append("- **\(c.author)** (\(c.createdAt)): \(c.body) <!-- id:\(c.id) -->")
            }
        }
        return lines.joined(separator: "\n") + "\n"
    }

    public static func fromMarkdown(_ rawContent: String, fallbackId: String) -> Task {
        let now = ISO8601DateFormatter().string(from: Date())
        let (fm, bodyStr) = YAMLFrontmatter.split(rawContent)
        guard let frontmatter = fm else {
            return Task(id: fallbackId, title: fallbackId, description: rawContent.trimmingCharacters(in: .whitespacesAndNewlines), createdAt: now, updatedAt: now)
        }

        let parsed = YAMLFrontmatter.parse(frontmatter)

        let commentRegex = try! NSRegularExpression(
            pattern: #"^- \*\*(.+?)\*\* \(([^)]+)\):\s*(.*?)(?:\s*<!--\s*id:([^\s]+)\s*-->)?\s*$"#,
            options: .anchorsMatchLines
        )

        func section(named name: String, in body: String) -> String? {
            // Use \\z (end of string), not $ — with (?m), $ matches end-of-line and truncates sections.
            let pattern = #"^#{2,3} "# + NSRegularExpression.escapedPattern(for: name)
                + #"\n([\s\S]*?)(?=\n#{2,3} |\z)"#
            guard let re = try? NSRegularExpression(pattern: pattern, options: [.anchorsMatchLines]),
                  let match = re.firstMatch(in: body, range: NSRange(body.startIndex..., in: body)),
                  let range = Range(match.range(at: 1), in: body) else { return nil }
            return String(body[range])
        }

        var subtasks: [Subtask] = []
        let checklistSource = section(named: "Checkliste", in: bodyStr) ?? bodyStr
        let checkboxPattern = try! NSRegularExpression(
            pattern: #"^- \[([ xX])\]\s+(.+?)(?:\s+<!--\s*id:([^\s]+)\s*-->)?\s*$"#
        )
        for line in checklistSource.split(whereSeparator: \.isNewline).map(String.init) {
            let ns = line as NSString
            guard let match = checkboxPattern.firstMatch(in: line, range: NSRange(location: 0, length: ns.length)) else {
                continue
            }
            let mark = ns.substring(with: match.range(at: 1))
            var title = ns.substring(with: match.range(at: 2))
                .trimmingCharacters(in: .whitespaces)
            title = title.replacingOccurrences(
                of: #"\s*<!--\s*id:[^\s]+\s*-->\s*$"#,
                with: "",
                options: .regularExpression
            ).trimmingCharacters(in: .whitespaces)
            let id: String
            if match.range(at: 3).location != NSNotFound {
                id = ns.substring(with: match.range(at: 3))
            } else {
                id = "sub-\(subtasks.count + 1)"
            }
            guard !title.isEmpty else { continue }
            subtasks.append(Subtask(id: id, title: title, completed: mark.lowercased() == "x"))
        }

        var comments: [TaskComment] = []
        if let commentsSection = section(named: "Kommentare", in: bodyStr) {
            let cNS = commentsSection as NSString
            commentRegex.enumerateMatches(in: commentsSection, range: NSRange(location: 0, length: cNS.length)) { match, _, _ in
                guard let match else { return }
                let author = cNS.substring(with: match.range(at: 1)).trimmingCharacters(in: .whitespaces)
                let createdAt = cNS.substring(with: match.range(at: 2)).trimmingCharacters(in: .whitespaces)
                var body = cNS.substring(with: match.range(at: 3))
                body = body.replacingOccurrences(of: #"\s*<!--\s*id:[^\s]+\s*-->\s*$"#, with: "", options: .regularExpression)
                    .trimmingCharacters(in: .whitespaces)
                let id: String
                if match.range(at: 4).location != NSNotFound {
                    id = cNS.substring(with: match.range(at: 4))
                } else {
                    id = "cmt-\(comments.count + 1)"
                }
                comments.append(TaskComment(id: id, author: author, body: body, createdAt: createdAt))
            }
        }

        var cleanBody = bodyStr
        cleanBody = cleanBody.replacingOccurrences(of: #"^\s*#\s+.+\n+"#, with: "", options: .regularExpression)
        cleanBody = cleanBody.replacingOccurrences(of: #"#{2,3} Checkliste[\s\S]*?(?=\n#{2,3} |$)"#, with: "", options: .regularExpression)
        cleanBody = cleanBody.replacingOccurrences(of: #"#{2,3} Kommentare[\s\S]*?(?=\n#{2,3} |$)"#, with: "", options: .regularExpression)
        cleanBody = cleanBody.trimmingCharacters(in: .whitespacesAndNewlines)

        let statusRaw = stringValue(parsed["status"]) ?? "todo"
        let priorityRaw = stringValue(parsed["priority"]) ?? "normal"
        let priority = TaskPriority(rawValue: priorityRaw) ?? .normal
        let recurrenceRaw = stringValue(parsed["recurrence"]) ?? ""
        let recurrence = TaskRecurrence(rawValue: recurrenceRaw)

        var timeLogs: [TimeEntry]?
        if let rawLogs = parsed["timeLogs"] as? [[String: Any]] {
            timeLogs = rawLogs.compactMap { log in
                guard let id = stringValue(log["id"]),
                      let hours = doubleValue(log["hours"]),
                      let date = stringValue(log["date"]),
                      let createdAt = stringValue(log["createdAt"]) else { return nil }
                return TimeEntry(
                    id: id,
                    hours: hours,
                    date: date,
                    description: stringValue(log["description"]),
                    createdAt: createdAt
                )
            }
            if timeLogs?.isEmpty == true { timeLogs = nil }
        }

        var attachments: [TaskAttachment]?
        if let rawAtt = parsed["attachments"] as? [[String: Any]] {
            attachments = rawAtt.compactMap { att in
                guard let id = stringValue(att["id"]), let name = stringValue(att["name"]) else { return nil }
                return TaskAttachment(id: id, name: name, relativePath: stringValue(att["relativePath"]) ?? "")
            }
            if attachments?.isEmpty == true { attachments = nil }
        }

        let tags: [String]
        if let arr = parsed["tags"] as? [Any] {
            tags = normalizeTags(arr.map { "\($0)" })
        } else {
            tags = []
        }
        let dependencies: [String]
        if let arr = parsed["dependencies"] as? [Any] {
            dependencies = arr.map { "\($0)" }
        } else {
            dependencies = []
        }

        return Task(
            id: stringValue(parsed["id"]) ?? fallbackId,
            clientId: stringValue(parsed["clientId"]),
            projectId: stringValue(parsed["projectId"]),
            assigneeId: stringValue(parsed["assigneeId"]),
            title: stringValue(parsed["title"]) ?? fallbackId,
            description: cleanBody,
            status: statusRaw,
            priority: priority,
            startDate: (stringValue(parsed["startDate"]) ?? "").trimmingCharacters(in: .whitespaces),
            dueDate: (stringValue(parsed["dueDate"]) ?? "").trimmingCharacters(in: .whitespaces),
            estimateHours: doubleValue(parsed["estimateHours"]),
            timeSpentHours: doubleValue(parsed["timeSpentHours"]),
            timeLogs: timeLogs,
            isMilestone: parsed["isMilestone"] as? Bool,
            tags: tags,
            dependencies: dependencies,
            subtasks: subtasks,
            comments: comments.isEmpty ? nil : comments,
            attachments: attachments,
            recurrence: recurrence,
            issueKey: stringValue(parsed["issueKey"]),
            cycle: stringValue(parsed["cycle"]),
            gitUrl: stringValue(parsed["gitUrl"]),
            order: intValue(parsed["order"]) ?? 0,
            createdAt: stringValue(parsed["createdAt"]) ?? now,
            updatedAt: stringValue(parsed["updatedAt"]) ?? now,
            archivedAt: stringValue(parsed["archivedAt"])
        )
    }

    private static func stringValue(_ any: Any?) -> String? {
        guard let any else { return nil }
        if let s = any as? String { return s.isEmpty ? nil : s }
        return "\(any)"
    }

    private static func intValue(_ any: Any?) -> Int? {
        if let i = any as? Int { return i }
        if let d = any as? Double { return Int(d) }
        if let s = any as? String, let i = Int(s) { return i }
        return nil
    }

    private static func doubleValue(_ any: Any?) -> Double? {
        if let d = any as? Double { return d }
        if let i = any as? Int { return Double(i) }
        if let s = any as? String, let d = Double(s) { return d }
        return nil
    }
}

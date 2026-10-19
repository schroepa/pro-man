import Foundation

public enum DomainError: Error, Equatable, LocalizedError {
    case openSubtasksBlockDone
    case dependencyCycle
    case vaultNotConnected

    public var errorDescription: String? {
        switch self {
        case .openSubtasksBlockDone:
            return "Parent-Task darf nicht Done werden, solange Subtasks offen sind."
        case .dependencyCycle:
            return "Abhängigkeitszyklus erkannt — Speichern blockiert."
        case .vaultNotConnected:
            return "Kein Vault verbunden."
        }
    }
}

public enum DomainRules {
    /// Parent may not become done while any subtask is open.
    public static func validateStatusChange(_ task: Task, newStatus: String) throws {
        if newStatus == DefaultTaskStatus.done.rawValue,
           task.subtasks.contains(where: { !$0.completed }) {
            throw DomainError.openSubtasksBlockDone
        }
    }

    /// Detects cycles in the dependency graph (edges: task → its dependencies).
    public static func wouldCreateCycle(tasks: [Task], taskId: String, newDependencies: [String]) -> Bool {
        var graph: [String: [String]] = [:]
        for t in tasks {
            graph[t.id] = (t.id == taskId) ? newDependencies : t.dependencies
        }
        if graph[taskId] == nil { graph[taskId] = newDependencies }

        var visiting = Set<String>()
        var visited = Set<String>()

        func dfs(_ node: String) -> Bool {
            if visiting.contains(node) { return true }
            if visited.contains(node) { return false }
            visiting.insert(node)
            for dep in graph[node] ?? [] {
                if dfs(dep) { return true }
            }
            visiting.remove(node)
            visited.insert(node)
            return false
        }
        return dfs(taskId)
    }

    public static func validateDependencies(tasks: [Task], taskId: String, newDependencies: [String]) throws {
        if wouldCreateCycle(tasks: tasks, taskId: taskId, newDependencies: newDependencies) {
            throw DomainError.dependencyCycle
        }
    }

    /// When a recurring task is marked done, create the next instance.
    public static func nextRecurrence(from task: Task, now: Date = Date()) -> Task? {
        guard task.status == DefaultTaskStatus.done.rawValue, let recurrence = task.recurrence else { return nil }
        let calendar = Calendar.current
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"

        func shift(_ dateString: String) -> String {
            guard let date = formatter.date(from: dateString) else { return dateString }
            let value = recurrence == .weekly ? 7 : 30
            let unit: Calendar.Component = recurrence == .weekly ? .day : .day
            let next = calendar.date(byAdding: unit, value: value, to: date) ?? date
            return formatter.string(from: next)
        }

        var next = task
        next.id = "TASK-\(UUID().uuidString.prefix(8).uppercased())"
        next.status = DefaultTaskStatus.todo.rawValue
        next.startDate = shift(task.startDate)
        next.dueDate = shift(task.dueDate)
        next.createdAt = ISO8601DateFormatter().string(from: now)
        next.updatedAt = next.createdAt
        next.archivedAt = nil
        next.subtasks = task.subtasks.map { Subtask(id: $0.id, title: $0.title, completed: false) }
        return next
    }

    public static func issueKey(clientCode: String?, projectCode: String?, sequence: Int) -> String {
        let parts = [clientCode, projectCode].compactMap { code -> String? in
            guard let code, !code.isEmpty else { return nil }
            return code.uppercased()
        }
        if parts.isEmpty { return "TASK-\(sequence)" }
        return parts.joined(separator: "-") + "-\(sequence)"
    }

    public static func nextSequence(existingKeys: [String], prefix: String) -> Int {
        let pattern = try! NSRegularExpression(pattern: "^" + NSRegularExpression.escapedPattern(for: prefix) + #"\-(\d+)$"#)
        var max = 0
        for key in existingKeys {
            let ns = key as NSString
            if let m = pattern.firstMatch(in: key, range: NSRange(location: 0, length: ns.length)),
               m.numberOfRanges > 1 {
                let n = Int(ns.substring(with: m.range(at: 1))) ?? 0
                max = Swift.max(max, n)
            }
        }
        return max + 1
    }
}

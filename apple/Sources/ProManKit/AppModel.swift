import Foundation
import Observation

@Observable
public final class AppModel {
    public enum Destination: String, CaseIterable, Identifiable, Sendable {
        case dashboard, kanban, list, gantt, calendar, docs, knowledge, client, backoffice
        public var id: String { rawValue }
        public var title: String {
            switch self {
            case .dashboard: return "Übersicht"
            case .kanban: return "Board"
            case .list: return "Liste"
            case .gantt: return "Gantt"
            case .calendar: return "Kalender"
            case .docs: return "Docs"
            case .knowledge: return "Wissen"
            case .client: return "Kunde"
            case .backoffice: return "Backoffice"
            }
        }
    }

    public var destination: Destination = .dashboard
    public var snapshot = VaultSnapshot()
    public var connectionState: VaultConnectionState = .disconnected
    public var selectedClientId: String?
    public var selectedProjectId: String?
    public var selectedTaskId: String?
    public var filterQuery: String = ""
    public var staleFingerprint: VaultFingerprint?
    public var lastFingerprint: VaultFingerprint?
    public var errorMessage: String?
    public var isReadOnly: Bool = false

    public let vault: VaultStore
    private var undoStack: [VaultSnapshot] = []
    private var redoStack: [VaultSnapshot] = []

    public init(vault: VaultStore = VaultStore()) {
        self.vault = vault
    }

    public var filteredTasks: [Task] {
        snapshot.tasks.filter { task in
            if let client = selectedClientId, task.clientId != client { return false }
            if let project = selectedProjectId, task.projectId != project { return false }
            if filterQuery.isEmpty { return true }
            let q = filterQuery.lowercased()
            return task.title.lowercased().contains(q)
                || task.description.lowercased().contains(q)
                || (task.issueKey?.lowercased().contains(q) ?? false)
                || task.tags.contains { $0.lowercased().contains(q) }
        }
    }

    public var selectedTask: Task? {
        guard let id = selectedTaskId else { return nil }
        return snapshot.tasks.first { $0.id == id } ?? snapshot.archivedTasks.first { $0.id == id }
    }

    @discardableResult
    public func tryReconnect() -> Bool {
        do {
            _ = try vault.connectPersisted()
            try reload()
            connectionState = .connected
            errorMessage = nil
            return true
        } catch {
            connectionState = vault.bookmarkStoreHasBookmark ? .permissionNeeded : .disconnected
            errorMessage = error.localizedDescription
            return false
        }
    }

    public func connect(to url: URL) throws {
        try vault.connect(picking: url)
        try reload()
        connectionState = .connected
        errorMessage = nil
    }

    public func openForTesting(url: URL) throws {
        try vault.open(url: url)
        try reload()
        connectionState = .connected
    }

    public func reload() throws {
        snapshot = try vault.loadSnapshot()
        lastFingerprint = try? vault.fingerprint()
        staleFingerprint = nil
        connectionState = .connected
    }

    public func checkStale() {
        guard let last = lastFingerprint,
              let current = try? vault.fingerprint() else { return }
        if current != last {
            staleFingerprint = current
        }
    }

    public func acceptRemoteReload() throws {
        try reload()
    }

    public func saveTask(_ task: Task, archived: Bool = false) throws {
        guard !isReadOnly else { return }
        try DomainRules.validateStatusChange(task, newStatus: task.status)
        try DomainRules.validateDependencies(tasks: snapshot.tasks, taskId: task.id, newDependencies: task.dependencies)
        pushUndo()
        var mutable = task
        mutable.updatedAt = ISO8601DateFormatter().string(from: Date())
        try vault.save(task: mutable, archived: archived)
        if let next = DomainRules.nextRecurrence(from: mutable), !archived {
            try vault.save(task: next, archived: false)
        }
        try reload()
    }

    public func createTask(title: String, status: String = DefaultTaskStatus.todo.rawValue) throws {
        guard !isReadOnly else { return }
        pushUndo()
        let id = "TASK-\(UUID().uuidString.prefix(8).uppercased())"
        let now = ISO8601DateFormatter().string(from: Date())
        let task = Task(
            id: id,
            clientId: selectedClientId,
            projectId: selectedProjectId,
            title: title,
            status: status,
            order: (snapshot.tasks.map(\.order).max() ?? -1) + 1,
            createdAt: now,
            updatedAt: now
        )
        try vault.save(task: task)
        try reload()
        selectedTaskId = id
    }

    public func updateTaskStatus(id: String, status: String) throws {
        try reorderTask(id: id, toStatus: status, beforeId: nil)
    }

    /// Moves a task into `status` and sets column order. `beforeId == nil` appends at the end.
    public func reorderTask(id: String, toStatus status: String, beforeId: String?) throws {
        guard !isReadOnly else { return }
        guard let moving = snapshot.tasks.first(where: { $0.id == id }) else { return }
        try DomainRules.validateStatusChange(moving, newStatus: status)

        pushUndo()
        var columnPeers = snapshot.tasks
            .filter { $0.status == status && $0.id != id }
            .sorted { $0.order < $1.order }
            .map(\.id)

        if let beforeId, let idx = columnPeers.firstIndex(of: beforeId) {
            columnPeers.insert(id, at: idx)
        } else if beforeId == nil {
            columnPeers.append(id)
        } else {
            // beforeId not in column (edge) → append
            columnPeers.append(id)
        }

        let now = ISO8601DateFormatter().string(from: Date())
        for (index, taskId) in columnPeers.enumerated() {
            guard var task = snapshot.tasks.first(where: { $0.id == taskId }) else { continue }
            task.status = status
            task.order = index
            task.updatedAt = now
            try vault.save(task: task, archived: false)
        }
        try reload()
    }

    public func archiveTask(id: String) throws {
        guard var task = snapshot.tasks.first(where: { $0.id == id }) else { return }
        task.archivedAt = ISO8601DateFormatter().string(from: Date())
        try saveTask(task, archived: true)
    }

    public func saveDoc(_ doc: DocItem) throws {
        guard !isReadOnly else { return }
        pushUndo()
        var mutable = doc
        mutable.updatedAt = ISO8601DateFormatter().string(from: Date())
        try vault.save(doc: mutable)
        try reload()
    }

    public func saveKnowledge(_ item: KnowledgeItem) throws {
        guard !isReadOnly else { return }
        pushUndo()
        var mutable = item
        mutable.updatedAt = ISO8601DateFormatter().string(from: Date())
        try vault.save(knowledge: mutable)
        try reload()
    }

    public func saveClients(_ file: ClientsFile) throws {
        guard !isReadOnly else { return }
        pushUndo()
        try vault.save(clientsFile: file)
        try reload()
    }

    public func undo() throws {
        guard let previous = undoStack.popLast() else { return }
        redoStack.append(snapshot)
        try writeSnapshot(previous)
        try reload()
    }

    public func redo() throws {
        guard let next = redoStack.popLast() else { return }
        undoStack.append(snapshot)
        try writeSnapshot(next)
        try reload()
    }

    private func pushUndo() {
        undoStack.append(snapshot)
        redoStack.removeAll()
        if undoStack.count > 50 { undoStack.removeFirst() }
    }

    private func writeSnapshot(_ snap: VaultSnapshot) throws {
        try vault.save(clientsFile: snap.clientsFile)
        for t in snap.tasks { try vault.save(task: t, archived: false) }
        for t in snap.archivedTasks { try vault.save(task: t, archived: true) }
        for d in snap.docs { try vault.save(doc: d) }
        for k in snap.knowledge { try vault.save(knowledge: k) }
    }
}

private extension VaultStore {
    var bookmarkStoreHasBookmark: Bool {
        VaultBookmarkStore.shared.hasBookmark
    }
}

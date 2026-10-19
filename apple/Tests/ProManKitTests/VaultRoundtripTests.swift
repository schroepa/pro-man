import XCTest
@testable import ProManKit

final class VaultRoundtripTests: XCTestCase {
    private var fixtureURL: URL {
        if let url = Bundle.module.url(forResource: "vault-example", withExtension: nil, subdirectory: "Fixtures") {
            return url
        }
        if let url = Bundle.module.resourceURL?
            .appendingPathComponent("Fixtures/vault-example", isDirectory: true),
           FileManager.default.fileExists(atPath: url.path) {
            return url
        }
        // Fallback: repo vault-example relative to this source file
        let thisFile = URL(fileURLWithPath: #filePath)
        let repoRoot = thisFile
            .deletingLastPathComponent() // ProManKitTests
            .deletingLastPathComponent() // Tests
            .deletingLastPathComponent() // apple
            .deletingLastPathComponent() // pro-man
        return repoRoot.appendingPathComponent("vault-example", isDirectory: true)
    }

    func testLoadVaultExampleTasks() throws {
        let store = VaultStore(bookmarkStore: VaultBookmarkStore())
        try store.open(url: fixtureURL)
        let snap = try store.loadSnapshot()
        XCTAssertEqual(snap.clientsFile.clients.count, 3)
        XCTAssertEqual(snap.clientsFile.projects.count, 3)
        XCTAssertEqual(snap.tasks.count, 3)
        XCTAssertTrue(snap.tasks.contains { $0.id == "TASK-001" })
        XCTAssertEqual(snap.tasks.first { $0.id == "TASK-001" }?.status, "done")
        XCTAssertEqual(snap.tasks.first { $0.id == "TASK-002" }?.subtasks.filter(\.completed).count, 1)
        XCTAssertFalse(snap.docs.isEmpty)
        XCTAssertFalse(snap.knowledge.isEmpty)
    }

    func testTaskRoundtripPreservesCoreFields() throws {
        let original = try String(
            contentsOf: fixtureURL.appendingPathComponent("tasks/TASK-002.md"),
            encoding: .utf8
        )
        let task = TaskSerializer.fromMarkdown(original, fallbackId: "TASK-002")
        XCTAssertEqual(task.title, "Accessible Kanban Board mit Drag & Drop")
        XCTAssertEqual(task.status, "in-progress")
        XCTAssertEqual(task.priority, .high)
        XCTAssertEqual(task.dependencies, ["TASK-001"])
        XCTAssertEqual(task.subtasks.count, 2)

        let written = TaskSerializer.toMarkdown(task)
        let again = TaskSerializer.fromMarkdown(written, fallbackId: "TASK-002")
        XCTAssertEqual(again.id, task.id)
        XCTAssertEqual(again.title, task.title)
        XCTAssertEqual(again.status, task.status)
        XCTAssertEqual(again.priority, task.priority)
        XCTAssertEqual(again.dependencies, task.dependencies)
        XCTAssertEqual(again.subtasks.map(\.title), task.subtasks.map(\.title))
        XCTAssertEqual(again.subtasks.map(\.completed), task.subtasks.map(\.completed))
        XCTAssertTrue(again.description.contains("Board Spalten"))
    }

    func testWriteAndReloadInTempVault() throws {
        let temp = FileManager.default.temporaryDirectory
            .appendingPathComponent("proman-test-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: temp) }

        try FileManager.default.createDirectory(at: temp, withIntermediateDirectories: true)
        let clients = ClientsFile(
            clients: [Client(id: "c1", name: "Acme", color: "#000", code: "ACM")],
            projects: [Project(id: "p1", clientId: "c1", name: "Web", code: "WEB")]
        )
        let store = VaultStore(bookmarkStore: VaultBookmarkStore())
        try store.open(url: temp)
        try store.save(clientsFile: clients)

        var task = Task(
            id: "TASK-100",
            clientId: "c1",
            projectId: "p1",
            title: "Native Mac App",
            description: "Vault connected",
            status: "todo",
            priority: .urgent,
            tags: ["apple"],
            subtasks: [Subtask(id: "s1", title: "Core", completed: false)],
            issueKey: "ACM-WEB-1",
            order: 0
        )
        try store.save(task: task)

        let snap = try store.loadSnapshot()
        XCTAssertEqual(snap.tasks.count, 1)
        XCTAssertEqual(snap.tasks[0].issueKey, "ACM-WEB-1")
        XCTAssertEqual(snap.tasks[0].title, "Native Mac App")

        task.status = "done"
        task.subtasks[0].completed = true
        try store.save(task: task)
        let again = try store.loadSnapshot()
        XCTAssertEqual(again.tasks[0].status, "done")
        XCTAssertTrue(again.tasks[0].subtasks[0].completed)
    }

    func testDomainRulesBlockDoneWithOpenSubtasks() {
        let task = Task(
            id: "t1",
            title: "Parent",
            subtasks: [Subtask(id: "s1", title: "Open", completed: false)]
        )
        XCTAssertThrowsError(try DomainRules.validateStatusChange(task, newStatus: "done")) { error in
            XCTAssertEqual(error as? DomainError, .openSubtasksBlockDone)
        }
    }

    func testDomainRulesDetectDependencyCycle() {
        let tasks = [
            Task(id: "a", title: "A", dependencies: ["b"]),
            Task(id: "b", title: "B", dependencies: []),
        ]
        XCTAssertTrue(DomainRules.wouldCreateCycle(tasks: tasks, taskId: "b", newDependencies: ["a"]))
        XCTAssertFalse(DomainRules.wouldCreateCycle(tasks: tasks, taskId: "b", newDependencies: []))
    }

    func testReorderTaskChangesOrderAndStatus() throws {
        let temp = FileManager.default.temporaryDirectory
            .appendingPathComponent("proman-reorder-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: temp) }
        try FileManager.default.createDirectory(at: temp, withIntermediateDirectories: true)

        let store = VaultStore(bookmarkStore: VaultBookmarkStore())
        try store.open(url: temp)
        try store.save(clientsFile: ClientsFile())
        try store.save(task: Task(id: "A", title: "A", status: "todo", order: 0))
        try store.save(task: Task(id: "B", title: "B", status: "todo", order: 1))
        try store.save(task: Task(id: "C", title: "C", status: "in-progress", order: 0))
        let model = AppModel(vault: store)
        try model.openForTesting(url: temp)

        try model.reorderTask(id: "C", toStatus: "todo", beforeId: "B")
        let todo = model.snapshot.tasks.filter { $0.status == "todo" }.sorted { $0.order < $1.order }
        XCTAssertEqual(todo.map(\.id), ["A", "C", "B"])
        XCTAssertEqual(todo.map(\.order), [0, 1, 2])
    }

    func testFingerprintChangesOnEdit() throws {
        let temp = FileManager.default.temporaryDirectory
            .appendingPathComponent("proman-fp-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: temp) }
        try FileManager.default.createDirectory(at: temp, withIntermediateDirectories: true)

        let store = VaultStore(bookmarkStore: VaultBookmarkStore())
        try store.open(url: temp)
        try store.save(clientsFile: ClientsFile(clients: [], projects: []))
        let task = Task(id: "TASK-1", title: "One")
        try store.save(task: task)
        let fp1 = try store.fingerprint()

        var edited = task
        edited.title = "Two"
        try store.save(task: edited)
        let fp2 = try store.fingerprint()
        XCTAssertNotEqual(fp1, fp2)
    }
}

import Foundation

public enum VaultConnectionState: String, Sendable {
    case connected
    case permissionNeeded
    case disconnected
}

public struct VaultFileStamp: Hashable, Sendable {
    public var lastModified: TimeInterval
    public var size: Int
    public var digest: String
}

public typealias VaultFingerprint = [String: VaultFileStamp]

public enum VaultStoreError: Error, LocalizedError {
    case notADirectory
    case missingClientsFile
    case io(String)

    public var errorDescription: String? {
        switch self {
        case .notADirectory: return "Der gewählte Pfad ist kein Ordner."
        case .missingClientsFile: return "clients.json fehlt im Vault."
        case .io(let message): return message
        }
    }
}

public final class VaultStore: @unchecked Sendable {
    public private(set) var rootURL: URL?
    public private(set) var connectionState: VaultConnectionState = .disconnected
    private let bookmarkStore: VaultBookmarkStore
    private let fileManager: FileManager

    public init(bookmarkStore: VaultBookmarkStore = .shared, fileManager: FileManager = .default) {
        self.bookmarkStore = bookmarkStore
        self.fileManager = fileManager
    }

    /// Opens a vault directory directly (tests / already-scoped URL).
    public func open(url: URL) throws {
        let resolved = url.resolvingSymlinksInPath()
        var isDir: ObjCBool = false
        guard fileManager.fileExists(atPath: resolved.path, isDirectory: &isDir), isDir.boolValue else {
            throw VaultStoreError.notADirectory
        }
        rootURL = resolved
        connectionState = .connected
    }

    public func connectPersisted() throws -> URL {
        let url = try bookmarkStore.resolveBookmark()
        try open(url: url)
        return url
    }

    public func connect(picking url: URL) throws {
        try bookmarkStore.saveBookmark(for: url)
        let resolved = try bookmarkStore.resolveBookmark()
        try open(url: resolved)
    }

    public func disconnect() {
        bookmarkStore.clear()
        rootURL = nil
        connectionState = .disconnected
    }

    public func loadSnapshot() throws -> VaultSnapshot {
        guard let root = rootURL else { throw DomainError.vaultNotConnected }
        let clientsURL = root.appendingPathComponent(VaultPaths.clientsFile)
        guard fileManager.fileExists(atPath: clientsURL.path) else {
            throw VaultStoreError.missingClientsFile
        }
        let clientsData = try Data(contentsOf: clientsURL)
        let clientsFile = try JSONDecoder().decode(ClientsFile.self, from: clientsData)

        let tasks = try loadMarkdownFolder(
            root.appendingPathComponent(VaultPaths.tasksDir),
            skipSubdirs: true
        ) { text, id in TaskSerializer.fromMarkdown(text, fallbackId: id) }

        // Also accept legacy root TASK-*.md
        let legacy = try loadMarkdownFiles(in: root, prefix: "TASK-") { text, id in
            TaskSerializer.fromMarkdown(text, fallbackId: id)
        }
        var byId: [String: Task] = [:]
        for t in legacy + tasks { byId[t.id] = t }

        let archived = try loadMarkdownFolder(
            root.appendingPathComponent(VaultPaths.tasksDir).appendingPathComponent(VaultPaths.archiveDir),
            skipSubdirs: true
        ) { text, id in
            var t = TaskSerializer.fromMarkdown(text, fallbackId: id)
            if t.archivedAt == nil {
                t.archivedAt = t.updatedAt
            }
            return t
        }

        let docs = try loadMarkdownFolder(
            root.appendingPathComponent(VaultPaths.docsDir),
            skipSubdirs: true
        ) { text, id in DocSerializer.fromMarkdown(text, fallbackId: id) }

        let knowledge = try loadMarkdownFolder(
            root.appendingPathComponent(VaultPaths.knowledgeDir),
            skipSubdirs: true
        ) { text, id in KnowledgeSerializer.fromMarkdown(text, fallbackId: id) }

        return VaultSnapshot(
            clientsFile: clientsFile,
            tasks: Array(byId.values).sorted { $0.order < $1.order },
            archivedTasks: archived,
            docs: docs,
            knowledge: knowledge,
            rootURL: root
        )
    }

    public func save(task: Task, archived: Bool = false) throws {
        guard let root = rootURL else { throw DomainError.vaultNotConnected }
        let dir: URL
        if archived {
            dir = root
                .appendingPathComponent(VaultPaths.tasksDir)
                .appendingPathComponent(VaultPaths.archiveDir)
        } else {
            dir = root.appendingPathComponent(VaultPaths.tasksDir)
        }
        try fileManager.createDirectory(at: dir, withIntermediateDirectories: true)
        let fileURL = dir.appendingPathComponent(VaultPaths.taskFileName(for: task))
        let markdown = TaskSerializer.toMarkdown(task)
        try atomicWrite(markdown, to: fileURL)

        // Remove from the other location if present
        let otherDir = archived
            ? root.appendingPathComponent(VaultPaths.tasksDir)
            : root.appendingPathComponent(VaultPaths.tasksDir).appendingPathComponent(VaultPaths.archiveDir)
        let other = otherDir.appendingPathComponent(VaultPaths.taskFileName(for: task))
        if fileManager.fileExists(atPath: other.path) {
            try? fileManager.removeItem(at: other)
        }
    }

    public func save(doc: DocItem) throws {
        guard let root = rootURL else { throw DomainError.vaultNotConnected }
        let dir = root.appendingPathComponent(VaultPaths.docsDir)
        try fileManager.createDirectory(at: dir, withIntermediateDirectories: true)
        let fileURL = dir.appendingPathComponent("\(doc.id).md")
        try atomicWrite(DocSerializer.toMarkdown(doc), to: fileURL)
    }

    public func save(knowledge: KnowledgeItem) throws {
        guard let root = rootURL else { throw DomainError.vaultNotConnected }
        let dir = root.appendingPathComponent(VaultPaths.knowledgeDir)
        try fileManager.createDirectory(at: dir, withIntermediateDirectories: true)
        let fileURL = dir.appendingPathComponent("\(knowledge.id).md")
        try atomicWrite(KnowledgeSerializer.toMarkdown(knowledge), to: fileURL)
    }

    public func save(clientsFile: ClientsFile) throws {
        guard let root = rootURL else { throw DomainError.vaultNotConnected }
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(clientsFile)
        let url = root.appendingPathComponent(VaultPaths.clientsFile)
        try atomicWrite(data, to: url)
    }

    public func fingerprint() throws -> VaultFingerprint {
        guard let root = rootURL else { throw DomainError.vaultNotConnected }
        let rootResolved = root.resolvingSymlinksInPath()
        var result: VaultFingerprint = [:]
        let keys = try relativeMarkdownPaths(under: rootResolved)
        for rel in keys {
            let url = rootResolved.appendingPathComponent(rel)
            guard fileManager.fileExists(atPath: url.path) else { continue }
            let values = try url.resourceValues(forKeys: [.contentModificationDateKey, .fileSizeKey])
            let data = try Data(contentsOf: url)
            let text = String(data: data, encoding: .utf8) ?? ""
            result[rel] = VaultFileStamp(
                lastModified: values.contentModificationDate?.timeIntervalSince1970 ?? 0,
                size: values.fileSize ?? data.count,
                digest: contentDigest(text)
            )
        }
        return result
    }

    public func contentDigest(_ text: String) -> String {
        var h: UInt32 = 2_166_136_261
        for byte in text.utf8 {
            h ^= UInt32(byte)
            h = h &* 16_777_619
        }
        return String(h, radix: 16)
    }

    // MARK: - Private

    private func atomicWrite(_ string: String, to url: URL) throws {
        guard let data = string.data(using: .utf8) else {
            throw VaultStoreError.io("UTF-8 encoding failed")
        }
        try atomicWrite(data, to: url)
    }

    private func atomicWrite(_ data: Data, to url: URL) throws {
        let tmp = url.appendingPathExtension("tmp-\(UUID().uuidString)")
        try data.write(to: tmp, options: .atomic)
        if fileManager.fileExists(atPath: url.path) {
            _ = try fileManager.replaceItemAt(url, withItemAt: tmp)
        } else {
            try fileManager.moveItem(at: tmp, to: url)
        }
    }

    private func loadMarkdownFolder<T>(
        _ dir: URL,
        skipSubdirs: Bool,
        map: (String, String) -> T
    ) throws -> [T] {
        guard fileManager.fileExists(atPath: dir.path) else { return [] }
        let urls = try fileManager.contentsOfDirectory(
            at: dir,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        )
        var items: [T] = []
        for url in urls where url.pathExtension.lowercased() == "md" {
            if skipSubdirs {
                var isDir: ObjCBool = false
                fileManager.fileExists(atPath: url.path, isDirectory: &isDir)
                if isDir.boolValue { continue }
            }
            let text = try String(contentsOf: url, encoding: .utf8)
            let id = url.deletingPathExtension().lastPathComponent
            items.append(map(text, id))
        }
        return items
    }

    private func loadMarkdownFiles<T>(
        in dir: URL,
        prefix: String,
        map: (String, String) -> T
    ) throws -> [T] {
        let urls = try fileManager.contentsOfDirectory(
            at: dir,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        )
        var items: [T] = []
        for url in urls where url.pathExtension.lowercased() == "md"
            && url.lastPathComponent.hasPrefix(prefix) {
            let text = try String(contentsOf: url, encoding: .utf8)
            let id = url.deletingPathExtension().lastPathComponent
            items.append(map(text, id))
        }
        return items
    }

    private func relativeMarkdownPaths(under root: URL) throws -> [String] {
        let rootResolved = root.resolvingSymlinksInPath()
        guard let enumerator = fileManager.enumerator(
            at: rootResolved,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        ) else { return [] }
        var paths: [String] = []
        for case let url as URL in enumerator {
            let resolved = url.resolvingSymlinksInPath()
            if resolved.pathExtension.lowercased() == "md" || resolved.lastPathComponent == VaultPaths.clientsFile {
                let rootPath = rootResolved.path.hasSuffix("/") ? rootResolved.path : rootResolved.path + "/"
                let full = resolved.path
                guard full.hasPrefix(rootPath) else { continue }
                paths.append(String(full.dropFirst(rootPath.count)))
            }
        }
        return paths.sorted()
    }
}

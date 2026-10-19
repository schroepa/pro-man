import Foundation

public struct ColumnDefinition: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var color: String
    public var order: Int
    public var wipLimit: Int?

    public init(id: String, name: String, color: String, order: Int, wipLimit: Int? = nil) {
        self.id = id
        self.name = name
        self.color = color
        self.order = order
        self.wipLimit = wipLimit
    }
}

public enum DefaultTaskStatus: String, Codable, Sendable, CaseIterable {
    case todo
    case inProgress = "in-progress"
    case inReview = "in-review"
    case done
}

public enum TaskPriority: String, Codable, Sendable, CaseIterable {
    case urgent, high, normal, low
}

public enum TaskRecurrence: String, Codable, Sendable {
    case weekly, monthly
}

public struct Subtask: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var title: String
    public var completed: Bool

    public init(id: String, title: String, completed: Bool) {
        self.id = id
        self.title = title
        self.completed = completed
    }
}

public struct TimeEntry: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var hours: Double
    public var date: String
    public var description: String?
    public var createdAt: String

    public init(id: String, hours: Double, date: String, description: String? = nil, createdAt: String) {
        self.id = id
        self.hours = hours
        self.date = date
        self.description = description
        self.createdAt = createdAt
    }
}

public struct TaskComment: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var author: String
    public var body: String
    public var createdAt: String

    public init(id: String, author: String, body: String, createdAt: String) {
        self.id = id
        self.author = author
        self.body = body
        self.createdAt = createdAt
    }
}

public struct TaskAttachment: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var relativePath: String

    public init(id: String, name: String, relativePath: String) {
        self.id = id
        self.name = name
        self.relativePath = relativePath
    }
}

public struct Task: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var clientId: String?
    public var projectId: String?
    public var assigneeId: String?
    public var title: String
    public var description: String
    public var status: String
    public var priority: TaskPriority
    public var startDate: String
    public var dueDate: String
    public var estimateHours: Double?
    public var timeSpentHours: Double?
    public var timeLogs: [TimeEntry]?
    public var isMilestone: Bool?
    public var tags: [String]
    public var dependencies: [String]
    public var subtasks: [Subtask]
    public var comments: [TaskComment]?
    public var attachments: [TaskAttachment]?
    public var recurrence: TaskRecurrence?
    public var issueKey: String?
    public var cycle: String?
    public var gitUrl: String?
    public var order: Int
    public var createdAt: String
    public var updatedAt: String
    public var archivedAt: String?

    public init(
        id: String,
        clientId: String? = nil,
        projectId: String? = nil,
        assigneeId: String? = nil,
        title: String,
        description: String = "",
        status: String = DefaultTaskStatus.todo.rawValue,
        priority: TaskPriority = .normal,
        startDate: String = "",
        dueDate: String = "",
        estimateHours: Double? = nil,
        timeSpentHours: Double? = nil,
        timeLogs: [TimeEntry]? = nil,
        isMilestone: Bool? = nil,
        tags: [String] = [],
        dependencies: [String] = [],
        subtasks: [Subtask] = [],
        comments: [TaskComment]? = nil,
        attachments: [TaskAttachment]? = nil,
        recurrence: TaskRecurrence? = nil,
        issueKey: String? = nil,
        cycle: String? = nil,
        gitUrl: String? = nil,
        order: Int = 0,
        createdAt: String = ISO8601DateFormatter().string(from: Date()),
        updatedAt: String = ISO8601DateFormatter().string(from: Date()),
        archivedAt: String? = nil
    ) {
        self.id = id
        self.clientId = clientId
        self.projectId = projectId
        self.assigneeId = assigneeId
        self.title = title
        self.description = description
        self.status = status
        self.priority = priority
        self.startDate = startDate
        self.dueDate = dueDate
        self.estimateHours = estimateHours
        self.timeSpentHours = timeSpentHours
        self.timeLogs = timeLogs
        self.isMilestone = isMilestone
        self.tags = tags
        self.dependencies = dependencies
        self.subtasks = subtasks
        self.comments = comments
        self.attachments = attachments
        self.recurrence = recurrence
        self.issueKey = issueKey
        self.cycle = cycle
        self.gitUrl = gitUrl
        self.order = order
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.archivedAt = archivedAt
    }

    public var displayKey: String { issueKey ?? id }
}

public struct Client: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var color: String
    public var code: String?
    public var description: String?

    public init(id: String, name: String, color: String, code: String? = nil, description: String? = nil) {
        self.id = id
        self.name = name
        self.color = color
        self.code = code
        self.description = description
    }
}

public struct Project: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var clientId: String
    public var name: String
    public var description: String?
    public var color: String?
    public var code: String?

    public init(id: String, clientId: String, name: String, description: String? = nil, color: String? = nil, code: String? = nil) {
        self.id = id
        self.clientId = clientId
        self.name = name
        self.description = description
        self.color = color
        self.code = code
    }
}

public struct WorkspaceMember: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var email: String?
    public var kind: String?
    public var color: String?

    public init(id: String, name: String, email: String? = nil, kind: String? = nil, color: String? = nil) {
        self.id = id
        self.name = name
        self.email = email
        self.kind = kind
        self.color = color
    }
}

public struct ClientsFile: Codable, Sendable {
    public var clients: [Client]
    public var projects: [Project]
    public var members: [WorkspaceMember]?

    public init(clients: [Client] = [], projects: [Project] = [], members: [WorkspaceMember]? = nil) {
        self.clients = clients
        self.projects = projects
        self.members = members
    }
}

public struct DocItem: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var clientId: String
    public var projectId: String
    public var title: String
    public var content: String
    public var tags: [String]
    public var parentDocId: String?
    public var createdAt: String
    public var updatedAt: String

    public init(
        id: String,
        clientId: String = "",
        projectId: String = "",
        title: String,
        content: String = "",
        tags: [String] = [],
        parentDocId: String? = nil,
        createdAt: String = ISO8601DateFormatter().string(from: Date()),
        updatedAt: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.clientId = clientId
        self.projectId = projectId
        self.title = title
        self.content = content
        self.tags = tags
        self.parentDocId = parentDocId
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

public enum KnowledgeCategory: String, Codable, Sendable, CaseIterable {
    case overview, contacts, access, decisions, risks, other

    public static func parse(_ raw: String) -> KnowledgeCategory {
        KnowledgeCategory(rawValue: raw) ?? .other
    }
}

public struct KnowledgeItem: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var clientId: String
    public var projectId: String?
    public var category: KnowledgeCategory
    public var title: String
    public var content: String
    public var tags: [String]
    public var createdAt: String
    public var updatedAt: String

    public init(
        id: String,
        clientId: String = "",
        projectId: String? = nil,
        category: KnowledgeCategory = .other,
        title: String,
        content: String = "",
        tags: [String] = [],
        createdAt: String = ISO8601DateFormatter().string(from: Date()),
        updatedAt: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.clientId = clientId
        self.projectId = projectId
        self.category = category
        self.title = title
        self.content = content
        self.tags = tags
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

public struct VaultSnapshot: Sendable {
    public var clientsFile: ClientsFile
    public var tasks: [Task]
    public var archivedTasks: [Task]
    public var docs: [DocItem]
    public var knowledge: [KnowledgeItem]
    public var rootURL: URL?

    public init(
        clientsFile: ClientsFile = ClientsFile(),
        tasks: [Task] = [],
        archivedTasks: [Task] = [],
        docs: [DocItem] = [],
        knowledge: [KnowledgeItem] = [],
        rootURL: URL? = nil
    ) {
        self.clientsFile = clientsFile
        self.tasks = tasks
        self.archivedTasks = archivedTasks
        self.docs = docs
        self.knowledge = knowledge
        self.rootURL = rootURL
    }
}

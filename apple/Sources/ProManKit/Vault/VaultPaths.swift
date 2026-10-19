import Foundation

public enum VaultPaths {
    public static let clientsFile = "clients.json"
    public static let tasksDir = "tasks"
    public static let archiveDir = "archive"
    public static let docsDir = "docs"
    public static let knowledgeDir = "knowledge"
    public static let attachmentsDir = "attachments"

    public static func taskFileName(for task: Task) -> String {
        let base = (task.issueKey ?? task.id)
            .replacingOccurrences(of: "/", with: "-")
            .replacingOccurrences(of: ":", with: "-")
        return "\(base).md"
    }
}

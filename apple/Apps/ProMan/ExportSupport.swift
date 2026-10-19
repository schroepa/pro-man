import Foundation
import ProManKit
import UniformTypeIdentifiers

enum ExportSupport {
    static func csv(for tasks: [Task]) -> String {
        var lines = ["id,issueKey,title,status,priority,dueDate,tags"]
        for t in tasks {
            let tags = t.tags.joined(separator: "|")
            let cols = [
                t.id,
                t.issueKey ?? "",
                escape(t.title),
                t.status,
                t.priority.rawValue,
                t.dueDate,
                escape(tags),
            ]
            lines.append(cols.joined(separator: ","))
        }
        return lines.joined(separator: "\n") + "\n"
    }

    static func ics(for tasks: [Task]) -> String {
        var lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//ProMan//EN",
        ]
        for t in tasks where !t.dueDate.isEmpty {
            let day = t.dueDate.replacingOccurrences(of: "-", with: "")
            lines += [
                "BEGIN:VEVENT",
                "UID:\(t.id)@proman.local",
                "DTSTART;VALUE=DATE:\(day)",
                "DTEND;VALUE=DATE:\(day)",
                "SUMMARY:\(t.title.replacingOccurrences(of: ",", with: "\\,"))",
                "END:VEVENT",
            ]
        }
        lines.append("END:VCALENDAR")
        return lines.joined(separator: "\n") + "\n"
    }

    private static func escape(_ value: String) -> String {
        if value.contains(",") || value.contains("\"") || value.contains("\n") {
            return "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\""
        }
        return value
    }
}

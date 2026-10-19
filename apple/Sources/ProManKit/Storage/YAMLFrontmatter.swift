import Foundation

enum YAMLFrontmatter {
    static func split(_ raw: String) -> (frontmatter: String?, body: String) {
        let content = raw.replacingOccurrences(of: "\r\n", with: "\n")
        guard content.hasPrefix("---\n") else {
            return (nil, content)
        }
        let rest = content.dropFirst(4)
        guard let endRange = rest.range(of: "\n---") else {
            return (nil, content)
        }
        let fm = String(rest[..<endRange.lowerBound])
        var body = String(rest[endRange.upperBound...])
        if body.hasPrefix("\n") { body.removeFirst() }
        return (fm, body)
    }

    static func unquote(_ value: String) -> Any {
        var val = value
        if (val.hasPrefix("\"") && val.hasSuffix("\"")) || (val.hasPrefix("'") && val.hasSuffix("'")) {
            val = String(val.dropFirst().dropLast())
            return val
        }
        if val == "true" { return true }
        if val == "false" { return false }
        if let n = Double(val), !val.isEmpty, val != "+", val != "-" {
            if val.contains(".") || val.lowercased().contains("e") {
                return n
            }
            if let i = Int(val) { return i }
            return n
        }
        return val
    }

    /// Parses simple YAML used by ProMan vault files (scalars, string lists, nested maps for timeLogs/attachments).
    static func parse(_ frontmatter: String) -> [String: Any] {
        var parsed: [String: Any] = [:]
        var currentKey = ""
        var inSchemaOrg = false
        var timeLogs: [[String: Any]] = []
        var currentTimeLog: [String: Any]?
        var attachments: [[String: Any]] = []
        var currentAttachment: [String: Any]?

        func flushTimeLog() {
            if let log = currentTimeLog,
               log["id"] != nil,
               log["hours"] != nil,
               log["date"] != nil,
               log["createdAt"] != nil {
                timeLogs.append(log)
            }
            currentTimeLog = nil
        }

        func flushAttachment() {
            if let att = currentAttachment, att["id"] != nil, att["name"] != nil {
                attachments.append([
                    "id": att["id"] as Any,
                    "name": att["name"] as Any,
                    "relativePath": att["relativePath"] ?? "",
                ])
            }
            currentAttachment = nil
        }

        for line in frontmatter.split(separator: "\n", omittingEmptySubsequences: false).map(String.init) {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.isEmpty || trimmed.hasPrefix("#") { continue }

            let leadingSpaces = line.prefix(while: { $0 == " " }).count

            if trimmed.range(of: #"^schemaOrg\s*:"#, options: .regularExpression) != nil, leadingSpaces == 0 {
                inSchemaOrg = true
                currentKey = "schemaOrg"
                parsed["schemaOrg"] = [String: Any]()
                continue
            }
            if inSchemaOrg {
                if leadingSpaces == 0, trimmed.contains(":"), !trimmed.hasPrefix("- ") {
                    inSchemaOrg = false
                } else {
                    continue
                }
            }

            if let colon = trimmed.firstIndex(of: ":") {
                let tentative = String(trimmed[..<colon]).trimmingCharacters(in: .whitespaces)
                if tentative.hasPrefix("@") { continue }
            }

            if trimmed.hasPrefix("- "), currentKey == "timeLogs" {
                flushTimeLog()
                flushAttachment()
                var log: [String: Any] = [:]
                let rest = String(trimmed.dropFirst(2)).trimmingCharacters(in: .whitespaces)
                if let c = rest.firstIndex(of: ":") {
                    let k = String(rest[..<c]).trimmingCharacters(in: .whitespaces)
                    let v = String(rest[rest.index(after: c)...]).trimmingCharacters(in: .whitespaces)
                    log[k] = unquote(v)
                }
                currentTimeLog = log
                continue
            }

            if trimmed.hasPrefix("- "), currentKey == "attachments" {
                flushTimeLog()
                flushAttachment()
                var att: [String: Any] = [:]
                let rest = String(trimmed.dropFirst(2)).trimmingCharacters(in: .whitespaces)
                if let c = rest.firstIndex(of: ":") {
                    let k = String(rest[..<c]).trimmingCharacters(in: .whitespaces)
                    let v = String(rest[rest.index(after: c)...]).trimmingCharacters(in: .whitespaces)
                    att[k] = unquote(v)
                }
                currentAttachment = att
                continue
            }

            if (currentTimeLog != nil || currentAttachment != nil),
               leadingSpaces > 0,
               trimmed.contains(":"),
               !trimmed.hasPrefix("- ") {
                if let c = trimmed.firstIndex(of: ":") {
                    let k = String(trimmed[..<c]).trimmingCharacters(in: .whitespaces)
                    let v = String(trimmed[trimmed.index(after: c)...]).trimmingCharacters(in: .whitespaces)
                    if currentTimeLog != nil { currentTimeLog?[k] = unquote(v) }
                    if currentAttachment != nil { currentAttachment?[k] = unquote(v) }
                }
                continue
            }

            if trimmed.hasPrefix("- "), !currentKey.isEmpty {
                let val = String(trimmed.dropFirst(2)).trimmingCharacters(in: .whitespaces)
                var arr = parsed[currentKey] as? [Any] ?? []
                arr.append(unquote(val))
                parsed[currentKey] = arr
                continue
            }

            if let colonIdx = line.firstIndex(of: ":") {
                let key = String(line[..<colonIdx]).trimmingCharacters(in: .whitespaces)
                if key.hasPrefix("@") { continue }
                let rawVal = String(line[line.index(after: colonIdx)...]).trimmingCharacters(in: .whitespaces)
                flushTimeLog()
                flushAttachment()
                if rawVal == "[]" {
                    currentKey = key
                    parsed[key] = [Any]()
                } else if rawVal.isEmpty {
                    currentKey = key
                    parsed[key] = ""
                } else {
                    currentKey = key
                    parsed[key] = unquote(rawVal)
                }
            }
        }
        flushTimeLog()
        flushAttachment()
        if !timeLogs.isEmpty { parsed["timeLogs"] = timeLogs }
        if !attachments.isEmpty { parsed["attachments"] = attachments }
        return parsed
    }

    static func jsonString(_ value: String) -> String {
        let data = try? JSONSerialization.data(withJSONObject: value, options: .fragmentsAllowed)
        return data.flatMap { String(data: $0, encoding: .utf8) } ?? "\"\(value)\""
    }
}

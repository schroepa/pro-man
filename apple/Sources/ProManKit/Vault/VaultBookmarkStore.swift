import Foundation

/// Persists a security-scoped bookmark so the vault stays connected across launches.
public final class VaultBookmarkStore: @unchecked Sendable {
    public static let shared = VaultBookmarkStore()

    private let defaultsKey = "proman.vault.bookmark"
    private let defaults = UserDefaults.standard
    private var activeAccessURL: URL?

    public init() {}

    public var hasBookmark: Bool {
        defaults.data(forKey: defaultsKey) != nil
    }

    public func saveBookmark(for url: URL) throws {
        #if os(macOS)
        let options: URL.BookmarkCreationOptions = [.withSecurityScope]
        #else
        let options: URL.BookmarkCreationOptions = []
        #endif
        let data = try url.bookmarkData(
            options: options,
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )
        defaults.set(data, forKey: defaultsKey)
    }

    @discardableResult
    public func resolveBookmark() throws -> URL {
        guard let data = defaults.data(forKey: defaultsKey) else {
            throw DomainError.vaultNotConnected
        }
        var isStale = false
        #if os(macOS)
        let options: URL.BookmarkResolutionOptions = [.withSecurityScope]
        #else
        let options: URL.BookmarkResolutionOptions = []
        #endif
        let url = try URL(
            resolvingBookmarkData: data,
            options: options,
            relativeTo: nil,
            bookmarkDataIsStale: &isStale
        )
        if isStale {
            try saveBookmark(for: url)
        }
        stopAccess()
        #if os(macOS)
        guard url.startAccessingSecurityScopedResource() else {
            throw DomainError.vaultNotConnected
        }
        #else
        _ = url.startAccessingSecurityScopedResource()
        #endif
        activeAccessURL = url
        return url
    }

    public func stopAccess() {
        activeAccessURL?.stopAccessingSecurityScopedResource()
        activeAccessURL = nil
    }

    public func clear() {
        stopAccess()
        defaults.removeObject(forKey: defaultsKey)
    }
}

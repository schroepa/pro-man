// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ProManKit",
    platforms: [
        .macOS(.v14),
        .iOS(.v17),
    ],
    products: [
        .library(name: "ProManKit", targets: ["ProManKit"]),
    ],
    targets: [
        .target(
            name: "ProManKit",
            path: "Sources/ProManKit"
        ),
        .testTarget(
            name: "ProManKitTests",
            dependencies: ["ProManKit"],
            path: "Tests/ProManKitTests",
            resources: [
                .copy("Fixtures"),
            ]
        ),
    ]
)

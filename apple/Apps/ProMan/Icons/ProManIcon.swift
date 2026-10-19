import SwiftUI
import ProManKit

/// Tabler-style stroke icons (same catalog as web `src/components/icons.ts`), drawn in a 24×24 viewBox.
enum ProManIcon: String, CaseIterable, Sendable {
    case layoutDashboard
    case layoutKanban
    case listDetails
    case timeline
    case calendar
    case fileText
    case sparkles
    case buildingStore
    case folder
    case briefcase
    case search
    case plus
    case refresh

    static func forDestination(_ destination: AppModel.Destination) -> ProManIcon {
        switch destination {
        case .dashboard: return .layoutDashboard
        case .kanban: return .layoutKanban
        case .list: return .listDetails
        case .gantt: return .timeline
        case .calendar: return .calendar
        case .docs: return .fileText
        case .knowledge: return .sparkles
        case .client: return .briefcase
        case .backoffice: return .buildingStore
        }
    }
}

struct ProManIconView: View {
    let icon: ProManIcon
    var size: CGFloat = 16
    var lineWidth: CGFloat = 1.75

    var body: some View {
        Canvas { context, canvasSize in
            let scale = min(canvasSize.width, canvasSize.height) / 24
            var transformed = context
            transformed.scaleBy(x: scale, y: scale)
            let style = StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round)
            for path in icon.paths {
                transformed.stroke(path, with: .foreground, style: style)
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

private extension ProManIcon {
    var paths: [Path] {
        switch self {
        case .layoutDashboard:
            return [
                rect(4, 4, 6, 8),
                rect(4, 16, 6, 4),
                rect(14, 12, 6, 8),
                rect(14, 4, 6, 4),
            ]
        case .layoutKanban:
            return [
                roundedRect(4, 4, 16, 16, 2),
                line(10, 4, 10, 20),
                line(14, 4, 14, 20),
            ]
        case .listDetails:
            return [
                line(13, 5, 21, 5),
                line(13, 9, 18, 9),
                line(13, 15, 21, 15),
                line(13, 19, 18, 19),
                roundedRect(3, 4, 6, 6, 1),
                roundedRect(3, 14, 6, 6, 1),
            ]
        case .timeline:
            return [
                Path { p in
                    p.addEllipse(in: CGRect(x: 3, y: 15, width: 2, height: 2))
                    p.addEllipse(in: CGRect(x: 11, y: 19, width: 2, height: 2))
                    p.addEllipse(in: CGRect(x: 19, y: 15, width: 2, height: 2))
                    p.addEllipse(in: CGRect(x: 19, y: 7, width: 2, height: 2))
                    p.addEllipse(in: CGRect(x: 11, y: 3, width: 2, height: 2))
                    p.addEllipse(in: CGRect(x: 3, y: 7, width: 2, height: 2))
                },
                line(4, 9, 4, 15),
                line(12, 5, 12, 19),
                line(20, 9, 20, 15),
            ]
        case .calendar:
            return [
                roundedRect(4, 5, 16, 16, 2),
                line(16, 3, 16, 7),
                line(8, 3, 8, 7),
                line(4, 11, 20, 11),
            ]
        case .fileText:
            return [
                Path { p in
                    p.move(to: CGPoint(x: 14, y: 3))
                    p.addLine(to: CGPoint(x: 14, y: 7))
                    p.addQuadCurve(to: CGPoint(x: 15, y: 8), control: CGPoint(x: 14, y: 8))
                    p.addLine(to: CGPoint(x: 19, y: 8))
                },
                Path { p in
                    p.move(to: CGPoint(x: 17, y: 21))
                    p.addLine(to: CGPoint(x: 7, y: 21))
                    p.addQuadCurve(to: CGPoint(x: 5, y: 19), control: CGPoint(x: 5, y: 21))
                    p.addLine(to: CGPoint(x: 5, y: 5))
                    p.addQuadCurve(to: CGPoint(x: 7, y: 3), control: CGPoint(x: 5, y: 3))
                    p.addLine(to: CGPoint(x: 14, y: 3))
                    p.addLine(to: CGPoint(x: 19, y: 8))
                    p.addLine(to: CGPoint(x: 19, y: 19))
                    p.addQuadCurve(to: CGPoint(x: 17, y: 21), control: CGPoint(x: 19, y: 21))
                },
                line(9, 9, 10, 9),
                line(9, 13, 15, 13),
                line(9, 17, 15, 17),
            ]
        case .sparkles:
            return [
                Path { p in
                    p.move(to: CGPoint(x: 12, y: 6))
                    p.addLine(to: CGPoint(x: 13.5, y: 10.5))
                    p.addLine(to: CGPoint(x: 18, y: 12))
                    p.addLine(to: CGPoint(x: 13.5, y: 13.5))
                    p.addLine(to: CGPoint(x: 12, y: 18))
                    p.addLine(to: CGPoint(x: 10.5, y: 13.5))
                    p.addLine(to: CGPoint(x: 6, y: 12))
                    p.addLine(to: CGPoint(x: 10.5, y: 10.5))
                    p.closeSubpath()
                },
                Path { p in
                    p.move(to: CGPoint(x: 18, y: 4))
                    p.addLine(to: CGPoint(x: 18.7, y: 5.8))
                    p.addLine(to: CGPoint(x: 20.5, y: 6.5))
                    p.addLine(to: CGPoint(x: 18.7, y: 7.2))
                    p.addLine(to: CGPoint(x: 18, y: 9))
                    p.addLine(to: CGPoint(x: 17.3, y: 7.2))
                    p.addLine(to: CGPoint(x: 15.5, y: 6.5))
                    p.addLine(to: CGPoint(x: 17.3, y: 5.8))
                    p.closeSubpath()
                },
                Path { p in
                    p.move(to: CGPoint(x: 18, y: 15))
                    p.addLine(to: CGPoint(x: 18.7, y: 16.8))
                    p.addLine(to: CGPoint(x: 20.5, y: 17.5))
                    p.addLine(to: CGPoint(x: 18.7, y: 18.2))
                    p.addLine(to: CGPoint(x: 18, y: 20))
                    p.addLine(to: CGPoint(x: 17.3, y: 18.2))
                    p.addLine(to: CGPoint(x: 15.5, y: 17.5))
                    p.addLine(to: CGPoint(x: 17.3, y: 16.8))
                    p.closeSubpath()
                },
            ]
        case .buildingStore:
            return [
                line(3, 21, 21, 21),
                Path { p in
                    p.move(to: CGPoint(x: 3, y: 7))
                    p.addLine(to: CGPoint(x: 5, y: 3))
                    p.addLine(to: CGPoint(x: 19, y: 3))
                    p.addLine(to: CGPoint(x: 21, y: 7))
                    p.addLine(to: CGPoint(x: 3, y: 7))
                },
                line(5, 21, 5, 11),
                line(19, 21, 19, 11),
                Path { p in
                    p.move(to: CGPoint(x: 9, y: 21))
                    p.addLine(to: CGPoint(x: 9, y: 17))
                    p.addQuadCurve(to: CGPoint(x: 11, y: 15), control: CGPoint(x: 9, y: 15))
                    p.addLine(to: CGPoint(x: 13, y: 15))
                    p.addQuadCurve(to: CGPoint(x: 15, y: 17), control: CGPoint(x: 15, y: 15))
                    p.addLine(to: CGPoint(x: 15, y: 21))
                },
            ]
        case .folder:
            return [
                Path { p in
                    p.move(to: CGPoint(x: 5, y: 4))
                    p.addLine(to: CGPoint(x: 9, y: 4))
                    p.addLine(to: CGPoint(x: 12, y: 7))
                    p.addLine(to: CGPoint(x: 19, y: 7))
                    p.addQuadCurve(to: CGPoint(x: 21, y: 9), control: CGPoint(x: 21, y: 7))
                    p.addLine(to: CGPoint(x: 21, y: 17))
                    p.addQuadCurve(to: CGPoint(x: 19, y: 19), control: CGPoint(x: 21, y: 19))
                    p.addLine(to: CGPoint(x: 5, y: 19))
                    p.addQuadCurve(to: CGPoint(x: 3, y: 17), control: CGPoint(x: 3, y: 19))
                    p.addLine(to: CGPoint(x: 3, y: 6))
                    p.addQuadCurve(to: CGPoint(x: 5, y: 4), control: CGPoint(x: 3, y: 4))
                },
            ]
        case .briefcase:
            return [
                roundedRect(3, 7, 18, 13, 2),
                Path { p in
                    p.move(to: CGPoint(x: 8, y: 7))
                    p.addLine(to: CGPoint(x: 8, y: 5))
                    p.addQuadCurve(to: CGPoint(x: 10, y: 3), control: CGPoint(x: 8, y: 3))
                    p.addLine(to: CGPoint(x: 14, y: 3))
                    p.addQuadCurve(to: CGPoint(x: 16, y: 5), control: CGPoint(x: 16, y: 3))
                    p.addLine(to: CGPoint(x: 16, y: 7))
                },
                line(3, 13, 21, 13),
            ]
        case .search:
            return [
                Path { p in p.addEllipse(in: CGRect(x: 3, y: 3, width: 14, height: 14)) },
                line(21, 21, 15, 15),
            ]
        case .plus:
            return [
                line(12, 5, 12, 19),
                line(5, 12, 19, 12),
            ]
        case .refresh:
            return [
                Path { p in
                    p.addArc(
                        center: CGPoint(x: 12, y: 12),
                        radius: 7,
                        startAngle: .degrees(-40),
                        endAngle: .degrees(200),
                        clockwise: false
                    )
                },
                Path { p in
                    p.move(to: CGPoint(x: 16, y: 5))
                    p.addLine(to: CGPoint(x: 19, y: 5))
                    p.addLine(to: CGPoint(x: 19, y: 8))
                },
            ]
        }
    }

    private func line(_ x1: CGFloat, _ y1: CGFloat, _ x2: CGFloat, _ y2: CGFloat) -> Path {
        Path { p in
            p.move(to: CGPoint(x: x1, y: y1))
            p.addLine(to: CGPoint(x: x2, y: y2))
        }
    }

    private func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> Path {
        Path(CGRect(x: x, y: y, width: w, height: h))
    }

    private func roundedRect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ r: CGFloat) -> Path {
        Path(roundedRect: CGRect(x: x, y: y, width: w, height: h), cornerRadius: r)
    }
}

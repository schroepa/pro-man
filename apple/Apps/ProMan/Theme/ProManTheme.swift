import SwiftUI

#if os(macOS)
import AppKit
#else
import UIKit
#endif

/// ProMan visual tokens for native apps — HIG chrome, Warm Obsidian / Tintfield surfaces.
enum ProManTheme {
    static let brandLight = Color(hex: 0xC25E1A)
    static let brandDark = Color(hex: 0xE07A38)

    static var brand: Color {
        adaptive(light: brandLight, dark: brandDark)
    }

    static var canvas: Color {
        adaptive(light: Color(hex: 0xFAF9F7), dark: Color(hex: 0x11100F))
    }

    static var sidebar: Color {
        adaptive(light: Color(hex: 0xF3F1EC), dark: Color(hex: 0x181615))
    }

    static var surface: Color {
        adaptive(light: .white, dark: Color(hex: 0x201E1C))
    }

    static var surfaceRaised: Color {
        adaptive(light: .white, dark: Color(hex: 0x292624))
    }

    static var subtle: Color {
        adaptive(light: Color(hex: 0xF3F1EC), dark: Color(hex: 0x181615))
    }

    static var muted: Color {
        adaptive(light: Color(hex: 0xEAE7DF), dark: Color(hex: 0x292624))
    }

    static var elevated: Color {
        adaptive(light: .white, dark: Color(hex: 0x34312E))
    }

    static var textPrimary: Color {
        adaptive(light: Color(hex: 0x1C1917), dark: Color(hex: 0xF5F5F4))
    }

    static var textSecondary: Color {
        adaptive(light: Color(hex: 0x6E6757), dark: Color(hex: 0xA8A29E))
    }

    static var textMuted: Color {
        adaptive(light: Color(hex: 0x948D7D), dark: Color(hex: 0x78716C))
    }

    static let priorityUrgent = Color(hex: 0xE63946)
    static let priorityHigh = Color(hex: 0xF28C18)
    static let priorityNormal = Color(hex: 0x3B82F6)
    static let priorityLow = Color(hex: 0x8B8680)

    static let statusTodo = Color(hex: 0x8B8680)
    static let statusProgress = Color(hex: 0x3B82F6)
    static let statusReview = Color(hex: 0xA855F7)
    static let statusDone = Color(hex: 0x22A06B)

    static let radiusSm: CGFloat = 6
    static let radiusMd: CGFloat = 10
    static let radiusLg: CGFloat = 14
    static let navRowHeight: CGFloat = 32

    private static func adaptive(light: Color, dark: Color) -> Color {
        #if os(macOS)
        Color(nsColor: NSColor(name: nil, dynamicProvider: { appearance in
            let darkAqua = appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            return NSColor(darkAqua ? dark : light)
        }))
        #else
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark ? UIColor(dark) : UIColor(light)
        })
        #endif
    }
}

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: opacity)
    }
}

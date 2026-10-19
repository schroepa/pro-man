import SwiftUI
import ProManKit

struct CalendarView: View {
    @Environment(AppModel.self) private var model
    @State private var month = Date()

    private var tasksByDay: [String: [Task]] {
        Dictionary(grouping: model.filteredTasks.filter { !$0.dueDate.isEmpty }, by: \.dueDate)
    }

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Button { shiftMonth(-1) } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 13, weight: .semibold))
                }
                .buttonStyle(.plain)
                .foregroundStyle(ProManTheme.textSecondary)
                Spacer()
                Text(monthTitle)
                    .font(ProManTheme.body(18, weight: .bold))
                    .foregroundStyle(ProManTheme.textPrimary)
                Spacer()
                Button { shiftMonth(1) } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                }
                .buttonStyle(.plain)
                .foregroundStyle(ProManTheme.textSecondary)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 7), spacing: 6) {
                ForEach(["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], id: \.self) { d in
                    Text(d)
                        .font(ProManTheme.body(11, weight: .semibold))
                        .foregroundStyle(ProManTheme.textMuted)
                        .frame(maxWidth: .infinity)
                }
                ForEach(daysInMonth, id: \.self) { day in
                    let key = dayKey(day)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("\(Calendar.current.component(.day, from: day))")
                            .font(ProManTheme.mono(11, weight: .medium))
                            .foregroundStyle(ProManTheme.textSecondary)
                        ForEach(tasksByDay[key] ?? []) { task in
                            Text(task.title)
                                .font(ProManTheme.body(10, weight: .medium))
                                .foregroundStyle(ProManTheme.textPrimary)
                                .lineLimit(1)
                                .padding(.horizontal, 4)
                                .padding(.vertical, 2)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(ProManTheme.brand.opacity(0.12), in: RoundedRectangle(cornerRadius: 3, style: .continuous))
                                .onTapGesture {
                                    model.selectedTaskId = task.id
                                    model.destination = .list
                                }
                        }
                    }
                    .padding(6)
                    .frame(maxWidth: .infinity, minHeight: 72, alignment: .topLeading)
                    .promanSurface(radius: ProManTheme.radiusSm)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
        }
        .promanCanvas()
    }

    private var monthTitle: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "de_DE")
        f.dateFormat = "LLLL yyyy"
        return f.string(from: month)
    }

    private var daysInMonth: [Date] {
        let cal = Calendar.current
        guard let interval = cal.dateInterval(of: .month, for: month) else { return [] }
        var days: [Date] = []
        var d = interval.start
        let weekday = cal.component(.weekday, from: d)
        let mondayOffset = (weekday + 5) % 7
        if let startPad = cal.date(byAdding: .day, value: -mondayOffset, to: d) {
            d = startPad
        }
        while d < interval.end || days.count % 7 != 0 {
            days.append(d)
            d = cal.date(byAdding: .day, value: 1, to: d) ?? d
            if days.count > 42 { break }
        }
        return days
    }

    private func dayKey(_ date: Date) -> String {
        let f = DateFormatter()
        f.calendar = Calendar.current
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    private func shiftMonth(_ delta: Int) {
        if let next = Calendar.current.date(byAdding: .month, value: delta, to: month) {
            month = next
        }
    }
}

import SwiftUI
import ProManKit

struct CalendarView: View {
    @Environment(AppModel.self) private var model
    @State private var month = Date()

    private var tasksByDay: [String: [Task]] {
        Dictionary(grouping: model.filteredTasks.filter { !$0.dueDate.isEmpty }, by: \.dueDate)
    }

    var body: some View {
        VStack {
            HStack {
                Button { shiftMonth(-1) } label: { Image(systemName: "chevron.left") }
                Spacer()
                Text(monthTitle).font(.title2.bold())
                Spacer()
                Button { shiftMonth(1) } label: { Image(systemName: "chevron.right") }
            }
            .padding(.horizontal)

            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
                ForEach(["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], id: \.self) { d in
                    Text(d).font(.caption.bold()).foregroundStyle(.secondary)
                }
                ForEach(daysInMonth, id: \.self) { day in
                    let key = dayKey(day)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(Calendar.current.component(.day, from: day))")
                            .font(.caption)
                        ForEach(tasksByDay[key] ?? []) { task in
                            Text(task.title)
                                .font(.caption2)
                                .lineLimit(1)
                                .padding(2)
                                .background(.tint.opacity(0.15), in: RoundedRectangle(cornerRadius: 3))
                                .onTapGesture {
                                    model.selectedTaskId = task.id
                                    model.destination = .list
                                }
                        }
                    }
                    .frame(maxWidth: .infinity, minHeight: 64, alignment: .topLeading)
                    .padding(4)
                    .background(.quaternary.opacity(0.3), in: RoundedRectangle(cornerRadius: 6))
                }
            }
            .padding()
        }
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
        // Pad to Monday
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

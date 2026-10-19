import SwiftUI
import ProManKit

struct DashboardView: View {
    @Environment(AppModel.self) private var model

    private var openCount: Int {
        model.filteredTasks.filter { $0.status != DefaultTaskStatus.done.rawValue }.count
    }

    private var overdue: [Task] {
        let today = ISO8601DateFormatter().string(from: Date()).prefix(10)
        return model.filteredTasks.filter {
            !$0.dueDate.isEmpty
                && $0.dueDate < String(today)
                && $0.status != DefaultTaskStatus.done.rawValue
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Übersicht")
                    .font(ProManTheme.body(22, weight: .bold))
                    .foregroundStyle(ProManTheme.textPrimary)

                HStack(spacing: 12) {
                    kpiCard(title: "Offen", value: "\(openCount)", accent: ProManTheme.statusProgress)
                    kpiCard(title: "Überfällig", value: "\(overdue.count)", accent: ProManTheme.priorityUrgent)
                    kpiCard(title: "Gesamt", value: "\(model.filteredTasks.count)", accent: ProManTheme.brand)
                }

                VStack(alignment: .leading, spacing: 10) {
                    sectionTitle("Attention")
                    if overdue.isEmpty {
                        Text("Nichts Überfälliges.")
                            .font(ProManTheme.body(13))
                            .foregroundStyle(ProManTheme.textMuted)
                            .padding(16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .promanSurface()
                    } else {
                        VStack(spacing: 8) {
                            ForEach(overdue) { task in
                                Button {
                                    model.selectedTaskId = task.id
                                    model.destination = .list
                                } label: {
                                    TaskRow(task: task)
                                        .padding(12)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .promanCard()
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    sectionTitle("Weiter")
                    HStack(spacing: 10) {
                        navChip("Zum Board", icon: .layoutKanban) { model.destination = .kanban }
                        navChip("Zur Liste", icon: .listDetails) { model.destination = .list }
                    }
                }
            }
            .padding(20)
        }
        .promanCanvas()
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.caption2.weight(.semibold))
            .foregroundStyle(ProManTheme.textMuted)
            .tracking(0.4)
    }

    private func kpiCard(title: String, value: String, accent: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(ProManTheme.body(12, weight: .medium))
                .foregroundStyle(ProManTheme.textSecondary)
            Text(value)
                .font(ProManTheme.body(28, weight: .bold))
                .foregroundStyle(ProManTheme.textPrimary)
            Capsule()
                .fill(accent)
                .frame(width: 28, height: 3)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .promanCard()
    }

    private func navChip(_ title: String, icon: ProManIcon, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                ProManIconView(icon: icon, size: 14)
                Text(title)
                    .font(ProManTheme.body(13, weight: .semibold))
            }
            .foregroundStyle(ProManTheme.brand)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .promanSurface(radius: ProManTheme.radiusSm)
        }
        .buttonStyle(.plain)
    }
}

struct TaskRow: View {
    let task: Task

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(task.displayKey)
                    .font(ProManTheme.mono(11, weight: .semibold))
                    .foregroundStyle(ProManTheme.textMuted)
                Spacer()
                Text(task.status)
                    .font(ProManTheme.body(11, weight: .medium))
                    .foregroundStyle(ProManTheme.textSecondary)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 2)
                    .background(ProManTheme.muted.opacity(0.7), in: Capsule())
            }
            Text(task.title)
                .font(ProManTheme.body(14, weight: .semibold))
                .foregroundStyle(ProManTheme.textPrimary)
            if !task.dueDate.isEmpty {
                Text("Fällig \(task.dueDate)")
                    .font(ProManTheme.mono(11))
                    .foregroundStyle(ProManTheme.textSecondary)
            }
        }
    }
}

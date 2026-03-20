import SwiftUI
import WidgetKit

struct SmallWidgetView: View {
    let summary: DailySummary

    private var progress: Double {
        guard let goal = summary.caloriesGoal, goal > 0 else { return 0 }
        return min(summary.calories / goal, 1.0)
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.green.opacity(0.2), lineWidth: 10)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(Color.green, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 2) {
                Text("\(Int(summary.calories))")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .monospacedDigit()
                Text("/ \(Int(summary.caloriesGoal ?? 2100))")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
                Text("kcal")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(12)
    }
}

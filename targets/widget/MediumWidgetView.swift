import SwiftUI
import WidgetKit

struct MacroBar: View {
    let label: String
    let current: Double
    let goal: Double?
    let color: Color

    private var progress: Double {
        guard let goal, goal > 0 else { return 0 }
        return min(current / goal, 1.0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(Int(current))/\(Int(goal ?? 0))g")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .monospacedDigit()
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(color.opacity(0.2))
                    Capsule()
                        .fill(color)
                        .frame(width: max(geo.size.width * progress, 4))
                }
            }
            .frame(height: 6)
        }
    }
}

struct MediumWidgetView: View {
    let summary: DailySummary

    private var progress: Double {
        guard let goal = summary.caloriesGoal, goal > 0 else { return 0 }
        return min(summary.calories / goal, 1.0)
    }

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .stroke(Color.green.opacity(0.2), lineWidth: 8)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(Color.green, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                VStack(spacing: 1) {
                    Text("\(Int(summary.calories))")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .monospacedDigit()
                    Text("kcal")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(.tertiary)
                }
            }
            .frame(width: 90, height: 90)

            VStack(spacing: 8) {
                MacroBar(label: "Prot.", current: summary.proteins, goal: summary.proteinsGoal, color: .blue)
                MacroBar(label: "Gluc.", current: summary.carbs, goal: summary.carbsGoal, color: .orange)
                MacroBar(label: "Lip.", current: summary.fats, goal: summary.fatsGoal, color: .purple)
            }
        }
        .padding(12)
    }
}

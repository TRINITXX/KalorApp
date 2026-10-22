import Foundation
import WidgetKit

/// Recomputes today's totals for the widget after an intent wrote entries,
/// keeping the goals the app saved, then reloads the widgets.
enum WidgetRefresher {
    static func refreshToday(_ helper: SQLiteHelper) {
        let today = MealRule.localDateString(Date())
        var summary = helper.getDailySummary(date: today)
        let defaults = UserDefaults(suiteName: "group.com.kalorapp.app")
        if let existingJson = defaults?.string(forKey: "dailySummary"),
           let existingData = existingJson.data(using: .utf8),
           let existing = try? JSONDecoder().decode(DailySummary.self, from: existingData) {
            summary = DailySummary(
                date: summary.date,
                calories: summary.calories, proteins: summary.proteins,
                carbs: summary.carbs, fats: summary.fats,
                fiber: summary.fiber, sugars: summary.sugars,
                saturated_fat: summary.saturated_fat, salt: summary.salt,
                caloriesGoal: existing.caloriesGoal, proteinsGoal: existing.proteinsGoal,
                carbsGoal: existing.carbsGoal, fatsGoal: existing.fatsGoal,
                fiberGoal: existing.fiberGoal, sugarsGoal: existing.sugarsGoal,
                saturatedFatGoal: existing.saturatedFatGoal, saltGoal: existing.saltGoal
            )
        }
        if let jsonData = try? JSONEncoder().encode(summary) {
            defaults?.set(String(data: jsonData, encoding: .utf8), forKey: "dailySummary")
        }
        WidgetCenter.shared.reloadAllTimelines()
    }
}

import Foundation

struct DailySummary: Codable {
    let date: String
    let calories: Double
    let proteins: Double
    let carbs: Double
    let fats: Double
    let fiber: Double
    let sugars: Double
    let saturated_fat: Double
    let salt: Double
    let caloriesGoal: Double?
    let proteinsGoal: Double?
    let carbsGoal: Double?
    let fatsGoal: Double?
    let fiberGoal: Double?
    let sugarsGoal: Double?
    let saturatedFatGoal: Double?
    let saltGoal: Double?

    static let empty = DailySummary(
        date: "", calories: 0, proteins: 0, carbs: 0, fats: 0,
        fiber: 0, sugars: 0, saturated_fat: 0, salt: 0,
        caloriesGoal: 2100, proteinsGoal: 120, carbsGoal: 260, fatsGoal: 70,
        fiberGoal: nil, sugarsGoal: nil, saturatedFatGoal: nil, saltGoal: nil
    )

    static func load() -> DailySummary {
        guard let defaults = UserDefaults(suiteName: "group.com.kalorapp.app"),
              let jsonString = defaults.string(forKey: "dailySummary"),
              let data = jsonString.data(using: .utf8),
              let summary = try? JSONDecoder().decode(DailySummary.self, from: data)
        else {
            return .empty
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let todayString = formatter.string(from: Date())
        return summary.date == todayString ? summary : .empty
    }
}

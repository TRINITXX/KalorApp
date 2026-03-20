import AppIntents
import WidgetKit

struct FavoriteEntity: AppEntity {
    static var defaultQuery = FavoriteEntityQuery()
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Aliment favori")

    var id: String
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)", subtitle: brand.map { "\($0)" })
    }

    let name: String
    let brand: String?
    let lastQuantity: Double
}

struct FavoriteEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [FavoriteEntity] {
        guard let helper = SQLiteHelper() else { return [] }
        let all = helper.getFavorites()
        return identifiers.compactMap { id in
            guard let fav = all.first(where: { $0.id == id }) else { return nil }
            return FavoriteEntity(id: fav.id, name: fav.name, brand: fav.brand, lastQuantity: fav.lastQuantity)
        }
    }

    func suggestedEntities() async throws -> [FavoriteEntity] {
        guard let helper = SQLiteHelper() else { return [] }
        return helper.getFavorites().map {
            FavoriteEntity(id: $0.id, name: $0.name, brand: $0.brand, lastQuantity: $0.lastQuantity)
        }
    }
}

struct QuickMealIntent: AppIntent {
    static var title: LocalizedStringResource = "Ajouter un repas rapide"
    static var description: IntentDescription = "Ajoute plusieurs aliments favoris en un seul repas"
    static var openAppWhenRun = false

    @Parameter(title: "Aliments")
    var selectedFavorites: [FavoriteEntity]

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let helper = SQLiteHelper() else {
            return .result(dialog: "Erreur: impossible d'acceder aux donnees")
        }

        let allFavorites = helper.getFavorites()
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let today = dateFormatter.string(from: Date())
        let hour = Calendar.current.component(.hour, from: Date())
        let meal = hour < 17 ? "lunch" : "dinner"

        var totalCalories: Double = 0

        for entity in selectedFavorites {
            guard let product = allFavorites.first(where: { $0.id == entity.id }) else { continue }

            let qty = product.lastQuantity
            let factor = qty / 100.0

            let cal = product.calories * factor
            let prot = product.proteins * factor
            let carb = product.carbs * factor
            let fat = product.fats * factor
            let fib = product.fiber.map { $0 * factor }
            let sug = product.sugars.map { $0 * factor }
            let sat = product.saturatedFat.map { $0 * factor }
            let slt = product.salt.map { $0 * factor }

            helper.insertEntry(
                productId: product.id, productName: product.name, meal: meal,
                quantity: qty, date: today,
                calories: cal, proteins: prot, carbs: carb, fats: fat,
                fiber: fib, sugars: sug, saturatedFat: sat, salt: slt
            )

            totalCalories += cal
        }

        // Update widget — preserve existing goals from UserDefaults
        var summary = helper.getDailySummary(date: today)
        if let defaults = UserDefaults(suiteName: "group.com.kalorapp.app"),
           let existingJson = defaults.string(forKey: "dailySummary"),
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
            UserDefaults(suiteName: "group.com.kalorapp.app")?
                .set(String(data: jsonData, encoding: .utf8), forKey: "dailySummary")
        }
        WidgetCenter.shared.reloadAllTimelines()

        let count = selectedFavorites.count
        return .result(dialog: "\(count) aliment\(count > 1 ? "s" : "") ajout\u{00e9}\(count > 1 ? "s" : "") \u{2014} \(Int(totalCalories)) kcal")
    }
}

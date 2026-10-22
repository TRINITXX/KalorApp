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
    let portion: Double
}

struct FavoriteEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [FavoriteEntity] {
        guard let helper = SQLiteHelper() else { return [] }
        let all = helper.getFavorites()
        return identifiers.compactMap { id in
            guard let fav = all.first(where: { $0.id == id }) else { return nil }
            return FavoriteEntity(id: fav.id, name: fav.name, brand: fav.brand, portion: fav.portion)
        }
    }

    func suggestedEntities() async throws -> [FavoriteEntity] {
        guard let helper = SQLiteHelper() else { return [] }
        return helper.getFavorites().map {
            FavoriteEntity(id: $0.id, name: $0.name, brand: $0.brand, portion: $0.portion)
        }
    }
}

struct QuickMealIntent: AppIntent {
    static var title: LocalizedStringResource = "Ajouter un repas rapide"
    static var description: IntentDescription = "Ajoute tous les aliments favoris en un seul repas"
    static var openAppWhenRun = false

    @Parameter(title: "Aliments")
    var selectedFavorites: [FavoriteEntity]?

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let helper = SQLiteHelper() else {
            return .result(dialog: "Erreur : impossible d'accéder aux données")
        }

        let allFavorites = helper.getFavorites()

        guard !allFavorites.isEmpty else {
            return .result(dialog: "Aucun favori. Ajoutez des favoris dans KalorApp d'abord.")
        }

        let itemsToAdd: [SQLiteHelper.FavoriteProduct]
        if let selected = selectedFavorites, !selected.isEmpty {
            itemsToAdd = selected.compactMap { entity in
                allFavorites.first(where: { $0.id == entity.id })
            }
        } else {
            itemsToAdd = allFavorites
        }

        guard !itemsToAdd.isEmpty else {
            return .result(dialog: "Aucun aliment à ajouter")
        }

        let today = MealRule.localDateString(Date())
        let meal = MealRule.guess(entries: helper.mealRuleEntries(date: today), isToday: true)

        var totalCalories: Double = 0
        var foods: [VoiceLogger.AddedFood] = []
        let round1 = VoiceLogger.round1

        // All or nothing: Siri must never announce food that is not in the journal.
        guard helper.execute("BEGIN") else {
            return .result(dialog: "\(VoiceLogger.Failure.database.message)")
        }
        var written = true
        for product in itemsToAdd {
            let qty = product.portion
            let factor = qty / 100.0
            let cal = round1(product.calories * factor)

            written = written && helper.insertEntry(
                productId: product.id, productName: product.name, meal: meal,
                quantity: qty, date: today,
                calories: cal, proteins: round1(product.proteins * factor),
                carbs: round1(product.carbs * factor), fats: round1(product.fats * factor),
                fiber: product.fiber.map { round1($0 * factor) }, sugars: product.sugars.map { round1($0 * factor) },
                saturatedFat: product.saturatedFat.map { round1($0 * factor) }, salt: product.salt.map { round1($0 * factor) }
            )
            // Like every add in the app (src/lib/log-foods.ts).
            helper.updateLastQuantity(productId: product.id, quantity: qty)
            totalCalories += cal
            foods.append(VoiceLogger.AddedFood(name: product.name, grams: qty))
        }
        guard written, helper.execute("COMMIT") else {
            helper.execute("ROLLBACK")
            return .result(dialog: "\(VoiceLogger.Failure.database.message)")
        }

        WidgetRefresher.refreshToday(helper)
        let sentence = VoiceLogger.addedSentence(foods: foods, meal: meal, yesterday: false, calories: totalCalories)
        return .result(dialog: "\(sentence)")
    }
}

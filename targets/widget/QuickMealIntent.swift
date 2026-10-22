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

        for product in itemsToAdd {

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

        WidgetRefresher.refreshToday(helper)

        let count = itemsToAdd.count
        return .result(dialog: "\(count) aliment\(count > 1 ? "s" : "") ajout\u{00e9}\(count > 1 ? "s" : "") \u{2014} \(Int(totalCalories)) kcal")
    }
}

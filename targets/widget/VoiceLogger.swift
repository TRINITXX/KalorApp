import Foundation

/// Siri side of the dictation, mirror of src/lib/voice/: builds the same
/// numbered product list, sends the request the app prepared (prompt, schema,
/// model) to Claude, then writes the foods to the journal.
enum VoiceLogger {
    enum Failure: Error {
        case notConfigured, missingKey, database, network, timeout, badKey, rateLimited, overloaded, refused, invalidReply

        var message: String {
            switch self {
            case .notConfigured: return "Ouvre KalorApp une fois pour activer la dictée."
            case .missingKey: return "Ajoute ta clé Claude dans les réglages de KalorApp."
            case .database: return "Le journal de KalorApp est occupé. Rien n'a été ajouté, réessaie."
            case .network: return "Pas de réseau. Réessaie quand tu es connecté."
            case .timeout: return "Claude met trop de temps à répondre. Réessaie."
            case .badKey: return "Ta clé Claude est refusée. Vérifie-la dans KalorApp."
            case .rateLimited: return "Trop de demandes d'un coup. Réessaie dans une minute."
            case .overloaded: return "Claude est surchargé. Réessaie dans un instant."
            case .refused: return "Claude n'a pas voulu traiter cette phrase. Reformule-la."
            case .invalidReply: return "Réponse de Claude illisible. Réessaie."
            }
        }
    }

    struct Outcome {
        let count: Int
        let calories: Double
        let meal: String
        let yesterday: Bool
        let estimatedNames: [String]
        let notUnderstood: [String]

        /// What Siri says back.
        var sentence: String {
            guard count > 0 else {
                return notUnderstood.isEmpty
                    ? "Je n'ai reconnu aucun aliment."
                    : "Je n'ai reconnu aucun aliment dans : \(notUnderstood.joined(separator: ", "))."
            }
            let foods = count > 1 ? "\(count) aliments ajoutés" : "1 aliment ajouté"
            let mealName = MealRule.frenchNames[meal] ?? ""
            let day = yesterday ? " d'hier" : ""
            var text = "\(foods) \(mealName)\(day), \(Int(calories.rounded())) kilocalories."
            if !estimatedNames.isEmpty {
                text += " Estimé par Claude : \(estimatedNames.joined(separator: ", "))."
            }
            if !notUnderstood.isEmpty {
                text += " Pas compris : \(notUnderstood.joined(separator: ", "))."
            }
            return text
        }
    }

    // Mirror of the Zod schema in src/lib/voice/interpret.ts.
    private struct Reply: Decodable {
        struct NewProduct: Decodable {
            let name: String
            let category: String
            let calories: Double
            let proteins: Double
            let carbs: Double
            let fats: Double
        }

        struct Item: Decodable {
            let spoken: String
            let product_index: Int?
            let grams: Double
            let new_product: NewProduct?
        }

        let items: [Item]
        let meal: String?
        let day_offset: Int
        let not_understood: [String]
    }

    private static let appGroup = "group.com.kalorapp.app"
    private static let categories: Set<String> = ["meat", "side", "seasoning", "dessert"]
    private static let meals: Set<String> = ["breakfast", "lunch", "snack", "dinner"]

    private static func round1(_ value: Double) -> Double { (value * 10).rounded() / 10 }

    /// "180" or "12.5", like `fmt` in src/lib/voice/prompt.ts.
    private static func fmt(_ value: Double) -> String {
        let rounded = round1(value)
        return rounded == rounded.rounded() ? String(Int(rounded)) : String(format: "%.1f", rounded)
    }

    static func log(transcript: String) async throws -> Outcome {
        let spoken = transcript.trimmingCharacters(in: .whitespacesAndNewlines)

        guard let configString = UserDefaults(suiteName: appGroup)?.string(forKey: "voiceConfig"),
              let configData = configString.data(using: .utf8),
              let config = try? JSONSerialization.jsonObject(with: configData) as? [String: Any],
              var body = config["requestTemplate"] as? [String: Any],
              let headers = config["headers"] as? [String: String]
        else { throw Failure.notConfigured }
        guard let apiKey = ClaudeKey.read() else { throw Failure.missingKey }
        guard let helper = SQLiteHelper() else { throw Failure.database }

        // Same list as buildCatalog() in src/lib/voice/prompt.ts.
        let catalog = helper.getCatalog()
        var byIndex: [Int: SQLiteHelper.CatalogProduct] = [:]
        var lines: [String] = []
        for (offset, product) in catalog.enumerated() {
            let index = offset + 1
            byIndex[index] = product
            let star = product.isFavorite ? "★ " : ""
            let brand = product.brand.map { " (\($0))" } ?? ""
            lines.append("\(index). \(star)\(product.name)\(brand) | portion \(fmt(product.portion)) g | \(fmt(product.calories)) kcal/100 g")
        }
        let catalogText = lines.isEmpty ? "(aucun produit)" : lines.joined(separator: "\n")
        let userMessage = "Mes produits :\n\(catalogText)\n\nCe que j'ai mangé : « \(spoken) »"
        body["messages"] = [["role": "user", "content": userMessage]]

        guard let url = URL(string: "https://api.anthropic.com/v1/messages"),
              let httpBody = try? JSONSerialization.data(withJSONObject: body)
        else { throw Failure.notConfigured }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        // Siri gives an intent about 30 seconds in all.
        request.timeoutInterval = 22
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        for (name, value) in headers { request.setValue(value, forHTTPHeaderField: name) }
        request.httpBody = httpBody

        let exchange: (Data, URLResponse)
        do {
            exchange = try await URLSession.shared.data(for: request)
        } catch let error as URLError where error.code == .timedOut {
            throw Failure.timeout
        } catch {
            throw Failure.network
        }
        let (data, response) = exchange

        switch (response as? HTTPURLResponse)?.statusCode ?? 0 {
        case 200: break
        case 401, 403: throw Failure.badKey
        case 429: throw Failure.rateLimited
        case 500...599: throw Failure.overloaded
        default: throw Failure.invalidReply
        }

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw Failure.invalidReply
        }
        if (json["stop_reason"] as? String) == "refusal" { throw Failure.refused }
        // Thinking blocks may come first: read the text block.
        guard let content = json["content"] as? [[String: Any]],
              let text = content.first(where: { ($0["type"] as? String) == "text" })?["text"] as? String,
              let replyData = text.data(using: .utf8),
              let reply = try? JSONDecoder().decode(Reply.self, from: replyData)
        else { throw Failure.invalidReply }

        let yesterday = reply.day_offset == -1
        let day = yesterday ? Calendar.current.date(byAdding: .day, value: -1, to: Date()) ?? Date() : Date()
        let date = MealRule.localDateString(day)
        let meal = reply.meal.flatMap { meals.contains($0) ? $0 : nil }
            ?? MealRule.guess(entries: helper.mealRuleEntries(date: date), isToday: !yesterday)

        var count = 0
        var calories = 0.0
        var estimatedNames: [String] = []
        var notUnderstood = reply.not_understood
        let stamp = String(Int(Date().timeIntervalSince1970 * 1000), radix: 36)

        // All or nothing: Siri must never announce food that is not in the journal.
        guard helper.execute("BEGIN") else { throw Failure.database }
        var written = true
        for (i, item) in reply.items.enumerated() {
            // Int(_:) traps on infinity: only finite, positive grams go on.
            guard item.grams.isFinite, item.grams > 0 else {
                notUnderstood.append(item.spoken)
                continue
            }
            let grams = Double(min(max(Int(item.grams.rounded()), 1), 5000))
            let factor = grams / 100

            if let index = item.product_index, let product = byIndex[index] {
                written = written && helper.insertEntry(
                    productId: product.id, productName: product.name, meal: meal,
                    quantity: grams, date: date,
                    calories: round1(product.calories * factor), proteins: round1(product.proteins * factor),
                    carbs: round1(product.carbs * factor), fats: round1(product.fats * factor),
                    fiber: product.fiber.map { round1($0 * factor) }, sugars: product.sugars.map { round1($0 * factor) },
                    saturatedFat: product.saturatedFat.map { round1($0 * factor) }, salt: product.salt.map { round1($0 * factor) }
                )
                helper.updateLastQuantity(productId: product.id, quantity: grams)
                calories += round1(product.calories * factor)
                count += 1
            } else if let draft = item.new_product,
                      !draft.name.trimmingCharacters(in: .whitespaces).isEmpty {
                let id = "estimated-\(stamp)-\(i)"
                let name = draft.name.trimmingCharacters(in: .whitespaces)
                // Rounded first, as interpret.ts does: the entry is then exactly
                // the saved product times the quantity.
                let kcal = round1(max(0, draft.calories))
                let prot = round1(max(0, draft.proteins))
                let carb = round1(max(0, draft.carbs))
                let fat = round1(max(0, draft.fats))
                written = written && helper.insertEstimatedProduct(
                    id: id, name: name,
                    category: categories.contains(draft.category) ? draft.category : "side",
                    calories: kcal, proteins: prot, carbs: carb, fats: fat,
                    lastQuantity: grams
                )
                written = written && helper.insertEntry(
                    productId: id, productName: name, meal: meal, quantity: grams, date: date,
                    calories: round1(kcal * factor), proteins: round1(prot * factor),
                    carbs: round1(carb * factor), fats: round1(fat * factor),
                    fiber: nil, sugars: nil, saturatedFat: nil, salt: nil
                )
                calories += round1(kcal * factor)
                estimatedNames.append(name)
                count += 1
            } else {
                notUnderstood.append(item.spoken)
            }
        }
        guard written, helper.execute("COMMIT") else {
            helper.execute("ROLLBACK")
            throw Failure.database
        }

        WidgetRefresher.refreshToday(helper)
        return Outcome(
            count: count, calories: calories, meal: meal, yesterday: yesterday,
            estimatedNames: estimatedNames, notUnderstood: notUnderstood
        )
    }
}

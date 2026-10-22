import Foundation

/// Mirror of src/lib/meal-rule.ts: the first food of the day is lunch,
/// everything after is dinner, except food added less than 2 hours after
/// the last lunch item. Snack is never guessed.
enum MealRule {
    static func guess(entries: [(meal: String, createdAt: Date)], isToday: Bool, now: Date = Date()) -> String {
        if entries.contains(where: { $0.meal == "dinner" }) { return "dinner" }
        guard let lastLunch = entries.filter({ $0.meal == "lunch" }).map({ $0.createdAt }).max() else {
            return "lunch"
        }
        if !isToday { return "dinner" }
        return now.timeIntervalSince(lastLunch) < 2 * 3600 ? "lunch" : "dinner"
    }

    /// SQLite datetime('now') values: UTC, "yyyy-MM-dd HH:mm:ss".
    static func parseSqliteUtc(_ value: String) -> Date? {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        return formatter.date(from: value)
    }

    /// Local calendar date "yyyy-MM-dd", the format of entries.date.
    static func localDateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    static let frenchNames: [String: String] = [
        "breakfast": "au petit-déjeuner",
        "lunch": "au déjeuner",
        "snack": "au goûter",
        "dinner": "au dîner",
    ]
}

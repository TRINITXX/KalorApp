import Foundation
import SQLite3

class SQLiteHelper {
    private var db: OpaquePointer?

    init?() {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: "group.com.kalorapp.app"
        ) else { return nil }

        let dbPath = containerURL.appendingPathComponent("kalor.db").path

        guard sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK else {
            return nil
        }

        sqlite3_busy_timeout(db, 3000)
        sqlite3_exec(db, "PRAGMA journal_mode = 'wal'", nil, nil, nil)
        sqlite3_exec(db, "PRAGMA foreign_keys = ON", nil, nil, nil)
    }

    deinit {
        sqlite3_close(db)
    }

    struct FavoriteProduct {
        let id: String
        let name: String
        let brand: String?
        let calories: Double
        let proteins: Double
        let carbs: Double
        let fats: Double
        let fiber: Double?
        let sugars: Double?
        let saturatedFat: Double?
        let salt: Double?
        let lastQuantity: Double
    }

    func getFavorites() -> [FavoriteProduct] {
        var result: [FavoriteProduct] = []
        var stmt: OpaquePointer?

        let sql = """
            SELECT p.id, p.name, p.brand, p.calories, p.proteins, p.carbs, p.fats,
                   p.fiber, p.sugars, p.saturated_fat, p.salt, p.last_quantity
            FROM favorites f INNER JOIN products p ON p.id = f.product_id
            ORDER BY f.sort_order ASC
            """

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return [] }

        while sqlite3_step(stmt) == SQLITE_ROW {
            let id = String(cString: sqlite3_column_text(stmt, 0))
            let name = String(cString: sqlite3_column_text(stmt, 1))
            let brand = sqlite3_column_type(stmt, 2) != SQLITE_NULL
                ? String(cString: sqlite3_column_text(stmt, 2)) : nil

            result.append(FavoriteProduct(
                id: id, name: name, brand: brand,
                calories: sqlite3_column_double(stmt, 3),
                proteins: sqlite3_column_double(stmt, 4),
                carbs: sqlite3_column_double(stmt, 5),
                fats: sqlite3_column_double(stmt, 6),
                fiber: sqlite3_column_type(stmt, 7) != SQLITE_NULL ? sqlite3_column_double(stmt, 7) : nil,
                sugars: sqlite3_column_type(stmt, 8) != SQLITE_NULL ? sqlite3_column_double(stmt, 8) : nil,
                saturatedFat: sqlite3_column_type(stmt, 9) != SQLITE_NULL ? sqlite3_column_double(stmt, 9) : nil,
                salt: sqlite3_column_type(stmt, 10) != SQLITE_NULL ? sqlite3_column_double(stmt, 10) : nil,
                lastQuantity: sqlite3_column_double(stmt, 11)
            ))
        }

        sqlite3_finalize(stmt)
        return result
    }

    func insertEntry(productId: String, productName: String, meal: String,
                     quantity: Double, date: String,
                     calories: Double, proteins: Double, carbs: Double, fats: Double,
                     fiber: Double?, sugars: Double?, saturatedFat: Double?, salt: Double?) {
        var stmt: OpaquePointer?
        let sql = """
            INSERT INTO entries (product_id, product_name, meal, quantity, date,
                                 calories, proteins, carbs, fats, fiber, sugars, saturated_fat, salt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return }

        sqlite3_bind_text(stmt, 1, (productId as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 2, (productName as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 3, (meal as NSString).utf8String, -1, nil)
        sqlite3_bind_double(stmt, 4, quantity)
        sqlite3_bind_text(stmt, 5, (date as NSString).utf8String, -1, nil)
        sqlite3_bind_double(stmt, 6, calories)
        sqlite3_bind_double(stmt, 7, proteins)
        sqlite3_bind_double(stmt, 8, carbs)
        sqlite3_bind_double(stmt, 9, fats)

        if let fiber { sqlite3_bind_double(stmt, 10, fiber) } else { sqlite3_bind_null(stmt, 10) }
        if let sugars { sqlite3_bind_double(stmt, 11, sugars) } else { sqlite3_bind_null(stmt, 11) }
        if let saturatedFat { sqlite3_bind_double(stmt, 12, saturatedFat) } else { sqlite3_bind_null(stmt, 12) }
        if let salt { sqlite3_bind_double(stmt, 13, salt) } else { sqlite3_bind_null(stmt, 13) }

        sqlite3_step(stmt)
        sqlite3_finalize(stmt)
    }

    func updateLastQuantity(productId: String, quantity: Double) {
        var stmt: OpaquePointer?
        let sql = "UPDATE products SET last_quantity = ? WHERE id = ?"

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return }
        sqlite3_bind_double(stmt, 1, quantity)
        sqlite3_bind_text(stmt, 2, (productId as NSString).utf8String, -1, nil)
        sqlite3_step(stmt)
        sqlite3_finalize(stmt)
    }

    func getDailySummary(date: String) -> DailySummary {
        var stmt: OpaquePointer?
        let sql = """
            SELECT COALESCE(SUM(calories),0), COALESCE(SUM(proteins),0),
                   COALESCE(SUM(carbs),0), COALESCE(SUM(fats),0),
                   COALESCE(SUM(fiber),0), COALESCE(SUM(sugars),0),
                   COALESCE(SUM(saturated_fat),0), COALESCE(SUM(salt),0)
            FROM entries WHERE date = ?
            """

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return .empty }
        sqlite3_bind_text(stmt, 1, (date as NSString).utf8String, -1, nil)

        guard sqlite3_step(stmt) == SQLITE_ROW else {
            sqlite3_finalize(stmt)
            return .empty
        }

        let summary = DailySummary(
            date: date,
            calories: sqlite3_column_double(stmt, 0),
            proteins: sqlite3_column_double(stmt, 1),
            carbs: sqlite3_column_double(stmt, 2),
            fats: sqlite3_column_double(stmt, 3),
            fiber: sqlite3_column_double(stmt, 4),
            sugars: sqlite3_column_double(stmt, 5),
            saturated_fat: sqlite3_column_double(stmt, 6),
            salt: sqlite3_column_double(stmt, 7),
            caloriesGoal: nil, proteinsGoal: nil, carbsGoal: nil, fatsGoal: nil,
            fiberGoal: nil, sugarsGoal: nil, saturatedFatGoal: nil, saltGoal: nil
        )

        sqlite3_finalize(stmt)
        return summary
    }
}

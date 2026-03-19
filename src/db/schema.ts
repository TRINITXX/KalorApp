export const CREATE_PRODUCTS_TABLE = `
CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  brand           TEXT,
  image_url       TEXT,
  source          TEXT NOT NULL,
  calories        REAL NOT NULL,
  proteins        REAL NOT NULL,
  carbs           REAL NOT NULL,
  fats            REAL NOT NULL,
  fiber           REAL,
  sugars          REAL,
  saturated_fat   REAL,
  salt            REAL,
  last_quantity   REAL DEFAULT 100,
  created_at      TEXT DEFAULT (datetime('now'))
);`;

export const CREATE_ENTRIES_TABLE = `
CREATE TABLE IF NOT EXISTS entries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name    TEXT NOT NULL,
  meal            TEXT NOT NULL,
  quantity        REAL NOT NULL,
  date            TEXT NOT NULL,
  calories        REAL NOT NULL,
  proteins        REAL NOT NULL,
  carbs           REAL NOT NULL,
  fats            REAL NOT NULL,
  fiber           REAL,
  sugars          REAL,
  saturated_fat   REAL,
  salt            REAL,
  created_at      TEXT DEFAULT (datetime('now'))
);`;

export const CREATE_FAVORITES_TABLE = `
CREATE TABLE IF NOT EXISTS favorites (
  product_id      TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  sort_order      INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);`;

export const CREATE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_date_meal ON entries(date, meal);
CREATE INDEX IF NOT EXISTS idx_entries_product ON entries(product_id);
`;

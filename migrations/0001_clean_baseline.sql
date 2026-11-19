-- Reconstructed schema for a NEW, EMPTY Auto Sale Umar D1. No business rows.
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL COLLATE NOCASE UNIQUE, password_hash TEXT NOT NULL, full_name TEXT NOT NULL, phone TEXT,
 role TEXT NOT NULL CHECK(role IN ('super_admin','admin','sales_manager')), status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')),
 created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_login_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS one_super_admin ON users(role) WHERE role='super_admin';
CREATE TABLE IF NOT EXISTS sessions (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked_at TEXT, user_agent TEXT, ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS brands (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL COLLATE NOCASE UNIQUE, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS cars (
 id INTEGER PRIMARY KEY AUTOINCREMENT, brand_id INTEGER NOT NULL REFERENCES brands(id), slug TEXT NOT NULL UNIQUE, model TEXT NOT NULL, trim TEXT, model_year INTEGER, vin TEXT COLLATE NOCASE, stock_number TEXT,
 short_description_ru TEXT, short_description_uz TEXT, description_ru TEXT, description_uz TEXT, price_amount REAL, price_currency TEXT NOT NULL DEFAULT 'USD', price_on_request INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'in_stock' CHECK(status IN ('in_stock','in_showroom','in_transit','made_to_order','reserved','sold','hidden')), source_country TEXT, arrival_date TEXT, mileage_km INTEGER,
 is_new INTEGER NOT NULL DEFAULT 0, is_featured INTEGER NOT NULL DEFAULT 0, is_new_arrival INTEGER NOT NULL DEFAULT 0, is_published INTEGER NOT NULL DEFAULT 0,
 created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS cars_public ON cars(is_published,status,updated_at);
CREATE TABLE IF NOT EXISTS car_specs (car_id INTEGER PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE, engine_name TEXT, fuel_type_ru TEXT, fuel_type_uz TEXT, transmission_ru TEXT, transmission_uz TEXT, drivetrain_ru TEXT, drivetrain_uz TEXT, seats INTEGER);
CREATE TABLE IF NOT EXISTS car_performance (car_id INTEGER PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE, engine_displacement_l REAL, horsepower_hp REAL, torque_nm REAL, acceleration_0_100_s REAL, top_speed_kmh REAL, fuel_consumption_l_100km REAL, electric_range_km REAL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS car_links (car_id INTEGER PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE, instagram_url TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS car_variants (id INTEGER PRIMARY KEY AUTOINCREMENT, car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE, color_name_ru TEXT, color_name_uz TEXT, interior_color_ru TEXT, interior_color_uz TEXT, quantity INTEGER NOT NULL DEFAULT 1, is_default INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS car_variants_car ON car_variants(car_id,sort_order);
CREATE TABLE IF NOT EXISTS car_variant_style (variant_id INTEGER PRIMARY KEY REFERENCES car_variants(id) ON DELETE CASCADE, exterior_swatch TEXT, interior_swatch TEXT);
CREATE TABLE IF NOT EXISTS car_variant_inventory (variant_id INTEGER PRIMARY KEY REFERENCES car_variants(id) ON DELETE CASCADE, vin TEXT COLLATE NOCASE, stock_number TEXT, quantity INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS car_media (id INTEGER PRIMARY KEY AUTOINCREMENT, car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE, object_key TEXT NOT NULL UNIQUE, public_url TEXT NOT NULL, media_type TEXT NOT NULL DEFAULT 'image', sort_order INTEGER NOT NULL DEFAULT 0, is_cover INTEGER NOT NULL DEFAULT 0, mime_type TEXT, file_size INTEGER, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS car_variant_media (id INTEGER PRIMARY KEY AUTOINCREMENT, car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE, variant_id INTEGER NOT NULL REFERENCES car_variants(id) ON DELETE CASCADE, object_key TEXT NOT NULL UNIQUE, public_url TEXT NOT NULL, photo_group TEXT NOT NULL CHECK(photo_group IN ('exterior','interior','detail')), sort_order INTEGER NOT NULL DEFAULT 0, is_cover INTEGER NOT NULL DEFAULT 0, mime_type TEXT, file_size INTEGER, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS variant_media_car ON car_variant_media(car_id,variant_id,sort_order);
CREATE INDEX IF NOT EXISTS legacy_media_car ON car_media(car_id,sort_order);

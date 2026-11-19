CREATE TABLE IF NOT EXISTS showroom_screens (
 code TEXT PRIMARY KEY, command TEXT NOT NULL DEFAULT '{}', revision TEXT NOT NULL DEFAULT '',
 music TEXT NOT NULL DEFAULT '{"playing":false,"volume":0.25,"trackId":null}',
 seen_at INTEGER NOT NULL DEFAULT 0, current_car INTEGER, current_photo INTEGER, current_scene TEXT
);
CREATE TABLE IF NOT EXISTS showroom_reveals (
 car_id INTEGER PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE, object_key TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS showroom_tracks (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, object_key TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL
);

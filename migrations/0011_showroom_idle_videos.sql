-- Video files live in Cloudflare R2; this D1 table stores the public playlist.
-- Initial order is Porsche -> Rolls-Royce. No existing catalog data is changed.
CREATE TABLE IF NOT EXISTS showroom_idle_videos (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 object_key TEXT NOT NULL UNIQUE,
 sort_order INTEGER NOT NULL DEFAULT 0,
 enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS showroom_idle_videos_order ON showroom_idle_videos(enabled,sort_order);
INSERT OR IGNORE INTO showroom_idle_videos (id,title,object_key,sort_order) VALUES
 ('porsche','Porsche · Showroom Film','showroom/idle/porsche.mp4',10),
 ('rolls-royce','Rolls-Royce · Showroom Film','showroom/idle/rolls-royce.mp4',20);
